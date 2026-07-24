import { describe, expect, it } from 'vitest';

import type { ExamItem, ExamPolicy, ItemResponse } from '@gt-selection/contracts';

import { probabilityCorrect } from './irt';
import {
  buildOutcome,
  chooseNextItem,
  isComplete,
  type AdministeredItem,
  type EngineState,
} from './session';

const DOMAINS = ['fluid_reasoning', 'verbal', 'quantitative', 'spatial'] as const;

function buildBank(): ExamItem[] {
  const items: ExamItem[] = [];
  for (const domain of DOMAINS) {
    for (let level = 1; level <= 8; level++) {
      items.push({
        itemId: `${domain}-${level}`,
        typeCode: 'FLU-MATRIX-01',
        domain,
        difficultyLevel: level,
        ageBands: ['4-5'],
        irt: { a: 1.2, b: (level - 4) * 0.6, c: 0, model: '2PL' },
        demoPath: 'demos/x.html',
        params: {},
        syntheticOnly: true,
      });
    }
  }
  return items;
}

const policy: ExamPolicy = {
  policyVersion: 'test-v1',
  domains: [...DOMAINS],
  minItemsPerDomain: 3,
  maxItemsPerDomain: 6,
  targetSe: 0.4,
  priorMean: 0,
  priorSd: 1,
  exposureTopK: 1,
  fitWeights: { fluid_reasoning: 1, verbal: 1, quantitative: 1, spatial: 1 },
  admitCut: 0.7,
  retryCut: -0.7,
  learningRateWeight: 0,
  consistencyWeight: 0,
  syntheticOnly: true,
  validated: false,
};

function respond(item: ExamItem, trueTheta: number, order: number): AdministeredItem {
  const correct = probabilityCorrect(trueTheta, item.irt) >= 0.5;
  const response: ItemResponse = {
    itemId: item.itemId,
    correct,
    score: correct ? 1 : 0,
    rtMs: 3000,
    firstActionMs: 500,
    revisions: 0,
    engaged: true,
    measurements: { 'M-ACC': correct ? 1 : 0 },
    syntheticOnly: true,
  };
  return { item, response, order };
}

function simulate(trueTheta: number): EngineState {
  const bank = buildBank();
  let state: EngineState = { sessionId: 'sess-1', ageBand: '4-5', policy, administered: [] };
  let order = 1;
  while (!isComplete(state, bank) && order <= 200) {
    const next = chooseNextItem(state, bank);
    if (!next) break;
    state = { ...state, administered: [...state.administered, respond(next, trueTheta, order)] };
    order += 1;
  }
  return state;
}

describe('adaptive session', () => {
  it('serves items across all four domains and terminates', () => {
    const state = simulate(1);
    expect(isComplete(state, buildBank())).toBe(true);
    expect(new Set(state.administered.map((a) => a.item.domain)).size).toBe(4);
    for (const domain of DOMAINS) {
      expect(state.administered.filter((a) => a.item.domain === domain).length).toBeGreaterThanOrEqual(
        3,
      );
    }
  });

  it('never repeats an item', () => {
    const ids = simulate(0.5).administered.map((a) => a.item.itemId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('admits a strong responder with high estimated ability', () => {
    const outcome = buildOutcome(simulate(2));
    expect(outcome.compositeTheta).toBeGreaterThan(0.7);
    expect(outcome.decision).toBe('admit');
    expect(outcome.validated).toBe(false);
  });

  it('does not admit a weak responder', () => {
    const outcome = buildOutcome(simulate(-2));
    expect(outcome.compositeTheta).toBeLessThan(0);
    expect(outcome.decision).not.toBe('admit');
  });

  it('marks a disengaged session provisional (retry)', () => {
    const strong = simulate(2);
    const disengaged: EngineState = {
      ...strong,
      administered: strong.administered.map((a) => ({
        ...a,
        response: { ...a.response, engaged: false },
      })),
    };
    const outcome = buildOutcome(disengaged);
    expect(outcome.engagementValid).toBe(false);
    expect(outcome.decision).toBe('retry');
  });
});
