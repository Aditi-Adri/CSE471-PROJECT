import type { Booking } from "@/app/generated/prisma/client";

/**
 * The safety property this whole feature is for: a worker never sees
 * `serviceAddress`/`customerPhone` until `arrivalVerifiedAt` is set.
 * The customer always sees their own booking in full — there's nothing
 * to withhold from the person who entered the data.
 */
export function shapeBookingForViewer(booking: Booking, viewer: "customer" | "worker") {
  const revealed = viewer === "customer" || Boolean(booking.arrivalVerifiedAt);

  return {
    id: booking.id,
    status: booking.status,
    workerId: booking.workerId,
    customerId: booking.customerId,
    proposedRateBdt: booking.proposedRateBdt,
    counterRateBdt: booking.counterRateBdt,
    agreedRateBdt: booking.agreedRateBdt,
    // Naturally null until a worker accepts/accepts-a-counter generates
    // it — nothing extra to gate here on top of that.
    arrivalCode: booking.arrivalCode,
    arrivalVerifiedAt: booking.arrivalVerifiedAt,
    serviceAddress: revealed ? booking.serviceAddress : null,
    customerPhone: revealed ? booking.customerPhone : null,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
  };
}

export type ShapedBooking = ReturnType<typeof shapeBookingForViewer>;
