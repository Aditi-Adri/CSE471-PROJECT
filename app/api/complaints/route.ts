import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { createComplaintSchema } from "@/lib/validation/complaintSchema";
import { checkRateLimit, getClientIp } from "@/lib/auth/rateLimit";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

// POST /api/complaints
// body: { workerId, subject, description }
// A customer files a complaint against a worker, from that worker's
// profile page. Only customers can file one — not workers, not admins.
export const POST = withErrorHandling(async (request: Request) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }
  const role = session.user.role;
  if (role !== "CUSTOMER" && role !== "CORPORATE") {
    return Response.json({ error: "Only customers can file a complaint." }, { status: 403 });
  }

  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`complaint-create:${session.user.id}:${ip}`, 10, 10 * 60 * 1000);
  if (!rateLimit.allowed) {
    return Response.json({ error: "Too many requests. Please try again shortly." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createComplaintSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request.", issues: z.treeifyError(parsed.error) },
      { status: 400 }
    );
  }
  const { workerId, subject, description } = parsed.data;

  const worker = await prisma.worker.findUnique({
    where: { id: workerId },
    select: { id: true },
  });
  if (!worker) {
    return Response.json({ error: "This worker doesn't exist." }, { status: 404 });
  }

  const complaint = await prisma.complaint.create({
    data: {
      customerId: session.user.id,
      workerId,
      subject,
      description,
    },
    select: { id: true },
  });

  return Response.json({ complaint }, { status: 201 });
});
