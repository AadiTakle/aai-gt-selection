import { describe, expect, it } from 'vitest';

import { startState, type ServedItem } from '@gt-selection/exam-engine';

import { EXAM_TYPE_REGISTRY } from './registry.generated';
import { LEARNING_BLOCK_TYPE_CODES } from './phase2';
import {
  ASSESSMENT_SURFACE,
  SCREENER_ENGINE_OVERRIDES,
  SCREENER_SURFACE,
  screenerPool,
} from './surfaces';

/**
 * What the screener surface is for, asserted rather than assumed.
 *
 * Each of these is a property somebody could quietly undo while doing something else — widen the
 * pool, re-enable the Stage 2 handoff, raise a metric floor above the item budget — and none of
 * them would fail a typecheck or show up on the screen until a child was already in the session.
 * `scripts/screener-sizing.ts` covers the length claim over a cohort; this covers the invariants.
 */

/** A stand-in pool: one item per wired type, which is all the pool filters look at. */
function poolOfEveryWiredType(): ServedItem[] {
  return EXAM_TYPE_REGISTRY.map((type, i) => ({
    itemId: `ITEM-${String(i)}`,
    typeCode: type.typeCode,
    domain: type.domain,
    difficulty: 10,
    ageBands: ['4-5'],
    content: { options: ['a', 'b', 'c', 'd'] },
    syntheticOnly: true as const,
    validated: false as const,
  }));
}

describe('the screener surface', () => {
  it('never offers Stage 2, and the battery still does', () => {
    expect(SCREENER_SURFACE.offersStage2).toBe(false);
    expect(ASSESSMENT_SURFACE.offersStage2).toBe(true);
  });

  it('withholds the composite figure, and the battery still reports it', () => {
    expect(SCREENER_SURFACE.reportsTechnicalScore).toBe(false);
    expect(ASSESSMENT_SURFACE.reportsTechnicalScore).toBe(true);
  });

  it('excludes every Stage 2 activity type from its pool', () => {
    const served = screenerPool(poolOfEveryWiredType()).map((i) => i.typeCode);
    for (const reserved of LEARNING_BLOCK_TYPE_CODES) {
      expect(served).not.toContain(reserved);
    }
  });

  /**
   * The pool filter drops PACED types, which is where its saving on instruction screens comes from.
   *
   * Asserted against a fixture rather than the shipped bank on purpose. Whether a given real type is
   * paced is a property of that bank and moves when items are regenerated, so pinning a count here
   * would make this test a tripwire for bank edits rather than a statement about the filter. The
   * count against the real bank is reported by `pnpm screener:sizing` (27 of 52 survive).
   */
  it('drops types whose response is paced, and keeps single-tap ones', () => {
    const pool = poolOfEveryWiredType();
    const paced = pool.slice(0, 6).map((item) => ({
      ...item,
      // Any one of these is a declaration that the response is not a single self-contained choice,
      // which is what `burstLengthFor` refuses to burst.
      content: { ...item.content, timeBudgetSec: 45 },
    }));
    const pacedCodes = new Set(paced.map((i) => i.typeCode));
    const mixed = [...paced, ...pool.filter((i) => !pacedCodes.has(i.typeCode))];

    const screener = new Set(screenerPool(mixed).map((i) => i.typeCode));
    const battery = new Set(ASSESSMENT_SURFACE.pool(mixed).map((i) => i.typeCode));

    expect(screener.size).toBeGreaterThan(0);
    for (const code of pacedCodes) expect(screener.has(code)).toBe(false);
    expect(screener.size).toBeLessThan(battery.size);
    for (const code of screener) expect(battery.has(code)).toBe(true);
  });

  it('still covers all four reasoning areas after filtering', () => {
    const domains = new Set(screenerPool(poolOfEveryWiredType()).map((i) => i.domain));
    expect([...domains].sort()).toEqual([
      'fluid_reasoning',
      'quantitative',
      'spatial',
      'verbal',
    ]);
  });

  it('keeps enough types per area to satisfy its own breadth requirement', () => {
    const byArea = new Map<string, Set<string>>();
    for (const item of screenerPool(poolOfEveryWiredType())) {
      const set = byArea.get(item.domain) ?? new Set<string>();
      set.add(item.typeCode);
      byArea.set(item.domain, set);
    }
    const required = SCREENER_ENGINE_OVERRIDES.minTypesPerArea ?? 1;
    for (const [area, types] of byArea) {
      expect(types.size, `${area} has fewer types than minTypesPerArea`).toBeGreaterThanOrEqual(
        required,
      );
    }
  });

  /**
   * The stop rule has to be satisfiable inside the budget.
   *
   * An enforced metric whose `minSamples` exceeds what the per-area item floor can deliver makes
   * `isDone` unreachable, and the only symptom is that every session quietly runs to `hardItemCap`.
   * This is the cheap check; the sizing script is the expensive one.
   */
  it('sets no enforced metric floor above what an area is budgeted to collect', () => {
    const config = startState('4-5', SCREENER_ENGINE_OVERRIDES).config;
    const perAreaBudget = config.minItemsPerArea * config.burst.maxLength;
    for (const metric of config.coreMetrics) {
      if (!metric.enforced || metric.scope === 'all') continue;
      expect(
        metric.minSamples,
        `${metric.id} in ${metric.scope} needs more samples than the area is budgeted`,
      ).toBeLessThanOrEqual(perAreaBudget);
    }
  });

  it('keeps its hard cap well above the length it is aiming for, so bursting survives', () => {
    const config = startState('4-5', SCREENER_ENGINE_OVERRIDES).config;
    // `burstLengthFor` divides the remaining budget by 2 * 4 areas, so a cap set near the target
    // length permits bursts of 1 and the screener pays an instruction screen per item.
    const headroomForFullBurst = config.burst.maxLength * 2 * 4;
    expect(config.hardItemCap).toBeGreaterThanOrEqual(headroomForFullBurst);
  });
});
