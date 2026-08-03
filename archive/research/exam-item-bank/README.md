# Exam Item-Bank Research — categorized question catalog

A categorized catalog of cognitive/gifted **assessment questions and item types**,
gathered to inform the design of an in-house K–8 exam. It is research/discovery
input for possible item development — it does **not** ratify building the exam.

## Requirements served (research framing)

- **H1** — broader measures than a single reasoning cutoff (constructs CogAT under-weights).
- **H4** — expand who can demonstrate ability (less-coachable, lower-bias item types).
- **H10** — minimize gaming/burden (engagement affordances; coachability flags).
- **R5** — an item-level evidence base toward a defensible capability standard.

## IP posture (applies to every row)

- **Public-domain / openly-licensed / officially-released** items (ICAR, Open-Psychometrics,
  released NAEP/TIMSS/PISA/state items, ETS Kit of Factor-Referenced Cognitive Tests,
  public research paradigms): may be **reproduced or linked**.
- **Proprietary / secure** items (CogAT, NNAT, OLSAT, WISC, WJ, Miller Analogies, commercial
  cognitive games): **describe the item *type/format* only — never reproduce secure content.**
- Every row carries an `ip_status` and a `reuse_note`. When in doubt, describe, don't copy.

## Output schema (one JSON object per line; `.jsonl`)

| key | type / enum | meaning |
|---|---|---|
| `item_id` | `<PREFIX>-<n>` (GF, VR, QR, SP, WM, PS, CX, GB) | unique id |
| `construct` | `fluid_reasoning \| verbal \| quantitative \| spatial \| working_memory \| processing_speed \| complementary \| game_based` | primary construct |
| `subconstruct` | string | e.g. figural_matrix, verbal_analogy, mental_rotation, n_back |
| `item_format` | string | the task template |
| `age_band` | `K-1 \| 2-3 \| 4-5 \| 6-8 \| K-8` | target band |
| `entry_kind` | `example_item \| item_type` | actual/linked item vs described type |
| `stimulus_modality` | `verbal \| pictorial \| figural \| numeric \| audio \| interactive \| mixed` | input modality |
| `cognitive_process` | string | what it taxes (induction, updating, inhibition, visualization, speed…) |
| `response_format` | `mcq \| drag_drop \| constructed \| timed_tap \| spoken \| sequence_recall \| other` | how the child answers |
| `engagement_affordance` | string | how to gamify / fold into engagement; name a game mechanic if possible |
| `adaptivity_fit` | `high/med/low` + why | item-pool scalability, template/AIG cloneability, difficulty parameterization |
| `tail_discrimination` | `high/med/low` + why | ability to discriminate at the high end; ceiling risk |
| `coachability_bias_risk` | string | practice/coaching susceptibility; language/cultural load; DIF risk |
| `advantage_vs_cogat` | string | the edge vs CogAT (construct it misses, better tail, less coachable, process data…) |
| `source_name` | string | instrument / bank / paper |
| `source_url` | string | URL or full citation |
| `ip_status` | `public_domain \| open_license \| gov_released \| publisher_sample_describe_only \| proprietary_describe_only \| research_described` | reuse class |
| `reuse_note` | `reuse_verbatim \| adapt_ok \| describe_only` + brief why | practical reuse guidance |

## File layout

- `shards/items_<construct>.jsonl` — one shard per agent (this is the raw data).
- `notes/notes_<construct>.md` — per-agent narrative: top sources, best engagement opportunities, biggest advantages vs CogAT, IP caveats, gaps.
- `catalog/master.jsonl`, `catalog/master.csv`, `catalog/CATALOG.md` — merged outputs (produced after all shards land).

## Acceptance evidence

- 8 shards present and valid (every line parses as JSON with all schema keys).
- Every row has a non-empty `engagement_affordance`, `advantage_vs_cogat`, `ip_status`, `reuse_note`.
- No secure/proprietary item content reproduced (proprietary rows are `entry_kind=item_type`, `reuse_note=describe_only`).
- Merged master + `CATALOG.md` summary generated.
