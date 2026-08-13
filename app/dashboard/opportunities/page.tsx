import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { OpportunitiesView } from "@/components/opportunities/OpportunitiesView";

export const metadata: Metadata = { title: "Opportunities" };

export default async function OpportunitiesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login?callbackUrl=/dashboard/opportunities");
  if (session.user.role !== "WORKER") redirect("/");

  const worker = await prisma.worker.findUnique({ where: { userId: session.user.id }, select: { id: true } });
  if (!worker) redirect("/dashboard/worker-profile");

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Opportunities</h1>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        Where worker demand is outpacing supply right now, across Dhaka.
      </p>
      <OpportunitiesView />
    </div>
  );
}
