"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function TrackPage() {
  const router = useRouter();

  useEffect(() => {
    // Auto-redirect after a short delay
    const timer = setTimeout(() => {
      router.replace("/search");
    }, 3000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div style={{ minHeight: "100vh", background: "transparent", paddingTop: "40px" }}>
      <main style={{ maxWidth: 440, margin: "0 auto", padding: "0 16px" }}>
        <div
          style={{
            background: "rgba(20, 22, 43, 0.85)",
            backdropFilter: "blur(12px)",
            borderRadius: 16,
            padding: "28px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.37)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            textAlign: "center",
          }}
        >
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 12px", color: "#f4f4f5" }}>
            Live Tracking
          </h2>
          <p style={{ fontSize: 14, color: "#a1a1aa", margin: "0 0 24px", lineHeight: 1.6 }}>
            To track a worker, first book one from the search page. You&apos;ll be
            redirected to live tracking automatically after confirming your booking.
          </p>
          <p style={{ fontSize: 13, color: "#71717a", marginBottom: 20 }}>
            Redirecting to search...
          </p>
          <Link
            href="/search"
            style={{
              display: "inline-block",
              padding: "14px 28px",
              borderRadius: 10,
              background: "#4f46e5",
              color: "#ffffff",
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
              transition: "all 0.2s ease",
            }}
          >
            Browse Workers →
          </Link>
        </div>
      </main>
    </div>
  );
}
