import { runScoring, type ScoringPolicy } from '@gt-selection/cat-engine';
import type { PersistedResponse } from '@gt-selection/contracts';
import { buildBankItem } from '@gt-selection/item-bank';
import { syntheticClassicalItem, syntheticIrtItem } from '@gt-selection/test-fixtures';
import { describe, expect, it } from 'vitest';

import {
  specItemToItemParameters,
  toEngineInputs,
  toItemParameters,
  toRawResponse,
} from './cat-adapter';

const OPTS = { rapidGuessThresholdMs: 400 } as const;

function persisted(overrides: Partial<PersistedResponse> = {}): PersistedResponse {
  return {
    itemId: syntheticIrtItem.itemId,
    domain: 'fluid_reasoning',
    orderNo: 1,
    correct: true,
    score: 1,
    rtMs: 8200,
    firstActionMs: 1400,
    revisions: 0,
    engaged: true,
    measurements: {},
    ...overrides,
  };
}

describe('cat-adapter: contract response -> engine RawResponse', () => {
  it('renames orderNo -> order and engaged -> onTask, carries correctness', () => {
    const raw = toRawResponse(persisted({ orderNo: 3, engaged: false, correct: false }));
    expect(raw).toEqual({
      itemId: syntheticIrtItem.itemId,
      order: 3,
      rtMs: 8200,
      correct: false,
      onTask: false,
    });
  });
});

describe('cat-adapter: contract item -> engine ItemParameters', () => {
  it('carries pinned IRT + ordinal difficulty for an IRT item', () => {
    const params = toItemParameters(syntheticIrtItem, OPTS);
    expect(params.irt).toEqual({ a: 1.2, b: -0.275, c: 0, model: '2PL' });
    expect(params.difficultyLevel).toBe(4);
    expect(params.domain).toBe('fluid_reasoning');
    expect(params.rapidGuessThresholdMs).toBe(400);
  });

  it('falls back to a neutral 2PL when the item has no IRT (classical)', () => {
    const params = toItemParameters(syntheticClassicalItem, OPTS);
    expect(params.irt).toEqual({ a: 1, b: 0, c: 0, model: '2PL' });
  });
});

describe('cat-adapter: item-bank spec item -> engine ItemParameters', () => {
  it('maps a standardized spec bank item into engine parameters', () => {
    const spec = buildBankItem('QUANT-SERIES-01', 3, '6-8', 0);
    const params = specItemToItemParameters(spec, OPTS);
    expect(params.itemId).toBe(spec.itemId);
    expect(params.domain).toBe('quantitative');
    expect(params.difficultyLevel).toBe(3);
    expect(params.irt.a).toBeGreaterThan(0);
    expect(['1PL', '2PL', '3PL']).toContain(params.irt.model);
  });
});

describe('cat-adapter: end-to-end into the real engine (no math change)', () => {
  const policy: ScoringPolicy = {
    policyVersion: 'exam-adapter-test-v1',
    fitWeights: { fluid_reasoning: 1 },
    learningRateWeight: 0,
    consistencyWeight: 0,
    admitCut: 0.5,
    retryCut: -0.5,
  };

  it('maps a contract log + items and scores them through runScoring', () => {
    const responses = [persisted({ orderNo: 1 }), persisted({ orderNo: 2, correct: false })];
    const { log, items } = toEngineInputs(responses, [syntheticIrtItem], OPTS);

    expect(log).toHaveLength(2);
    expect(items).toHaveLength(1);

    const result = runScoring({ log, items, policy, seed: 'adapter-seed' });

    expect(result.syntheticOnly).toBe(true);
    expect(result.validated).toBe(false);
    expect(result.policyVersion).toBe('exam-adapter-test-v1');
    expect(result.domainScores.map((d) => d.domain)).toContain('fluid_reasoning');
    expect(typeof result.compositeTheta).toBe('number');
  });
});
