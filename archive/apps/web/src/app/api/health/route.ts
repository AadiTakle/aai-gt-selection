import { NextResponse } from 'next/server';

import { getServerEnvironment } from '@/lib/env';
import { examBankHealth } from '@/lib/exam/bank-loader';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const environment = getServerEnvironment();
    // The item bank is read from `research/` at runtime and reaches a container only through
    // Next's file tracing. Report it here so an image that shipped without it fails the Docker
    // HEALTHCHECK immediately instead of serving an exam with nothing in it.
    const bank = examBankHealth();
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

    // The detail names container paths, and this endpoint is unauthenticated, so it goes to the
    // log an operator already has rather than into the response body.
    if (!bank.ready) console.error('[health] exam item bank not ready:', bank.detail);

    const ready = response.ok && bank.ready;
    return NextResponse.json(
      {
        application: 'ready',
        databaseApi: response.ok ? 'ready' : 'not_ready',
        examItemBank: bank.ready ? 'ready' : 'not_ready',
        status: ready ? 'ready' : 'degraded',
        syntheticOnly: true,
      },
      { status: ready ? 200 : 503 },
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
