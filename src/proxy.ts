import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js 16 Proxy (replaces deprecated middleware convention)
 *
 * - Generates a per-request CSP nonce
 * - Builds CSP dynamically using nonce for script/style
 * - Adds CSP to response headers
 * - Adds nonce to request headers as `x-nonce`
 *
 * Dev:
 * - React/Turbopack require 'unsafe-eval' for debugging overlays/callstacks
 *   so we allow it ONLY when NODE_ENV !== 'production'
 */
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  const scriptSrc =
    process.env.NODE_ENV === "production"
      ? `script-src 'self' 'nonce-${nonce}'`
      : `script-src 'self' 'nonce-${nonce}' 'unsafe-eval'`;

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    scriptSrc,
    "connect-src 'self' http://127.0.0.1:8090",
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  response.headers.set("Content-Security-Policy", csp);

  return response;
}

export const config = {
  matcher: "/:path*",
};
