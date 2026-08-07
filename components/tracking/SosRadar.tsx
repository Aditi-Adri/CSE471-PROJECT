import type { NearbyWorker } from "@/lib/types/tracking";

/**
 * Visual radar for the SOS page: red gradient panel, pulsing concentric
 * rings around the customer, and green dots for each alerted worker
 * (plotted from real dx/dy km offsets returned by the API, scaled to fit
 * the radius circle).
 */
export default function SosRadar({
  radiusKm = 3,
  workers = [],
  height = 300,
}: {
  radiusKm?: number;
  workers?: NearbyWorker[];
  height?: number;
}) {
  const cx = 250;
  const cy = 150;
  const maxR = 90; // px representing radiusKm on screen

  const scale = maxR / radiusKm;

  const plotted = workers.map((w) => {
    const px = cx + clamp(w.dx * scale, -maxR - 10, maxR + 10);
    const py = cy + clamp(w.dy * scale, -maxR - 10, maxR + 10);
    return { ...w, px, py };
  });

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: height,
        background: "linear-gradient(160deg, #8a1120 0%, #a3182a 100%)",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes sosPulse {
          0% { transform: scale(0.6); opacity: 0.55; }
          70% { opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes sosDot {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.25); }
        }
      `}</style>

      <svg viewBox="0 0 500 300" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
        <circle cx={cx} cy={cy} r={maxR} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="1.5" />
        <circle
          cx={cx}
          cy={cy}
          r={maxR * 0.55}
          fill="none"
          stroke="rgba(0,0,0,0.35)"
          strokeWidth="1.5"
        />

        {/* animated pulse rings */}
        <circle
          cx={cx}
          cy={cy}
          r={maxR * 0.3}
          fill="rgba(0,0,0,0.25)"
          style={{ transformOrigin: `${cx}px ${cy}px`, animation: "sosPulse 2.4s ease-out infinite" }}
        />
        <circle
          cx={cx}
          cy={cy}
          r={maxR * 0.3}
          fill="rgba(0,0,0,0.25)"
          style={{
            transformOrigin: `${cx}px ${cy}px`,
            animation: "sosPulse 2.4s ease-out 1.2s infinite",
          }}
        />

        {/* customer marker (center) */}
        <circle cx={cx} cy={cy} r={9} fill="rgba(0,0,0,0.55)" />
        <circle cx={cx} cy={cy} r={4} fill="rgba(0,0,0,0.8)" />

        {/* worker markers */}
        {plotted.map((w) => (
          <circle
            key={w.workerId}
            cx={w.px}
            cy={w.py}
            r={6}
            fill="#22c55e"
            stroke="rgba(255,255,255,0.6)"
            strokeWidth="1.5"
            style={{ transformOrigin: `${w.px}px ${w.py}px`, animation: "sosDot 1.8s ease-in-out infinite" }}
          />
        ))}
      </svg>
    </div>
  );
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}