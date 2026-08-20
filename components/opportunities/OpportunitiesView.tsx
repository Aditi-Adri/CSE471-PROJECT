"use client";

import { useEffect, useState } from "react";
import type { DhakaArea } from "@/app/generated/prisma/client";
import { OpportunitiesHeatmap } from "./OpportunitiesHeatmap";
import { OpportunitiesTable } from "./OpportunitiesTable";
import type { OpportunityAreaData } from "./types";

type Weather = {
  temperatureC: number;
  precipitationMm: number;
  windSpeedKmh: number;
  condition: string;
} | null;

type OpportunitiesResponse = {
  areas: OpportunityAreaData[];
  weather: Weather;
  insight: string;
};

// The main opportunities dashboard. Loads everything from one API
// call and keeps track of which area is "selected," so clicking
// either the map or the table highlights both at once.
export function OpportunitiesView() {
  const [data, setData] = useState<OpportunitiesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<DhakaArea | null>(null);

  useEffect(() => {
    fetch("/api/opportunities")
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? "Couldn't load opportunities.");
        }
        return res.json();
      })
      .then((body: OpportunitiesResponse) => setData(body))
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  }

  if (!data) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-16 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
        <div className="h-[420px] animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-brand-200 bg-brand-50/60 p-4 dark:border-brand-900 dark:bg-brand-950/30">
        <div className="mb-1 flex items-center gap-2">
          <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
            AI insight
          </span>
        </div>
        <p className="text-sm text-zinc-800 dark:text-zinc-200">{data.insight}</p>
      </div>

      {data.weather && (
        <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-2xl" aria-hidden="true">
            🌤️
          </span>
          <div>
            <p className="font-medium capitalize text-zinc-900 dark:text-zinc-50">
              {data.weather.condition}, {Math.round(data.weather.temperatureC)}°C in Dhaka
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {data.weather.precipitationMm > 0 ? `${data.weather.precipitationMm}mm precipitation · ` : ""}
              Wind {Math.round(data.weather.windSpeedKmh)} km/h
            </p>
          </div>
        </div>
      )}

      <OpportunitiesHeatmap areas={data.areas} selectedArea={selectedArea} onSelectArea={setSelectedArea} />
      <OpportunitiesTable areas={data.areas} selectedArea={selectedArea} onSelectArea={setSelectedArea} />
    </div>
  );
}
