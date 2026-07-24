import type {
  AgeBand,
  DomainAbility,
  DomainScore,
  ExamDomain,
  ExamItem,
  ExamPolicy,
  ItemResponse,
  ScreeningOutcome,
  ServedItem,
} from '@gt-selection/contracts';

import { selectByMaxInformation } from './select';
import {
  computeFitIndex,
  consistencyFromRts,
  decisionFromFit,
  learningRate,
  thetaToPercentile,
} from './scoring';
import { estimateThetaEap, type ScoredResponse } from './theta';

/**
 * Adaptive session orchestrator (AX-02). Pure functions over the item bank,
 * policy, and administered responses: the Supabase RPC layer persists state and
 * calls these to (a) pick the next item by information and (b) score the outcome.
 */

const CLAIM_BOUNDARY =
  'Synthetic screening result (validated=false). A reliable screen indicates likely giftedness and ' +
  'Timeback-fit; it is not an admission decision and is not evidence of program impact (R10).';

/** One administered item with its scored response (server-side; includes IRT). */
export interface AdministeredItem {
  item: ExamItem;
  response: ItemResponse;
  /** 1-based administration order across the whole session. */
  order: number;
}

export interface EngineState {
  sessionId: string;
  ageBand: AgeBand;
  policy: ExamPolicy;
  administered: readonly AdministeredItem[];
}

function domainResponses(state: EngineState, domain: ExamDomain): AdministeredItem[] {
  return state.administered
    .filter((a) => a.item.domain === domain)
    .sort((l, r) => l.order - r.order);
}

function domainDone(count: number, se: number, policy: ExamPolicy): boolean {
  if (count < policy.minItemsPerDomain) return false;
  return se <= policy.targetSe || count >= policy.maxItemsPerDomain;
}

function candidateItems(
  state: EngineState,
  bank: readonly ExamItem[],
  domain: ExamDomain,
): ExamItem[] {
  const used = new Set(state.administered.map((a) => a.item.itemId));
  return bank.filter(
    (item) =>
      item.domain === domain && !used.has(item.itemId) && item.ageBands.includes(state.ageBand),
  );
}

/** Per-domain ability (EAP theta/SE) recomputed from all administered responses. */
export function computeAbilities(state: EngineState): DomainAbility[] {
  return state.policy.domains.map((domain) => {
    const admin = domainResponses(state, domain);
    const scored: ScoredResponse[] = admin.map((a) => ({
      irt: a.item.irt,
      correct: a.response.correct,
    }));
    const { theta, se } = estimateThetaEap(scored, {
      priorMean: state.policy.priorMean,
      priorSd: state.policy.priorSd,
    });
    return {
      domain,
      theta,
      se,
      itemsAdministered: admin.length,
      done: domainDone(admin.length, se, state.policy),
    };
  });
}

/**
 * Choose the next item: pick the not-done domain with the fewest administered
 * items (ties broken by higher SE, then policy order) that still has candidates,
 * then select within it by maximum information with exposure control.
 */
export function chooseNextItem(state: EngineState, bank: readonly ExamItem[]): ExamItem | null {
  const abilities = computeAbilities(state);
  const pending = abilities
    .filter((ab) => !ab.done && candidateItems(state, bank, ab.domain).length > 0)
    .sort(
      (l, r) =>
        l.itemsAdministered - r.itemsAdministered ||
        r.se - l.se ||
        state.policy.domains.indexOf(l.domain) - state.policy.domains.indexOf(r.domain),
    );
  const target = pending[0];
  if (!target) return null;
  return selectByMaxInformation(target.theta, candidateItems(state, bank, target.domain), {
    topK: state.policy.exposureTopK,
    seed: `${state.sessionId}:${target.domain}:${state.administered.length}`,
  });
}

/** True when no further item can/should be administered. */
export function isComplete(state: EngineState, bank: readonly ExamItem[]): boolean {
  return chooseNextItem(state, bank) === null;
}

/** Client-safe projection of a chosen item (drops IRT parameters). */
export function toServedItem(item: ExamItem): ServedItem {
  return {
    itemId: item.itemId,
    typeCode: item.typeCode,
    domain: item.domain,
    difficultyLevel: item.difficultyLevel,
    demoPath: item.demoPath,
    params: item.params,
  };
}

/** Final per-domain scores, Timeback-fit composite, and the tunable decision. */
export function buildOutcome(state: EngineState): ScreeningOutcome {
  const abilities = computeAbilities(state);
  const domainScores: DomainScore[] = abilities.map((ab) => {
    const admin = domainResponses(state, ab.domain);
    const orders = admin.map((a) => a.order);
    const scores = admin.map((a) => a.response.score);
    const rts = admin.map((a) => a.response.rtMs);
    const correctDifficulties = admin
      .filter((a) => a.response.correct)
      .map((a) => a.item.difficultyLevel);
    return {
      domain: ab.domain,
      theta: ab.theta,
      se: ab.se,
      percentile: admin.length > 0 ? thetaToPercentile(ab.theta) : null,
      itemsAdministered: ab.itemsAdministered,
      maxDifficultyReached: correctDifficulties.length > 0 ? Math.max(...correctDifficulties) : 0,
      learningRate: learningRate(orders, scores),
      consistency: consistencyFromRts(rts),
    };
  });

  const withItems = domainScores.filter((d) => d.itemsAdministered > 0);
  const compositeTheta =
    withItems.length > 0 ? withItems.reduce((s, d) => s + d.theta, 0) / withItems.length : 0;
  const fitIndex = computeFitIndex(domainScores, state.policy);
  const engagedCount = state.administered.filter((a) => a.response.engaged).length;
  const engagementValid =
    state.administered.length > 0 && engagedCount / state.administered.length >= 0.8;
  const decision = engagementValid ? decisionFromFit(fitIndex, state.policy) : 'retry';

  return {
    domainScores,
    compositeTheta,
    fitIndex,
    engagementValid,
    decision,
    policyVersion: state.policy.policyVersion,
    claimBoundary: CLAIM_BOUNDARY,
    syntheticOnly: true,
    validated: false,
  };
}
