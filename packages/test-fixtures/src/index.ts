import type {
  ApiError,
  ApplyCorrectionResponse,
  ApplicationVersion,
  AssessmentVersion,
  SnapshotFixtureReference,
  StatusProjection,
  RecordAssessmentVersionResponse,
  ReplayDecisionResponse,
  SubmitApplicationResponse,
  SubmitReviewActionResponse,
  SubmitReviewResponse,
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

const reviewDimensionCodes = ['DE', 'LR', 'TA', 'IN', 'RE', 'SP'] as const;
const syntheticReviewRatings = reviewDimensionCodes.map((dimensionCode) => ({
  dimensionCode,
  anchorCode: `${dimensionCode}-2`,
  ratingCode: '2',
  evidenceReference: syntheticArtifactFixture.fixtureId,
}));

export const artifactDisagreementReviewResponseFixture = {
  apiVersion: 'v1',
  syntheticOnly: true,
  data: {
    reviewSubmission: {
      reviewSubmissionId: '00000000-0000-4000-8000-000000000801',
      assignmentId: '00000000-0000-4000-8000-000000000702',
      reviewCaseId: '00000000-0000-4000-8000-000000000601',
      classification: 'does_not_currently_qualify',
      ratings: syntheticReviewRatings,
      version: 1,
      contentHash: `sha256:${'a'.repeat(64)}`,
      locked: true,
      syntheticOnly: true,
    },
    transition: {
      kind: 'additional_blind_review_required',
      reviewCaseId: '00000000-0000-4000-8000-000000000601',
      route: 'artifact',
      workflowState: 'under_review',
      completedVoteCount: 2,
      requiredVoteCount: 3,
      pendingReason: 'pending_additional_blind_review',
      createdAssignment: initialAssignment('00000000-0000-4000-8000-000000000706', 3, 'supervisor'),
      decision: null,
      previousVotesExposed: false,
      syntheticOnly: true,
    },
    status: {
      workflowStatus: 'review_pending_internal_action',
      displayLabelCode: 'STATUS_REVIEW_PENDING_INTERNAL_ACTION',
      phase: 'review',
      familyActionRequired: false,
      nextActionCode: 'AWAIT_ADDITIONAL_BLIND_REVIEW',
      deadline: null,
      pendingReason: 'pending_additional_blind_review',
      claimBoundaryCode: 'ELIGIBILITY_NOT_ADMISSION',
    },
  },
  meta: {
    correlationId: '00000000-0000-4000-8000-000000000311',
    idempotencyKey: '00000000-0000-4000-8000-000000000312',
    idempotentReplay: false,
  },
} satisfies SubmitReviewResponse;

export const narrativeTwoVotesReviewResponseFixture = {
  apiVersion: 'v1',
  syntheticOnly: true,
  data: {
    reviewSubmission: {
      reviewSubmissionId: '00000000-0000-4000-8000-000000000802',
      assignmentId: '00000000-0000-4000-8000-000000000704',
      reviewCaseId: '00000000-0000-4000-8000-000000000602',
      classification: 'qualifies',
      ratings: syntheticReviewRatings,
      version: 1,
      contentHash: `sha256:${'b'.repeat(64)}`,
      locked: true,
      syntheticOnly: true,
    },
    transition: {
      kind: 'awaiting_required_reviews',
      reviewCaseId: '00000000-0000-4000-8000-000000000602',
      route: 'narrative',
      workflowState: 'under_review',
      completedVoteCount: 2,
      requiredVoteCount: 3,
      pendingReason: null,
      createdAssignment: null,
      decision: null,
      previousVotesExposed: false,
      syntheticOnly: true,
    },
    status: snapshotUnderReviewStatus,
  },
  meta: {
    correlationId: '00000000-0000-4000-8000-000000000313',
    idempotencyKey: '00000000-0000-4000-8000-000000000314',
    idempotentReplay: false,
  },
} satisfies SubmitReviewResponse;

const reviewPendingDueAt = '2026-07-21T17:00:00.000-05:00';

export const reviewAbstentionResponseFixture = {
  apiVersion: 'v1',
  syntheticOnly: true,
  data: {
    abstention: {
      abstentionId: '00000000-0000-4000-8000-000000000811',
      assignmentId: '00000000-0000-4000-8000-000000000705',
      reviewCaseId: '00000000-0000-4000-8000-000000000602',
      reason: 'insufficient_route_competence',
      version: 1,
      locked: true,
      syntheticOnly: true,
    },
    transition: {
      kind: 'replacement_assignment_created',
      reviewCaseId: '00000000-0000-4000-8000-000000000602',
      route: 'narrative',
      workflowState: 'under_review',
      completedVoteCount: 2,
      requiredVoteCount: 3,
      pendingReason: null,
      createdAssignment: {
        ...initialAssignment('00000000-0000-4000-8000-000000000707', 3, 'supervisor'),
        replacesAssignmentId: '00000000-0000-4000-8000-000000000705',
      },
      decision: null,
      previousVotesExposed: false,
      syntheticOnly: true,
    },
    status: snapshotUnderReviewStatus,
  },
  meta: {
    correlationId: '00000000-0000-4000-8000-000000000315',
    idempotencyKey: '00000000-0000-4000-8000-000000000316',
    idempotentReplay: false,
  },
} satisfies SubmitReviewActionResponse;

export const evidencePendingReviewResponseFixture = {
  apiVersion: 'v1',
  syntheticOnly: true,
  data: {
    blockingIssue: {
      blockingIssueId: '00000000-0000-4000-8000-000000000821',
      assignmentId: '00000000-0000-4000-8000-000000000702',
      reviewCaseId: '00000000-0000-4000-8000-000000000601',
      issue: {
        kind: 'evidence_correction_required',
        reasonCode: 'missing_provenance',
        syntheticOnly: true,
      },
      version: 1,
      locked: true,
      syntheticOnly: true,
    },
    transition: {
      kind: 'pending_review_blocker',
      reviewCaseId: '00000000-0000-4000-8000-000000000601',
      route: 'artifact',
      workflowState: 'pending',
      completedVoteCount: 1,
      requiredVoteCount: 2,
      pendingReason: 'pending_evidence_correction',
      pendingItem: {
        pendingItemId: '00000000-0000-4000-8000-000000000831',
        reason: 'pending_evidence_correction',
        ownerRole: 'family',
        dueAt: reviewPendingDueAt,
        routeCode: 'family_evidence_correction',
        state: 'open',
        syntheticOnly: true,
      },
      createdAssignment: null,
      decision: null,
      previousVotesExposed: false,
      syntheticOnly: true,
    },
    status: {
      workflowStatus: 'review_pending_family_action',
      displayLabelCode: 'STATUS_REVIEW_PENDING_FAMILY_ACTION',
      phase: 'review',
      familyActionRequired: true,
      nextActionCode: 'CORRECT_SNAPSHOT_EVIDENCE',
      deadline: reviewPendingDueAt,
      pendingReason: 'pending_evidence_correction',
      claimBoundaryCode: 'ELIGIBILITY_NOT_ADMISSION',
    },
  },
  meta: {
    correlationId: '00000000-0000-4000-8000-000000000317',
    idempotencyKey: '00000000-0000-4000-8000-000000000318',
    idempotentReplay: false,
  },
} satisfies SubmitReviewActionResponse;

export const accessibilityPendingReviewResponseFixture = {
  apiVersion: 'v1',
  syntheticOnly: true,
  data: {
    blockingIssue: {
      blockingIssueId: '00000000-0000-4000-8000-000000000822',
      assignmentId: '00000000-0000-4000-8000-000000000704',
      reviewCaseId: '00000000-0000-4000-8000-000000000602',
      issue: {
        kind: 'accessibility_route_required',
        reasonCode: 'route_failed',
        syntheticOnly: true,
      },
      version: 1,
      locked: true,
      syntheticOnly: true,
    },
    transition: {
      kind: 'pending_review_blocker',
      reviewCaseId: '00000000-0000-4000-8000-000000000602',
      route: 'narrative',
      workflowState: 'pending',
      completedVoteCount: 0,
      requiredVoteCount: 3,
      pendingReason: 'pending_accessibility_route',
      pendingItem: {
        pendingItemId: '00000000-0000-4000-8000-000000000832',
        reason: 'pending_accessibility_route',
        ownerRole: 'access_steward',
        dueAt: reviewPendingDueAt,
        routeCode: 'internal_accessibility_route',
        state: 'open',
        syntheticOnly: true,
      },
      createdAssignment: null,
      decision: null,
      previousVotesExposed: false,
      syntheticOnly: true,
    },
    status: {
      workflowStatus: 'review_pending_internal_action',
      displayLabelCode: 'STATUS_REVIEW_PENDING_INTERNAL_ACTION',
      phase: 'review',
      familyActionRequired: false,
      nextActionCode: 'AWAIT_ACCESSIBILITY_ROUTE',
      deadline: reviewPendingDueAt,
      pendingReason: 'pending_accessibility_route',
      claimBoundaryCode: 'ELIGIBILITY_NOT_ADMISSION',
    },
  },
  meta: {
    correlationId: '00000000-0000-4000-8000-000000000319',
    idempotencyKey: '00000000-0000-4000-8000-000000000320',
    idempotentReplay: false,
  },
} satisfies SubmitReviewActionResponse;

export const assessmentCorrectionResponseFixture = {
  apiVersion: 'v1',
  syntheticOnly: true,
  data: {
    correction: {
      correctionCaseId: '00000000-0000-4000-8000-000000000911',
      correctionKind: 'factual_or_provenance',
      resolution: 'applied',
      originalPreserved: true,
      syntheticOnly: true,
    },
    originalVersion: {
      entityType: 'assessment_version',
      versionId: syntheticTrackBAssessment.assessmentVersionId,
      version: 1,
      supersedesId: null,
      contentHash: `sha256:${'c'.repeat(64)}`,
      syntheticOnly: true,
    },
    successorVersion: {
      entityType: 'assessment_version',
      versionId: '00000000-0000-4000-8000-000000000205',
      version: 2,
      supersedesId: syntheticTrackBAssessment.assessmentVersionId,
      contentHash: `sha256:${'d'.repeat(64)}`,
      syntheticOnly: true,
    },
    decisionImpact: {
      decisionUse: 'decision_used',
      rerunStatus: 'completed',
      manifestHash: `sha256:${'e'.repeat(64)}`,
      policyBundleId: 'PB-SYN-01',
      affectedDecisionRunIds: ['00000000-0000-4000-8000-000000000921'],
      inputHashBefore: `sha256:${'1'.repeat(64)}`,
      inputHashAfter: `sha256:${'2'.repeat(64)}`,
      resultHashBefore: `sha256:${'3'.repeat(64)}`,
      resultHashAfter: `sha256:${'4'.repeat(64)}`,
      exactOriginalReplayPreserved: true,
    },
    status: {
      workflowStatus: 'track_a_eligible',
      displayLabelCode: 'STATUS_TRACK_A_ELIGIBLE',
      phase: 'decision',
      familyActionRequired: false,
      nextActionCode: null,
      deadline: null,
      pendingReason: null,
      claimBoundaryCode: 'ELIGIBILITY_NOT_ADMISSION',
    },
  },
  meta: {
    correlationId: '00000000-0000-4000-8000-000000000321',
    idempotencyKey: '00000000-0000-4000-8000-000000000322',
    idempotentReplay: false,
  },
} satisfies ApplyCorrectionResponse;

export const invariantCorrectionResponseFixture = {
  apiVersion: 'v1',
  syntheticOnly: true,
  data: {
    correction: {
      correctionCaseId: '00000000-0000-4000-8000-000000000912',
      correctionKind: 'factual_or_provenance',
      resolution: 'applied',
      originalPreserved: true,
      syntheticOnly: true,
    },
    originalVersion: {
      entityType: 'application_version',
      versionId: syntheticTrackBApplication.applicationVersionId,
      version: 1,
      supersedesId: null,
      contentHash: `sha256:${'5'.repeat(64)}`,
      syntheticOnly: true,
    },
    successorVersion: {
      entityType: 'application_version',
      versionId: '00000000-0000-4000-8000-000000000102',
      version: 2,
      supersedesId: syntheticTrackBApplication.applicationVersionId,
      contentHash: `sha256:${'6'.repeat(64)}`,
      syntheticOnly: true,
    },
    decisionImpact: {
      decisionUse: 'excluded_from_decision',
      rerunStatus: 'not_required_invariant_verified',
      manifestHash: null,
      policyBundleId: 'PB-SYN-01',
      affectedDecisionRunIds: [],
      inputHashBefore: `sha256:${'7'.repeat(64)}`,
      inputHashAfter: `sha256:${'7'.repeat(64)}`,
      resultHashBefore: `sha256:${'8'.repeat(64)}`,
      resultHashAfter: `sha256:${'8'.repeat(64)}`,
      exactOriginalReplayPreserved: true,
    },
    status: trackBSnapshotRequiredStatus,
  },
  meta: {
    correlationId: '00000000-0000-4000-8000-000000000323',
    idempotencyKey: '00000000-0000-4000-8000-000000000324',
    idempotentReplay: false,
  },
} satisfies ApplyCorrectionResponse;

export const disabledAppealResponseFixture = {
  error: {
    code: 'FEATURE_DISABLED',
    message: 'Substantive rubric appeal is deferred beyond the synthetic MVP.',
    retryable: false,
    correlationId: '00000000-0000-4000-8000-000000000325',
    currentState: 'correction_available',
    fieldErrors: [],
  },
} satisfies ApiError;

const replayedTrackBInvitationDecision =
  trackBInvitationResponseFixture.data.routing.trackBInvitation;
const replayDecisionRoot = replayedTrackBInvitationDecision.resultHash;
const exactReplayVerification = {
  canonicalInput: 'verified',
  inputManifest: 'verified',
  policyBundle: 'verified',
  executableArtifact: 'verified',
  environmentArtifact: 'verified',
  outcome: 'verified',
  orderedReasons: 'verified',
  trace: 'verified',
  decisionRoot: 'verified',
  auditChain: 'verified',
} as const;

export const exactReplayResponseFixture = {
  apiVersion: 'v1',
  syntheticOnly: true,
  data: {
    decisionRunId: '00000000-0000-4000-8000-000000000921',
    requestedMode: 'exact_reexecution',
    status: 'reexecuted_exact',
    storedDecision: replayedTrackBInvitationDecision,
    replayedDecision: replayedTrackBInvitationDecision,
    verification: exactReplayVerification,
    decisionRootBefore: replayDecisionRoot,
    decisionRootAfter: replayDecisionRoot,
    exactReplayClaimed: true,
    networkAccessUsed: false,
    failureCode: null,
    auditEventId: '00000000-0000-4000-8000-000000000931',
    syntheticOnly: true,
  },
  meta: {
    correlationId: '00000000-0000-4000-8000-000000000326',
    idempotencyKey: '00000000-0000-4000-8000-000000000327',
    idempotentReplay: false,
  },
} satisfies ReplayDecisionResponse;

export const disposedInputReplayResponseFixture = {
  apiVersion: 'v1',
  syntheticOnly: true,
  data: {
    decisionRunId: '00000000-0000-4000-8000-000000000921',
    requestedMode: 'exact_reexecution',
    status: 'not_replayable_inputs_disposed',
    storedDecision: replayedTrackBInvitationDecision,
    replayedDecision: null,
    verification: {
      canonicalInput: 'disposed',
      inputManifest: 'not_checked',
      policyBundle: 'not_checked',
      executableArtifact: 'not_checked',
      environmentArtifact: 'not_checked',
      outcome: 'not_checked',
      orderedReasons: 'not_checked',
      trace: 'not_checked',
      decisionRoot: 'not_checked',
      auditChain: 'verified',
    },
    decisionRootBefore: replayDecisionRoot,
    decisionRootAfter: null,
    exactReplayClaimed: false,
    networkAccessUsed: false,
    failureCode: 'input_payload_disposed',
    auditEventId: '00000000-0000-4000-8000-000000000932',
    syntheticOnly: true,
  },
  meta: {
    correlationId: '00000000-0000-4000-8000-000000000328',
    idempotencyKey: '00000000-0000-4000-8000-000000000329',
    idempotentReplay: false,
  },
} satisfies ReplayDecisionResponse;

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
  artifactDisagreementReviewResponseFixture,
  narrativeTwoVotesReviewResponseFixture,
  reviewAbstentionResponseFixture,
  evidencePendingReviewResponseFixture,
  accessibilityPendingReviewResponseFixture,
  assessmentCorrectionResponseFixture,
  invariantCorrectionResponseFixture,
  exactReplayResponseFixture,
  disposedInputReplayResponseFixture,
] as const;
