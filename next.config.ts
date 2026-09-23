import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the Next.js "N" badge shown in development.
  devIndicators: false,
  experimental: {
    reactCompiler: true,
  },
};

export default nextConfig;
