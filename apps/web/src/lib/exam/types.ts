import { z } from 'zod';

/**
 * Shared shapes for a completed screening session and its stored record.
 *
 * Two shapes are supported:
 *  - LEGACY: a fixed-length battery whose per-item metrics were scraped from the
 *    demo DOM (kept for backward compatibility of the in-memory store/tests).
 *  - ADAPTIVE TRACE (current): the full adaptive trace produced by the real
 *    engine + server verification — items served (no keys), server-scored items
 *    (raw response + numeric metrics + correctness/score/difficulty), telemetry,
 *    and the client-computed score (the server recomputes it authoritatively with
 *    `@gt-selection/exam-scoring`).
 *
 * Everything is born-synthetic (`syntheticOnly=true`, `validated=false`) and the
 * store is in-memory only (see the route). The ratified target is Supabase.
 */

const examDomainSchema = z.enum(['fluid_reasoning', 'verbal', 'quantitative', 'spatial']);

// ---------------------------------------------------------------------------
// LEGACY shape (fixed battery of DOM-scraped metrics). Retained for the
// in-memory store + existing tests.
// ---------------------------------------------------------------------------

export const metricMapSchema = z.record(z.string(), z.union([z.string(), z.number()]));

export const examItemResultSchema = z
  .object({
    typeCode: z.string().min(1),
    domain: z.string().min(1),
    skipped: z.boolean(),
    metrics: metricMapSchema,
    accuracy: z.number().min(0).max(1).nullable(),
    difficultyReached: z.number().nonnegative().nullable(),
  })
  .strict();

export const examSessionInputSchema = z
  .object({
    sessionId: z.string().min(1),
    participantCode: z.string().regex(/^PART-SYN-[A-Z0-9-]+$/),
    studentName: z.string().min(1),
    ageBand: z.string().min(1),
    startedAt: z.string().min(1),
    finishedAt: z.string().min(1),
    items: z.array(examItemResultSchema).min(1),
    syntheticOnly: z.literal(true),
  })
  .strict();

export const examSummarySchema = z
  .object({
    overallAccuracy: z.number().min(0).max(1).nullable(),
    perDomainAccuracy: z.record(z.string(), z.number()),
    meanDifficultyReached: z.number().nonnegative().nullable(),
    itemsAnswered: z.number().int().nonnegative(),
    itemsSkipped: z.number().int().nonnegative(),
  })
  .strict();

export const examSessionRecordSchema = examSessionInputSchema.extend({
  summary: examSummarySchema,
});

export type MetricMap = z.infer<typeof metricMapSchema>;
export type ExamItemResult = z.infer<typeof examItemResultSchema>;
export type ExamSessionInput = z.infer<typeof examSessionInputSchema>;
export type ExamSummary = z.infer<typeof examSummarySchema>;
export type ExamSessionRecord = z.infer<typeof examSessionRecordSchema>;

/** Compute the session summary from per-item results (server-authoritative). */
export function summarize(items: ExamItemResult[]): ExamSummary {
  const answered = items.filter((i) => !i.skipped);
  const accs = answered.map((i) => i.accuracy).filter((a): a is number => a != null);
  const diffs = answered.map((i) => i.difficultyReached).filter((d): d is number => d != null);

  const perDomain: Record<string, { sum: number; n: number }> = {};
  for (const item of answered) {
    if (item.accuracy == null) continue;
    const bucket = (perDomain[item.domain] ??= { sum: 0, n: 0 });
    bucket.sum += item.accuracy;
    bucket.n += 1;
  }
  const perDomainAccuracy: Record<string, number> = {};
  for (const [domain, { sum, n }] of Object.entries(perDomain)) {
    perDomainAccuracy[domain] = n > 0 ? sum / n : 0;
  }

  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

  return {
    overallAccuracy: mean(accs),
    perDomainAccuracy,
    meanDifficultyReached: mean(diffs),
    itemsAnswered: answered.length,
    itemsSkipped: items.length - answered.length,
  };
}

// ---------------------------------------------------------------------------
// ADAPTIVE TRACE shape (current runner on the real engine + scorer).
// Lenient by design: it is a storage + recompute envelope, not a re-validation
// of the engine's internal types (telemetry shapes vary per demo). It still
// enforces the security/born-synthetic invariants.
// ---------------------------------------------------------------------------

/** A served item as the browser saw it — never any answer/scoring/provenance. */
export const servedItemTraceSchema = z
  .object({
    itemId: z.string().min(1),
    typeCode: z.string().min(1),
    domain: examDomainSchema,
    difficulty: z.number(),
    ageBands: z.array(z.string()),
    content: z.record(z.string(), z.unknown()),
    syntheticOnly: z.literal(true),
    validated: z.literal(false),
  })
  .strip();

/** A server-scored item: raw response + numeric metrics + server correctness. */
export const scoredItemTraceSchema = z
  .object({
    itemId: z.string().min(1),
    typeCode: z.string().min(1),
    domain: examDomainSchema,
    response: z.unknown().optional(),
    metrics: z.record(z.string(), z.number()),
    telemetry: z.array(z.unknown()).optional(),
    correct: z.boolean(),
    score: z.number(),
    difficulty: z.number(),
    skipped: z.boolean().optional(),
  })
  .strip();

export const examAdaptiveTracePayloadSchema = z
  .object({
    sessionId: z.string().min(1),
    participantCode: z.string().regex(/^PART-SYN-[A-Z0-9-]+$/),
    studentName: z.string().min(1),
    gradeBand: z.enum(['K-1', '2-3', '4-5', '6-8']),
    startedAt: z.string().min(1),
    finishedAt: z.string().min(1),
    itemsServed: z.array(servedItemTraceSchema).min(1),
    scoredItems: z.array(scoredItemTraceSchema).min(1),
    telemetry: z.array(z.unknown()).default([]),
    /** Client-computed score; echoed only. The server recomputes authoritatively. */
    score: z.unknown().optional(),
    syntheticOnly: z.literal(true),
    validated: z.literal(false),
  })
  .strip();

export type ServedItemTrace = z.infer<typeof servedItemTraceSchema>;
export type ScoredItemTrace = z.infer<typeof scoredItemTraceSchema>;
export type ExamAdaptiveTracePayload = z.infer<typeof examAdaptiveTracePayloadSchema>;

/**
 * Continuity summary from the adaptive trace (mirrors the legacy `summarize` so
 * old readers still work). Accuracy is the mean server `score`; difficulty reach
 * is the mean difficulty of correctly-answered items.
 */
export function summarizeScored(items: readonly ScoredItemTrace[]): ExamSummary {
  const answered = items.filter((i) => !i.skipped);
  const accs = answered.map((i) => i.score);
  const diffs = answered.filter((i) => i.correct).map((i) => i.difficulty);

  const perDomain: Record<string, { sum: number; n: number }> = {};
  for (const item of answered) {
    const bucket = (perDomain[item.domain] ??= { sum: 0, n: 0 });
    bucket.sum += item.score;
    bucket.n += 1;
  }
  const perDomainAccuracy: Record<string, number> = {};
  for (const [domain, { sum, n }] of Object.entries(perDomain)) {
    perDomainAccuracy[domain] = n > 0 ? sum / n : 0;
  }

  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

  return {
    overallAccuracy: mean(accs),
    perDomainAccuracy,
    meanDifficultyReached: mean(diffs),
    itemsAnswered: answered.length,
    itemsSkipped: items.length - answered.length,
  };
}
