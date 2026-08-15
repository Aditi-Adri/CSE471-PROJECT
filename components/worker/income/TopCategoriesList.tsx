import { formatBdt } from "@/lib/format";
import type { CategoryBreakdown } from "./types";

export function TopCategoriesList({ categories }: { categories: CategoryBreakdown[] }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Top-performing service categories</p>
      {categories.length === 0 ? (
        <p className="text-sm text-zinc-400 dark:text-zinc-600">No completed jobs for this period.</p>
      ) : (
        <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
          {categories.map((c, i) => (
            <div key={c.categoryId ?? "uncategorized"} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3">
                {i === 0 && (
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                    Best
                  </span>
                )}
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{c.categoryLabel}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {c.jobCount} job{c.jobCount === 1 ? "" : "s"} · avg {formatBdt(c.avgJobValueBdt)}
                  </p>
                </div>
              </div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{formatBdt(c.totalEarningsBdt)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
