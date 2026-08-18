"use client";

import { useState } from "react";

/**
 * Star/unstar a worker (Module 4, Adri). Only shown to signed-in
 * customers - see app/workers/[id]/page.tsx for the check.
 */
export function FavoriteButton({ workerId, initialFavorited }: { workerId: string; initialFavorited: boolean }) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/favorites/${workerId}`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setFavorited(data.favorited);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className="inline-flex items-center gap-1 rounded-full border border-zinc-200 px-3 py-1.5 text-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
    >
      <span aria-hidden="true">{favorited ? "⭐" : "☆"}</span>
      {favorited ? "Saved" : "Save"}
    </button>
  );
}
