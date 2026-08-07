import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { AdminVerificationDashboard } from "@/components/admin/AdminVerificationDashboard";

export const metadata: Metadata = { title: "Verification queue" };

export default async function AdminVerificationsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login?callbackUrl=/admin/verifications");
  if (session.user.role !== "ADMIN") redirect("/");

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Verification queue</h1>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        Review pending Tier 1, 2 and 3 submissions.
      </p>
      <AdminVerificationDashboard />
    </div>
  );
}
