import { describe, expect, it } from 'vitest';

import type { ItemParameters, RawResponse, ScoringPolicy } from './types';
import { scoreItems } from './item-scoring';
import { buildResult, compositeTheta, decisionConfidence, summarizeEngagement } from './result';
import { scoreDomains } from './item-scoring';

const policy: ScoringPolicy = {
  policyVersion: 'exam-policy-v1',
  fitWeights: { fluid_reasoning: 1, verbal: 1 },
  learningRateWeight: 0.1,
  consistencyWeight: 0.1,
  admitCut: 0.4,
  retryCut: -0.4,
  minEngagementRate: 0.8,
};

function buildParams(): Map<string, ItemParameters> {
  const params: ItemParameters[] = [];
  for (const domain of ['fluid_reasoning', 'verbal']) {
    for (let k = 0; k < 4; k++) {
      params.push({
        itemId: `${domain}-${k}`,
        domain,
        irt: { a: 1.4, b: -1 + k * 0.8, c: 0, model: '2PL' },
        difficultyLevel: k + 1,
        rapidGuessThresholdMs: 800,
      });
    }
  }
  return new Map(params.map((p) => [p.itemId, p]));
}

function engagedLog(): RawResponse[] {
  const log: RawResponse[] = [];
  let order = 1;
  for (const domain of ['fluid_reasoning', 'verbal']) {
    for (let k = 0; k < 4; k++) {
      log.push({ itemId: `${domain}-${k}`, order: order++, rtMs: 3000 + k * 200, correct: k < 3 });
    }
  }
  return log;
}

describe('summarizeEngagement', () => {
  it('counts effort validity and applies the engagement gate', () => {
    const paramsById = buildParams();
    const log = engagedLog();
    // Make two responses rapid guesses -> 6/8 effort-valid = 0.75 < 0.8 gate.
    log[0]!.rtMs = 200;
    log[1]!.rtMs = 200;
    const scored = scoreItems(log, paramsById);
    const engagement = summarizeEngagement(scored, policy);
    expect(engagement.totalResponses).toBe(8);
    expect(engagement.rapidGuessResponses).toBe(2);
    expect(engagement.effortValidResponses).toBe(6);
    expect(engagement.responseTimeEffort).toBeCloseTo(0.75, 9);
    expect(engagement.engagementValid).toBe(false);
  });
});

describe('compositeTheta', () => {
  it('averages theta over domains with at least one effort-valid item', () => {
    const scored = scoreItems(engagedLog(), buildParams());
    const ds = scoreDomains(scored, ['fluid_reasoning', 'verbal'], policy);
    const expected = (ds[0]!.theta + ds[1]!.theta) / 2;
    expect(compositeTheta(ds)).toBeCloseTo(expected, 9);
  });
});

describe('decisionConfidence', () => {
  it('is deterministic in [0,1] for a fixed seed', () => {
    const scored = scoreItems(engagedLog(), buildParams());
    const c1 = decisionConfidence(scored, ['fluid_reasoning', 'verbal'], policy, 'admit', 'seed-x', 100);
    const c2 = decisionConfidence(scored, ['fluid_reasoning', 'verbal'], policy, 'admit', 'seed-x', 100);
    expect(c1).toBe(c2);
    expect(c1).toBeGreaterThanOrEqual(0);
    expect(c1).toBeLessThanOrEqual(1);
  });

  it('is 0 when there are no effort-valid items', () => {
    expect(decisionConfidence([], ['fluid_reasoning'], policy, 'retry', 'seed', 100)).toBe(0);
  });
});

describe('buildResult', () => {
  it('forces a retry decision when the engagement gate fails', () => {
    const paramsById = buildParams();
    const log = engagedLog();
    for (let i = 0; i < 7; i++) log[i]!.rtMs = 200; // 1/8 effort-valid -> gate fails
    const scored = scoreItems(log, paramsById);
    const result = buildResult({
      items: scored,
      domains: ['fluid_reasoning', 'verbal'],
      policy,
      seed: 'seed-1',
      confidenceIterations: 50,
    });
    expect(result.engagement.engagementValid).toBe(false);
    expect(result.decision).toBe('retry');
  });

  it('carries the synthetic-only claim boundary and flags', () => {
    const scored = scoreItems(engagedLog(), buildParams());
    const result = buildResult({
      items: scored,
      domains: ['fluid_reasoning', 'verbal'],
      policy,
      seed: 'seed-1',
      confidenceIterations: 50,
    });
    expect(result.syntheticOnly).toBe(true);
    expect(result.validated).toBe(false);
    expect(result.claimBoundary).toContain('synthetic_only=true');
    expect(result.decisionConfidence).toBeGreaterThanOrEqual(0);
    expect(result.decisionConfidence).toBeLessThanOrEqual(1);
  });
});
