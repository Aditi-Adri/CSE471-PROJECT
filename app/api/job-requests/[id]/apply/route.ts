import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { applyToJobSchema } from "@/lib/validation/jobRequestSchema";
import { checkRateLimit, getClientIp } from "@/lib/auth/rateLimit";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

// POST /api/job-requests/[id]/apply
// body: { wageBdt }
// A worker applies to an open job request with the wage they want.
// The wage must fall inside the customer's budget, or the application
// is rejected. Any number of workers can apply — the request stays
// open until the customer hires one of them.
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

  const body = await request.json().catch(() => null);
  const parsed = applyToJobSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request.", issues: z.treeifyError(parsed.error) },
      { status: 400 }
    );
  }

  const { id } = await params;

  const jobRequest = await prisma.jobRequest.findUnique({
    where: { id },
    select: { status: true, budgetMinBdt: true, budgetMaxBdt: true },
  });
  if (!jobRequest) {
    return Response.json({ error: "This request doesn't exist." }, { status: 404 });
  }
  if (jobRequest.status !== "OPEN") {
    return Response.json({ error: "This request is no longer open." }, { status: 409 });
  }

  // The wage a worker asks for must fall inside the customer's budget.
  // Either side of the budget is optional, so only check the sides that
  // were actually set.
  const wageBdt = parsed.data.wageBdt;
  if (jobRequest.budgetMinBdt !== null && wageBdt < jobRequest.budgetMinBdt) {
    return Response.json(
      { error: `Your wage doesn't match this job's budget — it's below the minimum of ${jobRequest.budgetMinBdt} BDT.` },
      { status: 400 }
    );
  }
  if (jobRequest.budgetMaxBdt !== null && wageBdt > jobRequest.budgetMaxBdt) {
    return Response.json(
      { error: `Your wage doesn't match this job's budget — it's above the maximum of ${jobRequest.budgetMaxBdt} BDT.` },
      { status: 400 }
    );
  }

  try {
    await prisma.jobRequestApplication.create({
      data: { jobRequestId: id, workerId: worker.id, wageBdt },
    });
  } catch (err) {
    // This worker already applied before (unique constraint hit) —
    // that's fine, not a real error.
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      return Response.json({ status: "APPLIED" });
    }
    throw err;
  }

  return Response.json({ status: "APPLIED" }, { status: 201 });
});
