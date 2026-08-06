/**
 * Seed script for Module 1 -> Feature 2 (Smart Search & AI Category Mapping).
 *
 * Populates real, structured data — not a handful of throwaway rows — so
 * the search + filter feature can be demoed against something that
 * resembles an actual Dhaka home-services marketplace:
 *   - 16 real service categories with rich keyword lists (these keywords
 *     are what the free fallback classifier in lib/ai/keywordEngine.ts
 *     matches against)
 *   - ~95 worker profiles spread realistically across categories, Dhaka
 *     neighbourhoods, verification tiers, rates and ratings
 *   - weekly availability blocks per worker
 *
 * Generation is deterministic (seeded PRNG, seed = 471) so re-running
 * `npm run db:seed` always reproduces the exact same dataset — useful so
 * a demo/viva run looks the same every time.
 *
 * Run with: npm run db:seed
 */

import { prisma } from "../lib/db";
import { SERVICE_CATEGORIES } from "../lib/data/serviceCategories";
import type { DhakaArea, VerificationTier } from "../app/generated/prisma/client";

// ---------------------------------------------------------------------
// Deterministic PRNG (mulberry32) so the "random" dataset is reproducible.
// ---------------------------------------------------------------------
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
const rand = mulberry32(471);

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
function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ---------------------------------------------------------------------
// Dhaka areas, with a human label + a rough "premium" weight that nudges
// rates in upscale neighbourhoods slightly higher (realism, not gameplay).
// ---------------------------------------------------------------------
const AREAS: { value: DhakaArea; label: string; premium: number }[] = [
  { value: "GULSHAN", label: "Gulshan", premium: 1.35 },
  { value: "BANANI", label: "Banani", premium: 1.3 },
  { value: "BARIDHARA", label: "Baridhara", premium: 1.35 },
  { value: "DHANMONDI", label: "Dhanmondi", premium: 1.2 },
  { value: "UTTARA", label: "Uttara", premium: 1.15 },
  { value: "MIRPUR", label: "Mirpur", premium: 0.9 },
  { value: "MOHAMMADPUR", label: "Mohammadpur", premium: 0.95 },
  { value: "BASHUNDHARA", label: "Bashundhara R/A", premium: 1.25 },
  { value: "BADDA", label: "Badda", premium: 1.0 },
  { value: "RAMPURA", label: "Rampura", premium: 0.95 },
  { value: "MOTIJHEEL", label: "Motijheel", premium: 1.05 },
  { value: "OLD_DHAKA", label: "Old Dhaka", premium: 0.85 },
  { value: "WARI", label: "Wari", premium: 0.9 },
  { value: "LALMATIA", label: "Lalmatia", premium: 1.1 },
  { value: "FARMGATE", label: "Farmgate", premium: 1.0 },
  { value: "TEJGAON", label: "Tejgaon", premium: 1.0 },
  { value: "KHILGAON", label: "Khilgaon", premium: 0.95 },
  { value: "MALIBAGH", label: "Malibagh", premium: 0.95 },
  { value: "JATRABARI", label: "Jatrabari", premium: 0.8 },
  { value: "MOHAKHALI", label: "Mohakhali", premium: 1.1 },
  { value: "BANASREE", label: "Banasree", premium: 1.0 },
  { value: "SAVAR", label: "Savar", premium: 0.75 },
];

const FIRST_NAMES = [
  "Rafiqul", "Habibur", "Jashim", "Kamal", "Mizanur", "Abdul", "Sohel",
  "Delwar", "Nasir", "Faruk", "Shahin", "Rubel", "Anwar", "Zahid", "Rana",
  "Mamun", "Iqbal", "Selim", "Nazrul", "Alauddin", "Golam", "Shafiqul",
  "Moinul", "Aminul", "Rashed", "Belal", "Jahangir", "Liton", "Masud",
  "Tariqul", "Salauddin", "Manik", "Hasan", "Emran", "Rezaul", "Shamim",
  "Enamul", "Firoz", "Ashraful", "Wahidul", "Mostafa", "Rafique", "Harun",
  "Alamgir", "Kabir", "Nurul", "Shahidul", "Yousuf", "Zakir", "Robiul",
  "Fatema", "Rokeya", "Nasrin", "Shirin", "Salma", "Ruma", "Momena",
  "Halima", "Parveen", "Rina", "Shabnam", "Josna", "Marium", "Ayesha",
  "Lutfa", "Kohinoor", "Jesmin",
];
const LAST_NAMES = [
  "Islam", "Rahman", "Hossain", "Ahmed", "Khan", "Miah", "Sarkar", "Molla",
  "Sheikh", "Talukder", "Bepari", "Mridha", "Khondaker", "Pramanik",
  "Sardar", "Munshi", "Akand", "Biswas", "Uddin",
];

const HEADLINE_TEMPLATES = [
  "{category} specialist serving {area} and nearby areas",
  "Trusted {category} technician based in {area}",
  "Fast, reliable {category} service across {area}",
  "{years}+ years of hands-on {category} experience in {area}",
  "Same-day {category} callouts in and around {area}",
];

const BIO_TEMPLATES = [
  "Handles residential and small commercial {category} jobs. Brings own tools, gives an upfront quote before starting any work.",
  "Focused on tidy, no-surprise {category} work — explains the issue in plain language before charging anything.",
  "Started as an apprentice and has been doing {category} work independently for {years} years across {area}.",
  "Specializes in emergency {category} callouts as well as scheduled maintenance visits.",
  "Known locally for punctual {category} service and fair, transparent pricing.",
];

function makeAvailability(isAvailableNow: boolean) {
  // 2-4 recurring weekly blocks; Friday (5) gets shorter hours, a nod to
  // local work-week norms in Dhaka.
  const days = shuffle([0, 1, 2, 3, 4, 5, 6]).slice(0, intBetween(2, 4));
  return days.map((dayOfWeek) => {
    const isFriday = dayOfWeek === 5;
    const startHour = isFriday ? intBetween(14, 16) : intBetween(8, 10);
    const endHour = isFriday ? intBetween(18, 19) : intBetween(18, 21);
    return { dayOfWeek, startHour, endHour, _skip: !isAvailableNow && rand() < 0.3 };
  }).filter((s) => !s._skip).map(({ dayOfWeek, startHour, endHour }) => ({
    dayOfWeek,
    startHour,
    endHour,
  }));
}

/**
 * This script deletes existing categories/workers/search logs before
 * reseeding — safe on a solo local database, dangerous on a database the
 * whole team shares (it would wipe teammates' real data too). If
 * DATABASE_URL doesn't obviously point at localhost, refuse to run
 * unless it's explicitly confirmed.
 */
function assertSafeToWipe() {
  const url = process.env.DATABASE_URL ?? "";
  const looksLocal = /localhost|127\.0\.0\.1/i.test(url);
  const confirmed = process.env.CONFIRM_SEED === "yes" || process.argv.includes("--force");

  if (!looksLocal && !confirmed) {
    console.error(
      [
        "\n⚠️  Refusing to run: DATABASE_URL doesn't look like a local database.",
        "This script DELETES all existing categories, workers and search logs",
        "before reseeding — if this is a database your team shares, that would",
        "wipe everyone's data, not just yours.",
        "",
        "If you're sure you want to reset the SHARED database on purpose,",
        "warn your teammates first, then re-run with:",
        "",
        "  CONFIRM_SEED=yes npm run db:seed\n",
      ].join("\n")
    );
    process.exit(1);
  }
}

async function main() {
  assertSafeToWipe();

  console.log("Seeding HireLocal database (deterministic, seed=471)...\n");

  // Clean slate — makes this script safely re-runnable.
  await prisma.availabilitySlot.deleteMany();
  await prisma.workerCategory.deleteMany();
  await prisma.searchLog.deleteMany();
  await prisma.worker.deleteMany();
  await prisma.serviceCategory.deleteMany();
  await prisma.user.deleteMany({ where: { email: { endsWith: "@hirelocal-demo.test" } } });

  console.log(`Creating ${SERVICE_CATEGORIES.length} service categories...`);
  const createdCategories = [];
  for (const category of SERVICE_CATEGORIES) {
    // Prisma's generated `keywords: string[]` input wants a mutable
    // array; SERVICE_CATEGORIES is defined `as const` (so it can also be
    // safely shared with unit tests), hence the spread.
    const created = await prisma.serviceCategory.create({
      data: { ...category, keywords: [...category.keywords] },
    });
    createdCategories.push(created);
  }

  const WORKERS_PER_CATEGORY = 6;
  const usedEmails = new Set<string>();
  let workerCount = 0;

  for (const category of createdCategories) {
    for (let i = 0; i < WORKERS_PER_CATEGORY; i++) {
      const firstName = pick(FIRST_NAMES);
      const lastName = pick(LAST_NAMES);
      const fullName = `${firstName} ${lastName}`;

      const emailSlug = `${firstName}.${lastName}`.toLowerCase();
      let email = `${emailSlug}@hirelocal-demo.test`;
      let suffix = 1;
      while (usedEmails.has(email)) {
        suffix += 1;
        email = `${emailSlug}${suffix}@hirelocal-demo.test`;
      }
      usedEmails.add(email);

      const areaInfo = pick(AREAS);
      const tier = pickWeighted<VerificationTier>([
        ["UNVERIFIED", 0.28],
        ["TIER1_ID_VERIFIED", 0.30],
        ["TIER2_SKILL_TESTED", 0.25],
        ["TIER3_POLICE_CLEARED", 0.17],
      ]);
      const tierRateMultiplier =
        tier === "TIER3_POLICE_CLEARED" ? 1.3 :
        tier === "TIER2_SKILL_TESTED" ? 1.15 :
        tier === "TIER1_ID_VERIFIED" ? 1.05 : 1;

      const baseMin = intBetween(250, 450);
      const baseSpread = intBetween(200, 900);
      const hourlyRateMinBdt = Math.round(baseMin * areaInfo.premium * tierRateMultiplier / 10) * 10;
      const hourlyRateMaxBdt = Math.round((baseMin + baseSpread) * areaInfo.premium * tierRateMultiplier / 10) * 10;

      const yearsExperience = intBetween(1, 16);
      const isAvailableNow = rand() < 0.72;

      const tierRatingFloor =
        tier === "TIER3_POLICE_CLEARED" ? 4.2 :
        tier === "TIER2_SKILL_TESTED" ? 3.8 :
        tier === "TIER1_ID_VERIFIED" ? 3.3 : 0;
      const ratingCount = tier === "UNVERIFIED" ? intBetween(0, 8) : intBetween(6, 260);
      const ratingAvg = ratingCount === 0
        ? 0
        : Math.round((tierRatingFloor + rand() * (5 - tierRatingFloor)) * 10) / 10;
      const completedJobs = ratingCount === 0 ? intBetween(0, 3) : ratingCount + intBetween(0, 40);

      const headline = pick(HEADLINE_TEMPLATES)
        .replace("{category}", category.name)
        .replace("{area}", areaInfo.label)
        .replace("{years}", String(yearsExperience));
      const bio = pick(BIO_TEMPLATES)
        .replace(/{category}/g, category.name.toLowerCase())
        .replace(/{area}/g, areaInfo.label)
        .replace(/{years}/g, String(yearsExperience));

      const user = await prisma.user.create({
        data: {
          name: fullName,
          email,
          phone: `01${intBetween(3, 9)}${String(intBetween(0, 99999999)).padStart(8, "0")}`,
          role: "WORKER",
        },
      });

      const worker = await prisma.worker.create({
        data: {
          userId: user.id,
          headline,
          bio,
          area: areaInfo.value,
          addressDetail: `House ${intBetween(1, 40)}, Road ${intBetween(1, 27)}, ${areaInfo.label}, Dhaka`,
          hourlyRateMinBdt,
          hourlyRateMaxBdt,
          verificationTier: tier,
          yearsExperience,
          isAvailableNow,
          ratingAvg,
          ratingCount,
          completedJobs,
          avatarSeed: `${firstName}${lastName}${workerCount}`,
        },
      });

      // Primary category, plus ~25% chance of a plausible secondary one.
      await prisma.workerCategory.create({
        data: { workerId: worker.id, categoryId: category.id, isPrimary: true },
      });
      if (rand() < 0.25) {
        const other = pick(createdCategories.filter((c) => c.id !== category.id));
        await prisma.workerCategory.create({
          data: { workerId: worker.id, categoryId: other.id, isPrimary: false },
        });
      }

      const slots = makeAvailability(isAvailableNow);
      if (slots.length > 0) {
        await prisma.availabilitySlot.createMany({
          data: slots.map((s) => ({ ...s, workerId: worker.id })),
        });
      }

      workerCount += 1;
    }
  }

  console.log(`Created ${workerCount} workers across ${createdCategories.length} categories.\n`);
  console.log("Seed complete ✅");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
