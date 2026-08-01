import { describe, expect, it } from 'vitest';

import {
  ADAPTERS,
  NEW_TYPES,
  REFERENCE_TYPE,
} from '../../../../../research/exam-question-types/stage2-learnability-adapters/index.mjs';
import { loadArms } from '../../../../../research/exam-question-types/stage2-learnability-banks.mjs';
import { createOracle } from '../../../../../research/exam-question-types/stage2-learnability-core.mjs';

/**
 * The cumulative learnability oracle, at the four places it could be wrong.
 *
 * The oracle decides which trials of a Stage 2 learning block were ANSWERABLE from the reveals the
 * child had already seen, and which options their own evidence had already excluded. Two things
 * downstream depend on it and both fail silently if it is wrong: a wrong answer on a trial nothing
 * determined is not a failure to learn, and an option a child's own reveals ruled out is not the
 * same kind of mistake as one still genuinely open. Neither error announces itself in the output —
 * an oracle that is too generous just reports a bank as more answerable than it was.
 *
 * So the four properties tested are the ones whose failure would be invisible:
 *
 *   1. SOUNDNESS. The true system must never be eliminated. If it can be, "determined" can name the
 *      wrong option and every derived figure is worse than useless.
 *   2. THE CONTROL IS A CONTROL. In the scrambled arm the generator redraws the system every item,
 *      so nothing may ever be determined from prior reveals. This is asserted rather than assumed
 *      because the whole two-arm design rests on it.
 *   3. NO LEAK, THROUGH THE SHARED PATH. Content-derivability is the same computation with zero
 *      reveals, so each type's own anti-leak claim is re-checked here by the code the trace uses.
 *   4. ORDERING. A trial's own reveal must not decide whether that trial was answerable.
 *
 * Born-synthetic throughout. Nothing here is evidence that any of these types measures learning:
 * that is Gate B, it needs real children, and it has not run.
 */

const TYPES = [REFERENCE_TYPE, ...NEW_TYPES];

/** Built once: the mapping space is 720 wide and every item's prediction row is cached inside. */
const fixtures = new Map(
  TYPES.map((code) => [code, { oracle: createOracle(ADAPTERS[code]), arms: loadArms(code) }]),
);

describe.each(TYPES)('%s — the oracle is sound', (code) => {
  const { oracle, arms } = fixtures.get(code);

  it('is a bijection space of the size the type declares', () => {
    const factorial = (n) => (n <= 1 ? 1 : n * factorial(n - 1));
    expect(oracle.primitives.length).toBe(oracle.values.length);
    expect(oracle.mappings.length).toBe(factorial(oracle.primitives.length));
    // Every mapping is onto: a candidate that gave two primitives the same meaning is not a system.
    for (const mapping of oracle.mappings) {
      expect(new Set(Object.values(mapping)).size).toBe(oracle.values.length);
    }
  });

  it('never eliminates the true system, over the whole bank in sequence', () => {
    let knowledge = oracle.newKnowledge();
    for (const item of arms.consistent) {
      knowledge = oracle.observe(knowledge, item, oracle.adapter.correctKeyOf(item));
    }
    // A contradiction means the accumulated knowledge was about a DIFFERENT system, which in this
    // arm could only be a generator bug — the bank holds one system for all of its items.
    expect(knowledge.contradicted).toBe(0);
    expect(knowledge.surviving.length).toBe(1);
  });

  it('converges on the mapping the generator actually used', () => {
    let knowledge = oracle.newKnowledge();
    for (const item of arms.consistent) {
      knowledge = oracle.observe(knowledge, item, oracle.adapter.correctKeyOf(item));
    }
    const survivor = oracle.mappings[knowledge.surviving[0]];
    const truth = arms.consistent[0].trueSystem;
    const declared = truth.mapping ?? truth.affixMap;
    for (const primitive of oracle.primitives) {
      expect(survivor[primitive]).toBe(declared[primitive]);
    }
  });

  it('always leaves the correct option viable, on every item, with no reveals at all', () => {
    for (const arm of [arms.consistent, arms.perTrial]) {
      for (const item of arm) {
        const { viableOptions } = oracle.contentDerivability(item);
        expect(viableOptions).toContain(item.reviewerOnly.correctKey);
      }
    }
  });

  it('predicts only options that are on the screen', () => {
    for (const item of arms.consistent.slice(0, 40)) {
      const keys = new Set(oracle.optionKeysOf(item));
      for (const predicted of oracle.predictions(item)) {
        for (const key of predicted) expect(keys.has(key)).toBe(true);
      }
    }
  });

  it('only ever constrains primitives the item actually shows', () => {
    const known = new Set(oracle.primitives);
    for (const item of arms.consistent) {
      for (const primitive of oracle.adapter.primitivesUsedBy(item)) {
        expect(known.has(primitive)).toBe(true);
      }
    }
  });
});

describe.each(TYPES)('%s — no content leak, through the same code path as the trace', (code) => {
  const { oracle, arms } = fixtures.get(code);

  it('never fixes the key from `content` alone', () => {
    // A single viable option with zero reveals means a client holding the item and the candidate
    // space recovers the key with no induction — the E-075/E-076 attack. Each type checks this in
    // its own checker; this re-checks it through the oracle, so the leak count and the learnability
    // trace cannot disagree about the same item.
    const leaking = arms.consistent.filter((item) => oracle.contentDerivability(item).leaks);
    expect(leaking.map((item) => item.itemId)).toEqual([]);
  });

  it('leaves the same options viable in both arms, because relabelling is arm-independent', () => {
    // The two arms are equated item-for-item on everything but the spelling, so the size of the
    // content-only viable set must not depend on which arm an item came from. If it did, an
    // attacker's odds would differ between arms and the contrast would be confounded.
    const spread = (arm) => {
      const counts = arm.map((item) => oracle.contentDerivability(item).count);
      return counts.reduce((a, b) => a + b, 0) / counts.length;
    };
    expect(spread(arms.consistent)).toBeCloseTo(spread(arms.perTrial), 6);
  });
});

describe.each(TYPES)('%s — the scrambled arm is a control', (code) => {
  const { oracle, arms } = fixtures.get(code);
  const sequence = arms.perTrial.slice(0, 24).map((item) => ({ item }));

  it('never determines a primitive from prior reveals', () => {
    const { summary } = oracle.traceBlock({ trials: sequence, persistence: 'perTrial' });
    expect(summary.firstDetermined).toEqual({});
    expect(summary.primitivesEverPinned).toBe(0);
    expect(summary.meanKnowable).toBe(0);
  });

  it('answers no trial that `content` alone did not already answer', () => {
    const { summary } = oracle.traceBlock({ trials: sequence, persistence: 'perTrial' });
    expect(summary.derivableTrials).toBe(summary.contentDerivableTrials);
  });

  it('differs from the measurement arm, which does accumulate', () => {
    const live = arms.consistent.slice(0, 24).map((item) => ({ item }));
    const { summary } = oracle.traceBlock({ trials: live, persistence: 'consistent' });
    expect(summary.primitivesEverPinned).toBeGreaterThan(0);
    expect(summary.derivableTrials).toBeGreaterThan(summary.contentDerivableTrials);
  });
});

describe.each(TYPES)('%s — a trial is judged on what preceded it', (code) => {
  const { oracle, arms } = fixtures.get(code);

  it('never counts a trial as derivable using its own reveal', () => {
    // Trial 1 of a block with no warm-up has seen nothing, so its answerability must equal what
    // `content` alone gives. If the tracker folded the reveal in before recording, this would be a
    // determined trial on every type.
    const trials = arms.consistent.slice(0, 6).map((item) => ({ item }));
    const { rows } = oracle.traceBlock({ trials, persistence: 'consistent' });
    const first = rows[0];
    expect(first.viableFromKnowledge).toBe(first.contentViable);
    expect(first.derivable).toBe(first.contentDerivable);
  });

  it('classifies the correct answer as `consistent`, not `determined`, when it was not determined', () => {
    const item = arms.consistent.find((i) => oracle.contentDerivability(i).count > 1);
    const trials = [{ item, chosenKey: item.reviewerOnly.correctKey, correct: true }];
    const { rows } = oracle.traceBlock({ trials, persistence: 'consistent' });
    expect(rows[0].derivable).toBe(false);
    expect(rows[0].inference).toBe('consistent');
  });

  it('narrows monotonically while no reveal contradicts', () => {
    let knowledge = oracle.newKnowledge();
    let previous = knowledge.surviving.length;
    for (const item of arms.consistent.slice(0, 30)) {
      knowledge = oracle.observe(knowledge, item, oracle.adapter.correctKeyOf(item));
      expect(knowledge.contradicted).toBe(0);
      expect(knowledge.surviving.length).toBeLessThanOrEqual(previous);
      previous = knowledge.surviving.length;
    }
  });
});

describe('the shared core reproduces the reference type it was factored out of', () => {
  const { oracle, arms } = fixtures.get(REFERENCE_TYPE);

  it('determines a composition before it determines its factorisation', () => {
    // The structural fact every figure in the report is read against: after enough reveals the
    // surviving systems can agree on every OPTION while still disagreeing about individual
    // primitives. If this ever stopped being possible, "vocabulary not pinned" and "child could not
    // have answered" would collapse into each other and the whole distinction would be spurious.
    const trials = arms.consistent.slice(0, 30).map((item) => ({ item }));
    const { rows } = oracle.traceBlock({ trials, persistence: 'consistent' });
    const answerableButUnpinned = rows.filter(
      (r) => r.derivable && r.knowablePrimitives < oracle.primitives.length,
    );
    expect(answerableButUnpinned.length).toBeGreaterThan(0);
  });

  it('reports a viable-option histogram that accounts for every trial', () => {
    const trials = arms.consistent.slice(0, 30).map((item) => ({ item }));
    const { summary } = oracle.traceBlock({ trials, persistence: 'consistent' });
    const counted = summary.viableHistogram.reduce((a, b) => a + b, 0);
    expect(counted).toBe(summary.trials);
    expect(summary.partiallyDeterminedTrials).toBe(
      (summary.viableHistogram[2] ?? 0) + (summary.viableHistogram[3] ?? 0),
    );
  });
});

describe('the adapter contract is enforced rather than assumed', () => {
  it('refuses a system that is not a bijection', () => {
    expect(() =>
      createOracle({
        id: 'broken',
        typeCode: 'BROKEN-01',
        vocabulary: '3 symbols -> 2 meanings',
        primitives: ['a', 'b', 'c'],
        values: ['x', 'y'],
        primitivesUsedBy: () => [],
        predictedKeys: () => [],
        correctKeyOf: () => 'A',
      }),
    ).toThrow(/bijection/);
  });

  it('refuses a reveal reading it does not implement', () => {
    expect(() => createOracle(ADAPTERS[REFERENCE_TYPE], { revealMode: 'vibes' })).toThrow(
      /outcome\|option/,
    );
  });

  it('refuses a persistence mode that is neither arm', () => {
    const { oracle } = fixtures.get(REFERENCE_TYPE);
    expect(() => oracle.createTracker({ persistence: 'sometimes' })).toThrow(
      /consistent\|perTrial/,
    );
  });
});
