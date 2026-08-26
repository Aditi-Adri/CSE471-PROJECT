import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { corporateBookingSchema } from "@/lib/validation/corporateSchemas";
import { shapeBookingForViewer } from "@/lib/booking/shapeBookingForViewer";
import { DHAKA_AREA_COORDS, jitterCoord } from "@/lib/constants/dhakaAreaCoords";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

/**
 * GET /api/corporate/bookings
 *
 * MODULE 3 -> FEATURE 3 (Corporate Portal): returns all corporate-tagged
 * bookings for the signed-in CORPORATE user.
 */
export const GET = withErrorHandling(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }
  if (session.user.role !== "CORPORATE") {
    return Response.json({ error: "This endpoint is for corporate accounts." }, { status: 403 });
  }

  const bookings = await prisma.booking.findMany({
    where: {
      customerId: session.user.id,
      isCorporateBill: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const workerIds = [
    ...new Set(bookings.map((b) => b.workerId).filter((id): id is string => Boolean(id))),
  ];
  const workers = workerIds.length
    ? await prisma.worker.findMany({
        where: { id: { in: workerIds } },
        select: { id: true, headline: true, user: { select: { name: true } } },
      })
    : [];
  const workerById = new Map(workers.map((w) => [w.id, w]));

  const propertyIds = [
    ...new Set(bookings.map((b) => b.corporatePropertyId).filter((id): id is string => Boolean(id))),
  ];
  const properties = propertyIds.length
    ? await prisma.corporateProperty.findMany({
        where: { id: { in: propertyIds } },
        select: { id: true, label: true, address: true },
      })
    : [];
  const propertyById = new Map(properties.map((p) => [p.id, p]));

  return Response.json({
    bookings: bookings.map((b) => {
      const worker = b.workerId ? workerById.get(b.workerId) : null;
      const property = b.corporatePropertyId ? propertyById.get(b.corporatePropertyId) : null;
      return {
        id: b.id,
        status: b.status,
        proposedRateBdt: b.proposedRateBdt,
        counterRateBdt: b.counterRateBdt,
        agreedRateBdt: b.agreedRateBdt,
        arrivalCode: b.arrivalCode,
        arrivalVerifiedAt: b.arrivalVerifiedAt,
        serviceAddress: b.serviceAddress,
        destinationLat: b.destinationLat,
        destinationLng: b.destinationLng,
        createdAt: b.createdAt,
        workerName: worker?.user.name ?? "Technician",
        workerHeadline: worker?.headline ?? "",
        propertyLabel: property?.label ?? "Property",
      };
    }),
  });
});

/**
 * POST /api/corporate/bookings
 *
 * MODULE 3 -> FEATURE 3 (Corporate Portal): creates a booking
 * pre-linked to one of the corporate user's managed properties.
 * The property's address is snapshotted into `serviceAddress`,
 * `isCorporateBill` is set true, and `requestedByRole` records
 * "CORPORATE".
 */
export const POST = withErrorHandling(async (request: Request) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }
  if (session.user.role !== "CORPORATE") {
    return Response.json({ error: "This endpoint is for corporate accounts." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = corporateBookingSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid booking details.", issues: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  const { workerId, corporatePropertyId, proposedRateBdt } = parsed.data;

  // Verify the property belongs to this user.
  const property = await prisma.corporateProperty.findUnique({
    where: { id: corporatePropertyId },
  });
  if (!property || property.corporateUserId !== session.user.id) {
    return Response.json({ error: "Property not found on your account." }, { status: 404 });
  }

  // Verify the worker exists and isn't the user themselves.
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
      serviceAddress: property.address,
      proposedRateBdt,
      destinationLat: destination.lat,
      destinationLng: destination.lng,
      isCorporateBill: true,
      requestedByRole: "CORPORATE",
      corporatePropertyId: property.id,
    },
  });

  return Response.json({ booking: shapeBookingForViewer(booking, "customer") }, { status: 201 });
});
