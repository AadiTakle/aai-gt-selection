# Pivot: baseline assessment + remedial course for CogAT preparation

**Status:** Draft on `feat/cogat-prep-pivot`, 2026-08-03. Nothing here is ratified and nothing on
`dev` is changed by it. Written from the owner's pivot brief; the open questions in §7 are the
owner's to settle before build.

**What changes:** the product stops being a gifted-admissions screener that GT runs, and becomes a
**test-preparation product a family uses** — a short baseline that places the child across CogAT's
reasoning batteries, names their weakest areas, and hands them into a remedial course that trains
those areas. Positioning shifts from "we select gifted students" to "we improve how a child performs
on the test that selects them."

---

## 1. The baseline assessment

| Requirement | Target |
|---|---|
| Length | **under 30–40 minutes**, whole battery |
| Output | ability score per **CogAT battery**: verbal, quantitative, nonverbal (nonverbal absorbs fluid + spatial) |
| Also outputs | the child's **weakest question types** and **weakest reasoning areas** |
| Accuracy signal | supplemented by **existing telemetry**, not accuracy alone |
| Efficiency signal | **grades 3–8 only**: time per question, tracked as a metric to improve |
| Item format | **CogAT-style only. No open-ended types.** |
| Editability | adding, removing and editing **types in the battery** and **items in the bank** must be routine |
| Reuse | question types must be **reusable by the learning app**, not welded to the assessment |

## 2. What already exists and carries over

The adaptive machinery is a direct fit and needs no redesign:

- **Per-area ability estimation** — Phase 1's two-sided bracketing already produces a per-area
  standing estimate on a 1–20 scale and stops when each area settles, which is exactly "ability score
  per battery" with a confident stop rather than a fixed length.
- **Weakest-area identification** — falls out of the per-area estimates for free; weakest *type*
  needs a per-type roll-up, which the selection index already tracks for coverage.
- **Telemetry** — response time, first-action latency, revisions and engagement are already collected
  per item, and the existing rule keeps them as filters rather than as score. For grades 3–8 the
  brief promotes time-per-question to a *reported improvement metric*, which is a change of role and
  needs its own decision.
- **Editable banks** — generators, per-type banks and `pnpm exam:sync` already make add/remove/edit a
  regeneration rather than a code change. The registry is generated, and the sync check is the gate.
- **Server-side scoring** — answer keys never reach the browser. Worth keeping for a prep product
  too: a child who can read the key learns nothing.

## 3. Type inventory against CogAT's structure

53 types are wired today. **29 are closed-response** (a bounded option list) and so are
format-compatible with CogAT; **24 are interactive or constructed-response** and are out of the
baseline under "no open-ended Q types".

### 3.1 The 29 that qualify, mapped to batteries

| Battery | Count | Types |
|---|---|---|
| **Verbal** | 7 | `VER-CLOZE-01` `VER-EVIDENCE-01` `VER-MORPHO-01` `VER-POLYSEME-01` `VER-RELPAIR-01` `VER-SEQUENCE-01` `VER-SORTBOT-01` |
| **Quantitative** | 8 | `QUANT-BALANCE-01` `QUANT-DOTS-01` `QUANT-FUNC-01` `QUANT-GLYPHNUM-01` `QUANT-GRAPH-01` `QUANT-MATRIX-01` `QUANT-SERIES-01` `QUANT-WORD-01` |
| **Nonverbal** (fluid + spatial) | 14 | `FLU-ANALOGY-01` `FLU-CARPET-01` `FLU-LADDER-01` `FLU-MATRIX-01` `FLU-OPCHAIN-01` `FLU-STACK-01` `FLU-VENN-01` · `SPA-FOLDNET-01` `SPA-PICKFOLD-01` `SPA-ROLL-01` `SPA-SHADOW-01` `SPA-VIEW-01` `SPA-XFORM-01` `SPA-XSCAN-01` |

### 3.2 Coverage of CogAT's nine subtests

The brief says tailor to CogAT-style questions rather than generic reasoning. Existing types already
cover all nine subtests, which is the strongest argument that the pivot is a re-aim rather than a
rebuild:

| CogAT subtest | Closest existing type |
|---|---|
| Verbal Analogies | `VER-RELPAIR-01` |
| Sentence Completion | `VER-CLOZE-01` |
| Verbal Classification | `VER-SORTBOT-01` |
| Number Analogies | `QUANT-FUNC-01` / `QUANT-MATRIX-01` |
| Number Puzzles | `QUANT-BALANCE-01` |
| Number Series | `QUANT-SERIES-01` |
| Figure Matrices | `FLU-MATRIX-01` |
| Paper Folding | `SPA-FOLDNET-01` / `SPA-PICKFOLD-01` |
| Figure Classification | `FLU-CARPET-01` |

**Gap to check before build:** CogAT items are stylistically conventional. Several of ours are
deliberately game-like, which was a virtue when the goal was reaching children a paper test misses
and is a liability when the goal is rehearsing the real thing. Each of the nine above needs a
side-by-side against a real CogAT form.

### 3.3 The 24 that drop out of the baseline

`CX-achieve-02` `CX-check-01` `FLU-CONCEPT-01` `FLU-DEDUCE-01` `FLU-GRIDCOPY-01` `FLU-ODDPAIR-01`
`GB-EXPLORE-01` `GB-FLAWFINDER-01` `GB-ROBOPATH-01` `GB-TRACK-01` `GB-WORDFORGE-01`
`GB-WORDLADDER-01` `QUANT-MIX-01` `SPA-HIDDENCUBE-01` `SPA-MAZE-01` `SPA-PIPES-01` `SPA-PUNCH-01`
`SPA-SCENE-01` `SPA-TANGRAM-01` `SPA-XPLANE-01` `VER-SENSE-01` `WM-bind-01` `WM-bubble-01`
`WM-corsi-01`

**Do not delete them.** The brief wants types reusable by the learning app, and this set is the most
engaging material in the repo. Out of the *baseline* is not out of the *course* — several are better
practice activities than test items precisely because they are interactive. Recommended: mark them
`baseline: false, course: true` rather than retiring them.

## 4. Length budget

Three batteries in under 30–40 minutes is the binding constraint. At the observed ~30-item Phase 1
battery across four areas, three batteries with a confident stop per battery lands near **24–36
items total, 8–12 per battery**. That is enough for a usable per-battery estimate and is *not* enough
for a defensible per-type score — so "weakest question type" has to be read as a **flag pointing at
practice**, not a measured per-type ability. Worth saying out loud in the UI, because a prep product
naming a weakest type is making a claim a 30-item test cannot support at type granularity.

## 5. What the pivot resolves

**The Stage 2 learning-rate problem stops being load-bearing.** Extensive measurement established
that a within-session learning rate is not recoverable from a ~30-trial block: a cohort that learned
nothing still fits a positive rate, recovery is ~0.33 against an information ceiling near 0.2–0.3,
and the between-child spread may be smaller than any feasible block can resolve.

A prep product does not need it. What it needs is a **before/after on the same battery**, which is a
difference between two *levels* measured weeks apart — a far easier measurement than a slope inside
one sitting, and the one design the change literature actually supports. The learning-rate work
becomes optional research rather than a blocker.

**Retained from it:** the per-type guessing floor, the item-selection and exposure-control work, the
verifier audit and the renderers are all useful to a prep battery regardless.

## 6. Naming

"CogAT" is a Riverside trademark and the product is not affiliated with or endorsed by them. The
brief already leans away from naming it: something like **"see where you place"** for the baseline.
Two constraints on whatever is chosen:

1. **Do not imply affiliation or that it predicts a CogAT score.** "Prepares for tests like the
   CogAT" is defensible; "your CogAT score" is not, without a study linking the two scales.
2. **Do not call the output an IQ.** The brief's phrase "IQ test improver" is fine as internal
   shorthand and should not reach the UI: what improves is performance on a reasoning test, and
   claiming a raised IQ is both unsupported and the exact overclaim the project has avoided so far.

## 7. Open questions — owner's to settle

1. **Application/onboarding flow:** keep, trim, or drop? The brief keeps it ("I liked everything I
   put in there") while noting the product no longer needs an admissions application. A prep product
   still needs an account, a child profile, and a grade — which is most of the profile layer already
   built, minus the application-cycle machinery.
2. **What replaces the payment step**, and is payment gone entirely or moved (e.g. free baseline,
   paid course)?
3. **Baseline name**, within §6's constraints.
4. **Dashboard as third surface:** the brief describes it as the entry into the course plus a review
   of what was worked on. Does it also show the baseline scores over time — i.e. is the
   before/after retest a product feature, given §5 makes it the measurement that actually works?
5. **Grades 3–8 efficiency metric:** report time-per-question to the child, or hold it internal? It
   is currently a filter by policy, and promoting it to a reported metric a child is told to improve
   is a design decision with its own risks — speed pressure on a reasoning test degrades exactly the
   reflection it measures.
