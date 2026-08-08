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
- `packages/qbank/src/session.ts:231` (pre-3.1 location; now `engine.ts`) and the `submit()` update call
  both hardcode
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

**Resolved 8 Aug (Felipe), in two parts.** Every servable item now derives a guessing floor from its own
content — a declared stepper range, a count bounded by the grid, `binCount^tokenCount`, or `2^probes` —
so `optionCountOf` returns null for nothing in the bank and the floor falls as an item gets harder.
Four types that named their option list `candidates`, `rows` or `claims` are read directly.

A small floor cannot rebalance selection: a constructed item needs a genuine 1-in-4 guess just to draw
level with a four-option item, so they really are more informative per item. They are also much slower to
answer, so `minMultipleChoiceShare` (default 0.5) holds at least half of each session for multiple
choice, as a running share that scales from a 4-item Taster to a 20-item Thorough. Measured on a 16-item
session over the full pool: 13% multiple choice before, 50% after. It is a serving rule, not a change to
the model — penalising a constructed item's information would corrupt the number the stop rule reads.
Superseded by information-per-expected-second once `1b.5` forwards `latencyMs`.

**Two things still open, both worth settling before task 3 (`1a.4`):**
- The five constructed types are all unmapped to CogAT (see `2.2`). The share caps them at half a session
  rather than resolving alignment; `2.3`'s pool filter is what resolves it.
- **There is no per-type diversity rule anywhere.** A 16-item session serves `CX-check-01` eight times and
  `SPA-VIEW-01` five — about four distinct types in sixteen questions. Pre-existing and worse before
  today (eleven of sixteen), because one type's items share a difficulty band, so whatever wins once wins
  repeatedly. Coverage is enforced per domain and per format and never per type. `1a.4` would otherwise
  report a spatial band whose evidence is five items of one type.

**Also found, and it blocks task 13:** `npm run sim` never touches qbank, so `1b.8` cannot baseline off
it as written. See the 1a.5 entry.

### 3. `1a.4` — Hold and report a confidence interval per domain — **DONE 8 Aug 2026**
- Four `Posterior` instances, one per domain, each updated only by its own domain's items.
- Composite posterior stays exactly as it is and remains the primary pass route.
- Extend `state()` to return per domain: mean, 90% interval, items served.
- Suppress a domain that received zero items rather than emitting the prior.
- Never emit a mean without its interval.
- ~~**Done when:** a K-1 session returns no verbal band, and a full session returns four.~~
- **Done when (corrected):** a domain that scored nothing returns no band, and a session that covered all
  four returns four.

New `domains` on `QbankState`, keyed by domain, each entry carrying mean, 90% interval, items served and
items scored. `mean` and `interval` are both required on `DomainBand`, so the "never a mean without its
interval" rule is structural rather than remembered. Suppression keys off items *scored*, since a domain
whose responses were all unmarkable holds the prior just as surely as one never asked. Tests in
`domain-bands.test.ts` rebuild each domain from its own attempts and the composite from all of them; 220
tests pass.

**The original acceptance criterion was wrong and is struck through above.** K-1 has 51 servable verbal
items and a K-1 session with `perDomainMinimum: 1` serves one, so it does return a verbal band. Measured,
not reasoned. Suppression is reachable without K-1: at `perDomainMinimum: 0` greedy selection puts a whole
session into one or two domains at every band.

Bands are 2.05 to 3.30 logits wide and a single-item band is barely off the prior — a K-1 session reports
`verbal: 0.07 [-1.50, 1.65]` off one item against a composite of 1.15. Nothing renders them yet; whatever
does must show the interval and the count. Full numbers in the 1a.4 entry of
`engine-portability-todo.md`.

### 4. `1a.7` — Disjunctive pass rule — **DONE 8 Aug 2026**
- ~~Blocked on `1a.4`.~~ Unblocked and done.
- Pass if the composite clears its threshold, **or** if `P(theta_domain > domainBar) >= p` for any
  single domain.
- Add `domainBar` and `p` to config alongside `abilityThreshold` / `recommendProbability`, with a
  comment that both are unvalidated.
- Record which route produced the pass on the result.
- Do not report a domain-triggered pass as a domain strength.
- **Done when:** a simulated spiky candidate (high one domain, low elsewhere) passes, and the result
  says which route did it.

`passRouteFor` (in `engine.ts` since task 5), `passRoute` on `QbankState`, and `domainBar` / `domainRecommendProbability`
in config defaulting to **1.5** and **0.45** — chosen against simulated cohorts, both commented as
unvalidated. Tests in `disjunctive-pass.test.ts`; 229 tests pass.

**The composite recommends 0% of true spatial spikes** — 150 simulated candidates at +2.5 spatial and
-1.0 elsewhere, every one rejected `confident-below` at pAbove ≈ 0.019. With the rule: 78% recommended,
all via the domain route, against 1% of uniformly weak candidates and 0% domain-route firing for the
uniformly strong (they pass on the composite, as they should).

`p` does nearly all the work, as predicted: a cliff just above 0.5 kills the rule entirely, and a bar of
2.0 never fires, because four items cannot put that much mass past it. **The rule's power depends on
`perDomainMinimum`**, so lowering that disables this.

`passRoute` lists every domain that cleared in `DOMAINS` order, never a strongest one, and only domains
that actually scored are eligible — an untouched domain's prior would otherwise manufacture a pass.

**Two things to own before anything renders a result:**
- `stopReason: 'confident-below'` beside `decision: 'recommend'` is now reachable and correct. It is the
  rule working, and it looks like a bug to anyone shown both without explanation.
- The domain route is in practice a **single-domain** rule: two domains at +2.0 lift the composite to
  pAbove 0.86, so the composite claims them first.

Full numbers in the 1a.7 entry of `engine-portability-todo.md`.

### 5. `3.1` — Make the engine stateless — **DONE 8 Aug 2026**
- Pure refactor, existing tests green throughout.
- Two entry points:
  - `selectNext({ config, history, posterior }) -> { item, posterior, stopReason | null }`
  - `grade({ item, response, latencyMs, posterior }) -> { correct | null, posterior, flags }`
- Keep `QbankSession` as a thin stateful wrapper so nothing downstream breaks.
- **Done when:** both functions run with no server and no filesystem, and `apps/api` calls them.

New `packages/qbank/src/engine.ts`; `session.ts` is now a thin wrapper — a 130-line class plus a
re-export block keeping the moved types importable from their old path, so no consumer changed. 241 tests pass. `engine.test.ts` runs a whole session from eight inline records
without touching `loadBanks`, which is the "no filesystem" claim made checkable.

Two forced departures from the signatures above: `posterior` is `posteriors` (composite plus one per domain,
since 1a.4 and 1a.7), and `selectNext` takes a `pool`, because no-filesystem means items arrive as an
argument — `buildPool(records, ageBand)` is the engine's entire dependency on the item library. `flags` is
empty until `1b.3` fills it; it is in the shape now because changing a published contract (3.4) costs more
than reserving a field.

Six private session fields became one derivation (`progressFrom`), so the counters can no longer disagree
with the transcript. `Posterior` gained `fromSnapshot` and `clone` — it had `snapshot()` and no way back,
which was the real obstacle to this task and to `3.2`.

**A bug the new tests caught:** `clone()` went through `fromSnapshot`, which renormalises, so every `grade`
perturbed belief by ~1e-16 including in untouched domains, and an incrementally-updated posterior drifted
from the same posterior replayed from its history. Two hosts would have disagreed about the same child.
`clone()` is exact now, with a test asserting incremental and replayed beliefs are bit-identical.

**Not overclaimed:** the functions never read a file, but `engine.ts` imports `bank.ts`, which imports
`node:fs`. Irrelevant on Lambda, relevant to a browser bundle. Severing it means splitting the pure record
helpers out of the loader — the same seam `3.3` opens. Do them together.

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
- `latencyMs` is already captured and stored (the attempt record built in `session.ts` `submit`) and
  unused. Grading now lives in `engine.ts` `grade`, which is where the floor check belongs; it already
  returns a `flags` array reserved for exactly this.
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

### 13. `1b.8` — Measure whether lure weighting is worth doing — **SKIPPED 8 Aug 2026 (Felipe)**
Gates `1b.2` and `1b.1`. Throwaway code; do not merge the weighting itself from this task.

**Not being done.** Two consequences worth stating rather than leaving implied. `1b.1` and `1b.2` stay
gated and unstarted — skipping the measurement is not a finding that the effect is small, so nobody should
implement lure-class weighting on the strength of the ordering argument alone. And the blocker below stands
unresolved for whenever this is reopened: the simulation harness cannot measure a qbank scoring change.

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

### 14. `1b.2` then `1b.1` — Lure-class weighting — **BLOCKED, gate skipped**
Only if `1b.8` says the effect is real, and `1b.8` was skipped on 8 Aug rather than run, so it has not
said. Do not start these without reinstating some measurement first.

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
- ~~`3.2` — decide where session state lives.~~ **RESOLVED 8 Aug 2026 (Felipe): caller-held, no table.**
  `packages/qbank/src/portable.ts` — `sealSession` / `openSession` / `resumeFrom`, 16 tests.
  **Sealed with AES-256-GCM, not signed.** Signing gives integrity and says nothing about confidentiality,
  and a readable transcript tells the child whether each answer was right — the one thing every item in the
  catalogue refuses to say, asserted three times in `scripts/check-practice.py`. The token carries the
  transcript, the config and the stop reason; **no posterior**, since 3.1 proved belief replays from the
  transcript bit for bit. Config is sealed *inside* so a client cannot lower its own bar mid-session.
  **Measured sizes bind `3.4`:** 4.6 KB at Standard, 10.7 KB at Thorough — too big for a cookie and for most
  proxy header limits, so the token goes in the request **body**. Two limitations crypto does not remove, for
  `3.5` to rule on: a token can be replayed to retry a wrong answer, and resuming against a narrowed pool
  would drop evidence (`resumeFrom` refuses rather than replaying a truncated history). Full reasoning in
  the 3.2 entry of `engine-portability-todo.md`.
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
