import { ImageResponse } from "next/og";

export const alt = "HireLocal — Verified local technicians, matched instantly";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Dynamically rendered social-share card (Open Graph + Twitter both use
 * this file) — no external image asset to keep in sync with the brand
 * colors in globals.css.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: "linear-gradient(135deg, #4338ca 0%, #4f46e5 55%, #6366f1 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "rgba(255,255,255,0.16)",
            }}
          >
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path
                d="M6 18.5 13 25.5 26 10"
                stroke="white"
                strokeWidth="3.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: "white" }}>HireLocal</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              display: "flex",
              fontSize: 56,
              fontWeight: 700,
              color: "white",
              lineHeight: 1.15,
              maxWidth: 980,
            }}
          >
            Verified local technicians, matched instantly
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 28,
              color: "rgba(255,255,255,0.85)",
              maxWidth: 880,
            }}
          >
            Background-checked. Live tracked. Fair, upfront pricing.
          </div>
        </div>

        <div style={{ display: "flex", gap: 40 }}>
          {["NID + skill + police verified", "Live GPS tracking", "One-tap emergency SOS"].map((label) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex", width: 8, height: 8, borderRadius: 999, background: "#a5b4fc" }} />
              <div style={{ display: "flex", fontSize: 22, color: "rgba(255,255,255,0.9)" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
