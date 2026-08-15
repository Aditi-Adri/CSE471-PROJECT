import type { IncomeRange } from "@/app/generated/prisma/client";

/**
 * MODULE 2 -> FEATURE 4 (Jishan): Worker Income Intelligence Dashboard.
 *
 * Pure date math for the Week/Month/Year filter — no `@/lib/db` import,
 * same reasoning as lib/opportunities/demandScoreMath.ts: keeps this
 * testable with no database/env setup.
 */

export type PeriodBounds = { start: Date; end: Date };

/** Monday-start week containing `now` (local server time). */
function startOfWeek(now: Date): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = d.getDay(); // 0=Sun..6=Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  return d;
}

function startOfMonth(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function startOfYear(now: Date): Date {
  return new Date(now.getFullYear(), 0, 1);
}

/** [start, end) bounds for the current Week/Month/Year period containing `now`. */
export function getPeriodBounds(range: IncomeRange, now: Date = new Date()): PeriodBounds {
  if (range === "WEEK") {
    const start = startOfWeek(now);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
    return { start, end };
  }
  if (range === "MONTH") {
    const start = startOfMonth(now);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    return { start, end };
  }
  const start = startOfYear(now);
  const end = new Date(start.getFullYear() + 1, 0, 1);
  return { start, end };
}

export type TimeBucket = { label: string; start: Date; end: Date };

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * The x-axis buckets for the "earnings over time" chart — 7 days for
 * WEEK, one bucket per calendar day for MONTH, 12 calendar months for
 * YEAR. `periodStart` must be the same value getPeriodBounds() returned.
 */
export function getTimeSeriesBuckets(range: IncomeRange, periodStart: Date): TimeBucket[] {
  if (range === "WEEK") {
    return WEEKDAY_LABELS.map((label, i) => {
      const start = new Date(periodStart.getFullYear(), periodStart.getMonth(), periodStart.getDate() + i);
      const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
      return { label, start, end };
    });
  }
  if (range === "MONTH") {
    const daysInMonth = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const start = new Date(periodStart.getFullYear(), periodStart.getMonth(), day);
      const end = new Date(periodStart.getFullYear(), periodStart.getMonth(), day + 1);
      return { label: String(day), start, end };
    });
  }
  return MONTH_LABELS.map((label, i) => {
    const start = new Date(periodStart.getFullYear(), i, 1);
    const end = new Date(periodStart.getFullYear(), i + 1, 1);
    return { label, start, end };
  });
}

/** "6 PM", "12 AM", "11 PM" — a single hour-of-day boundary. */
export function formatHourLabel(hour: number): string {
  const period = hour < 12 ? "AM" : "PM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour} ${period}`;
}

/** "6 PM – 7 PM" — the one-hour window a job's completedAt hour falls into. */
export function formatHourRangeLabel(hour: number): string {
  const nextHour = (hour + 1) % 24;
  return `${formatHourLabel(hour)} – ${formatHourLabel(nextHour)}`;
}
