// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   /* config options here */
//   // Next.js 16 auto-generates AI coding-assistant instruction files on
//   // dev-server start. This repo intentionally doesn't want those —
//   // disabled explicitly rather than relying on them being git-ignored,
//   // so they never even get written to disk.
//   agentRules: false,
// };

// export default nextConfig;

import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;