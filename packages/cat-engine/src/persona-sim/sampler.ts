import { hashSeed, mulberry32 } from '../rng';
import { SCORED_DOMAINS, type IrtParameters, type ScoredDomain } from '../types';

import type { Persona } from './latent';
import {
  driftedEngagement,
  effectiveTheta,
  irtFromDial,
  lureClassForErrorType,
  sampleCorrect,
  sampleDifficultyReachDial,
  sampleErrorType,
  sampleGuessCorrect,
  sampleOnTask,
  sampleRapidGuessRtMs,
  sampleResponseTimeMs,
  type EngagementOptions,
  type ErrorTypeOptions,
  type IrtFromDialOptions,
  type PersonaErrorType,
  type ResponseTimeOptions,
} from './measurement';

/**
 * Drop-in synthetic player: turns a {@link Persona} into the `respond` callback the
 * web session shell already takes, so a persona runs through the REAL loop
 * (sequencer -> present -> record -> summarize) with nothing re-implemented.
 *
 * WHY THE TYPES ARE DECLARED HERE: this package is a pure, portable Lambda payload
 * and may not depend on the web app or on `@gt-selection/contracts` (a workspace
 * boundary check enforces it). So the served-item / bank-item / outcome shapes are
 * declared below as MINIMAL STRUCTURAL types: they are supertypes of the shell's
 * own types, which makes a `PersonaRespond` assignable to the shell's `respond`
 * parameter without either side importing the other. If the shell's shapes change
 * incompatibly, the runner script's type-level compatibility assertion is what
 * fails — deliberately, at the seam.
 *
 * A persona's randomness is a per-trial substream keyed by
 * `(seed, personaId, order, itemId)`, so a run is bit-for-bit reproducible and a
 * single trial can be replayed in isolation (R7, D-019).
 */

/**
 * Renderable subset the shell hands the player (structural supertype).
 *
 * Optional members are written `?: T | undefined` deliberately: the shell's shapes
 * are inferred from schemas that admit an explicit `undefined`, and under
 * `exactOptionalPropertyTypes` a bare `?: T` would NOT accept them.
 */
export interface SimServedItem {
  readonly itemId: string;
  readonly typeCode: string;
  readonly domain: string;
  readonly difficultyLevel: number;
  readonly renderKind: string;
  readonly stage?: string | undefined;
}

/**
 * Bank-side item (structural supertype). The simulator reads the ANSWER KEY from
 * here, which is exactly what a real child cannot do — a synthetic player has to
 * be told which option is correct in order to emit a "correct" selection at the
 * rate the 3PL dictates. The key never enters the served item.
 */
export interface SimBankItem {
  readonly itemId: string;
  readonly typeCode: string;
  readonly domain: string;
  readonly difficultyLevel: number;
  readonly renderKind: string;
  readonly stage?: string | undefined;
  readonly answer?: { readonly correctIndex?: number | undefined } | undefined;
  readonly content?:
    | {
        readonly options?:
          readonly { readonly label: string; readonly lure?: string | undefined }[] | undefined;
      }
    | undefined;
}

/**
 * What the shell expects back from the player. This one is a structural SUBtype
 * (the outcome is returned, not accepted), so its optional member must NOT admit an
 * explicit `undefined` — the shell's hand-written response type does not.
 */
export interface SimPlayerOutcome {
  response: { selectedIndex?: number } | null;
  telemetry: Record<string, string | number>;
  responseTimeMs: number | null;
  skipped: boolean;
}

/** The exact shape of the shell's `respond` callback. */
export type PersonaRespond = (served: SimServedItem, item: SimBankItem) => SimPlayerOutcome;

/** One simulated trial, with the generator's ground truth retained for recovery. */
export interface PersonaTrial {
  /** 1-based administration order across the session. */
  order: number;
  itemId: string;
  typeCode: string;
  domain: string;
  difficultyLevel: number;
  stage: string | null;
  /** The 3PL parameters the response was actually drawn from. */
  irt: IrtParameters;
  /** The persona's true domain theta. */
  thetaTrue: number;
  /** Theta after any within-novel-block learning climb (what generated the draw). */
  thetaEffective: number;
  /** Generator truth: was this trial on-task? */
  onTask: boolean;
  /** Generator truth: was this a rapid guess (a disengaged, non-effortful trial)? */
  rapidGuess: boolean;
  correct: boolean;
  rtMs: number;
  lapse: boolean;
  errorType: PersonaErrorType | null;
  lureClass: string | null;
  /** M-DIFFREACH draw on the 1-20 dial (null when the trial was not effortful). */
  difficultyReachDial: number | null;
  /** 0-based trial index inside the novel block, or null outside a novel block. */
  novelBlockIndex: number | null;
  /** On-task probability in force for this trial after drift. */
  engagementProbability: number;
}

export interface PersonaSamplerOptions {
  /** Calibrated parameters per item; falls back to the dial->3PL mapping. */
  itemIrt?: (item: SimBankItem) => IrtParameters | undefined;
  irtFromDial?: IrtFromDialOptions;
  responseTime?: ResponseTimeOptions;
  engagement?: EngagementOptions;
  errorType?: ErrorTypeOptions;
  /**
   * Which items form a NOVEL block (where ability climbs by lambda per trial).
   * Defaults to the two-regime `effort` stage tag; standing items must stay
   * climb-free or the standing estimate inherits the learning signal.
   */
  isNovelBlockItem?: (item: SimBankItem) => boolean;
  /** Disable the engagement gate (every trial on-task) for isolation tests. */
  disableEngagementGate?: boolean;
}

function personaThetaForDomain(persona: Persona, domain: string): number {
  return (SCORED_DOMAINS as readonly string[]).includes(domain)
    ? persona.theta[domain as ScoredDomain]
    : persona.thetaMean;
}

function accuracyMetric(correct: boolean): string {
  return `${correct ? 1 : 0}/1  ${correct ? 100 : 0}%`;
}

/**
 * Pick the index of a wrong option. When the bank tags per-option lure classes,
 * prefer the distractor matching the sampled error type so M-LURETYPE carries the
 * same information as M-ERRTYPE; otherwise fall back to a uniform wrong option.
 */
function pickWrongIndex(
  rand: () => number,
  options: readonly { readonly label: string; readonly lure?: string | undefined }[],
  correctIndex: number,
  lureClass: string,
): number {
  const wrong: number[] = [];
  const matching: number[] = [];
  options.forEach((option, i) => {
    if (i === correctIndex) return;
    wrong.push(i);
    if (option.lure === lureClass) matching.push(i);
  });
  const pool = matching.length > 0 ? matching : wrong;
  if (pool.length === 0) return correctIndex;
  return pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))]!;
}

export interface PersonaRun {
  respond: PersonaRespond;
  /** Trials in administration order; populated as the session runs. */
  trials: PersonaTrial[];
}

/**
 * Build a persona's `respond` callback together with the trial log the recovery
 * step needs (the session's own results carry accuracy but not the item
 * parameters the response was drawn from).
 */
export function createPersonaRun(
  persona: Persona,
  seed: string,
  options: PersonaSamplerOptions = {},
): PersonaRun {
  const isNovel = options.isNovelBlockItem ?? ((item: SimBankItem) => item.stage === 'effort');
  const trials: PersonaTrial[] = [];
  let offTaskCount = 0;
  const novelBlockCounts = new Map<string, number>();

  const respond: PersonaRespond = (_served, item) => {
    const order = trials.length + 1;
    const rand = mulberry32(hashSeed(`${seed}|${persona.personaId}|${order}|${item.itemId}`));

    const irt = options.itemIrt?.(item) ?? irtFromDial(item.difficultyLevel, options.irtFromDial);
    const thetaTrue = personaThetaForDomain(persona, item.domain);

    let novelBlockIndex: number | null = null;
    if (isNovel(item)) {
      const key = item.domain;
      novelBlockIndex = novelBlockCounts.get(key) ?? 0;
      novelBlockCounts.set(key, novelBlockIndex + 1);
    }
    const thetaEffective =
      novelBlockIndex == null
        ? thetaTrue
        : effectiveTheta(thetaTrue, persona.learningRate, novelBlockIndex);

    const engagementProbability = options.disableEngagementGate
      ? 1
      : driftedEngagement(persona.engagement, offTaskCount, options.engagement);
    const onTask = options.disableEngagementGate ? true : sampleOnTask(rand, engagementProbability);

    let correct: boolean;
    let rtMs: number;
    let lapse = false;
    let rapidGuess = false;
    let errorType: PersonaErrorType | null = null;
    let lureClass: string | null = null;
    let difficultyReachDial: number | null = null;

    if (onTask) {
      correct = sampleCorrect(rand, thetaEffective, irt);
      const draw = sampleResponseTimeMs(
        rand,
        {
          theta: thetaEffective,
          irt,
          speed: persona.speed,
          consistency: persona.consistency,
        },
        options.responseTime,
      );
      rtMs = draw.rtMs;
      lapse = draw.lapse;
      if (!correct) {
        errorType = sampleErrorType(rand, thetaEffective, irt, options.errorType);
        lureClass = lureClassForErrorType(errorType);
      }
      difficultyReachDial = sampleDifficultyReachDial(rand, thetaEffective, irt);
    } else {
      offTaskCount += 1;
      // A disengaged trial is either a rapid guess (accuracy at the guessing
      // floor, RT below any solution-behaviour floor) or a slow, checked-out
      // response. Both are non-effortful; neither is evidence about ability.
      rapidGuess = rand() < persona.rapidGuessPropensity;
      correct = sampleGuessCorrect(rand, irt);
      if (rapidGuess) {
        rtMs = sampleRapidGuessRtMs(rand, options.engagement);
      } else {
        const draw = sampleResponseTimeMs(
          rand,
          {
            theta: thetaEffective,
            irt,
            speed: persona.speed,
            consistency: persona.consistency,
          },
          options.responseTime,
        );
        rtMs = draw.rtMs * (options.engagement?.disengagedSlowFactor ?? 2.5);
        lapse = draw.lapse;
      }
      if (!correct) {
        errorType = 'random';
        lureClass = lureClassForErrorType('random');
      }
    }

    const trial: PersonaTrial = {
      order,
      itemId: item.itemId,
      typeCode: item.typeCode,
      domain: item.domain,
      difficultyLevel: item.difficultyLevel,
      stage: item.stage ?? null,
      irt,
      thetaTrue,
      thetaEffective,
      onTask,
      rapidGuess,
      correct,
      rtMs,
      lapse,
      errorType,
      lureClass,
      difficultyReachDial,
      novelBlockIndex,
      engagementProbability,
    };
    trials.push(trial);

    const telemetry: Record<string, string | number> = {
      'M-ACC': accuracyMetric(correct),
      'M-RT': `${Math.round(rtMs)} ms`,
      'M-ENGAGE': onTask ? 'on-task' : 'off-task',
      'M-RAPIDGUESS': `${rapidGuess ? 1 : 0}/1`,
      'M-LAPSE': `${lapse ? 1 : 0}/1`,
      'M-DRIFT': Number(engagementProbability.toFixed(4)),
    };
    if (difficultyReachDial != null) {
      telemetry['M-DIFFREACH'] = `L${Math.max(1, Math.round(difficultyReachDial))}`;
    }
    if (errorType) {
      telemetry['M-ERRTYPE'] = errorType;
      telemetry['M-LURETYPE'] = lureClass ?? '';
    }

    // Selection items are scored server-side from the raw response against the
    // bank key, so the persona must emit an OPTION INDEX rather than a verdict —
    // that keeps the real scoring path in the loop instead of trusting the player.
    let response: { selectedIndex?: number } | null = null;
    const correctIndex = item.answer?.correctIndex;
    const optionList = item.content?.options;
    if (item.renderKind === 'single-select' && correctIndex != null && optionList) {
      response = {
        selectedIndex: correct
          ? correctIndex
          : pickWrongIndex(rand, optionList, correctIndex, lureClass ?? 'global_mismatch'),
      };
    }

    return { response, telemetry, responseTimeMs: Math.round(rtMs), skipped: false };
  };

  return { respond, trials };
}

/**
 * The design doc's entry point: a persona as a plain `respond` function, ready to
 * hand straight to the session shell. Use {@link createPersonaRun} when the caller
 * also needs the trial log for theta recovery.
 */
export function personaSampler(
  persona: Persona,
  seed: string,
  options: PersonaSamplerOptions = {},
): PersonaRespond {
  return createPersonaRun(persona, seed, options).respond;
}
