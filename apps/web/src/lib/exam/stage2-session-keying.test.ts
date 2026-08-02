import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { RawBankItem } from './bank-loader';
import {
  BADGE_SYMBOLS,
  OPERATORS,
  allSystems,
  deducibility,
  deriveKey,
  difficultyFromLevers,
  drawSessionSystem,
  geomCount,
  sessionLadder,
  sessionPool,
  toSessionServedItem,
  toStructure,
  verifySessionAnswer,
  type ItemStructure,
  type Observation,
  type SessionSystem,
} from './stage2-session-keying';

/**
 * The per-session keying proof of concept, at the four places it could be wrong:
 *
 *  1. the SEMANTICS could disagree with the generator, in which case every number below is about a
 *     different type;
 *  2. a served item could carry the mapping or the key, which is the whole thing this exists to
 *     prevent;
 *  3. an item could fail to RE-KEY — key to the same option under every mapping — in which case
 *     per-session generation buys nothing; or
 *  4. the ORACLE could turn out to need something fixed at build time, in which case it cannot be
 *     recomputed per session and the learnability readout dies with the change.
 *
 * Born-synthetic throughout. Nothing here is evidence that the type measures learning, and nothing
 * here is wired into a session: this module is imported by this test and by nothing else.
 */

const TYPE = 'FLU-OPCHAIN-01';
const REPO_ROOT = join(process.cwd(), '..', '..');
const BANK = join(REPO_ROOT, 'research', 'exam-question-types', 'banks', `${TYPE}.jsonl`);

const bank: RawBankItem[] = readFileSync(BANK, 'utf8')
  .trim()
  .split('\n')
  .map((line) => JSON.parse(line) as RawBankItem);

const structures: ItemStructure[] = bank.map(toStructure);

/** The mapping the bank was built with, which is what the shipped keys are correct under. */
const shipped: SessionSystem = {
  systemId: 'shipped',
  mapping: (bank[0]!.answer as unknown as { system: { mapping: Record<string, never> } }).system
    .mapping,
};

/* ================================================================== *
 * 1. The semantics agree with the generator
 * ================================================================== */

describe('the re-derived semantics', () => {
  it('reproduces every shipped key from the shipped mapping', () => {
    for (let i = 0; i < bank.length; i++) {
      expect(deriveKey(structures[i]!, shipped), `${bank[i]!.itemId}`).toBe(
        bank[i]!.answer.correctKey,
      );
    }
  });

  it('reproduces every shipped difficulty from the shipped mapping', () => {
    // The recomputation has to agree with the generator on the arm the bank was built for, or the
    // per-session rung is not the same scale the adaptive ladder is calibrated in.
    for (let i = 0; i < bank.length; i++) {
      const levers = bank[i]!.provenance!.levers as { depth: number; distractorSimilarity: number };
      const recomputed = difficultyFromLevers(
        levers.depth,
        geomCount(structures[i]!, shipped),
        levers.distractorSimilarity,
      );
      expect(recomputed, `${bank[i]!.itemId} difficulty`).toBeCloseTo(bank[i]!.difficulty, 2);
    }
  });

  it('agrees with the generator on which operators are in the chain', () => {
    for (let i = 0; i < bank.length; i++) {
      const levers = bank[i]!.provenance!.levers as { geom: number };
      expect(geomCount(structures[i]!, shipped), `${bank[i]!.itemId} geom`).toBe(levers.geom);
    }
  });
});

/* ================================================================== *
 * 2. Nothing a browser receives carries the mapping or the key
 * ================================================================== */

describe('the served projection', () => {
  const system = drawSessionSystem('served-projection-test');
  const pool = sessionPool(structures, system);

  it('has items to serve at all', () => {
    expect(pool.length).toBeGreaterThan(0);
  });

  it('carries no mapping, no key and no levers, on every item of the pool', () => {
    for (const entry of pool) {
      const served = toSessionServedItem(entry);
      const text = JSON.stringify(served);
      for (const leak of [
        'mapping',
        'correctKey',
        'system',
        'systemId',
        'levers',
        'distractorSimilarity',
        'operatorChain',
        'strategyTrace',
      ]) {
        expect(
          text.includes(leak),
          `${entry.structure.itemId} served payload leaks "${leak}"`,
        ).toBe(false);
      }
      // The operator VOCABULARY is the other half of the secret: a client that knows the six names
      // plus one mapping can solve every item, so the names must not travel either.
      for (const op of OPERATORS) {
        expect(text.includes(`"${op}"`), `${entry.structure.itemId} names ${op}`).toBe(false);
      }
      for (const field of ['answer', 'scoring', 'provenance', 'demoPath', 'levers']) {
        expect(Object.hasOwn(served, field), `served.${field}`).toBe(false);
      }
    }
  });

  it('carries the same seven fields the loader projection does', () => {
    // If these ever diverge, one of the two boundaries is wrong and the tests police different
    // shapes. Named explicitly rather than compared to `toServedItem` so a change to either has to
    // be a deliberate edit here.
    expect(Object.keys(toSessionServedItem(pool[0]!)).sort()).toEqual([
      'ageBands',
      'content',
      'difficulty',
      'domain',
      'itemId',
      'syntheticOnly',
      'typeCode',
      'validated',
    ]);
  });

  it('is not enough to recover the key: brute force leaves more than one option standing', () => {
    // The decisive one. Everything above says the mapping is not SHIPPED; this says the served item
    // does not DETERMINE the key. A slice rather than the whole pool, spanning the ladder, because
    // 720 mappings against every item is the same measurement made hundreds of times.
    const sampled = pool.filter((_, i) => i % 5 === 0);
    expect(sampled.length).toBeGreaterThan(10);
    const systems = allSystems(BADGE_SYMBOLS);
    expect(systems.length).toBe(720);

    let determined = 0;
    for (const entry of sampled) {
      const reachable = new Set<string>();
      for (const mapping of systems) {
        const key = deriveKey(entry.structure, { systemId: 'probe', mapping });
        if (key !== null) reachable.add(key);
      }
      expect(reachable.has(entry.correctKey)).toBe(true);
      if (reachable.size === 1) determined += 1;
    }
    expect(
      determined,
      `${String(determined)} of ${String(sampled.length)} served items have exactly one reachable ` +
        'option, so a client recovers the key without the mapping',
    ).toBe(0);
  });
});

/* ================================================================== *
 * 3. The same item re-keys under different mappings
 * ================================================================== */

describe('re-keying', () => {
  const seeds = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel'];
  const systems = seeds.map(drawSessionSystem);

  it('draws a different mapping for every session seed, and the same one for a repeat', () => {
    const distinct = new Set(systems.map((s) => JSON.stringify(s.mapping)));
    expect(distinct.size).toBe(seeds.length);
    // Replay: D-202's rule for the engine seed applies here for the same reason.
    expect(drawSessionSystem('alpha').mapping).toEqual(systems[0]!.mapping);
    expect(drawSessionSystem('alpha').systemId).toBe(systems[0]!.systemId);
  });

  it('draws a bijection every time', () => {
    for (const system of systems) {
      const badges = Object.keys(system.mapping).sort();
      expect(badges).toEqual([...BADGE_SYMBOLS].sort());
      expect(new Set(Object.values(system.mapping)).size).toBe(OPERATORS.length);
    }
  });

  it('moves the key of a substantial share of items when the mapping changes', () => {
    // The property the whole design rests on. If the key were mapping-invariant, a scrape of one
    // child's session would still hand every subsequent child their answers.
    let moved = 0;
    let comparable = 0;
    for (const structure of structures) {
      const first = deriveKey(structure, systems[0]!);
      if (first === null) continue;
      for (const system of systems.slice(1)) {
        const next = deriveKey(structure, system);
        if (next === null) continue;
        comparable += 1;
        if (next !== first) moved += 1;
      }
    }
    expect(comparable).toBeGreaterThan(50);
    expect(moved / comparable).toBeGreaterThan(0.5);
  });

  it('keys at least one item to at least four distinct options across mappings', () => {
    // Existence, not a rate: the rate is the probe's job and is 78.2% at four-of-five. What has to
    // be true HERE is that the mechanism reaches a wide key space on a real shipped item.
    const wide = structures.filter((structure) => {
      const keys = new Set<string>();
      for (const mapping of allSystems(BADGE_SYMBOLS)) {
        const key = deriveKey(structure, { systemId: 'probe', mapping });
        if (key !== null) keys.add(key);
      }
      return keys.size >= 4;
    });
    expect(wide.length).toBeGreaterThan(structures.length / 2);
  });

  it('verifies an answer against the session that asked it, and only that one', () => {
    const structure = structures.find(
      (s) =>
        deriveKey(s, systems[0]!) !== null &&
        deriveKey(s, systems[1]!) !== null &&
        deriveKey(s, systems[0]!) !== deriveKey(s, systems[1]!),
    );
    expect(
      structure,
      'no item keys differently under the first two session mappings',
    ).toBeDefined();

    const a = deriveKey(structure!, systems[0]!)!;
    const b = deriveKey(structure!, systems[1]!)!;
    expect(verifySessionAnswer(structure!, systems[0]!, a)).toEqual({
      correct: true,
      machineOutput: a,
    });
    // The same tap, judged under another child's mapping, is wrong — which is what makes one
    // child's scraped answers worthless to the next.
    expect(verifySessionAnswer(structure!, systems[1]!, a)).toEqual({
      correct: false,
      machineOutput: b,
    });
  });

  it('never keys an item to an option that is not on screen', () => {
    for (const system of systems) {
      for (const entry of sessionPool(structures, system)) {
        const keys = entry.structure.content.options.map((o) => o.key);
        expect(keys).toContain(entry.correctKey);
      }
    }
  });
});

/* ================================================================== *
 * 4. What it costs — asserted, so a later change cannot quietly worsen it
 * ================================================================== */

describe('the cost of a draw', () => {
  const systems = ['s1', 's2', 's3', 's4', 's5', 's6'].map(drawSessionSystem);

  it('keeps only part of the bank, and reports which part', () => {
    const shares = systems.map((s) => sessionPool(structures, s).length / structures.length);
    for (const share of shares) {
      expect(share).toBeGreaterThan(0.1);
      expect(share).toBeLessThan(0.6);
    }
  });

  /**
   * The blocking finding, pinned as a test so it cannot be forgotten between the design note and a
   * later attempt to wire this in. The shipped bank fills every 0.5-point rung with at least five
   * items (§1.1(c)); a session pool does not, because admissibility collapses with chain depth and
   * chain depth is what the ladder is made of.
   */
  it('does NOT preserve the 0.5-point ladder the bank is built to guarantee', () => {
    for (const system of systems) {
      const ladder = sessionLadder(sessionPool(structures, system));
      expect(ladder.rungsShortOfFive).toBeGreaterThan(ladder.rungsTotal / 2);
    }
    // ...and the shipped bank does preserve it, which is what makes the line above a loss.
    const full = sessionPool(structures, shipped);
    expect(full.length).toBe(structures.length);
    expect(sessionLadder(full).rungsShortOfFive).toBe(0);
  });

  it('recomputes the rung rather than serving the one the bank shipped', () => {
    let moved = 0;
    let total = 0;
    for (const system of systems) {
      for (const entry of sessionPool(structures, system)) {
        const shippedDifficulty = bank.find((i) => i.itemId === entry.structure.itemId)!.difficulty;
        total += 1;
        if (Math.abs(entry.difficulty - shippedDifficulty) > 0.25) moved += 1;
      }
    }
    // If this were zero the recomputation would be doing nothing and the served rung would be a
    // lie for every item whose mapping changed its operator mix.
    expect(moved).toBeGreaterThan(0);
    expect(moved / total).toBeLessThan(1);
  });
});

/* ================================================================== *
 * 5. The oracle survives the change
 * ================================================================== */

describe('the learnability oracle, recomputed per session', () => {
  /**
   * A 30-trial block spread across the session's own ladder, which is roughly what the adaptive
   * engine walks. Taken by stride rather than at random so the suite is deterministic; the probe
   * measures the uniformly-drawn version and gets a faster collapse, not a slower one.
   */
  function blockFor(seed: string): { system: SessionSystem; observations: Observation[] } {
    const system = drawSessionSystem(seed);
    const pool = sessionPool(structures, system);
    const stride = Math.max(1, Math.ceil(pool.length / 30));
    return {
      system,
      observations: pool
        .filter((_, i) => i % stride === 0)
        .slice(0, 30)
        .map((entry) => ({
          chain: entry.structure.content.chain,
          input: entry.structure.content.input,
          output: entry.structure.content.options.find((o) => o.key === entry.correctKey)!.figure,
        })),
    };
  }

  it('starts with the whole hypothesis space and never pins a badge to the wrong operator', () => {
    expect(deducibility([]).candidates).toBe(720);
    expect(deducibility([]).pinned).toEqual([]);

    const { system, observations } = blockFor('oracle-session');
    for (const n of [1, 3, 6, 10, 20]) {
      const result = deducibility(observations.slice(0, n));
      // The truth is always still standing: an oracle that excludes it is telling a child they
      // learned something false, which is worse than telling them nothing.
      expect(result.candidates).toBeGreaterThan(0);
      for (const [badge, operator] of Object.entries(result.resolved)) {
        expect(operator, `${badge} pinned to the wrong operator at trial ${String(n)}`).toBe(
          system.mapping[badge],
        );
      }
    }
  });

  it('pins more of the system as the block goes on, and needs nothing fixed at build time', () => {
    // The point of this assertion is the ARGUMENT LIST: `deducibility` is handed observations and a
    // tray, and nothing else. No bank constant, no build-time seed, no stored mapping — so it is
    // computable at request time against a system that did not exist an hour ago, which is exactly
    // what per-session keying asks of it.
    const { observations } = blockFor('oracle-session');
    const at = [1, 4, 8, 16, 24].map((n) => deducibility(observations.slice(0, n)));
    for (let i = 1; i < at.length; i++) {
      expect(at[i]!.candidates).toBeLessThanOrEqual(at[i - 1]!.candidates);
      expect(at[i]!.pinned.length).toBeGreaterThanOrEqual(at[i - 1]!.pinned.length);
    }
    expect(at[at.length - 1]!.pinned.length).toBeGreaterThan(0);
  });

  /**
   * The oracle read as the attack, which is the same computation run by someone else. This is the
   * residual the design note refuses to call closed: a child's own reveals pin a child's own
   * mapping, and per-session keying does nothing about that.
   */
  it('shows the residual — a session pins its own mapping from its own reveals', () => {
    const collapsed: number[] = [];
    for (let i = 0; i < 8; i++) {
      const { observations } = blockFor(`residual-${String(i)}`);
      const end = deducibility(observations);
      collapsed.push(end.candidates);
      expect(
        end.pinned.length,
        `seed ${String(i)}: only ${String(end.pinned.length)} of 6 badges pinned by end of block`,
      ).toBeGreaterThanOrEqual(4);
    }
    // 720 hypotheses at trial 0, at most a couple by the end of an ordinary block.
    expect(Math.max(...collapsed)).toBeLessThanOrEqual(6);
  });
});
