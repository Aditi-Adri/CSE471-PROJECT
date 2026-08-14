import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { MyRequestsList } from "@/components/jobRequests/MyRequestsList";

export const metadata: Metadata = { title: "My requests" };

export default async function MyRequestsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login?callbackUrl=/dashboard/my-requests");

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        My requests
      </h1>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        Jobs you posted that didn&apos;t match one of our regular service categories.
      </p>
      <MyRequestsList />
    </div>
  );
}
