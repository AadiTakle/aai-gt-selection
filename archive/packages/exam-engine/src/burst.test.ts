import { describe, expect, it } from 'vitest';

import { burstLengthFor, classifyBankSpeed, classifyTypeSpeed, planNextSelection } from './burst';
import { coverageGain, underCoveredMetrics } from './coverage';
import { DEFAULT_BURST_POLICY, TRACKED_METRIC_WEIGHT } from './config';
import { nextType } from './selection';
import { startState } from './state';
import { update } from './update';
import type {
  Area,
  BankItem,
  Banks,
  BurstPolicy,
  CoreMetricSpec,
  MetricId,
  QuestionType,
  ScoredItem,
} from './types';

const POLICY: BurstPolicy = { maxLength: 6, minLength: 2, maxOptions: 6 };

function itemsFor(
  typeCode: string,
  domain: Area,
  count: number,
  content: (i: number) => Record<string, unknown>,
): BankItem[] {
  return Array.from({ length: count }, (_, i) => ({
    itemId: `${typeCode}-${String(i)}`,
    typeCode,
    domain,
    // Spread across the scale so `nextItem` always has something near any estimate.
    difficulty: 1 + (i % 20),
    ageBands: ['4-5'],
    content: content(i),
    answer: { correctKey: 'A' },
    scoring: { mode: 'deterministic_key' },
    provenance: { generator: 'grammar' },
    syntheticOnly: true,
    validated: false,
  }));
}

function choiceItems(typeCode: string, domain: Area, count: number, options = 4): BankItem[] {
  return itemsFor(typeCode, domain, count, () => ({
    options: Array.from({ length: options }, (_, k) => `opt-${String(k)}`),
  }));
}

function type(typeCode: string, domain: Area, metrics: MetricId[] = []): QuestionType {
  return { typeCode, domain, ageBands: ['4-5'], metrics };
}

describe('classifyTypeSpeed', () => {
  it('accepts a type whose every item is one bounded choice', () => {
    const verdict = classifyTypeSpeed(type('T', 'verbal'), choiceItems('T', 'verbal', 5), POLICY);
    expect(verdict.fast).toBe(true);
    expect(verdict.maxOptions).toBe(4);
    expect(verdict.slowFields).toEqual([]);
  });

  it('rejects a type with no items at all', () => {
    const verdict = classifyTypeSpeed(type('T', 'verbal'), [], POLICY);
    expect(verdict.fast).toBe(false);
    expect(verdict.reason).toContain('no items');
  });

  it('rejects a type where even one item is not a bounded choice', () => {
    const items = [
      ...choiceItems('T', 'verbal', 4),
      ...itemsFor('T', 'verbal', 1, () => ({ tiles: [1, 2, 3] })),
    ];
    const verdict = classifyTypeSpeed(type('T', 'verbal'), items, POLICY);
    expect(verdict.fast).toBe(false);
    expect(verdict.reason).toContain('1/5 items are not a bounded choice');
  });

  it('rejects a choice wider than the policy bound', () => {
    const verdict = classifyTypeSpeed(
      type('T', 'verbal'),
      choiceItems('T', 'verbal', 3, 8),
      POLICY,
    );
    expect(verdict.fast).toBe(false);
    expect(verdict.maxOptions).toBe(8);
    expect(verdict.reason).toContain('above the 6-option bound');
  });

  it.each([
    'timeBudgetSec',
    'responseUntimed',
    'paceMs',
    'responseWindowMs',
    'streamLength',
    'instructionSet',
  ])('rejects a type whose response is paced or time-bounded by %s', (field) => {
    const items = [
      ...choiceItems('T', 'verbal', 4),
      ...itemsFor('T', 'verbal', 1, () => ({ options: ['a', 'b'], [field]: 1 })),
    ];
    const verdict = classifyTypeSpeed(type('T', 'verbal'), items, POLICY);
    expect(verdict.fast).toBe(false);
    expect(verdict.slowFields).toEqual([field]);
  });

  it('does not treat exposureMs as pacing the response', () => {
    // It bounds how long the stimulus is visible; the response after it is still one forced choice.
    const items = itemsFor('T', 'quantitative', 4, () => ({
      options: ['left', 'right'],
      exposureMs: 250,
    }));
    expect(classifyTypeSpeed(type('T', 'quantitative'), items, POLICY).fast).toBe(true);
  });

  /*
   * The rule this replaced disqualified any type declaring M-PATH / M-EFF / M-PLANFUL / M-IDEAFLU,
   * treating a process measurement as proof of a slow multi-move response. The first live session
   * refuted that: every type the engine served declared one, and the owner's report was that the
   * questions felt too instantaneous. Declaring a measurement is a fact about the renderer's
   * telemetry, not about the child's speed, so it must not decide eligibility.
   */
  it.each(['M-PATH', 'M-EFF', 'M-PLANFUL', 'M-IDEAFLU'])(
    'does not disqualify a bounded choice for declaring %s',
    (metricId) => {
      const verdict = classifyTypeSpeed(
        type('T', 'verbal', [metricId]),
        choiceItems('T', 'verbal', 5),
        POLICY,
      );
      expect(verdict.fast).toBe(true);
    },
  );

  it('reads an option count off a served index entry that carries no option list', () => {
    // What a browser actually selects over: the pool is fetched without stimulus content.
    const indexed = itemsFor('T', 'spatial', 4, () => ({ optionCount: 5 }));
    const verdict = classifyTypeSpeed(type('T', 'spatial'), indexed, POLICY);
    expect(verdict.fast).toBe(true);
    expect(verdict.maxOptions).toBe(5);
  });

  it('classifies nothing as burstable when the index carries no shape at all', () => {
    // The regression that kept bursts from ever firing in a browser.
    const bare = itemsFor('T', 'spatial', 4, () => ({}));
    expect(classifyTypeSpeed(type('T', 'spatial'), bare, POLICY).fast).toBe(false);
  });
});

describe('classifyBankSpeed', () => {
  it('verdicts every wired type, including one with no items', () => {
    const banks: Banks = {
      types: [type('CHOICE', 'verbal'), type('BUILD', 'spatial'), type('EMPTY', 'quantitative')],
      items: [
        ...choiceItems('CHOICE', 'verbal', 4),
        ...itemsFor('BUILD', 'spatial', 4, () => ({ tiles: [1] })),
      ],
    };
    const verdicts = classifyBankSpeed(banks, POLICY);
    expect(verdicts.get('CHOICE')?.fast).toBe(true);
    expect(verdicts.get('BUILD')?.fast).toBe(false);
    expect(verdicts.get('EMPTY')?.fast).toBe(false);
  });
});

describe('burstLengthFor', () => {
  function bankWith(options: number, count = 40): Banks {
    return {
      types: [type('T', 'verbal')],
      items: choiceItems('T', 'verbal', count, options),
    };
  }

  /** Wide enough that the remaining-budget taper never binds, so the option step-down is visible. */
  const ROOMY = { burst: POLICY, hardItemCap: 400 };

  it.each<[number, number]>([
    [2, 6],
    [4, 6],
    [5, 5],
    [6, 4],
  ])('steps a %i-option type down to %i items', (options, expected) => {
    const state = startState('4-5', ROOMY);
    expect(burstLengthFor(state, 'T', bankWith(options))).toBe(expected);
  });

  it('never falls below minLength however wide the choice', () => {
    const policy: BurstPolicy = { maxLength: 6, minLength: 2, maxOptions: 20 };
    const state = startState('4-5', { ...ROOMY, burst: policy });
    expect(burstLengthFor(state, 'T', bankWith(20))).toBe(policy.minLength);
  });

  it('honours the owner-set ceiling of six', () => {
    const state = startState('4-5', ROOMY);
    for (const options of [2, 3, 4, 5, 6]) {
      expect(burstLengthFor(state, 'T', bankWith(options))).toBeLessThanOrEqual(6);
    }
  });

  it('is 1 when the policy is disabled, which is the engine default', () => {
    expect(DEFAULT_BURST_POLICY.maxLength).toBe(1);
    const state = startState('4-5');
    expect(burstLengthFor(state, 'T', bankWith(4))).toBe(1);
  });

  it('is 1 for a type that is not burstable', () => {
    const state = startState('4-5', ROOMY);
    const banks: Banks = {
      types: [type('T', 'verbal')],
      items: itemsFor('T', 'verbal', 20, () => ({ tiles: [1, 2] })),
    };
    expect(burstLengthFor(state, 'T', banks)).toBe(1);
  });

  it('cannot exceed the type’s remaining unseen items', () => {
    const state = startState('4-5', ROOMY);
    expect(burstLengthFor(state, 'T', bankWith(4, 3))).toBe(3);
  });

  /*
   * A burst of n commits the session to roughly 4n items, because `coverageIsEven` will not conclude
   * while the areas are uneven. So the budget left before `hardItemCap` bounds burst length, and it
   * has to leave room for a second, shorter round or the session can only exit on whole rounds of the
   * current length — which is how a bursting battery came to run to the safety cap.
   */
  it('tapers as the remaining item budget runs down', () => {
    const banks = bankWith(4);
    const lengths: number[] = [];
    let previous = Number.POSITIVE_INFINITY;
    for (const itemsServed of [0, 8, 16, 24, 32, 36, 39]) {
      const state = { ...startState('4-5', { burst: POLICY, hardItemCap: 40 }), itemsServed };
      const length = burstLengthFor(state, 'T', banks);
      lengths.push(length);
      expect(
        length,
        `burst grew as the budget shrank at ${String(itemsServed)}`,
      ).toBeLessThanOrEqual(previous);
      previous = length;
    }
    expect(lengths[0]).toBeGreaterThan(1);
    expect(lengths[lengths.length - 1]).toBe(1);
  });

  it('leaves every area an equal share of what is left', () => {
    const banks = bankWith(4);
    for (const itemsServed of [0, 4, 8, 12, 16, 20, 24, 28, 32, 36]) {
      const config = { burst: POLICY, hardItemCap: 40 };
      const state = { ...startState('4-5', config), itemsServed };
      const length = burstLengthFor(state, 'T', banks);
      const headroom = 40 - itemsServed;
      // Four areas must match this burst, and a further round must still fit.
      expect(
        length * 2 * 4,
        `burst of ${String(length)} at ${String(itemsServed)}`,
      ).toBeLessThanOrEqual(Math.max(headroom, 2 * 4));
    }
  });
});

describe('planNextSelection', () => {
  const banks: Banks = {
    types: [type('T', 'verbal', ['M-ACC'])],
    items: choiceItems('T', 'verbal', 40),
  };

  function scored(itemId: string, domain: Area): ScoredItem {
    return {
      itemId,
      typeCode: 'T',
      domain,
      response: {},
      metrics: { 'M-ACC': 1 },
      telemetry: [],
      correct: true,
      score: 1,
      difficulty: 5,
    };
  }

  it('opens a burst and then walks its index without re-selecting', () => {
    const state = startState('4-5', { burst: POLICY });
    const first = planNextSelection(state, banks, null);
    expect(first).toEqual({ typeCode: 'T', length: 6, index: 1 });
    const second = planNextSelection(state, banks, first);
    expect(second).toEqual({ typeCode: 'T', length: 6, index: 2 });
  });

  it('re-selects once the burst is spent', () => {
    const state = startState('4-5', { burst: POLICY });
    const spent = { typeCode: 'T', length: 6, index: 6 };
    expect(planNextSelection(state, banks, spent)).toEqual({
      typeCode: 'T',
      length: 6,
      index: 1,
    });
  });

  it('abandons a burst when its type runs out of unseen items', () => {
    const tiny: Banks = { types: banks.types, items: choiceItems('T', 'verbal', 2) };
    let state = startState('4-5', { burst: POLICY });
    for (const item of tiny.items) state = update(state, scored(item.itemId, 'verbal'));
    expect(planNextSelection(state, tiny, { typeCode: 'T', length: 6, index: 1 })).toBeNull();
  });

  it('agrees with nextType on which type opens a fresh selection', () => {
    // The loop-level contract: a burst only ever changes HOW MANY items come from the type
    // `nextType` already chose, never which type that is.
    const state = startState('4-5', { burst: POLICY });
    expect(planNextSelection(state, banks, null)?.typeCode).toBe(nextType(state, banks));
  });
});

describe('coverageGain', () => {
  const TRACKED: MetricId[] = ['M-P1', 'M-P2', 'M-P3', 'M-P4'];
  const coreMetrics: CoreMetricSpec[] = [
    { id: 'M-ACC', scope: 'all', minSamples: 4, enforced: true },
    { id: 'M-ERRTYPE', scope: 'all', minSamples: 3, enforced: true },
    ...TRACKED.map((id) => ({ id, scope: 'all' as const, minSamples: 3, enforced: false })),
  ];

  const rich = type('RICH', 'verbal', ['M-ACC', 'M-ERRTYPE', ...TRACKED]);
  const plain = type('PLAIN', 'verbal', ['M-ACC', 'M-ERRTYPE']);

  it('caps what a type can earn from tracked-inert shortfalls', () => {
    const state = startState('4-5', { coreMetrics, trackedCoverageCap: TRACKED_METRIC_WEIGHT });
    const gaps = underCoveredMetrics('verbal', state);
    const richGain = coverageGain(rich, gaps, state.config);
    const plainGain = coverageGain(plain, gaps, state.config);
    expect(richGain - plainGain).toBe(TRACKED_METRIC_WEIGHT);
  });

  it('let a metric-rich type run away before the cap existed', () => {
    const state = startState('4-5', {
      coreMetrics,
      trackedCoverageCap: Number.MAX_SAFE_INTEGER,
    });
    const gaps = underCoveredMetrics('verbal', state);
    // Four tracked metrics, so four points — more than the 1.5-point age-band content preference
    // and enough to win the same area's selection several items running.
    expect(coverageGain(rich, gaps, state.config) - coverageGain(plain, gaps, state.config)).toBe(
      TRACKED.length * TRACKED_METRIC_WEIGHT,
    );
  });

  it('still sums enforced shortfalls without limit', () => {
    const enforcedOnly: CoreMetricSpec[] = [
      { id: 'M-A', scope: 'all', minSamples: 3, enforced: true },
      { id: 'M-B', scope: 'all', minSamples: 3, enforced: true },
      { id: 'M-C', scope: 'all', minSamples: 3, enforced: true },
    ];
    const state = startState('4-5', {
      coreMetrics: enforcedOnly,
      trackedCoverageCap: TRACKED_METRIC_WEIGHT,
    });
    const gaps = underCoveredMetrics('verbal', state);
    const all = coverageGain(type('ALL', 'verbal', ['M-A', 'M-B', 'M-C']), gaps, state.config);
    const one = coverageGain(type('ONE', 'verbal', ['M-A']), gaps, state.config);
    expect(all).toBe(one * 3);
  });

  it('stops rewarding a tracked metric once it has enough samples', () => {
    let state = startState('4-5', { coreMetrics, trackedCoverageCap: TRACKED_METRIC_WEIGHT });
    expect(underCoveredMetrics('verbal', state).has('M-P1')).toBe(true);

    const metrics: Record<MetricId, number> = { 'M-ACC': 1 };
    for (const id of TRACKED) metrics[id] = 1;
    for (let i = 0; i < 3; i++) {
      state = update(state, {
        itemId: `i-${String(i)}`,
        typeCode: 'RICH',
        domain: 'verbal',
        response: {},
        metrics,
        telemetry: [],
        correct: true,
        score: 1,
        difficulty: 5,
      });
    }
    expect(underCoveredMetrics('verbal', state).has('M-P1')).toBe(false);
  });
});

describe('type selection under the cap', () => {
  /*
   * The behaviour the owner met, in miniature.
   *
   * Both types declare tracked process measurements — that is the situation in the wired registry,
   * where nearly every type reports at least engagement and rapid-guessing — but one declares twice
   * as many. Uncapped, that difference is worth four points against two, which is more than the
   * 1.5-point age-band content preference and far more than the 0.1 jitter, so the richer type wins
   * every selection until its counts fill. Capped, both are worth one point, the scores tie, and the
   * seeded tie-break lets the area's other types in.
   */
  const SHARED: MetricId[] = ['M-P1', 'M-P2'];
  const EXTRA: MetricId[] = ['M-P3', 'M-P4'];
  const coreMetrics: CoreMetricSpec[] = [
    { id: 'M-ACC', scope: 'all', minSamples: 6, enforced: true },
    ...[...SHARED, ...EXTRA].map((id) => ({
      id,
      scope: 'all' as const,
      minSamples: 3,
      enforced: false,
    })),
  ];
  const richMetrics = ['M-ACC', ...SHARED, ...EXTRA];
  const plainMetrics = ['M-ACC', ...SHARED];
  // Three rivals rather than one, because an area in the wired registry holds eight to eighteen
  // types and a two-way contest would let the 0.1 seeded jitter decide the whole assertion.
  const PLAIN_CODES = ['PLAIN-A', 'PLAIN-B', 'PLAIN-C'];
  const banks: Banks = {
    types: [
      type('RICH', 'verbal', richMetrics),
      ...PLAIN_CODES.map((code) => type(code, 'verbal', plainMetrics)),
    ],
    items: [
      ...choiceItems('RICH', 'verbal', 20),
      ...PLAIN_CODES.flatMap((code) => choiceItems(code, 'verbal', 20)),
    ],
  };

  function firstSelections(trackedCoverageCap: number, count: number): string[] {
    let state = startState('4-5', { coreMetrics, trackedCoverageCap, minItemsPerArea: 40 });
    const picks: string[] = [];
    for (let i = 0; i < count; i++) {
      const typeCode = nextType(state, banks);
      if (typeCode === null) break;
      picks.push(typeCode);
      const metrics: Record<MetricId, number> = {};
      for (const id of typeCode === 'RICH' ? richMetrics : plainMetrics) metrics[id] = 1;
      state = update(state, {
        itemId: `${typeCode}-${String(i)}`,
        typeCode,
        domain: 'verbal',
        response: {},
        metrics,
        telemetry: [],
        correct: true,
        score: 1,
        difficulty: 5,
      });
    }
    return picks;
  }

  /** The metric-rich type's extra measurements fill at 3 samples, so the run can only last that long. */
  const RUN_LENGTH = 3;

  it('hands the metric-rich type an unbroken run when tracked gain is uncapped', () => {
    const picks = firstSelections(Number.MAX_SAFE_INTEGER, RUN_LENGTH);
    expect(picks).toEqual(Array.from({ length: RUN_LENGTH }, () => 'RICH'));
  });

  it('lets the area’s other types in once tracked gain is capped', () => {
    const picks = firstSelections(TRACKED_METRIC_WEIGHT, RUN_LENGTH);
    expect(picks.filter((code) => code === 'RICH').length).toBeLessThan(RUN_LENGTH);
  });
});
