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
  // The item bank is real runtime data, not source: `src/lib/exam/bank-loader.ts` reads
  // `research/exam-question-types/banks/*.jsonl` with `fs.readFile`, so Next's static tracing
  // cannot see it and a standalone build shipped without it. The banks carry the server-only
  // answer keys, which is why they are traced into the server bundle rather than published under
  // `public/` the way `pnpm exam:sync` publishes the demos — see the "never publishes the raw
  // banks" assertion in src/lib/exam/served-boundary.test.ts.
  //
  // The child lexicon is the same kind of dependency and was NOT declared until now: it only
  // reached built images because the two `process.cwd()` walks defeated the tracer badly enough
  // that it globbed the entire repository, which also dragged in `docs/`, `brainlifting/` and
  // `supabase/`. With those walks made statically resolvable (`bank-loader.ts`,
  // `verifiers/quantitative.ts`) that sweep is gone, so anything read at runtime has to be
  // declared here rather than left to luck. Without the lexicon GB-WORDLADDER-01 fails every
  // submission closed and GB-WORDFORGE-01 stops distinguishing a made-up word from a real one —
  // see `childLexicon()`.
  //
  // Applied to every route rather than to the three that reach the loader today
  // (`/api/exam-items`, `/api/exam-submit`, `/api/exam-emulate`): an enumerated list is a list
  // that goes stale silently, and the traced files are copied once regardless of how many routes
  // claim them.
  outputFileTracingIncludes: {
    '/**': [
      '../../research/exam-question-types/banks/*.jsonl',
      '../../research/exam-question-types/generators/lexicon-child-en.mjs',
      // The FLU-OPCHAIN-01 template bank, read at runtime by `lib/exam/materialised-session.ts` when
      // serve-time materialisation is on (D-208). Same kind of dependency as the banks and declared for
      // the same reason: `fs.readFile` is invisible to the tracer, and without this an image with the
      // flag set has no templates to materialise from. The materialiser itself is a static import and
      // is traced automatically, which is why only the data file is named here.
      '../../research/exam-question-types/templates/*.jsonl',
    ],
  },
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
