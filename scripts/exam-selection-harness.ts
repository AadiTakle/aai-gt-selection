/**
 * The shared Phase 1 selection harness: run the REAL wired bank through the engine under the
 * BROWSER's configuration, and report the shape of the session that comes out.
 *
 * Extracted from `exam-instruction-cost.ts` so that the instruction-cost measurement (D-201) and
 * the four-arm integration measurement (D-203) are the same instrument reading two sets of arms.
 * A second, separately written harness would have reproduced the very fault D-201 was about: the
 * burst policy was verified in a simulation that selected over the research catalog's declared
 * measurement lists and the engine's default `CORE_METRICS`, while a live session selects over the
 * generated registry and the app's `EXAM_ENGINE_OVERRIDES`. Different selection problems, different
 * answers, and nothing to reconcile them.
 *
 * CLAIM BOUNDARY. Everything here is a ROUTING measurement: which types are served, how many items
 * that costs, and whether the stop rule can still fire. The responder is a born-synthetic
 * probabilistic child over uncalibrated banks (`validated=false`), so nothing produced here is a
 * psychometric result about score validity, reliability, or fairness. Instruction screens are
 * COUNTED, never priced in seconds — no per-type response-time data exists in this repository.
 */
import {
  areaBreadthCovered,
  areaEstimateStable,
  areaMetricsCovered,
  coverageIsEven,
  isDone,
  nextItem,
  planNextSelection,
  sessionMetricsCovered,
  startState,
  update,
  AREAS,
  type Area,
  type BankItem,
  type BurstPlan,
  type EngineConfig,
  type QuestionType,
} from '../packages/exam-engine/src';
import {
  loadRealBanks,
  respondProbabilistically,
  type RealBanks,
  type TrueTheta,
} from '../packages/exam-engine/src/testing/real-bank';
import { SERVER_GUARANTEED_METRICS } from '../apps/web/src/lib/exam/engine-config';
import { EXAM_TYPE_REGISTRY } from '../apps/web/src/lib/exam/registry.generated';

export { loadRealBanks };
export type { RealBanks, TrueTheta };

/** Restores the pre-D-201 behaviour, where tracked-inert shortfalls summed without limit. */
export const UNCAPPED_TRACKED_COVERAGE = Number.MAX_SAFE_INTEGER;

/** How many types the generated registry wires, i.e. the denominator for "distinct types reached". */
export const WIRED_TYPE_COUNT = EXAM_TYPE_REGISTRY.length;

/** One simulated sitting: a child's true ability plus the seeds the run is reproducible from. */
export interface HarnessChild {
  readonly label: string;
  readonly theta: TrueTheta;
  /** Seed for the RESPONDER — which answers this child gets right. */
  readonly seed: number;
  /**
   * Seed for the ENGINE's selection draws, when the arm supplies one per session.
   * Omitted to leave the config's own seed in place, which is what `dev` shipped: one constant.
   */
  readonly engineSeed?: number;
}

/**
 * The four measurements the retired burst rule treated as proof of a multi-move — and therefore
 * slow — response. Retained here ONLY so an arm can reproduce the retired rule's effect; nothing in
 * `packages/exam-engine` consults them any more.
 */
const RETIRED_PROCESS_DISQUALIFIERS: readonly string[] = [
  'M-PATH',
  'M-EFF',
  'M-PLANFUL',
  'M-IDEAFLU',
];

/**
 * Rebuild the harness's banks so selection sees what a browser sees.
 *
 * Three substitutions, each one a place the harness and the app previously disagreed:
 *
 *  1. only registry-wired types exist (the harness wires anything with a bank file);
 *  2. a type's `metrics` are the generated registry's — what the demo really emits — rather than the
 *     catalog's full declared measurement list; and
 *  3. an item's `content` is the served index's, i.e. an option count and nothing else.
 *
 * `carryOptionCount: false` reproduces the index as it shipped on `dev`, where `content` was `{}`
 * and therefore no item anywhere looked like a bounded choice.
 *
 * `applyRetiredRule` reproduces the retired declared-process-metric disqualifier by withholding the
 * option count from the types it excluded. Withholding the count is exactly how that rule reached
 * its verdict — such a type failed the "every item is a bounded choice" test — so the arm classifies
 * identically to the old code without needing the old code kept alive.
 */
export function browserFaithful(
  real: RealBanks,
  carryOptionCount: boolean,
  applyRetiredRule = false,
): RealBanks {
  const registryByCode = new Map(EXAM_TYPE_REGISTRY.map((t) => [t.typeCode, t]));

  const types: QuestionType[] = [];
  for (const type of real.banks.types) {
    const entry = registryByCode.get(type.typeCode);
    if (!entry) continue;
    types.push({
      ...type,
      metrics: Array.from(new Set([...entry.metrics, ...SERVER_GUARANTEED_METRICS, 'M-DIFFREACH'])),
    });
  }
  const wired = new Set(types.map((t) => t.typeCode));
  const retired = new Set(
    applyRetiredRule
      ? types
          .filter((t) => t.metrics.some((m) => RETIRED_PROCESS_DISQUALIFIERS.includes(m)))
          .map((t) => t.typeCode)
      : [],
  );

  const items: BankItem[] = [];
  for (const item of real.banks.items) {
    if (!wired.has(item.typeCode)) continue;
    const options = (item.content as { options?: unknown }).options;
    const count = Array.isArray(options) && options.length > 0 ? options.length : undefined;
    const show = carryOptionCount && count !== undefined && !retired.has(item.typeCode);
    items.push({ ...item, content: show ? { optionCount: count } : {} });
  }

  // The simulated renderer emits what the real demo emits, so metric counts advance as they do live.
  const catalog = new Map(real.catalog);
  for (const type of types) {
    const previous = catalog.get(type.typeCode);
    if (previous) catalog.set(type.typeCode, { ...previous, perItem: [...type.metrics] });
  }

  return { banks: { types, items }, catalog, stimulus: real.stimulus };
}

/** Which of the stop rule's evidence gates were satisfied when the session stopped. */
export interface StopVerdict {
  /** The session ended on the safety net, not the rule: `itemsServed` reached `hardItemCap`. */
  readonly hitCap: boolean;
  /** Nothing was left to serve — the pool ran out before the rule could fire. */
  readonly exhausted: boolean;
  /** Every ENFORCED core metric reached `minSamples` in every area it gates. */
  readonly enforcedMetricsCovered: boolean;
  /** Areas are within `evenSpreadTolerance` of each other and all have `minItemsPerArea`. */
  readonly evenCoverage: boolean;
  /** Every area's estimate settled. */
  readonly estimatesStable: boolean;
  /** Every area's evidence spans `minTypesPerArea` distinct types. */
  readonly breadthCovered: boolean;
  /** All four evidence gates held, so the session concluded on evidence rather than on the net. */
  readonly concludedOnEvidence: boolean;
}

export interface SessionShape {
  readonly served: readonly string[];
  readonly areas: readonly Area[];
  /** Instruction screens: item 1, plus every item whose type differs from the one before it. */
  readonly screens: number;
  readonly longestBurst: number;
  readonly stop: StopVerdict;
}

/**
 * Run one sitting to its stop and return its shape.
 *
 * `config` is the arm's engine configuration; `child.engineSeed`, when present, overrides its seed
 * so that sessions differ from one another the way a per-session seed makes them differ live.
 */
export function runSession(real: RealBanks, config: Partial<EngineConfig>, child: HarnessChild) {
  const armConfig = child.engineSeed === undefined ? config : { ...config, seed: child.engineSeed };
  let state = startState('4-5', armConfig);
  let active: BurstPlan | null = null;
  const served: string[] = [];
  const areas: Area[] = [];
  let longestBurst = 0;
  let exhausted = false;

  while (!isDone(state)) {
    const plan = planNextSelection(state, real.banks, active);
    if (plan === null) {
      exhausted = true;
      break;
    }
    active = plan;
    longestBurst = Math.max(longestBurst, plan.length);
    const item = nextItem(state, plan.typeCode, real.banks);
    const scored = respondProbabilistically(item, real, child.theta, {
      slope: 1,
      guessing: 'per-item',
      // The served index carries no option list, so a per-item floor is unavailable here. 1/4 is the
      // modal option count across the wired banks, and is applied identically in every arm.
      fallbackGuessing: 0.25,
      seed: child.seed,
    });
    state = update(state, scored);
    served.push(item.typeCode);
    areas.push(item.domain);
  }

  let screens = 0;
  for (let i = 0; i < served.length; i++) {
    if (i === 0 || served[i] !== served[i - 1]) screens += 1;
  }

  // Evaluated with the cap set aside, so "the rule fired" is distinguishable from "the net caught
  // it". `isDone` short-circuits to true at the cap, which would otherwise hide an unsatisfiable
  // stop rule behind a session that merely ended.
  const enforcedMetricsCovered =
    sessionMetricsCovered(state) && AREAS.every((a) => areaMetricsCovered(a, state));
  const evenCoverage = coverageIsEven(state);
  const estimatesStable = AREAS.every((a) => areaEstimateStable(a, state));
  const breadthCovered = AREAS.every((a) => areaBreadthCovered(a, state));

  return {
    served,
    areas,
    screens,
    longestBurst,
    stop: {
      hitCap: state.itemsServed >= (state.config.hardItemCap || Number.POSITIVE_INFINITY),
      exhausted,
      enforcedMetricsCovered,
      evenCoverage,
      estimatesStable,
      breadthCovered,
      concludedOnEvidence:
        enforcedMetricsCovered && evenCoverage && estimatesStable && breadthCovered,
    },
  } satisfies SessionShape;
}

/** Collapse a served sequence into runs, so a burst reads as one instruction. */
export function runsOf(served: readonly string[]): string {
  const out: { code: string; n: number }[] = [];
  for (const code of served) {
    const last = out[out.length - 1];
    if (last && last.code === code) last.n += 1;
    else out.push({ code, n: 1 });
  }
  return out.map((r) => (r.n === 1 ? r.code : `${r.code}×${String(r.n)}`)).join(' | ');
}

/**
 * The most items of any ONE type a session served within its first `window` items.
 *
 * Counted over items rather than runs, and over a fixed window rather than the whole session, so it
 * is the same statistic the variety work reported (5.0 before the fix, 3.1 after) and the two are
 * directly comparable. Bursting deliberately raises this number — several items of one type is what
 * a burst IS — which is why {@link worstTypeRun} is reported beside it.
 */
export function worstTypeRepeat(served: readonly string[], window = 20): number {
  const counts = new Map<string, number>();
  for (const code of served.slice(0, window)) counts.set(code, (counts.get(code) ?? 0) + 1);
  return counts.size === 0 ? 0 : Math.max(...counts.values());
}

/**
 * The most times any ONE type was RETURNED TO within the first `window` items — consecutive items
 * of a type count once.
 *
 * This is the repetition a child experiences as "this game again": a burst of four is one arrival
 * at a type, not four. Reported alongside {@link worstTypeRepeat} because the two move in opposite
 * directions under bursting and only reporting the first would make bursting look like a regression
 * in variety when it is a regression in nothing but the item-level count.
 */
export function worstTypeRun(served: readonly string[], window = 20): number {
  const counts = new Map<string, number>();
  const head = served.slice(0, window);
  for (let i = 0; i < head.length; i++) {
    if (i > 0 && head[i] === head[i - 1]) continue;
    const code = head[i] as string;
    counts.set(code, (counts.get(code) ?? 0) + 1);
  }
  return counts.size === 0 ? 0 : Math.max(...counts.values());
}
