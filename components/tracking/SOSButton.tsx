"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LatLng } from "@/lib/types/tracking";

type SosStatus = "idle" | "dispatching" | "error";

export default function SOSButton({
  customerId,
  customerPhone,
  fallbackLocation,
}: {
  customerId: string;
  customerPhone?: string;
  fallbackLocation?: LatLng;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<SosStatus>("idle");

  const handleSOS = () => {
    if (status !== "idle") return;
    setStatus("dispatching");

    // Use fallback demo coordinates (Dhaka) for consistent test distance (< 3km)
    const lat = fallbackLocation?.lat ?? 23.7808;
    const lng = fallbackLocation?.lng ?? 90.4194;

    fetch("/api/tracking/sos/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId, customerPhone, lat, lng }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data.sosId) throw new Error("SOS trigger failed");
        router.push(`/sos/${data.sosId}`);
      })
      .catch(() => setStatus("error"));
  };

  const label =
    status === "dispatching" ? "Dispatching..." : status === "error" ? "Try SOS again" : "SOS";

  return (
    <button
      onClick={handleSOS}
      disabled={status === "dispatching"}
      style={{
        width: "100%",
        background: "var(--tracking-sos-red)",
        color: "white",
        fontWeight: 700,
        fontSize: 15,
        letterSpacing: 1,
        padding: "16px 0",
        borderRadius: 12,
        border: "none",
        cursor: status === "idle" || status === "error" ? "pointer" : "default",
        opacity: status === "dispatching" ? 0.85 : 1,
      }}
    >
      {label}
    </button>
  );
}