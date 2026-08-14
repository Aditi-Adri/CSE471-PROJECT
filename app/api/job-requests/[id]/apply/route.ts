import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/auth/rateLimit";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

/**
 * POST /api/job-requests/[id]/apply
 *
 * A worker expressing interest in an OPEN request — "I'll take this."
 * Replaces the old single-claim PATCH: any number of workers can apply
 * to the same request now, so this only ever creates a
 * JobRequestApplication row. Nothing about the request itself changes
 * (still OPEN, still visible to every other worker) until the customer
 * hires someone via POST .../hire.
 */
export const POST = withErrorHandling(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }

  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`job-request-apply:${session.user.id}:${ip}`, 20, 10 * 60 * 1000);
  if (!rateLimit.allowed) {
    return Response.json({ error: "Too many requests. Please try again shortly." }, { status: 429 });
  }

  const worker = await prisma.worker.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!worker) {
    return Response.json({ error: "Only workers can apply to requests." }, { status: 403 });
  }

  const { id } = await params;

  const jobRequest = await prisma.jobRequest.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!jobRequest) {
    return Response.json({ error: "This request doesn't exist." }, { status: 404 });
  }
  if (jobRequest.status !== "OPEN") {
    return Response.json({ error: "This request is no longer open." }, { status: 409 });
  }

  try {
    await prisma.jobRequestApplication.create({
      data: { jobRequestId: id, workerId: worker.id },
    });
  } catch (err) {
    // Unique constraint on [jobRequestId, workerId] — already applied.
    // Not an error the worker needs to see as a failure.
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      return Response.json({ status: "APPLIED" });
    }
    throw err;
  }

  return Response.json({ status: "APPLIED" }, { status: 201 });
});
