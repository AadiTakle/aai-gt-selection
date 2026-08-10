/**
 * A retired type is never served, and says why.
 *
 * Two causes, one list. `reviewer-kill` is the 10 Aug review's verdict; `validity-defect` is the audit finding
 * that most `FLU-ODDPAIR-01` items have no defensible answer. Both must be unservable, and both must remain
 * visible in the catalogue with a reason — a type that silently vanishes is indistinguishable from a loader bug.
 */

import { describe, expect, it } from 'vitest';

import { loadBanks, loaderSummary } from './bank';
import { RETIRED_TYPES, RETIRED_TYPE_CODES, isRetired } from './retired';
import { buildPool } from './engine';

const banks = loadBanks();

describe('a retired type cannot be served', () => {
  it('has no scorable items, whatever its data says', () => {
    for (const typeCode of RETIRED_TYPE_CODES) {
      const bank = banks.get(typeCode);
      expect(bank, `${typeCode} is retired but absent from the catalogue`).toBeDefined();
      expect(bank!.scorable, typeCode).toHaveLength(0);
    }
  });

  it('is still counted, with the cause recorded', () => {
    // Visible rather than vanished: "120 items, 0 servable, retired:reviewer-kill" is a fact a caller can read.
    for (const typeCode of RETIRED_TYPE_CODES) {
      const bank = banks.get(typeCode)!;
      expect(bank.total, typeCode).toBeGreaterThan(0);
      const reasons = Object.keys(bank.excluded);
      expect(reasons, typeCode).toEqual([`retired:${RETIRED_TYPES[typeCode]!.cause}`]);
    }
  });

  it('never reaches a pool, at any alignment', () => {
    const records = [...banks.values()].flatMap((b) => b.scorable);
    for (const alignment of ['any', 'direct', 'direct-or-loose'] as const) {
      const served = new Set(buildPool(records, { cogatAlignment: alignment }).map((e) => e.record.typeCode));
      for (const typeCode of RETIRED_TYPE_CODES) {
        expect(served, `${typeCode} reached the ${alignment} pool`).not.toContain(typeCode);
      }
    }
  });

  it('leaves the bank data on disk', () => {
    // Retiring is a judgement that may be revisited. 240 items with a reason attached is recoverable; a git rm
    // is archaeology. The loader still reads every record, it just refuses to serve them.
    expect(banks.get('FLU-ODDPAIR-01')!.total).toBe(120);
    expect(banks.get('FLU-DEDUCE-01')!.total).toBe(120);
  });

  it('gives every entry a cause, a dated note, and a real type', () => {
    for (const [typeCode, retirement] of Object.entries(RETIRED_TYPES)) {
      expect(banks.has(typeCode), `${typeCode} is retired but not a bank type`).toBe(true);
      expect(['reviewer-kill', 'validity-defect']).toContain(retirement.cause);
      expect(retirement.note.length, `${typeCode} note`).toBeGreaterThan(40);
      expect(retirement.since).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(isRetired(typeCode)).toBe(true);
    }
  });
});

describe('what retiring these three costs', () => {
  it('costs 240 servable items', () => {
    expect(loaderSummary(banks).scorable).toBe(4934);
  });

  it('costs the CogAT-aligned instrument nothing', () => {
    /**
     * All three map to `none`, so a session claiming CogAT alignment is unaffected — 1,132 items across 10 types
     * with all four domains, exactly as before. Worth pinning: it means this retirement is free for the one
     * instrument whose coverage is a stated requirement.
     */
    const records = [...banks.values()].flatMap((b) => b.scorable);
    const direct = buildPool(records, { cogatAlignment: 'direct' });
    expect(direct).toHaveLength(1132);
    expect(new Set(direct.map((e) => e.domain))).toEqual(new Set(['fluid', 'quantitative', 'spatial', 'verbal']));
  });
});
