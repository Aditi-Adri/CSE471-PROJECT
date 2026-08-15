import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { createBookingSchema } from "@/lib/validation/bookingSchema";
import { shapeBookingForViewer } from "@/lib/booking/shapeBookingForViewer";
import { DHAKA_AREA_COORDS, jitterCoord } from "@/lib/constants/dhakaAreaCoords";
import { checkRateLimit, getClientIp } from "@/lib/auth/rateLimit";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

/**
 * POST /api/bookings
 * body: { workerId, address, proposedRateBdt }
 *
 * MODULE 1 -> FEATURE 4 (Sudiptha): a customer requesting a specific
 * worker at a proposed rate. This is what BookingStart's "Confirm
 * worker" button actually calls now — the flow it replaces
 * (BookingStart/BookingConfirm's client-only state) never wrote
 * anything to the database. This does, and gates the address/phone
 * reveal for real (see shapeBookingForViewer).
 *
 * `destinationLat/Lng` are the worker's *area* centroid, not the
 * customer's real coordinates — nobody in this codebase has paid
 * geocoding, and the exact address is captured as text on the booking
 * anyway (see serviceAddress). Good enough to place a pin on a map,
 * not a substitute for the real address.
 */
export const POST = withErrorHandling(async (request: Request) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }

  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`booking-create:${session.user.id}:${ip}`, 15, 10 * 60 * 1000);
  if (!rateLimit.allowed) {
    return Response.json({ error: "Too many booking requests. Please try again shortly." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createBookingSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid booking details.", issues: z.treeifyError(parsed.error) },
      { status: 400 }
    );
  }

  const { workerId, address, proposedRateBdt } = parsed.data;

  const worker = await prisma.worker.findUnique({
    where: { id: workerId },
    select: { id: true, userId: true, area: true },
  });
  if (!worker) {
    return Response.json({ error: "That technician doesn't exist." }, { status: 404 });
  }
  if (worker.userId === session.user.id) {
    return Response.json({ error: "You can't book yourself." }, { status: 400 });
  }

  const destination = jitterCoord(DHAKA_AREA_COORDS[worker.area], worker.id);

  const booking = await prisma.booking.create({
    data: {
      customerId: session.user.id,
      customerPhone: session.user.phone,
      workerId: worker.id,
      status: "PENDING_ACCEPTANCE",
      serviceAddress: address,
      proposedRateBdt,
      destinationLat: destination.lat,
      destinationLng: destination.lng,
    },
  });

  return Response.json({ booking: shapeBookingForViewer(booking, "customer") }, { status: 201 });
});
