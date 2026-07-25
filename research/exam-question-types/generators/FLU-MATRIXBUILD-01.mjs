// FLU-MATRIXBUILD-01 "Build the Tile" — structured bank generator (Bucket A: grammar).
//
// Emits a STRUCTURED item bank (JSONL) conforming to EXAM_ADAPTIVE_BUILD_PLAN.md §2
// (BankItem) and EXAM_ITEM_SCHEMA_SPEC.md. Unlike FLU-MATRIX-01 (pick one of N),
// this type is CONSTRUCTIVE: the child BUILDS the missing tile by setting each
// governed attribute, so the response is an attribute vector, not an option key.
// Scoring is therefore `computed_solver`: the server re-derives the blank by
// inducing the unique rule per attribute from the VISIBLE cells and compares the
// constructed vector under a declared equivalence rule (per-attribute partial
// credit -> M-POLY / M-RULEID).
//
// Rule taxonomy (Carpenter, Just & Shell 1990 RPM rule set, restricted to rules
// that are INDUCIBLE from the visible grid alone):
//   categorical (shape,color): row_constant | col_constant | latin (distribution)
//   numeric (count):           row_constant | col_constant | latin | progression |
//                              arithmetic_add | arithmetic_sub
// Every generated item is verified to be RULE-IDENTIFIABLE: of all rules in the
// taxonomy consistent with the visible cells, every one predicts the same blank
// value. Ambiguous configurations are rejected at generation time.
//
// Governance: born-synthetic only (syntheticOnly:true, validated:false). The
// `difficulty` float is a DESIGN rung (relational-complexity model), NOT a
// calibrated IRT parameter. The answer key, the canonical solution and the
// picker-lure taxonomy are server-only and never placed in `content`.
//
// Run:  node research/exam-question-types/generators/FLU-MATRIXBUILD-01.mjs
//       writes ../banks/FLU-MATRIXBUILD-01.jsonl and prints a coverage summary.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/* ------------------------------------------------------------------ *
 * Attribute space (mirrors demos/FLU-MATRIXBUILD-01.html rendering grammar).
 * Shapes are ordered by ABSTRACTNESS (namable -> abstract); the perceptual-load
 * lever slides a window along this list. Colors are NAMED TOKENS; the renderer
 * maps a token -> hex AND a distinct outline dash, so an item is never decided
 * by hue alone (construct-irrelevant risk: color vision).
 * ------------------------------------------------------------------ */
export const SHAPES = ['circle', 'square', 'triangle', 'star', 'hexagon', 'pentagon', 'kite', 'drop', 'cross'];
export const COLORS = ['coral', 'teal', 'blue', 'gold', 'violet', 'ink'];
export const ATTR_ORDER = ['shape', 'color', 'count'];
export const CATEGORICAL_RULES = ['row_constant', 'col_constant', 'latin'];
export const COUNT_RULES = ['row_constant', 'col_constant', 'latin', 'progression', 'arithmetic_add', 'arithmetic_sub'];
const SHAPE_WINDOW = 6; // distinct shapes available to one item (grid values + lures)

export class AmbiguousItemError extends Error {}

/* ------------------------------------------------------------------ *
 * Seeded RNG (xmur3 -> mulberry32) for reproducible, born-synthetic content.
 * ------------------------------------------------------------------ */
function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}
function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function makeRng(seed) {
  return mulberry32(xmur3(seed)());
}
function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function seededUuid(seed) {
  const rng = makeRng('uuid|' + seed);
  const hex = [];
  for (let i = 0; i < 32; i++) hex.push(Math.floor(rng() * 16).toString(16));
  hex[12] = '4';
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const h = hex.join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const round2 = (x) => Math.round(x * 100) / 100;

/* ================================================================== *
 * DIFFICULTY MODEL — derived from the type's declared difficulty_levers
 * (master_types.jsonl FLU-MATRIXBUILD-01): grid size 2x2->3x3 | number of
 * attributes to construct 1..3 | rule type constant->progression->distribution
 * ->arithmetic | abstractness of shapes | count range for the numeric attribute.
 * Grounded in relational-complexity theory (Halford 1998): cost is set by how
 * many relations must be bound at once, plus the induction cost of each rule.
 * Raw score is mapped linearly onto a FLOAT 1..20 rung (gradual ramp §0).
 * ================================================================== */
const ATTR_BASE = { shape: 1.0, color: 1.05, count: 1.2 };
const RULE_LOAD = {
  row_constant: 1.0,
  col_constant: 1.15,
  latin: 1.9,
  progression: 2.2,
  arithmetic_add: 2.8,
  arithmetic_sub: 3.0,
};
const gridTerm = (gridSize) => (gridSize === 2 ? 0.0 : 2.4);
const interactionTerm = (nAttrs) => 1.1 * (nAttrs - 1);
const countRangeTerm = (attrRules, countMax) =>
  attrRules.some((a) => a.attr === 'count') ? 0.35 * (countMax - 3) : 0;
// One continuous fine-positioner: PERCEPTUAL LOAD drives both shape abstractness
// (window slide) and picker breadth/lure similarity (how many near-miss values
// sit in each picker). Continuous in the difficulty model; it changes the
// rendered item at documented thresholds.
const LOAD_SPAN = 3.4;
const loadTerm = (perceptualLoad) => LOAD_SPAN * perceptualLoad;

function rulesLoad(attrRules) {
  return attrRules.reduce((s, a) => s + ATTR_BASE[a.attr] + RULE_LOAD[a.rule], 0);
}
function rawScore(gridSize, attrRules, countMax, perceptualLoad) {
  return (
    1.0 +
    gridTerm(gridSize) +
    rulesLoad(attrRules) +
    interactionTerm(attrRules.length) +
    countRangeTerm(attrRules, countMax) +
    loadTerm(perceptualLoad)
  );
}
// Bounds of the DECLARED design space (every legal config at both ends of the
// continuous lever) -> fixed 1..20 anchors, so an item's difficulty is a stable
// per-item property and not dependent on which items happen to be in the bank.
const RAW_MIN = Math.min(...allConfigs().map((c) => rawScore(c.gridSize, c.attrRules, c.countMax, 0)));
const RAW_MAX = Math.max(...allConfigs().map((c) => rawScore(c.gridSize, c.attrRules, c.countMax, 1)));
export function difficultyFromLevers(gridSize, attrRules, countMax, perceptualLoad) {
  const raw = rawScore(gridSize, attrRules, countMax, perceptualLoad);
  return clamp(1 + ((raw - RAW_MIN) * 19) / (RAW_MAX - RAW_MIN), 1, 20);
}
// Invert: perceptual load that lands a fixed config on targetD.
function solveLoad(gridSize, attrRules, countMax, targetD) {
  const rawNeeded = RAW_MIN + ((targetD - 1) * (RAW_MAX - RAW_MIN)) / 19;
  const base = rawScore(gridSize, attrRules, countMax, 0);
  return clamp((rawNeeded - base) / LOAD_SPAN, 0, 1);
}

// Age-band targeting hint. This type's declared bands are 2-3 | 4-5 | 6-8 (K-1 is
// served by the selection-based FLU-MATRIX-01: constructing a tile exceeds K-1
// working-memory/fine-motor limits per the spec's age_rationale).
export function ageBandsFor(difficulty) {
  const bands = [];
  if (difficulty < 8.5) bands.push('2-3');
  if (difficulty >= 7.5 && difficulty < 12.5) bands.push('4-5');
  if (difficulty >= 11.5) bands.push('6-8');
  if (bands.length === 0) bands.push(difficulty < 8 ? '2-3' : '6-8');
  return bands;
}

/* ================================================================== *
 * GRAMMAR — build the value grid for one attribute under one rule.
 * Every rule below is inducible from the visible cells alone (no hidden
 * alphabet ordering is required to predict the blank).
 * ================================================================== */
function categoricalGrid(rule, G, alphabet) {
  const v = [];
  for (let r = 0; r < G; r++) {
    const row = [];
    for (let c = 0; c < G; c++) {
      if (rule === 'row_constant') row.push(alphabet[r]);
      else if (rule === 'col_constant') row.push(alphabet[c]);
      else row.push(alphabet[(r + c) % G]); // latin / distribution-of-G
    }
    v.push(row);
  }
  return v;
}
function pickDistinct(pool, n, rng) {
  const s = shuffle(pool, rng);
  if (s.length < n) throw new AmbiguousItemError('not enough distinct values');
  return s.slice(0, n);
}
function countGrid(rule, G, countMax, rng) {
  const all = Array.from({ length: countMax }, (_, i) => i + 1);
  if (rule === 'row_constant' || rule === 'col_constant' || rule === 'latin') {
    const vals = pickDistinct(all, G, rng);
    const v = [];
    for (let r = 0; r < G; r++) {
      const row = [];
      for (let c = 0; c < G; c++) {
        if (rule === 'row_constant') row.push(vals[r]);
        else if (rule === 'col_constant') row.push(vals[c]);
        else row.push(vals[(r + c) % G]);
      }
      v.push(row);
    }
    return v;
  }
  if (rule === 'progression') {
    // Row r runs start[r], start[r]+1, ... ; distinct starts keep rows non-identical
    // and push the total distinct-value count above G (which is what makes the
    // progression distinguishable from a distribution/latin reading).
    const maxStart = countMax - (G - 1);
    if (maxStart < G) throw new AmbiguousItemError(`progression needs countMax >= ${2 * G - 1}`);
    const starts = pickDistinct(
      Array.from({ length: maxStart }, (_, i) => i + 1),
      G,
      rng,
    );
    return starts.map((s) => Array.from({ length: G }, (_, c) => s + c));
  }
  // arithmetic: third column = first (+/-) second. Requires 3 columns.
  if (G !== 3) throw new AmbiguousItemError('arithmetic rules require a 3x3 grid');
  const add = rule === 'arithmetic_add';
  const pairs = [];
  for (let a = 1; a <= countMax; a++)
    for (let b = 1; b <= countMax; b++) {
      const res = add ? a + b : a - b;
      if (res >= 1 && res <= countMax) pairs.push([a, b, res]);
    }
  const chosen = [];
  for (const p of shuffle(pairs, rng)) {
    // Distinct (a,b) rows, and never two rows with the same result-pair signature.
    if (chosen.some((q) => q[0] === p[0] && q[1] === p[1])) continue;
    chosen.push(p);
    if (chosen.length === 3) break;
  }
  if (chosen.length < 3) throw new AmbiguousItemError('not enough arithmetic rows in range');
  return chosen.map((p) => p.slice());
}

/* ================================================================== *
 * RULE IDENTIFIABILITY — of every rule in the taxonomy that is consistent with
 * the VISIBLE cells, all must predict the same blank value. This is the
 * schema-spec `unique_answer` property for a constructed response: the child
 * (and the server solver) can reach exactly one defensible tile.
 * ================================================================== */
export function consistentPredictions(kind, grid, G) {
  // grid: G x G values with grid[G-1][G-1] === null (the blank).
  const out = [];
  const visible = (r, c) => !(r === G - 1 && c === G - 1);
  const rowVals = (r) => grid[r].filter((_, c) => visible(r, c));
  const colVals = (c) => grid.map((row, r) => (visible(r, c) ? row[c] : null)).filter((x) => x !== null);

  // row_constant: every row's visible values agree.
  if (grid.every((_, r) => rowVals(r).every((x) => x === rowVals(r)[0]))) {
    out.push({ rule: 'row_constant', prediction: rowVals(G - 1)[0] });
  }
  // col_constant: every column's visible values agree.
  if (Array.from({ length: G }, (_, c) => c).every((c) => colVals(c).every((x) => x === colVals(c)[0]))) {
    out.push({ rule: 'col_constant', prediction: colVals(G - 1)[0] });
  }
  // latin / distribution: each row and column holds each of exactly G values once;
  // the blank is the value missing from its row, which must equal the one missing
  // from its column.
  const seen = new Set();
  for (let r = 0; r < G; r++) for (let c = 0; c < G; c++) if (visible(r, c)) seen.add(grid[r][c]);
  if (seen.size === G) {
    const distinctRows = Array.from({ length: G }, (_, r) => new Set(rowVals(r)).size === rowVals(r).length);
    const distinctCols = Array.from({ length: G }, (_, c) => new Set(colVals(c)).size === colVals(c).length);
    if (distinctRows.every(Boolean) && distinctCols.every(Boolean)) {
      const alphabet = [...seen];
      const missRow = alphabet.filter((v) => !rowVals(G - 1).includes(v));
      const missCol = alphabet.filter((v) => !colVals(G - 1).includes(v));
      if (missRow.length === 1 && missCol.length === 1 && missRow[0] === missCol[0])
        out.push({ rule: 'latin', prediction: missRow[0] });
    }
  }
  if (kind === 'numeric') {
    // progression: a single non-zero step along every row.
    const steps = new Set();
    let ok = true;
    for (let r = 0; r < G && ok; r++) {
      const vals = rowVals(r);
      for (let c = 0; c + 1 < vals.length; c++) steps.add(vals[c + 1] - vals[c]);
    }
    if (steps.size === 1) {
      const step = [...steps][0];
      if (step !== 0) {
        const lastRow = rowVals(G - 1);
        out.push({ rule: 'progression', prediction: lastRow[lastRow.length - 1] + step });
      }
    }
    // arithmetic (3 columns only): third = first +/- second on every complete row.
    if (G === 3) {
      const complete = [0, 1];
      if (complete.every((r) => grid[r][0] + grid[r][1] === grid[r][2]))
        out.push({ rule: 'arithmetic_add', prediction: grid[G - 1][0] + grid[G - 1][1] });
      if (complete.every((r) => grid[r][0] - grid[r][1] === grid[r][2]))
        out.push({ rule: 'arithmetic_sub', prediction: grid[G - 1][0] - grid[G - 1][1] });
    }
  }
  return out;
}
function assertIdentifiable(kind, grid, G, expected, attr) {
  const preds = consistentPredictions(kind, grid, G);
  if (preds.length === 0) throw new AmbiguousItemError(`${attr}: no taxonomy rule fits the visible cells`);
  const values = new Set(preds.map((p) => p.prediction));
  if (values.size !== 1)
    throw new AmbiguousItemError(
      `${attr}: visible cells admit conflicting rules (${preds.map((p) => `${p.rule}->${p.prediction}`).join(', ')})`,
    );
  if ([...values][0] !== expected)
    throw new AmbiguousItemError(`${attr}: induced ${[...values][0]} but grammar intended ${expected}`);
  return preds.map((p) => p.rule);
}

/* ================================================================== *
 * PICKERS — the child constructs, so the "distractors" are the wrong VALUES
 * offered in each attribute picker. Perceptual load sets how many of them are
 * rule-keyed near misses (row/column repetition, operation confusion, off-by-one)
 * versus obviously off-pattern values.
 * ================================================================== */
const ATTR_KEY_PREFIX = { shape: 'S', color: 'C', count: 'N' };

function nearLuresFor(attr, rule, valueGrid, G, correct, pool) {
  const lures = [];
  const push = (value, lure, note) => {
    if (value === undefined || value === null) return;
    if (value === correct) return;
    if (!pool.includes(value)) return;
    if (lures.some((l) => l.value === value)) return;
    lures.push({ value, lure, note });
  };
  const leftOfBlank = valueGrid[G - 1][G - 2];
  const aboveBlank = valueGrid[G - 2][G - 1];
  push(leftOfBlank, 'row_repeat', 'copies the cell to the left instead of applying the row rule');
  push(aboveBlank, 'column_repeat', 'copies the cell above instead of applying the column rule');
  if (attr === 'count') {
    const a = valueGrid[G - 1][0];
    const b = G === 3 ? valueGrid[G - 1][1] : null;
    if (rule === 'arithmetic_add') push(a - b, 'operation_confusion', 'subtracts the row pair instead of adding it');
    if (rule === 'arithmetic_sub') push(a + b, 'operation_confusion', 'adds the row pair instead of subtracting it');
    push(correct - 1, 'off_by_one', 'counts one short of the derived value');
    push(correct + 1, 'off_by_one', 'counts one over the derived value');
  } else {
    for (let r = 0; r < G; r++)
      push(valueGrid[r][0], 'distribution_slip', 'a value used elsewhere in the grid but wrong for this cell');
  }
  return lures;
}

function buildPicker(attr, rule, valueGrid, G, correct, pool, nOptions, nNear, rng) {
  const near = nearLuresFor(attr, rule, valueGrid, G, correct, pool);
  const inGrid = new Set();
  for (let r = 0; r < G; r++) for (let c = 0; c < G; c++) if (valueGrid[r][c] != null) inGrid.add(valueGrid[r][c]);
  const far = pool.filter((v) => v !== correct && !near.some((l) => l.value === v) && !inGrid.has(v));
  const alsoFar = pool.filter((v) => v !== correct && !near.some((l) => l.value === v) && inGrid.has(v));

  const chosen = [{ value: correct, lure: 'correct', note: 'satisfies the rule induced from the row and the column' }];
  for (const l of near.slice(0, Math.min(nNear, nOptions - 1))) chosen.push(l);
  for (const v of far) {
    if (chosen.length >= nOptions) break;
    chosen.push({ value: v, lure: 'off_pattern', note: 'never appears in the grid; violates the row and column rules' });
  }
  for (const v of alsoFar) {
    if (chosen.length >= nOptions) break;
    chosen.push({ value: v, lure: 'grid_value_other', note: 'appears in the grid but not derivable for this cell' });
  }
  for (const l of near) {
    if (chosen.length >= nOptions) break;
    if (!chosen.some((x) => x.value === l.value)) chosen.push(l);
  }
  if (chosen.length < 3) throw new AmbiguousItemError(`${attr}: fewer than 3 picker values available`);
  return shuffle(chosen, rng);
}

/* ================================================================== *
 * ITEM BUILDER
 * ================================================================== */
const MAX_ATTEMPTS = 8;

/**
 * Generate ONE structured BankItem. Some value draws inside a legal config are
 * ambiguous (e.g. a 2x2 count progression whose two rows happen to read as a
 * distribution); the attempt loop re-draws with a derived sub-seed so the item
 * stays exactly reproducible from (levers, seed) while rejecting those draws.
 * @param {{gridSize:number, attrRules:{attr:string,rule:string}[], countMax:number,
 *          perceptualLoad:number, seed:string}} lever
 */
export function genItem(lever) {
  let lastErr = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      return genItemAttempt(lever, attempt);
    } catch (e) {
      if (!(e instanceof AmbiguousItemError)) throw e;
      lastErr = e;
    }
  }
  throw new AmbiguousItemError(`no identifiable item after ${MAX_ATTEMPTS} draws: ${lastErr.message}`);
}

function genItemAttempt({ gridSize, attrRules, countMax, perceptualLoad, seed }, attempt) {
  const G = gridSize;
  const rng = makeRng(attempt === 0 ? seed : `${seed}#draw${attempt}`);
  const rules = ATTR_ORDER.filter((a) => attrRules.some((x) => x.attr === a)).map((a) => ({
    attr: a,
    rule: attrRules.find((x) => x.attr === a).rule,
  }));
  if (rules.length === 0 || rules.length > 3) throw new AmbiguousItemError('1..3 constructed attributes required');
  if (G === 2 && rules.length > 2) throw new AmbiguousItemError('2x2 carries at most 2 constructed attributes');

  const p = clamp(perceptualLoad, 0, 1);
  // Shape abstractness window slides with perceptual load (documented threshold map).
  const winStart = Math.round(p * (SHAPES.length - SHAPE_WINDOW));
  const shapePool = SHAPES.slice(winStart, winStart + SHAPE_WINDOW);
  const colorPool = COLORS.slice();
  const countPool = Array.from({ length: countMax }, (_, i) => i + 1);
  const POOL = { shape: shapePool, color: colorPool, count: countPool };

  // Value grid per constructed attribute + fixed value for the others.
  const valueGrids = {};
  for (const { attr, rule } of rules) {
    if (attr === 'count') valueGrids.count = countGrid(rule, G, countMax, rng);
    else valueGrids[attr] = categoricalGrid(rule, G, pickDistinct(POOL[attr], G, rng));
  }
  const fixed = {};
  for (const attr of ATTR_ORDER) {
    if (valueGrids[attr]) continue;
    if (attr === 'count') fixed.count = 1;
    else fixed[attr] = shuffle(POOL[attr], rng)[0];
  }

  // Assemble the rendered matrix (blank at bottom-right) and the canonical answer.
  const cells = [];
  for (let r = 0; r < G; r++) {
    const row = [];
    for (let c = 0; c < G; c++) {
      if (r === G - 1 && c === G - 1) {
        row.push(null);
        continue;
      }
      row.push({
        shape: valueGrids.shape ? valueGrids.shape[r][c] : fixed.shape,
        color: valueGrids.color ? valueGrids.color[r][c] : fixed.color,
        count: valueGrids.count ? valueGrids.count[r][c] : fixed.count,
      });
    }
    cells.push(row);
  }

  // Identifiability: hide the blank, then confirm the taxonomy yields one answer.
  const canonical = {};
  const inducedRules = {};
  for (const { attr, rule } of rules) {
    const full = valueGrids[attr];
    const expected = full[G - 1][G - 1];
    const masked = full.map((row, r) => row.map((v, c) => (r === G - 1 && c === G - 1 ? null : v)));
    inducedRules[attr] = assertIdentifiable(attr === 'count' ? 'numeric' : 'categorical', masked, G, expected, attr);
    canonical[attr] = expected;
  }

  // Pickers + server-only lure taxonomy.
  const nOptions = clamp(3 + Math.round(p * 3), 3, 6);
  const nNear = clamp(Math.round(p * (nOptions - 1)), 0, nOptions - 1);
  const pickers = [];
  const distractorRationales = {};
  const correctOptionKeys = {};
  for (const { attr, rule } of rules) {
    const masked = valueGrids[attr].map((row, r) => row.map((v, c) => (r === G - 1 && c === G - 1 ? null : v)));
    const pool = POOL[attr];
    const capped = Math.min(nOptions, pool.length);
    const chosen = buildPicker(attr, rule, masked, G, canonical[attr], pool, capped, nNear, rng);
    const options = chosen.map((o, i) => ({ key: `${ATTR_KEY_PREFIX[attr]}${i + 1}`, value: o.value }));
    chosen.forEach((o, i) => {
      const key = options[i].key;
      distractorRationales[key] = { attribute: attr, value: o.value, lure: o.lure, note: o.note };
      if (o.lure === 'correct') correctOptionKeys[attr] = key;
    });
    pickers.push({ attribute: attr, options });
  }

  const constructedAttributes = rules.map((r) => r.attr);
  const correctKey = constructedAttributes.map((a) => `${a}=${canonical[a]}`).join('|');
  const difficulty = round2(difficultyFromLevers(G, rules, countMax, p));

  return {
    itemId: seededUuid(seed),
    typeCode: 'FLU-MATRIXBUILD-01',
    domain: 'fluid_reasoning',
    difficulty, // FLOAT 1..20 — DESIGN rung, not calibrated (validated:false)
    ageBands: ageBandsFor(difficulty),
    demoPath: 'demos/FLU-MATRIXBUILD-01.html',
    content: {
      typeCode: 'FLU-MATRIXBUILD-01',
      prompt: promptFor(constructedAttributes),
      gridSize: G,
      constructedAttributes, // which pickers the renderer shows (NOT the rules)
      fixedAttributes: fixed, // values held constant across the whole grid
      matrix: {
        rows: G,
        cols: G,
        cells, // row-major; blank cell is null
        blank: { row: G - 1, col: G - 1 },
      },
      pickers, // display order; renderable subset (key + value only)
      countRange: valueGrids.count ? { min: 1, max: countMax } : null,
      responseSpec: { kind: 'constructed_tile', attributes: constructedAttributes },
    },
    answer: {
      correctKey, // canonical constructed vector, e.g. "shape=kite|count=4"
      canonical, // same vector as typed values
      correctOptionKeys, // which picker option carries each canonical value
      inducedRules, // taxonomy rules consistent with the visible cells (all agree)
      equivalence: {
        rule: 'attribute_vector_exact',
        attributes: constructedAttributes,
        keyFormat: 'attr=value pairs joined by "|" in the order shape,color,count',
        normalization: 'categorical values trimmed + lowercased; count parsed as an integer',
        ignoreAttributesNotListed: true,
        partialCredit: { unit: 'attribute', scorePerAttribute: 1, maxScore: constructedAttributes.length },
      },
      distractorRationales, // keyed by picker option key -> lure taxonomy
    },
    scoring: {
      mode: 'computed_solver',
      solver: {
        id: 'flu-matrixbuild-01-rule-induction@1',
        deterministic: true,
        reproducibleFrom: 'content.matrix.cells',
        method:
          'for each constructed attribute, keep every rule in {row_constant,col_constant,latin,progression,arithmetic_add,arithmetic_sub} consistent with the visible cells; all agree on one blank value; compare it to the submitted value',
        partialCredit: true,
        maxScore: constructedAttributes.length,
      },
    },
    provenance: {
      generator: 'grammar',
      generatorRef: 'flu-matrixbuild-01-grammar@1',
      seed,
      drawIndex: attempt, // which re-draw of the seed produced an identifiable item
      levers: {
        gridSize: G,
        attrRules: rules.map((r) => ({ ...r })),
        attributeCount: rules.length,
        countMax,
        // Full precision (not rounded): enables exact, reproducible regeneration.
        perceptualLoad: p,
      },
    },
    syntheticOnly: true,
    validated: false,
  };
}

// On-screen instruction text. Reading is a REQUIRED baseline-literacy gate
// (D-017): text only, never audio, and it never names the rule.
function promptFor(attrs) {
  const parts = { shape: 'the shape', color: 'the color', count: 'how many' };
  const list = attrs.map((a) => parts[a]);
  const joined = list.length === 1 ? list[0] : list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1];
  return `Build the missing tile. Choose ${joined} so the empty cell follows the same pattern as its row and its column, then press the check.`;
}

/* ================================================================== *
 * CONFIG SPACE + BANK BUILDER — fill each integer difficulty bin k=1..20 with
 * >=perBin items (BUILD_PLAN §0: >=5 per +/-1 pt band, gradual 1..20).
 * Configs that cannot produce a rule-identifiable item are dropped up front.
 * ================================================================== */
export function allConfigs() {
  const out = [];
  const attrSets = [
    ['shape'],
    ['color'],
    ['count'],
    ['shape', 'color'],
    ['shape', 'count'],
    ['color', 'count'],
    ['shape', 'color', 'count'],
  ];
  for (const gridSize of [2, 3]) {
    for (const attrs of attrSets) {
      if (gridSize === 2 && attrs.length > 2) continue;
      const options = attrs.map((a) => (a === 'count' ? COUNT_RULES : CATEGORICAL_RULES).map((rule) => ({ attr: a, rule })));
      const combos = options.reduce((acc, list) => acc.flatMap((pre) => list.map((x) => [...pre, x])), [[]]);
      for (const attrRules of combos) {
        // Two attributes under the SAME rule co-vary one-to-one, which makes the
        // second attribute free once the first is derived (no added relational
        // load). Require distinct rules so every constructed attribute is an
        // independent relation the child must bind.
        const used = new Set(attrRules.map((r) => r.rule));
        if (used.size !== attrRules.length) continue;
        const countMaxes = attrs.includes('count') ? [3, 4, 5] : [3];
        for (const countMax of countMaxes) out.push({ gridSize, attrRules, countMax });
      }
    }
  }
  return out;
}
export function validConfigs() {
  return allConfigs().filter((cfg) => {
    // A config is usable only if it yields an identifiable item at both ends of
    // the continuous lever (load changes the picker/shape pools, not the rules).
    for (const p of [0, 0.5, 1]) {
      try {
        genItem({ ...cfg, perceptualLoad: p, seed: `probe|${JSON.stringify(cfg)}|${p}` });
      } catch (e) {
        if (e instanceof AmbiguousItemError) return false;
        throw e;
      }
    }
    return true;
  });
}

export function buildBank({ perBin = 6 } = {}) {
  const configs = validConfigs();
  const items = [];
  for (let k = 1; k <= 20; k++) {
    const lo = Math.max(1, k - 0.45);
    const hi = Math.min(20, k + 0.45);

    const segments = [];
    for (const cfg of configs) {
      const dLo = difficultyFromLevers(cfg.gridSize, cfg.attrRules, cfg.countMax, 0);
      const dHi = difficultyFromLevers(cfg.gridSize, cfg.attrRules, cfg.countMax, 1);
      const a = Math.max(lo, dLo);
      const b = Math.min(hi, dHi);
      if (b > a + 1e-6) segments.push({ ...cfg, tLo: a, tHi: b });
    }
    if (segments.length === 0) throw new Error(`no reachable lever config for difficulty bin k=${k}`);

    // Spread across distinct configs first (variety), then within each segment.
    const stride = Math.max(1, Math.floor(segments.length / perBin));
    const picked = [];
    for (let i = 0; i < perBin; i++) picked.push(segments[(i * stride) % segments.length]);

    const localSeen = new Map();
    for (let i = 0; i < perBin; i++) {
      const seg = picked[i];
      const sig = `G${seg.gridSize}|${seg.attrRules.map((r) => r.attr + ':' + r.rule).join(',')}|M${seg.countMax}`;
      const li = localSeen.get(sig) || 0;
      localSeen.set(sig, li + 1);
      const nHits = picked.filter(
        (s) => `G${s.gridSize}|${s.attrRules.map((r) => r.attr + ':' + r.rule).join(',')}|M${s.countMax}` === sig,
      ).length;
      const t = seg.tLo + (seg.tHi - seg.tLo) * ((li + 0.5) / nHits);
      const perceptualLoad = solveLoad(seg.gridSize, seg.attrRules, seg.countMax, t);
      const seed = `FLU-MATRIXBUILD-01|bin=${k}|i=${i}|${sig}`;
      items.push(genItem({ gridSize: seg.gridSize, attrRules: seg.attrRules, countMax: seg.countMax, perceptualLoad, seed }));
    }
  }
  return items;
}

/* ------------------------------------------------------------------ *
 * CLI entrypoint: write the bank + print a coverage summary.
 * ------------------------------------------------------------------ */
function isMain() {
  return process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
}
if (isMain()) {
  const perBin = Number(process.env.PER_BIN || 6);
  const items = buildBank({ perBin });
  const outPath = resolve(__dirname, '../banks/FLU-MATRIXBUILD-01.jsonl');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, items.map((it) => JSON.stringify(it)).join('\n') + '\n');

  const bins = Array.from({ length: 20 }, () => 0);
  let min = Infinity;
  let max = -Infinity;
  for (const it of items) {
    const k = Math.round(it.difficulty);
    if (k >= 1 && k <= 20) bins[k - 1]++;
    min = Math.min(min, it.difficulty);
    max = Math.max(max, it.difficulty);
  }
  console.log(`FLU-MATRIXBUILD-01 bank: ${items.length} items -> ${outPath}`);
  console.log(`usable lever configs: ${validConfigs().length} of ${allConfigs().length}`);
  console.log(`difficulty span: ${round2(min)} .. ${round2(max)}  (target 1..20)`);
  console.log('per-bin counts (k: n):');
  console.log(bins.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join('  '));
  const short = bins.map((n, i) => ({ k: i + 1, n })).filter((b) => b.n < 5);
  console.log(short.length ? `SHORT BINS (<5): ${short.map((b) => b.k).join(',')}` : 'all bins >=5 OK');
}
