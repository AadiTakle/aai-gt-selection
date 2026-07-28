import { describe, expect, it } from 'vitest';

import { estimateDemoTheta } from './cat-scoring';
import type { BankItem, ExamDomain } from './item';
import { syntheticTwoStageBank } from './sample-items-two-stage';
import { driveSession, type PlayerOutcome } from './session';
import { planFromResults, TwoStageSequencer } from './two-stage-sequencer';

/**
 * Proves the cat-engine seam is actually wired for a demo run AND that wiring it
 * changed nothing the demo already reported. The second half is the important
 * one: the sequencer's order/standings and the shell's `summarize()` numbers are
 * pinned to hand-derived values here, so any drift fails this test.
 */

const bank = syntheticTwoStageBank();

/** Same synthetic child as `two-stage-sequencer.test.ts`: correct iff rung <= ceiling. */
function childWithCeilings(
  ceilings: Partial<Record<ExamDomain, number>>,
  responseTimeMs = 800,
) {
  return (_served: unknown, item: BankItem): PlayerOutcome => {
    if (item.stage === 'standing') {
      const correct = item.difficultyLevel <= (ceilings[item.domain] ?? 0);
      return {
        response: null,
        telemetry: { 'M-ACC': correct ? '1/1  100%' : '0/1  0%' },
        responseTimeMs,
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

const CEILINGS: Partial<Record<ExamDomain, number>> = {
  fluid_reasoning: 10,
  verbal: 6,
  quantitative: 14,
  spatial: 3,
};

function representativeRun(responseTimeMs?: number) {
  const sequencer = new TwoStageSequencer();
  return driveSession(bank, sequencer, childWithCeilings(CEILINGS, responseTimeMs));
}

describe('cat-scoring: engine theta for a representative demo run', () => {
  const run = representativeRun();
  const engine = estimateDemoTheta(bank, run.results);

  it('computes a non-null EAP theta + SE from the engine', () => {
    expect(engine.eap.theta).not.toBeNull();
    expect(Number.isFinite(engine.eap.theta!)).toBe(true);
    expect(engine.eap.se).toBeGreaterThan(0);
  });

  it('also computes the engine MLE as a cross-check', () => {
    expect(engine.mle.theta).not.toBeNull();
    expect(Number.isFinite(engine.mle.theta!)).toBe(true);
  });

  it('computes a non-null theta for every standing domain', () => {
    expect(engine.perDomain.map((d) => d.domain)).toEqual([
      'fluid_reasoning',
      'verbal',
      'quantitative',
      'spatial',
    ]);
    for (const d of engine.perDomain) {
      expect(d.theta).not.toBeNull();
      expect(d.se).toBeGreaterThan(0);
      expect(d.itemsEffortValid).toBeGreaterThan(0);
    }
  });

  it('scores only the Phase-1 standing responses (effort tasks are not keyed)', () => {
    // 3 fluid + 2 verbal + 3 quantitative + 2 spatial standing probes; 4 effort tasks excluded.
    expect(engine.itemsScored).toBe(10);
    expect(engine.itemsEffortValid).toBe(10);
    expect(run.results).toHaveLength(14);
  });

  it('orders domain theta the same way the child ceilings were set', () => {
    const theta = new Map(engine.perDomain.map((d) => [d.domain, d.theta!]));
    // ceilings: quantitative 14 > fluid_reasoning 10 > verbal 6 > spatial 3.
    expect(theta.get('quantitative')!).toBeGreaterThan(theta.get('fluid_reasoning')!);
    expect(theta.get('fluid_reasoning')!).toBeGreaterThan(theta.get('verbal')!);
    expect(theta.get('verbal')!).toBeGreaterThan(theta.get('spatial')!);
  });

  it('stamps the provisional / born-synthetic claim boundary', () => {
    expect(engine.provisionalIrt).toBe(true);
    expect(engine.syntheticOnly).toBe(true);
    expect(engine.validated).toBe(false);
  });
});

describe('cat-scoring: effort gate and unscorable results', () => {
  it('drops responses below the rapid-guess floor instead of scoring them', () => {
    const run = representativeRun(50);
    const engine = estimateDemoTheta(bank, run.results);
    expect(engine.itemsScored).toBe(10);
    expect(engine.itemsEffortValid).toBe(0);
    expect(engine.eap.theta).toBeNull();
    expect(engine.eap.se).toBeNull();
  });

  it('returns a null estimate for an empty run', () => {
    const engine = estimateDemoTheta(bank, []);
    expect(engine.itemsScored).toBe(0);
    expect(engine.eap.theta).toBeNull();
    expect(engine.mle.theta).toBeNull();
    expect(engine.perDomain.every((d) => d.theta === null)).toBe(true);
  });
});

describe('cat-scoring is ADDITIVE: pre-existing demo values are unchanged', () => {
  const run = representativeRun();
  const orderBefore = [...run.order];
  const resultsBefore = structuredClone(run.results);
  const summaryBefore = structuredClone(run.summary);
  const planBefore = structuredClone(planFromResults(bank, run.results));

  const engine = estimateDemoTheta(bank, run.results);

  it('does not mutate the run (order, results, summary, plan)', () => {
    expect(engine.eap.theta).not.toBeNull(); // the engine really ran
    expect(run.order).toEqual(orderBefore);
    expect(run.results).toEqual(resultsBefore);
    expect(run.summary).toEqual(summaryBefore);
    expect(planFromResults(bank, run.results)).toEqual(planBefore);
  });

  it('reports the same summary numbers as before the engine was wired in', () => {
    // Hand-derived: 10 standing accuracies (1,1,0 / 1,0 / 1,1,1 / 0,1) + 4 effort
    // tasks at 0.5 each => 9/14; effort tasks report M-DIFFREACH L7.
    expect(run.summary.itemsAnswered).toBe(14);
    expect(run.summary.itemsSkipped).toBe(0);
    expect(run.summary.overallAccuracy).toBeCloseTo(9 / 14, 10);
    expect(run.summary.meanDifficultyReached).toBe(7);
    expect(run.summary.perDomainAccuracy).toEqual({
      fluid_reasoning: (1 + 1 + 0 + 0.5) / 4,
      verbal: (1 + 0 + 0.5) / 3,
      quantitative: (1 + 1 + 1 + 0.5) / 4,
      spatial: (0 + 1 + 0.5) / 3,
    });
  });

  it('reports the same bracketed standing estimates and order as before', () => {
    const standings = new Map(planBefore.standings.map((s) => [s.domain, s]));
    expect(standings.get('fluid_reasoning')?.estimate).toBe(12);
    expect(standings.get('verbal')?.estimate).toBe(8);
    expect(standings.get('quantitative')?.estimate).toBe(14);
    expect(standings.get('spatial')?.estimate).toBe(4);
    expect(orderBefore).toEqual([
      'SYN-2S-FLU-ANALOGY-01',
      'SYN-2S-VER-RELPAIR-01',
      'SYN-2S-QUANT-NUMLINE-01',
      'SYN-2S-SPA-FOLDNET-01',
      'SYN-2S-FLU-ODDPAIR-01',
      'SYN-2S-VER-POLYSEME-01',
      'SYN-2S-QUANT-SERIES-01',
      'SYN-2S-SPA-ROLL-01',
      'SYN-2S-FLU-VENN-01',
      'SYN-2S-QUANT-FUNC-01',
      'SYN-2S-CX-diverge-01',
      'SYN-2S-GB-WORDFORGE-01',
      'SYN-2S-QUANT-GRAPH-01',
      'SYN-2S-GB-SHAPEFIT-01',
    ]);
  });
});
