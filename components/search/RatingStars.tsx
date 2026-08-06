export function RatingStars({
  ratingAvg,
  ratingCount,
}: {
  ratingAvg: number;
  ratingCount: number;
}) {
  if (ratingCount === 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
        New on HireLocal
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <span aria-hidden="true" className="text-amber-500">
        ★
      </span>
      <span className="font-medium text-zinc-900 dark:text-zinc-100">{ratingAvg.toFixed(1)}</span>
      <span className="text-zinc-500 dark:text-zinc-400">
        ({ratingCount} {ratingCount === 1 ? "review" : "reviews"})
      </span>
    </span>
  );
}
