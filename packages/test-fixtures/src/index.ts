import type {
  ApplicationVersion,
  AssessmentVersion,
  SnapshotFixtureReference,
  StatusProjection,
  SubmitApplicationResponse,
} from '@gt-selection/contracts';

const provenance = {
  creationMethod: 'independent_synthetic_construction',
  sourceRecordUsed: false,
  reviewedAt: '2026-07-18T12:00:00.000Z',
} as const;

export const syntheticTrackBApplication = {
  applicationId: '00000000-0000-4000-8000-000000000001',
  applicationVersionId: '00000000-0000-4000-8000-000000000101',
  version: 1,
  supersedesId: null,
  state: 'submitted',
  syntheticOnly: true,
  currentGrade: '5',
  requestedGrade: '6',
  requestedEntryYear: 2027,
  contentHash: `sha256:${'1'.repeat(64)}`,
} satisfies ApplicationVersion;

export const syntheticTrackAAssessment = {
  assessmentVersionId: '00000000-0000-4000-8000-000000000201',
  applicationId: syntheticTrackBApplication.applicationId,
  version: 1,
  supersedesId: null,
  instrumentCode: 'COGAT_SYNTHETIC',
  compositeScore: 95,
  verbalScore: 94,
  quantitativeScore: 96,
  nonverbalScore: 95,
  validity: 'valid',
  syntheticOnly: true,
} satisfies AssessmentVersion;

export const syntheticTrackBAssessment = {
  ...syntheticTrackAAssessment,
  assessmentVersionId: '00000000-0000-4000-8000-000000000202',
  compositeScore: 89.5,
  verbalScore: 89,
  quantitativeScore: 90,
  nonverbalScore: 89,
} satisfies AssessmentVersion;

export const syntheticArtifactFixture = {
  fixtureId: 'fixture:artifact-qualifying',
  route: 'artifact',
  domainCode: 'synthetic-mathematics',
  syntheticOnly: true,
  provenance,
} satisfies SnapshotFixtureReference;

export const syntheticNarrativeFixture = {
  fixtureId: 'fixture:narrative-qualifying',
  route: 'narrative',
  domainCode: 'synthetic-music',
  syntheticOnly: true,
  provenance,
} satisfies SnapshotFixtureReference;

export const trackBSnapshotRequiredStatus = {
  workflowStatus: 'track_b_snapshot_required',
  displayLabelCode: 'STATUS_TRACK_B_SNAPSHOT_REQUIRED',
  phase: 'snapshot',
  familyActionRequired: true,
  nextActionCode: 'SUBMIT_SNAPSHOT',
  deadline: null,
  pendingReason: null,
  claimBoundaryCode: 'ELIGIBILITY_NOT_ADMISSION',
} satisfies StatusProjection;

export const submittedApplicationResponseFixture = {
  apiVersion: 'v1',
  syntheticOnly: true,
  data: {
    application: syntheticTrackBApplication,
    status: {
      workflowStatus: 'awaiting_assessment',
      displayLabelCode: 'STATUS_AWAITING_ASSESSMENT',
      phase: 'assessment',
      familyActionRequired: false,
      nextActionCode: 'AWAIT_ASSESSMENT',
      deadline: null,
      pendingReason: null,
      claimBoundaryCode: 'ELIGIBILITY_NOT_ADMISSION',
    },
  },
  meta: {
    correlationId: '00000000-0000-4000-8000-000000000301',
    idempotencyKey: '00000000-0000-4000-8000-000000000302',
    idempotentReplay: false,
  },
} satisfies SubmitApplicationResponse;

export const fictionalFixtures = [
  syntheticTrackBApplication,
  syntheticTrackAAssessment,
  syntheticTrackBAssessment,
  syntheticArtifactFixture,
  syntheticNarrativeFixture,
] as const;
