import { VERIFICATION_TIERS } from "@/lib/constants/dhakaAreas";
import type { VerificationTier } from "@/app/generated/prisma/client";

const STEPS = VERIFICATION_TIERS.filter((t) => t.value !== "UNVERIFIED");

export function TierProgress({ currentTier }: { currentTier: VerificationTier }) {
  const currentRank = VERIFICATION_TIERS.find((t) => t.value === currentTier)?.rank ?? 0;

  return (
    <div className="flex items-center">
      {STEPS.map((tier, i) => {
        const achieved = tier.rank <= currentRank;
        return (
          <div key={tier.value} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  achieved
                    ? "bg-brand-600 text-white"
                    : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600"
                }`}
              >
                {achieved ? "✓" : tier.rank}
              </div>
              <span
                className={`text-xs font-medium whitespace-nowrap ${
                  achieved ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-600"
                }`}
              >
                {tier.shortLabel}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`mx-2 h-0.5 flex-1 ${achieved ? "bg-brand-600" : "bg-zinc-200 dark:bg-zinc-800"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
