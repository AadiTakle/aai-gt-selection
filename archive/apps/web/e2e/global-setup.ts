import { createClient } from '@supabase/supabase-js';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * Playwright global setup: sign in the seeded synthetic family user against the
 * local Supabase and persist a storageState containing the @supabase/ssr auth
 * cookies. The family onboarding spec loads this state so requests arrive
 * authenticated as { user_role: 'family', synthetic_only: true }.
 *
 * Runs only in the CI web-smoke job / a local run with Supabase up. If it can't
 * reach Supabase it writes an empty state and the auth-gated specs skip.
 */

export const STORAGE_STATE = 'e2e/.auth/family.json';
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000';

function readSupabaseEnv(): { url: string; anonKey: string } | null {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !anonKey) {
    const result = spawnSync('pnpm', ['exec', 'supabase', 'status', '-o', 'json'], {
      encoding: 'utf8',
    });
    if (result.status !== 0) return null;
    try {
      const status = JSON.parse(result.stdout) as { API_URL?: string; ANON_KEY?: string };
      url = url ?? status.API_URL;
      anonKey = anonKey ?? status.ANON_KEY;
    } catch {
      return null;
    }
  }
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

function writeEmptyState() {
  mkdirSync(dirname(STORAGE_STATE), { recursive: true });
  writeFileSync(STORAGE_STATE, JSON.stringify({ cookies: [], origins: [] }));
}

export default async function globalSetup() {
  const env = readSupabaseEnv();
  if (!env) {
    writeEmptyState();
    return;
  }

  const supabase = createClient(env.url, env.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'family@example.test',
    password: 'Synthetic-Only-2026!',
  });
  if (error || !data.session) {
    writeEmptyState();
    return;
  }

  // @supabase/ssr stores the session as a JSON cookie named sb-<ref>-auth-token.
  // For local Supabase the project ref segment is "127" (from the host).
  const host = new URL(BASE_URL).hostname;
  const cookieValue = encodeURIComponent(
    JSON.stringify({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      expires_in: data.session.expires_in,
      token_type: 'bearer',
      user: data.session.user,
    }),
  );

  mkdirSync(dirname(STORAGE_STATE), { recursive: true });
  writeFileSync(
    STORAGE_STATE,
    JSON.stringify({
      cookies: [
        {
          name: 'sb-127-auth-token',
          value: cookieValue,
          domain: host,
          path: '/',
          expires: data.session.expires_at ?? -1,
          httpOnly: false,
          secure: false,
          sameSite: 'Lax',
        },
      ],
      origins: [],
    }),
  );
}
