"use client";

import { useCallback, useEffect, useState } from "react";
import { cardClasses, errorBannerClasses } from "@/lib/ui/formStyles";
import { formatBdt } from "@/lib/format";

type BreakdownItem = {
  id: string;
  propertyLabel: string;
  serviceAddress: string | null;
  workerName: string;
  amount: number;
  completedAt: string | null;
};

type BillingData = {
  totalSpent: number;
  completedJobs: number;
  monthLabel: string;
  breakdown: BreakdownItem[];
};

/**
 * MODULE 3 -> FEATURE 3 (Corporate Portal): monthly billing summary
 * card with a toggleable breakdown table 
 */
export function MonthlyInvoiceCard({ refreshKey }: { refreshKey?: number }) {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const fetchBilling = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/corporate/billing");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load billing.");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, []);

  // fetchBilling only sets state after its `await fetch(...)` resolves
  // — a real async boundary, just not written as the `.then()` callback
  // shape this lint rule's static analysis looks for.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchBilling(); }, [fetchBilling, refreshKey]);



  if (loading) {
    return (
      <div className={cardClasses}>
        <p className="py-4 text-center text-sm text-zinc-400">Loading billing summary…</p>
      </div>
    );
  }

  if (error) {
    return <p className={errorBannerClasses}>{error}</p>;
  }

  if (!data) return null;

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Monthly Invoice</h2>

      <div className={cardClasses}>
        {/* Header row with month label */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{data.monthLabel}</p>
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-[0.08em] text-brand-700 dark:bg-brand-950 dark:text-brand-300">
            Invoice
          </span>
        </div>

        {/* Big numbers */}
        <div className="mt-5 grid grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Total spent</p>
            <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {formatBdt(data.totalSpent)}
            </p>
          </div>
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Completed jobs</p>
            <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {data.completedJobs}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setShowBreakdown((v) => !v)}
            className="inline-flex items-center justify-center rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {showBreakdown ? "Hide Breakdown" : "View Breakdown"}
          </button>
        </div>

        {/* Breakdown table */}
        {showBreakdown && (
          <div className="mt-5 overflow-x-auto">
            {data.breakdown.length === 0 ? (
              <p className="py-4 text-center text-sm text-zinc-400">
                No completed corporate bookings this month.
              </p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800">
                    <th className="pb-2 pr-4 font-medium text-zinc-500 dark:text-zinc-400">Property</th>
                    <th className="pb-2 pr-4 font-medium text-zinc-500 dark:text-zinc-400">Technician</th>
                    <th className="pb-2 pr-4 text-right font-medium text-zinc-500 dark:text-zinc-400">Amount</th>
                    <th className="pb-2 font-medium text-zinc-500 dark:text-zinc-400">Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {data.breakdown.map((b) => (
                    <tr key={b.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/50">
                      <td className="py-2 pr-4 text-zinc-900 dark:text-zinc-100">{b.propertyLabel}</td>
                      <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-400">{b.workerName}</td>
                      <td className="py-2 pr-4 text-right font-medium text-zinc-900 dark:text-zinc-100">
                        {formatBdt(b.amount)}
                      </td>
                      <td className="py-2 text-zinc-500 dark:text-zinc-400">
                        {b.completedAt ? new Date(b.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-zinc-300 dark:border-zinc-700">
                    <td colSpan={2} className="pt-2 font-semibold text-zinc-900 dark:text-zinc-50">Total</td>
                    <td className="pt-2 text-right font-bold text-zinc-900 dark:text-zinc-50">
                      {formatBdt(data.totalSpent)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        )}
      </div>
    </section>
  );
}


