import { SurfacePlaceholder } from '@/components/surface-placeholder';
import { requireRole } from '@/lib/auth';

export default async function AdmissionsPage() {
  await requireRole(['admissions_operator']);

  return (
    <SurfacePlaceholder
      description="Reserved for synthetic assessment entry, routing status, pending work, and corrections."
      title="Admissions Operations Dashboard"
    />
  );
}
