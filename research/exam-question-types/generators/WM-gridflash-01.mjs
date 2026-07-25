// WM-gridflash-01 "Star Grid" — structured bank generator (Bucket A: grammar).
//
// Emits a STRUCTURED item bank (JSONL) conforming to EXAM_ADAPTIVE_BUILD_PLAN.md §2
// (BankItem). WORKING-MEMORY family, SIMULTANEOUS branch: the "item" is a load
// configuration plus a timed flash/delay/test schedule. Difficulty is set size x
// exposure/retention pressure x how confusable the colours are x whether the test
// is a two-choice change probe or a whole-array reproduction.
//
// Two shells (both generated here, both in the same 1..20 ladder):
//   change_detection — single-probe SAME/CHANGED (Luck & Vogel 1997); scoring is
//                      signal-detection (hits vs false alarms -> d-prime, Cowan K),
//                      which is why even this two-choice shell is a solver and not
//                      a plain key match: a hit and a correct rejection are not
//                      interchangeable evidence.
//   recognition      — tap back every cell that was lit (order-free set), the
//                      harder reproduction shell reserved for the upper rungs.
//
// Governance: born-synthetic only (syntheticOnly:true, validated:false). The
// `difficulty` float is a DESIGN rung, NOT a calibrated IRT parameter.
//
// CONSTRUCT NOTE: the flashed array IS the answer. `content.presentation` holds it
// and is sealed by the renderer before the test display; `content.responsePhase`
// carries only what the test legitimately shows (the probe cell and the probe
// colour, or the number of cells to tap). The test is untimed, so the score
// reflects visual capacity, not tapping speed.
//
// Run:  node research/exam-question-types/generators/WM-gridflash-01.mjs
//       writes ../banks/WM-gridflash-01.jsonl and prints a coverage summary.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/* ------------------------------------------------------------------ *
 * Seeded RNG (xmur3 -> mulberry32).
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
 * Colour vocabulary (named tokens; the renderer maps token -> hex).
 * DISTINCT = far-apart hues (a colour-blind-safe spread plus a shape cue in the
 * renderer). RAMP = a tight near-hue ladder used for the confusable profile,
 * where a "change" is one step along the ramp.
 * ------------------------------------------------------------------ */
// Both pools carry MORE hues than the largest set size, so a change trial always
// has an unused colour available (reusing a colour already in the array would
// make the probe ambiguous for a child who bound the colour to the wrong cell).
export const DISTINCT_HUES = ['coral', 'teal', 'blue', 'gold', 'violet', 'ink', 'moss', 'plum', 'rust', 'sky'];
export const RAMP_HUES = ['aqua1', 'aqua2', 'aqua3', 'aqua4', 'aqua5', 'aqua6', 'aqua7', 'aqua8', 'aqua9', 'aqua10'];

/* ================================================================== *
 * DIFFICULTY MODEL — from the type's declared difficulty_levers:
 *   set size | exposure duration | retention delay | colour similarity |
 *   change magnitude | single-probe vs whole-array recognition.
 *
 * Grounded in Luck & Vogel (1997) and Cowan (2001): capacity is the dominant
 * term, so SET SIZE is the coarse rung. Exposure and retention delay move
 * together as one continuous ENCODING PRESSURE (the fine-positioner).
 * ================================================================== */
export const SET_MIN = 2;
export const SET_MAX = 8;
const SET_STEP = 1.75;
const RECOGNITION_LOAD = 2.4; // reproducing the whole set beats a 2-choice probe
const CONFUSABLE_LOAD = 2.2; // tight hue ramp + one-step changes
const PRESSURE_SPAN = 3.2;

const EXPOSURE_LONG_MS = 900;
const EXPOSURE_SHORT_MS = 250;
const DELAY_MIN_MS = 400;
const DELAY_MAX_MS = 2200;

export function exposureMsFromPressure(p) {
  return Math.round(EXPOSURE_LONG_MS - (EXPOSURE_LONG_MS - EXPOSURE_SHORT_MS) * clamp(p, 0, 1));
}
export function retentionDelayFromPressure(p) {
  return Math.round(DELAY_MIN_MS + (DELAY_MAX_MS - DELAY_MIN_MS) * clamp(p, 0, 1));
}
// Field size follows set size: small arrays live on 3x3, larger ones need 4x4 so
// the items stay well spaced (the spec's large-target, low-motor requirement).
export function gridSizeForSet(setSize) {
  return setSize <= 4 ? 3 : 4;
}

function rawScore(setSize, shell, confusable, pressure) {
  return (
    1.0 +
    SET_STEP * (setSize - SET_MIN) +
    (shell === 'recognition' ? RECOGNITION_LOAD : 0) +
    (confusable ? CONFUSABLE_LOAD : 0) +
    PRESSURE_SPAN * clamp(pressure, 0, 1)
  );
}
const RAW_MIN = rawScore(SET_MIN, 'change_detection', false, 0); // 1.0
const RAW_MAX = rawScore(SET_MAX, 'recognition', true, 1); // 19.3

export function difficultyFromLevers(setSize, shell, confusable, pressure) {
  const raw = rawScore(setSize, shell, confusable, pressure);
  return clamp(1 + ((raw - RAW_MIN) * 19) / (RAW_MAX - RAW_MIN), 1, 20);
}
function solvePressure(setSize, shell, confusable, targetD) {
  const rawNeeded = RAW_MIN + ((targetD - 1) * (RAW_MAX - RAW_MIN)) / 19;
  const base = rawScore(setSize, shell, confusable, 0);
  return clamp((rawNeeded - base) / PRESSURE_SPAN, 0, 1);
}

// The reproduction shell needs at least 3 items to be more than a coin flip.
export const ALLOWED_CONFIGS = (() => {
  const out = [];
  for (const shell of ['change_detection', 'recognition'])
    for (const confusable of [false, true])
      for (let setSize = SET_MIN; setSize <= SET_MAX; setSize++) {
        if (shell === 'recognition' && setSize < 3) continue;
        out.push({ setSize, shell, confusable });
      }
  return out;
})();

/* ================================================================== *
 * GRAMMAR
 * ================================================================== */
const rowOf = (cell, g) => Math.floor(cell / g);
const colOf = (cell, g) => cell % g;
const cellLabel = (cell, g) => `r${rowOf(cell, g) + 1}c${colOf(cell, g) + 1}`;
const orthAdjacent = (a, b, g) =>
  Math.abs(rowOf(a, g) - rowOf(b, g)) + Math.abs(colOf(a, g) - colOf(b, g)) === 1;

function adjacencyCount(cells, g) {
  let n = 0;
  for (let i = 0; i < cells.length; i++)
    for (let j = i + 1; j < cells.length; j++) if (orthAdjacent(cells[i], cells[j], g)) n++;
  return n;
}
// Spatial-crowding lever: the confusable profile clusters the lit cells (harder
// to individuate); the distinct profile spreads them out.
function sampleCells(setSize, gridSize, clustered, rng) {
  const all = Array.from({ length: gridSize * gridSize }, (_, i) => i);
  let best = null;
  let bestScore = clustered ? -Infinity : Infinity;
  for (let attempt = 0; attempt < 60; attempt++) {
    const pick = shuffle(all, rng).slice(0, setSize);
    const score = adjacencyCount(pick, gridSize);
    if (clustered ? score > bestScore : score < bestScore) {
      bestScore = score;
      best = pick;
    }
  }
  return best.sort((a, b) => a - b);
}

/**
 * Generate ONE structured BankItem.
 * @param {{setSize:number, shell:string, confusable:boolean, pressure:number,
 *          changeTrial:boolean, seed:string}} lever
 */
export function genItem({ setSize, shell, confusable, pressure, changeTrial, seed }) {
  const rng = makeRng(seed);
  const gridSize = gridSizeForSet(setSize);
  const cells = sampleCells(setSize, gridSize, confusable, rng);

  const pool = confusable ? RAMP_HUES : DISTINCT_HUES;
  const hues = shuffle(pool, rng).slice(0, setSize);
  const array = cells.map((cell, i) => ({
    cell,
    row: rowOf(cell, gridSize),
    col: colOf(cell, gridSize),
    hue: hues[i],
  }));

  const exposureMs = exposureMsFromPressure(pressure);
  const retentionDelayMs = retentionDelayFromPressure(pressure);
  const LEAD_IN_MS = 800;
  const arrayOnsetMs = LEAD_IN_MS;
  const arrayOffsetMs = arrayOnsetMs + exposureMs;
  const testOpensAtMs = arrayOffsetMs + retentionDelayMs;

  const presentation = {
    leadInMs: LEAD_IN_MS,
    exposureMs,
    retentionDelayMs,
    simultaneous: true, // the whole array appears at once — no serial order to use
    array,
    arrayOnsetMs,
    arrayOffsetMs,
    testOpensAtMs,
  };

  const base = {
    itemId: seededUuid(seed),
    typeCode: 'WM-gridflash-01',
    domain: 'spatial',
    demoPath: 'demos/WM-gridflash-01.html',
  };

  if (shell === 'change_detection') {
    const probeIdx = Math.floor(rng() * array.length);
    const probed = array[probeIdx];
    let probeHue = probed.hue;
    if (changeTrial) {
      if (confusable) {
        // NEAREST unused step along the ramp: a hard, near-hue change.
        const i = RAMP_HUES.indexOf(probed.hue);
        const free = RAMP_HUES.filter((h) => !hues.includes(h));
        free.sort((a, b) => Math.abs(RAMP_HUES.indexOf(a) - i) - Math.abs(RAMP_HUES.indexOf(b) - i));
        probeHue = free[0];
      } else {
        // Any unused far hue: an easy, obvious change.
        const free = DISTINCT_HUES.filter((h) => !hues.includes(h));
        probeHue = free[Math.floor(rng() * free.length)];
      }
      if (!probeHue) throw new Error('no unused hue available for a change trial — widen the palette');
    }
    const correctKey = changeTrial ? 'CHANGED' : 'SAME';
    const difficulty = round2(difficultyFromLevers(setSize, shell, confusable, pressure));

    return {
      ...base,
      difficulty,
      ageBands: ageBandsFor(difficulty),
      content: {
        typeCode: 'WM-gridflash-01',
        grid: { rows: gridSize, cols: gridSize, cellCount: gridSize * gridSize },
        setSize,
        shell,
        identitySet: confusable ? 'confusable' : 'distinct',
        // PRESENTATION PHASE ONLY (sealed before the test display opens).
        presentation,
        // RESPONSE PHASE ONLY. The probe is what the test legitimately shows; the
        // ORIGINAL colour of that cell is not reachable from here.
        responsePhase: {
          mode: 'two_choice',
          prompt: 'Is this star the SAME colour as before, or CHANGED?',
          probe: { cell: probed.cell, row: probed.row, col: probed.col, hue: probeHue },
          options: [
            { key: 'SAME', label: 'SAME', hotkey: 'ArrowLeft' },
            { key: 'CHANGED', label: 'CHANGED', hotkey: 'ArrowRight' },
          ],
          untimed: true,
          latencyAnchor: 'test_open',
        },
        instructions: {
          howto:
            'Stars flash on the grid all at once, then go dark. After a short wait one star comes back. Decide if its colour is the SAME as before or CHANGED. Use the buttons or the left and right arrow keys. Take as long as you need.',
          readingGate: 'D-017: on-screen text only, never audio.',
        },
      },
      answer: {
        correctKey,
        trialType: changeTrial ? 'change' : 'same',
        probedCell: probed.cell,
        originalHue: probed.hue,
        probeHue,
        distractorRationales: {
          SAME: changeTrial
            ? { lure: 'miss', note: 'the probed star did change; answering SAME means the colour was not held in visual working memory (a miss)' }
            : { lure: 'correct', note: 'the probed star is unchanged' },
          CHANGED: changeTrial
            ? { lure: 'correct', note: 'the probed star changed colour' }
            : { lure: 'false_alarm', note: 'the probed star did not change; answering CHANGED is a false alarm and marks a liberal bias, not lost capacity' },
        },
      },
      scoring: {
        mode: 'computed_solver',
        solver: 'wm-change-detection-sdt@1',
        spec: {
          unitsTotal: 1,
          correct: 'response.selectedKey === answer.correctKey',
          score: 'correct ? 1 : 0',
          sdtCategory:
            "trialType === 'change' ? (selectedKey === 'CHANGED' ? 'hit' : 'miss') : (selectedKey === 'CHANGED' ? 'false_alarm' : 'correct_rejection')",
          dprime:
            'across items at a set size: z(hitRate) - z(falseAlarmRate), loglinear-corrected (hits+0.5)/(nChange+1) and (fa+0.5)/(nSame+1)',
          capacityK: "Cowan's K = setSize * (hitRate - falseAlarmRate), accumulated per set size",
          spanContribution: 'M-SPAN = the largest set size whose corrected (hitRate - falseAlarmRate) stays above the policy threshold',
          partialCredit: 'a single probe is dichotomous; polytomous information for this type comes from the recognition shell and from the set-size ladder',
          errorTaxonomy: { none: 'correct', miss: 'change trial answered SAME', false_alarm: 'same trial answered CHANGED' },
        },
        clientMetrics: ['M-SPAN', 'M-DIFFREACH', 'M-RT', 'M-RTFIRST', 'M-REV', 'M-ENGAGE', 'M-RAPIDGUESS', 'M-LAPSE'],
        serverMetrics: ['M-ACC', 'M-DPRIME', 'M-ERRTYPE', 'M-CONSIST', 'M-POLY', 'M-LEARNRATE'],
      },
      provenance: {
        generator: 'grammar',
        generatorRef: 'wm-gridflash-01-array-grammar@1',
        seed,
        levers: { setSize, shell, confusable, changeTrial, pressure },
      },
      syntheticOnly: true,
      validated: false,
    };
  }

  // ---- recognition shell: tap back every lit cell (order-free set) ----
  const expectedCells = cells.slice();
  const unlit = Array.from({ length: gridSize * gridSize }, (_, i) => i).filter((c) => !cells.includes(c));
  const distractorRationales = {
    correct: { lure: 'correct', cells: expectedCells.slice(), note: 'reproduces exactly the lit set' },
  };
  const addLure = (key, lure, set, note) => {
    if (!set || set.length === 0) return;
    const sig = JSON.stringify(set.slice().sort((a, b) => a - b));
    if (sig === JSON.stringify(expectedCells)) return;
    if (Object.values(distractorRationales).some((r) => JSON.stringify(r.cells.slice().sort((a, b) => a - b)) === sig)) return;
    distractorRationales[key] = { lure, cells: set.slice().sort((a, b) => a - b), note };
  };
  {
    // Swap one lit cell for an unlit neighbour: the location was held approximately.
    const victim = expectedCells[expectedCells.length - 1];
    const neighbour = unlit.find((c) => orthAdjacent(c, victim, gridSize));
    if (neighbour != null) {
      addLure(
        'adjacent_substitution',
        'spatial_imprecision',
        expectedCells.filter((c) => c !== victim).concat([neighbour]),
        'one lit cell replaced by an adjacent dark cell: the position was held imprecisely rather than lost',
      );
    }
  }
  if (unlit.length) {
    addLure(
      'novel_intrusion',
      'intrusion',
      expectedCells.slice(0, -1).concat([unlit[Math.floor(rng() * unlit.length)]]),
      'one lit cell replaced by a far, never-lit cell: that location was lost, not approximated',
    );
  }
  addLure('incomplete_set', 'omission', expectedCells.slice(0, -1), 'stops one cell short: fewer locations survived than were flashed');

  const difficulty = round2(difficultyFromLevers(setSize, shell, confusable, pressure));
  return {
    ...base,
    difficulty,
    ageBands: ageBandsFor(difficulty),
    content: {
      typeCode: 'WM-gridflash-01',
      grid: { rows: gridSize, cols: gridSize, cellCount: gridSize * gridSize },
      setSize,
      shell,
      identitySet: confusable ? 'confusable' : 'distinct',
      presentation,
      // RESPONSE PHASE ONLY: how many cells to tap, and nothing about which.
      responsePhase: {
        mode: 'select_set',
        prompt: 'Tap every square that had a star. Order does not matter.',
        selectionsRequired: setSize,
        deselectEnabled: true,
        untimed: true,
        latencyAnchor: 'test_open',
      },
      instructions: {
        howto:
          'Stars flash on the grid all at once, then go dark. Tap every square that had a star in it. The order does not matter. Tap a square again to undo it. Take as long as you need.',
        readingGate: 'D-017: on-screen text only, never audio.',
      },
    },
    answer: {
      correctKey: expectedCells.map((c) => cellLabel(c, gridSize)).join('-'),
      expectedCells,
      litHues: array.map((a) => ({ cell: a.cell, hue: a.hue })),
      distractorRationales,
    },
    scoring: {
      mode: 'computed_solver',
      solver: 'wm-array-recognition-partial-credit@1',
      spec: {
        unitsTotal: setSize,
        unitsCorrect: 'size of the intersection of response.selectedCells with answer.expectedCells',
        score: 'unitsCorrect / unitsTotal, rounded to 4 decimals',
        correct: 'response.selectedCells is exactly answer.expectedCells as a set',
        longestCorrectRun: 'longest run of consecutive picks in response.selectionOrder that are all in expectedCells',
        falseAlarms: 'number of selected cells not in expectedCells',
        omissions: 'unitsTotal - response.selectedCells.length when the child submits short',
        capacityK: "Cowan's K = setSize * (hitRate - falseAlarmRate) using the per-cell hit and false-alarm rates",
        errorTaxonomy: {
          none: 'exact set match',
          spatial_imprecision: 'every false alarm is orthogonally adjacent to a missed lit cell',
          intrusion: 'at least one false alarm is not adjacent to any lit cell',
          omission: 'fewer cells submitted than were flashed',
        },
        lureMatch: 'if the selected set equals a distractorRationales[*].cells set, tag M-ERRTYPE with that lure label',
      },
      clientMetrics: ['M-SPAN', 'M-DIFFREACH', 'M-RT', 'M-RTFIRST', 'M-RTVAR', 'M-REV', 'M-LAPSE', 'M-ENGAGE', 'M-RAPIDGUESS', 'M-PATH'],
      serverMetrics: ['M-ACC', 'M-DPRIME', 'M-ERRTYPE', 'M-CONSIST', 'M-POLY', 'M-LEARNRATE'],
    },
    provenance: {
      generator: 'grammar',
      generatorRef: 'wm-gridflash-01-array-grammar@1',
      seed,
      levers: { setSize, shell, confusable, changeTrial: false, pressure },
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
 * BANK BUILDER — >=perBin items in every integer bin 1..20. Change and no-change
 * trials alternate within each bin so d-prime is estimable at every rung
 * (a bank of only change trials cannot separate sensitivity from bias).
 * ================================================================== */
export function buildBank({ perBin = 6 } = {}) {
  const items = [];
  for (let k = 1; k <= 20; k++) {
    const lo = Math.max(1, k - 0.45);
    const hi = Math.min(20, k + 0.45);

    const segments = [];
    for (const cfg of ALLOWED_CONFIGS) {
      const dLo = difficultyFromLevers(cfg.setSize, cfg.shell, cfg.confusable, 0);
      const dHi = difficultyFromLevers(cfg.setSize, cfg.shell, cfg.confusable, 1);
      const a = Math.max(lo, dLo);
      const b = Math.min(hi, dHi);
      if (b > a + 1e-6) segments.push({ ...cfg, tLo: a, tHi: b });
    }
    if (segments.length === 0) throw new Error(`no reachable lever config for difficulty bin k=${k}`);

    const hits = segments.map(() => 0);
    for (let i = 0; i < perBin; i++) hits[i % segments.length]++;
    const localSeen = segments.map(() => 0);
    let changeToggle = k % 2 === 0;

    for (let i = 0; i < perBin; i++) {
      const segIdx = i % segments.length;
      const seg = segments[segIdx];
      const li = localSeen[segIdx]++;
      const t = seg.tLo + (seg.tHi - seg.tLo) * ((li + 0.5) / hits[segIdx]);
      const pressure = solvePressure(seg.setSize, seg.shell, seg.confusable, t);
      let changeTrial = false;
      if (seg.shell === 'change_detection') {
        changeTrial = changeToggle;
        changeToggle = !changeToggle;
      }
      const seed = `WM-gridflash-01|bin=${k}|i=${i}|N${seg.setSize}${seg.shell === 'recognition' ? 'R' : 'C'}${seg.confusable ? 'F' : 'D'}${changeTrial ? 'X' : 'S'}`;
      items.push(genItem({ setSize: seg.setSize, shell: seg.shell, confusable: seg.confusable, pressure, changeTrial, seed }));
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
  const outPath = resolve(__dirname, '../banks/WM-gridflash-01.jsonl');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, items.map((it) => JSON.stringify(it)).join('\n') + '\n');

  const bins = Array.from({ length: 20 }, () => 0);
  let min = Infinity;
  let max = -Infinity;
  let recog = 0;
  let change = 0;
  let same = 0;
  for (const it of items) {
    const k = Math.round(it.difficulty);
    if (k >= 1 && k <= 20) bins[k - 1]++;
    min = Math.min(min, it.difficulty);
    max = Math.max(max, it.difficulty);
    if (it.content.shell === 'recognition') recog++;
    else if (it.answer.trialType === 'change') change++;
    else same++;
  }
  console.log(`WM-gridflash-01 bank: ${items.length} items -> ${outPath}`);
  console.log(`difficulty span: ${round2(min)} .. ${round2(max)}  (target 1..20)`);
  console.log(`shells: change_detection ${change + same} (change ${change} / same ${same}), recognition ${recog}`);
  console.log('per-bin counts (k: n):');
  console.log(bins.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join('  '));
  const short = bins.map((n, i) => ({ k: i + 1, n })).filter((b) => b.k <= 19 && b.n < 5);
  console.log(short.length ? `SHORT BINS (<5): ${short.map((b) => b.k).join(',')}` : 'all bins 1..19 >=5 OK');
}
