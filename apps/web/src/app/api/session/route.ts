import { NextResponse } from 'next/server';

import { parseUserRoleClaim } from '@/lib/role-claims';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getClaims();
    const userRole = parseUserRoleClaim(data?.claims);

    if (error || !userRole.success) {
      return NextResponse.json({
        authenticated: false,
        syntheticOnly: true,
      });
    }

    return NextResponse.json({
      authenticated: true,
      syntheticOnly: true,
      userRole: userRole.data,
    });
  } catch {
    return NextResponse.json(
      {
        authenticated: false,
        syntheticOnly: true,
      },
      { status: 503 },
    );
  }
}
