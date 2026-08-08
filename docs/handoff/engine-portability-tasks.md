# Engine and item bank: task list

Concrete tasks only. Reasoning, evidence and the decisions behind these live in
`engine-portability-todo.md` — read that before arguing with one of them, not before doing one.

Paths are relative to `screener/` unless stated. Dropped tasks (1a.1, 1a.2, 1a.3) are not listed.

---

## In order

### 1. `1b.7` — Verify the numeric-key fix — **DONE 8 Aug 2026. PASS.**
- Read `packages/qbank/src/bank.ts` (loader guard) and `scoreResponse` in the same file.
- Read `packages/qbank/src/numeric-key.test.ts`.
- Confirm `QUANT-GLYPHNUM-01` marks `null` either way and never enters the pool.
- Confirm no other type declares `deterministic_key` with a non-integer `answer.correctKey`.
- **Done when:** the sweep across all 53 banks is written down, pass or fail.

Swept all 53 banks and 7,319 records. The guard holds on both paths. All 391 non-integer-key records
are `QUANT-GLYPHNUM-01` and all 391 are held back; no other type has the defect and there are no
negative keys. The five index-keyed verbal types (500 items) are all still servable. The sweep is now
three invariant tests in `numeric-key.test.ts`, not a one-off script. Full write-up, including the
counts it corrected and a scope change it found for `1b.6`, is in the `1b.7` entry of
`engine-portability-todo.md`.

### 2. `1a.5` — Pass the real option count — **DONE 8 Aug 2026**
- `packages/qbank/src/session.ts:231` and the `submit()` update call both hardcode
  `paramsFor(..., 4, 1.5)`.
- Read the option count off item content; thread it through to `paramsFor`.
- Leave discrimination at 1.5 and comment that it is fixed, not calibrated.
- **Done when:** no literal `4` for option count remains in selection or update, and tests cover a
  non-4-option type.

`optionCountOf` in `bank.ts` reads `content.options` and returns null when nothing is enumerated. Both
sites go through one private `paramsOf` so selection and the update cannot diverge. Discrimination is
now `FIXED_DISCRIMINATION` with the 1a.6 comment. Tests in `option-count.test.ts` cover 2-, 5- and
mixed-count types; 206 tests pass.

Only 2,373 of 5,034 servable items had four options. **1,695 items changed information, and only 7 of
the 50 most-informative items survived** — selection now prefers many-option items, correctly, but it is
a real change in what gets served. Full write-up in the 1a.5 entry of `engine-portability-todo.md`.

**Resolved 8 Aug (Felipe): an item that enumerates nothing is unguessable, c = 0.** Applies to 528 items
across `CX-check-01`, `SPA-MAZE-01`, `SPA-PIPES-01`, `SPA-TANGRAM-01` and `SPA-HIDDENCUBE-01`, via a
named `UNGUESSABLE` in `session.ts`. Four other types name their option list `candidates`, `rows` or
`claims` and are now read directly; `FLU-CONCEPT-01` counts 2^probes because its three yes/no probes are
keyed as one all-or-nothing string.

**New decision this created, and it should be settled before task 3 (`1a.4`).** Those five unguessable
types are **100% of the 50 most-informative items and 69% of the top 200**, because max information at
c = 0 is `0.25a²` against `0.15a²` at c = 0.25. Greedy selection will serve them almost exclusively in
the spatial and fluid slots. **All five are unmapped to CogAT** (see `2.2`), so the honest guessing model
points selection at exactly the types with no alignment, against requirement 2. Options: give the
stepper and the sort their real spaces (1/61, 1/2^n); land `2.3` and filter to mapped types; or cap per
type as well as per domain. `1a.4`'s per-domain intervals will otherwise report a spatial band computed
from maze and tangram items only.

**Also found, and it blocks task 13:** `npm run sim` never touches qbank, so `1b.8` cannot baseline off
it as written. See the 1a.5 entry.

### 3. `1a.4` — Hold and report a confidence interval per domain
- Four `Posterior` instances, one per domain, each updated only by its own domain's items.
- Composite posterior stays exactly as it is and remains the primary pass route.
- Extend `state()` to return per domain: mean, 90% interval, items served.
- Suppress a domain that received zero items rather than emitting the prior.
- Never emit a mean without its interval.
- **Done when:** a K-1 session returns no verbal band, and a full session returns four.

### 4. `1a.7` — Disjunctive pass rule
- Blocked on `1a.4`.
- Pass if the composite clears its threshold, **or** if `P(theta_domain > domainBar) >= p` for any
  single domain.
- Add `domainBar` and `p` to config alongside `abilityThreshold` / `recommendProbability`, with a
  comment that both are unvalidated.
- Record which route produced the pass on the result.
- Do not report a domain-triggered pass as a domain strength.
- **Done when:** a simulated spiky candidate (high one domain, low elsewhere) passes, and the result
  says which route did it.

### 5. `3.1` — Make the engine stateless
- Pure refactor, existing tests green throughout.
- Two entry points:
  - `selectNext({ config, history, posterior }) -> { item, posterior, stopReason | null }`
  - `grade({ item, response, latencyMs, posterior }) -> { correct | null, posterior, flags }`
- Keep `QbankSession` as a thin stateful wrapper so nothing downstream breaks.
- **Done when:** both functions run with no server and no filesystem, and `apps/api` calls them.

### 6. `3.4` — Write the wire contract
- No OpenAPI spec exists; the contract lives in Express handlers and is re-declared by hand in each
  client (for example `apps/web/src/BankScreener.tsx:18-54`).
- Write the spec, then generate or hand-write one typed client and use it in every app.
- **Done when:** no app declares its own request/response types.

### 7. `3.6` — Add CI
- `screener/` has no `.github/workflows`.
- Run `npm run verify` on every push.
- **Done when:** a red test blocks a merge.

### 8. `1b.3` — Rapid-guess detection
- `latencyMs` is already captured and stored (`packages/qbank/src/session.ts:126-138`) and unused.
- Below a per-item-type latency floor, return the response as unscorable rather than wrong.
- Unscorable already exists and is already excluded from the estimate.
- **Done when:** floors are per type code, not global, and a sub-floor response leaves the posterior
  unchanged.

### 9. `2.2` — Classify the 36 unmapped types
- `packages/ui-contract/src/cogat.ts` is the only machine-readable mapping; 17 of 53 are in it.
- For each of the remaining 36, record either a subtest or an explicit `none`.
- **Done when:** no type is absent from the mapping.

### 10. `2.3` — Put the mapping on the item and enforce it
- Add `cogatSubtest` to the bank records.
- Fail the build when a type has neither a subtest nor `none`.
- Filter the pool by it at session start; `POST /api/bank/sessions` already takes a `types` parameter.
- **Done when:** a CogAT-aligned session cannot draw an unmapped type.

### 11. `2.4` — Reconcile `showcase.ts` with `cogat.ts`
- `apps/lab-system/shared/showcase.ts` is a second, disagreeing list.
- After `2.2` and `2.3`, derive it from the mapping instead of hand-writing it.
- **Done when:** there is one source of truth.

### 12. `2.5` — Fix stale counts
Numbers below marked *(measured 8 Aug)* were taken during `1b.7`; the rest still need measuring.

- `docs/design/ui-agnostic-assessment-system.md` §5 says 52 types and 9 direct; it is 53 and 10.
- `screener/README.md:148-149` says 4,534 markable and 2,785 not. Both predate index keys. It is
  **5,034 markable and 2,285 not** *(measured 8 Aug)*, and both change again with `1b.6`.
- This file and `engine-portability-todo.md` said 5,425 scorable. That is the `deterministic_key`
  count, which includes the 391 held-back `QUANT-GLYPHNUM-01` items. Servable is **5,034**
  *(measured 8 Aug)* — `npm run smoke` already prints it.
- Both docs say 195 tests; it is **198** *(measured 8 Aug)*.
- `apps/lab-system/Launcher.tsx:99` and `apps/lab-system/DEMO.md` say six experiences; there are 13.
- `docs/handoff/2026-08-06-system-led-apps.md` predates uikit, uispec, showcase, Poketrainer and
  Default UI.
- **Done when:** every count in the docs matches a number you measured today.

### 13. `1b.8` — Measure whether lure weighting is worth doing, before doing it
Gates `1b.2` and `1b.1`. Throwaway code; do not merge the weighting itself from this task.

**Blocked as written (found 8 Aug during `1a.5`).** The *Baseline* step below says to run
`packages/engine/src/harness/` unchanged. That harness contains no reference to `qbank`,
`QbankSession` or `loadBanks` — it simulates the generator engine, so it cannot measure a change to
bank scoring. Proof: a change that reordered 1,695 bank items left `npm run sim` byte-identical. Either
give the harness a bank-backed mode first, or measure through `apps/lab-system/verify-showcase.ts`,
which does play real bank sessions per age band. Settle this before starting.

- **Coverage.** 6,928 of 7,319 items carry `answer.distractorRationales`, but that is the count that
  *carries* the data, not the count where you can look up the class the child picked. On the 21
  showcase types the join is:

  | Join state | Types | Items |
  |---|---|---|
  | Rationale keys == option keys, `correct` entry == `correctKey` | 9 | 1,114 |
  | Rationale holds distractors only (`opt=[A,B,C,D]`, `rat=[A,B,D]`) — one line to handle | 3 | 312 |
  | `content.options` is `null`, nothing to key on | 5 | 602 |
  | Options present but carry no `key` field | 4 | 400 |

  Clean 9: `FLU-ANALOGY-01`, `FLU-CARPET-01`, `FLU-MATRIX-01`, `SPA-FOLDNET-01`, `SPA-PICKFOLD-01`,
  `SPA-ROLL-01`, `SPA-SHADOW-01`, `SPA-XFORM-01`, `SPA-XSCAN-01`. Re-run this across all 53 types,
  not just the showcase.

- **Baseline.** Run the simulation harness (`packages/engine/src/harness/`) unchanged and record pass
  rate and mean estimate per age band.

- **Spike.** Add fractional scoring behind a flag: `likelihood = p^s · (1-p)^(1-s)`, where `s = 1`
  correct, `s = 0` unclassifiable, and a provisional ordering in between. Starting proposal, to be
  replaced by `1b.2`, not treated as the answer:

  | Group | Classes | `s` |
  |---|---|---|
  | Had the structure, misapplied it | `near_order`, `reversed_relation` | 0.35 |
  | Engaged the rule, broke it | `rule_violation`, `local_fit` | 0.20 |
  | Processed the surface | `surface_match`, `associate` | 0.10 |
  | Did not engage | `global_mismatch` | 0 |
  | Unknown | `distractor_other`, unjoinable, no rationale | 0 |

- **Report three numbers**, per age band: share of scored responses that received a non-binary `s`;
  change in pass rate; change in mean estimate. The third is the one to watch — every wrong answer now
  costs less, so estimates drift **upward** and the effective threshold moves without anyone editing
  `abilityThreshold`.

- **Done when:** those numbers exist and someone has decided whether the shift is large enough to
  justify `1b.2`'s ordering argument, or small enough to close `1b.1` and `1b.2` as not worth it.

### 14. `1b.2` then `1b.1` — Lure-class weighting
Only if `1b.8` says the effect is real.

- `1b.2` first: rank the eight non-`correct` `lureClass` values, and get the ranking reviewed by
  whoever authored the banks.
- `1b.1`: apply the ranking as a per-class likelihood in the posterior update, not as a partial-credit
  score bolted on. Fractional scoring is a heuristic standing in for a nominal response model, which
  needs per-option parameters we do not have — say so in the code.
- Anything unclassifiable falls back to binary, so unjoinable types behave exactly as they do today.
- Recalibrate `abilityThreshold` against the drift measured in `1b.8`, or state why not.
- **Done when:** a near-miss moves the posterior less than a wild miss, in one coherent model, and the
  threshold change is recorded.

### 15. `1b.6` — Implement the missing scoring modes
- `packages/qbank/src/bank.ts:121` admits only `deterministic_key`; **2,285** of 7,319 items are
  dropped at load, in **three** categories, not two (measured 8 Aug during `1b.7`).
- `computed_solver`: 1,774 items across 15 types. `model_judge_deferred`: 120 items,
  `CX-achieve-02`.
- **Numeric key with a tolerance: 391 items, `QUANT-GLYPHNUM-01`.** Declares `deterministic_key` and
  carries `answer.tolerance` (`0.025`), so it needs one comparison within a tolerance — no solver, no
  judge. Cheapest of the three and the data is already there; do it first.
- Start with `SPA-PUNCH-01` (key `"0,0|0,3"`, a set of grid cells) — it is the one true Paper Folding
  type. Port from `archive/apps/web/src/lib/exam/verifiers/` rather than writing fresh.
- Treat `scoring.mode` in the bank as a claim to verify, not a fact.
- **Done when:** Paper Folding is servable and the excluded count is stated in the loader summary.

### 16. `2.1` — Build a Verbal Analogies type
- Zero direct coverage today. `VER-RELPAIR-01` is mapped loosely and its own note says it is not
  `A:B::C:?` completion.
- **Done when:** the type has a bank, a renderer, a checker and a `cogat.ts` entry at `direct`.

---

## Blocked, not scheduled

- `1a.6` — calibrate discrimination from response data. Needs real attempts. `packages/stats/src/index.ts:85-115`
  already computes point-biserial, which is the input.
- `1b.4` — person-fit across the session. Do `1b.3` first. Report it before acting on it.
- `1b.5` — forward the renderer metrics that hosts currently drop
  (`apps/lab-system/shared/headless/useQuestionSession.ts:207-209` sends only `{ response, latencyMs }`).
  Store them before anything consumes them.
- `3.2` — decide where session state lives: caller-held and signed, or DynamoDB. Needed before `3.5`.
- `3.3` — cold-start bank loading. `loadBanks()` reads 19 MB at startup. Selection needs item
  metadata only, never content.
- `3.5` — the Lambdas themselves. Thin wrappers over `3.1`. One IaC approach; do not add a third
  alongside the archive's Terraform.

---

## Running it

```bash
cd screener
npm install
npm run api          # Express on 5181
npm run web          # Vite on 5180
npm run verify       # typecheck, 195 tests, simulation, smoke
npm run kit          # UI kit coverage report
npx tsx apps/lab-system/verify-showcase.ts   # plays a real session per age band
```
