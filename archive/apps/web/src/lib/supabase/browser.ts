'use client';

import type { Database } from '@gt-selection/db-types';
import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser Supabase client.
 *
 * IMPORTANT: `NEXT_PUBLIC_*` values are only inlined into the client bundle when
 * referenced as LITERAL `process.env.NEXT_PUBLIC_FOO` member expressions. Reading
 * them dynamically (e.g. passing `process.env` into a helper that indexes it)
 * leaves them `undefined` on the client. So we read the literals here directly.
 *
 * The loopback/hosted-mode guard in `env.ts` is a SERVER concern (enforced in the
 * proxy, the server client, the health route, and instrumentation at boot). By
 * the time this runs in the browser, the target is already fixed at build time,
 * so the client only needs to construct with the baked values.
 */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Supabase public environment is missing from the client bundle. Ensure ' +
        'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are set at build time.',
    );
  }
  return createBrowserClient<Database>(url, key);
}
