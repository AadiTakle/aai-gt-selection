import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV !== 'production';

// The interactive family portal (client components) needs Next.js's inline
// hydration bootstrap scripts and inline styles (also emitted by next/font),
// so `default-src 'self'` alone would block hydration. We keep every other
// directive strict and only widen script/style. Dev additionally needs
// 'unsafe-eval' for Turbopack HMR.
// TODO(D-012): move to a nonce-based script-src for production hardening.
const scriptSrc = isDev ? "'self' 'unsafe-inline' 'unsafe-eval'" : "'self' 'unsafe-inline'";
const baseCsp = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  'object-src \'none\'',
  "base-uri 'self'",
];

// App pages are never framable. The born-synthetic exam demos under /exam-demos
// are deliberately embeddable SAME-ORIGIN by the adaptive screening surface
// (AX-01 embedding contract), so they relax frame-ancestors to 'self' only.
const appCsp = [...baseCsp, "frame-ancestors 'none'"].join('; ');
const examDemoCsp = [...baseCsp, "frame-ancestors 'self'"].join('; ');

const securityHeaders = (csp: string, frameOptions: 'DENY' | 'SAMEORIGIN') => [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: frameOptions },
];

const nextConfig: NextConfig = {
  // Emit a minimal self-contained server bundle for container images
  // (Amazon ECS Fargate target per D-012). No effect on local dev.
  output: 'standalone',
  poweredByHeader: false,
  async headers() {
    return [
      {
        // Everything except the embeddable exam demos: strict, non-framable.
        source: '/((?!exam-demos/).*)',
        headers: securityHeaders(appCsp, 'DENY'),
      },
      {
        // Same-origin-embeddable question-type demos (adaptive screening surface).
        source: '/exam-demos/:path*',
        headers: securityHeaders(examDemoCsp, 'SAMEORIGIN'),
      },
    ];
  },
};

export default nextConfig;
