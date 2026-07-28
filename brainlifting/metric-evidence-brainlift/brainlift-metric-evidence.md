# BrainLift: Which Measured Signals **Provably** Improve Accuracy and Learning-Rate Estimation

## Owners

- Aadi Takle

## Purpose

### Purpose

A cognitive test can record far more than whether each answer was right: how long the response took, which wrong option was chosen, how confident the person felt, how they moved through the task, and whether they improved across trials. Every one of these is *collectable*, and each is routinely promoted as a richer window into ability. This BrainLift asks a narrower and harder question: for which of these signals does published evidence actually demonstrate **incremental validity** — a measurable gain in precision, validity, or decision accuracy **over correctness alone** — and for which is the evidence absent, thin, or non-replicated? The organising discipline is that "correlates with ability" and "adds information beyond accuracy" are different claims with very different evidence bases, and the literature conflates them constantly. It argues from external evidence and general principles only, and is written to be read with no knowledge of any specific product or codebase. *(DOK 1–2 are AI-assisted and citation-verified; DOK 3–4 are the author's to own. Companion: `source-register-annotated.md`.)*

### In Scope

Measured signals available from a computer-delivered reasoning assessment, each judged against the incremental-validity standard:

- **Response time as measurement information** — joint speed–accuracy modelling, the speed–accuracy tradeoff, evidence-accumulation decomposition, and what timing adds to an ability estimate once modelled properly.
- **Disengagement and effort detection** — rapid-guessing and response-time effort, effort-moderated scoring, and the class of disengagement that latency-based methods structurally cannot see.
- **Process, log, and interactive-task telemetry** — action sequences and behavioural traces, evidence-centred design as the precondition for interpreting them, and the replication and generalisability record.
- **Information in the wrong answer** — distractor-level and polytomous scoring, diagnostic classification, and the formal criterion for when a subscore earns the right to be reported separately.
- **Metacognition and confidence** — calibration and metacognitive sensitivity, the historical verdict on confidence-weighted scoring, and confidence as a fairness hazard.
- **Learning rate and modifiability** — dynamic testing and graduated prompts, the reliability of change and gain scores, individual learning-curve estimation, and practice effects as a contaminant.
- **Statistical power and measurability** throughout: how many trials or occasions a signal needs before an individual-level estimate means anything.

### Out of Scope

- **The structure and sequencing of the test experience** — adaptive routing, item ordering, session design, retake policy, and the cognitive-load grounding of the delivered experience are owned by the companion `test-structure` BrainLift. This BrainLift asks what a signal is *worth*, not where in a test it should be collected.
- **Instrument-level measurement validity and tail-quality metrics** — owned by the companion `gifted-assessment-quality` BrainLift.
- **The statistical methodology for validating a whole instrument** against an established test — reliability machinery, classification and decision accuracy, agreement and linking, DIF and invariance — is owned by the companion `test-evaluation` BrainLift. This BrainLift evaluates *signals*; that one evaluates *instruments*.
- **Causal identification** — separating a program's effect from selection into it is owned by the companion `gt-school-counterfactual` BrainLift.
- **Any mapping of these findings onto a specific build, configuration, metric registry, or roadmap** — belongs in a separate product/design document, not this BrainLift.

---

## DOK 4: Spiky Points of View (SPOVs)

> **To be authored by the owner.** Per the BrainLift method, DOK 4 is the author's stance and
> cannot be delegated. Drafts offered during assembly are explicitly labelled starting points
> to be interrogated, rewritten, and owned — not finished positions.

---

## Experts

> Chosen for productive tension — the disagreements between these camps are where the DOK 3
> insights come from.

---

## DOK 3: Insights

> **To be authored by the owner.** Candidate cross-source connections surfaced during research
> are collected as *starter hypotheses* only; an insight becomes a DOK 3 insight when the author
> has interrogated it and can defend it.

---

## DOK 2: Knowledge Tree
