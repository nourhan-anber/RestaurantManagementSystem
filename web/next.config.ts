import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for container/self-hosted deploys.
  output: "standalone",
  // Menu images can come from any https host (owners paste a URL).
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  // Allow the dev server to be reached through a tunnel (ngrok) — otherwise Next
  // blocks cross-origin requests to dev-only assets/endpoints from non-localhost.
  allowedDevOrigins: [
    "*.ngrok-free.app",
    "*.ngrok.app",
    "*.ngrok-free.dev",
    "*.ngrok.io",
  ],
};

export default nextConfig;
