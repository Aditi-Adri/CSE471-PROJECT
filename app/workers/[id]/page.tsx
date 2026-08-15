import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { Avatar } from "@/components/search/Avatar";
import { VerificationBadge } from "@/components/search/VerificationBadge";
import { RatingStars } from "@/components/search/RatingStars";
import { AREA_LABEL_BY_VALUE } from "@/lib/constants/dhakaAreas";
import { formatRateRange, pluralize } from "@/lib/format";
import { TrustScoreBadge } from "@/components/trust/TrustScoreBadge";
import { TrustScoreDetails } from "@/components/trust/TrustScoreDetails";
import { ReviewList } from "@/components/reviews/ReviewList";
import { getTrustBreakdown } from "@/lib/trust/recomputeTrustScore";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

async function getWorker(id: string) {
  return prisma.worker.findUnique({
    where: { id },
    include: {
      user: { select: { name: true } },
      categories: { include: { category: true } },
      availability: { orderBy: { dayOfWeek: "asc" } },
      // MODULE 2 -> FEATURE 1 (Shiva): fraud-flagged reviews stay in
      // this list (see components/reviews/ReviewList.tsx) — only
      // isHidden: true (an admin's confirmed decision) drops one.
      reviews: {
        where: { isHidden: false },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { customer: { select: { name: true } } },
      },
    },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const worker = await getWorker(id);
  return { title: worker ? `${worker.user.name} — HireLocal` : "Technician not found — HireLocal" };
}

export default async function WorkerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const worker = await getWorker(id);
  if (!worker) notFound();
  const trustBreakdown = await getTrustBreakdown(worker.id);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/search" className="text-sm text-zinc-500 transition hover:text-brand-700 dark:hover:text-brand-400">
        ← Back to search
      </Link>

      <div className="flex flex-col gap-5 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-start gap-4">
          <Avatar name={worker.user.name} seed={worker.avatarSeed} size={72} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                {worker.user.name}
              </h1>
              {worker.isAvailableNow && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950/50 dark:text-green-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Available now
                </span>
              )}
            </div>
            <p className="text-zinc-600 dark:text-zinc-400">{worker.headline}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <VerificationBadge tier={worker.verificationTier} />
              <RatingStars ratingAvg={worker.ratingAvg} ratingCount={worker.ratingCount} />
              <TrustScoreBadge score={worker.trustScore} compact />
            </div>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{worker.bio}</p>

        <div className="flex flex-wrap gap-1.5">
          {worker.categories.map(({ category, isPrimary }) => (
            <span
              key={category.id}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                isPrimary
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300"
                  : "border border-zinc-200 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400"
              }`}
            >
              <span aria-hidden="true">{category.icon}</span>
              {category.name}
            </span>
          ))}
        </div>

        <dl className="grid grid-cols-2 gap-4 border-t border-zinc-100 pt-4 text-sm dark:border-zinc-800 sm:grid-cols-4">
          <Stat label="Rate" value={formatRateRange(worker.hourlyRateMinBdt, worker.hourlyRateMaxBdt)} />
          <Stat label="Area" value={AREA_LABEL_BY_VALUE.get(worker.area) ?? worker.area} />
          <Stat
            label="Experience"
            value={`${worker.yearsExperience} ${pluralize(worker.yearsExperience, "year")}`}
          />
          <Stat label="Completed jobs" value={String(worker.completedJobs)} />
        </dl>

        <div>
          <p className="mb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">Address</p>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">{worker.addressDetail}</p>
        </div>

        {worker.availability.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Weekly availability
            </p>
            <div className="flex flex-wrap gap-2">
              {worker.availability.map((slot) => (
                <span
                  key={slot.id}
                  className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
                >
                  {DAY_LABELS[slot.dayOfWeek]} {slot.startHour}:00–{slot.endHour}:00
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Ready to book?</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Tap the button to continue to the booking page.
            </p>
          </div>
          <Link
            href={`/workers/${worker.id}/booking`}
            className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Booked
          </Link>
        </div>

        <p className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:bg-zinc-950 dark:text-zinc-500">
          Direct booking, in-app chat and secure payment are launching soon — for now, use this
          profile to compare verified technicians before reaching out.
        </p>
      </div>

      {trustBreakdown && <TrustScoreDetails breakdown={trustBreakdown} />}

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Reviews {worker.reviews.length > 0 && `(${worker.reviews.length})`}
        </h2>
        <ReviewList reviews={worker.reviews} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="font-medium text-zinc-900 dark:text-zinc-100">{value}</dd>
    </div>
  );
}