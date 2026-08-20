// Gets the real current Dhaka weather from Open-Meteo — a free API
// that needs no API key or signup. Shown as its own card on the
// opportunities dashboard, kept separate from the demand score itself
// since there's no real data proving weather affects demand here.

const DHAKA_CENTER = { lat: 23.8103, lng: 90.4125 };
const DEFAULT_TIMEOUT_MS = 4000;

export type DhakaWeather = {
  temperatureC: number;
  precipitationMm: number;
  windSpeedKmh: number;
  condition: string;
};

// Turns Open-Meteo's numeric weather code into a plain English word.
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

// Never throws — returns null on any failure (network, timeout, bad
// response), so the weather card just doesn't show instead of crashing.
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
