#!/usr/bin/env node
// WM-bubble-01 (Bubble Pop Memory — n-back) — deterministic, seeded bank generator.
//
// One BankItem == one n-back BLOCK. Bubbles rise one at a time carrying a printed
// word (and, at the top bands, a second printed-letter channel). The child taps POP
// when the current bubble matches the one n steps back on that channel.
//
// STRUCTURE is generated deterministically (n, pace, stream length, target rate,
// lure rate, channel count); SURFACE CONTENT is drawn from curated word pools that
// are leveled by lexical difficulty so `content.vocabularyLevel` makes M-VOCABLVL
// derivable per item.
//
// Contract sources (this worktree):
//   docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md  §2 item/result contract, §0 difficulty ramp,
//                                                  §4 basic-core metrics (M-VOCABLVL, M-LURETYPE)
//   research/exam-question-types/catalog/master_types.jsonl   WM-bubble-01 spec
//
// D-017 (reading is a required baseline-literacy gate; audio is prohibited):
//   The spec's "dual visual + AUDITORY n-back" is delivered as a DUAL VISUAL n-back —
//   a printed-word channel plus a printed-letter channel, each with its own POP
//   control. No tones, no narration, no speech synthesis anywhere in this type.
//
// Governance: born-synthetic. Every item carries syntheticOnly:true, validated:false.
// Ordinal design difficulty is NOT calibrated IRT. No live child data. (RES-012/RES-013)
//
// Usage:
//   node generators/WM-bubble-01.mjs            # build + validate + write banks/WM-bubble-01.jsonl
//   node generators/WM-bubble-01.mjs --check    # build in-memory + validate, do not write
//   node generators/WM-bubble-01.mjs --validate # validate the JSONL already on disk
//   node generators/WM-bubble-01.mjs --print 2  # print the first N built items

import { createHash } from 'node:crypto';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { lureLabel, serializeBank } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK_PATH = join(__dirname, '..', 'banks', 'WM-bubble-01.jsonl');

export const TYPE_CODE = 'WM-bubble-01';
export const DOMAIN = 'verbal';
const DEMO_PATH = 'demos/WM-bubble-01.html';
const GENERATOR_REF = 'WM-bubble-01/seeded-nback-streams@v1';

export const ITEMS_PER_BAND = 6; // 20 bands x 6 = 120 items (>=5 per +/-1 pt band)

// Allowed lure classes. Every decidable step of every channel carries exactly one.
export const LURE_CLASSES = new Set([
  'correct',                    // a true n-back match: POP is the only defensible response
  'lure-n-minus-1',             // matches the bubble n-1 back (fragile temporal binding)
  'lure-n-plus-1',              // matches the bubble n+1 back
  'familiar-but-off-position',  // seen earlier in the stream, but not at n, n-1 or n+1
  'novel-foil',                 // never seen before in this stream
  'lead-in-no-target',          // first n steps: no n-back exists yet, POP is never defensible
]);

// ---------------------------------------------------------------------------
// Curated word pools, leveled by lexical difficulty (7 = most common / shortest).
// The n-back does not require comprehension, but encoding cost rises with lexical
// level, so the pool level is one of the difficulty levers AND the recorded
// vocabulary level for M-VOCABLVL.
// ---------------------------------------------------------------------------
export const WORD_POOLS = {
  7: ['SUN', 'MOON', 'CAT', 'DOG', 'BALL', 'TREE', 'FISH', 'BIRD', 'CUP', 'HAT',
      'BED', 'BUS', 'EGG', 'BOX', 'KEY', 'LEG', 'PIG', 'CAR', 'MAP', 'PEN'],
  6: ['STAR', 'LAMP', 'DESK', 'BOOK', 'CHAIR', 'APPLE', 'HOUSE', 'CLOUD', 'RIVER', 'TABLE',
      'PLANT', 'HORSE', 'BREAD', 'CLOCK', 'SPOON', 'FLOWER', 'WINDOW', 'GARDEN', 'PENCIL', 'BUTTON'],
  5: ['BRIDGE', 'POCKET', 'BASKET', 'CANDLE', 'TICKET', 'FOREST', 'MARKET', 'SILVER', 'LADDER', 'SADDLE',
      'MEADOW', 'ANCHOR', 'HARBOR', 'ORCHARD', 'LANTERN', 'COMPASS', 'PEBBLE', 'TUNNEL', 'FEATHER', 'MIRROR'],
  4: ['CANYON', 'GLACIER', 'SUMMIT', 'PRAIRIE', 'THICKET', 'SATCHEL', 'TRELLIS', 'LAGOON', 'QUARRY', 'GRANITE',
      'VOLCANO', 'CAVERN', 'TUNDRA', 'BOULDER', 'PLATEAU', 'GEYSER', 'RIDGE', 'BASIN', 'MARSH', 'DELTA'],
  3: ['AQUEDUCT', 'CITADEL', 'CRESCENT', 'MERIDIAN', 'ARCHIVE', 'PENDULUM', 'OBELISK', 'TURBINE', 'SEXTANT', 'FRESCO',
      'PORTICO', 'ROTUNDA', 'ALCOVE', 'PARAPET', 'CORNICE', 'BELFRY', 'CUPOLA', 'TERRACE', 'MOSAIC', 'LATTICE'],
  2: ['ZEPHYR', 'ISTHMUS', 'ESTUARY', 'MORAINE', 'ALLUVIUM', 'CALDERA', 'SAVANNA', 'STEPPE', 'ATOLL', 'KARST',
      'LOESS', 'SCARP', 'SHOAL', 'TARN', 'BUTTE', 'MESA', 'FJORD', 'WADI', 'PLAYA', 'CIRQUE'],
  1: ['SYZYGY', 'QUIXOTIC', 'EPHEMERA', 'LABYRINTH', 'PALIMPSEST', 'ZIGGURAT', 'CARTOUCHE', 'ESCARPMENT',
      'PROMONTORY', 'ARCHIPELAGO', 'TESSERA', 'CONFLUENCE', 'PENUMBRA', 'APERTURE', 'FILIGREE', 'MARQUETRY',
      'ARABESQUE', 'CANTILEVER', 'BALUSTRADE', 'ANTIQUARY'],
};

// Second visual channel (replaces the spec's prohibited audio channel): printed
// letters, visually distinct (I/O/Q/U dropped as confusable or vowel-clustered).
export const LETTER_POOL = ['B', 'D', 'F', 'H', 'K', 'L', 'M', 'N', 'P', 'R', 'S', 'T', 'V', 'W', 'X', 'Z'];

// ---------------------------------------------------------------------------
// Difficulty ladder (build plan §0):
//   bands  1-8  -> grades 2-3  (n = 1..2, gentle pace, short streams, common words)
//   bands  9-12 -> grades 4-5  (n = 3, faster, longer streams)
//   bands 13-16 -> grades 6-8  (n = 3..4, dual visual channel)
//   bands 17-20 -> above level (n = 4..5, fast pace, dense lures, rare words)
// K-1 is NOT a band for this type (spec age_bands: 2-3 / 4-5 / 6-8).
// ---------------------------------------------------------------------------
export const BAND_LEVERS = {
  1:  { n: 1, paceMs: 2600, streamLength: 10, targetRate: 0.30, lureRate: 0.00, dual: false, vocabularyLevel: 7 },
  2:  { n: 1, paceMs: 2450, streamLength: 11, targetRate: 0.30, lureRate: 0.10, dual: false, vocabularyLevel: 7 },
  3:  { n: 1, paceMs: 2300, streamLength: 12, targetRate: 0.30, lureRate: 0.15, dual: false, vocabularyLevel: 6 },
  4:  { n: 1, paceMs: 2150, streamLength: 13, targetRate: 0.30, lureRate: 0.20, dual: false, vocabularyLevel: 6 },
  5:  { n: 2, paceMs: 2150, streamLength: 14, targetRate: 0.30, lureRate: 0.15, dual: false, vocabularyLevel: 6 },
  6:  { n: 2, paceMs: 2000, streamLength: 15, targetRate: 0.30, lureRate: 0.20, dual: false, vocabularyLevel: 5 },
  7:  { n: 2, paceMs: 1900, streamLength: 16, targetRate: 0.30, lureRate: 0.20, dual: false, vocabularyLevel: 5 },
  8:  { n: 2, paceMs: 1800, streamLength: 17, targetRate: 0.30, lureRate: 0.25, dual: false, vocabularyLevel: 5 },
  9:  { n: 3, paceMs: 1800, streamLength: 18, targetRate: 0.28, lureRate: 0.20, dual: false, vocabularyLevel: 4 },
  10: { n: 3, paceMs: 1700, streamLength: 19, targetRate: 0.28, lureRate: 0.22, dual: false, vocabularyLevel: 4 },
  11: { n: 3, paceMs: 1600, streamLength: 20, targetRate: 0.28, lureRate: 0.25, dual: false, vocabularyLevel: 4 },
  12: { n: 3, paceMs: 1550, streamLength: 21, targetRate: 0.28, lureRate: 0.28, dual: false, vocabularyLevel: 3 },
  13: { n: 3, paceMs: 1500, streamLength: 21, targetRate: 0.28, lureRate: 0.28, dual: true,  vocabularyLevel: 3 },
  14: { n: 4, paceMs: 1500, streamLength: 22, targetRate: 0.28, lureRate: 0.25, dual: true,  vocabularyLevel: 3 },
  15: { n: 4, paceMs: 1450, streamLength: 23, targetRate: 0.28, lureRate: 0.28, dual: true,  vocabularyLevel: 3 },
  16: { n: 4, paceMs: 1400, streamLength: 24, targetRate: 0.28, lureRate: 0.30, dual: true,  vocabularyLevel: 2 },
  17: { n: 4, paceMs: 1350, streamLength: 25, targetRate: 0.28, lureRate: 0.32, dual: true,  vocabularyLevel: 2 },
  18: { n: 5, paceMs: 1300, streamLength: 26, targetRate: 0.26, lureRate: 0.30, dual: true,  vocabularyLevel: 2 },
  19: { n: 5, paceMs: 1250, streamLength: 27, targetRate: 0.26, lureRate: 0.32, dual: true,  vocabularyLevel: 1 },
  20: { n: 5, paceMs: 1200, streamLength: 28, targetRate: 0.26, lureRate: 0.35, dual: true,  vocabularyLevel: 1 },
};

// Within-band micro-levers: 6 slots ordered easy -> hard inside the band.
const SLOT_STREAM_DELTA = [-1, -1, 0, 0, 1, 1];
const SLOT_PACE_DELTA = [80, 40, 0, 0, -40, -80];

// ---------------------------------------------------------------------------
// Deterministic helpers.
// ---------------------------------------------------------------------------
function uuidFrom(str) {
  const h = createHash('sha1').update(str).digest('hex');
  const variant = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
function hashNum(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
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
function shuffled(arr, rnd) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Difficulty grid: band + slot offset, so round(difficulty) == band for all 6 slots.
export function difficultyFor(band, slot) {
  let offsets;
  if (band === 1) offsets = [0, 0.08, 0.16, 0.24, 0.32, 0.4];
  else if (band === 20) offsets = [-0.4, -0.32, -0.24, -0.16, -0.08, 0];
  else offsets = [-0.4, -0.24, -0.08, 0.08, 0.24, 0.4];
  return Math.round(Math.min(20, Math.max(1, band + offsets[slot])) * 100) / 100;
}

// Spec age_bands are 2-3 / 4-5 / 6-8 — there is no K-1 band for this type.
export function ageBandsFor(difficulty) {
  if (difficulty < 8) return ['2-3'];
  if (difficulty < 12) return ['4-5'];
  return ['6-8'];
}

// ---------------------------------------------------------------------------
// Stream construction. The role plan is a target; the RECORDED key is always
// re-derived from the finished stream (`targetsOf`), so a construction collision
// can never desynchronise the key from the stimulus.
// ---------------------------------------------------------------------------
export function targetsOf(stream, n) {
  const t = [];
  for (let i = n; i < stream.length; i++) if (stream[i] === stream[i - n]) t.push(i);
  return t;
}

// Independent, position-by-position lure taxonomy (used by the generator AND
// re-derived by check-WM-bubble-01.mjs straight from content).
export function lureLabelAt(stream, n, i) {
  if (i < n) return 'lead-in-no-target';
  if (stream[i] === stream[i - n]) return 'correct';
  if (n - 1 >= 1 && i - (n - 1) >= 0 && stream[i] === stream[i - (n - 1)]) return 'lure-n-minus-1';
  if (i - (n + 1) >= 0 && stream[i] === stream[i - (n + 1)]) return 'lure-n-plus-1';
  for (let j = 0; j < i; j++) if (stream[j] === stream[i]) return 'familiar-but-off-position';
  return 'novel-foil';
}

function buildStream(pool, n, length, targetRate, lureRate, seed) {
  const rnd = mulberry32(seed);
  const decidable = length - n;
  const nTargets = Math.max(2, Math.round(decidable * targetRate));
  const nLures = Math.min(decidable - nTargets, Math.round(decidable * lureRate));
  const plan = shuffled(
    [...Array(nTargets).fill('target'), ...Array(nLures).fill('lure'),
     ...Array(decidable - nTargets - nLures).fill('foil')],
    rnd,
  );

  const stream = [];
  const bag = shuffled(pool, rnd);
  let bagIdx = 0;
  const nextFresh = (forbidden) => {
    for (let tries = 0; tries < pool.length * 3; tries++) {
      const w = bag[bagIdx++ % bag.length];
      if (!forbidden.includes(w)) return w;
    }
    return bag[bagIdx++ % bag.length];
  };

  for (let i = 0; i < n; i++) stream.push(nextFresh(stream));

  for (let i = n; i < length; i++) {
    const role = plan[i - n];
    const atN = stream[i - n];
    if (role === 'target') { stream.push(atN); continue; }
    // Non-targets must never accidentally equal the n-back item.
    if (role === 'lure') {
      const offsets = [];
      if (n - 1 >= 1 && i - (n - 1) >= 0) offsets.push(n - 1);
      if (i - (n + 1) >= 0) offsets.push(n + 1);
      const usable = offsets.filter((o) => stream[i - o] !== atN);
      if (usable.length) { stream.push(stream[i - usable[Math.floor(rnd() * usable.length)]]); continue; }
    }
    // foil (or a lure that had no usable offset): fresh-ish word that is not the
    // n-back item and not an accidental n±1 lure.
    const forbidden = [atN];
    if (n - 1 >= 1 && i - (n - 1) >= 0) forbidden.push(stream[i - (n - 1)]);
    if (i - (n + 1) >= 0) forbidden.push(stream[i - (n + 1)]);
    stream.push(nextFresh(forbidden));
  }
  return stream;
}

// ---------------------------------------------------------------------------
// Build one BankItem (one n-back block).
// ---------------------------------------------------------------------------
export function buildItem(band, slot) {
  const base = BAND_LEVERS[band];
  const seed = `${TYPE_CODE}:b${band}:s${slot}`;
  const itemId = uuidFrom(seed);
  const difficulty = difficultyFor(band, slot);
  const streamLength = base.streamLength + SLOT_STREAM_DELTA[slot];
  const paceMs = base.paceMs + SLOT_PACE_DELTA[slot];
  const n = base.n;

  const channels = [{
    id: 'w',
    label: 'Word',
    kind: 'word',
    popLabel: 'POP WORD',
    hotkey: 'F',
    stream: buildStream(WORD_POOLS[base.vocabularyLevel], n, streamLength, base.targetRate, base.lureRate, hashNum(seed + ':w')),
  }];
  if (base.dual) {
    channels.push({
      id: 'l',
      label: 'Letter',
      kind: 'letter',
      popLabel: 'POP LETTER',
      hotkey: 'J',
      stream: buildStream(LETTER_POOL, n, streamLength, base.targetRate, base.lureRate, hashNum(seed + ':l')),
    });
  }

  // Key + lure taxonomy are DERIVED FROM THE FINISHED STREAMS, never from the plan.
  const correctKey = channels
    .map((ch) => `${ch.id}:${targetsOf(ch.stream, n).join(',')}`)
    .join('|');
  const distractorRationales = {};
  for (const ch of channels) {
    ch.stream.forEach((_, i) => {
      const lure = lureLabelAt(ch.stream, n, i);
      distractorRationales[`${ch.id}:${i}`] = { lure, why: WHY[lure] };
    });
  }

  return {
    itemId,
    typeCode: TYPE_CODE,
    domain: DOMAIN,
    difficulty,
    ageBands: ageBandsFor(difficulty),
    demoPath: DEMO_PATH,
    content: {
      typeCode: TYPE_CODE,
      presentation: 'text',      // D-017: printed words/letters only, never audio
      n,
      paceMs,
      responseWindowMs: paceMs,  // generous: a pop counts for the whole bubble
      streamLength,
      leadInSteps: n,            // the first n bubbles cannot be matches — input stays locked
      channels,
      vocabularyLevel: base.vocabularyLevel,
      prompt: `Tap POP when the bubble is the same as the one ${n} bubble${n === 1 ? '' : 's'} ago.`,
    },
    answer: { correctKey, distractorRationales },
    scoring: { mode: 'computed_solver' },
    provenance: {
      generator: 'grammar',
      generatorRef: GENERATOR_REF,
      seed,
      levers: { band, slot, n, paceMs, streamLength, targetRate: base.targetRate, lureRate: base.lureRate, dual: base.dual, vocabularyLevel: base.vocabularyLevel },
      validator: verdictsFor(channels, n),
    },
    syntheticOnly: true,
    validated: false,
  };
}

const WHY = {
  'correct': 'matches the bubble n steps back — POP is the only defensible response here',
  'lure-n-minus-1': 'matches n-1 back: fragile temporal binding produces a false alarm',
  'lure-n-plus-1': 'matches n+1 back: fragile temporal binding produces a false alarm',
  'familiar-but-off-position': 'seen earlier in the stream but not at n, n-1 or n+1 — familiarity without position',
  'novel-foil': 'never seen in this stream — a pop here is response bias, not memory',
  'lead-in-no-target': 'inside the lead-in: no n-back item exists yet, so no pop is defensible',
};

function verdictsFor(channels, n) {
  const out = [];
  for (const ch of channels) {
    const targets = targetsOf(ch.stream, n);
    const decidable = ch.stream.length - n;
    out.push({
      check: `unique_response_${ch.id}`,
      status: targets.length >= 2 ? 'pass' : 'fail',
      detail: `${targets.length} targets in ${decidable} decidable steps (rate ${(targets.length / decidable).toFixed(2)})`,
    });
    const lures = ch.stream.filter((_, i) => {
      const l = lureLabelAt(ch.stream, n, i);
      return l === 'lure-n-minus-1' || l === 'lure-n-plus-1';
    }).length;
    out.push({ check: `lure_taxonomy_ok_${ch.id}`, status: 'pass', detail: `${lures} n+/-1 lures` });
  }
  out.push({ check: 'no_audio', status: 'pass', detail: 'D-017: printed word/letter channels only' });
  return out;
}

export function buildBank() {
  const items = [];
  for (let band = 1; band <= 20; band++) {
    for (let slot = 0; slot < ITEMS_PER_BAND; slot++) items.push(buildItem(band, slot));
  }
  return items;
}

// ---------------------------------------------------------------------------
// Build-time validation (the generator refuses to write a bad bank).
// ---------------------------------------------------------------------------
export function validateItems(items) {
  const errors = [];
  const binCounts = {};
  for (let b = 1; b <= 20; b++) binCounts[b] = 0;

  items.forEach((it, idx) => {
    const where = `item[${idx}] ${it && it.itemId ? it.itemId : '(no id)'}`;
    if (it.typeCode !== TYPE_CODE) errors.push(`${where}: bad typeCode`);
    if (it.domain !== DOMAIN) errors.push(`${where}: bad domain`);
    if (it.syntheticOnly !== true || it.validated !== false) errors.push(`${where}: born-synthetic flags wrong`);
    if (it.scoring.mode !== 'computed_solver') errors.push(`${where}: scoring.mode must be computed_solver`);
    if (typeof it.difficulty !== 'number' || it.difficulty < 1 || it.difficulty > 20) errors.push(`${where}: difficulty out of range`);
    else binCounts[Math.round(it.difficulty)]++;

    const c = it.content;
    const parsed = parseCorrectKey(it.answer.correctKey);
    if (Object.keys(parsed).length !== c.channels.length) errors.push(`${where}: correctKey channel count mismatch`);
    for (const ch of c.channels) {
      if (ch.stream.length !== c.streamLength) errors.push(`${where}: channel ${ch.id} stream length mismatch`);
      const derived = targetsOf(ch.stream, c.n);
      if (derived.length < 2) errors.push(`${where}: channel ${ch.id} has <2 targets`);
      if (String(derived) !== String(parsed[ch.id] || [])) errors.push(`${where}: channel ${ch.id} key != stream-derived targets`);
      ch.stream.forEach((_, i) => {
        const k = `${ch.id}:${i}`;
        const r = it.answer.distractorRationales[k];
        // serializeBank rewrites each rationale's `lure` into the D-020
        // lureClass/lureDetail pair, so read the label through lureLabel:
        // `.lure` is undefined for every entry parsed back off disk.
        const label = lureLabel(r);
        if (!r) errors.push(`${where}: missing rationale ${k}`);
        else if (label !== lureLabelAt(ch.stream, c.n, i)) errors.push(`${where}: rationale ${k} lure mismatch`);
        else if (!LURE_CLASSES.has(label)) errors.push(`${where}: rationale ${k} unknown lure class`);
      });
    }
  });

  const short = Object.entries(binCounts).filter(([b, n]) => Number(b) <= 19 && n < 5);
  if (short.length) errors.push(`coverage: buckets with <5 items -> ${short.map(([b, n]) => `${b}:${n}`).join(', ')}`);
  const ids = items.map((i) => i.itemId);
  if (new Set(ids).size !== ids.length) errors.push('itemId collision');

  return { ok: errors.length === 0, errors, count: items.length, binCounts };
}

export function parseCorrectKey(key) {
  const out = {};
  for (const part of String(key).split('|')) {
    const [id, list] = part.split(':');
    out[id] = list && list.length ? list.split(',').map(Number) : [];
  }
  return out;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function writeBank(items) {
  mkdirSync(dirname(BANK_PATH), { recursive: true });
  writeFileSync(BANK_PATH, serializeBank(items), 'utf8');
}
function printCoverage(r) {
  console.log(`items: ${r.count}`);
  console.log('per integer bucket (k:n):  ' + Object.entries(r.binCounts).map(([b, n]) => `${String(b).padStart(2)}:${n}`).join(' '));
}
function main() {
  const argv = process.argv.slice(2);
  const has = (f) => argv.includes(f);

  if (has('--print')) {
    const n = Number(argv[argv.indexOf('--print') + 1]) || 2;
    console.log(JSON.stringify(buildBank().slice(0, n), null, 2));
    return;
  }
  if (has('--validate')) {
    if (!existsSync(BANK_PATH)) { console.error(`bank not found: ${BANK_PATH}`); process.exit(1); }
    const items = readFileSync(BANK_PATH, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
    const r = validateItems(items);
    printCoverage(r);
    if (!r.ok) { console.error('\nVALIDATION FAILED:\n' + r.errors.map((e) => '  - ' + e).join('\n')); process.exit(1); }
    console.log('\nVALIDATION PASSED (on-disk bank).');
    return;
  }
  const items = buildBank();
  const r = validateItems(items);
  printCoverage(r);
  if (!r.ok) { console.error('\nREFUSING TO WRITE — validation failed:\n' + r.errors.slice(0, 30).map((e) => '  - ' + e).join('\n')); process.exit(1); }
  if (has('--check')) { console.log('\nCHECK PASSED (in-memory, not written).'); return; }
  writeBank(items);
  console.log(`\nwrote ${items.length} items -> ${BANK_PATH}`);
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main();
