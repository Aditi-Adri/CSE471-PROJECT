import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

/**
 * GET /api/tracking/workers
 *
 * Lists all seeded demo technicians (WorkerLocation rows) for the live
 * tracking picker at /track. Requires a signed-in session — this used
 * to be fully public, which meant anyone, logged in or not, could pull
 * every worker's live lat/lng with a single unauthenticated request.
 * `WorkerLocation` isn't scoped to a specific viewer yet (it's not even
 * foreign-keyed to a User) — gating on "is someone logged in at all" is
 * the floor, not the full fix; see docs/FEATURE_SPEC.md's booking-flow
 * notes for the real ownership-scoping work this still needs.
 */
export const GET = withErrorHandling(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }

  const workers = await prisma.workerLocation.findMany();
  return Response.json(workers);
});
