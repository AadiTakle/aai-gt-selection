import { z } from 'zod';

import { numericOptionSchema, numericOptionRenderableSchema } from './primitives';

/* ────────────────────────── QUANT-SERIES-01 ───────────────────────────────
 * Pattern Steps — pick the next quantity that continues the pattern.
 * deterministic_key. The rule (step/ratio) is NOT stored in content; a
 * registered solver re-derives it from the visible sequence. */
export const seriesContentSchema = z
  .object({
    typeCode: z.literal('QUANT-SERIES-01'),
    presentation: z.enum(['dots', 'numeral', 'figure']),
    sequence: z.array(z.number()).min(4), // visible terms up to (not incl.) the gap
    options: z.array(numericOptionSchema).min(2).max(5),
  })
  .strict();
export const seriesRenderableSchema = z.object({
  typeCode: z.literal('QUANT-SERIES-01'),
  presentation: z.enum(['dots', 'numeral', 'figure']),
  sequence: z.array(z.number()),
  options: z.array(numericOptionRenderableSchema),
});

/* ────────────────────────── QUANT-FUNC-01 ─────────────────────────────────
 * Machine Rule — infer the machine's rule from in/out examples, pick the output
 * for a query input. deterministic_key; solver re-derives the linear rule. */
export const funcContentSchema = z
  .object({
    typeCode: z.literal('QUANT-FUNC-01'),
    examples: z.array(z.object({ in: z.number(), out: z.number() }).strict()).min(2).max(4),
    query: z.number(),
    options: z.array(numericOptionSchema).min(2).max(5),
  })
  .strict();
export const funcRenderableSchema = z.object({
  typeCode: z.literal('QUANT-FUNC-01'),
  examples: z.array(z.object({ in: z.number(), out: z.number() }).strict()),
  query: z.number(),
  options: z.array(numericOptionRenderableSchema),
});
