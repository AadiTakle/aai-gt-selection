'use client';

import { useSyncExternalStore } from 'react';

import { fromSyntheticName } from '@/lib/family/synthetic';
import { PREVIEW_STATE_KEY } from '@/lib/family/storage';
import type { WizardState } from '@/lib/family/wizard-types';

import { ExamRunner } from './exam-runner';

/**
 * Dev-only wrapper: reads the synthetic student name from the saved wizard state
 * (same source the preview dashboard uses) and hands it to the exam runner. Uses
 * useSyncExternalStore so the server render and first client render agree (no
 * hydration mismatch), then reflects the stored name once mounted. No
 * backend/auth in preview; results still POST to /api/exam-results.
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
  durable = false,
}: {
  dashboardHref: string;
  /** Real family portal passes this to persist results durably to Supabase. */
  durable?: boolean;
}) {
  const studentName = useSyncExternalStore(subscribe, getName, () => 'there');
  return <ExamRunner studentName={studentName} dashboardHref={dashboardHref} durable={durable} />;
}
