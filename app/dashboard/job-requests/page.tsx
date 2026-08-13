import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { JobRequestsList } from "@/components/jobRequests/JobRequestsList";

export const metadata: Metadata = { title: "Open requests" };

export default async function JobRequestsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login?callbackUrl=/dashboard/job-requests");
  if (session.user.role !== "WORKER") redirect("/");

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Open requests
      </h1>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        Jobs customers posted that didn&apos;t match one of our regular service categories.
      </p>
      <JobRequestsList />
    </div>
  );
}
