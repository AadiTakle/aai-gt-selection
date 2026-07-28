import {
  syntheticApplicationDraft,
  syntheticStudentProfile,
  syntheticTrackBApplication,
} from '@gt-selection/test-fixtures';
import { describe, expect, it } from 'vitest';

import { createInitialWizardState, hydrateWizardState, wizardReducer } from './wizard-reducer';

function seed() {
  return createInitialWizardState({
    profileId: '11111111-1111-4111-8111-111111111111',
    applicationId: '22222222-2222-4222-8222-222222222222',
    correlationId: '33333333-3333-4333-8333-333333333333',
  });
}

describe('wizardReducer', () => {
  it('patches nested student fields immutably', () => {
    const state = seed();
    const next = wizardReducer(state, { type: 'setStudent', patch: { name: 'Rivera' } });
    expect(next.student.name).toBe('Rivera');
    expect(state.student.name).toBe(''); // original untouched
  });

  it('advances version + id after a profile save', () => {
    const state = seed();
    const next = wizardReducer(state, {
      type: 'profileSaved',
      profileVersion: 1,
      studentProfileVersionId: '44444444-4444-4444-8444-444444444444',
    });
    expect(next.meta.profileVersion).toBe(1);
    expect(next.meta.studentProfileVersionId).toBe('44444444-4444-4444-8444-444444444444');
  });

  it('tracks application version progression after a draft save', () => {
    const state = seed();
    const next = wizardReducer(state, {
      type: 'draftSaved',
      applicationVersion: 3,
      applicationVersionId: '55555555-5555-4555-8555-555555555555',
    });
    expect(next.meta.applicationVersion).toBe(3);
    expect(next.meta.applicationVersionId).toBe('55555555-5555-4555-8555-555555555555');
  });

  it('adopts fresh ids + versions when the server heals a stale application', () => {
    // submit ran server-side, hit a stale/cross-account application, and restarted
    // under fresh ids — state.meta must switch to the ids it actually persisted.
    const state = seed();
    const next = wizardReducer(state, {
      type: 'identityReconciled',
      profileId: '66666666-6666-4666-8666-666666666666',
      applicationId: '77777777-7777-4777-8777-777777777777',
      profileVersion: 1,
      studentProfileVersionId: '88888888-8888-4888-8888-888888888888',
      applicationVersion: 2,
      applicationVersionId: '99999999-9999-4999-8999-999999999999',
    });
    expect(next.meta.profileId).toBe('66666666-6666-4666-8666-666666666666');
    expect(next.meta.applicationId).toBe('77777777-7777-4777-8777-777777777777');
    expect(next.meta.profileVersion).toBe(1);
    expect(next.meta.applicationVersion).toBe(2);
    expect(next.meta.applicationVersionId).toBe('99999999-9999-4999-8999-999999999999');
    // original untouched (immutability)
    expect(state.meta.profileId).toBe('11111111-1111-4111-8111-111111111111');
  });

  it('hydrates the submitted flag from the application state so a reload stays locked', () => {
    // a submitted application must resume into the read-only LockedReview, not
    // the editable wizard
    const submitted = hydrateWizardState(
      seed(),
      syntheticStudentProfile,
      syntheticTrackBApplication,
    );
    expect(submitted.submitted).toBe(true);

    const draft = hydrateWizardState(seed(), syntheticStudentProfile, syntheticApplicationDraft);
    expect(draft.submitted).toBe(false);
  });

  it('rehydrates the signature from a submitted application so Make edits keeps it', () => {
    // finalSubmission carries the signature; the family shouldn't have to re-sign
    const state = hydrateWizardState(seed(), syntheticStudentProfile, syntheticTrackBApplication);
    const fs = syntheticTrackBApplication.finalSubmission;
    expect(state.signature.accuracyAcknowledged).toBe(fs.accuracyAcknowledged);
    expect(state.signature.referralSourceCode).toBe(fs.referralSourceCode);
    // signature name is stripped of the synthetic prefix for display
    expect(state.signature.signatureName).toBe('Guardian One');
  });

  it('round-trips a verbatim guardian name through hydrate', () => {
    const profileWithGuardian = {
      ...syntheticStudentProfile,
      household: { ...syntheticStudentProfile.household, guardianName: 'Jordan Rivera' },
    };
    const state = hydrateWizardState(seed(), profileWithGuardian, syntheticApplicationDraft);
    // real name, stored verbatim — no prefix strip
    expect(state.household.guardianName).toBe('Jordan Rivera');

    // absent guardian name hydrates to an empty string (back-compat)
    const noGuardian = hydrateWizardState(
      seed(),
      syntheticStudentProfile,
      syntheticApplicationDraft,
    );
    expect(noGuardian.household.guardianName).toBe('');
  });

  it('records save errors', () => {
    const state = seed();
    const next = wizardReducer(state, {
      type: 'setSaveState',
      saveState: 'error',
      error: 'STALE_VERSION',
    });
    expect(next.saveState).toBe('error');
    expect(next.saveError).toBe('STALE_VERSION');
  });
});
