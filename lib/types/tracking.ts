import type { LatLng } from "@/lib/geo";

export type { LatLng };

/** Broadcast over the `tracking:{bookingId}` room — see server.ts. */
export type LocationUpdatePayload = {
  bookingId: string;
  lat: number;
  lng: number;
  etaMinutes: number | null;
};

/** A worker's rough offset from the customer, for the SOS radar widget — see lib/geo.ts's relativeKm. */
export type NearbyWorkerOffset = {
  workerId: string;
  dx: number;
  dy: number;
};
