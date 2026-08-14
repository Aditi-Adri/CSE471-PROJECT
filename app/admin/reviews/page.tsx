import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { AdminReviewsDashboard } from "@/components/admin/AdminReviewsDashboard";

export const metadata: Metadata = { title: "Review moderation" };

/** MODULE 2 -> FEATURE 1 (Shiva): admin moderation queue for the review fraud detector. */
export default async function AdminReviewsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login?callbackUrl=/admin/reviews");
  if (session.user.role !== "ADMIN") redirect("/");

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Review moderation</h1>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        Fraud-flagged reviews surface first. A flag isn&apos;t proof — confirm before hiding one.
      </p>
      <AdminReviewsDashboard />
    </div>
  );
}
