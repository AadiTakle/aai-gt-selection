import type { ReactNode } from 'react';

import { PageFade } from '@/components/family/page-fade';

// Same fade transition for the dev preview routes.
export default function FamilyPreviewTemplate({ children }: { children: ReactNode }) {
  return <PageFade>{children}</PageFade>;
}
