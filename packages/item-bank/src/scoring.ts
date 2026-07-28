import { z } from 'zod';

import { measurementIdSchema } from './enums';

/**
 * Scoring contract (§6.4). Scoring ALWAYS runs server-side using `answer` +
 * `scoring`; the client returns the child's raw selection/actions + telemetry,
 * never a verdict. Deterministic-first: prefer a computable key or solver;
 * quarantine model judges behind an explicit, labeled, research-only mode.
 */
export const scoringContractSchema = z.discriminatedUnion('mode', [
  // 1. Single/keyed selection compared to answer.correctIndex/Set. (Bucket A/B)
  z.object({ mode: z.literal('deterministic_key') }).strict(),

  // 2. Pure function scores a response against a computable ground truth:
  //    ordering adjacency, model-graph solve, etc. Partial credit. (A/B)
  z
    .object({
      mode: z.literal('computed_solver'),
      solverId: z.string().min(1), // registered pure scorer
      partialCredit: z.boolean().default(false),
    })
    .strict(),

  // 3. Open response scored by automated proxies vs a per-prompt bank:
  //    fluency count / category bins / inverse-frequency originality. (Bucket C)
  z
    .object({
      mode: z.literal('proxy_bank'),
      proxies: z.array(measurementIdSchema).min(1),
      responseBankId: z.string().min(1),
    })
    .strict(),

  // 4. RESEARCH ONLY — LLM / semantic-distance judge. Offline, synthetic only,
  //    never live child data without a privacy review. Never a live cut input.
  z
    .object({
      mode: z.literal('model_judge'),
      judgeRef: z.string().min(1),
      researchOnly: z.literal(true),
    })
    .strict(),
]);
export type ScoringContract = z.infer<typeof scoringContractSchema>;
