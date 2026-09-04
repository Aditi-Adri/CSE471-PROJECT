import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { createWorkerProfileSchema } from "@/lib/validation/workerProfileSchema";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { recomputeTrustScore } from "@/lib/trust/recomputeTrustScore";
import type { DhakaArea } from "@/app/generated/prisma/client";

/** "Drone Repair" -> "drone-repair", falling back to "-2", "-3", ... on collision. */
async function uniqueSlug(name: string): Promise<string> {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "category";

  let slug = base;
  let suffix = 2;
  while (await prisma.serviceCategory.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  return slug;
}

/**
 * POST /api/worker-profile
 *
 * Registration only creates a User with role=WORKER — it doesn't
 * collect headline/bio/rates/categories, so there's no Worker row yet
 * to attach verification submissions to. This is that one-time
 * "finish setting up your worker profile" step, gating entry into the
 * verification flow.
 */
export const POST = withErrorHandling(async (request: Request) => {
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

  const {
    headline,
    bio,
    area,
    addressDetail,
    hourlyRateMinBdt,
    hourlyRateMaxBdt,
    yearsExperience,
    categoryIds,
    customCategoryName,
  } = parsed.data;

  const validCategories = await prisma.serviceCategory.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true },
  });
  if (validCategories.length !== categoryIds.length) {
    return Response.json({ error: "One or more selected categories don't exist." }, { status: 400 });
  }

  // "Other" — resolve the typed name into a real ServiceCategory,
  // reusing an existing one (case-insensitive) if this trade already
  // exists under that name rather than creating a duplicate every time
  // someone types a slightly different casing of the same thing.
  let allCategoryIds = categoryIds;
  if (customCategoryName) {
    const existingByName = await prisma.serviceCategory.findFirst({
      where: { name: { equals: customCategoryName, mode: "insensitive" } },
      select: { id: true },
    });

    const category =
      existingByName ??
      (await prisma.serviceCategory.create({
        data: {
          name: customCategoryName,
          slug: await uniqueSlug(customCategoryName),
          description: "Added by a worker — not yet one of our standard categories.",
          icon: "🆕",
          // Seeded with the name itself so it's at least minimally
          // findable by lib/ai/keywordEngine.ts right away, same as
          // every other category's keyword list.
          keywords: [customCategoryName.toLowerCase()],
        },
        select: { id: true },
      }));

    allCategoryIds = [...categoryIds, category.id];
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
      // MODULE 3 -> Worker Subscription & Working Radius (new feature):
      // not set explicitly — every new worker just gets the DB column's
      // own default (1km, the free Basic plan's fixed radius).
      avatarSeed: session.user.id,
      categories: {
        create: allCategoryIds.map((categoryId, index) => ({ categoryId, isPrimary: index === 0 })),
      },
    },
    select: { id: true },
  });

  // MODULE 2 -> FEATURE 1 (Shiva): every path that creates a Worker
  // computes an initial trustScore right away — see the comment above
  // Worker.trustScore in prisma/schema.prisma for why it's cached
  // rather than left null until the first review comes in.
  await recomputeTrustScore(worker.id);

  return Response.json({ worker }, { status: 201 });
});
