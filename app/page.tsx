import Link from "next/link";
import { prisma } from "@/lib/db";
import { HeroSearchForm } from "@/components/marketing/HeroSearchForm";
import { VerificationBadge } from "@/components/search/VerificationBadge";
import {
  ClipboardCheckIcon,
  GridIcon,
  IdCardIcon,
  MapPinIcon,
  MessageIcon,
  RadarIcon,
  ShieldCheckIcon,
  SirenIcon,
  SparkleIcon,
  StarIcon,
  WrenchIcon,
} from "@/components/marketing/icons";

// The stat row (worker count, rating, ...) reads straight from the
// database. Without this, Next would statically freeze those numbers at
// build time; revalidating regularly keeps them honest as real data
// changes without hitting the DB on every single request.
export const revalidate = 60;

async function getHomeData() {
  const [workerCount, categoryCount, areaRows, ratingAgg, categories] = await Promise.all([
    prisma.worker.count(),
    prisma.serviceCategory.count(),
    prisma.worker.findMany({ distinct: ["area"], select: { area: true } }),
    prisma.worker.aggregate({ _avg: { ratingAvg: true }, where: { ratingCount: { gt: 0 } } }),
    prisma.serviceCategory.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, icon: true, description: true },
    }),
  ]);

  return {
    workerCount,
    categoryCount,
    areaCount: areaRows.length,
    avgRating: ratingAgg._avg.ratingAvg ?? 0,
    categories,
  };
}

export default async function Home() {
  const { workerCount, categoryCount, areaCount, avgRating, categories } = await getHomeData();

  const stats = [
    { icon: WrenchIcon, value: `${workerCount}+`, label: "Verified technicians" },
    { icon: GridIcon, value: `${categoryCount}`, label: "Service categories" },
    { icon: MapPinIcon, value: `${areaCount}`, label: "Dhaka neighborhoods" },
    { icon: StarIcon, value: avgRating > 0 ? avgRating.toFixed(1) : "—", label: "Average rating" },
  ];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white dark:from-brand-950 dark:via-zinc-950 dark:to-zinc-950">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 right-[-10%] h-96 w-96 rounded-full bg-brand-200/40 blur-3xl dark:bg-brand-800/20"
        />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center px-4 py-20 text-center sm:px-6 sm:py-28 lg:px-8">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/70 px-3 py-1 text-xs font-medium text-brand-700 dark:border-brand-800 dark:bg-zinc-900/70 dark:text-brand-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Now matching customers in Dhaka
          </span>

          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-50">
            Home repairs, without the guesswork
          </h1>
          <p className="mt-4 max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
            Describe the problem in your own words. We match you instantly with a
            verified, background-checked technician near you — fair pricing, no
            middleman.
          </p>

          <div className="mt-8 w-full max-w-xl">
            <HeroSearchForm />
          </div>
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-500">
            No account needed to search · Try “AC is making noise” or “gas stove not lighting”
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-6 px-4 py-10 sm:px-6 md:grid-cols-4 lg:px-8">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-2 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
                <stat.icon className="h-5 w-5" />
              </span>
              <span className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                {stat.value}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
            How it works
          </h2>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Three steps between “this is broken” and a verified pro at your door.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
          <HowItWorksStep
            icon={MessageIcon}
            step="1"
            title="Describe the problem"
            body='Type it in plain text — "water tap is leaking in kitchen" works just as well as a category name.'
          />
          <HowItWorksStep
            icon={SparkleIcon}
            step="2"
            title="We match instantly"
            body="Your description is mapped to the right service category and ranked by verification tier, rating and distance."
          />
          <HowItWorksStep
            icon={ShieldCheckIcon}
            step="3"
            title="Hire with confidence"
            body="Filter by verification tier, budget and availability — then book the technician that fits, on your terms."
          />
        </div>
      </section>

      {/* Categories */}
      <section id="categories" className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
              Browse by category
            </h2>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              Or skip straight to what you need.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/search?categoryId=${category.id}`}
                className="group flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-brand-700"
              >
                <span className="text-2xl">{category.icon}</span>
                <span className="text-sm font-medium text-zinc-900 group-hover:text-brand-700 dark:text-zinc-100 dark:group-hover:text-brand-400">
                  {category.name}
                </span>
                <span className="line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
                  {category.description}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & safety */}
      <section id="trust" className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
            Verification you can actually check
          </h2>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Every technician climbs a three-tier trust ladder before they show up at
            your door — and you can filter search results by the tier you require.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          <TrustTier
            icon={IdCardIcon}
            badge={<VerificationBadge tier="TIER1_ID_VERIFIED" />}
            body="Government NID cross-checked against a live photo before a technician can list a single service."
          />
          <TrustTier
            icon={ClipboardCheckIcon}
            badge={<VerificationBadge tier="TIER2_SKILL_TESTED" />}
            body="A practical skills assessment, evaluated by platform coordinators — not just a self-reported claim."
          />
          <TrustTier
            icon={ShieldCheckIcon}
            badge={<VerificationBadge tier="TIER3_POLICE_CLEARED" />}
            body="Official police clearance and prior customer references, for jobs that need the highest level of trust."
          />
        </div>
      </section>

      {/* Live tracking & SOS */}
      <section id="safety" className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
              Protected while the job happens
            </h2>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              Verification is who you&apos;re letting in. This is what keeps you covered
              once they&apos;re on the way.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
            <SafetyFeature
              icon={RadarIcon}
              title="Live GPS tracking"
              body="Watch your technician's route and ETA update in real time from the moment they're on the way — no guessing when they'll show up."
            />
            <SafetyFeature
              icon={SirenIcon}
              title="One-tap emergency SOS"
              body="A single button pages every available verified technician within 3km for urgent household emergencies — first to respond gets routed straight to you."
            />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-brand-600">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-5 px-4 py-16 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">
            Something broken right now?
          </h2>
          <p className="max-w-md text-brand-100">
            Describe it and see verified technicians near you in seconds.
          </p>
          <Link
            href="/search"
            className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
          >
            Find a technician →
          </Link>
        </div>
      </section>
    </>
  );
}

function HowItWorksStep({
  icon: Icon,
  step,
  title,
  body,
}: {
  icon: typeof MessageIcon;
  step: string;
  title: string;
  body: string;
}) {
  return (
    <div className="relative flex flex-col items-start gap-3 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <span className="absolute right-5 top-5 text-3xl font-bold text-zinc-100 dark:text-zinc-800">
        {step}
      </span>
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{body}</p>
    </div>
  );
}

function SafetyFeature({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof RadarIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{body}</p>
      </div>
    </div>
  );
}

function TrustTier({
  icon: Icon,
  badge,
  body,
}: {
  icon: typeof IdCardIcon;
  badge: React.ReactNode;
  body: string;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
        <Icon className="h-5 w-5" />
      </span>
      {badge}
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{body}</p>
    </div>
  );
}
