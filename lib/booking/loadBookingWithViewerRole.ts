import type { Session } from "next-auth";
import { prisma } from "@/lib/db";
import type { Booking } from "@/app/generated/prisma/client";

export type BookingViewer = "customer" | "worker" | null;

/**
 * Every booking route needs the same answer first: is the signed-in
 * user the customer who made this booking, the worker it's assigned
 * to, or neither? Centralized so the "worker" check (which needs its
 * own DB lookup — Worker.id, not User.id) isn't duplicated across
 * every route that needs it.
 */
export async function loadBookingWithViewerRole(
  bookingId: string,
  session: Session
): Promise<{ booking: Booking | null; viewer: BookingViewer }> {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return { booking: null, viewer: null };

  if (session.user.id === booking.customerId) {
    return { booking, viewer: "customer" };
  }

  if (session.user.role === "WORKER") {
    const worker = await prisma.worker.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (worker && worker.id === booking.workerId) {
      return { booking, viewer: "worker" };
    }
  }

  return { booking, viewer: null };
}
