"use client";

import { useEffect, useState } from "react";
import { formatBdt } from "@/lib/format";

type WorkshopItem = {
  id: string;
  title: string;
  description: string;
  scheduledAt: string;
  isPaid: boolean;
  feeBdt: number | null;
  hostedBy: string;
  registrationCount: number;
};

// The admin's list of every workshop they (or another admin) created,
// with how many people have registered for each one so far.
export function AdminWorkshopsList({ refreshKey }: { refreshKey: number }) {
  const [workshops, setWorkshops] = useState<WorkshopItem[] | null>(null);

  useEffect(() => {
    fetch("/api/workshops")
      .then((response) => response.json())
      .then((data: { workshops: WorkshopItem[] }) => setWorkshops(data.workshops || []))
      .catch(() => setWorkshops([]));
  }, [refreshKey]);

  if (workshops === null) {
    return <div className="h-32 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />;
  }

  if (workshops.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">No workshops created yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {workshops.map((workshop) => (
        <div
          key={workshop.id}
          className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{workshop.title}</p>
            {workshop.isPaid ? (
              <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                {formatBdt(workshop.feeBdt ?? 0)}
              </span>
            ) : (
              <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                Free
              </span>
            )}
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{workshop.description}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
            <span>🗓️ {new Date(workshop.scheduledAt).toLocaleString()}</span>
            <span>Hosted by {workshop.hostedBy}</span>
            <span>
              {workshop.registrationCount} {workshop.registrationCount === 1 ? "person" : "people"} registered
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
