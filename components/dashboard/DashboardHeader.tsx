import Link from "next/link";
import { Avatar } from "@/components/search/Avatar";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { ROLE_LABELS } from "@/lib/roles";
import { secondaryButtonClasses } from "@/lib/ui/formStyles";
import type { Role } from "@/app/generated/prisma/client";
import { HomeIcon } from "./icons";

type DashboardHeaderProps = {
  userId: string;
  name: string;
  email: string;
  role: Role;
};

/**
 * Every role lands on the same header — only the badge text changes.
 * Home/log-out are already reachable from the site header via
 * `UserMenu`, but surfacing them here too means someone deep in their
 * dashboard never has to hunt for the way out.
 */
export function DashboardHeader({ userId, name, email, role }: DashboardHeaderProps) {
  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <Avatar name={name} seed={userId} size={56} />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{name}</h1>
            <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-[0.08em] text-brand-700 dark:bg-brand-950 dark:text-brand-300">
              {ROLE_LABELS[role]}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{email}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link href="/" className={secondaryButtonClasses}>
          <HomeIcon className="mr-1.5 h-4 w-4" />
          Homepage
        </Link>
        <LogoutButton />
      </div>
    </div>
  );
}
