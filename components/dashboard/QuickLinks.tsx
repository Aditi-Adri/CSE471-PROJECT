import Link from "next/link";
import {
  ClipboardCheckIcon,
  IdCardIcon,
  ShieldCheckIcon,
  WrenchIcon,
} from "@/components/marketing/icons";
import type { Role } from "@/app/generated/prisma/client";
import { ChevronRightIcon, SearchIcon } from "./icons";

type QuickLink = {
  href: string;
  title: string;
  description: string;
  icon: (props: { className?: string }) => React.ReactElement;
};

/**
 * What's actually built differs by role — see docs/FEATURE_SPEC.md.
 * A worker without a Worker row yet only gets one link (finish
 * setup); every other worker/verification page already redirects
 * there itself, so sending them straight to it avoids a pointless
 * bounce.
 */
function getQuickLinks(role: Role, hasWorkerProfile: boolean): QuickLink[] {
  switch (role) {
    case "CUSTOMER":
    case "CORPORATE":
      return [
        {
          href: "/search",
          title: "Find a technician",
          description: "Search verified local workers by service, area, or budget.",
          icon: SearchIcon,
        },
      ];

    case "WORKER":
      if (!hasWorkerProfile) {
        return [
          {
            href: "/dashboard/worker-profile",
            title: "Set up your worker profile",
            description: "Add your service categories, rate, and area to start getting matched.",
            icon: IdCardIcon,
          },
        ];
      }
      return [
        {
          href: "/dashboard/verification",
          title: "Get verified",
          description: "Complete ID, skill, and background checks to earn your trust badge.",
          icon: ShieldCheckIcon,
        },
        {
          href: "/dashboard/worker-job",
          title: "Jobs & earnings",
          description: "See your active job summary and base pricing.",
          icon: WrenchIcon,
        },
      ];

    case "ADMIN":
      return [
        {
          href: "/admin/verifications",
          title: "Verification queue",
          description: "Review pending Tier 1, 2, and 3 worker submissions.",
          icon: ClipboardCheckIcon,
        },
      ];
  }
}

export function QuickLinks({ role, hasWorkerProfile }: { role: Role; hasWorkerProfile: boolean }) {
  const links = getQuickLinks(role, hasWorkerProfile);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="group flex items-start gap-4 rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-brand-300 hover:shadow-md hover:shadow-zinc-900/5 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-brand-800"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
            <link.icon className="h-5 w-5" />
          </span>
          <span className="flex-1">
            <span className="flex items-center gap-1 font-medium text-zinc-900 dark:text-zinc-50">
              {link.title}
              <ChevronRightIcon className="h-4 w-4 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
            </span>
            <span className="mt-0.5 block text-sm text-zinc-500 dark:text-zinc-400">{link.description}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
