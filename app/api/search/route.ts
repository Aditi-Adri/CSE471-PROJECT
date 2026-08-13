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

/**
 * GET /api/search?q=...&categoryId=&area=&minBudget=&maxBudget=&minTier=&availableNow=&sort=&page=&pageSize=
 *
 * This is the Smart Search + AI Category Mapping endpoint (Module 1,
 * Feature 2). Flow:
 *
 *   1. Parse + validate query params.
 *   2. Resolve a ServiceCategory either from an explicit `categoryId`
 *      filter, or by mapping the free-text `q` through
 *      lib/ai/categoryMapper.ts (free keyword engine, with an optional
 *      free-tier Groq call if GROQ_API_KEY is set).
 *   3. Build a filtered, sorted Prisma query from the remaining filters
 *      (area, budget range, verification tier, availability).
 *   4. Log the search (query text, matched category, method, timing) to
 *      SearchLog for analytics/audit.
 */
export async function GET(request: Request) {
  const startedAt = Date.now();

  // Deliberately no sign-in requirement — browsing search results is
  // meant to work for anonymous visitors — but every other public
  // endpoint in the app rate-limits by IP and this one didn't, which
  // left it as the one place a script could hammer the DB (and the
  // optional Groq call in mapQueryToCategory) for free.
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
    page: parseIntParam(searchParams.get("page")),
    pageSize: parseIntParam(searchParams.get("pageSize")),
  });

  if (!parsed.success) {
    return Response.json(
      { error: "Invalid search request.", issues: z.treeifyError(parsed.error) },
      { status: 400 }
    );
  }

  const { query, filters, sort, page, pageSize } = parsed.data;

  // --- Step 1: resolve category -----------------------------------
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

  // detectedCategory above may be missing `icon` when sourced from the
  // keyword-matching query (which didn't select it) — fetch it cleanly.
  if (detectedCategory && !detectedCategory.icon) {
    const withIcon = await prisma.serviceCategory.findUnique({
      where: { id: detectedCategory.id },
      select: { id: true, name: true, icon: true },
    });
    if (withIcon) detectedCategory = withIcon;
  }

  // --- Step 2: build + run the filtered worker query ----------------
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

  const results = workers.map((w) => ({
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
    avatarSeed: w.avatarSeed,
    categories: w.categories.map((wc) => ({ ...wc.category, isPrimary: wc.isPrimary })),
  }));

  const durationMs = Date.now() - startedAt;

  // --- Step 3: log the search (best-effort, never blocks the response) --
  // Skip logging the default "browse everyone" view (matchMethod "NONE")
  // — only log when the customer actually expressed some intent, via
  // text or an explicit category filter. The `!== "NONE"` check (rather
  // than re-checking query.length) also lets TypeScript narrow
  // `matchMethod` to Prisma's MatchMethod enum for the write below.
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
