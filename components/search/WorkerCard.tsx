import Link from "next/link";
import { Avatar } from "./Avatar";
import { VerificationBadge } from "./VerificationBadge";
import { RatingStars } from "./RatingStars";
import { AREA_LABEL_BY_VALUE } from "@/lib/constants/dhakaAreas";
import { formatRateRange, pluralize } from "@/lib/format";
import type { WorkerResult } from "@/lib/types/search";

export function WorkerCard({ worker }: { worker: WorkerResult }) {
  const primaryCategory = worker.categories.find((c) => c.isPrimary) ?? worker.categories[0];
  const secondaryCategories = worker.categories.filter((c) => c.id !== primaryCategory?.id);

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start gap-3">
        <Avatar name={worker.name} seed={worker.avatarSeed} size={52} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold text-zinc-900 dark:text-zinc-50">{worker.name}</h3>
            {worker.isAvailableNow && (
              <span
                className="inline-flex h-2 w-2 shrink-0 rounded-full bg-green-500"
                title="Available now"
              />
            )}
          </div>
          <p className="truncate text-sm text-zinc-600 dark:text-zinc-400">{worker.headline}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <VerificationBadge tier={worker.verificationTier} />
        <RatingStars ratingAvg={worker.ratingAvg} ratingCount={worker.ratingCount} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {primaryCategory && (
          <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            <span aria-hidden="true">{primaryCategory.icon}</span>
            {primaryCategory.name}
          </span>
        )}
        {secondaryCategories.map((c) => (
          <span
            key={c.id}
            className="inline-flex items-center gap-1 rounded-full border border-zinc-200 px-2.5 py-1 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400"
          >
            <span aria-hidden="true">{c.icon}</span>
            {c.name}
          </span>
        ))}
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
        <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
          <dt className="sr-only">Area</dt>
          <dd>📍 {AREA_LABEL_BY_VALUE.get(worker.area) ?? worker.area}</dd>
        </div>
        <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
          <dt className="sr-only">Rate</dt>
          <dd>💵 {formatRateRange(worker.hourlyRateMinBdt, worker.hourlyRateMaxBdt)}</dd>
        </div>
        <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
          <dt className="sr-only">Experience</dt>
          <dd>
            🧰 {worker.yearsExperience} {pluralize(worker.yearsExperience, "year")} exp.
          </dd>
        </div>
        <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
          <dt className="sr-only">Completed jobs</dt>
          <dd>✅ {worker.completedJobs} completed</dd>
        </div>
      </dl>

      <Link
        href={`/workers/${worker.id}`}
        className="mt-auto inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        View full profile
      </Link>
    </article>
  );
}
