"use client";

import { useEffect, useState } from "react";
import { cardClasses, errorBannerClasses, primaryButtonClasses, successBannerClasses } from "@/lib/ui/formStyles";

/**
 * MODULE 2 -> FEATURE 1 (Shiva): the customer-facing half of the
 * review flow — sits on the booking status page (app/bookings/[id])
 * once a job is COMPLETED. Talks to GET/POST
 * /api/bookings/[id]/review, which is the sole source of truth for
 * eligibility (see lib/trust/reviewEligibility.ts) — this component
 * never assumes eligibility on its own, only renders what the API
 * says.
 */

type Eligibility =
  | { eligible: true; deadline: string }
  | { eligible: false; reason: "not_completed" | "already_reviewed" | "window_expired"; deadline: string | null };

type ExistingReview = { id: string; rating: number; comment: string; createdAt: string } | null;

export function ReviewForm({ bookingId, workerName }: { bookingId: string; workerName: string }) {
  const [loading, setLoading] = useState(true);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [existingReview, setExistingReview] = useState<ExistingReview>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<ExistingReview>(null);

  useEffect(() => {
    fetch(`/api/bookings/${bookingId}/review`)
      .then((res) => res.json())
      .then((data) => {
        setEligibility(data.eligibility ?? null);
        setExistingReview(data.review ?? null);
      })
      .finally(() => setLoading(false));
  }, [bookingId]);

  async function submit() {
    setError(null);
    if (rating === 0) {
      setError("Pick a star rating.");
      return;
    }
    if (comment.trim().length < 10) {
      setError("Say a little more about the job — at least 10 characters.");
      return;
    }

    setIsSubmitting(true);
    const res = await fetch(`/api/bookings/${bookingId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, comment: comment.trim() }),
    });
    const data = await res.json();
    setIsSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setSubmitted(data.review);
  }

  if (loading) {
    return <div className="h-24 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />;
  }

  const review = submitted ?? existingReview;
  if (review) {
    return (
      <div className={cardClasses}>
        {submitted && <p className={`mb-3 ${successBannerClasses}`}>Thanks for your review!</p>}
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Your review</p>
        <Stars value={review.rating} />
        <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{review.comment}</p>
      </div>
    );
  }

  if (!eligibility?.eligible) {
    if (eligibility?.reason === "window_expired") {
      return (
        <p className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:bg-zinc-950 dark:text-zinc-500">
          The 72-hour window to review this job has closed.
        </p>
      );
    }
    return null;
  }

  return (
    <div className={cardClasses}>
      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Rate your experience with {workerName}</p>
      <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
        You have until {new Date(eligibility.deadline).toLocaleString()} to leave this review.
      </p>

      <div className="flex items-center gap-1" onMouseLeave={() => setHoverRating(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            onMouseEnter={() => setHoverRating(n)}
            onClick={() => setRating(n)}
            className="text-2xl leading-none transition"
          >
            <span className={n <= (hoverRating || rating) ? "text-amber-500" : "text-zinc-300 dark:text-zinc-700"}>
              ★
            </span>
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="What was the job, and how did it go?"
        rows={3}
        maxLength={1000}
        className="mt-3 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 placeholder:text-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500"
      />

      {error && <p className={`mt-3 ${errorBannerClasses}`}>{error}</p>}

      <button type="button" disabled={isSubmitting} onClick={submit} className={primaryButtonClasses}>
        {isSubmitting ? "Submitting…" : "Submit review"}
      </button>
    </div>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <div className="mt-1 flex gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= value ? "text-amber-500" : "text-zinc-300 dark:text-zinc-700"}>
          ★
        </span>
      ))}
    </div>
  );
}
