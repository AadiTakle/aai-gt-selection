import type {
  AgeBand,
  Area,
  BankItem,
  Banks,
  CoreMetricSpec,
  EngineConfig,
  QuestionType,
  ServedItem,
} from '@gt-selection/exam-engine';

import { EXAM_TYPE_REGISTRY } from './registry.generated';

/**
 * Client-side wiring helpers for the adaptive runner.
 *
 * The adaptive LOGIC is the real `@gt-selection/exam-engine` + `@gt-selection/exam-scoring`;
 * this module only supplies the integration boundary: the served-bank pool fetch,
 * the server-verification call, a tuned engine config for THIS vertical, and small
 * display helpers. Nothing here holds an answer key.
 */

/**
 * Every wired demo is a pure postMessage renderer — the sync script refuses to
 * publish one that does not handle `init`/`start` and emit a source-tagged
 * `result` — so the legacy DOM bridge is never needed for a registry type.
 */
export const NATIVE_PROTOCOL_TYPES: ReadonlySet<string> = new Set(
  EXAM_TYPE_REGISTRY.map((t) => t.typeCode),
);

/**
 * Metrics `/api/exam-submit` attaches to EVERY scored item regardless of type, so
 * they are always safe to enforce in the stop rule. `M-DIFFREACH` is deliberately
 * absent: the server only emits it when the answer is CORRECT, so enforcing it
 * would hang the battery for a child who answers everything wrong.
 */
const SERVER_GUARANTEED_METRICS = ['M-ACC', 'M-ERRTYPE'] as const;

/** Minimum samples per enforced core metric, per area. */
const MIN_SAMPLES: Record<string, number> = {
  'M-ACC': 4,
  'M-ERRTYPE': 3,
  'M-RT': 4,
  'M-RTFIRST': 4,
  'M-REV': 3,
};

/** Client-emitted metrics we WANT to gate the stop rule on, where every type supplies them. */
const CANDIDATE_CLIENT_METRICS = ['M-RT', 'M-RTFIRST', 'M-REV'] as const;

const AREAS: Area[] = ['fluid_reasoning', 'verbal', 'quantitative', 'spatial'];

/** Metric ids the registry says a type puts on its ItemResult. */
function registryMetrics(typeCode: string): string[] {
  return EXAM_TYPE_REGISTRY.find((t) => t.typeCode === typeCode)?.metrics ?? [];
}

/**
 * Build the stop-rule metric registry FROM the wired types, per area.
 *
 * The stop rule requires every *enforced* metric to reach `minSamples` in every
 * area. A metric that some wired type never emits therefore cannot be enforced
 * blindly: with a large type pool the engine can keep picking that type and the
 * count never advances, so `isDone` stays false until the hard item cap — a
 * 40-item battery that looks like a hang. (Concretely: FLU-CONCEPT-01 never
 * reports `M-REV`, so `M-REV` is not enforceable for the fluid_reasoning area.)
 *
 * So a client metric is enforced for an area only when EVERY wired type in that
 * area emits it, and is otherwise demoted to tracked — still biasing selection
 * toward coverage, never able to block completion. Server-guaranteed metrics are
 * always enforced. This keeps the stop rule satisfiable by construction as the
 * remaining types land.
 */
export function buildCoreMetrics(
  registry: readonly { typeCode: string; domain: Area; metrics: string[] }[] = EXAM_TYPE_REGISTRY,
): CoreMetricSpec[] {
  const specs: CoreMetricSpec[] = SERVER_GUARANTEED_METRICS.map((id) => ({
    id,
    scope: 'all' as const,
    minSamples: MIN_SAMPLES[id] ?? 3,
    enforced: true,
  }));

  for (const metric of CANDIDATE_CLIENT_METRICS) {
    for (const area of AREAS) {
      const typesInArea = registry.filter((t) => t.domain === area);
      if (typesInArea.length === 0) continue;
      specs.push({
        id: metric,
        scope: area,
        minSamples: MIN_SAMPLES[metric] ?? 3,
        enforced: typesInArea.every((t) => t.metrics.includes(metric)),
      });
    }
  }

  // Collected but never blocking: biases selection toward coverage variety only.
  specs.push({ id: 'M-DIFFREACH', scope: 'all', minSamples: 3, enforced: false });
  specs.push({ id: 'M-EXPLORE', scope: 'all', minSamples: 3, enforced: false });
  specs.push({ id: 'M-PATH', scope: 'all', minSamples: 3, enforced: false });
  specs.push({ id: 'M-ENGAGE', scope: 'all', minSamples: 3, enforced: false });
  specs.push({ id: 'M-RAPIDGUESS', scope: 'all', minSamples: 3, enforced: false });
  specs.push({ id: 'M-PAE', scope: 'quantitative', minSamples: 3, enforced: false });

  return specs;
}

/**
 * Deterministic engine config for the adaptive battery. Variable length: keep
 * asking per area until estimates settle and the collected core metrics have
 * enough samples, bounded by a hard safety cap.
 */
export const EXAM_ENGINE_OVERRIDES: Partial<EngineConfig> = {
  coreMetrics: buildCoreMetrics(),
  minItemsPerArea: 4,
  evenSpreadTolerance: 1,
  stabilityWindow: 4,
  stabilitySd: 1.5,
  stabilityDrift: 1.0,
  difficultyWindow: 4,
  accWindowSize: 8,
  estWindowSize: 8,
  hardItemCap: 40,
  /*
   * Back-to-back items within one type, so a child reads an instruction once and then answers
   * several questions off it. Six is the ceiling, stepped down one item per option above four by
   * `burstLengthFor`, and floored at two — so the wired banks run 6 (four-option), 5 (five-option)
   * and 4 (six-option). Only types the engine classifies as a single unpaced choice burst at all.
   */
  burst: { maxLength: 6, minLength: 2, maxOptions: 6 },
};

/** Derive the demo URL for a served item (renderers live under public/exam-demos). */
export function demoPathFor(typeCode: string, telemetry = false): string {
  // `?telemetry=1` un-hides the demo's researcher panel (D-028). Only ever passed in debug mode:
  // naming the measured behaviours to a child can change them.
  return `/exam-demos/${typeCode}.html${telemetry ? '?telemetry=1' : ''}`;
}

/**
 * Debug mode: the exam URL carries `?debug=1`.
 *
 * `?telemetry=1` is kept as an alias because it costs one alternation in this regex and because it
 * is the spelling in the existing runbooks and screenshots. Note that the two names mean different
 * things and only one of them moved: this flag gates the RUNNER's debug dock, while the
 * `?telemetry=1` that {@link demoPathFor} puts on the demo iframe's own URL is D-028's ratified
 * contract for un-hiding a renderer's researcher sidebar, is asserted over every published demo by
 * `telemetry-panel-gate.test.ts`, and is unchanged.
 *
 * Gating is by URL only, exactly as before — there is no environment check here, and none was
 * removed. The environment gates in this area are elsewhere and also unchanged: the `/dev/*` preview
 * routes `notFound()` in production, and `/api/exam-emulate` (what the Emulate button calls) needs
 * both a non-production build and `GT_EXAM_EMULATE_ENABLED=true`.
 *
 * Exposed as a store so a component can read it with `useSyncExternalStore` — the server render and
 * the first client render then agree, and nothing sets state from an effect.
 */
export function subscribeToDebugMode(): () => void {
  return () => {};
}

export function debugModeSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  return /(^|[?&])(debug|telemetry)=1(&|$)/.test(window.location.search);
}

export function debugModeServerSnapshot(): boolean {
  return false;
}

/** Verdict from the development-only emulator. Shape matches `submitAnswer`'s, plus `emulated`. */
export interface EmulatedVerdict extends ServerVerdict {
  readonly emulated: true;
  readonly pCorrect: number;
}

/**
 * Ask the server to emulate one item at the caller's current ability.
 *
 * Correctness is sampled server-side because the browser has no answer key and must not be able to
 * assert one. Returns null when the endpoint is disabled (any non-development build), so a caller
 * can fall back to a normal skip.
 */
export async function emulateAnswer(input: {
  itemId: string;
  ability: number;
  examSessionId: string | null;
}): Promise<EmulatedVerdict | null> {
  try {
    const res = await fetch('/api/exam-emulate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        itemId: input.itemId,
        ability: input.ability,
        ...(input.examSessionId ? { examSessionId: input.examSessionId } : {}),
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { ok?: boolean } & EmulatedVerdict;
    return data.ok ? data : null;
  } catch {
    return null;
  }
}

/**
 * Types whose interaction gets a short wordless gesture demonstration, shown ONCE per session.
 *
 * The default is deliberately empty. Every demo already states what to do in one line ("Tap the
 * tile that completes the pattern, then press the check"), and a test should be answerable the
 * moment a question appears rather than opening with something to watch. Add a type here only when
 * its interaction genuinely cannot be conveyed in a sentence — a multi-step manipulation, say,
 * rather than a choice — and expect roughly four seconds of demonstration the first time a child
 * meets it.
 */
export const GESTURE_DEMO_TYPES: ReadonlySet<string> = new Set<string>([]);

/**
 * Build the engine's `Banks` from served items. The engine only ever reads
 * served-safe fields (itemId/typeCode/domain/difficulty/ageBands/content), so the
 * served pool is a safe stand-in for `Banks.items` — no answer key is present in
 * the browser (BUILD_PLAN §2).
 */
export function buildBanks(served: readonly ServedItem[]): Banks {
  const byType = new Map<string, ServedItem[]>();
  for (const item of served) {
    const list = byType.get(item.typeCode);
    if (list) list.push(item);
    else byType.set(item.typeCode, [item]);
  }

  const types: QuestionType[] = [];
  for (const [typeCode, items] of byType) {
    const domain: Area = items[0]!.domain;
    const ageBands: AgeBand[] = Array.from(new Set(items.flatMap((i) => i.ageBands)));
    // Per-type metrics from the registry (what the demo really emits) plus the
    // ones the server attaches to every scored item, so metric-coverage
    // selection reflects what each type actually contributes.
    const metrics = Array.from(
      new Set([...registryMetrics(typeCode), ...SERVER_GUARANTEED_METRICS, 'M-DIFFREACH']),
    );
    types.push({ typeCode, domain, ageBands, metrics });
  }

  return { types, items: served as unknown as BankItem[] };
}

/** Keep only finite numeric metric values from a loose metric bag. */
export function numericMetrics(bag: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (bag && typeof bag === 'object') {
    for (const [key, value] of Object.entries(bag as Record<string, unknown>)) {
      if (typeof value === 'number' && Number.isFinite(value)) out[key] = value;
    }
  }
  return out;
}

/**
 * Fetch the selection INDEX (no answer keys, and no `content`) for the engine to
 * select over. Content is fetched per item by {@link fetchServedItem} — the full
 * pool's stimulus JSON is several megabytes across the wired banks and grows with
 * every type added.
 */
export async function fetchServedPool(): Promise<ServedItem[]> {
  const res = await fetch('/api/exam-items?index=1', { cache: 'no-store' });
  if (!res.ok) throw new Error('ITEMS_FETCH_FAILED');
  const data = (await res.json()) as { ok?: boolean; items?: unknown };
  if (!data.ok || !Array.isArray(data.items)) throw new Error('ITEMS_FETCH_FAILED');
  return data.items as ServedItem[];
}

/** Fetch one served item WITH its stimulus content (still key-free) for rendering. */
export async function fetchServedItem(itemId: string): Promise<ServedItem> {
  const res = await fetch(`/api/exam-items?itemId=${encodeURIComponent(itemId)}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('ITEM_FETCH_FAILED');
  const data = (await res.json()) as { ok?: boolean; item?: unknown };
  if (!data.ok || !data.item) throw new Error('ITEM_FETCH_FAILED');
  return data.item as ServedItem;
}

/** Server-authoritative verdict for one answered item. */
export interface ServerVerdict {
  correct: boolean;
  score: number;
  difficulty: number;
  domain: Area;
  typeCode: string;
  metrics: Record<string, number>;
}

/**
 * Open a persisted Supabase session for this battery. Returns `null` when
 * persistence is not configured or the write path is unavailable — the runner
 * then runs exactly as before, unpersisted.
 */
export async function openExamSession(
  participantCode: string,
  gradeBand: string,
): Promise<string | null> {
  try {
    const res = await fetch('/api/exam-session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ participantCode, gradeBand }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { ok?: boolean; examSessionId?: unknown };
    return data.ok && typeof data.examSessionId === 'string' ? data.examSessionId : null;
  } catch {
    return null;
  }
}

/** Everything the submit route needs to both verify and trace one item. */
export interface SubmitAnswerInput {
  itemId: string;
  response: unknown;
  skipped: boolean;
  /** Supabase session id; omit to verify without persisting. */
  examSessionId?: string | null;
  /** Metrics the demo emitted for this item. */
  clientMetrics?: Record<string, number>;
  /** This item's telemetry events. */
  telemetry?: readonly unknown[];
}

/**
 * POST the child's raw response to the server, which verifies it against the
 * (server-only) answer key, appends the item to the stored trace when a session
 * id is supplied, and returns correctness + key-dependent metrics. Returns `null`
 * on failure so the runner can fall back gracefully.
 */
export async function submitAnswer(input: SubmitAnswerInput): Promise<ServerVerdict | null> {
  try {
    const res = await fetch('/api/exam-submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        itemId: input.itemId,
        response: input.response,
        skipped: input.skipped,
        ...(input.examSessionId ? { examSessionId: input.examSessionId } : {}),
        ...(input.clientMetrics ? { clientMetrics: input.clientMetrics } : {}),
        ...(input.telemetry ? { telemetry: input.telemetry } : {}),
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    if (!data.ok) return null;
    return {
      correct: Boolean(data.correct),
      score: typeof data.score === 'number' ? data.score : 0,
      difficulty: typeof data.difficulty === 'number' ? data.difficulty : 1,
      domain: data.domain as Area,
      typeCode: String(data.typeCode ?? ''),
      metrics: numericMetrics(data.metrics),
    };
  } catch {
    return null;
  }
}

/** Coarse proficiency band label from a θ on the 1..20 scale (display only). */
const THETA_BANDS: ReadonlyArray<{ max: number; label: string }> = [
  { max: 4, label: 'Emerging' },
  { max: 8, label: 'Developing' },
  { max: 12, label: 'Proficient' },
  { max: 16, label: 'Advanced' },
  { max: 20, label: 'Exceptional' },
];

export function bandForTheta(theta: number): string {
  for (const band of THETA_BANDS) if (theta <= band.max) return band.label;
  return 'Exceptional';
}
