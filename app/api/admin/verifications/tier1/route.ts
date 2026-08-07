import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/verification/requireAdmin";
import { tier1ReviewSchema } from "@/lib/validation/verificationSchemas";
import { syncWorkerVerificationTier } from "@/lib/verification/applyTierApproval";

/** POST /api/admin/verifications/tier1 — approve/reject a Tier 1 submission. */
export async function POST(request: Request) {
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

  return Response.json({ status: decision });
}
