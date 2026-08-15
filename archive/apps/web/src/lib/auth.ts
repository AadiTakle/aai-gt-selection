import type { UserRole } from '@gt-selection/contracts';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { parseUserRoleClaim } from '@/lib/role-claims';
import { createSupabaseServerClient } from '@/lib/supabase/server';

async function loginRedirectTarget(): Promise<string> {
  // the proxy stamps the attempted path onto x-pathname so we can send the
  // visitor back to it after they sign in
  const pathname = (await headers()).get('x-pathname');
  if (pathname && pathname.startsWith('/') && pathname !== '/login') {
    return `/login?redirect=${encodeURIComponent(pathname)}`;
  }
  return '/login';
}

export async function requireRole(allowedRoles: readonly UserRole[]) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  const parsedRole = parseUserRoleClaim(data?.claims);

  if (error || !data || !parsedRole.success || !allowedRoles.includes(parsedRole.data)) {
    redirect(await loginRedirectTarget());
  }

  return {
    claims: data.claims,
    userRole: parsedRole.data,
  };
}
