import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { createWorkerProfileSchema } from "@/lib/validation/workerProfileSchema";
import type { DhakaArea } from "@/app/generated/prisma/client";

/**
 * POST /api/worker-profile
 *
 * Registration only creates a User with role=WORKER — it doesn't
 * collect headline/bio/rates/categories, so there's no Worker row yet
 * to attach verification submissions to. This is that one-time
 * "finish setting up your worker profile" step, gating entry into the
 * verification flow.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }
  if (session.user.role !== "WORKER") {
    return Response.json(
      { error: "Only accounts registered as a Worker can create a worker profile." },
      { status: 403 }
    );
  }

  const existing = await prisma.worker.findUnique({ where: { userId: session.user.id } });
  if (existing) {
    return Response.json({ error: "You already have a worker profile." }, { status: 409 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createWorkerProfileSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid profile details.", issues: z.treeifyError(parsed.error) },
      { status: 400 }
    );
  }

  const { headline, bio, area, addressDetail, hourlyRateMinBdt, hourlyRateMaxBdt, yearsExperience, categoryIds } =
    parsed.data;

  const validCategories = await prisma.serviceCategory.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true },
  });
  if (validCategories.length !== categoryIds.length) {
    return Response.json({ error: "One or more selected categories don't exist." }, { status: 400 });
  }

  const worker = await prisma.worker.create({
    data: {
      userId: session.user.id,
      headline,
      bio,
      area: area as DhakaArea,
      addressDetail,
      hourlyRateMinBdt,
      hourlyRateMaxBdt,
      yearsExperience,
      avatarSeed: session.user.id,
      categories: {
        create: categoryIds.map((categoryId, index) => ({ categoryId, isPrimary: index === 0 })),
      },
    },
    select: { id: true },
  });

  return Response.json({ worker }, { status: 201 });
}
