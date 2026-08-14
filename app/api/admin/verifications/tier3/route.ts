import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/verification/requireAdmin";
import { tier3ReviewSchema } from "@/lib/validation/verificationSchemas";
import { syncWorkerVerificationTier } from "@/lib/verification/applyTierApproval";
import { recomputeTrustScore } from "@/lib/trust/recomputeTrustScore";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

/**
 * POST /api/admin/verifications/tier3 — approve/reject a police
 * clearance submission, alongside marking which references were
 * actually contacted and verified.
 */
export const POST = withErrorHandling(async (request: Request) => {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = tier3ReviewSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request.", issues: z.treeifyError(parsed.error) },
      { status: 400 }
    );
  }

  const { workerId, decision, reviewNote, referenceUpdates } = parsed.data;

  const existing = await prisma.tier3PoliceClearance.findUnique({ where: { workerId } });
  if (!existing) {
    return Response.json({ error: "No Tier 3 submission found for this worker." }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    for (const ref of referenceUpdates) {
      // Scoped to this submission's id, not just the reference's own
      // id — an admin client can only ever move references that
      // actually belong to the submission it's reviewing.
      await tx.workerReference.updateMany({
        where: { id: ref.id, tier3Id: existing.id },
        data: { contacted: ref.contacted, verified: ref.verified, note: ref.note || null },
      });
    }

    await tx.tier3PoliceClearance.update({
      where: { workerId },
      data: {
        status: decision,
        reviewNote: reviewNote || null,
        reviewedById: auth.session.user.id,
        reviewedAt: new Date(),
      },
    });
  });

  if (decision === "APPROVED") {
    await syncWorkerVerificationTier(workerId);
  }
  // MODULE 2 -> FEATURE 1 (Shiva): see the same call in tier1/route.ts.
  await recomputeTrustScore(workerId);

  return Response.json({ status: decision });
});
