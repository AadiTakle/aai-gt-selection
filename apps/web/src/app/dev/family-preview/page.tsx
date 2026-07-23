import { notFound } from 'next/navigation';

import { FamilyLanding } from '@/components/family/family-landing';

// Dev-only visual preview of the family portal, with NO auth gate and NO
// backend calls, so the UI can be viewed without Docker/Supabase running.
export default function FamilyPreviewIndex() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <FamilyLanding hasApplication={false} basePath="/dev/family-preview" />;
}
