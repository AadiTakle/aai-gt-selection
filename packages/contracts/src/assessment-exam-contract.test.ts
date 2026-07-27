import { describe, expect, it } from 'vitest';

import {
  examItemSchema,
  examPolicySchema,
  screeningOutcomeSchema,
  sessionSchema,
  servedItemSchema,
  telemetryEventSchema,
} from './index';

const uuid = '00000000-0000-4000-8000-000000000001';

/**
 * These tests are the acceptance evidence for the STRUCTURE-AGNOSTIC property
 * (R11/D-016): the same schemas must validate a linear fixed form and an
 * adaptive form, IRT must be optional, and adaptive-only live state must NOT be
 * bakeable into the required session shape.
 */
describe('format-agnostic exam contracts', () => {
  const linearPolicy = {
    policyVersion: 'exam-syn-linear-v1',
    deliveryStructure: 'linear' as const,
    domains: ['fluid_reasoning', 'verbal', 'quantitative', 'spatial'] as const,
    scoringModel: 'classical' as const,
    itemSelection: { strategy: 'fixed_order' as const, params: {} },
    stopRule: { kind: 'fixed_count' as const, params: { count: 8 } },
    decision: { advanceCut: 0.8, retryFloor: -0.8 },
    structureConfig: {},
    syntheticOnly: true as const,
    validated: false as const,
  };

  const adaptivePolicy = {
    ...linearPolicy,
    policyVersion: 'exam-syn-adaptive-v1',
    deliveryStructure: 'adaptive' as const,
    scoringModel: 'irt_2pl' as const,
    itemSelection: { strategy: 'max_information' as const, params: { exposureTopK: 3 } },
    stopRule: { kind: 'target_precision' as const, params: { targetSe: 0.42 } },
    structureConfig: { priorMean: 0, priorSd: 1 },
  };

  it('accepts a linear (non-adaptive) policy with no adaptive-specific fields', () => {
    expect(examPolicySchema.parse(linearPolicy)).toEqual(linearPolicy);
  });

  it('accepts an adaptive policy expressed purely through tunable config', () => {
    expect(examPolicySchema.parse(adaptivePolicy)).toEqual(adaptivePolicy);
  });

  it('accepts a two_stage policy without any schema change', () => {
    const twoStage = {
      ...linearPolicy,
      policyVersion: 'exam-syn-two-stage-v1',
      deliveryStructure: 'two_stage' as const,
      itemSelection: { strategy: 'stratified' as const, params: { routingStages: 2 } },
      stopRule: { kind: 'custom' as const, params: { stages: ['screener', 'measurement'] } },
      structureConfig: { routingRule: 'number_correct', panels: 2 },
    };
    expect(examPolicySchema.parse(twoStage)).toEqual(twoStage);
  });

  it('requires validated=false and syntheticOnly=true on a policy', () => {
    expect(examPolicySchema.safeParse({ ...linearPolicy, validated: true }).success).toBe(false);
    expect(examPolicySchema.safeParse({ ...linearPolicy, syntheticOnly: false }).success).toBe(
      false,
    );
  });

  it('treats IRT parameters as optional on an item', () => {
    const classicalItem = {
      itemId: uuid,
      typeCode: 'VER-CLOZE-01',
      domain: 'verbal' as const,
      difficultyLevel: 5,
      ageBands: ['4-5'] as const,
      scoringModel: 'classical' as const,
      irt: null,
      demoPath: 'VER-CLOZE-01.html',
      params: { seed: 'VER-CLOZE-01-5' },
      syntheticOnly: true as const,
    };
    const irtItem = {
      ...classicalItem,
      itemId: '00000000-0000-4000-8000-000000000002',
      scoringModel: 'irt_2pl' as const,
      irt: { a: 1.2, b: 0.1, c: 0, model: '2PL' as const },
    };

    expect(examItemSchema.parse(classicalItem)).toEqual(classicalItem);
    expect(examItemSchema.parse(irtItem)).toEqual(irtItem);
  });

  it('rejects an item that claims IRT scoring but carries no IRT parameters', () => {
    const brokenItem = {
      itemId: uuid,
      typeCode: 'FLU-MATRIX-01',
      domain: 'fluid_reasoning' as const,
      difficultyLevel: 3,
      ageBands: ['K-1'] as const,
      scoringModel: 'irt_2pl' as const,
      irt: null,
      demoPath: 'FLU-MATRIX-01.html',
      params: {},
      syntheticOnly: true as const,
    };
    expect(examItemSchema.safeParse(brokenItem).success).toBe(false);
  });

  it('accepts an item with no difficulty ladder (difficultyLevel null)', () => {
    const item = {
      itemId: uuid,
      typeCode: 'SPA-ROLL-01',
      domain: 'spatial' as const,
      difficultyLevel: null,
      ageBands: ['6-8'] as const,
      scoringModel: 'rule_based' as const,
      irt: null,
      demoPath: 'SPA-ROLL-01.html',
      params: {},
      syntheticOnly: true as const,
    };
    expect(examItemSchema.parse(item).difficultyLevel).toBeNull();
  });

  it('does not leak scoring parameters to the served item', () => {
    const served = {
      itemId: uuid,
      typeCode: 'FLU-MATRIX-01',
      domain: 'fluid_reasoning' as const,
      difficultyLevel: 3,
      demoPath: 'FLU-MATRIX-01.html',
      params: {},
    };
    expect(servedItemSchema.parse(served)).toEqual(served);
    expect(
      servedItemSchema.safeParse({ ...served, irt: { a: 1, b: 0, c: 0, model: '2PL' } }).success,
    ).toBe(false);
  });

  it('carries session progress with no baked live ability state', () => {
    const session = {
      sessionId: uuid,
      participantId: uuid,
      status: 'active' as const,
      ageBand: '4-5' as const,
      policyVersion: 'exam-syn-linear-v1',
      deliveryStructure: 'linear' as const,
      progress: [{ domain: 'verbal' as const, itemsAdministered: 2, done: false }],
      structureState: null,
      startedAt: '2026-07-27T12:00:00.000Z',
    };
    expect(sessionSchema.parse(session)).toEqual(session);
  });

  it('rejects a session that bakes adaptive ability state (theta/se) into its shape', () => {
    const sessionWithTheta = {
      sessionId: uuid,
      participantId: uuid,
      status: 'active' as const,
      ageBand: '4-5' as const,
      policyVersion: 'exam-syn-adaptive-v1',
      deliveryStructure: 'adaptive' as const,
      progress: [],
      structureState: null,
      startedAt: '2026-07-27T12:00:00.000Z',
      abilities: [{ domain: 'verbal', theta: 0.4, se: 0.5, itemsAdministered: 2, done: false }],
    };
    expect(sessionSchema.safeParse(sessionWithTheta).success).toBe(false);
  });

  it('keeps adaptive live state expressible through opaque structureState', () => {
    const adaptiveSession = {
      sessionId: uuid,
      participantId: uuid,
      status: 'active' as const,
      ageBand: '4-5' as const,
      policyVersion: 'exam-syn-adaptive-v1',
      deliveryStructure: 'adaptive' as const,
      progress: [{ domain: 'verbal' as const, itemsAdministered: 2, done: false }],
      structureState: { verbal: { theta: 0.4, se: 0.5 } },
      startedAt: '2026-07-27T12:00:00.000Z',
    };
    expect(sessionSchema.parse(adaptiveSession).structureState).toEqual({
      verbal: { theta: 0.4, se: 0.5 },
    });
  });

  it('uses claim-safe screening decisions and rejects admission language', () => {
    const outcome = {
      domainScores: [
        {
          domain: 'verbal' as const,
          score: 72,
          scoreScale: 'percent' as const,
          se: null,
          percentile: 72,
          itemsAdministered: 8,
          metrics: { maxDifficultyReached: 6 },
        },
      ],
      composite: 71,
      compositeScale: 'percent' as const,
      engagementValid: true,
      decision: 'advance' as const,
      policyVersion: 'exam-syn-linear-v1',
      claimBoundary: 'A reliable screen is not program-impact evidence (R10).',
      metrics: { fitIndex: 0.71 },
      syntheticOnly: true as const,
      validated: false as const,
    };

    expect(screeningOutcomeSchema.parse(outcome)).toEqual(outcome);
    expect(screeningOutcomeSchema.safeParse({ ...outcome, decision: 'admit' }).success).toBe(false);
    expect(screeningOutcomeSchema.safeParse({ ...outcome, claimBoundary: '' }).success).toBe(false);
  });

  it('accepts a generic telemetry kind vocabulary but rejects malformed kinds', () => {
    const base = { itemId: uuid, tOffsetMs: 120, payload: {} };
    expect(telemetryEventSchema.parse({ ...base, kind: 'custom_stage_advance' }).kind).toBe(
      'custom_stage_advance',
    );
    expect(telemetryEventSchema.safeParse({ ...base, kind: 'Item Shown' }).success).toBe(false);
  });
});
