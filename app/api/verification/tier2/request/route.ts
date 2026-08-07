import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/auth/rateLimit";
import { tier2RequestSchema } from "@/lib/validation/verificationSchemas";
import { canRequestTier2 } from "@/lib/verification/tierGating";
import { getWorkerTierSnapshot } from "@/lib/verification/getTierSnapshot";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

/**
 * POST /api/verification/tier2/request
 *
 * Requests the Tier 2 practical skills test. This is entirely a
 * scheduling/tracking step — the test itself is judged in person by a
 * coordinator (see app/api/admin/verifications/tier2/route.ts), so
 * there's nothing to auto-decide here.
 */
export const POST = withErrorHandling(async (request: Request) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }

  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`tier2-request:${session.user.id}:${ip}`, 10, 10 * 60 * 1000);
  if (!rateLimit.allowed) {
    return Response.json({ error: "Too many attempts. Please try again shortly." }, { status: 429 });
  }

  const worker = await prisma.worker.findUnique({ where: { userId: session.user.id } });
  if (!worker) {
    return Response.json({ error: "Create your worker profile before verifying." }, { status: 403 });
  }

  const snapshot = await getWorkerTierSnapshot(worker.id);
  if (!canRequestTier2(snapshot)) {
    return Response.json(
      { error: "Tier 2 isn't available yet — pass Tier 1 first, or it's already requested/approved." },
      { status: 409 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const parsed = tier2RequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request.", issues: z.treeifyError(parsed.error) },
      { status: 400 }
    );
  }

  const preferredSchedule = parsed.data.preferredSchedule || null;

  await prisma.tier2SkillTest.upsert({
    where: { workerId: worker.id },
    create: { workerId: worker.id, preferredSchedule, status: "PENDING" },
    update: {
      preferredSchedule,
      status: "PENDING",
      evaluatedById: null,
      evaluatorNote: null,
      evaluatedAt: null,
      requestedAt: new Date(),
    },
  });

  return Response.json({ status: "PENDING" });
});
