import { NextResponse, type NextRequest } from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Magic-link / OTP callback. Supabase (@supabase/ssr, PKCE) sends the user here
 * with a `code`; we exchange it for a session (cookies set server-side) and
 * then bounce to the requested path or the family portal.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const redirectParam = searchParams.get('redirect');
  const safeRedirect =
    redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//')
      ? redirectParam
      : '/family';

  if (!code) {
    return NextResponse.redirect(`${origin}/login?auth=link_invalid`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?auth=link_invalid`);
  }

  return NextResponse.redirect(`${origin}${safeRedirect}`);
}
