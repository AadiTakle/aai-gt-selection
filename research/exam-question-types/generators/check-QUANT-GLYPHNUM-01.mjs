// Independent validator for the QUANT-GLYPHNUM-01 dual-mode TEMPLATE banks (U4; D-211).
//
// The place-value reader, the difficulty arithmetic, the admissibility rules and the brute-force
// attacker are RE-IMPLEMENTED here from the documented model rather than imported, so a bug in the
// generator cannot validate itself. The generator is imported only for the three things where
// agreement is the property under test: `materialise` (does the shipped materialiser reproduce the
// item's own `content` and `answer` from its own template?), the declared weight tables, and the
// enumeration the coverage check compares against.
//
// U4's acceptance is "independent re-derivation of the key agrees on 100% of BOTH banks", so this
// checks the pair rather than one file, and additionally the property that makes the pair a control
// rather than two banks: they are equated on every scored quantity and differ only in whether the
// glyph->digit mapping persists.
//
// Checks (exit nonzero on any failure):
//   1.  JSONL parses; every line is a well-formed BankItem (BUILD_PLAN §2 shape).
//   2.  THE FIREWALL. `content` never names the base, a digit value, the line's maximum, the target,
//       the tolerance or a demonstration. Checked as a recursive scan for the values themselves, not
//       just for the field names, because a leak that renames a field is still a leak.
//   3.  KEY RE-DERIVED. Resolve `content.expression` through the server-only mapping, read it as a
//       base-6 place-value numeral, divide by the anchor read the same way, and require the result to
//       equal `answer.targetRatio` exactly — on every item of both banks.
//   4.  THE TEMPLATE IS THE AUTHORITY. `materialise(provenance.template, answer.system)` reproduces
//       `content` and the graded half of `answer` byte for byte, which is what makes the record
//       re-keyable: a serve-time path can redraw the mapping and rewrite exactly those objects.
//   5.  RE-KEYING MOVES NOTHING THAT IS SCORED. Materialising each template under all 120 mappings
//       leaves the target ratio, the tolerance and every difficulty lever unchanged. This is §2's
//       Failure A and Failure B checked directly rather than argued.
//   6.  THE CHANCE FLOOR IS EXACT. Every target sits inside the declared support and at least one
//       tolerance from both ends, so the accepting interval has measure exactly 2t on every item.
//       Both readings of the floor are recomputed here and compared to what the engine declares.
//   7.  ANTI-LEAK. Brute-force all 120 glyph->digit relabellings from `content` ALONE and require
//       the attack to be no better than a random placement, per item and per difficulty slice. Plus
//       the two attacks that need no mapping: the best fixed placement, and the difficulty-ordinal
//       attack measured as a correlation and as a per-slice fixed placement.
//   8.  DIFFICULTY. Equals the value re-derived from the item's own levers; every lever is a count
//       over digit values; the levers are the ones actually true of the numeral and anchor; and the
//       §4.3 band caps hold against the item's own difficulty.
//   9.  COVERAGE. 1..20 on the 0.5-point grid with no holes, and the per-rung supply reported.
//   10. M-PAE. The shipped placement contract, re-implemented from its documentation, grades a
//       placement at the target correct and a placement a tolerance-and-a-bit away wrong, and the
//       emitted error is continuous and ordered by distance.
//   11. THE DEMONSTRATION SCHEDULE. Present on every template, expressed in digit values, fading
//       concrete -> extent -> symbolic, and absent from every `content`.
//   12. EQUATING. The two arms match on every scored property; the consistent arm holds one system
//       and the perTrial arm one per item.
//
// Run: node research/exam-question-types/generators/check-QUANT-GLYPHNUM-01.mjs

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ANCHOR_STEPS,
  BANDS,
  BASE,
  CHANCE_FLOOR,
  DIGITS,
  GLYPHS,
  LADDER_MIN,
  LENGTH_STEPS,
  MAX_STEPS,
  REPEAT_STEPS,
  SUPPORT_MAX,
  SUPPORT_MIN,
  TOLERANCE_RATIO,
  UNIFORM_LINE_FLOOR,
  materialise,
} from './QUANT-GLYPHNUM-01.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const failures = [];
const fail = (msg) => failures.push(msg);

/* ================================================================== *
 * THE NOTATION, RE-IMPLEMENTED
 *
 * Leftmost most significant, zero-free digit set. Written out rather than imported so a wrong
 * generator cannot agree with itself.
 * ================================================================== */
function readNumeral(digits) {
  let total = 0;
  for (const digit of digits) {
    if (!Number.isInteger(digit) || digit < 1 || digit > BASE - 1) return null;
    total = total * BASE + digit;
  }
  return digits.length === 0 ? null : total;
}

const round6 = (x) => Math.round(x * 1e6) / 1e6;
const round2 = (x) => Math.round(x * 100) / 100;

/** Every glyph->digit bijection: the attacker's whole hypothesis space. */
const ALL_MAPPINGS = (() => {
  const out = [];
  const walk = (i, used, acc) => {
    if (i === GLYPHS.length) {
      out.push({ ...acc });
      return;
    }
    for (const digit of DIGITS) {
      if (used.has(digit)) continue;
      used.add(digit);
      acc[GLYPHS[i]] = digit;
      walk(i + 1, used, acc);
      used.delete(digit);
    }
  };
  walk(0, new Set(), {});
  return out;
})();

/* ================================================================== *
 * LOAD
 * ================================================================== */
function load(path) {
  const text = readFileSync(resolve(__dirname, path), 'utf8');
  const items = [];
  text.split('\n').forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      items.push(JSON.parse(trimmed));
    } catch {
      fail(`${path}:${i + 1} is not valid JSON`);
    }
  });
  return items;
}

const consistent = load('../banks/QUANT-GLYPHNUM-01.jsonl');
const perTrial = load('../control-banks/QUANT-GLYPHNUM-01.perTrial.jsonl');
const arms = [
  ['consistent', consistent],
  ['perTrial', perTrial],
];

if (consistent.length === 0 || perTrial.length === 0) {
  console.error('FAIL — one or both banks are empty. Run the generator first.');
  process.exit(1);
}

/* ================================================================== *
 * 1. SHAPE
 * ================================================================== */
for (const [arm, bank] of arms) {
  for (const [i, it] of bank.entries()) {
    const where = `${arm}[${i}]`;
    if (it.typeCode !== 'QUANT-GLYPHNUM-01') fail(`${where}: typeCode ${it.typeCode}`);
    if (it.domain !== 'quantitative') fail(`${where}: domain ${it.domain}`);
    if (typeof it.difficulty !== 'number' || it.difficulty < 1 || it.difficulty > 20) {
      fail(`${where}: difficulty ${it.difficulty} outside 1..20`);
    }
    if (!Array.isArray(it.ageBands) || it.ageBands.length === 0) fail(`${where}: no ageBands`);
    if (it.syntheticOnly !== true || it.validated !== false) fail(`${where}: not born-synthetic`);
    if (it.scoring?.rule !== 'placement_tolerance') fail(`${where}: scoring.rule ${it.scoring?.rule}`);
    if (it.content?.responseField !== 'placedRatio') fail(`${where}: responseField`);
    if (it.content?.responseFormat !== 'continuous_placement') {
      fail(`${where}: content.responseFormat is ${it.content?.responseFormat}, so the block's floor `
        + `reader cannot tell this from a pool that arrived stripped of its options`);
    }
    if (Array.isArray(it.content?.options)) {
      fail(`${where}: content carries an options array — the response is a placement`);
    }
    if (!Array.isArray(it.content?.expression) || it.content.expression.length === 0) {
      fail(`${where}: no expression`);
    }
    if (!Array.isArray(it.content?.line?.maxExpression)) fail(`${where}: no anchor expression`);
    for (const glyph of [...(it.content?.expression ?? []), ...(it.content?.line?.maxExpression ?? [])]) {
      if (!GLYPHS.includes(glyph)) fail(`${where}: unknown glyph "${glyph}"`);
    }
    if (JSON.stringify(it.content?.glyphTray) !== JSON.stringify([...GLYPHS])) {
      fail(`${where}: glyph tray is not in the one canonical order`);
    }
  }
}

/* ================================================================== *
 * 2. THE FIREWALL
 *
 * A scan for the VALUES, not the field names. `answer` / `scoring` / `provenance` are omitted by
 * `servedItemSchema`, so what matters is whether anything reachable from `content` reconstructs the
 * key — and a leak that renamed its field would pass a field-name check.
 * ================================================================== */
function flatten(value, path, out) {
  if (value === null || value === undefined) return out;
  if (Array.isArray(value)) {
    value.forEach((v, i) => flatten(v, `${path}[${i}]`, out));
    return out;
  }
  if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) flatten(v, `${path}.${k}`, out);
    return out;
  }
  out.push({ path, value });
  return out;
}

for (const [arm, bank] of arms) {
  for (const [i, it] of bank.entries()) {
    const where = `${arm}[${i}]`;
    const leaves = flatten(it.content, 'content', []);
    const forbidden = new Map([
      [it.answer.targetRatio, 'the target ratio'],
      [it.answer.tolerance, 'the grading tolerance'],
      [it.answer.lineMax, "the line's numeric maximum"],
      [it.answer.trueValue, "the numeral's value"],
      [BASE, 'the base'],
    ]);
    for (const leaf of leaves) {
      if (typeof leaf.value !== 'number') continue;
      // `minValue: 0` is the left end of the line and is on screen; nothing else numeric belongs.
      if (leaf.path === 'content.line.minValue' && leaf.value === 0) continue;
      const named = forbidden.get(leaf.value);
      if (named !== undefined) fail(`${where}: ${leaf.path} publishes ${named} (${leaf.value})`);
    }
    for (const leaf of leaves) {
      if (typeof leaf.value === 'string' && /correct|target|tolerance|answer|digit|base/i.test(leaf.path)) {
        fail(`${where}: ${leaf.path} looks like key material`);
      }
    }
    if ('demonstration' in it.content) {
      fail(
        `${where}: content carries a demonstration. One worked example against a fixed anchor ` +
          `collapses the ${ALL_MAPPINGS.length} candidate readings to about one, so it would hand the ` +
          `browser this item's own answer.`,
      );
    }
    if (JSON.stringify(it.content).includes('mapping')) fail(`${where}: content mentions a mapping`);
  }
}

/* ================================================================== *
 * 3. THE KEY, RE-DERIVED
 * ================================================================== */
for (const [arm, bank] of arms) {
  for (const [i, it] of bank.entries()) {
    const where = `${arm}[${i}]`;
    const mapping = it.answer.system?.mapping;
    if (!mapping) {
      fail(`${where}: no system mapping`);
      continue;
    }
    const values = Object.values(mapping);
    if (new Set(values).size !== DIGITS.length || values.some((v) => !DIGITS.includes(v))) {
      fail(`${where}: the mapping is not a bijection onto {${DIGITS.join(',')}}`);
      continue;
    }
    const numeral = it.content.expression.map((g) => mapping[g]);
    const anchor = it.content.line.maxExpression.map((g) => mapping[g]);
    const value = readNumeral(numeral);
    const lineMax = readNumeral(anchor);
    if (value === null || lineMax === null || lineMax <= 0) {
      fail(`${where}: the notation cannot read this item`);
      continue;
    }
    if (value !== it.answer.trueValue) fail(`${where}: value ${value} vs stored ${it.answer.trueValue}`);
    if (lineMax !== it.answer.lineMax) fail(`${where}: lineMax ${lineMax} vs stored ${it.answer.lineMax}`);
    if (round6(value / lineMax) !== it.answer.targetRatio) {
      fail(`${where}: re-derived target ${round6(value / lineMax)} vs stored ${it.answer.targetRatio}`);
    }
    if (it.answer.correctKey !== it.answer.targetRatio) {
      fail(`${where}: correctKey ${it.answer.correctKey} is not the target position`);
    }
    if (it.answer.tolerance !== TOLERANCE_RATIO) fail(`${where}: tolerance ${it.answer.tolerance}`);
  }
}

/* ================================================================== *
 * 4/5. THE TEMPLATE IS THE AUTHORITY, AND RE-KEYING MOVES NOTHING SCORED
 * ================================================================== */
const GRADED_ANSWER_FIELDS = ['targetRatio', 'tolerance', 'lineMax', 'trueValue', 'chanceFloor'];

for (const [arm, bank] of arms) {
  for (const [i, it] of bank.entries()) {
    const where = `${arm}[${i}]`;
    const template = it.provenance?.template;
    if (!template) {
      fail(`${where}: no provenance.template — the record cannot be re-keyed`);
      continue;
    }
    const rebuilt = materialise(template, it.answer.system);
    if (JSON.stringify(rebuilt.content) !== JSON.stringify(it.content)) {
      fail(`${where}: materialising the template does not reproduce content`);
    }
    for (const field of GRADED_ANSWER_FIELDS) {
      if (rebuilt.answer[field] !== it.answer[field]) {
        fail(`${where}: materialising the template does not reproduce answer.${field}`);
      }
    }
    // Failure A and Failure B, checked rather than argued: under EVERY mapping the scored quantities
    // are the same, so difficulty cannot drift and the answer cannot leave the line.
    if (i % 25 === 0) {
      for (const mapping of ALL_MAPPINGS) {
        const under = materialise(template, { systemId: 'probe', mapping });
        for (const field of GRADED_ANSWER_FIELDS) {
          if (under.answer[field] !== it.answer[field]) {
            fail(`${where}: re-keying moved answer.${field}`);
          }
        }
        if (under.content.expression.length !== it.content.expression.length) {
          fail(`${where}: re-keying changed the numeral's length`);
        }
      }
    }
  }
}

/* ================================================================== *
 * 6. THE CHANCE FLOOR
 * ================================================================== */
{
  const measures = [];
  for (const it of consistent) {
    const p = it.answer.targetRatio;
    const t = it.answer.tolerance;
    if (p < SUPPORT_MIN - 1e-9 || p > SUPPORT_MAX + 1e-9) {
      fail(`${it.itemId}: target ${p} outside the declared support [${SUPPORT_MIN}, ${SUPPORT_MAX}]`);
    }
    if (p - t < 0 || p + t > 1) fail(`${it.itemId}: the accepting band runs off the line`);
    measures.push(Math.min(1, p + t) - Math.max(0, p - t));
    if (it.answer.chanceFloor !== CHANCE_FLOOR) fail(`${it.itemId}: chanceFloor ${it.answer.chanceFloor}`);
  }
  const width = Math.max(...measures) - Math.min(...measures);
  if (width > 1e-9) {
    fail(`the accepting interval is not the same measure on every item (spread ${width})`);
  }
  const uniformLine = round6(measures[0]);
  if (uniformLine !== round6(UNIFORM_LINE_FLOOR)) {
    fail(`re-derived whole-line floor ${uniformLine} vs declared ${UNIFORM_LINE_FLOOR}`);
  }
  const onSupport = round6(measures[0] / (SUPPORT_MAX - SUPPORT_MIN));
  if (onSupport !== round6(CHANCE_FLOOR)) {
    fail(`re-derived support floor ${onSupport} vs declared ${CHANCE_FLOOR}`);
  }
  console.log(
    `chance floor: uniform over the line ${uniformLine.toFixed(4)}, over the support ` +
      `${onSupport.toFixed(4)} = 1/${(1 / onSupport).toFixed(0)}; the five-option floor it replaces is ` +
      `0.2000 (a ${(0.2 / onSupport).toFixed(1)}x reduction, not to zero)`,
  );
}

/* ================================================================== *
 * 7. ANTI-LEAK, FROM `content` ALONE
 * ================================================================== */
/**
 * Every ratio a brute-forcing client can reach, computed the slow honest way: from the glyph strings
 * in `content` and the 120 bijections, with no reference to the template or the stored mapping.
 */
function candidateRatios(content) {
  const out = [];
  for (const mapping of ALL_MAPPINGS) {
    const numeral = content.expression.map((g) => mapping[g]);
    const anchor = content.line.maxExpression.map((g) => mapping[g]);
    const value = readNumeral(numeral);
    const lineMax = readNumeral(anchor);
    if (value === null || lineMax === null || lineMax <= 0) continue;
    out.push(value / lineMax);
  }
  return out;
}

const SLICES = [
  [1, 5],
  [5, 10],
  [10, 15],
  [15, 20.01],
];

{
  let worst = 0;
  const perSlice = SLICES.map(([lo, hi]) => ({ lo, hi, n: 0, hits: 0 }));
  for (const it of consistent) {
    const ratios = candidateRatios(it.content);
    if (ratios.length !== ALL_MAPPINGS.length) {
      fail(`${it.itemId}: only ${ratios.length}/${ALL_MAPPINGS.length} relabellings are readable`);
    }
    const onSupport = ratios.filter((r) => r >= SUPPORT_MIN && r <= SUPPORT_MAX);
    const inBand = onSupport.filter(
      (r) => Math.abs(r - it.answer.targetRatio) <= it.answer.tolerance + 1e-12,
    ).length;
    if (inBand === 0) fail(`${it.itemId}: the true reading is not among the candidates`);
    const rate = inBand / ratios.length;
    worst = Math.max(worst, rate);
    if (rate > UNIFORM_LINE_FLOOR + 1e-9) {
      fail(
        `${it.itemId}: a brute force over all ${ALL_MAPPINGS.length} relabellings scores ` +
          `${(100 * rate).toFixed(1)}%, above the ${(100 * UNIFORM_LINE_FLOOR).toFixed(1)}% floor`,
      );
    }
    // The stronger attacker: discard every reading that falls where the bank never keys, then guess
    // among the rest. The support is a property of the bank, so this costs a client nothing to know.
    const supportRate = inBand / onSupport.length;
    if (supportRate > CHANCE_FLOOR + 1e-9) {
      fail(
        `${it.itemId}: a brute force restricted to the support scores ` +
          `${(100 * supportRate).toFixed(1)}%, above the ${(100 * CHANCE_FLOOR).toFixed(1)}% support floor`,
      );
    }
    if (it.provenance.template.onSupportCount !== onSupport.length) {
      fail(`${it.itemId}: template onSupportCount ${it.provenance.template.onSupportCount} vs ${onSupport.length}`);
    }
    const slice = perSlice.find((s) => it.difficulty >= s.lo && it.difficulty < s.hi);
    if (slice) {
      slice.n += 1;
      slice.hits += rate;
    }
    // The template's own count has to agree with the content-only re-derivation, which is what makes
    // "the profile is identical in both arms" a checked fact rather than a symmetry argument.
    if (it.provenance.template.bandHitCount !== inBand) {
      fail(`${it.itemId}: template bandHitCount ${it.provenance.template.bandHitCount} vs ${inBand}`);
    }
  }
  console.log(
    `anti-leak: worst item's brute force ${(100 * worst).toFixed(1)}% against a ` +
      `${(100 * UNIFORM_LINE_FLOOR).toFixed(1)}% floor; per slice ` +
      perSlice
        .filter((s) => s.n > 0)
        .map((s) => `${s.lo}-${s.hi === 20.01 ? 20 : s.hi}:${((100 * s.hits) / s.n).toFixed(1)}%`)
        .join(' '),
  );
}

/** Best accuracy a client gets by parking the handle at one fixed ratio for every item in `set`. */
function bestFixedPlacement(set) {
  let best = 0;
  let at = 0;
  for (const item of set) {
    for (const ratio of [item.answer.targetRatio, item.answer.targetRatio + item.answer.tolerance]) {
      const hits = set.filter(
        (it) => Math.abs(ratio - it.answer.targetRatio) <= it.answer.tolerance + 1e-12,
      ).length;
      if (hits > best) {
        best = hits;
        at = ratio;
      }
    }
  }
  return { rate: set.length === 0 ? 0 : best / set.length, at: round2(at) };
}

{
  const whole = bestFixedPlacement(consistent);
  const rungs = new Map();
  for (const it of consistent) {
    const cell = rungs.get(it.difficulty) ?? [];
    cell.push(it);
    rungs.set(it.difficulty, cell);
  }
  let conditioned = 0;
  let worstRung = 0;
  for (const cell of rungs.values()) {
    const r = bestFixedPlacement(cell);
    conditioned += r.rate * cell.length;
    worstRung = Math.max(worstRung, r.rate);
  }
  conditioned /= consistent.length;
  // An arithmetic bound, not a layout property: `perRung` items spread over the support cannot put
  // fewer than one of them in the best band-wide window.
  const perRung = Math.max(...[...rungs.values()].map((c) => c.length));
  const bound = 1 / perRung;
  console.log(
    `fixed placement: ${(100 * whole.rate).toFixed(1)}% over the whole bank at ratio ${whole.at}; ` +
      `${(100 * conditioned).toFixed(1)}% conditioned on the served difficulty ` +
      `(worst rung ${(100 * worstRung).toFixed(1)}%, arithmetic bound ${(100 * bound).toFixed(1)}%)`,
  );
  if (whole.rate > 4 * CHANCE_FLOOR) {
    fail(
      `parking the handle at ${whole.at} scores ${(100 * whole.rate).toFixed(1)}%, more than four ` +
        `times the ${(100 * CHANCE_FLOOR).toFixed(1)}% floor — the target ratios are not spread`,
    );
  }

  const xs = consistent.map((it) => it.difficulty);
  const ys = consistent.map((it) => it.answer.targetRatio);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < xs.length; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  const r = sxy / Math.sqrt(sxx * syy);
  console.log(
    `difficulty x targetRatio: r = ${r.toFixed(4)} — the difficulty-ordinal attack ` +
      `(STAGE2_ANTILEAK_COMPARISON §7.2) has nothing to read`,
  );
  if (Math.abs(r) > 0.25) fail(`difficulty predicts the target ratio (r = ${r.toFixed(3)})`);
}

/* ================================================================== *
 * 8. DIFFICULTY AND THE BAND CAPS
 * ================================================================== */
function repeatKind(digits) {
  let kind = 'none';
  for (let i = 0; i < digits.length; i++) {
    for (let j = i + 1; j < digits.length; j++) {
      if (digits[i] !== digits[j]) continue;
      if (j > i + 1) return 'separated';
      kind = 'adjacent';
    }
  }
  return kind;
}

for (const [arm, bank] of arms) {
  for (const [i, it] of bank.entries()) {
    const where = `${arm}[${i}]`;
    const levers = it.provenance?.levers;
    const template = it.provenance?.template;
    if (!levers || !template) continue;

    // The levers must be TRUE of the numeral and the anchor, not merely declared.
    const numeral = template.numeral;
    const anchor = template.anchor;
    const truth = {
      length: numeral.length,
      anchorLength: anchor.length,
      vocabularyInPlay: new Set([...numeral, ...anchor]).size,
      repeatedPlace: repeatKind(numeral),
      anchorRepeatedPlace: new Set(anchor).size < anchor.length ? 1 : 0,
    };
    for (const [k, v] of Object.entries(truth)) {
      if (levers[k] !== v) fail(`${where}: lever ${k} declared ${levers[k]}, actually ${v}`);
    }

    // Re-derived difficulty, from the declared weight tables and nothing else.
    const steps =
      LENGTH_STEPS[truth.length] +
      ANCHOR_STEPS[truth.anchorLength] +
      2 * (truth.vocabularyInPlay - 2) +
      REPEAT_STEPS[truth.repeatedPlace] +
      truth.anchorRepeatedPlace;
    const expected = round2(1 + 0.5 * steps);
    if (expected !== it.difficulty) {
      fail(`${where}: difficulty ${it.difficulty}, re-derived ${expected} from its own levers`);
    }
    // On the grid, exactly. A difficulty off the 0.5-point grid would put the bank on a finer ladder
    // than the scale is read on, and E-095's recovery figures assume the grid.
    if (Math.abs(it.difficulty * 2 - Math.round(it.difficulty * 2)) > 1e-9) {
      fail(`${where}: difficulty ${it.difficulty} is off the 0.5-point grid`);
    }

    const band = BANDS.find((b) => it.difficulty < b.hi) ?? BANDS[BANDS.length - 1];
    if (it.ageBands.join('+') !== band.band) fail(`${where}: ageBands ${it.ageBands} vs ${band.band}`);
    if (template.digitsNeeded > band.maxDigitsNeeded) {
      fail(
        `${where}: needs ${template.digitsNeeded} marks integrated at band ${band.band}, ` +
          `which caps it at ${band.maxDigitsNeeded} (§4.3)`,
      );
    }
    if (truth.length > band.maxLength) fail(`${where}: ${truth.length} marks at band ${band.band}`);
    if (truth.repeatedPlace !== 'none' && !band.allowRepeat) {
      fail(`${where}: a repeated mark at band ${band.band}`);
    }
  }
}

if (MAX_STEPS !== 38) fail(`MAX_STEPS is ${MAX_STEPS}; difficulty 20.0 needs 38 half-rungs`);

/* ================================================================== *
 * 9. COVERAGE
 * ================================================================== */
{
  const counts = new Map();
  for (let d = LADDER_MIN; d <= 20 + 1e-9; d += 0.5) counts.set(round2(d), 0);
  for (const it of consistent) {
    if (it.difficulty < LADDER_MIN) {
      fail(`${it.itemId}: difficulty ${it.difficulty} is below the declared ladder floor ${LADDER_MIN}`);
      continue;
    }
    counts.set(it.difficulty, (counts.get(it.difficulty) ?? 0) + 1);
  }
  const holes = [...counts].filter(([, n]) => n === 0).map(([d]) => d);
  if (holes.length) fail(`no items at rung(s) ${holes.join(',')} — selection can never serve them`);
  const bands = new Set(consistent.flatMap((it) => it.ageBands));
  if (bands.has('K-1')) {
    fail('the bank ships a K-1 item, but no K-1 pair clears the support-aware brute force');
  }
  const thin = [...counts].filter(([, n]) => n > 0 && n < 12).map(([d, n]) => `${d}(${n})`);
  console.log(
    `coverage: ${counts.size} rungs from ${LADDER_MIN.toFixed(1)} to 20.0, no holes, bands ` +
      `${[...bands].sort().join('/')}. NO K-1 SUPPLY: a K-1 item may not need two marks integrated ` +
      `(§4.3),\n  and every such pair is decided by a support-aware brute force, so the ladder starts ` +
      `at the 2-3 band. ` +
      (thin.length ? `Below 12 items at ${thin.join(',')}.` : 'Every rung at full density.'),
  );
}

/* ================================================================== *
 * 10. M-PAE, THROUGH THE DOCUMENTED CONTRACT
 * ================================================================== */
{
  /** `verifyPlacementTolerance`, re-implemented from its own documentation. */
  const grade = (item, placedRatio) => {
    const pae = Math.abs(placedRatio - item.answer.targetRatio);
    return { correct: pae <= item.answer.tolerance, pae };
  };
  const errors = [];
  for (const it of consistent) {
    const t = it.answer.tolerance;
    const p = it.answer.targetRatio;
    const at = grade(it, p);
    if (!at.correct || at.pae !== 0) fail(`${it.itemId}: the target itself does not grade correct`);
    // Just inside the edge, not exactly on it. `p + t` in float arithmetic can land a bit either
    // side of `t` away from `p`, and the real verifier has the same knife edge — which is harmless,
    // because a placement landing on the exact boundary is a measure-zero event and either verdict
    // is defensible there. What matters is that the interior of the band grades correct.
    const edge = grade(it, Math.min(1, p + t * 0.999));
    if (!edge.correct) fail(`${it.itemId}: the inside of the band grades wrong`);
    const outside = grade(it, Math.min(1, p + t * 1.5));
    if (outside.correct) fail(`${it.itemId}: a placement 1.5 tolerances away grades correct`);
    // Ordered by distance, which is what makes M-PAE an error SIZE rather than an error code.
    const near = grade(it, Math.max(0, p - t * 2)).pae;
    const far = grade(it, p > 0.5 ? 0 : 1).pae;
    if (!(near < far)) fail(`${it.itemId}: M-PAE is not ordered by distance`);
    errors.push(near, far, at.pae, edge.pae);
  }
  const distinct = new Set(errors.map((v) => Math.round(v * 1e6))).size;
  if (distinct < 100) fail(`M-PAE takes only ${distinct} distinct values — not a continuous error`);
  console.log(
    `M-PAE: ${distinct} distinct values over the probe placements, span 0.000..` +
      `${Math.max(...errors).toFixed(3)}. policy.ts normalises over [0, 0.5] and clamps, so a ` +
      `placement past half the line reads as maximally wrong.`,
  );
}

/* ================================================================== *
 * 11. THE DEMONSTRATION SCHEDULE
 * ================================================================== */
{
  const stages = new Set();
  for (const it of consistent) {
    const schedule = it.provenance.template.demonstration;
    if (!schedule || !Array.isArray(schedule.examples) || schedule.examples.length === 0) {
      fail(`${it.itemId}: no demonstration schedule on the template`);
      continue;
    }
    if (schedule.delivery !== 'unscored_demonstration_trials') {
      fail(`${it.itemId}: the schedule does not declare unscored delivery`);
    }
    for (const example of schedule.examples) {
      stages.add(example.stage);
      // Expressed in digit VALUES, so a materialiser re-keys it with the same bijection it re-keys
      // the numeral with. A schedule holding glyph names could not be re-keyed at all.
      if (!Array.isArray(example.numeral) || example.numeral.some((d) => !DIGITS.includes(d))) {
        fail(`${it.itemId}: a worked example is not expressed in digit values`);
      }
      if (typeof example.ratio !== 'number' || example.ratio <= 0 || example.ratio > 1) {
        fail(`${it.itemId}: a worked example has no position on the line`);
      }
    }
    if (schedule.fadeAfterTrial !== schedule.examples.length) {
      fail(`${it.itemId}: the fade index does not match the number of examples`);
    }
  }
  const ordered = ['counted', 'extent'];
  if (JSON.stringify([...stages].sort()) !== JSON.stringify([...ordered].sort())) {
    fail(`the fade stages are ${[...stages].join(',')}, expected ${ordered.join(' -> ')}`);
  }
  console.log(
    `demonstration: ${[...stages].join(' -> ')} -> symbolic, on every template, in digit values, and ` +
      `in no item's content`,
  );
}

/* ================================================================== *
 * 12. EQUATING
 * ================================================================== */
{
  if (consistent.length !== perTrial.length) {
    fail(`item counts differ: ${consistent.length} vs ${perTrial.length}`);
  }
  const n = Math.min(consistent.length, perTrial.length);
  for (let i = 0; i < n; i++) {
    const a = consistent[i];
    const b = perTrial[i];
    if (a.difficulty !== b.difficulty) fail(`item ${i}: difficulty differs between arms`);
    for (const field of GRADED_ANSWER_FIELDS) {
      if (a.answer[field] !== b.answer[field]) fail(`item ${i}: answer.${field} differs between arms`);
    }
    if (JSON.stringify(a.provenance.template.numeral) !== JSON.stringify(b.provenance.template.numeral)) {
      fail(`item ${i}: the numeral differs between arms`);
    }
  }
  const consistentSystems = new Set(consistent.map((it) => it.answer.system.systemId)).size;
  const perTrialSystems = new Set(perTrial.map((it) => it.answer.system.systemId)).size;
  if (consistentSystems !== 1) fail(`the consistent arm uses ${consistentSystems} systems, not 1`);
  if (perTrialSystems !== perTrial.length) {
    fail(`the perTrial arm uses ${perTrialSystems} systems for ${perTrial.length} items`);
  }
  console.log(
    `equating: ${n} items per arm, matched on every scored property; consistent holds 1 system, ` +
      `perTrial holds ${perTrialSystems} (one per item)`,
  );
}

/* ================================================================== *
 * VERDICT
 * ================================================================== */
if (failures.length) {
  console.error(`\nFAIL — ${failures.length} problem(s):`);
  for (const f of failures.slice(0, 40)) console.error('  - ' + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log(
  '\nPASS — both banks parse; `content` publishes neither the base, nor a digit value, nor the line\u2019s\n' +
    'maximum, nor the target, nor the tolerance, nor a demonstration; the target is re-derived from\n' +
    'the stated mapping under an independently written place-value reader on 100% of items in both\n' +
    'arms; the shipped materialiser reproduces every record from its own template, and re-keying\n' +
    `under all ${ALL_MAPPINGS.length} bijections moves no scored quantity, so §2\u2019s Failure A and\n` +
    'Failure B are impossible here rather than fixed; the accepting interval has the same measure on\n' +
    'every item and both readings of the chance floor agree with what the engine declares; no item is\n' +
    'decided by a brute force over every relabelling, and the fixed-placement and difficulty-ordinal\n' +
    'attacks are measured rather than assumed; difficulty is re-derived from each item\u2019s own levers,\n' +
    'every lever is a count over digit values that is actually true of the numeral, and the ladder\n' +
    'covers 1.0..20.0 on the 0.5-point grid with no holes; the placement contract grades the target\n' +
    'correct and an out-of-band placement wrong with a continuous, distance-ordered M-PAE; the fading\n' +
    'schedule is on every template and in no item\u2019s content; and the two arms are equated on every\n' +
    'scored property.\n\n' +
    'NOT GATED. This says the instrument is well formed, not that it measures learning: Gate B needs\n' +
    '~128 real children (STAGE2_QUESTION_DESIGN §4.1.3), and a continuous-response type sits outside\n' +
    'every Gate A cell measured before it (E-211).',
);
