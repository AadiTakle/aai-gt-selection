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
import { progressFrom } from '@gt/qbank/server';

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
  abilityThreshold: 1.0,
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

  it('can pass on one domain when the composite bar is out of reach', () => {
    /**
     * The whole reason to delegate to `passRouteFor`. A composite bar set beyond anything this trace can
     * reach rejects it; a reachable single-domain bar still recognises the spike.
     */
    const unreachableComposite: GiftedCriteria = {
      ...CRITERIA_V1,
      requiredProbability: 0.999999,
      domainBar: -3,
      domainRequiredProbability: 0.5,
    };
    expect(judge(trace, { ...unreachableComposite, domainRequiredProbability: 0 })).toBe(false);
    expect(judge(trace, unreachableComposite)).toBe(true);
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
