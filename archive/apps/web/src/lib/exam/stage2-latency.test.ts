import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { hashUnit, mulberry32 } from '@gt-selection/exam-engine';

import {
  applyChain,
  figureKey,
  // @ts-expect-error -- research instrument, plain ESM with no type declarations
} from '../../../../../research/exam-question-types/generators/FLU-OPCHAIN-01.mjs';

// The instruments under test are plain ESM with no type declarations, and a relative specifier
// cannot be declared ambiently — so the suppression sits on the specifier line itself, inside the
// braces, because Prettier is free to wrap the import.
import {
  createTracker,
  determinedBadges,
  newKnowledge,
  observe,
  // @ts-expect-error -- research instrument, plain ESM with no type declarations
} from '../../../../../research/exam-question-types/stage2-learnability.mjs';
import {
  DEFAULT_CRITERION,
  badgeOpportunity,
  blockLatencies,
  createBadgeTest,
  fitRandomInterceptAft,
  kaplanMeier,
  midRanks,
  naiveLatencies,
  onsetTrials,
  rankCorrelation,
  separationAuc,
  varianceComponents,
  // @ts-expect-error -- research instrument, plain ESM with no type declarations
} from '../../../../../research/exam-question-types/stage2-latency.mjs';
import {
  partialInductionResponder,
  // @ts-expect-error -- research instrument, plain ESM with no type declarations
} from '../../../../../research/exam-question-types/stage2-latency-responders.js';
import {
  inductionResponder,
  // @ts-expect-error -- research instrument, plain ESM with no type declarations
} from '../../../../../research/exam-question-types/stage2-block-run.js';
// @ts-expect-error -- research instrument, plain ESM with no type declarations
import * as inspector from '../../../../../research/exam-question-types/stage2-inspectors/opchain.js';

/**
 * Per-primitive acquisition latency (STAGE2_LATENCY_VS_SLOPE.md).
 *
 * The comparison this instrument feeds is only worth reading if three things hold, and each is
 * asserted here rather than argued:
 *
 *   SOUNDNESS. A responder that holds a primitive correctly must never be scored as failing to
 *   demonstrate it, whatever it believes about the other badges in the same chain. Without that the
 *   criterion measures composition load and calls it acquisition.
 *   CALIBRATION. The false-alarm rate under uniform guessing must stay inside the Wald bound the
 *   threshold claims. A criterion a guesser can satisfy makes every latency below it meaningless.
 *   CENSORING. Primitives that never reach criterion must survive into the summary as "longer than
 *   this" rather than disappearing, because dropping them biases every average toward fast learners
 *   and would fake a favourable result for the very measure under test.
 *
 * Born-synthetic throughout. Nothing here is evidence that a child learns anything.
 */

const TYPE = 'FLU-OPCHAIN-01';
const REPO_ROOT = join(process.cwd(), '..', '..');
const QUESTION_TYPES = join(REPO_ROOT, 'research', 'exam-question-types');

interface Figure {
  glyph: string;
  orient: { a: number; b: number };
  shade: string;
  border: number;
  pair: number;
}
interface Item {
  itemId: string;
  difficulty: number;
  content: {
    chain: string[];
    input: Figure;
    options: { key: string; figure: Figure }[];
  };
  answer: {
    correctKey: string;
    operatorChain: string[];
    system: { mapping: Record<string, string> };
  };
}

function readBank(file: string): Item[] {
  return readFileSync(file, 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as Item);
}

const liveBank = readBank(join(QUESTION_TYPES, 'banks', `${TYPE}.jsonl`));
const revealOf = (item: Item): Figure =>
  item.content.options.find((o) => o.key === item.answer.correctKey)!.figure;
const mappingOf = (item: Item) => item.answer.system.mapping;

/** A deterministic slice of the bank, so a failure is reproducible rather than seed-dependent. */
const sample = liveBank.filter((_, index) => index % 11 === 0).slice(0, 40);

/* ================================================================== *
 * d_i — when a primitive became deducible
 * ================================================================== */

describe('the onset of deducibility', () => {
  const trials = sample.map((item) => ({ item, revealedFigure: revealOf(item) }));

  it('matches the trial at which the oracle first determines each badge', () => {
    const onset = onsetTrials({ persistence: 'consistent', trials }) as Record<string, number>;
    let knowledge = newKnowledge();

    trials.forEach((trial, index) => {
      const before = new Set(Object.keys(determinedBadges(knowledge)));
      knowledge = observe(knowledge, trial.item, trial.revealedFigure);
      for (const badge of Object.keys(determinedBadges(knowledge))) {
        if (!before.has(badge)) expect(onset[badge]).toBe(index + 1);
      }
    });
    // Everything the walk determined is in the map, and nothing else is.
    expect(new Set(Object.keys(onset))).toEqual(new Set(Object.keys(determinedBadges(knowledge))));
  });

  it('credits the unscored warm-up with onset 0 rather than charging it to trial 1', () => {
    // A badge the demonstrations gave away was usable from trial 1 onward. Recording it as trial 1
    // would shorten every latency measured from it by one, systematically.
    const depthOne = liveBank.find((item) => item.answer.operatorChain.length === 1)!;
    const badge = depthOne.content.chain[0]!;
    const onset = onsetTrials({
      persistence: 'consistent',
      priorReveals: [{ item: depthOne, revealedFigure: revealOf(depthOne) }],
      trials,
    }) as Record<string, number>;

    expect(onset[badge]).toBe(0);
  });

  it('finds nothing deducible in the scrambled arm, by construction', () => {
    // The generator redraws the system every item, so a reveal from trial 4 constrains nothing
    // about trial 5. The latency measure is therefore not merely uninformative there, it is
    // undefined — which is why the control cannot test it and the un-normalised ablation exists.
    expect(onsetTrials({ persistence: 'perTrial', trials })).toEqual({});
  });
});

/* ================================================================== *
 * The per-primitive evidence unit
 * ================================================================== */

describe('what one trial can show about one primitive', () => {
  it('always admits the correct key while holding the primitive at its true operator', () => {
    for (const item of sample) {
      for (const badge of item.content.chain) {
        const { passKeys } = badgeOpportunity(item, badge, mappingOf(item)[badge]!);
        expect([...(passKeys as Set<string>)]).toContain(item.answer.correctKey);
      }
    }
  });

  it('never fails a responder that holds this primitive but is wrong about the others', () => {
    // THE soundness property. A choice generated from any assignment that keeps this badge correct
    // must pass, however wrong the rest of the chain is — otherwise the criterion is measuring
    // whether the child can compose four operators, not whether they know one.
    const operators = ['turn', 'flip', 'slant', 'swap', 'ring', 'twin'];
    for (const item of sample.slice(0, 12)) {
      const byFigure = new Map(
        item.content.options.map((o) => [figureKey(o.figure) as string, o.key]),
      );
      for (const badge of item.content.chain) {
        const truth = mappingOf(item)[badge]!;
        const { passKeys } = badgeOpportunity(item, badge, truth);
        // Every ordered distinct-operator assignment that pins this badge to the truth.
        const walk = (position: number, picked: string[]): void => {
          if (position === item.content.chain.length) {
            const key = byFigure.get(figureKey(applyChain(picked, item.content.input)) as string);
            if (key !== undefined) expect([...(passKeys as Set<string>)]).toContain(key);
            return;
          }
          const candidates =
            item.content.chain[position] === badge
              ? [truth]
              : operators.filter((op) => op !== truth);
          for (const op of candidates) {
            if (picked.includes(op)) continue;
            walk(position + 1, [...picked, op]);
          }
        };
        walk(0, []);
      }
    }
  });

  it('reports q as the exact share of options a uniform guesser would pass on', () => {
    for (const item of sample) {
      for (const badge of item.content.chain) {
        const { q, passKeys } = badgeOpportunity(item, badge, mappingOf(item)[badge]!);
        const passing = item.content.options.filter((o) =>
          (passKeys as Set<string>).has(o.key),
        ).length;
        expect(q).toBeCloseTo(passing / item.content.options.length, 12);
      }
    }
  });

  it('treats an item that excludes nothing about the primitive as no opportunity at all', () => {
    // q = 1 means every option on screen is reachable while holding the badge correct, so no
    // response to it could distinguish a knower from a guesser. Counting it would let a block
    // accumulate evidence from trials that carry none.
    const badge = 'circle';
    const notInChain = sample.find((item) => !item.content.chain.includes(badge))!;
    const { informative, q } = badgeOpportunity(notInChain, badge, 'turn');
    expect(q).toBe(1);
    expect(informative).toBe(false);
  });
});

/* ================================================================== *
 * The criterion
 * ================================================================== */

describe('the sequential log-odds criterion', () => {
  it('needs four clean five-option opportunities, not one lucky answer', () => {
    // At q = 0.2 a pass is worth log(0.9/0.2) = 1.504, so three passes fall short of log(100) and
    // four clear it. A first-correct criterion would have fired on the first.
    const test = createBadgeTest(DEFAULT_CRITERION);
    expect(test.feed(true, 0.2)).toBe(false);
    expect(test.feed(true, 0.2)).toBe(false);
    expect(test.feed(true, 0.2)).toBe(false);
    expect(test.feed(true, 0.2)).toBe(true);
    expect(test.crossed).toBe(true);
  });

  it('prices a weak opportunity as weak', () => {
    // At q = 0.6 the same three passes are worth 3 x 0.405 = 1.2, nowhere near the threshold. A
    // fixed run length would have treated them as identical to the run above.
    const test = createBadgeTest(DEFAULT_CRITERION);
    for (let i = 0; i < 3; i += 1) expect(test.feed(true, 0.6)).toBe(false);
    expect(test.logOdds).toBeCloseTo(3 * Math.log(0.9 / 0.6), 10);
  });

  it('gives back credit when the responder reverts', () => {
    const test = createBadgeTest(DEFAULT_CRITERION);
    test.feed(true, 0.2);
    test.feed(true, 0.2);
    const peak = test.logOdds;
    test.feed(false, 0.2);
    expect(test.logOdds).toBeLessThan(peak);
    expect(test.crossed).toBe(false);
  });

  it('holds a uniform guesser inside the Wald bound', () => {
    // The claim the whole comparison rests on: P(crossing | guessing) <= 1/threshold. Run against a
    // deterministic stream so a failure is reproducible, over the q values the bank actually
    // produces rather than a convenient one.
    const qs = [0.2, 0.2, 0.4, 0.4, 0.6, 0.8];
    let crossings = 0;
    const runs = 4000;
    for (let run = 0; run < runs; run += 1) {
      const test = createBadgeTest(DEFAULT_CRITERION);
      for (let trial = 0; trial < 30; trial += 1) {
        const q = qs[(run + trial) % qs.length]!;
        if (test.feed(hashUnit(run * 7919 + 13, `guess:${trial}`) < q, q)) crossings += 1;
      }
    }
    expect(crossings / runs).toBeLessThanOrEqual(1 / DEFAULT_CRITERION.threshold);
  });

  it('a knower crosses it, so the bound is not bought with a dead test', () => {
    const qs = [0.2, 0.2, 0.4, 0.4, 0.6, 0.8];
    let crossings = 0;
    const runs = 500;
    for (let run = 0; run < runs; run += 1) {
      const test = createBadgeTest(DEFAULT_CRITERION);
      for (let trial = 0; trial < 30; trial += 1) {
        const q = qs[(run + trial) % qs.length]!;
        // A knower with the criterion's own 10% lapse rate.
        if (test.feed(hashUnit(run * 104729 + 3, `know:${trial}`) > 0.1, q)) crossings += 1;
      }
    }
    expect(crossings / runs).toBeGreaterThan(0.95);
  });
});

/* ================================================================== *
 * A whole block
 * ================================================================== */

describe('per-block latencies', () => {
  const trials = sample.map((item) => ({
    item,
    revealedFigure: revealOf(item),
    chosenKey: item.answer.correctKey,
    trueMapping: mappingOf(item),
  }));

  it('accounts for all six primitives in disjoint outcomes', () => {
    const rows = blockLatencies({ persistence: 'consistent', trials }) as {
      deducible: boolean;
      event: boolean;
      untested: boolean;
      latency: number | null;
      censoredAt: number | null;
    }[];

    expect(rows).toHaveLength(6);
    for (const row of rows) {
      if (!row.deducible) {
        // No onset means no latency to censor. Silently dropping these is the failure mode the
        // report measures at high standings, so they must stay distinguishable.
        expect(row.latency).toBeNull();
        expect(row.censoredAt).toBeNull();
      } else if (row.event) {
        expect(row.latency).toBeGreaterThanOrEqual(1);
        expect(row.censoredAt).toBeNull();
      } else {
        expect(row.latency).toBeNull();
        expect(row.censoredAt).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('never counts evidence from before the primitive was deducible', () => {
    const rows = blockLatencies({ persistence: 'consistent', trials }) as {
      onset: number | null;
      criterionTrial: number | null;
    }[];
    for (const row of rows) {
      if (row.criterionTrial === null) continue;
      expect(row.criterionTrial).toBeGreaterThan(row.onset!);
    }
  });

  it('agrees with the un-normalised version exactly when the onset is zero', () => {
    // With d = 0 the two consume an identical opportunity stream, so any disagreement would be an
    // arithmetic difference between them rather than the effect of the normalisation.
    const depthOne = liveBank.find((item) => item.answer.operatorChain.length === 1)!;
    const priorReveals = [{ item: depthOne, revealedFigure: revealOf(depthOne) }];
    const normalised = blockLatencies({ persistence: 'consistent', priorReveals, trials }) as {
      badge: string;
      onset: number | null;
      latency: number | null;
    }[];
    const naive = naiveLatencies({ trials }) as { badge: string; latency: number | null }[];

    const zeroOnset = normalised.filter((row) => row.onset === 0);
    expect(zeroOnset.length).toBeGreaterThan(0);
    for (const row of zeroOnset) {
      expect(row.latency).toBe(naive.find((n) => n.badge === row.badge)!.latency);
    }
  });

  it('splits a block into odd and even opportunity streams that both use fewer of them', () => {
    const whole = blockLatencies({ persistence: 'consistent', trials }) as {
      badge: string;
      opportunities: number;
    }[];
    const odd = blockLatencies({ persistence: 'consistent', trials, half: 'odd' }) as {
      badge: string;
      opportunities: number;
    }[];
    const even = blockLatencies({ persistence: 'consistent', trials, half: 'even' }) as {
      badge: string;
      opportunities: number;
    }[];

    for (let i = 0; i < 6; i += 1) {
      expect(odd[i]!.opportunities + even[i]!.opportunities).toBe(whole[i]!.opportunities);
      expect(Math.abs(odd[i]!.opportunities - even[i]!.opportunities)).toBeLessThanOrEqual(1);
    }
  });
});

/* ================================================================== *
 * The survival machinery
 * ================================================================== */

describe('Kaplan-Meier', () => {
  it('reproduces a hand-computed product-limit estimate', () => {
    // Five subjects, an event at 2, censoring at 3, events at 4 and 5, censoring at 6.
    // S(2) = 4/5 = 0.8; S(4) = 0.8 x 2/3 = 0.5333; S(5) = 0.5333 x 1/2 = 0.2667.
    const km = kaplanMeier([
      { time: 2, event: true },
      { time: 3, event: false },
      { time: 4, event: true },
      { time: 5, event: true },
      { time: 6, event: false },
    ]) as {
      n: number;
      events: number;
      censoringRate: number;
      median: number | null;
      curve: { time: number; survival: number }[];
      restrictedMean: (h: number) => number;
    };

    expect(km.n).toBe(5);
    expect(km.events).toBe(3);
    expect(km.censoringRate).toBeCloseTo(0.4, 10);
    expect(km.curve.find((p) => p.time === 2)!.survival).toBeCloseTo(0.8, 10);
    expect(km.curve.find((p) => p.time === 4)!.survival).toBeCloseTo(0.5333333, 6);
    expect(km.curve.find((p) => p.time === 5)!.survival).toBeCloseTo(0.2666667, 6);
    expect(km.median).toBe(5);
    // Area: 1x2 + 0.8x2 + 0.5333x1 + 0.2667x1 + 0.2667x2 = 2 + 1.6 + 0.5333 + 0.2667 + 0.5333.
    expect(km.restrictedMean(8)).toBeCloseTo(4.9333333, 6);
  });

  it('keeps a censored subject in the risk set instead of discarding it', () => {
    // The bias the whole exercise is guarding against: averaging the reached ones only would report
    // 2, which is the fast subject's time and nobody else's.
    const km = kaplanMeier([
      { time: 2, event: true },
      { time: 9, event: false },
      { time: 9, event: false },
    ]) as { restrictedMean: (h: number) => number };
    expect(km.restrictedMean(9)).toBeCloseTo(2 + (2 / 3) * 7, 10);
  });
});

describe('the random-intercept AFT', () => {
  it('recovers variance components it was given, under censoring', () => {
    // Simulated from the model with a seeded stream, then censored at 30 the way a 30-trial block
    // censors. The estimator has to return roughly what generated the data or the between-child
    // figure it feeds is not measuring what it claims to. Tolerances are sized to the sampling
    // error of this sample, not to a decimal place: with 400 children the SE on `mu` is ~0.04.
    const draw = mulberry32(9001);
    const normal = () => {
      const u = Math.max(1e-9, draw());
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * draw());
    };
    const mu = 2.0;
    const sigma = 0.5;
    const tau = 0.8;
    const byChild: { time: number; event: boolean }[][] = [];
    for (let child = 0; child < 400; child += 1) {
      const b = tau * normal();
      const rows: { time: number; event: boolean }[] = [];
      for (let i = 0; i < 5; i += 1) {
        const t = Math.exp(mu + b + sigma * normal());
        rows.push(t > 30 ? { time: 30, event: false } : { time: t, event: true });
      }
      byChild.push(rows);
    }

    const fit = fitRandomInterceptAft(byChild) as {
      mu: number;
      sigma: number;
      tau: number;
      scoreChild: (rows: { time: number; event: boolean }[]) => {
        mean: number;
        variance: number;
      };
    };
    expect(Math.abs(fit.mu - mu)).toBeLessThan(0.15);
    expect(Math.abs(fit.sigma - sigma)).toBeLessThan(0.1);
    expect(Math.abs(fit.tau - tau)).toBeLessThan(0.15);

    // A child with uniformly long times must score above one with uniformly short times.
    const slow = fit.scoreChild([
      { time: 25, event: true },
      { time: 28, event: true },
    ]);
    const fast = fit.scoreChild([
      { time: 3, event: true },
      { time: 4, event: true },
    ]);
    expect(slow.mean).toBeGreaterThan(fast.mean);
    expect(fast.variance).toBeGreaterThan(0);
  });

  it('treats a censored observation as a lower bound, not as its censoring time', () => {
    const fit = fitRandomInterceptAft(
      Array.from({ length: 60 }, (_, i) => [
        { time: 4 + (i % 5), event: true },
        { time: 6 + (i % 3), event: true },
      ]),
    ) as {
      scoreChild: (rows: { time: number; event: boolean }[]) => { mean: number };
    };
    const censored = fit.scoreChild([{ time: 20, event: false }]);
    const observed = fit.scoreChild([{ time: 20, event: true }]);
    expect(censored.mean).toBeGreaterThan(observed.mean);
  });
});

/* ================================================================== *
 * The comparison statistics
 * ================================================================== */

describe('variance components', () => {
  it('returns the between and within variances of a constructed example', () => {
    // Three children at -1, 0, +1 with a fixed +/-0.5 replicate spread: between = 1, within = 0.5.
    const groups = [
      [-1.5, -0.5],
      [-0.5, 0.5],
      [0.5, 1.5],
    ];
    const vc = varianceComponents(groups) as {
      between: number;
      within: number;
      ratio: number;
      icc: number;
    };
    expect(vc.within).toBeCloseTo(0.5, 10);
    expect(vc.between).toBeCloseTo(0.75, 10);
    expect(vc.ratio).toBeCloseTo(1.5, 10);
    expect(vc.icc).toBeCloseTo(0.6, 10);
  });

  it('reports no between-child variance when every child is the same', () => {
    const vc = varianceComponents([
      [1, 2, 3],
      [1, 2, 3],
      [1, 2, 3],
    ]) as { between: number; ratio: number };
    expect(vc.between).toBe(0);
    expect(vc.ratio).toBe(0);
  });
});

describe('the unit-free comparison helpers', () => {
  it('scores a perfect separation at 1 and a coin flip at 0.5', () => {
    expect(separationAuc([3, 4, 5], [0, 1, 2])).toBe(1);
    expect(separationAuc([1, 1], [1, 1])).toBe(0.5);
  });

  it('ranks by order and not by spacing', () => {
    // The fidelity ladder is not linearly spaced, so a Pearson coefficient against it would report
    // the spacing this workstream chose as much as the measure's behaviour.
    expect(rankCorrelation([1, 2, 3, 4], [1, 100, 10000, 1e6])).toBeCloseTo(1, 10);
    expect(midRanks([5, 5, 1])).toEqual([2.5, 2.5, 1]);
  });
});

/* ================================================================== *
 * The responder family
 * ================================================================== */

describe('the partial-fidelity responder', () => {
  const items = sample.slice(0, 20);

  it('is byte-for-byte the harness reasoner at fidelity 1', () => {
    // The population needs its top end to BE the existing model learner, not to resemble it —
    // otherwise the comparison is run against a responder nobody has reviewed.
    const reference = inductionResponder(inspector);
    const under = partialInductionResponder(inspector, {
      hashUnit,
      seed: 4242,
      salt: 'equivalence',
      fidelity: 1,
    });

    for (const [index, item] of items.entries()) {
      const unit = hashUnit(4242, `pick:${index}`);
      expect(under.pick({ item, unit })).toBe(reference.pick({ item, unit }));
      const revealed = revealOf(item);
      reference.observe({ item, correctFigure: revealed });
      under.observe({ item, correctFigure: revealed });
    }
    expect(under.state().pinned).toBe(reference.state().pinned);
  });

  it('learns strictly less as fidelity falls, and records when it learned it', () => {
    const pinnedAt = (fidelity: number) => {
      const responder = partialInductionResponder(inspector, {
        hashUnit,
        seed: 20260801,
        salt: `fidelity:${fidelity}`,
        fidelity,
        warmupCount: 0,
      });
      for (const item of items) responder.observe({ item, correctFigure: revealOf(item) });
      return responder;
    };

    const full = pinnedAt(1);
    const partial = pinnedAt(0.3);
    expect(full.state().pinned).toBeGreaterThanOrEqual(partial.state().pinned);
    expect(partial.state().ignored).toBeGreaterThan(0);

    const acquisition = full.acquisition() as Record<string, number>;
    expect(Object.keys(acquisition).length).toBe(full.state().pinned);
    for (const trial of Object.values(acquisition)) {
      expect(trial).toBeGreaterThanOrEqual(0);
      expect(trial).toBeLessThanOrEqual(items.length);
    }
  });

  it('pins a primitive no earlier than the oracle could have determined it', () => {
    // The acquisition trace is only usable as ground truth if it is never ahead of the oracle:
    // otherwise `t* - d` would come out negative and the decomposition of measured latency into
    // acquisition plus detection lag would be meaningless.
    const responder = partialInductionResponder(inspector, {
      hashUnit,
      seed: 555,
      salt: 'ordering',
      fidelity: 1,
      warmupCount: 0,
    });
    const tracker = createTracker({ persistence: 'consistent' });
    for (const item of sample) {
      const revealed = revealOf(item);
      responder.observe({ item, correctFigure: revealed });
      tracker.record(item, revealed, { correct: true, chosenKey: item.answer.correctKey });
    }

    const acquisition = responder.acquisition() as Record<string, number>;
    const onset = tracker.firstDetermined as Record<string, number>;
    for (const [badge, trial] of Object.entries(acquisition)) {
      expect(onset[badge]).toBeDefined();
      expect(trial).toBeGreaterThanOrEqual(onset[badge]!);
    }
  });
});
