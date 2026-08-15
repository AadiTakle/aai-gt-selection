import { z } from 'zod';

import { reasonCodeSchema } from './reason-codes';
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

const decisionSummaryBaseSchema = z
  .object({
    decisionId: z.uuid(),
    pendingReason: pendingReasonSchema.nullable(),
    orderedReasonCodes: z.array(reasonCodeSchema).min(1),
    resultHash: z.string().regex(/^sha256:[0-9a-f]{64}$/),
    policyBundleId: z.string().min(1),
    syntheticOnly: z.literal(true),
  })
  .strict();

export const trackADecisionSummarySchema = decisionSummaryBaseSchema.extend({
  decisionKind: z.literal('track_a_eligibility'),
  outcome: trackAOutcomeSchema,
});

export const trackBInvitationDecisionSummarySchema = decisionSummaryBaseSchema.extend({
  decisionKind: z.literal('track_b_invitation'),
  outcome: trackBInvitationOutcomeSchema,
});

export const trackBEligibilityDecisionSummarySchema = decisionSummaryBaseSchema.extend({
  decisionKind: z.literal('track_b_eligibility'),
  outcome: trackBEligibilityOutcomeSchema,
});

export const decisionSummarySchema = z.discriminatedUnion('decisionKind', [
  trackADecisionSummarySchema,
  trackBInvitationDecisionSummarySchema,
  trackBEligibilityDecisionSummarySchema,
]);

export type TrackAOutcome = z.infer<typeof trackAOutcomeSchema>;
export type TrackBInvitationOutcome = z.infer<typeof trackBInvitationOutcomeSchema>;
export type TrackBEligibilityOutcome = z.infer<typeof trackBEligibilityOutcomeSchema>;
export type DecisionKind = z.infer<typeof decisionKindSchema>;
export type TrackADecisionSummary = z.infer<typeof trackADecisionSummarySchema>;
export type TrackBInvitationDecisionSummary = z.infer<typeof trackBInvitationDecisionSummarySchema>;
export type TrackBEligibilityDecisionSummary = z.infer<
  typeof trackBEligibilityDecisionSummarySchema
>;
export type DecisionSummary = z.infer<typeof decisionSummarySchema>;
