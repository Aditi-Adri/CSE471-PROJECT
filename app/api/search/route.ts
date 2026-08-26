import { z } from "zod";
import { prisma } from "@/lib/db";
import { mapQueryToCategory } from "@/lib/ai/categoryMapper";
import { buildWorkerOrderBy, buildWorkerWhere } from "@/lib/search/buildWorkerQuery";
import { searchRequestSchema } from "@/lib/validation/searchSchema";
import { checkRateLimit, getClientIp } from "@/lib/auth/rateLimit";
import type { DhakaArea, VerificationTier } from "@/app/generated/prisma/client";

function parseIntParam(value: string | null): number | undefined {
  if (value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

// GET /api/search?q=...&categoryId=&area=&minBudget=&maxBudget=&minTier=&availableNow=&sort=&page=&pageSize=
// The Smart Search endpoint. What it does, in order:
//   1. Read and validate the query params.
//   2. Work out a category — either from an explicit categoryId
//      filter, or by mapping the typed text through the AI/keyword
//      engine in lib/ai/categoryMapper.ts.
//   3. Build a filtered, sorted worker query from the other filters.
//   4. Save the search to SearchLog for analytics.
// No sign-in required — anonymous visitors can search too — so this
// is rate-limited by IP instead, same as the other public endpoints.
export async function GET(request: Request) {
  const startedAt = Date.now();

  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`search:${ip}`, 60, 60 * 1000);
  if (!rateLimit.allowed) {
    return Response.json({ error: "Too many search requests. Please slow down." }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);

  const parsed = searchRequestSchema.safeParse({
    query: searchParams.get("q") ?? "",
    filters: {
      categoryId: searchParams.get("categoryId") || undefined,
      area: searchParams.get("area") || undefined,
      minBudget: parseIntParam(searchParams.get("minBudget")),
      maxBudget: parseIntParam(searchParams.get("maxBudget")),
      minTier: searchParams.get("minTier") || undefined,
      availableNow: searchParams.get("availableNow") === "true" ? true : undefined,
    },
    sort: searchParams.get("sort") || undefined,
    page: parseIntParam(searchParams.get("page")) ?? 1,
    pageSize: parseIntParam(searchParams.get("pageSize")) ?? 10,
  });

  if (!parsed.success) {
    return Response.json(
      { error: "Invalid search request.", issues: z.treeifyError(parsed.error) },
      { status: 400 }
    );
  }

  const { query, filters, sort, page, pageSize } = parsed.data;

  // Step 1: work out which category this search is about.
  let resolvedCategoryId = filters.categoryId ?? null;
  let detectedCategory: { id: string; name: string; icon: string } | null = null;
  // "NONE" = no query and no category filter at all — the default
  // "browse every verified technician" view a customer lands on.
  let matchMethod: "AI" | "KEYWORD" | "MANUAL_FILTER" | "NONE" = "NONE";
  let matchConfidence: number | null = null;

  if (resolvedCategoryId) {
    const category = await prisma.serviceCategory.findUnique({
      where: { id: resolvedCategoryId },
      select: { id: true, name: true, icon: true },
    });
    if (category) {
      detectedCategory = category;
      matchMethod = "MANUAL_FILTER";
      matchConfidence = 1;
    } else {
      resolvedCategoryId = null;
    }
  } else if (query.length >= 2) {
    const allCategories = await prisma.serviceCategory.findMany({
      select: { id: true, name: true, keywords: true },
    });
    const mapped = await mapQueryToCategory(query, allCategories);
    matchMethod = mapped.method;
    matchConfidence = mapped.confidence || null;
    if (mapped.categoryId) {
      resolvedCategoryId = mapped.categoryId;
      const full = allCategories.find((c) => c.id === mapped.categoryId);
      detectedCategory = full
        ? { id: full.id, name: full.name, icon: (full as { icon?: string }).icon ?? "" }
        : null;
    }
  }

  // The category above might be missing its icon if it came from the
  // keyword match — go fetch the full row so it's always complete.
  if (detectedCategory && !detectedCategory.icon) {
    const withIcon = await prisma.serviceCategory.findUnique({
      where: { id: detectedCategory.id },
      select: { id: true, name: true, icon: true },
    });
    if (withIcon) detectedCategory = withIcon;
  }

  // Step 2: build and run the filtered, sorted worker query.
  const where = buildWorkerWhere({
    categoryId: resolvedCategoryId,
    area: filters.area as DhakaArea | undefined,
    minBudget: filters.minBudget,
    maxBudget: filters.maxBudget,
    minTier: filters.minTier as VerificationTier | undefined,
    availableNow: filters.availableNow,
  });
  const orderBy = buildWorkerOrderBy(sort);

  const [total, workers] = await Promise.all([
    prisma.worker.count({ where }),
    prisma.worker.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        headline: true,
        bio: true,
        area: true,
        addressDetail: true,
        hourlyRateMinBdt: true,
        hourlyRateMaxBdt: true,
        verificationTier: true,
        yearsExperience: true,
        isAvailableNow: true,
        ratingAvg: true,
        ratingCount: true,
        completedJobs: true,
        // MODULE 2 -> FEATURE 1 (Shiva): surfaced on the card so a
        // customer comparing results sees it without opening every
        // profile — doesn't change ranking/filtering, purely additive.
        trustScore: true,
        avatarSeed: true,
        user: { select: { name: true } },
        categories: {
          select: {
            isPrimary: true,
            category: { select: { id: true, name: true, icon: true, slug: true } },
          },
        },
      },
    }),
  ]);

  // Reshape each worker into the flat object the frontend expects.
  const results = [];
  for (const w of workers) {
    const categories = [];
    for (const wc of w.categories) {
      categories.push({ ...wc.category, isPrimary: wc.isPrimary });
    }

    results.push({
      id: w.id,
      name: w.user.name,
      headline: w.headline,
      bio: w.bio,
      area: w.area,
      addressDetail: w.addressDetail,
      hourlyRateMinBdt: w.hourlyRateMinBdt,
      hourlyRateMaxBdt: w.hourlyRateMaxBdt,
      verificationTier: w.verificationTier,
      yearsExperience: w.yearsExperience,
      isAvailableNow: w.isAvailableNow,
      ratingAvg: w.ratingAvg,
      ratingCount: w.ratingCount,
      completedJobs: w.completedJobs,
      trustScore: w.trustScore,
      avatarSeed: w.avatarSeed,
      categories,
    });
  }

  const durationMs = Date.now() - startedAt;

  // Step 3: save the search for analytics — but only if the customer
  // actually typed something or picked a category. Skip logging the
  // plain "browse everyone" view. This never blocks the response.
  if (matchMethod !== "NONE") {
    prisma.searchLog
      .create({
        data: {
          queryText: query,
          detectedCategoryId: resolvedCategoryId,
          matchMethod,
          matchConfidence,
          resultCount: total,
          durationMs,
          area: (filters.area as DhakaArea | undefined) ?? null,
        },
      })
      .catch((err) => console.error("Failed to write SearchLog:", err));
  }

  return Response.json({
    query,
    detectedCategory,
    matchMethod,
    matchConfidence,
    sort,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    durationMs,
    results,
  });
}
