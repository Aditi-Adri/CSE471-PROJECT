import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/verification/requireAdmin";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

/**
 * GET /api/admin/verifications
 *
 * Everything currently awaiting a coordinator's decision, across all
 * three tiers — the data behind /admin/verifications.
 */
export const GET = withErrorHandling(async () => {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  const workerSelect = {
    id: true,
    headline: true,
    user: { select: { name: true, email: true } },
  } as const;

  const [tier1, tier2, tier3] = await Promise.all([
    prisma.tier1Verification.findMany({
      where: { status: "PENDING" },
      orderBy: { submittedAt: "asc" },
      include: { worker: { select: workerSelect } },
    }),
    prisma.tier2SkillTest.findMany({
      where: { status: "PENDING" },
      orderBy: { requestedAt: "asc" },
      include: { worker: { select: workerSelect } },
    }),
    prisma.tier3PoliceClearance.findMany({
      where: { status: "PENDING" },
      orderBy: { submittedAt: "asc" },
      include: {
        worker: { select: workerSelect },
        references: true,
      },
    }),
  ]);

  return Response.json({ tier1, tier2, tier3 });
});
