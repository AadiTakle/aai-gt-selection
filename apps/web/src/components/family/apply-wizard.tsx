'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  getApplicationAction,
  saveApplicationDraftAction,
  saveStudentProfileAction,
  submitApplicationAction,
} from '@/lib/onboarding/actions';
import { toApplicationDraft, toStudentProfileContent } from '@/lib/family/draft-mapper';
import { completedSteps, isSectionComplete, overallProgress } from '@/lib/family/progress';
import {
  readPreviewState,
  readStoredApplication,
  storeApplication,
  writePreviewState,
} from '@/lib/family/storage';
import { useDebouncedCallback } from '@/lib/family/use-debounced';
import {
  createInitialWizardState,
  hydrateWizardState,
  wizardReducer,
} from '@/lib/family/wizard-reducer';
import { STEP_ORDER, type WizardState } from '@/lib/family/wizard-types';

import { LockedReview } from './locked-review';
import { PageFade } from './page-fade';
import { ProgressGauge } from './progress-gauge';
import {
  StepEducationalBackground,
  StepFinancialIntake,
  StepHouseholdLanguage,
  StepReviewSignature,
  StepStudentProfile,
  StepSupportDisclosure,
} from './steps';
import styles from './apply-wizard.module.css';

const STEP_META: { code: (typeof STEP_ORDER)[number]; label: string; sub: string }[] = [
  { code: 'STUDENT_PROFILE', label: 'Student information', sub: 'Name, birthdate, grade' },
  { code: 'EDUCATIONAL_BACKGROUND', label: 'Educational background', sub: 'Current school' },
  { code: 'SUPPORT_DISCLOSURE', label: 'Support & disclosures', sub: 'Accommodations, plans' },
  { code: 'HOUSEHOLD_LANGUAGE', label: 'Family & language', sub: 'Household, relatives' },
  { code: 'FINANCIAL_INTAKE', label: 'Financial intake', sub: 'Household, income' },
  { code: 'REVIEW_SIGNATURE', label: 'Review & sign', sub: 'Acknowledge, submit' },
];

type ApplyWizardProps = {
  /** Dev-only: render + interact fully without calling the (down) backend. */
  preview?: boolean;
  /** Base path for the family portal (real routes vs. dev preview routes). */
  basePath?: string;
};

function newUuid(): string {
  return crypto.randomUUID();
}

function seedIds() {
  const stored = readStoredApplication();
  return {
    profileId: stored?.profileId ?? newUuid(),
    applicationId: stored?.applicationId ?? newUuid(),
    correlationId: newUuid(),
  };
}

export function ApplyWizard({ preview = false, basePath = '/family' }: ApplyWizardProps) {
  const router = useRouter();
  const dashboardHref = `${basePath}/dashboard`;
  const [state, dispatch] = useReducer(wizardReducer, undefined, () => {
    // preview keeps everything in localStorage so Review→back never loses data
    if (preview) {
      const saved = readPreviewState<WizardState>();
      if (saved) return saved;
    }
    return createInitialWizardState(seedIds());
  });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // once submitted, show the locked read-only review until the family chooses
  // to make edits (which re-opens the editable wizard)
  const [editing, setEditing] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const inFlight = useRef(false);

  const overall = useMemo(() => overallProgress(state), [state]);
  const doneCount = STEP_ORDER.filter((step) => isSectionComplete(state, step)).length;

  // Persist the profile once step 1 is complete, then keep the application draft
  // saved. Sequencing matters: the draft needs a studentProfileVersionId.
  const save = useCallback(
    async (snapshot: WizardState) => {
      if (preview) {
        // preview mode: simulate a save without touching the backend
        dispatch({ type: 'setSaveState', saveState: 'saved' });
        return;
      }
      if (inFlight.current) return;
      if (!isSectionComplete(snapshot, 'STUDENT_PROFILE')) return; // nothing to persist yet
      inFlight.current = true;
      dispatch({ type: 'setSaveState', saveState: 'saving' });
      try {
        let profileVersionId = snapshot.meta.studentProfileVersionId;
        let profileVersion = snapshot.meta.profileVersion;

        // 1) ensure a saved profile version exists / is current
        const profileResult = await saveStudentProfileAction({
          profileId: snapshot.meta.profileId,
          profile: toStudentProfileContent(snapshot),
          expectedVersion: profileVersion,
          idempotencyKey: newUuid(),
          correlationId: snapshot.meta.correlationId,
        });
        profileVersionId = profileResult.data.profile.profileVersionId;
        profileVersion = profileResult.data.profile.version;
        dispatch({
          type: 'profileSaved',
          profileVersion,
          studentProfileVersionId: profileVersionId,
        });

        // 2) save the application draft bound to that profile version
        const draftResult = await saveApplicationDraftAction({
          applicationId: snapshot.meta.applicationId,
          studentProfileVersionId: profileVersionId,
          draft: toApplicationDraft(snapshot, { includeFinalSubmission: false }),
          expectedVersion: snapshot.meta.applicationVersion,
          idempotencyKey: newUuid(),
          correlationId: snapshot.meta.correlationId,
        });
        dispatch({
          type: 'draftSaved',
          applicationVersion: draftResult.data.application.version,
          applicationVersionId: draftResult.data.application.applicationVersionId,
        });
        // remember these ids so the dashboard + resume can find this application
        storeApplication({
          profileId: snapshot.meta.profileId,
          applicationId: snapshot.meta.applicationId,
        });
        dispatch({ type: 'setSaveState', saveState: 'saved' });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'SAVE_FAILED';
        dispatch({ type: 'setSaveState', saveState: 'error', error: message });
      } finally {
        inFlight.current = false;
      }
    },
    [preview],
  );

  const debouncedSave = useDebouncedCallback((snapshot: WizardState) => {
    void save(snapshot);
  }, 1200);

  // schedule autosave with the latest state; fires on blur out of any field
  const lastSnapshot = useRef(state);
  useEffect(() => {
    lastSnapshot.current = state;
    // preview: persist the whole state so leaving and returning keeps answers
    if (preview) writePreviewState(state);
  }, [state, preview]);
  const scheduleSave = useCallback(() => {
    debouncedSave(lastSnapshot.current);
  }, [debouncedSave]);

  // resume: if this browser already created an application, hydrate from it
  const resumeTried = useRef(false);
  useEffect(() => {
    if (resumeTried.current || preview) return;
    resumeTried.current = true;
    const stored = readStoredApplication();
    if (!stored) return;
    void (async () => {
      try {
        const result = await getApplicationAction({
          applicationId: stored.applicationId,
          correlationId: state.meta.correlationId,
        });
        const hydrated = hydrateWizardState(
          createInitialWizardState({
            profileId: stored.profileId,
            applicationId: stored.applicationId,
            correlationId: state.meta.correlationId,
          }),
          result.data.profile,
          result.data.application,
        );
        dispatch({ type: 'hydrate', state: hydrated });
      } catch {
        // no resumable application (e.g. fresh id) — keep the empty form
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function scrollToStep(code: string) {
    sectionRefs.current[code]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function handleSubmit() {
    setSubmitError(null);
    // require all six sections truly complete
    const done = completedSteps(state);
    if (done.length !== STEP_ORDER.length) {
      setSubmitError('Please complete every section before submitting.');
      return;
    }
    setSubmitting(true);
    if (preview) {
      // preview mode: skip the backend, lock the answers, and land on the dashboard
      dispatch({ type: 'submitted' });
      setEditing(false);
      router.push(dashboardHref);
      return;
    }
    try {
      // save the final submission block as a draft, then submit that version
      const draftResult = await saveApplicationDraftAction({
        applicationId: state.meta.applicationId,
        studentProfileVersionId: state.meta.studentProfileVersionId!,
        draft: toApplicationDraft(state, { includeFinalSubmission: true }),
        expectedVersion: state.meta.applicationVersion,
        idempotencyKey: newUuid(),
        correlationId: state.meta.correlationId,
      });
      const versionId = draftResult.data.application.applicationVersionId;
      await submitApplicationAction({
        applicationVersionId: versionId,
        expectedVersion: draftResult.data.application.version,
        idempotencyKey: newUuid(),
        correlationId: state.meta.correlationId,
      });
      dispatch({ type: 'submitted' });
      setEditing(false);
      router.push(dashboardHref);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'SUBMIT_FAILED';
      if (message === 'SUBMISSION_LOCKED') {
        router.push(dashboardHref);
        return;
      }
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }

  const stepBodies = {
    STUDENT_PROFILE: <StepStudentProfile state={state} dispatch={dispatch} />,
    EDUCATIONAL_BACKGROUND: <StepEducationalBackground state={state} dispatch={dispatch} />,
    SUPPORT_DISCLOSURE: <StepSupportDisclosure state={state} dispatch={dispatch} />,
    HOUSEHOLD_LANGUAGE: <StepHouseholdLanguage state={state} dispatch={dispatch} />,
    FINANCIAL_INTAKE: <StepFinancialIntake state={state} dispatch={dispatch} />,
    REVIEW_SIGNATURE: <StepReviewSignature state={state} dispatch={dispatch} />,
  } as const;

  // after submission, show the locked read-only answers until "Make edits".
  // key the fade wrapper so switching views cross-fades instead of hard-cutting.
  if (state.submitted && !editing) {
    return (
      <PageFade key="locked">
        <LockedReview state={state} onEdit={() => setEditing(true)} dashboardHref={dashboardHref} />
      </PageFade>
    );
  }

  return (
    <PageFade key="wizard">
      {/* marker used by globals.css to shift the header logo clear of the fixed sidebar */}
      <div className={`${styles.shell} wizard-shell`} onBlurCapture={scheduleSave}>
        <aside className={styles.sidebar}>
          <div className={styles.brand}>
            <span className={styles.wordmark}>
              GT<span className={styles.school}> SCHOOL</span>
            </span>
          </div>
          <a className={styles.backToPortal} href={dashboardHref}>
            ← Back to portal
          </a>
          <nav className={styles.nav} aria-label="Application sections">
            {STEP_META.map((meta, index) => {
              const done = isSectionComplete(state, meta.code);
              return (
                <button
                  key={meta.code}
                  type="button"
                  className={styles.step}
                  onClick={() => scrollToStep(meta.code)}
                >
                  <span className={done ? `${styles.idx} ${styles.idxDone}` : styles.idx}>
                    {done ? '✓' : index + 1}
                  </span>
                  <span className={styles.stepLabel}>
                    {meta.label}
                    <span className={styles.stepSub}>{meta.sub}</span>
                  </span>
                </button>
              );
            })}
          </nav>
          <div className={styles.gaugeWrap}>
            <ProgressGauge
              overall={overall}
              remainingLabel={`${STEP_ORDER.length - doneCount} sections left`}
            />
          </div>
        </aside>

        <main className={styles.canvas}>
          <p className={styles.eyebrow}>Family application · Fall 2027</p>
          <h1 className={styles.title}>Let’s complete your application</h1>
          <p className={styles.intro}>
            Everything saves as you go. Scroll through each section — you can jump back anytime from
            the left.
          </p>
          {state.saveState === 'error' ? (
            <p className={styles.saveError} role="status">
              We couldn’t autosave your latest changes. They’re still here — we’ll retry as you
              continue.
            </p>
          ) : null}

          {STEP_META.map((meta, index) => (
            <section
              key={meta.code}
              className={styles.section}
              ref={(el) => {
                sectionRefs.current[meta.code] = el;
              }}
            >
              <header className={styles.sectionHead}>
                <span className={styles.sectionNum}>{String(index + 1).padStart(2, '0')}</span>
                <h2 className={styles.sectionTitle}>{meta.label}</h2>
              </header>
              {stepBodies[meta.code]}
            </section>
          ))}

          <div className={styles.actions}>
            {submitError ? <p className={styles.saveError}>{submitError}</p> : null}
            <button
              type="button"
              className={styles.submit}
              disabled={submitting || doneCount !== STEP_ORDER.length}
              onClick={handleSubmit}
            >
              {submitting ? 'Submitting…' : 'Sign & submit application'}
            </button>
            <p className={styles.boundary}>
              Eligibility only. No live admissions, allocation, or program-effect claim.
            </p>
          </div>
        </main>
      </div>
    </PageFade>
  );
}
