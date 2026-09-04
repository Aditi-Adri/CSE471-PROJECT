"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { errorBannerClasses, primaryButtonClasses, secondaryButtonClasses } from "@/lib/ui/formStyles";

type ReviewItem = {
  id: string;
  rating: number;
  comment: string;
  isHidden: boolean;
  fraudFlagged: boolean;
  fraudScore: number | null;
  fraudReason: string | null;
  fraudMethod: "AI" | "HEURISTIC" | null;
  createdAt: string;
  customer: { name: string; email: string };
  worker: { id: string; headline: string; user: { name: string } };
};

const TABS = ["flagged", "all"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = { flagged: "Fraud-flagged", all: "All reviews" };

/**
 * MODULE 2 -> FEATURE 1 (Shiva): admin moderation queue behind
 * app/admin/reviews — mirrors AdminVerificationDashboard.tsx's
 * tab-and-refetch shape.
 */
export function AdminReviewsDashboard() {
  const [reviews, setReviews] = useState<ReviewItem[] | null>(null);
  const [tab, setTab] = useState<Tab>("flagged");

  // Re-fetches the whole list after every hide/unhide, so the counts and
  // tabs stay correct without tracking state by hand.
  const refetch = useCallback(() => {
    fetch("/api/admin/reviews")
      .then((res) => res.json())
      .then((data) => setReviews(data.reviews ?? []));
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // The tab badge counts flagged reviews still awaiting a decision —
  // once hidden, it's been dealt with.
  const flaggedCount = useMemo(() => reviews?.filter((r) => r.fraudFlagged && !r.isHidden).length ?? 0, [reviews]);

  if (!reviews) {
    return <div className="h-40 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />;
  }

  const visible = tab === "flagged" ? reviews.filter((r) => r.fraudFlagged) : reviews;

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
            {TAB_LABELS[t]} ({t === "flagged" ? flaggedCount : reviews.length})
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Nothing here right now.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {visible.map((review) => (
            <ReviewModerationCard key={review.id} review={review} onDecided={refetch} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewModerationCard({ review, onDecided }: { review: ReviewItem; onDecided: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function moderate(action: "hide" | "unhide") {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewId: review.id, action }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    onDecided();
  }

  return (
    <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-zinc-900 dark:text-zinc-50">
            {review.worker.user.name} <span className="font-normal text-zinc-500 dark:text-zinc-400">— {review.worker.headline}</span>
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Reviewed by {review.customer.name} ({review.customer.email}) · {new Date(review.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {review.isHidden && (
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              Hidden
            </span>
          )}
          {review.fraudFlagged && (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
              ⚠ Flagged {review.fraudScore != null ? `(${Math.round(review.fraudScore * 100)}%)` : ""}
            </span>
          )}
        </div>
      </div>

      <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
        {"★".repeat(review.rating)}
        {"☆".repeat(5 - review.rating)} — {review.comment}
      </p>

      {review.fraudReason && (
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          {review.fraudMethod === "AI" ? "AI" : "Heuristic"} check: {review.fraudReason}
        </p>
      )}

      {error && <p className={`mt-2 ${errorBannerClasses}`}>{error}</p>}

      <div className="mt-3 flex gap-2">
        {review.isHidden ? (
          <button type="button" onClick={() => moderate("unhide")} disabled={busy} className={primaryButtonClasses}>
            Unhide
          </button>
        ) : (
          <button type="button" onClick={() => moderate("hide")} disabled={busy} className={secondaryButtonClasses}>
            Hide review
          </button>
        )}
      </div>
    </div>
  );
}
