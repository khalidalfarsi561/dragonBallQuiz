# Implementation Plan

[Overview]
The goal is to eliminate the CSP image-blocking error by aligning `img-src` and Next.js remote image configuration with the actual image domains used by the application.

The issue is caused by the security policy in `next.config.ts`, where `Content-Security-Policy` currently allows only a limited set of image origins, while the running app attempts to load images from at least one additional trusted domain. This results in browser console violations and blocked image requests.

The safest practical fix is to keep the policy restrictive, but explicitly add only the trusted domains currently used by the application. The implementation will preserve production hardening while restoring image functionality immediately, without changing content URLs or rewriting existing media references.

[Types]
No application type-system changes are required; this task is a security-policy and configuration update only.

The implementation will not introduce new domain models, interfaces, enums, or data structures. It will update static configuration values in the Next.js config to ensure:

- `images.remotePatterns` includes every trusted image host currently used by the app
- `Content-Security-Policy` `img-src` includes the same trusted hosts
- `connect-src` and any related directives remain as strict as possible without breaking image loading

[Files]
Update the Next.js configuration and verify that no additional application files need changes.

Planned file changes:

- `dragonballquiz/next.config.ts`
  - Expand the allowed image host list in both `images.remotePatterns` and the CSP `img-src` directive
  - Keep the existing security headers intact
  - Preserve the server actions origin restrictions
- `dragonballquiz/src/app/layout.tsx`
  - No code change expected unless metadata or image references reveal a mismatch during verification
- `dragonballquiz/src/components/AuthModal.tsx`
  - No change expected; included for verification only because the user session/auth flow influences whether the homepage renders this UI
- `dragonballquiz/src/app/globals.css`
  - No change expected unless CSS background images are found during verification

No files will be deleted or moved.

[Functions]
No runtime functions are expected to change.

Relevant configuration blocks to review and adjust:

- `nextConfig.images.remotePatterns`
- `nextConfig.headers()` CSP header construction

Behavioral expectations:

- The app must continue to serve images from the current trusted remote domains
- CSP must stop blocking those domains
- No broad wildcard image allowance should be introduced
- Existing headers such as `X-Frame-Options`, `Referrer-Policy`, and HSTS should remain unchanged

[Changes]
The implementation will be a minimal, targeted security configuration update.

1. Inspect the actual image URLs used throughout the app, including `next/image`, `<img>`, metadata previews, and any CSS-driven image URLs, to identify the exact trusted hosts currently in use.
2. Compare those hosts against `next.config.ts`.
3. Add only the missing trusted hosts to:
   - `images.remotePatterns`
   - `Content-Security-Policy` `img-src`
4. Ensure the CSP remains strict by avoiding `*`, `https:`, or other broad source allowances.
5. Verify whether `connect-src` needs to match any image-related CDN requests used by the app; if not needed, leave it unchanged.
6. Confirm the app still renders the homepage, auth flow, and image-heavy pages without browser CSP violations.
7. If any additional domain is discovered during verification, add it only if it is actively used and trusted.

[Tests]
The testing strategy is to validate the fix both statically and in the browser.

- Manual verification in the browser:
  - Open the app and confirm image-related CSP violations disappear
  - Confirm remote images render normally on pages that previously showed warnings
- Configuration validation:
  - Confirm `next.config.ts` contains the exact trusted hosts used by the app
  - Confirm the CSP `img-src` directive matches the remote image allowlist
- Regression checks:
  - Ensure authentication still works
  - Ensure no unrelated security headers were removed
- Edge cases to cover:
  - Images loaded through `next/image`
  - Images loaded through plain `<img>`
  - Metadata/social preview images
  - Any fallback `data:` URLs still render
- Performance/security considerations:
  - Keep the allowlist minimal
  - Avoid introducing broad protocol-wide CSP relaxations
  - Preserve production-grade hardening for non-image directives

[Focus Chain Integration]

- [x] Investigate the CSP source and image usage
- [x] Determine the exact fix and implementation scope
- [x] Confirm the preferred fix direction with the user
- [x] Write a comprehensive implementation plan in `implementation_plan.md`
- [ ] Create a follow-up implementation task based on the plan
