import Link from "next/link";
import {
  ClipboardCheckIcon,
  FlagIcon,
  GraduationCapIcon,
  IdCardIcon,
  MapPinIcon,
  MessageIcon,
  ShieldCheckIcon,
  SirenIcon,
  StarIcon,
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
        {
          href: "/dashboard/my-requests",
          title: "My requests",
          description: "Jobs you posted that didn't match a regular category — review applicants and hire one.",
          icon: MessageIcon,
        },
        {
          href: "/bookings",
          title: "My bookings",
          description: "See who you've booked, negotiate a rate, and track the arrival code.",
          icon: ClipboardCheckIcon,
        },
        {
          href: "/sos",
          title: "Emergency SOS",
          description: "One tap alerts every verified technician online within 3km of you.",
          icon: SirenIcon,
        },
        {
          href: "/dashboard/favorites",
          title: "My favorites",
          description: "Workers you've saved — book them again without searching.",
          icon: StarIcon,
        },
        {
          href: "/dashboard/workshops",
          title: "Workshops",
          description: "Free and paid workshops and training programmes you can register for.",
          icon: GraduationCapIcon,
        },
        {
          href: "/dashboard/complaints",
          title: "My complaints",
          description: "Complaints you've filed against workers, and any admin reply.",
          icon: FlagIcon,
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
        {
          href: "/dashboard/my-applications",
          title: "My applications",
          description: "See which open requests you've applied to, and whether you got hired.",
          icon: MessageIcon,
        },
        {
          href: "/dashboard/opportunities",
          title: "Opportunities",
          description: "A heatmap of which Dhaka neighborhoods need workers most, right now.",
          icon: MapPinIcon,
        },
        {
          href: "/dashboard/workshops",
          title: "Workshops",
          description: "Free and paid workshops and training programmes you can register for.",
          icon: GraduationCapIcon,
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
        {
          href: "/admin/reviews",
          title: "Review moderation",
          description: "Fraud-flagged customer reviews, surfaced for a human decision.",
          icon: ShieldCheckIcon,
        },
        {
          href: "/admin/workshops",
          title: "Workshops",
          description: "Create a free or paid workshop and see who has registered.",
          icon: GraduationCapIcon,
        },
        {
          href: "/admin/complaints",
          title: "Complaints",
          description: "What customers have reported about workers — resolve each one.",
          icon: FlagIcon,
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
