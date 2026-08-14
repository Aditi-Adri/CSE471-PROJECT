export type PublicReview = {
  id: string;
  rating: number;
  comment: string;
  createdAt: Date | string;
  fraudFlagged: boolean;
  customer: { name: string };
};

/**
 * MODULE 2 -> FEATURE 1 (Shiva): public review list on the worker
 * profile page. A fraudFlagged review is NOT hidden here — a flag
 * isn't proof, just a signal (see the banner comment above model
 * Review in prisma/schema.prisma) — it's marked so a reader has the
 * same context an admin does, not silently dropped.
 */
export function ReviewList({ reviews }: { reviews: PublicReview[] }) {
  if (reviews.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">No reviews yet.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {reviews.map((review) => (
        <div key={review.id} className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{review.customer.name}</span>
              <Stars value={review.rating} />
            </div>
            <div className="flex items-center gap-2">
              {review.fraudFlagged && (
                <span
                  title="Our automated fraud detector flagged this review for a human to double-check. It isn't proof it's fake."
                  className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                >
                  ⚠ Under review
                </span>
              )}
              <span className="text-xs text-zinc-400 dark:text-zinc-500">
                {new Date(review.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{review.comment}</p>
        </div>
      ))}
    </div>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <span aria-label={`${value} out of 5 stars`} className="text-sm">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= value ? "text-amber-500" : "text-zinc-300 dark:text-zinc-700"}>
          ★
        </span>
      ))}
    </span>
  );
}
