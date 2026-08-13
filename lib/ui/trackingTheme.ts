import type { CSSProperties } from "react";

/**
 * The Live Tracking & SOS feature's dark glassmorphism backdrop
 * (previously set globally on `body` in globals.css, which forced
 * every other page in the app dark too — see the note there). Apply
 * this directly to a tracking/SOS page's own root element instead.
 */
export const trackingPageBackground: CSSProperties = {
  backgroundColor: "#06060a",
  backgroundImage:
    "radial-gradient(circle at 50% 15%, rgba(67, 56, 202, 0.4) 0%, rgba(30, 27, 75, 0.15) 50%, transparent 80%), " +
    "radial-gradient(circle at 80% 0%, rgba(99, 102, 241, 0.25) 0%, transparent 50%)",
  backgroundAttachment: "fixed",
  color: "#f4f4f5",
};
