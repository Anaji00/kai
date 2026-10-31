import type { NextConfig } from "next";
import path from "node:path";

// On Vercel the /api/v1 rewrite target is baked in at build time, so a missing backend URL
// would silently point production at localhost. Fail the build instead.
if (process.env.VERCEL && !process.env.FASTAPI_BACKEND_URL) {
  throw new Error("FASTAPI_BACKEND_URL must be set in the Vercel project (e.g. https://api.kaiwellnessretreats.com).");
}

const nextConfig: NextConfig = {
  // Standalone output is for the Docker image; Vercel uses its own build output.
  output: process.env.VERCEL ? undefined : "standalone",
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(self), geolocation=()",
          },
        ],
      },
    ];
  },
  async rewrites() {
    const backendUrl = process.env.FASTAPI_BACKEND_URL || "http://127.0.0.1:8000";
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
