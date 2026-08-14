import type { DhakaArea } from "@/app/generated/prisma/client";

/**
 * Approximate neighborhood-center coordinates for each `DhakaArea`.
 *
 * Neither `Worker` nor `User` stores real lat/lng — geocoding a street
 * address is a paid API (Google/Mapbox) the team explicitly isn't
 * using (see docs/FEATURE_SPEC.md's tech-stack table). This is the
 * free-tier-first substitute: good enough to plot a worker on a map by
 * neighborhood and to give a real booking a plausible destination
 * point, not precise enough to substitute for a real address — that's
 * exactly why `Booking.serviceAddress` is captured separately as text
 * rather than derived from this table.
 */
export const DHAKA_AREA_COORDS: Record<DhakaArea, { lat: number; lng: number }> = {
  GULSHAN: { lat: 23.7925, lng: 90.4078 },
  BANANI: { lat: 23.7937, lng: 90.4066 },
  BARIDHARA: { lat: 23.8103, lng: 90.4125 },
  DHANMONDI: { lat: 23.7461, lng: 90.3742 },
  UTTARA: { lat: 23.8759, lng: 90.3795 },
  MIRPUR: { lat: 23.8223, lng: 90.3654 },
  MOHAMMADPUR: { lat: 23.7656, lng: 90.3587 },
  BASHUNDHARA: { lat: 23.8153, lng: 90.4344 },
  BADDA: { lat: 23.7805, lng: 90.4266 },
  RAMPURA: { lat: 23.7588, lng: 90.4256 },
  MOTIJHEEL: { lat: 23.7332, lng: 90.4172 },
  OLD_DHAKA: { lat: 23.7104, lng: 90.4074 },
  WARI: { lat: 23.7186, lng: 90.4223 },
  LALMATIA: { lat: 23.7529, lng: 90.3684 },
  FARMGATE: { lat: 23.7581, lng: 90.3897 },
  TEJGAON: { lat: 23.7644, lng: 90.3938 },
  KHILGAON: { lat: 23.7495, lng: 90.4291 },
  MALIBAGH: { lat: 23.7458, lng: 90.4128 },
  JATRABARI: { lat: 23.7104, lng: 90.4356 },
  MOHAKHALI: { lat: 23.7787, lng: 90.4055 },
  BANASREE: { lat: 23.7663, lng: 90.4364 },
  SAVAR: { lat: 23.8583, lng: 90.2667 },
};

/**
 * A small deterministic offset (derived from a seed string, not
 * random) so multiple workers in the same area don't render as one
 * pin stacked on top of another on the map.
 */
export function jitterCoord(base: { lat: number; lng: number }, seed: string): { lat: number; lng: number } {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const angle = (hash % 360) * (Math.PI / 180);
  const radiusDeg = 0.006 + ((hash >> 8) % 100) / 100000; // ~600-700m, tiny spread
  return {
    lat: base.lat + Math.sin(angle) * radiusDeg,
    lng: base.lng + Math.cos(angle) * radiusDeg,
  };
}
