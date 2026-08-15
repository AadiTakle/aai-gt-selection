import { NextResponse, type NextRequest } from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Magic-link / OTP callback. Supabase (@supabase/ssr, PKCE) sends the user here
 * with a `code`; we exchange it for a session (cookies set server-side) and
 * then bounce to the requested path or the family portal.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const redirectParam = searchParams.get('redirect');
  const safeRedirect =
    redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//')
      ? redirectParam
      : '/family';

  // Relative redirects on purpose: behind the App Runner proxy the container
  // sees only its internal bind address, so `request.nextUrl.origin` is
  // `http://0.0.0.0:3000`. A relative `Location` is resolved by the browser
  // against the public URL it actually requested, so post-auth bounces land on
  // the real host in every environment. See auth/signout/route.ts.
  const bounce = (location: string) =>
    new NextResponse(null, { status: 303, headers: { Location: location } });

  if (!code) {
    return bounce('/login?auth=link_invalid');
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return bounce('/login?auth=link_invalid');
  }

  return bounce(safeRedirect);
}
