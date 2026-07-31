import { describe, expect, it } from 'vitest';

import {
  type AbilityFitOptions,
  abilityStandardError,
  deriveAbilityEstimate,
  deriveAbilityFit,
} from './ability';
import { DEFAULT_ABILITY_BRACKETING } from './policy';
import { type Domain, type ScoredItem } from './types';

const FIT: AbilityFitOptions = {
  slope: DEFAULT_ABILITY_BRACKETING.slope,
  priorSd: DEFAULT_ABILITY_BRACKETING.priorSd,
  min: 1,
  max: 20,
};

let counter = 0;

function item(difficulty: number, correct: boolean, score?: number): ScoredItem {
  return {
    itemId: `ability-${(counter += 1)}`,
    typeCode: 'SYN-TYPE-01',
    domain: 'fluid_reasoning' as Domain,
    metrics: {},
    telemetry: [],
    correct,
    score: score ?? (correct ? 1 : 0),
    difficulty,
  };
}

/** A threshold responder: correct on everything at or below `theta`, wrong above it. */
function thresholdTrace(theta: number, difficulties: readonly number[]): ScoredItem[] {
  return difficulties.map((d) => item(d, d <= theta));
}

const RAMP = [4, 6, 8, 10, 12, 14, 16, 18];

describe('deriveAbilityEstimate — recovers where the child succeeds', () => {
  it('lands between the hardest item solved and the easiest item missed', () => {
    const fitted = deriveAbilityEstimate(thresholdTrace(11, RAMP), FIT) as number;
    expect(fitted).toBeGreaterThan(10);
    expect(fitted).toBeLessThan(12);
  });

  it('is monotone in the child: a stronger responder never fits lower', () => {
    let previous = Number.NEGATIVE_INFINITY;
    for (const theta of [3, 5, 7, 9, 11, 13, 15, 17]) {
      const fitted = deriveAbilityEstimate(thresholdTrace(theta, RAMP), FIT) as number;
      expect(fitted, `true ability ${theta}`).toBeGreaterThan(previous);
      previous = fitted;
    }
  });

  it('separates two children with IDENTICAL accuracy but different difficulty reached', () => {
    // Both are correct on exactly half of what they saw; only the difficulty differs.
    const high = [
      ...thresholdTrace(16.5, [16, 16, 16, 16]),
      ...thresholdTrace(16.5, [18, 18, 18, 18]),
    ];
    const low = [...thresholdTrace(3.5, [3, 3, 3, 3]), ...thresholdTrace(3.5, [5, 5, 5, 5])];

    const accuracyOf = (items: readonly ScoredItem[]): number =>
      items.filter((i) => i.correct).length / items.length;
    expect(accuracyOf(high)).toBe(accuracyOf(low));

    const highFit = deriveAbilityEstimate(high, FIT) as number;
    const lowFit = deriveAbilityEstimate(low, FIT) as number;
    expect(highFit - lowFit).toBeGreaterThan(10);
  });

  it('uses partial credit rather than treating it as a miss', () => {
    const partial = [8, 10, 12].map((d) => item(d, false, 0.5));
    const missed = [8, 10, 12].map((d) => item(d, false, 0));
    expect(deriveAbilityEstimate(partial, FIT) as number).toBeGreaterThan(
      deriveAbilityEstimate(missed, FIT) as number,
    );
  });
});

describe('deriveAbilityEstimate — degenerate traces', () => {
  it('returns null for an empty trace rather than inventing a number', () => {
    expect(deriveAbilityEstimate([], FIT)).toBeNull();
  });

  it('puts a child correct on everything above the hardest item served', () => {
    const trace = RAMP.map((d) => item(d, true));
    const fitted = deriveAbilityEstimate(trace, FIT) as number;
    expect(fitted).toBeGreaterThan(Math.max(...RAMP));
    expect(fitted).toBeLessThanOrEqual(20);
    // Without the prior there is nothing to stop the likelihood, so it pins at the ceiling.
    expect(deriveAbilityEstimate(trace, { ...FIT, priorSd: Number.POSITIVE_INFINITY })).toBe(20);
  });

  it('puts a child correct on nothing below the easiest item served', () => {
    const trace = RAMP.map((d) => item(d, false));
    const fitted = deriveAbilityEstimate(trace, FIT) as number;
    expect(fitted).toBeLessThan(Math.min(...RAMP));
    expect(fitted).toBeGreaterThanOrEqual(1);
    expect(deriveAbilityEstimate(trace, { ...FIT, priorSd: Number.POSITIVE_INFINITY })).toBe(1);
  });

  it('keeps a single-item trace off the scale bound, and the prior is what does it', () => {
    const single = [item(10, true)];
    const withPrior = deriveAbilityEstimate(single, FIT) as number;
    const noPrior = deriveAbilityEstimate(single, { ...FIT, priorSd: Number.POSITIVE_INFINITY });

    expect(withPrior).toBeGreaterThan(10);
    expect(withPrior).toBeLessThan(20);
    expect(noPrior).toBe(20);
  });

  it('the prior is weak enough not to drag a real-length trace toward the midpoint', () => {
    const trace = thresholdTrace(17, [12, 14, 15, 16, 17, 18, 19, 20]);
    const withPrior = deriveAbilityEstimate(trace, FIT) as number;
    const noPrior = deriveAbilityEstimate(trace, {
      ...FIT,
      priorSd: Number.POSITIVE_INFINITY,
    }) as number;
    expect(Math.abs(withPrior - noPrior)).toBeLessThan(0.5);
  });
});

describe('abilityStandardError — precision reflects which items were served', () => {
  it('narrows as more well-targeted items are added', () => {
    const near = (n: number): ScoredItem[] =>
      Array.from({ length: n }, (_, i) => item(11, i % 2 === 0));
    const few = abilityStandardError(11, near(4), FIT) as number;
    const many = abilityStandardError(11, near(16), FIT) as number;
    expect(many).toBeLessThan(few);
  });

  it('is smaller for well-targeted items than for the same count served far off level', () => {
    // Same number of items, same fitted point (11); only the targeting differs.
    const onLevel = Array.from({ length: 8 }, (_, i) => item(11, i % 2 === 0));
    const farOff = Array.from({ length: 8 }, (_, i) => item(i % 2 === 0 ? 1 : 20, i < 4));
    const sharp = abilityStandardError(11, onLevel, FIT) as number;
    const blunt = abilityStandardError(11, farOff, FIT) as number;
    expect(sharp).toBeLessThan(blunt);
  });

  it('returns null for an empty trace rather than a number', () => {
    expect(abilityStandardError(10, [], FIT)).toBeNull();
  });

  it('stays finite for a one-sided trace only because of the prior', () => {
    const oneSided = RAMP.map((d) => item(d, true));
    const fitted = deriveAbilityEstimate(oneSided, FIT) as number;
    const withPrior = abilityStandardError(fitted, oneSided, FIT) as number;
    expect(Number.isFinite(withPrior)).toBe(true);
    // With no prior and everything correct, the location is unbounded above: p*(1-p) collapses
    // and the information vanishes, so the honest SE diverges.
    const noPrior = abilityStandardError(20, oneSided, {
      ...FIT,
      priorSd: Number.POSITIVE_INFINITY,
    }) as number;
    expect(noPrior).toBeGreaterThan(withPrior);
  });

  it('is deterministic and order-independent', () => {
    const trace = thresholdTrace(13, RAMP);
    const reversed = [...trace].reverse();
    expect(abilityStandardError(13, trace, FIT)).toBe(abilityStandardError(13, trace, FIT));
    expect(abilityStandardError(13, reversed, FIT)).toBe(abilityStandardError(13, trace, FIT));
  });
});

describe('deriveAbilityFit — estimate and SE together', () => {
  it('returns the same estimate as deriveAbilityEstimate plus its SE', () => {
    const trace = thresholdTrace(11, RAMP);
    const fit = deriveAbilityFit(trace, FIT);
    expect(fit).not.toBeNull();
    expect(fit?.estimate).toBe(deriveAbilityEstimate(trace, FIT));
    expect(fit?.se).toBe(abilityStandardError(fit?.estimate as number, trace, FIT));
    expect(fit?.se).toBeGreaterThan(0);
  });

  it('returns null for an empty trace', () => {
    expect(deriveAbilityFit([], FIT)).toBeNull();
  });
});

describe('deriveAbilityEstimate — determinism', () => {
  it('returns bit-identical values on repeated calls', () => {
    const trace = thresholdTrace(13, RAMP);
    expect(deriveAbilityEstimate(trace, FIT)).toBe(deriveAbilityEstimate(trace, FIT));
  });

  it('does not depend on item order', () => {
    const trace = thresholdTrace(9, RAMP);
    const reversed = [...trace].reverse();
    expect(deriveAbilityEstimate(reversed, FIT)).toBe(deriveAbilityEstimate(trace, FIT));
  });

  it('does not mutate its input', () => {
    const trace = thresholdTrace(9, RAMP);
    const snapshot = structuredClone(trace);
    deriveAbilityEstimate(trace, FIT);
    expect(trace).toEqual(snapshot);
  });
});

/*
 * The chance-success floor.
 *
 * Pinned in both directions on purpose. "The corrected floor recovers a guessing child better"
 * would pass just as happily if the floor were 0.9, so on its own it licenses any positive number.
 * The second case is what gives the first its meaning: the same correction applied to a child who
 * does not guess actively harms them. That asymmetry is why 0.2 is a claim about the BANK — five
 * options per item — and not a safety margin, and why it is a policy knob.
 */
describe('the chance-success floor', () => {
  it('omitting it reproduces the previous no-guessing fit exactly', () => {
    const items = thresholdTrace(10, RAMP);
    const withoutKnob = deriveAbilityEstimate(items, FIT) as number;
    const explicitZero = deriveAbilityEstimate(items, { ...FIT, guessing: 0 }) as number;

    expect(withoutKnob).toBe(explicitZero);
    expect(abilityStandardError(withoutKnob, items, FIT)).toBe(
      abilityStandardError(explicitZero, items, { ...FIT, guessing: 0 }),
    );
  });

  it('stops lucky passes on hard items from reading as ability', () => {
    // Two passes well above the child, which is what guessing looks like in a trace.
    const items = [...thresholdTrace(10, RAMP), item(16, true), item(18, true)];
    const uncorrected = deriveAbilityEstimate(items, { ...FIT, guessing: 0 }) as number;
    const corrected = deriveAbilityEstimate(items, { ...FIT, guessing: 0.2 }) as number;

    expect(uncorrected, 'lucky passes should inflate a floor-free fit').toBeGreaterThan(10);
    expect(corrected, 'the floor should discount them').toBeLessThan(uncorrected);
  });

  it('attenuates a child with no lucky passes, so the floor is not a free win', () => {
    /*
     * The direction is worth stating precisely, because it is not symmetric and it is easy to
     * assume backwards. A floor changes what a PASS is worth and leaves a FAILURE untouched:
     * `P(wrong) = (1 - c)(1 - s)`, and the constant `(1 - c)` cancels in the likelihood ratio
     * between two abilities, so a miss carries identical information under any floor. A pass does
     * not — `P(correct) = c + (1 - c)s` is flatter in ability, so some of it is attributed to luck.
     *
     * For a fixed trace, then, a floor can only move the estimate DOWN. A child who genuinely
     * never guessed is read as slightly less able than they are, and the harm falls on exactly the
     * children a floor is meant to protect against being over-read.
     */
    const items = thresholdTrace(10, RAMP);
    const matched = deriveAbilityEstimate(items, { ...FIT, guessing: 0 }) as number;
    const overCorrected = deriveAbilityEstimate(items, { ...FIT, guessing: 0.2 }) as number;

    expect(overCorrected).toBeLessThan(matched);
  });

  it('moves the sharpest item off the even chance and onto a 65% pass rate', () => {
    /*
     * Birnbaum's `(1 + sqrt(1 + 8c)) / 4`, which for a five-option item is 0.653 — an item about
     * 0.27 scale points EASIER than the child. This is the reporting side of the fact the engine
     * now selects on: a floor-blind SE is sharpest for items the child has an even chance on, so
     * it would score a correctly-aimed battery as though it had been aimed badly.
     */
    const theta = 10;
    const seAt = (difficulty: number, guessing: number): number =>
      abilityStandardError(theta, [item(difficulty, true)], { ...FIT, guessing }) as number;

    expect(seAt(10, 0)).toBeLessThan(seAt(9.73, 0));
    expect(seAt(9.73, 0.2)).toBeLessThan(seAt(10, 0.2));
  });
});
