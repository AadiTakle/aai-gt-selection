import { z } from 'zod';

import { pendingReasonSchema } from './workflow';

export const trackAOutcomeSchema = z.enum(['eligible', 'not_eligible', 'pending']);
export const trackBInvitationOutcomeSchema = z.enum([
  'invited',
  'not_invited',
  'not_applicable',
  'pending',
]);
export const trackBEligibilityOutcomeSchema = z.enum([
  'qualifies',
  'does_not_currently_qualify',
  'pending',
]);

export const decisionKindSchema = z.enum([
  'track_a_eligibility',
  'track_b_invitation',
  'track_b_eligibility',
]);

export const decisionSummarySchema = z
  .object({
    decisionId: z.uuid(),
    decisionKind: decisionKindSchema,
    outcome: z.union([
      trackAOutcomeSchema,
      trackBInvitationOutcomeSchema,
      trackBEligibilityOutcomeSchema,
    ]),
    pendingReason: pendingReasonSchema.nullable(),
    orderedReasonCodes: z.array(z.string().min(1)),
    resultHash: z.string().regex(/^sha256:[0-9a-f]{64}$/),
    policyBundleId: z.string().min(1),
    syntheticOnly: z.literal(true),
  })
  .strict();

export type TrackAOutcome = z.infer<typeof trackAOutcomeSchema>;
export type TrackBInvitationOutcome = z.infer<typeof trackBInvitationOutcomeSchema>;
export type TrackBEligibilityOutcome = z.infer<typeof trackBEligibilityOutcomeSchema>;
export type DecisionKind = z.infer<typeof decisionKindSchema>;
export type DecisionSummary = z.infer<typeof decisionSummarySchema>;
