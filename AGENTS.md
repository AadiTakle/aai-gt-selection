# Agent and Contributor Instructions

These instructions apply to every human or AI contributor working in this project.

## Start here

Read in this order before proposing or changing product behavior:

1. `PROJECT_CHARTER.md`
2. `docs/product/project-requirements.md`
3. `docs/governance/DEVELOPMENT_RUBRIC.md`
4. `docs/product/TRACEABILITY_MATRIX.md`
5. `docs/product/FEATURE_TO_REQUIREMENT_MAP.md`
6. `docs/research/ASSUMPTIONS_AND_EVIDENCE.md`
7. `docs/governance/DECISION_LOG.md`
8. `docs/governance/SCOPE_EXCEPTION_LOG.md`

Use `docs/product/FEATURE_TO_REQUIREMENT_MAP.md` as the development index for feature
IDs, requirement mappings, scope, current implementation status, blockers, and
remaining work. It is a derived implementation aid and cannot override a
higher-precedence canonical requirement or ratified decision.

When relevant, also read:

- `docs/product/CONCEPT_OPTIONS.md` before concept selection;
- `docs/governance/CRITIC_REVIEW_CHECKLIST.md` before approval or completion; and
- `docs/research/METRICS_AND_GUARDRAILS_LIBRARY.md` before choosing metrics.

These are reference libraries, not approved product direction.

## Mandatory workflow

1. **Classify the request:** research, concept, plan, implementation, evaluation, or scope change.
2. **Map requirements:** Cite the R/H IDs served before substantive work.
3. **Check evidence:** Identify evidence-register entries used and any new assumptions.
4. **Define acceptance:** State the smallest sufficient deliverable and evidence that will verify it.
5. **Check boundaries:** Apply the hard gates and automatic rejection conditions in the rubric.
6. **Implement minimally:** Do not add unrelated features, architecture, or research questions.
7. **Update governance:** Maintain traceability, evidence, decision, and exception records when affected.
8. **Verify:** Report fresh evidence against acceptance criteria before claiming completion.

## Execution modes

Use the lightest process proportional to the task.

### Fast mode (default for planned or small work)

Enter fast mode automatically when an approved plan/spec already fixes the
approach, or when a task is mechanical, localized, low-risk, and has an obvious
verification command. The user can also request it explicitly with
`FAST MODE` or `/fast-mode`.

In fast mode:

- do not re-run brainstorming, planning, Graphify orientation, worktree setup,
  TDD ceremony, or per-task reviewer subagents solely because a generic skill
  calls them mandatory;
- inherit requirements, evidence, scope, and acceptance criteria from the
  approved plan instead of restating or re-researching them;
- batch independent reads and commands, edit directly, and avoid routine
  narration;
- use targeted checks during implementation and one proportional final
  verification;
- use at most one final review for a substantive change; skip review agents for
  docs, config, formatting, or straightforward 1–3 file changes;
- make one coherent commit at the end unless the user requests another split.

For small subagent tasks, give the exact files, change, and verification in one
prompt. Do not make the subagent re-read the full plan, invoke Graphify, create a
worktree, or spawn a second reviewer.

### Full mode

Use the full planning/TDD/worktree/subagent-review workflow only when the task
is ambiguous, architectural, security-sensitive, involves database migrations
or live data, changes causal/statistical logic, spans independent parallel
workstreams, or when the user explicitly requests a full review.

Fast mode never relaxes correctness, privacy, claim boundaries, or the final
verification requirement. Escalate to full mode if implementation reveals one
of those risks.

## Stop conditions

Stop and ask for direction when:

- work cannot map to R1–R10 or H1–H10;
- canonical documents conflict;
- a GT-specific fact, threshold, authority, capacity, or data source is unknown and materially changes the result;
- the proposed causal claim exceeds the design;
- applicant rights would be traded for research quality;
- a preferred solution is being treated as a requirement;
- an unapproved scope exception is needed.

Do not fill gaps by inventing facts or silently choosing a product direction.

## Required plan and handoff format

Every substantive plan must state:

- **Requirements:** R/H IDs
- **Evidence/assumptions:** E IDs and new assumptions
- **In scope:** Minimum deliverable
- **Out of scope:** Explicit exclusions
- **Acceptance evidence:** How completion will be verified
- **Risks:** Causal, applicant, operational, and privacy risks
- **Governance updates:** Files that must be updated

Every completion handoff must state:

- requirements addressed;
- files or behavior changed;
- verification performed and result;
- remaining assumptions or blockers;
- decisions or scope exceptions created;
- the `docs/product/FEATURE_TO_REQUIREMENT_MAP.md` rows updated, or why none applied. A change to
  product behavior updates its rows in the same pull request, verified against the code rather than
  against another document. An unchanged status field on a behavior-changing pull request is an
  incomplete change.

## Git branch workflow

The repository uses a fixed four-tier branch hierarchy plus short-lived feature
branches. Every branch has one purpose. Do not commit product, research, or
governance work directly to `main`, `staging`, or `dev`.

### Branch tiers

1. **`main`** — Stable, reviewed baseline. Reflects the current approved
   governance, PRD, and research state. Only receives merges from `staging`
   (or an explicit one-off research/governance branch that has already been
   fully reviewed). Never commit directly to `main`.
2. **`staging`** — Pre-release integration branch. Receives merges from `dev`
   once a batch of feature work is complete and internally consistent.
   Used as the last checkpoint before promoting to `main`. Never commit
   directly to `staging`.
3. **`dev`** — Active integration branch. This is the default base for new
   work. All `feat/*` branches are created from `dev` and merged back into
   `dev` when their task is complete and verified. Never commit directly to
   `dev` outside of merging a completed `feat/*` branch.
4. **`feat/<short-task-name>`** — Where all actual development happens:
   product code, documentation edits, governance updates, or research
   corrections for one bounded task. Branch from `dev`, do the work, verify
   it, then merge back to `dev`. Use a descriptive kebab-case name (for
   example `feat/track-b-review-workflow`, `feat/brainlift-two-stage-evaluation`).

Promotion always flows one direction:

```
feat/* -> dev -> staging -> main
```

Do not skip a tier and do not merge sideways (for example `feat/*` directly
into `staging` or `main`).

### Special-purpose branches

- **`research/overnight-backend-selection`** — A long-running, dedicated
  research branch used for the multi-iteration overnight research process.
  It follows the same promotion path (`research/* -> dev/staging/main` once
  reviewed) but is not a template for future feature work; treat it as a
  historical/archival branch rather than an active integration target.

### Where agents should work

- **Default:** branch a new `feat/*` branch from the latest `dev` for any
  task — PRD edits, governance-log updates, backend research, or BrainLift
  revisions.
- **Keep unrelated concerns on separate `feat/*` branches** (for example, PRD
  corrections and BrainLift corrections must not share one branch), so each
  can be reviewed and merged independently.
- Before merging a `feat/*` branch into `dev`, verify the change against the
  acceptance evidence in the plan or task, and confirm no unrelated files
  were touched.
- Only merge `dev -> staging` and `staging -> main` after the batch of
  `feat/*` work being promoted has been reviewed as a whole.
- Push branches to `origin` with `-u` on first push so tracking is set up;
  do not force-push shared branches (`main`, `staging`, `dev`) without
  explicit user consent.
- **Governance travels with the code it authorizes.** If a branch adds or
  changes a requirement, decision, or evidence entry, the register edit and the
  implementation it authorizes must reach `dev` on the same path — same branch
  and same merge, or two branches merged together. Never merge the code and
  leave the authorizing entry on an unmerged branch. That is what stranded R11,
  D-015, and D-016 for six days while 272 citations across 39 files pointed at
  IDs `dev` did not define (D-032; `docs/governance/REQUIREMENT_ID_AUDIT.md`).
  If you cannot merge both, do not merge either — say so and stop.

## Governance ID allocation

Governance IDs (`D-` decisions, `E-` evidence) are allocated from **disjoint
per-lineage bands** so two branches that cannot see each other cannot claim the
same number. Ratified in D-032.

**To allocate an ID:** find your lineage's band below, then take the lowest
number in that band that is not already used on `dev` **or on your own branch**.
You do not need to inspect any other branch — that is the point of the bands.

| Band | Lineage | Matching branches |
| --------------- | -------------------------- | ------------------------------------------------- |
| `001`–`199` | **Trunk (closed)** | Historical `dev` sequence. Do not allocate here. |
| `200`–`299` | Exam / screener workstream | `feat/exam-*`, `feat/adaptive-exam-*`, `feat/cat-*` |
| `300`–`399` | Research | `research/*`, `feat/*-research`, `feat/qtype-*` |
| `400`–`499` | Governance, audit, docs | `feat/*-audit`, `feat/gov-*`, `feat/docs-*` |
| `500`–`599` | Product surfaces and app | `feat/app-*`, `feat/web-*`, `feat/*-demo` |
| `600`–`899` | Unassigned | Ask before claiming a new band. |
| `900`–`999` | Reconciliation only | Renumbering during a register merge. |

<!-- id-audit:ignore-start — the next paragraph names band starts that are deliberately not yet allocated -->

So the exam workstream's next decision is `D-200` and its next evidence entry is
`E-200`; a research branch takes `D-300` / `E-300`. The bands apply to both
families independently, and a number is consumed in one family only.

<!-- id-audit:ignore-end -->

Notes:

- **The trunk band is closed at `D-032` and `E-102`.** The evidence register also
  has a permanent five-entry hole from the pre-band allocation race; leave it
  empty (`E-085`–`E-089`). <!-- id-audit:ignore-line -->
- If your branch does not match any pattern above, use the band for the work's
  subject matter, not its branch name.
- Two branches in the same band can still collide. `scripts/audit-requirement-ids.mjs`
  fails on duplicate definitions as well as orphaned citations, and runs as a
  blocking CI check, so a collision is caught before it merges rather than
  after.
- Requirement IDs (`R`, `H`) are **not** banded. They are rare, owner-ratified,
  and must be allocated by the team lead in `docs/product/project-requirements.md`.

## Document precedence

Follow the precedence in `PROJECT_CHARTER.md`. A lower-precedence plan, specification, comment, or historical document cannot override a higher-precedence requirement.

If a requested change conflicts with the charter or required requirements, explain the conflict and request either a scope exception or a formal governance change.

## Claims and evidence

- Label verified findings, independent context, company claims, reasoned inferences, and open assumptions correctly.
- Predictive validity is not program impact.
- Before/after growth is not a counterfactual.
- Access, reliability, outcome change, and causal impact are separate milestones.
- Null, harmful, and inconclusive findings are valid outcomes.
