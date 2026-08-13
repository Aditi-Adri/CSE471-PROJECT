import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

/**
 * PATCH /api/job-requests/[id]
 *
 * A worker claiming an open request — "I'll take this." Only ever
 * moves OPEN -> CLAIMED; nothing about the actual job (contact, scope,
 * payment) is handled here, this just marks it as picked up. Keeping
 * that out of scope on purpose: the real booking flow already owns
 * bargaining/payment (see docs/FEATURE_SPEC.md), and duplicating that
 * for a feature this small isn't worth it.
 */
export const PATCH = withErrorHandling(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }

  const worker = await prisma.worker.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!worker) {
    return Response.json({ error: "Only workers can claim requests." }, { status: 403 });
  }

  const { id } = await params;

  // A plain conditional update — only succeeds if the request is still
  // OPEN, so two workers racing to claim the same request can't both
  // "win"; whoever's update lands first is the only one that matches
  // this where clause.
  const result = await prisma.jobRequest.updateMany({
    where: { id, status: "OPEN" },
    data: { status: "CLAIMED", claimedById: worker.id, claimedAt: new Date() },
  });

  if (result.count === 0) {
    return Response.json(
      { error: "This request was already claimed, or doesn't exist." },
      { status: 409 }
    );
  }

  return Response.json({ status: "CLAIMED" });
});
