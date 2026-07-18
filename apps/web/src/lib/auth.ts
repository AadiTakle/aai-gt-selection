import type { UserRole } from '@gt-selection/contracts';
import { redirect } from 'next/navigation';

import { parseUserRoleClaim } from '@/lib/role-claims';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function requireRole(allowedRoles: readonly UserRole[]) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  const parsedRole = parseUserRoleClaim(data?.claims);

  if (error || !data || !parsedRole.success || !allowedRoles.includes(parsedRole.data)) {
    redirect('/?auth=required');
  }

  return {
    claims: data.claims,
    userRole: parsedRole.data,
  };
}
