# `@gt/ui-contract`

What each question type needs from a UI, and what a given app can therefore serve.

An item says what it asks, what the choices are, and how it is answered. It never says how any of that
looks. This package is the other half of that bargain: the checkable statement of what an app must be
capable of before a type may be served on it.

## Use it

Works from the repo root or from `screener/`. The root `package.json` only delegates here, so there is
nothing to install at the root.

```bash
npm run ui -- --help                          # start here

npm run ui                                    # all 53 types, and the minimum to serve them
npm run ui -- --cogat                         # just the CogAT-aligned set
npm run ui -- --list                          # every type code, tagged with its CogAT subtest
npm run ui -- --types FLU-MATRIX-01,VER-CLOZE-01
npm run ui -- --table                         # per-type breakdown
npm run ui -- --unlock                        # which element unlocks the most types next
npm run ui -- --profile voice-only            # what this app shape can serve, and why not the rest

npm run ui -- --context                       # what a NEW CONTEXT has to write, per type
npm run ui -- --theme gem-collector.example   # check a theme pack before shipping it
```

**The `--` matters.** `npm run ui --profile voice-only` without it lets npm keep the flag, and you get
the default report instead of the profile one, with no error to tell you why.

Profiles are `full-client`, `themed-visual`, `voice-only`, `print`, `glance`. Write your own by
copying one in `src/profiles.ts`.

## What it found

| Set | Types | UI elements needed |
| --- | --- | --- |
| Whole library | 53 | 15 |
| CogAT-aligned set | 10 | **6** |

Those six are `choiceList`, `multiSelect`, `gridLayout`, `nominalChannel(4)`, `orderedChannel(5)` and
`richText` at a 2-3 reading band, which is inside what a themed mobile app can already do.

| App shape | Serves |
| --- | --- |
| `full-client` | 53 |
| `themed-visual` | 16 |
| `voice-only` | 8 |
| `glance` | 4 |

## Theming: what a context has to write

**40 of 53 types need no new questions written.** For the CogAT-aligned set it is 8 of 10.

| Cost | What a context does | Per what | Changes the instrument? |
| --- | --- | --- | --- |
| `legend-only` | Map the variables to things in your world | Once per theme | No |
| `revoice` | The legend, plus rewriting the instruction | Once per type | No |
| `reauthor` | The legend, plus new material | **Per item** | **Yes** |

Re-voicing turns "Which shape completes the pattern?" into "Which chest finishes the row?". One
sentence, once per type, and it cannot change what is measured. Re-authoring writes new material per
item, because a Sentence Completion item *is* its sentence, so a themed bank is a different instrument
rather than a re-skin.

A theme pack is a JSON file with no code in it. Copy `themes/gem-collector.example.json`, fill in
`legend` (what each variable becomes in your world), optionally `voice` (instruction rewrites), and
`material` only for the `reauthor` types. Then check it:

```bash
npm run ui -- --theme my-theme.json --cogat
```

The check that earns its keep is the ordering one. A theme mapping every variable onto unordered
colours is rejected for each type whose rule is a progression, because that mistake produces items that
look completely fine and cannot be solved.

## In code

```ts
import { planFor, servableBy, VOICE_ONLY } from '@gt/ui-contract';

// Forward: what do these types cost me?
const plan = planFor(['FLU-MATRIX-01', 'QUANT-SERIES-01']);
plan.union.elements;      // what one app needs for both
plan.union.counts;         // minimum channel counts
plan.soleReasons;          // elements only one of them needs

// Reverse: what can my app serve?
const { servable, blocked } = servableBy(VOICE_ONLY);
blocked[0]?.shortfalls;    // and why each refusal happened
```

## How requirements are worked out

Derived from each type's own bank, not from a hand-maintained table, because a table of 53 rows is
wrong the first time a bank is regenerated and nobody notices. An option list means the app needs a
choice list; a `paceMs` means it needs timed reveal; a grid means addressable cells; a `readingLoad`
band sets the reading requirement.

**Two things a legacy bank cannot reveal**, declared in `requirements.ts` instead:

- `CHANNEL_OVERRIDES` — how many distinguishable variants a type needs, and whether they must read as
  ordered. Legacy content hard-codes its own appearance (`{shape: 'star', color: 'teal'}`), so the
  channels it truly requires are not recoverable from it. The ordering entry is the one that rules apps
  out: a type whose rule is "one more each time" is broken by an app that maps the variable onto
  unordered colours, and the item will still look fine while being unanswerable.
- `RESPONSE_OVERRIDES` — the interaction shape, since "tap every square that will have a hole" and
  "pick one of four" are indistinguishable in the JSON. Without these the derivation reports that
  nothing in the library needs multi-select or reordering, which is wrong for eleven types.

Both are migration scaffolding. Once items carry the `variables` and `method` fields from
`docs/design/ui-agnostic-assessment-system.md`, this package reads them and the overrides go away.

## Tests

```bash
npx vitest run packages/ui-contract
```

22 tests. The ones worth knowing about: the computed union really does satisfy every type it claims to,
merging takes the maximum channel count rather than the sum, a thinner app serves strictly fewer types,
every refusal carries a reason, and Verbal Analogies is reported as uncovered because it is.
