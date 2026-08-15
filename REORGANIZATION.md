# Repository Reorganization Record

Date: 2026-08-14

## Constraint

This work may change directory organization and the minimum path references
required to preserve existing behavior. It must not change algorithms, runtime
logic, APIs, dependencies, question content, scoring, criteria, or deployment
semantics.

`brainlifting/` remains at the repository root and must remain byte-for-byte
unchanged.

## Recovery points

The original branches remain untouched in their existing worktrees.

- Pre-reorganization `dev`:
  - commit `8f16f9b3ee5eb56002e4870a8bb3cea29478f6b9`
  - tag `handoff-pre-reorg-dev-2026-08-14`
- Deployed-app integration source:
  - commit `79e1f8621c22c8f2567652c6f12ea2c7f57aa612`
  - tag `handoff-pre-reorg-library-apps-2026-08-14`

The isolated working branch is `handoff/repo-organization` in
`/Users/atakle/gt-handoff-reorg`.

Nothing in this worktree changes `dev` or
`feat/library-apps-on-platform` unless the completed work is later committed and
merged deliberately.

## Organization mapping

```text
screener/       -> product/screener/
platform/       -> product/platform/
qbank-library/  -> product/qbank-library/
docs/           -> product/docs/
demo/           -> product/deployed-apps/
```

The four active system directories move together so their sibling-relative
imports and data paths remain unchanged.

`archive/`, `brainlifting/`, `shots/`, and `.github/` remain at the repository
root.

## Approved textual changes

Only these existing files may change for path continuity and navigation:

- `package.json`
- `.gitignore`
- `.github/workflows/verify.yml`
- `product/screener/vite.lab-system.config.ts`
- `README.md`

New handoff documentation may be added under `product/docs/gt/`.

## Reverting

Before any commit, the safest rollback is to discard the isolated worktree and
branch; the original worktrees and both recovery tags remain unchanged.

After commits exist, restore or compare against
`handoff-pre-reorg-dev-2026-08-14`. Prefer reverting organization commits over
rewriting shared branch history.

Do not force-push `dev` or `main` as part of rollback.
