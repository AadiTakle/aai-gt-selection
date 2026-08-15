# Exam Item & Scoring Schema Specification

**Standardized item contract for the K–8 adaptive screener — the target format a
grammar or an LLM writes to, and a validator/judge checks.**

| | |
|---|---|
| **Status** | Draft — research/design spec. NOT a decision to build a live test or to score real children. |
| **Requirements served** | R11 (scalable/tunable screener), R5 (defensible capability standard), H1 (broader measures), H4 (broaden who can demonstrate ability), H10 (minimize gaming/burden). |
| **Decisions inherited** | D-015 (Timeback-fit target; fully automated, reproducible classification), D-016 (adaptive screener). |
| **Evidence / constraints** | RES-012 (no item parameter empirically calibrated), RES-013 (born-synthetic). Mappings inherited from `research/exam-question-types/METRIC_FRAMEWORK.md` and `packages/contracts/src/assessment-exam.ts`. |
| **Scope** | Define the *format*. No runtime code change, no calibration, no live data in this deliverable. |
| **Worked example** | The `verbal` domain (15 types), with three types specified concretely. |

---

## 1. Purpose

The screener has 66 custom question types across four domains
(`fluid_reasoning`, `verbal`, `quantitative`, `spatial`) and a runtime item bank.
To *rapidly expand the question bank* — with grammars for procedural types and an
LLM for language-heavy types — every generator and every validator needs **one
uniform item format** to read and write.

Today that format does not exist at the item-content level. This spec defines it:
a shared **item envelope**, a **typed per-type `params` contract**, an **explicit
answer key + distractor taxonomy**, a **scoring contract**, and a **provenance /
validation record**. It also fixes a latent problem: the correct answer currently
lives in the browser.

This spec is the prerequisite for both the LLM generator and the LLM-as-judge
work; it does not itself generate or score anything.

## 2. Governance and claim boundaries

This work maps to R11/R5 and H1/H4/H10 and inherits the exam workstream's approved
posture. It does not reopen those requirements. Hard boundaries this format
**must** encode and enforce:

- **Born-synthetic only.** Every generated item carries `synthetic_only = true`
  and `validated = false`. A large generated bank is *synthetic research
  content*, never calibrated live items (RES-012, RES-013).
- **Ordinal difficulty ≠ calibrated difficulty.** A generator's `difficulty_level`
  is a design rung. The IRT `b` parameter is *provisional* until a pilot
  calibrates it (~200+ responses/item for Rasch, per the in-house test research).
  The format keeps the two fields distinct and never lets a generated rung
  masquerade as calibration.
- **No live child data to an LLM.** LLM generation and LLM validation run
  **offline on synthetic content**. Any LLM *scoring of a child's response* is a
  separate, privacy-reviewed research track (COPPA/FERPA), out of scope here.
- **Validity attaches to the use, not the generator.** More items expand coverage
  and anti-coaching rotation. They are not, by themselves, evidence of a valid
  gifted screen (R10 claim boundary).
- **Automated + reproducible scoring stays the default** (D-015). Deterministic
  keys and computable solvers are preferred; non-deterministic judges are
  quarantined behind an explicit, labeled scoring mode.

## 3. Current state and the gap

Three facts about the runtime as built (`feat/adaptive-exam-app`):

1. **The item envelope exists**, but item content is untyped —
   `params: z.record(z.string(), z.unknown())`, documented as "config the demo
   interprets" (`packages/contracts/src/assessment-exam.ts`, `examItemSchema`).
2. **The seed stores only a seed + level.** Item bank rows set
   `params = { seed, difficulty }` (`supabase/migrations/…_exam_seed.sql`); no
   stimulus, no answer key, no distractor rationale is persisted.
3. **The answer key lives in the demo's JavaScript.** Each demo's `genItem(level)`
   builds the item *and* computes the correct answer client-side (e.g.
   `demos/FLU-MATRIX-01.html`), then returns `correct`/`score` to the host.

Consequences: the bank cannot be validated, calibrated, or audited server-side;
items cannot be QA-checked uniformly; and for a real (non-synthetic) exam the key
is exposed in the browser. Standardizing the format resolves all three.

## 4. Design principles

1. **One envelope, many typed payloads.** A single shared item shape; the
   `params`, `answer`, and `scoring` bodies are typed *per type* via a registry.
2. **Deterministic-first.** Prefer a computable key or solver; fall back to
   automated proxies; quarantine model judges.
3. **The key never reaches the browser.** `answer` + `scoring` live only on the
   bank/server item. The client receives content to render, not the solution.
4. **Content is renderer-agnostic.** `params` describes *what* the item is;
   the demo is a pure renderer of `params`. The same item could be rendered by a
   different surface without changing its meaning or key.
5. **Provenance is first-class.** Every item records how it was made (grammar +
   seed, or model + prompt hash) and which validator checks it passed.
6. **Distractors are meaningful.** Every distractor is tagged with a lure class
   so the measurements that depend on it (`M-ERRTYPE`, `M-LURETYPE`, `M-RULEID`)
   are computable.

## 5. Terminology (Automatic Item Generation framing)

- **Item model / template** — the per-type recipe (grammar or LLM prompt +
  `params` schema) that can emit many items. One per `type_code`.
- **Item instance** — a single materialized item conforming to the schema below
  (what lands in the bank and is served to a child).
- **Generator** — grammar (Bucket A), LLM (Buckets B/C), or human (any).
- **Validator / judge** — deterministic solver and/or LLM QA that certifies an
  instance before it enters the bank.

## 6. The standardized schema

Presented as Zod (the repo's contract language). This *extends* the existing
`examItemSchema`; new fields are additive.

### 6.1 Shared item envelope

```ts
// Bank-side item (server only). Extends the existing examItemSchema.
export const bankItemSchema = z.object({
  itemId: z.uuid(),
  typeCode: questionTypeCodeSchema,          // e.g. "VER-RELPAIR-01"
  domain: examDomainSchema,                  // fluid_reasoning | verbal | quantitative | spatial
  ageBands: z.array(ageBandSchema).min(1),

  // Difficulty: ordinal design rung vs provisional IRT (kept separate).
  difficultyLevel: z.int().min(1).max(20),   // generator rung — NOT calibrated
  irt: irtParametersSchema,                  // provisional; b seeded from level until piloted

  demoPath: z.string().min(1),               // renderer, e.g. "demos/VER-RELPAIR-01.html"

  content: itemContentSchema,                // §6.2 typed per type
  answer: answerKeySchema,                   // §6.3 server-only
  scoring: scoringContractSchema,            // §6.4
  provenance: provenanceSchema,              // §6.5

  syntheticOnly: z.literal(true),
  validated: z.literal(false),
}).strict();

// Client-side item: content to render, NO answer / scoring / irt leak.
export const servedItemV2Schema = z.object({
  itemId: z.uuid(),
  typeCode: questionTypeCodeSchema,
  domain: examDomainSchema,
  difficultyLevel: z.int().min(1).max(20),
  demoPath: z.string().min(1),
  content: renderableContentSchema,          // §6.2 — the presentation subset only
}).strict();
```

### 6.2 Per-type `content` contract (typed registry)

Replace the untyped `params` blob with a **discriminated union keyed by
`typeCode`**. Each type registers two schemas: the full `content` (author/bank
side) and its `renderable` subset (what the child may see — excludes any field
that encodes the answer).

```ts
// A registry: typeCode -> { content, renderable }
export const ITEM_CONTENT_REGISTRY: Record<QuestionTypeCode, {
  content: z.ZodTypeAny;      // full content incl. option lure tags
  renderable: z.ZodTypeAny;   // safe subset served to the browser
}> = { /* one entry per type; verbal entries in §8 */ };

export const itemContentSchema = z.discriminatedUnion('typeCode', [ /* … */ ]);
```

Rationale: an untyped `params` cannot be generated, validated, or rendered
uniformly. A typed union lets the LLM/grammar target an exact shape, lets the
validator check it, and lets the renderer trust it.

### 6.3 Answer key + distractor taxonomy (server-only)

The taxonomy is **two fields at two grains** (D-020). A closed nine-value
`lureClass` keeps `M-ERRTYPE` / `M-LURETYPE` / `M-RULEID` computable — they are
counts over buckets, so the vocabulary cannot be open. An optional free-form
`lureDetail` carries the type's own label, because 219 distinct labels are in
use across the banks and a coarse bucket cannot tell `cut_too_high` from
`cut_too_low`. Every label's coarse mapping lives in
`research/exam-question-types/generators/item-shape.mjs`; an unregistered label
is a hard error at generation time.

The map is **keyed by each selectable element's own identifier**, not aligned to
option order: many types have no positional options (`VER-EVIDENCE-01` keys
passage sentences, `WM-bubble-01` keys per-lane n-back steps), and the server
must resolve a child's choice to a lure by key once options are shuffled.

```ts
export const lureClassSchema = z.enum([
  'correct',
  'associate',          // thematic/semantic associate (verbal)
  'surface_match',      // shares surface features, wrong relation
  'reversed_relation',  // relation applied backwards
  'local_fit',          // fits locally but not globally (cloze)
  'global_mismatch',
  'rule_violation',     // figural: violates exactly one named rule (M-RULEID)
  'near_order',         // ordering tasks: off-by-one sequence
  'distractor_other',
]);

export const distractorRationaleSchema = z.looseObject({
  lureClass: lureClassSchema,               // required, bucketable (M-LURETYPE)
  lureDetail: z.string().min(1).optional(), // the type's own label
  // Per-type diagnostics (note, misconception, derivation, …) pass through.
});

export const answerKeySchema = z.looseObject({
  // index | option key | set | computed solution, per type.
  correctKey: z.unknown(),
  // Keyed by the selectable element's id, NOT by option position.
  distractorRationales: z.record(z.string().min(1), distractorRationaleSchema).optional(),
  // Per-type ground truth (optimalPath, bindings, acceptedEquivalence, …)
  // passes through until the typed §6.2 registry exists.
});
```

Open-ended objects are safe here only because `servedItemSchema` omits `answer`,
`scoring`, and `provenance` wholesale — nothing can reach the browser by being
unlisted. `packages/contracts/src/bank-conformance.test.ts` asserts both that
every bank parses and that the served projection still excludes all three.

### 6.4 Scoring contract

```ts
export const scoringContractSchema = z.discriminatedUnion('mode', [
  // 1. Single/keyed selection compared to answer.correctIndex/Set. (Bucket A/B)
  z.object({ mode: z.literal('deterministic_key') }).strict(),

  // 2. Pure function scores a response against a computable ground truth:
  //    ordering adjacency, model-graph solve (QUANT-WORD), etc. Partial credit. (A/B)
  z.object({
    mode: z.literal('computed_solver'),
    solverId: z.string().min(1),            // registered pure scorer
    partialCredit: z.boolean().default(false),
  }).strict(),

  // 3. Open response scored by automated proxies vs a per-prompt bank:
  //    fluency count / category bins / inverse-frequency originality. (Bucket C)
  z.object({
    mode: z.literal('proxy_bank'),
    proxies: z.array(measurementIdSchema),  // e.g. M-IDEAFLU, M-FLEX, M-ORIG
    responseBankId: z.string().min(1),
  }).strict(),

  // 4. RESEARCH ONLY — LLM / semantic-distance judge. Offline, synthetic only,
  //    never live child data without a privacy review. Never a live cut input.
  z.object({
    mode: z.literal('model_judge'),
    judgeRef: z.string().min(1),
    researchOnly: z.literal(true),
  }).strict(),
]);
```

Scoring runs **server-side** using `answer` + `scoring`. The demo returns the
child's raw selection/actions + telemetry, not a verdict — closing the
key-in-browser gap.

### 6.5 Provenance & validation record

```ts
export const provenanceSchema = z.object({
  generator: z.enum(['grammar', 'llm', 'human', 'hybrid']),
  generatorRef: z.string().min(1),          // grammarId@version | model id
  seed: z.string().optional(),              // grammar reproducibility
  promptHash: z.string().optional(),        // llm reproducibility
  validator: z.array(z.object({
    check: z.enum([
      'unique_answer',        // a solver confirms exactly one defensible key
      'key_matches_solver',   // proposed key == solver's answer
      'lure_taxonomy_ok',     // every distractor has a valid, distinct lure class
      'reading_load_ok',      // within age-band frequency/length budget
      'frequency_band_ok',    // target/word frequencies in declared band
      'bias_screen_ok',       // construct-irrelevant / cultural/SES screen
      'ip_novelty_ok',        // not a copy of a copyrighted item
    ]),
    status: z.enum(['pass', 'fail', 'warn', 'skipped']),
    detail: z.string().optional(),
  })),
  humanReview: z.object({
    reviewer: z.string(), verdict: z.enum(['approved', 'rejected', 'revise']),
    date: z.iso.datetime({ offset: true }),
  }).optional(),
}).strict();
```

### 6.6 Difficulty vs. calibration (explicit)

`difficultyLevel` is set by the generator's difficulty levers. On entry an item
gets a **provisional** `irt.b` mapped from its level; `validated` stays `false`.
Real `a/b/c` come only from a pilot. A guard should refuse to treat any
`validated:false` item's `irt` as calibrated in reporting.

## 7. Generation & validation pipeline

```
author item model (per type)
      │  grammar (A)   │  LLM prompt (B/C)   │  human (any)
      ▼
generate instance  ──►  VALIDATE  ──►  human spot-check  ──►  bank (synthetic, validated=false)
                        │                                      │
                        │ deterministic solver (key check)     ▼
                        │ LLM/rule QA (bias, reading, IP)    CAT engine ──► pilot ──► calibrate irt
                        └────────── reject / revise ◄──────────
```

Where each tool fits, by bucket (counts from the 66-type catalog):

| Bucket | Types | Generator | Key / scoring | Judge role |
|---|---|---|---|---|
| **A. Procedural / figural** | 45 (68%) | **grammar** (seeded) | computed at generation; `deterministic_key` / `computed_solver` | not needed for scoring; optional QA |
| **B. Semantic / verbal content** | 15 (23%) | **LLM** (offline) | keyed at generation; `deterministic_key` / `computed_solver` | **LLM as validator** (unique-answer, bias, reading, IP) + deterministic solver cross-check |
| **C. Open-ended / constructed** | 6 (9%) | LLM prompt / human | `proxy_bank`; `model_judge` research-only | proxy scoring; LLM judge as a *research candidate validated against proxies* |

## 8. Worked example — the `verbal` domain

The 15 verbal types and their subconstructs:

| type_code | name | subconstructs | aig |
|---|---|---|---|
| VER-RELPAIR-01 | Relation Match | verbal_analogy, verbal_classification | high |
| VER-CLOZE-01 | Fill the Gap | sentence_completion, sentence_arrangement | high |
| VER-POLYSEME-01 | Two Meanings | receptive_vocabulary, inference, antonyms_synonyms | med |
| VER-SENSE-01 | Sentence Sense | sentence_arrangement, verbal_absurdities | high |
| VER-SEQUENCE-01 | Story Order | inference, sentence_arrangement | med |
| VER-BUILDIT-01 | Build-It Buddy | (verbal construction) | high |
| VER-SORTBOT-01 | Sorting Robot | classification | high |
| VER-WORDTRAIN-01 | Word Train | word relations | high |
| VER-EVIDENCE-01 | Proof Hunt | evidence/inference | med |
| GB-DEBATE-01 | Claim Duel | claim–evidence, warrant | med |
| GB-FLAWFINDER-01 | Fib Finder | flaw detection | med |
| GB-WORDLADDER-01 | Letter Climb | orthographic transform | high |
| GB-WORDFORGE-01 | Word Forge | word construction (open) | high |
| CX-curious-02 | Question Quest | curiosity (open) | med |
| CX-sjt-01 | What Would You Do? | situational judgment | med |

Three specified below: **VER-RELPAIR-01** and **VER-CLOZE-01** (`deterministic_key`),
and **VER-SENSE-01** (`computed_solver`, partial credit). VER-POLYSEME-01 is
sketched to show the asset-bank constraint.

### 8.1 VER-RELPAIR-01 — Relation Match (`deterministic_key`)

Content schema:

```ts
const relpairContent = z.object({
  typeCode: z.literal('VER-RELPAIR-01'),
  presentation: z.enum(['picture', 'word']),   // age-gated
  relation: z.string().min(1),                 // e.g. "lives_in", "worn_on"
  stemPair: z.tuple([tokenSchema, tokenSchema]),
  options: z.array(z.object({
    pair: z.tuple([tokenSchema, tokenSchema]),
    lure: lureClassSchema,                      // correct | associate | surface_match | reversed_relation
  })).min(3).max(4),
  frequencyBand: z.int().min(1).max(7),         // Zipf band; word mode
}).strict();
// tokenSchema = { text: string, assetId?: string, audioId?: string }
// renderable subset = same MINUS options[].lure
```

Example instance (bank side):

```jsonc
{
  "itemId": "…", "typeCode": "VER-RELPAIR-01", "domain": "verbal",
  "ageBands": ["4-5","6-8"], "difficultyLevel": 6,
  "irt": { "a": 1.0, "b": 0.4, "c": 0, "model": "2PL" },   // provisional
  "demoPath": "demos/VER-RELPAIR-01.html",
  "content": {
    "typeCode": "VER-RELPAIR-01", "presentation": "word", "relation": "lives_in",
    "stemPair": [{ "text": "bird" }, { "text": "nest" }],
    "options": [
      { "pair": [{ "text": "bee" }, { "text": "hive" }],   "lure": "correct" },
      { "pair": [{ "text": "dog" }, { "text": "bone" }],   "lure": "associate" },
      { "pair": [{ "text": "fish" }, { "text": "scale" }], "lure": "surface_match" },
      { "pair": [{ "text": "hive" }, { "text": "bee" }],   "lure": "reversed_relation" }
    ],
    "frequencyBand": 4
  },
  "answer": { "correctIndex": 0, "distractorRationales": ["correct","associate","surface_match","reversed_relation"] },
  "scoring": { "mode": "deterministic_key" },
  "provenance": {
    "generator": "llm", "generatorRef": "…", "promptHash": "…",
    "validator": [
      { "check": "unique_answer", "status": "pass" },
      { "check": "lure_taxonomy_ok", "status": "pass" },
      { "check": "frequency_band_ok", "status": "pass" },
      { "check": "bias_screen_ok", "status": "pass" }
    ]
  },
  "syntheticOnly": true, "validated": false
}
```

### 8.2 VER-CLOZE-01 — Fill the Gap (`deterministic_key`)

```ts
const clozeContent = z.object({
  typeCode: z.literal('VER-CLOZE-01'),
  mode: z.enum(['cloze', 'arrange']),
  presentation: z.enum(['picture', 'word']),
  sentenceFrame: z.string().min(1),            // gap marked with "___"
  gapType: z.enum(['local_fit', 'global_fit']),
  options: z.array(z.object({
    token: tokenSchema,
    fit: lureClassSchema,                       // correct | local_fit | global_mismatch | associate
  })).min(2).max(5),
  targetFrequencyBand: z.int().min(1).max(7),
  syntacticComplexity: z.int().min(1).max(5),
}).strict();
```

A `global_fit` gap with a `local_fit` lure is the discriminating case: the lure
reads fine beside the blank but contradicts the whole sentence — exactly the
"local-collocation shortcut" the type's construct-irrelevance notes warn against.

### 8.3 VER-SENSE-01 — Sentence Sense (`computed_solver`, partial credit)

No single index: the child drags word cards into an order. Scoring credits
adjacent-pair order **and** semantic plausibility, so the scoring mode is a
registered solver returning partial credit.

```ts
const senseContent = z.object({
  typeCode: z.literal('VER-SENSE-01'),
  cards: z.array(tokenSchema).min(3).max(7),
  sensibleOrder: z.array(z.int()),             // canonical (answer, server-only)
  absurdLure: z.array(z.int()),                // grammatical-but-implausible ordering
}).strict();
```

```jsonc
"answer": { "canonicalSolution": [0,1,2,3] },
"scoring": { "mode": "computed_solver", "solverId": "order-plausibility@1", "partialCredit": true }
```

### 8.4 VER-POLYSEME-01 — the asset-bank constraint

Its `aig_cloneable` is **med** because it needs a curated *homograph + picture*
bank (picture availability limits auto-generation). The format handles this: the
LLM generates the homograph, the meaning-biasing sentence, and the four option
*tags* (`correct_meaning`, `other_meaning`, `associate`, `unrelated`); a separate
asset step supplies `assetId`s from a picture library. The validator's
`unique_answer` check must confirm exactly one picture fits the sentence.

### 8.5 The LLM generation contract (verbal)

The generator is called **once per (type, difficultyLevel, ageBand)** and must
return content conforming to that type's registry schema.

**Input to the model:**
- the type spec (interaction, subconstructs, `difficulty_levers`,
  `construct_irrelevant_risks`) from `master_types.jsonl`;
- target `difficultyLevel` + `ageBand`;
- constraints: frequency-band ceiling, max reading length, cultural/SES-neutral,
  **exactly one defensible answer**, required distractor lure taxonomy, and the
  output JSON schema.

**Output:** a `content` object + proposed `answer` (key + `distractorRationales`).

**Then the validator runs** (no item enters the bank until it passes):
1. `unique_answer` — a deterministic checker (or, where none exists, an
   independent LLM pass) confirms one defensible key; `key_matches_solver`.
2. `lure_taxonomy_ok` — every distractor has a distinct, valid lure class.
3. `reading_load_ok` / `frequency_band_ok` — length and word-frequency within the
   age band (guards the language/exposure construct-irrelevance risk).
4. `bias_screen_ok` — cultural/SES/ELL screen (construct-irrelevant variance).
5. `ip_novelty_ok` — not a copy of a copyrighted item.
6. Human spot-check on a sample; `validated` remains `false` regardless.

## 9. Runtime integration (post-approval, out of scope for this draft)

- **Contracts:** add `content` (typed union), `answer`, `scoring`, `provenance`
  to the bank item; introduce `servedItemV2Schema` that omits `answer`/`scoring`/
  `irt`. Replace `params: z.record(z.unknown())` with the typed registry.
- **DB:** persist `content`, `answer_key`, `scoring`, `provenance` (jsonb columns
  on `app.exam_item` or a companion table). `irt_*` and `difficulty_level` are
  unchanged; the CAT engine is unaffected.
- **Scoring moves server-side:** the demo emits the child's raw
  selection/actions + telemetry; the server scores via `scoring` + `answer`.
  Demos become pure renderers of `content` (the `postMessage` embedding contract
  already sends `servedItem` and receives a response + telemetry).
- **Generation service:** offline job that calls generator → validator → writes
  synthetic items. Never runs against live sessions.

## 10. Out of scope

- Generating or scoring any real (non-synthetic) items.
- Empirical IRT calibration.
- Changing the CAT engine, the 66-type catalog, or any demo's mechanics.
- Live LLM scoring of children's responses.
- The picture-asset pipeline (referenced, not designed here).

## 11. Acceptance evidence (for the *format*)

The schema is "done" when:
1. It expresses all four scoring modes and both selection and constructed items.
2. Every verbal type maps to a `content` schema with no untyped `params`.
3. Each example instance in §8 validates, and a deterministic solver reproduces
   its key (or, for `computed_solver`, scores the canonical solution as full).
4. The served (client) subset provably excludes `answer`/`scoring`/`irt`.
5. A reviewer confirms the governance fields (§2) are enforceable by type.

## 12. Open questions / assumptions

- **Materialize vs regenerate.** Recommendation: store the *materialized*
  `content` + `answer` (auditability, calibration stability) **and** the
  provenance/seed (reproducibility). Assumption: storage cost is acceptable.
- **Frequency source & lexicon.** Which Zipf/word-frequency list and relation
  vocabulary seed the verbal generator and the `frequency_band_ok` check.
- **Response banks (Bucket C).** `proxy_bank` scoring needs per-prompt response
  norms; building/norming them is an open task (flagged in `METRIC_FRAMEWORK.md`
  §4). An LLM can seed these, but they need validation before trust.
- **Asset model** for picture-based items (VER-POLYSEME-01 and young bands).
- **Solver coverage.** Which constructed types get a registered `computed_solver`
  first (VER-SENSE-01, VER-SEQUENCE-01, QUANT-WORD-01 are the candidates).
