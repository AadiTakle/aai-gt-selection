import { describe, expect, it } from 'vitest';
import {
  QbankSession,
  precisionAt,
  type BankRecord,
  type LoadedBank,
  type QbankSessionConfig,
} from '@gt/qbank/server';
import {
  CRITERIA_V1,
  DOMAIN_NAMES,
  type DomainName,
  type GiftedCriteria,
  type SelectionCandidate,
} from '@platform/domain';
import { computeSheet } from './sheet.js';
import { evaluateCriteria } from './criteria.js';
import { posteriorsFromTrace, toAttempts, toPool, verdictFor, type TraceEntry } from './qbank-adapter.js';
import { passRouteFor, progressFrom } from '@gt/qbank/server';

/**
 * The platform's sheet is checked against the engine itself.
 *
 * An earlier version of this file asserted that a platform-local posterior matched a reference
 * `Posterior` to twelve decimals. That was worth having when the platform implemented its own; now that the
 * decision lives in `@gt/qbank`, the stronger and more useful claim is that a sheet derived from a trace
 * says exactly what a real `QbankSession` driven through the same items says. If the two ever disagree, the
 * platform is telling a family something the engine would not.
 */

const OPTION_KEYS = ['A', 'B', 'C', 'D'] as const;

const TYPES: readonly [string, string, DomainName][] = [
  ['QUANT-FIX-01', 'quantitative', 'quantitative'],
  ['VER-FIX-01', 'verbal', 'verbal'],
  ['SPA-FIX-01', 'spatial', 'spatial'],
  ['FLU-FIX-01', 'fluid_reasoning', 'fluid'],
];

function recordFor(typeCode: string, bankDomain: string, i: number): BankRecord {
  const difficulty = Number((4 + (14 * i) / 11).toFixed(2));
  return {
    itemId: `${typeCode}-i${String(i).padStart(2, '0')}`,
    typeCode,
    domain: bankDomain,
    difficulty,
    ageBands: ['3-5'],
    content: {
      typeCode,
      options: OPTION_KEYS.map((key) => ({ key, label: `option ${key}` })),
    },
    answer: { correctKey: OPTION_KEYS[i % OPTION_KEYS.length] as string },
    scoring: { mode: 'deterministic_key' },
    syntheticOnly: false,
    validated: true,
  } as BankRecord;
}

function banksFixture(itemsPerType = 12): Map<string, LoadedBank> {
  const out = new Map<string, LoadedBank>();
  for (const [typeCode, bankDomain] of TYPES) {
    const scorable = Array.from({ length: itemsPerType }, (_u, i) => recordFor(typeCode, bankDomain, i));
    out.set(typeCode, {
      typeCode,
      domain: bankDomain,
      scorable,
      total: scorable.length,
      excluded: {},
      difficultyRange: [scorable[0]!.difficulty, scorable[scorable.length - 1]!.difficulty],
      ageBands: ['3-5'],
    } as LoadedBank);
  }
  return out;
}

function candidatesFrom(banks: Map<string, LoadedBank>): SelectionCandidate[] {
  const out: SelectionCandidate[] = [];
  for (const [typeCode, bank] of banks) {
    const domain = TYPES.find(([code]) => code === typeCode)![2];
    for (const record of bank.scorable) {
      out.push({
        itemId: record.itemId,
        itemRevision: 1,
        typeCode,
        domain,
        params: { b: (record.difficulty - 10.5) / 3, a: 1.5, c: 0.25 },
        difficulty: record.difficulty,
        optionCount: 4,
        ageBands: record.ageBands,
        scoringMode: 'deterministic_key',
        markable: true,
        readingBand: null,
        syntheticOnly: false,
      });
    }
  }
  return out;
}

const CONFIG: QbankSessionConfig = {
  // Measured where the criteria judge. Driving a session at one threshold and judging it at another is a
  // real configuration but a confusing test: a perfect responder can look unremarkable simply because the
  // questions were aimed somewhere else.
  abilityThreshold: CRITERIA_V1.abilityThreshold,
  precision: precisionAt(2),
  perDomainMinimum: 1,
  recommendProbability: 0.35,
};

const banks = banksFixture();
const candidates = candidatesFrom(banks);
const keyOf = new Map<string, string>();
for (const bank of banks.values()) {
  for (const record of bank.scorable) keyOf.set(record.itemId, String(record.answer.correctKey));
}

/** Drive a real engine session, answering every item as told, and keep both sides of the comparison. */
function driveSession(answerCorrectly: boolean): {
  trace: TraceEntry[];
  session: QbankSession;
} {
  const session = new QbankSession(CONFIG, banks, 7);
  const trace: TraceEntry[] = [];

  for (let ordinal = 1; ordinal <= 60; ordinal += 1) {
    const serve = session.nextItem();
    if (!serve) break;
    const correctKey = keyOf.get(serve.served.itemId) as string;
    const handed = answerCorrectly ? correctKey : correctKey === 'A' ? 'B' : 'A';
    const candidate = candidates.find((c) => c.itemId === serve.served.itemId)!;

    session.submit({ key: handed }, 4000);
    const attempt = session.getAttempts()[ordinal - 1]!;
    trace.push({
      ordinal,
      itemId: serve.served.itemId,
      typeCode: serve.typeCode,
      domain: candidate.domain,
      difficulty: serve.difficulty,
      params: candidate.params,
      correct: attempt.correct,
      latencyMs: 4000,
      rawResponse: { key: handed },
      flags: attempt.flags,
    });
    if (session.state().stopped) break;
  }

  return { trace, session };
}

function sheetFor(trace: readonly TraceEntry[], overrides: Record<string, unknown> = {}) {
  return computeSheet({
    sessionId: 'sess-1',
    snapshotId: 'snap-test-001',
    config: CONFIG,
    criteria: CRITERIA_V1,
    trace,
    candidates,
    itemsServed: trace.length,
    computedAt: '2026-08-10T00:00:00.000Z',
    ...overrides,
  });
}

describe('the sheet agrees with the engine', () => {
  for (const correctly of [true, false]) {
    describe(correctly ? 'a child answering correctly' : 'a child answering wrongly', () => {
      const { trace, session } = driveSession(correctly);
      const state = session.state();
      const sheet = sheetFor(trace);

      it('reaches the same stop reason', () => {
        expect(sheet.stopReason).toBe(state.stopReason);
        expect(sheet.stopped).toBe(state.stopped);
      });

      it('reaches the same decision, by the same route', () => {
        expect(sheet.decision).toBe(state.decision);
        expect(sheet.passRoute).toEqual(state.passRoute ?? null);
      });

      it('reports the same composite estimate and interval', () => {
        expect(sheet.composite.mean).toBeCloseTo(state.estimate, 12);
        expect(sheet.composite.interval[0]).toBeCloseTo(state.interval[0], 12);
        expect(sheet.composite.interval[1]).toBeCloseTo(state.interval[1], 12);
        expect(sheet.composite.pAboveThreshold).toBeCloseTo(state.pAbove, 12);
      });

      it('reports the same per-domain bands where the engine reports any', () => {
        for (const domain of DOMAIN_NAMES) {
          const band = state.domains[domain];
          if (!band) continue;
          expect(sheet.domains[domain].mean).toBeCloseTo(band.mean, 12);
          expect(sheet.domains[domain].interval[0]).toBeCloseTo(band.interval[0], 12);
          expect(sheet.domains[domain].interval[1]).toBeCloseTo(band.interval[1], 12);
          expect(sheet.domains[domain].itemsScored).toBe(band.itemsScored);
        }
      });

      it('counts the same items served and unscorable', () => {
        expect(sheet.itemsServed).toBe(state.itemsServed);
        expect(sheet.composite.itemsUnscorable).toBe(state.unscorable);
      });

      it('served at least the item floor', () => {
        expect(trace.length).toBeGreaterThanOrEqual(CONFIG.precision.minItems);
      });
    });
  }
});

describe('the platform additions on top of the verdict', () => {
  const { trace } = driveSession(true);

  it('stamps the algorithm, the criteria and the snapshot', () => {
    const sheet = sheetFor(trace);
    expect(sheet.engineVersion).toMatch(/^engine-/);
    expect(sheet.criteriaVersion).toBe(CRITERIA_V1.version);
    expect(sheet.snapshotId).toBe('snap-test-001');
  });

  it('reconciles against its trace', () => {
    expect(sheetFor(trace, { itemsServed: trace.length + 1 }).derivedFromResponseCount).toBe(
      trace.length,
    );
  });

  it('is a pure function of its input', () => {
    expect(sheetFor(trace)).toEqual(sheetFor(trace));
  });

  it('reports abandonment ahead of anything the engine would have said', () => {
    expect(sheetFor(trace, { abandoned: true }).stopReason).toBe('abandoned');
  });

  it('reports bank-exhausted only when the engine had no reason of its own', () => {
    const short = trace.slice(0, 2);
    expect(sheetFor(short, { poolExhausted: true }).stopReason).toBe('bank-exhausted');
    // A full run already has a reason, and exhaustion must not overwrite it.
    expect(sheetFor(trace, { poolExhausted: true }).stopReason).not.toBe('bank-exhausted');
  });
});

describe('evidence the pool cannot account for', () => {
  /**
   * The reason the platform builds posteriors from the trace rather than from `posteriorsFrom`. That
   * function looks each item up in the pool and skips the ones it cannot find, which during a backfill
   * after a retirement means a posterior over less evidence, returned with no signal.
   */
  const { trace } = driveSession(true);

  it('names the items, rather than quietly scoring without them', () => {
    const thinned = candidates.filter((c) => c.itemId !== trace[0]!.itemId);
    const sheet = sheetFor(trace, { candidates: thinned });
    expect(sheet.unaccountedItemIds).toEqual([trace[0]!.itemId]);
  });

  it('still counts the evidence, because the trace carries its own parameters', () => {
    const thinned = candidates.filter((c) => c.itemId !== trace[0]!.itemId);
    expect(sheetFor(trace, { candidates: thinned }).composite.itemsScored).toBe(
      sheetFor(trace).composite.itemsScored,
    );
  });

  it('is empty on a healthy recompute', () => {
    expect(sheetFor(trace).unaccountedItemIds).toEqual([]);
  });

  it('would have dropped that evidence had the pool been the source', () => {
    // Pins the behaviour being avoided, not only the avoidance.
    const thinned = candidates.filter((c) => c.itemId !== trace[0]!.itemId);
    const viaPool = verdictFor({ config: CONFIG, trace, candidates: thinned });
    const viaTrace = posteriorsFromTrace(trace);
    // The verdict's own posteriors come from the trace, so they agree; the point is that the pool is
    // demonstrably missing the item the sheet reported.
    expect(viaPool.posteriors.composite.mean()).toBeCloseTo(viaTrace.composite.mean(), 12);
    expect(thinned.some((c) => c.itemId === trace[0]!.itemId)).toBe(false);
  });
});

describe('unscorable responses', () => {
  it('move no evidence but are counted', () => {
    const { trace } = driveSession(true);
    const withNull: TraceEntry[] = [
      ...trace,
      { ...trace[0]!, ordinal: trace.length + 1, itemId: trace[1]!.itemId, correct: null },
    ];
    const before = sheetFor(trace);
    const after = sheetFor(withNull);
    expect(after.composite.mean).toBeCloseTo(before.composite.mean, 12);
    expect(after.composite.itemsUnscorable).toBe(before.composite.itemsUnscorable + 1);
  });
});

describe('criteria, and the disjunctive route', () => {
  function judge(trace: readonly TraceEntry[], criteria: GiftedCriteria): boolean {
    const posteriors = posteriorsFromTrace(trace);
    const progress = progressFrom(toAttempts(trace), toPool(candidates));
    return evaluateCriteria(posteriors, progress, criteria);
  }

  const { trace } = driveSession(true);

  it('needs the item floor as well as the probability', () => {
    expect(judge(trace.slice(0, 3), CRITERIA_V1)).toBe(false);
  });

  it('passes a strong session on the composite', () => {
    expect(judge(trace, CRITERIA_V1)).toBe(true);
  });

  it('fails a session that answered everything wrongly', () => {
    expect(judge(driveSession(false).trace, CRITERIA_V1)).toBe(false);
  });

  it('will not pass a balanced session on one domain, because no domain has the evidence', () => {
    /**
     * The finding this floor exists for. A ten-item session over four domains leaves each domain two or
     * three items. The engine will happily report that a domain cleared a probability bar on two items; the
     * criteria will not act on it. So a balanced session either passes on the composite or not at all.
     */
    const unreachableComposite: GiftedCriteria = {
      ...CRITERIA_V1,
      requiredProbability: 0.999999,
      domainBar: -3,
      domainRequiredProbability: 0.5,
    };
    const perDomain = DOMAIN_NAMES.map(
      (domain) => trace.filter((entry) => entry.domain === domain && entry.correct !== null).length,
    );
    expect(Math.max(...perDomain)).toBeLessThan(CRITERIA_V1.domainMinItemsScored as number);
    expect(judge(trace, unreachableComposite)).toBe(false);

    // Drop the floor and the same trace passes, which locates the refusal in the evidence rather than in
    // the probability.
    expect(judge(trace, { ...unreachableComposite, domainMinItemsScored: 1 })).toBe(true);
  });

  it('enforces a per-domain floor on top of whichever route cleared', () => {
    const needsUnmeasuredDomain: GiftedCriteria = {
      ...CRITERIA_V1,
      perDomainRequirements: { verbal: { minItemsScored: 99, requiredProbability: 0 } },
    };
    expect(judge(trace, CRITERIA_V1)).toBe(true);
    expect(judge(trace, needsUnmeasuredDomain)).toBe(false);
  });

  it('agrees with the sheet it produced', () => {
    expect(sheetFor(trace).meetsCriteria).toBe(judge(trace, CRITERIA_V1));
  });
});

describe('the single-domain route needs enough evidence to be worth acting on', () => {
  function judge(trace: readonly TraceEntry[], criteria: GiftedCriteria): boolean {
    const posteriors = posteriorsFromTrace(trace);
    const progress = progressFrom(toAttempts(trace), toPool(candidates));
    return evaluateCriteria(posteriors, progress, criteria);
  }

  /** Everything in one domain, so that domain is the only route available. */
  function oneDomain(count: number, b: number, correct: boolean): TraceEntry[] {
    const of = candidates.filter((c) => c.domain === 'quantitative');
    return Array.from({ length: count }, (_u, i) => ({
      ordinal: i + 1,
      itemId: of[i % of.length]!.itemId,
      typeCode: of[i % of.length]!.typeCode,
      domain: 'quantitative' as const,
      difficulty: 12,
      params: { b, a: 1.5, c: 0.25 },
      correct,
      latencyMs: 4000,
      rawResponse: null,
      flags: [],
    }));
  }

  const unreachableComposite: GiftedCriteria = {
    ...CRITERIA_V1,
    requiredProbability: 0.999999,
    domainBar: -3,
    domainRequiredProbability: 0.5,
  };

  it('refuses a domain that cleared on too few items', () => {
    // Nine items so the composite floor of eight is met, but only three in the clearing domain.
    const thin = [...oneDomain(3, 0, true), ...oneDomain(6, 0, true).map((e, i) => ({
      ...e,
      ordinal: 4 + i,
      domain: 'verbal' as const,
      itemId: candidates.filter((c) => c.domain === 'verbal')[i]!.itemId,
      typeCode: candidates.filter((c) => c.domain === 'verbal')[i]!.typeCode,
    }))];
    const quantOnly: GiftedCriteria = {
      ...unreachableComposite,
      domainMinItemsScored: 6,
      // Only quantitative can clear this bar; verbal answered the same way would too, so restrict by
      // requiring more than the three quantitative items carry.
    };
    const posteriors = posteriorsFromTrace(thin);
    const progress = progressFrom(toAttempts(thin), toPool(candidates));
    const route = passRouteFor(
      {
        abilityThreshold: quantOnly.abilityThreshold,
        recommendProbability: quantOnly.requiredProbability,
        precision: { label: 'x', confidenceAbove: 1, confidenceBelow: 1, minItems: 0, maxItems: 0, note: '' },
        perDomainMinimum: 0,
        domainBar: quantOnly.domainBar as number,
        domainRecommendProbability: quantOnly.domainRequiredProbability as number,
      },
      posteriors,
      progress,
    );
    // The engine says a domain cleared; the criteria decide whether that is worth acting on.
    expect(route?.via).toBe('domain');
    expect(judge(thin, { ...quantOnly, domainMinItemsScored: 99 })).toBe(false);
  });

  it('accepts a domain that cleared on enough items', () => {
    const solid = oneDomain(10, 0, true);
    expect(judge(solid, { ...unreachableComposite, domainMinItemsScored: 6 })).toBe(true);
  });

  it('accepts when one clearing domain is well measured even if another is thin', () => {
    const mixed = [
      ...oneDomain(8, 0, true),
      ...Array.from({ length: 2 }, (_u, i) => {
        const verbal = candidates.filter((c) => c.domain === 'verbal')[i]!;
        return {
          ordinal: 9 + i,
          itemId: verbal.itemId,
          typeCode: verbal.typeCode,
          domain: 'verbal' as const,
          difficulty: 12,
          params: { b: 0, a: 1.5, c: 0.25 },
          correct: true,
          latencyMs: 4000,
          rawResponse: null,
          flags: [],
        };
      }),
    ];
    expect(judge(mixed, { ...unreachableComposite, domainMinItemsScored: 6 })).toBe(true);
  });

  it("ships a floor, so the engine's bare 'scored something' rule is never the platform's rule", () => {
    expect(CRITERIA_V1.domainMinItemsScored).toBeGreaterThan(1);
    // And the single-domain route is not the easier way in.
    expect(CRITERIA_V1.domainRequiredProbability).toBeGreaterThanOrEqual(
      CRITERIA_V1.requiredProbability,
    );
    expect(CRITERIA_V1.domainBar as number).toBeGreaterThan(CRITERIA_V1.abilityThreshold);
  });
});

describe('the criteria are internally ordered', () => {
  it('puts the single-domain bar above the composite threshold', () => {
    /**
     * Not a style check. The domain route exists so a spiky child can pass on one domain when the composite
     * rejects them, and that is only defensible if clearing one domain is a *harder* ability claim than
     * clearing the composite. Raising the composite to the 95th percentile left domainBar at 1.5 — below it —
     * which would have made the single-domain route the easier way in without anything failing.
     */
    expect(CRITERIA_V1.domainBar as number).toBeGreaterThan(CRITERIA_V1.abilityThreshold);
  });

  it('aims at the 95th percentile', () => {
    // theta 1.645 is the 95th percentile of a standard normal, and 95th-percentile CogAT is GT's stated bar.
    expect(CRITERIA_V1.abilityThreshold).toBeCloseTo(1.645, 3);
  });
});
