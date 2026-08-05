import { describe, expect, it } from 'vitest';
import { createSeededLibrary } from '@gt/item-library';
import { information, pCorrect, paramsFor } from './irf.js';
import { Posterior } from './posterior.js';
import { ScreenerSession } from './session.js';
import { defaultScreenerConfig, prototypeSurfaces } from './configs.js';
import { simulateCohort, simulateSession } from './harness/simulate.js';
import { effectivenessStats, screenerStats } from '@gt/stats';
import type { SessionRecord } from '@gt/contracts';

function setup(overrides: Partial<ReturnType<typeof defaultScreenerConfig>> = {}) {
  const { library, snapshotId } = createSeededLibrary();
  const base = defaultScreenerConfig(snapshotId, '3-5');
  const config = { ...base, ...overrides };
  const available = library.resolveForScreener(snapshotId, {
    ageBand: config.ageBand,
    maxReadingLoad: config.maxReadingLoad,
    requireCalibrated: config.requireCalibratedItems,
  });
  return { library, snapshotId, config, available, surface: prototypeSurfaces[0]! };
}

describe('item response function', () => {
  it('never drops below the guessing floor', () => {
    const p = paramsFor(0, 4);
    expect(pCorrect(-10, p)).toBeGreaterThanOrEqual(0.25);
    expect(pCorrect(-10, p)).toBeCloseTo(0.25, 3);
  });

  it('is monotone in ability', () => {
    const p = paramsFor(0.5, 4);
    const xs = [-3, -1, 0, 1, 3].map((t) => pCorrect(t, p));
    for (let i = 1; i < xs.length; i++) expect(xs[i]!).toBeGreaterThan(xs[i - 1]!);
  });

  it('peaks in information near the item difficulty', () => {
    const p = paramsFor(1.0, 4);
    expect(information(1.0, p)).toBeGreaterThan(information(-2.0, p));
    expect(information(1.0, p)).toBeGreaterThan(information(3.5, p));
  });

  it('carries more information when discrimination is higher', () => {
    expect(information(1, { b: 1, a: 2, c: 0.25 })).toBeGreaterThan(information(1, { b: 1, a: 1, c: 0.25 }));
  });
});

describe('posterior', () => {
  it('starts at the prior probability of clearing a demanding threshold', () => {
    // Roughly 16% for a standard normal above one logit. This is the value that made a
    // symmetric stop rule fire "below" on the prior rather than on evidence.
    expect(new Posterior().probabilityAbove(1.0)).toBeCloseTo(0.16, 1);
  });

  it('moves up on correct answers and down on wrong ones', () => {
    const p = paramsFor(1.0, 4);
    const up = new Posterior();
    const down = new Posterior();
    for (let i = 0; i < 8; i++) { up.update(p, true); down.update(p, false); }
    expect(up.probabilityAbove(1.0)).toBeGreaterThan(0.5);
    expect(down.probabilityAbove(1.0)).toBeLessThan(0.05);
    expect(up.mean()).toBeGreaterThan(down.mean());
  });

  it('tightens as evidence accumulates', () => {
    const p = paramsFor(0, 4);
    const post = new Posterior();
    const before = post.sd();
    for (let i = 0; i < 20; i++) post.update(p, i % 2 === 0);
    expect(post.sd()).toBeLessThan(before);
  });

  it('reports an interval that contains its own mean', () => {
    const post = new Posterior();
    const [lo, hi] = post.interval(0.9);
    expect(lo).toBeLessThan(post.mean());
    expect(hi).toBeGreaterThan(post.mean());
  });
});

describe('session', () => {
  it('never sends the same rendered item twice', () => {
    const { config, available, surface } = setup();
    const s = new ScreenerSession({ sessionId: 't1', config, surface, available, seed: 5 });
    const seen = new Set<string>();
    while (!s.state().stopped) {
      const next = s.nextItem();
      if (!next) break;
      const key = `${next.item.generatorId}@${next.item.generatorVersion}#${next.item.seed}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
      s.submit(next.item.options[0]!.id, 2000);
    }
    expect(seen.size).toBeGreaterThan(0);
  });

  it('satisfies every blueprint minimum before it stops', () => {
    const { config, available, surface } = setup();
    for (const seed of [1, 2, 3, 11, 202, 7777]) {
      const r = simulateSession({ config, surface, available, seed, candidate: { trueAbility: 2.4, slip: 0.02, guess: 0.02 } });
      for (const rule of config.blueprint) {
        expect(r.domainCounts[rule.domain] ?? 0).toBeGreaterThanOrEqual(rule.minItems);
      }
    }
  });

  it('respects the item cap', () => {
    const { config, available, surface } = setup();
    for (const ability of [-2, 0, 1, 3]) {
      const r = simulateSession({ config, surface, available, seed: 31, candidate: { trueAbility: ability, slip: 0.05, guess: 0.05 } });
      expect(r.itemsServed).toBeLessThanOrEqual(config.stopRule.maxItems);
      expect(r.itemsServed).toBeGreaterThanOrEqual(config.stopRule.minItems);
    }
  });

  it('replays identically from the same seed', () => {
    const { config, available, surface } = setup();
    const args = { config, surface, available, seed: 4242, candidate: { trueAbility: 1.4, slip: 0.05, guess: 0.03 } };
    expect(simulateSession(args)).toEqual(simulateSession(args));
  });

  it('rejects a submit with no pending item', () => {
    const { config, available, surface } = setup();
    const s = new ScreenerSession({ sessionId: 't', config, surface, available, seed: 1 });
    expect(() => s.submit('anything', 100)).toThrow(/no pending item/);
  });

  it('ends a session on abandon and reports it', () => {
    const { config, available, surface } = setup();
    const s = new ScreenerSession({ sessionId: 't', config, surface, available, seed: 1 });
    s.nextItem();
    const state = s.abandon();
    expect(state.stopped).toBe(true);
    expect(state.stopReason).toBe('abandoned');
  });
});

describe('the stop rule is asymmetric on purpose', () => {
  it('is reluctant to rule a candidate out and eager to pass one through', () => {
    const { config } = setup();
    expect(config.stopRule.confidenceBelow).toBeGreaterThan(config.stopRule.confidenceAbove);
  });

  it('does not decide "below" on the very first item', () => {
    // The regression this guards: the prior sits near 0.16, so a symmetric rule with an 0.8
    // target already satisfies "below" before the candidate has answered anything.
    const { config, available, surface } = setup();
    const s = new ScreenerSession({ sessionId: 't', config, surface, available, seed: 9 });
    const first = s.nextItem()!;
    const wrong = first.item.options.find((o) => o.id !== first.item.correctOptionId)!;
    expect(s.submit(wrong.id, 1000).stopped).toBe(false);
  });

  it('recovers high-ability candidates it would otherwise miss', () => {
    const { config, available, surface } = setup();
    const asymmetric = simulateCohort({ config, surface, available, n: 240, firstSeed: 500 });
    const symmetric = simulateCohort({
      config: { ...config, stopRule: { ...config.stopRule, confidenceBelow: config.stopRule.confidenceAbove } },
      surface, available, n: 240, firstSeed: 500,
    });
    expect(asymmetric.sensitivity).toBeGreaterThan(symmetric.sensitivity);
  });
});

describe('cohort behaviour', () => {
  it('separates candidates either side of the threshold better than chance', () => {
    const { config, available, surface } = setup();
    const c = simulateCohort({ config, surface, available, n: 400, firstSeed: 3000 });
    expect(c.sensitivity).toBeGreaterThan(0.55);
    expect(c.specificity).toBeGreaterThan(0.85);
    expect(c.sensitivity + c.specificity - 1).toBeGreaterThan(0.5);
  });

  it('spends more items on a pool concentrated at the threshold', () => {
    // The density finding, showing up in the engine's own behaviour: a pool piled up against
    // the cut is harder to classify, so it costs more questions.
    const { config, available, surface } = setup();
    const spread = simulateCohort({ config, surface, available, n: 300, firstSeed: 6000, abilitySd: 1.4 });
    const piled = simulateCohort({ config, surface, available, n: 300, firstSeed: 6000, abilityMean: 1.0, abilitySd: 0.4 });
    expect(piled.meanItems).toBeGreaterThan(spread.meanItems);
  });

  it('stops early at least some of the time', () => {
    const { config, available, surface } = setup();
    const c = simulateCohort({ config, surface, available, n: 300, firstSeed: 8000 });
    const early = c.results.filter((r) => r.itemsServed < config.stopRule.maxItems).length;
    expect(early).toBeGreaterThan(0);
  });
});

describe('statistics stay honest when nothing is known', () => {
  const record = (over: Partial<SessionRecord> = {}): SessionRecord => ({
    id: 's1', screenerConfigId: 'c', screenerConfigVersion: '1', snapshotId: 'snap-0001',
    surfaceId: 'web-plain', ageBand: '3-5', seed: 1, startedAt: 'now', endedAt: 'now',
    responses: [], stopReason: 'item-cap', pAbove: 0.5, decision: 'recommend',
    usedUncalibratedItems: true, ...over,
  });

  it('reports effectiveness as unavailable rather than zero when no outcome exists', () => {
    const stats = effectivenessStats([record(), record({ id: 's2' })], 0.35);
    expect(stats.outcomesKnown).toBe(0);
    expect(stats.sensitivity).toBeNull();
    expect(stats.youdenJ).toBeNull();
    expect(stats.netBenefitOverTreatAll).toBeNull();
  });

  it('computes effectiveness once outcomes are attached', () => {
    const outcome = (clearedBar: boolean) => ({ clearedBar, source: 't', recordedAt: 'now' });
    const stats = effectivenessStats(
      [
        record({ id: 'a', decision: 'recommend', outcome: outcome(true) }),
        record({ id: 'b', decision: 'recommend', outcome: outcome(false) }),
        record({ id: 'c', decision: 'no-recommendation', outcome: outcome(false) }),
        record({ id: 'd', decision: 'no-recommendation', outcome: outcome(true) }),
      ],
      0.35,
    );
    expect(stats.outcomesKnown).toBe(4);
    expect(stats.sensitivity).toBeCloseTo(0.5, 5);
    expect(stats.specificity).toBeCloseTo(0.5, 5);
    expect(stats.youdenJ).toBeCloseTo(0, 5);
  });

  it('surfaces the share of sessions that used uncalibrated items', () => {
    const stats = screenerStats([record(), record({ id: 's2', usedUncalibratedItems: false })]);
    expect(stats.uncalibratedShare).toBeCloseTo(0.5, 5);
    expect(stats.sessions).toBe(2);
  });
});
