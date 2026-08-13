"use client";

import { useEffect, useState } from "react";
import { DHAKA_AREAS, AREA_LABEL_BY_VALUE } from "@/lib/constants/dhakaAreas";
import { formatBdt } from "@/lib/format";
import { inputClasses, primaryButtonClasses } from "@/lib/ui/formStyles";
import type { DhakaArea } from "@/app/generated/prisma/client";

type JobRequestItem = {
  id: string;
  description: string;
  area: DhakaArea;
  budgetMinBdt: number | null;
  budgetMaxBdt: number | null;
  createdAt: string;
  customer: { name: string };
};

/** A flat job budget, not an hourly rate — so no "/hr" suffix here, unlike a Worker's rate range. */
function formatBudget(minBdt: number | null, maxBdt: number | null): string | null {
  if (minBdt && maxBdt) return `${formatBdt(minBdt)}–${formatBdt(maxBdt)}`;
  if (minBdt) return `From ${formatBdt(minBdt)}`;
  if (maxBdt) return `Up to ${formatBdt(maxBdt)}`;
  return null;
}

/**
 * The worker-facing browse/claim list at /dashboard/job-requests — the
 * mirror image of the customer's search: same "filter by area" idea,
 * pointed at open JobRequests instead of Workers.
 */
export function JobRequestsList() {
  const [area, setArea] = useState("");
  const [requests, setRequests] = useState<JobRequestItem[] | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function refetch() {
    const url = area ? `/api/job-requests?area=${area}` : "/api/job-requests";
    fetch(url)
      .then((res) => res.json())
      .then((data: { requests: JobRequestItem[] }) => setRequests(data.requests ?? []))
      .catch(() => setRequests([]));
  }

  useEffect(refetch, [area]);

  async function handleClaim(id: string) {
    setClaimingId(id);
    setMessage(null);
    try {
      const res = await fetch(`/api/job-requests/${id}`, { method: "PATCH" });
      if (res.ok) {
        setMessage("Claimed — reach out using the details below.");
        refetch();
      } else {
        const body = await res.json().catch(() => null);
        setMessage(body?.error ?? "Couldn't claim this request.");
      }
    } finally {
      setClaimingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">Filter by area</span>
        <select value={area} onChange={(e) => setArea(e.target.value)} className={`${inputClasses} max-w-xs`}>
          <option value="">All areas</option>
          {DHAKA_AREAS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
      </label>

      {message && <p className="text-sm text-brand-700 dark:text-brand-400">{message}</p>}

      {requests === null ? (
        <div className="h-32 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
      ) : requests.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No open requests right now{area ? " in this area" : ""}.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {requests.map((r) => (
            <div
              key={r.id}
              className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <p className="text-sm text-zinc-900 dark:text-zinc-50">{r.description}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                <span>📍 {AREA_LABEL_BY_VALUE.get(r.area) ?? r.area}</span>
                {formatBudget(r.budgetMinBdt, r.budgetMaxBdt) && (
                  <span>💵 {formatBudget(r.budgetMinBdt, r.budgetMaxBdt)}</span>
                )}
                <span>Posted by {r.customer.name}</span>
              </div>
              <button
                type="button"
                onClick={() => handleClaim(r.id)}
                disabled={claimingId === r.id}
                className={`${primaryButtonClasses} mt-1 self-start px-4 py-2`}
              >
                {claimingId === r.id ? "Claiming…" : "I'll take this"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
