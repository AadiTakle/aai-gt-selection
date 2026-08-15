import {
  getApplicationResponseSchema,
  getStudentProfileResponseSchema,
  listActiveSchoolsResponseSchema,
  listStudentProfilesResponseSchema,
  saveApplicationDraftResponseSchema,
  saveStudentProfileResponseSchema,
  submitApplicationResponseSchema,
} from '@gt-selection/contracts';
import { describe, expect, it } from 'vitest';

import {
  activeSyntheticSchoolsResponseFixture,
  applicationReviewResponseFixture,
  savedApplicationDraftResponseFixture,
  savedStudentProfileResponseFixture,
  studentProfilesResponseFixture,
  submittedApplicationResponseFixture,
  syntheticOtherSchoolApplicationDraft,
  syntheticPartialApplicationDraft,
  syntheticSecondStudentProfile,
  syntheticStudentProfile,
  syntheticStudentProfileResponseFixture,
} from './index';

describe('Milestone A onboarding fixtures', () => {
  it('provides two reusable synthetic student profiles', () => {
    expect(saveStudentProfileResponseSchema.parse(savedStudentProfileResponseFixture)).toEqual(
      savedStudentProfileResponseFixture,
    );
    expect(getStudentProfileResponseSchema.parse(syntheticStudentProfileResponseFixture)).toEqual(
      syntheticStudentProfileResponseFixture,
    );
    expect(listStudentProfilesResponseSchema.parse(studentProfilesResponseFixture)).toEqual(
      studentProfilesResponseFixture,
    );
    expect(studentProfilesResponseFixture.data.profiles).toHaveLength(2);
    expect(syntheticSecondStudentProfile.profileId).not.toBe(syntheticStudentProfile.profileId);
  });

  it('provides a minimized active synthetic school directory', () => {
    expect(listActiveSchoolsResponseSchema.parse(activeSyntheticSchoolsResponseFixture)).toEqual(
      activeSyntheticSchoolsResponseFixture,
    );
    expect(activeSyntheticSchoolsResponseFixture.data.schools).toHaveLength(2);
  });

  it('provides partial and other-school autosave examples', () => {
    expect(syntheticPartialApplicationDraft.finalSubmission).toBeUndefined();
    expect(syntheticOtherSchoolApplicationDraft.school?.selectionKind).toBe('other');
    expect(JSON.stringify(syntheticOtherSchoolApplicationDraft)).not.toMatch(
      /essay|enrollmentDate|priorSchools|w2|document/i,
    );
  });

  it('provides save, reload/review, and immutable submit envelopes', () => {
    expect(saveApplicationDraftResponseSchema.parse(savedApplicationDraftResponseFixture)).toEqual(
      savedApplicationDraftResponseFixture,
    );
    expect(getApplicationResponseSchema.parse(applicationReviewResponseFixture)).toEqual(
      applicationReviewResponseFixture,
    );
    expect(submitApplicationResponseSchema.parse(submittedApplicationResponseFixture)).toEqual(
      submittedApplicationResponseFixture,
    );
    expect(applicationReviewResponseFixture.data.profile.profileVersionId).toBe(
      applicationReviewResponseFixture.data.application.studentProfileVersionId,
    );
  });
});
