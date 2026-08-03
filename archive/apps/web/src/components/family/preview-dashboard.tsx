'use client';

import { useSyncExternalStore } from 'react';

import type { StatusProjection } from '@gt-selection/contracts';

import { fromSyntheticName } from '@/lib/family/synthetic';
import { PREVIEW_STATE_KEY } from '@/lib/family/storage';
import type { WizardState } from '@/lib/family/wizard-types';

import { FamilyDashboard } from './family-dashboard';

/**
 * Dev-only dashboard wrapper. The real dashboard reads status from the backend;
 * with no backend in preview, we derive it from the wizard state the family
 * saved in localStorage — so submitting the application actually advances the
 * dashboard to the assessment phase instead of showing a canned status.
 */

const DRAFT_STATUS: StatusProjection = {
  workflowStatus: 'application_draft',
  displayLabelCode: 'STATUS_APPLICATION_DRAFT',
  phase: 'application',
  familyActionRequired: true,
  nextActionCode: 'COMPLETE_APPLICATION',
  deadline: null,
  pendingReason: null,
  claimBoundaryCode: 'ELIGIBILITY_NOT_ADMISSION',
};

const SUBMITTED_STATUS: StatusProjection = {
  workflowStatus: 'awaiting_assessment',
  displayLabelCode: 'STATUS_AWAITING_ASSESSMENT',
  phase: 'assessment',
  familyActionRequired: false,
  nextActionCode: 'AWAIT_ASSESSMENT',
  deadline: null,
  pendingReason: null,
  claimBoundaryCode: 'ELIGIBILITY_NOT_ADMISSION',
};

// assessment finished → under review (eligibility-only; never "admitted")
const ASSESSED_STATUS: StatusProjection = {
  workflowStatus: 'review_pending_internal_action',
  displayLabelCode: 'STATUS_UNDER_REVIEW',
  phase: 'review',
  familyActionRequired: false,
  nextActionCode: 'AWAIT_REVIEW',
  deadline: null,
  pendingReason: null,
  claimBoundaryCode: 'ELIGIBILITY_NOT_ADMISSION',
};

const EXAM_RESULTS_KEY = 'gt-exam-results';

type Snapshot = { state: WizardState | null; examDone: boolean };

// subscribe to cross-tab storage changes so submitting in the wizard / finishing
// the exam and returning here reflects immediately; SSR uses the fresh view.
function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  return () => window.removeEventListener('storage', onChange);
}

// useSyncExternalStore requires a stable snapshot: cache by the raw strings and
// only rebuild the object when either underlying value actually changes.
let cachedStateRaw: string | null = null;
let cachedExamRaw: string | null = null;
let cachedSnapshot: Snapshot = { state: null, examDone: false };
function getSnapshot(): Snapshot {
  const stateRaw = window.localStorage.getItem(PREVIEW_STATE_KEY);
  const examRaw = window.localStorage.getItem(EXAM_RESULTS_KEY);
  if (stateRaw !== cachedStateRaw || examRaw !== cachedExamRaw) {
    cachedStateRaw = stateRaw;
    cachedExamRaw = examRaw;
    let state: WizardState | null = null;
    try {
      state = stateRaw ? (JSON.parse(stateRaw) as WizardState) : null;
    } catch {
      state = null;
    }
    cachedSnapshot = { state, examDone: examRaw != null };
  }
  return cachedSnapshot;
}

const SERVER_SNAPSHOT: Snapshot = { state: null, examDone: false };

export function PreviewDashboard({
  applyHref,
  assessmentHref,
}: {
  applyHref: string;
  assessmentHref: string;
}) {
  // read the saved wizard + exam state on the client; SSR falls back to fresh
  const { state, examDone } = useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAPSHOT);

  const submitted = state?.submitted === true;
  const studentName = fromSyntheticName(state?.student?.name) || 'Your student';
  const status =
    examDone && submitted ? ASSESSED_STATUS : submitted ? SUBMITTED_STATUS : DRAFT_STATUS;

  return (
    <FamilyDashboard
      studentName={studentName}
      status={status}
      applyHref={applyHref}
      assessmentHref={assessmentHref}
    />
  );
}
