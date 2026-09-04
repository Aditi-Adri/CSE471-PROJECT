"use client";

import { useEffect, useState } from "react";

type ComplaintItem = {
  id: string;
  subject: string;
  description: string;
  status: "PENDING" | "RESOLVED";
  adminReply: string | null;
  resolvedAt: string | null;
  createdAt: string;
  worker: { id: string; headline: string; user: { name: string } };
};

// The customer's own filed complaints, and any admin reply once one
// is resolved. Read-only — filing happens from a worker's profile page.
export function MyComplaintsList() {
  const [complaints, setComplaints] = useState<ComplaintItem[] | null>(null);

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/complaints/mine");
      const data: { complaints: ComplaintItem[] } = await response.json();
      setComplaints(data.complaints || []);
    }
    load().catch(() => setComplaints([]));
  }, []);

  if (complaints === null) {
    return <div className="h-32 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />;
  }

  if (complaints.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        You haven&apos;t filed any complaints — you can file one from a worker&apos;s profile page.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {complaints.map((complaint) => (
        <div
          key={complaint.id}
          className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{complaint.subject}</p>
            {complaint.status === "PENDING" ? (
              <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                Pending
              </span>
            ) : (
              <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                Resolved
              </span>
            )}
          </div>

          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Against {complaint.worker.user.name} — {complaint.worker.headline}
          </p>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">{complaint.description}</p>

          {complaint.adminReply && (
            <div className="mt-1 rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950">
              <p className="mb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">Admin reply</p>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">{complaint.adminReply}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
