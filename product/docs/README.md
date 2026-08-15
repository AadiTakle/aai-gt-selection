# Documentation

This directory contains active GT handoff documentation and the preserved design,
measurement, review, and implementation record.

## GT team

Start with [`gt/README.md`](gt/README.md). It links the current:

- system and deployment inventory
- HTTP-only integration guide
- question-library maintenance workflow
- engine, trace, scoring, and rescoring guide
- operations and change-control guide

The measured repository map remains
[`handoff/2026-08-14-repo-orientation.md`](handoff/2026-08-14-repo-orientation.md).
It predates the `product/` directory organization, so its unqualified
`screener/`, `platform/`, `qbank-library/`, and `docs/` paths now live beneath
`product/`.

## Binding constraints

Read [`interviews/2026-08-03-crystal-martel-call.md`](interviews/2026-08-03-crystal-martel-call.md)
before changing product or measurement policy. It supersedes earlier stakeholder
notes where they disagree.

## Measurement status

Read [`overnight/README.md`](overnight/README.md) and the numbered reports beside
it before interpreting or changing scores. They document the current simulated
behavior and its limitations; they are not child calibration.

## Preserved history

The files under `design/`, `plans/`, `concepts/`, `proposals/`, `review/`, and
`handoff/` preserve how the system was developed. Some status sentences were
written before deployment; use `gt/` for current operations.

The complete [`../../brainlifting/`](../../brainlifting/) directory remains at the
repository root as the evidence and reasoning layer. It is intentionally not
folded into archived documentation.
