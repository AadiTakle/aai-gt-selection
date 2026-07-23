import { FamilyLanding } from '@/components/family/family-landing';
import { requireRole } from '@/lib/auth';

export default async function FamilyPage() {
  await requireRole(['family']);
  // The local-synthetic backend has no "list applications" RPC; the client
  // knows whether a draft exists (localStorage), so the landing offers both
  // start and continue affordances and lets the client resolve which applies.
  return <FamilyLanding hasApplication />;
}
