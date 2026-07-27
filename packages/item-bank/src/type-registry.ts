import { z } from 'zod';

import { MATERIALIZABLE_TYPE_CODES } from './content/registry';
import {
  ageBandSchema,
  examDomainSchema,
  measurementIdSchema,
  questionTypeCodeSchema,
} from './enums';
import type { QuestionTypeCode } from './enums';
import { RAW_TYPE_MODELS, TYPE_CODES } from './generated/type-registry.generated';

/**
 * Item MODEL (per §5): the per-type recipe metadata carried into the bank from
 * master_types.jsonl. A model is not an item instance; it has no answer key.
 * `hasSolver` marks the types with a bespoke grammar + registered solver (and
 * therefore materialized keyed instances). Born-synthetic research metadata.
 */
export const itemModelSchema = z
  .object({
    typeCode: questionTypeCodeSchema,
    domain: examDomainSchema,
    name: z.string().min(1),
    ageBands: z.array(ageBandSchema).min(1),
    subconstructs: z.array(z.string()),
    measurements: z.array(measurementIdSchema),
    difficultyLevers: z.string(),
    aigCloneable: z.enum(['high', 'med', 'low']),
    adaptiveWorksWell: z.enum(['high', 'med', 'low']),
    demoPath: z.string().min(1),
    hasSolver: z.boolean(),
    syntheticOnly: z.literal(true),
  })
  .strict();
export type ItemModel = z.infer<typeof itemModelSchema>;

const materializable = new Set<string>(MATERIALIZABLE_TYPE_CODES);

/** The 66 validated item models, keyed by type code. */
export const ITEM_MODELS: Record<QuestionTypeCode, ItemModel> = (() => {
  const out = {} as Record<QuestionTypeCode, ItemModel>;
  for (const code of TYPE_CODES) {
    const raw = RAW_TYPE_MODELS[code];
    out[code] = itemModelSchema.parse({
      typeCode: raw.typeCode,
      domain: raw.domain,
      name: raw.name,
      ageBands: raw.ageBands,
      subconstructs: raw.subconstructs,
      measurements: raw.measurements,
      difficultyLevers: raw.difficultyLevers,
      aigCloneable: raw.aigCloneable,
      adaptiveWorksWell: raw.adaptiveWorksWell,
      demoPath: raw.demoPath,
      hasSolver: materializable.has(code),
      syntheticOnly: true,
    });
  }
  return out;
})();

export const ALL_ITEM_MODELS: ItemModel[] = TYPE_CODES.map((c) => ITEM_MODELS[c]);
