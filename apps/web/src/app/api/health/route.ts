import { NextResponse } from 'next/server';

import { getServerEnvironment } from '@/lib/env';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const environment = getServerEnvironment();
    const response = await fetch(`${environment.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
      cache: 'no-store',
      headers: {
        apikey: environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}`,
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
