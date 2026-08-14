import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { WorkerDashboard } from "@/components/worker/WorkerDashboard";
import { WorkerJobsList } from "@/components/booking/WorkerJobsList";
import { WorkerOnlinePanel } from "@/components/tracking/WorkerOnlinePanel";
import { TrustScoreDetails } from "@/components/trust/TrustScoreDetails";
import { ReviewList } from "@/components/reviews/ReviewList";
import { getTrustBreakdown } from "@/lib/trust/recomputeTrustScore";

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
      // MODULE 2 -> FEATURE 1 (Shiva): a worker's own trust score +
      // reviews, previously only visible on their *public* profile
      // (app/workers/[id]/page.tsx) — nothing surfaced it here, so a
      // worker had no way to see what a customer just rated them
      // without knowing their own public profile URL.
      reviews: {
        where: { isHidden: false },
        orderBy: { createdAt: "desc" },
        include: { customer: { select: { name: true } } },
      },
    },
  });

  if (!worker) redirect("/dashboard/worker-profile");

  const trustBreakdown = await getTrustBreakdown(worker.id);

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

      <section>
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Ratings & reviews {worker.reviews.length > 0 && `(${worker.reviews.length})`}
        </h2>
        <div className="flex flex-col gap-4">
          {trustBreakdown && <TrustScoreDetails breakdown={trustBreakdown} />}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <ReviewList reviews={worker.reviews} />
          </div>
        </div>
      </section>
    </div>
  );
}
