import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { MyComplaintsList } from "@/components/complaints/MyComplaintsList";

export const metadata: Metadata = { title: "My complaints" };

// Customer-only: complaints they've filed against workers, and any
// admin reply. Filing happens from a worker's profile page.
export default async function MyComplaintsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login?callbackUrl=/dashboard/complaints");

  const role = session.user.role;
  if (role !== "CUSTOMER" && role !== "CORPORATE") redirect("/");

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">My complaints</h1>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        Complaints you&apos;ve filed against workers, and any reply from an admin.
      </p>
      <MyComplaintsList />
    </div>
  );
}
