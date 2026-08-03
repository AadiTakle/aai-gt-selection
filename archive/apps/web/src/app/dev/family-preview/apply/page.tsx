import { notFound } from 'next/navigation';

import { ApplyWizard } from '@/components/family/apply-wizard';

// Dev-only: the full apply wizard in preview mode (no backend, no auth).
export default function FamilyApplyPreview() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <ApplyWizard preview basePath="/dev/family-preview" />;
}
