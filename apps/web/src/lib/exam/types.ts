import { z } from 'zod';

import {
  gradeBandSchema,
  itemResultSchema,
  servedItemSchema,
  sessionScoreSchema,
  telemetryEventSchema,
  type ItemResult,
} from './contract';

/**
 * Shared shapes for a completed screening session and its stored record.
 *
 * Two shapes are supported:
 *  - LEGACY: a fixed-length battery whose per-item metrics were scraped from the
 *    demo DOM (kept for backward compatibility of the in-memory store/tests).
 *  - TRACE (current): the full adaptive trace — items served, raw answers +
 *    structured numeric metrics + telemetry, and the computed score/profile.
 *
 * Everything is born-synthetic (`syntheticOnly=true`, `validated=false`) and the
 * store is in-memory only (see the route). The ratified target is Supabase.
 */

export const metricMapSchema = z.record(z.string(), z.union([z.string(), z.number()]));

export const examItemResultSchema = z
  .object({
    typeCode: z.string().min(1),
    domain: z.string().min(1),
    skipped: z.boolean(),
    /** Raw + parsed metric values scraped from the demo (empty if unavailable). */
    metrics: metricMapSchema,
    /** Convenience: parsed accuracy 0..1 (from M-ACC) when available. */
    accuracy: z.number().min(0).max(1).nullable(),
    /** Convenience: max difficulty level reached (from M-DIFFREACH) when available. */
    difficultyReached: z.number().nonnegative().nullable(),
  })
  .strict();

/** What the client sends on completion (summary is computed server-side). */
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

/** The stored record = input + server-computed summary. */
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
// TRACE shape (current adaptive runner) — the full session trace.
// ---------------------------------------------------------------------------

/** What the client POSTs on completion: the whole adaptive trace. */
export const examTracePayloadSchema = z
  .object({
    sessionId: z.string().min(1),
    participantCode: z.string().regex(/^PART-SYN-[A-Z0-9-]+$/),
    studentName: z.string().min(1),
    gradeBand: gradeBandSchema,
    ageBand: z.string().min(1).optional(),
    startedAt: z.string().min(1),
    finishedAt: z.string().min(1),
    /** Items served (no answer/scoring — servedItemSchema). */
    itemsServed: z.array(servedItemSchema).min(1),
    /** Raw answers + structured metrics + per-item telemetry. */
    results: z.array(itemResultSchema).min(1),
    /** Flattened session telemetry (also carried per-item). */
    telemetry: z.array(telemetryEventSchema),
    /** Client-computed score/profile (the server recomputes authoritatively). */
    score: sessionScoreSchema,
    syntheticOnly: z.literal(true),
    validated: z.literal(false),
  })
  .strict();

/** Stored trace record = payload + server-recomputed outcome + a legacy summary. */
export const examTraceRecordSchema = examTracePayloadSchema.extend({
  outcome: sessionScoreSchema,
  summary: examSummarySchema,
});

export type ExamTracePayload = z.infer<typeof examTracePayloadSchema>;
export type ExamTraceRecord = z.infer<typeof examTraceRecordSchema>;

/**
 * Server-side continuity summary derived from the rich trace (mirrors the legacy
 * `summarize` so old readers still work). Accuracy/difficulty come from the
 * structured numeric metrics (M-ACC, M-DIFFREACH), not DOM scraping.
 */
export function summarizeResults(results: ItemResult[]): ExamSummary {
  const answered = results.filter((i) => !i.skipped);
  const accs = answered
    .map((i) => i.metrics['M-ACC'])
    .filter((a): a is number => typeof a === 'number' && Number.isFinite(a));
  const diffs = answered
    .map((i) => i.metrics['M-DIFFREACH'])
    .filter((d): d is number => typeof d === 'number' && Number.isFinite(d));

  const perDomain: Record<string, { sum: number; n: number }> = {};
  for (const item of answered) {
    const acc = item.metrics['M-ACC'];
    if (typeof acc !== 'number' || !Number.isFinite(acc)) continue;
    const bucket = (perDomain[item.domain] ??= { sum: 0, n: 0 });
    bucket.sum += acc;
    bucket.n += 1;
  }
  const perDomainAccuracy: Record<string, number> = {};
  for (const [domain, { sum, n }] of Object.entries(perDomain)) {
    perDomainAccuracy[domain] = n > 0 ? sum / n : 0;
  }

  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

  return {
    overallAccuracy: avg(accs),
    perDomainAccuracy,
    meanDifficultyReached: avg(diffs),
    itemsAnswered: answered.length,
    itemsSkipped: results.length - answered.length,
  };
}
