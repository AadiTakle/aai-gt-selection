import { FamilyLanding } from '@/components/family/family-landing';
import { requireRole } from '@/lib/auth';

export default async function FamilyPage() {
  await requireRole(['family']);
  // The front door always points families to "Start your application" and does
  // not expose a jump-straight-to-dashboard shortcut: a freshly created account
  // has no application, and the apply wizard resumes any in-progress draft from
  // the browser on its own, so a "Continue"/dashboard affordance here would be
  // misleading for new sign-ups.
  return <FamilyLanding hasApplication={false} />;
}
