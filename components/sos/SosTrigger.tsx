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
  | { kind: "accepted"; bookingId: string; workerName: string; etaMinutes: number | null }
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
  const [availableCount, setAvailableCount] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/sos/available")
      .then((res) => res.json())
      .then((data) => {
        if (typeof data?.availableCount === "number") {
          setAvailableCount(data.availableCount);
        }
      })
      .catch(() => {});
  }, []);

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
    const onAccepted = ({
      bookingId,
      workerName,
      etaMinutes,
    }: {
      bookingId: string;
      workerName?: string;
      etaMinutes?: number | null;
    }) => {
      stopPolling();
      setPhase({
        kind: "accepted",
        bookingId,
        workerName: workerName ?? "A technician",
        etaMinutes: etaMinutes ?? null,
      });
    };
    socket?.on("sos:accepted", onAccepted);

    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/sos/${sosId}`);
      const data = await res.json().catch(() => null);
      if (data?.sos?.bookingId) {
        stopPolling();
        setPhase({
          kind: "accepted",
          bookingId: data.sos.bookingId,
          workerName: data.sos.workerName ?? "A technician",
          etaMinutes: data.sos.etaMinutes ?? null,
        });
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
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        const res = await fetch("/api/sos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat, lng }),
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

        // Emit the SOS trigger event over Socket.IO for real-time awareness
        socket?.emit("sos:trigger", {
          sosId: data.sos.id,
          customerId: data.sos.customerId,
          customerLocation: { lat, lng },
          timestamp: new Date().toISOString(),
        });

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
          {/* ── SOS Radar Visualizer ── */}
          <SosRadar workerCount={phase.alertedWorkerCount} />
          <div>
            <p className="font-semibold text-zinc-900 dark:text-zinc-50">
              Alerting {phase.alertedWorkerCount} nearby technician{phase.alertedWorkerCount === 1 ? "" : "s"}
            </p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              You&apos;ll see who responds below — hang tight.
            </p>
          </div>
        </div>
      )}

      {phase.kind === "accepted" && (
        <div className="flex flex-col items-center gap-5 py-6 text-center">
          {/* Worker avatar circle */}
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-3xl dark:bg-emerald-900/40">
              🛠️
            </div>
            {/* Green status badge */}
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-emerald-500 dark:border-zinc-900">
              <span className="h-2 w-2 rounded-full bg-white" />
            </span>
          </div>
          <div>
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{phase.workerName}</p>
            <p className="mt-0.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
              Accepted your emergency
            </p>
            {phase.etaMinutes != null && (
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {phase.etaMinutes <= 1 ? "Arriving now" : `${phase.etaMinutes} min away`}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => router.push(`/bookings/${phase.bookingId}`)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 active:scale-95"
          >
            <span>📍</span> Track Worker
          </button>
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

/* ─── SOS Radar Visualizer (green worker dots + center pin) ─── */

function SosRadar({ workerCount }: { workerCount: number }) {
  const totalWorkers = workerCount;

  // Build a list of synthetic worker positions for the radar display.
  // Privacy-preserving: only the *count* is available on the customer side —
  // no real worker IDs or positions are sent. Each dot is distributed using
  // trigonometric radial positioning around the center.
  const workers = Array.from({ length: totalWorkers }, (_, index) => {
    const angle = (index / totalWorkers) * 2 * Math.PI;
    const distanceRadius = 40 + (index % 3) * 25; // Radial ring offset
    const x = Math.cos(angle) * distanceRadius;
    const y = Math.sin(angle) * distanceRadius;
    return { id: index, x, y };
  });

  return (
    <div className="relative flex h-48 w-48 items-center justify-center">
      {/* Radar ring backgrounds */}
      <span className="absolute h-48 w-48 rounded-full border border-red-200/30 dark:border-red-800/30" />
      <span className="absolute h-32 w-32 rounded-full border border-red-200/20 dark:border-red-800/20" />
      <span className="absolute h-16 w-16 rounded-full border border-red-200/15 dark:border-red-800/15" />

      {/* Animated radar sweep */}
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-20" />

      {/* Customer center pin — distinct red pulsing dot */}
      <span className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 shadow-lg shadow-red-600/40">
        <span className="h-2.5 w-2.5 rounded-full bg-white" />
      </span>

      {/* Green worker dots — map over the FULL array, no .slice(1) */}
      {workers.map((worker) => (
        <span
          key={worker.id}
          className="absolute z-20 h-3 w-3 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/40 transition-all duration-700"
          style={{
            left: `calc(50% + ${worker.x}px - 6px)`,
            top: `calc(50% + ${worker.y}px - 6px)`,
          }}
          title={`Technician ${worker.id + 1}`}
        />
      ))}
    </div>
  );
}
