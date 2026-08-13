"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import AppHeader from "@/components/tracking/AppHeader";
import LiveTrackingMap from "@/components/tracking/LiveTrackingMap";
import WorkerLocationSender from "@/components/tracking/WorkerLocationSender";
import SOSButton from "@/components/tracking/SOSButton";
import type { TrackingApiResponse } from "@/lib/types/tracking";
import { trackingPageBackground } from "@/lib/ui/trackingTheme";

export default function TrackBookingPage() {
  const params = useParams<{ bookingId: string }>();
  const bookingId = params?.bookingId;

  const [booking, setBooking] = useState<TrackingApiResponse | null>(null);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);

  useEffect(() => {
    if (!bookingId) return;
    fetch(`/api/tracking/${bookingId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setBooking(data);
      });
  }, [bookingId]);

  if (!bookingId || !booking) return null;

  const destination = booking.destination || { lat: 23.7808, lng: 90.4194 };
  const worker = booking.worker;
  const initialWorkerLocation = worker ? { lat: worker.lat, lng: worker.lng } : null; // Get DB location
  const eta = etaMinutes ?? booking.etaMinutes;
  const smsSent = booking.tenMinuteAlertSent;

  return (
    <div style={{ ...trackingPageBackground, minHeight: "100vh" }}>
      {/* Centered AppHeader without rightSlot */}
      <AppHeader
        pillLabel="Live Tracking"
        pillDotColor="#3b82f6"
      />

      <main style={{ maxWidth: 460, margin: "8px auto 60px", padding: "0 16px" }}>
        <div
          style={{
            background: "var(--tracking-card-bg)",
            borderRadius: 18,
            overflow: "hidden",
            boxShadow: "0 10px 30px rgba(20,22,43,0.08)",
          }}
        >
          <LiveTrackingMap bookingId={bookingId} destination={destination} onEtaChange={setEtaMinutes} />

          {/* ⚡ Pass initialLocation so it resumes correctly on refresh */}
          <WorkerLocationSender
            bookingId={bookingId}
            destination={destination}
            initialLocation={initialWorkerLocation}
          />

          <div style={{ background: "var(--tracking-gray-panel)", padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "var(--tracking-purple-avatar)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 13,
                  flexShrink: 0,
                }}
              >
                {worker?.avatarInitials || "—"}
              </div>
              <div>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>
                  {worker?.name || "Assigning technician..."}
                </div>
                <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 12.5 }}>
                  {worker?.role || "Technician"} {worker ? `★${(worker.rating ?? 0).toFixed(1)} rating` : ""}
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 12,
                fontSize: 13,
                fontWeight: "500",
                color: eta === 0 ? "#4ade80" : "rgba(255,255,255,0.85)",
              }}
            >
              {smsSent && eta !== 0 ? "SMS Sent ✓ " : ""}

              {/* ⚡ Dynamic Arrived Text */}
              {eta === 0
                ? "📍 Worker has arrived at your location!"
                : eta != null
                ? `Worker arriving in ${eta} minutes.`
                : "Waiting for live location..."}
            </div>

            <div style={{ marginTop: 16 }}>
              <SOSButton
                customerId={booking?.customerId || "customer-demo-id"}
                customerPhone={booking?.customerPhone || "+8801408606698"}
                fallbackLocation={destination}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}