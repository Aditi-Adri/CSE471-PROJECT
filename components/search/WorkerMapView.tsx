"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { DHAKA_AREA_COORDS, jitterCoord } from "@/lib/constants/dhakaAreaCoords";
import { formatRateRange } from "@/lib/format";
import type { WorkerResult } from "@/lib/types/search";

type LeafletModule = typeof import("leaflet");

// Same dynamic-import pattern as components/tracking/LiveTrackingMap.tsx —
// react-leaflet touches `window` at import time, so it can't render on
// the server.
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false });

/**
 * MODULE 1 -> FEATURE 2 (Adri): "see how many workers are available
 * near you and their ratings, on a map, and pick one" — the gap
 * flagged in docs/FEATURE_SPEC.md. Pins sit at each worker's DhakaArea
 * centroid with a small deterministic jitter, not a real address —
 * see lib/constants/dhakaAreaCoords.ts for why (no paid geocoding).
 */
export function WorkerMapView({ workers }: { workers: WorkerResult[] }) {
  const [L, setL] = useState<LeafletModule | null>(null);

  useEffect(() => {
    import("leaflet").then((leaflet) => {
      import("leaflet/dist/leaflet.css");
      setL(leaflet);
    });
  }, []);

  if (!L) {
    return <div className="h-[420px] animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />;
  }

  if (workers.length === 0) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        No technicians to plot for this search.
      </div>
    );
  }

  const pinIcon = L.divIcon({
    className: "hirelocal-worker-pin",
    html: `<div style="background:#4f46e5; width:14px; height:14px; border-radius:50%; border:2.5px solid #fff; box-shadow:0 1px 4px rgba(0,0,0,0.35);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

  const points = workers.map((w) => ({ worker: w, coords: jitterCoord(DHAKA_AREA_COORDS[w.area], w.id) }));
  const center: [number, number] = [
    points.reduce((sum, p) => sum + p.coords.lat, 0) / points.length,
    points.reduce((sum, p) => sum + p.coords.lng, 0) / points.length,
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-2 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        <span>
          {workers.length} {workers.length === 1 ? "technician" : "technicians"} shown
        </span>
        <span>Pins are approximate (neighborhood-level, not exact addresses)</span>
      </div>
      <MapContainer center={center} zoom={12} scrollWheelZoom={false} style={{ height: 420, width: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        {points.map(({ worker, coords }) => (
          <Marker key={worker.id} position={[coords.lat, coords.lng]} icon={pinIcon}>
            <Popup>
              <div className="flex min-w-[160px] flex-col gap-1">
                <span className="font-semibold text-zinc-900">{worker.name}</span>
                <span className="text-xs text-zinc-600">
                  ★ {worker.ratingAvg > 0 ? worker.ratingAvg.toFixed(1) : "New"} ({worker.ratingCount}) ·{" "}
                  {formatRateRange(worker.hourlyRateMinBdt, worker.hourlyRateMaxBdt)}
                </span>
                <Link href={`/workers/${worker.id}`} className="text-xs font-medium text-brand-600 hover:underline">
                  View profile →
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
