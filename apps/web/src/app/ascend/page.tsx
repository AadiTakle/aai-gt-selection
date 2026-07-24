import type { Metadata } from 'next';

import { AscendFlow } from '@/components/exam/ascend-flow';
import { EXAM_NAME } from '@/lib/exam/branding';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `${EXAM_NAME} adaptive assessment (prototype)`,
  description: `Born-synthetic ${EXAM_NAME} adaptive screening demo. Not a validated determination.`,
};

/**
 * Self-contained {EXAM_NAME} demo flow (D-016, R11): payment -> adaptive battery
 * -> result, launched from the family journey's assessment step. Born-synthetic,
 * loopback-only; establishes the trusted synthetic proctor session internally.
 */
export default function AscendPage() {
  return <AscendFlow />;
}
