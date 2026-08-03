import { z } from 'zod';

import { apiSuccessSchema } from './api-envelope';
import { decisionSummarySchema } from './decision';

const sha256Schema = z.string().regex(/^sha256:[0-9a-f]{64}$/);

export const replayModeSchema = z.enum([
  'exact_reexecution',
  'record_reconstruction',
  'digest_verification',
]);

export const replayStatusSchema = z.enum([
  'reexecuted_exact',
  'record_reconstructed',
  'digest_verified',
  'not_replayable_missing_artifact',
  'not_replayable_inputs_disposed',
  'failed_integrity_check',
  'failed_execution_mismatch',
]);

export const replayDecisionRequestSchema = z
  .object({
    decisionRunId: z.uuid(),
    requestedMode: replayModeSchema,
    expectedDecisionRoot: sha256Schema,
    idempotencyKey: z.uuid(),
    correlationId: z.uuid(),
  })
  .strict();

const verificationStateSchema = z.enum([
  'verified',
  'not_checked',
  'unavailable',
  'disposed',
  'mismatch',
]);

export const replayVerificationSchema = z
  .object({
    canonicalInput: verificationStateSchema,
    inputManifest: verificationStateSchema,
    policyBundle: verificationStateSchema,
    executableArtifact: verificationStateSchema,
    environmentArtifact: verificationStateSchema,
    outcome: verificationStateSchema,
    orderedReasons: verificationStateSchema,
    trace: verificationStateSchema,
    decisionRoot: verificationStateSchema,
    auditChain: verificationStateSchema,
  })
  .strict();

const exactVerificationSchema = replayVerificationSchema.extend({
  canonicalInput: z.literal('verified'),
  inputManifest: z.literal('verified'),
  policyBundle: z.literal('verified'),
  executableArtifact: z.literal('verified'),
  environmentArtifact: z.literal('verified'),
  outcome: z.literal('verified'),
  orderedReasons: z.literal('verified'),
  trace: z.literal('verified'),
  decisionRoot: z.literal('verified'),
  auditChain: z.literal('verified'),
});

const reconstructionVerificationSchema = exactVerificationSchema.extend({
  executableArtifact: z.literal('not_checked'),
  environmentArtifact: z.literal('not_checked'),
});

const digestVerificationSchema = replayVerificationSchema.extend({
  canonicalInput: z.literal('not_checked'),
  inputManifest: z.literal('not_checked'),
  policyBundle: z.literal('not_checked'),
  executableArtifact: z.literal('not_checked'),
  environmentArtifact: z.literal('not_checked'),
  outcome: z.literal('not_checked'),
  orderedReasons: z.literal('not_checked'),
  trace: z.literal('not_checked'),
  decisionRoot: z.literal('verified'),
  auditChain: z.literal('verified'),
});

const replayResultBaseFields = {
  decisionRunId: z.uuid(),
  storedDecision: decisionSummarySchema,
  decisionRootBefore: sha256Schema,
  networkAccessUsed: z.literal(false),
  auditEventId: z.uuid(),
  syntheticOnly: z.literal(true),
};

const exactReplayResultSchema = z
  .object({
    ...replayResultBaseFields,
    requestedMode: z.literal('exact_reexecution'),
    status: z.literal('reexecuted_exact'),
    replayedDecision: decisionSummarySchema,
    verification: exactVerificationSchema,
    decisionRootAfter: sha256Schema,
    exactReplayClaimed: z.literal(true),
    failureCode: z.null(),
  })
  .strict()
  .superRefine((result, context) => {
    if (
      result.decisionRootBefore !== result.decisionRootAfter ||
      JSON.stringify(result.storedDecision) !== JSON.stringify(result.replayedDecision)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Exact replay requires identical stored and replayed decisions and roots.',
      });
    }
  });

const reconstructedReplayResultSchema = z
  .object({
    ...replayResultBaseFields,
    requestedMode: z.literal('record_reconstruction'),
    status: z.literal('record_reconstructed'),
    replayedDecision: z.null(),
    verification: reconstructionVerificationSchema,
    decisionRootAfter: z.null(),
    exactReplayClaimed: z.literal(false),
    failureCode: z.null(),
  })
  .strict();

const digestReplayResultSchema = z
  .object({
    ...replayResultBaseFields,
    requestedMode: z.literal('digest_verification'),
    status: z.literal('digest_verified'),
    replayedDecision: z.null(),
    verification: digestVerificationSchema,
    decisionRootAfter: z.null(),
    exactReplayClaimed: z.literal(false),
    failureCode: z.null(),
  })
  .strict();

const missingArtifactReplayResultSchema = z
  .object({
    ...replayResultBaseFields,
    requestedMode: z.literal('exact_reexecution'),
    status: z.literal('not_replayable_missing_artifact'),
    replayedDecision: z.null(),
    verification: replayVerificationSchema,
    decisionRootAfter: z.null(),
    exactReplayClaimed: z.literal(false),
    failureCode: z.enum(['executable_unavailable', 'environment_unavailable']),
  })
  .strict();

const disposedInputReplayResultSchema = z
  .object({
    ...replayResultBaseFields,
    requestedMode: z.literal('exact_reexecution'),
    status: z.literal('not_replayable_inputs_disposed'),
    replayedDecision: z.null(),
    verification: replayVerificationSchema,
    decisionRootAfter: z.null(),
    exactReplayClaimed: z.literal(false),
    failureCode: z.literal('input_payload_disposed'),
  })
  .strict();

export const replayIntegrityFailureCodeSchema = z.enum([
  'unsupported_schema_profile',
  'invalid_canonical_bytes',
  'missing_reference',
  'input_hash_mismatch',
  'policy_hash_mismatch',
  'executable_hash_mismatch',
  'environment_mismatch',
  'audit_chain_mismatch',
]);

const integrityFailureReplayResultSchema = z
  .object({
    ...replayResultBaseFields,
    requestedMode: z.union([z.literal('exact_reexecution'), z.literal('digest_verification')]),
    status: z.literal('failed_integrity_check'),
    replayedDecision: z.null(),
    verification: replayVerificationSchema,
    decisionRootAfter: z.null(),
    exactReplayClaimed: z.literal(false),
    failureCode: replayIntegrityFailureCodeSchema,
  })
  .strict();

export const replayExecutionMismatchCodeSchema = z.enum([
  'engine_error',
  'outcome_mismatch',
  'reason_order_mismatch',
  'trace_mismatch',
  'result_root_mismatch',
]);

const executionMismatchReplayResultSchema = z
  .object({
    ...replayResultBaseFields,
    requestedMode: z.literal('exact_reexecution'),
    status: z.literal('failed_execution_mismatch'),
    replayedDecision: decisionSummarySchema,
    verification: replayVerificationSchema,
    decisionRootAfter: sha256Schema,
    exactReplayClaimed: z.literal(false),
    failureCode: replayExecutionMismatchCodeSchema,
  })
  .strict();

export const replayDecisionResultSchema = z.union([
  exactReplayResultSchema,
  reconstructedReplayResultSchema,
  digestReplayResultSchema,
  missingArtifactReplayResultSchema,
  disposedInputReplayResultSchema,
  integrityFailureReplayResultSchema,
  executionMismatchReplayResultSchema,
]);

export const replayDecisionResponseSchema = apiSuccessSchema(replayDecisionResultSchema);

export type ReplayMode = z.infer<typeof replayModeSchema>;
export type ReplayStatus = z.infer<typeof replayStatusSchema>;
export type ReplayDecisionRequest = z.infer<typeof replayDecisionRequestSchema>;
export type ReplayVerification = z.infer<typeof replayVerificationSchema>;
export type ReplayDecisionResult = z.infer<typeof replayDecisionResultSchema>;
export type ReplayDecisionResponse = z.infer<typeof replayDecisionResponseSchema>;
