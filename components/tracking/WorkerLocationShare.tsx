"use client";

import { useEffect, useRef, useState } from "react";
import { useSocket } from "@/lib/hooks/useSocket";

/**
 * MODULE 1 -> FEATURE 3 (Jishan): the worker's half of live tracking.
 * `navigator.geolocation.watchPosition` is the free, no-key browser API
 * that produces real GPS fixes — each one is pushed straight over the
 * existing socket connection as `location:update`, which server.ts
 * turns into an ETA + broadcasts to the customer's map
 * (components/tracking/LiveTrackingMap.tsx).
 */
export function WorkerLocationShare({ bookingId }: { bookingId: string }) {
  const socket = useSocket();
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  function start() {
    setError(null);
    if (!("geolocation" in navigator)) {
      setError("Your browser doesn't support location sharing.");
      return;
    }
    if (!socket) {
      setError("Still connecting — try again in a moment.");
      return;
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        socket.emit("location:update", {
          bookingId,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => setError("Location access was denied — enable it in your browser to share your route."),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    setIsSharing(true);
  }

  function stop() {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsSharing(false);
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={isSharing ? stop : start}
        className={
          isSharing
            ? "inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
            : "inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        }
      >
        {isSharing && <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />}
        {isSharing ? "Sharing your live location" : "Share my live location"}
      </button>
      {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
    </div>
  );
}
