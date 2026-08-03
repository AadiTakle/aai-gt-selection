// FLU-GRIDCOPY-01 "Copy the Change" — structured bank generator (Bucket A: grammar).
//
// Emits a STRUCTURED item bank (JSONL) conforming to EXAM_ADAPTIVE_BUILD_PLAN.md §2
// (BankItem) and EXAM_ITEM_SCHEMA_SPEC.md, following the FLU-MATRIX-01 reference
// vertical. Task (ARC-style, Chollet 2019): one or two worked input->output grid
// examples demonstrate a hidden transformation program; the child CONSTRUCTS the
// output for a new input by tapping cells.
//
// Governance: born-synthetic only (syntheticOnly:true, validated:false). The
// `difficulty` float is a DESIGN rung (program-complexity model), NOT a calibrated
// IRT parameter. The transformation program, the target grid and the near-miss
// taxonomy are SERVER-ONLY; `content` carries the worked examples and the probe
// input (the stimulus the child must generalise from) and never the answer.
//
// Difficulty derives from the type's declared difficulty_levers
// (master_types.jsonl FLU-GRIDCOPY-01):
//   transformation complexity (translate -> recolor -> reflect/rotate -> conditional)
//   | grid size and number of objects | one worked example vs several | number of
//   coordinated edits required | whether the examples imply a single plausible rule.
//
// BAND LADDER (2026-07 review, quoted verbatim: "for k-1, focus on translations.
// 2-3, make it multi-color. 4-5, add rotations. in 6-8, combine these different
// rules."). The transformation is therefore no longer chosen mechanically from
// whatever config happens to reach a difficulty bin: each grade band owns a
// transform family, and BANDS below maps the bands onto the shared 1..20 scale
// exactly as the improvement plan §4 does. Above level (16..20) is deliberately
// NOT banded — the review said nothing about it, so those bins keep drawing from
// the full config space they drew from before.
//
// ITEM-QUALITY INVARIANT (audited independently by check-FLU-GRIDCOPY-01.mjs):
//   the worked examples IDENTIFY the answer — every program in the audit space that
//   reproduces all shown examples produces the SAME output on the probe input. Per-cell
//   partial credit (M-POLY) is therefore fair.
//
// Run:  node research/exam-question-types/generators/FLU-GRIDCOPY-01.mjs
//       writes ../banks/FLU-GRIDCOPY-01.jsonl and prints a coverage summary.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serializeBank } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

/* ------------------------------------------------------------------ *
 * Cell alphabet: 0 = empty, 1..paletteSize = colour tokens (renderer maps
 * an index -> a colour + a redundant pattern, so colour is never the sole cue).
 * ------------------------------------------------------------------ */
export const PALETTE = ['blue', 'coral', 'gold'];

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
 * GRID + TRANSFORM SEMANTICS
 * ================================================================== */
export const serialize = (g) => g.map((r) => r.join('')).join('/');
const eqGrid = (a, b) => serialize(a) === serialize(b);
const blank = (R, C) => Array.from({ length: R }, () => Array.from({ length: C }, () => 0));
export const hamming = (a, b) => {
  let d = 0;
  for (let r = 0; r < a.length; r++) for (let c = 0; c < a[0].length; c++) if (a[r][c] !== b[r][c]) d++;
  return d;
};
// Cheapest number of taps to turn `from` into `to` when a tap cycles a cell
// 0 -> 1 -> ... -> paletteSize -> 0. This (not the cell difference count) is the
// fair denominator for the server's efficiency metric.
export const minTaps = (from, to, states) => {
  let t = 0;
  for (let r = 0; r < from.length; r++)
    for (let c = 0; c < from[0].length; c++) t += (to[r][c] - from[r][c] + states) % states;
  return t;
};

export function applyOp(g, op) {
  const R = g.length,
    C = g[0].length;
  const n = blank(R, C);
  if (op.op === 'shift') {
    for (let r = 0; r < R; r++)
      for (let c = 0; c < C; c++) {
        const sr = r - op.dy,
          sc = c - op.dx;
        n[r][c] = sr >= 0 && sr < R && sc >= 0 && sc < C ? g[sr][sc] : 0;
      }
    return n;
  }
  if (op.op === 'reflectH') {
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) n[r][c] = g[r][C - 1 - c];
    return n;
  }
  if (op.op === 'reflectV') {
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) n[r][c] = g[R - 1 - r][c];
    return n;
  }
  if (op.op === 'rot180') {
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) n[r][c] = g[R - 1 - r][C - 1 - c];
    return n;
  }
  if (op.op === 'recolor') {
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) n[r][c] = g[r][c] === op.from ? op.to : g[r][c];
    return n;
  }
  if (op.op === 'shiftColor') {
    // Conditional/relational: ONLY cells of op.color move; the rest stay put.
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) n[r][c] = g[r][c] === op.color ? 0 : g[r][c];
    for (let r = 0; r < R; r++)
      for (let c = 0; c < C; c++) {
        if (g[r][c] !== op.color) continue;
        const tr = r + op.dy,
          tc = c + op.dx;
        if (tr >= 0 && tr < R && tc >= 0 && tc < C) n[tr][tc] = op.color;
      }
    return n;
  }
  throw new Error(`unknown op ${op.op}`);
}
export const applyProgram = (g, program) => program.reduce((acc, op) => applyOp(acc, op), g);

// Audit space: every program the examples must rule out. Enumerated from the
// documented op set (all single ops plus all ordered two-step compositions).
export function auditPrograms(paletteSize) {
  const singles = [];
  for (const dx of [-1, 0, 1])
    for (const dy of [-1, 0, 1]) if (dx || dy) singles.push({ op: 'shift', dx, dy });
  singles.push({ op: 'reflectH' }, { op: 'reflectV' }, { op: 'rot180' });
  for (let a = 1; a <= paletteSize; a++)
    for (let b = 1; b <= paletteSize; b++) if (a !== b) singles.push({ op: 'recolor', from: a, to: b });
  for (let col = 1; col <= paletteSize; col++)
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) singles.push({ op: 'shiftColor', color: col, dx, dy });
  const programs = singles.map((s) => [s]);
  for (const a of singles) for (const b of singles) programs.push([a, b]);
  return programs;
}

/* ================================================================== *
 * DIFFICULTY MODEL — from the type's difficulty_levers. Grounded in the
 * abstraction-and-reasoning paradigm (Chollet 2019: difficulty tracks the
 * description length of the program that must be induced) and the
 * worked-example/completion literature (Renkl & Atkinson 2003: a second
 * example lowers induction load). Mapped onto a FLOAT 1..20 rung.
 * ================================================================== */
export const PROGRAM_TEMPLATES = {
  shift: { load: 1.2, minPalette: 1 },
  reflectH: { load: 2.0, minPalette: 1 },
  reflectV: { load: 2.2, minPalette: 1 },
  rot180: { load: 2.8, minPalette: 1 },
  recolor: { load: 1.6, minPalette: 2 },
  shiftColor: { load: 3.4, minPalette: 2 },
  'shift+recolor': { load: 1.2 + 1.6 + 1.0, minPalette: 2 },
  'reflectH+recolor': { load: 2.0 + 1.6 + 1.0, minPalette: 2 },
  'rot180+recolor': { load: 2.8 + 1.6 + 1.0, minPalette: 2 },
  'shift+shiftColor': { load: 1.2 + 3.4 + 1.0, minPalette: 2 },
  'shiftColor+recolor': { load: 3.4 + 1.6 + 1.0, minPalette: 2 },
  // The 6-8 combination: a turn plus a colour-conditional slide, so one program
  // carries all three of the families the earlier bands introduced separately.
  'rot180+shiftColor': { load: 2.8 + 3.4 + 1.0, minPalette: 2 },
};
export const GRIDS = [
  { rows: 3, cols: 3 },
  { rows: 3, cols: 4 },
  { rows: 4, cols: 4 },
  { rows: 4, cols: 5 },
  { rows: 5, cols: 5 },
];
const gridTerm = (rows, cols) => 0.22 * (rows * cols - 9);
const exampleTerm = (exampleCount) => (exampleCount >= 2 ? 0 : 1.4); // one example => induce from less
const colorTerm = (paletteSize) => 0.8 * (paletteSize - 1);
const DENSITY_SPAN = 3.0; // objects / coordinated-edit load contributes 0..3.0
const densityTerm = (density) => DENSITY_SPAN * density;

function baseScore({ programKey, rows, cols, exampleCount, paletteSize }) {
  return (
    1.0 + PROGRAM_TEMPLATES[programKey].load + gridTerm(rows, cols) + exampleTerm(exampleCount) + colorTerm(paletteSize)
  );
}

export const ALLOWED_CONFIGS = (() => {
  const out = [];
  for (const programKey of Object.keys(PROGRAM_TEMPLATES))
    for (const g of GRIDS)
      for (const exampleCount of [1, 2])
        for (let paletteSize = 1; paletteSize <= 3; paletteSize++) {
          if (paletteSize < PROGRAM_TEMPLATES[programKey].minPalette) continue;
          out.push({ programKey, rows: g.rows, cols: g.cols, exampleCount, paletteSize });
        }
  return out;
})();

/* ================================================================== *
 * BAND LADDER — which transformation each grade band gets.
 *
 * `lo`/`hi` are the improvement-plan §4 windows on the 1..20 scale. `serves`
 * is the reviewer's sentence for that band, expressed over the lever config:
 * an item cannot land in a band unless the program it applies belongs there.
 * Above level carries `serves: null`, i.e. no restriction: the review's
 * above-level row is a proposal, not an instruction, so nothing here decides it.
 * ================================================================== */
export const BANDS = [
  // "for k-1, focus on translations" — one slide, one colour.
  { band: 'K-1', lo: 1, hi: 4, serves: (c) => c.programKey === 'shift' && c.paletteSize === 1 },
  // "2-3, make it multi-color" — the same slide over a multi-colour grid.
  { band: '2-3', lo: 4, hi: 8, serves: (c) => c.programKey === 'shift' && c.paletteSize >= 2 },
  // "4-5, add rotations" — the turn replaces the slide.
  { band: '4-5', lo: 8, hi: 12, serves: (c) => c.programKey === 'rot180' && c.paletteSize >= 2 },
  // "in 6-8, combine these different rules" — turn + colour-conditional slide.
  { band: '6-8', lo: 12, hi: 16, serves: (c) => c.programKey === 'rot180+shiftColor' },
  { band: 'above-level', lo: 16, hi: 20, serves: null },
];

/** The band whose window contains an integer difficulty bin. */
export function bandForBin(k) {
  return BANDS.find((b) => k <= b.hi) ?? BANDS[BANDS.length - 1];
}

const ALL_BASES = ALLOWED_CONFIGS.map(baseScore);
const RAW_MIN = Math.min(...ALL_BASES) + densityTerm(0);
const RAW_MAX = Math.max(...ALL_BASES) + densityTerm(1);

export function difficultyFromLevers(cfg, density) {
  const raw = baseScore(cfg) + densityTerm(density);
  return clamp(1 + ((raw - RAW_MIN) * 19) / (RAW_MAX - RAW_MIN), 1, 20);
}
function solveDensity(cfg, targetD) {
  const rawNeeded = RAW_MIN + ((targetD - 1) * (RAW_MAX - RAW_MIN)) / 19;
  return clamp((rawNeeded - baseScore(cfg)) / DENSITY_SPAN, 0, 1);
}

/* ================================================================== *
 * GRAMMAR — instantiate a program, sample grids, audit identifiability.
 * ================================================================== */
const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
function instantiate(programKey, paletteSize, rng) {
  const dir = () => DIRS[Math.floor(rng() * DIRS.length)];
  const colour = () => 1 + Math.floor(rng() * paletteSize);
  const pair = () => {
    const from = colour();
    let to = 1 + Math.floor(rng() * paletteSize);
    if (to === from) to = (from % paletteSize) + 1;
    return { from, to };
  };
  const one = (kind) => {
    if (kind === 'shift') {
      const [dx, dy] = dir();
      return { op: 'shift', dx, dy };
    }
    if (kind === 'reflectH') return { op: 'reflectH' };
    if (kind === 'reflectV') return { op: 'reflectV' };
    if (kind === 'rot180') return { op: 'rot180' };
    if (kind === 'recolor') return { op: 'recolor', ...pair() };
    if (kind === 'shiftColor') {
      const [dx, dy] = dir();
      return { op: 'shiftColor', color: colour(), dx, dy };
    }
    throw new Error(`unknown template ${kind}`);
  };
  return programKey.split('+').map(one);
}

// Seeded grid with a target number of filled cells; every colour appears at least
// once (so a colour-conditional rule is always demonstrable).
function sampleGrid(rows, cols, fillCount, paletteSize, rng) {
  const cells = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push([r, c]);
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  const g = blank(rows, cols);
  const n = clamp(fillCount, Math.max(1, paletteSize), rows * cols - 1);
  for (let i = 0; i < n; i++) {
    const [r, c] = cells[i];
    g[r][c] = i < paletteSize ? i + 1 : 1 + Math.floor(rng() * paletteSize);
  }
  return g;
}

// The examples must IDENTIFY the answer: every audit program consistent with all
// shown examples must predict the same probe output.
function identifies(examples, probeInput, target, paletteSize) {
  const consistent = auditPrograms(paletteSize).filter((p) =>
    examples.every((ex) => eqGrid(applyProgram(ex.input, p), ex.output)),
  );
  if (!consistent.length) return false;
  return consistent.every((p) => eqGrid(applyProgram(probeInput, p), target));
}

// Plausible wrong constructions, keyed to the rule-application error they encode.
function nearMisses(program, probeInput, target) {
  const out = [];
  const add = (grid, lure, note) => {
    if (eqGrid(grid, target)) return;
    const key = serialize(grid);
    if (out.some((o) => o.key === key)) return;
    out.push({ key, lure, note });
  };
  add(probeInput, 'identity_copy', 'copied the input unchanged: no rule applied');
  if (program.length === 2) {
    add(applyProgram(probeInput, [program[0]]), 'first_step_only', 'applied only the first step of a two-step rule');
    add(applyProgram(probeInput, [program[1]]), 'second_step_only', 'applied only the second step of a two-step rule');
  }
  for (let i = 0; i < program.length; i++) {
    const op = program[i];
    const swap = (replacement, lure, note) => {
      const p = program.slice();
      p[i] = replacement;
      add(applyProgram(probeInput, p), lure, note);
    };
    if (op.op === 'shift') swap({ op: 'shift', dx: -op.dx, dy: -op.dy }, 'wrong_direction', 'moved the shapes the opposite way');
    if (op.op === 'shiftColor') {
      swap({ op: 'shiftColor', color: op.color, dx: -op.dx, dy: -op.dy }, 'wrong_direction', 'moved the chosen colour the opposite way');
      swap({ op: 'shift', dx: op.dx, dy: op.dy }, 'unconditional_apply', 'moved every shape instead of only the chosen colour');
    }
    if (op.op === 'reflectH') swap({ op: 'reflectV' }, 'axis_confusion', 'flipped top-to-bottom instead of left-to-right');
    if (op.op === 'reflectV') swap({ op: 'reflectH' }, 'axis_confusion', 'flipped left-to-right instead of top-to-bottom');
    if (op.op === 'rot180') swap({ op: 'reflectH' }, 'axis_confusion', 'flipped instead of turning the grid around');
    if (op.op === 'recolor') swap({ op: 'recolor', from: op.to, to: op.from }, 'colour_swap_reversed', 'recoloured in the wrong direction');
  }
  return out;
}

/**
 * Generate ONE structured BankItem.
 * @param {{programKey,rows,cols,exampleCount,paletteSize,demandDensity,seed}} lever
 */
export function genItem({ programKey, rows, cols, exampleCount, paletteSize, demandDensity, seed }) {
  const rng = makeRng(seed);
  const area = rows * cols;
  const fill = clamp(Math.round((0.2 + 0.35 * demandDensity) * area), Math.max(1, paletteSize), area - 1);

  let built = null;
  for (let attempt = 0; attempt < 120 && !built; attempt++) {
    const program = instantiate(programKey, paletteSize, rng);
    const examples = [];
    let ok = true;
    for (let e = 0; e < exampleCount && ok; e++) {
      const input = sampleGrid(rows, cols, fill, paletteSize, rng);
      const output = applyProgram(input, program);
      if (eqGrid(input, output)) ok = false; // an example that shows nothing teaches nothing
      else examples.push({ input, output });
    }
    if (!ok) continue;
    const probeInput = sampleGrid(rows, cols, fill, paletteSize, rng);
    const target = applyProgram(probeInput, program);
    if (eqGrid(probeInput, target)) continue; // the child must make at least one edit
    if (examples.some((ex) => eqGrid(ex.input, probeInput))) continue; // probe must be new
    if (!identifies(examples, probeInput, target, paletteSize)) continue;
    built = { program, examples, probeInput, target };
  }
  if (!built) throw new Error(`could not build an identifiable ${programKey} item (seed ${seed})`);

  const { program, examples, probeInput, target } = built;
  const distractorRationales = {};
  for (const nm of nearMisses(program, probeInput, target)) {
    distractorRationales[nm.key] = { lure: nm.lure, note: nm.note };
  }

  const cfg = { programKey, rows, cols, exampleCount, paletteSize };
  const difficulty = round2(difficultyFromLevers(cfg, demandDensity));

  return {
    itemId: seededUuid(seed),
    typeCode: 'FLU-GRIDCOPY-01',
    domain: 'fluid_reasoning',
    difficulty, // FLOAT 1..20 — DESIGN rung, not calibrated (validated:false)
    ageBands: ageBandsFor(difficulty),
    demoPath: 'demos/FLU-GRIDCOPY-01.html',
    content: {
      typeCode: 'FLU-GRIDCOPY-01',
      rows,
      cols,
      paletteSize,
      palette: PALETTE.slice(0, paletteSize), // cell 0 = empty; 1..n index this list
      exampleCount,
      examples, // worked input -> output pairs (the rule is never stated)
      probeInput, // the new input the child transforms
      // The editable grid starts as a copy of probeInput; a tap cycles a cell
      // 0 -> 1 -> ... -> paletteSize -> 0.
      editable: { rows, cols, initFrom: 'probeInput', cycleStates: paletteSize + 1 },
    },
    answer: {
      // Constructed response: the key is the serialized target grid, re-derivable by
      // running `program` on probeInput (scoring.mode = computed_solver).
      correctKey: serialize(target),
      targetGrid: target,
      program,
      editsRequired: hamming(probeInput, target), // cells that must differ (M-POLY base)
      minTaps: minTaps(probeInput, target, paletteSize + 1), // optimal tap count (M-EFF base)
      distractorRationales, // keyed by serialized near-miss grid -> error taxonomy
    },
    scoring: { mode: 'computed_solver' },
    provenance: {
      generator: 'grammar',
      generatorRef: 'flu-gridcopy-01-grammar@1',
      seed,
      levers: {
        programKey,
        rows,
        cols,
        exampleCount,
        paletteSize,
        // Full precision (not rounded): enables exact, reproducible regeneration.
        demandDensity,
      },
    },
    syntheticOnly: true,
    validated: false,
  };
}

// Age band, read straight off the §4 window the item's difficulty falls in — the
// bands are no longer overlapping targeting hints, because since the 2026-07 review
// the band decides which transformation the item applies (BANDS above), and an item
// cannot be two transform families at once. K-1 is served (translation only, single
// colour); the pre-review K-1 exclusion still holds for every heavier family, which
// is exactly what the ladder enforces.
//
// Above level (16..20) reports as `6-8`: the item schema's band vocabulary stops
// there (`ageBandSchema`, packages/contracts), so above-level means "the top of the
// 6-8 ladder", not a fifth band.
export function ageBandsFor(difficulty) {
  if (difficulty < 4) return ['K-1'];
  if (difficulty < 8) return ['2-3'];
  if (difficulty < 12) return ['4-5'];
  return ['6-8'];
}

/* ================================================================== *
 * BANK BUILDER — fill each integer difficulty bin k=1..20 with >=perBin items
 * (BUILD_PLAN §0: >=5 per +/-1 pt band, gradual 1..20). Items in a bin spread
 * across reachable program/grid/example configs; object density is the
 * continuous fine-positioner within a bin.
 * ================================================================== */
export function buildBank({ perBin = 6 } = {}) {
  const items = [];
  for (let k = 1; k <= 20; k++) {
    // The bin is clipped to its band's window as well as to +/-0.45, so an item
    // can never carry a transform from the band next door on a boundary bin.
    const band = bandForBin(k);
    const lo = Math.max(1, band.lo, k - 0.45);
    const hi = Math.min(20, band.hi, k + 0.45);
    const allowed = band.serves ? ALLOWED_CONFIGS.filter(band.serves) : ALLOWED_CONFIGS;

    const segments = [];
    for (const cfg of allowed) {
      const a = Math.max(lo, difficultyFromLevers(cfg, 0));
      const b = Math.min(hi, difficultyFromLevers(cfg, 1));
      if (b > a + 1e-6) segments.push({ cfg, tLo: a, tHi: b });
    }
    if (segments.length === 0)
      throw new Error(`no reachable ${band.band} lever config for difficulty bin k=${k}`);

    const stride = Math.max(1, Math.floor(segments.length / perBin));
    const hits = segments.map(() => 0);
    for (let i = 0; i < perBin; i++) hits[(i * stride) % segments.length]++;
    const localSeen = segments.map(() => 0);

    for (let i = 0; i < perBin; i++) {
      const segIdx = (i * stride) % segments.length;
      const seg = segments[segIdx];
      const li = localSeen[segIdx]++;
      const t = seg.tLo + (seg.tHi - seg.tLo) * ((li + 0.5) / hits[segIdx]);
      const density = solveDensity(seg.cfg, t);
      const c = seg.cfg;
      const seed = `FLU-GRIDCOPY-01|bin=${k}|i=${i}|${c.programKey}|${c.rows}x${c.cols}|E${c.exampleCount}|P${c.paletteSize}`;
      items.push(genItem({ ...c, demandDensity: density, seed }));
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
  const outPath = resolve(__dirname, '../banks/FLU-GRIDCOPY-01.jsonl');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, serializeBank(items));

  const bins = Array.from({ length: 20 }, () => 0);
  let min = Infinity;
  let max = -Infinity;
  for (const it of items) {
    const k = Math.round(it.difficulty);
    if (k >= 1 && k <= 20) bins[k - 1]++;
    min = Math.min(min, it.difficulty);
    max = Math.max(max, it.difficulty);
  }
  console.log(`FLU-GRIDCOPY-01 bank: ${items.length} items -> ${outPath}`);
  console.log(`difficulty span: ${round2(min)} .. ${round2(max)}  (target 1..20)`);
  console.log('per-bin counts (k: n):');
  console.log(bins.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join('  '));
  const short = bins.map((n, i) => ({ k: i + 1, n })).filter((b) => b.n < 5);
  console.log(short.length ? `SHORT BINS (<5): ${short.map((b) => b.k).join(',')}` : 'all bins >=5 OK');
}
