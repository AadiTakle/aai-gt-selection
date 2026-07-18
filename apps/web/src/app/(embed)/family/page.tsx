import { SurfacePlaceholder } from '@/components/surface-placeholder';
import { requireRole } from '@/lib/auth';

export default async function FamilyPage() {
  await requireRole(['family']);

  return (
    <SurfacePlaceholder
      description="Reserved for synthetic application, status, Snapshot, and factual-correction flows."
      title="Family Application Portal"
    />
  );
}
