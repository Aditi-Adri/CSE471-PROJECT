/**
 * Real current Dhaka weather via Open-Meteo (https://open-meteo.com) —
 * a different free API than Groq, picked because it's the best tool
 * for *this* specific job: it needs no API key at all (no signup, no
 * quota to manage, none of the account-flagging trouble the team hit
 * with Gemini), which fits a small student project better than
 * anything requiring registration.
 *
 * Deliberately a separate, honest signal rather than folded into
 * demandScore.ts's score formula: we have no real data proving "rain
 * increases plumbing demand in Dhaka by X%" for this app, and making
 * that number up would contradict every other part of this feature,
 * which is built entirely from real rows. So weather is surfaced as
 * its own context card on the opportunities dashboard, and — see
 * opportunityInsight.ts — handed to the AI summary purely as a fact
 * to *describe* ("it's currently raining"), never as an instruction to
 * assert an unproven cause.
 */

const DHAKA_CENTER = { lat: 23.8103, lng: 90.4125 };
const DEFAULT_TIMEOUT_MS = 4000;

export type DhakaWeather = {
  temperatureC: number;
  precipitationMm: number;
  windSpeedKmh: number;
  condition: string;
};

// WMO weather codes (the standard Open-Meteo, and most weather APIs,
// report) reduced to the handful of plain-English buckets relevant
// here. Full table: https://open-meteo.com/en/docs#weathervariables
function describeWeatherCode(code: number): string {
  if (code === 0) return "clear sky";
  if (code <= 3) return "partly cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 57) return "drizzle";
  if (code >= 61 && code <= 67) return "rain";
  if (code >= 71 && code <= 77) return "snow";
  if (code >= 80 && code <= 82) return "rain showers";
  if (code >= 95) return "thunderstorm";
  return "mixed conditions";
}

/**
 * Never throws — returns null on any failure (network, timeout, bad
 * response), same defensive contract as the Groq calls. The weather
 * card just doesn't render rather than breaking the page.
 */
export async function getDhakaWeather(): Promise<DhakaWeather | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${DHAKA_CENTER.lat}&longitude=${DHAKA_CENTER.lng}` +
      `&current=temperature_2m,precipitation,weather_code,wind_speed_10m&timezone=Asia%2FDhaka`;

    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;

    const payload = await response.json();
    const current = payload?.current;
    if (!current || typeof current.temperature_2m !== "number") return null;

    return {
      temperatureC: current.temperature_2m,
      precipitationMm: current.precipitation ?? 0,
      windSpeedKmh: current.wind_speed_10m ?? 0,
      condition: describeWeatherCode(current.weather_code ?? -1),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
