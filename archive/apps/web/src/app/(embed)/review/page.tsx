import { SurfacePlaceholder } from '@/components/surface-placeholder';
import { requireRole } from '@/lib/auth';

export default async function ReviewPage() {
  await requireRole(['reviewer', 'review_supervisor']);

  return (
    <SurfacePlaceholder
      description="Reserved for assigned synthetic evidence and blind rubric review."
      title="Track B Reviewer Workspace"
    />
  );
}
