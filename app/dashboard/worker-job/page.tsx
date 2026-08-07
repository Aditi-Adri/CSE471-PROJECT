import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { WorkerDashboard } from "@/components/worker/WorkerDashboard";

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
      user: { select: { name: true } },
    },
  });

  if (!worker) redirect("/dashboard/worker-profile");

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <WorkerDashboard worker={worker} />
    </div>
  );
}
