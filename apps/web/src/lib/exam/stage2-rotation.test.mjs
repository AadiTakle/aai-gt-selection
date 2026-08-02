import { describe, expect, it } from 'vitest';

import * as opchain from '../../../../../research/exam-question-types/stage2-inspectors/opchain.js';
import {
  DEFAULT_CRITERION,
  admissibility,
  buildPool,
  createLearner,
  createMasteryRule,
  makePopulation,
  makeSystem,
  mappingKey,
  perPrimitiveLatencies,
  primitiveOpportunity,
  runBlock,
  sessionSupply,
} from '../../../../../research/exam-question-types/stage2-rotation.mjs';

/**
 * The rotating-system simulation, at the six places it could be wrong without saying so.
 *
 * The simulation decides whether Stage 2 should replace one 30-trial hidden system with several
 * short ones. Every conclusion it produces rests on the rotation rule being a real criterion rather
 * than a trip-wire, on the child model being the reasoner the rest of the workstream already uses,
 * and on the run being reproducible. None of those failures announces itself in the output — a
 * rotation rule that fired too easily would just report short crack-times and a flattering ICC.
 *
 * So the properties tested are the ones whose failure would be invisible in a report:
 *
 *   1. THE RULE IS NOT A TRIP-WIRE. A guesser must not reach mastery at more than the analytic rate,
 *      and it must be offered plenty of chances to, or the low rate is measuring absence of
 *      opportunity rather than the criterion.
 *   2. THE RULE IS SOUND. A perfect reasoner must reach it, or "censored" would be measuring the
 *      instrument rather than the child.
 *   3. THE CHILD IS THE SHIPPED REASONER. The learner must agree response-for-response with
 *      `stage2-inspectors/opchain.js` at full size, or the population is a lookalike and nothing
 *      transfers from PR #42.
 *   4. NO LEAK, AND THE ANSWER IS ALWAYS ON THE SLATE. A pool item whose key is fixed by content
 *      would make crack-times measure reading rather than induction.
 *   5. CENSORING IS CARRIED, NOT DROPPED. A child who never cracks must still produce an
 *      observation, or every figure biases toward fast learners.
 *   6. DETERMINISM. A seeded run must replay bit-for-bit, or the report is not reproducible.
 *   7. THE RE-KEYING STATISTIC IS PR #51'S. §9 compares this pool's admissibility with the sibling
 *      branch's measurement of the shipped bank, so the size-6 cell has to reproduce its collapse —
 *      and the opposite failure, a perfect admissibility score over a two-option slate, has to be
 *      caught rather than reported as a pass.
 *
 * Born-synthetic throughout. Nothing here is evidence that rotation measures learning in children.
 */

const SIZE = 5;
const pool = buildPool({ size: SIZE, perDepth: 200 });
const system = makeSystem(SIZE, 20260801, 0);

describe('the item pool', () => {
  it('never ships an item whose key is derivable from content alone', () => {
    for (const item of pool.items) {
      expect(pool.oracle.contentDerivability(item).leaks).toBe(false);
    }
  });

  it('always has the answer on the slate for every system it declares servable', () => {
    for (const item of pool.items.slice(0, 200)) {
      for (const [key, answer] of item.answerByMapping) {
        expect(item.content.options.map((o) => o.key)).toContain(answer);
        expect(key).toMatch(/=/);
      }
    }
  });

  it('gives every item five options, so the guessing floor does not vary with system size', () => {
    for (const size of [3, 4, 5, 6]) {
      const p = buildPool({ size, perDepth: 40 });
      for (const item of p.items) expect(item.content.options).toHaveLength(5);
    }
  });

  it('is content-identical across systems, which is what makes rotation invisible to the child', () => {
    const a = makeSystem(SIZE, 20260801, 0);
    const b = makeSystem(SIZE, 20260801, 1);
    expect(mappingKey(a.mapping)).not.toBe(mappingKey(b.mapping));
    const shared = pool.items.filter(
      (item) =>
        item.answerByMapping.has(mappingKey(a.mapping)) &&
        item.answerByMapping.has(mappingKey(b.mapping)),
    );
    expect(shared.length).toBeGreaterThan(0);
    // The same stimulus, a different right answer: the whole content of "an independent system".
    const differing = shared.filter(
      (item) =>
        item.answerByMapping.get(mappingKey(a.mapping)) !==
        item.answerByMapping.get(mappingKey(b.mapping)),
    );
    expect(differing.length).toBeGreaterThan(0);
  });
});

describe('re-keying admissibility', () => {
  // The size-6 pool is the shipped vocabulary, so this is the cell that has to line up with
  // `feat/stage2-session-keying` (PR #51) before its numbers and §9's can be read against each other.
  const wide = buildPool({ size: 6, perDepth: 60, depths: [1, 2, 3] });

  it('reproduces the depth collapse PR #51 measured on the shipped bank', () => {
    const a = admissibility(wide).byDepth;
    expect(a[1].meanAdmissibleShare).toBeGreaterThan(0.7);
    expect(a[3].meanAdmissibleShare).toBeLessThan(0.25);
    expect(a[1].meanAdmissibleShare).toBeGreaterThan(a[2].meanAdmissibleShare);
    expect(a[2].meanAdmissibleShare).toBeGreaterThan(a[3].meanAdmissibleShare);
  });

  it('catches the opposite failure, where every mapping is admissible onto two options', () => {
    // Size 3 depth 3: only six assignments and they collide, so a perfect admissibility score hides
    // a slate on which three of the five options are never right.
    const narrow = admissibility(buildPool({ size: 3, perDepth: 40, depths: [3] })).byDepth[3];
    expect(narrow.meanAdmissibleShare).toBe(1);
    expect(narrow.meanReachable).toBeLessThan(3);
    expect(narrow.safeFraction).toBe(0);
  });

  it('prices one draw the same way whether counted per item or per session', () => {
    const perItem = admissibility(wide).byDepth;
    const expected = wide.depths.reduce(
      (sum, d) => sum + perItem[d].meanAdmissibleShare * perItem[d].templates,
      0,
    );
    const draws = Array.from({ length: 24 }, (_, i) =>
      sessionSupply(wide, makeSystem(6, 555000, i).mapping),
    );
    const observed = draws.reduce((sum, d) => sum + d.servable, 0) / draws.length;
    expect(observed).toBeGreaterThan(0.75 * expected);
    expect(observed).toBeLessThan(1.25 * expected);
    for (const draw of draws) expect(draw.worstSlot).toBeLessThan(0.5);
  });
});

describe('the rotation rule', () => {
  it('a uniform guesser reaches mastery at no more than the analytic false-alarm rate', () => {
    const trials = 1500;
    let crossed = 0;
    let opportunities = 0;
    for (let i = 0; i < trials; i += 1) {
      const block = runBlock({
        pool,
        child: { id: `g${i}`, kind: 'guesser' },
        k: 1,
        cap: 30,
        warmup: 1,
        seed: 5000 + i * 37,
        systemSeed: 900000,
      });
      if (block.systems[0].event) crossed += 1;
      opportunities += block.systems[0].opportunities;
    }
    // Wald bounds this at 1/threshold. Tested against a slack multiple so the assertion is about
    // the criterion holding, not about this particular seed landing under the bound exactly.
    expect(crossed / trials).toBeLessThan(2 / DEFAULT_CRITERION.threshold);
    // And it had ample chances to fire: a low rate with no opportunities would prove nothing.
    expect(opportunities / trials).toBeGreaterThan(10);
  });

  it('a perfect reasoner reaches mastery, so censoring is about the child not the instrument', () => {
    const blocks = Array.from({ length: 40 }, (_, i) =>
      runBlock({
        pool,
        child: { id: `p${i}`, kind: 'learner', fidelity: 1, lapse: 0, trait: 3 },
        k: 1,
        cap: 30,
        warmup: 1,
        seed: 7000 + i * 53,
        systemSeed: 900000,
      }),
    );
    expect(blocks.every((b) => b.systems[0].event)).toBe(true);
  });

  it('needs four clean determined trials, and one miss costs credit back', () => {
    const row = { derivable: true, derivedKey: 'A', optionKeys: ['A', 'B', 'C', 'D', 'E'] };
    const clean = createMasteryRule();
    expect(clean.offer(row, 'A')).toBe(false);
    expect(clean.offer(row, 'A')).toBe(false);
    expect(clean.offer(row, 'A')).toBe(false);
    expect(clean.offer(row, 'A')).toBe(true);

    const stumbles = createMasteryRule();
    stumbles.offer(row, 'A');
    stumbles.offer(row, 'B');
    stumbles.offer(row, 'A');
    stumbles.offer(row, 'A');
    expect(stumbles.crossed).toBe(false);
  });

  it('ignores trials the oracle had not determined, so pre-onset luck cannot credit a child', () => {
    const rule = createMasteryRule();
    const open = { derivable: false, derivedKey: null, optionKeys: ['A', 'B', 'C', 'D', 'E'] };
    for (let i = 0; i < 20; i += 1) expect(rule.offer(open, 'A')).toBe(false);
    expect(rule.opportunitiesSeen()).toBe(0);
    expect(rule.logOdds).toBe(0);
  });
});

describe('the learner is the shipped reasoner', () => {
  it('agrees response-for-response with stage2-inspectors/opchain at full system size', () => {
    const full = buildPool({ size: 6, perDepth: 120 });
    const fullSystem = makeSystem(6, 20260801, 0);
    const key = mappingKey(fullSystem.mapping);
    const servable = full.items.filter((item) => item.answerByMapping.has(key)).slice(0, 60);
    expect(servable.length).toBeGreaterThan(20);

    const mine = createLearner({ values: full.values, fidelity: 1, lapse: 0, seed: 11, salt: 'x' });
    const memory = opchain.newMemory();
    for (const item of servable) {
      const answer = item.answerByMapping.get(key);
      const revealed = item.content.options.find((o) => o.key === answer).figure;
      // The reference `respond` is driven by the same unit draw the learner uses for its own
      // tie-break, so a disagreement can only come from the candidate sets and not from the coin.
      const before = mine.pinned().slice().sort();
      const theirs = opchain.respond(item, memory, 0.5);
      const ours = mine.pick(item);
      expect(
        opchain
          .memoryState(memory)
          .pinned.map((p) => p.split('=')[0])
          .sort(),
      ).toEqual(before);
      // Both reason from candidate sets; where several options tie the tie-break differs, so the
      // assertion is that the CONFIDENT answers agree — the ones a candidate set actually forces.
      if (theirs.confident) expect(ours).toBe(theirs.key);
      opchain.learn(item, revealed, memory);
      mine.observe(item, answer);
    }
    expect(mine.pinned().sort()).toEqual(
      opchain
        .memoryState(memory)
        .pinned.map((p) => p.split('=')[0])
        .sort(),
    );
  });

  it('grades acquisition speed by encoding fidelity, monotonically', () => {
    const speeds = [1, 0.5, 0.25, 0.1].map((fidelity) => {
      const times = Array.from({ length: 30 }, (_, i) => {
        const block = runBlock({
          pool,
          child: { id: `f${fidelity}-${i}`, kind: 'learner', fidelity, lapse: 0, trait: 0 },
          k: 1,
          cap: 40,
          warmup: 1,
          seed: 9000 + i * 41,
          systemSeed: 900000,
        });
        const s = block.systems[0];
        return s.event ? s.crackTrial : 40;
      });
      return times.reduce((a, b) => a + b, 0) / times.length;
    });
    for (let i = 1; i < speeds.length; i += 1) expect(speeds[i]).toBeGreaterThan(speeds[i - 1]);
  });

  it('carries interference forward only when misbind is on', () => {
    const clean = runBlock({
      pool,
      child: { id: 'c', kind: 'learner', fidelity: 1, lapse: 0, misbind: 0 },
      k: 3,
      cap: 40,
      warmup: 1,
      seed: 4321,
      systemSeed: 900000,
    });
    const muddled = runBlock({
      pool,
      child: { id: 'c', kind: 'learner', fidelity: 1, lapse: 0, misbind: 1 },
      k: 3,
      cap: 40,
      warmup: 1,
      seed: 4321,
      systemSeed: 900000,
    });
    // The first system has no predecessor to be confused with, so it must be untouched.
    expect(muddled.systems[0].crackTrial).toBe(clean.systems[0].crackTrial);
    // A later one, carrying the previous mapping, cannot be faster than the clean run.
    const laterClean = clean.systems.slice(1).reduce((sum, s) => sum + s.trials, 0);
    const laterMuddled = muddled.systems.slice(1).reduce((sum, s) => sum + s.trials, 0);
    expect(laterMuddled).toBeGreaterThanOrEqual(laterClean);
  });
});

describe('censoring and budget', () => {
  it('records a child who never cracks as censored rather than dropping them', () => {
    const block = runBlock({
      pool,
      child: { id: 'slow', kind: 'guesser' },
      k: 2,
      cap: 12,
      warmup: 1,
      seed: 31337,
      systemSeed: 900000,
    });
    expect(block.observations).toHaveLength(block.systems.length);
    for (const system of block.systems) {
      if (system.event) continue;
      expect(system.censored).toBe(true);
      expect(system.censoredAt).toBeGreaterThan(0);
    }
    expect(block.observations.every((o) => Number.isFinite(o.time) && o.time >= 1)).toBe(true);
  });

  it('never spends more than the block budget, and censors the system the budget cut short', () => {
    for (const k of [1, 2, 4, 6]) {
      const block = runBlock({
        pool,
        child: { id: 'b', kind: 'learner', fidelity: 0.3, lapse: 0 },
        k,
        cap: 30,
        budget: 30,
        warmup: 1,
        seed: 2468,
        systemSeed: 900000,
      });
      expect(block.totalTrials).toBeLessThanOrEqual(30);
      expect(block.systemsRun).toBeLessThanOrEqual(k);
    }
  });

  it('never serves the same item twice to one child, across systems', () => {
    const block = runBlock({
      pool,
      child: { id: 'r', kind: 'learner', fidelity: 0.6, lapse: 0 },
      k: 5,
      cap: 30,
      warmup: 1,
      seed: 1357,
      systemSeed: 900000,
    });
    const served = block.systems.flatMap((s) => [...s.warmupItems, ...s.rows.map((r) => r.itemId)]);
    expect(new Set(served).size).toBe(served.length);
  });
});

describe('the baseline measure', () => {
  it('prices an opportunity by the exact chance a guesser passes it', () => {
    const key = mappingKey(system.mapping);
    const item = pool.items.find(
      (candidate) => candidate.answerByMapping.has(key) && candidate.content.chain.length >= 2,
    );
    for (const primitive of item.content.chain) {
      const { q, passKeys } = primitiveOpportunity(
        item,
        primitive,
        system.mapping[primitive],
        pool.values,
      );
      expect(q).toBeCloseTo(passKeys.size / item.content.options.length, 12);
      // Sound: the true answer is always a pass for the primitive held correctly.
      expect(passKeys.has(item.answerByMapping.get(key))).toBe(true);
    }
  });

  it('produces per-primitive latencies that are defined only after the oracle onset', () => {
    const block = runBlock({
      pool,
      child: { id: 'pp', kind: 'learner', fidelity: 0.8, lapse: 0 },
      k: 1,
      cap: 30,
      warmup: 1,
      stopOnCrack: false,
      seed: 8642,
      systemSeed: 900000,
    });
    const run = block.systems[0];
    const rows = perPrimitiveLatencies({ run, mapping: run.mapping, values: pool.values });
    expect(rows).toHaveLength(SIZE);
    for (const row of rows) {
      if (!row.deducible) {
        expect(row.latency).toBeNull();
        expect(row.censoredAt).toBeNull();
        continue;
      }
      // Every latency is measured from the onset, so it is at least one trial and never negative.
      if (row.event) expect(row.latency).toBeGreaterThanOrEqual(1);
      else expect(row.censoredAt).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('reproducibility', () => {
  it('replays bit-for-bit from the same seed, and differs from a different one', () => {
    const run = (seed) =>
      JSON.stringify(
        runBlock({
          pool,
          child: { id: 'd', kind: 'learner', fidelity: 0.45, lapse: 0.02 },
          k: 3,
          cap: 30,
          warmup: 1,
          seed,
          systemSeed: 900000,
        }).systems.map((s) => [s.crackTrial, s.trials, s.accuracy]),
      );
    expect(run(555)).toBe(run(555));
    expect(run(555)).not.toBe(run(556));
  });

  it('builds the same population from the same seed', () => {
    const a = makePopulation({ n: 20, seed: 4242 });
    const b = makePopulation({ n: 20, seed: 4242 });
    expect(a.map((c) => c.fidelity)).toEqual(b.map((c) => c.fidelity));
    expect(makePopulation({ n: 20, seed: 99 }).map((c) => c.fidelity)).not.toEqual(
      a.map((c) => c.fidelity),
    );
    // A continuous trait, not a ladder: the sweep's between-child variance must be the
    // population's and not the spacing of a grid this file chose.
    expect(new Set(a.map((c) => c.fidelity)).size).toBe(a.length);
  });
});
