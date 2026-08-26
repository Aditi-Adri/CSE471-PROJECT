"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/booking/bookingFlow";

// ── Types ──────────────────────────────────────────────────────────────────────

type Analytics = {
  weeklyIncome: number;
  monthlyIncome: number;
  yearlyIncome: number;
  avgJobValue: number;
  totalJobsCompleted: number;
  topCategories: string[];
  peakHours: { hour: number; count: number }[];
  peakHour: number;
  workerArea: string;
};

type ApiResponse = {
  analytics: Analytics;
  aiInsights: string;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return formatCurrency(n);
}

function hourLabel(h: number) {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        {value}
      </p>
      {sub && (
        <p className="text-xs text-zinc-400 dark:text-zinc-500">{sub}</p>
      )}
    </div>
  );
}

/** Mini bar chart for peak-hour distribution */
function PeakHoursChart({ peakHours }: { peakHours: Analytics["peakHours"] }) {
  // Only show hours 6–22 to keep the chart readable
  const visible = peakHours.filter((h) => h.hour >= 6 && h.hour <= 22);
  const maxCount = Math.max(...visible.map((h) => h.count), 1);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Peak earnings hours
      </p>
      <div className="flex items-end gap-1" style={{ height: 72 }}>
        {visible.map(({ hour, count }) => {
          const heightPct = Math.round((count / maxCount) * 100);
          const isPeak = count === maxCount && count > 0;
          return (
            <div
              key={hour}
              className="group relative flex flex-1 flex-col items-center justify-end"
              style={{ height: "100%" }}
            >
              <div
                className={`w-full rounded-t-sm transition-all ${
                  isPeak
                    ? "bg-brand-500"
                    : "bg-zinc-200 dark:bg-zinc-700"
                }`}
                style={{ height: `${Math.max(heightPct, 4)}%` }}
              />
              {/* tooltip on hover */}
              <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] text-white group-hover:block dark:bg-zinc-700">
                {hourLabel(hour)}: {count} job{count !== 1 ? "s" : ""}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-zinc-400">
        <span>6 AM</span>
        <span>10 PM</span>
      </div>
    </div>
  );
}

/** AI insights card */
function AIInsightsCard({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50 p-5 dark:border-brand-900 dark:bg-brand-950/40">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs text-white">
          AI
        </span>
        <p className="text-sm font-semibold text-brand-800 dark:text-brand-300">
          AI Weekly Insights
        </p>
      </div>
      <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        {text}
      </p>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

/**
 * WorkerIncomeDashboard
 *
 * Isolated analytics panel for workers. Fetches data from
 * GET /api/worker/analytics and renders income stats, a peak-hours
 * mini-chart, top categories, and AI coaching tips.
 *
 * Drop this anywhere in the worker dashboard without touching any
 * other component or database schema.
 */
export function WorkerIncomeDashboard() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/worker/analytics")
      .then((r) => r.json())
      .then((json: ApiResponse & { error?: string }) => {
        if (json.error) {
          setError(json.error);
        } else {
          setData(json);
        }
      })
      .catch(() => setError("Could not load analytics. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 w-48 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-2xl bg-zinc-200 dark:bg-zinc-800"
            />
          ))}
        </div>
        <div className="h-32 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-28 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
      </div>
    );
  }

  // ── Error state ──
  if (error || !data) {
    return (
      <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
        {error ?? "Analytics unavailable."}
      </p>
    );
  }

  const { analytics, aiInsights } = data;
  const area = analytics.workerArea.replace(/_/g, " ");

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Income Intelligence
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            Based on your completed jobs in {area}
          </p>
        </div>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-brand-700 dark:bg-brand-950 dark:text-brand-300">
          Analytics
        </span>
      </div>

      {/* Income stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="This week"
          value={fmt(analytics.weeklyIncome)}
          sub="last 7 days"
        />
        <StatCard
          label="This month"
          value={fmt(analytics.monthlyIncome)}
          sub="last 30 days"
        />
        <StatCard
          label="This year"
          value={fmt(analytics.yearlyIncome)}
          sub="last 365 days"
        />
        <StatCard
          label="Avg job value"
          value={fmt(analytics.avgJobValue)}
          sub={`${analytics.totalJobsCompleted} completed job${analytics.totalJobsCompleted !== 1 ? "s" : ""}`}
        />
      </div>

      {/* Peak hours chart */}
      <PeakHoursChart peakHours={analytics.peakHours} />

      {/* Top categories */}
      {analytics.topCategories.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Top service categories
          </p>
          <div className="flex flex-wrap gap-2">
            {analytics.topCategories.map((cat) => (
              <span
                key={cat}
                className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              >
                {cat}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* AI insights */}
      <AIInsightsCard text={aiInsights} />
    </div>
  );
}
