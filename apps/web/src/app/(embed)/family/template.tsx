import type { ReactNode } from 'react';

import { PageFade } from '@/components/family/page-fade';

// A template re-mounts on every navigation within /family/*, so each step of
// the onboarding flow fades into the next instead of hard-cutting.
export default function FamilyTemplate({ children }: { children: ReactNode }) {
  return <PageFade>{children}</PageFade>;
}
