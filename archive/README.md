# GT Selection — archive index

Everything below lives in this folder. The project's own README, written while it
was live, is kept alongside as `ORIGINAL_README.md`.

The project was stopped on 2026-08-03. This note records what was built, where it
lives, and what state each piece was actually in — including the parts that were
unfinished or wrong, since those are the expensive things to rediscover.

Everything described here is reachable from this commit. Nothing depends on an
unmerged branch. If you copy only the working tree and drop the `.git` directory,
you still have all of it: work that could not be safely merged is preserved as
patch files under `unmerged-branches/`.

## What this project was

A screening instrument for GT School admissions. A child sits a two-stage test:
stage 1 locates their current ability, stage 2 measures how fast they learn a
system they have never seen before. The second stage is the unusual part and was
the reason the project existed — a standing score is what conventional tests
already give you, and the bet was that learning rate carries information about
fit that a standing score does not.

## Where the substance is

| Area | Path | State |
| --- | --- | --- |
| Adaptive engine, item selection, stopping rules | `packages/exam-engine/` | Working, tested |
| Scoring and the learning-rate estimator | `packages/exam-scoring/` | Working, tested |
| Test-taker surface, runner, results | `apps/web/` | Working |
| 52 published question demos, 48 wired into the engine | `apps/web/public/exam-demos/`, `research/exam-question-types/` | Working |
| Database schema, RPCs, server-side answer verification | `supabase/` (28 migrations) | Working, pgTAP covered |
| 9 BrainLifts (the thinking behind the design) | `brainlifting/` | Complete |
| Requirements, decisions (47), evidence (117) | `docs/` | Complete and internally consistent |
| Research shards, question-type catalogue, legal review | `research/` | Complete |

## Stage 2, the part worth reading first

Four activities, each a system the child induces across trials that never repeat:
machine chains (fluid), transform machine (spatial), alien numbers (quantitative),
word machines (verbal). A fifth verbal type, alien sentences, exists as a spec and
generator but was never given a renderer.

Read `docs/product/STAGE2_REDESIGN_SPEC.md` first. Sections 2.1, 3 and 5.1 are
built; the rest is designed and argued but not implemented.

### Things that were true and are easy to get wrong again

- **The guessing floor is per-type, not global.** Fitting every activity at a
  five-option floor manufactured a positive learning rate for children who learned
  nothing. E-212.
- **A slider does not have a zero floor.** A tolerance-graded placement accepts an
  interval, so its floor is 1/15. Assuming zero throws away roughly 15% of the
  precision available per trial. E-214.
- **Difficulty is served to the client, so nothing priced into it may be invisible
  on screen.** Pricing residual ambiguity into difficulty opened an 18.5% attack
  against a 6.7% floor. D-212.
- **Stage 2 types must never appear in stage 1.** Stage 2 measures learning on a
  novel system; a child who met the type in stage 1 is not meeting it novel.

## What was not finished

- **No child ever took this test.** Every number in the evidence register comes
  from synthetic learners or from measurements of the instrument itself. Nothing
  here is validated against real K-8 performance, and the gap between "the
  estimator recovers a simulated learning rate" and "the score means something
  about a child" is the whole remaining distance.
- **Serve-time materialisation is behind a flag, off by default**, and built for
  one type only. It exists because a single scrape of a bank otherwise breaks that
  bank for every later child.
- **Two type formats disagree** about whether a template may name what a symbol
  means, and both are right about their own type. Recorded in the spec's §2.1.3,
  never settled.
- **`VER-ROLES-01`** has a spec, generator and checker, but no renderer.
- **A leaked-bank join scores 31% on alien numbers** against an 8.3% bound, and
  per-session re-keying cannot close it for that type.

## Unmerged work, and why

Preserved as patches in `unmerged-branches/`. Apply with
`git am < <file>.patch`, or just read them.

| Patch | Why it is not merged |
| --- | --- |
| `feat-review-ui-and-play-gate` | Touches 88 demo files that the stage 2 review work has since changed. Merging cleanly would still have mixed two generations of the same files. |
| `feat-adaptive-exam-app` | The original app scaffold. Superseded by what shipped; kept because it is the clearest record of the first architecture. |
| `feat-exam-debug-converge-burst` | Early debug dock and burst handling, superseded by the versions in `apps/web`. |
| `feat-phase2-learning-rate` | Adds to `packages/cat-engine`, a package later removed from the tree. |
| `feat-exam-lambda-endogeneity` | Its analysis is merged (`docs/product/STAGE2_LAMBDA_ENDOGENEITY.md`); its code predates the fix that shipped and would have mixed two approaches in one file. |
| `feat-interview-scope-update` | Its substance (R11, D-015) reached `dev` by another path. Merging would revert the requirements document to an earlier phrasing. |

`uncommitted-worktrees/gt-live-demo/` holds scratch work that never
reached a branch: an earlier debug panel, verification scripts and screenshots.

## One caution about the governance IDs

Decision and evidence IDs were allocated from per-branch bands to stop parallel
agents colliding. It did not fully work — three branches independently minted
`D-208`, and `dev` and the stage 2 stack allocated `D-208` and `E-207` to
different work. The renumbering is recorded in the log. If you find a citation
that resolves to something that makes no sense, that is where to look first;
`node scripts/audit-requirement-ids.mjs` catches duplicates and orphans and is
currently clean.

## Loose ends preserved at cleanup

`uncommitted-worktrees/misc/` holds work that was sitting uncommitted in a
worktree when the worktrees were removed:

- `brainlift-reasoning-growth.working-copy.md` — differs from the committed
  version by one line: the working copy drops the sentence recording that DOK 1–2
  are AI-assisted and citation-verified while DOK 3–4 are the author's. Whether
  that removal was deliberate was never established, so both versions are kept and
  the committed one is the fuller.
- `exam-debug-converge-burst.uncommitted.patch` — further edits to a debug panel
  that the shipped version has since superseded.
- `genb-tmp-verification/` — the scratch probes whose presence skewed the lint
  counts in `GENB_VERIFICATION_2026-07-28.md`.
