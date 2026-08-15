import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { loadBookingWithViewerRole } from "@/lib/booking/loadBookingWithViewerRole";
import { shapeBookingForViewer } from "@/lib/booking/shapeBookingForViewer";
import { verifyArrivalCodeSchema } from "@/lib/validation/bookingSchema";
import { checkRateLimit, getClientIp } from "@/lib/auth/rateLimit";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

/**
 * POST /api/bookings/[id]/verify-code
 * body: { code }
 *
 * The safety gate this whole feature exists for: submitting the
 * matching code is what flips `arrivalVerifiedAt`, which is the only
 * thing shapeBookingForViewer checks before including the customer's
 * real address/phone in a worker's view of this booking. Tightly
 * rate-limited — a 4-digit code is only as safe as how many guesses
 * someone gets.
 */
export const POST = withErrorHandling(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "You must be signed in." }, { status: 401 });
    }

    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`booking-verify-code:${id}:${ip}`, 8, 10 * 60 * 1000);
    if (!rateLimit.allowed) {
      return Response.json({ error: "Too many attempts. Please try again shortly." }, { status: 429 });
    }

    const { booking, viewer } = await loadBookingWithViewerRole(id, session);
    if (!booking || viewer !== "worker") {
      return Response.json({ error: "Booking not found." }, { status: 404 });
    }
    if (booking.status !== "CONFIRMED" || !booking.arrivalCode) {
      return Response.json({ error: "This booking isn't ready for arrival verification yet." }, { status: 409 });
    }

    const body = await request.json().catch(() => null);
    const parsed = verifyArrivalCodeSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid request.", issues: z.treeifyError(parsed.error) },
        { status: 400 }
      );
    }

    if (parsed.data.code.trim() !== booking.arrivalCode) {
      return Response.json({ error: "That code doesn't match." }, { status: 400 });
    }

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: { status: "ARRIVED", arrivalVerifiedAt: new Date() },
    });

    return Response.json({ booking: shapeBookingForViewer(updated, "worker") });
  }
);
