import { cardClasses } from "@/lib/ui/formStyles";
import { ROLE_LABELS } from "@/lib/roles";
import { VerificationBadge } from "@/components/search/VerificationBadge";
import type { Role, VerificationTier } from "@/app/generated/prisma/client";

type AccountSummaryCardProps = {
  role: Role;
  memberSince: Date;
  verificationTier?: VerificationTier;
};

export function AccountSummaryCard({ role, memberSince, verificationTier }: AccountSummaryCardProps) {
  return (
    <div className={cardClasses}>
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Account</h2>

      <dl className="mt-5 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-sm text-zinc-500 dark:text-zinc-400">Role</dt>
          <dd className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{ROLE_LABELS[role]}</dd>
        </div>

        {verificationTier && (
          <div className="flex items-center justify-between gap-4">
            <dt className="text-sm text-zinc-500 dark:text-zinc-400">Trust badge</dt>
            <dd>
              <VerificationBadge tier={verificationTier} />
            </dd>
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <dt className="text-sm text-zinc-500 dark:text-zinc-400">Member since</dt>
          <dd className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {memberSince.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </dd>
        </div>
      </dl>
    </div>
  );
}
