"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useSocket } from "@/lib/hooks/useSocket";
import type { LatLng, LocationUpdatePayload } from "@/lib/types/tracking";

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
 * MODULE 1 -> FEATURE 3 (Jishan): the customer's half of live tracking.
 * Joins the `tracking:{bookingId}` socket room and plots whatever
 * `location:update` server.ts broadcasts — the worker's browser is the
 * one actually producing those pings (see WorkerLocationShare), driven
 * by the real Geolocation API, not a simulation.
 */
export function LiveTrackingMap({ bookingId, destination }: { bookingId: string; destination: LatLng }) {
  const socket = useSocket();
  const [workerLoc, setWorkerLoc] = useState<LatLng | null>(null);
  const [eta, setEta] = useState<number | null>(null);
  const [L, setL] = useState<LeafletModule | null>(null);

  useEffect(() => {
    import("leaflet").then((leaflet) => {
      import("leaflet/dist/leaflet.css");
      setL(leaflet);
    });
  }, []);

  useEffect(() => {
    if (!socket || !bookingId) return;
    socket.emit("tracking:join", { bookingId });

    const handleUpdate = (data: LocationUpdatePayload) => {
      if (data.bookingId !== bookingId) return;
      if (data.lat != null && data.lng != null) setWorkerLoc({ lat: data.lat, lng: data.lng });
      if (data.etaMinutes != null) setEta(data.etaMinutes);
    };

    socket.on("location:update", handleUpdate);
    return () => {
      socket.off("location:update", handleUpdate);
    };
  }, [socket, bookingId]);

  if (!L) {
    return <div className="h-[340px] animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />;
  }

  const destCoords: [number, number] = [destination.lat, destination.lng];
  const workerCoords: [number, number] = workerLoc ? [workerLoc.lat, workerLoc.lng] : destCoords;

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

  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
      <div className="absolute left-3 top-3 z-[1000] rounded-full bg-zinc-900/85 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
        {eta === 0 ? "Arrived!" : eta != null ? `ETA: ${eta} min` : workerLoc ? "Calculating ETA…" : "Waiting for technician's location…"}
      </div>
      <MapContainer center={destCoords} zoom={13} scrollWheelZoom={false} style={{ height: 340, width: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        {workerLoc && <Polyline positions={[workerCoords, destCoords]} color="#4f46e5" weight={3} dashArray="6, 8" />}
        {workerLoc && (
          <Marker position={workerCoords} icon={workerIcon}>
            <Popup>Technician</Popup>
          </Marker>
        )}
        <Marker position={destCoords} icon={destIcon}>
          <Popup>Destination</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
