/**
 * Harness that drives the engine against the REAL type registry and item banks in
 * `research/exam-question-types/` instead of a fabricated bank.
 *
 * Why this exists: `synthetic-bank.ts` fabricates a value for every core metric, so a session run
 * against it proves only that the stop rule terminates when *everything* is emitted. No real
 * renderer emits everything, so that harness cannot detect an unsatisfiable stop rule. This one
 * reads what the 66 catalog type specs actually declare and what the bank files actually contain.
 *
 * Read-only with respect to `research/`. Born-synthetic: every bank item already carries
 * `syntheticOnly=true`, `validated=false`, and the responder is deterministic.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { planNextSelection, type BurstPlan } from '../burst';
import { isDone } from '../done';
import { hashUnit } from '../rng';
import { nextItem } from '../selection';
import { startState } from '../state';
import { clamp } from '../stats';
import { update } from '../update';
import {
  AREAS,
  type AgeBand,
  type Area,
  type BankItem,
  type Banks,
  type EngineConfig,
  type ItemId,
  type ItemStimulus,
  type MetricId,
  type QuestionType,
  type ScoredItem,
  type ServedItem,
  type SessionState,
} from '../types';

const CATALOG_RELATIVE = join('research', 'exam-question-types', 'catalog', 'master_types.jsonl');
const BANKS_RELATIVE = join('research', 'exam-question-types', 'banks');

/**
 * Measurements that are session-level aggregates: a renderer cannot produce them from one item,
 * so this harness never emits them even for a type whose catalog spec lists them. A type
 * declaring `M-RTVAR` means "trials of this type feed the child's RT-variability estimate", not
 * "this renderer reports a variance per item". Mirrors `DERIVED_METRIC_IDS` in `derived.ts`.
 */
const SESSION_AGGREGATE_MEASUREMENTS: ReadonlySet<MetricId> = new Set([
  'M-RTVAR',
  'M-CONSIST',
  'M-LEARNRATE',
  'M-ROTSLOPE',
  'M-DIFFREACH',
  'M-DRIFT',
  'M-LAPSE',
  'M-SPEEDACC',
  'M-COMBO',
  'M-HICKSLOPE',
  'M-ITTHRESH',
  'M-POSTERR',
  'M-WEBER',
]);

/** Walk up from this file until the research catalog is found; returns the repo root. */
function findRepoRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let depth = 0; depth < 10; depth++) {
    if (existsSync(join(dir, CATALOG_RELATIVE))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(`real-bank harness: could not locate ${CATALOG_RELATIVE} above this package.`);
}

/**
 * Parse a JSONL file, skipping lines that do not parse. `research/` is written concurrently by
 * other workstreams, so a half-flushed trailing line must not turn this into a flaky failure.
 */
function readJsonl(path: string): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object') rows.push(parsed as Record<string, unknown>);
    } catch {
      continue;
    }
  }
  return rows;
}

function isArea(value: unknown): value is Area {
  return typeof value === 'string' && (AREAS as readonly string[]).includes(value);
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

/** What the catalog declares for one type. */
interface CatalogType {
  typeCode: string;
  domain: Area;
  ageBands: AgeBand[];
  /** Every measurement the spec declares, including session-level ones. */
  declared: MetricId[];
  /** The subset a per-item renderer can actually emit. */
  perItem: MetricId[];
}

/** The real registry + banks, plus the server-only stimulus parameters keyed by item id. */
export interface RealBanks {
  banks: Banks;
  /** Catalog metadata keyed by type code (declared vs. per-item-emittable measurements). */
  catalog: Map<string, CatalogType>;
  /**
   * Server-only stimulus parameters the engine needs for derived aggregates. Keyed by item id
   * because they live under the bank item's `answer` block and never reach the browser.
   */
  stimulus: Map<ItemId, ItemStimulus>;
}

/** Minimum usable items in a bank file before it is considered wired. */
const MIN_ITEMS_PER_BANK = 20;

/**
 * Load the real type registry and item banks. Only types that have BOTH a catalog spec and a
 * usable bank file are wired, because those are the only ones the engine could ever serve.
 */
export function loadRealBanks(): RealBanks {
  const root = findRepoRoot();

  const catalog = new Map<string, CatalogType>();
  for (const row of readJsonl(join(root, CATALOG_RELATIVE))) {
    const typeCode = typeof row['type_id'] === 'string' ? row['type_id'] : null;
    const areas = asStringArray(row['areas']).filter(isArea);
    if (typeCode === null || areas.length === 0) continue;
    const declared = asStringArray(row['measurements']);
    catalog.set(typeCode, {
      typeCode,
      domain: areas[0] as Area,
      ageBands: asStringArray(row['age_bands']) as AgeBand[],
      declared,
      perItem: declared.filter((id) => !SESSION_AGGREGATE_MEASUREMENTS.has(id)),
    });
  }

  const types: QuestionType[] = [];
  const items: BankItem[] = [];
  const stimulus = new Map<ItemId, ItemStimulus>();

  const bankDir = join(root, BANKS_RELATIVE);
  // Sorted so the wired registry (and therefore every session) is order-stable.
  for (const file of readdirSync(bankDir)
    .filter((f) => f.endsWith('.jsonl'))
    .sort()) {
    const typeCode = file.slice(0, -'.jsonl'.length);
    const spec = catalog.get(typeCode);
    if (!spec) continue;

    const rows = readJsonl(join(bankDir, file));
    const bankItems: BankItem[] = [];
    for (const row of rows) {
      const itemId = row['itemId'];
      const domain = row['domain'];
      const difficulty = row['difficulty'];
      if (typeof itemId !== 'string' || !isArea(domain) || typeof difficulty !== 'number') continue;

      bankItems.push({
        itemId,
        typeCode,
        domain,
        difficulty,
        ageBands: asStringArray(row['ageBands']) as AgeBand[],
        content: (row['content'] ?? {}) as Record<string, unknown>,
        answer: {
          correctKey: String((row['answer'] as { correctKey?: unknown })?.correctKey ?? ''),
        },
        scoring: { mode: 'deterministic_key' },
        provenance: { generator: 'grammar' },
        syntheticOnly: true,
        validated: false,
      });

      const answer = row['answer'];
      if (answer && typeof answer === 'object') {
        const a = answer as Record<string, unknown>;
        if (a['angularDisparityApplies'] === true && typeof a['angularDisparityDeg'] === 'number') {
          stimulus.set(itemId, { angularDisparityDeg: a['angularDisparityDeg'] });
        }
      }
    }

    if (bankItems.length < MIN_ITEMS_PER_BANK) continue;
    items.push(...bankItems);
    types.push({
      typeCode,
      domain: spec.domain,
      ageBands: spec.ageBands,
      // The engine uses `metrics` for coverage-driven selection, so it must reflect what a
      // renderer can actually emit — not the spec's full measurement list.
      metrics: [...spec.perItem],
    });
  }

  return { banks: { types, items }, catalog, stimulus };
}

/** A per-area "true ability" on the 1..20 scale for the simulated child. */
export type TrueTheta = Record<Area, number>;

/**
 * Deterministic response-time model (ms). Slower on harder items, slower when wrong, and — on
 * trials that carry an angular disparity — linear in that disparity, so a mental-rotation slope
 * is genuinely recoverable rather than assumed. The jitter keeps RT variance non-degenerate.
 */
function responseTimeMs(item: ServedItem, correct: boolean, disparityDeg: number | null): number {
  const jitter = hashUnit(0x5eed, `rt:${item.itemId}`) * 400;
  const rotation = disparityDeg === null ? 0 : 4.2 * disparityDeg;
  return Math.round(800 + 55 * item.difficulty + (correct ? 0 : 260) + rotation + jitter);
}

/**
 * Deterministic placeholder for a per-item observed metric with no special meaning here. Unlike
 * the synthetic harness this is only ever reached for metrics a renderer really does emit per
 * item; nothing session-level is fabricated.
 */
function observedPlaceholder(metricId: MetricId, itemId: ItemId): number {
  return Math.round(hashUnit(0x5eed, `${metricId}:${itemId}`) * 1000) / 1000;
}

/**
 * Simulated child + server for one item.
 *
 * The child gets items at or below their true ability right. The metric bag mirrors production:
 * the renderer contributes the type's per-item measurements, and the server (`/api/exam-submit`)
 * always adds `M-ACC` and `M-ERRTYPE`, and `M-DIFFREACH` only on a correct answer.
 */
export function respondFromRealBank(
  served: ServedItem,
  real: RealBanks,
  trueTheta: TrueTheta,
): ScoredItem {
  return scoredFrom(served, real, trueTheta, served.difficulty <= trueTheta[served.domain]);
}

/**
 * Build the `ScoredItem` for an item whose correctness has already been decided, so the threshold
 * and probabilistic responders differ ONLY in how they draw correctness and share every metric,
 * response-time and stimulus detail.
 */
function scoredFrom(
  served: ServedItem,
  real: RealBanks,
  trueTheta: TrueTheta,
  correct: boolean,
): ScoredItem {
  const theta = trueTheta[served.domain];
  const score = correct ? 1 : 0;
  const errType = correct ? 1 : clamp(1 - (served.difficulty - theta) / 5, 0, 1);

  const stimulus = real.stimulus.get(served.itemId);
  const disparityDeg = stimulus?.angularDisparityDeg ?? null;
  const rtMs = responseTimeMs(served, correct, disparityDeg);

  const spec = real.catalog.get(served.typeCode);
  const metrics: Record<MetricId, number> = {};
  for (const metricId of spec?.perItem ?? []) {
    if (metricId === 'M-RT') metrics[metricId] = rtMs;
    else if (metricId === 'M-RTFIRST') metrics[metricId] = Math.round(rtMs * 0.35);
    else if (metricId === 'M-REV') metrics[metricId] = correct ? 0 : 1;
    else if (metricId === 'M-ACC') metrics[metricId] = score;
    else if (metricId === 'M-ERRTYPE') metrics[metricId] = errType;
    else metrics[metricId] = observedPlaceholder(metricId, served.itemId);
  }

  // Server-authoritative metrics, exactly as `/api/exam-submit` returns them.
  metrics['M-ACC'] = score;
  metrics['M-ERRTYPE'] = errType;
  if (correct) metrics['M-DIFFREACH'] = served.difficulty;

  return {
    itemId: served.itemId,
    typeCode: served.typeCode,
    domain: served.domain,
    response: { selectedKey: correct ? 'A' : 'B' },
    metrics,
    telemetry: [],
    correct,
    score,
    difficulty: served.difficulty,
    ...(stimulus ? { stimulus } : {}),
  };
}

/**
 * Chance-success floor for one item, read off how many options it offers: a five-option item floors
 * at 0.2. Returns `null` when the item declares no option list, so a caller can decide what an
 * unbounded response is worth rather than have a floor invented for it.
 */
export function itemGuessingFloor(item: ServedItem): number | null {
  const options = (item.content as { options?: unknown }).options;
  if (!Array.isArray(options) || options.length === 0) return null;
  return 1 / options.length;
}

/** Knobs for the probabilistic responder. */
export interface ProbabilisticResponderOptions {
  /** Logistic discrimination per scale point. 1.0 matches the engine and scorer defaults. */
  readonly slope: number;
  /**
   * Chance-success floor the SIMULATED CHILD actually has.
   *
   * `'per-item'` derives it from each item's own option count ({@link itemGuessingFloor}), which is
   * the faithful choice for a bank of mixed option counts. A number pins one floor for every item;
   * `0` is a constructed-response child who never guesses right, which no wired bank contains.
   */
  readonly guessing: number | 'per-item';
  /** Floor used when an item declares no options and `guessing` is `'per-item'`. */
  readonly fallbackGuessing: number;
  /** Per-child draw seed, so one cohort member's luck is reproducible and independent of another's. */
  readonly seed: number;
}

export const DEFAULT_PROBABILISTIC_RESPONDER: ProbabilisticResponderOptions = {
  slope: 1.0,
  guessing: 'per-item',
  fallbackGuessing: 0,
  seed: 0x5eed,
};

/**
 * Simulated child who answers PROBABILISTICALLY, with a chance-success floor.
 *
 * `respondFromRealBank` is a threshold responder: correct on everything at or below their ability,
 * wrong on everything above, never lucky. That is a noise-free Guttman pattern, and a staircase
 * converges on it far faster and far more tidily than on a child. It is the right responder for
 * asserting routing SHAPE (does the estimate bracket from both sides at all) and the wrong one for
 * measuring how many items convergence costs.
 *
 * This responder draws from
 *
 *     P(correct | b) = c + (1 - c) * logistic(slope * (theta - b))
 *
 * with `c` the item's own chance floor. Every wired bank is multiple choice, so `c > 0` always: a
 * child well below an item still passes it sometimes, and the estimate is pushed up by luck as well
 * as by ability. That is the single most consequential difference from the threshold responder, and
 * it is why every length figure measured with it is larger.
 *
 * Born-synthetic and deterministic given `seed`; `validated=false`. Nothing here is a calibrated
 * response model, and no bank item has a calibrated difficulty for it to be calibrated against.
 */
export function respondProbabilistically(
  served: ServedItem,
  real: RealBanks,
  trueTheta: TrueTheta,
  options: ProbabilisticResponderOptions = DEFAULT_PROBABILISTIC_RESPONDER,
): ScoredItem {
  const theta = trueTheta[served.domain];
  const floor =
    options.guessing === 'per-item'
      ? (itemGuessingFloor(served) ?? options.fallbackGuessing)
      : options.guessing;
  const skill = 1 / (1 + Math.exp(-options.slope * (theta - served.difficulty)));
  const pCorrect = clamp(floor + (1 - floor) * skill, 0, 1);
  const correct = hashUnit(options.seed, `resp:${served.itemId}`) < pCorrect;

  return scoredFrom(served, real, trueTheta, correct);
}

export interface RealSessionResult {
  state: SessionState;
  real: RealBanks;
  trace: ScoredItem[];
  done: boolean;
  /** True when the session ended because it ran out of servable items rather than by rule/cap. */
  exhausted: boolean;
  /**
   * The burst each item belonged to, index-aligned with `trace`. With bursting disabled every entry
   * is a length-1 burst, which is the same thing as no burst.
   */
  bursts: BurstPlan[];
}

/** How a simulated child answers one item. */
export type Responder = (
  served: ServedItem,
  real: RealBanks,
  trueTheta: TrueTheta,
) => ScoredItem;

/**
 * Run a full adaptive session against the real registry and banks.
 *
 * The loop advances through `planNextSelection`, which is the same contract a browser runner uses,
 * so a burst here behaves exactly as it does in a live session. `responder` defaults to the
 * threshold child for backwards compatibility; pass {@link respondProbabilistically} to measure
 * anything about length or precision.
 */
export function runRealBankSession(
  gradeBand: AgeBand,
  trueTheta: TrueTheta,
  overrides?: Partial<EngineConfig>,
  real: RealBanks = loadRealBanks(),
  responder: Responder = respondFromRealBank,
): RealSessionResult {
  let state = startState(gradeBand, overrides);
  const trace: ScoredItem[] = [];
  const bursts: BurstPlan[] = [];
  let exhausted = false;
  let active: BurstPlan | null = null;

  while (!isDone(state)) {
    const plan = planNextSelection(state, real.banks, active);
    if (plan === null) {
      exhausted = true;
      break;
    }
    active = plan;
    const served = nextItem(state, plan.typeCode, real.banks);
    const scored = responder(served, real, trueTheta);
    state = update(state, scored);
    trace.push(scored);
    bursts.push(plan);
  }

  return { state, real, trace, done: isDone(state), exhausted, bursts };
}
