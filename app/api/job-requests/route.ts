import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { createJobRequestSchema, listJobRequestsSchema } from "@/lib/validation/jobRequestSchema";
import { checkRateLimit, getClientIp } from "@/lib/auth/rateLimit";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import type { DhakaArea } from "@/app/generated/prisma/client";

// GET /api/job-requests?area=...
// The list of still-open job requests a worker can apply to. Stays
// visible until the customer hires someone, not just until the first
// application — any number of workers can apply to the same job.
export const GET = withErrorHandling(async (request: Request) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = listJobRequestsSchema.safeParse({
    area: searchParams.get("area") || undefined,
  });
  if (!parsed.success) {
    return Response.json({ error: "Invalid filter." }, { status: 400 });
  }

  // Only workers apply, so only bother checking "did I already apply"
  // for a signed-in worker — everyone else just sees the plain list.
  const worker = await prisma.worker.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  const requests = await prisma.jobRequest.findMany({
    where: {
      status: "OPEN",
      area: parsed.data.area as DhakaArea | undefined,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      description: true,
      area: true,
      budgetMinBdt: true,
      budgetMaxBdt: true,
      createdAt: true,
      customer: { select: { name: true } },
      _count: { select: { applications: true } },
      applications: worker
        ? { where: { workerId: worker.id }, select: { id: true }, take: 1 }
        : false,
    },
  });

  // Reshape each request into the simple fields the page needs.
  const shapedRequests = [];
  for (const request of requests) {
    let hasApplied = false;
    if (worker && request.applications.length > 0) {
      hasApplied = true;
    }

    shapedRequests.push({
      id: request.id,
      description: request.description,
      area: request.area,
      budgetMinBdt: request.budgetMinBdt,
      budgetMaxBdt: request.budgetMaxBdt,
      createdAt: request.createdAt,
      customer: request.customer,
      applicantCount: request._count.applications,
      hasApplied,
    });
  }

  return Response.json({ requests: shapedRequests });
});

// POST /api/job-requests
// A customer posts what they need — this is the fallback offered when
// a search doesn't match any category.
export const POST = withErrorHandling(async (request: Request) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }

  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`job-request-post:${session.user.id}:${ip}`, 10, 10 * 60 * 1000);
  if (!rateLimit.allowed) {
    return Response.json({ error: "Too many requests. Please try again shortly." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createJobRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request.", issues: z.treeifyError(parsed.error) },
      { status: 400 }
    );
  }

  const { description, area, budgetMinBdt, budgetMaxBdt } = parsed.data;

  const jobRequest = await prisma.jobRequest.create({
    data: {
      customerId: session.user.id,
      description,
      area: area as DhakaArea,
      budgetMinBdt,
      budgetMaxBdt,
    },
    select: { id: true },
  });

  return Response.json({ jobRequest }, { status: 201 });
});
