"use client";

import { useEffect, useState } from "react";
import { formatBdt } from "@/lib/format";
import { primaryButtonClasses } from "@/lib/ui/formStyles";

type Part = {
  id: string;
  name: string;
  price: number;
  stockQty: number;
};

// Lets the hired worker buy spare parts for a job. The cost gets
// added onto the job's bill instead of the worker paying for it
// themselves.
export function BuyPartsForm({ jobRequestId, onBought }: { jobRequestId: string; onBought: () => void }) {
  const [parts, setParts] = useState<Part[] | null>(null);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [buying, setBuying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadParts() {
      try {
        const response = await fetch("/api/parts");
        const data = await response.json();
        setParts(data.parts || []);
      } catch {
        setParts([]);
      }
    }
    loadParts();
  }, []);

  async function handleBuy() {
    // Turn the quantity boxes into a list of { partId, quantity },
    // skipping any part left at 0 or blank.
    const items = [];
    for (const partId in quantities) {
      const quantity = Number(quantities[partId]);
      if (quantity > 0) {
        items.push({ partId, quantity });
      }
    }

    if (items.length === 0) {
      setMessage("Pick at least one part.");
      return;
    }

    setBuying(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/job-requests/${jobRequestId}/parts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      if (response.ok) {
        setMessage("Added to your bill.");
        setQuantities({});
        onBought();
      } else {
        const errorBody = await response.json().catch(() => null);
        setMessage(errorBody?.error || "Couldn't buy those parts.");
      }
    } finally {
      setBuying(false);
    }
  }

  if (parts === null) {
    return <div className="h-16 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />;
  }

  if (parts.length === 0) {
    return <p className="text-xs text-zinc-500 dark:text-zinc-400">No parts in stock right now.</p>;
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
      <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Need parts for this job?</p>
      {parts.map((part) => (
        <div key={part.id} className="flex items-center justify-between gap-2 text-xs">
          <span className="text-zinc-600 dark:text-zinc-300">
            {part.name} — {formatBdt(part.price)} ({part.stockQty} in stock)
          </span>
          <input
            type="number"
            min={0}
            max={part.stockQty}
            placeholder="0"
            value={quantities[part.id] || ""}
            onChange={(e) => setQuantities({ ...quantities, [part.id]: e.target.value })}
            className="w-16 rounded-lg border border-zinc-200 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </div>
      ))}
      {message && <p className="text-xs text-brand-700 dark:text-brand-400">{message}</p>}
      <button
        type="button"
        onClick={handleBuy}
        disabled={buying}
        className={`${primaryButtonClasses} mt-1 self-start px-3 py-1.5 text-xs`}
      >
        {buying ? "Buying…" : "Buy parts"}
      </button>
    </div>
  );
}
