import { formatBdt } from "@/lib/format";
import { EmptyChartState } from "./EarningsOverTimeChart";
import type { CategoryBreakdown } from "./types";

const BAR_COLORS = [
  "bg-brand-500 dark:bg-brand-400",
  "bg-emerald-500 dark:bg-emerald-400",
  "bg-amber-500 dark:bg-amber-400",
  "bg-sky-500 dark:bg-sky-400",
  "bg-rose-500 dark:bg-rose-400",
  "bg-violet-500 dark:bg-violet-400",
];

export function EarningsByCategoryChart({ categories }: { categories: CategoryBreakdown[] }) {
  const max = Math.max(1, ...categories.map((c) => c.totalEarningsBdt));

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Earnings by category</p>
      {categories.length === 0 ? (
        <EmptyChartState />
      ) : (
        <div className="flex flex-col gap-3">
          {categories.map((c, i) => (
            <div key={c.categoryId ?? "uncategorized"}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">{c.categoryLabel}</span>
                <span className="text-zinc-500 dark:text-zinc-400">
                  {formatBdt(c.totalEarningsBdt)} · {c.jobCount} job{c.jobCount === 1 ? "" : "s"}
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className={`h-full rounded-full ${BAR_COLORS[i % BAR_COLORS.length]}`}
                  style={{ width: `${Math.max(4, (c.totalEarningsBdt / max) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
