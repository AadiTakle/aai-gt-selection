# Requirement-ID Audit — orphaned and uncited governance IDs

**Scope:** every `R`, `H`, `E`, and `D` prefixed governance ID cited anywhere in
the repository, checked in both directions against its canonical register.
**Baseline:** `dev` @ `51e10c8`. **Date:** 2026-07-30.
**Tool:** `scripts/audit-requirement-ids.mjs`.

> **Status: the §5 remedy was ratified by the owner on 2026-07-30 and has been
> applied under D-032.** Sections 1–4 remain the findings as measured against
> `dev` @ `51e10c8` and are left unedited as the point-in-time record; the
> orphan counts they report are the ones the remedy cleared, not current state.
> As of D-032, `node scripts/audit-requirement-ids.mjs --strict` exits 0 and runs
> as a blocking CI check. §5.4's recurrence prevention is now the per-lineage ID
> bands and the governance-merge-path rule in `AGENTS.md`. §7's reasoning for
> keeping the tool out of CI is superseded — it applied only while `dev` carried
> unfixable orphans.

**As originally written, this document did not add, retire, or renumber any ID.**
`R11` turns out to be a ratified requirement stranded on unmerged branches, so
reconciling it was a product-direction change belonging to the team lead
(`PROJECT_CHARTER.md` precedence; `AGENTS.md` "Stop conditions"). §5 states the
remedy and the exact edits it took; §6 lists what was changed on the audit
branch itself, which was the audit tool and this file.

**Requirements served:** R7 (auditability — a citation that points at nothing
cannot be reconstructed by an independent reviewer) and R3 (the requirement-ID
discipline is what stops the success definition from drifting after the fact).
**Evidence/assumptions:** no new evidence entries. Every claim below is a
verified property of this git repository, reproducible with the commands shown.

---

## 1. Headline

`R11` is **case (a): a real, ratified requirement that never reached `dev`.** It
is not a phantom and not a copy-paste invention. It was added deliberately, in
one commit, together with the decision that adopted it, the evidence that
justified it, and its traceability rows — and then that whole line of work was
never merged.

`R11` is not alone. The same unmerged commit pair also stranded `D-015` and
`D-016`, which are exactly the two IDs missing from `dev`'s decision log. All
three orphans have one cause and one fix.

| ID family | Register | Defined | Orphaned citations | Uncited definitions |
| --------- | ---------------------------------------- | ------- | ------------------------------------------------ | ------------------- |
| `R` | `docs/product/project-requirements.md` | 10 | **1** — `R11` (109 citations, 39 files) | 0 |
| `H` | `docs/product/project-requirements.md` | 10 | 0 | 0 |
| `E` | `docs/research/ASSUMPTIONS_AND_EVIDENCE.md` | 90 | 0 | **22** |
| `D` | `docs/governance/DECISION_LOG.md` | 29 | **2** — `D-015` (104 / 28), `D-016` (59 / 25) | **1** — `D-031` |

**3 orphaned IDs carrying 272 citations; 23 uncited definitions.** Plus a
five-ID hole at `E-085`–`E-089` that is defined nowhere in any branch (§4.3). <!-- id-audit:ignore-line -->

Mechanical fixes made: **none, because none exist.** There is no typo'd ID
anywhere in the repo — no wrong-width `D-15` for `D-016`, no dashed `R-11`, no
lowercase citation, no mislabeled gloss. Every orphan is a governance question,
not a transcription slip. Details in §6.

---

## 2. What `R11` is, and the evidence for it

### 2.1 The canonical text exists

`R11` is fully drafted, in the canonical document, on `feat/adaptive-exam-app`:

```
$ git show feat/adaptive-exam-app:docs/product/project-requirements.md
```

> ### R11. Provide a scalable, tunable, GT-validated screening instrument
>
> The selection product must include a screener that predicts giftedness and
> Timeback-fit and can drive the admission decision at real scale.
>
> **Evidence that this is met**
>
> - The screener targets giftedness _and_ the ability to thrive and accelerate on
>   the Timeback platform, not giftedness alone.
> - It is operable algorithmically at applicant volumes in the thousands,
>   producing an admit / defer / "try again" decision without per-applicant human
>   scoring.
> - Its parameters and cut are exposed for GT admissions to tune and own; the
>   product does not lock a final cut on GT's behalf.
> - Its outputs are validated against GT's existing signals (CogAT, MAP) and,
>   where available, Timeback acceleration, using GT-provided data (E-071, E-075).
> - A human path is preserved for near-miss cases and behavioral (shadow-day)
>   review; R10's claim boundaries still apply — a reliable screener does not by
>   itself establish program impact.

### 2.2 It was introduced deliberately, not by accident

The earliest genuine `R11` reference in the repository:

```
$ git log -S "R11" --all --pretty=format:"%h|%ad|%d|%s"   # oldest genuine hit
51776da | 2026-07-24 00:46:29 -0500 | (origin/feat/interview-scope-update)
governance: reframe selection target to Timeback-fit + add R11 screener (D-015)
```

(Two 2026-07-18 hits from `git log -S` are false positives: the `pnpm-lock.yaml`
sha512 integrity strings contain the run `…kifR11g…`.)

That commit is the opposite of a copy-paste artifact. It changed five governance
files in one atomic edit, with a message that names the intent:

```
$ git show --stat 51776da
 PROJECT_CHARTER.md                        | 14 ++++++++-----
 docs/governance/DECISION_LOG.md           | 13 ++++++++++++
 docs/product/TRACEABILITY_MATRIX.md       |  6 +++++-
 docs/product/project-requirements.md      | 33 +++++++++++++++++++++----------
 docs/research/ASSUMPTIONS_AND_EVIDENCE.md |  7 +++++++
```

> Per the GT admissions-director interview (Crystal Martel, 2026-07-23):
> … project-requirements: reframe R5 to capability-and-fit; add R11 (scalable,
> tunable, GT-validated screener) … D-015 records the reframe … E-071..E-077
> capture the interview evidence … TRACEABILITY: R11 coverage row …

`docs/product/project-requirements.md` has only ever been touched by four
commits. Two of them are the R11 work, and neither is on `dev`:

```
$ git log --all --oneline -- docs/product/project-requirements.md
eef1d28 feat(gov): reconcile R11/D-015/R5 and record D-016 adaptive screener   # feat/adaptive-exam-app only
51776da governance: reframe selection target to Timeback-fit + add R11 screener # feat/interview-scope-update only
e9aa889 chore: clean repo and reorganize docs
bf9a314 Establish planning and governance baseline
```

### 2.3 It was ratified

`D-015` (**Status: Approved**, **Owner: Team lead**) adopts it in terms:

> Adopt a scalable, tunable, GT-validated screener as a first-class deliverable
> (**new R11**) and reframe R5 to a capability-and-fit standard.
> **Requirements served:** R1, R5, R8, R11 …
> **Evidence:** E-071–E-077 (GT admissions-director interview, Crystal Martel,
> 2026-07-23, Otter transcripts pt.1/pt.2)

`D-016` (**Status: Approved**) then builds it: "Build the R11 screener as a
born-synthetic adaptive test sub-application," `R11 (primary)`.

Both entries are reproduced verbatim in
`docs/OVERNIGHT_GOVERNANCE_DIVERGENCE.md` §"Verbatim `D-015`"/"Verbatim `D-016`".

`docs/governance/SCOPE_EXCEPTION_LOG.md` contains no `R11` entry, and none is
needed: R11 was adopted as a requirement, not as an exception to one.

### 2.4 Traceability existed too — on the branch

```
$ git show feat/adaptive-exam-app:docs/product/TRACEABILITY_MATRIX.md       | grep -cw R11   → 5
$ git show feat/adaptive-exam-app:docs/product/FEATURE_TO_REQUIREMENT_MAP.md | grep -cw R11   → 8
$ grep -cw R11 docs/product/TRACEABILITY_MATRIX.md docs/product/FEATURE_TO_REQUIREMENT_MAP.md  → 0, 0
```

On `dev` the exam workstream has no requirement rows at all (`AX-01`–`AX-06`
appear zero times in `docs/product/`). The `dev` traceability index does not know
the screener exists.

### 2.5 How it was lost

```
$ git merge-base --is-ancestor 51776da dev   → NO
$ git branch --contains 51776da              → feat/interview-scope-update
$ git branch --contains eef1d28              → feat/adaptive-exam-app
$ grep -oE "^### D-[0-9]{3}" docs/governance/DECISION_LOG.md   → … D-013 D-014 D-017 D-018 …
```

Neither branch was ever merged into `dev`. `dev`'s decision log jumps
`D-014 → D-017`, and the two missing numbers are precisely the two decisions that
create R11. The exam _implementation_ was brought onto `dev` (commit `2b458cb`,
"bring adaptive CAT backend additively onto dev" and successors), but the
_governance_ that authorized it was not. That is the entire bug: code merged
along one path, requirements along another.

This also explains the finding recorded in `docs/GENB_VERIFICATION_2026-07-28.md`
§14 — that the exam code carries exactly one requirement citation and it reads
`serves R7/R11`. It is not sloppiness. Gen-B was built against a lineage where
R11 exists and is wired end to end.

### 2.6 All 109 citations mean the same thing

Every citation glosses R11 as the same object — a scalable, tunable, GT-owned,
automated screener — which matches the §2.1 title exactly. Sampling the
distinct glosses across all four families of citing document:

| Where | Gloss |
| ---------------------------------------------- | ------------------------------------------ |
| `docs/governance/DECISION_LOG.md` (×8) | "scalable/tunable in-house screener" |
| `docs/architecture/EXAM_ITEM_SCHEMA_SPEC.md` | "scalable/tunable screener" |
| `docs/OVERNIGHT_GENA_VS_GENB_CONSOLIDATION.md` | "scalable/tunable GT-owned screener" |
| `research/test-structure-research/**` (×36) | "automated adaptive screener", "R11 config" |
| `supabase/migrations/*.sql` (×9) | "serves R11" on the screener schema |
| `research/exam-question-types/METRIC_FRAMEWORK.md` | "scalable/tunable screener" |

There is **no competing definition of R11 anywhere.** The distinction the task
turns on therefore resolves cleanly: one coherent meaning, one origin, one
ratifying decision.

One gloss drifts on substance and should be corrected when R11 lands:
`packages/exam-scoring/METRICS_BASIS.md:18` renders R11 as "fully-automated
screener (**no human in the loop**)". R11's own text says the opposite — "A human
path is preserved for near-miss cases and behavioral (shadow-day) review". The
gloss overstates the requirement. This is listed in §5 rather than fixed here,
because it cannot be corrected against a requirement that `dev` does not yet
carry.

---

## 3. Why this is not a mechanical transcription

`docs/OVERNIGHT_GOVERNANCE_DIVERGENCE.md` §1a already reached the "stranded, not
invented" conclusion on 2026-07-28 and flagged that porting it is not mechanical.
This audit confirms that and pins down the precise reason.

**R11's text cites `E-071` and `E-075`. `D-016` cites `E-074`. `D-015` cites
`E-071–E-077`. All seven of those IDs already mean something else on `dev`.**

| ID | Meaning on `dev` | Meaning on `feat/adaptive-exam-app` |
| ------- | --------------------------------------------------- | ----------------------------------------------------- |
| `E-071` | Baseline reading literacy is a Timeback prerequisite | GT's admission rubric is multi-path (CogAT/MAP) |
| `E-072` | The project must incorporate an AWS Lambda | GT's selection target is Timeback thriving, not giftedness alone |
| `E-073` | A 6-item block cannot recover an injected learning rate | The "speed" GT values is rate of absorbing new information |
| `E-074` | The generated banks fail the `packages/contracts` contract | CogAT shows few false positives, some false negatives |
| `E-075` | Several question types are computable from `content` | GT can provide screener-validation data (~46 students) |
| `E-076` | `CX-achieve-02` ships a solvable outcome model | Current cohorts are ~40–46 physical, ~300 virtual |
| `E-077` | `NOT_SERVABLE.json` was declarative only, unenforced | The deliverable is a tunable model GT can tune itself |

Pasting R11 in verbatim would land three silently-wrong evidence citations: its
validation bullet would claim GT-provided student data is evidenced by a note
about reading literacy and one about client-side computable question types, and
the CogAT non-requirement would rest on a bank-contract defect. Wrong in a way no
reader would catch, because the IDs resolve.

**R11 also does not arrive alone.** `git diff dev feat/adaptive-exam-app --
docs/product/project-requirements.md` shows it bundled with product-direction
changes that need the same ratification:

- the **core success statement** is rewritten to a dual aim, adding "(a) produces
  a scalable, defensible screening decision identifying applicants who are gifted
  and able to thrive and accelerate on GT School's Timeback platform";
- **R5** is retitled "Preserve a defensible capability-**and-fit** standard" and
  its body and evidence bullets are rewritten;
- three **non-requirements** are rewritten, including "a specific test,
  threshold, composite formula, or number of measures" → "a _locked_ threshold …
  (the screener itself is now in scope per R11)". That inverts a non-requirement
  into scope.
- `PROJECT_CHARTER.md` diverges by 9 insertions / 5 deletions; `dev`'s charter
  contains zero mentions of Timeback-fit or a screening instrument.

Adding R11 to `dev` therefore means ratifying a reframe of the capstone's success
statement, R5, the charter mission, and the scope boundary — not appending a
heading. That is squarely an owner decision under `AGENTS.md`.

---

## 4. Full orphan / uncited report

Reproduce with `node scripts/audit-requirement-ids.mjs` (759 tracked files
scanned).

### 4.1 Orphaned citations — cited, never defined

| ID | Citations | Files | Status |
| ------- | --------- | ----- | ---------------------------------------------------------- |
| `R11` | 109 | 39 | Case (a). Ratified by `D-015`; stranded on unmerged branches. |
| `D-015` | 104 | 28 | Same cause. Verbatim text preserved in `OVERNIGHT_GOVERNANCE_DIVERGENCE.md`. |
| `D-016` | 59 | 25 | Same cause. Verbatim text preserved in the same file. |

Nothing else. `H` and `E` have zero orphaned citations.

### 4.2 Uncited definitions — defined, never cited outside the register

`R` and `H` are fully covered: all 20 requirements are cited somewhere. That is
the direction that matters most for the charter, and it is clean.

**`E` — 22 of 90 (24%) are cited only in the register itself:**

```
E-001 E-003 E-004 E-009 E-015 E-017 E-020 E-022 E-028 E-029 E-030 E-031
E-046 E-047 E-048 E-049 E-050 E-059 E-060 E-061 E-068 E-069
```

Not necessarily a defect: an evidence register legitimately holds background
facts and open assumptions that no current work item leans on. But it is worth an
owner's eye on the clusters, which are not random — `E-046`–`E-050` and
`E-059`–`E-061` are contiguous runs, suggesting whole blocks of research whose
conclusions never reached a decision or a requirement. `E-004` (the "≈2.6× MAP
growth" company claim) being uncited is the healthy case; a company claim
_should_ sit unused.

**`D` — 1 of 29:** `D-031`, dated 2026-07-29 and still "Proposed (awaiting
team-lead ratification)". Benign — it is the newest entry and nothing has been
built against it yet.

<!-- id-audit:ignore-start — §4.3 exists to name IDs that are defined nowhere -->

### 4.3 Also found: a five-ID hole at `E-085`–`E-089`

The evidence register runs `E-001…E-084`, then jumps to `E-090…E-095`.
`E-085`–`E-089` are defined in **no file on any branch**:

```
$ git grep -lIE "E-08[5-9]" $(git for-each-ref --format='%(refname:short)' refs/heads)
  (no output)
```

`E-090` was allocated on `feat/exam-verify-vbatch1`, `E-091` on `vbatch2`,
`E-092` on `vbatch3` — three sibling branches numbering in parallel. The hole is
the signature of the allocation race that
`docs/OVERNIGHT_GOVERNANCE_DIVERGENCE.md` §5 predicted: "the two lineages
allocate from the same counter without seeing each other." Harmless in itself; a
useful confirmation that the counter needs the fix in §5.4.

<!-- id-audit:ignore-end -->

### 4.4 Namespace collision that defeats automated checking

`docs/audit/DUPLICATION_AND_REDUNDANCY.md` uses `D-01`…`D-30` for its own
duplication findings ("`D-15` | Percentile — three different meanings under
similar names"). Same prefix, different family, 33 IDs. The two are separable
only by digit width — decision IDs are always three digits — which is the rule
the audit tool encodes. Renaming that document's local IDs (to `DUP-01`, say)
would remove the ambiguity, but it rewrites a dated historical audit, so it is
listed here rather than done.

### 4.5 False positives, documented so they are not re-flagged

Each of these looks like an orphaned ID to a naive grep. None is a citation.

<!-- id-audit:ignore-start — this table catalogues non-IDs by name -->

| Pattern | Real meaning | Sites |
| ------------------- | ---------------------------------------------------------- | ---------------- |
| `H0` | Null hypothesis in SPRT / sequential-testing notation | 8 |
| `H15`, `H17`, `H20` | SVG path data — `H` is the horizontal-lineto command | 6 |
| `D-0` | Inside quoted regexes in transcribed shell commands (`'D-0[0-9][0-9]'`) | 3 |
| `D-01`…`D-30` | `DUPLICATION_AND_REDUNDANCY.md`'s own finding IDs (§4.4) | 33 |
| `R-1` | JavaScript arithmetic in the demo renderers (`r === R-1`) | 7 |
| `E-0xx` | A wildcard in prose, not an ID | 2 |
| `R11` in `pnpm-lock.yaml` | sha512 integrity substring | 1 |

<!-- id-audit:ignore-end -->

---

## 5. Recommended remedy

**Ratify and transcribe. Do not retire `R11`.**

Retiring it would mean voiding a decision the log records as Approved by the team
lead, invalidating 272 citations across 39 files including nine shipped
migrations, and leaving the entire exam workstream — the largest body of code in
the repo — with no requirement to trace to. Remapping to an existing requirement
does not work either: `R5` covers the capability standard but says nothing about
operating at thousands-scale or GT owning a tunable cut, which is the substance
of R11 and the whole reason it was written.

**Everything below is a proposal awaiting the team lead. None of it is applied.**

### 5.1 Decide first (blocking, owner only)

1. **Ratify or reject the reframe bundle.** R11 cannot land without also settling
   the rewritten core success statement, the R5 → "capability-and-fit" retitle,
   the three rewritten non-requirements, and the charter mission (§3). Ratifying
   R11 alone would leave `dev` with a requirement whose parent success statement
   does not mention it.
2. **Resolve the `E-071`–`E-077` fork.** `dev`'s seven entries are merged and in
   use, so the recommendation is to keep them canonical and re-register the seven
   GT-interview entries at the next free IDs — `E-096`–`E-102`, since `E-095` is
   the current high-water mark. Then re-point every citation in the transcribed
   R11/`D-015`/`D-016` text. This is the step that cannot be automated.

### 5.2 Then apply, in this order

| # | File | Edit |
| - | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 1 | `docs/research/ASSUMPTIONS_AND_EVIDENCE.md` | Add the 7 GT-interview entries as `E-096`–`E-102` (bodies: `git show feat/adaptive-exam-app:…` rows `E-071`–`E-077`). |
| 2 | `docs/product/project-requirements.md` | Insert `§R11` after `§R10` using the §2.1 text, with `(E-071, E-075)` → `(E-096, E-100)`. |
| 3 | `docs/product/project-requirements.md` | Apply the core-success, `R5`, and non-requirement edits; `E-074` → `E-099`. |
| 4 | `docs/governance/DECISION_LOG.md` | Insert `D-015` and `D-016` between `D-014` and `D-017`, verbatim from `OVERNIGHT_GOVERNANCE_DIVERGENCE.md`, with `E-071–E-077` → `E-096–E-102`. |
| 5 | `PROJECT_CHARTER.md` | Port the dual-aim mission reframe (`git diff dev feat/adaptive-exam-app -- PROJECT_CHARTER.md`). |
| 6 | `docs/product/TRACEABILITY_MATRIX.md` | Port the 5 `R11` rows. |
| 7 | `docs/product/FEATURE_TO_REQUIREMENT_MAP.md` | Port the 8 `R11` rows, plus the `AX-01`–`AX-06` feature rows that `dev` is missing. |
| 8 | `packages/exam-scoring/METRICS_BASIS.md:18` | "no human in the loop" → the human near-miss/shadow-day path R11 actually preserves (§2.6). |
| 9 | `docs/governance/DECISION_LOG.md` | Record the reconciliation as a new decision (`D-032`), per `D-015`'s own auditability requirement (R7). |

### 5.3 Verify afterwards

`node scripts/audit-requirement-ids.mjs --strict` should exit 0: `R11`, `D-015`,
and `D-016` all resolve, and no new orphan is introduced by the `E-096`–`E-102`
re-pointing.

### 5.4 Prevent the recurrence

The `R11` stranding, the `D-019`/`E-072`/`E-073` collisions in
`OVERNIGHT_GOVERNANCE_DIVERGENCE.md`, and the five-entry register hole (§4.3) are
one failure repeated: parallel branches allocate governance IDs from a shared
counter none of them can see. Two candidate fixes, for the owner:

- **Reserve disjoint ranges per lineage**, so a night of research cannot consume
  an ID another branch already holds; or
- **require allocation against the union of all live registers**, which is
  stricter but needs a tool.

Either way, `AGENTS.md`'s branch workflow should say that governance-register
edits merge to `dev` on the same path as the code they authorize. The R11 loss
happened because implementation and authorization travelled separately.

### 5.5 Related records that will need a forward-pointer

Two documents assert that R11 does not exist, on the correct observation that it
is absent from `dev` but the wrong conclusion that it was never written:

- `docs/GENB_VERIFICATION_2026-07-28.md` — "**R11 does not exist.**" (§14, and
  lines 37, 348)
- `docs/HANDOFF_2026-07-28.md` §C — "R11 does not exist in the canonical
  requirements"

Both are dated point-in-time records and should not be rewritten. When R11 lands,
add a one-line forward-pointer to this audit. (A third,
`OVERNIGHT_GOVERNANCE_DIVERGENCE.md` §1a, already carries the correction.)

---

## 6. What this branch actually changed

**Mechanical fixes applied: none — the audit found none to make.** This is a real
finding, not an omission. The repository has no typo'd governance ID: no
wrong-width `D-15` standing in for `D-016`, no dashed `R-11`, no lowercase
citation, no ID cited in the wrong family, and no mislabeled gloss (all 46
distinct parenthetical `R`/`H` glosses match their canonical titles). Checked
with:

```
$ git grep -nIP "(?<![\w-])[RH]-[0-9]+"                    # dashed R/H  → JS arithmetic only
$ git grep -nIP "(?<![\w-])E-[0-9]{1,2}(?![0-9])"          # short E     → prose wildcards only
$ git grep -hIoP "(?<![\w-])[RH][1-9][0-9]?\s*\([^()]{3,60}\)" | sort -u   # glosses → all correct
$ grep -oE "^\| E-[0-9]{3} " docs/research/ASSUMPTIONS_AND_EVIDENCE.md | sort | uniq -d   # dupes → none
```

Every orphan traces to the single unmerged-governance cause in §2.5, and every
uncited ID is either benign or an owner judgement. There was nothing safe left to
fix silently.

Files added:

- `docs/governance/REQUIREMENT_ID_AUDIT.md` — this document.
- `scripts/audit-requirement-ids.mjs` — the audit tool.

No requirement, decision, evidence entry, traceability row, or citation was
edited.

Cosmetic, reported but not fixed: four `E-` rows sit out of ascending order in
the register (`E-077` before `E-075`; `E-094` before `E-078`). Reordering rows in
a governance document under charter precedence is not an unattended edit.

---

## 7. The audit tool

`scripts/audit-requirement-ids.mjs`, run from the repo root:

```
node scripts/audit-requirement-ids.mjs            # human-readable report
node scripts/audit-requirement-ids.mjs --json     # machine-readable
node scripts/audit-requirement-ids.mjs --strict   # exit 1 if any orphan exists
```

It reads the three canonical registers, scans every tracked file, and reports
both directions. Two implementation notes worth knowing:

- **Range citations are expanded.** `E-071–E-077` counts as a citation of each of
  `E-071`…`E-077`. Without this, an ID cited only inside a span reads as uncited
  and the §4.2 list would be wrong.
- **Citation shapes are strict** — `R`/`H` take a bare number starting at 1;
  `D`/`E` take exactly three digits. Each rule exists to exclude a specific
  false-positive class from §4.5, and loosening one re-admits it.

**It is deliberately not wired into CI.** `--strict` is red on `dev` today, for
three orphans that are governance decisions rather than defects — a contributor
who lands an unrelated change cannot fix them, and a gate nobody can pass gets
disabled. The recommendation is to add it to CI **after** §5.2 is applied, at
which point it becomes a genuine regression guard. Wiring it in before that
should be a deliberate choice, not a side effect of this audit.

---

_This audit reports repository state only. It makes no claim about GT School's
admissions process, the screener's validity, or program impact. R11's own text
and R10's claim boundaries continue to apply: a reliable screener does not by
itself establish program impact._
