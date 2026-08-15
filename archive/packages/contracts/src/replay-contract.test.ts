import { describe, expect, it } from 'vitest';

import { replayDecisionRequestSchema, replayDecisionResponseSchema } from './index';

const decisionRunId = '00000000-0000-4000-8000-000000000921';
const correlationId = '00000000-0000-4000-8000-000000000301';
const idempotencyKey = '00000000-0000-4000-8000-000000000302';
const rootHash = `sha256:${'1'.repeat(64)}`;
const storedDecision = {
  decisionId: '00000000-0000-4000-8000-000000000901',
  decisionKind: 'track_b_invitation',
  outcome: 'invited',
  pendingReason: null,
  orderedReasonCodes: ['TB_COMPOSITE_BAND', 'TB_BATTERY_PROFILE'],
  resultHash: rootHash,
  policyBundleId: 'PB-SYN-01',
  syntheticOnly: true,
} as const;
const meta = {
  correlationId,
  idempotencyKey,
  idempotentReplay: false,
} as const;
const exactVerification = {
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

describe('decision replay contracts', () => {
  it('claims exact replay only when the full frozen result reproduces byte-for-byte', () => {
    const request = {
      decisionRunId,
      requestedMode: 'exact_reexecution',
      expectedDecisionRoot: rootHash,
      idempotencyKey,
      correlationId,
    } as const;
    const response = {
      apiVersion: 'v1',
      syntheticOnly: true,
      data: {
        decisionRunId,
        requestedMode: 'exact_reexecution',
        status: 'reexecuted_exact',
        storedDecision,
        replayedDecision: storedDecision,
        verification: exactVerification,
        decisionRootBefore: rootHash,
        decisionRootAfter: rootHash,
        exactReplayClaimed: true,
        networkAccessUsed: false,
        failureCode: null,
        auditEventId: '00000000-0000-4000-8000-000000000931',
        syntheticOnly: true,
      },
      meta,
    } as const;

    expect(replayDecisionRequestSchema.parse(request)).toEqual(request);
    expect(replayDecisionResponseSchema.parse(response)).toEqual(response);
    expect(
      replayDecisionResponseSchema.safeParse({
        ...response,
        data: {
          ...response.data,
          replayedDecision: {
            ...storedDecision,
            orderedReasonCodes: ['TB_BATTERY_PROFILE', 'TB_COMPOSITE_BAND'],
          },
        },
      }).success,
    ).toBe(false);
  });

  it('distinguishes reconstruction and digest verification from exact replay', () => {
    const reconstruction = {
      apiVersion: 'v1',
      syntheticOnly: true,
      data: {
        decisionRunId,
        requestedMode: 'record_reconstruction',
        status: 'record_reconstructed',
        storedDecision,
        replayedDecision: null,
        verification: {
          ...exactVerification,
          executableArtifact: 'not_checked',
          environmentArtifact: 'not_checked',
        },
        decisionRootBefore: rootHash,
        decisionRootAfter: null,
        exactReplayClaimed: false,
        networkAccessUsed: false,
        failureCode: null,
        auditEventId: '00000000-0000-4000-8000-000000000932',
        syntheticOnly: true,
      },
      meta,
    } as const;
    const digest = {
      apiVersion: 'v1',
      syntheticOnly: true,
      data: {
        decisionRunId,
        requestedMode: 'digest_verification',
        status: 'digest_verified',
        storedDecision,
        replayedDecision: null,
        verification: {
          canonicalInput: 'not_checked',
          inputManifest: 'not_checked',
          policyBundle: 'not_checked',
          executableArtifact: 'not_checked',
          environmentArtifact: 'not_checked',
          outcome: 'not_checked',
          orderedReasons: 'not_checked',
          trace: 'not_checked',
          decisionRoot: 'verified',
          auditChain: 'verified',
        },
        decisionRootBefore: rootHash,
        decisionRootAfter: null,
        exactReplayClaimed: false,
        networkAccessUsed: false,
        failureCode: null,
        auditEventId: '00000000-0000-4000-8000-000000000933',
        syntheticOnly: true,
      },
      meta,
    } as const;

    expect(replayDecisionResponseSchema.parse(reconstruction)).toEqual(reconstruction);
    expect(replayDecisionResponseSchema.parse(digest)).toEqual(digest);
  });

  it('truthfully refuses exact replay when artifacts are missing or inputs disposed', () => {
    const refusalBase = {
      apiVersion: 'v1',
      syntheticOnly: true,
      data: {
        decisionRunId,
        requestedMode: 'exact_reexecution',
        storedDecision,
        replayedDecision: null,
        decisionRootBefore: rootHash,
        decisionRootAfter: null,
        exactReplayClaimed: false,
        networkAccessUsed: false,
        auditEventId: '00000000-0000-4000-8000-000000000934',
        syntheticOnly: true,
      },
      meta,
    } as const;
    const missingArtifact = {
      ...refusalBase,
      data: {
        ...refusalBase.data,
        status: 'not_replayable_missing_artifact',
        failureCode: 'executable_unavailable',
        verification: {
          ...exactVerification,
          executableArtifact: 'unavailable',
          environmentArtifact: 'not_checked',
          outcome: 'not_checked',
          orderedReasons: 'not_checked',
          trace: 'not_checked',
          decisionRoot: 'not_checked',
        },
      },
    } as const;
    const disposedInput = {
      ...refusalBase,
      data: {
        ...refusalBase.data,
        status: 'not_replayable_inputs_disposed',
        failureCode: 'input_payload_disposed',
        verification: {
          ...exactVerification,
          canonicalInput: 'disposed',
          inputManifest: 'not_checked',
          policyBundle: 'not_checked',
          executableArtifact: 'not_checked',
          environmentArtifact: 'not_checked',
          outcome: 'not_checked',
          orderedReasons: 'not_checked',
          trace: 'not_checked',
          decisionRoot: 'not_checked',
        },
      },
    } as const;
    const missingEnvironment = {
      ...missingArtifact,
      data: {
        ...missingArtifact.data,
        failureCode: 'environment_unavailable',
        verification: {
          ...missingArtifact.data.verification,
          executableArtifact: 'verified',
          environmentArtifact: 'unavailable',
        },
        auditEventId: '00000000-0000-4000-8000-000000000937',
      },
    } as const;

    expect(replayDecisionResponseSchema.parse(missingArtifact)).toEqual(missingArtifact);
    expect(replayDecisionResponseSchema.parse(missingEnvironment)).toEqual(missingEnvironment);
    expect(replayDecisionResponseSchema.parse(disposedInput)).toEqual(disposedInput);
  });

  it('reports integrity and execution mismatches without an exact claim', () => {
    const integrityFailure = {
      apiVersion: 'v1',
      syntheticOnly: true,
      data: {
        decisionRunId,
        requestedMode: 'exact_reexecution',
        status: 'failed_integrity_check',
        storedDecision,
        replayedDecision: null,
        verification: {
          ...exactVerification,
          inputManifest: 'mismatch',
          policyBundle: 'not_checked',
          executableArtifact: 'not_checked',
          environmentArtifact: 'not_checked',
          outcome: 'not_checked',
          orderedReasons: 'not_checked',
          trace: 'not_checked',
          decisionRoot: 'not_checked',
          auditChain: 'not_checked',
        },
        decisionRootBefore: rootHash,
        decisionRootAfter: null,
        exactReplayClaimed: false,
        networkAccessUsed: false,
        failureCode: 'input_hash_mismatch',
        auditEventId: '00000000-0000-4000-8000-000000000935',
        syntheticOnly: true,
      },
      meta,
    } as const;
    const executionMismatch = {
      apiVersion: 'v1',
      syntheticOnly: true,
      data: {
        ...integrityFailure.data,
        status: 'failed_execution_mismatch',
        replayedDecision: {
          ...storedDecision,
          orderedReasonCodes: ['TB_BATTERY_PROFILE', 'TB_COMPOSITE_BAND'],
        },
        verification: {
          ...exactVerification,
          orderedReasons: 'mismatch',
          trace: 'not_checked',
          decisionRoot: 'not_checked',
          auditChain: 'not_checked',
        },
        decisionRootAfter: `sha256:${'2'.repeat(64)}`,
        failureCode: 'reason_order_mismatch',
        auditEventId: '00000000-0000-4000-8000-000000000936',
      },
      meta,
    } as const;

    expect(replayDecisionResponseSchema.parse(integrityFailure)).toEqual(integrityFailure);
    expect(replayDecisionResponseSchema.parse(executionMismatch)).toEqual(executionMismatch);
  });
});
