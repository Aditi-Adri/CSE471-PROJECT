import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { generateOtp } from "@/lib/booking/bookingFlow";
import { loadBookingWithViewerRole } from "@/lib/booking/loadBookingWithViewerRole";
import { shapeBookingForViewer } from "@/lib/booking/shapeBookingForViewer";
import { workerRespondSchema } from "@/lib/validation/bookingSchema";
import { checkRateLimit, getClientIp } from "@/lib/auth/rateLimit";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

/**
 * POST /api/bookings/[id]/respond
 * body: { action: "accept" } | { action: "reject" } | { action: "counter", counterRateBdt }
 *
 * The worker's side of the bargain: accept the customer's proposed
 * rate outright, decline the job, or counter with a different rate
 * (which the customer then accepts/rejects via respond-counter — one
 * round, not open-ended back-and-forth negotiation).
 *
 * Accepting (here or via respond-counter) is the one moment the
 * arrival code gets generated — everything downstream (verify-code,
 * the address/phone reveal) hangs off this.
 */
export const POST = withErrorHandling(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "You must be signed in." }, { status: 401 });
    }

    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`booking-respond:${session.user.id}:${ip}`, 20, 10 * 60 * 1000);
    if (!rateLimit.allowed) {
      return Response.json({ error: "Too many attempts. Please try again shortly." }, { status: 429 });
    }

    const { booking, viewer } = await loadBookingWithViewerRole(id, session);
    if (!booking || viewer !== "worker") {
      return Response.json({ error: "Booking not found." }, { status: 404 });
    }
    if (booking.status !== "PENDING_ACCEPTANCE") {
      return Response.json({ error: "This booking already has a response." }, { status: 409 });
    }

    const body = await request.json().catch(() => null);
    const parsed = workerRespondSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid response.", issues: z.treeifyError(parsed.error) },
        { status: 400 }
      );
    }

    const updated = await (async () => {
      if (parsed.data.action === "reject") {
        return prisma.booking.update({ where: { id: booking.id }, data: { status: "REJECTED" } });
      }
      if (parsed.data.action === "counter") {
        return prisma.booking.update({
          where: { id: booking.id },
          data: { counterRateBdt: parsed.data.counterRateBdt },
        });
      }
      // accept
      return prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: "CONFIRMED",
          agreedRateBdt: booking.proposedRateBdt,
          arrivalCode: generateOtp(),
        },
      });
    })();

    return Response.json({ booking: shapeBookingForViewer(updated, "worker") });
  }
);
