"use client";

import { useEffect, useState } from "react";
import { errorBannerClasses, primaryButtonClasses } from "@/lib/ui/formStyles";

type ComplaintItem = {
  id: string;
  subject: string;
  description: string;
  status: "PENDING" | "RESOLVED";
  adminReply: string | null;
  resolvedAt: string | null;
  createdAt: string;
  customer: { name: string; email: string };
  worker: { id: string; headline: string; user: { name: string } };
};

const TABS = ["pending", "all"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = { pending: "Pending", all: "All complaints" };

// The admin's complaint queue: read what a customer reported about a
// worker, then resolve it with an optional reply back to them.
export function AdminComplaintsDashboard() {
  const [complaints, setComplaints] = useState<ComplaintItem[] | null>(null);
  const [tab, setTab] = useState<Tab>("pending");

  function refetch() {
    fetch("/api/admin/complaints")
      .then((response) => response.json())
      .then((data: { complaints: ComplaintItem[] }) => setComplaints(data.complaints || []))
      .catch(() => setComplaints([]));
  }

  useEffect(refetch, []);

  if (complaints === null) {
    return <div className="h-40 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />;
  }

  // Count how many are still pending, for the tab label.
  let pendingCount = 0;
  for (const complaint of complaints) {
    if (complaint.status === "PENDING") {
      pendingCount += 1;
    }
  }

  // Pick which complaints the active tab should show.
  let visibleComplaints = complaints;
  if (tab === "pending") {
    visibleComplaints = [];
    for (const complaint of complaints) {
      if (complaint.status === "PENDING") {
        visibleComplaints.push(complaint);
      }
    }
  }

  return (
    <div>
      <div className="mb-6 flex gap-2 border-b border-zinc-200 dark:border-zinc-800">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
              tab === t
                ? "border-brand-600 text-brand-700 dark:text-brand-400"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            {TAB_LABELS[t]} ({t === "pending" ? pendingCount : complaints.length})
          </button>
        ))}
      </div>

      {visibleComplaints.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Nothing here right now.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {visibleComplaints.map((complaint) => (
            <ComplaintCard key={complaint.id} complaint={complaint} onResolved={refetch} />
          ))}
        </div>
      )}
    </div>
  );
}

function ComplaintCard({ complaint, onResolved }: { complaint: ComplaintItem; onResolved: () => void }) {
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleResolve() {
    setBusy(true);
    setError(null);

    let replyToSend = undefined;
    if (reply.trim().length > 0) {
      replyToSend = reply.trim();
    }

    try {
      const res = await fetch("/api/admin/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ complaintId: complaint.id, reply: replyToSend }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "Something went wrong.");
        return;
      }
      onResolved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-zinc-900 dark:text-zinc-50">{complaint.subject}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Filed by {complaint.customer.name} ({complaint.customer.email}) against{" "}
            {complaint.worker.user.name} — {complaint.worker.headline} ·{" "}
            {new Date(complaint.createdAt).toLocaleString()}
          </p>
        </div>
        {complaint.status === "RESOLVED" && (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            Resolved
          </span>
        )}
      </div>

      <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">{complaint.description}</p>

      {complaint.adminReply && (
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">Your reply: {complaint.adminReply}</p>
      )}

      {error && <p className={`mt-2 ${errorBannerClasses}`}>{error}</p>}

      {complaint.status === "PENDING" && (
        <div className="mt-3 flex flex-col gap-2">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="Optional reply to the customer..."
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
          />
          <button
            type="button"
            onClick={handleResolve}
            disabled={busy}
            className={`${primaryButtonClasses} mt-0 self-start px-4 py-2`}
          >
            {busy ? "Resolving…" : "Resolve"}
          </button>
        </div>
      )}
    </div>
  );
}
