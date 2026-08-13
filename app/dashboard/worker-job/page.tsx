import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { WorkerDashboard } from "@/components/worker/WorkerDashboard";
import { WorkerJobsList } from "@/components/booking/WorkerJobsList";
import { WorkerOnlinePanel } from "@/components/tracking/WorkerOnlinePanel";

export const metadata: Metadata = { title: "Worker dashboard" };

export default async function WorkerJobDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login?callbackUrl=/dashboard/worker-job");
  if (session.user.role !== "WORKER") redirect("/");

  const worker = await prisma.worker.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      addressDetail: true,
      hourlyRateMinBdt: true,
      hourlyRateMaxBdt: true,
      isOnline: true,
      user: { select: { name: true } },
    },
  });

  if (!worker) redirect("/dashboard/worker-profile");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <WorkerDashboard worker={worker} />

      <section>
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Live tracking & SOS</h2>
        <WorkerOnlinePanel workerId={worker.id} initialIsOnline={worker.isOnline} />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Booking requests</h2>
        <WorkerJobsList />
      </section>
    </div>
  );
}
