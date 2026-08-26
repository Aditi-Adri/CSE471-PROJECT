import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { daysRemaining, getPlan } from "@/lib/constants/subscriptionPlans";

/**
 * GET /api/subscription/status
 *
 * MODULE 3 -> Worker Subscription & Working Radius (new feature).
 *
 * Single source of truth for "what plan is this worker on right now" —
 * both the small dashboard widget and the full subscription page call
 * this same endpoint, same self-fetch pattern as
 * components/verification/VerificationDashboard.tsx.
 *
 * Also does the one bit of "background job" this feature needs: if a
 * paid plan's `subscriptionExpiresAt` has already passed, it quietly
 * downgrades the worker back to Basic right here, on read. No cron job
 * required — the same lazy-check idea used elsewhere in this codebase
 * (e.g. Booking's stale-location handling), simple enough to explain
 * as "we just check the date every time someone loads the page".
 */
export const GET = withErrorHandling(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }
  if (session.user.role !== "WORKER") {
    return Response.json({ error: "Only worker accounts have a subscription." }, { status: 403 });
  }

  let worker = await prisma.worker.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      area: true,
      currentLat: true,
      currentLng: true,
      serviceRadiusKm: true,
      subscriptionTier: true,
      subscriptionExpiresAt: true,
      subscriptionTrialUsed: true,
    },
  });

  if (!worker) {
    return Response.json({ error: "Set up your worker profile first." }, { status: 404 });
  }
  const isExpired =
    worker.subscriptionTier !== "BASIC" &&
    worker.subscriptionExpiresAt != null &&
    worker.subscriptionExpiresAt.getTime() <= Date.now();

  if (isExpired) {
    const basicPlan = getPlan("BASIC");
    worker = await prisma.worker.update({
      where: { id: worker.id },
      data: {
        subscriptionTier: "BASIC",
        serviceRadiusKm: basicPlan.radiusKm,
        subscriptionExpiresAt: null,
      },
      select: {
        id: true,
        area: true,
        currentLat: true,
        currentLng: true,
        serviceRadiusKm: true,
        subscriptionTier: true,
        subscriptionExpiresAt: true,
        subscriptionTrialUsed: true,
      },
    });
  }

  const plan = getPlan(worker.subscriptionTier);

  return Response.json({
    worker: {
      area: worker.area,
      currentLat: worker.currentLat,
      currentLng: worker.currentLng,
      serviceRadiusKm: worker.serviceRadiusKm,
      subscriptionTier: worker.subscriptionTier,
      planName: plan.name,
      subscriptionExpiresAt: worker.subscriptionExpiresAt,
      daysLeft: worker.subscriptionExpiresAt ? daysRemaining(worker.subscriptionExpiresAt) : null,
      subscriptionTrialUsed: worker.subscriptionTrialUsed,
      isActive: worker.subscriptionTier !== "BASIC",
    },
  });
});
