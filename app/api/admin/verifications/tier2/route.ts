import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/verification/requireAdmin";
import { tier2EvaluateSchema } from "@/lib/validation/verificationSchemas";
import { syncWorkerVerificationTier } from "@/lib/verification/applyTierApproval";

/** POST /api/admin/verifications/tier2 — record a pass/fail decision for a practical skills test. */
export async function POST(request: Request) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = tier2EvaluateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request.", issues: z.treeifyError(parsed.error) },
      { status: 400 }
    );
  }

  const { workerId, decision, evaluatorNote } = parsed.data;

  const existing = await prisma.tier2SkillTest.findUnique({ where: { workerId } });
  if (!existing) {
    return Response.json({ error: "No Tier 2 request found for this worker." }, { status: 404 });
  }

  await prisma.tier2SkillTest.update({
    where: { workerId },
    data: {
      status: decision,
      evaluatorNote: evaluatorNote || null,
      evaluatedById: auth.session.user.id,
      evaluatedAt: new Date(),
    },
  });

  if (decision === "APPROVED") {
    await syncWorkerVerificationTier(workerId);
  }

  return Response.json({ status: decision });
}
