import { z } from "zod";

/**
 * MODULE 2 -> FEATURE 4 (Sudiptha): Worker Income Intelligence Dashboard —
 * shared range query-param validation for GET /api/worker/income and
 * GET /api/worker/coaching.
 */
export const incomeRangeSchema = z.enum(["week", "month", "year"]).default("week");

export const RANGE_PARAM_TO_ENUM = {
  week: "WEEK",
  month: "MONTH",
  year: "YEAR",
} as const;
