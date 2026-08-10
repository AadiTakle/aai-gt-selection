import { describe, expect, it } from 'vitest';
import { DEFAULT_VARIETY_CONFIG, type DomainName } from '@platform/domain';
import { allTypeCodesOf, makeIndex, makeRequest, varietyOff } from './fixtures.js';
import { eligible, exposureDamping, rngFor, selectNext } from './index.js';

describe('eligibility filters', () => {
  const index = makeIndex();

  it('offers the whole pool when nothing is constrained', () => {
    expect(eligible(makeRequest(index)).length).toBe(index.items.length);
  });

  it('excludes types the app has not approved', () => {
    const approved = new Set(['QUANT-TEST1-01']);
    const pool = eligible(makeRequest(index, { approvedTypes: approved }));
    expect(pool.length).toBeGreaterThan(0);
    expect(new Set(pool.map((c) => c.typeCode))).toEqual(approved);
  });

  it('excludes everything the platform cannot mark', () => {
    const unmarkable = makeIndex();
    const mutated = {
      ...unmarkable,
      items: unmarkable.items.map((c) => ({ ...c, scoringMode: 'computed_solver' as const })),
    };
    expect(eligible(makeRequest(mutated)).length).toBe(0);
  });

  it('excludes an item whose bands do not include the requested band', () => {
    expect(eligible(makeRequest(index, { ageBand: 'K-1' })).length).toBe(0);
    expect(eligible(makeRequest(index, { ageBand: '3-5' })).length).toBe(index.items.length);
  });

  it('excludes an item demanding more reading than the app can present', () => {
    const readingHeavy = makeIndex({ readingBand: '6-8' });
    expect(eligible(makeRequest(readingHeavy, { maxReadingBand: 'none' })).length).toBe(0);
    expect(eligible(makeRequest(readingHeavy, { maxReadingBand: '2-3' })).length).toBe(0);
    expect(eligible(makeRequest(readingHeavy, { maxReadingBand: '6-8' })).length).toBe(
      readingHeavy.items.length,
    );
  });

  it('treats a null reading ceiling as no constraint rather than as none', () => {
    const readingHeavy = makeIndex({ readingBand: '6-8' });
    expect(eligible(makeRequest(readingHeavy, { maxReadingBand: null })).length).toBe(
      readingHeavy.items.length,
    );
  });

  it('excludes synthetic-only items unless the app opts in', () => {
    const synthetic = makeIndex({ syntheticOnly: true });
    expect(eligible(makeRequest(synthetic, { allowSynthetic: false })).length).toBe(0);
    expect(eligible(makeRequest(synthetic, { allowSynthetic: true })).length).toBe(
      synthetic.items.length,
    );
  });

  it('excludes items already served in this session', () => {
    const used = new Set([index.items[0]!.itemId, index.items[1]!.itemId]);
    expect(eligible(makeRequest(index, { usedItemIds: used })).length).toBe(
      index.items.length - 2,
    );
  });

  it('excludes items this persona saw in a recent session, so a retake is not a repeat', () => {
    const recent = new Set(index.items.slice(0, 5).map((c) => c.itemId));
    const pool = eligible(makeRequest(index, { personaRecentItemIds: recent }));
    expect(pool.length).toBe(index.items.length - 5);
    for (const id of recent) expect(pool.some((c) => c.itemId === id)).toBe(false);
  });
});

describe('exhaustion', () => {
  it('returns null rather than throwing when nothing is eligible', () => {
    const index = makeIndex();
    const everything = new Set(index.items.map((c) => c.itemId));
    expect(selectNext(makeRequest(index, { usedItemIds: everything }))).toBeNull();
  });
});

describe('determinism', () => {
  const index = makeIndex();

  it('returns the identical item for the identical request', () => {
    const a = selectNext(makeRequest(index, { rngSeed: 'seed-x', ordinal: 4 }));
    const b = selectNext(makeRequest(index, { rngSeed: 'seed-x', ordinal: 4 }));
    expect(a?.candidate.itemId).toBe(b?.candidate.itemId);
  });

  it('diverges when only the seed changes', () => {
    const picks = new Set(
      Array.from({ length: 12 }, (_unused, i) =>
        selectNext(makeRequest(index, { rngSeed: `seed-${i}`, ordinal: 4 }))?.candidate.itemId,
      ),
    );
    expect(picks.size).toBeGreaterThan(1);
  });

  it('diverges across ordinals within one session', () => {
    const first = selectNext(makeRequest(index, { rngSeed: 'seed-y', ordinal: 1 }));
    const later = selectNext(makeRequest(index, { rngSeed: 'seed-y', ordinal: 7 }));
    expect(first?.candidate.itemId).not.toBe(later?.candidate.itemId);
  });

  it('collapses to a single answer when every variety layer is disabled', () => {
    const picks = new Set(
      Array.from({ length: 12 }, (_unused, i) =>
        selectNext(
          makeRequest(index, { rngSeed: `seed-${i}`, ordinal: 4, variety: varietyOff() }),
        )?.candidate.itemId,
      ),
    );
    expect(picks.size).toBe(1);
  });
});

describe('coverage forcing', () => {
  const index = makeIndex();

  it('serves a domain that still owes items, ahead of anything else', () => {
    const served = new Map<DomainName, number>([
      ['quantitative', 2],
      ['verbal', 2],
      ['spatial', 2],
      ['fluid', 0],
    ]);
    const result = selectNext(
      makeRequest(index, { ordinal: 7, perDomainMinimum: 2, domainServedCounts: served }),
    );
    expect(result?.candidate.domain).toBe('fluid');
    expect(result?.trace.layer).toBe('coverage');
  });

  it('outranks the randomised opening, because the stop rule depends on the blueprint', () => {
    const served = new Map<DomainName, number>([['quantitative', 0]]);
    const result = selectNext(
      makeRequest(index, { ordinal: 1, perDomainMinimum: 1, domainServedCounts: served }),
    );
    expect(result?.trace.layer).toBe('coverage');
  });

  it('does not force a domain the pool cannot serve', () => {
    const quantOnly = { ...index, items: index.items.filter((c) => c.domain === 'quantitative') };
    const result = selectNext(
      makeRequest(quantOnly, { ordinal: 5, perDomainMinimum: 2, domainServedCounts: new Map() }),
    );
    expect(result?.candidate.domain).toBe('quantitative');
  });
});

describe('the opening question', () => {
  const index = makeIndex();

  it('takes the opening path at ordinal one', () => {
    const result = selectNext(makeRequest(index, { ordinal: 1 }));
    expect(result?.trace.layer).toBe('opening');
  });

  it('draws from within the jitter band of the threshold', () => {
    for (let i = 0; i < 40; i++) {
      const result = selectNext(makeRequest(index, { rngSeed: `open-${i}`, ordinal: 1 }));
      expect(Math.abs(result!.candidate.params.b - 1.0)).toBeLessThanOrEqual(
        DEFAULT_VARIETY_CONFIG.openingJitterLogits + 1e-9,
      );
    }
  });

  it('falls back to the whole pool when nothing sits inside the band', () => {
    const narrow = { ...DEFAULT_VARIETY_CONFIG, openingJitterLogits: 0.0001 };
    const result = selectNext(makeRequest(index, { ordinal: 1, variety: narrow, threshold: 4.9 }));
    expect(result).not.toBeNull();
  });

  it('opens in different domains across sessions', () => {
    const domains = new Set(
      Array.from(
        { length: 40 },
        (_unused, i) => selectNext(makeRequest(index, { rngSeed: `d-${i}`, ordinal: 1 }))?.candidate.domain,
      ),
    );
    expect(domains.size).toBeGreaterThan(1);
  });
});

describe('same-type damping', () => {
  const index = makeIndex();

  it('makes a type less attractive the more it has been served', () => {
    const heavilyServed = new Map([['QUANT-TEST1-01', 20]]);
    const withDamping = Array.from({ length: 30 }, (_unused, i) =>
      selectNext(
        makeRequest(index, {
          rngSeed: `damp-${i}`,
          ordinal: 5,
          typeServedCounts: heavilyServed,
        }),
      )?.candidate.typeCode,
    );
    expect(withDamping.filter((t) => t === 'QUANT-TEST1-01').length).toBeLessThan(5);
  });

  it('is a no-op when switched off', () => {
    const off = { ...DEFAULT_VARIETY_CONFIG, sameTypeDamping: false };
    const counts = new Map([['QUANT-TEST1-01', 20]]);
    const damped = selectNext(
      makeRequest(index, { rngSeed: 'k', ordinal: 5, typeServedCounts: counts, variety: off }),
    );
    const undamped = selectNext(
      makeRequest(index, { rngSeed: 'k', ordinal: 5, typeServedCounts: new Map(), variety: off }),
    );
    expect(damped?.candidate.itemId).toBe(undamped?.candidate.itemId);
  });
});

describe('domain interleaving', () => {
  const index = makeIndex();

  it('prefers a different domain when one is nearly as informative', () => {
    const repeats = Array.from({ length: 40 }, (_unused, i) =>
      selectNext(makeRequest(index, { rngSeed: `il-${i}`, ordinal: 6, lastDomain: 'fluid' }))
        ?.candidate.domain,
    );
    expect(repeats.filter((d) => d === 'fluid').length).toBe(0);
  });

  it('accepts a repeat when the alternative would cost too much information', () => {
    // Only one domain is present, so there is no off-domain alternative at any price.
    const fluidOnly = { ...index, items: index.items.filter((c) => c.domain === 'fluid') };
    const result = selectNext(makeRequest(fluidOnly, { ordinal: 6, lastDomain: 'fluid' }));
    expect(result?.candidate.domain).toBe('fluid');
  });
});

describe('exposure damping', () => {
  it('leaves an under-exposed item alone', () => {
    const exposure = { sessionCount: 100, servedCounts: new Map([['i', 5]]) };
    expect(exposureDamping('i', exposure, 0.2)).toBe(1);
  });

  it('halves an item running at twice its target', () => {
    const exposure = { sessionCount: 100, servedCounts: new Map([['i', 40]]) };
    expect(exposureDamping('i', exposure, 0.2)).toBeCloseTo(0.5, 10);
  });

  it('is a no-op with no history, which is every item on day one', () => {
    expect(exposureDamping('i', null, 0.2)).toBe(1);
    expect(exposureDamping('i', { sessionCount: 0, servedCounts: new Map() }, 0.2)).toBe(1);
  });

  it('steers away from an over-exposed item in practice', () => {
    const index = makeIndex();
    const hot = index.items.filter((c) => Math.abs(c.params.b - 1.0) < 0.3).map((c) => c.itemId);
    const exposure = {
      sessionCount: 100,
      servedCounts: new Map(hot.map((id) => [id, 95])),
    };
    const picks = Array.from({ length: 40 }, (_unused, i) =>
      selectNext(makeRequest(index, { rngSeed: `ex-${i}`, ordinal: 5, exposure }))?.candidate.itemId,
    );
    expect(picks.filter((id) => hot.includes(id as string)).length).toBeLessThan(picks.length / 2);
  });
});

describe('the trace', () => {
  it('records enough to explain a choice after the fact', () => {
    const index = makeIndex();
    const result = selectNext(makeRequest(index, { ordinal: 5 }));
    expect(result?.trace.candidatePoolSize).toBe(index.items.length);
    expect(result?.trace.k).toBeGreaterThan(0);
    expect(result?.trace.informationAtThreshold).toBeGreaterThan(0);
    expect(result?.trace.reason).toContain('threshold');
    expect(result?.trace.layer).toBe('randomesque');
  });
});

describe('the rng itself', () => {
  it('replays exactly for one seed and ordinal', () => {
    const a = rngFor('s', 3);
    const b = rngFor('s', 3);
    expect(Array.from({ length: 5 }, () => a.next())).toEqual(
      Array.from({ length: 5 }, () => b.next()),
    );
  });

  it('produces different streams for different ordinals', () => {
    expect(rngFor('s', 1).next()).not.toBe(rngFor('s', 2).next());
  });

  it('stays inside the unit interval', () => {
    const rng = rngFor('s', 1);
    for (let i = 0; i < 500; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('never indexes past the end of a list', () => {
    const rng = rngFor('s', 1);
    for (let i = 0; i < 500; i++) expect(rng.int(3)).toBeLessThan(3);
  });

  it('falls back to uniform when every weight is zero', () => {
    const rng = rngFor('s', 1);
    expect(['a', 'b']).toContain(rng.weighted(['a', 'b'], [0, 0]));
  });

  it('honours weights in aggregate', () => {
    let heavy = 0;
    for (let i = 0; i < 400; i++) {
      if (rngFor(`w-${i}`, 1).weighted(['heavy', 'light'], [9, 1]) === 'heavy') heavy += 1;
    }
    expect(heavy).toBeGreaterThan(300);
  });
});

describe('approved types are honoured under variety', () => {
  it('never serves an unapproved type, however the layers interact', () => {
    const index = makeIndex();
    const approved = new Set(['VER-TEST2-01', 'SPA-TEST1-01']);
    for (let i = 0; i < 60; i++) {
      const result = selectNext(
        makeRequest(index, { rngSeed: `ap-${i}`, ordinal: (i % 8) + 1, approvedTypes: approved }),
      );
      expect(approved.has(result!.candidate.typeCode)).toBe(true);
    }
  });
});

describe('type codes in the fixture', () => {
  it('covers all four domains', () => {
    expect(allTypeCodesOf(makeIndex()).size).toBe(12);
  });
});
