# Exam Question-Type Catalog (overnight fleet build)

A catalog of **interactive, adaptive question types** for a K–8 gifted exam. Using the
committed qbank (`TOPICS_BY_AREA.md`, derived from 318 catalogued items) as the reference,
the fleet designs question *types* whose combined content coverage spans every
topic/technique in every area — while keeping kids engaged and collecting rich per-child
telemetry that sharpens tail-decision precision at the gifted cutoffs.

This is research/discovery input for exam design. It does not ratify building the exam.
Serves H1 (broader measures), H4 (broaden who can demonstrate ability), H10 (minimize
gaming/burden), R5 (defensible capability standard).

## Areas (sections)

Seven reasoning areas; **game-based mechanics are a cross-cutting delivery layer applied to
all**, not a separate section:
`fluid_reasoning`, `verbal`, `quantitative`, `spatial`, `working_memory`,
`processing_speed`, `complementary`.

## Hard coverage requirement

For **each area**, the set of question types must give **>=3 types applicable to each age
band**: `K-1`, `2-3`, `4-5`, `6-8`. (A single type may count for multiple bands.)

## Design constraints (every type)

- **Immediately intuitive / zero-ambiguity.** A child must understand what is asked and how
  to answer without written instructions.
- **Self-teaching novelty allowed.** A novel mechanic is fine only if it self-teaches in
  ~10s via a **wordless animated demo / "ghost-hand"** plus **one unscored warm-up trial**
  before scoring begins. This mitigates the game-familiarity / novelty construct-irrelevant
  variance flagged in the qbank.
- **Lower the knowledge barrier to higher-order reasoning** (e.g., demonstrate 6th-grade
  quantitative reasoning without needing algebra notation).
- **Vary presentation** so each topic has several distinct type "shells," and each type
  yields a different suite of measurements for a holistic view.

## Question-type spec schema (one JSON object per type, in `specs/types_<area>.jsonl`)

| field | meaning |
|---|---|
| `type_id` | `<AREA>-<SHORT>-NN`, e.g. `QUANT-IGRAPH-01` (AREA prefix: FLU, VER, QUANT, SPA, WM, PS, CX) |
| `name` | short human name |
| `areas` | list of area keys this type serves (usually one) |
| `topics_techniques_covered` | subconstructs/techniques from `TOPICS_BY_AREA.md` it can carry |
| `one_liner` | what the child does, in one sentence |
| `interaction` | exactly how they answer + submission method (unambiguous) |
| `self_teach` | how the wordless demo/ghost-hand + warm-up makes it obvious in <10s |
| `learning_science` | list of `{principle, why, concrete_decision, source}` (2a) |
| `measurements` | list of measurement IDs from `measurements.json` this type yields (2b) |
| `new_measurements_proposed` | list of `{id,name,usefulness_tail,how_to_collect,how_much_to_collect}` (optional; merged into the registry) |
| `tail_precision_rationale` | how those measurements sharpen tail-decision granularity at the gifted cut (2b) |
| `age_bands` | applicable subset of `K-1,2-3,4-5,6-8` (2c) |
| `age_rationale` | motor/precision/reading constraints that set the band range (2c) |
| `adaptive` | `{works_well:high/med/low, content_range, difficulty_levers, aig_cloneable:high/med/low, notes}` (2d) |
| `demo_path` | `demos/<type_id>.html` (2e) |
| `engagement_hook` | the game mechanic / why it is fun |
| `construct_irrelevant_risks` | what to guard (motor, familiarity, reading, device) |

## Demo requirement (2e)

Each type ships a **self-contained single-file** `demos/<type_id>.html` (HTML+CSS+vanilla JS,
no external deps, opens by double-click). It must: show the wordless demo/warm-up, let you
actually answer a sample item, and **display a live telemetry panel** logging that type's
measurements (accuracy, RT, first-action latency, revisions, path, etc.) to make 2b concrete.

## File layout

- `TOPICS_BY_AREA.md` — Step 1 topic/technique reference (do not edit).
- `measurements.json` — canonical measurement registry (source of truth). `MEASUREMENTS.md` is its rendered view.
- `specs/types_<area>.jsonl` — one shard per area/agent (each agent writes only its own).
- `demos/<type_id>.html` — one demo per type; `demos/index.html` is the generated gallery.
- `catalog/master_types.jsonl`, `catalog/INDEX.md` — merged outputs + coverage matrix (generated).
- `waves/` — per-wave logs. `RUN` — sentinel; the loop runs while it exists.
- `build_types.py` — validate + merge shards, merge new measurements, regenerate INDEX/gallery/MEASUREMENTS.

## Fleet protocol

Each agent writes ONLY its own `specs/types_<area>.jsonl` and its `demos/<type_id>.html`
files; it never edits shared files. The parent runs `build_types.py` to merge, dedupe,
merge new measurements, regenerate the index/gallery/coverage matrix, and commit.
