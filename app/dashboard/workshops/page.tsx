import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { WorkshopsList } from "@/components/workshops/WorkshopsList";

export const metadata: Metadata = { title: "Workshops" };

// Worker/customer-facing: browse and register for workshops. Admins
// manage workshops from /admin/workshops instead of registering here.
export default async function WorkshopsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login?callbackUrl=/dashboard/workshops");
  if (session.user.role === "ADMIN") redirect("/admin/workshops");

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Workshops</h1>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        Free and paid workshops and training programmes you can register for.
      </p>
      <WorkshopsList />
    </div>
  );
}
