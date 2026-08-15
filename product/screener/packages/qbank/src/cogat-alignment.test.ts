/**
 * A CogAT-aligned session cannot draw an unmapped type.
 *
 * Task 2.3. Before this, `cogat.ts` was advisory: it recorded which types corresponded to a subtest and nothing
 * consulted it, so an instrument could call itself CogAT-aligned and be served a working-memory game. The
 * mapping is now joined onto the record and applied when the pool is built.
 *
 * Filtered at pool construction rather than during selection on purpose. The engine then never chooses an item
 * the instrument would have to decline — which matters because a declined item still costs a round trip and
 * still lands in the transcript as unscorable, quietly building an estimate out of nothing.
 */

import { describe, expect, it } from 'vitest';

import { COGAT_MAP, COGAT_NONE_TYPES } from '@gt/ui-contract/cogat';

import { loadBanks } from './bank';
import { buildPool, cogatSubtestOf, meetsAlignment, precisionAt, type QbankSessionConfig } from './engine';
import { QbankSession } from './session';

const banks = loadBanks();
const allRecords = [...banks.values()].flatMap((b) => b.scorable);

const BASE: QbankSessionConfig = {
  abilityThreshold: 1.0,
  precision: precisionAt(4), // Thorough, so a session runs long enough to try many types.
  perDomainMinimum: 0,
  recommendProbability: 0.35,
};

describe('the mapping is joined onto the item', () => {
  it('answers for every servable record', () => {
    // 2.2 guarantees every type has an entry, so the join can never come back undefined. If it does, the two
    // have parted company and this is where it shows rather than in a silently narrowed pool.
    const unmapped = allRecords.filter((r) => cogatSubtestOf(r) === undefined);
    expect(unmapped.map((r) => r.typeCode).slice(0, 5)).toEqual([]);
  });

  it('is derived rather than stored, so the bank data carries no copy of it', () => {
    /**
     * The handoff doc asked for a `cogatSubtest` field on the records. Deriving it instead keeps `cogat.ts` the
     * single source: writing it into 53 JSONL files would put one fact in two places, and 3.4 exists because of
     * what happens next. This asserts the data really has no copy, so nobody adds one later and creates the
     * drift.
     */
    for (const record of allRecords.slice(0, 200)) {
      expect(record.content).not.toHaveProperty('cogatSubtest');
      expect(record as unknown as Record<string, unknown>).not.toHaveProperty('cogatSubtest');
    }
  });
});

describe('alignment decides what may be served', () => {
  it('admits everything under "any"', () => {
    expect(buildPool(allRecords, { cogatAlignment: 'any' })).toHaveLength(allRecords.length);
    expect(buildPool(allRecords)).toHaveLength(allRecords.length);
  });

  it('refuses a type mapped to none, under either strict mode', () => {
    const none = allRecords.filter((r) => COGAT_MAP[r.typeCode]?.subtest === 'none');
    expect(none.length, 'expected the bank to contain unmapped types').toBeGreaterThan(0);
    for (const record of none.slice(0, 50)) {
      expect(meetsAlignment(record, 'direct'), record.typeCode).toBe(false);
      expect(meetsAlignment(record, 'direct-or-loose'), record.typeCode).toBe(false);
    }
  });

  it('refuses a type absent from the mapping altogether', () => {
    // The case 2.2 made impossible in the data but which a future bank import reintroduces. A type nobody has
    // classified must not be served by an instrument claiming alignment.
    const stranger = { ...allRecords[0]!, typeCode: 'NEW-UNCLASSIFIED-01' };
    expect(meetsAlignment(stranger, 'direct')).toBe(false);
    expect(meetsAlignment(stranger, 'direct-or-loose')).toBe(false);
    expect(meetsAlignment(stranger, 'any')).toBe(true);
  });

  it('separates direct from loose', () => {
    const loose = allRecords.find((r) => {
      const m = COGAT_MAP[r.typeCode];
      return m && m.subtest !== 'none' && m.strength === 'loose';
    });
    expect(loose, 'expected at least one loosely-mapped type').toBeDefined();
    expect(meetsAlignment(loose!, 'direct')).toBe(false);
    expect(meetsAlignment(loose!, 'direct-or-loose')).toBe(true);
  });

  it('shrinks the pool as the claim gets stronger', () => {
    const any = buildPool(allRecords, { cogatAlignment: 'any' }).length;
    const both = buildPool(allRecords, { cogatAlignment: 'direct-or-loose' }).length;
    const direct = buildPool(allRecords, { cogatAlignment: 'direct' }).length;
    expect(direct).toBeLessThan(both);
    expect(both).toBeLessThan(any);
    expect(direct).toBeGreaterThan(0);
  });
});

describe('a whole aligned session never sees an unmapped type', () => {
  /** Play to the end and report every type the session actually served. */
  function typesServed(config: QbankSessionConfig): string[] {
    const byId = new Map(allRecords.map((r) => [r.itemId, r]));
    const session = new QbankSession(config, banks, 7);
    const served: string[] = [];
    for (let i = 0; i < 45; i += 1) {
      const serve = session.nextItem();
      if (!serve) break;
      served.push(serve.typeCode);
      const key = byId.get(serve.served.itemId)!.answer.correctKey;
      session.submit(typeof key === 'number' ? { selectedIndex: key } : { key }, 4000);
    }
    return served;
  }

  it('serves only directly-mapped types under "direct"', () => {
    // The acceptance criterion, end to end through the real session rather than through the filter alone.
    const served = typesServed({ ...BASE, cogatAlignment: 'direct' });
    expect(served.length).toBeGreaterThan(0);
    for (const typeCode of new Set(served)) {
      const mapping = COGAT_MAP[typeCode];
      expect(mapping, `${typeCode} was served but is unmapped`).toBeDefined();
      expect(mapping!.subtest, `${typeCode} maps to none`).not.toBe('none');
      expect(mapping!.subtest !== 'none' && mapping!.strength, `${typeCode} is not direct`).toBe('direct');
    }
    for (const typeCode of COGAT_NONE_TYPES) expect(served).not.toContain(typeCode);
  });

  it('serves unmapped types when alignment is not asked for', () => {
    // The control. Without this, the test above would pass on a pool that was empty for some other reason.
    const served = new Set(typesServed({ ...BASE, cogatAlignment: 'any' }));
    const anyNone = [...served].some((t) => COGAT_MAP[t]?.subtest === 'none');
    expect(anyNone, 'an unrestricted session should still reach the unmapped types').toBe(true);
  });

  it('now has spatial items under "direct", because 1b.6 made Paper Folding servable', () => {
    /**
     * This test used to assert the opposite, and going red is what it was for.
     *
     * `SPA-PUNCH-01` is the only directly-mapped Paper Folding type. All 140 of its items were excluded at load
     * as `computed_solver`, so enforcing `direct` alignment (2.3) produced a pool with no spatial items at all —
     * a CogAT-aligned instrument that could not measure a CogAT battery. 1b.6 closed it: the answer was a stored
     * cell set all along, so marking is a set comparison and no solver was needed.
     */
    const direct = buildPool(allRecords, { cogatAlignment: 'direct' });
    expect(direct.some((e) => e.domain === 'spatial')).toBe(true);
    expect(banks.get('SPA-PUNCH-01')?.scorable).toHaveLength(140);
    expect(banks.get('SPA-PUNCH-01')?.excluded).toEqual({});
    // All four domains reachable under the strictest claim, which is the state requirement 2 wanted.
    expect(new Set(direct.map((e) => e.domain))).toEqual(
      new Set(['fluid', 'quantitative', 'spatial', 'verbal']),
    );
  });

  it('still reaches a decision under the strictest alignment', () => {
    /**
     * Worth checking rather than assuming. Restricting to directly-mapped types cuts the pool hard, and a pool
     * too thin to meet the stop rule would end every session `bank-exhausted` — an aligned instrument that
     * never decides anything is not an improvement on an unaligned one that does.
     */
    const session = new QbankSession({ ...BASE, cogatAlignment: 'direct', perDomainMinimum: 1 }, banks, 7);
    const byId = new Map(allRecords.map((r) => [r.itemId, r]));
    for (let i = 0; i < 45; i += 1) {
      const serve = session.nextItem();
      if (!serve) break;
      const key = byId.get(serve.served.itemId)!.answer.correctKey;
      session.submit(typeof key === 'number' ? { selectedIndex: key } : { key }, 4000);
    }
    const state = session.state();
    expect(state.stopped).toBe(true);
    expect(state.stopReason).not.toBe('bank-exhausted');
    expect(state.decision).not.toBeNull();
  });
});
