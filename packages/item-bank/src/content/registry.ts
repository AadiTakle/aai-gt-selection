import { z } from 'zod';

import { lureClassSchema, TYPE_CODES } from '../enums';
import type { QuestionTypeCode } from '../enums';
import {
  analogyContentSchema,
  analogyRenderableSchema,
  matrixContentSchema,
  matrixRenderableSchema,
} from './fluid';
import {
  funcContentSchema,
  funcRenderableSchema,
  seriesContentSchema,
  seriesRenderableSchema,
} from './quant';
import {
  mazeContentSchema,
  mazeRenderableSchema,
  rollContentSchema,
  rollRenderableSchema,
} from './spatial';
import {
  clozeContentSchema,
  clozeRenderableSchema,
  relpairContentSchema,
  relpairRenderableSchema,
  senseContentSchema,
  senseRenderableSchema,
} from './verbal';

/**
 * Generic typed content for types that do not yet have a bespoke grammar. It is
 * a real structured schema (no untyped `params` blob) so the registry has one
 * entry per type (§6.2). Generic entries are NOT materialized into bank items:
 * we never invent an answer key for a type without a solver.
 */
function genericContentSchema<C extends QuestionTypeCode>(code: C) {
  return z
    .object({
      typeCode: z.literal(code),
      modelOnly: z.literal(true),
      prompt: z.string().min(1),
      stimulusRef: z.string().optional(),
      options: z
        .array(z.object({ label: z.string().min(1), lure: lureClassSchema }).strict())
        .optional(),
    })
    .strict();
}
function genericRenderableSchema<C extends QuestionTypeCode>(code: C) {
  return z.object({
    typeCode: z.literal(code),
    modelOnly: z.literal(true),
    prompt: z.string().min(1),
    stimulusRef: z.string().optional(),
    options: z.array(z.object({ label: z.string().min(1) })).optional(),
  });
}

interface ContentRegistryEntry {
  content: z.ZodTypeAny;
  renderable: z.ZodTypeAny;
}

/**
 * The type codes that have a bespoke content grammar + registered solver, and
 * are therefore materializable into keyed bank items. Everything else is a
 * model-only registry entry until a grammar/solver is added.
 */
export const MATERIALIZABLE_TYPE_CODES = [
  'VER-RELPAIR-01',
  'VER-CLOZE-01',
  'VER-SENSE-01',
  'QUANT-SERIES-01',
  'QUANT-FUNC-01',
  'FLU-MATRIX-01',
  'FLU-ANALOGY-01',
  'SPA-ROLL-01',
  'SPA-MAZE-01',
] as const satisfies readonly QuestionTypeCode[];

export type MaterializableTypeCode = (typeof MATERIALIZABLE_TYPE_CODES)[number];

const BESPOKE: Partial<Record<QuestionTypeCode, ContentRegistryEntry>> = {
  'VER-RELPAIR-01': { content: relpairContentSchema, renderable: relpairRenderableSchema },
  'VER-CLOZE-01': { content: clozeContentSchema, renderable: clozeRenderableSchema },
  'VER-SENSE-01': { content: senseContentSchema, renderable: senseRenderableSchema },
  'QUANT-SERIES-01': { content: seriesContentSchema, renderable: seriesRenderableSchema },
  'QUANT-FUNC-01': { content: funcContentSchema, renderable: funcRenderableSchema },
  'FLU-MATRIX-01': { content: matrixContentSchema, renderable: matrixRenderableSchema },
  'FLU-ANALOGY-01': { content: analogyContentSchema, renderable: analogyRenderableSchema },
  'SPA-ROLL-01': { content: rollContentSchema, renderable: rollRenderableSchema },
  'SPA-MAZE-01': { content: mazeContentSchema, renderable: mazeRenderableSchema },
};

/** One entry per type (§6.2): bespoke where available, typed-generic otherwise. */
export const ITEM_CONTENT_REGISTRY: Record<QuestionTypeCode, ContentRegistryEntry> = (() => {
  const out = {} as Record<QuestionTypeCode, ContentRegistryEntry>;
  for (const code of TYPE_CODES) {
    out[code] =
      BESPOKE[code] ??
      ({
        content: genericContentSchema(code),
        renderable: genericRenderableSchema(code),
      } satisfies ContentRegistryEntry);
  }
  return out;
})();

/**
 * `content` for a materialized bank item: a discriminated union over the
 * materializable type codes. A type must have a bespoke content schema (and a
 * solver) before a keyed item can exist for it.
 */
export const itemContentSchema = z.discriminatedUnion('typeCode', [
  relpairContentSchema,
  clozeContentSchema,
  senseContentSchema,
  seriesContentSchema,
  funcContentSchema,
  matrixContentSchema,
  analogyContentSchema,
  rollContentSchema,
  mazeContentSchema,
]);
export type ItemContent = z.infer<typeof itemContentSchema>;

/** The presentation subset served to the browser — never carries answer fields. */
export const renderableContentSchema = z.discriminatedUnion('typeCode', [
  relpairRenderableSchema,
  clozeRenderableSchema,
  senseRenderableSchema,
  seriesRenderableSchema,
  funcRenderableSchema,
  matrixRenderableSchema,
  analogyRenderableSchema,
  rollRenderableSchema,
  mazeRenderableSchema,
]);
export type RenderableContent = z.infer<typeof renderableContentSchema>;
