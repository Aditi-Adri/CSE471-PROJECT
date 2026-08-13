"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import SosRadar from "@/components/tracking/SosRadar";
import { useSocket } from "@/lib/hooks/useSocket";
import type { SosApiResponse, AcceptedSosWorker } from "@/lib/types/tracking";
import { trackingPageBackground } from "@/lib/ui/trackingTheme";

// Page: /sos/[sosId] - Emergency dispatch UI
export default function SosPage() {
  const router = useRouter();
  const params = useParams<{ sosId: string }>();
  const sosId = params?.sosId;
  const socket = useSocket();

  const [sos, setSos] = useState<SosApiResponse | null>(null);
  const [accepted, setAccepted] = useState<AcceptedSosWorker | null>(null);

  // Initial load
  useEffect(() => {
    if (!sosId) return;

    fetch(`/api/tracking/sos/${sosId}`)
      .then(async (r) => {
        if (!r.ok) {
          throw new Error(`Failed to load SOS (${r.status})`);
        }
        return r.json();
      })
      .then((data) => {
        if (data.error) return;
        setSos(data);
        if (data.accepted) setAccepted(data.accepted);
      })
      .catch((err) => console.error("Error fetching SOS data:", err));
  }, [sosId]);

  // Live updates via socket
  useEffect(() => {
    if (!socket || !sosId) return;
    socket.emit("sos:join", { sosId });

    const onAccepted = (payload: AcceptedSosWorker) => {
      if (payload.sosId !== sosId) return;
      setAccepted(payload);
    };
    socket.on("sos:accepted", onAccepted);
    return () => {
      socket.off("sos:accepted", onAccepted);
    };
  }, [socket, sosId]);

  if (!sosId) return null;

  const isAccepted = !!accepted;
  const radiusKm = sos?.radiusKm ?? 3;
  const alertedCount = sos?.alertedWorkerCount ?? 0;

  return (
    <div style={{ ...trackingPageBackground, minHeight: "100vh", paddingTop: "0px" }}>
      <main
        style={{
          width: "100%",
          maxWidth: 680,
          margin: "40px auto 40px", 
          padding: "0 16px",
        }}
      >
        {/* Top Header Grid with Centered SOS Badge & Right-Aligned Back Button */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          {/* Spacer for symmetry */}
          <div />

          {/* Centered SOS Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              padding: "6px 16px",
              borderRadius: 999,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#ef4444",
                boxShadow: "0 0 8px #ef4444",
              }}
            />
            <span style={{ color: "#ef4444", fontWeight: 700, fontSize: 14 }}>
              SOS Activated
            </span>
          </div>

          {/* Right-aligned Back Button */}
          <div style={{ justifySelf: "end" }}>
            <button
              onClick={() => router.back()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#ffffff",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                padding: "6px 16px",
                borderRadius: 8,
                transition: "all 0.2s ease",
              }}
            >
              ← Back
            </button>
          </div>
        </div>

        {/* Main Card Container */}
        <div
          style={{
            background: "var(--tracking-card-bg, #1e2238)",
            borderRadius: 24,
            overflow: "hidden",
            boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
          }}
        >
          {/* Radar Visual */}
          <div style={{ position: "relative" }}>
            <div
              style={{
                position: "absolute",
                top: 16,
                left: 16,
                zIndex: 5,
                background: "rgba(0, 0, 0, 0.4)",
                backdropFilter: "blur(6px)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#ffffff",
                fontSize: 13,
                fontWeight: 600,
                padding: "6px 14px",
                borderRadius: 999,
              }}
            >
              {radiusKm}km radius
            </div>

            <SosRadar radiusKm={radiusKm} workers={sos?.nearbyWorkers || []} />
          </div>

          {/* Bottom Alert Status Panel */}
          <div style={{ background: "var(--tracking-gray-panel, #141728)", padding: "20px 24px" }}>
            {!isAccepted ? (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: 17,
                  }}
                >
                  <PulsingDot />
                  Alerting {alertedCount} verified worker{alertedCount === 1 ? "" : "s"}
                </div>
                <div style={{ marginTop: 4, fontSize: 13.5, color: "rgba(255,255,255,0.75)" }}>
                  First worker to accept is immediately routed to your location.
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 13.5, color: "rgba(255,255,255,0.65)", marginBottom: 12 }}>
                  A worker has accepted your emergency call
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderTop: "1px solid rgba(255,255,255,0.15)",
                    paddingTop: 14,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: "50%",
                        background: "var(--tracking-green, #10b981)",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: 15,
                        flexShrink: 0,
                      }}
                    >
                      {accepted?.worker?.avatarInitials || "—"}
                    </div>
                    <div>
                      <div style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>
                        {accepted?.worker?.name || "Worker"}{" "}
                        <span style={{ color: "var(--tracking-green, #10b981)", fontWeight: 600, fontSize: 14 }}>
                          Accepted
                        </span>
                      </div>
                      <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 2 }}>
                        {accepted?.etaMinutes != null ? `${accepted.etaMinutes} min away` : "On the way"}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontSize: 16,
                    }}
                  >
                    📍
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function PulsingDot() {
  return (
    <>
      <style>{`
        @keyframes alertDotPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(1.2); }
        }
      `}</style>
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: "#ef4444",
          display: "inline-block",
          animation: "alertDotPulse 1.4s ease-in-out infinite",
        }}
      />
    </>
  );
}