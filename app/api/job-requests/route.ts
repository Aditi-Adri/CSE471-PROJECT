import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { createJobRequestSchema, listJobRequestsSchema } from "@/lib/validation/jobRequestSchema";
import { checkRateLimit, getClientIp } from "@/lib/auth/rateLimit";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import type { DhakaArea } from "@/app/generated/prisma/client";

/**
 * GET /api/job-requests?area=...
 *
 * Open (not yet filled) job requests, newest first — the list a worker
 * browses on /dashboard/job-requests. Stays visible to every worker
 * until the customer hires someone (status flips to HIRED), not until
 * the first application — any number of workers can apply. Signed-in
 * only (any role can technically call this; only the worker-only
 * /dashboard page links to it), same "must be signed in" bar as the
 * rest of the account area.
 */
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

  const shaped = requests.map(({ applications, _count, ...rest }) => ({
    ...rest,
    applicantCount: _count.applications,
    hasApplied: worker ? applications.length > 0 : false,
  }));

  return Response.json({ requests: shaped });
});

/**
 * POST /api/job-requests
 *
 * A customer posting what they need — the fallback offered when a
 * search comes up with no matching category (see
 * components/search/SearchExperience.tsx). Rate-limited the same way
 * as the other write-heavy account/search endpoints.
 */
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
