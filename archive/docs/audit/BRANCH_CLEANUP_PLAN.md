# Branch and Worktree Cleanup Plan

**Audited from:** `feat/repo-structure-audit` @ `5c2c2ab`, 2026-07-27.
**Nothing was deleted, merged, renamed, or pushed in producing this document.**
Every disposition below is derived from `git rev-list`, `git cherry`, and
`git branch --contains`. Anything not provable is marked **NEEDS-REVIEW** rather
than guessed.

---

## 1. Headline

```
$ git branch   | wc -l   → 96 local
$ git branch -r| wc -l   → 43 remote refs (42 branches + origin/HEAD)
$ git worktree list | wc -l → 26
```

The task brief cited 136 branches / 73 unmerged `feat/*` / 23 worktrees. Current
actuals are **139 refs, 76 local branches unmerged into `dev`, and 26
worktrees** — the sprawl has grown slightly since that count.

**Of 96 local branches, 80 are provably contained in `dev` or in a live branch
tip.** Only **13 branches hold work that exists nowhere else**, plus 3 protected
tier branches.

| Disposition | Count | Meaning |
| --- | ---: | --- |
| `PROTECTED` | 3 | `main`, `staging`, `dev` — never delete |
| `UNIQUE-CONTENT-KEEP` | 13 | Tip is not contained in any other branch |
| `SUPERSEDED` | 61 | Tip is a strict ancestor of another live branch |
| `MERGED-ALREADY-DELETE-SAFE` | 19 | Tip is an ancestor of `dev` |

**The most useful single fact:** 48 of the 61 superseded branches are the
step-by-step history of one workstream (Gen-B) and are all absorbed by
`feat/exam-integration-verify`. A further 13 are absorbed by the current Gen-A
tip. The branch count overstates the number of real workstreams by roughly 7×.

---

## 2. Two safety problems found — read before any git operation

### 2.1 Twelve branches have an upstream pointing at a *different* branch

A bare `git push` from these pushes **into another branch's remote**. Given the
brief's note that a previous parallel run corrupted sibling branches, this is
almost certainly the mechanism.

```
$ git for-each-ref --format='%(refname:short)|%(upstream:short)' refs/heads/ \
    | awk -F'|' '$2!="" && $2!="origin/"$1 {print $1" -> "$2}'
feat/exam-contract-reconcile  -> origin/feat/exam-integration
feat/exam-converge            -> origin/feat/exam-integration
feat/exam-item-bank-research  -> origin/dev
feat/exam-key-balance         -> origin/feat/exam-integration
feat/exam-key-balance-2       -> origin/feat/exam-integration
feat/exam-key-balance-3       -> origin/feat/exam-integration
feat/exam-question-types      -> origin/dev
feat/exam-verify-fluid-2      -> origin/feat/exam-integration
feat/exam-verify-fluid-3      -> origin/feat/exam-integration
feat/exam-verify-quant-2      -> origin/feat/exam-integration
feat/exam-verify-spatial-4    -> origin/feat/exam-integration
feat/interview-scope-update   -> origin/dev
```

**Three of these track `origin/dev` directly.** `feat/interview-scope-update`
is 1 commit ahead of `dev` and 59 behind; a `git push` from its worktree targets
`dev`.

**Recommended fix (non-destructive, do this first):**

```bash
git branch --unset-upstream feat/interview-scope-update
git branch --unset-upstream feat/exam-question-types
git branch --unset-upstream feat/exam-item-bank-research
# …and the nine tracking origin/feat/exam-integration
```

`--unset-upstream` only edits `.git/config`; it touches no commits and no
worktree. **Confidence: high.** This is the highest-priority item in the
document and is independent of every other decision.

### 2.2 `main` and `staging` are 128 commits behind `dev`

```
| main    | ahead 4 | behind 128 | git cherry dev main    → 0 unmerged by patch-id |
| staging | ahead 2 | behind 128 | git cherry dev staging → 0 unmerged by patch-id |
```

The four-tier promotion flow in `AGENTS.md` (`feat/* → dev → staging → main`)
has effectively stopped: `dev` has advanced 128 commits without a promotion.
`git cherry` reports that main's and staging's 4 and 2 extra commits are
patch-present in `dev`, so they carry no unique content — but they are **not
ancestors** of `dev`, so a fast-forward is not available and any promotion is a
real merge.

**No action recommended here without owner input** — restoring the tier flow is
a governance decision, not cleanup. Flagged because "the reviewed baseline" is
currently 128 commits stale, which affects how much any `main`-based claim can
be trusted.

---

## 3. The 13 branches that hold unique work

These are the only branches whose deletion would lose something.

| Branch | Ahead/behind `dev` | Remote | What it is |
| --- | ---: | --- | --- |
| `feat/exam-integration-verify` | 233/8 | pushed | **Gen-B's true tip.** Strictly contains `feat/exam-integration`. Evaluate *this*, not `feat/exam-integration`. |
| `feat/exam-cat-adapter-wire` | 39/0 | local-only | **Moved during this audit** — now `4fae489`, one commit ahead of `5c2c2ab`: *"wire cat-engine EAP/MLE theta into the two-stage demo summary"* (587 insertions). Contains `5c2c2ab`. Unpushed. |
| `feat/persona-sim` | 38/0 | local-only | Same commit; active |
| `feat/repo-structure-audit` | 38/0 | local-only | This audit |
| `feat/test-structure-revamp` | 38/0 | pushed | Current Gen-A tip; base of the three above |
| `feat/adaptive-exam-app` | 6/47 | **local-only** | Unpushed, 3 days idle |
| `feat/onboarding-demo-redesign` | 4/99 | pushed | 6 days idle |
| `feat/exam-item-bank-research` | 2/64 | upstream=`origin/dev` ⚠️ | 5 days idle |
| `feat/prd-dev-gap-fixes` | 2/100 | **local-only** | 7 days idle — oldest unique work |
| `feat/exam-genAB-consolidation-plan` | 1/0 | pushed | Current |
| `feat/gt-brand-frontend` | 1/0 | pushed | Current; has a worktree |
| `feat/interview-scope-update` | 1/59 | upstream=`origin/dev` ⚠️ | 3 days idle |
| `feat/reseparate-brainlifts` | 1/68 | pushed | 4 days idle |

**Three of these are local-only and unpushed** (`feat/adaptive-exam-app`,
`feat/prd-dev-gap-fixes`, plus the audit/sim branches). Their only copy is on
this machine. **Recommendation: push them for backup before any cleanup.** That
is additive and reversible.

`feat/exam-integration-verify` vs `feat/exam-integration`: the latter is
**contained in** the former (`git branch --contains feat/exam-integration`
returns `feat/exam-integration-verify`). The Gen-A/Gen-B evaluation in
`GEN_A_VS_GEN_B.md` used `feat/exam-integration` per the brief; the extra commit
on `-verify` should be reviewed before any adoption decision.

---

## 4. Superseded branches, grouped by what absorbs them

### 4.1 Absorbed by `feat/exam-integration-verify` — 48 branches

The Gen-B workstream's incremental history. Each tip is a strict ancestor of the
next; nothing is lost by deleting them **if and only if
`feat/exam-integration-verify` is retained**.

```
exam-agebands, exam-backend, exam-bank-{fluid,fluid-2,fluid-3,quant,quant-2,
quant-3,spatial,spatial-2,spatial-3,spatial-4,spatial-5,verbal,verbal-2,verbal-3},
exam-contract-reconcile, exam-contracts, exam-converge, exam-dupes, exam-dupes-2,
exam-engine, exam-frontend, exam-init-handshake, exam-integration,
exam-key-balance{,-2,-3}, exam-leak-fix, exam-overshoot, exam-persist,
exam-score-ability, exam-score-input, exam-scoring, exam-spaview,
exam-standalone-guard, exam-stoprule, exam-telemetry-gate, exam-validators,
exam-verify-{fluid-2,fluid-3,plpgsql,quant-2,spatial-4,vbatch1,vbatch2,vbatch3},
exam-wire
```

**Disposition: SUPERSEDED.** Safe to delete *only after* Gen-B's fate is
decided. **Do not delete while the Gen-A/Gen-B choice is open** — if Gen-B is
rejected, someone may want to salvage an intermediate step, and these branches
are the only bookmarks into a 232-commit history.

### 4.2 Absorbed by the current Gen-A tip — 13 branches

```
exam-data-model, exam-genA-integration-probe, exam-item-bank,
exam-model-reconcile, exam-scoring-engine, exam-scoring-lambda,
exam-session-shell, exam-stage-classification, exam-two-stage-demo,
exam-two-stage-demo-shots, exam-two-stage-real-pools, exam-validation-harness,
overnight-review-guide
```

All are strict ancestors of `feat/test-structure-revamp` @ `5c2c2ab` (and thus
of this branch). Their content already sits in the Gen-A line.

**Disposition: SUPERSEDED.** Deleting these is lower-risk than 4.1 because their
content is on a branch that is only 0 commits behind `dev`. Still, hold until
Gen-A/Gen-B is settled.

---

## 5. The 19 branches already fully in `dev`

Every one satisfies `git rev-list --count dev..<branch> == 0`, i.e. its tip is an
ancestor of `dev`. This is the strongest containment guarantee available and is
exactly what `git branch -d` checks.

```
feat/backend-admissions-core            feat/governance-feature-map-cleanup
feat/brainlift-additional-evidence      feat/governance-lambda-decision
feat/brainlift-gifted-assessment-quality feat/monorepo-scaffold
feat/brainlift-test-structure           feat/onboarding-backend-core
feat/brainlift-two-stage-evaluation     feat/onboarding-contract-foundation
feat/ci-action-runtime-upgrade          feat/qtype-recategorization
feat/crystal-interview-notes            feat/supabase-port-isolation
feat/document-git-branch-workflow       research/overnight-backend-selection
feat/exam-item-schema-spec              feat/exam-question-types
feat/fast-agent-mode
```

**Disposition: MERGED-ALREADY-DELETE-SAFE. Confidence: high** — this is the one
group I would act on today.

Two caveats:

- `research/overnight-backend-selection` is designated in `AGENTS.md` as a
  **long-running archival branch**. It is fully merged, but the governance doc
  says to keep it as a historical record. **Reclassified NEEDS-REVIEW** —
  contained, but deliberately retained. Do not delete without a governance note.
- `feat/exam-question-types` has upstream `origin/dev` (§2.1). Unset the
  upstream before touching it.

Suggested verification-then-delete, one at a time:

```bash
git rev-list --count dev..feat/monorepo-scaffold   # must print 0
git branch -d feat/monorepo-scaffold               # -d refuses if not merged
git push origin --delete feat/monorepo-scaffold    # only after the local delete
```

Use `-d`, never `-D`. `-d` performs its own containment check and is the safety
net for any error in this document.

---

## 6. Worktrees (26)

`git worktree list` output, annotated with the disposition of the branch each
holds:

| Worktree | Branch | Branch disposition | Note |
| --- | --- | --- | --- |
| `gt-selection-capstone` | `feat/gt-brand-frontend` | UNIQUE | Primary checkout |
| `gt-worktrees/repo-structure-audit` | `feat/repo-structure-audit` | UNIQUE | This audit |
| `gt-worktrees/test-structure-revamp` | `feat/test-structure-revamp` | UNIQUE | Gen-A tip |
| `gt-worktrees/persona-sim` | `feat/persona-sim` | UNIQUE | Active |
| `gt-worktrees/cat-adapter-wire` | `feat/exam-cat-adapter-wire` | UNIQUE | Active; advanced to `4fae489` mid-audit. **Unpushed — back up** |
| `gt-selection-ex-handshake` | `feat/exam-integration` | SUPERSEDED | Gen-B, superseded by `-verify` |
| `gt-worktrees/exam-integration-verify` | `feat/exam-integration-verify` | UNIQUE | **Gen-B's real tip** |
| `gt-worktrees/exam-genAB-consolidation-plan` | `feat/exam-genAB-consolidation-plan` | UNIQUE | Current |
| `gt-capstone-exam-validation-harness` | `feat/exam-validation-harness` | SUPERSEDED | **Stale** |
| `gt-selection-adaptive-exam` | `feat/adaptive-exam-app` | UNIQUE | Unpushed — back up first |
| `gt-selection-ex-integration` | `feat/exam-verify-plpgsql` | SUPERSEDED | **Stale** |
| `gt-selection-ex-telemetry` | `feat/exam-telemetry-gate` | SUPERSEDED | **Stale** |
| `gt-selection-exam-items` | `feat/exam-item-bank-research` | UNIQUE | ⚠️ upstream=`origin/dev` |
| `gt-selection-exam-session-shell` | `feat/exam-session-shell` | SUPERSEDED | **Stale** |
| `gt-selection-interview-scope` | `feat/interview-scope-update` | UNIQUE | ⚠️ upstream=`origin/dev` |
| `gt-worktrees/exam-genA-integration-probe` | `feat/exam-genA-integration-probe` | SUPERSEDED | **Stale** |
| `gt-worktrees/exam-model-reconcile` | `feat/exam-model-reconcile` | SUPERSEDED | **Stale** |
| `gt-worktrees/exam-scoring-engine` | `feat/exam-scoring-engine` | SUPERSEDED | **Stale** |
| `gt-worktrees/exam-scoring-lambda` | `feat/exam-scoring-lambda` | SUPERSEDED | **Stale** |
| `gt-worktrees/exam-stage-classification` | `feat/exam-stage-classification` | SUPERSEDED | **Stale** |
| `gt-worktrees/exam-two-stage-demo` | `feat/exam-two-stage-demo` | SUPERSEDED | **Stale** |
| `gt-worktrees/exam-two-stage-demo-shots` | `feat/exam-two-stage-demo-shots` | SUPERSEDED | **Stale** |
| `gt-worktrees/exam-two-stage-real-pools` | `feat/exam-two-stage-real-pools` | SUPERSEDED | **Stale** |
| `gt-worktrees/overnight-review-guide` | `feat/overnight-review-guide` | SUPERSEDED | **Stale** |
| `gt-selection-pr1-audit` | *(detached HEAD `0d061ab`)* | — | **NEEDS-REVIEW** |
| `gt-selection-qbank-preview` | *(detached HEAD `47f5311`)* | — | **NEEDS-REVIEW** |

**14 worktrees hold branches whose content is already contained elsewhere** —
candidates for `git worktree remove` once the branch decisions are made.

### Two important limitations on this table

1. **I did not check any worktree for uncommitted changes.** The brief said not
   to touch other worktrees, and `git -C <path> status` can write `.git/index`.
   So **"stale" here means "the branch's committed content is contained
   elsewhere", not "there is nothing to lose"**. `git worktree remove` refuses
   on a dirty tree by default (do **not** pass `--force`), which is the safety
   net. Before removing any worktree, the owner should open it and check.
2. **The two detached-HEAD worktrees are genuinely unresolved.**
   `gt-selection-pr1-audit` @ `0d061ab` matches `feat/backend-admissions-core`
   (merged, safe). `gt-selection-qbank-preview` @ `47f5311` matches **no local
   branch** — I could not determine what it is or whether it is contained.
   **NEEDS-REVIEW; do not remove.**

---

## 7. Recommended sequence

Ordered so that each step is independently reversible and no step depends on an
unresolved decision.

**Phase 1 — safety only, do now, no deletions**

1. Unset the 12 mis-set upstreams (§2.1). Config-only.
2. Push the local-only branches that hold unique work:
   `feat/adaptive-exam-app`, `feat/prd-dev-gap-fixes` (and the active audit/sim
   branches). Additive.
3. Record `feat/exam-integration-verify`, not `feat/exam-integration`, as the
   Gen-B evaluation target.

**Phase 2 — provable deletions, after Phase 1**

4. Delete the 18 fully-merged branches (§5, excluding
   `research/overnight-backend-selection`), one at a time with
   `git branch -d`, verifying `git rev-list --count dev..<b> == 0` first.
   Delete the remote counterpart only after the local delete succeeds.
5. Open the 2 detached-HEAD worktrees, determine what they are, then decide.

**Phase 3 — blocked on the Gen-A/Gen-B decision**

6. After the decision, delete the 48 Gen-B-lineage branches (§4.1) or the 13
   Gen-A-lineage branches (§4.2), whichever workstream is retired — **keeping
   the retained line's tip**.
7. Remove the corresponding worktrees, without `--force`.

**Phase 4 — governance**

8. Decide whether to restore the `dev → staging → main` promotion flow, or
   amend `AGENTS.md` to describe what is actually practised. The current
   128-commit gap means neither is true today.

**Nothing in Phase 2 or 3 is safe to automate in bulk.** The `-d` flag plus
one-at-a-time execution is the whole safety argument.

---

## 8. Full inventory

Ahead/behind are `git rev-list --count dev..<b>` / `<b>..dev`. "Contained in" is
`git branch --contains <b>` excluding same-commit siblings. Bold `upstream=`
marks the §2.1 hazard.

> **Snapshot warning.** This table was captured at one moment on 2026-07-27
> while other agents were actively committing. `feat/exam-cat-adapter-wire`
> already moved from `5c2c2ab` to `4fae489` *during* the audit (§3), so its row
> below is stale by one commit. **Re-run the inventory immediately before acting
> on any deletion** — every disposition here depends on tips that can move.
> The `git branch -d` containment check in §5/§7 is the backstop for exactly
> this class of staleness.

| Branch | Tip | Ahead/behind `dev` | Remote | Contained in | Disposition |
| --- | --- | ---: | --- | --- | --- |
| `dev` | `2bc1fe8` | 0/0 | pushed | 19 branches incl. `feat/test-structure-revamp` | PROTECTED |
| `main` | `4c2b3bf` | 4/128 | pushed | — | PROTECTED |
| `staging` | `22c42e0` | 2/128 | pushed | `main` | PROTECTED |
| `feat/adaptive-exam-app` | `301801f` | 6/47 | local-only | — | UNIQUE-CONTENT-KEEP |
| `feat/exam-genAB-consolidation-plan` | `750c8dc` | 1/0 | pushed | — | UNIQUE-CONTENT-KEEP |
| `feat/exam-integration-verify` | `d7db7fb` | 233/8 | pushed | — | UNIQUE-CONTENT-KEEP |
| `feat/exam-item-bank-research` | `253553b` | 2/64 | **upstream=origin/dev** | — | UNIQUE-CONTENT-KEEP |
| `feat/gt-brand-frontend` | `7bbf04a` | 1/0 | pushed | — | UNIQUE-CONTENT-KEEP |
| `feat/interview-scope-update` | `51776da` | 1/59 | **upstream=origin/dev** | — | UNIQUE-CONTENT-KEEP |
| `feat/onboarding-demo-redesign` | `874809f` | 4/99 | pushed | — | UNIQUE-CONTENT-KEEP |
| `feat/prd-dev-gap-fixes` | `8f395ab` | 2/100 | local-only | — | UNIQUE-CONTENT-KEEP |
| `feat/reseparate-brainlifts` | `c0c37a1` | 1/68 | pushed | — | UNIQUE-CONTENT-KEEP |
| `feat/exam-cat-adapter-wire` | `5c2c2ab` | 38/0 | local-only | same commit as 3 siblings | UNIQUE-CONTENT-KEEP (active) |
| `feat/persona-sim` | `5c2c2ab` | 38/0 | local-only | same commit as 3 siblings | UNIQUE-CONTENT-KEEP (active) |
| `feat/repo-structure-audit` | `5c2c2ab` | 38/0 | local-only | same commit as 3 siblings | UNIQUE-CONTENT-KEEP (active) |
| `feat/test-structure-revamp` | `5c2c2ab` | 38/0 | pushed | same commit as 3 siblings | UNIQUE-CONTENT-KEEP (active) |
| `feat/exam-agebands` | `64a5a21` | 186/8 | local-only | 14 branches incl. `feat/exam-verify-vbatch3` | SUPERSEDED |
| `feat/exam-backend` | `31ed1fb` | 62/12 | local-only | 26 branches incl. `feat/exam-verify-vbatch3` | SUPERSEDED |
| `feat/exam-bank-fluid` | `931ec04` | 61/12 | local-only | 27 branches incl. `feat/exam-verify-vbatch3` | SUPERSEDED |
| `feat/exam-bank-fluid-2` | `a22d566` | 60/12 | local-only | 29 branches incl. `feat/exam-verify-vbatch3` | SUPERSEDED |
| `feat/exam-bank-fluid-3` | `9205a75` | 61/12 | local-only | 29 branches incl. `feat/exam-verify-vbatch3` | SUPERSEDED |
| `feat/exam-bank-quant` | `81c040a` | 67/8 | local-only | 26 branches incl. `feat/exam-verify-vbatch3` | SUPERSEDED |
| `feat/exam-bank-quant-2` | `ec27117` | 60/12 | local-only | 28 branches incl. `feat/exam-verify-vbatch3` | SUPERSEDED |
| `feat/exam-bank-quant-3` | `866e0f0` | 104/8 | local-only | 24 branches incl. `feat/exam-verify-vbatch3` | SUPERSEDED |
| `feat/exam-bank-spatial` | `ecf3799` | 61/12 | local-only | 27 branches incl. `feat/exam-verify-vbatch3` | SUPERSEDED |
| `feat/exam-bank-spatial-2` | `ce60c08` | 61/12 | local-only | 26 branches incl. `feat/exam-verify-vbatch3` | SUPERSEDED |
| `feat/exam-bank-spatial-3` | `c87da3d` | 62/12 | local-only | 26 branches incl. `feat/exam-verify-vbatch3` | SUPERSEDED |
| `feat/exam-bank-spatial-4` | `bf0c6fd` | 61/12 | local-only | 29 branches incl. `feat/exam-verify-vbatch3` | SUPERSEDED |
| `feat/exam-bank-spatial-5` | `66d4e0a` | 61/12 | local-only | 26 branches incl. `feat/exam-verify-vbatch3` | SUPERSEDED |
| `feat/exam-bank-verbal` | `b768098` | 61/12 | local-only | 26 branches incl. `feat/exam-verify-vbatch3` | SUPERSEDED |
| `feat/exam-bank-verbal-2` | `d5fa127` | 60/12 | local-only | 26 branches incl. `feat/exam-verify-vbatch3` | SUPERSEDED |
| `feat/exam-bank-verbal-3` | `370e998` | 63/12 | local-only | 25 branches incl. `feat/exam-verify-vbatch3` | SUPERSEDED |
| `feat/exam-contract-reconcile` | `34b835d` | 134/8 | **upstream=origin/feat/exam-integration** | 18 branches incl. `feat/exam-verify-vbatch3` | SUPERSEDED |
| `feat/exam-contracts` | `27a470c` | 2/12 | local-only | 45 branches incl. `feat/exam-wire` | SUPERSEDED |
| `feat/exam-converge` | `41a002d` | 173/8 | **upstream=origin/feat/exam-integration** | 15 branches incl. `feat/exam-verify-vbatch3` | SUPERSEDED |
| `feat/exam-data-model` | `e29d886` | 1/0 | pushed | 9 branches incl. `feat/test-structure-revamp` | SUPERSEDED |
| `feat/exam-dupes` | `c92a041` | 187/8 | local-only | 13 branches incl. `feat/exam-verify-vbatch3` | SUPERSEDED |
| `feat/exam-dupes-2` | `cc81c9e` | 200/8 | local-only | 9 branches incl. `feat/exam-verify-vbatch3` | SUPERSEDED |
| `feat/exam-engine` | `1e05d53` | 2/12 | local-only | 45 branches incl. `feat/exam-wire` | SUPERSEDED |
| `feat/exam-frontend` | `56c0d87` | 2/12 | local-only | 45 branches incl. `feat/exam-wire` | SUPERSEDED |
| `feat/exam-genA-integration-probe` | `2973ca5` | 12/0 | pushed | 8 branches incl. `feat/test-structure-revamp` | SUPERSEDED |
| `feat/exam-init-handshake` | `6bf16c2` | 213/8 | local-only | 6 branches incl. `feat/exam-verify-vbatch3` | SUPERSEDED |
| `feat/exam-integration` | `699ddea` | 232/8 | pushed | `feat/exam-integration-verify` | SUPERSEDED |
| `feat/exam-item-bank` | `585fb12` | 1/0 | pushed | 9 branches incl. `feat/test-structure-revamp` | SUPERSEDED |
| `feat/exam-key-balance` | `caa57f5` | 123/8 | **upstream=origin/feat/exam-integration** | 20 branches incl. `feat/exam-verify-vbatch3` | SUPERSEDED |
| `feat/exam-key-balance-2` | `3f0f9f0` | 144/8 | **upstream=origin/feat/exam-integration** | 20 branches incl. `feat/exam-verify-vbatch3` | SUPERSEDED |
| `feat/exam-key-balance-3` | `d289d1e` | 173/8 | **upstream=origin/feat/exam-integration** | 18 branches incl. `feat/exam-verify-vbatch3` | SUPERSEDED |
| `feat/exam-leak-fix` | `857904b` | 90/8 | local-only | 25 branches incl. `feat/exam-verify-vbatch3` | SUPERSEDED |
| `feat/exam-model-reconcile` | `27c5197` | 15/0 | pushed | 7 branches incl. `feat/test-structure-revamp` | SUPERSEDED |
| `feat/exam-overshoot` | `f3b8f4a` | 205/8 | local-only | 9 branches incl. `feat/exam-verify-vbatch3` | SUPERSEDED |
| `feat/exam-persist` | `67ebce3` | 200/8 | local-only | 9 branches incl. `feat/exam-verify-vbatch3` | SUPERSEDED |
| `feat/exam-score-ability` | `da1f491` | 190/8 | local-only | 11 branches incl. `feat/exam-verify-vbatch3` | SUPERSEDED |
| `feat/exam-score-input` | `32cd47e` | 221/8 | local-only | `feat/exam-integration`, `feat/exam-integration-verify` | SUPERSEDED |
| `feat/exam-scoring` | `9ac95ac` | 2/12 | local-only | 45 branches incl. `feat/exam-wire` | SUPERSEDED |
| `feat/exam-scoring-engine` | `455a3b7` | 1/0 | pushed | 10 branches incl. `feat/test-structure-revamp` | SUPERSEDED |
| `feat/exam-scoring-lambda` | `72ad4cd` | 2/0 | pushed | 9 branches incl. `feat/test-structure-revamp` | SUPERSEDED |
| `feat/exam-session-shell` | `b5454a2` | 1/0 | pushed | 9 branches incl. `feat/test-structure-revamp` | SUPERSEDED |
| `feat/exam-spaview` | `4c6d13e` | 185/8 | local-only | 14 branches incl. `feat/exam-verify-vbatch3` | SUPERSEDED |
| `feat/exam-stage-classification` | `91e281b` | 2/0 | pushed | 4 branches incl. `feat/test-structure-revamp` | SUPERSEDED |
| `feat/exam-standalone-guard` | `6250ae6` | 205/8 | local-only | 9 branches incl. `feat/exam-verify-vbatch3` | SUPERSEDED |
| `feat/exam-stoprule` | `0e8efc2` | 100/8 | local-only | 20 branches incl. `feat/exam-verify-vbatch3` | SUPERSEDED |
| `feat/exam-telemetry-gate` | `c1446ae` | 213/8 | local-only | 6 branches incl. `feat/exam-verify-vbatch3` | SUPERSEDED |
| `feat/exam-two-stage-demo` | `c0475a9` | 18/0 | pushed | 6 branches incl. `feat/test-structure-revamp` | SUPERSEDED |
| `feat/exam-two-stage-demo-shots` | `4801338` | 19/0 | pushed | 4 branches incl. `feat/test-structure-revamp` | SUPERSEDED |
| `feat/exam-two-stage-real-pools` | `a07724c` | 20/0 | pushed | 4 branches incl. `feat/test-structure-revamp` | SUPERSEDED |
| `feat/exam-validation-harness` | `0f64f35` | 1/0 | pushed | 9 branches incl. `feat/test-structure-revamp` | SUPERSEDED |
| `feat/exam-validators` | `1dc6f68` | 198/8 | local-only | 11 branches incl. `feat/exam-verify-vbatch3` | SUPERSEDED |
| `feat/exam-verify-fluid-2` | `5d2abc6` | 152/8 | **upstream=origin/feat/exam-integration** | 18 branches incl. `feat/exam-verify-vbatch3` | SUPERSEDED |
| `feat/exam-verify-fluid-3` | `cbc882b` | 152/8 | **upstream=origin/feat/exam-integration** | 18 branches incl. `feat/exam-verify-vbatch3` | SUPERSEDED |
| `feat/exam-verify-plpgsql` | `5331685` | 213/8 | local-only | 6 branches incl. `feat/exam-verify-vbatch3` | SUPERSEDED |
| `feat/exam-verify-quant-2` | `6b94784` | 152/8 | **upstream=origin/feat/exam-integration** | 18 branches incl. `feat/exam-verify-vbatch3` | SUPERSEDED |
| `feat/exam-verify-spatial-4` | `df0fff0` | 152/8 | **upstream=origin/feat/exam-integration** | 18 branches incl. `feat/exam-verify-vbatch3` | SUPERSEDED |
| `feat/exam-verify-vbatch1` | `1be02ce` | 219/8 | local-only | `feat/exam-integration`, `feat/exam-integration-verify` | SUPERSEDED |
| `feat/exam-verify-vbatch2` | `1751fba` | 219/8 | local-only | `feat/exam-integration`, `feat/exam-integration-verify` | SUPERSEDED |
| `feat/exam-verify-vbatch3` | `b0a118f` | 219/8 | local-only | `feat/exam-integration`, `feat/exam-integration-verify` | SUPERSEDED |
| `feat/exam-wire` | `fd660ef` | 61/8 | local-only | 24 branches incl. `feat/exam-verify-vbatch3` | SUPERSEDED |
| `feat/overnight-review-guide` | `4ff445e` | 11/0 | pushed | 4 branches incl. `feat/test-structure-revamp` | SUPERSEDED |
| `feat/backend-admissions-core` | `0d061ab` | 0/118 | pushed | `dev` | MERGED-ALREADY-DELETE-SAFE |
| `feat/brainlift-additional-evidence` | `bd6e4e7` | 0/104 | pushed | `dev` | MERGED-ALREADY-DELETE-SAFE |
| `feat/brainlift-gifted-assessment-quality` | `c8253e6` | 0/69 | pushed | `dev` | MERGED-ALREADY-DELETE-SAFE |
| `feat/brainlift-test-structure` | `d1ff22b` | 0/3 | pushed | `dev` | MERGED-ALREADY-DELETE-SAFE |
| `feat/brainlift-two-stage-evaluation` | `e1a3ff5` | 0/147 | pushed | `dev` | MERGED-ALREADY-DELETE-SAFE |
| `feat/ci-action-runtime-upgrade` | `7ef1e12` | 0/131 | pushed | `dev` | MERGED-ALREADY-DELETE-SAFE |
| `feat/crystal-interview-notes` | `8d51aaa` | 0/51 | local-only | `dev` | MERGED-ALREADY-DELETE-SAFE |
| `feat/document-git-branch-workflow` | `c37ec94` | 0/149 | pushed | `dev` | MERGED-ALREADY-DELETE-SAFE |
| `feat/exam-item-schema-spec` | `d11b2d3` | 0/58 | pushed | `dev` | MERGED-ALREADY-DELETE-SAFE |
| `feat/exam-question-types` | `2e041bf` | 0/47 | **upstream=origin/dev** | `dev` | MERGED-ALREADY-DELETE-SAFE |
| `feat/fast-agent-mode` | `8fdf6f2` | 0/133 | pushed | `dev` | MERGED-ALREADY-DELETE-SAFE |
| `feat/governance-feature-map-cleanup` | `55886ba` | 0/151 | pushed | `dev` | MERGED-ALREADY-DELETE-SAFE |
| `feat/governance-lambda-decision` | `ab2736c` | 0/1 | pushed | `dev` | MERGED-ALREADY-DELETE-SAFE |
| `feat/monorepo-scaffold` | `e3f0819` | 0/135 | pushed | `dev` | MERGED-ALREADY-DELETE-SAFE |
| `feat/onboarding-backend-core` | `52c1b10` | 0/100 | pushed | `dev` | MERGED-ALREADY-DELETE-SAFE |
| `feat/onboarding-contract-foundation` | `ad35a0d` | 0/103 | local-only | `dev` | MERGED-ALREADY-DELETE-SAFE |
| `feat/qtype-recategorization` | `d830d74` | 0/29 | pushed | `dev` | MERGED-ALREADY-DELETE-SAFE |
| `feat/supabase-port-isolation` | `2974cf5` | 0/129 | pushed | `dev` | MERGED-ALREADY-DELETE-SAFE |
| `research/overnight-backend-selection` | `b67a159` | 0/153 | pushed | `dev` | MERGED-ALREADY-DELETE-SAFE |

---

## 9. What I could not determine

1. **Uncommitted work in the other 25 worktrees** — deliberately not inspected
   (§6). This is the largest blind spot in this document.
2. **`gt-selection-qbank-preview` @ `47f5311`** — detached, matches no local
   branch, containment unknown.
3. **Whether the 42 remote branches have counterparts that diverge from local.**
   I compared names, not tips. 4 remote-only names exist with no local branch:
   `feat/admissions-portal-frontend`, `feat/architecture-mermaid-diagram`,
   `feat/architecture-plan`, and a stray ref literally named `origin`. The last
   one is almost certainly a mistake (`origin/origin`) and worth a look.
4. **Whether `main`/`staging`'s 4 and 2 extra commits are truly redundant.**
   `git cherry` matches by patch-id, which is strong evidence but not proof for
   merge commits. Marked NEEDS-REVIEW.
