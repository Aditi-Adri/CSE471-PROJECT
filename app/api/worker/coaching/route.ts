import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { getOrGenerateCoaching } from "@/lib/income/workerAnalyticsCache";
import { incomeRangeSchema, RANGE_PARAM_TO_ENUM } from "@/lib/validation/incomeSchema";
import { checkRateLimit, getClientIp } from "@/lib/auth/rateLimit";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

/**
 * GET /api/worker/coaching?range=week|month|year
 *
 * MODULE 2 -> FEATURE 4 (Jishan): Worker Income Intelligence Dashboard —
 * AI business suggestion + localized demand forecast for the currently
 * authenticated worker, generated from their real WorkerJob history and
 * their own Worker.area (never asked for manually — see
 * docs/FEATURE_SPEC.md's Worker model). Reuses a cached WorkerAnalytics
 * row when one already exists for this exact period (see
 * lib/income/workerAnalyticsCache.ts), so reopening the same week later
 * the same day doesn't re-call the AI. `workerId` always comes from the
 * session, never from the client.
 */
export const GET = withErrorHandling(async (request: Request) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }

  const worker = await prisma.worker.findUnique({
    where: { userId: session.user.id },
    select: { id: true, area: true },
  });
  if (!worker) {
    return Response.json({ error: "This page is for worker accounts." }, { status: 403 });
  }

  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`worker-coaching:${session.user.id}:${ip}`, 20, 60 * 1000);
  if (!rateLimit.allowed) {
    return Response.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  }

  const url = new URL(request.url);
  const parsedRange = incomeRangeSchema.safeParse(url.searchParams.get("range") ?? undefined);
  const rangeParam = parsedRange.success ? parsedRange.data : "week";

  const result = await getOrGenerateCoaching(worker.id, RANGE_PARAM_TO_ENUM[rangeParam], worker.area);

  return Response.json(result);
});
