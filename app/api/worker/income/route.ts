import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { getIncomeMetrics } from "@/lib/income/getIncomeMetrics";
import { incomeRangeSchema, RANGE_PARAM_TO_ENUM } from "@/lib/validation/incomeSchema";
import { checkRateLimit, getClientIp } from "@/lib/auth/rateLimit";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

/**
 * GET /api/worker/income?range=week|month|year
 *
 * MODULE 2 -> FEATURE 4 (Jishan): Worker Income Intelligence Dashboard —
 * real earnings/jobs/category/peak-hour metrics for the currently
 * authenticated worker only, computed live from WorkerJob (see
 * lib/income/getIncomeMetrics.ts). `workerId` always comes from the
 * session, never from the client, same pattern as every other
 * worker-only route in this app (GET /api/opportunities, POST
 * /api/worker/status, ...).
 */
export const GET = withErrorHandling(async (request: Request) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }

  const worker = await prisma.worker.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!worker) {
    return Response.json({ error: "This page is for worker accounts." }, { status: 403 });
  }

  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`worker-income:${session.user.id}:${ip}`, 60, 60 * 1000);
  if (!rateLimit.allowed) {
    return Response.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  }

  const url = new URL(request.url);
  const parsedRange = incomeRangeSchema.safeParse(url.searchParams.get("range") ?? undefined);
  const rangeParam = parsedRange.success ? parsedRange.data : "week";

  const metrics = await getIncomeMetrics(worker.id, RANGE_PARAM_TO_ENUM[rangeParam]);

  return Response.json({ metrics });
});
