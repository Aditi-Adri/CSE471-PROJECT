"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { DHAKA_AREA_COORDS, jitterCoord } from "@/lib/constants/dhakaAreaCoords";
import { formatRadiusKm } from "@/lib/constants/subscriptionPlans";
import type { DhakaArea } from "@/app/generated/prisma/client";

type LeafletModule = typeof import("leaflet");

// Same dynamic-import pattern as components/search/WorkerMapView.tsx and
// components/opportunities/OpportunitiesHeatmap.tsx — react-leaflet
// touches `window` at import time, so it can't render on the server.
//
// This is the project's real, already-implemented "map" — Leaflet +
// OpenStreetMap tiles, not Google Maps (this codebase never added the
// Google Maps JS API — see docs/FEATURE_SPEC.md's tech-stack table).
// Reusing this exact stack is what "reuse the existing map setup"
// means here.
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false });
const Circle = dynamic(() => import("react-leaflet").then((mod) => mod.Circle), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false });

// The Unlimited plan is "city-wide" — drawing a literal 9999km circle
// would just fill the whole map with nothing useful to look at, so it's
// capped to a big-but-sensible radius for drawing purposes only. The
// text label still says "City-wide", not a number.
const MAX_DRAWN_RADIUS_KM = 25;

/** Picks a zoom level that keeps the whole circle comfortably on screen. */
function zoomForRadius(radiusKm: number): number {
  if (radiusKm <= 2) return 13;
  if (radiusKm <= 5) return 12;
  if (radiusKm <= 15) return 10;
  return 9;
}

export function WorkingRadiusMap({
  area,
  currentLat,
  currentLng,
  radiusKm,
  seed,
}: {
  area: DhakaArea;
  currentLat: number | null;
  currentLng: number | null;
  radiusKm: number;
  seed: string;
}) {
  const [L, setL] = useState<LeafletModule | null>(null);

  useEffect(() => {
    import("leaflet").then((leaflet) => {
      import("leaflet/dist/leaflet.css");
      setL(leaflet);
    });
  }, []);

  if (!L) {
    return <div className="h-[380px] animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />;
  }

  // Prefer the worker's real last-known GPS fix (set while they're
  // online for live tracking — see Worker.currentLat/currentLng) if
  // it's available; otherwise fall back to their area's neighborhood
  // centroid with a small deterministic jitter, exactly like
  // WorkerMapView does for the same "no paid geocoding" reason.
  const center: [number, number] =
    currentLat != null && currentLng != null
      ? [currentLat, currentLng]
      : (() => {
          const c = jitterCoord(DHAKA_AREA_COORDS[area], seed);
          return [c.lat, c.lng];
        })();

  const drawnRadiusKm = Math.min(radiusKm, MAX_DRAWN_RADIUS_KM);

  const homeIcon = L.divIcon({
    className: "hirelocal-subscription-pin",
    html: `<div style="background:#4f46e5; width:16px; height:16px; border-radius:50%; border:3px solid #fff; box-shadow:0 1px 5px rgba(0,0,0,0.4);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-2 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        <span>Your working location</span>
        <span>Shaded circle = your current service radius ({formatRadiusKm(radiusKm)})</span>
      </div>
      <MapContainer center={center} zoom={zoomForRadius(radiusKm)} scrollWheelZoom={false} style={{ height: 380, width: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <Circle
          center={center}
          radius={drawnRadiusKm * 1000}
          pathOptions={{ color: "#4f46e5", fillColor: "#818cf8", fillOpacity: 0.2, weight: 2 }}
        />
        <Marker position={center} icon={homeIcon}>
          <Popup>Your approximate working location</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
