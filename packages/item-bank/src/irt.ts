import { z } from 'zod';

/**
 * IRT parameters (§6.6). On entry an item gets a PROVISIONAL `b` mapped from its
 * ordinal difficulty rung; `a`/`c` are placeholders until a pilot calibrates
 * them (~200+ responses/item). `provisional` MUST stay `true` for any item whose
 * envelope has `validated: false`. A reporting guard must refuse to treat a
 * provisional `irt` as calibrated.
 */
export const irtParametersSchema = z
  .object({
    a: z.number().positive(),
    b: z.number(),
    c: z.number().min(0).max(1),
    model: z.enum(['Rasch', '1PL', '2PL', '3PL']),
    provisional: z.boolean().default(true),
  })
  .strict();
export type IrtParameters = z.infer<typeof irtParametersSchema>;

/**
 * Deterministic, monotonic map from a generator difficulty rung (1..20) to a
 * provisional IRT `b`. This is a DESIGN seed, never a calibration.
 */
export function provisionalIrtFromLevel(difficultyLevel: number): IrtParameters {
  const b = Math.round((difficultyLevel - 3) * 0.4 * 100) / 100;
  return { a: 1.0, b, c: 0, model: '2PL', provisional: true };
}
