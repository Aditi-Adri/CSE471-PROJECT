"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useSocket } from "@/lib/hooks/useSocket";
import type { LatLng, LocationUpdatePayload } from "@/lib/types/tracking";

type LeafletModule = typeof import("leaflet");

// Dynamically import Leaflet components (disabling Server-Side Rendering)
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), {
  ssr: false,
});
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), {
  ssr: false,
});
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), {
  ssr: false,
});
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), {
  ssr: false,
});
const Polyline = dynamic(() => import("react-leaflet").then((mod) => mod.Polyline), {
  ssr: false,
});

export default function LiveTrackingMap({
  bookingId,
  destination,
  onEtaChange,
}: {
  bookingId: string;
  destination: LatLng;
  onEtaChange?: (etaMinutes: number | null) => void;
}) {
  const socket = useSocket();
  const [workerLoc, setWorkerLoc] = useState<LatLng | null>(null);
  const [eta, setEta] = useState<number | null>(null);
  const [L, setL] = useState<LeafletModule | null>(null);

  // Load Leaflet JS & CSS styles dynamically on client side
  useEffect(() => {
    import("leaflet").then((leaflet) => {
      // Import Leaflet default CSS styles
      import("leaflet/dist/leaflet.css");
      setL(leaflet);
    });
  }, []);

  // Socket listener for real-time location updates
  useEffect(() => {
    if (!socket || !bookingId) return;

    socket.emit("tracking:join", { bookingId });

    const handleUpdate = (data: LocationUpdatePayload) => {
      if (data.bookingId === bookingId) {
        if (data.lat && data.lng) {
          setWorkerLoc({ lat: data.lat, lng: data.lng });
        }
        if (data.etaMinutes != null) {
          setEta(data.etaMinutes);
          onEtaChange?.(data.etaMinutes);
        }
      }
    };

    socket.on("location:update", handleUpdate);
    return () => {
      socket.off("location:update", handleUpdate);
    };
  }, [socket, bookingId, onEtaChange]);

  const destCoords: [number, number] = [destination?.lat || 23.7808, destination?.lng || 90.4194];
  const workerCoords: [number, number] = workerLoc ? [workerLoc.lat, workerLoc.lng] : destCoords;

  if (!L) {
    return (
      <div
        style={{
          height: 320,
          background: "#111827",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
        }}
      >
        Loading Real Map...
      </div>
    );
  }

  // Custom Icon for Worker (Orange Circle)
  const workerIcon = L.divIcon({
    className: "custom-worker-icon",
    html: `<div style="background:#f59e0b; width:20px; height:20px; border-radius:50%; border:3px solid #fff; box-shadow:0 0 10px rgba(0,0,0,0.5);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

  // Custom Icon for Customer Destination (Red Pin)
  const destIcon = L.divIcon({
    className: "custom-dest-icon",
    html: `<div style="background:#ef4444; width:24px; height:24px; border-radius:50%; border:3px solid #fff; box-shadow:0 0 10px rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; color:#fff; font-size:10px; font-weight:bold;">📍</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  return (
    <div style={{ height: 340, width: "100%", position: "relative" }}>
      {/* Floating ETA Badge Overlay */}
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 1000,
          background: "rgba(17, 24, 39, 0.85)",
          color: "#fff",
          padding: "6px 14px",
          borderRadius: 20,
          fontSize: 13,
          fontWeight: 600,
          backdropFilter: "blur(4px)",
        }}
      >
        ⏱️ ETA: {eta === 0 ? "Arrived!" : eta != null ? `${eta} min` : "Calculating..."}
      </div>

      {/* Real Interactive Map Container */}
      <MapContainer
        center={destCoords}
        zoom={14}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%", borderRadius: "18px 18px 0 0" }}
      >
        {/* Dark Mode Map Tiles from CartoDB / OpenStreetMap */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {/* Dynamic Route Line connecting Worker to Customer */}
        {workerLoc && (
          <Polyline positions={[workerCoords, destCoords]} color="#3b82f6" weight={4} dashArray="8, 8" />
        )}

        {/* Worker Moving Marker */}
        {workerLoc && (
          <Marker position={workerCoords} icon={workerIcon}>
            <Popup>Technician Location</Popup>
          </Marker>
        )}

        {/* Customer Destination Marker */}
        <Marker position={destCoords} icon={destIcon}>
          <Popup>Your Location</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}