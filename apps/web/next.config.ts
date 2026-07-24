import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV !== 'production';

// The interactive family portal (client components) needs Next.js's inline
// hydration bootstrap scripts and inline styles (also emitted by next/font),
// so `default-src 'self'` alone would block hydration. We keep every other
// directive strict and only widen script/style. Dev additionally needs
// 'unsafe-eval' for Turbopack HMR.
// TODO(D-012): move to a nonce-based script-src for production hardening.
const scriptSrc = isDev ? "'self' 'unsafe-inline' 'unsafe-eval'" : "'self' 'unsafe-inline'";
// In hosted deploy mode the browser must reach the cloud Supabase origin
// (auth + RPC + realtime), so widen connect-src to it. Default (local) stays
// 'self' only. Origin is derived from the configured Supabase URL.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseOrigin =
  process.env.GT_DEPLOY_MODE === 'hosted' && supabaseUrl
    ? (() => {
        try {
          const u = new URL(supabaseUrl);
          const wss = `${u.protocol === 'https:' ? 'wss' : 'ws'}://${u.host}`;
          return `${u.origin} ${wss}`;
        } catch {
          return '';
        }
      })()
    : '';
const connectSrc = ["'self'", supabaseOrigin].filter(Boolean).join(' ');
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
  `connect-src ${connectSrc}`,
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
