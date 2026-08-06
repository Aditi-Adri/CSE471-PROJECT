import type { VerificationTier } from "@/app/generated/prisma/client";

const TIER_STYLES: Record<VerificationTier, { label: string; className: string; dot: string }> = {
  UNVERIFIED: {
    label: "Unverified",
    className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
    dot: "bg-zinc-400",
  },
  TIER1_ID_VERIFIED: {
    label: "Tier 1 · NID Verified",
    className: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
    dot: "bg-blue-500",
  },
  TIER2_SKILL_TESTED: {
    label: "Tier 2 · Skill Tested",
    className: "bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300",
    dot: "bg-violet-500",
  },
  TIER3_POLICE_CLEARED: {
    label: "Tier 3 · Police Cleared",
    className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
};

export function VerificationBadge({
  tier,
  compact = false,
}: {
  tier: VerificationTier;
  compact?: boolean;
}) {
  const style = TIER_STYLES[tier];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${style.className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {compact ? style.label.split(" · ")[0] : style.label}
    </span>
  );
}
