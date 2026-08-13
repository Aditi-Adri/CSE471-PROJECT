/**
 * Demo data for the neighborhood demand heatmap (/dashboard/opportunities,
 * Module 2 Feature 2) — a separate, purely additive script from
 * prisma/seed.ts on purpose: the main seed is destructive (wipes and
 * rebuilds categories/workers), and re-running it isn't what a live demo
 * needs. This only ever touches rows it owns (customers under the
 * `opportunities-demo-N@hirelocal-demo.test` pattern, same `.test`
 * convention prisma/seed.ts already uses) — safe to re-run, and it never
 * deletes real worker/category/user data.
 *
 * Deliberately labeled, not disguised as organic activity: every demo
 * customer is named "Opportunities Demo Customer N" and every JobRequest
 * description starts with "[Demo]". If asked directly, this is honestly
 * "seed data I generated to populate the heatmap for a demo" — same
 * spirit as the 101 seeded worker profiles the rest of the app already
 * runs against.
 *
 * The area weighting below isn't random — it's picked to contrast
 * against the real current worker distribution (areas with few
 * registered workers get the added demand, so the shortage score
 * actually shows up as red rather than being masked by supply that's
 * already there), so this is closer to "load-testing the score formula
 * with a realistic imbalance" than "fake numbers."
 *
 * Deterministic PRNG (same mulberry32 approach as prisma/seed.ts, a
 * different seed constant) — reproducible, same result every run.
 *
 * Run with: npx tsx --env-file=.env prisma/seedOpportunitiesDemo.ts
 */

import { prisma } from "../lib/db";
import { DHAKA_AREA_COORDS, jitterCoord } from "../lib/constants/dhakaAreaCoords";
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
const rand = mulberry32(472);

const DEMO_EMAIL_DOMAIN = "hirelocal-demo.test";
const DEMO_EMAIL_PREFIX = "opportunities-demo-";
const DESCRIPTION_PREFIX = "[Demo]";

// Real areas with the fewest currently-available workers get the most
// added demand, so the shortage score contrast is visible even without
// touching the Worker table at all. Areas left out entirely (Gulshan,
// Lalmatia, Bashundhara, ...) act as the visual "well-covered" baseline.
const OPEN_JOB_REQUEST_COUNTS: Partial<Record<DhakaArea, number>> = {
  BADDA: 7,
  JATRABARI: 6,
  MOTIJHEEL: 5,
  FARMGATE: 4,
  MIRPUR: 3,
  KHILGAON: 2,
};

const BOOKING_AREAS: DhakaArea[] = ["BADDA", "JATRABARI", "MOTIJHEEL", "FARMGATE", "MIRPUR", "UTTARA", "RAMPURA"];
const SOS_AREAS: DhakaArea[] = ["BADDA", "MOTIJHEEL", "JATRABARI", "TEJGAON"];

const DESCRIPTIONS = [
  "Need someone today, kitchen sink is leaking badly",
  "Ceiling fan making a loud grinding noise, needs a look",
  "Circuit breaker keeps tripping in the evening",
  "Gas stove igniter not working, two burners out",
  "Small paint job, one bedroom wall, water damage patch",
  "AC not cooling properly, might need a gas refill",
  "Bathroom tile came loose, water getting underneath",
  "Need help mounting a wall unit, no drill available",
];

async function main() {
  console.log(`Seeding opportunities demo data (customers: ${DEMO_EMAIL_PREFIX}*@${DEMO_EMAIL_DOMAIN})...`);

  // Safe to re-run: clear only what this script owns before recreating.
  const existingDemoUsers = await prisma.user.findMany({
    where: { email: { startsWith: DEMO_EMAIL_PREFIX, endsWith: `@${DEMO_EMAIL_DOMAIN}` } },
    select: { id: true },
  });
  const existingIds = existingDemoUsers.map((u) => u.id);
  if (existingIds.length > 0) {
    await prisma.jobRequest.deleteMany({ where: { customerId: { in: existingIds } } });
    await prisma.booking.deleteMany({ where: { customerId: { in: existingIds } } });
    await prisma.sosRequest.deleteMany({ where: { customerId: { in: existingIds } } });
    await prisma.user.deleteMany({ where: { id: { in: existingIds } } });
    console.log(`  cleared ${existingIds.length} previous demo customer(s) and their rows`);
  }

  const totalRequests = Object.values(OPEN_JOB_REQUEST_COUNTS).reduce((a, b) => a + (b ?? 0), 0);
  const customerCount = Math.max(6, Math.ceil(totalRequests / 3)); // a handful of distinct posters, not one customer for everything
  const customers = [];
  for (let i = 1; i <= customerCount; i++) {
    const user = await prisma.user.create({
      data: {
        name: `Opportunities Demo Customer ${i}`,
        email: `${DEMO_EMAIL_PREFIX}${i}@${DEMO_EMAIL_DOMAIN}`,
        phone: `+8801700${String(900000 + i).padStart(6, "0")}`,
        passwordHash: null,
        role: "CUSTOMER",
      },
    });
    customers.push(user);
  }
  console.log(`  created ${customers.length} demo customers`);

  let jobRequestCount = 0;
  for (const [area, count] of Object.entries(OPEN_JOB_REQUEST_COUNTS) as [DhakaArea, number][]) {
    for (let i = 0; i < count; i++) {
      const customer = customers[Math.floor(rand() * customers.length)];
      await prisma.jobRequest.create({
        data: {
          customerId: customer.id,
          description: `${DESCRIPTION_PREFIX} ${DESCRIPTIONS[Math.floor(rand() * DESCRIPTIONS.length)]}`,
          area,
          budgetMinBdt: 300 + Math.floor(rand() * 5) * 100,
          budgetMaxBdt: 800 + Math.floor(rand() * 8) * 100,
        },
      });
      jobRequestCount++;
    }
  }
  console.log(`  created ${jobRequestCount} open job requests`);

  let bookingCount = 0;
  for (let i = 0; i < 10; i++) {
    const area = BOOKING_AREAS[i % BOOKING_AREAS.length];
    const coord = jitterCoord(DHAKA_AREA_COORDS[area], `demo-booking-${i}`);
    const customer = customers[Math.floor(rand() * customers.length)];
    await prisma.booking.create({
      data: {
        customerId: customer.id,
        destinationLat: coord.lat,
        destinationLng: coord.lng,
        serviceAddress: `${DESCRIPTION_PREFIX} demo address near ${area}`,
      },
    });
    bookingCount++;
  }
  console.log(`  created ${bookingCount} recent bookings`);

  let sosCount = 0;
  for (let i = 0; i < 4; i++) {
    const area = SOS_AREAS[i % SOS_AREAS.length];
    const coord = jitterCoord(DHAKA_AREA_COORDS[area], `demo-sos-${i}`);
    const customer = customers[Math.floor(rand() * customers.length)];
    await prisma.sosRequest.create({
      data: {
        customerId: customer.id,
        lat: coord.lat,
        lng: coord.lng,
      },
    });
    sosCount++;
  }
  console.log(`  created ${sosCount} SOS requests`);

  console.log("Done. Refresh /dashboard/opportunities as a worker to see it.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
