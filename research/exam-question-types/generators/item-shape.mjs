// Canonical BankItem shape, shared by every generator in this directory.
//
// Each generator owns its own content, difficulty, and answer semantics. What
// it must NOT own is the envelope: `demoPath`, and the shape of
// `answer.distractorRationales`. Sixty-three generators written in parallel
// produced sixty-three dialects of those two fields, none of which parsed
// against `packages/contracts/src/assessment-exam-adaptive.ts` (E-074).
//
// Call `normalizeBankItem(item)` on the way out — see the write step at the
// bottom of each generator — and the item conforms to `bankItemSchema` by
// construction. `packages/contracts/src/bank-conformance.test.ts` proves it for
// every bank on every test run.
//
// TWO-FIELD LURE MODEL (D-020)
// ----------------------------
// `lureClass` is one of nine coarse buckets and is required: server-side
// M-ERRTYPE / M-LURETYPE / M-RULEID are counts over those buckets, so the
// vocabulary has to be closed and small.
//
// `lureDetail` is the type's own label (`mis_binding_swap`, `cut_too_low`, …)
// and is optional: it carries the diagnosis a coarse bucket throws away. It is
// emitted only when it says something `lureClass` does not.
//
// KEYED, NOT POSITIONAL
// ---------------------
// The map is keyed by each selectable element's own identifier. Many types
// have no positional options at all — `VER-EVIDENCE-01` keys passage
// sentences, `WM-bubble-01` keys per-lane n-back steps, `SPA-PUNCH-01` keys
// fold signatures — and the server has to answer "which lure did this child
// choose" by key once options are shuffled per session.

/**
 * Every fine-grained lure label in use across the 63 banks, mapped to the
 * coarse class it buckets into. Adding a label without adding it here is a
 * hard error, which is the point: an unbucketable label silently breaks
 * M-ERRTYPE.
 *
 * Reading of each coarse class, applied consistently below:
 *   correct           - the full-credit response
 *   near_order        - off by one in count, position, order, or magnitude
 *   reversed_relation - the relation, direction, or frame applied backwards
 *   rule_violation    - breaks a named rule or legality constraint of the task
 *   surface_match     - answers a visible surface feature instead of the relation
 *   associate         - verbal thematic/semantic associate
 *   local_fit         - locally right, globally incomplete or suboptimal
 *   global_mismatch   - bears no systematic relation to the target
 *   distractor_other  - no honest coarse home (see NO_HONEST_COARSE_CLASS)
 */
export const COARSE_LURE_CLASS = Object.freeze({
  // --- correct -------------------------------------------------------------
  correct: 'correct',
  'evidence-correct': 'correct',
  complete_optimal: 'correct',
  connected_optimal: 'correct',
  exact_fill_optimal: 'correct',
  exact_set: 'correct',
  exact_tiling: 'correct',
  optimal: 'correct',
  solved_optimal: 'correct',
  valid_word: 'correct',
  valid_rare: 'correct',
  // CX-check-01 asks the child to FIND the mis-sorted tiles, so a planted
  // error is the thing to select, not a foil.
  planted_error: 'correct',

  // --- near_order ----------------------------------------------------------
  near_order: 'near_order',
  adjacent_near_miss: 'near_order',
  adjacent_swap: 'near_order',
  adjacent_viewpoint: 'near_order',
  arithmetic_slip: 'near_order',
  boundary_shift: 'near_order',
  cut_too_high: 'near_order',
  cut_too_low: 'near_order',
  cyclic_shift: 'near_order',
  gating_failure: 'near_order',
  'lure-n-minus-1': 'near_order',
  'lure-n-plus-1': 'near_order',
  mis_binding_shift: 'near_order',
  mis_binding_swap: 'near_order',
  miscount_by_one: 'near_order',
  near_height: 'near_order',
  near_miss: 'near_order',
  near_miss_adjacent_transposition: 'near_order',
  near_miss_off_by_one_high: 'near_order',
  near_miss_off_by_one_low: 'near_order',
  off_by_one: 'near_order',
  off_by_one_step: 'near_order',
  omission: 'near_order',
  one_factor_off: 'near_order',
  order_error: 'near_order',
  over_application: 'near_order',
  over_tilted: 'near_order',
  pointing_error: 'near_order',
  previous_term: 'near_order',
  rotational_offset: 'near_order',
  sides_shift: 'near_order',
  single_fold_swapped: 'near_order',
  spatial_imprecision: 'near_order',
  temporal_shift: 'near_order',
  under_application: 'near_order',
  under_tilted: 'near_order',
  'ungrammatical-near-order': 'near_order',
  update_failure: 'near_order',
  wrong_cycle: 'near_order',

  // --- reversed_relation ---------------------------------------------------
  reversed_relation: 'reversed_relation',
  axis_confusion: 'reversed_relation',
  colour_swap_reversed: 'reversed_relation',
  direction_error: 'reversed_relation',
  direction_reversal: 'reversed_relation',
  egocentric_left_right_reversal: 'reversed_relation',
  endpoint_swap: 'reversed_relation',
  inverse_operation: 'reversed_relation',
  inverted_rule: 'reversed_relation',
  mirror_inverted: 'reversed_relation',
  mirror_reflected: 'reversed_relation',
  mirror_reversal: 'reversed_relation',
  mirrored_twist: 'reversed_relation',
  mirrored_whole_pattern: 'reversed_relation',
  opposite: 'reversed_relation',
  opposite_confusion: 'reversed_relation',
  opposite_viewpoint: 'reversed_relation',
  reversed: 'reversed_relation',
  reversed_comparison: 'reversed_relation',
  right_axes_wrong_direction: 'reversed_relation',
  track_swap: 'reversed_relation',
  'ungrammatical-reversal': 'reversed_relation',
  wrong_direction: 'reversed_relation',
  wrong_final_fold_direction: 'reversed_relation',

  // --- rule_violation ------------------------------------------------------
  rule_violation: 'rule_violation',
  array_frame: 'rule_violation',
  conjunction_partial: 'rule_violation',
  crashed: 'rule_violation',
  egocentric: 'rule_violation',
  egocentric_own_view: 'rule_violation',
  group_structure: 'rule_violation',
  intersection_error: 'rule_violation',
  invalid: 'rule_violation',
  invalid_placement: 'rule_violation',
  misfit_attempt: 'rule_violation',
  multi_clue_miss: 'rule_violation',
  multi_letter_change: 'rule_violation',
  negation_trap: 'rule_violation',
  nonword: 'rule_violation',
  nonword_rung: 'rule_violation',
  not_from_rack: 'rule_violation',
  off_pattern: 'rule_violation',
  operation_confusion: 'rule_violation',
  operational_answer_after_equals: 'rule_violation',
  operational_total_all: 'rule_violation',
  over_budget: 'rule_violation',
  over_specific: 'rule_violation',
  overflow_or_overlap: 'rule_violation',
  own_viewpoint_order: 'rule_violation',
  proportional_lure: 'rule_violation',
  relational_miss: 'rule_violation',
  single_clue_miss: 'rule_violation',
  too_short: 'rule_violation',
  unconditional_apply: 'rule_violation',
  wrong_attribute: 'rule_violation',
  wrong_axis: 'rule_violation',
  wrong_count: 'rule_violation',
  wrong_operation: 'rule_violation',
  wrong_operator: 'rule_violation',
  wrong_twist: 'rule_violation',

  // --- surface_match -------------------------------------------------------
  surface_match: 'surface_match',
  'surface-text-match': 'surface_match',
  surface_lure: 'surface_match',
  amount_as_rate: 'surface_match',
  anchor: 'surface_match',
  area_cue: 'surface_match',
  axis_aligned_default: 'surface_match',
  column_repeat: 'surface_match',
  constant_rate: 'surface_match',
  depth_for_lateral_confusion: 'surface_match',
  distribution_slip: 'surface_match',
  dot_size_cue: 'surface_match',
  face_shape_confusion: 'surface_match',
  false_alarm_color_lure: 'surface_match',
  false_alarm_shape_lure: 'surface_match',
  feature_swap: 'surface_match',
  grid_value_other: 'surface_match',
  herring_used: 'surface_match',
  identity_copy: 'surface_match',
  literal_copy: 'surface_match',
  near_family: 'surface_match',
  no_reflection_literal_punch: 'surface_match',
  no_track: 'surface_match',
  radius_scale: 'surface_match',
  rare_word_true: 'surface_match',
  row_repeat: 'surface_match',
  side_confusion: 'surface_match',
  slope_as_level: 'surface_match',
  surprising_but_true: 'surface_match',
  taper_family_swap: 'surface_match',
  used_distractor: 'surface_match',
  used_the_irrelevant_number: 'surface_match',

  // --- associate -----------------------------------------------------------
  associate: 'associate',

  // --- local_fit -----------------------------------------------------------
  local_fit: 'local_fit',
  complete_detour: 'local_fit',
  connected_detour: 'local_fit',
  connected_extra_tiles: 'local_fit',
  connected_missed_coin: 'local_fit',
  connected_missed_gem: 'local_fit',
  constant_profile: 'local_fit',
  detour: 'local_fit',
  disconnected: 'local_fit',
  dropped_source: 'local_fit',
  exact_fill_costly: 'local_fit',
  first_fold_only: 'local_fit',
  first_step_only: 'local_fit',
  footprint_only_undercount: 'local_fit',
  'grammatical-but-absurd': 'local_fit',
  greedy_order: 'local_fit',
  ignored_interaction: 'local_fit',
  incomplete: 'local_fit',
  incomplete_exploration: 'local_fit',
  left_only: 'local_fit',
  lost_a_punch: 'local_fit',
  lost_last_fold: 'local_fit',
  miss: 'local_fit',
  missed_gem: 'local_fit',
  missed_key: 'local_fit',
  one_layer_wrong: 'local_fit',
  over_general: 'local_fit',
  over_rotation: 'local_fit',
  partial_fill: 'local_fit',
  partial_hit: 'local_fit',
  partial_occlusion_credit: 'local_fit',
  partial_structure: 'local_fit',
  'plausible-but-unsupported': 'local_fit',
  'plausible-but-unsupported-evidence': 'local_fit',
  rate_as_total: 'local_fit',
  right_only: 'local_fit',
  second_step_only: 'local_fit',
  shortcut_detour: 'local_fit',
  solved_detour: 'local_fit',
  solved_verbose: 'local_fit',
  start_position_error: 'local_fit',
  suboptimal_gem_order: 'local_fit',
  'true-but-irrelevant': 'local_fit',
  two_layer_undercount: 'local_fit',
  visible_only_undercount: 'local_fit',

  // --- global_mismatch -----------------------------------------------------
  global_mismatch: 'global_mismatch',
  'contradicts-text': 'global_mismatch',
  false_alarm: 'global_mismatch',
  false_alarm_unrelated: 'global_mismatch',
  far_setup: 'global_mismatch',
  foreign_solid: 'global_mismatch',
  inconsistent_with_evidence: 'global_mismatch',
  intrusion: 'global_mismatch',
  item_error: 'global_mismatch',
  'lead-in-no-target': 'global_mismatch',
  lost_location: 'global_mismatch',
  neither: 'global_mismatch',
  nonadjacent_confusion: 'global_mismatch',
  'novel-foil': 'global_mismatch',
  other_viewpoint: 'global_mismatch',
  random: 'global_mismatch',
  random_scramble: 'global_mismatch',
  wrong_family: 'global_mismatch',
  wrong_fold_path: 'global_mismatch',

  // --- distractor_other ----------------------------------------------------
  distractor_other: 'distractor_other',
  abandoned: 'distractor_other',
  correct_placement: 'distractor_other',
  duplicate: 'distractor_other',
  empty_response: 'distractor_other',
  guess: 'distractor_other',
  no_response: 'distractor_other',
  representation: 'distractor_other',
  shared_pair: 'distractor_other',
  sound_given: 'distractor_other',
  sound_step: 'distractor_other',
});

/**
 * Labels that land in `distractor_other` because the nine-class enum has no
 * honest home for them, not because they are miscellaneous. Kept explicit so
 * the gap is visible rather than hidden inside a catch-all.
 *
 *   non-response         the child submitted nothing; not an error type at all
 *   conforming-foil      in find-the-odd-one-out / find-the-flaw tasks, the
 *                        foils are the items that OBEY the rule. "Correct but
 *                        not the target" is unsayable in an enum whose
 *                        `correct` means "is the target".
 *   representation-bias  a developmental magnitude mapping, not a distractor
 *                        structure
 */
export const NO_HONEST_COARSE_CLASS = Object.freeze({
  abandoned: 'non-response',
  empty_response: 'non-response',
  no_response: 'non-response',
  guess: 'non-response',
  correct_placement: 'conforming-foil',
  shared_pair: 'conforming-foil',
  sound_given: 'conforming-foil',
  sound_step: 'conforming-foil',
  representation: 'representation-bias',
});

/**
 * The most specific label on a rationale entry: the type's own `lureDetail`
 * when it has one, otherwise the coarse class. This is what the per-type
 * checkers assert against, since a coarse class alone cannot distinguish
 * `cut_too_high` from `cut_too_low`.
 */
export function lureLabel(entry) {
  if (!entry || typeof entry !== 'object') return undefined;
  return entry.lureDetail ?? entry.lureClass;
}

/** Coarse class for a fine-grained label. Throws on an unregistered label. */
export function coarseLureClass(label) {
  const coarse = COARSE_LURE_CLASS[label];
  if (!coarse) {
    throw new Error(
      `unregistered lure label "${label}" — add it to COARSE_LURE_CLASS in generators/item-shape.mjs ` +
        `so M-ERRTYPE can bucket it`,
    );
  }
  return coarse;
}

/**
 * One rationale entry: `{lureClass, lureDetail?, ...diagnostics}`.
 * The label is read from `lure` or `kind` (or the whole value, when the entry
 * is a bare label string) and replaced in place, so per-type diagnostic fields
 * keep their original order.
 */
function normalizeRationale(entry) {
  if (typeof entry === 'string') return withDetail(entry, {});
  if (!entry || typeof entry !== 'object') {
    throw new Error(`rationale entry must be a label string or an object, got ${typeof entry}`);
  }
  if ('lureClass' in entry) return entry; // already canonical

  const out = {};
  let labelled = false;
  for (const [k, v] of Object.entries(entry)) {
    if (k === 'lure' || k === 'kind') {
      Object.assign(out, withDetail(v, {}));
      labelled = true;
      continue;
    }
    out[k] = v;
  }
  if (!labelled) {
    throw new Error(`rationale entry carries no lure label: ${JSON.stringify(entry).slice(0, 120)}`);
  }
  return out;
}

function withDetail(label, base) {
  const lureClass = coarseLureClass(label);
  return lureClass === label ? { ...base, lureClass } : { ...base, lureClass, lureDetail: label };
}

/**
 * Key for an array-shaped rationale entry, in the order the conventions were
 * found in the banks: the entry's own id, then its taxonomy label, then the
 * option it lines up with, then its position.
 */
function rationaleKey(entry, index, item) {
  if (entry && typeof entry === 'object') {
    if (typeof entry.key === 'string' && entry.key) return entry.key;
    if (typeof entry.kind === 'string' && entry.kind) return entry.kind;
  }
  const options = item?.content?.options;
  const option = Array.isArray(options) ? options[index] : undefined;
  if (option && typeof option.key === 'string' && option.key) return option.key;
  return String(index);
}

/** Array or keyed object of rationales -> keyed object of canonical entries. */
export function normalizeDistractorRationales(rationales, item) {
  if (rationales == null) return rationales;

  if (Array.isArray(rationales)) {
    const out = {};
    rationales.forEach((entry, i) => {
      const key = rationaleKey(entry, i, item);
      if (key in out) {
        throw new Error(`duplicate rationale key "${key}" while keying an array of rationales`);
      }
      out[key] = normalizeRationale(entry);
    });
    return out;
  }

  const out = {};
  for (const [k, v] of Object.entries(rationales)) out[k] = normalizeRationale(v);
  return out;
}

/**
 * Put one item into canonical BankItem shape. Idempotent, order-preserving,
 * and purely structural: difficulty, content, correct answer, and item count
 * are never touched.
 */
export function normalizeBankItem(item) {
  if (!item || typeof item !== 'object') return item;
  const demoPath = `demos/${item.typeCode}.html`;
  const out = {};
  for (const [k, v] of Object.entries(item)) {
    // SPEC §6.1 places demoPath between the targeting fields and the payload.
    if (k === 'content' && !('demoPath' in item)) out.demoPath = demoPath;
    if (k === 'answer' && v && typeof v === 'object') {
      const answer = {};
      for (const [ak, av] of Object.entries(v)) {
        answer[ak] = ak === 'distractorRationales' ? normalizeDistractorRationales(av, item) : av;
      }
      out.answer = answer;
      continue;
    }
    out[k] = v;
  }
  if (!('demoPath' in out)) out.demoPath = demoPath;
  return out;
}

/** Convenience for the write step: `serializeBank(items)` -> JSONL text. */
export function serializeBank(items) {
  return items.map((it) => JSON.stringify(normalizeBankItem(it))).join('\n') + '\n';
}
