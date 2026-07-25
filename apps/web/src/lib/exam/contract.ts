import { z } from 'zod';

/**
 * Local TypeScript/Zod shims that mirror the adaptive-exam interface contract
 * (docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md §2 + EXAM_ITEM_SCHEMA_SPEC.md).
 *
 * These live in the app so the frontend can build and run WITHOUT depending on
 * `@gt-selection/contracts`, `@gt-selection/exam-engine`, or
 * `@gt-selection/exam-scoring` being present. When those packages land, replace
 * these shapes with the shared package types at the integration merge — the
 * field names/semantics are intentionally the same.
 *
 * Born-synthetic only: every served/scored artefact carries
 * `syntheticOnly=true` / `validated=false`. Difficulty is a FLOAT 1..20
 * (design-estimated, provisional — NOT calibrated).
 */

export type { ExamDomain } from './bank';
export { EXAM_DOMAINS } from './bank';

/** Zod enum for the four reasoning domains (literals mirror bank.ts ExamDomain). */
export const examDomainSchema = z.enum(['fluid_reasoning', 'verbal', 'quantitative', 'spatial']);

// ---------------------------------------------------------------------------
// Grade bands — the adaptive battery seeds difficulty from the requested band.
// (BUILD_PLAN §0: K-1 ≈ 1–4, 2-3 ≈ 4–8, 4-5 ≈ 8–12, 6-8 ≈ 12–16.)
// ---------------------------------------------------------------------------

export const GRADE_BANDS = ['K-1', '2-3', '4-5', '6-8'] as const;
export type GradeBand = (typeof GRADE_BANDS)[number];
export const gradeBandSchema = z.enum(GRADE_BANDS);

export const GRADE_BAND_LABEL: Record<GradeBand, string> = {
  'K-1': 'Kindergarten – 1st grade',
  '2-3': '2nd – 3rd grade',
  '4-5': '4th – 5th grade',
  '6-8': '6th – 8th grade',
};

/** Midpoint of each band's difficulty window (1..20) — the per-area seed. */
export const GRADE_BAND_START_DIFFICULTY: Record<GradeBand, number> = {
  'K-1': 2.5,
  '2-3': 6,
  '4-5': 10,
  '6-8': 14,
};

// ---------------------------------------------------------------------------
// Metrics — numeric structured signals (BUILD_PLAN §4). The basic-core set
// influences selection + scoring now; the rest are tracked-inert.
// ---------------------------------------------------------------------------

export type MetricId = string;

/** Basic-core metric ids that influence selection/scoring (BUILD_PLAN §4). */
export const CORE_METRICS: readonly MetricId[] = [
  'M-ACC',
  'M-DIFFREACH',
  'M-RT',
  'M-RTFIRST',
  'M-RTVAR',
  'M-REV',
  'M-ERRTYPE',
  'M-CONSIST',
  'M-LEARNRATE',
] as const;

/** Structured numeric metric map emitted per item (`M-*` id → number). */
export const metricValuesSchema = z.record(z.string(), z.number());
export type MetricValues = z.infer<typeof metricValuesSchema>;

// ---------------------------------------------------------------------------
// Telemetry — append-only per-item event trace.
// ---------------------------------------------------------------------------

export const telemetryEventSchema = z
  .object({
    /** Milliseconds since the item started. */
    t: z.number(),
    kind: z.string().min(1),
    message: z.string().optional(),
    itemId: z.string().optional(),
    data: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();
export type TelemetryEvent = z.infer<typeof telemetryEventSchema>;

// ---------------------------------------------------------------------------
// Item / result contract (BUILD_PLAN §2).
// ---------------------------------------------------------------------------

/**
 * What the browser receives — content to render, NO answer/scoring/provenance.
 * `content` is intentionally open here (the typed per-type registry lives in
 * `packages/contracts`); legacy demos self-render and ignore it.
 */
export const servedItemSchema = z
  .object({
    itemId: z.string().min(1),
    typeCode: z.string().min(1),
    domain: examDomainSchema,
    /** FLOAT 1..20 — provisional design difficulty, not calibrated. */
    difficulty: z.number().min(1).max(20),
    ageBands: z.array(z.string().min(1)).min(1),
    demoPath: z.string().min(1),
    content: z.record(z.string(), z.unknown()),
    syntheticOnly: z.literal(true),
  })
  .strict();
export type ServedItem = z.infer<typeof servedItemSchema>;

/**
 * Emitted by the demo via postMessage; the server re-verifies. The client never
 * asserts correctness — it forwards the raw response + structured metrics +
 * telemetry only.
 */
export const itemResultSchema = z
  .object({
    itemId: z.string().min(1),
    typeCode: z.string().min(1),
    domain: examDomainSchema,
    /** Raw child choice/actions — NOT a verdict. */
    response: z.unknown(),
    metrics: metricValuesSchema,
    telemetry: z.array(telemetryEventSchema),
    /** True when the item was skipped / timed out rather than completed. */
    skipped: z.boolean().optional(),
  })
  .strict();
export type ItemResult = z.infer<typeof itemResultSchema>;

/** Server-added correctness/score (BUILD_PLAN §2 ScoredItem). */
export const scoredItemSchema = itemResultSchema.extend({
  correct: z.boolean(),
  score: z.number().min(0).max(1),
  difficulty: z.number().min(1).max(20),
});
export type ScoredItem = z.infer<typeof scoredItemSchema>;

// ---------------------------------------------------------------------------
// Score / profile output (BUILD_PLAN §5). No admit/defer/retry decision.
// ---------------------------------------------------------------------------

export const perAreaScoreSchema = z
  .object({
    area: examDomainSchema,
    /** Accuracy 0..1 (M-ACC) — sets the bracket. Null when no data. */
    accuracy: z.number().min(0).max(1).nullable(),
    /** Estimated proficiency θ on the 1..20 scale. */
    proficiency: z.number().min(1).max(20),
    /** Ordinal accuracy bracket index (0 = lowest). */
    bracket: z.number().int().nonnegative(),
    bracketLabel: z.string(),
    /** Ceiling / max difficulty reached (1..20). */
    diffReach: z.number().nonnegative(),
    itemsSeen: z.number().int().nonnegative(),
  })
  .strict();
export type PerAreaScore = z.infer<typeof perAreaScoreSchema>;

export const sessionProfileSchema = z
  .object({
    strengths: z.array(examDomainSchema),
    /** Mean within-session learning rate (M-LEARNRATE). */
    learningRate: z.number(),
    /** Mean consistency signal (0..1; higher = steadier). */
    consistency: z.number(),
    note: z.string(),
  })
  .strict();
export type SessionProfile = z.infer<typeof sessionProfileSchema>;

export const sessionScoreSchema = z
  .object({
    gradeBand: gradeBandSchema,
    perArea: z.array(perAreaScoreSchema),
    /** Composite proficiency θ on the 1..20 scale. */
    composite: z.number().min(1).max(20),
    compositeBracketLabel: z.string(),
    profile: sessionProfileSchema,
    /** Which tunable policy produced this (defaults now, admin-editable later). */
    policyId: z.string(),
    syntheticOnly: z.literal(true),
    validated: z.literal(false),
  })
  .strict();
export type SessionScore = z.infer<typeof sessionScoreSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Born-synthetic id (uuid when available), prefixed and PII-free. */
export function syntheticId(prefix: string): string {
  const raw =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID().replace(/-/g, '')
      : Math.random().toString(36).slice(2);
  return `${prefix}-SYN-${raw.slice(0, 10).toUpperCase()}`;
}

export function clampDifficulty(value: number): number {
  return Math.min(20, Math.max(1, value));
}
