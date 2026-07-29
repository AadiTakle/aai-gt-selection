import { describe, expect, it } from 'vitest';

import {
  isDone,
  nextItem,
  nextType,
  startState,
  update,
  type Area,
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
 * exactly as the runner does: nextType -> nextItem -> (server verdict) ->
 * update -> isDone. Returns the trace so the test can assert HOW it ended.
 */
async function runBattery(gradeBand: GradeBand, trueAbility: number) {
  const banks = buildBanks((await getServedIndex()) as unknown as ServedItem[]);
  let state: SessionState = startState(gradeBand, EXAM_ENGINE_OVERRIDES);

  const served: ServedItem[] = [];
  let guard = 0;
  while (!isDone(state) && guard++ < 500) {
    const typeCode = nextType(state, banks);
    if (!typeCode) break;
    const item = nextItem(state, typeCode, banks);
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

  return { state, served, hitCap: state.itemsServed >= state.config.hardItemCap };
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
