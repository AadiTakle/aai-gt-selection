// WM-bind-01 "Home Again" — structured bank generator (Bucket A: grammar).
//
// Emits a STRUCTURED item bank (JSONL) conforming to EXAM_ADAPTIVE_BUILD_PLAN.md §2
// (BankItem). WORKING-MEMORY family: the "item" is a TIMED ENCODING SCHEDULE plus a
// load configuration, and difficulty is the number of identity-location bindings x
// encoding pressure x field size x how confusable the identities are.
//
// This is the BINDING member of the WM family: unlike WM-corsi-01 (serial order),
// scoring here is WHICH creature is in WHICH house, order-free. Failures split into
// mis-bindings (identities kept, associations scrambled) and lost locations
// (Baddeley 2000 episodic buffer; Cohen & Eichenbaum 1993 relational memory).
//
// Governance: born-synthetic only (syntheticOnly:true, validated:false). The
// `difficulty` float is a DESIGN rung, NOT a calibrated IRT parameter.
//
// CONSTRUCT NOTE: the encoding display inherently contains the answer, so the
// separation is structural. `content.presentation` holds the creature->house
// schedule and is sealed by the renderer before recall; `content.creatures` and
// `content.responsePhase` carry identities ONLY (never a cell), which is exactly
// what the tray needs and exactly what the child must re-associate from memory.
// Recall is untimed so the score reflects binding, not tapping speed.
//
// Run:  node research/exam-question-types/generators/WM-bind-01.mjs
//       writes ../banks/WM-bind-01.jsonl and prints a coverage summary.

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

/* ------------------------------------------------------------------ *
 * Creature vocabulary (renderer-agnostic tokens; the demo maps them to
 * outline SVG). NO emoji, per DEMO_REBUILD_GUIDE §3b.
 *
 * DISTINCT set  — different silhouette AND different hue, with a readable word
 *                 label: easy to individuate, nameable.
 * CONFUSABLE set — one shared silhouette, a near-hue ramp and small markings,
 *                 and NO label: hard to verbally rehearse, so the high bands
 *                 measure binding rather than covert naming (spec's
 *                 construct_irrelevant_risks guidance).
 * ------------------------------------------------------------------ */
export const DISTINCT_SHAPES = ['cat', 'bird', 'fish', 'bug', 'rabbit', 'bear', 'frog', 'turtle'];
export const DISTINCT_LABELS = { cat: 'Cat', bird: 'Bird', fish: 'Fish', bug: 'Bug', rabbit: 'Rabbit', bear: 'Bear', frog: 'Frog', turtle: 'Turtle' };
export const DISTINCT_HUES = ['coral', 'teal', 'blue', 'gold', 'violet', 'ink', 'moss', 'plum'];
export const CONFUSABLE_HUES = ['aqua1', 'aqua2', 'aqua3', 'aqua4', 'aqua5', 'aqua6', 'aqua7', 'aqua8'];
export const MARKS = ['plain', 'dots', 'stripes', 'ring'];

/* ================================================================== *
 * DIFFICULTY MODEL — from the type's declared difficulty_levers:
 *   set size | encoding time | grid size / proximity | visual similarity |
 *   retention delay.
 *
 * Set size is the coarse rung (relational load: each binding is one
 * identity-location association held simultaneously). Encoding time and
 * retention delay move together as one continuous ENCODING PRESSURE, which is
 * the fine-positioner inside a rung.
 * ================================================================== */
export const SET_MIN = 2;
export const SET_MAX = 8;
const SET_STEP = 2.15; // each extra binding to hold at once
const GRID4_LOAD = 1.3; // 16 houses: more candidate locations, tighter proximity
const SIMILARITY_LOAD = 2.2; // confusable identities defeat verbal rehearsal
const PRESSURE_SPAN = 3.6; // encoding time + retention delay, combined

const ENCODE_SLOW_MS = 1400;
const ENCODE_FAST_MS = 500;
const DELAY_MAX_MS = 2600;

// pressure in [0,1]: 0 = generous exposure, no delay; 1 = brief exposure, long delay.
export function encodeMsFromPressure(p) {
  return Math.round(ENCODE_SLOW_MS - (ENCODE_SLOW_MS - ENCODE_FAST_MS) * clamp(p, 0, 1));
}
export function retentionDelayFromPressure(p) {
  return Math.round(DELAY_MAX_MS * clamp(p, 0, 1));
}

function rawScore(setSize, gridSize, confusable, pressure) {
  return (
    1.0 +
    SET_STEP * (setSize - SET_MIN) +
    (gridSize === 4 ? GRID4_LOAD : 0) +
    (confusable ? SIMILARITY_LOAD : 0) +
    PRESSURE_SPAN * clamp(pressure, 0, 1)
  );
}
const RAW_MIN = rawScore(SET_MIN, 3, false, 0); // 1.0
const RAW_MAX = rawScore(SET_MAX, 4, true, 1); // 21.0

export function difficultyFromLevers(setSize, gridSize, confusable, pressure) {
  const raw = rawScore(setSize, gridSize, confusable, pressure);
  return clamp(1 + ((raw - RAW_MIN) * 19) / (RAW_MAX - RAW_MIN), 1, 20);
}
function solvePressure(setSize, gridSize, confusable, targetD) {
  const rawNeeded = RAW_MIN + ((targetD - 1) * (RAW_MAX - RAW_MIN)) / 19;
  const base = rawScore(setSize, gridSize, confusable, 0);
  return clamp((rawNeeded - base) / PRESSURE_SPAN, 0, 1);
}

// Confusable identities are withheld below set size 3 (with two creatures the
// similarity manipulation has nothing to interfere with).
export const ALLOWED_CONFIGS = (() => {
  const out = [];
  for (const gridSize of [3, 4])
    for (const confusable of [false, true])
      for (let setSize = SET_MIN; setSize <= SET_MAX; setSize++) {
        if (confusable && setSize < 3) continue;
        out.push({ setSize, gridSize, confusable });
      }
  return out;
})();

/* ================================================================== *
 * GRAMMAR
 * ================================================================== */
const rowOf = (cell, g) => Math.floor(cell / g);
const colOf = (cell, g) => cell % g;
const cellLabel = (cell, g) => `r${rowOf(cell, g) + 1}c${colOf(cell, g) + 1}`;

// Houses must not all sit in one row/column: a single line is one chunk, not N
// separate locations.
function sampleHouses(setSize, gridSize, rng) {
  const all = Array.from({ length: gridSize * gridSize }, (_, i) => i);
  for (let attempt = 0; attempt < 100; attempt++) {
    const pick = shuffle(all, rng).slice(0, setSize);
    if (setSize < 3) return pick.sort((a, b) => a - b);
    const oneRow = pick.every((c) => rowOf(c, gridSize) === rowOf(pick[0], gridSize));
    const oneCol = pick.every((c) => colOf(c, gridSize) === colOf(pick[0], gridSize));
    if (!oneRow && !oneCol) return pick.sort((a, b) => a - b);
  }
  throw new Error(`could not sample ${setSize} non-collinear houses on a ${gridSize}x${gridSize} grid`);
}

function makeCreatures(setSize, confusable, rng) {
  if (confusable) {
    // One silhouette, a near-hue ramp and small markings, no word labels.
    const hues = CONFUSABLE_HUES.slice(0, Math.max(setSize, 4));
    const chosen = shuffle(hues, rng).slice(0, setSize);
    return chosen.map((hue, i) => ({
      id: `c${i + 1}`,
      shape: 'blob',
      hue,
      mark: MARKS[i % MARKS.length],
      label: null, // deliberately un-nameable at high load
    }));
  }
  const shapes = shuffle(DISTINCT_SHAPES, rng).slice(0, setSize);
  const hues = shuffle(DISTINCT_HUES, rng).slice(0, setSize);
  return shapes.map((shape, i) => ({
    id: `c${i + 1}`,
    shape,
    hue: hues[i],
    mark: 'plain',
    label: DISTINCT_LABELS[shape],
  }));
}

// Which two creatures are the easiest to confuse? Same shape -> nearest hues in
// the ramp; otherwise the first two (all pairs are equally distinct).
function mostConfusablePair(creatures, confusable) {
  if (!confusable || creatures.length < 2) return [0, 1];
  let best = [0, 1];
  let bestGap = Infinity;
  for (let i = 0; i < creatures.length; i++)
    for (let j = i + 1; j < creatures.length; j++) {
      const gi = CONFUSABLE_HUES.indexOf(creatures[i].hue);
      const gj = CONFUSABLE_HUES.indexOf(creatures[j].hue);
      const gap = Math.abs(gi - gj) + (creatures[i].mark === creatures[j].mark ? 0 : 0.5);
      if (gap < bestGap) {
        bestGap = gap;
        best = [i, j];
      }
    }
  return best;
}

const LEAD_IN_MS = 900;
const ENCODE_GAP_MS = 220;
const RECALL_CUE_MS = 450;

/**
 * Generate ONE structured BankItem.
 * @param {{setSize:number, gridSize:number, confusable:boolean, pressure:number, seed:string}} lever
 */
export function genItem({ setSize, gridSize, confusable, pressure, seed }) {
  const rng = makeRng(seed);
  const houses = sampleHouses(setSize, gridSize, rng);
  const creatures = makeCreatures(setSize, confusable, rng);
  // Encoding ORDER is independent of the house ordering, so serial position and
  // location are not confounded (scoring is order-free binding).
  const encodeOrder = shuffle(creatures.map((c) => c.id), rng);
  const houseFor = {};
  const shuffledHouses = shuffle(houses, rng);
  encodeOrder.forEach((cid, i) => {
    houseFor[cid] = shuffledHouses[i];
  });

  const encodeMs = encodeMsFromPressure(pressure);
  const retentionDelayMs = retentionDelayFromPressure(pressure);

  const schedule = encodeOrder.map((cid, i) => ({
    step: i + 1,
    creatureId: cid,
    cell: houseFor[cid],
    row: rowOf(houseFor[cid], gridSize),
    col: colOf(houseFor[cid], gridSize),
    onsetMs: LEAD_IN_MS + i * (encodeMs + ENCODE_GAP_MS),
    offsetMs: LEAD_IN_MS + i * (encodeMs + ENCODE_GAP_MS) + encodeMs,
  }));
  const presentationEndMs = schedule[schedule.length - 1].offsetMs;
  const recallOpensAtMs = presentationEndMs + retentionDelayMs + RECALL_CUE_MS;

  // Canonical binding map, keyed by creature id in stable id order.
  const bindings = {};
  creatures.forEach((c) => {
    bindings[c.id] = houseFor[c.id];
  });
  const occupiedCells = creatures.map((c) => bindings[c.id]).sort((a, b) => a - b);

  // --- Named lure binding-maps (server-only) for M-ERRTYPE classification.
  const distractorRationales = {
    correct: {
      lure: 'correct',
      bindings: { ...bindings },
      note: 'every creature returned to the house it occupied during encoding',
    },
  };
  const addLure = (key, lure, map, note) => {
    if (!map) return;
    const sig = JSON.stringify(map);
    if (sig === JSON.stringify(bindings)) return;
    if (Object.values(distractorRationales).some((r) => JSON.stringify(r.bindings) === sig)) return;
    distractorRationales[key] = { lure, bindings: map, note };
  };

  const [pa, pb] = mostConfusablePair(creatures, confusable);
  if (creatures.length >= 2) {
    const swapped = { ...bindings };
    const ida = creatures[pa].id;
    const idb = creatures[pb].id;
    swapped[ida] = bindings[idb];
    swapped[idb] = bindings[ida];
    addLure(
      'swap_confusable_pair',
      'mis_binding_swap',
      swapped,
      `${ida} and ${idb} (the most confusable identities) exchange houses: both locations were held, the association was not`,
    );
  }
  if (creatures.length >= 3) {
    // Locations kept as a SET, identities rotated: the classic episodic-buffer
    // failure where "where" survives and "what goes where" does not.
    const rotated = {};
    creatures.forEach((c, i) => {
      rotated[c.id] = bindings[creatures[(i + 1) % creatures.length].id];
    });
    addLure('rotated_identities', 'mis_binding_shift', rotated, 'all locations recalled, every identity shifted one house along: pure binding failure with intact spatial memory');
  }
  {
    const unused = Array.from({ length: gridSize * gridSize }, (_, i) => i).filter((c) => !occupiedCells.includes(c));
    if (unused.length) {
      const lost = { ...bindings };
      lost[creatures[creatures.length - 1].id] = unused[Math.floor(rng() * unused.length)];
      addLure('lost_location', 'lost_location', lost, 'one creature is placed in a house that was never occupied: the location itself was lost, not just the pairing');
    }
  }
  if (creatures.length >= 2) {
    const partial = { ...bindings };
    delete partial[creatures[creatures.length - 1].id];
    addLure('incomplete_set', 'omission', partial, 'stops one creature short: fewer bindings survived than were presented');
  }

  const difficulty = round2(difficultyFromLevers(setSize, gridSize, confusable, pressure));

  return {
    itemId: seededUuid(seed),
    typeCode: 'WM-bind-01',
    domain: 'spatial',
    difficulty, // FLOAT 1..20 — DESIGN rung, not calibrated (validated:false)
    ageBands: ageBandsFor(difficulty),
    demoPath: 'demos/WM-bind-01.html',
    content: {
      typeCode: 'WM-bind-01',
      grid: { rows: gridSize, cols: gridSize, cellCount: gridSize * gridSize },
      setSize,
      identitySet: confusable ? 'confusable' : 'distinct',
      // Tray inventory. Identities ONLY — no cell, row or col anywhere here, so
      // the recall UI can draw the creatures without knowing where they lived.
      creatures,
      // PRESENTATION PHASE ONLY (sealed by the renderer before recall).
      presentation: {
        leadInMs: LEAD_IN_MS,
        encodeMsPerItem: encodeMs,
        gapMs: ENCODE_GAP_MS,
        retentionDelayMs,
        schedule,
        presentationEndMs,
        recallOpensAtMs,
      },
      // RESPONSE PHASE ONLY.
      responsePhase: {
        prompt: 'Tap a creature, then tap the house it came from. Put them all back.',
        placementsRequired: setSize,
        trayOrder: shuffle(creatures.map((c) => c.id), rng), // display order, not encoding order
        reassignEnabled: true,
        untimed: true,
        latencyAnchor: 'recall_open',
      },
      instructions: {
        howto:
          'Watch which creature goes into which house. The creatures then come out and mix up. Tap a creature, then tap its own house to send it home. You can move one again if you change your mind. Take as long as you need.',
        readingGate: 'D-017: on-screen text only, never audio.',
      },
    },
    answer: {
      correctKey: creatures.map((c) => `${c.id}@${cellLabel(bindings[c.id], gridSize)}`).join('|'),
      bindings, // creatureId -> cell (ORDER-FREE: this is what is scored)
      encodingOrder: encodeOrder.slice(), // enables longest-correct-run over serial position
      occupiedCells,
      distractorRationales,
    },
    scoring: {
      mode: 'computed_solver',
      solver: 'wm-binding-partial-credit@1',
      spec: {
        unitsTotal: setSize,
        positionCredit: 'creature c is credited iff response.placements[c] === bindings[c] (order-free identity-location match)',
        unitsCorrect: 'count of credited creatures',
        score: 'unitsCorrect / unitsTotal, rounded to 4 decimals',
        correct: 'every creature placed AND unitsCorrect === unitsTotal',
        longestCorrectRun: 'longest run of consecutive positions in answer.encodingOrder whose creatures are all credited',
        swapCount: 'number of unordered pairs {a,b} with placements[a]===bindings[b] AND placements[b]===bindings[a], each counted once',
        lostLocationCount: 'number of creatures whose placement cell is NOT in answer.occupiedCells',
        misBindingCount: 'unitsTotal - unitsCorrect - lostLocationCount (wrong pairing among the real houses)',
        omissionCount: 'unitsTotal - (number of creatures present in response.placements)',
        errorTaxonomy: {
          none: 'all bindings correct',
          mis_binding_swap: 'swapCount >= 1 and lostLocationCount === 0',
          mis_binding_shift: 'placement cell multiset equals occupiedCells but unitsCorrect < unitsTotal',
          lost_location: 'lostLocationCount >= 1',
          omission: 'omissionCount >= 1',
          mixed: 'lostLocationCount >= 1 and swapCount >= 1',
        },
        lureMatch: 'if response.placements deep-equals a distractorRationales[*].bindings, tag M-ERRTYPE with that lure label',
      },
      clientMetrics: ['M-SPAN', 'M-DIFFREACH', 'M-RTFIRST', 'M-RT', 'M-RTVAR', 'M-REV', 'M-PATH', 'M-LAPSE', 'M-ENGAGE', 'M-RAPIDGUESS', 'M-PLANFUL'],
      serverMetrics: ['M-ACC', 'M-POLY', 'M-ERRTYPE', 'M-CONSIST', 'M-LEARNRATE', 'M-EFF'],
    },
    provenance: {
      generator: 'grammar',
      generatorRef: 'wm-bind-01-binding-grammar@1',
      seed,
      levers: {
        setSize,
        gridSize,
        confusable,
        // Full precision (not rounded): enables exact, reproducible regeneration.
        pressure,
      },
    },
    syntheticOnly: true,
    validated: false,
  };
}

// Age-band targeting hint (declared bands: K-1 | 2-3 | 4-5 | 6-8).
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
 * BANK BUILDER — >=perBin items in every integer difficulty bin 1..20.
 * ================================================================== */
export function buildBank({ perBin = 6 } = {}) {
  const items = [];
  for (let k = 1; k <= 20; k++) {
    const lo = Math.max(1, k - 0.45);
    const hi = Math.min(20, k + 0.45);

    const segments = [];
    for (const cfg of ALLOWED_CONFIGS) {
      const dLo = difficultyFromLevers(cfg.setSize, cfg.gridSize, cfg.confusable, 0);
      const dHi = difficultyFromLevers(cfg.setSize, cfg.gridSize, cfg.confusable, 1);
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
      const pressure = solvePressure(seg.setSize, seg.gridSize, seg.confusable, t);
      const seed = `WM-bind-01|bin=${k}|i=${i}|N${seg.setSize}G${seg.gridSize}${seg.confusable ? 'C' : 'D'}`;
      items.push(genItem({ setSize: seg.setSize, gridSize: seg.gridSize, confusable: seg.confusable, pressure, seed }));
    }
  }
  return items;
}

/* ------------------------------------------------------------------ *
 * CLI entrypoint.
 * ------------------------------------------------------------------ */
function isMain() {
  return process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
}
if (isMain()) {
  const perBin = Number(process.env.PER_BIN || 6);
  const items = buildBank({ perBin });
  const outPath = resolve(__dirname, '../banks/WM-bind-01.jsonl');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, serializeBank(items));

  const bins = Array.from({ length: 20 }, () => 0);
  let min = Infinity;
  let max = -Infinity;
  const sets = new Set();
  let confusable = 0;
  for (const it of items) {
    const k = Math.round(it.difficulty);
    if (k >= 1 && k <= 20) bins[k - 1]++;
    min = Math.min(min, it.difficulty);
    max = Math.max(max, it.difficulty);
    sets.add(it.content.setSize);
    if (it.content.identitySet === 'confusable') confusable++;
  }
  console.log(`WM-bind-01 bank: ${items.length} items -> ${outPath}`);
  console.log(`difficulty span: ${round2(min)} .. ${round2(max)}  (target 1..20)`);
  console.log(`set sizes present: ${[...sets].sort((a, b) => a - b).join(',')}   confusable-identity items: ${confusable}/${items.length}`);
  console.log('per-bin counts (k: n):');
  console.log(bins.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join('  '));
  const short = bins.map((n, i) => ({ k: i + 1, n })).filter((b) => b.k <= 19 && b.n < 5);
  console.log(short.length ? `SHORT BINS (<5): ${short.map((b) => b.k).join(',')}` : 'all bins 1..19 >=5 OK');
}
