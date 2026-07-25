/**
 * Content-Security-Policy, computed at RUNTIME.
 *
 * This must be built per-request (in the proxy), not in next.config's static
 * `headers()`, because the hosted-deploy `connect-src` depends on runtime env
 * (`GT_DEPLOY_MODE` + the cloud Supabase origin). Computing it at build time
 * would freeze it to whatever env the image was built with — wrong for a
 * build-once/deploy-many container.
 *
 * The family portal needs inline hydration scripts + inline styles (next/font),
 * so script/style are widened; everything else stays strict. Same-origin framing
 * is allowed so the assessment portal can embed the question demos.
 */
export function buildContentSecurityPolicy(
  env: Record<string, string | undefined> = process.env,
): string {
  const isDev = env.NODE_ENV !== 'production';
  const scriptSrc = isDev ? "'self' 'unsafe-inline' 'unsafe-eval'" : "'self' 'unsafe-inline'";

  // hosted mode: let the browser reach the cloud Supabase origin (auth + RPC +
  // realtime websocket). Local mode stays 'self' only.
  let connectExtra = '';
  if (env.GT_DEPLOY_MODE === 'hosted' && env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const u = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
      const wss = `${u.protocol === 'https:' ? 'wss' : 'ws'}://${u.host}`;
      connectExtra = ` ${u.origin} ${wss}`;
    } catch {
      connectExtra = '';
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
