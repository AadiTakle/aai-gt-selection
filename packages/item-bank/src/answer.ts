import { z } from 'zod';

import { lureClassSchema } from './enums';

/**
 * Answer key + distractor taxonomy (§6.3). SERVER-ONLY: this object never
 * appears on a served (client) item. It supports both selection items
 * (correctIndex / correctSet into content.options) and constructed/interactive
 * items (canonicalSolution the registered solver checks against).
 */
export const answerKeySchema = z
  .object({
    // Selection items: index/set into content.options.
    correctIndex: z.int().nonnegative().optional(),
    correctSet: z.array(z.int().nonnegative()).optional(),
    // Constructed/interactive items: a canonical solution the solver checks against.
    canonicalSolution: z.unknown().optional(),
    // Per-option lure class, aligned to content.options order (feeds M-LURETYPE).
    distractorRationales: z.array(lureClassSchema).optional(),
  })
  .strict()
  .refine(
    (a) =>
      a.correctIndex !== undefined ||
      a.correctSet !== undefined ||
      a.canonicalSolution !== undefined,
    { message: 'answer key must specify correctIndex, correctSet, or canonicalSolution' },
  );
export type AnswerKey = z.infer<typeof answerKeySchema>;
