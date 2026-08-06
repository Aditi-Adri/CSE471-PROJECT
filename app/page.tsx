import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 text-center dark:bg-black">
      <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        HireLocal
      </h1>
      <p className="mt-3 max-w-md text-zinc-600 dark:text-zinc-400">
        A verified, accountable local service platform. This build showcases Smart Search &amp;
        AI Category Mapping — describe your problem in plain text and get matched to the right
        verified technician.
      </p>
      <Link
        href="/search"
        className="mt-8 inline-flex items-center justify-center rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        Find a technician →
      </Link>
    </div>
  );
}
