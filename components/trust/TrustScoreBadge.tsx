/**
 * MODULE 2 -> FEATURE 1 (Shiva): compact display of Worker.trustScore
 * — same "small pill, color signals the tier" language as
 * VerificationBadge/RatingStars so it reads as part of the same
 * family rather than a bolted-on extra.
 */
function tierFor(score: number): { label: string; className: string; dot: string } {
  if (score >= 80) {
    return { label: "Excellent trust", className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300", dot: "bg-emerald-500" };
  }
  if (score >= 60) {
    return { label: "Good trust", className: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300", dot: "bg-blue-500" };
  }
  if (score >= 40) {
    return { label: "Fair trust", className: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300", dot: "bg-amber-500" };
  }
  return { label: "Low trust", className: "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300", dot: "bg-red-500" };
}

export function TrustScoreBadge({ score, compact = false }: { score: number | null; compact?: boolean }) {
  if (score == null) return null;
  const tier = tierFor(score);

  return (
    <span
      title="AI-computed reliability score from ratings, completion rate, responsiveness, verification tier, and review authenticity."
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${tier.className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${tier.dot}`} />
      {compact ? `Trust ${Math.round(score)}` : `${tier.label} · ${Math.round(score)}/100`}
    </span>
  );
}
