# Open PR review — clearing the queue

**Prepared:** 2026-08-02 · **Base:** `dev` @ `f1fe857` · **Open PRs against `dev`:** 18

Every mergeability claim below was tested, not inferred: each branch was fetched and merged into a
throwaway branch off `origin/dev`, the conflicts recorded by file, and the merge discarded. Nothing
was pushed and no PR branch was modified.

---

## Read this first — the four things that shape everything else

**1. No PR is failing CI.** All eighteen have green checks. The distinction that matters is
freshness: `dev` last moved on 2026-08-01 at 02:09 UTC. Twelve PRs branched from the current tip and
their CI is current. Six branched earlier — #35, #34, #33, #32 (11 commits behind), #26 (24 behind)
and #18 (43 behind) — and their green checks were computed against an older `dev`. Those are stale,
not failing. Re-run CI after merging rather than treating the green tick as current evidence.

**2. Only one PR actually conflicts with `dev` today:** #18, in three governance files, one hunk
each. The other seventeen merge cleanly into `dev` *individually*. The conflicts that will actually
cost you time are **between** open PRs, and they only appear in a particular merge order.

**3. `apps/web/src/lib/exam/registry.generated.ts` is generated output and eight PRs touch it**
(#43, #44, #45, #46, #48, #36, #42, #52). Every one adds a single `BLOCKED` entry for a bank that has
no renderer demo. Whichever merges second will conflict there. **The correct resolution is always to
re-run `node scripts/sync-exam-demos.mjs` (or `pnpm exam:sync`) and commit its output — never to
hand-merge the array.** `pnpm exam:sync:check` is the gate that catches a hand-merge. This is flagged
again on each PR it applies to.

**4. There is a real ID collision.** #49 and #51 both mint **D-206** and both mint **E-205**, for
completely different things. Git flags this as a text conflict, so it cannot merge silently — but
whichever merges second has to be renumbered, and both decision entries have to survive.

---

## Every open PR

### #46 — FLU-OPCHAIN-01 rebuilt at 12 items per rung, and the graded key leak closed

[`feat/stage2-flu-opchain-density`](https://github.com/AadiTakle/aai-gt-selection/pull/46) · +2,773 / −598 · 10 files

Rebuilds the Stage 2 fluid-reasoning bank from 234 items to 468 (12 per 0.5-point rung instead of 6)
and closes an answer-key leak that let a client rank options by how many badge relabellings back
them. The extra density buys nothing at the 30 trials the block runs today and a real gain at 45–60.

**Mergeability:** clean against `dev`. **Conflicts with #36, #42 and #52** on four files —
`banks/FLU-OPCHAIN-01.jsonl`, `control-banks/FLU-OPCHAIN-01.perTrial.jsonl`,
`generators/FLU-OPCHAIN-01.mjs`, `generators/check-FLU-OPCHAIN-01.mjs`. This is the one genuinely
substantive collision in the queue, described under merge order below.

**CI:** green and current.

**Dependencies:** must merge **before** #36, #42 and #52.

**What it needs from you:** a decision, three parts. (a) The reachability filter forced the
within-rung distractor lever from rule-class nearness to figure distance, pushing single-label
distractor slates from 43.6% to 63.7% — a wrong answer is less diagnostic than it was, traded for 14
points of key predictability. Acceptable? (b) Should the sibling types be re-measured against the
stronger attack family, and should the evidence register note that the published figure used a weaker
one? (c) Whether §9.4's A1 stop rule should fire when the failure reproduces with no bank at all —
**this third one is already answered by D-207 in #49**, which narrows the rule to fire only when a
bank is worse than the bank-free bound. Confirm D-207 and (c) closes.

**Risk: high.** `LEARNING_BLOCK_TYPE` is `'FLU-OPCHAIN-01'` and the registry is the single source of
truth for the served-item pool, so this changes what a child is actually served — different items,
different distractors, a doubled pool. Gate A is not cleared (A1 and A4 fail on both arms) and the PR
does not claim it is; the failure is localised to the estimator's guessing-floor handling, which #49
addresses.

---

### #49 — the block aims at the child's fitted level, not at the extrapolated learning rate

[`feat/stage2-lambda-loop-fix`](https://github.com/AadiTakle/aai-gt-selection/pull/49) · +955 / −134 · 10 files

Fixes the defect where a simulated child who learned nothing was fitted a positive learning rate on
every bank tried, including an idealised grid with no bank in it. `nextTargetTheta` aimed at
`theta0 + lambda * t` — the ability projected for the next trial — which closes a loop from the
estimate of λ back onto the design that identifies λ. It now aims at a posterior-mode level fit plus
an observed-accuracy correction. Null λ̄ goes from +0.0085 to −0.0033 on the grid, recovery improves
0.334 → 0.378, and Gate A's A1 goes from passing on 0–3 of 8 seeds to 6–8 of 8.

**Mergeability:** clean against `dev`. **Conflicts with #51** (`DECISION_LOG.md`,
`ASSUMPTIONS_AND_EVIDENCE.md` — the D-206/E-205 collision) and with **#42 and #52** on
`ASSUMPTIONS_AND_EVIDENCE.md`.

**CI:** green and current.

**Dependencies:** merge **after #26** — #26's dev view simulates the block through `nextBlockTarget`,
which is exactly what this PR rewires, so #26's committed figures and seeded test expectations will
move if this lands first. Nothing else depends on it, but its **D-207 unblocks #43, #44, #45 and
#46**.

**What it needs from you:** sign-off on **D-206**, stated in one sentence — *the learning block's
targeting rule should aim at the child's fitted ability level corrected by recent observed accuracy,
rather than at an extrapolation of the fitted learning rate.* Held as Proposed because it changes
scoring behaviour and what a child is served, the same bar D-200, D-201 and D-202 were held to. The
PR is explicit about the price: a fast learner at λ = 0.15 now gets items 0.58 points **below** their
ability instead of 0.67 above, and their late accuracy rises from 48.8% to 69.4% — the block's stated
difficulty intent is lost for exactly the children it most wants to measure.

D-207 is a separate matter and is recorded as **already Approved** (owner decision 2026-08-01), not
proposed: §9.4's A1 stop rule is narrowed so a type's track stops only when its null λ̄ is worse than
the bank-free grid. Worth confirming that entry reflects a decision you actually took, because four
other PRs are waiting on it.

**Risk: highest in the queue.** Changes `packages/exam-scoring/src/learning-curve.ts`,
`learning-rate-readout.ts` and `apps/web/src/lib/exam/phase2.ts`. Both scoring behaviour and what a
child is served. Stage 1 is asserted byte-identical and `estimateLearningCurve` is untouched, so
stored traces re-score to the same values.

---

### #51 — Stage 2 hidden systems drawn per session, and why FLU-OPCHAIN can't take it

[`feat/stage2-session-keyed-systems`](https://github.com/AadiTakle/aai-gt-selection/pull/51) · +2,639 / −0 · 8 files

Measures whether the hidden badge-to-operation mapping can be drawn per session on the server instead
of baked into the shipped bank. Answer: all four banks admit re-keying, but `FLU-OPCHAIN-01`'s
difficulty ladder does not survive it — 87.8% of rungs fall short of the five items the bank
guarantees, against 0.0% as shipped. Nothing is wired; the proof of concept is imported only by its
own test.

**Mergeability:** clean against `dev`. **Conflicts with #49** on `DECISION_LOG.md` and
`ASSUMPTIONS_AND_EVIDENCE.md`, and with **#52** on the evidence register.

**CI:** green and current.

**Dependencies:** none technically, but the D-206/E-205 collision means it must merge after #49 with
its IDs reallocated.

**What it needs from you:** two things. First, a decision on **D-206 (this PR's D-206)**, in one
sentence — *the Stage 2 hidden system should be drawn per session on the server with the answer key
becoming a derived quantity, difficulty recomputed per session, items with two or fewer reachable
options excluded — and it is not shippable on the current banks.* Second, the threat-model question
in §9: per-session keying converts a permanent, transferable, bank-wide compromise into a
per-session, non-transferable one, but a child can still solve their own block from the reveals (91.3%
after the post-commit reveal, mapping pinned by trial 6). Is that residual acceptable?

And an administrative decision: **this PR's D-206 and E-205 must be renumbered** — #49 claims both
IDs for different subject matter.

**Risk: low on behaviour, medium on records.** No bank, generator, checker, renderer, route or loader
is touched. It does add a `DECISION_LOG` entry, an evidence entry and a `TRACEABILITY_MATRIX` row.

---

### #43 — VER-MORPHO-01 "Word Machines"

[`feat/stage2-ver-morpho`](https://github.com/AadiTakle/aai-gt-selection/pull/43) · +4,534 / −0 · 11 files

The Stage 2 verbal type: a tiny invented morphology the child induces across trials. Delivers spec,
dual-mode generator, independent checker and Gate A. Gate A is not cleared — A1 and A4 fail — and the
PR demonstrates the bank is not the cause: an idealised grid with no bank at all returns λ̄ = 0.0176
against this bank's 0.0166. A later commit closed a 50%-against-a-25%-floor direction lock that #47
found.

**Mergeability:** clean against `dev`. **Conflicts with #44 and #45** on
`apps/web/src/lib/exam/registry.generated.ts` only. Generated file — re-run the sync script.

**CI:** green and current.

**Dependencies:** must merge **before #48 and #52**, both of which carry a two-commit-stale copy of
this branch (pre-anti-leak-hardening). Merging this first fixes that automatically — verified.

**What it needs from you:** a decision, three parts. (a) Confirm D-207 (in #49) so §9.4's A1 stop
rule does not fire on a failure the bank did not cause. (b) The four-option format against §4.6's
preference for five or six — the trade is argued in the spec row. (c) Whether excluding K-1 outright
is the wanted treatment rather than capping the band, given Grade-1 decoding accuracy of about 34%.

**Risk: low.** Adds a bank and one `BLOCKED` registry line meaning "no renderer demo". The served
pool stays at 49 wired types; nothing reaches a child. Both banks ship `validated: false` and
`syntheticOnly: true`.

---

### #44 — SPA-XFORM-01 "Transform Machine"

[`feat/stage2-spa-xform`](https://github.com/AadiTakle/aai-gt-selection/pull/44) · +4,384 / −0 · 11 files

The Stage 2 spatial type: a machine applies badge-denoted transformations to a pattern on a 4×4
lattice. Spec, dual-mode generator, independent validator and Gate A. A2 passes; A1, A3 and A4 fail.
Because this bank is five-option — exactly `DEFAULT_GUESSING` — it is the first of the three to fail
A1 with the estimator *correctly specified*, which is what establishes that no bank can fix A1. A
later commit closed the vote-tier and key-slot leaks #47 found.

**Mergeability:** clean against `dev`. Conflicts with **#43 and #45** on `registry.generated.ts` only
— regenerate, do not hand-merge.

**CI:** green and current.

**Dependencies:** must merge before #48 and #52, which carry a stale copy.

**What it needs from you:** one decision — confirm D-207 (in #49). The PR says "do not merge before
the owner rules on the stop rule," and D-207 is that ruling. Nothing else is outstanding.

**Risk: low.** Bank-only, registered with no renderer, not wired into the live block.

---

### #45 — QUANT-GLYPHNUM-01 "Alien Numbers"

[`feat/stage2-quant-glyphnum`](https://github.com/AadiTakle/aai-gt-selection/pull/45) · +4,659 / −0 · 12 files

The Stage 2 quantitative type: an invented sign-value notation with a multiplicative binding layer.
Spec, generator, checker and Gate A. A2 and A3 pass; A1 and A4 fail, and the paired contrast against
the bank-free grid is +0.0001 (t = 0.35) — the bank is exactly on the bound. Supplies `M-PAE` through
the existing generic verifiers with no new verifier code. A later commit closed the rank-1 and
difficulty-ordinal leaks #47 found.

**Mergeability:** clean against `dev`. Conflicts with **#43 and #44** on `registry.generated.ts` only
— regenerate.

**CI:** green and current.

**Dependencies:** must merge before #48 and #52, which carry a stale copy.

**What it needs from you:** one decision — confirm D-207 (in #49). Same ruling as #44.

**Risk: low.** Bank-only, no renderer, not wired.

---

### #48 — cumulative learnability oracles for the three new types

[`feat/stage2-learnability-oracles`](https://github.com/AadiTakle/aai-gt-selection/pull/48) · +15,873 / −0 · 43 files

Builds, for the three new Stage 2 types, the equivalent of the oracle `FLU-OPCHAIN-01` already has:
given every reveal a child has seen, which parts of the hidden system are now uniquely determined.
One shared core, four thin adapters. The headline finding is negative and useful — the "ruled out"
signal is not informative for any of the four types, because the oracle determines the answer on
91–98% of trials and "ruled out" then just means "wrong."

**Mergeability:** clean against `dev`. **Conflicts with #36** on `package.json` (both define a
`stage2:learnability` script pointing at different reports; #52 already settled this by keeping the
multi-type report under that name and renaming the OpChain-only one to
`stage2:learnability:opchain`). Conflicts with #43/#44/#45 on `registry.generated.ts` — regenerate.

**CI:** green and current.

**Dependencies and the stale-carry problem:** this branch carries a merge of #43, #44 and #45 **as
they stood at 21:01 UTC on 2026-08-01**, before all three received their anti-leak hardening commits
about ninety minutes later. Its copies of `VER-MORPHO-01.jsonl`, `SPA-XFORM-01.jsonl` and
`QUANT-GLYPHNUM-01.jsonl` are the pre-hardening banks. Merging #43, #44 and #45 into `dev` **first**
makes this harmless — tested, and the hardened blobs survive #48's merge untouched, because #48's
version is the merge base for those files. Merging #48 first would put three superseded banks on
`dev`.

**What it needs from you:** nothing, once #43/#44/#45 are in. Its own body says "do not merge — this
is for review," and the reason was that it carried three unmerged branches. That reason expires the
moment they merge.

**Risk: low.** Changes no generator, bank, checker, Gate A report or renderer; wires nothing; does not
touch `packages/exam-scoring`.

---

### #47 — all four Stage 2 types under one attacker

[`feat/stage2-antileak-comparison`](https://github.com/AadiTakle/aai-gt-selection/pull/47) · +1,673 / −0 · 2 files

One attack engine that measures all five Stage 2 banks from the served projection alone. Every
published anti-leak figure turned out to be an understatement, `QUANT-GLYPHNUM-01` by 23.6 points and
`SPA-XFORM-01` by 18.6. Finds three attacks stronger than any type had tested against, including a
cross-item intersection that pins the hidden system exactly after 4 to 12 items and then scores 100%.
Reads banks out of the git object database rather than the working tree, so it disturbs nothing.

**Mergeability:** clean against `dev` and clean against everything tested. Two files.

**CI:** green and current.

**Dependencies:** none. It is fully contained in #52, so merging it separately just makes #52 smaller.

**What it needs from you:** nothing. Its test plan carries an unchecked "owner decision on each of the
four defects located in §7 — none is fixed here," but **all four have since been fixed** on the
branches that own them: the direction lock on #43, the vote-tier and slot attacks on #44, the rank-1
and ordinal attacks on #45, and the FLU-OPCHAIN residue on #46. The decision is moot; the report is
the reference those four fixes cite.

**Risk: none.** One report and one probe script. No bank, generator, checker or Gate A artifact is
touched.

---

### #52 — rotating multi-system blocks against the single 30-trial block

[`feat/stage2-rotating-systems`](https://github.com/AadiTakle/aai-gt-selection/pull/52) · +31,603 / −475 · 79 files

Simulates replacing one hidden system held for 30 trials with several independent systems rotated the
moment a child demonstrates mastery. Verdict: worth building, conditionally, at 2–3 systems of size
5 — ICC goes from 0.35 to 0.54 at a matched budget. The PR is unusually careful to disqualify its own
result: the assumption that crack-times correlate within a child across systems is *planted* by the
simulation (one fidelity parameter generated all of them), and a near-zero real correlation kills the
design.

**Mergeability:** clean against `dev`. **Conflicts with #46** on the four FLU-OPCHAIN files, with
**#49 and #51** on `ASSUMPTIONS_AND_EVIDENCE.md`.

**CI:** green and the freshest in the queue — the full run completed successfully at 09:46 UTC on
2026-08-02.

**Dependencies:** the deepest stack here. It fully contains **#48**, **#47** and **#42**, and #42 in
turn sits on **#36** — though #36 has since gained two commits this branch does not have. It also
inherits #48's stale copies of #43/#44/#45. Effective order: #43/#44/#45 → #48 → #46 → #36 → #42 →
#52.

**What it needs from you:** a decision — *should Stage 2 adopt rotating multi-system blocks at k = 2–3
and system size 5?* Merging the measurement does not commit you; the decision the report actually asks
for is whether to fund the two-system order-counterbalanced study that would test the planted
assumption before anything is built.

**Risk: low on behaviour, high on merge mechanics.** Nothing is wired: no bank, generator, checker,
renderer, estimator or `packages/exam-scoring` file changes behaviour. But it drags four other PRs'
worth of content behind it, and the 79-file diff is mostly that carried content rather than its own
work.

---

### #36 — Stage 2 review window: learnability oracle, an audited child screen, uncertainty readout

[`feat/stage2-review-window`](https://github.com/AadiTakle/aai-gt-selection/pull/36) · +9,143 / −475 · 28 files

Three things. An oracle that reports which parts of the hidden system are knowable at each trial. An
audit of the Stage 2 child screen by four evaluators who saw only rendered pixels, which found five
real defects and fixed all five — including that the `ring` operator was drawn as a rounded rectangle
indistinguishable from interface chrome, and that the demonstrations were invisible as demonstrations
until the first scored trial. And a per-choice classification against the evidence available before
the choice was made.

**Mergeability:** clean against `dev`. **Conflicts with #46** on the four FLU-OPCHAIN files and with
**#48** on `package.json`.

**CI:** green and current.

**Dependencies:** it is the base of #42, which is the base of #52 — but it has two commits neither of
them carries (a running-estimate panel and a label fix). Merge it before #42.

**What it needs from you:** a decision recorded in its §10.2 — *should Stage 2 item selection select
on determinacy (how many options the reveals leave open) rather than only on difficulty?* The
uncertainty readout separates a reasoning responder from a guesser by 3.6 block SDs, but only in the
arm where it is largely redundant with accuracy; the regime where it would add something is trials
with two or three viable options, which is 1–5% of trials unless selection changes.

**Risk: medium, and it is the only PR here that changes what a child sees.** It rewrites the Stage 2
child screen — the `ring` glyph, the choice marker, the badge enclosure, the chevron, the
demonstration beats. It also rebuilds `FLU-OPCHAIN-01` from 234 to 468 items, which is the live block's
bank. Two evaluator requests were deliberately refused and recorded rather than actioned: a right/wrong
indicator (forbidden by §1.5) and a badge legend (would ship the hidden mapping to the client).

---

### #42 — acquisition latency versus the fitted slope

[`feat/stage2-latency-vs-slope`](https://github.com/AadiTakle/aai-gt-selection/pull/42) · +9,820 / −475 · 30 files

Compares two candidate Stage 2 readouts and **recommends against building the new one**. Acquisition
latency beats λ on every psychometric comparison and is still not worth it: 67% of the average measured
latency is the instrument rather than the learner, a plain count of primitives demonstrated ties it
with none of the survival machinery, and plain block accuracy beats both.

**Mergeability:** clean against `dev`. **Conflicts with #49** on `ASSUMPTIONS_AND_EVIDENCE.md`;
conflicts with #46 on the four FLU-OPCHAIN files inherited from #36.

**CI:** green and current.

**Dependencies:** sits on #36; contained in #52. Merge after #36 and before #52.

**What it needs from you:** nothing blocking. It adds evidence entry E-211 and records a recommendation
that no decision has yet ratified. Merging the measurement does not adopt anything — the recommendation
is *not to build*, so the null action and the recommended action coincide.

**Risk: low.** Nothing wired; no estimator, bank, generator, renderer or engine file changes behaviour.
It does carry #36's FLU-OPCHAIN rebuild and #36's child-screen changes, so it inherits #36's risk if it
merges without #36.

---

### #26 — the learning rate as a range that narrows, never as a band

[`feat/learning-rate-interval`](https://github.com/AadiTakle/aai-gt-selection/pull/26) · +2,483 / −4 · 12 files

Implements the requested learning-rate range as a pure module returning a discriminated union on
`state`, plus a flag-gated dev view at `/dev/learning-interval` that shows the interval contracting as
trials accumulate. The API deliberately cannot name a band: it never receives a reference mean or SD,
so there is nothing for it to name a band against. Below the 30-trial floor it returns no bounds at all
rather than a wide range a caller could draw as if the width were the finding.

**Mergeability:** clean against `dev`, and clean against #49.

**CI:** green but **stale** — the run predates 24 commits of `dev`. Re-run after merging.

**Dependencies:** **merge before #49.** Its simulation drives the shipped administration path through
`nextBlockTarget`, which #49 rewires; if #49 lands first, this PR's committed figures and several of
its 39 seeded test expectations will move and it will need a re-run before it is honest.

**What it needs from you:** nothing.

**Risk: low.** New exports on `packages/exam-scoring` and a new route. The route is double-gated —
non-production build **and** an explicit environment flag, 404 otherwise — and was verified live at
200 with the flag and 404 without. `exam-runner.tsx` and `adaptive.ts` are untouched; no child-facing
surface is wired to any of it. No E or D ID is minted.

---

### #35 — benchmarking methodology

[`feat/benchmarking-methodology`](https://github.com/AadiTakle/aai-gt-selection/pull/35) · +5,107 / −0 · 33 files

A 47-page LaTeX report specifying how to establish whether the screener predicts which children thrive,
and whether it adds anything over CogAT. Leads with the finding that the head-to-head superiority claim
is **not executable at current scale** — it needs 520–2,590 children and the effective sample after
clustering is 157 — and then shows that changing the estimand (non-inferiority, and not dichotomising
the criterion) brings the requirement to roughly 210–220 for free.

**Mergeability:** clean against `dev` and clean alongside #34 — the two touch disjoint paths under
`docs/research/benchmarking/`.

**CI:** green but stale (11 commits behind).

**Dependencies:** complements #34, which supplies the figures its six placeholder slots wait on. Either
order works.

**What it needs from you:** nothing.

**Risk: none.** No governance file is touched, no product behaviour changes, and every effect size is
labelled simulated including a standing callout on the first page.

---

### #34 — benchmarking simulation and figures

[`feat/benchmarking-figures`](https://github.com/AadiTakle/aai-gt-selection/pull/34) · +3,174 / −0 · 25 files

The simulation half of the benchmarking package: a seeded generator and seven figures. Every number
came out of a simulation on a born-synthetic cohort; each figure carries a red `SYNTHETIC DATA` banner
burned into the image, and the two that depend on CogAT carry a second `PROJECTED STUDY DESIGN` banner
because those records do not exist yet. The README maps every synthetic field to the real source that
would replace it.

**Mergeability:** clean against `dev` and clean alongside #35.

**CI:** green but stale (11 commits behind).

**Dependencies:** pairs with #35.

**What it needs from you:** nothing.

**Risk: none.** No traceability, decision or exception record changes; no output asserts an empirical
finding.

---

### #33 — K-8 legal exposure research shard

[`research/k8-legal-exposure`](https://github.com/AadiTakle/aai-gt-selection/pull/33) · +380 / −0 · 1 file

A research shard on the legal exposure that attaches specifically because the examinee is a child in
K-8: the age-13 COPPA boundary and the circuit split on preemption, FERPA and PPRA as funding
conditions rather than general privacy law, the unsettled face-detection versus face-recognition line
under BIPA, and the observation that the consenting adult is also the risk and no law addresses it.

**Mergeability:** clean against `dev` and, textually, clean alongside #32.

**CI:** green but stale (11 commits behind).

**Dependencies:** **#32 ships the same shard under a different filename.** This PR adds
`research/shards-proctoring/06-k8-legal-exposure.md`; #32 adds
`research/shards-proctoring/07-k8-legal-exposure.md` with slightly different content (two lines
removed). Git merges both without complaint and you end up with two near-identical copies of the same
shard in the same directory. This is a semantic duplicate, not a text conflict, so no tool will catch
it.

**What it needs from you:** a decision — *which copy of the K-8 legal shard survives, `06-` from this
PR or `07-` from #32?* If #32's, close this as superseded. If this one's, #32 needs its `07-` file
dropped before merge.

**Risk: none.** One markdown file, no product behaviour, no governance record.

---

### #32 — proctoring and cheat-detection BrainLift

[`research/brainlift-proctoring`](https://github.com/AadiTakle/aai-gt-selection/pull/32) · +2,216 / −0 · 9 files

Assembles five completed research shards into a BrainLift: 307 one-sentence DOK 1 facts across 33
subcategories, six experts arranged as three genuinely disagreeing pairs, and a `candidate-tensions.md`
collecting 59 cross-source disagreements as raw material. All 91 DOIs verified against Crossref; all
177 source links resolve.

**Mergeability:** clean against `dev`.

**CI:** green but stale (11 commits behind).

**Dependencies:** carries a variant of #33's shard — see #33.

**What it needs from you:** **your own writing.** DOK 3 (Insights) and DOK 4 (SPOVs) are owner
placeholders and are deliberately undrafted — not even as illustration — because a spiky point of view
is only worth defending if it originated with the person defending it. This is not an engineering
blocker and no agent can clear it. If you would rather author DOK 3 and DOK 4 on `dev` than on a
branch, the research record underneath is complete and mergeable today; that is a workflow preference,
not a quality judgement. You also owe the #33 duplicate decision.

**Risk: none to product.** Documents only.

---

### #41 — BrainLift: scoring a learning-rate measure

[`feat/brainlift-learning-rate-scoring`](https://github.com/AadiTakle/aai-gt-selection/pull/41) · +1,462 / −0 · 5 files

A BrainLift on what it would take to measure how fast a child learns to a standard fit for an admissions
decision, assembled from three research shards which are committed alongside as the provenance. Five
knowledge-tree categories, 154 DOK 1 facts, 57 cited works; three genuinely opposed expert pairs. The
findings are kept deliberately sharp — that no located source states a minimum trial count for an
individual rate, that the rate-variance estimate inflates 205% at five practice opportunities, and that
shrinkage degrades rank ordering toward the mid-rank.

**Mergeability:** clean against `dev`. Clean alongside #32.

**CI:** green and current.

**Dependencies:** none.

**What it needs from you:** **your own writing** — DOK 3 and DOK 4 are owner placeholders, same as #32.
Same caveat: the research record is complete, the BrainLift is not, and only you can finish it.

**Risk: none to product.** Documents only. Note that `.prettierignore` excludes `brainlifting/` and
`*.md`, so the format check on these files passes by exclusion rather than by inspection.

---

### #18 — rescope: the screener is the binding aim (D-400)

[`feat/gov-rescope-screener-primary`](https://github.com/AadiTakle/aai-gt-selection/pull/18) · +836 / −82 · 8 files

Rewrites the charter mission from two co-equal aims to one binding aim — build the screener, because
that is what GT asked for — with program-effect demonstration explicitly non-binding and pursued
through the screener. `R2`, `R3` and `R6` move from Required into a new conditionally-required tier,
keeping their IDs and full text; the binding rule becomes "not required for completion; binding in full
on any program-effect claim." Also draws the scope boundary for the "total app" pivot: the project
builds the instrument and the integration surface, GT keeps the application.

The PR is notably honest about its own foundation: the interview supports the screener half directly
and repeatedly, and contains **zero** occurrences of *program effect, causal, counterfactual, lottery,
random, control group, comparison group* or *impact*. Demoting program effect is registered as the
owner's decision informed by the interview, not as something the stakeholder asked for (E-404).

**Mergeability: the only PR that conflicts with `dev` today.** Three files, one hunk each —
`docs/governance/DECISION_LOG.md`, `docs/product/TRACEABILITY_MATRIX.md`,
`docs/research/ASSUMPTIONS_AND_EVIDENCE.md`. All three are append-region collisions: `dev` grew
D-200–D-205 and the E-200 series underneath while this branch was open. Mechanically resolvable by
re-appending; nothing about the rescope's content is in dispute with anything on `dev`.

**CI:** green but the stalest in the queue — 43 commits behind.

**Dependencies:** its body says "stacks on #17, merge #17 first." **#17 merged on 2026-07-30**; that
instruction is obsolete and the diff has already narrowed to this branch's own commit.

**What it needs from you:** five judgement calls the PR enumerates and does not resolve. In one
sentence each: **(1)** should `R4` stay Required (the author kept it, arguing its bullets are
prohibitions that cost nothing to honour), or be split so the counterfactual sentence moves wholly into
`R2`? **(2)** `R6` moves too, which the brief did not anticipate, leaving upper-range precision — the
gifted-ceiling concern — with no binding home; the cheapest fix is one bullet on `R11`, which the author
declined to write because inventing requirement text is not a mechanical consequence of your
instruction. **(3)** Is a new conditionally-required tier the right shape, rather than folding these
into High-leverage? **(4)** The rubric still gives the now-non-binding causal-credibility aim the
largest single weight, 30 of 100 against 15 for measurement validity, and was left stale deliberately
because a wrong rebalance is harder to spot than a stale one — rebalance now or later? **(5)** Four
scope-boundary calls in the total-app pivot, of which the contested one is removing `F8.x`, the blind
reviewer panel, which is the strongest R5/H1 evidence apparatus in the project.

**Risk: highest governance risk in the queue.** Rewrites `PROJECT_CHARTER.md`,
`project-requirements.md` and `DEVELOPMENT_RUBRIC.md`, and changes the tier of three requirements that
seventeen other open PRs cite. Every ID is preserved and `pnpm governance:ids` reports zero orphans, so
citations still resolve. No user-facing copy and no scoring behaviour changes. It also flags thirteen
existing claims across the repository that now overstate the design, corrects two, and lists the rest
rather than fixing them by stealth — the largest being `EVIDENCE_DOSSIER.md`'s assertion of genuine
seat scarcity, which E-400 directly contradicts.

---

## Recommended merge order

The queue splits into five waves. Within a wave, order does not matter.

### Wave 1 — no decisions, no conflicts (4 PRs)

**#47 → #34 → #35 → #26**

#47 first because #43, #44, #45 and #46 all cite its report as the reference for the leaks they close;
landing it first makes those four self-explanatory. #34 and #35 are the benchmarking pair and touch
nothing else in the repository. #26 goes in this wave specifically so it precedes #49 — its simulation
runs through `nextBlockTarget`, which #49 rewires.

### Wave 2 — the three Stage 2 types, then the work that carries them (4 PRs)

**#43 → #44 → #45 → #48**

One decision (confirm D-207) covers all four. Order within #43/#44/#45 is free, but the second and
third will conflict on `apps/web/src/lib/exam/registry.generated.ts`. **That file is generated: resolve
by re-running `node scripts/sync-exam-demos.mjs` and committing the result, then confirm with
`pnpm exam:sync:check`. Never hand-merge the array.**

#48 must come after all three, and this is the load-bearing ordering constraint in the whole queue. #48
carries a snapshot of those branches taken about ninety minutes before each received its anti-leak
hardening. Merged in this order the hardened banks survive untouched — verified by test merge. Merged
the other way round, three superseded banks land on `dev`. #48 also collides with #36 on
`package.json`; resolve it the way #52 already did, keeping `stage2:learnability` for the multi-type
report and renaming the OpChain-only one to `stage2:learnability:opchain`.

### Wave 3 — the FLU-OPCHAIN bank and the review-window stack (4 PRs)

**#46 → #36 → #42 → #52**

This is the one wave where the ordering resolves a genuine disagreement rather than a mechanical
collision. **#46 and #36 are two different rebuilds of the same live bank**, both taking
`FLU-OPCHAIN-01` from 234 items to 468, with different content:

- #36 changes item density only — 72 lines of generator change.
- #46 changes density *and* three anti-leak properties — every distractor relabelling-reachable, the
  key's vote rank round-robined, near-equal vote counts preferred — plus a duplicate-stimulus fix, in
  406 lines of generator change.

#46's design strictly contains #36's. **Merge #46 first, then regenerate the bank from #46's generator
on each of #36, #42 and #52 rather than hand-merging four JSONL and generator files.** #36 before #42
before #52 follows the stack: #42 sits on #36, #52 contains #42 and #48, and #36 carries two commits
neither #42 nor #52 has.

`registry.generated.ts` will conflict again at every step in this wave. Same rule: re-run the sync
script.

### Wave 4 — governance and scoring, in this order (3 PRs)

**#18 → #49 → #51**

#18 goes before #49 and #51 rather than last, and the reason is mechanical: #18's three conflicts are
in `DECISION_LOG.md`, `TRACEABILITY_MATRIX.md` and `ASSUMPTIONS_AND_EVIDENCE.md`, and #49 and #51 both
append to exactly those files. Resolving #18 today costs three hunks; resolving it after #49 and #51
costs more, and every day it sits it drifts further from a `dev` it is already 43 commits behind.

#49 before #51 because of the **D-206 and E-205 collision**: both PRs mint both IDs for unrelated
subject matter. Take #49's numbering as the incumbent — its D-207 is already an approved owner decision
and four other PRs depend on it — and reallocate #51's decision and evidence entries to the next free
IDs in the exam band. Both entries must survive; this is a renumber, not a choice between them.

### Wave 5 — waiting on your writing (3 PRs)

**#33 (or its closure) → #32 → #41**

Settle the duplicate K-8 shard first, then merge whichever of #32/#41 you have finished DOK 3 and DOK 4
for. Neither can be completed by an agent.

### One-line summary of the order

```
#47 #34 #35 #26 | #43 #44 #45 #48 | #46 #36 #42 #52 | #18 #49 #51 | #33 #32 #41
```

---

## Merge now

Green, low risk, no decision needed. Four PRs.

| PR | What it is | Note |
| --- | --- | --- |
| [#47](https://github.com/AadiTakle/aai-gt-selection/pull/47) | One attack engine across all four Stage 2 banks | Two files. Its four §7 defects are already fixed on #43/#44/#45/#46 |
| [#34](https://github.com/AadiTakle/aai-gt-selection/pull/34) | Benchmarking simulation and seven figures | CI stale (11 commits behind) — re-run after merge |
| [#35](https://github.com/AadiTakle/aai-gt-selection/pull/35) | Benchmarking methodology report | CI stale (11 commits behind) — re-run after merge |
| [#26](https://github.com/AadiTakle/aai-gt-selection/pull/26) | Learning-rate interval module + gated dev view | **Merge before #49** or its figures and seeded tests move. CI stale (24 behind) |

---

## Needs a decision

Eleven PRs. The question is stated so you do not have to reconstruct it.

| PR | The decision, in one sentence |
| --- | --- |
| [#49](https://github.com/AadiTakle/aai-gt-selection/pull/49) | **D-206:** should the learning block aim at the child's fitted ability level corrected by recent accuracy, instead of at an extrapolation of the fitted learning rate — accepting that a fast learner then gets items *below* their ability? Separately, confirm that **D-207** (narrowing §9.4's A1 stop rule) records a decision you took on 2026-08-01, because four other PRs are waiting on it |
| [#51](https://github.com/AadiTakle/aai-gt-selection/pull/51) | **D-206 (different D-206):** should the Stage 2 hidden system be drawn per session on the server with the key derived, difficulty recomputed, and low-reachability items excluded — knowing it is not shippable on the current banks? Plus the §9 threat-model question: is a per-session, non-transferable compromise an acceptable residual? Plus: renumber its D-206 and E-205, which collide with #49 |
| [#46](https://github.com/AadiTakle/aai-gt-selection/pull/46) | Is trading distractor diagnosticity (single-label slates 43.6% → 63.7%) for 14 points of key predictability acceptable on the live bank, and should the sibling types be re-measured against the stronger attack family? |
| [#43](https://github.com/AadiTakle/aai-gt-selection/pull/43) | Confirm D-207; then: four-option format against §4.6's preference for five or six, and K-1 excluded outright rather than capped? |
| [#44](https://github.com/AadiTakle/aai-gt-selection/pull/44) | Confirm D-207 — that is the whole blocker |
| [#45](https://github.com/AadiTakle/aai-gt-selection/pull/45) | Confirm D-207 — that is the whole blocker |
| [#52](https://github.com/AadiTakle/aai-gt-selection/pull/52) | Should Stage 2 adopt rotating multi-system blocks at k = 2–3 and system size 5 — or first fund the two-system, order-counterbalanced study that would test the planted correlation assumption the whole result rests on? |
| [#36](https://github.com/AadiTakle/aai-gt-selection/pull/36) | Should Stage 2 item selection select on determinacy — how many options the reveals leave open — rather than only on difficulty (§10.2)? |
| [#42](https://github.com/AadiTakle/aai-gt-selection/pull/42) | Accept the recommendation **not** to build an acquisition-latency readout. Low stakes: the recommendation is inaction, so merging the measurement commits you to nothing |
| [#33](https://github.com/AadiTakle/aai-gt-selection/pull/33) | Which copy of the K-8 legal shard survives — `06-` from #33 or `07-` from #32? Git will merge both silently |
| [#18](https://github.com/AadiTakle/aai-gt-selection/pull/18) | Five judgement calls: keep `R4` Required or split it; write the `R11` bullet that would rehouse the gifted-ceiling concern `R6` leaves behind; conditionally-required tier or High-leverage; rebalance the rubric's stale 30-point causal weight now or later; and whether removing `F8.x`, the blind reviewer panel, is the right scope call |

---

## Not ready

Three PRs. **Both BrainLifts are blocked on your own writing, not on engineering** — DOK 3 (Insights)
and DOK 4 (SPOVs) are deliberately left as placeholders because a spiky point of view cannot be
delegated. Neither should be merged as a finished BrainLift, and no agent can finish them. The research
record underneath each is complete; merging that record and authoring DOK 3/4 on `dev` is a legitimate
alternative if you prefer, but it is a workflow choice rather than a fix.

| PR | What is missing |
| --- | --- |
| [#48](https://github.com/AadiTakle/aai-gt-selection/pull/48) | Carries #43/#44/#45 as they stood before their anti-leak hardening. Merge those three into `dev` first and this resolves itself — verified. No other work needed |
| [#32](https://github.com/AadiTakle/aai-gt-selection/pull/32) | DOK 3 and DOK 4 are owner placeholders. Also owes the #33 duplicate-shard decision |
| [#41](https://github.com/AadiTakle/aai-gt-selection/pull/41) | DOK 3 and DOK 4 are owner placeholders |

---

## Closed, for the record

[#50](https://github.com/AadiTakle/aai-gt-selection/pull/50) `feat/exam-lambda-endogeneity` was closed
on 2026-08-01 as **superseded by #49**, not rejected. Both PRs reached the same diagnosis independently
and confirmed it with the same decisive test. They differ in remedy cost: #50 used an exogenous schedule
and paid for the bias removal (recovery 0.332 → 0.307, posterior SE 0.063 → 0.085, reportability down
12–16 points), where #49 aims at a level fit and improves all three. Three findings live only on #50 and
are worth remembering if D-206 is reopened: that conditioning on served difficulty roughly *doubles* the
artifact rather than removing it, that two independent finite-sample bias corrections both move it *up*
(which rules out that class of cause), and the independent replication of the mechanism itself.

Nothing else in the queue is broken or superseded. The near-misses are the two duplicates named above —
#33's shard against #32's copy of it, and #49's D-206/E-205 against #51's — neither of which any tool
will catch on its own.
