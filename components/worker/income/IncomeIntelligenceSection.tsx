"use client";

import { useEffect, useState } from "react";
import { RangeSelector } from "./RangeSelector";
import { MetricCards } from "./MetricCards";
import { EarningsOverTimeChart } from "./EarningsOverTimeChart";
import { EarningsByCategoryChart } from "./EarningsByCategoryChart";
import { PeakHoursChart } from "./PeakHoursChart";
import { TopCategoriesList } from "./TopCategoriesList";
import { RecentJobsList } from "./RecentJobsList";
import { CoachingPanel } from "./CoachingPanel";
import type { CoachingResponseData, IncomeMetricsData, IncomeRangeParam } from "./types";

/**
 * MODULE 2 -> FEATURE 4 (Sudiptha): Worker Income Intelligence Dashboard
 * + AI Predictive Planner.
 *
 * Rendered as a section inside the existing worker dashboard
 * (app/dashboard/worker-job/page.tsx) — not a standalone page. Fetches
 * two independent endpoints per range change: GET /api/worker/income
 * (fast, real-time aggregates — no AI) and GET /api/worker/coaching
 * (may call Groq the first time a period is opened, cached after that —
 * see lib/income/workerAnalyticsCache.ts), so the metric cards and
 * charts render as soon as they're ready without waiting on the AI call.
 */
export function IncomeIntelligenceSection() {
  const [range, setRange] = useState<IncomeRangeParam>("week");
  const [metrics, setMetrics] = useState<IncomeMetricsData | null>(null);
  const [coaching, setCoaching] = useState<CoachingResponseData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [coachingLoading, setCoachingLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setMetrics(null);

    fetch(`/api/worker/income?range=${range}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? "Couldn't load income data.");
        }
        return res.json();
      })
      .then((body: { metrics: IncomeMetricsData }) => {
        if (!cancelled) setMetrics(body.metrics);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [range]);

  useEffect(() => {
    let cancelled = false;
    setCoaching(null);
    setCoachingLoading(true);

    fetch(`/api/worker/coaching?range=${range}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((body: CoachingResponseData | null) => {
        if (!cancelled) {
          setCoaching(body);
          setCoachingLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setCoachingLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [range]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Income Intelligence</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Your real earnings history, an AI business suggestion, and a local demand outlook.
          </p>
        </div>
        <RangeSelector value={range} onChange={setRange} />
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {!metrics ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
          ))}
        </div>
      ) : (
        <>
          <MetricCards metrics={metrics} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <EarningsOverTimeChart points={metrics.earningsOverTime} />
            <EarningsByCategoryChart categories={metrics.categoryBreakdown} />
          </div>

          <PeakHoursChart hours={metrics.hourBreakdown} peakHour={metrics.peakHour} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <TopCategoriesList categories={metrics.categoryBreakdown} />
            <RecentJobsList jobs={metrics.recentJobs} />
          </div>

          <CoachingPanel
            current={coaching?.current ?? null}
            noData={coaching?.noData ?? metrics.jobsCompleted === 0}
            history={coaching?.history ?? []}
            loading={coachingLoading}
          />
        </>
      )}
    </div>
  );
}
