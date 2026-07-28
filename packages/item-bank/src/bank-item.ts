import { z } from 'zod';

import { answerKeySchema } from './answer';
import { itemContentSchema, renderableContentSchema } from './content/registry';
import {
  ageBandSchema,
  examDomainSchema,
  questionTypeCodeSchema,
} from './enums';
import { DOMAIN_BY_TYPE } from './generated/type-registry.generated';
import { irtParametersSchema } from './irt';
import { provenanceSchema } from './provenance';
import { scoringContractSchema } from './scoring';

/**
 * Bank-side item (§6.1). SERVER ONLY. Carries the typed content, the answer key,
 * the scoring contract, provisional IRT, and provenance. `syntheticOnly` and
 * `validated` are literal guards: a generated bank is synthetic research content,
 * never calibrated live items (RES-012, RES-013).
 */
export const bankItemSchema = z
  .object({
    itemId: z.uuid(),
    typeCode: questionTypeCodeSchema,
    domain: examDomainSchema,
    ageBands: z.array(ageBandSchema).min(1),

    // Difficulty: ordinal design rung vs provisional IRT (kept separate, §6.6).
    difficultyLevel: z.int().min(1).max(20), // generator rung — NOT calibrated
    irt: irtParametersSchema, // provisional; b seeded from level until piloted

    demoPath: z.string().min(1), // renderer

    content: itemContentSchema, // §6.2 typed per type
    answer: answerKeySchema, // §6.3 server-only
    scoring: scoringContractSchema, // §6.4
    provenance: provenanceSchema, // §6.5

    syntheticOnly: z.literal(true),
    validated: z.literal(false),
  })
  .strict()
  .superRefine((item, ctx) => {
    if (item.content.typeCode !== item.typeCode) {
      ctx.addIssue({
        code: 'custom',
        message: `content.typeCode (${item.content.typeCode}) must equal item.typeCode (${item.typeCode})`,
        path: ['content', 'typeCode'],
      });
    }
    const expectedDomain = DOMAIN_BY_TYPE[item.typeCode];
    if (item.domain !== expectedDomain) {
      ctx.addIssue({
        code: 'custom',
        message: `domain (${item.domain}) must equal DOMAIN_BY_TYPE[${item.typeCode}] (${expectedDomain})`,
        path: ['domain'],
      });
    }
    if (item.scoring.mode === 'deterministic_key') {
      const hasSelection =
        item.answer.correctIndex !== undefined || item.answer.correctSet !== undefined;
      if (!hasSelection) {
        ctx.addIssue({
          code: 'custom',
          message: 'deterministic_key scoring requires answer.correctIndex or answer.correctSet',
          path: ['answer'],
        });
      }
    }
    if (item.scoring.mode === 'computed_solver' && item.answer.canonicalSolution === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'computed_solver scoring requires answer.canonicalSolution',
        path: ['answer'],
      });
    }
    // Provisional IRT must stay provisional while validated === false.
    if (item.validated === false && item.irt.provisional !== true) {
      ctx.addIssue({
        code: 'custom',
        message: 'irt.provisional must be true while validated is false',
        path: ['irt', 'provisional'],
      });
    }
  });
export type BankItem = z.infer<typeof bankItemSchema>;

/**
 * Client-side item (§6.1): content to render, with NO answer / scoring / irt /
 * provenance leak. This is the ONLY shape that may be served to the browser.
 */
export const servedItemV2Schema = z
  .object({
    itemId: z.uuid(),
    typeCode: questionTypeCodeSchema,
    domain: examDomainSchema,
    difficultyLevel: z.int().min(1).max(20),
    demoPath: z.string().min(1),
    content: renderableContentSchema, // §6.2 — the presentation subset only
  })
  .strict();
export type ServedItemV2 = z.infer<typeof servedItemV2Schema>;

/**
 * Project a server-side bank item to its client-safe served form. The
 * renderable content schema strips every answer-bearing field (option lure/tag,
 * sensibleOrder, etc.); answer/scoring/irt/provenance/ageBands are dropped.
 */
export function toServedItem(item: BankItem): ServedItemV2 {
  const renderable = renderableContentSchema.parse(item.content);
  return servedItemV2Schema.parse({
    itemId: item.itemId,
    typeCode: item.typeCode,
    domain: item.domain,
    difficultyLevel: item.difficultyLevel,
    demoPath: item.demoPath,
    content: renderable,
  });
}

/**
 * Keys that must NEVER appear anywhere in a client-served payload. Used by the
 * leak guard and the served-file scan test.
 */
export const FORBIDDEN_CLIENT_KEYS = [
  'answer',
  'scoring',
  'irt',
  'provenance',
  'correctIndex',
  'correctSet',
  'canonicalSolution',
  'distractorRationales',
  'lure',
  'fit',
  'tag',
  'role',
  'sensibleOrder',
  'absurdLure',
  'validated',
] as const;

/** Recursively assert an object contains none of the forbidden answer keys. */
export function findAnswerLeak(value: unknown, path = '$'): string[] {
  const hits: string[] = [];
  if (Array.isArray(value)) {
    value.forEach((v, i) => hits.push(...findAnswerLeak(v, `${path}[${i}]`)));
  } else if (value !== null && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if ((FORBIDDEN_CLIENT_KEYS as readonly string[]).includes(k)) {
        hits.push(`${path}.${k}`);
      }
      hits.push(...findAnswerLeak(v, `${path}.${k}`));
    }
  }
  return hits;
}
