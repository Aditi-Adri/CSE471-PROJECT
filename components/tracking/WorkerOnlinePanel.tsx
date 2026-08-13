"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/lib/hooks/useSocket";
import { cardClasses, primaryButtonClasses } from "@/lib/ui/formStyles";

type SosAlert = { sosId: string; distanceKm: number | null; createdAt: string };

/**
 * MODULE 1 -> FEATURE 3 (Jishan): the "go online" toggle that makes a
 * worker eligible for the SOS proximity match in app/api/sos/route.ts,
 * plus the incoming-alert list it then receives. Going online:
 *   1. grabs one fix with getCurrentPosition and POSTs it with
 *      isOnline:true (so a customer's SOS a second later already sees
 *      a fresh location for this worker), then
 *   2. keeps watchPosition running, pushing every subsequent fix over
 *      the `worker:location` socket event (server.ts) rather than a
 *      REST call per tick.
 */
export function WorkerOnlinePanel({ workerId, initialIsOnline }: { workerId: string; initialIsOnline: boolean }) {
  const socket = useSocket();
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(initialIsOnline);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<SosAlert[]>([]);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!socket) return;
    socket.emit("worker:register", { workerId });

    const onNew = (payload: SosAlert) => {
      setAlerts((prev) => (prev.some((a) => a.sosId === payload.sosId) ? prev : [payload, ...prev]));
    };
    const onTaken = ({ sosId }: { sosId: string }) => {
      setAlerts((prev) => prev.filter((a) => a.sosId !== sosId));
    };

    socket.on("sos:new", onNew);
    socket.on("sos:taken", onTaken);
    return () => {
      socket.off("sos:new", onNew);
      socket.off("sos:taken", onTaken);
    };
  }, [socket, workerId]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  function goOnline() {
    setError(null);
    if (!("geolocation" in navigator)) {
      setError("Your browser doesn't support location sharing, so you can't go online for SOS.");
      return;
    }
    setIsBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        const res = await fetch("/api/worker/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isOnline: true, lat, lng }),
        });
        setIsBusy(false);
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setError(data?.error ?? "Couldn't go online.");
          return;
        }
        setIsOnline(true);
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            socket?.emit("worker:location", { workerId, lat: pos.coords.latitude, lng: pos.coords.longitude });
          },
          () => {},
          { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
        );
      },
      () => {
        setIsBusy(false);
        setError("Location access was denied — enable it in your browser to go online.");
      },
      { enableHighAccuracy: true }
    );
  }

  async function goOffline() {
    setIsBusy(true);
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    await fetch("/api/worker/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isOnline: false }),
    }).catch(() => {});
    setIsBusy(false);
    setIsOnline(false);
    setAlerts([]);
  }

  async function accept(sosId: string) {
    setAcceptingId(sosId);
    setError(null);
    const res = await fetch(`/api/sos/${sosId}/accept`, { method: "POST" });
    const data = await res.json().catch(() => null);
    setAcceptingId(null);
    if (!res.ok) {
      setError(data?.error ?? "Couldn't accept this request.");
      setAlerts((prev) => prev.filter((a) => a.sosId !== sosId));
      return;
    }
    router.push(`/bookings/${data.booking.id}`);
  }

  return (
    <div className={cardClasses}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className={`h-2.5 w-2.5 rounded-full ${isOnline ? "animate-pulse bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"}`} />
          <div>
            <p className="font-semibold text-zinc-900 dark:text-zinc-50">
              {isOnline ? "You're online" : "You're offline"}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {isOnline
                ? "Visible on the map and eligible for nearby emergency SOS alerts."
                : "Go online to be visible for nearby emergency SOS alerts."}
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={isBusy}
          onClick={isOnline ? goOffline : goOnline}
          className={
            isOnline
              ? "rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
              : primaryButtonClasses + " mt-0"
          }
        >
          {isBusy ? "Please wait…" : isOnline ? "Go offline" : "Go online"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {alerts.length > 0 && (
        <div className="mt-4 flex flex-col gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          {alerts.map((a) => (
            <div
              key={a.sosId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-red-300 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30"
            >
              <div>
                <p className="font-semibold text-red-700 dark:text-red-300">🚨 Emergency SOS nearby</p>
                <p className="text-xs text-red-600 dark:text-red-400">
                  {a.distanceKm != null ? `~${a.distanceKm} km away` : "Distance unknown"} ·{" "}
                  {new Date(a.createdAt).toLocaleTimeString()}
                </p>
              </div>
              <button
                type="button"
                disabled={acceptingId === a.sosId}
                onClick={() => accept(a.sosId)}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {acceptingId === a.sosId ? "Accepting…" : "Respond"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
