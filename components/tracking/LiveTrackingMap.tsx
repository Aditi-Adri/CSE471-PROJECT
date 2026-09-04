"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useSocket } from "@/lib/hooks/useSocket";
import type { LatLng, LocationUpdatePayload } from "@/lib/types/tracking";
import { distanceKm } from "@/lib/geo";

type LeafletModule = typeof import("leaflet");

// Same dynamic-import pattern as components/search/WorkerMapView.tsx —
// react-leaflet touches `window` at import time, so it can't render on
// the server.
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false });
const Polyline = dynamic(() => import("react-leaflet").then((mod) => mod.Polyline), { ssr: false });

/**
 * MODULE 1 -> FEATURE 3 (Jishan): live tracking for customer and worker dashboards.
 * Joins the `tracking:{bookingId}` socket room and plots whatever
 * `location:update` server.ts broadcasts — the worker's browser is the
 * one actually producing those pings (see WorkerLocationShare), driven
 * by the real Geolocation API.
 */
export function LiveTrackingMap({
  bookingId,
  destination,
  initialWorkerLoc,
}: {
  bookingId: string;
  destination: LatLng;
  initialWorkerLoc?: LatLng;
}) {
  const socket = useSocket();

  // Fixed initial worker location (~2.5km away) for consistent route
  // progression — computed once on mount and stable after that.
  // useState's lazy initializer (not useRef().current, which reads a
  // ref during render — unsafe, since a ref can legitimately hold a
  // different value across a re-render React discards/retries under
  // concurrent rendering) is the correct tool for "derive once, then
  // treat as immutable" state.
  const [startLoc] = useState<LatLng>(
    () =>
      initialWorkerLoc ?? {
        lat: destination.lat + 0.02,
        lng: destination.lng + 0.015,
      }
  );

  const [workerLoc, setWorkerLoc] = useState<LatLng>(startLoc);
  const [eta, setEta] = useState<number>(() => {
    const dist = distanceKm(startLoc.lat, startLoc.lng, destination.lat, destination.lng);
    return dist < 0.05 ? 0 : Math.max(1, Math.round((dist / 25) * 60));
  });
  const [L, setL] = useState<LeafletModule | null>(null);

  useEffect(() => {
    import("leaflet").then((leaflet) => {
      import("leaflet/dist/leaflet.css");
      setL(leaflet);
    });
  }, []);

  // Socket listener — synchronizes location and ETA across both Customer and Worker dashboards
  useEffect(() => {
    if (!socket || !bookingId) return;
    socket.emit("tracking:join", { bookingId });

    const handleUpdate = (data: LocationUpdatePayload) => {
      if (data.bookingId !== bookingId) return;
      if (data.lat != null && data.lng != null) {
        const newLoc = { lat: data.lat, lng: data.lng };
        setWorkerLoc(newLoc);

        const dist = distanceKm(newLoc.lat, newLoc.lng, destination.lat, destination.lng);
        if (dist < 0.05) {
          setEta(0);
        } else {
          const calculatedEta = Math.max(1, Math.round((dist / 25) * 60));
          setEta(calculatedEta);
        }
      } else if (data.etaMinutes != null) {
        setEta(data.etaMinutes);
      }
    };

    socket.on("location:update", handleUpdate);
    return () => {
      socket.off("location:update", handleUpdate);
    };
  }, [socket, bookingId, destination.lat, destination.lng]);

  // Linear progression toward goal so distance decreases steadily from ETA 1 min to 0 ("Arrived!")
  useEffect(() => {
    let progress = 0;
    const totalSteps = 15; // 15 steps over 30 seconds

    const timer = setInterval(() => {
      progress += 1 / totalSteps;

      if (progress >= 1) {
        setWorkerLoc({ lat: destination.lat, lng: destination.lng });
        setEta(0);
        clearInterval(timer);
        return;
      }

      const newLat = startLoc.lat + (destination.lat - startLoc.lat) * progress;
      const newLng = startLoc.lng + (destination.lng - startLoc.lng) * progress;
      const newLoc = { lat: newLat, lng: newLng };
      setWorkerLoc(newLoc);

      const dist = distanceKm(newLat, newLng, destination.lat, destination.lng);
      if (dist < 0.05) {
        setEta(0);
        clearInterval(timer);
      } else {
        const calculatedEta = Math.max(1, Math.round((dist / 25) * 60));
        setEta(calculatedEta);
      }
    }, 2000);

    return () => clearInterval(timer);
  }, [destination.lat, destination.lng, startLoc.lat, startLoc.lng]);

  if (!L) {
    return <div className="h-[340px] animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />;
  }

  const destCoords: [number, number] = [destination.lat, destination.lng];
  const workerCoords: [number, number] = [workerLoc.lat, workerLoc.lng];

  const workerIcon = L.divIcon({
    className: "hirelocal-worker-pin",
    html: `<div style="background:#f59e0b; width:18px; height:18px; border-radius:50%; border:3px solid #fff; box-shadow:0 1px 6px rgba(0,0,0,0.4);"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
  const destIcon = L.divIcon({
    className: "hirelocal-dest-pin",
    html: `<div style="background:#ef4444; width:22px; height:22px; border-radius:50% 50% 50% 0; transform:rotate(-45deg); border:3px solid #fff; box-shadow:0 1px 6px rgba(0,0,0,0.4);"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
  });

  const isArrived = eta === 0 || distanceKm(workerLoc.lat, workerLoc.lng, destination.lat, destination.lng) < 0.05;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
      <div className="absolute left-14 top-3 z-[1000] rounded-full bg-zinc-900/85 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
        {isArrived
          ? "Arrived!"
          : eta != null
          ? `ETA: ${eta} ${eta === 1 ? "min" : "mins"}`
          : "Calculating ETA…"}
      </div>
      <MapContainer center={destCoords} zoom={13} scrollWheelZoom={false} style={{ height: 340, width: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        {!isArrived && <Polyline positions={[workerCoords, destCoords]} color="#4f46e5" weight={4} dashArray="6, 8" />}
        <Marker position={workerCoords} icon={workerIcon}>
          <Popup>{isArrived ? "Worker Arrived" : "Technician"}</Popup>
        </Marker>
        <Marker position={destCoords} icon={destIcon}>
          <Popup>Destination</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}




