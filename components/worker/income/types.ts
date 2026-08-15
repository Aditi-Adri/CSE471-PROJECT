/**
 * Client-safe mirror of lib/income/getIncomeMetrics.ts's IncomeMetrics and
 * lib/income/workerAnalyticsCache.ts's CoachingResponse — those files
 * import `@/lib/db` (server-only Prisma), so client components fetch
 * this shape as plain JSON from GET /api/worker/income and
 * GET /api/worker/coaching rather than importing the server types
 * directly (same pattern as components/opportunities/types.ts).
 */

export type IncomeRangeParam = "week" | "month" | "year";

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

export type IncomeMetricsData = {
  range: "WEEK" | "MONTH" | "YEAR";
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

export type CoachingRecordData = {
  id: string;
  range: "WEEK" | "MONTH" | "YEAR";
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

export type CoachingResponseData = {
  metrics: IncomeMetricsData;
  current: CoachingRecordData | null;
  noData: boolean;
  history: CoachingRecordData[];
};
