import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { loadBookingWithViewerRole } from "@/lib/booking/loadBookingWithViewerRole";
import { shapeBookingForViewer } from "@/lib/booking/shapeBookingForViewer";
import { BookingStatusView } from "@/components/booking/BookingStatusView";

export const metadata: Metadata = { title: "Booking status" };

/**
 * Customer-facing view of a real booking (MODULE 1 -> FEATURE 4,
 * Sudiptha). This is what BookingStart's "Confirm worker" now leads
 * to instead of the old client-only BookingConfirm preview — real
 * data, from the actual database.
 */
export default async function BookingStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user) redirect(`/login?callbackUrl=/bookings/${id}`);

  const { booking, viewer } = await loadBookingWithViewerRole(id, session);
  if (!booking || viewer !== "customer") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-sm text-zinc-700 dark:text-zinc-300">
        Booking not found.
      </div>
    );
  }

  const worker = booking.workerId
    ? await prisma.worker.findUnique({ where: { id: booking.workerId }, select: { user: { select: { name: true } } } })
    : null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/bookings" className="text-sm text-zinc-500 transition hover:text-brand-700 dark:hover:text-brand-400">
        ← My bookings
      </Link>
      <BookingStatusView
        workerName={worker?.user.name ?? "your technician"}
        initial={{
          ...shapeBookingForViewer(booking, "customer"),
          arrivalVerifiedAt: booking.arrivalVerifiedAt?.toISOString() ?? null,
        }}
      />
    </div>
  );
}
