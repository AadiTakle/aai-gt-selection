# Benchmarking methodology report

How to benchmark the GT screener against alternatives — especially CogAT — on
whether admitted children actually go on to excel in the programme.

Read `main.pdf`. Part I is written for GT leadership; Part III is the technical
machinery for a reviewer who wants to take it apart.

## Build

```
make            # regenerate numbers, build main.pdf (needs a local LaTeX)
make docker     # same, in a TeX Live container (no local LaTeX needed)
make check      # validate the statistics library and macro consistency
make clean      # remove build artefacts
```

`make docker` is the reference build; it is what produced the committed
`main.pdf`. It uses `texlive/texlive:latest-small` and runs as the invoking
user, so nothing is left owned by root.

## Layout

| Path | What it is |
| --- | --- |
| `main.tex` | Executive summary and the design (Parts I–II) |
| `appendices.tex` | Derivations, references (Part III) |
| `preamble.tex` | Shared packages and the callout/figure macros |
| `scripts/statlib.py` | Statistics routines, standard library only |
| `scripts/selftest.py` | Validation of those routines against published values |
| `scripts/compute.py` | Generates every computed result in the report |
| `scripts/check_macros.py` | Catches a stale `generated/` and dead macros |
| `generated/` | Machine-written LaTeX — do not edit by hand |
| `figures/` | Drop zone for the companion analysis's figures |

## How the numbers work

Every computed result — sample sizes, power, confidence intervals, predictive
values, attenuation factors, artefact floors — is produced by `compute.py` and
written into `generated/` as LaTeX macros and table bodies. Nothing is
transcribed into the prose by hand, so the text cannot drift from the
arithmetic.

Inputs are deliberately visible as literal numbers in the text, because a reader
has to be able to see what was assumed. They are set in one place at the top of
`compute.py`, each annotated with the evidence ID or published source it comes
from.

`selftest.py` runs before any build and exits non-zero on failure. It checks the
routines against published F tables, two G\*Power worked examples, Cohen's
sample-size tables, the Taylor–Russell tables, Sheppard's theorem and Plackett's
identity. Where no published reference was verifiable, the routine is checked
against an independent derivation instead: the Hanley–McNeil AUC variance must
reduce exactly to the Mann–Whitney null variance at AUC 0.5, and the
AUC-to-correlation bridge is validated against a separate trivariate-orthant
reduction of the same probability.

Two inputs are unmeasured working values rather than estimates — the correlation
between standing ability and learning rate, and the comparator's reliability.
Both are set at the top of `compute.py` and carried through as sensitivity
ranges. Changing either is a one-line edit followed by `make docker`, so a
reader who disputes them can recompute the report rather than argue with it.

## Figures

Six figures come from the companion synthetic-data analysis:

```
figures/cluster-projection.pdf     figures/incremental-validity.pdf
figures/officer-agreement.pdf      figures/ppv-base-rate.pdf
figures/decision-accuracy-roc.pdf  figures/range-restriction.pdf
```

Drop the PDFs in and rebuild; `\figslot` picks them up automatically and shows a
labelled placeholder until then. The document builds either way and no argument
depends on a figure's values.

## Simulated inputs

The effect sizes the report reasons about — AUCs, variance increments, routing
drift, officer agreement — come from a companion synthetic-cohort analysis and
are labelled as simulated wherever they appear. They are used to size a real
study. They are not evidence that the screener works and must not be quoted as
such.

## Status

The report is a design, not a result. It specifies a study that has not been
run. It makes no claim about the screener's validity, and none about programme
impact — see the claim-boundary section, which is deliberately placed before the
design rather than after it.

Its main practical conclusion is that the head-to-head superiority comparison
against CogAT is not executable at the programme's current size, and that the
replacement question is both cheaper and more useful. That argument is in
Section 5 of the PDF.
