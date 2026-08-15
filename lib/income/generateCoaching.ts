import { generateIncomeCoachingWithGroq } from "@/lib/ai/groqClient";
import { AREA_LABEL_BY_VALUE } from "@/lib/constants/dhakaAreas";
import { formatBdt } from "@/lib/format";
import type { DhakaArea } from "@/app/generated/prisma/client";
import type { IncomeMetrics } from "./getIncomeMetrics";

/**
 * MODULE 2 -> FEATURE 4 (Jishan): Worker Income Intelligence Dashboard.
 *
 * Turns a worker's real, already-computed income metrics into the two
 * short coaching sentences the dashboard shows — same two-tier strategy
 * as lib/opportunities/opportunityInsight.ts: try the free Groq API
 * first, fall back to a deterministic template built from the exact
 * same numbers on any failure (missing key, timeout, quota, bad
 * response). Either path is always grounded in real numbers, never a
 * generic placeholder. Only ever called for a period with at least one
 * completed job — lib/income/workerAnalyticsCache.ts skips this
 * entirely for a zero-data period.
 */

export type CoachingResult = {
  suggestionText: string;
  demandForecastText: string;
  source: "AI" | "HEURISTIC";
};

export async function generateCoaching(metrics: IncomeMetrics, area: DhakaArea): Promise<CoachingResult> {
  const fallback = deterministicCoaching(metrics, area);

  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) return fallback;

  const prompt = buildPrompt(metrics, area);
  const aiResult = await generateIncomeCoachingWithGroq(prompt, { apiKey });
  if (!aiResult) return fallback;

  return { ...aiResult, source: "AI" };
}

function buildPrompt(metrics: IncomeMetrics, area: DhakaArea): string {
  const areaLabel = AREA_LABEL_BY_VALUE.get(area) ?? area;
  const categoryLines = metrics.categoryBreakdown
    .slice(0, 5)
    .map((c) => `${c.categoryLabel}: ${c.jobCount} job(s), ${formatBdt(c.totalEarningsBdt)} earned`)
    .join("\n");

  return [
    `District: ${areaLabel}`,
    `Period type: ${metrics.range.toLowerCase()}`,
    `Total earnings: ${formatBdt(metrics.totalEarningsBdt)}`,
    `Completed jobs: ${metrics.jobsCompleted}`,
    `Average job value: ${formatBdt(metrics.avgJobValueBdt)}`,
    metrics.peakHour
      ? `Peak earning period: ${metrics.peakHour.label} (${formatBdt(metrics.peakHour.earningsBdt)} earned then)`
      : "No single standout peak hour yet.",
    "Earnings by category, highest first:",
    categoryLines || "No categorized jobs yet.",
  ].join("\n");
}

function deterministicCoaching(metrics: IncomeMetrics, area: DhakaArea): CoachingResult {
  const areaLabel = AREA_LABEL_BY_VALUE.get(area) ?? area;
  const top = metrics.topCategory;

  const suggestionText = top
    ? `${top.categoryLabel} generated your highest earnings this period — ${formatBdt(top.totalEarningsBdt)} across ${top.jobCount} job${top.jobCount === 1 ? "" : "s"}.` +
      (metrics.peakHour
        ? ` Consider prioritizing ${top.categoryLabel.toLowerCase()} requests during your ${metrics.peakHour.label} peak.`
        : "")
    : "Complete a few more jobs this period to unlock a personalized suggestion.";

  const demandForecastText = top
    ? `Based on your recent history in ${areaLabel}, ${top.categoryLabel.toLowerCase()} may see steady demand next period — a general estimate, not a guarantee.`
    : `Not enough recent history in ${areaLabel} yet for a demand estimate.`;

  return { suggestionText, demandForecastText, source: "HEURISTIC" };
}
