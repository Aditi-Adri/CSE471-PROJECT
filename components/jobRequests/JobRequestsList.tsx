"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { DHAKA_AREAS, AREA_LABEL_BY_VALUE } from "@/lib/constants/dhakaAreas";
import { formatBdt } from "@/lib/format";
import { inputClasses, primaryButtonClasses, secondaryButtonClasses } from "@/lib/ui/formStyles";
import type { DhakaArea } from "@/app/generated/prisma/client";

type JobRequestItem = {
  id: string;
  description: string;
  area: DhakaArea;
  budgetMinBdt: number | null;
  budgetMaxBdt: number | null;
  createdAt: string;
  customer: { name: string };
  applicantCount: number;
  hasApplied: boolean;
};

// A flat job budget, not an hourly rate — no "/hr" suffix here.
function formatBudget(minBdt: number | null, maxBdt: number | null): string | null {
  if (minBdt && maxBdt) return `${formatBdt(minBdt)}–${formatBdt(maxBdt)}`;
  if (minBdt) return `From ${formatBdt(minBdt)}`;
  if (maxBdt) return `Up to ${formatBdt(maxBdt)}`;
  return null;
}

// The worker-facing browse/apply list at /dashboard/job-requests, with
// an area filter. The filter reads straight from the URL (`?area=`)
// instead of its own state, so a heatmap "Browse jobs here" link can
// change the filter without needing the page to reload.
export function JobRequestsList() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const area = searchParams.get("area") ?? "";

  const [requests, setRequests] = useState<JobRequestItem[] | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  // What each worker typed in the wage box, keyed by request id.
  const [wageInputs, setWageInputs] = useState<Record<string, string>>({});

  function setArea(newArea: string) {
    const params = new URLSearchParams(searchParams);
    if (newArea) params.set("area", newArea);
    else params.delete("area");
    router.replace(`/dashboard/job-requests?${params.toString()}`, { scroll: false });
  }

  function refetch() {
    const url = area ? `/api/job-requests?area=${area}` : "/api/job-requests";
    fetch(url)
      .then((res) => res.json())
      .then((data: { requests: JobRequestItem[] }) => setRequests(data.requests ?? []))
      .catch(() => setRequests([]));
  }

  useEffect(refetch, [area]);

  // Worker applies to one job request with a wage.
  async function handleApply(id: string) {
    const wageBdt = Number(wageInputs[id]);
    if (!wageBdt || wageBdt <= 0) {
      setMessage("Enter a wage first.");
      return;
    }
    setApplyingId(id);
    setMessage(null);
    try {
      const res = await fetch(`/api/job-requests/${id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wageBdt }),
      });
      if (res.ok) {
        setMessage("Applied — see /dashboard/my-applications once the customer picks someone.");
        refetch();
      } else {
        const body = await res.json().catch(() => null);
        setMessage(body?.error ?? "Couldn't apply to this request.");
      }
    } finally {
      setApplyingId(null);
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
                {r.applicantCount > 0 && (
                  <span>
                    {r.applicantCount} worker{r.applicantCount === 1 ? "" : "s"} applied
                  </span>
                )}
              </div>
              {r.hasApplied ? (
                <button type="button" disabled className={`${secondaryButtonClasses} mt-1 self-start px-4 py-2`}>
                  Applied ✓
                </button>
              ) : (
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    placeholder="Your wage (BDT)"
                    value={wageInputs[r.id] ?? ""}
                    onChange={(e) => setWageInputs({ ...wageInputs, [r.id]: e.target.value })}
                    className={`${inputClasses} w-40`}
                  />
                  <button
                    type="button"
                    onClick={() => handleApply(r.id)}
                    disabled={applyingId === r.id}
                    className={`${primaryButtonClasses} mt-0 px-4 py-2`}
                  >
                    {applyingId === r.id ? "Applying…" : "Apply for this job"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
