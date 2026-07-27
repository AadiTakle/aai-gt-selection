import { z } from 'zod';

/**
 * Provenance & validation record (§6.5). Every item records how it was made
 * (grammar + seed, or model + prompt hash) and which validator checks it passed.
 * Provenance is first-class so a synthetic bank is auditable and reproducible.
 */
export const validatorCheckSchema = z.enum([
  'unique_answer', // a solver confirms exactly one defensible key
  'key_matches_solver', // proposed key == solver's answer
  'lure_taxonomy_ok', // every distractor has a valid, distinct lure class
  'reading_load_ok', // within age-band frequency/length budget
  'frequency_band_ok', // target/word frequencies in declared band
  'bias_screen_ok', // construct-irrelevant / cultural/SES screen
  'ip_novelty_ok', // not a copy of a copyrighted item
]);
export type ValidatorCheck = z.infer<typeof validatorCheckSchema>;

export const provenanceSchema = z
  .object({
    generator: z.enum(['grammar', 'llm', 'human', 'hybrid']),
    generatorRef: z.string().min(1), // grammarId@version | model id
    seed: z.string().optional(), // grammar reproducibility
    promptHash: z.string().optional(), // llm reproducibility
    sourceDemo: z.string().optional(), // demo the grammar was extracted from
    validator: z.array(
      z
        .object({
          check: validatorCheckSchema,
          status: z.enum(['pass', 'fail', 'warn', 'skipped']),
          detail: z.string().optional(),
        })
        .strict(),
    ),
    humanReview: z
      .object({
        reviewer: z.string(),
        verdict: z.enum(['approved', 'rejected', 'revise']),
        date: z.iso.datetime({ offset: true }),
      })
      .strict()
      .optional(),
  })
  .strict();
export type Provenance = z.infer<typeof provenanceSchema>;
