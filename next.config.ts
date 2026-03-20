import type { NextConfig } from "next";

/**
 * Production security hardening:
 * - Security headers for all routes
 * - Restrict Server Actions allowed origins (CSRF + React2Shell mitigation)
 */
const nextConfig: NextConfig = {
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
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
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
