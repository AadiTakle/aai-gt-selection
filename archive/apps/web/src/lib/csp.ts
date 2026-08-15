/**
 * Content-Security-Policy, computed at RUNTIME.
 *
 * This must be built per-request (in the proxy), not in next.config's static
 * `headers()`, because `connect-src` depends on runtime env (`GT_DEPLOY_MODE` +
 * the configured Supabase origin). Computing it at build time would freeze it to
 * whatever env the image was built with — wrong for a build-once/deploy-many
 * container.
 *
 * The family portal needs inline hydration scripts + inline styles (next/font),
 * so script/style are widened; everything else stays strict. Same-origin framing
 * is allowed so the assessment portal can embed the question demos.
 */

/**
 * Hosts that count as local for the development-only widening below.
 *
 * Deliberately the same literals `env.ts` accepts as a non-hosted Supabase
 * target, so this cannot widen to a host the environment guard would have refused
 * to boot against. `csp.test.ts` pins that direction: anything the guard accepts
 * must appear here. Both files strip the brackets `URL.hostname` keeps around an
 * IPv6 literal, so the two sets match on `::1` as well as on the named hosts.
 */
const loopbackHosts = new Set(['127.0.0.1', 'localhost', '::1']);

/**
 * The browser talks to Supabase directly — auth, RPC, and the realtime
 * websocket — so `connect-src` has to name that origin by scheme, host, and
 * port. Both schemes are returned because CSP treats `ws:`/`wss:` as separate
 * from `http:`/`https:`.
 */
function supabaseConnectSources(supabaseUrl: URL): string[] {
  const websocketScheme = supabaseUrl.protocol === 'https:' ? 'wss' : 'ws';
  return [supabaseUrl.origin, `${websocketScheme}://${supabaseUrl.host}`];
}

export function buildContentSecurityPolicy(
  env: Record<string, string | undefined> = process.env,
): string {
  const isDev = env.NODE_ENV !== 'production';
  const scriptSrc = isDev ? "'self' 'unsafe-inline' 'unsafe-eval'" : "'self' 'unsafe-inline'";

  // Supabase is a different origin from the app in both deployment shapes, so
  // `'self'` never covers it:
  //
  //  - hosted deploy: the cloud project, on a different host;
  //  - local development: the local stack, on a different PORT (e.g. app on
  //    :3000, Supabase on :65421) — which CSP treats as a different origin just
  //    as strictly. Without this every browser-side auth call is blocked, which
  //    presents as a broken auth layer even though a server-side password grant
  //    against the same project succeeds.
  //
  // The local case applies only when BOTH of the following hold, and each is
  // independently false in a hosted production deploy (which sets
  // GT_DEPLOY_MODE=hosted and points at an https cloud host):
  //
  //  1. hosted mode is off, and
  //  2. the configured Supabase host is loopback.
  //
  // `env.ts` additionally refuses to boot a non-hosted app against a
  // non-loopback Supabase URL, so "not hosted, and loopback" describes a
  // developer machine and nothing else. NODE_ENV is intentionally not part of
  // the condition: a local production build (`next build && next start`) against
  // local Supabase is still a developer machine and still needs to sign in.
  let connectExtra = '';
  const supabaseUrl = parseUrl(env.NEXT_PUBLIC_SUPABASE_URL);
  if (supabaseUrl) {
    const hostedDeploy = env.GT_DEPLOY_MODE === 'hosted';
    const localSupabase = loopbackHosts.has(hostname(supabaseUrl));
    if (hostedDeploy || localSupabase) {
      connectExtra = ` ${supabaseConnectSources(supabaseUrl).join(' ')}`;
    }
  }

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src 'self'${connectExtra}`,
    "frame-src 'self'",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "base-uri 'self'",
  ].join('; ');
}

function parseUrl(value: string | undefined): URL | undefined {
  if (!value) {
    return undefined;
  }
  try {
    return new URL(value);
  } catch {
    return undefined;
  }
}

/** `URL.hostname` keeps IPv6 literals bracketed; `loopbackHosts` stores `::1` bare. */
function hostname(url: URL): string {
  return url.hostname.replace(/^\[(.*)\]$/, '$1');
}
