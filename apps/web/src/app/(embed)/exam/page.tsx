import { parseUserRoleClaim } from '@/lib/role-claims';
import { createSupabaseServerClient } from '@/lib/supabase/server';

import { ExamRunner } from './exam-runner';
import { ProctorSignIn } from './proctor-sign-in';

export const dynamic = 'force-dynamic';

/**
 * Adaptive screening surface (AX-05, D-016). Operator-gated. Born-synthetic:
 * the proctor drives a pseudonymous test-taker through an adaptive session.
 */
export default async function ExamPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const parsedRole = parseUserRoleClaim(data?.claims);
  const isOperator = parsedRole.success && parsedRole.data === 'admissions_operator';

  if (!isOperator) {
    return <ProctorSignIn />;
  }

  return <ExamRunner policyVersion="exam-syn-v1" />;
}
