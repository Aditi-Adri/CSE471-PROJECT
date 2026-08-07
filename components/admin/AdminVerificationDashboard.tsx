"use client";

import { useCallback, useEffect, useState } from "react";
import { Tier1ReviewCard, type Tier1QueueItem } from "./Tier1ReviewCard";
import { Tier2ReviewCard, type Tier2QueueItem } from "./Tier2ReviewCard";
import { Tier3ReviewCard, type Tier3QueueItem } from "./Tier3ReviewCard";

type QueueData = { tier1: Tier1QueueItem[]; tier2: Tier2QueueItem[]; tier3: Tier3QueueItem[] };

const TABS = ["tier1", "tier2", "tier3"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = {
  tier1: "Tier 1 · NID",
  tier2: "Tier 2 · Skills test",
  tier3: "Tier 3 · Police clearance",
};

export function AdminVerificationDashboard() {
  const [data, setData] = useState<QueueData | null>(null);
  const [tab, setTab] = useState<Tab>("tier1");

  const refetch = useCallback(() => {
    fetch("/api/admin/verifications")
      .then((res) => res.json())
      .then(setData);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  if (!data) {
    return <div className="h-40 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />;
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
            {TAB_LABELS[t]} ({data[t].length})
          </button>
        ))}
      </div>

      {tab === "tier1" &&
        (data.tier1.length === 0 ? (
          <EmptyQueue />
        ) : (
          <div className="flex flex-col gap-4">
            {data.tier1.map((item) => (
              <Tier1ReviewCard key={item.workerId} item={item} onDecided={refetch} />
            ))}
          </div>
        ))}

      {tab === "tier2" &&
        (data.tier2.length === 0 ? (
          <EmptyQueue />
        ) : (
          <div className="flex flex-col gap-4">
            {data.tier2.map((item) => (
              <Tier2ReviewCard key={item.workerId} item={item} onDecided={refetch} />
            ))}
          </div>
        ))}

      {tab === "tier3" &&
        (data.tier3.length === 0 ? (
          <EmptyQueue />
        ) : (
          <div className="flex flex-col gap-4">
            {data.tier3.map((item) => (
              <Tier3ReviewCard key={item.workerId} item={item} onDecided={refetch} />
            ))}
          </div>
        ))}
    </div>
  );
}

function EmptyQueue() {
  return <p className="text-sm text-zinc-500 dark:text-zinc-400">Nothing pending right now.</p>;
}
