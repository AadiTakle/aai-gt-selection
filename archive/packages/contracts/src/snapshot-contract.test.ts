import { describe, expect, it } from 'vitest';

import { submitSnapshotVersionRequestSchema, submitSnapshotVersionResponseSchema } from './index';

const applicationId = '00000000-0000-4000-8000-000000000001';
const snapshotVersionId = '00000000-0000-4000-8000-000000000501';
const reviewCaseId = '00000000-0000-4000-8000-000000000601';
const artifactReference = {
  fixtureId: 'fixture:artifact-qualifying',
  route: 'artifact',
  domainCode: 'synthetic-mathematics',
  syntheticOnly: true,
  provenance: {
    creationMethod: 'independent_synthetic_construction',
    sourceRecordUsed: false,
    reviewedAt: '2026-07-18T12:00:00.000Z',
  },
} as const;
const narrativeReference = {
  ...artifactReference,
  fixtureId: 'fixture:narrative-qualifying',
  route: 'narrative',
  domainCode: 'synthetic-music',
} as const;

const meta = {
  correlationId: '00000000-0000-4000-8000-000000000301',
  idempotencyKey: '00000000-0000-4000-8000-000000000302',
  idempotentReplay: false,
} as const;

const status = {
  workflowStatus: 'snapshot_under_review',
  displayLabelCode: 'STATUS_SNAPSHOT_UNDER_REVIEW',
  phase: 'review',
  familyActionRequired: false,
  nextActionCode: 'AWAIT_REVIEW',
  deadline: null,
  pendingReason: null,
  claimBoundaryCode: 'ELIGIBILITY_NOT_ADMISSION',
} as const;

describe('Snapshot submission contracts', () => {
  it('accepts one or two artifact fixture references and returns two blind assignments', () => {
    const snapshot = {
      route: 'artifact',
      domainCodes: ['synthetic-mathematics'],
      fixtureReferences: [artifactReference],
      syntheticOnly: true,
    } as const;
    const request = {
      applicationId,
      trackBInvitationDecisionId: '00000000-0000-4000-8000-000000000401',
      snapshot,
      supersedesSnapshotVersionId: null,
      expectedVersion: 0,
      idempotencyKey: meta.idempotencyKey,
      correlationId: meta.correlationId,
    };
    const response = {
      apiVersion: 'v1',
      syntheticOnly: true,
      data: {
        snapshot: {
          snapshotVersionId,
          applicationId,
          version: 1,
          supersedesId: null,
          contentHash: `sha256:${'1'.repeat(64)}`,
          ...snapshot,
        },
        reviewCase: {
          reviewCaseId,
          snapshotVersionId,
          route: 'artifact',
          rubricVersionId: 'RB-SYN-01',
          workflowState: 'under_review',
          blind: true,
          initialAssignments: [
            {
              assignmentId: '00000000-0000-4000-8000-000000000701',
              slot: 1,
              reviewerRole: 'reviewer',
              status: 'assigned',
              blind: true,
              syntheticOnly: true,
            },
            {
              assignmentId: '00000000-0000-4000-8000-000000000702',
              slot: 2,
              reviewerRole: 'reviewer',
              status: 'assigned',
              blind: true,
              syntheticOnly: true,
            },
          ],
          syntheticOnly: true,
        },
        status,
      },
      meta,
    } as const;

    expect(submitSnapshotVersionRequestSchema.parse(request)).toEqual(request);
    expect(submitSnapshotVersionResponseSchema.parse(response)).toEqual(response);
    expect(
      submitSnapshotVersionRequestSchema.safeParse({
        ...request,
        snapshot: { ...snapshot, uploadUrl: 'https://example.invalid/child-artifact' },
      }).success,
    ).toBe(false);
    expect(
      submitSnapshotVersionRequestSchema.safeParse({
        ...request,
        snapshot: { ...snapshot, domainCodes: ['synthetic-music'] },
      }).success,
    ).toBe(false);
    expect(
      submitSnapshotVersionResponseSchema.safeParse({
        ...response,
        data: {
          ...response.data,
          reviewCase: {
            ...response.data.reviewCase,
            snapshotVersionId: '00000000-0000-4000-8000-000000000599',
          },
        },
      }).success,
    ).toBe(false);
  });

  it('requires bounded narrative provenance and returns three blind assignments', () => {
    const snapshot = {
      route: 'narrative',
      domainCodes: ['synthetic-music'],
      fixtureReferences: [narrativeReference],
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
    } as const;
    const request = {
      applicationId,
      trackBInvitationDecisionId: '00000000-0000-4000-8000-000000000401',
      snapshot,
      supersedesSnapshotVersionId: null,
      expectedVersion: 0,
      idempotencyKey: meta.idempotencyKey,
      correlationId: meta.correlationId,
    };
    const response = {
      apiVersion: 'v1',
      syntheticOnly: true,
      data: {
        snapshot: {
          snapshotVersionId,
          applicationId,
          version: 1,
          supersedesId: null,
          contentHash: `sha256:${'2'.repeat(64)}`,
          ...snapshot,
        },
        reviewCase: {
          reviewCaseId,
          snapshotVersionId,
          route: 'narrative',
          rubricVersionId: 'RB-SYN-01',
          workflowState: 'under_review',
          blind: true,
          initialAssignments: [
            {
              assignmentId: '00000000-0000-4000-8000-000000000703',
              slot: 1,
              reviewerRole: 'reviewer',
              status: 'assigned',
              blind: true,
              syntheticOnly: true,
            },
            {
              assignmentId: '00000000-0000-4000-8000-000000000704',
              slot: 2,
              reviewerRole: 'reviewer',
              status: 'assigned',
              blind: true,
              syntheticOnly: true,
            },
            {
              assignmentId: '00000000-0000-4000-8000-000000000705',
              slot: 3,
              reviewerRole: 'supervisor',
              status: 'assigned',
              blind: true,
              syntheticOnly: true,
            },
          ],
          syntheticOnly: true,
        },
        status,
      },
      meta,
    } as const;

    expect(submitSnapshotVersionRequestSchema.parse(request)).toEqual(request);
    expect(submitSnapshotVersionResponseSchema.parse(response)).toEqual(response);
    expect(
      submitSnapshotVersionRequestSchema.safeParse({
        ...request,
        snapshot: {
          route: snapshot.route,
          domainCodes: snapshot.domainCodes,
          fixtureReferences: snapshot.fixtureReferences,
          syntheticOnly: snapshot.syntheticOnly,
        },
      }).success,
    ).toBe(false);
  });
});
