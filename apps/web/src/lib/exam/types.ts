import { z } from 'zod';

/**
 * Shared shapes for a completed screening session and its stored record.
 * Metrics are harvested from each demo's on-screen `#mlist` panel, so a metric
 * map is open-ended (`M-*` ids → raw string, plus a best-effort numeric parse).
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
