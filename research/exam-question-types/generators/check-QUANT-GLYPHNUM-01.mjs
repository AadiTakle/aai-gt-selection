// Independent validator for the QUANT-GLYPHNUM-01 dual-mode banks (STAGE2_QUESTION_DESIGN §9.2, U4).
//
// The notation's arithmetic, the partial-rule taxonomy, the difficulty model, the band ladder and
// the anti-leak brute force are RE-IMPLEMENTED here from the documented design rather than
// imported, so a bug in the generator cannot validate itself. The generator is imported only to
// prove each item is byte-reproducible from its own provenance.
//
// U4's acceptance is "independent re-derivation of the key agrees on 100% of BOTH banks", so this
// checks the pair, not one file, and additionally checks the property that makes the pair a control
// condition rather than two banks: they are equated on every scored quantity and differ only in
// whether the hidden glyph->role mapping persists.
//
// Checks (exit nonzero on any failure):
//   1.  JSONL parses; every line is a well-formed BankItem (BUILD_PLAN §2 shape).
//   2.  Key containment: `content` names no role, states no mapping, carries no verdict, and does
//       NOT publish the line's numeric maximum — which would pin part of the mapping for free.
//   3.  KEY RE-DERIVED: reading the expression under the stated mapping and dividing by the anchor
//       reproduces `answer.targetRatio` and the option `correctKey` names, on every item of both
//       banks.
//   4.  Anti-leak, from `content` ALONE (E-075/E-076). All 120 glyph->role relabellings are brute
//       forced. HARD: at least two options survive on every item. GRADED: the best of three
//       content-only attacks — uniform over survivors, most-backed, least-backed — reported per
//       difficulty slice against the 20% five-option chance floor.
//   5.  Distractors: all five options distinct; every wrong option is the value of a named partial
//       rule, re-derived here, and its declared ruleId/kind agree (the §4.6 strategy trace).
//   6.  Grammar invariants: expression length equals the declared length, the binding count and
//       distinct-glyph count match the declared levers, and no digit is left unbound.
//   7.  Difficulty equals the value re-derived from the item's own levers, and the item regenerates
//       byte-identically from its provenance.
//   8.  Difficulty is MONOTONE in every declared lever (§1.1(d)) — asserted on the model, once.
//   9.  Coverage: 1..20 with >=5 items per 0.5-point rung and per +/-0.5pt band (§1.1(c)).
//   10. Band ladder: expression length and binding count never exceed the caps for the band the
//       difficulty sits in (§4.3), and the declared ageBands match the window.
//   11. Key positions uniform within tolerance, reported per option count (E-094) AND per
//       expression length, which is what closes "a longer expression sits further right".
//   12. Persistence: the consistent bank holds ONE system; the perTrial bank holds one per item.
//   13. Equating: the two banks match item-for-item on difficulty, key slot, option ratios, role
//       sequence, line maximum and age band.
//   14. M-PAE: the SHIPPED generic placement contract is re-implemented and run over every item x
//       every option. `pae <= tolerance` must select exactly the keyed tick, every emitted value
//       must sit inside the registry's declared [0, 0.5] range, and the metric must be graded —
//       near-miss partial rules must produce smaller placement error than far ones.
//   15. Learnability, reported not asserted: how many items of the consistent arm suffice to pin
//       the hidden mapping down to one candidate. This is the flip side of check 4 — the same
//       pooling that is forbidden within an item is exactly the induction the block measures.
//
// Run:  node research/exam-question-types/generators/check-QUANT-GLYPHNUM-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BANK_PATHS, genItem } from './QUANT-GLYPHNUM-01.mjs';
import { lureLabel, normalizeBankItem } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODES = ['consistent', 'perTrial'];
// The consistent arm is the live bank under banks/; the scrambled arm sits outside the served
// directory in control-banks/. Both are read here, because U4's acceptance is BOTH banks.
const bankPath = (mode) => resolve(__dirname, BANK_PATHS[mode]);

const failures = [];
const fail = (id, msg) => failures.push(`[${id}] ${msg}`);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const deepEq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const round2 = (x) => Math.round(x * 100) / 100;
const round6 = (x) => Math.round(x * 1e6) / 1e6;

/* ---- independent notation ------------------------------------------------- */
const B = 4;
const SCALE = { scaleI: 1, scaleII: B, scaleIII: B * B };
const DIGIT = { digitII: 2, digitIII: 3 };
const ROLE_NAMES = [...Object.keys(SCALE), ...Object.keys(DIGIT)];
const GLYPH_NAMES = ['arc', 'chevron', 'crescent', 'notch', 'spiral'];
const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E'];
const scaleQ = (r) => SCALE[r];
const digitQ = (r) => DIGIT[r];
const isS = (r) => r in SCALE;
const isD = (r) => r in DIGIT;
const q = (r) => SCALE[r] ?? DIGIT[r];

/**
 * Read a role sequence. Re-derived here rather than imported, because getting the binding rule
 * wrong is the single most likely way the generator could be wrong about its own answer key.
 */
function read(roles) {
  let total = 0;
  let i = 0;
  while (i < roles.length) {
    if (isD(roles[i]) && roles[i + 1] !== undefined && isS(roles[i + 1])) {
      total += digitQ(roles[i]) * scaleQ(roles[i + 1]);
      i += 2;
    } else {
      total += q(roles[i]);
      i += 1;
    }
  }
  return total;
}

function bindCount(roles) {
  let binds = 0;
  let i = 0;
  while (i < roles.length) {
    if (isD(roles[i]) && roles[i + 1] !== undefined && isS(roles[i + 1])) {
      binds += 1;
      i += 2;
    } else {
      i += 1;
    }
  }
  return binds;
}

const everyDigitBound = (roles) =>
  roles.every((r, i) => !isD(r) || (roles[i + 1] !== undefined && isS(roles[i + 1])));

/* ---- independent brute force, from CONTENT only --------------------------- */

/** Every glyph->role bijection. This is the attacker's whole hypothesis space. */
const RELABELLINGS = (() => {
  const out = [];
  const walk = (i, used, acc) => {
    if (i === GLYPH_NAMES.length) {
      out.push({ ...acc });
      return;
    }
    for (const role of ROLE_NAMES) {
      if (used.has(role)) continue;
      used.add(role);
      acc[GLYPH_NAMES[i]] = role;
      walk(i + 1, used, acc);
      used.delete(role);
    }
  };
  walk(0, new Set(), {});
  return out;
})();

/**
 * What a browser holding only `content` can work out.
 *
 * Deliberately built from the glyph strings and the tick ratios and nothing else — no mapping, no
 * `answer`, no line maximum. Reimplemented rather than imported for the usual reason, and taking
 * the served projection rather than the bank item so it cannot accidentally read a server field.
 */
function attackerView(content) {
  const support = new Map();
  for (const mapping of RELABELLINGS) {
    const anchor = read(content.line.maxExpression.map((g) => mapping[g]));
    if (anchor <= 0) continue;
    const ratio = round6(read(content.expression.map((g) => mapping[g])) / anchor);
    support.set(ratio, (support.get(ratio) ?? 0) + 1);
  }
  return content.options.map((o) => ({ key: o.key, backing: support.get(round6(o.ratio)) ?? 0 }));
}

/** Best of the three content-only attacks on one item, as an accuracy in [0, 1]. */
function attackerAccuracy(view, correctKey) {
  const survivors = view.filter((o) => o.backing > 0);
  if (survivors.length === 0) return { survivors: 0, uniform: 0, modal: 0, antiModal: 0 };
  const counts = survivors.map((o) => o.backing);
  const pick = (target) => {
    const tied = survivors.filter((o) => o.backing === target);
    return tied.some((o) => o.key === correctKey) ? 1 / tied.length : 0;
  };
  return {
    survivors: survivors.length,
    uniform: survivors.some((o) => o.key === correctKey) ? 1 / survivors.length : 0,
    modal: pick(Math.max(...counts)),
    antiModal: pick(Math.min(...counts)),
  };
}

/* ---- independent partial-rule taxonomy ------------------------------------ */
const KIND_LURE = {
  additive_only: 'operation_confusion',
  over_binding: 'over_application',
  phantom_bind: 'over_application',
  place_value_read: 'inverted_rule',
  token_omitted: 'omission',
  glyph_confusion: 'one_factor_off',
  repeats_ignored: 'wrong_count',
  first_unit_only: 'first_step_only',
  largest_glyph_only: 'incomplete',
  token_count: 'surface_match',
  anchor_echo: 'anchor',
};
/** Ordered from "almost had it" to "did not engage" — the axis the nearness lever walks. */
const KIND_NEARNESS = {
  additive_only: 1.0,
  over_binding: 0.85,
  phantom_bind: 0.8,
  place_value_read: 0.75,
  token_omitted: 0.6,
  glyph_confusion: 0.5,
  repeats_ignored: 0.4,
  first_unit_only: 0.25,
  largest_glyph_only: 0.2,
  token_count: 0.1,
  anchor_echo: 0.0,
};

/** Every partial rule a role sequence admits, as {ruleId, kind, value}. */
function admissibleRules(roles, lineMax) {
  const out = [];
  const label = (rs) => rs.join('+');

  if (bindCount(roles) > 0) {
    out.push({
      ruleId: `additive:${label(roles)}`,
      kind: 'additive_only',
      value: roles.reduce((s, r) => s + q(r), 0),
    });
  }
  for (let i = 0; i + 1 < roles.length; i++) {
    if (!isS(roles[i]) || !isS(roles[i + 1])) continue;
    const rest = roles.filter((_, j) => j !== i && j !== i + 1);
    out.push({
      ruleId: `overbind@${i}:${label(roles)}`,
      kind: 'over_binding',
      value: q(roles[i]) * q(roles[i + 1]) + read(rest),
    });
  }
  for (let i = 0; i < roles.length; i++) {
    if (!isS(roles[i])) continue;
    if (i > 0 && isD(roles[i - 1])) continue;
    for (const digit of Object.keys(DIGIT)) {
      const grown = roles.slice();
      grown.splice(i, 0, digit);
      out.push({
        ruleId: `phantom@${i}=${digit}:${label(grown)}`,
        kind: 'phantom_bind',
        value: read(grown),
      });
    }
  }
  if (roles.length >= 2) {
    let place = 0;
    for (let i = 0; i < roles.length; i++) place += q(roles[i]) * B ** (roles.length - 1 - i);
    out.push({ ruleId: `placevalue:${label(roles)}`, kind: 'place_value_read', value: place });
  }
  for (let i = 0; i < roles.length; i++) {
    const dropped = roles.filter((_, j) => j !== i);
    if (dropped.length === 0) continue;
    out.push({
      ruleId: `drop@${i}:${label(dropped)}`,
      kind: 'token_omitted',
      value: read(dropped),
    });
  }
  for (let i = 0; i < roles.length; i++) {
    for (const role of ROLE_NAMES) {
      if (role === roles[i]) continue;
      const swapped = roles.slice();
      swapped[i] = role;
      out.push({
        ruleId: `misread@${i}=${role}:${label(swapped)}`,
        kind: 'glyph_confusion',
        value: read(swapped),
      });
    }
  }
  if (new Set(roles).size < roles.length) {
    const unique = [...new Set(roles)];
    out.push({ ruleId: `unique:${label(unique)}`, kind: 'repeats_ignored', value: read(unique) });
  }
  if (roles.length >= 2) {
    const firstUnit = isD(roles[0]) ? roles.slice(0, 2) : roles.slice(0, 1);
    if (firstUnit.length < roles.length) {
      out.push({
        ruleId: `firstUnit:${label(firstUnit)}`,
        kind: 'first_unit_only',
        value: read(firstUnit),
      });
    }
    out.push({
      ruleId: `largest:${label(roles)}`,
      kind: 'largest_glyph_only',
      value: Math.max(...roles.map(q)),
    });
    out.push({ ruleId: `count:${roles.length}`, kind: 'token_count', value: roles.length });
  }
  out.push({ ruleId: `anchor:${lineMax}`, kind: 'anchor_echo', value: lineMax });
  return out;
}

/* ---- independent difficulty arithmetic (documented lever model) ----------- */
const LEN_LOAD = { 1: 0, 2: 2.2, 3: 4.0, 4: 5.4 };
const W_BIND = 1.1;
const W_ORDER = 1.6;
const W_DISTINCT = 0.8;
const NEARNESS_SPAN = 2.8;
const baseOf = (length, binds, distinct) =>
  1.0 + LEN_LOAD[length] + W_BIND * binds + W_ORDER * (binds > 0 ? 1 : 0) + W_DISTINCT * (distinct - 1);

const CONFIGS = (() => {
  const out = [];
  for (const length of [1, 2, 3, 4]) {
    for (let binds = 0; binds <= Math.floor(length / 2); binds++) {
      const maxDistinct = Math.min(binds, 2) + Math.min(length - binds, 3);
      for (let distinct = binds > 0 ? 2 : 1; distinct <= maxDistinct; distinct++) {
        out.push({ length, binds, distinct });
      }
    }
  }
  return out;
})();
const BASES = CONFIGS.map((c) => baseOf(c.length, c.binds, c.distinct));
const RAW_LO = Math.min(...BASES);
const RAW_HI = Math.max(...BASES) + NEARNESS_SPAN;
const difficultyOf = (length, binds, distinct, nearness) =>
  Math.max(
    1,
    Math.min(
      20,
      1 + ((baseOf(length, binds, distinct) + NEARNESS_SPAN * nearness - RAW_LO) * 19) / (RAW_HI - RAW_LO),
    ),
  );

/* ---- independent band ladder (§4.3 developmental floor) ------------------- */
const BAND_LADDER = [
  { band: 'K-1', hi: 4, maxLength: 2, maxBinds: 0 },
  { band: '2-3', hi: 8, maxLength: 3, maxBinds: 0 },
  { band: '4-5', hi: 12, maxLength: 4, maxBinds: 1 },
  { band: '6-8', hi: 20.01, maxLength: 4, maxBinds: 2 },
];
const bandOf = (d) => BAND_LADDER.find((b) => d < b.hi) ?? BAND_LADDER[BAND_LADDER.length - 1];

/* ========================================================================== *
 * 8. MODEL-LEVEL MONOTONICITY, asserted once before any item is read.
 *
 * §1.1(d): the fit reads `difficulty` as known, and because the targeting rule
 * serves different item subsets early and late, difficulty error that correlates
 * with subset composition correlates with trialIndex and biases lambda. A
 * monotone lever model is the weaker claim that is actually needed to keep the
 * fit unbiased, and it is the one thing about difficulty this bank can prove.
 * ========================================================================== */
function checkMonotonicity() {
  const reach = (f) => CONFIGS.filter(f);
  for (const nearness of [0, 0.5, 1]) {
    // Expression length, holding bindings and distinct glyphs fixed where both lengths admit them.
    for (const binds of [0, 1, 2]) {
      for (const distinct of [1, 2, 3, 4]) {
        const lengths = reach((c) => c.binds === binds && c.distinct === distinct)
          .map((c) => c.length)
          .sort((a, b) => a - b);
        for (let i = 1; i < lengths.length; i++) {
          const lo = difficultyOf(lengths[i - 1], binds, distinct, nearness);
          const hi = difficultyOf(lengths[i], binds, distinct, nearness);
          if (!(hi > lo)) {
            fail(
              'monotonicity',
              `length ${lengths[i]} not harder than ${lengths[i - 1]} at binds=${binds} distinct=${distinct}`,
            );
          }
        }
      }
    }
    // Binding count, holding length and distinct glyphs fixed.
    for (const length of [1, 2, 3, 4]) {
      for (const distinct of [1, 2, 3, 4]) {
        const bindOptions = reach((c) => c.length === length && c.distinct === distinct)
          .map((c) => c.binds)
          .sort((a, b) => a - b);
        for (let i = 1; i < bindOptions.length; i++) {
          const lo = difficultyOf(length, bindOptions[i - 1], distinct, nearness);
          const hi = difficultyOf(length, bindOptions[i], distinct, nearness);
          if (!(hi > lo)) {
            fail(
              'monotonicity',
              `binds ${bindOptions[i]} not harder than ${bindOptions[i - 1]} at length=${length}`,
            );
          }
        }
      }
    }
    // Distinct glyphs, holding length and bindings fixed.
    for (const length of [1, 2, 3, 4]) {
      for (const binds of [0, 1, 2]) {
        const distincts = reach((c) => c.length === length && c.binds === binds)
          .map((c) => c.distinct)
          .sort((a, b) => a - b);
        for (let i = 1; i < distincts.length; i++) {
          const lo = difficultyOf(length, binds, distincts[i - 1], nearness);
          const hi = difficultyOf(length, binds, distincts[i], nearness);
          if (!(hi > lo)) {
            fail(
              'monotonicity',
              `distinct ${distincts[i]} not harder than ${distincts[i - 1]} at length=${length} binds=${binds}`,
            );
          }
        }
      }
    }
  }
  // Distractor nearness, holding the config fixed. Tighter distractors are harder.
  for (const c of CONFIGS) {
    if (!(difficultyOf(c.length, c.binds, c.distinct, 1) > difficultyOf(c.length, c.binds, c.distinct, 0))) {
      fail('monotonicity', `nearness not monotone at ${JSON.stringify(c)}`);
    }
  }
}
checkMonotonicity();

/* ========================================================================== *
 * Per-bank checks
 * ========================================================================== */
function loadBank(mode) {
  const raw = readFileSync(bankPath(mode), 'utf8').trim();
  const lines = raw.length ? raw.split('\n') : [];
  if (lines.length === 0) fail(`parse:${mode}`, 'bank is empty');
  const items = [];
  lines.forEach((line, i) => {
    try {
      items.push(JSON.parse(line));
    } catch (e) {
      fail(`parse:${mode}`, `line ${i + 1} is not valid JSON: ${e.message}`);
    }
  });
  return items;
}

/** The difficulty slices the anti-leak and M-PAE figures are reported over. */
const SLICES = [
  [1, 5],
  [5, 10],
  [10, 15],
  [15, 20.01],
];

function checkBank(mode, items) {
  const seenIds = new Set();
  const systemIds = new Set();
  const keyCounts = Object.fromEntries(OPTION_KEYS.map((k) => [k, 0]));
  const keyByLength = new Map();
  const optionCounts = new Set();
  const leak = SLICES.map(([lo, hi]) => ({
    lo,
    hi,
    n: 0,
    sole: 0,
    survivors: 0,
    uniform: 0,
    modal: 0,
    antiModal: 0,
  }));
  const paeValues = [];
  const paeByNearness = new Map();

  for (const it of items) {
    const id = `${mode}:${it.itemId || '(no id)'}`;

    // ---- 1. Envelope ----
    if (typeof it.itemId !== 'string' || it.itemId.length < 8) fail(id, 'itemId missing/short');
    if (seenIds.has(it.itemId)) fail(id, 'duplicate itemId');
    seenIds.add(it.itemId);
    if (it.typeCode !== 'QUANT-GLYPHNUM-01') fail(id, `typeCode != QUANT-GLYPHNUM-01 (${it.typeCode})`);
    if (it.domain !== 'quantitative') fail(id, `domain != quantitative (${it.domain})`);
    if (it.demoPath !== 'demos/QUANT-GLYPHNUM-01.html') fail(id, `demoPath wrong (${it.demoPath})`);
    if (!isNum(it.difficulty) || it.difficulty < 1 || it.difficulty > 20)
      fail(id, `difficulty not a float in 1..20 (${it.difficulty})`);
    if (it.syntheticOnly !== true) fail(id, 'syntheticOnly must be true');
    if (it.validated !== false) fail(id, 'validated must be false');
    if (!it.scoring || it.scoring.mode !== 'deterministic_key')
      fail(id, 'scoring.mode != deterministic_key');
    if (!it.scoring || it.scoring.rule !== 'placement_tolerance')
      fail(id, 'scoring.rule != placement_tolerance — the shipped M-PAE contract');
    if (!it.provenance || it.provenance.generator !== 'grammar')
      fail(id, 'provenance.generator != grammar');
    if (!it.provenance || typeof it.provenance.seed !== 'string') fail(id, 'provenance.seed missing');

    const c = it.content || {};
    const ans = it.answer || {};
    const lev = (it.provenance && it.provenance.levers) || {};

    // ---- 2. Key containment ----
    const contentStr = JSON.stringify(c);
    for (const leakField of ['correctKey', 'mapping', 'system', 'targetRatio', 'tolerance', 'strategyTrace'])
      if (contentStr.includes(leakField)) fail(id, `content leaks "${leakField}"`);
    // The ROLE names must not appear in content either: content speaks glyphs only.
    for (const role of ROLE_NAMES)
      if (contentStr.includes(`"${role}"`)) fail(id, `content names the role "${role}"`);
    if (contentStr.includes('perTrial') || contentStr.includes('consistent'))
      fail(id, 'content reveals which control arm it belongs to');
    if (!deepEq(c.glyphTray, GLYPH_NAMES))
      fail(id, `glyphTray is not the canonical order (${JSON.stringify(c.glyphTray)})`);
    // Publishing the line's numeric maximum would hand a brute-forcing client the equation
    // value(anchor) = max and pin part of the mapping without any induction.
    if (c.line && c.line.max != null) fail(id, 'content publishes the line maximum as a number');
    if (c.line && c.line.maxValue != null) fail(id, 'content publishes the line maximum as a number');

    // ---- 6. Grammar invariants ----
    const mapping = (ans.system || {}).mapping || {};
    const glyphs = Array.isArray(c.expression) ? c.expression : [];
    if (glyphs.length < 1 || glyphs.length > 4)
      fail(id, `expression length ${glyphs.length} outside 1..4`);
    for (const glyph of glyphs)
      if (!GLYPH_NAMES.includes(glyph)) fail(id, `expression uses an unknown glyph "${glyph}"`);
    const roles = glyphs.map((glyph) => mapping[glyph]);
    const anchorRoles = (c.line?.maxExpression ?? []).map((glyph) => mapping[glyph]);
    const resolves = roles.every((r) => ROLE_NAMES.includes(r)) && anchorRoles.every((r) => ROLE_NAMES.includes(r));
    if (!resolves) fail(id, 'the mapping does not resolve every glyph in the expression or the anchor');

    if (resolves) {
      if (roles.length !== lev.length) fail(id, `length ${roles.length} != declared ${lev.length}`);
      if (bindCount(roles) !== lev.binds)
        fail(id, `binding count ${bindCount(roles)} != declared ${lev.binds}`);
      if (new Set(glyphs).size !== lev.distinct)
        fail(id, `distinct glyphs ${new Set(glyphs).size} != declared ${lev.distinct}`);
      if (!everyDigitBound(roles))
        fail(id, `expression leaves a digit unbound (${roles.join('+')}) — the grammar forbids it`);
      if (!everyDigitBound(anchorRoles))
        fail(id, `line anchor leaves a digit unbound (${anchorRoles.join('+')})`);
      if ((lev.binds > 0 ? 1 : 0) !== lev.orderSensitive)
        fail(id, `declared orderSensitive ${lev.orderSensitive} != derived from binds ${lev.binds}`);
      if (!deepEq(ans.expressionRoles, roles))
        fail(id, 'answer.expressionRoles disagrees with the mapping applied to content.expression');

      // ---- 3. KEY RE-DERIVED FROM THE STATED SYSTEM ----
      const trueValue = read(roles);
      const lineMax = read(anchorRoles);
      if (ans.trueValue !== trueValue) fail(id, `answer.trueValue ${ans.trueValue} != re-read ${trueValue}`);
      if (ans.lineMax !== lineMax) fail(id, `answer.lineMax ${ans.lineMax} != re-read ${lineMax}`);
      if (!(lineMax >= trueValue && trueValue > 0))
        fail(id, `value ${trueValue} does not sit on a line running 0..${lineMax}`);

      const options = Array.isArray(c.options) ? c.options : [];
      optionCounts.add(options.length);
      if (options.length !== 5) fail(id, `expected 5 options, got ${options.length}`);
      if (!deepEq(options.map((o) => o.key), OPTION_KEYS.slice(0, options.length)))
        fail(id, 'option keys are not A..E in order');
      for (let i = 1; i < options.length; i++) {
        if (!(options[i].ratio > options[i - 1].ratio))
          fail(id, 'options are not in strictly increasing position along the line');
      }

      const targetRatio = round6(trueValue / lineMax);
      if (Math.abs(ans.targetRatio - targetRatio) > 1e-6)
        fail(id, `answer.targetRatio ${ans.targetRatio} != independently derived ${targetRatio}`);
      const keyed = options.find((o) => o.key === ans.correctKey);
      if (!keyed) fail(id, `correctKey ${ans.correctKey} names no option`);
      else if (Math.abs(keyed.ratio - targetRatio) > 1e-6)
        fail(id, `the tick at correctKey ${ans.correctKey} is not where the expression reads`);

      // ---- 4. Anti-leak, from `content` alone ----
      const view = attackerView(c);
      const acc = attackerAccuracy(view, ans.correctKey);
      if ((view.find((o) => o.key === ans.correctKey)?.backing ?? 0) === 0)
        fail(id, 'the key is not reachable under its own mapping — the brute force is wrong');
      if (acc.survivors < 2)
        fail(
          id,
          `only ${acc.survivors} option(s) survive a brute force over all ${RELABELLINGS.length} ` +
            'glyph->role relabellings — a client recovers the key from content alone',
        );
      const slice = leak.find((s) => it.difficulty >= s.lo && it.difficulty < s.hi);
      slice.n += 1;
      slice.survivors += acc.survivors;
      if (acc.survivors < 2) slice.sole += 1;
      slice.uniform += acc.uniform;
      slice.modal += acc.modal;
      slice.antiModal += acc.antiModal;

      // ---- 5. Distractors: distinct, and each a named partial rule ----
      const ratios = options.map((o) => round6(o.ratio));
      if (new Set(ratios).size !== ratios.length) fail(id, 'two options mark the same position');

      const admissible = new Map();
      for (const rule of admissibleRules(roles, lineMax)) admissible.set(rule.ruleId, rule.value);
      const rats = ans.distractorRationales || {};
      const trace = ans.strategyTrace || {};
      for (const option of options) {
        const rationale = rats[option.key];
        if (!rationale) {
          fail(id, `no rationale for option ${option.key}`);
          continue;
        }
        if (option.key === ans.correctKey) {
          if (lureLabel(rationale) !== 'correct')
            fail(id, `the key is labelled "${lureLabel(rationale)}" rather than correct`);
          continue;
        }
        const kind = rationale.partialRuleKind;
        if (!KIND_LURE[kind]) fail(id, `option ${option.key} has unknown partial rule kind "${kind}"`);
        else if (lureLabel(rationale) !== KIND_LURE[kind])
          fail(id, `option ${option.key} lure "${lureLabel(rationale)}" != ${KIND_LURE[kind]}`);
        const expected = admissible.get(rationale.ruleId);
        if (expected === undefined)
          fail(id, `option ${option.key} cites rule "${rationale.ruleId}", which this expression does not admit`);
        else if (Math.abs(expected / lineMax - option.ratio) > 1e-6)
          fail(
            id,
            `option ${option.key} is not where rule "${rationale.ruleId}" puts it ` +
              `(${option.ratio} vs ${round6(expected / lineMax)})`,
          );
        if (ans.optionValues?.[option.key] !== expected)
          fail(id, `answer.optionValues.${option.key} disagrees with its own rule`);
        const traced = trace[option.key];
        if (!traced || traced.ruleId !== rationale.ruleId || traced.kind !== kind)
          fail(id, `strategyTrace for ${option.key} disagrees with its rationale`);
      }
      if (!Array.isArray(ans.strategyTraceRules) || ans.strategyTraceRules.length !== 11)
        fail(id, 'answer.strategyTraceRules does not declare the closed rule vocabulary');

      // ---- 14. M-PAE: the SHIPPED generic placement contract, re-implemented ----
      //
      // `verifyPlacementTolerance` (apps/web) and `app.exam_verify_placement_tolerance` (plpgsql)
      // both compute pae = |placedRatio - targetRatio|, return `correct` when pae <= tolerance, and
      // emit pae as M-PAE. Running that formula over every option is what turns "this bank declares
      // M-PAE" into "this bank supplies it": the metric has to be selective, in range, and graded.
      if (!isNum(ans.tolerance) || ans.tolerance <= 0) fail(id, 'answer.tolerance missing or not positive');
      for (const option of options) {
        const pae = Math.abs(option.ratio - ans.targetRatio);
        const correct = pae <= ans.tolerance;
        if (correct !== (option.key === ans.correctKey))
          fail(
            id,
            `the placement tolerance grades option ${option.key} as ${correct ? 'correct' : 'wrong'} ` +
              `(pae ${round6(pae)}, tolerance ${ans.tolerance}) — the band must contain exactly the keyed tick`,
          );
        if (pae > 0.5 + 1e-9)
          fail(id, `M-PAE ${round6(pae)} for option ${option.key} exceeds the registry range max of 0.5`);
        if (option.key === ans.correctKey) continue;
        paeValues.push(pae);
        const kind = rats[option.key]?.partialRuleKind;
        if (kind) {
          const bucket = paeByNearness.get(kind) ?? [];
          bucket.push(pae);
          paeByNearness.set(kind, bucket);
        }
      }
    }

    if (OPTION_KEYS.includes(ans.correctKey)) {
      keyCounts[ans.correctKey]++;
      const row = keyByLength.get(lev.length) ?? Object.fromEntries(OPTION_KEYS.map((k) => [k, 0]));
      row[ans.correctKey]++;
      keyByLength.set(lev.length, row);
    }

    // ---- 7. Difficulty + reproducibility ----
    const derivedDifficulty = round2(
      difficultyOf(lev.length, lev.binds, lev.distinct, lev.distractorNearness),
    );
    if (Math.abs(derivedDifficulty - it.difficulty) > 0.01)
      fail(id, `difficulty ${it.difficulty} != derived-from-levers ${derivedDifficulty}`);

    // ---- 10. Band ladder ----
    if (isNum(it.difficulty)) {
      const band = bandOf(it.difficulty);
      if (lev.length > band.maxLength)
        fail(id, `length ${lev.length} exceeds the ${band.band} cap of ${band.maxLength}`);
      if (lev.binds > band.maxBinds)
        fail(id, `binds ${lev.binds} exceeds the ${band.band} cap of ${band.maxBinds}`);
      if (!deepEq(it.ageBands, [band.band]))
        fail(id, `ageBands ${JSON.stringify(it.ageBands)} != ["${band.band}"] for ${it.difficulty}`);
    }

    // ---- 12. Persistence ----
    if (lev.systemPersistence !== mode)
      fail(id, `provenance levers say persistence ${lev.systemPersistence}, bank is ${mode}`);
    if (ans.system && typeof ans.system.systemId === 'string') systemIds.add(ans.system.systemId);
    else fail(id, 'answer.system.systemId missing');
    if (Object.keys(mapping).length !== GLYPH_NAMES.length)
      fail(id, `mapping covers ${Object.keys(mapping).length} glyphs, expected ${GLYPH_NAMES.length}`);
    if (new Set(Object.values(mapping)).size !== ROLE_NAMES.length)
      fail(id, 'mapping is not a bijection onto the role vocabulary');

    try {
      const regen = normalizeBankItem(genItem({ ...lev, seed: it.provenance.seed }));
      if (!deepEq(regen, it)) fail(id, 'item is NOT reproducible from its provenance (grammar drift)');
    } catch (e) {
      fail(id, `regeneration threw: ${e.message}`);
    }
  }

  // ---- 9. Coverage: 0.5-point grain across the whole scale ----
  const diffs = items.map((it) => it.difficulty).filter(isNum);
  const min = Math.min(...diffs);
  const max = Math.max(...diffs);
  if (!(min <= 1.25)) fail(`coverage:${mode}`, `min difficulty ${round2(min)} does not reach the floor`);
  if (!(max >= 19.75)) fail(`coverage:${mode}`, `max difficulty ${round2(max)} does not reach the ceiling`);

  const rungs = [];
  for (let d = 1; d <= 20 + 1e-9; d += 0.5) rungs.push(round2(d));
  const rungCounts = rungs.map((r) => diffs.filter((d) => Math.abs(d - r) <= 0.25).length);
  const bandCounts = rungs.map((r) => diffs.filter((d) => Math.abs(d - r) <= 0.5).length);
  rungs.forEach((r, i) => {
    if (rungCounts[i] < 5) fail(`coverage:${mode}`, `0.5-point rung ${r} has ${rungCounts[i]} items (<5)`);
    if (bandCounts[i] < 5)
      fail(`coverage:${mode}`, `+/-0.5pt band around ${r} has ${bandCounts[i]} items (<5)`);
  });

  // ---- 11. Key balance (E-094: report per option count, never pooled across formats) ----
  const total = items.length;
  const worst = Math.max(...OPTION_KEYS.map((k) => (100 * keyCounts[k]) / total));
  const floor = 100 / OPTION_KEYS.length;
  if (worst - floor > 5)
    fail(`keybalance:${mode}`, `modal key beats the ${floor}% floor by ${(worst - floor).toFixed(1)}pt (>5pt)`);
  if (optionCounts.size !== 1)
    fail(
      `keybalance:${mode}`,
      `bank mixes option counts (${[...optionCounts].join(',')}) — E-094 forbids pooling formats`,
    );

  // Key rank must also be uninformative WITHIN each expression length. Balanced overall while
  // correlated with length would leave "a longer expression sits further right" open, and that
  // heuristic needs no knowledge of the system at all.
  let worstWithinLength = 0;
  for (const [length, row] of keyByLength) {
    const n = OPTION_KEYS.reduce((s, k) => s + row[k], 0);
    const excess = Math.max(...OPTION_KEYS.map((k) => (100 * row[k]) / n)) - floor;
    worstWithinLength = Math.max(worstWithinLength, excess);
    if (excess > 8)
      fail(
        `keybalance:${mode}`,
        `at expression length ${length} the modal key beats the ${floor}% floor by ${excess.toFixed(1)}pt (>8pt)`,
      );
  }

  // ---- 12. Persistence, at bank level ----
  if (mode === 'consistent' && systemIds.size !== 1)
    fail(`persistence:${mode}`, `consistent bank holds ${systemIds.size} systems, expected exactly 1`);
  if (mode === 'perTrial' && systemIds.size !== items.length)
    fail(
      `persistence:${mode}`,
      `perTrial bank holds ${systemIds.size} systems for ${items.length} items, expected one each`,
    );

  // ---- 14b. M-PAE must be GRADED, not a relabelled "which wrong tick" ----
  //
  // The registry wants a continuous error whose small consistent values separate strong reasoners.
  // That only holds if a near-miss reading lands nearer than a disengaged one, so the check is on
  // the ORDERING: the mean placement error of the nearest failure class must be below that of the
  // furthest one, by a margin bigger than the grid the ratios live on.
  const meanOf = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const nearClasses = [...paeByNearness.keys()].filter((k) => KIND_NEARNESS[k] >= 0.7);
  const farClasses = [...paeByNearness.keys()].filter((k) => KIND_NEARNESS[k] <= 0.25);
  if (nearClasses.length > 0 && farClasses.length > 0) {
    const nearMean = meanOf(nearClasses.flatMap((k) => paeByNearness.get(k)));
    const farMean = meanOf(farClasses.flatMap((k) => paeByNearness.get(k)));
    if (!(nearMean < farMean))
      fail(
        `mpae:${mode}`,
        `near-miss readings do not land nearer than disengaged ones (mean pae ${round6(nearMean)} ` +
          `vs ${round6(farMean)}) — M-PAE would be an error CODE, not an error SIZE`,
      );
  }
  const distinctPae = new Set(paeValues.map((p) => round6(p))).size;
  if (distinctPae < 50)
    fail(`mpae:${mode}`, `only ${distinctPae} distinct M-PAE values across the bank — not continuous`);

  return {
    items,
    rungCounts,
    keyCounts,
    keyByLength,
    systemIds,
    min,
    max,
    worstKeyAdvantage: worst - floor,
    worstWithinLength,
    leak,
    paeValues,
    paeByNearness,
    distinctPae,
  };
}

const banks = {};
for (const mode of MODES) banks[mode] = checkBank(mode, loadBank(mode));

/* ---- 13. Equating: the two banks differ ONLY in persistence ---------------- */
{
  const a = banks.consistent.items;
  const b = banks.perTrial.items;
  if (a.length !== b.length) fail('equating', `item counts differ (${a.length} vs ${b.length})`);
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i].difficulty !== b[i].difficulty) fail('equating', `item ${i}: difficulty differs`);
    if (a[i].answer.correctKey !== b[i].answer.correctKey) fail('equating', `item ${i}: key slot differs`);
    if (!deepEq(a[i].ageBands, b[i].ageBands)) fail('equating', `item ${i}: age band differs`);
    if (!deepEq(a[i].content.options, b[i].content.options))
      fail('equating', `item ${i}: option ratios differ`);
    if (a[i].answer.targetRatio !== b[i].answer.targetRatio)
      fail('equating', `item ${i}: target ratio differs`);
    if (a[i].answer.lineMax !== b[i].answer.lineMax) fail('equating', `item ${i}: line maximum differs`);
    if (!deepEq(a[i].answer.expressionRoles, b[i].answer.expressionRoles))
      fail('equating', `item ${i}: role sequence differs`);
    if (a[i].content.expression.length !== b[i].content.expression.length)
      fail('equating', `item ${i}: expression length differs`);
  }
  // And they must NOT be the same bank: the glyph labelling has to move somewhere.
  const differing = a.filter(
    (item, i) => b[i] && item.content.expression.join('+') !== b[i].content.expression.join('+'),
  ).length;
  if (differing === 0) fail('equating', 'the two banks are identical — the perTrial arm re-drew nothing');
}

/* ---- 15. Learnability: how much does ONE reveal narrow the system? --------- */
//
// Reported, never asserted, and it is the mirror image of check 4 rather than a contradiction of
// it. Check 4 asks what a client can work out from `content` with the key hidden, and the answer
// has to be "almost nothing". This asks what is left once the trial has been scored and the child
// has SEEN where the expression belonged, which is information the design hands over on purpose —
// §1.5's informational reveal. Cross-item inference of that kind is the induction the block exists
// to measure, so the useful figure is how many of the 120 candidate mappings survive one reveal.
//
// It bounds learnability from above, for an ideal observer that can hold 120 hypotheses at once. No
// child does that, and the gap between this bound and a real child is the whole measurement. What
// the bound rules out is the opposite failure: a system so weakly identified that 30 trials could
// not fix it even in principle would have no ladder to climb.
function survivingMappingsAfterReveal(item) {
  return RELABELLINGS.filter((m) => {
    const anchor = read(item.content.line.maxExpression.map((g) => m[g]));
    if (anchor <= 0) return false;
    return Math.abs(read(item.content.expression.map((g) => m[g])) / anchor - item.answer.targetRatio) < 1e-9;
  }).length;
}
const revealNarrowing = banks.consistent.items.map(survivingMappingsAfterReveal);
const identifiedOutright = revealNarrowing.filter((n) => n === 1).length;

/* ---- 16. Prior-knowledge shortcut probe ------------------------------------ */
//
// §3.2 calls this type's novelty guarantee its strength: an invented notation cannot be pre-known,
// so a rate fitted on it should not be measuring schooling. That is a claim, and a claim about
// construct validity is exactly the kind that should be measured rather than asserted.
//
// Each row below is a solver that knows something a numerate child plausibly brings to the task and
// has NOT induced the notation. Its accuracy is the share of the bank it answers correctly, against
// a 20% five-option floor. Because every wrong mark is the value of a named incomplete reading, a
// solver's score is computable exactly: it is right on an item precisely when its reading of the
// expression equals the true value.
//
// The one that matters most is the additive-only solver. It is not a shortcut a child imports from
// school so much as the FIRST HALF of the system, and its accuracy is the design's divergence
// mechanism stated as a number: the share of the bank a child who has the glyph values and the
// sign-value layer, but not the multiplicative binding, can already answer. If that were near 100%
// the ladder would have nowhere to go.
function shortcutProbe(items) {
  const solvers = {
    'additive only (has the sign-value layer, not the binding)': (roles) =>
      roles.reduce((s, r) => s + q(r), 0),
    'place-value reading (the other published regime)': (roles) =>
      roles.reduce((s, r, i) => s + q(r) * B ** (roles.length - 1 - i), 0),
    'count the glyphs ("longer means bigger")': (roles) => roles.length,
    'biggest glyph only': (roles) => Math.max(...roles.map(q)),
    'first part of the expression only': (roles) =>
      read(isD(roles[0]) ? roles.slice(0, 2) : roles.slice(0, 1)),
  };
  const rows = [];
  for (const [label, solve] of Object.entries(solvers)) {
    const hit = items.filter((it) => solve(it.answer.expressionRoles) === it.answer.trueValue).length;
    rows.push({ label, accuracy: hit / items.length });
  }
  // Two solvers that ignore the expression entirely, which is what key-rank balance is for.
  for (const [label, rank] of [
    ['always tap the middle mark', 2],
    ['always tap the far end of the line', 4],
  ]) {
    const hit = items.filter((it) => it.answer.correctKey === OPTION_KEYS[rank]).length;
    rows.push({ label, accuracy: hit / items.length });
  }
  // And the strongest one that is not the child: a browser that knows the base and the composition
  // rule and lacks only the glyph assignment. This is check 4's figure, restated as a solver.
  const attacker =
    items.reduce((sum, it) => {
      const view = attackerView(it.content);
      const acc = attackerAccuracy(view, it.answer.correctKey);
      return sum + Math.max(acc.uniform, acc.modal, acc.antiModal);
    }, 0) / items.length;
  rows.push({
    label:
      'knows the base and the rule, not the glyph assignment — brute force over 120 mappings, ' +
      'free to switch strategy per item (an upper bound; one strategy for the whole bank scores less)',
    accuracy: attacker,
  });
  return rows;
}

/** The additive-only solver by difficulty slice: the divergence mechanism, as a curve. */
function additiveOnlyBySlice(items) {
  return SLICES.map(([lo, hi]) => {
    const sub = items.filter((it) => it.difficulty >= lo && it.difficulty < hi);
    const hit = sub.filter(
      (it) => it.answer.expressionRoles.reduce((s, r) => s + q(r), 0) === it.answer.trueValue,
    ).length;
    return { lo, hi: hi === 20.01 ? 20 : hi, n: sub.length, accuracy: hit / sub.length };
  });
}

/* ---- Report --------------------------------------------------------------- */
for (const mode of MODES) {
  const b = banks[mode];
  console.log(
    `QUANT-GLYPHNUM-01.${mode}: ${b.items.length} items, difficulty ${round2(b.min)}..${round2(b.max)}, ` +
      `${b.systemIds.size} hidden system(s)`,
  );
  console.log(
    `  key positions (5-option stratum): ` +
      OPTION_KEYS.map((k) => `${k}:${b.keyCounts[k]}`).join(' ') +
      `  — modal advantage over the 20.0% floor: +${b.worstKeyAdvantage.toFixed(1)}pt ` +
      `(worst within one expression length: +${b.worstWithinLength.toFixed(1)}pt)`,
  );
  console.log(`  per 0.5pt rung (1.0 -> 20.0): ${b.rungCounts.join(' ')}`);
  const total = b.leak.reduce(
    (acc, s) => ({
      n: acc.n + s.n,
      sole: acc.sole + s.sole,
      survivors: acc.survivors + s.survivors,
      uniform: acc.uniform + s.uniform,
      modal: acc.modal + s.modal,
      antiModal: acc.antiModal + s.antiModal,
    }),
    { n: 0, sole: 0, survivors: 0, uniform: 0, modal: 0, antiModal: 0 },
  );
  const best = Math.max(total.uniform, total.modal, total.antiModal);
  console.log(
    `  anti-leak over all ${RELABELLINGS.length} relabellings: ${total.sole}/${total.n} items where ` +
      `only one option survives; mean ${(total.survivors / total.n).toFixed(2)} survivors; ` +
      `best content-only attacker ${((100 * best) / total.n).toFixed(1)}% against a 20.0% floor`,
  );
  console.log('  | difficulty | n | mean survivors | uniform | modal | anti-modal |');
  for (const s of b.leak) {
    console.log(
      `  | ${s.lo}-${s.hi === 20.01 ? 20 : s.hi} | ${s.n} | ${(s.survivors / s.n).toFixed(2)} | ` +
        `${((100 * s.uniform) / s.n).toFixed(1)}% | ${((100 * s.modal) / s.n).toFixed(1)}% | ` +
        `${((100 * s.antiModal) / s.n).toFixed(1)}% |`,
    );
  }
  const mean = (xs) => xs.reduce((a, x) => a + x, 0) / xs.length;
  console.log(
    `  M-PAE over ${b.paeValues.length} wrong-option placements: ${b.distinctPae} distinct values, ` +
      `mean ${mean(b.paeValues).toFixed(3)}, max ${Math.max(...b.paeValues).toFixed(3)} (range max 0.5)`,
  );
  console.log(
    '  M-PAE by failure class (nearest first): ' +
      [...b.paeByNearness.entries()]
        .sort((x, y) => KIND_NEARNESS[y[0]] - KIND_NEARNESS[x[0]])
        .map(([kind, xs]) => `${kind} ${mean(xs).toFixed(3)}`)
        .join('  '),
  );
}

console.log(
  '\nprior-knowledge shortcut probe (reported, not asserted) — what a solver that has NOT induced\n' +
    'the notation scores on the consistent bank, against a 20.0% five-option floor:',
);
for (const row of shortcutProbe(banks.consistent.items)) {
  console.log(`  ${(100 * row.accuracy).toFixed(1).padStart(5)}%  ${row.label}`);
}
console.log(
  '  The additive-only row is the divergence mechanism rather than a leak — it is what a child who\n' +
    '  has the glyph values and the sign-value layer but not the multiplicative binding can already\n' +
    '  answer — so the number that matters is how it FALLS with difficulty:\n' +
    '    ' +
    additiveOnlyBySlice(banks.consistent.items)
      .map((s) => `${s.lo}-${s.hi}: ${(100 * s.accuracy).toFixed(1)}%`)
      .join('   '),
);

{
  const mean = revealNarrowing.reduce((a, b) => a + b, 0) / revealNarrowing.length;
  console.log(
    `\nlearnability (reported, not asserted): after ONE scored trial and its reveal, the ` +
      `${RELABELLINGS.length} candidate glyph->role mappings narrow to a mean of ${mean.toFixed(2)}, ` +
      `and to exactly one on ${identifiedOutright}/${revealNarrowing.length} items ` +
      `(${((100 * identifiedOutright) / revealNarrowing.length).toFixed(1)}%).\n` +
      '  Two things follow, and the second is the more important. The system is identifiable well\n' +
      '  inside 30 trials in principle, so the design cannot fail for want of evidence. And because\n' +
      '  it is, what the difficulty ladder measures is NOT time-to-discovery: it is how fast a child\n' +
      '  converts a system they could in principle already have into correct application at rising\n' +
      '  composition depth. That is the graded induction §1.3 asks for rather than the single-insight\n' +
      '  step it warns against, and it is the claim Gate B has to test.\n' +
      '  In the scrambled arm the same arithmetic holds item by item and buys nothing, because the\n' +
      '  mapping it converges on is re-drawn before the next item. That is the control, stated as a\n' +
      '  property of the two files rather than as an intention.',
  );
}

if (failures.length) {
  console.error(`\nFAIL — ${failures.length} problem(s):`);
  for (const f of failures.slice(0, 40)) console.error('  - ' + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log(
  '\nPASS — both banks parse; the key is re-derived from the stated system on 100% of items; no item\n' +
    'is decided by a brute force over all 120 glyph->role relabellings, and the graded attacker\n' +
    'figure is reported per difficulty slice rather than summarised away; every distractor is a\n' +
    'named partial rule that reproduces its own position on the line; no expression leaves a digit\n' +
    'unbound; difficulty is monotone in every lever and re-derived from each item\u2019s own levers;\n' +
    'coverage is 1..20 with >=5 items per 0.5-point rung; length and binding depth respect the band\n' +
    'ladder; key positions sit at the 5-option floor both overall and within every expression\n' +
    'length; the shipped placement-tolerance contract grades exactly the keyed tick on every item\n' +
    'and emits an M-PAE that is continuous, inside the declared range, and ordered by how near the\n' +
    'failure class is; the consistent bank holds one hidden system and the perTrial bank one per\n' +
    'item; and the two banks are equated on every scored property.\n\n' +
    'NOT GATED. This says the instrument is well formed, not that it measures learning: Gate B needs\n' +
    '~128 real children (STAGE2_QUESTION_DESIGN §4.1.3).',
);
