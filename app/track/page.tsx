"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
// Remove: import AppHeader from "@/components/tracking/AppHeader";

type DemoWorker = {
  workerId: string;
  name: string;
  role: string;
  rating: number;
};

export default function TrackDemoHome() {
  const router = useRouter();
  const [workers, setWorkers] = useState<DemoWorker[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingWorkers, setFetchingWorkers] = useState(true);

  useEffect(() => {
    fetch("/api/tracking/workers")
      .then((res) => res.json())
      .then((data: DemoWorker[]) => {
        if (Array.isArray(data)) {
          setWorkers(data);
          if (data.length > 0) setSelectedWorkerId(data[0].workerId);
        }
      })
      .catch((err) => console.error("Error fetching workers:", err))
      .finally(() => setFetchingWorkers(false));
  }, []);

  const handleStartTracking = async () => {
    if (!selectedWorkerId) return;
    setLoading(true);

    try {
      const res = await fetch("/api/tracking/booking/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workerId: selectedWorkerId }),
      });

      const data = await res.json();

      if (res.ok && data.bookingId) {
        router.push(`/track/${data.bookingId}`);
      } else {
        alert(data.error || "Failed to assign worker.");
      }
    } catch (err) {
      console.error("Assignment error:", err);
      alert("Network error. Please check your console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "transparent", paddingTop: "40px" }}>
      {/* AppHeader removed from here */}

      <main style={{ maxWidth: 440, margin: "0 auto", padding: "0 16px" }}>
        <div
          style={{
            background: "rgba(20, 22, 43, 0.85)",
            backdropFilter: "blur(12px)",
            borderRadius: 16,
            padding: "28px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.37)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px", color: "#f4f4f5" }}>
            Select a Technician
          </h2>
          <p style={{ fontSize: 13, color: "#a1a1aa", margin: "0 0 24px", lineHeight: 1.5 }}>
            Choose an available worker below to assign to your booking and start live GPS tracking.
          </p>

          <div style={{ marginBottom: 24 }}>
            <label
              style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#d4d4d8", marginBottom: 8 }}
            >
              Available Worker
            </label>

            <select
              value={selectedWorkerId}
              onChange={(e) => setSelectedWorkerId(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 10,
                background: "#1c1e38",
                color: "#f4f4f5",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                fontSize: 14,
                outline: "none",
                cursor: "pointer",
              }}
            >
              {workers.length > 0 ? (
                workers.map((w) => (
                  <option key={w.workerId} value={w.workerId} style={{ background: "#1c1e38", color: "#f4f4f5" }}>
                    {w.name} ({w.role}) — ★{w.rating}
                  </option>
                ))
              ) : (
                <option value="" style={{ background: "#1c1e38", color: "#a1a1aa" }}>
                  {fetchingWorkers ? "Loading workers..." : "No available workers found"}
                </option>
              )}
            </select>
          </div>

          <button
            onClick={handleStartTracking}
            disabled={loading || !selectedWorkerId}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: 10,
              background: loading || !selectedWorkerId ? "#374151" : "#4f46e5",
              color: "#ffffff",
              fontSize: 14,
              fontWeight: 600,
              border: "none",
              cursor: loading || !selectedWorkerId ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
            }}
          >
            {loading ? "Assigning..." : "Start Live Tracking"}
          </button>
        </div>
      </main>
    </div>
  );
}