import { summarizeOpportunitiesWithGroq } from "@/lib/ai/groqClient";
import type { OpportunityArea } from "./demandScore";

/**
 * Turns the top few areas from getOpportunityAreas() into one short,
 * actionable sentence for the worker opportunities dashboard — same
 * two-tier strategy as lib/ai/categoryMapper.ts: try the free Groq API
 * first, fall back to a deterministic template built from the same
 * numbers on any failure (missing key, timeout, quota, bad response).
 * Either path is always a real sentence grounded in real numbers —
 * never a generic placeholder.
 */
export async function getOpportunityInsight(topAreas: OpportunityArea[]): Promise<string> {
  const fallback = deterministicInsight(topAreas);
  if (topAreas.length === 0 || topAreas[0].score <= 0) return fallback;

  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) return fallback;

  const prompt = topAreas
    .slice(0, 5)
    .map(
      (a) =>
        `${a.label}: score ${a.score.toFixed(1)} (${a.openJobRequests} open requests, ` +
        `${a.recentSosRequests} recent SOS calls, ${a.recentBookings} recent bookings, ` +
        `${a.availableWorkers} available workers nearby)`
    )
    .join("\n");

  const aiResult = await summarizeOpportunitiesWithGroq(prompt, { apiKey });
  return aiResult ?? fallback;
}

function deterministicInsight(topAreas: OpportunityArea[]): string {
  const top = topAreas[0];
  if (!top || top.score <= 0) {
    return "No standout shortage right now — demand and worker supply look roughly balanced across Dhaka.";
  }
  return (
    `${top.label} currently has the biggest shortage — ${top.openJobRequests} open request` +
    `${top.openJobRequests === 1 ? "" : "s"} and only ${top.availableWorkers} available worker` +
    `${top.availableWorkers === 1 ? "" : "s"} nearby. Consider going online there.`
  );
}
