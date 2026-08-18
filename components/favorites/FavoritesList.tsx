"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/search/Avatar";
import { VerificationBadge } from "@/components/search/VerificationBadge";
import { RatingStars } from "@/components/search/RatingStars";
import type { VerificationTier } from "@/app/generated/prisma/client";

type FavoriteWorker = {
  id: string;
  headline: string;
  verificationTier: VerificationTier;
  ratingAvg: number;
  ratingCount: number;
  avatarSeed: string;
  user: { name: string };
};

/** The customer's saved workers - /dashboard/favorites (Module 4, Adri). */
export function FavoritesList() {
  const [workers, setWorkers] = useState<FavoriteWorker[] | null>(null);

  function refetch() {
    fetch("/api/favorites")
      .then((res) => res.json())
      .then((data: { workers: FavoriteWorker[] }) => setWorkers(data.workers ?? []))
      .catch(() => setWorkers([]));
  }

  useEffect(refetch, []);

  async function handleRemove(workerId: string) {
    await fetch(`/api/favorites/${workerId}`, { method: "POST" });
    refetch();
  }

  if (workers === null) {
    return <div className="h-32 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />;
  }

  if (workers.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        No saved workers yet — tap &quot;Save&quot; on a worker&apos;s profile to add one here.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {workers.map((w) => (
        <div
          key={w.id}
          className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <Avatar name={w.user.name} seed={w.avatarSeed} size={48} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">{w.user.name}</p>
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{w.headline}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <VerificationBadge tier={w.verificationTier} compact />
              <RatingStars ratingAvg={w.ratingAvg} ratingCount={w.ratingCount} />
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <Link
              href={`/workers/${w.id}`}
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-700"
            >
              View profile
            </Link>
            <button
              type="button"
              onClick={() => handleRemove(w.id)}
              className="text-xs text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400"
            >
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
