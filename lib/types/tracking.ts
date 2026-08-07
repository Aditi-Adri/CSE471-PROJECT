import type { LatLng } from "@/lib/geo";

export type { LatLng };

export type TrackingWorkerSummary = {
  id: string;
  name: string;
  role: string;
  rating: number;
  avatarInitials: string | null;
  lat: number;
  lng: number;
};

export type NearbyWorker = {
  workerId: string;
  name: string;
  dx: number;
  dy: number;
};

export type AcceptedSosWorker = {
  sosId: string;
  workerId: string;
  etaMinutes: number | null;
  worker: {
    name: string;
    role: string;
    rating: number;
    avatarInitials: string;
  } | null;
  workerLocation: LatLng | null;
};

export type SosApiResponse = {
  sosId: string;
  status: "PENDING" | "ACCEPTED";
  radiusKm: number;
  customerLocation: LatLng;
  alertedWorkerCount: number;
  nearbyWorkers: NearbyWorker[];
  accepted: AcceptedSosWorker | null;
  createdAt: string;
};

export type TrackingApiResponse = {
  id: string;
  status: "PENDING" | "IN_TRANSIT" | "ARRIVED";
  etaMinutes: number | null;
  tenMinuteAlertSent: boolean;
  destination: LatLng;
  worker: {
    id: string;
    name: string;
    role: string;
    rating: number;
    avatarInitials: string | null;
    lat: number;
    lng: number;
  } | null;
  customerId?: string;
  customerPhone?: string;
};

export type SosNewAlert = {
  sosId: string;
  lat: number;
  lng: number;
  createdAt: string;
};

export type SosAcceptedPayload = AcceptedSosWorker;

export type LocationUpdatePayload = {
  bookingId: string;
  lat: number;
  lng: number;
  etaMinutes: number | null;
};