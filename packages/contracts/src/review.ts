import { z } from 'zod';

import { apiSuccessSchema } from './api-envelope';
import { trackBEligibilityDecisionSummarySchema } from './decision';
import { pendingItemSchema, statusProjectionSchema } from './workflow';

export const snapshotRouteSchema = z.enum(['artifact', 'narrative']);
export const reviewerClassificationSchema = z.enum(['qualifies', 'does_not_currently_qualify']);

export const reviewDimensionCodeSchema = z.enum(['DE', 'LR', 'TA', 'IN', 'RE', 'SP']);

export const fixtureProvenanceSchema = z
  .object({
    creationMethod: z.literal('independent_synthetic_construction'),
    sourceRecordUsed: z.literal(false),
    reviewedAt: z.iso.datetime({ offset: true }),
  })
  .strict();

export const snapshotFixtureReferenceSchema = z
  .object({
    fixtureId: z.string().min(1),
    route: snapshotRouteSchema,
    domainCode: z.string().min(1),
    syntheticOnly: z.literal(true),
    provenance: fixtureProvenanceSchema,
  })
  .strict();

const domainCodesSchema = z.array(z.string().min(1)).min(1).max(2);
const artifactFixtureReferenceSchema = snapshotFixtureReferenceSchema.extend({
  route: z.literal('artifact'),
});
const narrativeFixtureReferenceSchema = snapshotFixtureReferenceSchema.extend({
  route: z.literal('narrative'),
});

const requireFixtureDomains = (
  value: { domainCodes: string[]; fixtureReferences: { domainCode: string }[] },
  context: z.RefinementCtx,
) => {
  const selectedDomains = new Set(value.domainCodes);
  if (value.fixtureReferences.some(({ domainCode }) => !selectedDomains.has(domainCode))) {
    context.addIssue({
      code: 'custom',
      message: 'Every fixture domain must be one of the selected primary domains.',
      path: ['domainCodes'],
    });
  }
};

export const narrativeContextSchema = z
  .object({
    observerRelationship: z.enum(['parent_guardian', 'direct_observer']),
    observationDurationMonths: z.int().min(1).max(216),
    observationFrequency: z.enum(['daily', 'weekly', 'monthly', 'less_than_monthly']),
    settingCodes: z
      .array(z.enum(['home', 'school', 'community', 'other_synthetic']))
      .min(1)
      .max(4),
    paidRelationship: z.boolean(),
    instructionOrAssistance: z.enum(['none', 'limited', 'substantive']),
    opportunityContext: z.enum(['routine_access', 'limited_access', 'unknown']),
    conflictOfInterest: z.boolean(),
    wordCount: z.int().min(1).max(400),
    syntheticOnly: z.literal(true),
  })
  .strict();

export const artifactSnapshotInputSchema = z
  .object({
    route: z.literal('artifact'),
    domainCodes: domainCodesSchema,
    fixtureReferences: z.array(artifactFixtureReferenceSchema).min(1).max(2),
    syntheticOnly: z.literal(true),
  })
  .strict()
  .superRefine(requireFixtureDomains);

export const narrativeSnapshotInputSchema = z
  .object({
    route: z.literal('narrative'),
    domainCodes: domainCodesSchema,
    fixtureReferences: z.tuple([narrativeFixtureReferenceSchema]),
    narrativeContext: narrativeContextSchema,
    syntheticOnly: z.literal(true),
  })
  .strict()
  .superRefine(requireFixtureDomains);

export const snapshotInputSchema = z.discriminatedUnion('route', [
  artifactSnapshotInputSchema,
  narrativeSnapshotInputSchema,
]);

const snapshotVersionFields = {
  snapshotVersionId: z.uuid(),
  applicationId: z.uuid(),
  version: z.int().positive(),
  supersedesId: z.uuid().nullable(),
  contentHash: z.string().regex(/^sha256:[0-9a-f]{64}$/),
};

export const artifactSnapshotVersionSchema =
  artifactSnapshotInputSchema.safeExtend(snapshotVersionFields);
export const narrativeSnapshotVersionSchema =
  narrativeSnapshotInputSchema.safeExtend(snapshotVersionFields);
export const snapshotVersionSchema = z.discriminatedUnion('route', [
  artifactSnapshotVersionSchema,
  narrativeSnapshotVersionSchema,
]);

export const submitSnapshotVersionRequestSchema = z
  .object({
    applicationId: z.uuid(),
    trackBInvitationDecisionId: z.uuid(),
    snapshot: snapshotInputSchema,
    supersedesSnapshotVersionId: z.uuid().nullable(),
    expectedVersion: z.int().nonnegative(),
    idempotencyKey: z.uuid(),
    correlationId: z.uuid(),
  })
  .strict();

const initialAssignmentBaseSchema = z
  .object({
    assignmentId: z.uuid(),
    status: z.literal('assigned'),
    blind: z.literal(true),
    syntheticOnly: z.literal(true),
  })
  .strict();

const reviewerSlotOneSchema = initialAssignmentBaseSchema.extend({
  slot: z.literal(1),
  reviewerRole: z.literal('reviewer'),
});
const reviewerSlotTwoSchema = initialAssignmentBaseSchema.extend({
  slot: z.literal(2),
  reviewerRole: z.literal('reviewer'),
});
const supervisorSlotThreeSchema = initialAssignmentBaseSchema.extend({
  slot: z.literal(3),
  reviewerRole: z.literal('supervisor'),
});

const reviewCaseBaseFields = {
  reviewCaseId: z.uuid(),
  snapshotVersionId: z.uuid(),
  rubricVersionId: z.literal('RB-SYN-01'),
  workflowState: z.literal('under_review'),
  blind: z.literal(true),
  syntheticOnly: z.literal(true),
};

export const artifactReviewCaseSchema = z
  .object({
    ...reviewCaseBaseFields,
    route: z.literal('artifact'),
    initialAssignments: z.tuple([reviewerSlotOneSchema, reviewerSlotTwoSchema]),
  })
  .strict();

export const narrativeReviewCaseSchema = z
  .object({
    ...reviewCaseBaseFields,
    route: z.literal('narrative'),
    initialAssignments: z.tuple([
      reviewerSlotOneSchema,
      reviewerSlotTwoSchema,
      supervisorSlotThreeSchema,
    ]),
  })
  .strict();

export const reviewCaseSchema = z.discriminatedUnion('route', [
  artifactReviewCaseSchema,
  narrativeReviewCaseSchema,
]);

export const snapshotUnderReviewStatusSchema = statusProjectionSchema.extend({
  workflowStatus: z.literal('snapshot_under_review'),
  displayLabelCode: z.literal('STATUS_SNAPSHOT_UNDER_REVIEW'),
  phase: z.literal('review'),
  familyActionRequired: z.literal(false),
  nextActionCode: z.literal('AWAIT_REVIEW'),
  deadline: z.null(),
  pendingReason: z.null(),
});

const artifactSnapshotSubmissionDataSchema = z
  .object({
    snapshot: artifactSnapshotVersionSchema,
    reviewCase: artifactReviewCaseSchema,
    status: snapshotUnderReviewStatusSchema,
  })
  .strict()
  .superRefine(({ snapshot, reviewCase }, context) => {
    if (snapshot.snapshotVersionId !== reviewCase.snapshotVersionId) {
      context.addIssue({
        code: 'custom',
        message: 'Review case must reference the submitted Snapshot version.',
        path: ['reviewCase', 'snapshotVersionId'],
      });
    }
  });
const narrativeSnapshotSubmissionDataSchema = z
  .object({
    snapshot: narrativeSnapshotVersionSchema,
    reviewCase: narrativeReviewCaseSchema,
    status: snapshotUnderReviewStatusSchema,
  })
  .strict()
  .superRefine(({ snapshot, reviewCase }, context) => {
    if (snapshot.snapshotVersionId !== reviewCase.snapshotVersionId) {
      context.addIssue({
        code: 'custom',
        message: 'Review case must reference the submitted Snapshot version.',
        path: ['reviewCase', 'snapshotVersionId'],
      });
    }
  });

export const submitSnapshotVersionResponseSchema = apiSuccessSchema(
  z.union([artifactSnapshotSubmissionDataSchema, narrativeSnapshotSubmissionDataSchema]),
);

export const reviewRatingSchema = z
  .object({
    dimensionCode: reviewDimensionCodeSchema,
    anchorCode: z.string().min(1),
    ratingCode: z.string().min(1),
    evidenceReference: z.string().min(1),
  })
  .strict();

export const reviewRatingsSchema = z
  .array(reviewRatingSchema)
  .length(6)
  .superRefine((ratings, context) => {
    const uniqueDimensions = new Set(ratings.map(({ dimensionCode }) => dimensionCode));
    if (uniqueDimensions.size !== ratings.length) {
      context.addIssue({
        code: 'custom',
        message: 'Each review dimension may be rated exactly once.',
      });
    }
  });

export const submitReviewRequestSchema = z
  .object({
    assignmentId: z.uuid(),
    expectedVersion: z.int().nonnegative(),
    idempotencyKey: z.uuid(),
    correlationId: z.uuid(),
    classification: reviewerClassificationSchema,
    ratings: reviewRatingsSchema,
  })
  .strict();

export const reviewSubmissionSchema = z
  .object({
    reviewSubmissionId: z.uuid(),
    assignmentId: z.uuid(),
    reviewCaseId: z.uuid(),
    classification: reviewerClassificationSchema,
    ratings: reviewRatingsSchema,
    version: z.int().positive(),
    contentHash: z.string().regex(/^sha256:[0-9a-f]{64}$/),
    locked: z.literal(true),
    syntheticOnly: z.literal(true),
  })
  .strict();

const transitionBaseFields = {
  reviewCaseId: z.uuid(),
  workflowState: z.literal('under_review'),
  pendingReason: z.null(),
  createdAssignment: z.null(),
  decision: z.null(),
  previousVotesExposed: z.literal(false),
  syntheticOnly: z.literal(true),
};

const artifactAwaitingReviewsTransitionSchema = z
  .object({
    ...transitionBaseFields,
    kind: z.literal('awaiting_required_reviews'),
    route: z.literal('artifact'),
    completedVoteCount: z.literal(1),
    requiredVoteCount: z.literal(2),
  })
  .strict();

const narrativeAwaitingReviewsTransitionSchema = z
  .object({
    ...transitionBaseFields,
    kind: z.literal('awaiting_required_reviews'),
    route: z.literal('narrative'),
    completedVoteCount: z.union([z.literal(1), z.literal(2)]),
    requiredVoteCount: z.literal(3),
  })
  .strict();

export const awaitingRequiredReviewsTransitionSchema = z.union([
  artifactAwaitingReviewsTransitionSchema,
  narrativeAwaitingReviewsTransitionSchema,
]);

export const additionalBlindReviewTransitionSchema = z
  .object({
    reviewCaseId: z.uuid(),
    kind: z.literal('additional_blind_review_required'),
    route: z.literal('artifact'),
    workflowState: z.literal('under_review'),
    completedVoteCount: z.literal(2),
    requiredVoteCount: z.literal(3),
    pendingReason: z.literal('pending_additional_blind_review'),
    createdAssignment: supervisorSlotThreeSchema,
    decision: z.null(),
    previousVotesExposed: z.literal(false),
    syntheticOnly: z.literal(true),
  })
  .strict();

const finalTrackBDecisionSchema = trackBEligibilityDecisionSummarySchema.safeExtend({
  outcome: reviewerClassificationSchema,
  pendingReason: z.null(),
});

const finalTransitionBaseFields = {
  reviewCaseId: z.uuid(),
  kind: z.literal('finalized'),
  workflowState: z.literal('finalized'),
  pendingReason: z.null(),
  createdAssignment: z.null(),
  decision: finalTrackBDecisionSchema,
  previousVotesExposed: z.literal(false),
  syntheticOnly: z.literal(true),
};

const artifactTwoVoteFinalizedTransitionSchema = z
  .object({
    ...finalTransitionBaseFields,
    route: z.literal('artifact'),
    completedVoteCount: z.literal(2),
    requiredVoteCount: z.literal(2),
  })
  .strict();
const artifactThreeVoteFinalizedTransitionSchema = z
  .object({
    ...finalTransitionBaseFields,
    route: z.literal('artifact'),
    completedVoteCount: z.literal(3),
    requiredVoteCount: z.literal(3),
  })
  .strict();
const narrativeFinalizedTransitionSchema = z
  .object({
    ...finalTransitionBaseFields,
    route: z.literal('narrative'),
    completedVoteCount: z.literal(3),
    requiredVoteCount: z.literal(3),
  })
  .strict();

export const finalizedReviewTransitionSchema = z.union([
  artifactTwoVoteFinalizedTransitionSchema,
  artifactThreeVoteFinalizedTransitionSchema,
  narrativeFinalizedTransitionSchema,
]);

export const reviewTransitionSchema = z.union([
  awaitingRequiredReviewsTransitionSchema,
  additionalBlindReviewTransitionSchema,
  finalizedReviewTransitionSchema,
]);

const additionalBlindReviewStatusSchema = statusProjectionSchema.extend({
  workflowStatus: z.literal('review_pending_internal_action'),
  displayLabelCode: z.literal('STATUS_REVIEW_PENDING_INTERNAL_ACTION'),
  phase: z.literal('review'),
  familyActionRequired: z.literal(false),
  nextActionCode: z.literal('AWAIT_ADDITIONAL_BLIND_REVIEW'),
  deadline: z.null(),
  pendingReason: z.literal('pending_additional_blind_review'),
});

const eligibleStatusSchema = statusProjectionSchema.extend({
  workflowStatus: z.literal('track_b_eligible'),
  displayLabelCode: z.literal('STATUS_TRACK_B_ELIGIBLE'),
  phase: z.literal('decision'),
  familyActionRequired: z.literal(false),
  nextActionCode: z.null(),
  deadline: z.null(),
  pendingReason: z.null(),
});

const doesNotCurrentlyQualifyStatusSchema = statusProjectionSchema.extend({
  workflowStatus: z.literal('track_b_does_not_currently_qualify'),
  displayLabelCode: z.literal('STATUS_TRACK_B_DOES_NOT_CURRENTLY_QUALIFY'),
  phase: z.literal('decision'),
  familyActionRequired: z.literal(false),
  nextActionCode: z.null(),
  deadline: z.null(),
  pendingReason: z.null(),
});

const requireReviewCaseReference = (
  value: {
    reviewSubmission: { reviewCaseId: string };
    transition: { reviewCaseId: string };
  },
  context: z.RefinementCtx,
) => {
  if (value.reviewSubmission.reviewCaseId !== value.transition.reviewCaseId) {
    context.addIssue({
      code: 'custom',
      message: 'Review submission and transition must reference the same case.',
      path: ['reviewSubmission', 'reviewCaseId'],
    });
  }
};

const awaitingReviewResponseDataSchema = z
  .object({
    reviewSubmission: reviewSubmissionSchema,
    transition: awaitingRequiredReviewsTransitionSchema,
    status: snapshotUnderReviewStatusSchema,
  })
  .strict()
  .superRefine(requireReviewCaseReference);

const additionalBlindReviewResponseDataSchema = z
  .object({
    reviewSubmission: reviewSubmissionSchema,
    transition: additionalBlindReviewTransitionSchema,
    status: additionalBlindReviewStatusSchema,
  })
  .strict()
  .superRefine(requireReviewCaseReference);

const finalizedReviewResponseDataSchema = z
  .object({
    reviewSubmission: reviewSubmissionSchema,
    transition: finalizedReviewTransitionSchema,
    status: z.union([eligibleStatusSchema, doesNotCurrentlyQualifyStatusSchema]),
  })
  .strict()
  .superRefine(requireReviewCaseReference)
  .superRefine(({ transition, status }, context) => {
    const expectedStatus =
      transition.decision.outcome === 'qualifies'
        ? 'track_b_eligible'
        : 'track_b_does_not_currently_qualify';
    if (status.workflowStatus !== expectedStatus) {
      context.addIssue({
        code: 'custom',
        message: 'Final applicant status must match the Track B eligibility outcome.',
        path: ['status', 'workflowStatus'],
      });
    }
  });

export const submitReviewResponseSchema = apiSuccessSchema(
  z.union([
    awaitingReviewResponseDataSchema,
    additionalBlindReviewResponseDataSchema,
    finalizedReviewResponseDataSchema,
  ]),
);

export const abstentionReasonSchema = z.enum([
  'conflict_of_interest',
  'insufficient_route_competence',
]);

export const abstainReviewRequestSchema = z
  .object({
    assignmentId: z.uuid(),
    expectedVersion: z.int().nonnegative(),
    idempotencyKey: z.uuid(),
    correlationId: z.uuid(),
    abstentionReason: abstentionReasonSchema,
  })
  .strict();

const evidenceBlockingIssueSchema = z
  .object({
    kind: z.literal('evidence_correction_required'),
    reasonCode: z.enum(['missing_provenance', 'materially_incomplete', 'uninterpretable']),
    syntheticOnly: z.literal(true),
  })
  .strict();

const accessibilityBlockingIssueSchema = z
  .object({
    kind: z.literal('accessibility_route_required'),
    reasonCode: z.enum([
      'route_unavailable',
      'route_denied',
      'route_failed',
      'route_not_provisionally_approved',
    ]),
    syntheticOnly: z.literal(true),
  })
  .strict();

export const reviewBlockingIssueSchema = z.discriminatedUnion('kind', [
  evidenceBlockingIssueSchema,
  accessibilityBlockingIssueSchema,
]);

export const reportReviewBlockingIssueRequestSchema = z
  .object({
    assignmentId: z.uuid(),
    expectedVersion: z.int().nonnegative(),
    idempotencyKey: z.uuid(),
    correlationId: z.uuid(),
    issue: reviewBlockingIssueSchema,
  })
  .strict();

export const submitReviewActionRequestSchema = z.union([
  submitReviewRequestSchema,
  abstainReviewRequestSchema,
  reportReviewBlockingIssueRequestSchema,
]);

export const reviewAbstentionSchema = z
  .object({
    abstentionId: z.uuid(),
    assignmentId: z.uuid(),
    reviewCaseId: z.uuid(),
    reason: abstentionReasonSchema,
    version: z.int().positive(),
    locked: z.literal(true),
    syntheticOnly: z.literal(true),
  })
  .strict();

export const replacementAssignmentSchema = z
  .object({
    assignmentId: z.uuid(),
    replacesAssignmentId: z.uuid(),
    slot: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    reviewerRole: z.enum(['reviewer', 'supervisor']),
    status: z.literal('assigned'),
    blind: z.literal(true),
    syntheticOnly: z.literal(true),
  })
  .strict();

export const replacementAssignmentTransitionSchema = z
  .object({
    kind: z.literal('replacement_assignment_created'),
    reviewCaseId: z.uuid(),
    route: snapshotRouteSchema,
    workflowState: z.literal('under_review'),
    completedVoteCount: z.int().min(0).max(2),
    requiredVoteCount: z.union([z.literal(2), z.literal(3)]),
    pendingReason: z.null(),
    createdAssignment: replacementAssignmentSchema,
    decision: z.null(),
    previousVotesExposed: z.literal(false),
    syntheticOnly: z.literal(true),
  })
  .strict()
  .superRefine(({ route, completedVoteCount, requiredVoteCount, createdAssignment }, context) => {
    const expectedRequiredCount = route === 'narrative' || createdAssignment.slot === 3 ? 3 : 2;
    const expectedReviewerRole = createdAssignment.slot === 3 ? 'supervisor' : 'reviewer';
    if (requiredVoteCount !== expectedRequiredCount || completedVoteCount >= requiredVoteCount) {
      context.addIssue({
        code: 'custom',
        message: 'Replacement work must preserve the route vote requirement.',
      });
    }
    if (createdAssignment.reviewerRole !== expectedReviewerRole) {
      context.addIssue({
        code: 'custom',
        message: 'Replacement work must preserve the assignment slot role.',
        path: ['createdAssignment', 'reviewerRole'],
      });
    }
  });

const evidencePendingItemSchema = pendingItemSchema.safeExtend({
  reason: z.literal('pending_evidence_correction'),
  ownerRole: z.literal('family'),
  routeCode: z.literal('family_evidence_correction'),
  state: z.literal('open'),
});

const accessibilityPendingItemSchema = pendingItemSchema.safeExtend({
  reason: z.literal('pending_accessibility_route'),
  ownerRole: z.literal('access_steward'),
  routeCode: z.literal('internal_accessibility_route'),
  state: z.literal('open'),
});

const pendingTransitionBaseFields = {
  kind: z.literal('pending_review_blocker'),
  reviewCaseId: z.uuid(),
  route: snapshotRouteSchema,
  workflowState: z.literal('pending'),
  completedVoteCount: z.int().min(0).max(2),
  requiredVoteCount: z.union([z.literal(2), z.literal(3)]),
  createdAssignment: z.null(),
  decision: z.null(),
  previousVotesExposed: z.literal(false),
  syntheticOnly: z.literal(true),
};

const requirePendingRouteCount = (
  value: { route: SnapshotRoute; completedVoteCount: number; requiredVoteCount: number },
  context: z.RefinementCtx,
) => {
  const expectedRequiredCount = value.route === 'artifact' ? 2 : 3;
  if (
    value.requiredVoteCount !== expectedRequiredCount ||
    value.completedVoteCount >= value.requiredVoteCount
  ) {
    context.addIssue({
      code: 'custom',
      message: 'Pending work must preserve the incomplete route vote requirement.',
    });
  }
};

const evidencePendingTransitionSchema = z
  .object({
    ...pendingTransitionBaseFields,
    pendingReason: z.literal('pending_evidence_correction'),
    pendingItem: evidencePendingItemSchema,
  })
  .strict()
  .superRefine(requirePendingRouteCount);

const accessibilityPendingTransitionSchema = z
  .object({
    ...pendingTransitionBaseFields,
    pendingReason: z.literal('pending_accessibility_route'),
    pendingItem: accessibilityPendingItemSchema,
  })
  .strict()
  .superRefine(requirePendingRouteCount);

export const pendingReviewBlockerTransitionSchema = z.union([
  evidencePendingTransitionSchema,
  accessibilityPendingTransitionSchema,
]);

const abstainReviewResponseDataSchema = z
  .object({
    abstention: reviewAbstentionSchema,
    transition: replacementAssignmentTransitionSchema,
    status: snapshotUnderReviewStatusSchema,
  })
  .strict()
  .superRefine(({ abstention, transition }, context) => {
    if (
      abstention.reviewCaseId !== transition.reviewCaseId ||
      abstention.assignmentId !== transition.createdAssignment.replacesAssignmentId
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Replacement work must reference the abstained assignment and case.',
      });
    }
  });

const evidenceBlockingIssueRecordSchema = z
  .object({
    blockingIssueId: z.uuid(),
    assignmentId: z.uuid(),
    reviewCaseId: z.uuid(),
    issue: evidenceBlockingIssueSchema,
    version: z.int().positive(),
    locked: z.literal(true),
    syntheticOnly: z.literal(true),
  })
  .strict();

const accessibilityBlockingIssueRecordSchema = z
  .object({
    blockingIssueId: z.uuid(),
    assignmentId: z.uuid(),
    reviewCaseId: z.uuid(),
    issue: accessibilityBlockingIssueSchema,
    version: z.int().positive(),
    locked: z.literal(true),
    syntheticOnly: z.literal(true),
  })
  .strict();

const evidencePendingStatusSchema = statusProjectionSchema.extend({
  workflowStatus: z.literal('review_pending_family_action'),
  displayLabelCode: z.literal('STATUS_REVIEW_PENDING_FAMILY_ACTION'),
  phase: z.literal('review'),
  familyActionRequired: z.literal(true),
  nextActionCode: z.literal('CORRECT_SNAPSHOT_EVIDENCE'),
  pendingReason: z.literal('pending_evidence_correction'),
});

const accessibilityPendingStatusSchema = statusProjectionSchema.extend({
  workflowStatus: z.literal('review_pending_internal_action'),
  displayLabelCode: z.literal('STATUS_REVIEW_PENDING_INTERNAL_ACTION'),
  phase: z.literal('review'),
  familyActionRequired: z.literal(false),
  nextActionCode: z.literal('AWAIT_ACCESSIBILITY_ROUTE'),
  pendingReason: z.literal('pending_accessibility_route'),
});

const requirePendingReferences = (
  value: {
    blockingIssue: { reviewCaseId: string };
    transition: { reviewCaseId: string; pendingItem: { dueAt: string } };
    status: { deadline: string | null };
  },
  context: z.RefinementCtx,
) => {
  if (value.blockingIssue.reviewCaseId !== value.transition.reviewCaseId) {
    context.addIssue({
      code: 'custom',
      message: 'Blocking issue and pending transition must reference the same case.',
    });
  }
  if (value.status.deadline !== value.transition.pendingItem.dueAt) {
    context.addIssue({
      code: 'custom',
      message: 'Applicant status deadline must match the pending item deadline.',
      path: ['status', 'deadline'],
    });
  }
};

const evidencePendingResponseDataSchema = z
  .object({
    blockingIssue: evidenceBlockingIssueRecordSchema,
    transition: evidencePendingTransitionSchema,
    status: evidencePendingStatusSchema,
  })
  .strict()
  .superRefine(requirePendingReferences);

const accessibilityPendingResponseDataSchema = z
  .object({
    blockingIssue: accessibilityBlockingIssueRecordSchema,
    transition: accessibilityPendingTransitionSchema,
    status: accessibilityPendingStatusSchema,
  })
  .strict()
  .superRefine(requirePendingReferences);

export const abstainReviewResponseSchema = apiSuccessSchema(abstainReviewResponseDataSchema);
export const reportReviewBlockingIssueResponseSchema = apiSuccessSchema(
  z.union([evidencePendingResponseDataSchema, accessibilityPendingResponseDataSchema]),
);

export const submitReviewActionResponseSchema = z.union([
  submitReviewResponseSchema,
  abstainReviewResponseSchema,
  reportReviewBlockingIssueResponseSchema,
]);

export type SnapshotRoute = z.infer<typeof snapshotRouteSchema>;
export type FixtureProvenance = z.infer<typeof fixtureProvenanceSchema>;
export type SnapshotFixtureReference = z.infer<typeof snapshotFixtureReferenceSchema>;
export type NarrativeContext = z.infer<typeof narrativeContextSchema>;
export type SnapshotInput = z.infer<typeof snapshotInputSchema>;
export type SnapshotVersion = z.infer<typeof snapshotVersionSchema>;
export type SubmitSnapshotVersionRequest = z.infer<typeof submitSnapshotVersionRequestSchema>;
export type ReviewCase = z.infer<typeof reviewCaseSchema>;
export type SubmitSnapshotVersionResponse = z.infer<typeof submitSnapshotVersionResponseSchema>;
export type ReviewerClassification = z.infer<typeof reviewerClassificationSchema>;
export type ReviewRating = z.infer<typeof reviewRatingSchema>;
export type SubmitReviewRequest = z.infer<typeof submitReviewRequestSchema>;
export type ReviewSubmission = z.infer<typeof reviewSubmissionSchema>;
export type ReviewTransition = z.infer<typeof reviewTransitionSchema>;
export type SubmitReviewResponse = z.infer<typeof submitReviewResponseSchema>;
export type AbstentionReason = z.infer<typeof abstentionReasonSchema>;
export type AbstainReviewRequest = z.infer<typeof abstainReviewRequestSchema>;
export type ReviewBlockingIssue = z.infer<typeof reviewBlockingIssueSchema>;
export type ReportReviewBlockingIssueRequest = z.infer<
  typeof reportReviewBlockingIssueRequestSchema
>;
export type SubmitReviewActionRequest = z.infer<typeof submitReviewActionRequestSchema>;
export type ReviewAbstention = z.infer<typeof reviewAbstentionSchema>;
export type ReplacementAssignment = z.infer<typeof replacementAssignmentSchema>;
export type PendingReviewBlockerTransition = z.infer<typeof pendingReviewBlockerTransitionSchema>;
export type SubmitReviewActionResponse = z.infer<typeof submitReviewActionResponseSchema>;
