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
 * The engine configuration THIS vertical runs, and the type metadata the engine selects over.
 *
 * Split out of `adaptive.ts` and kept free of browser globals for one reason: an offline harness
 * has to be able to import the real thing. The burst policy was previously measured in simulation
 * against the engine's own `CORE_METRICS` and the research catalog's declared measurement lists,
 * neither of which is what a live session runs — the app replaces `coreMetrics` wholesale here and
 * takes each type's metrics from the generated registry. The two configurations select different
 * types, so "verified in simulation" said nothing about the browser. Anything a harness must be
 * able to reproduce therefore lives in this module rather than beside the `fetch`/`window` helpers.
 */

/**
 * Metrics `/api/exam-submit` attaches to EVERY scored item regardless of type, so
 * they are always safe to enforce in the stop rule. `M-DIFFREACH` is deliberately
 * absent: the server only emits it when the answer is CORRECT, so enforcing it
 * would hang the battery for a child who answers everything wrong.
 */
export const SERVER_GUARANTEED_METRICS = ['M-ACC', 'M-ERRTYPE'] as const;

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

/**
 * Tracked-inert process metrics: collected, never able to block completion.
 *
 * `minSamples` is 3 for each and only a few types per area declare more than two of them, which used
 * to make them the strongest single term in type selection early in a session — one type per area was
 * worth four of these against its rivals' two, a wider margin than the age-band content preference.
 * The engine now caps what a type can earn from them in total (`trackedCoverageCap`, D-201), so they
 * tilt and break ties rather than choosing the content of the test.
 */
const TRACKED_PROCESS_METRICS = ['M-EXPLORE', 'M-PATH', 'M-ENGAGE', 'M-RAPIDGUESS'] as const;

/** Metric ids the registry says a type puts on its ItemResult. */
export function registryMetrics(typeCode: string): string[] {
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
  for (const id of TRACKED_PROCESS_METRICS) {
    specs.push({ id, scope: 'all', minSamples: 3, enforced: false });
  }
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
   * several questions off it. Six is the ceiling, stepped down by `burstLengthFor` for a wider
   * choice and for a declared process measurement, and floored at two.
   */
  burst: { maxLength: 6, minLength: 2, maxOptions: 6 },
};

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
