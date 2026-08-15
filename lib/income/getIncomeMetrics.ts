import { prisma } from "@/lib/db";
import type { IncomeRange } from "@/app/generated/prisma/client";
import { getPeriodBounds, getTimeSeriesBuckets, formatHourRangeLabel } from "./incomeDateRanges";

/**
 * MODULE 2 -> FEATURE 4 (Jishan): Worker Income Intelligence Dashboard.
 *
 * All financial figures on the dashboard come from this one function —
 * a real aggregation over WorkerJob, the worker's completed/paid work
 * history (see lib/income/recordCompletedJob.ts for how rows get there).
 * Nothing here is hardcoded; an empty period simply produces all-zero
 * metrics (see the zero-data checks in each API route).
 */

export type CategoryBreakdown = {
  categoryId: string | null;
  categoryLabel: string;
  jobCount: number;
  totalEarningsBdt: number;
  avgJobValueBdt: number;
};

export type TimeSeriesPoint = { label: string; earningsBdt: number };

export type HourBucket = { hour: number; label: string; earningsBdt: number };

export type RecentJob = {
  id: string;
  jobType: string;
  categoryLabel: string;
  amountBdt: number;
  completedAt: string;
};

export type IncomeMetrics = {
  range: IncomeRange;
  periodStart: string;
  periodEnd: string;
  totalEarningsBdt: number;
  jobsCompleted: number;
  avgJobValueBdt: number;
  topCategory: CategoryBreakdown | null;
  categoryBreakdown: CategoryBreakdown[];
  earningsOverTime: TimeSeriesPoint[];
  peakHour: HourBucket | null;
  hourBreakdown: HourBucket[];
  recentJobs: RecentJob[];
};

export async function getIncomeMetrics(
  workerId: string,
  range: IncomeRange,
  now: Date = new Date()
): Promise<IncomeMetrics> {
  const { start, end } = getPeriodBounds(range, now);

  const jobs = await prisma.workerJob.findMany({
    where: { workerId, completedAt: { gte: start, lt: end } },
    include: { category: { select: { id: true, name: true } } },
    orderBy: { completedAt: "asc" },
  });

  const totalEarningsBdt = jobs.reduce((sum, j) => sum + j.amountBdt, 0);
  const jobsCompleted = jobs.length;
  const avgJobValueBdt = jobsCompleted > 0 ? Math.round(totalEarningsBdt / jobsCompleted) : 0;

  // --- Top-performing service categories (Feature 7) ---
  const byCategory = new Map<string, CategoryBreakdown>();
  for (const job of jobs) {
    const key = job.categoryId ?? "uncategorized";
    const label = job.category?.name ?? "General Service";
    const existing = byCategory.get(key) ?? {
      categoryId: job.categoryId,
      categoryLabel: label,
      jobCount: 0,
      totalEarningsBdt: 0,
      avgJobValueBdt: 0,
    };
    existing.jobCount += 1;
    existing.totalEarningsBdt += job.amountBdt;
    byCategory.set(key, existing);
  }
  const categoryBreakdown = Array.from(byCategory.values())
    .map((c) => ({ ...c, avgJobValueBdt: Math.round(c.totalEarningsBdt / c.jobCount) }))
    .sort((a, b) => b.totalEarningsBdt - a.totalEarningsBdt);
  const topCategory = categoryBreakdown[0] ?? null;

  // --- Earnings over time (Feature 5.1) ---
  const buckets = getTimeSeriesBuckets(range, start);
  const earningsOverTime: TimeSeriesPoint[] = buckets.map((bucket) => {
    const earningsBdt = jobs
      .filter((j) => j.completedAt >= bucket.start && j.completedAt < bucket.end)
      .reduce((sum, j) => sum + j.amountBdt, 0);
    return { label: bucket.label, earningsBdt };
  });

  // --- Peak earning hours (Feature 6) ---
  const hourTotals = new Map<number, number>();
  for (const job of jobs) {
    const hour = job.completedAt.getHours();
    hourTotals.set(hour, (hourTotals.get(hour) ?? 0) + job.amountBdt);
  }
  const hourBreakdown: HourBucket[] = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    label: formatHourRangeLabel(hour),
    earningsBdt: hourTotals.get(hour) ?? 0,
  })).filter((h) => h.earningsBdt > 0);
  const peakHour =
    hourBreakdown.length > 0
      ? hourBreakdown.reduce((best, h) => (h.earningsBdt > best.earningsBdt ? h : best))
      : null;

  // --- Recent completed jobs (Feature 4.I) ---
  const recentJobs: RecentJob[] = [...jobs]
    .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())
    .slice(0, 8)
    .map((j) => ({
      id: j.id,
      jobType: j.jobType,
      categoryLabel: j.category?.name ?? "General Service",
      amountBdt: j.amountBdt,
      completedAt: j.completedAt.toISOString(),
    }));

  return {
    range,
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
    totalEarningsBdt,
    jobsCompleted,
    avgJobValueBdt,
    topCategory,
    categoryBreakdown,
    earningsOverTime,
    peakHour,
    hourBreakdown,
    recentJobs,
  };
}
