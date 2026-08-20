"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/search/Avatar";
import { AREA_LABEL_BY_VALUE } from "@/lib/constants/dhakaAreas";
import { formatBdt } from "@/lib/format";
import { BuyPartsForm } from "./BuyPartsForm";
import type { DhakaArea } from "@/app/generated/prisma/client";

type MyApplicationItem = {
  id: string;
  wageBdt: number;
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
    partsTotalBdt: number;
    totalBillBdt: number;
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

// The worker's own applications, and whether each one got hired. Once
// hired, the customer's contact info shows up here too.
export function MyApplicationsList() {
  const [applications, setApplications] = useState<MyApplicationItem[] | null>(null);

  function refetch() {
    fetch("/api/job-requests/my-applications")
      .then((res) => res.json())
      .then((data: { applications: MyApplicationItem[] }) => setApplications(data.applications ?? []))
      .catch(() => setApplications([]));
  }

  useEffect(refetch, []);

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
      {applications.map((application) => {
        const r = application.jobRequest;
        const badge = statusBadge(r);
        return (
          <div
            key={application.id}
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
              <span>Your wage: {formatBdt(application.wageBdt)}</span>
            </div>

            {r.hired && r.customer && (
              <div className="flex flex-col gap-3">
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

                <div className="text-xs text-zinc-600 dark:text-zinc-300">
                  <p>Wage: {formatBdt(application.wageBdt)}</p>
                  {r.partsTotalBdt > 0 && <p>Parts bought: {formatBdt(r.partsTotalBdt)}</p>}
                  <p className="font-semibold">Customer&apos;s total bill: {formatBdt(r.totalBillBdt)}</p>
                </div>

                <BuyPartsForm jobRequestId={r.id} onBought={refetch} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
