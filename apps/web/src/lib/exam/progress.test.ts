import { DEFAULT_CONFIG, startState, type Area, type SessionState } from '@gt-selection/exam-engine';
import { describe, expect, it } from 'vitest';

import { stage1Progress, stage2Progress } from './progress';

const AREA_LIST: readonly Area[] = ['fluid_reasoning', 'verbal', 'quantitative', 'spatial'];

/** A session with `seen` items and `estimates` stability readings in every area. */
function stateWith(seen: number, estimates: number, types = DEFAULT_CONFIG.minTypesPerArea) {
  const state = startState('4-5') as SessionState;
  let served = 0;
  for (const area of AREA_LIST) {
    const areaState = state.areas[area];
    for (let i = 0; i < seen; i += 1) {
      areaState.itemsSeen.add(`${area}-${i}`);
      areaState.trace.push({ typeCode: `T${i % types}` } as never);
      served += 1;
    }
    areaState.estWindow = Array.from({ length: estimates }, () => 10);
  }
  state.itemsServed = served;
  return { state, served };
}

describe('stage 1 progress projection', () => {
  it('never claims a total below the coverage floor', () => {
    const { state } = stateWith(0, 0);
    const p = stage1Progress(state, 0);
    expect(p.estimatedTotal).toBeGreaterThanOrEqual(
      DEFAULT_CONFIG.minItemsPerArea * AREA_LIST.length,
    );
    expect(p.fraction).toBe(0);
  });

  it('never promises a session longer than the engine would allow', () => {
    const { state } = stateWith(0, 0);
    expect(stage1Progress(state, 0).estimatedTotal).toBeLessThanOrEqual(DEFAULT_CONFIG.hardItemCap);
  });

  it('shortens the estimate as areas satisfy their requirements — the bar takes a bigger step', () => {
    const early = stateWith(1, 1);
    const later = stateWith(5, 5);
    const a = stage1Progress(early.state, early.served);
    const b = stage1Progress(later.state, later.served);
    // Later in the run more is answered AND less is outstanding, so the fill must have advanced.
    expect(b.fraction).toBeGreaterThan(a.fraction);
  });

  it('is monotone in answers when nothing else changes', () => {
    const { state } = stateWith(3, 3);
    const a = stage1Progress(state, 12);
    const b = stage1Progress(state, 13);
    expect(b.fraction).toBeGreaterThanOrEqual(a.fraction);
  });

  it('stays inside [0,1] even if answers run past the projection', () => {
    const { state } = stateWith(6, 6);
    expect(stage1Progress(state, 500).fraction).toBe(1);
  });

  it('degrades safely before the engine session exists', () => {
    expect(stage1Progress(null, 0).fraction).toBe(0);
  });
});

describe('stage 2 progress across activities', () => {
  it('spans every activity rather than resetting per activity', () => {
    const lengths = [30, 30, 30, 30];
    // Half way through the second of four activities is 45 of 120, not 15 of 30.
    const p = stage2Progress(lengths, 1, 15);
    expect(p.done).toBe(45);
    expect(p.estimatedTotal).toBe(120);
    expect(p.fraction).toBeCloseTo(0.375, 5);
  });

  it('reaches exactly 1 when the last activity ends', () => {
    expect(stage2Progress([30, 30], 1, 30).fraction).toBe(1);
  });

  it('handles a child offered only one activity', () => {
    expect(stage2Progress([30], 0, 15).fraction).toBeCloseTo(0.5, 5);
  });

  it('is 0 when no activity could be offered', () => {
    expect(stage2Progress([], 0, 0).fraction).toBe(0);
  });
});
