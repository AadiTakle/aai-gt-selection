import { SurfacePlaceholder } from '@/components/surface-placeholder';
import { requireRole } from '@/lib/auth';

export default async function ConfigAuditPage() {
  await requireRole(['auditor']);

  return (
    <SurfacePlaceholder
      description="Reserved for synthetic policy metadata, decision explanations, replay, and audit views."
      title="Configuration and Audit View"
    />
  );
}
