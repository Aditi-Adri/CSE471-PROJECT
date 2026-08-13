import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

/**
 * POST /api/tracking/booking/assign
 * body: { bookingId?: string, workerId: string }
 *
 * Demo-only "assign a worker to a booking" step for the /track test
 * harness. `customerId` used to be hardcoded to "customer-demo-id" for
 * every caller regardless of who they were — it now comes from the
 * signed-in session, and the endpoint requires one instead of being
 * fully public.
 */
export const POST = withErrorHandling(async (request: Request) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const workerId = body?.workerId;
  if (!workerId) {
    return Response.json({ error: "Worker ID is required" }, { status: 400 });
  }

  // Fallback to a valid string ID if bookingId is undefined — demo
  // behavior preserved as-is (see file header).
  const targetBookingId = typeof body?.bookingId === "string" && body.bookingId ? body.bookingId : "booking-demo-id";

  const booking = await prisma.booking.upsert({
    where: { id: targetBookingId },
    update: {
      workerId,
      status: "IN_TRANSIT",
    },
    create: {
      id: targetBookingId,
      customerId: session.user.id,
      workerId,
      status: "IN_TRANSIT",
      destinationLat: 23.7808,
      destinationLng: 90.4194,
    },
  });

  return Response.json({ success: true, bookingId: booking.id });
});
