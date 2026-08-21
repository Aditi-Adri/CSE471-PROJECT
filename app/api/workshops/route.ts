import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/verification/requireAdmin";
import { createWorkshopSchema } from "@/lib/validation/workshopSchema";
import { checkRateLimit, getClientIp } from "@/lib/auth/rateLimit";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

// GET /api/workshops
// Every upcoming-first workshop, for any signed-in user to browse.
// Shows how many people have registered, and whether the person asking
// has registered themselves.
export const GET = withErrorHandling(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }

  const workshops = await prisma.workshop.findMany({
    orderBy: { scheduledAt: "asc" },
    select: {
      id: true,
      title: true,
      description: true,
      scheduledAt: true,
      isPaid: true,
      feeBdt: true,
      createdBy: { select: { name: true } },
      _count: { select: { registrations: true } },
      registrations: { where: { userId: session.user.id }, select: { id: true }, take: 1 },
    },
  });

  // Reshape each workshop into the flat object the frontend needs.
  const shapedWorkshops = [];
  for (const workshop of workshops) {
    let hasRegistered = false;
    if (workshop.registrations.length > 0) {
      hasRegistered = true;
    }

    shapedWorkshops.push({
      id: workshop.id,
      title: workshop.title,
      description: workshop.description,
      scheduledAt: workshop.scheduledAt,
      isPaid: workshop.isPaid,
      feeBdt: workshop.feeBdt,
      hostedBy: workshop.createdBy.name,
      registrationCount: workshop._count.registrations,
      hasRegistered,
    });
  }

  return Response.json({ workshops: shapedWorkshops });
});

// POST /api/workshops
// body: { title, description, scheduledAt, isPaid, feeBdt? }
// Admin-only: create a new workshop or training programme, free or paid.
export const POST = withErrorHandling(async (request: Request) => {
  const adminCheck = await requireAdminSession();
  if (!adminCheck.ok) {
    return adminCheck.response;
  }
  const session = adminCheck.session;

  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`workshop-create:${session.user.id}:${ip}`, 20, 10 * 60 * 1000);
  if (!rateLimit.allowed) {
    return Response.json({ error: "Too many requests. Please try again shortly." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createWorkshopSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request.", issues: z.treeifyError(parsed.error) },
      { status: 400 }
    );
  }
  const { title, description, scheduledAt, isPaid, feeBdt } = parsed.data;

  // Only save a fee when the workshop is actually paid — an unpaid
  // workshop's fee is always null, even if one was somehow sent.
  let savedFeeBdt = null;
  if (isPaid) {
    savedFeeBdt = feeBdt ?? null;
  }

  const workshop = await prisma.workshop.create({
    data: {
      title,
      description,
      scheduledAt,
      isPaid,
      feeBdt: savedFeeBdt,
      createdById: session.user.id,
    },
    select: { id: true },
  });

  return Response.json({ workshop }, { status: 201 });
});
