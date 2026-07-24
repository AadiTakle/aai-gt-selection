'use client';

import type { StatusProjection, WorkflowStatus } from '@gt-selection/contracts';

import { EXAM_NAME } from '@/lib/exam/branding';

import { AssessmentGate } from './assessment-gate';
import { SpiralRing } from './spiral-ring';
import styles from './family-dashboard.module.css';

/** Applicant-safe, eligibility-only status labels (never "admitted"). */
const STATUS_LABEL: Record<WorkflowStatus, string> = {
  application_draft: 'In progress',
  awaiting_assessment: 'Awaiting assessment',
  assessment_needs_correction: 'Needs a correction',
  track_a_eligible: 'Eligible — pathway A',
  track_b_snapshot_required: 'Talent snapshot invited',
  snapshot_under_review: 'Snapshot under review',
  review_pending_family_action: 'Action needed from you',
  review_pending_internal_action: 'Under review',
  track_b_eligible: 'Eligible — pathway B',
  track_b_does_not_currently_qualify: 'Does not currently qualify',
  no_current_pathway: 'No current pathway',
  policy_configuration_pending: 'Awaiting configuration',
};

const PHASE_STEPS = [
  { key: 'application', label: 'Application', detail: 'Family & student details' },
  { key: 'assessment', label: `${EXAM_NAME} assessment`, detail: 'The required next step' },
  { key: 'decision', label: 'Eligibility result', detail: 'Routed automatically' },
] as const;

function phaseIndex(status: StatusProjection): number {
  switch (status.phase) {
    case 'application':
      return 0;
    case 'assessment':
      return 1;
    default:
      return 2;
  }
}

export function FamilyDashboard({
  studentName,
  status,
  applyHref = '/family/apply',
  assessmentHref = '/family/assessment',
}: {
  studentName: string;
  status: StatusProjection;
  applyHref?: string;
  assessmentHref?: string;
}) {
  const submitted = status.workflowStatus !== 'application_draft';
  const activePhase = phaseIndex(status);
  const label = STATUS_LABEL[status.workflowStatus] ?? status.displayLabelCode;
  // journey ratio: how far along the three phases the family is
  const journey = (activePhase + (submitted ? 0.5 : 0.15)) / PHASE_STEPS.length;

  // a hero line that reflects the ACTUAL current step, not a generic message
  function heroLine(): string {
    if (status.familyActionRequired) {
      return status.workflowStatus === 'application_draft'
        ? 'Finish your application to move on to the assessment.'
        : 'There’s a next step waiting for you below.';
    }
    switch (status.phase) {
      case 'assessment':
        return `Next up: complete the ${EXAM_NAME} assessment when you’re ready.`;
      case 'snapshot':
        return 'Your talent snapshot is in progress.';
      case 'review':
        return 'Your application is being reviewed.';
      case 'decision':
        return 'Your eligibility result is ready below.';
      default:
        return 'Let’s get your application started.';
    }
  }

  return (
    <div className={styles.wrap}>
      {/* eye-catching hero with the GT spiral as the journey ring */}
      <section className={styles.hero}>
        <div className={styles.heroInfo}>
          <p className={styles.kicker}>Family portal · Fall 2027</p>
          <h1 className={styles.student}>{studentName}</h1>
          <span className={styles.statusPill}>{label}</span>
          <p className={styles.heroLine}>{heroLine()}</p>
        </div>
        <div className={styles.heroRing}>
          <SpiralRing ratio={journey} size={150} label={`${Math.round(journey * 100)}%`} />
          <span className={styles.ringCaption}>Your journey</span>
        </div>
      </section>

      {/* connected left-to-right pipeline */}
      <div className={styles.pipeline}>
        {PHASE_STEPS.map((step, index) => {
          const state =
            index < activePhase ? 'done' : index === activePhase ? 'active' : 'upcoming';
          return (
            <div key={step.key} className={styles.pipeItem}>
              {index > 0 ? (
                <span
                  className={`${styles.connector} ${index <= activePhase ? styles.connectorOn : ''}`}
                  aria-hidden="true"
                />
              ) : null}
              <div className={`${styles.phaseCard} ${styles[state]}`}>
                <div className={styles.phaseMark}>{state === 'done' ? '✓' : index + 1}</div>
                <p className={styles.phaseLabel}>{step.label}</p>
                <p className={styles.phaseDetail}>{step.detail}</p>
                <p className={styles.phaseState}>
                  {state === 'done' ? 'Complete' : state === 'active' ? 'In progress' : 'Up next'}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* actions: assessment + application review */}
      <div className={styles.grid}>
        <AssessmentGate enabled={submitted} assessmentHref={assessmentHref} />

        <section className={styles.sideCard}>
          <p className={styles.kicker}>Your application</p>
          <p className={styles.sideTitle}>{submitted ? 'Submitted' : 'In progress'}</p>
          <p className={styles.note}>
            {submitted
              ? 'Your application is locked in. You can look back over everything you shared.'
              : 'Pick up right where you left off. Everything saved automatically.'}
          </p>
          <a className={styles.reviewBtn} href={applyHref}>
            {submitted ? 'Review your application →' : 'Continue your application →'}
          </a>
        </section>
      </div>

      <p className={styles.boundary}>
        This is an eligibility status only, not an enrollment or admission decision.
      </p>
    </div>
  );
}
