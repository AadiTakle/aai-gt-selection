import { describe, expect, it } from 'vitest';

import type { BankItem, ExamDomain } from './item';
import { syntheticTwoStageBank } from './sample-items-two-stage';
import { driveSession, type PlayerOutcome } from './session';
import type { Sequencer } from './sequencer';
import { planFromResults, TwoStageSequencer } from './two-stage-sequencer';

const bank = syntheticTwoStageBank();

/**
 * A synthetic "player + child" for the pure shell loop. Standing (single-select)
 * items are answered correctly iff the item's rung is at/below the domain ceiling,
 * so the bracket must localise each ceiling. Effort (embedded-demo) items report
 * self-scored telemetry, never a routing signal for Phase 2.
 */
function childWithCeilings(ceilings: Partial<Record<ExamDomain, number>>) {
  return (_served: unknown, item: BankItem): PlayerOutcome => {
    if (item.renderKind === 'single-select') {
      const ceiling = ceilings[item.domain] ?? 0;
      const correct = item.difficultyLevel <= ceiling;
      const key = item.answer.correctIndex!;
      const optionCount = item.content.options.length;
      const selectedIndex = correct ? key : (key + 1) % optionCount;
      return { response: { selectedIndex }, telemetry: {}, responseTimeMs: 800, skipped: false };
    }
    return {
      response: null,
      telemetry: { 'M-ACC': '3/6  50%', 'M-DIFFREACH': 'L7 · 2 rules', 'M-EFFORT': 'engaged' },
      responseTimeMs: 4200,
      skipped: false,
    };
  };
}

function alwaysCorrect(_served: unknown, item: BankItem): PlayerOutcome {
  if (item.renderKind === 'single-select') {
    return {
      response: { selectedIndex: item.answer.correctIndex! },
      telemetry: {},
      responseTimeMs: 700,
      skipped: false,
    };
  }
  return { response: null, telemetry: { 'M-ACC': '6/6 100%' }, responseTimeMs: 3000, skipped: false };
}

const CEILINGS: Partial<Record<ExamDomain, number>> = {
  fluid_reasoning: 8, // correct 2,5,8 → floor 8, ceiling 11 → estimate 9.5
  verbal: 5, // correct 2,5 → floor 5, ceiling 8 → estimate 6.5
  quantitative: 11, // correct 2,5,8,11 → floor 11, ceiling 14 → estimate 12.5
  spatial: 2, // correct 2 → floor 2, ceiling 5 → estimate 3.5
};

describe('TwoStageSequencer — interface conformance', () => {
  it('is a drop-in Sequencer (id, label, next)', () => {
    const sequencer: Sequencer = new TwoStageSequencer();
    expect(sequencer.id).toBe('two-stage');
    expect(sequencer.label).toMatch(/PROPOSED/i);
    expect(typeof sequencer.next).toBe('function');
  });

  it('next() is deterministic for the same context', () => {
    const seq = new TwoStageSequencer();
    const a = seq.next({ bank, presentedItemIds: [], results: [] });
    const b = seq.next({ bank, presentedItemIds: [], results: [] });
    expect(a?.itemId).toBe(b?.itemId);
    // First probe is a STANDING item at a moderate rung, never an effort item.
    expect(a?.renderKind).toBe('single-select');
  });
});

describe('TwoStageSequencer — phase transition (standing → learning-rate → stop)', () => {
  const seq = new TwoStageSequencer();
  const run = driveSession(bank, seq, childWithCeilings(CEILINGS));
  const plan = seq.plan({ bank, presentedItemIds: run.order, results: run.results });

  it('presents every STANDING item before any LEARNING-RATE item', () => {
    const phases = plan.presented.map((p) => p.phase);
    const firstEffort = phases.indexOf('learning-rate');
    expect(firstEffort).toBeGreaterThan(0);
    expect(phases.slice(0, firstEffort).every((p) => p === 'standing')).toBe(true);
    expect(phases.slice(firstEffort).every((p) => p === 'learning-rate')).toBe(true);
  });

  it('ends in the complete phase and stops with null', () => {
    expect(plan.currentPhase).toBe('complete');
    expect(seq.next({ bank, presentedItemIds: run.order, results: run.results })).toBeNull();
  });

  it('runs exactly one effort task per domain in Phase 2 (phase2PerDomain default 1)', () => {
    const effort = plan.presented.filter((p) => p.phase === 'learning-rate');
    expect(effort).toHaveLength(4);
    expect(new Set(effort.map((e) => e.domain)).size).toBe(4);
  });
});

describe('TwoStageSequencer — bracketing standing estimate (Insight 2, close in from both sides)', () => {
  const seq = new TwoStageSequencer();
  const run = driveSession(bank, seq, childWithCeilings(CEILINGS));
  const plan = seq.plan({ bank, presentedItemIds: run.order, results: run.results });
  const byDomain = new Map(plan.standings.map((s) => [s.domain, s]));

  it('localises each domain ceiling by bracketing (not ramp-to-failure)', () => {
    expect(byDomain.get('fluid_reasoning')?.estimate).toBe(9.5);
    expect(byDomain.get('verbal')?.estimate).toBe(6.5);
    expect(byDomain.get('quantitative')?.estimate).toBe(12.5);
    expect(byDomain.get('spatial')?.estimate).toBe(3.5);
  });

  it('records the correct floor/ceiling bounds per domain', () => {
    expect(byDomain.get('fluid_reasoning')).toMatchObject({ floorCorrect: 8, ceilingIncorrect: 11 });
    expect(byDomain.get('spatial')).toMatchObject({ floorCorrect: 2, ceilingIncorrect: 5 });
  });

  it('never presents two-sided-bracket domains more than needed (precision stop, under the cap)', () => {
    // fluid/verbal localise in 2 probes; quant/spatial in 3 — all < cap (4).
    expect(byDomain.get('fluid_reasoning')?.presented).toBe(2);
    expect(byDomain.get('verbal')?.presented).toBe(2);
    expect(byDomain.get('quantitative')?.presented).toBe(3);
    expect(byDomain.get('spatial')?.presented).toBe(3);
    for (const s of plan.standings) expect(s.stopReason).toBe('bracketed');
  });
});

describe('TwoStageSequencer — ability-targeted effort routing (Insight 3, desirable difficulty)', () => {
  const seq = new TwoStageSequencer();
  const run = driveSession(bank, seq, childWithCeilings(CEILINGS));
  const plan = seq.plan({ bank, presentedItemIds: run.order, results: run.results });
  const placementByDomain = new Map(plan.placements.map((p) => [p.domain, p]));

  it('places each Phase-2 effort task at the rung nearest the Phase-1 estimate', () => {
    // estimate 9.5 → nearest of {4,8,12} = 8; 6.5 → 8; 12.5 → 12; 3.5 → 4.
    expect(placementByDomain.get('fluid_reasoning')?.chosenRung).toBe(8);
    expect(placementByDomain.get('verbal')?.chosenRung).toBe(8);
    expect(placementByDomain.get('quantitative')?.chosenRung).toBe(12);
    expect(placementByDomain.get('spatial')?.chosenRung).toBe(4);
  });

  it('carries the targeted estimate on each placement (legible calibration)', () => {
    expect(placementByDomain.get('quantitative')?.estimate).toBe(12.5);
    expect(placementByDomain.get('spatial')?.estimate).toBe(3.5);
  });

  it('only ever presents effort items whose renderKind is embedded-demo', () => {
    const effort = plan.presented.filter((p) => p.phase === 'learning-rate');
    for (const e of effort) {
      const item = bank.find((b) => b.itemId === e.itemId)!;
      expect(item.renderKind).toBe('embedded-demo');
    }
  });
});

describe('TwoStageSequencer — stop rules', () => {
  it('stops each Phase-1 domain at the item cap when the bracket cannot localise first', () => {
    const seq = new TwoStageSequencer({ phase1CapPerDomain: 2 });
    const run = driveSession(bank, seq, alwaysCorrect);
    const plan = seq.plan({ bank, presentedItemIds: run.order, results: run.results });
    for (const s of plan.standings) {
      expect(s.presented).toBe(2);
      expect(s.stopReason).toBe('cap');
    }
    // An always-correct child pushes the floor up; after 2 probes the floor is rung 11.
    expect(plan.standings.every((s) => s.floorCorrect === 11)).toBe(true);
  });

  it('honours a larger Phase-2 cap per domain', () => {
    const seq = new TwoStageSequencer({ phase2PerDomain: 2 });
    const run = driveSession(bank, seq, childWithCeilings(CEILINGS));
    const plan = seq.plan({ bank, presentedItemIds: run.order, results: run.results });
    const effort = plan.presented.filter((p) => p.phase === 'learning-rate');
    expect(effort).toHaveLength(8); // 2 per domain × 4 domains
  });

  it('never exceeds the Phase-1 cap for any child', () => {
    const seq = new TwoStageSequencer();
    const run = driveSession(bank, seq, alwaysCorrect);
    const plan = seq.plan({ bank, presentedItemIds: run.order, results: run.results });
    for (const s of plan.standings) expect(s.presented).toBeLessThanOrEqual(4);
  });
});

describe('TwoStageSequencer — planFromResults matches plan() (UI reconstruction)', () => {
  it('reconstructs the same standings + placements from results alone', () => {
    const seq = new TwoStageSequencer();
    const run = driveSession(bank, seq, childWithCeilings(CEILINGS));
    const fromCtx = seq.plan({ bank, presentedItemIds: run.order, results: run.results });
    const fromResults = planFromResults(bank, run.results);
    expect(fromResults.standings).toEqual(fromCtx.standings);
    expect(fromResults.placements).toEqual(fromCtx.placements);
    expect(fromResults.currentPhase).toBe('complete');
  });
});
