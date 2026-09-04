import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/verification/requireAdmin";
import { resolveComplaintSchema } from "@/lib/validation/complaintSchema";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

// GET /api/admin/complaints
// Admin-only: every complaint, pending ones first (newest first within
// each group), so what still needs a decision is easy to find.
export const GET = withErrorHandling(async () => {
  const adminCheck = await requireAdminSession();
  if (!adminCheck.ok) {
    return adminCheck.response;
  }

  const complaints = await prisma.complaint.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      subject: true,
      description: true,
      status: true,
      adminReply: true,
      resolvedAt: true,
      createdAt: true,
      customer: { select: { name: true, email: true } },
      worker: { select: { id: true, headline: true, user: { select: { name: true } } } },
    },
  });

  return Response.json({ complaints });
});

// POST /api/admin/complaints
// body: { complaintId, reply? }
// Admin-only: marks a complaint resolved, with an optional reply back
// to the customer who filed it.
export const POST = withErrorHandling(async (request: Request) => {
  const adminCheck = await requireAdminSession();
  if (!adminCheck.ok) {
    return adminCheck.response;
  }
  const session = adminCheck.session;

  const body = await request.json().catch(() => null);
  const parsed = resolveComplaintSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request.", issues: z.treeifyError(parsed.error) },
      { status: 400 }
    );
  }
  const { complaintId, reply } = parsed.data;

  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId },
    select: { id: true },
  });
  if (!complaint) {
    return Response.json({ error: "This complaint doesn't exist." }, { status: 404 });
  }

  // An empty reply box means "no reply," not the empty string.
  let savedReply = null;
  if (reply) {
    savedReply = reply;
  }

  await prisma.complaint.update({
    where: { id: complaintId },
    data: {
      status: "RESOLVED",
      adminReply: savedReply,
      resolvedById: session.user.id,
      resolvedAt: new Date(),
    },
  });

  return Response.json({ status: "RESOLVED" });
});
