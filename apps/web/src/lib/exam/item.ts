import { z } from 'zod';

/**
 * Structure-agnostic item model for the custom cognitive screener prototype.
 *
 * This is a minimal, runtime-facing subset of the authoritative item contract in
 * `docs/architecture/EXAM_ITEM_SCHEMA_SPEC.md` (R11, R5, H1, H4, H10). It encodes
 * the two governance-critical separations from that spec:
 *
 *   1. Bank item (server/module side) carries `content` + `answer` + `scoring` +
 *      `provenance`. The `answer` key and per-option `lure` tags never leave here.
 *   2. Served item (what the player/child sees) is a renderable subset with NO
 *      answer, scoring, or lure — see {@link toServedItem}. This closes the
 *      "key-in-browser" gap the spec §3 flags.
 *
 * Every item is born-synthetic: `syntheticOnly: true`, `validated: false`
 * (D-006, R9, RES-012/RES-013). A large generated bank is synthetic research
 * content, never calibrated live items.
 *
 * `renderKind` is the PLAYER dispatch key (how to draw + collect a response). It
 * is deliberately NOT the sequencing structure — item order/routing is owned by a
 * swappable {@link Sequencer} (see `sequencer.ts`), which stays unapproved and
 * pluggable per the structure-agnostic constraint.
 */

export const examDomainSchema = z.enum([
  'fluid_reasoning',
  'verbal',
  'quantitative',
  'spatial',
]);
export type ExamDomain = z.infer<typeof examDomainSchema>;

/** Distractor lure taxonomy — a subset of EXAM_ITEM_SCHEMA_SPEC §6.3. Server-only. */
export const lureClassSchema = z.enum([
  'correct',
  'associate',
  'surface_match',
  'reversed_relation',
  'local_fit',
  'global_mismatch',
  'rule_violation',
  'near_order',
  'distractor_other',
]);
export type LureClass = z.infer<typeof lureClassSchema>;

/** How the player renders + harvests an item. NOT the exam's sequencing structure. */
export const renderKindSchema = z.enum(['single-select', 'embedded-demo']);
export type RenderKind = z.infer<typeof renderKindSchema>;

// --- Single-select typed content (author/bank side incl. lure tags) ----------

export const singleSelectOptionSchema = z
  .object({
    label: z.string().min(1),
    /** Per-option lure class (feeds M-LURETYPE). Never served to the browser. */
    lure: lureClassSchema,
  })
  .strict();

export const singleSelectContentSchema = z
  .object({
    typeCode: z.string().min(1),
    /** Instruction/question shown to the child. */
    prompt: z.string().min(1),
    /** Optional stimulus line (e.g. the stem pair or sentence frame). */
    stimulus: z.string().optional(),
    options: z.array(singleSelectOptionSchema).min(2).max(6),
  })
  .strict();
export type SingleSelectContent = z.infer<typeof singleSelectContentSchema>;

/** Renderable subset served to the browser — identical MINUS the lure tags. */
export const singleSelectRenderableSchema = z
  .object({
    typeCode: z.string().min(1),
    prompt: z.string().min(1),
    stimulus: z.string().optional(),
    options: z.array(z.object({ label: z.string().min(1) }).strict()).min(2).max(6),
  })
  .strict();
export type SingleSelectRenderable = z.infer<typeof singleSelectRenderableSchema>;

// --- Answer key + scoring contract (server-only) -----------------------------

export const answerKeySchema = z
  .object({
    correctIndex: z.number().int().nonnegative().optional(),
    correctSet: z.array(z.number().int().nonnegative()).optional(),
    canonicalSolution: z.unknown().optional(),
    /** Aligned to content.options order (feeds M-LURETYPE). */
    distractorRationales: z.array(lureClassSchema).optional(),
  })
  .strict();
export type AnswerKey = z.infer<typeof answerKeySchema>;

/**
 * Scoring contract. This prototype implements the deterministic modes; the full
 * four-mode taxonomy (proxy_bank, model_judge) lives in EXAM_ITEM_SCHEMA_SPEC §6.4
 * and is out of scope for a runnable synthetic demo.
 */
export const scoringContractSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('deterministic_key') }).strict(),
  z
    .object({
      mode: z.literal('computed_solver'),
      solverId: z.string().min(1),
      partialCredit: z.boolean().default(false),
    })
    .strict(),
]);
export type ScoringContract = z.infer<typeof scoringContractSchema>;

// --- Provenance --------------------------------------------------------------

export const provenanceSchema = z
  .object({
    generator: z.enum(['grammar', 'llm', 'human', 'hybrid']),
    generatorRef: z.string().min(1),
    seed: z.string().optional(),
    promptHash: z.string().optional(),
    validator: z
      .array(
        z
          .object({
            check: z.string().min(1),
            status: z.enum(['pass', 'fail', 'warn', 'skipped']),
            detail: z.string().optional(),
          })
          .strict(),
      )
      .default([]),
  })
  .strict();
export type Provenance = z.infer<typeof provenanceSchema>;

// --- Bank items (server/module side) -----------------------------------------

const bankItemBase = {
  itemId: z.string().min(1),
  typeCode: z.string().min(1),
  domain: examDomainSchema,
  title: z.string().min(1),
  blurb: z.string().min(1),
  /** Ordinal design rung — NOT calibrated difficulty (spec §6.6). */
  difficultyLevel: z.number().int().min(1).max(20),
  syntheticOnly: z.literal(true),
  validated: z.literal(false),
};

export const bankSingleSelectSchema = z
  .object({
    ...bankItemBase,
    renderKind: z.literal('single-select'),
    content: singleSelectContentSchema,
    answer: answerKeySchema,
    scoring: scoringContractSchema,
    provenance: provenanceSchema,
  })
  .strict();
export type BankSingleSelect = z.infer<typeof bankSingleSelectSchema>;

/**
 * Thin bank entry for a self-contained iframe demo (the existing runtime). The
 * demo self-renders and self-scores in-frame; the harvest layer reads its metrics.
 * No `answer`/`scoring` here because the key lives inside the demo (a gap the spec
 * flags; unchanged for these legacy demos, resolved for native items above).
 */
export const bankEmbeddedDemoSchema = z
  .object({
    ...bankItemBase,
    renderKind: z.literal('embedded-demo'),
    demoPath: z.string().min(1),
  })
  .strict();
export type BankEmbeddedDemo = z.infer<typeof bankEmbeddedDemoSchema>;

export const bankItemSchema = z.discriminatedUnion('renderKind', [
  bankSingleSelectSchema,
  bankEmbeddedDemoSchema,
]);
export type BankItem = z.infer<typeof bankItemSchema>;

// --- Served items (client/player side) — NO answer/scoring/lure --------------

export interface ServedSingleSelect {
  renderKind: 'single-select';
  itemId: string;
  typeCode: string;
  domain: ExamDomain;
  title: string;
  blurb: string;
  difficultyLevel: number;
  content: SingleSelectRenderable;
}

export interface ServedEmbeddedDemo {
  renderKind: 'embedded-demo';
  itemId: string;
  typeCode: string;
  domain: ExamDomain;
  title: string;
  blurb: string;
  difficultyLevel: number;
  demoPath: string;
}

export type ServedItem = ServedSingleSelect | ServedEmbeddedDemo;

/**
 * Project a bank item down to the renderable subset served to the player.
 * Strips `answer`, `scoring`, `provenance`, and every option `lure` tag so the
 * solution provably cannot reach the browser (EXAM_ITEM_SCHEMA_SPEC acceptance #4).
 */
export function toServedItem(item: BankItem): ServedItem {
  const shared = {
    itemId: item.itemId,
    typeCode: item.typeCode,
    domain: item.domain,
    title: item.title,
    blurb: item.blurb,
    difficultyLevel: item.difficultyLevel,
  };
  if (item.renderKind === 'single-select') {
    return {
      renderKind: 'single-select',
      ...shared,
      content: {
        typeCode: item.content.typeCode,
        prompt: item.content.prompt,
        ...(item.content.stimulus !== undefined ? { stimulus: item.content.stimulus } : {}),
        options: item.content.options.map((o) => ({ label: o.label })),
      },
    };
  }
  return {
    renderKind: 'embedded-demo',
    ...shared,
    demoPath: item.demoPath,
  };
}
