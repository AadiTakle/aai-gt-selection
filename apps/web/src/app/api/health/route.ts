import { NextResponse } from 'next/server';

import { getServerEnvironment } from '@/lib/env';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const environment = getServerEnvironment();
    // Probe the Auth health endpoint rather than the PostgREST root: `/rest/v1/`
    // now returns 401 ("Secret API key required") for publishable/anon keys, which
    // made a healthy deploy report degraded. `/auth/v1/health` returns 200 with a
    // plain apikey header and reliably tracks Supabase reachability.
    const response = await fetch(`${environment.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`, {
      cache: 'no-store',
      headers: {
        apikey: environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      },
      signal: AbortSignal.timeout(2_000),
    });

    return NextResponse.json(
      {
        application: 'ready',
        databaseApi: response.ok ? 'ready' : 'not_ready',
        status: response.ok ? 'ready' : 'degraded',
        syntheticOnly: true,
      },
      { status: response.ok ? 200 : 503 },
    );
  } catch {
    return NextResponse.json(
      {
        application: 'not_ready',
        databaseApi: 'not_ready',
        status: 'not_ready',
        syntheticOnly: true,
      },
      { status: 503 },
    );
  }
}
