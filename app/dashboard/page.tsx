import { redirect } from "next/navigation";

/**
 * Bare `/dashboard` has no content of its own — the real, role-aware
 * dashboard lives at /account (see app/account/page.tsx). This only
 * exists so old links/bookmarks to "/dashboard" still land somewhere
 * useful instead of 404ing. Specific tool pages (/dashboard/verification,
 * /dashboard/worker-job, ...) are unaffected — this redirect only
 * matches the exact bare path.
 */
export default function DashboardIndexPage() {
  redirect("/account");
}
