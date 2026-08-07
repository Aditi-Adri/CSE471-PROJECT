"use client";

import { useEffect, useRef } from "react";
import { useSocket } from "@/lib/hooks/useSocket";
import type { LatLng } from "@/lib/types/tracking";

export default function WorkerLocationSender({
  bookingId,
  destination,
  initialLocation,
}: {
  bookingId: string;
  destination: LatLng;
  initialLocation?: LatLng | null;
}) {
  const socket = useSocket();

  const locRef = useRef<{ lat: number | undefined; lng: number | undefined }>({
    lat: initialLocation?.lat,
    lng: initialLocation?.lng,
  });

  useEffect(() => {
    if (!socket || !bookingId || !destination) return;

    // Start location (~1.5 km away if no initial location)
    if (!locRef.current.lat || !locRef.current.lng) {
      locRef.current = {
        lat: destination.lat - 0.015,
        lng: destination.lng - 0.015,
      };
    }

    const interval = setInterval(() => {
      const { lat: currentLat, lng: currentLng } = locRef.current as { lat: number; lng: number };
      let lat = currentLat;
      let lng = currentLng;

      const latDiff = destination.lat - lat;
      const lngDiff = destination.lng - lng;
      const distance = Math.hypot(latDiff, lngDiff);

      // ⚡ If within ~100m, snap directly to exact destination & stop interval
      if (distance < 0.001) {
        locRef.current = { lat: destination.lat, lng: destination.lng };

        socket.emit("location:update", {
          bookingId,
          lat: destination.lat,
          lng: destination.lng,
        });

        clearInterval(interval);
        return;
      }

      // ⚡ Move linearly at a constant speed towards destination
      const stepSize = 0.0012; // Steady speed
      const ratio = Math.min(1, stepSize / distance);

      lat += latDiff * ratio;
      lng += lngDiff * ratio;

      locRef.current = { lat, lng };

      socket.emit("location:update", {
        bookingId,
        lat,
        lng,
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [socket, bookingId, destination]);

  return null;
}