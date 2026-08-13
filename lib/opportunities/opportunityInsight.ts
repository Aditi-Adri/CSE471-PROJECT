import { summarizeOpportunitiesWithGroq } from "@/lib/ai/groqClient";
import type { OpportunityArea } from "./demandScore";
import type { DhakaWeather } from "@/lib/weather/openMeteo";

/**
 * Turns the top few areas from getOpportunityAreas() into one short,
 * actionable sentence for the worker opportunities dashboard — same
 * two-tier strategy as lib/ai/categoryMapper.ts: try the free Groq API
 * first, fall back to a deterministic template built from the same
 * numbers on any failure (missing key, timeout, quota, bad response).
 * Either path is always a real sentence grounded in real numbers —
 * never a generic placeholder.
 *
 * `weather`, if given, is handed to Groq as a plain fact to mention if
 * relevant ("it's currently raining") — the prompt explicitly does not
 * ask it to assert a demand-weather correlation, because we don't have
 * real data to back one. See lib/weather/openMeteo.ts.
 */
export async function getOpportunityInsight(
  topAreas: OpportunityArea[],
  weather?: DhakaWeather | null
): Promise<string> {
  const fallback = deterministicInsight(topAreas);
  if (topAreas.length === 0 || topAreas[0].score <= 0) return fallback;

  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) return fallback;

  const areaLines = topAreas
    .slice(0, 5)
    .map(
      (a) =>
        `${a.label}: score ${a.score.toFixed(1)} (${a.openJobRequests} open requests, ` +
        `${a.recentSosRequests} recent SOS calls, ${a.recentBookings} recent bookings, ` +
        `${a.availableWorkers} available workers nearby)`
    )
    .join("\n");

  const weatherLine = weather
    ? `\nCurrent Dhaka weather (mention only if genuinely relevant, don't invent a cause-effect claim): ` +
      `${weather.condition}, ${weather.temperatureC}°C, ${weather.precipitationMm}mm precipitation.`
    : "";

  const prompt = areaLines + weatherLine;

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
