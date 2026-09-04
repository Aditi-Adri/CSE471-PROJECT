import type { TrustBreakdown } from "@/lib/trust/trustScoreMath";
import { TrustScoreBadge } from "./TrustScoreBadge";

const METRIC_LABELS: { key: keyof Omit<TrustBreakdown, "total">; label: string }[] = [
  { key: "ratingQuality", label: "Rating quality" },
  { key: "completionReliability", label: "Completion reliability" },
  { key: "responsiveness", label: "Responsiveness" },
  { key: "verificationTrust", label: "Verification tier" },
  { key: "reviewAuthenticity", label: "Review authenticity" },
  { key: "reviewVolume", label: "Review volume" },
];

/**
 * MODULE 2 -> FEATURE 1 (Shiva): full 6-metric breakdown behind the
 * compact TrustScoreBadge — shown on the worker profile page so the
 * composite number isn't a black box.
 */
export function TrustScoreDetails({ breakdown }: { breakdown: TrustBreakdown }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">AI TrustScore</p>
        <TrustScoreBadge score={breakdown.total} />
      </div>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        A composite reliability score from six weighted signals, recomputed whenever a review, booking, or
        verification changes.
      </p>

      <div className="mt-4 flex flex-col gap-2.5">
        {METRIC_LABELS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-3">
            <span className="w-40 shrink-0 text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-brand-500"
                // Minimum 2% so a zero metric still shows a visible sliver.
                style={{ width: `${Math.max(breakdown[key], 2)}%` }}
              />
            </div>
            <span className="w-9 shrink-0 text-right text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {Math.round(breakdown[key])}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
