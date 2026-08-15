import { formatBdt } from "@/lib/format";
import type { IncomeMetricsData } from "./types";

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1.5 text-xl font-semibold text-zinc-900 dark:text-zinc-50">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>}
    </div>
  );
}

export function MetricCards({ metrics }: { metrics: IncomeMetricsData }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <StatCard label="Total earnings" value={formatBdt(metrics.totalEarningsBdt)} />
      <StatCard label="Completed jobs" value={String(metrics.jobsCompleted)} />
      <StatCard label="Average job value" value={formatBdt(metrics.avgJobValueBdt)} />
      <StatCard
        label="Top category"
        value={metrics.topCategory?.categoryLabel ?? "—"}
        hint={metrics.topCategory ? `${metrics.topCategory.jobCount} job(s)` : undefined}
      />
      <StatCard
        label="Peak hour"
        value={metrics.peakHour?.label ?? "—"}
        hint={metrics.peakHour ? formatBdt(metrics.peakHour.earningsBdt) : undefined}
      />
    </div>
  );
}
