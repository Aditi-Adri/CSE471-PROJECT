import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { AdminWorkshopsDashboard } from "@/components/workshops/AdminWorkshopsDashboard";

export const metadata: Metadata = { title: "Workshops" };

// Admin-only: create workshops or training programmes, and see how
// many workers/customers have registered for each one.
export default async function AdminWorkshopsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login?callbackUrl=/admin/workshops");
  if (session.user.role !== "ADMIN") redirect("/");

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Workshops</h1>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        Create a workshop or training programme, free or paid, for workers and customers to join.
      </p>
      <AdminWorkshopsDashboard />
    </div>
  );
}
