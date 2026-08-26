import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { SubscriptionPlansView } from "@/components/subscription/SubscriptionPlansView";

export const metadata: Metadata = { title: "Worker Subscription" };

/**
 * /dashboard/worker/subscription
 *
 * MODULE 3 -> Worker Subscription & Working Radius (new feature).
 *
 * Same auth/role-gating shape as app/dashboard/verification/page.tsx:
 * signed-in check, then a friendly "this is for workers" message for
 * every other role (not a hard redirect — a customer/admin who lands
 * here by mistake should understand why, not just bounce), then send a
 * worker with no profile yet to set one up first (radius can't be
 * chosen without a Worker row to store it on).
 */
export default async function WorkerSubscriptionPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login?callbackUrl=/dashboard/worker/subscription");

  if (session.user.role !== "WORKER") {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Worker subscription</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          This page is for worker accounts. You&apos;re signed in as a {session.user.role.toLowerCase()}.
        </p>
      </div>
    );
  }

  const worker = await prisma.worker.findUnique({ where: { userId: session.user.id }, select: { id: true } });
  if (!worker) redirect("/dashboard/worker-profile");

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Worker subscription</h1>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        Upgrade your plan to widen your service radius, appear higher in search, and get more leads.
      </p>
      <SubscriptionPlansView workerId={worker.id} />
    </div>
  );
}
