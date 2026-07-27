import { z } from 'zod';

import { lureClassSchema } from '../enums';
import { figuralAttrSchema } from './primitives';

/* ────────────────────────── FLU-MATRIX-01 ─────────────────────────────────
 * Machine Matrix — tap the tile that completes the figural matrix.
 * deterministic_key. Exactly one grid cell is null (the query); each option is
 * a candidate tile whose lure class marks it correct or rule-violating. The
 * solver re-derives the missing cell from row/column progressions. */
export const matrixContentSchema = z
  .object({
    typeCode: z.literal('FLU-MATRIX-01'),
    size: z.int().min(2).max(3),
    grid: z.array(z.array(figuralAttrSchema.nullable())), // one cell is null
    options: z
      .array(z.object({ attr: figuralAttrSchema, lure: lureClassSchema }).strict())
      .min(3)
      .max(5),
  })
  .strict();
export const matrixRenderableSchema = z.object({
  typeCode: z.literal('FLU-MATRIX-01'),
  size: z.int().min(2).max(3),
  grid: z.array(z.array(figuralAttrSchema.nullable())),
  options: z.array(z.object({ attr: figuralAttrSchema })),
});

/* ────────────────────────── FLU-ANALOGY-01 ────────────────────────────────
 * Shape Morph — A:B :: C:? apply the A→B transform to C. deterministic_key;
 * solver infers the (shapeShift, colorShift, countDelta) transform. */
export const analogyContentSchema = z
  .object({
    typeCode: z.literal('FLU-ANALOGY-01'),
    a: figuralAttrSchema,
    b: figuralAttrSchema,
    c: figuralAttrSchema,
    options: z
      .array(z.object({ attr: figuralAttrSchema, lure: lureClassSchema }).strict())
      .min(3)
      .max(5),
  })
  .strict();
export const analogyRenderableSchema = z.object({
  typeCode: z.literal('FLU-ANALOGY-01'),
  a: figuralAttrSchema,
  b: figuralAttrSchema,
  c: figuralAttrSchema,
  options: z.array(z.object({ attr: figuralAttrSchema })),
});
