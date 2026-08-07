export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Haversine distance between two lat/lng points, in kilometers.
 */
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = deg2rad(lat2 - lat1);
  const dLng = deg2rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Filters a list of { lat, lng, ...rest } records to those within radiusKm
 * of the given origin point. Used for the SOS "3km boundary" geo-query.
 */
export function withinRadius<T extends LatLng>(
  origin: LatLng,
  points: T[],
  radiusKm: number
): T[] {
  return points.filter((p) => distanceKm(origin.lat, origin.lng, p.lat, p.lng) <= radiusKm);
}

/**
 * Small-scale equirectangular projection of `point` relative to `origin`,
 * returned in kilometers (dx = east/west offset, dy = north/south offset).
 * Good enough for plotting nearby workers on the SOS radar widget - not
 * meant for large distances.
 */
export function relativeKm(origin: LatLng, point: LatLng): { dx: number; dy: number } {
  const R = 6371;
  const dLat = deg2rad(point.lat - origin.lat);
  const dLng = deg2rad(point.lng - origin.lng);
  const dy = dLat * R;
  const dx = dLng * R * Math.cos(deg2rad(origin.lat));
  return { dx, dy };
}