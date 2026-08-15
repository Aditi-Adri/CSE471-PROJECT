/**
 * Demo data for the Worker Income Intelligence Dashboard (MODULE 2 ->
 * FEATURE 4, Jishan) — a separate, purely additive script from
 * prisma/seed.ts on purpose, same reasoning as
 * prisma/seedOpportunitiesDemo.ts: the main seed is destructive (wipes
 * and rebuilds categories/workers), and re-running it isn't what a live
 * demo needs.
 *
 * Inserts real WorkerJob rows for one existing worker, spread across
 * realistic dates in the current week/month/year so the Week/Month/Year
 * filters on the dashboard visibly produce different totals — these
 * rows flow through the exact same aggregation pipeline
 * (lib/income/getIncomeMetrics.ts) as a real completed booking. Every
 * inserted row has `bookingId: null` (a real completed booking always
 * has one — see lib/income/recordCompletedJob.ts), which is also how
 * this script finds and safely clears only its own previous output
 * before re-inserting: it never touches a WorkerJob row created from a
 * real booking.
 *
 * Picks the target worker in this order:
 *   1. The email passed as a CLI argument, if given.
 *   2. A worker named "Adib" (case-insensitive), if one exists — matches
 *      the example worker in the feature spec this was built from.
 *   3. Otherwise, the first worker in the database (by createdAt).
 *
 * Run with:
 *   npx tsx --env-file=.env prisma/seedWorkerIncomeDemo.ts [workerEmail]
 */

import { prisma } from "../lib/db";
import type { DhakaArea } from "../app/generated/prisma/client";

function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(2044);

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}
function pickWeighted<T>(entries: [T, number][]): T {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = rand() * total;
  for (const [value, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return value;
  }
  return entries[entries.length - 1][0];
}
function intBetween(min: number, max: number) {
  return Math.floor(rand() * (max - min + 1)) + min;
}

// Realistic (label, min, max BDT) job types per category slug — falls
// back to a generic "<Category> Service" entry for any category not
// listed here, so this never breaks if the worker lists something
// outside this table.
const JOB_TYPES_BY_CATEGORY_SLUG: Record<string, { label: string; min: number; max: number }[]> = {
  electrical: [
    { label: "Electrical Repair", min: 900, max: 1800 },
    { label: "Electrical Installation", min: 1500, max: 2600 },
    { label: "Wiring Fix", min: 800, max: 1400 },
  ],
  "ac-refrigeration-repair": [
    { label: "AC Service", min: 1000, max: 1800 },
    { label: "AC Gas Refill", min: 1500, max: 2200 },
    { label: "Fridge Repair", min: 900, max: 1600 },
  ],
  "appliance-repair": [
    { label: "Washing Machine Repair", min: 1000, max: 1800 },
    { label: "Microwave Repair", min: 700, max: 1200 },
  ],
  plumbing: [
    { label: "Pipe Repair", min: 600, max: 1200 },
    { label: "Leak Fix", min: 500, max: 1000 },
    { label: "Drain Cleaning", min: 600, max: 1100 },
  ],
  "home-cleaning": [{ label: "Deep Cleaning", min: 800, max: 1500 }],
  painting: [{ label: "Wall Painting", min: 1500, max: 3000 }],
};

function jobTypesForCategory(slug: string, name: string) {
  return JOB_TYPES_BY_CATEGORY_SLUG[slug] ?? [{ label: `${name} Service`, min: 800, max: 2000 }];
}

// Evening-heavy hour distribution so the Peak Hours chart shows a clear
// standout window, same "not random for randomness's sake" spirit as
// seedOpportunitiesDemo.ts's area weighting.
const HOUR_WEIGHTS: [number, number][] = [
  [9, 1], [10, 2], [11, 2], [12, 2], [13, 2], [14, 2], [15, 2], [16, 2],
  [17, 3], [18, 5], [19, 5], [20, 4], [21, 2],
];

function randomTimeOfDay(date: Date): Date {
  const hour = pickWeighted(HOUR_WEIGHTS);
  const minute = intBetween(0, 59);
  const d = new Date(date);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function startOfWeek(now: Date): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d;
}

async function main() {
  const targetEmail = process.argv[2]?.trim();

  const worker = targetEmail
    ? await prisma.worker.findFirst({
        where: { user: { email: targetEmail } },
        include: { user: { select: { name: true, email: true } }, categories: { include: { category: true } } },
      })
    : (await prisma.worker.findFirst({
        where: { user: { name: { equals: "Adib", mode: "insensitive" } } },
        include: { user: { select: { name: true, email: true } }, categories: { include: { category: true } } },
      })) ??
      (await prisma.worker.findFirst({
        orderBy: { createdAt: "asc" },
        include: { user: { select: { name: true, email: true } }, categories: { include: { category: true } } },
      }));

  if (!worker) {
    console.error(
      "No worker found. Create a worker account (and finish /dashboard/worker-profile) first, " +
        "or pass an existing worker's email as an argument."
    );
    process.exitCode = 1;
    return;
  }

  console.log(`Seeding income demo data for worker: ${worker.user.name} (${worker.user.email}), area ${worker.area as DhakaArea}`);

  // Safe to re-run: clear only rows this script (or a previous run of
  // it) created for this worker — never a row with a real bookingId.
  const cleared = await prisma.workerJob.deleteMany({ where: { workerId: worker.id, bookingId: null } });
  if (cleared.count > 0) console.log(`  cleared ${cleared.count} previous demo job(s)`);

  const categories = worker.categories.length > 0
    ? worker.categories.map((c) => c.category)
    : await prisma.serviceCategory.findMany({ take: 3 });

  if (categories.length === 0) {
    console.error("No service categories exist in the database — run `npm run db:seed` first.");
    process.exitCode = 1;
    return;
  }

  const now = new Date();
  const rows: { categoryId: string; jobType: string; amountBdt: number; completedAt: Date }[] = [];

  function addJob(date: Date) {
    const category = pick(categories);
    const jobType = pick(jobTypesForCategory(category.slug, category.name));
    rows.push({
      categoryId: category.id,
      jobType: jobType.label,
      amountBdt: intBetween(jobType.min, jobType.max),
      completedAt: randomTimeOfDay(date),
    });
  }

  // 1) The last 11 full calendar months (before the current one): 2-4
  //    jobs each, spread across the whole month — gives the Year filter
  //    real month-to-month variation.
  for (let monthsAgo = 11; monthsAgo >= 1; monthsAgo--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
    const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
    const jobCount = intBetween(2, 4);
    for (let i = 0; i < jobCount; i++) {
      addJob(new Date(monthDate.getFullYear(), monthDate.getMonth(), intBetween(1, daysInMonth)));
    }
  }

  // 2) The current month, excluding the current week: 3-5 jobs — so
  //    Month totals are visibly higher than Week alone, without
  //    overlapping the week's own dates.
  const weekStart = startOfWeek(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysBeforeThisWeekInMonth = Math.max(
    0,
    Math.round((weekStart.getTime() - monthStart.getTime()) / (24 * 60 * 60 * 1000))
  );
  if (daysBeforeThisWeekInMonth > 0) {
    const jobCount = intBetween(3, 5);
    for (let i = 0; i < jobCount; i++) {
      addJob(new Date(monthStart.getFullYear(), monthStart.getMonth(), intBetween(1, daysBeforeThisWeekInMonth)));
    }
  }

  // 3) The current week (Monday through today): 5-7 jobs, so Week has
  //    its own clearly non-empty, non-trivial dataset.
  const todayIndex = Math.min(6, Math.floor((now.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000)));
  const jobsThisWeek = intBetween(5, 7);
  for (let i = 0; i < jobsThisWeek; i++) {
    const dayOffset = intBetween(0, todayIndex);
    const day = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + dayOffset);
    addJob(day);
  }

  // Never schedule a job in the future (possible if today's random time
  // landed later than "now" on the current day).
  const safeRows = rows.map((r) => (r.completedAt > now ? { ...r, completedAt: now } : r));

  await prisma.workerJob.createMany({
    data: safeRows.map((r) => ({
      workerId: worker.id,
      categoryId: r.categoryId,
      jobType: r.jobType,
      amountBdt: r.amountBdt,
      completedAt: r.completedAt,
    })),
  });

  console.log(`  created ${safeRows.length} demo WorkerJob rows`);
  console.log("Done. Sign in as this worker and open /dashboard/worker-job to see Income Intelligence.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
