/**
 * The engine with no session, no server and no filesystem.
 *
 * Every record here is written inline. Nothing in this file calls `loadBanks`, constructs a `QbankSession`,
 * or touches disk, which is the whole claim of task 3.1: another program can hand the engine some items and
 * a belief and get sound measurement back. If this file ever needs the bank loader, the claim has regressed.
 *
 * The pure-refactor part of 3.1 is guarded by the other 229 tests, which went green throughout. These pin
 * the properties those tests could not express, because the old design made them unrepresentable: purity,
 * transportability, and that an incrementally-updated belief never drifts from a clean replay.
 */

import { describe, expect, it } from 'vitest';

import { Posterior } from '@gt/engine';

import type { BankRecord } from './bank';
import {
  buildPool,
  grade,
  initialPosteriors,
  posteriorsFrom,
  precisionAt,
  progressFrom,
  restorePosteriors,
  selectNext,
  snapshotPosteriors,
  stateFor,
  stopReasonFor,
  type QbankAttempt,
  type QbankSessionConfig,
} from './engine';

/** A four-option letter-keyed item, which is the commonest shape in the library. */
function item(id: string, typeCode: string, difficulty: number, correctKey = 'B'): BankRecord {
  return {
    itemId: id,
    typeCode,
    domain: typeCode.split('-')[0]!.toLowerCase(),
    difficulty,
    ageBands: ['2-3'],
    content: { options: [{ key: 'A' }, { key: 'B' }, { key: 'C' }, { key: 'D' }] },
    answer: { correctKey },
    scoring: { mode: 'deterministic_key' },
  } as unknown as BankRecord;
}

const RECORDS: BankRecord[] = [
  item('q1', 'QUANT-X-01', 8),
  item('q2', 'QUANT-X-01', 12),
  item('v1', 'VER-X-01', 9),
  item('v2', 'VER-X-01', 13),
  item('s1', 'SPA-X-01', 10),
  item('s2', 'SPA-X-01', 14),
  item('f1', 'FLU-X-01', 11),
  item('f2', 'FLU-X-01', 15),
];

const POOL = buildPool(RECORDS);

const CONFIG: QbankSessionConfig = {
  abilityThreshold: 1.0,
  precision: precisionAt(2),
  perDomainMinimum: 1,
  recommendProbability: 0.35,
};

/** Play a whole session through the two pure functions alone, threading state by hand. */
function playStateless(answerCorrectly: boolean, maxItems = 8) {
  let posteriors = initialPosteriors();
  const history: QbankAttempt[] = [];

  for (let i = 0; i < maxItems; i += 1) {
    const { serve, stopReason } = selectNext({ config: CONFIG, pool: POOL, history, posteriors });
    if (!serve) return { history, posteriors, stopReason };

    const record = RECORDS.find((r) => r.itemId === serve.served.itemId)!;
    const key = record.answer.correctKey as string;
    const response = answerCorrectly ? { key } : { key: key === 'A' ? 'B' : 'A' };

    const before = posteriors.composite.probabilityAbove(CONFIG.abilityThreshold);
    const result = grade({ item: record, response, latencyMs: 3000, posteriors });
    posteriors = result.posteriors;

    history.push({
      ordinal: history.length + 1,
      itemId: record.itemId,
      typeCode: record.typeCode,
      domain: serve.domain,
      difficulty: record.difficulty,
      correct: result.correct,
      rawResponse: response,
      latencyMs: 3000,
      pAboveBefore: before,
      pAboveAfter: posteriors.composite.probabilityAbove(CONFIG.abilityThreshold),
      selectionReason: serve.selectionReason,
    });
  }
  return { history, posteriors, stopReason: stopReasonFor({ config: CONFIG, pool: POOL, history, posteriors }) };
}

describe('the engine runs with nothing behind it', () => {
  it('selects and grades a whole session from literal records', () => {
    const { history, posteriors, stopReason } = playStateless(true);
    expect(history.length).toBeGreaterThan(0);
    expect(history.every((a) => a.correct === true)).toBe(true);
    // Answering everything right must move belief up off the prior's zero.
    expect(posteriors.composite.mean()).toBeGreaterThan(0.5);
    expect(stopReason).not.toBeNull();
  });

  it('produces a reportable state without a session object', () => {
    const { history, posteriors, stopReason } = playStateless(true);
    const state = stateFor(CONFIG, POOL, history, posteriors, stopReason);
    expect(state.stopped).toBe(true);
    expect(state.itemsServed).toBe(history.length);
    expect(state.decision).not.toBeNull();
    // Coverage was required, so every domain that scored has a band.
    for (const [, band] of Object.entries(state.domains)) {
      expect(band!.interval).toHaveLength(2);
      expect(band!.itemsScored).toBeGreaterThan(0);
    }
  });
});

describe('the functions are pure', () => {
  it('grade leaves the belief it was given untouched', () => {
    const before = initialPosteriors();
    const meanBefore = before.composite.mean();
    const snapshotBefore = before.composite.snapshot();

    const result = grade({ item: RECORDS[0]!, response: { key: 'B' }, latencyMs: 1000, posteriors: before });

    expect(result.correct).toBe(true);
    // The input is unchanged...
    expect(before.composite.mean()).toBe(meanBefore);
    expect(before.composite.snapshot()).toEqual(snapshotBefore);
    // ...and the output is genuinely different, so the test is not passing by doing nothing.
    expect(result.posteriors.composite.mean()).not.toBeCloseTo(meanBefore, 6);
  });

  it('grade leaves the domain beliefs it was given untouched', () => {
    const before = initialPosteriors();
    const spatialBefore = before.byDomain.spatial.snapshot();
    const result = grade({ item: item('s9', 'SPA-X-01', 10), response: { key: 'B' }, latencyMs: 1000, posteriors: before });
    expect(before.byDomain.spatial.snapshot()).toEqual(spatialBefore);
    expect(result.posteriors.byDomain.spatial.snapshot()).not.toEqual(spatialBefore);
    // And an item's domain must not leak into the other three.
    expect(result.posteriors.byDomain.verbal.snapshot()).toEqual(before.byDomain.verbal.snapshot());
  });

  it('selectNext returns the same item for the same state', () => {
    const posteriors = initialPosteriors();
    const a = selectNext({ config: CONFIG, pool: POOL, history: [], posteriors });
    const b = selectNext({ config: CONFIG, pool: POOL, history: [], posteriors });
    expect(a.serve?.served.itemId).toBe(b.serve?.served.itemId);
    expect(a.serve?.informationAtThreshold).toBe(b.serve?.informationAtThreshold);
  });

  it('an unmarkable response changes no belief at all', () => {
    const before = initialPosteriors();
    const result = grade({ item: RECORDS[0]!, response: { nothing: true }, latencyMs: 1000, posteriors: before });
    expect(result.correct).toBeNull();
    expect(result.posteriors.composite.snapshot()).toEqual(before.composite.snapshot());
  });
});

describe('belief survives the trip out and back', () => {
  it('rebuilds from a snapshot to the same numbers', () => {
    const { posteriors } = playStateless(true);
    const restored = restorePosteriors(snapshotPosteriors(posteriors) as never);

    expect(restored.composite.mean()).toBeCloseTo(posteriors.composite.mean(), 12);
    expect(restored.composite.probabilityAbove(1.0)).toBeCloseTo(posteriors.composite.probabilityAbove(1.0), 12);
    for (const d of ['quantitative', 'verbal', 'spatial', 'fluid'] as const) {
      expect(restored.byDomain[d].mean()).toBeCloseTo(posteriors.byDomain[d].mean(), 12);
    }
  });

  it('survives a round trip through JSON, which is the point', () => {
    // Not a ceremonial check: the reason `fromSnapshot` exists is so a caller can hold this between
    // requests, and a caller holding it will have serialised it.
    const { posteriors } = playStateless(true);
    const wire = JSON.parse(JSON.stringify(snapshotPosteriors(posteriors)));
    const restored = restorePosteriors(wire);
    expect(restored.composite.mean()).toBeCloseTo(posteriors.composite.mean(), 12);
  });

  it('refuses a snapshot of the wrong shape rather than quietly rescaling', () => {
    expect(() => Posterior.fromSnapshot([0.5, 0.5])).toThrow(/expected/);
    expect(() => Posterior.fromSnapshot(new Array(161).fill(Number.NaN))).toThrow(/finite/);
  });
});

describe('incremental belief never drifts from a replay', () => {
  it('matches a posterior rebuilt from the history alone', () => {
    /**
     * The property that makes the state model trustworthy. `grade` folds one response into belief at a time,
     * while `posteriorsFrom` replays the whole transcript from the prior. If those two ever disagreed, a
     * caller that reconstructed a session from its history would get a different answer from one that
     * carried the belief along, and the engine would be quietly non-deterministic across hosts.
     */
    const { history, posteriors } = playStateless(true);
    const replayed = posteriorsFrom(history, POOL);

    expect(replayed.composite.snapshot()).toEqual(posteriors.composite.snapshot());
    for (const d of ['quantitative', 'verbal', 'spatial', 'fluid'] as const) {
      expect(replayed.byDomain[d].snapshot()).toEqual(posteriors.byDomain[d].snapshot());
    }
  });

  it('matches on a session of wrong answers too', () => {
    const { history, posteriors } = playStateless(false);
    expect(posteriorsFrom(history, POOL).composite.snapshot()).toEqual(posteriors.composite.snapshot());
  });

  it('derives the progress counters from the transcript', () => {
    const { history } = playStateless(true);
    const progress = progressFrom(history, POOL);
    expect(progress.usedItemIds.size).toBe(history.length);
    expect(progress.scored + progress.unscorable).toBe(history.length);
    // Every record here is a four-option keyed item, so the whole session is multiple choice.
    expect(progress.multipleChoiceServed).toBe(history.length);
    const perDomainTotal = Object.values(progress.perDomain).reduce((a, b) => a + b, 0);
    expect(perDomainTotal).toBe(history.length);
  });
});
