import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Next.js 16 auto-generates AI coding-assistant instruction files on
  // dev-server start. This repo intentionally doesn't want those —
  // disabled explicitly rather than relying on them being git-ignored,
  // so they never even get written to disk.
  agentRules: false,
  // Needed once the app is served via the custom server.ts entry point
  // (Live Tracking & SOS's Socket.IO server) rather than the plain
  // `next dev` CLI — without an explicit root, Turbopack can't reliably
  // infer the project root from a non-standard entry point.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
