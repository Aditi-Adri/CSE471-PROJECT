import type { SubscriptionTier } from "@/app/generated/prisma/client";

/**
 * MODULE 3 -> Worker Subscription & Working Radius (new feature).
 *
 * A plain, static list instead of a database table — the PDF's "Dynamic
 * Multi-Tier Subscription Plan Selector" mentions a `SubscriptionTiers`
 * table, but four fixed plans that basically never change don't need
 * one. This is the single source of truth for prices/benefits/radius:
 * every page (dashboard widget, subscription page, checkout API) reads
 * from here instead of re-typing the same numbers in multiple places.
 *
 * `radiusKm` is what actually gets stored on `Worker.serviceRadiusKm`
 * and drawn as the map circle on the subscription page.
 */
export type SubscriptionPlan = {
  tier: SubscriptionTier;
  name: string;
  radiusKm: number;
  /** 0 = free. */
  priceBdt: number;
  /** How many days one purchase of this plan lasts. */
  durationDays: number;
  tagline: string;
  benefits: string[];
  /** Shown with a highlighted border on the subscription page. */
  isPopular?: boolean;
};

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    tier: "BASIC",
    name: "Basic",
    radiusKm: 1,
    priceBdt: 0,
    durationDays: 0, // Free forever — never expires, so a duration doesn't apply.
    tagline: "The default plan every worker starts on.",
    benefits: [
      "Visible to customers within a 1km radius",
      "Full access to bookings, verification & the spare parts shop",
      "No cost, no expiry",
    ],
  },
  {
    tier: "STARTER",
    name: "Starter",
    radiusKm: 2,
    priceBdt: 99,
    durationDays: 30,
    tagline: "Just a little more reach than Basic, for not much money.",
    benefits: [
      "Doubles your visible radius to 2km",
      "A cheap first step up before Standard",
      "Active for 30 days per purchase",
    ],
  },
  {
    tier: "STANDARD",
    name: "Standard",
    radiusKm: 5,
    priceBdt: 299,
    durationDays: 30,
    tagline: "For workers ready to cover more neighborhoods.",
    benefits: [
      "Wider client reach — visible up to 5km away",
      "More leads from nearby areas your Basic radius misses",
      "Active for 30 days per purchase",
    ],
  },
  {
    tier: "PREMIUM",
    name: "Premium",
    radiusKm: 15,
    priceBdt: 799,
    durationDays: 30,
    tagline: "Our most popular plan for serious, full-time workers.",
    benefits: [
      "Much wider client reach — visible up to 15km away",
      "Priority placement in customer search results",
      "Noticeably more lead opportunities than Standard",
      "Active for 30 days per purchase",
    ],
    isPopular: true,
  },
  // Kept to exactly 4 plans (including Basic) by request — Premium is
  // the top tier. The `UNLIMITED` enum value still exists in the
  // database (removing a Postgres enum value safely is its own risky
  // migration, not worth it for a plan nobody's bought yet) — it's
  // just not sold here anymore. See getPlan() below.
];

/** One-time 30-day free trial of Premium — a worker can claim this exactly once (see Worker.subscriptionTrialUsed). */
export const TRIAL_PLAN = {
  tier: "PREMIUM" as SubscriptionTier,
  name: "30-Day Premium Trial",
  radiusKm: 15,
  priceBdt: 0,
  durationDays: 30,
};

export function getPlan(tier: SubscriptionTier): SubscriptionPlan {
  const plan = SUBSCRIPTION_PLANS.find((p) => p.tier === tier);
  if (plan) return plan;
  // Defensive fallback only — every tier a worker can actually be on
  // has a row above. This only matters for a tier the catalog no
  // longer sells (like the old `UNLIMITED` plan, still a valid enum
  // value in the database but removed from sale here): treat it as
  // Basic rather than crashing the page.
  console.error(`No plan configured for tier "${tier}" — falling back to Basic.`);
  return SUBSCRIPTION_PLANS[0];
}

/** "9999" reads as a bug on screen — show "City-wide" instead for the Unlimited plan. */
export function formatRadiusKm(radiusKm: number): string {
  return radiusKm >= 9999 ? "City-wide" : `${radiusKm}km`;
}

/**
 * Days left until `expiresAt`, rounded up so "expires later today" still
 * reads as "1 day left" instead of "0 days left". Matches the exact
 * formula the feature spec asked for.
 */
export function daysRemaining(expiresAt: Date): number {
  const msLeft = expiresAt.getTime() - Date.now();
  return Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
}
