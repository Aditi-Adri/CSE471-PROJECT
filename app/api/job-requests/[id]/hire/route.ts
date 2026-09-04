import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { hireApplicantSchema } from "@/lib/validation/jobRequestSchema";
import { checkRateLimit, getClientIp } from "@/lib/auth/rateLimit";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

// POST /api/job-requests/[id]/hire
// body: { workerId }
// The customer picks exactly one applicant to hire. Only that
// customer can call this, only for someone who actually applied.
// The update only succeeds while status is still OPEN, so two hire
// clicks at the same time can't both go through — the second gets a 409.
export const POST = withErrorHandling(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }

  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`job-request-hire:${session.user.id}:${ip}`, 20, 10 * 60 * 1000);
  if (!rateLimit.allowed) {
    return Response.json({ error: "Too many requests. Please try again shortly." }, { status: 429 });
  }

  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = hireApplicantSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request.", issues: z.treeifyError(parsed.error) },
      { status: 400 }
    );
  }
  const { workerId } = parsed.data;

  const jobRequest = await prisma.jobRequest.findUnique({
    where: { id },
    select: { customerId: true },
  });
  if (!jobRequest) {
    return Response.json({ error: "This request doesn't exist." }, { status: 404 });
  }
  if (jobRequest.customerId !== session.user.id) {
    return Response.json({ error: "This isn't your request." }, { status: 403 });
  }

  const application = await prisma.jobRequestApplication.findUnique({
    where: { jobRequestId_workerId: { jobRequestId: id, workerId } },
    select: { id: true },
  });
  if (!application) {
    return Response.json({ error: "That worker hasn't applied to this request." }, { status: 400 });
  }

  const result = await prisma.jobRequest.updateMany({
    where: { id, status: "OPEN" },
    data: { status: "HIRED", hiredWorkerId: workerId, hiredAt: new Date() },
  });

  if (result.count === 0) {
    return Response.json({ error: "This request has already been filled." }, { status: 409 });
  }

  return Response.json({ status: "HIRED" });
});
