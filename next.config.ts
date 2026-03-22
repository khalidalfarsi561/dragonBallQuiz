import type { NextConfig } from "next";

/**
 * Production security hardening:
 * - Security headers for all routes
 * - Restrict Server Actions allowed origins (CSRF + React2Shell mitigation)
 */
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "i.ibb.co",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://images.unsplash.com https://i.ibb.co; font-src 'self' data:; connect-src 'self' https://images.unsplash.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests",
          },
        ],
      },
    ];
  },

  experimental: {
    serverActions: {
      // IMPORTANT: Replace `yourdomain.com` with your real production domain when ready.
      allowedOrigins: ["localhost:3000", "yourdomain.com"],
    },
  },
};

export default nextConfig;
