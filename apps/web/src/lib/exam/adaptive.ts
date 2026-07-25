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

/**
 * Client-side wiring helpers for the adaptive runner.
 *
 * The adaptive LOGIC is the real `@gt-selection/exam-engine` + `@gt-selection/exam-scoring`;
 * this module only supplies the integration boundary: the served-bank pool fetch,
 * the server-verification call, a tuned engine config for THIS vertical, and small
 * display helpers. Nothing here holds an answer key.
 */

/** The four refactored demos speak the postMessage protocol natively (no bridge). */
export const NATIVE_PROTOCOL_TYPES: ReadonlySet<string> = new Set([
  'FLU-MATRIX-01',
  'VER-RELPAIR-01',
  'QUANT-SERIES-01',
  'SPA-FOLDNET-01',
]);

/** Metrics this vertical actually produces (client demo + server verification). */
const TYPE_METRICS = ['M-ACC', 'M-DIFFREACH', 'M-RT', 'M-RTFIRST', 'M-REV', 'M-ERRTYPE'];

/**
 * Stop-rule metrics enforced for THIS vertical. The engine's default registry also
 * enforces domain metrics (M-RULEID/M-VOCABLVL/M-PAE/M-ROTSLOPE …) and RT-variance
 * metrics the current four demos do not yet emit; enforcing those would stall the
 * battery at the hard item cap. We keep the real engine and only tune its (tunable)
 * config to the metrics collected now (born-synthetic; `validated=false`). As banks
 * + demos emit more metrics, drop these overrides toward the package defaults.
 */
const VERTICAL_CORE_METRICS: CoreMetricSpec[] = [
  { id: 'M-ACC', scope: 'all', minSamples: 4, enforced: true },
  { id: 'M-ERRTYPE', scope: 'all', minSamples: 3, enforced: true },
  { id: 'M-RT', scope: 'all', minSamples: 4, enforced: true },
  { id: 'M-RTFIRST', scope: 'all', minSamples: 4, enforced: true },
  { id: 'M-REV', scope: 'all', minSamples: 3, enforced: true },
  // Collected but non-blocking (bias selection only).
  { id: 'M-DIFFREACH', scope: 'all', minSamples: 3, enforced: false },
];

/**
 * Deterministic engine config for the adaptive battery. Variable length: keep
 * asking per area until estimates settle and the collected core metrics have
 * enough samples, bounded by a hard safety cap.
 */
export const EXAM_ENGINE_OVERRIDES: Partial<EngineConfig> = {
  coreMetrics: VERTICAL_CORE_METRICS,
  minItemsPerArea: 4,
  evenSpreadTolerance: 1,
  stabilityWindow: 4,
  stabilitySd: 1.5,
  stabilityDrift: 1.0,
  difficultyWindow: 4,
  accWindowSize: 8,
  estWindowSize: 8,
  hardItemCap: 40,
};

/** Derive the demo URL for a served item (renderers live under public/exam-demos). */
export function demoPathFor(typeCode: string): string {
  return `/exam-demos/${typeCode}.html`;
}

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
    types.push({ typeCode, domain, ageBands, metrics: [...TYPE_METRICS] });
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

/** Fetch the full served-item pool (no answer keys) for the engine to select over. */
export async function fetchServedPool(): Promise<ServedItem[]> {
  const res = await fetch('/api/exam-items', { cache: 'no-store' });
  if (!res.ok) throw new Error('ITEMS_FETCH_FAILED');
  const data = (await res.json()) as { ok?: boolean; items?: unknown };
  if (!data.ok || !Array.isArray(data.items)) throw new Error('ITEMS_FETCH_FAILED');
  return data.items as ServedItem[];
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
 * POST the child's raw response to the server, which verifies it against the
 * (server-only) answer key and returns correctness + key-dependent metrics.
 * Returns `null` on failure so the runner can fall back gracefully.
 */
export async function submitAnswer(
  itemId: string,
  response: unknown,
  skipped: boolean,
): Promise<ServerVerdict | null> {
  try {
    const res = await fetch('/api/exam-submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ itemId, response, skipped }),
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
