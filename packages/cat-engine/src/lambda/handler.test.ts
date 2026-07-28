import { describe, expect, it } from 'vitest';

import type { ItemParameters, RawResponse, ScoringPolicy } from '../types';
import { fingerprint, runScoring } from '../replay';
import type { ReplayInput } from '../replay';
import { handler } from './handler';
import type { ScoringLambdaEvent } from './event';

const DOMAINS = ['fluid_reasoning', 'verbal', 'quantitative', 'spatial'];

const policy: ScoringPolicy = {
  policyVersion: 'exam-policy-v1',
  fitWeights: { fluid_reasoning: 1, verbal: 1, quantitative: 1, spatial: 1 },
  learningRateWeight: 0.1,
  consistencyWeight: 0.1,
  advanceCut: 0.5,
  retryFloor: -0.5,
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

describe('scoring lambda handler', () => {
  it('mode:score returns the canonical result and its fingerprint', async () => {
    const input = buildInput();
    const res = await handler({ mode: 'score', input });
    if (!res.ok) throw new Error(`expected ok, got error: ${res.error}`);
    if (res.mode !== 'score') throw new Error(`expected score mode, got ${res.mode}`);
    expect(res.result.syntheticOnly).toBe(true);
    expect(res.result.validated).toBe(false);
    expect(res.fingerprint).toMatch(/^[0-9a-f]{16}$/);
    expect(res.fingerprint).toBe(fingerprint(runScoring(input)));
  });

  it('mode:score is deterministic: same event yields an identical fingerprint', async () => {
    const event: ScoringLambdaEvent = { mode: 'score', input: buildInput() };
    const first = await handler(event);
    const second = await handler(event);
    if (!first.ok || first.mode !== 'score') throw new Error('first invocation not a score success');
    if (!second.ok || second.mode !== 'score') throw new Error('second invocation not a score success');
    expect(first.fingerprint).toBe(second.fingerprint);
    expect(first.result).toEqual(second.result);
  });

  it('mode:replay-verify proves a byte-identical two-run replay', async () => {
    const input = buildInput();
    const res = await handler({ mode: 'replay-verify', input });
    if (!res.ok) throw new Error(`expected ok, got error: ${res.error}`);
    if (res.mode !== 'replay-verify') throw new Error(`expected replay-verify mode, got ${res.mode}`);
    expect(res.verification.identical).toBe(true);
    expect(res.fingerprint).toBe(res.verification.fingerprint);
    expect(res.fingerprint).toBe(fingerprint(runScoring(input)));
  });

  it('mode:replay-match confirms a matching digest and rejects a mismatched one', async () => {
    const input = buildInput();
    const recorded = fingerprint(runScoring(input));

    const good = await handler({ mode: 'replay-match', input, expectedFingerprint: recorded });
    if (!good.ok || good.mode !== 'replay-match') throw new Error('expected replay-match success');
    expect(good.matches).toBe(true);

    const bad = await handler({ mode: 'replay-match', input, expectedFingerprint: '0000000000000000' });
    if (!bad.ok || bad.mode !== 'replay-match') throw new Error('expected replay-match success');
    expect(bad.matches).toBe(false);
  });

  it('mode:replay-match without expectedFingerprint returns a deterministic error', async () => {
    const res = await handler({ mode: 'replay-match', input: buildInput() });
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('expected failure');
    expect(res.error).toContain('expectedFingerprint');
  });

  it('an unknown mode returns a deterministic error (no throw, no stack)', async () => {
    const res = await handler({ mode: 'nope', input: buildInput() } as unknown as ScoringLambdaEvent);
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('expected failure');
    expect(res.error).toContain('mode must be one of');
    expect(res.error).not.toContain('\n');
  });

  it('a missing input returns a deterministic error', async () => {
    const res = await handler({ mode: 'score' } as unknown as ScoringLambdaEvent);
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('expected failure');
    expect(res.error).toContain('input is required');
  });

  it('the error path is itself deterministic across two invocations', async () => {
    const event = { mode: 'nope', input: buildInput() } as unknown as ScoringLambdaEvent;
    const first = await handler(event);
    const second = await handler(event);
    expect(first).toEqual(second);
  });
});
