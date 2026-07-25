# Adaptive Exam — Build Plan & Interface Contract

**The single source of truth for the adaptive-screener build.** Every worktree/subagent
builds against the interfaces here. Born-synthetic only (`synthetic_only=true`,
`validated=false`). Baseline = dev `326c9fa` (teammate's assessment portal).

Companion specs (read for depth): `docs/architecture/EXAM_ITEM_SCHEMA_SPEC.md`,
`research/exam-question-types/METRIC_FRAMEWORK.md`, `research/exam-question-types/MEASUREMENTS.md`.

## 0. Locked decisions (from the 2026-07-24 grilling)

- Wire **all 66 types** over time; open-ended/LLM-judged types defer full harvest but still
  track core metrics and participate in selection.
- **Adaptive engine:** per reasoning area, maintain a **difficulty score = float 1–20**
  (a student's proficiency in that area). Performance on each item **adds/subtracts** from it.
  Next **item** = an unseen bank item whose difficulty ≈ the student's current score in that area.
  Next **type** = chosen to (a) keep an **even spread across the 4 areas** and (b) fill **metric-data
  coverage**, preferring types that **target the student's current age/grade band**.
- **Difficulty ramp:** items span **1–20** (K-1 ≈ 1–4, 2-3 ≈ 4-8, 4-5 ≈ 8-12, 6-8 ≈ 12-16,
  above-level ≈ 16–20 = "clearly gifted"; curve is **gradual**). **≥5 items per ±1 pt band per type.**
- **Start difficulty** from the requested **grade band**, then adjust by accuracy.
- **Battery length is variable** — keep asking until there is **adequate data in all core metrics**
  to conclude a score (target ≤45 min in the final version). No fixed item count.
- **Items are structured & LLM-generatable** for every type. The demo becomes a **pure renderer**
  of a served item's `params`; it no longer invents its own items.
- **No correct/incorrect shown mid-test** (just advance), unless a type inherently needs it.
  Answer keys live **server-side**; scoring is **server-authoritative, deterministic, reproducible**.
- **Structured results via postMessage** (NOT DOM scraping). Typed per-item result.
- **Metrics:** a **basic-core set (~16, §4)** influences selection + scoring now; all other declared
  metrics stay *tracked* but inert. Engagement metrics are **tracked, not enforced** yet.
- **Scoring:** **accuracy sets the score bracket**; **metrics position the score within the bracket**.
  Output = **score + profile per area + composite** (NO admit/defer/retry decision yet).
  Weights/cut = a **tunable policy** (defaults now; wired to an admin portal later).
- **Persistence:** stand up **Supabase**; store a **full exam trace** — items served, answers given,
  all metrics, telemetry, and the computed score/profile.
- **Frontend/app** must reflect all of this (variable-length adaptive battery, grade-based start,
  score+profile screen, stored trace readable back).

## 1. Data flow

```
grade band ─► ENGINE.startState ─► ENGINE.nextType ─► ENGINE.nextItem ─► ServedItem (no key)
   ▲                                                                          │
   │                                                                          ▼
SCORING◄─ store trace (Supabase) ◄─ server verifies answer + computes metrics ◄─ demo renders params,
   │            ▲                                                                emits ItemResult+telemetry
   └─ score+profile ─────────────────────────────────────────────────────────── (postMessage)
        (loop until ENGINE.isDone = adequate core-metric coverage)
```

## 2. Item & result contract (implement in `packages/contracts`)

Adopt `EXAM_ITEM_SCHEMA_SPEC.md`. Concrete shapes (Zod):

```ts
// difficulty is a FLOAT 1..20 (design-estimated, provisional; validated=false)
BankItem = {
  itemId: uuid, typeCode, domain: 'fluid_reasoning'|'verbal'|'quantitative'|'spatial',
  difficulty: number,               // 1..20 float
  ageBands: AgeBand[],              // targeting hint for selection
  content: <per-type params>,        // typed per type (registry); renderer-agnostic stimulus
  answer: { correctKey, distractorRationales? }, // SERVER-ONLY
  scoring: { mode: 'deterministic_key'|'computed_solver'|'proxy_bank'|'model_judge_deferred' },
  provenance: { generator:'grammar'|'llm'|'human', seed?, model?, validatorVerdicts? },
  syntheticOnly: true, validated: false,
}
ServedItem = BankItem minus { answer, scoring, provenance }  // what the browser gets
ItemResult = {                        // emitted by the demo via postMessage; server re-verifies
  itemId, typeCode, domain,
  response: <raw child choice/actions>,   // NO correctness from the client
  metrics: Record<MetricId, number>,      // structured, numeric (§4)
  telemetry: TelemetryEvent[],
}
ScoredItem = ItemResult + { correct: boolean, score: 0..1, difficulty } // server-added
```

**Demo embedding protocol (postMessage):** host→demo `{type:'init', item:ServedItem}`,
`{type:'start'}`; demo→host `{type:'ready'}`, `{type:'result', result:ItemResult}`,
`{type:'telemetry', event}`. Source-tag messages (`gt-exam-host` / `gt-exam-demo`).

## 3. Engine contract (implement in `packages/exam-engine`; pure + tested)

```ts
type AreaState = { area, difficulty: number /*1..20 float*/, itemsSeen: Set<itemId>,
                   accWindow: number[], metricCounts: Record<MetricId, number> }
startState(gradeBand): SessionState           // seed per-area difficulty from grade band
nextType(state, banks): typeCode | null       // area-spread + metric-coverage + age-band pref
nextItem(state, typeCode, banks): ServedItem   // unseen, difficulty≈area score, band-preferred
update(state, scored: ScoredItem): SessionState// += / -= area difficulty by correctness×magnitude
isDone(state): boolean                          // adequate core-metric coverage across areas
```

Difficulty update: gradual (e.g. ±0.4–1.0 by correctness and `M-ERRTYPE`), clamped 1–20.
Stop rule: every **core metric (§4)** has ≥ its `minSamples`, each area has a stable estimate
(`M-CONSIST`/SE below threshold), and area coverage is even.

## 4. Basic-core metric set (~16) — tracked AND influencing now

Justification per `MEASUREMENTS.md`/`METRIC_FRAMEWORK.md`. Others stay *tracked-inert*.

| Metric | Scope | Why it's core | Used for |
|---|---|---|---|
| **M-ACC** | all | base IRT signal; the score-bracket driver | select + score |
| **M-DIFFREACH** | all | ceiling = sharpest tail statistic (float 1–20) | select + score |
| **M-RT** | all | efficiency (gated) | score |
| **M-RTFIRST** | all | planning/encoding latency | score |
| **M-RTVAR** | all | consistency tracks g better than peak speed | score (within bracket) |
| **M-REV** | all | revisions = process/confidence | score |
| **M-ERRTYPE** | all | near-miss vs random → sub-cut placement + update magnitude | select + score |
| **M-CONSIST** | all | shrinks SE at the cut; drives the stop rule | stop-rule + score |
| **M-LEARNRATE** | all | within-session growth = Timeback-fit core | score + profile |
| **M-PATH** | interactive | strategy signature | score where present |
| **M-EFF** | interactive | efficiency vs optimal | score where present |
| **M-PLANFUL** | interactive | systematic vs impulsive | score where present |
| **M-ENGAGE** | all | off-task gate (**tracked, not enforced yet**) | track |
| **M-RAPIDGUESS** | all | effort validity (**tracked, not enforced yet**) | track |
| **M-RULEID** | fluid | relational-complexity bound | score (fluid) |
| **M-VOCABLVL** | verbal | lexical ceiling | score (verbal) |
| **M-LURETYPE** | verbal | distractor lure profile | score (verbal) |
| **M-PAE** | quant | placement error (continuous) | score (quant) |
| **M-ROTSLOPE** | spatial | mental-rotation rate | score (spatial) |
| **M-IDEAFLU** | open-ended | ideation fluency (auto count; full originality judge deferred) | track + select |

## 5. Scoring contract (implement in `packages/exam-scoring`; deterministic)

1. **Bracket by accuracy:** map per-area `M-ACC` (accuracy-at-difficulty) → an ordinal bracket.
2. **Position within bracket:** deterministic weighted combination of `M-DIFFREACH`, consistency
   (`M-RTVAR` inverse), `M-LEARNRATE`, `M-ERRTYPE`, and present process/domain metrics → a float.
3. Output **per-area proficiency (≈θ on the 1–20 scale) + composite + a profile** (strengths, learning
   rate, consistency). NO decision label. All weights come from a **tunable `ExamPolicy`** (defaults
   in code now; admin-portal-editable later). Fully reproducible from the stored trace.

## 6. Storage contract (implement in `supabase/`; RLS, born-synthetic)

Tables (private `app` schema, `SECURITY DEFINER` RPCs, forced RLS, `synthetic_only`):
`exam_item` (bank incl. `answer`/`scoring` server-only), `exam_question_type`, `exam_policy`,
`exam_participant` (PART-SYN-*), `exam_session`, `exam_item_response` (served item + raw answer +
server correctness/score + metric map), `exam_telemetry_event` (append-only full trace),
`exam_session_outcome` (score/profile). Reuse `feat/adaptive-exam-app`'s `exam_core.sql` as the base.

## 7. Workstreams (branch OFF `feat/exam-integration`; merge back into it)

| Branch | Owns | This-session deliverable (bounded) |
|---|---|---|
| `feat/exam-contracts` | `packages/contracts` (item/served/result/telemetry + metric registry + engine/scoring types) | Zod+types compiling; adapts EXAM_ITEM_SCHEMA_SPEC + adaptive-exam-app |
| `feat/exam-engine` | `packages/exam-engine` | pure engine (start/nextType/nextItem/update/isDone) + unit tests |
| `feat/exam-scoring` | `packages/exam-scoring` | metric registry (§4) + deterministic scorer + tunable policy defaults + tests |
| `feat/exam-backend` | `supabase/` | migrations (§6) + RPCs + RLS + born-synthetic seed |
| `feat/exam-bank-fluid` | `research/exam-question-types` fluid (15) | **reference vertical:** FLU-MATRIX-01 generator→structured bank (≥5/±1pt, 1–20) + demo refactor to render ServedItem + emit ItemResult (postMessage). Start other fluid types. |
| `feat/exam-bank-verbal` | verbal (16) | generator+LLM content bank for 1–2 verbal types (VER-RELPAIR-01 first) in schema shape; start rest |
| `feat/exam-bank-quant` | quant (12) | generator bank for QUANT-SERIES-01 first; start rest |
| `feat/exam-bank-spatial` | spatial (23) | generator bank for SPA-FOLDNET-01 first; start rest |
| `feat/exam-frontend` | `apps/web` exam runner/lib | runner consumes ServedItem + engine + postMessage results + grade-based start + variable-length loop + score/profile screen (against this contract) |

**Boundaries:** each branch edits only its own area; do not edit another branch's files. Where a
dependency's code isn't ready, code against THIS contract (reconcile at integration merge). No git
pushes to `dev`/`staging`/`main`. Keep everything `synthetic_only`/`validated=false`.

## 8. Merge plan

feat/* → **`feat/exam-integration`** (resolve conflicts here) → **`dev`** (resolve there). The
`feat/adaptive-exam-app` CAT/contracts/DB is harvested as a base by contracts/backend, not merged wholesale.

## 9. This session (kickoff of the overnight loop)

Goal tonight: a coherent **foundation + one proven vertical slice** (contracts, engine, scoring,
backend, one bank+demo per domain reference, frontend wiring) so the overnight loop can **scale the
banks to all 66 types**. Development pauses at **9:30pm**; commit WIP to each feat branch.
