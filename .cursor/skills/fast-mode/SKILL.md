---
name: fast-mode
description: Executes approved plans and small, straightforward tasks with minimal process and tool overhead. Use when the user says FAST MODE or /fast-mode, when an accepted plan already fixes the approach, or for low-risk mechanical work limited to a few known files.
---

# Fast Mode

Use direct execution while preserving correctness.

## Eligible tasks

- an approved plan/spec already determines the approach;
- mechanical docs, config, formatting, scaffolding, or dependency updates;
- an obvious localized change in 1–3 known files;
- a small subagent assignment with explicit files and acceptance checks.

## Workflow

1. Read only the named files and immediate dependencies.
2. Batch independent tool calls.
3. Edit directly without brainstorming or re-planning.
4. Run the smallest targeted check that can catch local errors.
5. Run one proportional final verification.
6. Commit once at the end only when requested or already authorized.
7. Report outcome, verification, and real blockers briefly.

## Skip by default

- Graphify orientation for known/localized files;
- worktree setup for a single safe branch task;
- TDD ceremony for docs/config/scaffold-only changes;
- implementer plus reviewer subagent chains;
- repeated requirement/evidence narration already fixed by the plan;
- intermediate status updates for routine tool use.

For a small subagent, provide one self-contained prompt with exact files,
required change, non-goals, and one verification command. The subagent should
not create another plan, invoke broad exploration, or spawn another reviewer.

## Escalate to full mode

Stop fast mode when the task becomes ambiguous, changes architecture or
security, adds database migrations, touches live/real data, changes
causal/statistical reasoning, requires parallel independent workstreams, or
reveals conflicting canonical requirements.

Fast mode never skips privacy boundaries, claim correctness, required approval,
or final verification.
