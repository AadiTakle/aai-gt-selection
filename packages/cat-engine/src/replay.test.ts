import { describe, expect, it } from 'vitest';

import type { ItemParameters, RawResponse, ScoringPolicy } from './types';
import { canonicalize, fingerprint, matchesFingerprint, runScoring, verifyReplay } from './replay';
import type { ReplayInput } from './replay';

const DOMAINS = ['fluid_reasoning', 'verbal', 'quantitative', 'spatial'];

const policy: ScoringPolicy = {
  policyVersion: 'exam-policy-v1',
  fitWeights: { fluid_reasoning: 1, verbal: 1, quantitative: 1, spatial: 1 },
  learningRateWeight: 0.1,
  consistencyWeight: 0.1,
  admitCut: 0.5,
  retryCut: -0.5,
  priorMean: 0,
  priorSd: 1,
  minEngagementRate: 0.8,
};

function buildItems(): ItemParameters[] {
  const items: ItemParameters[] = [];
  for (const domain of DOMAINS) {
    for (let k = 0; k < 3; k++) {
      items.push({
        itemId: `${domain}-${k}`,
        domain,
        irt: { a: 1.3 + k * 0.1, b: -1 + k, c: 0, model: '2PL' },
        difficultyLevel: k + 1,
        answerKey: 'A',
        rapidGuessThresholdMs: 800,
      });
    }
  }
  return items;
}

function buildLog(): RawResponse[] {
  const log: RawResponse[] = [];
  let order = 1;
  for (const domain of DOMAINS) {
    for (let k = 0; k < 3; k++) {
      // Answer the two easier items correctly, miss the hardest one.
      log.push({
        itemId: `${domain}-${k}`,
        order: order++,
        rtMs: 2500 + k * 300,
        answer: k < 2 ? 'A' : 'B',
      });
    }
  }
  // One rapid guess to exercise the RTE gate inside replay.
  log[0]!.rtMs = 200;
  return log;
}

function buildInput(over: Partial<ReplayInput> = {}): ReplayInput {
  return {
    log: buildLog(),
    items: buildItems(),
    policy,
    seed: 'session-2b458cb',
    confidenceIterations: 80,
    ...over,
  };
}

describe('deterministic replay', () => {
  it('reproduces the score bit-for-bit on re-run under a fixed seed', () => {
    const input = buildInput();
    const verification = verifyReplay(input);
    expect(verification.identical).toBe(true);
    // Independent re-run yields the identical canonical serialization + fingerprint.
    expect(canonicalize(verification.first)).toBe(canonicalize(verification.second));
    expect(fingerprint(verification.first)).toBe(fingerprint(verification.second));
  });

  it('runScoring is a pure function: two calls deep-equal', () => {
    const input = buildInput();
    expect(runScoring(input)).toEqual(runScoring(input));
  });

  it('matchesFingerprint verifies a previously recorded digest', () => {
    const input = buildInput();
    const recorded = fingerprint(runScoring(input));
    expect(matchesFingerprint(input, recorded)).toBe(true);
    expect(recorded).toMatch(/^[0-9a-f]{16}$/);
  });

  it('is sensitive: a single changed response breaks the fingerprint', () => {
    const input = buildInput();
    const recorded = fingerprint(runScoring(input));

    const tampered = buildInput();
    const mutatedLog = tampered.log.map((r) => ({ ...r }));
    // Flip the last (hardest) response from wrong to correct.
    const last = mutatedLog[mutatedLog.length - 1]!;
    last.answer = 'A';
    const tamperedInput: ReplayInput = { ...tampered, log: mutatedLog };

    expect(fingerprint(runScoring(tamperedInput))).not.toBe(recorded);
    expect(matchesFingerprint(tamperedInput, recorded)).toBe(false);
  });

  it('binds the seed into the result so a different seed yields a different digest', () => {
    const a = fingerprint(runScoring(buildInput({ seed: 'seed-A' })));
    const b = fingerprint(runScoring(buildInput({ seed: 'seed-B' })));
    expect(a).not.toBe(b);
  });

  it('produces a synthetic-only, unvalidated result with all four domains', () => {
    const result = runScoring(buildInput());
    expect(result.syntheticOnly).toBe(true);
    expect(result.validated).toBe(false);
    expect(result.domainScores.map((d) => d.domain).sort()).toEqual([...DOMAINS].sort());
    expect(result.seed).toBe('session-2b458cb');
    expect(result.policyVersion).toBe('exam-policy-v1');
  });
});

describe('canonicalize', () => {
  it('is stable regardless of object key insertion order', () => {
    const a = { b: 1, a: { d: 4, c: 3 }, arr: [1, 2, 3] };
    const b = { arr: [1, 2, 3], a: { c: 3, d: 4 }, b: 1 };
    expect(canonicalize(a)).toBe(canonicalize(b));
  });

  it('normalizes -0 to 0 and quantizes float noise', () => {
    expect(canonicalize({ x: -0 })).toBe(canonicalize({ x: 0 }));
    expect(canonicalize({ x: 0.1 + 0.2 })).toBe(canonicalize({ x: 0.3 }));
  });
});
