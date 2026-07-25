// WM-corsi-01 "Firefly Trail" — structured bank generator (Bucket A: grammar).
//
// Emits a STRUCTURED item bank (JSONL) conforming to EXAM_ADAPTIVE_BUILD_PLAN.md §2
// (BankItem). WORKING-MEMORY family: the "item" is a TIMED PRESENTATION SCHEDULE,
// not a static stimulus, and difficulty is span length x manipulation x
// presentation rate x field size.
//
// Governance: born-synthetic only (syntheticOnly:true, validated:false). The
// `difficulty` float is a DESIGN rung (span-capacity model), NOT a calibrated IRT
// parameter (EXAM_ITEM_SCHEMA_SPEC §6.6, RES-012/RES-013).
//
// CONSTRUCT NOTE (span tasks): a span stimulus INHERENTLY contains its own target
// (the flash order IS the answer). The renderer-side separation is therefore
// structural, not informational: `content.presentation` is consumed only by the
// presentation phase and sealed away before recall; `content.responsePhase` is the
// ONLY object the recall UI reads, and it carries no cell identities. The expected
// tap order lives in `answer` (server-only). The recall phase is UNTIMED so the
// score reflects working memory, not motor or reading speed.
//
// Run:  node research/exam-question-types/generators/WM-corsi-01.mjs
//       writes ../banks/WM-corsi-01.jsonl and prints a coverage summary.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serializeBank } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

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
 * DIFFICULTY MODEL — from the type's declared difficulty_levers
 * (master_types.jsonl WM-corsi-01):
 *   sequence length | forward vs backward | presentation rate | grid size.
 *
 * Grounded in: Cowan (2001) capacity ~4 chunks (span is the dominant term),
 * Baddeley & Hitch (1974) forward/backward storage-vs-manipulation dissociation
 * (backward adds a central-executive reordering load), and Kessels et al. (2000)
 * Corsi standardisation (field size and pace set encoding demand).
 *
 * SPAN is the coarse rung; PACE is the continuous fine-positioner inside a rung.
 * ================================================================== */

export const SPAN_MIN = 2;
export const SPAN_MAX = 9;
const SPAN_STEP = 1.9; // cognitive cost of each extra element to hold in order
const BACKWARD_LOAD = 2.6; // reordering the stored trail (manipulation, not storage)
const GRID4_LOAD = 1.2; // 4x4 field: less chunkable, more spatial candidates
const PACE_SPAN = 2.0; // rate pressure contributes 0..2.0
const PACE_SLOW_MS = 1000; // easiest per-element pace
const PACE_FAST_MS = 400; // hardest per-element pace

// pacePressure q in [0,1] -> per-element pace in ms (q=0 slowest / easiest).
export function paceMsFromPressure(q) {
  return PACE_SLOW_MS - (PACE_SLOW_MS - PACE_FAST_MS) * clamp(q, 0, 1);
}

function rawScore(span, mode, gridSize, pacePressure) {
  return (
    1.0 +
    SPAN_STEP * (span - SPAN_MIN) +
    (mode === 'backward' ? BACKWARD_LOAD : 0) +
    (gridSize === 4 ? GRID4_LOAD : 0) +
    PACE_SPAN * clamp(pacePressure, 0, 1)
  );
}
// Fixed theoretical anchors so difficulty is a stable per-item property.
const RAW_MIN = rawScore(SPAN_MIN, 'forward', 3, 0); // 1.0
const RAW_MAX = rawScore(SPAN_MAX, 'backward', 4, 1); // 20.1

export function difficultyFromLevers(span, mode, gridSize, pacePressure) {
  const raw = rawScore(span, mode, gridSize, pacePressure);
  return clamp(1 + ((raw - RAW_MIN) * 19) / (RAW_MAX - RAW_MIN), 1, 20);
}
// Invert: pace pressure that lands (span, mode, gridSize) on targetD.
function solvePacePressure(span, mode, gridSize, targetD) {
  const rawNeeded = RAW_MIN + ((targetD - 1) * (RAW_MAX - RAW_MIN)) / 19;
  const base = rawScore(span, mode, gridSize, 0);
  return clamp((rawNeeded - base) / PACE_SPAN, 0, 1);
}

// Allowed lever configs (span x mode x grid). Backward is withheld from span 2
// (a 2-element reversal is a guess, not a manipulation measure).
export const ALLOWED_CONFIGS = (() => {
  const out = [];
  for (const gridSize of [3, 4])
    for (const mode of ['forward', 'backward'])
      for (let span = SPAN_MIN; span <= SPAN_MAX; span++) {
        if (mode === 'backward' && span < 3) continue;
        out.push({ span, mode, gridSize });
      }
  return out;
})();

/* ================================================================== *
 * SEQUENCE GRAMMAR — sample a non-chunkable trail of distinct cells.
 * Cells are indexed row-major 0..gridSize^2-1.
 * ================================================================== */
const rowOf = (cell, g) => Math.floor(cell / g);
const colOf = (cell, g) => cell % g;

// Reject trails that a child can verbalise as one chunk instead of holding N
// separate locations: strictly monotone reading order, or a pure straight line.
function isChunkable(seq, g) {
  if (seq.length < 3) return false;
  const asc = seq.every((v, i) => i === 0 || v > seq[i - 1]);
  const desc = seq.every((v, i) => i === 0 || v < seq[i - 1]);
  if (asc || desc) return true;
  const sameRow = seq.every((v) => rowOf(v, g) === rowOf(seq[0], g));
  const sameCol = seq.every((v) => colOf(v, g) === colOf(seq[0], g));
  if (sameRow || sameCol) return true;
  // A single constant (dr,dc) step for the whole trail is one motor gesture.
  if (seq.length >= 3) {
    const dr = rowOf(seq[1], g) - rowOf(seq[0], g);
    const dc = colOf(seq[1], g) - colOf(seq[0], g);
    let constant = true;
    for (let i = 2; i < seq.length; i++) {
      if (rowOf(seq[i], g) - rowOf(seq[i - 1], g) !== dr || colOf(seq[i], g) - colOf(seq[i - 1], g) !== dc)
        constant = false;
    }
    if (constant) return true;
  }
  return false;
}
// Direction reversals keep longer trails from collapsing into a path chunk.
function reversals(seq, g) {
  let n = 0;
  for (let i = 2; i < seq.length; i++) {
    const d1r = Math.sign(rowOf(seq[i - 1], g) - rowOf(seq[i - 2], g));
    const d1c = Math.sign(colOf(seq[i - 1], g) - colOf(seq[i - 2], g));
    const d2r = Math.sign(rowOf(seq[i], g) - rowOf(seq[i - 1], g));
    const d2c = Math.sign(colOf(seq[i], g) - colOf(seq[i - 1], g));
    if (d1r !== d2r || d1c !== d2c) n++;
  }
  return n;
}
export function sampleTrail(span, gridSize, rng) {
  const cells = Array.from({ length: gridSize * gridSize }, (_, i) => i);
  const needReversals = span >= 5 ? 2 : span >= 4 ? 1 : 0;
  let best = null;
  for (let attempt = 0; attempt < 200; attempt++) {
    const seq = shuffle(cells, rng).slice(0, span);
    if (isChunkable(seq, gridSize)) continue;
    if (reversals(seq, gridSize) < needReversals) {
      if (!best) best = seq;
      continue;
    }
    return seq;
  }
  if (best) return best;
  throw new Error(`could not sample a non-chunkable trail (span=${span}, grid=${gridSize})`);
}

/* ================================================================== *
 * ITEM BUILDER
 * ================================================================== */
const LEAD_IN_MS = 900; // "get ready" beat before the first flash
const RECALL_CUE_MS = 500; // blank beat between the last flash and the recall prompt

const cellLabel = (cell, g) => `r${rowOf(cell, g) + 1}c${colOf(cell, g) + 1}`;

/**
 * Generate ONE structured BankItem.
 * @param {{span:number, mode:'forward'|'backward', gridSize:number, pacePressure:number, seed:string}} lever
 */
export function genItem({ span, mode, gridSize, pacePressure, seed }) {
  const rng = makeRng(seed);
  const trail = sampleTrail(span, gridSize, rng);

  const paceMs = paceMsFromPressure(pacePressure);
  const flashMs = Math.round(paceMs * 0.62);
  const gapMs = Math.round(paceMs) - flashMs;

  // Full timed presentation schedule (renderer-agnostic; ms from stage start).
  const schedule = trail.map((cell, i) => ({
    step: i + 1,
    cell,
    row: rowOf(cell, gridSize),
    col: colOf(cell, gridSize),
    onsetMs: LEAD_IN_MS + i * (flashMs + gapMs),
    offsetMs: LEAD_IN_MS + i * (flashMs + gapMs) + flashMs,
  }));
  const presentationEndMs = schedule[schedule.length - 1].offsetMs;
  const recallOpensAtMs = presentationEndMs + RECALL_CUE_MS;

  const expected = mode === 'backward' ? trail.slice().reverse() : trail.slice();

  // --- Named lure responses (server-only): the classifiable ways to be wrong.
  const distractorRationales = {
    correct: { lure: 'correct', sequence: expected.slice(), note: `taps the trail in ${mode} order` },
  };
  const addLure = (key, lure, sequence, note) => {
    if (!sequence || sequence.length === 0) return;
    if (JSON.stringify(sequence) === JSON.stringify(expected)) return; // never a lure
    if (Object.values(distractorRationales).some((r) => JSON.stringify(r.sequence) === JSON.stringify(sequence))) return;
    distractorRationales[key] = { lure, sequence, note };
  };
  addLure(
    'direction_error',
    'direction_error',
    expected.slice().reverse(),
    mode === 'backward'
      ? 'replays the trail forward: stored the trail but skipped the reversal (manipulation failure, not storage failure)'
      : 'replays the trail backward: applied the reverse rule when same-order was asked (instruction/set error)',
  );
  if (span >= 3) {
    const swapped = expected.slice();
    [swapped[span - 2], swapped[span - 1]] = [swapped[span - 1], swapped[span - 2]];
    addLure('adjacent_transposition', 'order_error', swapped, 'correct set, last two positions transposed (order slip, items intact)');
  }
  if (span >= 3) {
    // Primacy kept, recency lost: last element replaced by an un-flashed cell.
    const unused = Array.from({ length: gridSize * gridSize }, (_, i) => i).filter((c) => !trail.includes(c));
    if (unused.length) {
      const intruded = expected.slice();
      intruded[span - 1] = unused[Math.floor(rng() * unused.length)];
      addLure('recency_intrusion', 'item_error', intruded, 'primacy positions intact, final position replaced by a never-flashed cell (trail decayed at the tail)');
    }
  }
  if (span >= 3) {
    addLure('truncated_span', 'omission', expected.slice(0, span - 1), 'stops one short: recalled span is below the presented span');
  }

  const difficulty = round2(difficultyFromLevers(span, mode, gridSize, pacePressure));

  return {
    itemId: seededUuid(seed),
    typeCode: 'WM-corsi-01',
    domain: 'spatial',
    difficulty, // FLOAT 1..20 — DESIGN rung, not calibrated (validated:false)
    ageBands: ageBandsFor(difficulty),
    demoPath: 'demos/WM-corsi-01.html',
    content: {
      typeCode: 'WM-corsi-01',
      grid: { rows: gridSize, cols: gridSize, cellCount: gridSize * gridSize },
      mode,
      span,
      // PRESENTATION PHASE ONLY. The renderer consumes this to play the trail and
      // then SEALS it (drops the reference) before the recall prompt opens.
      presentation: {
        leadInMs: LEAD_IN_MS,
        flashDurationMs: flashMs,
        gapMs,
        paceMs: Math.round(paceMs),
        schedule,
        presentationEndMs,
        recallOpensAtMs,
      },
      // RESPONSE PHASE ONLY. Everything the recall UI is allowed to read.
      // Carries NO cell identities and NO ordering information.
      responsePhase: {
        prompt:
          mode === 'backward'
            ? 'Tap the tiles in the REVERSE order they lit up - last one first.'
            : 'Tap the tiles in the SAME order they lit up.',
        expectedTapCount: span,
        autoSubmitAtTapCount: span,
        deselectEnabled: true,
        untimed: true, // recall is NEVER speeded: this measures memory, not motor speed
        latencyAnchor: 'recall_open', // RT anchors on the recall prompt, not stage start
      },
      instructions: {
        howto:
          'Watch the tiles light up one at a time. Then tap them back. The line above the grid tells you if you need the same order or the reverse order. Tap a tile again to undo it. Take as long as you need.',
        readingGate: 'D-017: on-screen text only, never audio.',
      },
    },
    answer: {
      // Canonical key: the expected tap order as a stable string.
      correctKey: expected.map((c) => cellLabel(c, gridSize)).join('-'),
      expectedSequence: expected,
      presentedSequence: trail.slice(),
      mode,
      distractorRationales,
    },
    scoring: {
      mode: 'computed_solver',
      solver: 'wm-span-serial-order@1',
      // Precise, server-reproducible definition of the partial-credit solver.
      spec: {
        unitsTotal: span,
        positionCredit: 'unit i is credited iff response[i] === expectedSequence[i] (0-indexed, strict position match)',
        unitsCorrect: 'count of credited units over i in [0, unitsTotal)',
        score: 'unitsCorrect / unitsTotal, rounded to 4 decimals',
        correct: 'response.length === unitsTotal AND unitsCorrect === unitsTotal',
        longestCorrectPrefix: 'largest L in [0,unitsTotal] with response[0..L-1] === expectedSequence[0..L-1]',
        longestCorrectRun: 'largest (j-i+1) with response[i..j] === expectedSequence[i..j]',
        errorTaxonomy: {
          none: 'exact match',
          order: 'response is a permutation of expectedSequence but not in order',
          item: 'response length matches but contains a cell that was never flashed',
          omission: 'response is shorter than unitsTotal',
          intrusion: 'response is longer than unitsTotal',
          mixed: 'wrong items AND wrong order',
        },
        lureMatch: 'if response deep-equals a distractorRationales[*].sequence, tag M-ERRTYPE with that lure label',
      },
      // Key-free, computed by the renderer and shipped in ItemResult.metrics.
      clientMetrics: ['M-RT', 'M-RTFIRST', 'M-RTVAR', 'M-REV', 'M-SPAN', 'M-DIFFREACH', 'M-LAPSE', 'M-ENGAGE', 'M-RAPIDGUESS', 'M-PATH', 'M-PLANFUL'],
      // Require the answer key -> server-authoritative only.
      serverMetrics: ['M-ACC', 'M-POLY', 'M-ERRTYPE', 'M-CONSIST', 'M-LEARNRATE', 'M-MANIPCOST', 'M-EFF'],
    },
    provenance: {
      generator: 'grammar',
      generatorRef: 'wm-corsi-01-span-grammar@1',
      seed,
      levers: {
        span,
        mode,
        gridSize,
        // Full precision (not rounded): enables exact, reproducible regeneration.
        pacePressure,
      },
    },
    syntheticOnly: true,
    validated: false,
  };
}

// Age-band targeting hint from the difficulty rung (type's declared bands:
// K-1 | 2-3 | 4-5 | 6-8). Boundary overlap is a targeting hint, not a hard cut.
export function ageBandsFor(difficulty) {
  const bands = [];
  const add = (b) => {
    if (!bands.includes(b)) bands.push(b);
  };
  if (difficulty < 4.5) add('K-1');
  if (difficulty >= 3.5 && difficulty < 8.5) add('2-3');
  if (difficulty >= 7.5 && difficulty < 12.5) add('4-5');
  if (difficulty >= 11.5) add('6-8');
  if (bands.length === 0) add(difficulty < 3 ? 'K-1' : '6-8');
  return bands;
}

/* ================================================================== *
 * BANK BUILDER — fill each integer difficulty bin k=1..20 with >=perBin items
 * (BUILD_PLAN §0: >=5 per +/-1 pt band, gradual 1..20). Span/mode/grid pick the
 * rung; pace pressure is the continuous fine-positioner within the rung.
 * ================================================================== */
export function buildBank({ perBin = 6 } = {}) {
  const items = [];
  for (let k = 1; k <= 20; k++) {
    const lo = Math.max(1, k - 0.45);
    const hi = Math.min(20, k + 0.45);

    const segments = [];
    for (const cfg of ALLOWED_CONFIGS) {
      const dLo = difficultyFromLevers(cfg.span, cfg.mode, cfg.gridSize, 0);
      const dHi = difficultyFromLevers(cfg.span, cfg.mode, cfg.gridSize, 1);
      const a = Math.max(lo, dLo);
      const b = Math.min(hi, dHi);
      if (b > a + 1e-6) segments.push({ ...cfg, tLo: a, tHi: b });
    }
    if (segments.length === 0) throw new Error(`no reachable lever config for difficulty bin k=${k}`);

    const hits = segments.map(() => 0);
    for (let i = 0; i < perBin; i++) hits[i % segments.length]++;
    const localSeen = segments.map(() => 0);

    for (let i = 0; i < perBin; i++) {
      const segIdx = i % segments.length;
      const seg = segments[segIdx];
      const li = localSeen[segIdx]++;
      const t = seg.tLo + (seg.tHi - seg.tLo) * ((li + 0.5) / hits[segIdx]);
      const pacePressure = solvePacePressure(seg.span, seg.mode, seg.gridSize, t);
      const seed = `WM-corsi-01|bin=${k}|i=${i}|S${seg.span}${seg.mode[0].toUpperCase()}G${seg.gridSize}`;
      items.push(genItem({ span: seg.span, mode: seg.mode, gridSize: seg.gridSize, pacePressure, seed }));
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
  const outPath = resolve(__dirname, '../banks/WM-corsi-01.jsonl');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, serializeBank(items));

  const bins = Array.from({ length: 20 }, () => 0);
  let min = Infinity;
  let max = -Infinity;
  const spans = new Set();
  let backward = 0;
  for (const it of items) {
    const k = Math.round(it.difficulty);
    if (k >= 1 && k <= 20) bins[k - 1]++;
    min = Math.min(min, it.difficulty);
    max = Math.max(max, it.difficulty);
    spans.add(it.content.span);
    if (it.content.mode === 'backward') backward++;
  }
  console.log(`WM-corsi-01 bank: ${items.length} items -> ${outPath}`);
  console.log(`difficulty span: ${round2(min)} .. ${round2(max)}  (target 1..20)`);
  console.log(`spans present: ${[...spans].sort((a, b) => a - b).join(',')}   backward items: ${backward}/${items.length}`);
  console.log('per-bin counts (k: n):');
  console.log(bins.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join('  '));
  const short = bins.map((n, i) => ({ k: i + 1, n })).filter((b) => b.k <= 19 && b.n < 5);
  console.log(short.length ? `SHORT BINS (<5): ${short.map((b) => b.k).join(',')}` : 'all bins 1..19 >=5 OK');
}
