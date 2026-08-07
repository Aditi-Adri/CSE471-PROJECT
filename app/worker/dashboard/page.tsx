"use client";

import { useState } from "react";
import WorkerLocationSender from "@/components/tracking/WorkerLocationSender";
import WorkerSOSAlerts from "@/components/tracking/WorkerSOSAlerts";

// Page: /worker/dashboard - matches the seeded demo worker so the SOS
// alert -> accept flow can be tested against /sos/[sosId] in another tab.
const DEMO_WORKERS = [
  { workerId: "worker-faisal", label: "Faisal A. (Plumber)" },
  { workerId: "worker-nadia", label: "Nadia S. (AC Technician)" },
  { workerId: "worker-imran", label: "Imran H. (Electrician)" },
  { workerId: "worker-rahim", label: "Rahim K. (Electrician, en route)" },
] as const;

const DEMO_DESTINATION = { lat: 23.7808, lng: 90.4194 };

export default function WorkerDashboard() {
  const [workerId, setWorkerId] = useState<string>(DEMO_WORKERS[0].workerId);
  const activeBookingId = "booking-demo-id";

  return (
    <div style={{ maxWidth: 480, margin: "40px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: 20 }}>Worker Dashboard</h1>

      <label style={{ display: "block", fontSize: 13, marginBottom: 16 }}>
        Acting as:{" "}
        <select value={workerId} onChange={(e) => setWorkerId(e.target.value)}>
          {DEMO_WORKERS.map((w) => (
            <option key={w.workerId} value={w.workerId}>
              {w.label}
            </option>
          ))}
        </select>
      </label>

      {/* Always mounted while online: listens for SOS jobs within 3km */}
      <WorkerSOSAlerts workerId={workerId} />

      {/* Mount only while a booking is IN_TRANSIT (Rahim, in this demo) */}
      {workerId === "worker-rahim" && (
        <>
          <WorkerLocationSender
            bookingId={activeBookingId}
            destination={DEMO_DESTINATION}
          />
          <p style={{ fontSize: 13, color: "#6b7280" }}>
            Streaming live location to booking {activeBookingId}... open /track/{activeBookingId} in
            another tab to watch it update.
          </p>
        </>
      )}
    </div>
  );
}