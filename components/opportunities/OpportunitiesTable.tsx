"use client";

import Link from "next/link";
import type { DhakaArea } from "@/app/generated/prisma/client";
import type { OpportunityAreaData } from "./types";

// Same area data as the heatmap, shown as a plain table instead of a
// map. Clicking a row selects that area (synced with the map above).
export function OpportunitiesTable({
  areas,
  selectedArea,
  onSelectArea,
}: {
  areas: OpportunityAreaData[];
  selectedArea: DhakaArea | null;
  onSelectArea: (area: DhakaArea) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
            <th className="px-4 py-2.5">Area</th>
            <th className="px-4 py-2.5">Shortage score</th>
            <th className="px-4 py-2.5">Open requests</th>
            <th className="px-4 py-2.5">Available workers</th>
            <th className="px-4 py-2.5"></th>
          </tr>
        </thead>
        <tbody>
          {areas.map((a) => {
            const isSelected = selectedArea === a.area;
            return (
              <tr
                key={a.area}
                onClick={() => onSelectArea(a.area)}
                className={`cursor-pointer border-b border-zinc-100 transition last:border-0 hover:bg-zinc-50 dark:border-zinc-800/60 dark:hover:bg-zinc-900/60 ${
                  isSelected ? "bg-brand-50/60 dark:bg-brand-950/30" : ""
                }`}
              >
                <td className="px-4 py-2.5 font-medium text-zinc-900 dark:text-zinc-50">{a.label}</td>
                <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-300">{a.score.toFixed(1)}</td>
                <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-300">{a.openJobRequests}</td>
                <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-300">{a.availableWorkers}</td>
                <td className="px-4 py-2.5 text-right">
                  <Link
                    href={`/dashboard/job-requests?area=${a.area}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
                  >
                    Browse jobs →
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
