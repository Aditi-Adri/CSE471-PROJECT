import { prisma } from "@/lib/db";
import type { Booking } from "@/app/generated/prisma/client";

/**
 * MODULE 2 -> FEATURE 4 (Jishan): Worker Income Intelligence Dashboard.
 *
 * The only place a WorkerJob is ever created from a real booking. Called
 * from app/api/bookings/[id]/complete/route.ts right after a booking's
 * status flips to COMPLETED — never on booking creation, never on any
 * other status change, so a customer merely opening the booking page or
 * a worker accepting a job never counts as income.
 *
 * `Booking` never captured which service category a job was for (no
 * upstream field asks for one at booking time), so the category is
 * inferred, in order:
 *   1. The worker's own primary listed category (WorkerCategory.isPrimary)
 *   2. Any other category the worker lists
 *   3. null — the dashboard shows it as "General Service"
 * This is a documented best-effort fallback, not a fabricated fact — see
 * the WorkerJob model's doc comment in prisma/schema.prisma.
 *
 * Idempotent: WorkerJob.bookingId is @unique, so this is safe to call
 * more than once for the same booking (it won't happen today — the
 * complete route only accepts an ARRIVED booking once — but this keeps
 * the guarantee explicit rather than assumed).
 */
export async function recordCompletedJob(booking: Booking): Promise<void> {
  if (!booking.workerId) return;

  const amountBdt = booking.agreedRateBdt ?? booking.proposedRateBdt ?? booking.counterRateBdt ?? 0;
  if (amountBdt <= 0) return; // nothing meaningful to record

  const existing = await prisma.workerJob.findUnique({ where: { bookingId: booking.id } });
  if (existing) return;

  const primaryCategory = await prisma.workerCategory.findFirst({
    where: { workerId: booking.workerId },
    orderBy: [{ isPrimary: "desc" }],
    include: { category: { select: { id: true, name: true } } },
  });

  await prisma.workerJob.create({
    data: {
      workerId: booking.workerId,
      bookingId: booking.id,
      categoryId: primaryCategory?.category.id ?? null,
      jobType: primaryCategory?.category.name ?? "General Service",
      amountBdt,
      completedAt: booking.completedAt ?? new Date(),
    },
  });
}
