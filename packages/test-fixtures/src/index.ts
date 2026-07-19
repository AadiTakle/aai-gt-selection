import type {
  ApplicationVersion,
  AssessmentVersion,
  SnapshotFixtureReference,
  StatusProjection,
  RecordAssessmentVersionResponse,
  SubmitApplicationResponse,
  SubmitSnapshotVersionResponse,
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

export const syntheticInvalidAssessment = {
  ...syntheticTrackAAssessment,
  assessmentVersionId: '00000000-0000-4000-8000-000000000203',
  compositeScore: null,
  verbalScore: null,
  quantitativeScore: null,
  nonverbalScore: null,
  validity: 'invalid',
} satisfies AssessmentVersion;

export const syntheticTrackBBothReasonsAssessment = {
  ...syntheticTrackAAssessment,
  assessmentVersionId: '00000000-0000-4000-8000-000000000204',
  compositeScore: 85,
  verbalScore: 91,
  quantitativeScore: 88,
  nonverbalScore: 87,
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

export const pendingAssessmentResponseFixture = {
  apiVersion: 'v1',
  syntheticOnly: true,
  data: {
    assessment: syntheticInvalidAssessment,
    routing: {
      inputHash: `sha256:${'2'.repeat(64)}`,
      trackA: {
        decisionId: '00000000-0000-4000-8000-000000000401',
        decisionKind: 'track_a_eligibility',
        outcome: 'pending',
        pendingReason: 'pending_assessment_correction',
        orderedReasonCodes: ['ASSESSMENT_MISSING_OR_INVALID'],
        resultHash: `sha256:${'3'.repeat(64)}`,
        policyBundleId: 'PB-SYN-01',
        syntheticOnly: true,
      },
      trackBInvitation: {
        decisionId: '00000000-0000-4000-8000-000000000402',
        decisionKind: 'track_b_invitation',
        outcome: 'pending',
        pendingReason: 'pending_assessment_correction',
        orderedReasonCodes: ['ASSESSMENT_MISSING_OR_INVALID'],
        resultHash: `sha256:${'4'.repeat(64)}`,
        policyBundleId: 'PB-SYN-01',
        syntheticOnly: true,
      },
    },
    status: {
      workflowStatus: 'assessment_needs_correction',
      displayLabelCode: 'STATUS_ASSESSMENT_NEEDS_CORRECTION',
      phase: 'assessment',
      familyActionRequired: false,
      nextActionCode: 'AWAIT_ASSESSMENT_CORRECTION',
      deadline: null,
      pendingReason: 'pending_assessment_correction',
      claimBoundaryCode: 'ELIGIBILITY_NOT_ADMISSION',
    },
  },
  meta: {
    correlationId: '00000000-0000-4000-8000-000000000303',
    idempotencyKey: '00000000-0000-4000-8000-000000000304',
    idempotentReplay: false,
  },
} satisfies RecordAssessmentVersionResponse;

export const trackBInvitationResponseFixture = {
  apiVersion: 'v1',
  syntheticOnly: true,
  data: {
    assessment: syntheticTrackBBothReasonsAssessment,
    routing: {
      inputHash: `sha256:${'5'.repeat(64)}`,
      trackA: {
        decisionId: '00000000-0000-4000-8000-000000000403',
        decisionKind: 'track_a_eligibility',
        outcome: 'not_eligible',
        pendingReason: null,
        orderedReasonCodes: ['TA_BELOW_CONFIGURED_BOUNDARY'],
        resultHash: `sha256:${'6'.repeat(64)}`,
        policyBundleId: 'PB-SYN-01',
        syntheticOnly: true,
      },
      trackBInvitation: {
        decisionId: '00000000-0000-4000-8000-000000000404',
        decisionKind: 'track_b_invitation',
        outcome: 'invited',
        pendingReason: null,
        orderedReasonCodes: ['TB_COMPOSITE_BAND', 'TB_BATTERY_PROFILE'],
        resultHash: `sha256:${'7'.repeat(64)}`,
        policyBundleId: 'PB-SYN-01',
        syntheticOnly: true,
      },
    },
    status: trackBSnapshotRequiredStatus,
  },
  meta: {
    correlationId: '00000000-0000-4000-8000-000000000305',
    idempotencyKey: '00000000-0000-4000-8000-000000000306',
    idempotentReplay: false,
  },
} satisfies RecordAssessmentVersionResponse;

const snapshotUnderReviewStatus = {
  workflowStatus: 'snapshot_under_review',
  displayLabelCode: 'STATUS_SNAPSHOT_UNDER_REVIEW',
  phase: 'review',
  familyActionRequired: false,
  nextActionCode: 'AWAIT_REVIEW',
  deadline: null,
  pendingReason: null,
  claimBoundaryCode: 'ELIGIBILITY_NOT_ADMISSION',
} as const;

const initialAssignment = <Slot extends 1 | 2 | 3, Role extends 'reviewer' | 'supervisor'>(
  assignmentId: string,
  slot: Slot,
  reviewerRole: Role,
) =>
  ({
    assignmentId,
    slot,
    reviewerRole,
    status: 'assigned',
    blind: true,
    syntheticOnly: true,
  }) as const;

export const artifactSnapshotSubmissionResponseFixture = {
  apiVersion: 'v1',
  syntheticOnly: true,
  data: {
    snapshot: {
      snapshotVersionId: '00000000-0000-4000-8000-000000000501',
      applicationId: syntheticTrackBApplication.applicationId,
      version: 1,
      supersedesId: null,
      contentHash: `sha256:${'8'.repeat(64)}`,
      route: 'artifact',
      domainCodes: ['synthetic-mathematics'],
      fixtureReferences: [syntheticArtifactFixture],
      syntheticOnly: true,
    },
    reviewCase: {
      reviewCaseId: '00000000-0000-4000-8000-000000000601',
      snapshotVersionId: '00000000-0000-4000-8000-000000000501',
      route: 'artifact',
      rubricVersionId: 'RB-SYN-01',
      workflowState: 'under_review',
      blind: true,
      initialAssignments: [
        initialAssignment('00000000-0000-4000-8000-000000000701', 1, 'reviewer'),
        initialAssignment('00000000-0000-4000-8000-000000000702', 2, 'reviewer'),
      ],
      syntheticOnly: true,
    },
    status: snapshotUnderReviewStatus,
  },
  meta: {
    correlationId: '00000000-0000-4000-8000-000000000307',
    idempotencyKey: '00000000-0000-4000-8000-000000000308',
    idempotentReplay: false,
  },
} satisfies SubmitSnapshotVersionResponse;

export const narrativeSnapshotSubmissionResponseFixture = {
  apiVersion: 'v1',
  syntheticOnly: true,
  data: {
    snapshot: {
      snapshotVersionId: '00000000-0000-4000-8000-000000000502',
      applicationId: syntheticTrackBApplication.applicationId,
      version: 1,
      supersedesId: null,
      contentHash: `sha256:${'9'.repeat(64)}`,
      route: 'narrative',
      domainCodes: ['synthetic-music'],
      fixtureReferences: [syntheticNarrativeFixture],
      narrativeContext: {
        observerRelationship: 'parent_guardian',
        observationDurationMonths: 24,
        observationFrequency: 'weekly',
        settingCodes: ['home'],
        paidRelationship: false,
        instructionOrAssistance: 'limited',
        opportunityContext: 'routine_access',
        conflictOfInterest: false,
        wordCount: 215,
        syntheticOnly: true,
      },
      syntheticOnly: true,
    },
    reviewCase: {
      reviewCaseId: '00000000-0000-4000-8000-000000000602',
      snapshotVersionId: '00000000-0000-4000-8000-000000000502',
      route: 'narrative',
      rubricVersionId: 'RB-SYN-01',
      workflowState: 'under_review',
      blind: true,
      initialAssignments: [
        initialAssignment('00000000-0000-4000-8000-000000000703', 1, 'reviewer'),
        initialAssignment('00000000-0000-4000-8000-000000000704', 2, 'reviewer'),
        initialAssignment('00000000-0000-4000-8000-000000000705', 3, 'supervisor'),
      ],
      syntheticOnly: true,
    },
    status: snapshotUnderReviewStatus,
  },
  meta: {
    correlationId: '00000000-0000-4000-8000-000000000309',
    idempotencyKey: '00000000-0000-4000-8000-000000000310',
    idempotentReplay: false,
  },
} satisfies SubmitSnapshotVersionResponse;

export const fictionalFixtures = [
  syntheticTrackBApplication,
  syntheticTrackAAssessment,
  syntheticTrackBAssessment,
  syntheticInvalidAssessment,
  syntheticTrackBBothReasonsAssessment,
  syntheticArtifactFixture,
  syntheticNarrativeFixture,
  pendingAssessmentResponseFixture,
  trackBInvitationResponseFixture,
  artifactSnapshotSubmissionResponseFixture,
  narrativeSnapshotSubmissionResponseFixture,
] as const;
