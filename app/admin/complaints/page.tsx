import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { AdminComplaintsDashboard } from "@/components/complaints/AdminComplaintsDashboard";

export const metadata: Metadata = { title: "Complaints" };

// Admin-only: review complaints customers filed against workers, and
// resolve each one with an optional reply.
export default async function AdminComplaintsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login?callbackUrl=/admin/complaints");
  if (session.user.role !== "ADMIN") redirect("/");

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Complaints</h1>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        What customers have reported about workers. Resolve each one, with an optional reply.
      </p>
      <AdminComplaintsDashboard />
    </div>
  );
}
