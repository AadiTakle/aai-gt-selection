# Documentation

Work on the GT deliverable that follows the 2026-08-03 reset. The previous project is stopped and
lives in `archive/`; nothing here supersedes it, because it is no longer running.

> **Start with `handoff/2026-08-14-repo-orientation.md`.**
>
> It maps the whole repository, says what is deployed, and lists which documents in here have gone stale —
> including parts of this one. Several status claims below were true when written and are not now: a design *was*
> approved on 10 Aug, and the platform *is* deployed. The orientation document is the current map; this file is
> the reading order for the thinking behind it.

**If you are picking this up cold, read in this order.**

1. **`interviews/2026-08-03-crystal-martel-call.md`** — the current facts. Joe's "MIT by 8" mandate,
   the ban on an in-house cognitive test, why hustlers are no longer the admissions target, and the
   five things Crystal says she needs. This supersedes the July interview wherever they disagree.
2. **`concepts/CONCEPT_OPTIONS.md`** — the candidate project space, the hard constraints, what has
   already been ruled out and why, and the reusable assets in `archive/`.
3. **`concepts/reading-channel-measurement.md`** — a design note for one contested idea, kept because
   its failure analysis is the useful part.

## Design

4. **`design/screener-library-design.md`** — the item library and engine the screener runs on, organised
   around one boundary: authoring is mutable, serving is immutable.
5. **`design/ui-agnostic-assessment-system.md`** — the plan for making the engines, question types and
   banks carrier-independent and CogAT-aligned. An item states what it asks, what the choices are and
   how it is answered; a UI decides everything else. Section 5 has the audited CogAT mapping, including
   which subtests we cannot currently serve at all.
6. **`design/embedded-screening-contexts.md`** — thirty example apps across the interest areas K-8
   children actually spend time on, organised around the eight mechanics that already *are* CogAT item
   forms rather than themes bolted onto a quiz.

## Status of everything here

Exploratory. No concept has been chosen, no design approved, and no requirement or decision register
exists yet for the new project — governance is being rebuilt rather than inherited. Treat every
document here as thinking in progress, not as an approved direction.

## Two things worth knowing before proposing anything

**The deliverable format is already set.** Crystal asked for two or three short paragraph proposals to
choose from, and the chosen one becomes the project. Presentation is to Joe Liemandt, roughly ten days
out from 2026-08-03.

**The bar is depth, not just a demo.** The stated measure of success is a product that solves a real
GT problem _plus_ demonstrated understanding of why it should work. The BrainLifts in
`brainlifting/` are part of that argument, which means a design choice that cannot be
justified from evidence is a liability rather than a neutral detail.
