import { z } from 'zod';

export const pendingReasonSchema = z.enum([
  'pending_assessment_correction',
  'pending_evidence_correction',
  'pending_additional_blind_review',
  'pending_accessibility_route',
  'pending_policy_configuration',
]);

export const workflowStatusSchema = z.enum([
  'application_draft',
  'awaiting_assessment',
  'assessment_needs_correction',
  'track_a_eligible',
  'track_b_snapshot_required',
  'snapshot_under_review',
  'review_pending_family_action',
  'review_pending_internal_action',
  'track_b_eligible',
  'track_b_does_not_currently_qualify',
  'no_current_pathway',
  'policy_configuration_pending',
]);

export const statusProjectionSchema = z
  .object({
    workflowStatus: workflowStatusSchema,
    displayLabelCode: z.string().min(1),
    phase: z.enum(['application', 'assessment', 'snapshot', 'review', 'decision']),
    familyActionRequired: z.boolean(),
    nextActionCode: z.string().min(1).nullable(),
    deadline: z.iso.datetime({ offset: true }).nullable(),
    pendingReason: pendingReasonSchema.nullable(),
    claimBoundaryCode: z.literal('ELIGIBILITY_NOT_ADMISSION'),
  })
  .strict();

export type PendingReason = z.infer<typeof pendingReasonSchema>;
export type WorkflowStatus = z.infer<typeof workflowStatusSchema>;
export type StatusProjection = z.infer<typeof statusProjectionSchema>;
