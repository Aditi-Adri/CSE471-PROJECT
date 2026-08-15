"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/lib/hooks/useSocket";
import { cardClasses, errorBannerClasses, secondaryButtonClasses } from "@/lib/ui/formStyles";

type Phase =
  | { kind: "idle" }
  | { kind: "locating" }
  | { kind: "dispatching" }
  | { kind: "waiting"; sosId: string; alertedWorkerCount: number }
  | { kind: "no-match" }
  | { kind: "error"; message: string };

/**
 * MODULE 1 -> FEATURE 3 (Jishan): the customer's emergency button.
 * Coordinates come from the browser's Geolocation API (free, no key) —
 * one-shot `getCurrentPosition`, not a continuous watch, since this
 * only needs "where you are right now". The actual 3km match against
 * real online technicians happens server-side (app/api/sos/route.ts).
 */
export function SosTrigger() {
  const router = useRouter();
  const socket = useSocket();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  // Socket push is the fast path; polling is the fallback in case the
  // "sos:accepted" broadcast is missed (dropped connection, etc.) — same
  // belt-and-suspenders approach BookingStatusView uses for its own polling.
  useEffect(() => {
    if (phase.kind !== "waiting") return;
    const { sosId } = phase;

    socket?.emit("sos:join", { sosId });
    const onAccepted = ({ bookingId }: { bookingId: string }) => {
      stopPolling();
      router.push(`/bookings/${bookingId}`);
    };
    socket?.on("sos:accepted", onAccepted);

    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/sos/${sosId}`);
      const data = await res.json().catch(() => null);
      if (data?.sos?.bookingId) {
        stopPolling();
        router.push(`/bookings/${data.sos.bookingId}`);
      }
    }, 5000);

    return () => {
      socket?.off("sos:accepted", onAccepted);
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase.kind, socket]);

  function trigger() {
    setPhase({ kind: "locating" });
    if (!("geolocation" in navigator)) {
      setPhase({ kind: "error", message: "Your browser doesn't support location — SOS needs it to find help near you." });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setPhase({ kind: "dispatching" });
        const res = await fetch("/api/sos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat: position.coords.latitude, lng: position.coords.longitude }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setPhase({ kind: "error", message: data?.error ?? "Couldn't send your SOS. Please try again." });
          return;
        }
        if (data.sos.alertedWorkerCount === 0) {
          setPhase({ kind: "no-match" });
          return;
        }
        setPhase({ kind: "waiting", sosId: data.sos.id, alertedWorkerCount: data.sos.alertedWorkerCount });
      },
      () => setPhase({ kind: "error", message: "Location access was denied — enable it in your browser and try again." }),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  return (
    <div className={cardClasses}>
      {phase.kind === "idle" && (
        <div className="flex flex-col items-center gap-4 text-center">
          <button
            type="button"
            onClick={trigger}
            className="flex h-40 w-40 items-center justify-center rounded-full bg-red-600 text-lg font-bold uppercase tracking-wide text-white shadow-lg shadow-red-600/30 transition hover:bg-red-700 active:scale-95"
          >
            Send SOS
          </button>
          <p className="max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
            Alerts every verified technician online within 3km of you right now — first to respond is routed
            straight to you, arrival code and all.
          </p>
          <p className="max-w-sm text-xs text-zinc-400 dark:text-zinc-500">
            For a life-threatening emergency, call your local emergency number first — this pages nearby
            technicians, not first responders.
          </p>
        </div>
      )}

      {(phase.kind === "locating" || phase.kind === "dispatching") && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-200 border-t-red-600 dark:border-zinc-800" />
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {phase.kind === "locating" ? "Finding your location…" : "Alerting nearby technicians…"}
          </p>
        </div>
      )}

      {phase.kind === "waiting" && (
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="relative flex h-32 w-32 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-40" />
            <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-red-600 text-2xl">
              🚨
            </span>
          </div>
          <div>
            <p className="font-semibold text-zinc-900 dark:text-zinc-50">
              Alerting {phase.alertedWorkerCount} nearby technician{phase.alertedWorkerCount === 1 ? "" : "s"}
            </p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              You&apos;ll be redirected the moment someone responds.
            </p>
          </div>
        </div>
      )}

      {phase.kind === "no-match" && (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <p className={errorBannerClasses}>
            No verified technicians are online within 3km right now. If this is urgent, call your local
            emergency number, or try a regular search instead.
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPhase({ kind: "idle" })} className={secondaryButtonClasses}>
              Try again
            </button>
            <button type="button" onClick={() => router.push("/search")} className={secondaryButtonClasses}>
              Search instead
            </button>
          </div>
        </div>
      )}

      {phase.kind === "error" && (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <p className={errorBannerClasses}>{phase.message}</p>
          <button type="button" onClick={() => setPhase({ kind: "idle" })} className={secondaryButtonClasses}>
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
