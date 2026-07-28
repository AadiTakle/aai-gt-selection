#!/usr/bin/env node
// GB-FILTER-01 - Star Filter structured bank generator (grammar, game-based delivery).
//
// Emits a JSONL bank of BankItem rows (research/exam-question-types/banks/GB-FILTER-01.jsonl)
// conforming to the item/result contract in docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md (2)
// and docs/architecture/EXAM_ITEM_SCHEMA_SPEC.md. Born-synthetic: syntheticOnly=true,
// validated=false. Deterministic given BASE_SEED.
//
// GAME-BASED / INTERACTIVE. Per PS_GAMEBASED_WARRANT.md the game is a DELIVERY layer over
// the `spatial` construct area, never an area of its own. Each bank item is one ARRAY: a
// cue (a named colour, or a colour+shape conjunction at the hard end), a set of shapes that
// flash on a grid, an exposure window and a retention delay. The child taps the cells that
// held cue-matching shapes and presses DONE. The valuable signal is the PROCESS: the ordered
// tap sequence (scan strategy), taps versus the number of targets, the pause before the
// first tap, and the de-selection rate.
//
// The key is COMPUTED, never guessed: the target set is DERIVED by applying the declared cue
// rule to the displayed array, and every level is provably solvable - the rule picks out a
// unique, non-empty set, no distractor satisfies it, and the exposure window clears a
// conservative encoding floor (>=110 ms per to-be-remembered target, >=300 ms absolute).
// From level 12 the cue is a CONJUNCTION and the array always contains both same-colour and
// same-shape lures, so the greedy single-feature strategy ("tap everything blue") provably
// over-selects: `answer.greedyExcess` records by how much.
//
// scoring.mode = 'computed_solver': the server replays the tap log against the array to
// derive hits, misses and false alarms (partial credit + signal-detection sensitivity),
// rather than matching one key. `answer.equivalence` makes tap ORDER irrelevant and ignores
// de-selected cells, so any route to the same final set scores identically.
//
// Usage:
//   node generators/GB-FILTER-01.mjs            # write bank
//   node generators/GB-FILTER-01.mjs --verify   # write bank + independent self-check
//
// Difficulty is a FLOAT 1..20 (a design rung, provisional; not calibrated). It rises via
// target count (memory load), distractor count (filter load), shorter exposure, longer
// retention delay, distractor-to-target similarity, and the switch to a conjunction cue
// that makes the single-feature greedy strategy wrong.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serializeBank } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../banks/GB-FILTER-01.jsonl');
const BASE_SEED = 20260724;
const TYPE_CODE = 'GB-FILTER-01';
const DOMAIN = 'spatial';
const DEMO_PATH = 'demos/GB-FILTER-01.html';
const GENERATOR_REF = 'GB-FILTER-01@1';

// ---------------------------------------------------------------------------
// Deterministic RNG (mulberry32) + string hashing.
// ---------------------------------------------------------------------------
function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function makeRng(seedStr) { return mulberry32(hashStr(seedStr)); }
function seededUuid(seedStr) {
  const b = new Uint8Array(16);
  let h = hashStr(seedStr);
  for (let i = 0; i < 16; i++) { h = (Math.imul(h ^ (h >>> 13), 0x5bd1e995) + i * 0x9e3779b1) >>> 0; b[i] = h & 0xff; }
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const hex = [...b].map(x => x.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
}

// ---------------------------------------------------------------------------
// Stimulus vocabulary. Colours carry a WORD label (the on-screen reading gate, D-017) and
// shape is always co-varied with colour so no cue depends on colour vision alone.
// `near` lists perceptually adjacent colours used as high-similarity distractors.
// ---------------------------------------------------------------------------
const COLORS = [
  { id: 'blue', label: 'BLUE', hex: '#3b6fd4', near: ['violet', 'teal'] },
  { id: 'red', label: 'RED', hex: '#d94a3d', near: ['orange', 'violet'] },
  { id: 'green', label: 'GREEN', hex: '#2e9e5b', near: ['teal', 'gold'] },
  { id: 'gold', label: 'GOLD', hex: '#dda219', near: ['orange', 'green'] },
  { id: 'violet', label: 'VIOLET', hex: '#7a4fc0', near: ['blue', 'red'] },
  { id: 'orange', label: 'ORANGE', hex: '#e2701e', near: ['red', 'gold'] },
  { id: 'teal', label: 'TEAL', hex: '#178f96', near: ['blue', 'green'] },
];
const SHAPES = [
  { id: 'star', label: 'STAR' },
  { id: 'moon', label: 'MOON' },
  { id: 'leaf', label: 'LEAF' },
  { id: 'drop', label: 'DROP' },
  { id: 'gem', label: 'GEM' },
  { id: 'bolt', label: 'BOLT' },
];
const colorById = (id) => COLORS.find(c => c.id === id);
const shapeById = (id) => SHAPES.find(s => s.id === id);

// Conservative encoding floor: a level is only offered if the exposure gives at least this
// much time per to-be-remembered target (visual-STM consolidation runs ~50 ms/item; 110 ms
// is deliberately generous so the ramp is loaded by filtering, not by raw perception).
const MS_PER_TARGET_FLOOR = 110;
const MS_ABSOLUTE_FLOOR = 300;
const MAX_FILL = 0.7;   // displayed items may occupy at most 70% of the grid cells

// ---------------------------------------------------------------------------
// Difficulty ramp: one hand-authored profile per level 1..20.
//   tgt/dis = memory load / filter load; exp = exposure ms; delay = retention ms
//   mode    = 'color' (single feature) or 'color_shape' (conjunction; greedy fails)
//   near    = distractor colours drawn from the cue colour's perceptual neighbours
// ---------------------------------------------------------------------------
const PROFILES = {
  1: { R: 3, C: 3, tgt: 1, dis: 1, exp: 2600, delay: 400, mode: 'color', near: 0 },
  2: { R: 3, C: 3, tgt: 1, dis: 2, exp: 2400, delay: 500, mode: 'color', near: 0 },
  3: { R: 3, C: 4, tgt: 2, dis: 2, exp: 2200, delay: 600, mode: 'color', near: 0 },
  4: { R: 3, C: 4, tgt: 2, dis: 3, exp: 2000, delay: 700, mode: 'color', near: 0 },
  5: { R: 4, C: 4, tgt: 2, dis: 4, exp: 1800, delay: 800, mode: 'color', near: 0 },
  6: { R: 4, C: 4, tgt: 3, dis: 4, exp: 1700, delay: 900, mode: 'color', near: 0 },
  7: { R: 4, C: 4, tgt: 3, dis: 5, exp: 1600, delay: 1000, mode: 'color', near: 1 },
  8: { R: 4, C: 5, tgt: 3, dis: 6, exp: 1500, delay: 1200, mode: 'color', near: 1 },
  9: { R: 4, C: 5, tgt: 4, dis: 6, exp: 1450, delay: 1400, mode: 'color', near: 1 },
  10: { R: 5, C: 5, tgt: 4, dis: 7, exp: 1400, delay: 1600, mode: 'color', near: 1 },
  11: { R: 5, C: 5, tgt: 4, dis: 8, exp: 1350, delay: 1800, mode: 'color', near: 1 },
  12: { R: 5, C: 5, tgt: 5, dis: 8, exp: 1300, delay: 2000, mode: 'color_shape', near: 0 },
  13: { R: 5, C: 6, tgt: 5, dis: 9, exp: 1250, delay: 2200, mode: 'color_shape', near: 0 },
  14: { R: 5, C: 6, tgt: 5, dis: 10, exp: 1200, delay: 2400, mode: 'color_shape', near: 1 },
  15: { R: 6, C: 6, tgt: 6, dis: 10, exp: 1150, delay: 2600, mode: 'color_shape', near: 1 },
  16: { R: 6, C: 6, tgt: 6, dis: 12, exp: 1100, delay: 2800, mode: 'color_shape', near: 1 },
  17: { R: 6, C: 6, tgt: 6, dis: 13, exp: 1050, delay: 3000, mode: 'color_shape', near: 1 },
  18: { R: 6, C: 6, tgt: 7, dis: 13, exp: 1000, delay: 3200, mode: 'color_shape', near: 1 },
  19: { R: 6, C: 7, tgt: 7, dis: 14, exp: 950, delay: 3400, mode: 'color_shape', near: 1 },
  20: { R: 6, C: 7, tgt: 8, dis: 15, exp: 900, delay: 3600, mode: 'color_shape', near: 1 },
};
const ITEMS_PER_LEVEL = 6;

function ageBandsForLevel(L) {
  if (L <= 3) return ['2-3'];
  if (L <= 7) return ['2-3', '4-5'];
  if (L <= 12) return ['4-5', '6-8'];
  return ['6-8'];
}

const RESPONSE_TAXONOMY = [
  { kind: 'exact_set', rationale: 'the final selection is exactly the cue-matching cells (correct)' },
  { kind: 'miss', rationale: 'a cue-matching cell was left unselected (memory-load failure)' },
  { kind: 'false_alarm_color_lure', rationale: 'selected a cell holding the cue colour but the wrong shape - the single-feature greedy strategy (conjunction levels only)' },
  { kind: 'false_alarm_shape_lure', rationale: 'selected a cell holding the cue shape in the wrong colour - feature-binding failure' },
  { kind: 'false_alarm_unrelated', rationale: 'selected a cell that matched the cue on neither feature - guessing or positional confusion' },
  { kind: 'empty_response', rationale: 'DONE pressed with nothing selected (non-response, not a filtering error)' },
];

// ---------------------------------------------------------------------------
// Build one item.
// ---------------------------------------------------------------------------
function pickIdx(rng, n) { return Math.floor(rng() * n); }
function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const cellKey = (p) => p[0] + ',' + p[1];

function matchesCue(item, cue) {
  return cue.mode === 'color_shape'
    ? (item.color === cue.color && item.shape === cue.shape)
    : (item.color === cue.color);
}

function buildItem(L, idx) {
  const seed = `${TYPE_CODE}|L${L}|#${idx}|${BASE_SEED}`;
  const rng = makeRng(seed);
  const prof = PROFILES[L];
  const R = prof.R, C = prof.C;

  const cueColor = COLORS[pickIdx(rng, COLORS.length)];
  const cueShape = SHAPES[pickIdx(rng, SHAPES.length)];
  const cue = prof.mode === 'color_shape'
    ? { mode: 'color_shape', color: cueColor.id, colorLabel: cueColor.label, colorHex: cueColor.hex, shape: cueShape.id, shapeLabel: cueShape.label }
    : { mode: 'color', color: cueColor.id, colorLabel: cueColor.label, colorHex: cueColor.hex };

  // Distractor colour pool: never the cue colour; biased to perceptual neighbours when the
  // profile asks for high similarity.
  const otherColors = COLORS.filter(c => c.id !== cueColor.id);
  const nearColors = cueColor.near.map(colorById).filter(Boolean);
  const distractorColor = () => (prof.near && nearColors.length && rng() < 0.75)
    ? nearColors[pickIdx(rng, nearColors.length)]
    : otherColors[pickIdx(rng, otherColors.length)];
  const otherShapes = SHAPES.filter(s => s.id !== cueShape.id);

  // Free cells, sampled without replacement.
  const cells = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) cells.push([r, c]);
  const pool = shuffle(cells, rng);
  const take = () => pool.pop();

  const stim = [];
  const targets = [];
  for (let i = 0; i < prof.tgt; i++) {
    const cell = take();
    const shape = prof.mode === 'color_shape' ? cueShape : SHAPES[pickIdx(rng, SHAPES.length)];
    stim.push({ r: cell[0], c: cell[1], color: cueColor.id, shape: shape.id });
    targets.push(cell);
  }
  // Distractors. In conjunction mode a fixed slice are single-feature lures, so the greedy
  // "tap the cue colour" and "tap the cue shape" strategies both provably over-select.
  let colorLures = 0, shapeLures = 0;
  for (let i = 0; i < prof.dis; i++) {
    const cell = take();
    if (!cell) break;
    let color, shape;
    if (prof.mode === 'color_shape') {
      const roll = i % 3;
      if (roll === 0) { color = cueColor; shape = otherShapes[pickIdx(rng, otherShapes.length)]; colorLures++; }
      else if (roll === 1) { color = distractorColor(); shape = cueShape; shapeLures++; }
      else { color = distractorColor(); shape = otherShapes[pickIdx(rng, otherShapes.length)]; }
    } else {
      color = distractorColor();
      shape = SHAPES[pickIdx(rng, SHAPES.length)];
    }
    stim.push({ r: cell[0], c: cell[1], color: color.id, shape: shape.id });
  }
  // Array order must not encode target status: reshuffle until the cue-matching entries are
  // not contiguous at either end of the list (unavoidable, and harmless, for tiny arrays).
  let display = shuffle(stim, rng);
  const leaksOrder = (arr) => {
    if (arr.length <= 3) return false;
    const idxs = arr.map((s, i) => (matchesCue(s, cue) ? i : -1)).filter(i => i >= 0);
    return idxs.every((v, i) => v === i) || idxs.every((v, i) => v === arr.length - idxs.length + i);
  };
  for (let t = 0; t < 60 && leaksOrder(display); t++) display = shuffle(display, rng);

  const derivedTargets = display.filter(s => matchesCue(s, cue)).map(s => [s.r, s.c]);
  derivedTargets.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const colorOnlyHits = display.filter(s => s.color === cue.color).map(s => [s.r, s.c]);
  const greedyExcess = colorOnlyHits.length - derivedTargets.length;

  const exposureMs = Math.max(prof.exp, MS_ABSOLUTE_FLOOR, MS_PER_TARGET_FLOOR * derivedTargets.length);
  const difficulty = Math.round((Math.min(20, Math.max(1, L + (rng() * 0.7 - 0.35)))) * 100) / 100;

  const content = {
    typeCode: TYPE_CODE,
    question: {
      mode: 'filter_and_report',
      prompt: cue.mode === 'color_shape'
        ? `Remember only the ${cue.colorLabel} ${cue.shapeLabel} shapes. When the shapes are gone, tap the cells where they were, then press DONE.`
        : `Remember only the ${cue.colorLabel} shapes. When the shapes are gone, tap the cells where they were, then press DONE.`,
      unit: 'taps',
    },
    grid: { R, C },
    cue,
    items: display.map(s => ({ r: s.r, c: s.c, color: s.color, shape: s.shape })),
    palette: COLORS.filter(c => display.some(s => s.color === c.id) || c.id === cue.color).map(c => ({ id: c.id, label: c.label, hex: c.hex })),
    timing: { cueMs: 1400, exposureMs, delayMs: prof.delay },
    optionKind: 'cell_set',
    metricParams: { planWindowMs: 2000 },
    scaffold: { warmup: L <= 2 },
  };
  const answer = {
    correctKey: derivedTargets.map(cellKey).join('|'),   // canonical sorted target-cell set
    targets: derivedTargets,
    nTargets: derivedTargets.length,
    nDistractors: display.length - derivedTargets.length,
    rule: cue.mode === 'color_shape' ? 'match_color_and_shape' : 'match_color',
    colorOnlyLures: colorLures,
    shapeOnlyLures: shapeLures,
    greedyExcess,                                        // cells a colour-only strategy over-taps
    relation: 'cue_rule_applied_to_displayed_array',
    equivalence: {
      rule: 'set_equality',
      detail: 'Only the FINAL selected set is scored: tap order is irrelevant, and a cell that was tapped and then de-selected does not count as a false alarm (it is logged as a revision instead).',
    },
    scoringRule: 'hits = |selected ∩ targets|; misses = |targets \\ selected|; falseAlarms = |selected \\ targets|; score = hits/nTargets penalised by falseAlarms/nNonTargetCells; sensitivity from the same counts.',
    metricSpec: {
      'M-PATH': 'count of primitive actions in response.actions (select/deselect/done) = scan-strategy signature length',
      'M-EFF': 'nTargets / max(response.cost.actual, nTargets), where cost.actual = total select+deselect taps',
      'M-PLANFUL': '0.5*min(1, response.firstActionLatencyMs / content.metricParams.planWindowMs) + 0.5*(1 - revisitRate); revisitRate = deselects / max(1, taps)',
      'M-EXPLORE': 'distinct grid cells touched by any tap / total grid cells',
      note: 'M-EFF is server-derived: the renderer never receives nTargets, so it emits response.cost.actual and the server divides. Accuracy metrics (M-ACC, M-DPRIME, M-FALSEALARM) are server-only by construction.',
    },
    distractorRationales: RESPONSE_TAXONOMY,
  };
  return {
    itemId: seededUuid(seed),
    typeCode: TYPE_CODE,
    domain: DOMAIN,
    difficulty,
    ageBands: ageBandsForLevel(L),
    demoPath: DEMO_PATH,
    content,
    answer,
    scoring: { mode: 'computed_solver' },
    provenance: { generator: 'grammar', generatorRef: GENERATOR_REF, seed, level: L, delivery: 'game' },
    syntheticOnly: true,
    validated: false,
  };
}

function generate() {
  const items = [];
  for (let L = 1; L <= 20; L++) for (let i = 0; i < ITEMS_PER_LEVEL; i++) items.push(buildItem(L, i));
  return items;
}

// ---------------------------------------------------------------------------
// Self-check (check-GB-FILTER-01.mjs re-derives everything again without importing this).
// ---------------------------------------------------------------------------
function verify(items) {
  let ok = 0, bad = 0; const problems = []; const bands = {};
  for (let L = 1; L <= 20; L++) bands[L] = 0;
  const seenIds = new Set();
  for (const it of items) {
    const req = ['itemId', 'typeCode', 'domain', 'difficulty', 'ageBands', 'demoPath', 'content', 'answer', 'scoring', 'provenance', 'syntheticOnly', 'validated'];
    for (const k of req) if (!(k in it)) problems.push(`${it.itemId}: missing ${k}`);
    if (seenIds.has(it.itemId)) problems.push(`${it.itemId}: duplicate itemId`);
    seenIds.add(it.itemId);
    if (it.syntheticOnly !== true || it.validated !== false) problems.push(`${it.itemId}: born-synthetic flags wrong`);
    if (it.scoring.mode !== 'computed_solver') problems.push(`${it.itemId}: scoring mode wrong`);
    const c = it.content, a = it.answer;
    for (const leak of ['targets', 'answer', 'nTargets', 'correctKey'])
      if (leak in c) problems.push(`${it.itemId}: content leaks ${leak}`);
    const re = c.items.filter(s => matchesCue(s, c.cue)).map(s => [s.r, s.c]).sort((x, y) => x[0] - y[0] || x[1] - y[1]);
    const reKey = re.map(cellKey).join('|');
    const cellsUsed = new Set(c.items.map(s => s.r + ',' + s.c));
    if (cellsUsed.size !== c.items.length) problems.push(`${it.itemId}: two shapes share a cell`);
    if (!re.length) problems.push(`${it.itemId}: no targets (unsolvable)`);
    if (c.items.length > MAX_FILL * c.grid.R * c.grid.C) problems.push(`${it.itemId}: array over-fills the grid`);
    if (c.timing.exposureMs < Math.max(MS_ABSOLUTE_FLOOR, MS_PER_TARGET_FLOOR * re.length)) problems.push(`${it.itemId}: exposure below the encoding floor`);
    if (reKey === a.correctKey) ok++;
    else { bad++; problems.push(`${it.itemId}: key ${a.correctKey} != re-derived ${reKey}`); }
    for (let L = 1; L <= 20; L++) if (it.difficulty >= L - 1 && it.difficulty <= L + 1) bands[L]++;
  }
  return { ok, bad, problems, bands };
}

function main() {
  const doVerify = process.argv.includes('--verify');
  const items = generate();
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, serializeBank(items));
  console.log(`[${TYPE_CODE}] wrote ${items.length} items -> ${OUT}`);
  const byMode = {}; for (const it of items) { const m = it.content.cue.mode; byMode[m] = (byMode[m] || 0) + 1; }
  console.log(`[${TYPE_CODE}] cue mode:`, JSON.stringify(byMode));
  const tg = items.map(it => it.answer.nTargets), ds = items.map(it => it.answer.nDistractors);
  console.log(`[${TYPE_CODE}] targets: min ${Math.min(...tg)}, max ${Math.max(...tg)} | distractors: min ${Math.min(...ds)}, max ${Math.max(...ds)}`);
  const ex = items.map(it => it.content.timing.exposureMs);
  console.log(`[${TYPE_CODE}] exposure ms: min ${Math.min(...ex)}, max ${Math.max(...ex)}`);
  const gx = items.filter(it => it.content.cue.mode === 'color_shape').map(it => it.answer.greedyExcess);
  console.log(`[${TYPE_CODE}] greedy excess on conjunction levels (colour-only over-taps): min ${Math.min(...gx)}, max ${Math.max(...gx)}`);

  const v = verify(items);
  let minBand = Infinity; const lines = [];
  for (let L = 1; L <= 20; L++) { lines.push(`  band ${String(L).padStart(2)} (+/-1pt): ${v.bands[L]}`); minBand = Math.min(minBand, v.bands[L]); }
  console.log(`[${TYPE_CODE}] key check (cue rule re-applied to the served array): ${v.ok} ok, ${v.bad} bad`);
  console.log(`[${TYPE_CODE}] coverage (min band count = ${minBand}, need >= ${ITEMS_PER_LEVEL}):`);
  if (doVerify) console.log(lines.join('\n'));
  if (v.problems.length) {
    console.error(`[${TYPE_CODE}] FAIL: ${v.problems.length} problem(s):`);
    v.problems.slice(0, 20).forEach(p => console.error('  - ' + p));
    process.exit(1);
  }
  if (minBand < ITEMS_PER_LEVEL) { console.error(`[${TYPE_CODE}] FAIL: coverage below ${ITEMS_PER_LEVEL} in some band`); process.exit(1); }
  console.log(`[${TYPE_CODE}] OK: every array solvable under its cue rule, key re-derived, encoding floor respected, coverage satisfied, born-synthetic.`);
}

main();
