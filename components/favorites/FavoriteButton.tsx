"use client";

import { useState } from "react";

// The star button on a worker's profile. Customer clicks it to save
// or remove that worker from their favorites list.
export function FavoriteButton({ workerId, initialFavorited }: { workerId: string; initialFavorited: boolean }) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);

    try {
      const response = await fetch(`/api/favorites/${workerId}`, { method: "POST" });
      if (response.ok) {
        const data = await response.json();
        setFavorited(data.favorited);
      }
    } catch {
      // Network error — just leave the button as it was, worth trying again.
    }

    setLoading(false);
  }

  let label = "Save";
  let icon = "☆";
  if (favorited) {
    label = "Saved";
    icon = "⭐";
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className="inline-flex items-center gap-1 rounded-full border border-zinc-200 px-3 py-1.5 text-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
    >
      <span aria-hidden="true">{icon}</span>
      {label}
    </button>
  );
}
