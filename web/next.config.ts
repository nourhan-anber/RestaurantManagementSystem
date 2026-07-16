import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for container/self-hosted deploys.
  output: "standalone",
  // Menu images can come from any https host (owners paste a URL).
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
