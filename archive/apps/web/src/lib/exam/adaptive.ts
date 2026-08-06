import type { Area, EngineConfig, ServedItem } from '@gt-selection/exam-engine';

import { EXAM_ENGINE_OVERRIDES } from './engine-config';
import { EXAM_TYPE_REGISTRY } from './registry.generated';
import type { ItemReveal } from './reveal';

/**
 * Client-side wiring helpers for the adaptive runner.
 *
 * The adaptive LOGIC is the real `@gt-selection/exam-engine` + `@gt-selection/exam-scoring`;
 * this module only supplies the integration boundary: the served-bank pool fetch,
 * the server-verification call, and small display helpers. Nothing here holds an
 * answer key.
 *
 * The engine configuration itself lives in `./engine-config`, which is free of browser globals so
 * that an offline harness can import the very config a live session runs. It is re-exported here so
 * existing callers keep one import site. The per-session SEED stays on this side of that line,
 * because drawing one reads `globalThis.crypto`.
 */
export {
  buildBanks,
  buildCoreMetrics,
  EXAM_ENGINE_OVERRIDES,
  registryMetrics,
  SERVER_GUARANTEED_METRICS,
} from './engine-config';

/**
 * Every wired demo is a pure postMessage renderer — the sync script refuses to
 * publish one that does not handle `init`/`start` and emit a source-tagged
 * `result` — so the legacy DOM bridge is never needed for a registry type.
 */
export const NATIVE_PROTOCOL_TYPES: ReadonlySet<string> = new Set(
  EXAM_TYPE_REGISTRY.map((t) => t.typeCode),
);

/**
 * Per-session engine config: the shared overrides plus a seed unique to this sitting.
 *
 * The engine's seed drives every selection draw, so a fixed seed makes every child receive the
 * same types in the same order. Drawing it per session gives variety between children while
 * keeping one session perfectly replayable from the seed recorded in its own state.
 */
export function examEngineOverrides(
  base: Partial<EngineConfig> = EXAM_ENGINE_OVERRIDES,
  seed = randomSessionSeed(),
): Partial<EngineConfig> {
  return { ...base, seed };
}

/** A 32-bit seed, from the platform CSPRNG where available. */
export function randomSessionSeed(): number {
  const cryptoRef = globalThis.crypto;
  if (cryptoRef?.getRandomValues) {
    return cryptoRef.getRandomValues(new Uint32Array(1))[0] as number;
  }
  return Math.floor(Math.random() * 0x100000000) >>> 0;
}

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
 * The default is deliberately near-empty. Every demo already states what to do in one line ("Tap
 * the tile that completes the pattern, then press the check"), and a test should be answerable the
 * moment a question appears rather than opening with something to watch. Add a type here only when
 * its interaction genuinely cannot be conveyed in a sentence — a multi-step manipulation, say,
 * rather than a choice — and expect roughly four seconds of demonstration the first time a child
 * meets it.
 *
 * `FLU-OPCHAIN-01` is here for a different and stronger reason, and it is the reason the flag is
 * per session rather than per item. Its `tutorial` run is not a gesture hint but the UNSCORED
 * INTERFACE GATE the learning block requires (STAGE2_QUESTION_DESIGN §1.4(3)): a short run of
 * degenerate instances, where the machine holds no parts so the answer is visible, to a criterion
 * of k consecutive correct. Interface learning inside the block is indistinguishable from learning
 * the system, so it has to be discharged before trial 0. Sending `tutorial` once per session is
 * exactly "before trial 0"; sending it per item would put a warm-up inside the fitted climb.
 */
export const GESTURE_DEMO_TYPES: ReadonlySet<string> = new Set<string>(['FLU-OPCHAIN-01']);

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
  /**
   * Post-commit informational feedback for a learning-block type: which option the item's own
   * mechanism produced. Absent for every type that does not need one — see `lib/exam/reveal.ts`
   * for why this is not a key leak and why it is never a verdict.
   */
  reveal?: ItemReveal;
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
    // Narrowed field by field rather than cast, so a payload that named neither currency — or both —
    // forwards nothing to the demo instead of an object the renderer would silently ignore.
    const raw = data.reveal as { machineOutput?: unknown; machinePlacement?: unknown } | undefined;
    const reveal: ItemReveal | null =
      typeof raw?.machineOutput === 'string'
        ? { machineOutput: raw.machineOutput }
        : typeof raw?.machinePlacement === 'number' && Number.isFinite(raw.machinePlacement)
          ? { machinePlacement: raw.machinePlacement }
          : null;
    return {
      correct: Boolean(data.correct),
      score: typeof data.score === 'number' ? data.score : 0,
      difficulty: typeof data.difficulty === 'number' ? data.difficulty : 1,
      domain: data.domain as Area,
      typeCode: String(data.typeCode ?? ''),
      metrics: numericMetrics(data.metrics),
      ...(reveal === null ? {} : { reveal }),
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
