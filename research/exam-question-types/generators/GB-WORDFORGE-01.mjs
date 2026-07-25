#!/usr/bin/env node
// GB-WORDFORGE-01 (Word Forge) — structured bank generator (grammar, seeded, deterministic).
//
// The child is given a rack of letter tiles and forges as many real words as possible before a
// timer runs out. Open production means there is no single right answer — but there IS an exact
// answer SET: every word in the curated lexicon whose letters are a sub-multiset of the rack and
// whose length meets the item's minimum. That set is enumerable, so the item is a
// `computed_solver` item and check-GB-WORDFORGE-01.mjs can re-derive it from scratch and assert
// the stored key is EXACTLY the derivable set — no more, no fewer.
//
// Contract sources (this worktree):
//   docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md  §2 item/result contract, §0 difficulty ramp,
//                                                  §4 basic-core metrics (M-IDEAFLU as a plain
//                                                  count, M-VOCABLVL for verbal)
//   research/exam-question-types/catalog/master_types.jsonl  GB-WORDFORGE-01 spec
//
// Difficulty levers (spec `adaptive.difficulty_levers`), all recorded per item:
//   (1) rack size              5 -> 8 tiles (search space)
//   (2) minimum word length    3 -> 5 (short high-frequency hits stop scoring)
//   (3) what the rack affords  a large common-word set -> a small, rare, long-word set
//   (4) time budget            75s -> 40s
// The tail deliberately keeps the forgeable set in the 6-16 range rather than shrinking it to
// two or three words: M-IDEAFLU is the ceiling-resistant separator for this type, and a rack
// that affords almost nothing turns a continuous fluency count back into a coin flip.
// Tiles are reusable ACROSS words but each tile is used at most once WITHIN a word, so the
// answer set is a clean sub-multiset enumeration.
//
// D-017: the stimulus is printed letters and printed text. No audio (the catalog's
// "letters are voiced on tap" affordance is deliberately NOT implemented — see the report).
//
// Governance: born-synthetic. syntheticOnly:true, validated:false. The 1..20 difficulty is a
// design rung, NOT calibrated IRT, and no live child data was used (RES-012/RES-013).
//
// Usage:
//   node generators/GB-WORDFORGE-01.mjs             # build + write banks/GB-WORDFORGE-01.jsonl
//   node generators/GB-WORDFORGE-01.mjs --verify    # also print the full per-level report
//   node generators/GB-WORDFORGE-01.mjs --print 1   # print the first N built items

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LEXICON_ID, ENTRIES, wordsOfLength, bandOf, lexiconHash } from './lexicon-child-en.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../banks/GB-WORDFORGE-01.jsonl');

const TYPE_CODE = 'GB-WORDFORGE-01';
const DOMAIN = 'verbal';
const DEMO_PATH = 'demos/GB-WORDFORGE-01.html';
const GENERATOR_REF = 'GB-WORDFORGE-01/rack-enumeration@v1';
const BASE_SEED = 20260724;
const ITEMS_PER_LEVEL = 6;
const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

// ---------------------------------------------------------------------------
// Deterministic RNG + seeded uuid.
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
function seededUuid(seedStr) {
  const b = new Uint8Array(16);
  let h = hashStr(seedStr);
  for (let i = 0; i < 16; i++) { h = (Math.imul(h ^ (h >>> 13), 0x5bd1e995) + i * 0x9e3779b1) >>> 0; b[i] = h & 0xff; }
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const hex = [...b].map(x => x.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
}
function shuffleDet(arr, seedStr) {
  const rng = mulberry32(hashStr(seedStr));
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// ---------------------------------------------------------------------------
// Letter-multiset machinery. `sig(word)` is a 26-slot count vector; a word is forgeable
// from a rack iff its vector is <= the rack's vector slot by slot.
// ---------------------------------------------------------------------------
export function sig(word) {
  const v = new Uint8Array(26);
  for (const ch of word) v[ch.charCodeAt(0) - 65]++;
  return v;
}
export function fitsIn(wordSig, rackSig) {
  for (let i = 0; i < 26; i++) if (wordSig[i] > rackSig[i]) return false;
  return true;
}
/** Sorted-letters key: two racks with the same key are the same rack. */
export function rackKey(letters) {
  return letters.slice().sort().join('');
}

const ALL = ENTRIES.map(([w, band]) => ({ w, band, len: w.length, s: sig(w) }));

/** Every lexicon word of length >= minLen forgeable from `letters`. Sorted, deterministic. */
export function forgeableWords(letters, minLen) {
  const rs = sig(letters.join(''));
  const maxLen = letters.length;
  const out = [];
  for (const e of ALL) {
    if (e.len < minLen || e.len > maxLen) continue;
    if (fitsIn(e.s, rs)) out.push(e);
  }
  out.sort((a, b) => (a.len - b.len) || (a.w < b.w ? -1 : a.w > b.w ? 1 : 0));
  return out;
}

// ---------------------------------------------------------------------------
// Difficulty ramp: one profile per level 1..20.
//   rackSize    tiles on the rack
//   minLen      shortest word that scores
//   time        seconds on the sand timer
//   count       acceptable [min, max] size of the forgeable set (the rack's affordance)
//   quantile    where in the easy -> hard ordering of qualifying racks to draw from
// ---------------------------------------------------------------------------
const PROFILES = {
  1:  { rackSize: 5, minLen: 3, time: 75, count: [18, 60], quantile: 0.00 },
  2:  { rackSize: 5, minLen: 3, time: 72, count: [14, 50], quantile: 0.12 },
  3:  { rackSize: 6, minLen: 3, time: 70, count: [22, 70], quantile: 0.06 },
  4:  { rackSize: 6, minLen: 3, time: 68, count: [18, 60], quantile: 0.18 },
  5:  { rackSize: 6, minLen: 3, time: 66, count: [14, 45], quantile: 0.32 },
  6:  { rackSize: 6, minLen: 4, time: 64, count: [10, 30], quantile: 0.10 },
  7:  { rackSize: 6, minLen: 4, time: 62, count: [8, 24],  quantile: 0.26 },
  8:  { rackSize: 7, minLen: 4, time: 62, count: [14, 40], quantile: 0.14 },
  9:  { rackSize: 7, minLen: 4, time: 60, count: [12, 34], quantile: 0.28 },
  10: { rackSize: 7, minLen: 4, time: 58, count: [10, 28], quantile: 0.42 },
  11: { rackSize: 7, minLen: 4, time: 56, count: [8, 22],  quantile: 0.56 },
  12: { rackSize: 7, minLen: 4, time: 54, count: [8, 18],  quantile: 0.70 },
  13: { rackSize: 8, minLen: 5, time: 54, count: [14, 26], quantile: 0.25 },
  14: { rackSize: 8, minLen: 5, time: 52, count: [12, 22], quantile: 0.38 },
  15: { rackSize: 8, minLen: 5, time: 50, count: [11, 20], quantile: 0.50 },
  16: { rackSize: 8, minLen: 5, time: 48, count: [10, 18], quantile: 0.60 },
  17: { rackSize: 8, minLen: 5, time: 46, count: [9, 16],  quantile: 0.70 },
  18: { rackSize: 8, minLen: 5, time: 44, count: [8, 15],  quantile: 0.80 },
  19: { rackSize: 8, minLen: 5, time: 42, count: [7, 13],  quantile: 0.88 },
  20: { rackSize: 8, minLen: 5, time: 40, count: [6, 12],  quantile: 0.97 },
};

// An 8-tile rack is a 7-letter seed word plus one extra tile, since the lexicon tops out at
// seven letters. The extra tile comes from this fixed pool of high-yield letters so the rack
// stays forgeable rather than turning into a pile of dead consonants.
const EIGHTH_TILE_POOL = ['A', 'E', 'I', 'O', 'U', 'R', 'S', 'T', 'L', 'N', 'D', 'G'];

// BUILD_PLAN §0 grade mapping (levels 17-20 are the above-level tail; the AgeBand vocabulary
// tops out at 6-8, so the tail is tagged 6-8 and flagged in provenance).
function ageBandsForLevel(L) {
  if (L <= 4) return ['K-1'];
  if (L <= 8) return ['2-3'];
  if (L <= 12) return ['4-5'];
  return ['6-8'];
}
function targetLabelForLevel(L) {
  if (L <= 4) return 'K-1';
  if (L <= 8) return 'grades 2-3';
  if (L <= 12) return 'grades 4-5';
  if (L <= 16) return 'grades 6-8';
  return 'above-level';
}

// D-017 reading gate at the bottom of the ramp: a K-1 rack must actually be forgeable by a
// beginning reader — plenty of very common words available, nothing exotic required to score.
const K1_MIN_COMMON_WORDS = 6;   // words at band >= 6
const K1_MIN_MEAN_BAND = 4.8;
const K1_MAX_RACK = 6;

const RESPONSE_TAXONOMY = [
  { kind: 'valid_word', rationale: 'in the lexicon, forgeable from the rack, meets minWordLength (counts toward M-IDEAFLU)' },
  { kind: 'valid_rare', rationale: 'a valid word at vocabulary band <= 3 (raises M-VOCABLVL — the lexical-depth tail signal)' },
  { kind: 'duplicate', rationale: 'a word already forged this round; scored once, but the repeat is kept in the attempt log' },
  { kind: 'too_short', rationale: 'a real word below minWordLength (rule not held, not a lexical failure)' },
  { kind: 'not_from_rack', rationale: 'uses a letter the rack does not have, or reuses a tile within one word' },
  { kind: 'nonword', rationale: 'a letter string that is not in the lexicon (orthographic-lexical access failure)' },
];

// ---------------------------------------------------------------------------
// Candidate racks for a profile. A rack is the letter multiset of a seed word, so every rack
// is guaranteed to afford at least one full-length word (the top prize the child can chase).
// The displayed tile order is scrambled so the rack never spells the seed word on screen.
// ---------------------------------------------------------------------------
function meanOf(xs) { return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0; }

// Higher = harder: a thin, rare, long-word-heavy affordance on a vowel-poor rack.
function hardness(stats) {
  return (7 - stats.meanBand) * 1.2
    + Math.max(0, 40 - stats.count) * 0.06
    + (1 - stats.vowelRatio) * 3.0
    + (stats.meanLen - 3) * 0.5;
}

const rackCache = new Map();
function candidateRacks(rackSize, minLen, countRange) {
  const key = `${rackSize}|${minLen}|${countRange[0]}|${countRange[1]}`;
  if (rackCache.has(key)) return rackCache.get(key);

  const seen = new Set();
  const out = [];
  const seedSpecs = rackSize <= 7
    ? wordsOfLength(rackSize).map((w) => [w, ''])
    : wordsOfLength(7).flatMap((w) => EIGHTH_TILE_POOL.map((c) => [w, c]));

  for (const [seed, extra] of seedSpecs) {
    const letters = (seed + extra).split('').sort();
    if (letters.length !== rackSize) continue;
    const rk = letters.join('');
    if (seen.has(rk)) continue;            // anagrams collapse to one rack
    seen.add(rk);
    const words = forgeableWords(letters, minLen);
    if (words.length < countRange[0] || words.length > countRange[1]) continue;
    const bands = words.map((e) => e.band);
    const lens = words.map((e) => e.len);
    const vowelRatio = letters.filter((c) => VOWELS.has(c)).length / rackSize;
    if (vowelRatio === 0) continue;        // an unforgeable rack is not an item
    const stats = {
      count: words.length,
      meanBand: meanOf(bands),
      rarestBand: Math.min(...bands),
      commonWords: bands.filter((b) => b >= 6).length,
      meanLen: meanOf(lens),
      longestLen: Math.max(...lens),
      vowelRatio,
    };
    out.push({ rackKey: rk, letters, seed, extraTile: extra || null, words, stats, hard: hardness(stats) });
  }
  out.sort((a, b) => (a.hard - b.hard) || (a.rackKey < b.rackKey ? -1 : 1));
  rackCache.set(key, out);
  return out;
}

// ---------------------------------------------------------------------------
// Build the bank.
// ---------------------------------------------------------------------------
export function generate() {
  const items = [];
  const usedRacks = new Set();

  for (let L = 1; L <= 20; L++) {
    const prof = PROFILES[L];
    let pool = candidateRacks(prof.rackSize, prof.minLen, prof.count);
    if (ageBandsForLevel(L).includes('K-1')) {
      pool = pool.filter((c) => c.stats.commonWords >= K1_MIN_COMMON_WORDS
        && c.stats.meanBand >= K1_MIN_MEAN_BAND
        && c.letters.length <= K1_MAX_RACK);
    }
    if (pool.length < ITEMS_PER_LEVEL) {
      throw new Error(`level ${L}: only ${pool.length} candidate racks for rackSize=${prof.rackSize} minLen=${prof.minLen} count=${prof.count}`);
    }

    const center = Math.min(pool.length - 1, Math.max(0, Math.round(prof.quantile * (pool.length - 1))));
    const rng = mulberry32(hashStr(`${TYPE_CODE}|L${L}|${BASE_SEED}`));
    const picked = [];
    const seen = new Set();
    for (let radius = Math.max(5, Math.ceil(pool.length * 0.04)); picked.length < ITEMS_PER_LEVEL && radius <= pool.length; radius = Math.ceil(radius * 2)) {
      const lo = Math.max(0, center - radius);
      const hi = Math.min(pool.length - 1, center + radius);
      const window = [];
      for (let i = lo; i <= hi; i++) if (!seen.has(i)) window.push(i);
      for (let i = window.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [window[i], window[j]] = [window[j], window[i]]; }
      for (const i of window) {
        if (picked.length >= ITEMS_PER_LEVEL) break;
        seen.add(i);
        const c = pool[i];
        if (usedRacks.has(c.rackKey)) continue;
        usedRacks.add(c.rackKey);
        picked.push(c);
      }
    }
    if (picked.length < ITEMS_PER_LEVEL) throw new Error(`level ${L}: could only place ${picked.length}/${ITEMS_PER_LEVEL} distinct racks`);

    picked.forEach((c, idx) => items.push(buildItem(L, idx, prof, c)));
  }
  return items;
}

/**
 * Scramble the tiles so the rack never displays the seed word (or any other forgeable word)
 * spelled out left to right. Deterministic: the first scramble that is clean wins.
 */
function displayOrder(cand, seedStr) {
  const forgeable = new Set(cand.words.map((e) => e.w));
  for (let t = 0; t < 64; t++) {
    const order = shuffleDet(cand.letters, `${seedStr}|tiles|${t}`);
    const spelled = order.join('');
    if (spelled !== cand.seed && !forgeable.has(spelled)) return order;
  }
  return cand.letters.slice().reverse();
}

function buildItem(L, idx, prof, cand) {
  const seed = `${TYPE_CODE}|L${L}|#${idx}|${cand.rackKey}|${BASE_SEED}`;
  const rng = mulberry32(hashStr(seed));
  const difficulty = Math.round(Math.min(20, Math.max(1, L + (rng() * 0.8 - 0.4))) * 100) / 100;

  const rack = displayOrder(cand, seed);
  const validWords = cand.words.map((e) => ({ word: e.w, length: e.len, band: e.band }));
  const bands = validWords.map((v) => v.band);
  const lengths = validWords.map((v) => v.length);
  const lengthHistogram = {};
  for (const n of lengths) lengthHistogram[n] = (lengthHistogram[n] || 0) + 1;

  // M-EFF denominator. Forging the WHOLE set inside the timer is not a realistic ceiling even
  // for a strong child, so efficiency is scored against a fraction of the set rather than all
  // of it. The 0.45 fraction and the 3..12 clamp are PROVISIONAL design constants, not
  // calibrated norms; `optimalCount` keeps the absolute ceiling available for re-scoring.
  const referenceTarget = Math.max(3, Math.min(12, Math.round(validWords.length * 0.45)));

  const content = {
    typeCode: TYPE_CODE,
    presentation: 'word',            // D-017: printed letters and printed text. Never audio.
    prompt: `Build as many real words as you can before time runs out. Each word must use ${prof.minLen} letters or more. You may use a tile again in a different word.`,
    rack,                            // scrambled display order; the multiset is the real stimulus
    rackSize: rack.length,
    minWordLength: prof.minLen,
    timeBudgetSec: prof.time,
    tileReuseAcrossWords: true,
    tileReuseWithinWord: false,
    scaffold: { warmup: L <= 1 },
  };

  const answer = {
    correctKey: String(validWords.length),
    optimalCount: validWords.length,   // the absolute ceiling: the whole forgeable set
    validWords,                        // the canonical solution: EXACTLY the derivable set
    referenceTarget,
    lengthHistogram,
    longestLength: Math.max(...lengths),
    rarestBand: Math.min(...bands),    // drives M-VOCABLVL server-side
    meanBand: Math.round((bands.reduce((a, b) => a + b, 0) / bands.length) * 100) / 100,
    commonWordCount: bands.filter((b) => b >= 6).length,
    equivalence: {
      rule: 'any_word_in_valid_set',
      detail: 'There is no single expected answer. A submitted string is CREDITED iff, case-insensitively, '
        + 'it appears in validWords — equivalently, iff it is in the referenced lexicon, its letters are a '
        + 'sub-multiset of content.rack (each tile used at most once within one word), and its length is at '
        + 'least content.minWordLength. Every such word is worth credit regardless of which words the child '
        + 'chose; repeats score once. M-IDEAFLU is the count of DISTINCT credited words and M-EFF is that '
        + 'count divided by referenceTarget, capped at 1.',
      lexiconId: LEXICON_ID,
      lexiconHash: lexiconHash(),
      minWordLength: prof.minLen,
      rackMultiset: cand.letters.slice(),
      caseInsensitive: true,
      tileReuseWithinWord: false,
    },
    distractorRationales: RESPONSE_TAXONOMY,   // response taxonomy: no enumerated options exist
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
    scoring: {
      mode: 'computed_solver',
      solver: 'rack_enumeration@v1',
      solverInput: { lexiconId: LEXICON_ID, lexiconHash: lexiconHash(), minWordLength: prof.minLen, rackMultiset: cand.letters.slice() },
      credit: {
        full: 'distinct credited words >= referenceTarget',
        partial: 'distinct credited words / referenceTarget',
        zero: 'no credited word forged',
      },
      // The renderer ships NO lexicon, so it cannot judge a submission. Outcome metrics are
      // server-derived from the raw attempt log; the renderer reports only process metrics.
      serverComputedMetrics: ['M-ACC', 'M-EFF', 'M-IDEAFLU', 'M-VOCABLVL', 'M-FLEX', 'M-ERRTYPE', 'M-DIFFREACH'],
      clientReportedMetrics: ['M-RT', 'M-RTFIRST', 'M-PATH', 'M-PLANFUL', 'M-REV', 'M-IDEAFLU', 'M-PERSIST', 'M-ENGAGE', 'M-RAPIDGUESS'],
    },
    provenance: {
      generator: 'grammar',
      generatorRef: GENERATOR_REF,
      seed,
      lexiconId: LEXICON_ID,
      lexiconHash: lexiconHash(),
      seedWord: cand.seed,             // server-only: the word the rack was cut from
      extraTile: cand.extraTile,       // server-only: the eighth tile, when the rack has one
      levers: {
        level: L,
        rackSize: prof.rackSize,
        minWordLength: prof.minLen,
        timeBudgetSec: prof.time,
        forgeableCount: validWords.length,
        meanBand: Math.round(cand.stats.meanBand * 100) / 100,
        vowelRatio: Math.round(cand.stats.vowelRatio * 100) / 100,
        hardnessQuantile: prof.quantile,
      },
      targetBand: targetLabelForLevel(L),
      catalogAgeBands: ['2-3', '4-5', '6-8'],
    },
    syntheticOnly: true,
    validated: false,
  };
}

// ---------------------------------------------------------------------------
// Self-check performed before writing (the standalone checker repeats this independently).
// ---------------------------------------------------------------------------
function selfCheck(items) {
  const problems = [];
  const bins = Array.from({ length: 20 }, () => 0);
  let exact = 0;

  for (const it of items) {
    const id = it.itemId, c = it.content, a = it.answer;
    const re = forgeableWords(c.rack, c.minWordLength).map((e) => e.w);
    const stored = a.validWords.map((v) => v.word);
    if (re.length === stored.length && re.every((w, i) => w === stored[i])) exact++;
    else problems.push(`${id}: stored valid set (${stored.length}) != re-derived set (${re.length})`);
    for (const v of a.validWords) {
      if (v.length < c.minWordLength) problems.push(`${id}: "${v.word}" is below minWordLength`);
      if (bandOf(v.word) !== v.band) problems.push(`${id}: "${v.word}" band disagrees with the lexicon`);
    }
    for (const leak of ['validWords', 'lexicon', 'words', 'answer', 'solution']) {
      if (Object.prototype.hasOwnProperty.call(c, leak)) problems.push(`${id}: content leaks "${leak}"`);
    }
    const k = Math.round(it.difficulty);
    if (k >= 1 && k <= 20) bins[k - 1]++;
  }
  return { problems, bins, exact };
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--print')) {
    const n = Number(argv[argv.indexOf('--print') + 1]) || 1;
    console.log(JSON.stringify(generate().slice(0, n), null, 2));
    return;
  }

  const items = generate();
  const { problems, bins, exact } = selfCheck(items);
  if (problems.length) {
    console.error(`[${TYPE_CODE}] REFUSING TO WRITE — ${problems.length} problem(s):`);
    problems.slice(0, 20).forEach(p => console.error('  - ' + p));
    process.exit(1);
  }

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, items.map(it => JSON.stringify(it)).join('\n') + '\n');
  console.log(`[${TYPE_CODE}] wrote ${items.length} items -> ${OUT}`);
  console.log(`[${TYPE_CODE}] lexicon ${LEXICON_ID} hash=${lexiconHash()}`);
  console.log(`[${TYPE_CODE}] valid set re-derived exactly: ${exact}/${items.length}`);
  const counts = items.map(it => it.answer.optimalCount);
  console.log(`[${TYPE_CODE}] forgeable words per rack: min ${Math.min(...counts)}, max ${Math.max(...counts)}`);
  console.log(`[${TYPE_CODE}] per integer difficulty bin: ` + bins.map((n, i) => `${i + 1}:${n}`).join(' '));

  if (argv.includes('--verify')) {
    for (let L = 1; L <= 20; L++) {
      const lv = items.filter(it => it.provenance.levers.level === L);
      const ex = lv[0];
      console.log(`  L${String(L).padStart(2)} rack${ex.content.rackSize} min${ex.content.minWordLength} ${ex.content.timeBudgetSec}s `
        + `words${ex.answer.optimalCount} target${ex.answer.referenceTarget} band~${ex.provenance.levers.meanBand} `
        + `| ${lv.map(i => i.content.rack.join('')).join(', ')}`);
    }
  }
  console.log(`[${TYPE_CODE}] OK: answer sets enumerated from the lexicon, born-synthetic.`);
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main();
