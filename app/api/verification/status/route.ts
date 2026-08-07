import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

/** GET /api/verification/status — the signed-in worker's own tier progress. */
export const GET = withErrorHandling(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }

  const worker = await prisma.worker.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      verificationTier: true,
      tier1Verification: {
        select: {
          status: true,
          autoApproved: true,
          matchDistance: true,
          reviewNote: true,
          submittedAt: true,
          reviewedAt: true,
        },
      },
      tier2SkillTest: {
        select: {
          status: true,
          preferredSchedule: true,
          evaluatorNote: true,
          requestedAt: true,
          evaluatedAt: true,
        },
      },
      tier3PoliceClearance: {
        select: {
          status: true,
          reviewNote: true,
          submittedAt: true,
          reviewedAt: true,
          references: {
            select: { id: true, name: true, phone: true, relationship: true, contacted: true, verified: true },
          },
        },
      },
    },
  });

  return Response.json({ worker });
});
