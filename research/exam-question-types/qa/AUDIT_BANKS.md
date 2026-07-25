# Cross-bank audit (`audit_banks.mjs`)

One authoritative, repeatable quality audit for every generated question bank in
`research/exam-question-types/banks/*.jsonl`.

Each question type also ships its own per-type checker
(`generators/<TYPE>.mjs --validate`, `generators/check-<TYPE>.mjs`). Those
checkers are useful during generation but they do not agree with each other —
most visibly on what "adequate difficulty coverage" means. This script is the
single definition of record across all types. Where it and a per-type checker
disagree, this script wins.

Banks are **born-synthetic research content** (`syntheticOnly: true`,
`validated: false`). Nothing here calibrates an item or licenses live use.

## Running it

```bash
export PATH="$HOME/.nvm/versions/node/v24.18.0/bin:$PATH"   # repo requires node 24.x
node research/exam-question-types/qa/audit_banks.mjs
```

| Flag | Effect |
| --- | --- |
| `--type TYPE` | Audit one type only. |
| `--no-determinism` | Skip check 7; no generator is executed at all. |
| `--verbose` / `-v` | Print every check, not only WARN/FAIL. |
| `--json` | Machine-readable output for CI. |
| `--banks DIR`, `--generators DIR`, `--catalog FILE` | Point at alternate inputs (used by the corruption tests). |

Exit codes: **0** all banks pass (warnings allowed), **1** at least one bank
FAILs, **2** auditor-level error. A full run over 30 banks takes about 4
seconds, including re-running all 30 generators.

**The auditor never writes to the working tree.** It only reads banks,
generators, and the catalog. Check 7 re-runs generators inside a throwaway
sandbox (see below), so it is safe to run while other agents have live edits
in `banks/` or `generators/`.

## Status vocabulary

- **PASS** — the check is satisfied.
- **WARN** — worth a human look; does not fail the run or the exit code.
- **FAIL** — a defect. Any FAIL on any bank makes the whole run exit 1.
- **`--`** — not applicable to this bank (for example, key sanity on a bank of
  constructed-response items).

A bank's verdict is the worst status across its eight checks.

## The checks

### 1. Difficulty coverage — the one people keep getting wrong

The governing rule from the product owner is:

> difficulty is a float 1-20, minimum 5 questions in any +/-1 pt range

That is a **sliding window two points wide**. For every point `x` in `1..20`,
the number of items with `abs(difficulty - x) <= 1` must be at least 5.

```
count(x) = |{ item : |item.difficulty - x| <= 1 }|   must be >= 5 for all x in [1, 20]
```

This is **not** "5 items per integer bucket". An integer bucket is one point
wide, so it is a strictly harder condition: a bank can satisfy the real rule
comfortably and still show integer bins of 2 or 3. Most currently-landed banks
do exactly that. Confusing the two is the specific mistake this check exists to
prevent.

The auditor samples `x` every 0.05 pt **and** at every exact breakpoint
(`d ± 1` for each item difficulty `d`, nudged either side), so it cannot step
over a narrow dip. The reported centre is rounded for display and printed with
a `~`.

Reported per bank:

- **`WINDOW` (binding)** — the worst window count and where it occurs. This
  alone decides PASS/FAIL.
- **interior worst** — the worst window for `x` in `[2, 19]`, where the window
  is full width.
- **`BIN*` (advisory, non-binding)** — the worst one-point integer-bin count,
  labelled as the stricter measure it is. **No bank is required to satisfy
  it.** It is printed only so that nobody mistakes it for the rule again.

**Endpoints.** At `x = 1` and `x = 20` the window is effectively half width,
because no item can exist below 1 or above 20. Those windows are naturally
sparser. When the worst window falls in that margin, the report says so and
also gives the interior worst; it is expected geometry, not a defect. The
binding threshold still applies there — this is about how the result is
explained, not a relaxed rule.

### 2. Schema conformance

Every item must have exactly the BankItem keys, with correct types:

`itemId` (valid uuid, unique within the bank), `typeCode` (matches the file and
`^[A-Z]+-[A-Z0-9]+-\d+$`), `domain` (one of `fluid_reasoning`, `verbal`,
`quantitative`, `spatial`), `difficulty` (finite float within `1..20`),
`ageBands` (non-empty, values from `K-1`/`2-3`/`4-5`/`6-8`, no duplicates),
`content` (non-empty object), `answer` (object with `correctKey`), `scoring`
(known mode), `provenance` (known generator kind), `syntheticOnly === true`,
`validated === false`.

Any missing required key, any unrecognised extra key, and any bad value is a
FAIL, reported with the key name and how many items are affected.

#### Known conflict: `demoPath`

`demoPath` is treated as **optional**, and its absence is a WARN rather than a
FAIL. This is a genuine unresolved conflict in the repo, not a lenient reading:

- `docs/architecture/EXAM_ITEM_SCHEMA_SPEC.md` §6.1 lists
  `demoPath: z.string().min(1)` as a required field.
- `packages/contracts/src/assessment-exam-adaptive.ts` `bankItemSchema` is
  `.strict()` and **omits `demoPath` entirely**, which means an item that
  carries it fails the canonical contract.

The two cannot both be satisfied. 16 landed banks carry `demoPath` and 14 do
not. Failing either group would be asserting a resolution the auditor has no
authority to make, so it reports the split (per bank, and in the cross-bank
consistency section) and leaves the decision to a governance entry. Once that
decision exists, move `demoPath` between `REQUIRED_ITEM_KEYS` and
`OPTIONAL_ITEM_KEYS` at the top of the script.

### 3. Answer-key leakage (security-critical)

Everything under `content` ships to the browser: `servedItemSchema` is
`bankItemSchema` minus `answer`/`scoring`/`provenance`, so `content` is
rendered client-side in full. Any answer material inside it is readable by
anyone who inspects the page.

The check walks the **entire `content` subtree**, not just its top level, and
flags:

- **FAIL** — a field named `answer`, `correctKey`, `correct`, `isCorrect`,
  `solution`, `lure`, `misconception`, `distractor*`, `rationale`,
  `explanation`, and similar.
- **FAIL** — the literal string `"correct"` or `"incorrect"` anywhere.
- **FAIL** — a lure-taxonomy value (from the contracts `lureClassSchema`) on a
  **per-array-element** path, since that labels each option individually and
  hands over the key.
- **FAIL** — the whole `answer` object embedded anywhere inside `content`
  (matched by fingerprint, so renaming the field does not hide it).
- **WARN** — a lure-taxonomy value on an **item-level scalar** field. The same
  word appearing once per item cannot single out an option, so this is reported
  as a possible name collision needing a human look rather than as a leak.
  `VER-CLOZE-01`'s `content.gapType: "local_fit"` is the real example.

Allowlisted field names: `key`/`keys` (an option's display label — the child
sees "A"/"B", so it must be in `content`) and `target*` (the goal state the
child is asked to reach). **Limitation:** a bank that hid the key in a field
literally called `key` would not be caught by the name rule. Nothing currently
does, and the value rules still cover the common cases.

### 4. Key sanity

Banks put options in three different shapes, so the check resolves them first:

| Shape | Where options live | What `correctKey` is | Types |
| --- | --- | --- | --- |
| keyed | `content.options` (or another array of `{key, …}`, e.g. `FLU-ODDPAIR-01`'s `rows`) | the option's `key` | 18 |
| indexed | `content.options` without `key` | a positional integer | the 7 `VER-*` types |
| constructed | none — `content.response` or `content.optionKind` | a computed solution value | 5 |

Constructed-response banks are reported `--` for this check, with the reason.

For pick-one items:

- **FAIL** — `answer.correctKey` matches **no** option in `content`.
- **FAIL** — `answer.correctKey` matches **more than one** option.
- **FAIL** — a non-correct option has **no lure label**. Labels are read from
  `answer.distractorRationales` (object keyed by option key, or array aligned
  to option order) or from the option's own `lure`/`fit` field, because
  different types use different conventions.
- **FAIL** — the bank's entire distractor vocabulary is a single label. Such a
  bank is not diagnostic: `M-ERRTYPE` / `M-LURETYPE` cannot distinguish
  anything.
- **WARN** — more than 50% of items have one lure label repeated across all
  their own distractors, with the bank-wide vocabulary reported for context.
  Below that threshold it is a note, not a warning.

### 5. Ceiling integrity (structural proxy — stated as such)

The question is whether the top band is genuinely harder or just padded.
Difficulty cannot be judged semantically here, so this uses **structural
proxies only** and the report says so every time.

It compares the top band (`difficulty >= 16`) against the low band
(`difficulty <= 8`) on every numeric structural field the items actually
record — option count, rule/step counts, element counts, grid sizes, sequence
lengths, exposure times — by walking `content` and collecting numeric leaves
and array lengths at each stable path. Constant fields carry no information and
are dropped.

For each field it computes Cohen's *d* and, for the strongest candidates, a
4000-shuffle permutation test with a fixed seed (so repeated audits of the same
bank give the same verdict, and no dependency is needed).

- **PASS** — at least one field separates the bands at `|d| >= 0.5, p < 0.05`.
  The strongest fields are printed with both means.
- **WARN** — nothing separates them. The strongest candidates are printed
  anyway.

A WARN is **not** proof of padding. The top band may be harder in a way the
proxy cannot see: a subtler rule, a rarer word, a longer inference chain. Read
it as a prompt to inspect that ceiling by hand.

### 6. Duplicate detection

Two fingerprints per item, both over key-sorted canonical JSON of `content`:

- **exact** — the content verbatim.
- **near** — the same content with prose fields (`prompt`, `question`,
  `ruleText`, `directions`, `note`) removed and keyed option arrays sorted, so
  items that differ only by option shuffling or wording collapse together.

Reported: how many genuinely distinct items the bank has, the duplicate groups
with their difficulties, and the extra near-duplicates beyond the exact ones.

- **FAIL** — exact duplicates exceed 5% of the bank. A bank that hits its item
  count via repeats is not a real bank, and the adaptive engine will not serve
  the same item twice, so redundant items are effectively missing items.
- **WARN** — any exact or near duplicates below that threshold.

### 7. Determinism

Where `generators/<TYPE>.mjs` exists, the bank should be reproducible from it.

**Banks are never regenerated in place.** Other agents have live working trees
and an in-place rewrite would collide with them. Instead, the auditor copies
the single generator file into a throwaway sandbox laid out as
`<sandbox>/generators/<TYPE>.mjs` with an empty `<sandbox>/banks/`. Every
generator resolves its output as `<generatorDir>/../banks/<TYPE>.jsonl`, so the
write lands in the sandbox without the generator needing to support an output
flag — which matters, because only 9 of the 30 accept `--out`. The sandbox is
deleted afterwards.

The sandbox root is resolved through `realpathSync`. Several generators gate
`main()` on `resolve(process.argv[1]) === fileURLToPath(import.meta.url)`,
which silently fails through the macOS `/var` → `/private/var` symlink and
makes the generator produce nothing at all.

Verdicts: **PASS** byte-identical; **WARN** identical except `itemId` (uuids
not seeded, so reproducible in substance but not byte-stable); **WARN** differs
from the committed bank (generator changed after the bank was written, or
generation is not deterministic); **WARN** not verifiable, with the reason
(generator errored, timed out at 180s, or wrote nothing to the sandbox);
**`--`** no generator for this type.

Mismatch is a WARN rather than a FAIL because generators are being actively
edited; a bank can legitimately lag its generator mid-session.

### 8. Roster reconciliation

Cross-checks every bank against `catalog/master_types.jsonl` (66 types) and
lists which types have banks and which are still missing, grouped by area.

Per bank:

- **FAIL** — the type has no catalog entry at all.
- **FAIL** — the bank's `domain` is not among the catalog's `areas`.
- **FAIL** — the bank tags an `ageBand` the type's spec does **not** declare.
- **WARN** — the spec declares a band the bank has no items for. Incomplete
  coverage, not a contradiction.

**Each type follows its own declared bands, never a generic ladder.** Several
types legitimately have no K-1 band: the quantitative types floor at grades
2-3, and four verbal-comprehension types had their floor raised to grade 2
under **D-017** (instructions are on-screen text only, never audio, so K-1
access that depended on narration was removed). A type is never flagged for
lacking K-1 items when its spec has no K-1 band — that is exactly the direction
of the check, and it is why the undeclared-band case is a FAIL while the
unused-band case is only a WARN.

Catalog defects are reported separately, under "Catalog anomalies", so they are
not charged against any bank. `FLU-CARPET-01` and `FLU-STACK-01` currently
declare an age band `K-8` that is not in the contract enum; it is ignored when
reconciling those types.

## Cross-bank consistency section

After the per-bank details the report prints how the per-type checkers have
diverged. None of these are item defects on their own — they are the reason a
single cross-bank definition was needed, and they are what anything consuming
all 66 banks will have to code around:

- which banks carry `demoPath` and which do not;
- whether `answer.correctKey` names an option key, a positional index, or a
  computed solution value;
- whether `answer.distractorRationales` is an object keyed by option key or an
  array aligned to option order;
- lure labels used outside the contracts `lureClassSchema` enum, which
  server-side `M-ERRTYPE` / `M-LURETYPE` cannot bucket.

## Adding a check

Write a `checkX(items)` that returns `check(status, summary, details)`, add it
to the `checks` object in `main()`, add a column in `printTable`, and add a
title in `CHECK_TITLES`. The bank verdict is derived automatically as the worst
status.

Then prove it fires. Every check in this file was verified against a
deliberately corrupted copy of a clean bank held outside the repository — a
check that never fails on bad input is worse than no check, because it reads as
evidence of quality.
