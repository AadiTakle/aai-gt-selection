import { z } from 'zod';

import { lureClassSchema } from '../enums';
import { tokenSchema } from './primitives';

/* ────────────────────────── VER-RELPAIR-01 (§8.1) ─────────────────────────
 * Relation Match — pick the pair related the same way as the stem pair.
 * deterministic_key. The correct option is keyed by its lure=`correct` tag;
 * the renderable subset drops every option's lure class. */
export const relpairContentSchema = z
  .object({
    typeCode: z.literal('VER-RELPAIR-01'),
    presentation: z.enum(['picture', 'word']),
    relation: z.string().min(1),
    stemPair: z.tuple([tokenSchema, tokenSchema]),
    options: z
      .array(z.object({ pair: z.tuple([tokenSchema, tokenSchema]), lure: lureClassSchema }).strict())
      .min(3)
      .max(4),
    frequencyBand: z.int().min(1).max(7),
  })
  .strict();
export const relpairRenderableSchema = z.object({
  typeCode: z.literal('VER-RELPAIR-01'),
  presentation: z.enum(['picture', 'word']),
  relation: z.string().min(1),
  stemPair: z.tuple([tokenSchema, tokenSchema]),
  options: z.array(z.object({ pair: z.tuple([tokenSchema, tokenSchema]) })),
  frequencyBand: z.int().min(1).max(7),
});

/* ────────────────────────── VER-CLOZE-01 (§8.2) ───────────────────────────
 * Fill the Gap — pick the token that completes the sentence. deterministic_key.
 * A global_fit gap with a local_fit lure is the discriminating case. */
export const clozeContentSchema = z
  .object({
    typeCode: z.literal('VER-CLOZE-01'),
    mode: z.enum(['cloze', 'arrange']),
    presentation: z.enum(['picture', 'word']),
    sentenceFrame: z.string().min(1), // gap marked with "___"
    gapType: z.enum(['local_fit', 'global_fit']),
    options: z
      .array(z.object({ token: tokenSchema, fit: lureClassSchema }).strict())
      .min(2)
      .max(5),
    targetFrequencyBand: z.int().min(1).max(7),
    syntacticComplexity: z.int().min(1).max(5),
  })
  .strict();
export const clozeRenderableSchema = z.object({
  typeCode: z.literal('VER-CLOZE-01'),
  mode: z.enum(['cloze', 'arrange']),
  presentation: z.enum(['picture', 'word']),
  sentenceFrame: z.string().min(1),
  gapType: z.enum(['local_fit', 'global_fit']),
  options: z.array(z.object({ token: tokenSchema })),
  targetFrequencyBand: z.int().min(1).max(7),
  syntacticComplexity: z.int().min(1).max(5),
});

/* ────────────────────────── VER-SENSE-01 (§8.3) ───────────────────────────
 * Sentence Sense — drag word cards into a sensible order. computed_solver,
 * partial credit. sensibleOrder/absurdLure are the answer and are SERVER-ONLY;
 * the renderable subset exposes only the cards. */
export const senseContentSchema = z
  .object({
    typeCode: z.literal('VER-SENSE-01'),
    cards: z.array(tokenSchema).min(3).max(7),
    sensibleOrder: z.array(z.int().nonnegative()), // canonical (answer, server-only)
    absurdLure: z.array(z.int().nonnegative()), // grammatical-but-implausible ordering
  })
  .strict();
export const senseRenderableSchema = z.object({
  typeCode: z.literal('VER-SENSE-01'),
  cards: z.array(tokenSchema),
});
