import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/verification/requireAdmin";
import { tier1ReviewSchema } from "@/lib/validation/verificationSchemas";
import { syncWorkerVerificationTier } from "@/lib/verification/applyTierApproval";
import { recomputeTrustScore } from "@/lib/trust/recomputeTrustScore";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

/** POST /api/admin/verifications/tier1 — approve/reject a Tier 1 submission. */
export const POST = withErrorHandling(async (request: Request) => {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = tier1ReviewSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request.", issues: z.treeifyError(parsed.error) },
      { status: 400 }
    );
  }

  const { workerId, decision, reviewNote } = parsed.data;

  const existing = await prisma.tier1Verification.findUnique({ where: { workerId } });
  if (!existing) {
    return Response.json({ error: "No Tier 1 submission found for this worker." }, { status: 404 });
  }

  await prisma.tier1Verification.update({
    where: { workerId },
    data: {
      status: decision,
      reviewNote: reviewNote || null,
      reviewedById: auth.session.user.id,
      reviewedAt: new Date(),
    },
  });

  if (decision === "APPROVED") {
    await syncWorkerVerificationTier(workerId);
  }
  // MODULE 2 -> FEATURE 1 (Shiva): a verification tier bump is one of
  // the trust-score recompute triggers. Runs after either decision,
  // not just APPROVED — a no-op read-and-rewrite when nothing actually
  // changed is cheap, and simpler than branching on it separately.
  await recomputeTrustScore(workerId);

  return Response.json({ status: decision });
});
