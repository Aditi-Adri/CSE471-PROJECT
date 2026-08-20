"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { DhakaArea } from "@/app/generated/prisma/client";
import type { OpportunityAreaData } from "./types";

type LeafletModule = typeof import("leaflet");

// react-leaflet touches `window` at import time, so it can't render on
// the server — same dynamic-import pattern as the other map components.
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false });
const CircleMarker = dynamic(() => import("react-leaflet").then((mod) => mod.CircleMarker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false });

// Red = highest shortage, amber = moderate, green = well-covered.
function scoreColor(ratio: number): string {
  if (ratio >= 0.66) return "#ef4444";
  if (ratio >= 0.33) return "#f59e0b";
  return "#10b981";
}

// The map half of the dashboard: one circle per area, sized and
// colored by shortage score. Clicking a circle (or a table row)
// selects that area in both places at once.
export function OpportunitiesHeatmap({
  areas,
  selectedArea,
  onSelectArea,
}: {
  areas: OpportunityAreaData[];
  selectedArea: DhakaArea | null;
  onSelectArea: (area: DhakaArea) => void;
}) {
  const [L, setL] = useState<LeafletModule | null>(null);

  useEffect(() => {
    import("leaflet").then((leaflet) => {
      import("leaflet/dist/leaflet.css");
      setL(leaflet);
    });
  }, []);

  if (!L || areas.length === 0) {
    return <div className="h-[420px] animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />;
  }

  // Find the highest score (for sizing circles) and the average
  // lat/lng of all areas (to center the map on Dhaka).
  let maxScore = 0.001;
  let latSum = 0;
  let lngSum = 0;
  for (const area of areas) {
    if (area.score > maxScore) maxScore = area.score;
    latSum += area.lat;
    lngSum += area.lng;
  }
  const center: [number, number] = [latSum / areas.length, lngSum / areas.length];

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-2 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        <span>Bigger, redder = bigger worker shortage right now</span>
        <span>Click an area for details</span>
      </div>
      <MapContainer center={center} zoom={11} scrollWheelZoom={false} style={{ height: 420, width: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        {areas.map((a) => {
          const ratio = a.score / maxScore;
          const isSelected = selectedArea === a.area;
          return (
            <CircleMarker
              key={a.area}
              center={[a.lat, a.lng]}
              radius={10 + ratio * 22}
              pathOptions={{
                color: isSelected ? "#1d4ed8" : "#ffffff",
                weight: isSelected ? 3 : 1.5,
                fillColor: scoreColor(ratio),
                fillOpacity: 0.75,
              }}
              eventHandlers={{ click: () => onSelectArea(a.area) }}
            >
              <Popup>
                <div className="flex min-w-[180px] flex-col gap-1">
                  <span className="font-semibold text-zinc-900">{a.label}</span>
                  <span className="text-xs text-zinc-600">Shortage score: {a.score.toFixed(1)}</span>
                  <span className="text-xs text-zinc-600">{a.openJobRequests} open job requests</span>
                  <span className="text-xs text-zinc-600">{a.availableWorkers} available workers nearby</span>
                  <span className="text-xs text-zinc-600">
                    {a.recentSosRequests} SOS · {a.recentBookings} bookings (30d)
                  </span>
                  <Link
                    href={`/dashboard/job-requests?area=${a.area}`}
                    className="mt-1 text-xs font-medium text-brand-600 hover:underline"
                  >
                    Browse open jobs here →
                  </Link>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
