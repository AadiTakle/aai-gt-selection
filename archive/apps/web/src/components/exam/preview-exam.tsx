'use client';

import { useSyncExternalStore } from 'react';

import { fromSyntheticName } from '@/lib/family/synthetic';
import { PREVIEW_STATE_KEY } from '@/lib/family/storage';
import { EXAM_SURFACES, type ExamSurfaceId } from '@/lib/exam/surfaces';
import type { WizardState } from '@/lib/family/wizard-types';

import { ExamRunner } from './exam-runner';

/**
 * Shared entry wrapper for the adaptive screener, used by BOTH the authenticated
 * `/family/exam` route and the unauthenticated `/dev/family-preview/exam` one, so
 * the two never diverge. Reads the synthetic student name from the saved wizard
 * state (same source the dashboard uses) and hands it to the exam runner. Uses
 * useSyncExternalStore so the server render and first client render agree (no
 * hydration mismatch), then reflects the stored name once mounted. Results POST
 * to /api/exam-results either way.
 */

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  return () => window.removeEventListener('storage', onChange);
}

let cachedRaw: string | null = null;
let cachedName = 'there';
function getName(): string {
  const raw = window.localStorage.getItem(PREVIEW_STATE_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      const state = raw ? (JSON.parse(raw) as WizardState) : null;
      cachedName = fromSyntheticName(state?.student?.name) || 'there';
    } catch {
      cachedName = 'there';
    }
  }
  return cachedName;
}

export function PreviewExam({
  dashboardHref,
  surfaceId = 'assessment',
}: {
  dashboardHref: string;
  /**
   * Which front door to render, BY NAME. Omitted means the admissions battery.
   *
   * A name rather than the surface itself because the callers are server components and a surface
   * carries functions, which cannot cross into a client component.
   */
  surfaceId?: ExamSurfaceId;
}) {
  const studentName = useSyncExternalStore(subscribe, getName, () => 'there');
  return (
    <ExamRunner
      studentName={studentName}
      dashboardHref={dashboardHref}
      surface={EXAM_SURFACES[surfaceId]}
    />
  );
}
