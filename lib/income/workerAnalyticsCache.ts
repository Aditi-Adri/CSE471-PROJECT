import { prisma } from "@/lib/db";
import type { DhakaArea, IncomeRange } from "@/app/generated/prisma/client";
import { getIncomeMetrics, type IncomeMetrics } from "./getIncomeMetrics";
import { generateCoaching, type CoachingResult } from "./generateCoaching";

/**
 * MODULE 2 -> FEATURE 4 (Jishan): Worker Income Intelligence Dashboard.
 *
 * WorkerAnalytics doubles as both the AI-coaching cache and the
 * "Coaching History" log (Feature 11). This is the single entry point
 * for "give me this worker's coaching for this period":
 *
 *   - Metrics are always computed fresh (cheap aggregate queries over
 *     WorkerJob — see getIncomeMetrics), so the numbers on screen are
 *     never stale.
 *   - The AI call only happens, and a new WorkerAnalytics row is only
 *     written, when there's no cached record yet for this exact
 *     [workerId, range, periodStart], or the cached one was generated
 *     against a different jobsCompleted count (i.e. the worker
 *     completed another job since). Reopening the same period later
 *     the same day, with nothing new, reuses the cached copy instead of
 *     burning another API call on an identical answer.
 *   - A period with zero completed jobs never calls the AI at all
 *     (Feature 15's zero-data state) and never writes a row for it.
 */

export type CoachingRecord = {
  id: string;
  range: IncomeRange;
  periodStart: string;
  totalEarningsBdt: number;
  avgJobValueBdt: number;
  jobsCompleted: number;
  peakLabel: string | null;
  topCategoryLabel: string | null;
  suggestionText: string | null;
  demandForecastText: string | null;
  source: string;
  createdAt: string;
};

export type CoachingResponse = {
  metrics: IncomeMetrics;
  current: CoachingRecord | null;
  noData: boolean;
  history: CoachingRecord[];
};

type WorkerAnalyticsRow = {
  id: string;
  range: IncomeRange;
  periodStart: Date;
  totalEarningsBdt: number;
  avgJobValueBdt: number;
  jobsCompleted: number;
  peakLabel: string | null;
  topCategoryLabel: string | null;
  suggestionText: string | null;
  demandForecastText: string | null;
  source: string;
  createdAt: Date;
};

function toRecord(row: WorkerAnalyticsRow): CoachingRecord {
  return {
    id: row.id,
    range: row.range,
    periodStart: row.periodStart.toISOString(),
    totalEarningsBdt: row.totalEarningsBdt,
    avgJobValueBdt: row.avgJobValueBdt,
    jobsCompleted: row.jobsCompleted,
    peakLabel: row.peakLabel,
    topCategoryLabel: row.topCategoryLabel,
    suggestionText: row.suggestionText,
    demandForecastText: row.demandForecastText,
    source: row.source,
    createdAt: row.createdAt.toISOString(),
  };
}

function snapshotFields(metrics: IncomeMetrics, coaching: CoachingResult) {
  return {
    totalEarningsBdt: metrics.totalEarningsBdt,
    avgJobValueBdt: metrics.avgJobValueBdt,
    jobsCompleted: metrics.jobsCompleted,
    peakLabel: metrics.peakHour?.label ?? null,
    topCategoryLabel: metrics.topCategory?.categoryLabel ?? null,
    suggestionText: coaching.suggestionText,
    demandForecastText: coaching.demandForecastText,
    source: coaching.source,
  };
}

export async function getOrGenerateCoaching(
  workerId: string,
  range: IncomeRange,
  area: DhakaArea,
  now: Date = new Date()
): Promise<CoachingResponse> {
  const metrics = await getIncomeMetrics(workerId, range, now);
  const periodStart = new Date(metrics.periodStart);

  if (metrics.jobsCompleted === 0) {
    const history = await prisma.workerAnalytics.findMany({
      where: { workerId },
      orderBy: { periodStart: "desc" },
      take: 12,
    });
    return { metrics, current: null, noData: true, history: history.map(toRecord) };
  }

  const existing = await prisma.workerAnalytics.findUnique({
    where: { workerId_range_periodStart: { workerId, range, periodStart } },
  });

  const record =
    existing && existing.jobsCompleted === metrics.jobsCompleted
      ? existing
      : await (async () => {
          const coaching = await generateCoaching(metrics, area);
          return prisma.workerAnalytics.upsert({
            where: { workerId_range_periodStart: { workerId, range, periodStart } },
            create: { workerId, range, periodStart, ...snapshotFields(metrics, coaching) },
            update: { ...snapshotFields(metrics, coaching) },
          });
        })();

  const history = await prisma.workerAnalytics.findMany({
    where: { workerId },
    orderBy: { periodStart: "desc" },
    take: 12,
  });

  return { metrics, current: toRecord(record), noData: false, history: history.map(toRecord) };
}
