import { describe, expect, it } from 'vitest';

import { createInitialWizardState, wizardReducer } from './wizard-reducer';

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
