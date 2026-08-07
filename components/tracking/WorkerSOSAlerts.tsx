// "use client";

// import { useEffect, useState } from "react";
// import { useSocket } from "@/lib/hooks/useSocket";
// import type { AcceptedSosWorker, SosNewAlert } from "@/lib/types/tracking";

// /**
//  * Mounted on the worker's dashboard while they are online/available.
//  * Registers the worker's personal socket room so /api/tracking/sos/trigger
//  * can reach them, then surfaces incoming SOS alerts with an Accept action.
//  */
// export default function WorkerSOSAlerts({ workerId }: { workerId: string }) {
//   const socket = useSocket();
//   const [alerts, setAlerts] = useState<SosNewAlert[]>([]);
//   const [acceptedJob, setAcceptedJob] = useState<AcceptedSosWorker | null>(null);

//   useEffect(() => {
//     if (!socket) return;
//     socket.emit("worker:register", { workerId });

//     const onNewSos = (payload: SosNewAlert) => {
//       setAlerts((prev) => [payload, ...prev]);
//     };
//     socket.on("sos:new", onNewSos);
//     return () => {
//       socket.off("sos:new", onNewSos);
//     };
//   }, [socket, workerId]);

//   const accept = async (sosId: string) => {
//     const res = await fetch(`/api/tracking/sos/${sosId}/accept`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ workerId }),
//     });

//     if (res.status === 409) {
//       alert("Too slow - another worker already accepted this job.");
//       setAlerts((prev) => prev.filter((a) => a.sosId !== sosId));
//       return;
//     }

//     const data = (await res.json()) as AcceptedSosWorker;
//     setAcceptedJob(data);
//     setAlerts((prev) => prev.filter((a) => a.sosId !== sosId));
//   };

//   // 1. Show Success Confirmation Card once accepted
//   if (acceptedJob) {
//     return (
//       <div
//         style={{
//           border: "2px solid #16a34a",
//           borderRadius: 12,
//           padding: 16,
//           background: "#f0fdf4",
//           marginTop: 16,
//         }}
//       >
//         <h3 style={{ color: "#16a34a", margin: 0, fontSize: 16 }}>
//           ✅ SOS Emergency Call Accepted!
//         </h3>
//         <p style={{ margin: "8px 0 0", fontSize: 13, color: "#1f2937" }}>
//           <strong>Request ID:</strong> {acceptedJob.sosId}
//         </p>
//         <p style={{ margin: "4px 0 0", fontSize: 13, color: "#4b5563" }}>
//           <strong>Estimated Arrival:</strong>{" "}
//           {acceptedJob.etaMinutes != null ? `${acceptedJob.etaMinutes} mins` : "En route"}
//         </p>
//       </div>
//     );
//   }

//   // 2. Render nothing when no alerts exist
//   if (alerts.length === 0) return null;

//   // 3. Render active nearby SOS alerts
//   return (
//     <div style={{ border: "2px solid #dc2626", borderRadius: 12, padding: 16, marginTop: 16 }}>
//       <h3 style={{ color: "#dc2626", margin: 0, fontSize: 16 }}>Emergency SOS Nearby</h3>
//       {alerts.map((a) => (
//         <div
//           key={a.sosId}
//           style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}
//         >
//           <span style={{ fontSize: 13 }}>
//             Household emergency ~ {new Date(a.createdAt).toLocaleTimeString()}
//           </span>
//           <button
//             onClick={() => accept(a.sosId)}
//             style={{
//               background: "#dc2626",
//               color: "#fff",
//               border: "none",
//               padding: "6px 14px",
//               borderRadius: 6,
//               fontWeight: 600,
//               cursor: "pointer",
//             }}
//           >
//             Accept
//           </button>
//         </div>
//       ))}
//     </div>
//   );
// }

"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/lib/hooks/useSocket";
import type { AcceptedSosWorker, SosNewAlert } from "@/lib/types/tracking";

/**
 * Mounted on the worker's dashboard while they are online/available.
 * Registers the worker's personal socket room so /api/tracking/sos/trigger
 * can reach them, then surfaces incoming SOS alerts with an Accept action.
 */
export default function WorkerSOSAlerts({ workerId }: { workerId: string }) {
  const socket = useSocket();
  const [alerts, setAlerts] = useState<SosNewAlert[]>([]);
  const [acceptedJob, setAcceptedJob] = useState<AcceptedSosWorker | null>(null);

    useEffect(() => {
    if (!socket) return;
    socket.emit("worker:register", { workerId });

    const onNewSos = (payload: SosNewAlert) => {
        setAlerts((prev) => {
        // Deduplicate: Don't add if sosId already exists in array
        if (prev.some((item) => item.sosId === payload.sosId)) return prev;
        return [payload, ...prev];
        });
    };

    socket.on("sos:new", onNewSos);
    return () => {
        socket.off("sos:new", onNewSos);
    };
    }, [socket, workerId]);

  const accept = async (sosId: string) => {
    try {
      const res = await fetch(`/api/tracking/sos/${sosId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workerId }),
      });

      if (res.status === 409) {
        alert("Too slow - another worker already accepted this job.");
        setAlerts((prev) => prev.filter((a) => a.sosId !== sosId));
        return;
      }

      // Guard against non-200 responses (e.g. 405 Method Not Allowed)
      if (!res.ok) {
        console.error(`Failed to accept SOS (${res.status} ${res.statusText})`);
        return;
      }

      const data = (await res.json()) as AcceptedSosWorker;
      setAcceptedJob(data);
      setAlerts((prev) => prev.filter((a) => a.sosId !== sosId));
    } catch (err) {
      console.error("Error accepting SOS alert:", err);
    }
  };

  // 1. Show Success Confirmation Card once accepted
  if (acceptedJob) {
    return (
      <div
        style={{
          border: "2px solid #16a34a",
          borderRadius: 12,
          padding: 16,
          background: "#f0fdf4",
          marginTop: 16,
        }}
      >
        <h3 style={{ color: "#16a34a", margin: 0, fontSize: 16 }}>
          ✅ SOS Emergency Call Accepted!
        </h3>
        <p style={{ margin: "8px 0 0", fontSize: 13, color: "#1f2937" }}>
          <strong>Request ID:</strong> {acceptedJob.sosId}
        </p>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#4b5563" }}>
          <strong>Estimated Arrival:</strong>{" "}
          {acceptedJob.etaMinutes != null ? `${acceptedJob.etaMinutes} mins` : "En route"}
        </p>
      </div>
    );
  }

  // 2. Render nothing when no alerts exist
  if (alerts.length === 0) return null;

  // 3. Render active nearby SOS alerts
  return (
    <div style={{ border: "2px solid #dc2626", borderRadius: 12, padding: 16, marginTop: 16 }}>
      <h3 style={{ color: "#dc2626", margin: 0, fontSize: 16 }}>Emergency SOS Nearby</h3>
      {alerts.map((a) => (
        <div
          key={a.sosId}
          style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}
        >
          <span style={{ fontSize: 13 }}>
            Household emergency ~ {new Date(a.createdAt).toLocaleTimeString()}
          </span>
          <button
            onClick={() => accept(a.sosId)}
            style={{
              background: "#dc2626",
              color: "#fff",
              border: "none",
              padding: "6px 14px",
              borderRadius: 6,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Accept
          </button>
        </div>
      ))}
    </div>
  );
}