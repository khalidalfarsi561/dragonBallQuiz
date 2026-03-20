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
          // Lock down to same-origin by default. If you later need external assets,
          // expand directives deliberately (e.g. add https: sources per directive).
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data:; font-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self' http://127.0.0.1:8090;",
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
