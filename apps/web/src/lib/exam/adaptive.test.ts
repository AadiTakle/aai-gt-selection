import { describe, expect, it } from 'vitest';

import {
  classifyBankSpeed,
  isDone,
  nextItem,
  planNextSelection,
  startState,
  update,
  type Area,
  type BurstPlan,
  type ScoredItem,
  type ServedItem,
  type SessionState,
} from '@gt-selection/exam-engine';

import { EXAM_ENGINE_OVERRIDES, buildBanks, buildCoreMetrics } from './adaptive';
import { getServedIndex } from './bank-loader';
import { GRADE_BANDS, type GradeBand } from './contract';
import { EXAM_TYPE_REGISTRY } from './registry.generated';

/**
 * Engine-at-scale checks for the wired type pool.
 *
 * The failure mode these guard against: the stop rule requires every ENFORCED
 * core metric to reach `minSamples` in every area. If a wired type never emits
 * an enforced metric, the engine can keep selecting that type and the count
 * never advances, so `isDone` stays false until the hard item cap — a battery
 * that looks hung. With a large type pool that is easy to introduce by accident,
 * so it is asserted here rather than discovered by a child.
 */

const AREAS: Area[] = ['fluid_reasoning', 'verbal', 'quantitative', 'spatial'];

/** Metrics `/api/exam-submit` attaches to every scored item, whatever the type. */
const SERVER_METRICS = ['M-ACC', 'M-ERRTYPE'];

describe('core-metric registry', () => {
  it('only enforces a metric in an area where every wired type emits it', () => {
    for (const spec of buildCoreMetrics()) {
      if (!spec.enforced || SERVER_METRICS.includes(spec.id)) continue;
      const areas = spec.scope === 'all' ? AREAS : [spec.scope as Area];
      for (const area of areas) {
        const typesInArea = EXAM_TYPE_REGISTRY.filter((t) => t.domain === area);
        for (const type of typesInArea) {
          expect(
            type.metrics.includes(spec.id),
            `${spec.id} is enforced for ${area} but ${type.typeCode} never emits it — ` +
              'the stop rule would be unsatisfiable',
          ).toBe(true);
        }
      }
    }
  });

  it('demotes a metric to tracked when a type in that area does not emit it', () => {
    const specs = buildCoreMetrics([
      { typeCode: 'A-1', domain: 'verbal', metrics: ['M-RT', 'M-RTFIRST', 'M-REV'] },
      // emits no M-REV — M-REV must not gate the verbal area
      { typeCode: 'A-2', domain: 'verbal', metrics: ['M-RT', 'M-RTFIRST'] },
    ]);
    const rev = specs.find((s) => s.id === 'M-REV' && s.scope === 'verbal');
    const rt = specs.find((s) => s.id === 'M-RT' && s.scope === 'verbal');
    expect(rev?.enforced).toBe(false);
    expect(rt?.enforced).toBe(true);
  });

  it('never enforces M-DIFFREACH (the server only emits it on a correct answer)', () => {
    // Enforcing it would hang the battery for a child who answers everything wrong.
    const spec = buildCoreMetrics().find((s) => s.id === 'M-DIFFREACH');
    expect(spec?.enforced).toBe(false);
  });
});

/**
 * Replays a whole battery through the real engine with a simulated responder,
 * exactly as the runner does: planNextSelection -> nextItem -> (server verdict)
 * -> update -> isDone. Returns the trace so the test can assert HOW it ended.
 *
 * It drives `planNextSelection` rather than `nextType` on purpose. That is the loop
 * the runner drives, so bursting is in scope here; a battery test that skipped it
 * would pass while a child met a fresh instruction on every single item, which is
 * exactly what happened.
 */
async function runBattery(gradeBand: GradeBand, trueAbility: number) {
  const banks = buildBanks((await getServedIndex()) as unknown as ServedItem[]);
  let state: SessionState = startState(gradeBand, EXAM_ENGINE_OVERRIDES);

  const served: ServedItem[] = [];
  const bursts: BurstPlan[] = [];
  let active: BurstPlan | null = null;
  let guard = 0;
  while (!isDone(state) && guard++ < 500) {
    const plan = planNextSelection(state, banks, active);
    if (!plan) break;
    active = plan;
    bursts.push(plan);
    const item = nextItem(state, plan.typeCode, banks);
    served.push(item);

    // Simulated responder: correct with probability falling off as the item's
    // difficulty exceeds the child's true ability.
    const correct = item.difficulty <= trueAbility;
    const registryEntry = EXAM_TYPE_REGISTRY.find((t) => t.typeCode === item.typeCode);

    const metrics: Record<string, number> = {
      'M-ACC': correct ? 1 : 0,
      'M-ERRTYPE': correct ? 1 : 0.4,
    };
    if (correct) metrics['M-DIFFREACH'] = item.difficulty;
    // Only the metrics this type's demo really emits.
    for (const id of registryEntry?.metrics ?? []) metrics[id] = 1;

    const scored: ScoredItem = {
      itemId: item.itemId,
      typeCode: item.typeCode,
      domain: item.domain,
      response: null,
      metrics,
      telemetry: [],
      correct,
      score: correct ? 1 : 0,
      difficulty: item.difficulty,
    } as unknown as ScoredItem;

    state = update(state, scored);
  }

  return { state, served, bursts, banks, hitCap: state.itemsServed >= state.config.hardItemCap };
}

/** Items whose type differs from the item before them — i.e. instructions the child must read. */
function instructionScreens(served: readonly ServedItem[]): number {
  let screens = 0;
  for (let i = 0; i < served.length; i++) {
    if (i === 0 || served[i]!.typeCode !== served[i - 1]!.typeCode) screens += 1;
  }
  return screens;
}

describe('adaptive battery across the wired pool', () => {
  for (const gradeBand of GRADE_BANDS) {
    it(`concludes on the stop rule (not the hard cap) for grade ${gradeBand}`, async () => {
      const { state, served, hitCap } = await runBattery(gradeBand, 11);

      expect(isDone(state), 'battery finished').toBe(true);
      expect(
        hitCap,
        `grade ${gradeBand} ran to the ${state.config.hardItemCap}-item safety cap — ` +
          'the stop rule was never satisfied',
      ).toBe(false);

      // Every area actually got items, and the spread stayed even.
      const counts = AREAS.map((a) => state.areas[a].itemsSeen.size);
      expect(Math.min(...counts)).toBeGreaterThanOrEqual(state.config.minItemsPerArea);
      expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(
        state.config.evenSpreadTolerance,
      );

      // Variable length, and never re-serves an item.
      expect(served.length).toBeGreaterThan(0);
      expect(new Set(served.map((i) => i.itemId)).size).toBe(served.length);
    }, 30_000);
  }

  it('still concludes for a child who answers everything wrong', async () => {
    // The M-DIFFREACH trap: it is only emitted on a correct answer.
    const { state, hitCap } = await runBattery('4-5', 0);
    expect(isDone(state)).toBe(true);
    expect(hitCap, 'an all-wrong battery ran to the hard cap').toBe(false);
  }, 30_000);

  it('still concludes for a child who answers everything right', async () => {
    const { state, hitCap } = await runBattery('4-5', 20);
    expect(isDone(state)).toBe(true);
    expect(hitCap, 'an all-correct battery ran to the hard cap').toBe(false);
  }, 30_000);

  it('spreads selection across many types, not just one per area', async () => {
    const { served } = await runBattery('4-5', 11);
    const typesUsed = new Set(served.map((i) => i.typeCode));
    expect(typesUsed.size).toBeGreaterThan(AREAS.length);
  }, 30_000);
});

/**
 * Bursting, checked against the pool and the config a BROWSER actually has.
 *
 * The bug these guard against shipped and reached a child: the engine's burst policy was verified in
 * a simulation that selected over the research catalog's measurement lists, the engine's default
 * core metrics and full item content, while a live session selects over the generated registry, this
 * app's `EXAM_ENGINE_OVERRIDES` and a served index with the stimulus stripped out. Under the live
 * combination no type was ever burstable and every one of a child's items opened a fresh
 * instruction. Every assertion here therefore runs off `getServedIndex()`, not off the bank.
 */
describe('bursting under the served index', () => {
  it('finds burstable types in the pool a browser selects over', async () => {
    const banks = buildBanks((await getServedIndex()) as unknown as ServedItem[]);
    const verdicts = classifyBankSpeed(banks, EXAM_ENGINE_OVERRIDES.burst!);
    const burstable = [...verdicts.values()].filter((v) => v.fast);
    expect(
      burstable.length,
      'no wired type is burstable from the served index, so no child will ever reuse an instruction',
    ).toBeGreaterThan(0);
    // Every verdict must be reasoned, so a future regression says why rather than just failing.
    for (const verdict of verdicts.values()) expect(verdict.reason).not.toBe('');
  });

  it('serves real bursts, and never longer than the six the owner set', async () => {
    const { bursts } = await runBattery('4-5', 11);
    const longest = Math.max(...bursts.map((b) => b.length));
    expect(longest, 'bursts never fired').toBeGreaterThan(1);
    expect(longest, 'a burst ran past the agreed ceiling of six').toBeLessThanOrEqual(
      EXAM_ENGINE_OVERRIDES.burst!.maxLength,
    );
  }, 30_000);

  it('costs a child materially fewer instructions than items', async () => {
    // The complaint, restated as an assertion. Before this branch the ratio was exactly 1.0.
    const { served } = await runBattery('4-5', 11);
    const screens = instructionScreens(served);
    expect(screens).toBeLessThan(served.length * 0.7);
  }, 30_000);

  it('does not let one type monopolise an area', async () => {
    // The other half of the complaint: coverage pressure used to hand each area's first several
    // selections to whichever type declared the most process measurements (D-201).
    const { served } = await runBattery('4-5', 11);
    for (const area of AREAS) {
      const inArea = served.filter((i) => i.domain === area);
      if (inArea.length === 0) continue;
      expect(
        new Set(inArea.map((i) => i.typeCode)).size,
        `${area} drew every item from one type`,
      ).toBeGreaterThan(1);
    }
  }, 30_000);
});

describe('wired pool reachability', () => {
  it('gives every area at least one type, so even-spread is reachable', () => {
    for (const area of AREAS) {
      const n = EXAM_TYPE_REGISTRY.filter((t) => t.domain === area).length;
      expect(n, `${area} has no wired type`).toBeGreaterThan(0);
    }
  });

  /**
   * (area, grade band) pairs no wired bank currently targets.
   *
   * Not fatal: `nextItem` still serves the nearest-difficulty item, so the area
   * is reachable — but it is always served off-band and never gets the engine's
   * age-band selection bonus. Closing these needs new bank content
   * (`research/exam-question-types/banks/**`), which this workstream does not own.
   */
  const KNOWN_BAND_GAPS = new Set(['spatial/K-1']);

  it('has no band/area coverage gap beyond the known ones', () => {
    const gaps: string[] = [];
    for (const band of GRADE_BANDS) {
      for (const area of AREAS) {
        const n = EXAM_TYPE_REGISTRY.filter(
          (t) => t.domain === area && t.ageBands.includes(band),
        ).length;
        if (n === 0) gaps.push(`${area}/${band}`);
      }
    }
    const unexpected = gaps.filter((g) => !KNOWN_BAND_GAPS.has(g));
    expect(unexpected, 'new area/grade-band coverage gap').toEqual([]);
  });

  it('keeps every area reachable at every grade band even where it is off-band', async () => {
    // The gap above must stay a targeting gap, never an availability gap: the
    // engine must always be able to find an item, or the battery cannot spread.
    const index = await getServedIndex();
    for (const area of AREAS) {
      expect(
        index.some((i) => i.domain === area),
        `${area} has no items at all`,
      ).toBe(true);
    }
  });

  it('spans the full 1..20 difficulty ramp in every area', async () => {
    const index = await getServedIndex();
    for (const area of AREAS) {
      const diffs = index.filter((i) => i.domain === area).map((i) => i.difficulty);
      expect(Math.min(...diffs), `${area} floor`).toBeLessThanOrEqual(3);
      expect(Math.max(...diffs), `${area} ceiling`).toBeGreaterThanOrEqual(18);
    }
  });
});
