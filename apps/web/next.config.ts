import type { NextConfig } from 'next';

import { buildContentSecurityPolicy } from './src/lib/csp';

// Static baseline CSP for responses the proxy does not run on (e.g. static
// files under /exam-demos/, /_next assets excluded by the proxy matcher). The
// proxy recomputes and overrides this per-request for pages so hosted-mode
// connect-src reflects runtime env — see src/lib/csp.ts and src/proxy.ts.
const staticContentSecurityPolicy = buildContentSecurityPolicy();

const nextConfig: NextConfig = {
  // Emit a minimal self-contained server bundle for container images
  // (Amazon ECS Fargate target per D-012). No effect on local dev.
  output: 'standalone',
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: staticContentSecurityPolicy,
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
