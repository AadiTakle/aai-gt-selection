import { NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Sign the current session out and return to the login page.
 *
 * The redirect target is a RELATIVE location on purpose: behind the App Runner
 * proxy the container only sees its internal bind address, so
 * `request.nextUrl.origin` resolves to `http://0.0.0.0:3000` and an absolute
 * redirect sends the browser to a host it can't reach. A relative `Location` is
 * resolved by the browser against the address-bar URL (the real public host),
 * so it works in every environment without trusting a forwarded-host header.
 */
export async function POST() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return new NextResponse(null, { status: 303, headers: { Location: '/login' } });
}
