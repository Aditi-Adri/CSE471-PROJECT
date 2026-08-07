import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { BookingConfirm } from "@/components/booking/BookingConfirm";

async function getWorker(id: string) {
  return prisma.worker.findUnique({
    where: { id },
    include: {
      user: { select: { name: true } },
      categories: { include: { category: true } },
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const worker = await getWorker(id);
  return { title: worker ? `Confirm booking — ${worker.user.name}` : "Booking confirm not found" };
}

export default async function BookingConfirmPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const worker = await getWorker(id);

  if (!worker) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-sm text-zinc-700 dark:text-zinc-300">
        Technician not found.
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <Link href={`/workers/${worker.id}/booking`} className="text-sm text-zinc-500 transition hover:text-brand-700 dark:hover:text-brand-400">
          ← Back to booking
        </Link>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Worker arrival & total.</p>
      </div>

      <BookingConfirm
        worker={{
          id: worker.id,
          user: { name: worker.user.name },
          addressDetail: worker.addressDetail,
          hourlyRateMinBdt: worker.hourlyRateMinBdt,
          hourlyRateMaxBdt: worker.hourlyRateMaxBdt,
          categories: worker.categories.map(({ category, isPrimary }) => ({
            category: { name: category.name },
            isPrimary,
          })),
        }}
      />
    </div>
  );
}
