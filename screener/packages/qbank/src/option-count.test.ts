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

import { BANK_DIR, loadBanks, optionCountOf, toLogits, type BankRecord, type LoadedBank } from './bank';
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

  it('says null rather than guessing when the content enumerates no options', () => {
    // SPA-MAZE-01 answers are paths and SPA-TANGRAM-01 answers are placements. Neither has an option
    // set, so there is no 1/n to report and inventing one is the bug this test exists to prevent.
    for (const typeCode of ['SPA-MAZE-01', 'SPA-TANGRAM-01']) {
      for (const item of itemsOf(typeCode)) {
        expect(optionCountOf(item), `${typeCode} ${item.itemId}`).toBeNull();
      }
    }
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

  it('treats an item that enumerates no options as unguessable', () => {
    /**
     * Decided by Felipe, 8 Aug 2026: an answer that is an assignment, a path, a set of rotations or a
     * placement is assumed unguessable, so c is 0 rather than the 1/4 that a four-option default
     * implied. `paramsFor` already yields c = 0 when handed no options.
     */
    for (const typeCode of ['SPA-MAZE-01', 'CX-check-01']) {
      const serve = sessionOver(typeCode).nextItem();
      expect(serve, `expected ${typeCode} to be servable`).not.toBeNull();

      const b = toLogits(serve!.difficulty);
      const unguessable = information(CONFIG.abilityThreshold, paramsFor(b, 0, 1.5));
      const asFour = information(CONFIG.abilityThreshold, paramsFor(b, 4, 1.5));

      expect(unguessable).not.toBeCloseTo(asFour, 6);
      expect(serve!.informationAtThreshold, typeCode).toBeCloseTo(unguessable, 10);
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
