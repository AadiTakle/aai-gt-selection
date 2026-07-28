import { describe, expect, it } from 'vitest';

import { isRapidGuess } from '../rte';
import { learningRate } from '../scoring';
import { estimateThetaEap } from '../theta';

import { samplePersona, type Persona } from './latent';
import { createPersonaRun, personaSampler, type SimBankItem } from './sampler';

/**
 * A minimal stand-in bank. The shapes here are the same STRUCTURAL shapes the web
 * session shell hands the player; the shell itself is exercised by the runner
 * script, which is outside this package's dependency boundary.
 */
function selectItem(id: string, domain: string, dial: number, stage?: string): SimBankItem {
  return {
    itemId: id,
    typeCode: `T-${id}`,
    domain,
    difficultyLevel: dial,
    renderKind: 'single-select',
    ...(stage !== undefined ? { stage } : {}),
    answer: { correctIndex: 1 },
    content: {
      options: [
        { label: 'a', lure: 'local_fit' },
        { label: 'b', lure: 'correct' },
        { label: 'c', lure: 'global_mismatch' },
        { label: 'd', lure: 'associate' },
      ],
    },
  };
}

function demoItem(id: string, domain: string, dial: number, stage?: string): SimBankItem {
  return {
    itemId: id,
    typeCode: `T-${id}`,
    domain,
    difficultyLevel: dial,
    renderKind: 'embedded-demo',
    ...(stage !== undefined ? { stage } : {}),
  };
}

const served = (item: SimBankItem) => ({
  itemId: item.itemId,
  typeCode: item.typeCode,
  domain: item.domain,
  difficultyLevel: item.difficultyLevel,
  renderKind: item.renderKind,
});

function runOver(persona: Persona, items: readonly SimBankItem[], seed: string) {
  const run = createPersonaRun(persona, seed);
  for (const item of items) run.respond(served(item), item);
  return run;
}

function withTraits(base: Persona, overrides: Partial<Persona>): Persona {
  return { ...base, ...overrides };
}

const basePersona = samplePersona({ seed: 'sampler-tests', index: 0 });

const standingItems = Array.from({ length: 40 }, (_, i) =>
  selectItem(`I-${i}`, 'fluid_reasoning', 3 + (i % 15), 'standing'),
);

describe('createPersonaRun', () => {
  it('logs one trial per presented item, in order', () => {
    const run = runOver(basePersona, standingItems.slice(0, 6), 'order-check');
    expect(run.trials.map((t) => t.order)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(run.trials.map((t) => t.itemId)).toEqual(standingItems.slice(0, 6).map((i) => i.itemId));
  });

  it('emits a selection index that agrees with the drawn correctness', () => {
    const run = runOver(basePersona, standingItems, 'selection-check');
    const outcomes = standingItems.map((item, i) => ({ trial: run.trials[i]! }));
    expect(outcomes.length).toBe(standingItems.length);
    const rerun = createPersonaRun(basePersona, 'selection-check');
    standingItems.forEach((item) => {
      const outcome = rerun.respond(served(item), item);
      const trial = rerun.trials[rerun.trials.length - 1]!;
      const selected = outcome.response?.selectedIndex;
      expect(selected).not.toBeUndefined();
      expect(selected === item.answer!.correctIndex).toBe(trial.correct);
    });
  });

  it('emits no raw response for a self-scoring demo item but still reports M-ACC', () => {
    const item = demoItem('D-1', 'verbal', 8, 'standing');
    const run = createPersonaRun(basePersona, 'demo-check');
    const outcome = run.respond(served(item), item);
    expect(outcome.response).toBeNull();
    expect(String(outcome.telemetry['M-ACC'])).toMatch(/^[01]\/1/);
    expect(outcome.responseTimeMs).toBeGreaterThan(0);
  });

  it('draws responses at the 3PL rate for the persona true theta', () => {
    const persona = withTraits(basePersona, {
      theta: { fluid_reasoning: 1.5, verbal: 0, quantitative: 0, spatial: 0 },
      engagement: 1,
    });
    const easy = Array.from({ length: 400 }, (_, i) =>
      selectItem(`E-${i}`, 'fluid_reasoning', 4, 'standing'),
    );
    const hard = Array.from({ length: 400 }, (_, i) =>
      selectItem(`H-${i}`, 'fluid_reasoning', 18, 'standing'),
    );
    const easyRun = runOver(persona, easy, 'rate-easy');
    const hardRun = runOver(persona, hard, 'rate-hard');
    const rate = (trials: readonly { correct: boolean }[]) =>
      trials.filter((t) => t.correct).length / trials.length;
    expect(rate(easyRun.trials)).toBeGreaterThan(0.85);
    expect(rate(hardRun.trials)).toBeLessThan(0.45);
  });

  it('recovers a high-ability persona theta from the trial log via EAP', () => {
    const persona = withTraits(basePersona, {
      theta: { fluid_reasoning: 1.2, verbal: 0, quantitative: 0, spatial: 0 },
      engagement: 1,
    });
    const run = runOver(persona, standingItems, 'recovery-check');
    const estimate = estimateThetaEap(run.trials.map((t) => ({ irt: t.irt, correct: t.correct })));
    expect(estimate.theta).toBeGreaterThan(0.4);
    expect(estimate.theta).toBeLessThan(2.0);
  });
});

describe('the engagement gate', () => {
  it('never goes off-task when the gate is disabled', () => {
    const run = createPersonaRun(withTraits(basePersona, { engagement: 0.3 }), 'gate-off', {
      disableEngagementGate: true,
    });
    for (const item of standingItems) run.respond(served(item), item);
    expect(run.trials.every((t) => t.onTask)).toBe(true);
    expect(run.trials.every((t) => !t.rapidGuess)).toBe(true);
  });

  it('produces off-task trials at the persona on-task rate (drift disabled)', () => {
    const persona = withTraits(basePersona, { engagement: 0.6 });
    const items = Array.from({ length: 3000 }, (_, i) =>
      selectItem(`G-${i}`, 'fluid_reasoning', 10, 'standing'),
    );
    const run = createPersonaRun(persona, 'gate-rate', { engagement: { driftPerOffTask: 0 } });
    for (const item of items) run.respond(served(item), item);
    const offTask = run.trials.filter((t) => !t.onTask).length / run.trials.length;
    expect(offTask).toBeCloseTo(0.4, 1);
  });

  it('emits rapid guesses at the persona propensity, below any solution-behaviour floor', () => {
    const persona = withTraits(basePersona, { engagement: 0, rapidGuessPropensity: 0.8 });
    const items = Array.from({ length: 2000 }, (_, i) =>
      selectItem(`R-${i}`, 'fluid_reasoning', 10, 'standing'),
    );
    const run = createPersonaRun(persona, 'gate-rapid');
    for (const item of items) run.respond(served(item), item);
    expect(run.trials.every((t) => !t.onTask)).toBe(true);
    const rapid = run.trials.filter((t) => t.rapidGuess);
    expect(rapid.length / run.trials.length).toBeCloseTo(0.8, 1);
    // The production RTE filter must catch every generator-flagged rapid guess.
    expect(rapid.every((t) => isRapidGuess(t.rtMs, 1500))).toBe(true);
    const slow = run.trials.filter((t) => !t.rapidGuess);
    expect(slow.every((t) => !isRapidGuess(t.rtMs, 1500))).toBe(true);
  });

  it('scores disengaged trials at the guessing floor, not at the persona ability', () => {
    const persona = withTraits(basePersona, {
      theta: { fluid_reasoning: 2.2, verbal: 0, quantitative: 0, spatial: 0 },
      engagement: 0,
    });
    const items = Array.from({ length: 1500 }, (_, i) =>
      selectItem(`Z-${i}`, 'fluid_reasoning', 4, 'standing'),
    );
    const run = createPersonaRun(persona, 'gate-floor');
    for (const item of items) run.respond(served(item), item);
    const accuracy = run.trials.filter((t) => t.correct).length / run.trials.length;
    expect(accuracy).toBeCloseTo(0.25, 1);
  });

  it('drifts the on-task probability down as off-task trials accumulate', () => {
    const persona = withTraits(basePersona, { engagement: 0.5 });
    const items = Array.from({ length: 30 }, (_, i) =>
      selectItem(`D-${i}`, 'fluid_reasoning', 10, 'standing'),
    );
    const run = createPersonaRun(persona, 'gate-drift');
    for (const item of items) run.respond(served(item), item);
    const first = run.trials[0]!.engagementProbability;
    const last = run.trials[run.trials.length - 1]!.engagementProbability;
    expect(last).toBeLessThan(first);
  });
});

describe('within-block learning (M-LEARNRATE)', () => {
  it('climbs effective theta only inside the novel block', () => {
    const persona = withTraits(basePersona, { learningRate: 0.1, engagement: 1 });
    const items = [
      selectItem('S-1', 'verbal', 10, 'standing'),
      selectItem('S-2', 'verbal', 10, 'standing'),
      selectItem('E-1', 'verbal', 10, 'effort'),
      selectItem('E-2', 'verbal', 10, 'effort'),
      selectItem('E-3', 'verbal', 10, 'effort'),
    ];
    const run = runOver(persona, items, 'novel-block');
    expect(run.trials[0]!.novelBlockIndex).toBeNull();
    expect(run.trials[0]!.thetaEffective).toBeCloseTo(run.trials[0]!.thetaTrue, 12);
    expect(run.trials[2]!.novelBlockIndex).toBe(0);
    expect(run.trials[4]!.novelBlockIndex).toBe(2);
    expect(run.trials[4]!.thetaEffective).toBeCloseTo(run.trials[4]!.thetaTrue + 0.2, 12);
  });

  it('yields a positive OLS score slope over a long novel block for a fast learner', () => {
    const persona = withTraits(basePersona, {
      theta: { fluid_reasoning: -0.5, verbal: -0.5, quantitative: -0.5, spatial: -0.5 },
      learningRate: 0.25,
      engagement: 1,
    });
    const items = Array.from({ length: 24 }, (_, i) =>
      selectItem(`N-${i}`, 'fluid_reasoning', 10, 'effort'),
    );
    const run = runOver(persona, items, 'learning-slope');
    const slope = learningRate(
      run.trials.map((t) => t.order),
      run.trials.map((t) => (t.correct ? 1 : 0)),
    );
    expect(slope).not.toBeNull();
    expect(slope!).toBeGreaterThan(0);
  });
});

describe('strict determinism', () => {
  const items = [
    ...standingItems.slice(0, 12),
    demoItem('DD-1', 'spatial', 6, 'standing'),
    selectItem('EE-1', 'spatial', 12, 'effort'),
  ];

  it('produces bit-identical trials and outcomes for the same seed', () => {
    const a = createPersonaRun(basePersona, 'determinism');
    const b = createPersonaRun(basePersona, 'determinism');
    const outcomesA = items.map((item) => a.respond(served(item), item));
    const outcomesB = items.map((item) => b.respond(served(item), item));
    expect(JSON.stringify(outcomesA)).toBe(JSON.stringify(outcomesB));
    expect(JSON.stringify(a.trials)).toBe(JSON.stringify(b.trials));
  });

  it('produces different output for a different seed', () => {
    const a = createPersonaRun(basePersona, 'determinism');
    const b = createPersonaRun(basePersona, 'determinism-2');
    const outcomesA = items.map((item) => a.respond(served(item), item));
    const outcomesB = items.map((item) => b.respond(served(item), item));
    expect(JSON.stringify(outcomesA)).not.toBe(JSON.stringify(outcomesB));
  });

  it('produces different output for a different persona under the same seed', () => {
    const other = samplePersona({ seed: 'sampler-tests', index: 1 });
    const a = createPersonaRun(basePersona, 'determinism');
    const b = createPersonaRun(other, 'determinism');
    const outcomesA = items.map((item) => a.respond(served(item), item));
    const outcomesB = items.map((item) => b.respond(served(item), item));
    expect(JSON.stringify(outcomesA)).not.toBe(JSON.stringify(outcomesB));
  });

  it('personaSampler returns the same first outcome as createPersonaRun', () => {
    const respond = personaSampler(basePersona, 'determinism');
    const run = createPersonaRun(basePersona, 'determinism');
    const first = items[0]!;
    expect(JSON.stringify(respond(served(first), first))).toBe(
      JSON.stringify(run.respond(served(first), first)),
    );
  });
});
