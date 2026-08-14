/**
 * Demo data for the AI TrustScore engine + review fraud detector
 * (Module 2 Feature 1) — a separate, purely additive script from
 * prisma/seed.ts on purpose, same reasoning as
 * prisma/seedOpportunitiesDemo.ts: the main seed is destructive and
 * re-running it isn't what a live demo needs.
 *
 * Two things happen here:
 *
 *   1. A handful of real, existing workers (picked deterministically,
 *      one per scenario) get a set of demo bookings + reviews that
 *      tell a specific story — a star performer, a flaky no-show, a
 *      slow responder, and a review-fraud target — so the trust score
 *      spread and the fraud queue both have something worth looking
 *      at. Only rows this script owns (customers under the
 *      `trust-demo-N@hirelocal-demo.test` pattern) are cleared and
 *      recreated on re-run; the target workers themselves are real
 *      rows this script never deletes, only adds bookings/reviews to.
 *   2. Every worker in the database gets its trustScore backfilled.
 *      The 101 workers prisma/seed.ts creates all pre-date this
 *      feature and have trustScore: null — every new Worker computes
 *      one at creation now (see app/api/worker-profile/route.ts), but
 *      these older rows never got that call. Safe to re-run: it's the
 *      same recompute every real trigger already calls.
 *
 * Every fraud check below runs through the real
 * lib/trust/fraudDetector.ts — Groq if GROQ_API_KEY is set, the free
 * heuristic otherwise — so this is "load-testing the detector with
 * realistic-and-deliberately-fake reviews," not hand-picked fake
 * results.
 *
 * Run with: npx tsx --env-file=.env prisma/seedTrustScoreDemo.ts
 */

import { prisma } from "../lib/db";
import { detectReviewFraud } from "../lib/trust/fraudDetector";
import { recomputeTrustScore } from "../lib/trust/recomputeTrustScore";
import { DHAKA_AREA_COORDS, jitterCoord } from "../lib/constants/dhakaAreaCoords";
import type { BookingStatus, VerificationTier } from "../app/generated/prisma/client";

const DEMO_EMAIL_DOMAIN = "hirelocal-demo.test";
const DEMO_EMAIL_PREFIX = "trust-demo-";

const HOUR = 60 * 60 * 1000;

function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * HOUR);
}

// Deterministic PRNG (same mulberry32 approach as prisma/seed.ts and
// seedOpportunitiesDemo.ts, a different seed constant) — reproducible,
// same result every run, only used for small realistic jitter (the
// scenario each real worker gets is picked deterministically already,
// see pickScenarioWorkers).
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
const rand = mulberry32(473);

async function pickScenarioWorkers() {
  // Deterministic, not random: the worker with the most existing
  // completedJobs at each tier reads as the most "established" one to
  // hang a demo story on. Picked one at a time, excluding whoever's
  // already taken, so two scenarios sharing a tier (reliable/slow are
  // both TIER1) don't collide on the same worker.
  const taken = new Set<string>();
  const byTier = async (tier: VerificationTier) => {
    const worker = await prisma.worker.findFirst({
      where: { verificationTier: tier, id: { notIn: [...taken] } },
      orderBy: { completedJobs: "desc" },
      select: { id: true, headline: true, user: { select: { name: true } } },
    });
    if (worker) taken.add(worker.id);
    return worker;
  };

  // Sequential, not Promise.all — each pick depends on `taken` from the last.
  const star = await byTier("TIER3_POLICE_CLEARED");
  const reliable = await byTier("TIER1_ID_VERIFIED");
  const flaky = await byTier("TIER2_SKILL_TESTED");
  const slow = await byTier("TIER1_ID_VERIFIED");
  const fraudTarget = await byTier("UNVERIFIED");

  return { star, reliable, flaky, slow, fraudTarget };
}

async function makeCustomers(count: number) {
  const customers = [];
  for (let i = 1; i <= count; i++) {
    const user = await prisma.user.create({
      data: {
        name: `Trust Demo Customer ${i}`,
        email: `${DEMO_EMAIL_PREFIX}${i}@${DEMO_EMAIL_DOMAIN}`,
        phone: `+8801800${String(900000 + i).padStart(6, "0")}`,
        passwordHash: null,
        role: "CUSTOMER",
      },
    });
    customers.push(user);
  }
  return customers;
}

/** A single completed (or not) booking + optional review, backdated to tell a specific story. */
async function makeBooking(opts: {
  customerId: string;
  workerId: string;
  status: BookingStatus;
  requestedHoursAgo: number;
  responseDelayHours: number | null; // null = never responded
  completedHoursAgo: number | null; // null = not completed
  review: { rating: number; comment: string } | null;
}) {
  const coord = jitterCoord(DHAKA_AREA_COORDS.DHANMONDI, `${opts.workerId}-${opts.requestedHoursAgo}`);
  const createdAt = hoursAgo(opts.requestedHoursAgo);
  const respondedAt = opts.responseDelayHours != null ? new Date(createdAt.getTime() + opts.responseDelayHours * HOUR) : null;
  const completedAt = opts.completedHoursAgo != null ? hoursAgo(opts.completedHoursAgo) : null;

  const booking = await prisma.booking.create({
    data: {
      customerId: opts.customerId,
      workerId: opts.workerId,
      status: opts.status,
      destinationLat: coord.lat,
      destinationLng: coord.lng,
      serviceAddress: "[Demo] address for the trust-score demo",
      proposedRateBdt: 800,
      agreedRateBdt: 800,
      createdAt,
      respondedAt,
      completedAt,
      updatedAt: completedAt ?? respondedAt ?? createdAt,
    },
  });

  if (opts.review) {
    const fraud = await detectReviewFraud({
      rating: opts.review.rating,
      comment: opts.review.comment,
      workerId: opts.workerId,
    });
    await prisma.review.create({
      data: {
        bookingId: booking.id,
        customerId: opts.customerId,
        workerId: opts.workerId,
        rating: opts.review.rating,
        comment: opts.review.comment,
        fraudFlagged: fraud.fraudFlagged,
        fraudScore: fraud.fraudScore,
        fraudReason: fraud.fraudReason,
        fraudMethod: fraud.fraudMethod,
        createdAt: completedAt ?? createdAt,
      },
    });
  }

  return booking;
}

async function main() {
  console.log(`Seeding trust-score demo data (customers: ${DEMO_EMAIL_PREFIX}*@${DEMO_EMAIL_DOMAIN})...`);

  // --- Clean up this script's own rows from a previous run --------
  const existingDemoUsers = await prisma.user.findMany({
    where: { email: { startsWith: DEMO_EMAIL_PREFIX, endsWith: `@${DEMO_EMAIL_DOMAIN}` } },
    select: { id: true },
  });
  const existingIds = existingDemoUsers.map((u) => u.id);
  if (existingIds.length > 0) {
    // Booking -> Review cascades (see Review.booking's onDelete: Cascade).
    await prisma.booking.deleteMany({ where: { customerId: { in: existingIds } } });
    await prisma.user.deleteMany({ where: { id: { in: existingIds } } });
    console.log(`  cleared ${existingIds.length} previous demo customer(s) and their rows`);
  }

  const { star, reliable, flaky, slow, fraudTarget } = await pickScenarioWorkers();
  const missing = Object.entries({ star, reliable, flaky, slow, fraudTarget }).filter(([, w]) => !w);
  if (missing.length > 0) {
    console.log(
      `  skipping scenario(s) with no matching worker in the DB: ${missing.map(([k]) => k).join(", ")} ` +
        `(run "npm run db:seed" first if this is a fresh database)`
    );
  }

  const customers = await makeCustomers(10);
  const pick = (i: number) => customers[i % customers.length].id;
  const touchedWorkerIds = new Set<string>();
  let bookingCount = 0;
  let reviewCount = 0;

  // --- Star performer: fast, reliable, glowing (real) reviews ------
  if (star) {
    const comments = [
      "Fixed our kitchen tap in under 20 minutes, cleaned up after and even checked the other taps for free. Excellent.",
      "On time, explained exactly what was wrong with the wiring, fair price. Would book again without hesitation.",
      "Very professional and punctual. The AC has never run this quiet. Highly recommend.",
      "Great work on the bathroom tiling — neat finish, no mess left behind. Worth every taka.",
      "Called ahead to confirm the time, arrived early, solved the breaker issue in one visit.",
      "Best technician we've used on HireLocal so far. Courteous and clearly skilled.",
    ];
    for (let i = 0; i < comments.length; i++) {
      await makeBooking({
        customerId: pick(i),
        workerId: star.id,
        status: "COMPLETED",
        requestedHoursAgo: 40 * (i + 1),
        responseDelayHours: 0.1 + rand() * 0.2, // minutes, not hours
        completedHoursAgo: 40 * (i + 1) - 2,
        review: { rating: 5, comment: comments[i] },
      });
      bookingCount++;
      reviewCount++;
    }
    touchedWorkerIds.add(star.id);
    console.log(`  star performer: ${star.user.name} (${comments.length} completed jobs, 5-star reviews)`);
  }

  // --- Reliable newcomer: fewer jobs, still solid ------------------
  if (reliable) {
    const comments = [
      "Did a solid job replacing the socket, no complaints.",
      "Good, straightforward work — arrived a little late but called ahead about it.",
      "Handled the leak well. Would use again.",
    ];
    for (let i = 0; i < comments.length; i++) {
      await makeBooking({
        customerId: pick(i + 2),
        workerId: reliable.id,
        status: "COMPLETED",
        requestedHoursAgo: 60 * (i + 1),
        responseDelayHours: 1 + rand() * 2,
        completedHoursAgo: 60 * (i + 1) - 3,
        review: { rating: 4, comment: comments[i] },
      });
      bookingCount++;
      reviewCount++;
    }
    touchedWorkerIds.add(reliable.id);
    console.log(`  reliable newcomer: ${reliable.user.name} (${comments.length} completed jobs, 4-star reviews)`);
  }

  // --- Flaky: accepted several, only finished a couple -------------
  if (flaky) {
    const outcomes: { status: BookingStatus; review: { rating: number; comment: string } | null }[] = [
      { status: "COMPLETED", review: { rating: 3, comment: "Got the job done eventually, a bit disorganized." } },
      { status: "COMPLETED", review: { rating: 2, comment: "Late and had to be reminded about the details discussed on booking." } },
      { status: "CANCELLED", review: null },
      { status: "CANCELLED", review: null },
      { status: "CANCELLED", review: null },
    ];
    for (let i = 0; i < outcomes.length; i++) {
      const o = outcomes[i];
      await makeBooking({
        customerId: pick(i + 4),
        workerId: flaky.id,
        status: o.status,
        requestedHoursAgo: 50 * (i + 1),
        responseDelayHours: 3 + rand() * 4,
        completedHoursAgo: o.status === "COMPLETED" ? 50 * (i + 1) - 4 : null,
        review: o.review,
      });
      bookingCount++;
      if (o.review) reviewCount++;
    }
    touchedWorkerIds.add(flaky.id);
    console.log(`  flaky: ${flaky.user.name} (2 completed of 5 accepted — low completion reliability)`);
  }

  // --- Slow responder: takes many hours to answer a request --------
  if (slow) {
    const comments = [
      "Good work once he got started, but took almost a day to confirm the booking.",
      "Quality was fine but I nearly booked someone else waiting for a response.",
      "Took a long time to accept the request — worth the wait, but barely.",
      "Job itself was done well. Wish he answered booking requests faster.",
    ];
    for (let i = 0; i < comments.length; i++) {
      await makeBooking({
        customerId: pick(i + 1),
        workerId: slow.id,
        status: "COMPLETED",
        requestedHoursAgo: 70 * (i + 1),
        responseDelayHours: 10 + rand() * 14, // 10-24h to respond
        completedHoursAgo: 70 * (i + 1) - 6,
        review: { rating: 4, comment: comments[i] },
      });
      bookingCount++;
      reviewCount++;
    }
    touchedWorkerIds.add(slow.id);
    console.log(`  slow responder: ${slow.user.name} (10-24h average response time)`);
  }

  // --- Fraud target: a couple of genuine reviews, a few designed to
  // trip the detector (short/generic, rating-vs-text mismatch,
  // exclamation spam, and a copy-pasted duplicate) --------------------
  if (fraudTarget) {
    const reviews: { rating: number; comment: string }[] = [
      { rating: 4, comment: "Replaced the switchboard without any issues, reasonably priced." },
      { rating: 5, comment: "good" },
      { rating: 5, comment: "This was a terrible and unprofessional experience, would never book again." },
      { rating: 5, comment: "Amazing!!!! Best worker ever!!!! Book now!!!!" },
      { rating: 5, comment: "Excellent service, very professional and highly recommended for anyone in Dhaka." },
      { rating: 5, comment: "Excellent service, very professional and highly recommended for anyone in Dhaka." },
    ];
    for (let i = 0; i < reviews.length; i++) {
      await makeBooking({
        customerId: pick(i + 6),
        workerId: fraudTarget.id,
        status: "COMPLETED",
        requestedHoursAgo: 30 * (i + 1),
        responseDelayHours: 1 + rand() * 3,
        completedHoursAgo: 30 * (i + 1) - 2,
        review: reviews[i],
      });
      bookingCount++;
      reviewCount++;
    }
    touchedWorkerIds.add(fraudTarget.id);
    console.log(`  fraud target: ${fraudTarget.user.name} (${reviews.length} reviews, several designed to trip the detector)`);
  }

  console.log(`  created ${bookingCount} bookings and ${reviewCount} reviews`);

  for (const workerId of touchedWorkerIds) {
    await recomputeTrustScore(workerId);
  }

  // --- Backfill: every worker in the DB gets a trustScore -----------
  // prisma/seed.ts's 101 workers all pre-date this feature and have
  // trustScore: null. Safe to re-run — same recompute every real
  // trigger already calls.
  const allWorkers = await prisma.worker.findMany({ select: { id: true } });
  let backfilled = 0;
  for (const w of allWorkers) {
    if (touchedWorkerIds.has(w.id)) continue; // already just recomputed above
    await recomputeTrustScore(w.id);
    backfilled++;
  }
  console.log(`  backfilled trustScore for ${backfilled} other worker(s) (${allWorkers.length} total in DB)`);

  console.log("Done. Search results and worker profiles now show a trust badge; /admin/reviews has the fraud queue.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
