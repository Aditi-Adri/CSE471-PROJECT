import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { generateOtp } from "@/lib/booking/bookingFlow";
import { loadBookingWithViewerRole } from "@/lib/booking/loadBookingWithViewerRole";
import { shapeBookingForViewer } from "@/lib/booking/shapeBookingForViewer";
import { customerRespondCounterSchema } from "@/lib/validation/bookingSchema";
import { checkRateLimit, getClientIp } from "@/lib/auth/rateLimit";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

/**
 * POST /api/bookings/[id]/respond-counter
 * body: { action: "accept" | "reject" }
 *
 * The customer's side of a worker's counter-offer — accept it (locks
 * in the arrival code, same as a straight accept) or reject it, which
 * calls the whole booking off rather than looping back for another
 * round. Simple, bounded negotiation on purpose.
 */
export const POST = withErrorHandling(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "You must be signed in." }, { status: 401 });
    }

    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`booking-respond-counter:${session.user.id}:${ip}`, 20, 10 * 60 * 1000);
    if (!rateLimit.allowed) {
      return Response.json({ error: "Too many attempts. Please try again shortly." }, { status: 429 });
    }

    const { booking, viewer } = await loadBookingWithViewerRole(id, session);
    if (!booking || viewer !== "customer") {
      return Response.json({ error: "Booking not found." }, { status: 404 });
    }
    if (booking.status !== "PENDING_ACCEPTANCE" || booking.counterRateBdt == null) {
      return Response.json({ error: "There's no counter-offer to respond to." }, { status: 409 });
    }

    const body = await request.json().catch(() => null);
    const parsed = customerRespondCounterSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid response.", issues: z.treeifyError(parsed.error) },
        { status: 400 }
      );
    }

    const updated =
      parsed.data.action === "accept"
        ? await prisma.booking.update({
            where: { id: booking.id },
            data: {
              status: "CONFIRMED",
              agreedRateBdt: booking.counterRateBdt,
              arrivalCode: generateOtp(),
            },
          })
        : await prisma.booking.update({ where: { id: booking.id }, data: { status: "CANCELLED" } });

    return Response.json({ booking: shapeBookingForViewer(updated, "customer") });
  }
);
