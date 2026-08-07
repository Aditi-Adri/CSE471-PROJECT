import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { BookingStart } from "@/components/booking/BookingStart";

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
  return { title: worker ? `Book ${worker.user.name} — HireLocal` : "Booking not found — HireLocal" };
}

export default async function WorkerBookingPage({ params }: { params: Promise<{ id: string }> }) {
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
        <Link href={`/workers/${worker.id}`} className="text-sm text-zinc-500 transition hover:text-brand-700 dark:hover:text-brand-400">
          ← Back to profile
        </Link>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Complete your booking on the next screen.</p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Book {worker.user.name}</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Confirm your address and extra job approvals before finalizing the service.
        </p>
      </div>

      <BookingStart
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
