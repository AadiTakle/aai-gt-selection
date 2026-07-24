import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV !== 'production';

// The interactive family portal (client components) needs Next.js's inline
// hydration bootstrap scripts and inline styles (also emitted by next/font),
// so `default-src 'self'` alone would block hydration. We keep every other
// directive strict and only widen script/style. Dev additionally needs
// 'unsafe-eval' for Turbopack HMR.
// TODO(D-012): move to a nonce-based script-src for production hardening.
const scriptSrc = isDev ? "'self' 'unsafe-inline' 'unsafe-eval'" : "'self' 'unsafe-inline'";
// The assessment portal embeds self-contained question demos (served from
// /exam-demos/) in same-origin iframes, so we allow same-origin framing:
// `frame-src 'self'` lets the app embed them, and `frame-ancestors 'self'`
// (with X-Frame-Options SAMEORIGIN below) lets those demos be framed by us
// while still blocking any cross-origin site from framing the app (clickjacking).
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-src 'self'",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ');

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
            value: contentSecurityPolicy,
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
