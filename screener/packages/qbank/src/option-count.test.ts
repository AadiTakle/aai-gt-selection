/**
 * The guessing floor has to come off the item, not off a constant.
 *
 * `paramsFor` pins c to 1/optionCount (`engine/src/irf.ts:21`). Selection and the posterior update
 * both used to pass a literal 4, so a two-option item was modelled as three times harder to guess
 * than it is and an eight-option item as twice as easy. Measured across the 5,034 servable records,
 * only 2,373 actually have four options, so the constant was wrong for the majority of the bank.
 *
 * These tests pin the count to what the content says, and pin both call sites to the count.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { Posterior, information, paramsFor } from '@gt/engine';

import {
  BANK_DIR,
  loadBanks,
  optionCountOf,
  responseFormatOf,
  toLogits,
  type BankRecord,
  type LoadedBank,
  type ResponseFormat,
} from './bank';
import { precisionAt, QbankSession, type QbankSessionConfig } from './session';

function itemsOf(typeCode: string): BankRecord[] {
  return readFileSync(join(BANK_DIR, `${typeCode}.jsonl`), 'utf8')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as BankRecord);
}

const CONFIG: QbankSessionConfig = {
  abilityThreshold: 1.0,
  precision: precisionAt(2),
  perDomainMinimum: 0,
  recommendProbability: 0.35,
};

/** A session restricted to one type, the way the API restricts it. */
function sessionOver(typeCode: string): QbankSession {
  const bank = loadBanks().get(typeCode);
  if (!bank) throw new Error(`${typeCode} is not a loaded bank`);
  const one: ReadonlyMap<string, LoadedBank> = new Map([[typeCode, bank]]);
  return new QbankSession(CONFIG, one, 1);
}

describe('the option count comes off the item', () => {
  it('reads a two-option item as two, not four', () => {
    // QUANT-DOTS-01 is a left/right dot comparison. All 120 items have two options, so a candidate
    // who knows nothing is right half the time rather than a quarter of the time.
    for (const item of itemsOf('QUANT-DOTS-01')) {
      expect(optionCountOf(item), item.itemId).toBe(2);
    }
  });

  it('reads a five-option item as five', () => {
    for (const item of itemsOf('FLU-OPCHAIN-01')) {
      expect(optionCountOf(item), item.itemId).toBe(5);
    }
  });

  it('reads counts that vary within a single type', () => {
    // SPA-VIEW-01 runs from 2 to 8 options across its servable items, which is the case a per-type
    // table would get wrong and a per-item read gets right. Servable items only: the same file also
    // holds records the loader excludes, and those are not what selection sees.
    const counts = new Set(loadBanks().get('SPA-VIEW-01')!.scorable.map((i) => optionCountOf(i)));
    expect(counts.size).toBeGreaterThan(1);
    for (const c of counts) expect(c).not.toBeNull();
  });

  it('finds the option list when the type calls it something other than options', () => {
    /**
     * Three types hold a perfectly ordinary keyed option list under their own field name. Treating them
     * as unenumerable puts them on the unguessable floor, which is wrong by a lot: FLU-DEDUCE-01 offers
     * between four and eight candidates and a child picking blind is right up to a quarter of the time.
     */
    const shapes: [string, string][] = [
      ['FLU-DEDUCE-01', 'candidates'],
      ['FLU-ODDPAIR-01', 'rows'],
      ['GB-FLAWFINDER-01', 'claims'],
    ];
    for (const [typeCode, field] of shapes) {
      const counts = new Set<number | null>();
      for (const item of itemsOf(typeCode)) {
        const expected = (item.content[field] as unknown[]).length;
        expect(optionCountOf(item), `${typeCode} ${item.itemId}`).toBe(expected);
        counts.add(expected);
      }
      // Each of the three varies across its items, so a per-type constant would be wrong too.
      expect(counts.size, `${typeCode} should not have one fixed count`).toBeGreaterThan(1);
    }
  });

  it('counts a compound yes/no response as its whole response space', () => {
    // FLU-CONCEPT-01 asks three yes/no probes and keys the lot as one string, 'YNN'. Marking is
    // all-or-nothing, so a child answering at random is right one time in eight, not one in three.
    for (const item of itemsOf('FLU-CONCEPT-01')) {
      const probes = (item.content.probes as unknown[]).length;
      expect(probes).toBe(3);
      expect(optionCountOf(item), item.itemId).toBe(8);
    }
  });

  it('reads a declared stepper range as its response space', () => {
    // SPA-HIDDENCUBE-01 answers with a number on a 0-60 stepper, so a blind answer is right one time
    // in 61 rather than never.
    for (const item of itemsOf('SPA-HIDDENCUBE-01')) {
      const r = item.content.response as { min: number; max: number; step: number };
      expect(optionCountOf(item), item.itemId).toBe((r.max - r.min) / r.step + 1);
      expect(optionCountOf(item)).toBe(61);
    }
  });

  it('bounds a grid count answer by the grid', () => {
    /**
     * MAZE and PIPES answer with an integer count — a path length, a number of pipes — and TANGRAM with
     * a filled-cell count. Every key in all three banks is <= R*C*(L||1), so the grid bounds the answer
     * and the space is that many values plus zero. A 4x4 maze is genuinely guessable (1 in 17); a 12x12
     * one is not (1 in 145). A single constant for the type would lose exactly that.
     */
    for (const typeCode of ['SPA-MAZE-01', 'SPA-PIPES-01', 'SPA-TANGRAM-01']) {
      const seen = new Set<number | null>();
      for (const item of itemsOf(typeCode)) {
        const g = item.content.grid as { R: number; C: number; L?: number };
        const space = g.R * g.C * (g.L ?? 1) + 1;
        expect(optionCountOf(item), `${typeCode} ${item.itemId}`).toBe(space);
        // The bound has to actually hold, or the floor is modelling a space the answer escapes.
        expect(Number(item.answer.correctKey), `${typeCode} ${item.itemId}`).toBeLessThan(space);
        seen.add(space);
      }
      expect(seen.size, `${typeCode} grids should vary`).toBeGreaterThan(1);
    }
  });

  it('reads a token-to-bin assignment as the whole assignment space', () => {
    // CX-check-01 sorts every token into one of the bins, so the space is bins^tokens: 64 at the small
    // end and millions at the large one. Effectively unguessable, but derived rather than asserted.
    for (const item of itemsOf('CX-check-01')) {
      const { binCount, tokenCount } = item.content as { binCount: number; tokenCount: number };
      expect(optionCountOf(item), item.itemId).toBe(binCount ** tokenCount);
    }
  });

  it('still says null when nothing in the content bounds the answer', () => {
    // The fallback has to survive. A type that declares no options, no grid, no stepper and no
    // assignment gets null, and the caller decides — that is what keeps a new bank import from
    // silently acquiring an invented guessing floor.
    const bare = {
      itemId: 'x',
      typeCode: 'MADE-UP-01',
      domain: 'fluid',
      difficulty: 10,
      ageBands: [],
      content: { prompt: 'draw something' },
      answer: { correctKey: 'anything' },
      scoring: { mode: 'deterministic_key' },
    } as unknown as BankRecord;
    expect(optionCountOf(bare)).toBeNull();
  });

  it('never reports a count below two for an item that has options', () => {
    // A one-option item would put the guessing floor at 1.0, which makes information zero and the item
    // unselectable. If a bank ever ships one, this should go red rather than silently break selection.
    for (const bank of loadBanks().values()) {
      for (const item of bank.scorable) {
        const n = optionCountOf(item);
        if (n !== null) expect(n, `${bank.typeCode} ${item.itemId}`).toBeGreaterThanOrEqual(2);
      }
    }
  });
});

describe('both call sites use that count', () => {
  it('selects on information computed from the real option count', () => {
    const serve = sessionOver('QUANT-DOTS-01').nextItem();
    expect(serve, 'expected QUANT-DOTS-01 to be servable').not.toBeNull();

    const b = toLogits(serve!.difficulty);
    const asTwo = information(CONFIG.abilityThreshold, paramsFor(b, 2, 1.5));
    const asFour = information(CONFIG.abilityThreshold, paramsFor(b, 4, 1.5));

    // Guard first: if the two models ever agreed the assertion below would prove nothing.
    expect(asTwo).not.toBeCloseTo(asFour, 6);
    expect(serve!.informationAtThreshold).toBeCloseTo(asTwo, 10);
  });

  it('updates the posterior with the real option count, on a correct answer', () => {
    /**
     * It has to be a correct answer. For a wrong one the 3PL likelihood is (1-c)(1-logistic), and that
     * leading (1-c) is constant in theta, so it divides out in normalisation and the option count has
     * no effect on the posterior whatsoever. Only a correct answer carries c into the estimate, where
     * getting a coin-flip item right is weaker evidence than getting a four-option item right.
     *
     * So the count matters to selection on every item and to the update only on the ones passed. A
     * wrong-answer version of this test passed against the unfixed code.
     */
    const session = sessionOver('QUANT-DOTS-01');
    const serve = session.nextItem()!;
    const item = itemsOf('QUANT-DOTS-01').find((i) => i.itemId === serve.served.itemId)!;

    session.submit({ key: item.answer.correctKey as string }, 4000);

    const b = toLogits(serve.difficulty);
    const asTwo = new Posterior();
    asTwo.update(paramsFor(b, 2, 1.5), true);
    const asFour = new Posterior();
    asFour.update(paramsFor(b, 4, 1.5), true);

    expect(asTwo.mean()).not.toBeCloseTo(asFour.mean(), 6);
    expect(session.state().estimate).toBeCloseTo(asTwo.mean(), 10);
  });

  it('selects a constructed-response item on its derived response space', () => {
    /**
     * Decided by Felipe, 8 Aug 2026: a constructed answer gets a small guessing chance taken from the
     * space the item declares, not a flat zero and not a four-option default. So selection has to use
     * that derived space, which for a maze is the grid and for a token sort is bins^tokens.
     */
    for (const typeCode of ['SPA-MAZE-01', 'CX-check-01', 'SPA-TANGRAM-01']) {
      const session = sessionOver(typeCode);
      const serve = session.nextItem();
      expect(serve, `expected ${typeCode} to be servable`).not.toBeNull();

      const item = itemsOf(typeCode).find((i) => i.itemId === serve!.served.itemId)!;
      const b = toLogits(serve!.difficulty);
      const derived = information(CONFIG.abilityThreshold, paramsFor(b, optionCountOf(item)!, 1.5));
      const asFour = information(CONFIG.abilityThreshold, paramsFor(b, 4, 1.5));

      expect(derived).not.toBeCloseTo(asFour, 6);
      expect(serve!.informationAtThreshold, typeCode).toBeCloseTo(derived, 10);
    }
  });

  it('holds a share of the session for multiple choice', () => {
    /**
     * Constructed items are more informative per item — 1.62x a four-option item at c=0 and still 1.41x
     * at c=0.07 — so pure information greed fills a session with them. They are also far slower to
     * answer, which is why a share of each session is reserved for multiple choice. This is a serving
     * rule and not a change to the model: the information values stay honest, the pool is constrained.
     */
    const wanted = ['SPA-MAZE-01', 'CX-check-01', 'SPA-TANGRAM-01', 'FLU-MATRIX-01', 'VER-CLOZE-01'];
    const mixed = new Map([...loadBanks()].filter(([t]) => wanted.includes(t)));

    const run = (share: number): ResponseFormat[] => {
      const session = new QbankSession({ ...CONFIG, minMultipleChoiceShare: share }, mixed, 1);
      const formats: ResponseFormat[] = [];
      for (let i = 0; i < 12; i += 1) {
        const serve = session.nextItem();
        if (!serve) break;
        formats.push(responseFormatOf(serve.served));
        // Deliberately unmarkable: it advances the session without moving the posterior, so the run is
        // driven purely by selection rather than by the stop rule firing early.
        session.submit({ nothing: true }, 5000);
      }
      return formats;
    };

    // With no floor, greed takes constructed items almost exclusively.
    const greedy = run(0);
    expect(greedy.length).toBe(12);
    expect(greedy.filter((f) => f === 'multiple-choice').length).toBeLessThan(3);

    // With the floor, at least half the session is multiple choice.
    const balanced = run(0.5);
    expect(balanced.length).toBe(12);
    expect(balanced.filter((f) => f === 'multiple-choice').length).toBeGreaterThanOrEqual(6);
  });

  it('does not let the format floor starve a pool that has only one format', () => {
    // A caller may restrict to a single type. The floor must not be able to empty the pool and stop the
    // session early — coverage rules that can deadlock selection are worse than no coverage rule.
    const only = new Map([...loadBanks()].filter(([t]) => t === 'SPA-MAZE-01'));
    const session = new QbankSession({ ...CONFIG, minMultipleChoiceShare: 0.5 }, only, 1);
    for (let i = 0; i < 5; i += 1) {
      const serve = session.nextItem();
      expect(serve, `constructed-only pool stalled at item ${i + 1}`).not.toBeNull();
      session.submit({ nothing: true }, 5000);
    }
  });

  it('leaves the posterior alone on a wrong answer, whatever the option count', () => {
    // The corollary, pinned so nobody "fixes" it later: (1-c) normalises out, so a miss on a
    // two-option item and a miss on an eight-option item are the same evidence about ability.
    const b = toLogits(10);
    const wrong = (n: number) => {
      const p = new Posterior();
      p.update(paramsFor(b, n, 1.5), false);
      return p.mean();
    };
    expect(wrong(2)).toBeCloseTo(wrong(8), 12);
  });
});
