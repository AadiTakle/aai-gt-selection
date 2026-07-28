import { describe, expect, it } from 'vitest';

import type { BankItem, ExamDomain } from './item';
import { syntheticTwoStageBank } from './sample-items-two-stage';
import { driveSession, type PlayerOutcome } from './session';
import type { Sequencer } from './sequencer';
import { planFromResults, TwoStageSequencer } from './two-stage-sequencer';

const bank = syntheticTwoStageBank();

/**
 * A synthetic "player + child" for the pure shell loop. Every two-stage item now
 * renders as a self-scoring embedded-demo, so we branch on the STAGE TAG, not
 * `renderKind`. STANDING items report a keyed-style M-ACC (100% iff the item's rung
 * is at/below the domain ceiling), so the bracket must localise each ceiling.
 * EFFORT items report self-scored process telemetry that is never a routing signal.
 */
function childWithCeilings(ceilings: Partial<Record<ExamDomain, number>>) {
  return (_served: unknown, item: BankItem): PlayerOutcome => {
    if (item.stage === 'standing') {
      const ceiling = ceilings[item.domain] ?? 0;
      const correct = item.difficultyLevel <= ceiling;
      return {
        response: null,
        telemetry: { 'M-ACC': correct ? '1/1  100%' : '0/1  0%' },
        responseTimeMs: 800,
        skipped: false,
      };
    }
    return {
      response: null,
      telemetry: { 'M-ACC': '3/6  50%', 'M-DIFFREACH': 'L7 · 2 rules', 'M-LEARNRATE': '+2 rungs' },
      responseTimeMs: 4200,
      skipped: false,
    };
  };
}

function alwaysCorrect(_served: unknown, item: BankItem): PlayerOutcome {
  if (item.stage === 'standing') {
    return { response: null, telemetry: { 'M-ACC': '1/1  100%' }, responseTimeMs: 700, skipped: false };
  }
  return { response: null, telemetry: { 'M-ACC': '6/6 100%' }, responseTimeMs: 3000, skipped: false };
}

// Standing rungs per domain are 2/6/10/14. Child is correct iff rung <= ceiling.
const CEILINGS: Partial<Record<ExamDomain, number>> = {
  fluid_reasoning: 10, // correct 2,6,10 → floor 10, ceiling 14 → estimate 12
  verbal: 6, // correct 2,6 → floor 6, ceiling 10 → estimate 8
  quantitative: 14, // correct 2,6,10,14 → floor 14, no ceiling → estimate 14
  spatial: 3, // correct 2 → floor 2, ceiling 6 → estimate 4
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
    // First probe is a STANDING-tagged item at a moderate rung, never an effort item.
    expect(a?.stage).toBe('standing');
    expect(a?.renderKind).toBe('embedded-demo');
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
    expect(byDomain.get('fluid_reasoning')?.estimate).toBe(12);
    expect(byDomain.get('verbal')?.estimate).toBe(8);
    expect(byDomain.get('quantitative')?.estimate).toBe(14);
    expect(byDomain.get('spatial')?.estimate).toBe(4);
  });

  it('records the correct floor/ceiling bounds per domain', () => {
    expect(byDomain.get('fluid_reasoning')).toMatchObject({ floorCorrect: 10, ceilingIncorrect: 14 });
    expect(byDomain.get('spatial')).toMatchObject({ floorCorrect: 2, ceilingIncorrect: 6 });
  });

  it('never presents two-sided-bracket domains more than needed (precision stop, under the cap)', () => {
    // verbal/spatial localise in 2 probes; fluid/quant in 3 — all < cap (4).
    expect(byDomain.get('fluid_reasoning')?.presented).toBe(3);
    expect(byDomain.get('verbal')?.presented).toBe(2);
    expect(byDomain.get('quantitative')?.presented).toBe(3);
    expect(byDomain.get('spatial')?.presented).toBe(2);
    for (const s of plan.standings) expect(s.stopReason).toBe('bracketed');
  });
});

describe('TwoStageSequencer — ability-targeted effort routing (Insight 3, desirable difficulty)', () => {
  const seq = new TwoStageSequencer();
  const run = driveSession(bank, seq, childWithCeilings(CEILINGS));
  const plan = seq.plan({ bank, presentedItemIds: run.order, results: run.results });
  const placementByDomain = new Map(plan.placements.map((p) => [p.domain, p]));

  it('places each Phase-2 effort task at the rung nearest the Phase-1 estimate', () => {
    // estimate 12 → nearest of {4,8,12} = 12; 8 → 8; 14 → 12; 4 → 4.
    expect(placementByDomain.get('fluid_reasoning')?.chosenRung).toBe(12);
    expect(placementByDomain.get('verbal')?.chosenRung).toBe(8);
    expect(placementByDomain.get('quantitative')?.chosenRung).toBe(12);
    expect(placementByDomain.get('spatial')?.chosenRung).toBe(4);
  });

  it('carries the targeted estimate on each placement (legible calibration)', () => {
    expect(placementByDomain.get('quantitative')?.estimate).toBe(14);
    expect(placementByDomain.get('spatial')?.estimate).toBe(4);
  });

  it('only ever presents effort items tagged stage:"effort"', () => {
    const effort = plan.presented.filter((p) => p.phase === 'learning-rate');
    for (const e of effort) {
      const item = bank.find((b) => b.itemId === e.itemId)!;
      expect(item.stage).toBe('effort');
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
    // An always-correct child pushes the floor up; after 2 probes (6→10) the floor is rung 10.
    expect(plan.standings.every((s) => s.floorCorrect === 10)).toBe(true);
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
