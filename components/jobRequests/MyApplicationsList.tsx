"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/search/Avatar";
import { AREA_LABEL_BY_VALUE } from "@/lib/constants/dhakaAreas";
import { formatBdt } from "@/lib/format";
import type { DhakaArea } from "@/app/generated/prisma/client";

type MyApplicationItem = {
  id: string;
  appliedAt: string;
  jobRequest: {
    id: string;
    description: string;
    area: DhakaArea;
    budgetMinBdt: number | null;
    budgetMaxBdt: number | null;
    status: "OPEN" | "HIRED";
    createdAt: string;
    hiredAt: string | null;
    hired: boolean;
    customer: { name: string; phone: string | null } | null;
  };
};

function statusBadge(app: MyApplicationItem["jobRequest"]) {
  if (app.status === "OPEN") {
    return {
      label: "Waiting for the customer to pick someone",
      className: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
    };
  }
  if (app.hired) {
    return {
      label: "You were hired 🎉",
      className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
    };
  }
  return {
    label: "Went to another worker",
    className: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
  };
}

/**
 * The worker's own applications — /dashboard/my-applications. Since
 * there's no push/email notification system, this page (checked
 * manually) is how a worker finds out whether they got hired. Once
 * hired, the customer's name and phone number show up right here —
 * withheld before that, and withheld from every other applicant who
 * wasn't picked.
 */
export function MyApplicationsList() {
  const [applications, setApplications] = useState<MyApplicationItem[] | null>(null);

  useEffect(() => {
    fetch("/api/job-requests/my-applications")
      .then((res) => res.json())
      .then((data: { applications: MyApplicationItem[] }) => setApplications(data.applications ?? []))
      .catch(() => setApplications([]));
  }, []);

  if (applications === null) {
    return <div className="h-32 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />;
  }

  if (applications.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        You haven&apos;t applied to any open requests yet — browse them at{" "}
        <span className="font-medium">Open requests</span>.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {applications.map(({ id, jobRequest: r }) => {
        const badge = statusBadge(r);
        return (
          <div
            key={id}
            className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-zinc-900 dark:text-zinc-50">{r.description}</p>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
                {badge.label}
              </span>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
              <span>📍 {AREA_LABEL_BY_VALUE.get(r.area) ?? r.area}</span>
              {(r.budgetMinBdt || r.budgetMaxBdt) && (
                <span>
                  💵 {r.budgetMinBdt ? formatBdt(r.budgetMinBdt) : "?"}–
                  {r.budgetMaxBdt ? formatBdt(r.budgetMaxBdt) : "?"}
                </span>
              )}
            </div>

            {r.hired && r.customer && (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900 dark:bg-emerald-950/20">
                <Avatar name={r.customer.name} seed={r.customer.name} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {r.customer.name}
                  </p>
                  <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {r.customer.phone ?? "No phone number on file"}
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
