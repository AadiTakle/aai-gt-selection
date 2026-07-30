import { describe, expect, it } from 'vitest';

import { buildContentSecurityPolicy } from './csp';
import { validatePublicEnvironment } from './env';

/**
 * The two assertions that matter are the pair: local development must be able to
 * reach its Supabase origin, and a hosted production deploy must not gain a
 * loopback allowance. A test that only covers the first would pass just as well
 * against a CSP that had been widened unconditionally.
 */

function directive(policy: string, name: string): string {
  const found = policy.split('; ').find((entry) => entry === name || entry.startsWith(`${name} `));
  if (!found) {
    throw new Error(`policy has no ${name} directive: ${policy}`);
  }
  return found;
}

// A developer machine: local Supabase on its own port, app on another.
const localEnvironment = {
  NODE_ENV: 'development',
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:65421',
};

// A hosted deploy as the Dockerfile and deploy workflow configure it.
const hostedEnvironment = {
  NODE_ENV: 'production',
  GT_DEPLOY_MODE: 'hosted',
  NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
};

describe('content security policy', () => {
  it('permits the configured Supabase origin in local development', () => {
    const connectSrc = directive(buildContentSecurityPolicy(localEnvironment), 'connect-src');

    expect(connectSrc).toContain('http://127.0.0.1:65421');
    // Supabase realtime is a websocket, which connect-src governs by scheme.
    expect(connectSrc).toContain('ws://127.0.0.1:65421');
  });

  it('derives the local Supabase origin from configuration rather than a fixed port', () => {
    // 65421 is one machine's port. Any other developer's local stack must work too.
    const connectSrc = directive(
      buildContentSecurityPolicy({
        ...localEnvironment,
        NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
      }),
      'connect-src',
    );

    expect(connectSrc).toContain('http://localhost:54321');
    expect(connectSrc).toContain('ws://localhost:54321');
    expect(connectSrc).not.toContain('65421');
  });

  it('widens for every non-hosted Supabase URL the environment guard accepts', () => {
    // Pins this file's notion of "local" to env.ts's: any URL the app will
    // actually boot against outside hosted mode must not be left CSP-blocked.
    // Asserted as an implication so it stays honest if that guard's accepted set
    // changes — today it rejects the bracketed IPv6 form (see env.ts note below).
    const candidates = [
      'http://127.0.0.1:65421',
      'http://localhost:65421',
      'http://[::1]:65421',
      'http://127.0.0.1:54321',
    ];
    const accepted = candidates.filter((url) => {
      try {
        validatePublicEnvironment({
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'local-publishable-key',
          NEXT_PUBLIC_SUPABASE_URL: url,
        });
        return true;
      } catch {
        return false;
      }
    });

    expect(accepted.length).toBeGreaterThan(0);
    for (const url of accepted) {
      const connectSrc = directive(
        buildContentSecurityPolicy({ ...localEnvironment, NEXT_PUBLIC_SUPABASE_URL: url }),
        'connect-src',
      );
      expect(connectSrc).toContain(new URL(url).origin);
    }
  });

  it('treats the bracketed IPv6 loopback literal as local', () => {
    // `URL.hostname` keeps the brackets, so a bare `::1` comparison would miss it.
    // env.ts currently rejects this form before the CSP is ever built; handling it
    // here means the CSP is not the thing left behind if that is corrected.
    const connectSrc = directive(
      buildContentSecurityPolicy({
        ...localEnvironment,
        NEXT_PUBLIC_SUPABASE_URL: 'http://[::1]:65421',
      }),
      'connect-src',
    );

    expect(connectSrc).toContain('http://[::1]:65421');
    expect(connectSrc).toContain('ws://[::1]:65421');
  });

  it('does not widen to loopback in a hosted production deploy', () => {
    const policy = buildContentSecurityPolicy(hostedEnvironment);

    expect(policy).not.toMatch(/127\.0\.0\.1|localhost|\[::1\]/);
    // ws:// is plaintext and only ever needed by a local stack; wss:// is hosted.
    expect(policy).not.toContain('ws://');
  });

  it('leaves the hosted production policy byte-for-byte unchanged', () => {
    // Spelled out rather than snapshotted so that widening production requires
    // editing an explicit expectation in a reviewed diff.
    expect(buildContentSecurityPolicy(hostedEnvironment)).toBe(
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'self' https://project.supabase.co wss://project.supabase.co",
        "frame-src 'self'",
        "frame-ancestors 'self'",
        "object-src 'none'",
        "base-uri 'self'",
      ].join('; '),
    );
  });

  it('ignores a non-loopback Supabase target outside hosted mode', () => {
    // env.ts refuses to boot this configuration at all; the CSP must not be the
    // thing that would have allowed it.
    const connectSrc = directive(
      buildContentSecurityPolicy({
        NODE_ENV: 'development',
        NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
      }),
      'connect-src',
    );

    expect(connectSrc).toBe("connect-src 'self'");
  });

  it('falls back to self-only when the Supabase URL is unusable', () => {
    for (const url of [undefined, '', 'not-a-url']) {
      const policy = buildContentSecurityPolicy({
        NODE_ENV: 'development',
        NEXT_PUBLIC_SUPABASE_URL: url,
      });
      expect(directive(policy, 'connect-src')).toBe("connect-src 'self'");
    }
  });

  it('widens only connect-src for the local Supabase origin', () => {
    // Nothing in the app loads images from, or frames, the Supabase origin, so
    // those directives stay strict — the fix is scoped to the blocked requests.
    const policy = buildContentSecurityPolicy(localEnvironment);

    expect(directive(policy, 'default-src')).toBe("default-src 'self'");
    expect(directive(policy, 'img-src')).toBe("img-src 'self' data:");
    expect(directive(policy, 'frame-src')).toBe("frame-src 'self'");
    expect(directive(policy, 'font-src')).toBe("font-src 'self'");
    expect(directive(policy, 'object-src')).toBe("object-src 'none'");
    expect(directive(policy, 'base-uri')).toBe("base-uri 'self'");
    expect(directive(policy, 'frame-ancestors')).toBe("frame-ancestors 'self'");
  });
});
