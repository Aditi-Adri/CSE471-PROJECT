import type { LatLng } from "@/lib/geo";

interface DistanceMatrixElement {
  status: string;
  duration?: { value: number };
  duration_in_traffic?: { value: number };
}

interface DistanceMatrixResponse {
  rows?: { elements?: DistanceMatrixElement[] }[];
}

/**
 * Calls Google's Distance Matrix API with departure_time=now so the ETA
 * accounts for live traffic conditions. Returns minutes (rounded) or null
 * if the request fails or no API key is configured.
 */
export async function getTrafficAdjustedEtaMinutes(
  origin: LatLng,
  destination: LatLng
): Promise<number | null> {
  const key = process.env.GOOGLE_MAPS_SERVER_API_KEY;
  if (!key) return null;

  const params = new URLSearchParams({
    origins: `${origin.lat},${origin.lng}`,
    destinations: `${destination.lat},${destination.lng}`,
    departure_time: "now",
    traffic_model: "best_guess",
    key,
  });

  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`;

  try {
    const res = await fetch(url);
    const data = (await res.json()) as DistanceMatrixResponse;
    const element = data?.rows?.[0]?.elements?.[0];
    if (!element || element.status !== "OK") return null;

    const seconds = element.duration_in_traffic?.value ?? element.duration?.value;
    if (seconds == null) return null;
    return Math.round(seconds / 60);
  } catch (err) {
    console.error("Distance Matrix request failed:", (err as Error).message);
    return null;
  }
}

/**
 * Straight-line-distance fallback ETA, used whenever the Google Distance
 * Matrix API isn't reachable (no server key configured, request failed,
 * offline dev/demo mode, etc.) so the product still feels alive without
 * paid API keys wired up. Assumes ~24km/h average city driving speed.
 */
export function estimateEtaMinutesFallback(distanceKm: number): number {
  const AVG_SPEED_KMH = 24;
  const minutes = (distanceKm / AVG_SPEED_KMH) * 60;
  return Math.max(1, Math.round(minutes));
}