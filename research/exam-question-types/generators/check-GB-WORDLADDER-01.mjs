// Independent validator for the GB-WORDLADDER-01 structured bank.
//
// This file deliberately does NOT import anything from GB-WORDLADDER-01.mjs. It reads only
// the emitted JSONL and the lexicon data file, then builds its OWN one-letter-change graph
// and runs its OWN breadth-first search. If the generator's solver were wrong, this checker
// would disagree with it. That independence is the whole point of a `computed_solver` item:
// the answer key is a claim about a graph, and a claim about a graph is falsifiable.
//
// Checks (exit nonzero on any failure):
//   1. JSONL parses; every line is a well-formed BankItem (BUILD_PLAN §2 key set + flags).
//   2. SOLVABILITY: independent BFS finds a ladder from content.start to content.goal for
//      100% of items.
//   3. KEY: that BFS's shortest distance equals answer.optimalRungs, and the stored
//      optimalPath is itself a legal ladder of exactly that length (every rung a lexicon
//      word, every step exactly one letter).
//   4. Any stored alternate optimal sample is also legal and exactly optimal, and the stored
//      shortest-ladder count matches an independent DAG count.
//   5. LEAK: `content` carries no solution field, and nothing in `content` lets a renderer
//      decide word validity locally (no lexicon, no word list, no neighbour set).
//   6. Reading gate (D-017): K-1 items use three-letter words whose whole optimal path sits
//      at vocabulary band >= 5.
//   7. Density: difficulty spans 1..20 with >= 5 items in every integer bucket 1..19 (and in
//      every +/-1 pt band), per BUILD_PLAN §0.
//
// Run:  node research/exam-question-types/generators/check-GB-WORDLADDER-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LEXICON_ID, wordsOfLength, bandOf, lexiconHash } from './lexicon-child-en.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK = resolve(__dirname, '../banks/GB-WORDLADDER-01.jsonl');
const TYPE_CODE = 'GB-WORDLADDER-01';
const DOMAIN = 'verbal';
const ALLOWED_BANDS = ['K-1', '2-3', '4-5', '6-8'];
const MIN_PER_BUCKET = 5;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const K1_MIN_BAND = 5;      // matches the K-1 reading gate used by the other verbal generators
const K1_MAX_WORD_LEN = 3;

const failures = [];
const fail = (id, msg) => failures.push(`[${id}] ${msg}`);
const round2 = (x) => Math.round(x * 100) / 100;

// ---------------------------------------------------------------------------
// Our own graph + BFS (independent of the generator).
// ---------------------------------------------------------------------------
const graphs = new Map();
function graph(len) {
  if (graphs.has(len)) return graphs.get(len);
  const set = new Set(wordsOfLength(len));
  const nb = new Map();
  for (const w of set) {
    const out = [];
    for (let i = 0; i < len; i++) {
      for (const c of ALPHABET) {
        if (c === w[i]) continue;
        const cand = w.slice(0, i) + c + w.slice(i + 1);
        if (set.has(cand)) out.push(cand);
      }
    }
    nb.set(w, out.sort());
  }
  const g = { len, set, nb };
  graphs.set(len, g);
  return g;
}
function distancesFrom(g, src) {
  const dist = new Map([[src, 0]]);
  const q = [src];
  let qi = 0;
  while (qi < q.length) {
    const w = q[qi++];
    const d = dist.get(w) + 1;
    for (const x of g.nb.get(w)) if (!dist.has(x)) { dist.set(x, d); q.push(x); }
  }
  return dist;
}
function countShortest(g, start, goal, cap = 100000) {
  const dg = distancesFrom(g, goal);
  if (!dg.has(start)) return 0;
  const memo = new Map();
  const walk = (w) => {
    if (w === goal) return 1;
    if (memo.has(w)) return memo.get(w);
    const need = dg.get(w) - 1;
    let total = 0;
    for (const x of g.nb.get(w)) {
      if (dg.get(x) === need) { total += walk(x); if (total >= cap) { total = cap; break; } }
    }
    memo.set(w, total);
    return total;
  };
  return walk(start);
}
/** null if the ladder is legal, else the reason it is not. */
function ladderFault(g, path, start, goal) {
  if (!Array.isArray(path) || path.length < 1) return 'empty ladder';
  if (path[0] !== start) return `does not start at ${start}`;
  if (path[path.length - 1] !== goal) return `does not end at ${goal}`;
  for (let i = 0; i < path.length; i++) {
    if (typeof path[i] !== 'string' || path[i].length !== g.len) return `rung ${i} has the wrong length`;
    if (!g.set.has(path[i])) return `rung "${path[i]}" is not a lexicon word`;
  }
  for (let i = 1; i < path.length; i++) {
    let diff = 0;
    for (let k = 0; k < g.len; k++) if (path[i - 1][k] !== path[i][k]) diff++;
    if (diff !== 1) return `step ${i} (${path[i - 1]} -> ${path[i]}) changes ${diff} letters`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// 1. Parse.
// ---------------------------------------------------------------------------
const raw = readFileSync(BANK, 'utf8').trim();
const lines = raw.length ? raw.split('\n') : [];
if (lines.length === 0) fail('parse', 'bank is empty');
const items = [];
lines.forEach((line, i) => {
  try { items.push(JSON.parse(line)); } catch (e) { fail('parse', `line ${i + 1} is not valid JSON: ${e.message}`); }
});

const REQUIRED_KEYS = ['itemId', 'typeCode', 'domain', 'difficulty', 'ageBands', 'demoPath',
  'content', 'answer', 'scoring', 'provenance', 'syntheticOnly', 'validated'];
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);

// Anything in `content` that would let the browser judge a word locally.
const LEXICON_LEAK_KEYS = ['lexicon', 'words', 'wordList', 'validWords', 'dictionary',
  'neighbours', 'neighbors', 'solution', 'optimalPath', 'optimalRungs', 'answer', 'key'];

// ---------------------------------------------------------------------------
// 2-6. Per-item checks.
// ---------------------------------------------------------------------------
const seenIds = new Set();
const seenPairs = new Set();
let solvable = 0;
let keyAgrees = 0;
const stepLimits = new Set();

for (const it of items) {
  const id = (it && it.itemId) || '(no id)';

  for (const k of REQUIRED_KEYS) if (!(k in it)) fail(id, `missing required key "${k}"`);
  const extra = Object.keys(it).filter((k) => !REQUIRED_KEYS.includes(k));
  if (extra.length) fail(id, `unexpected top-level key(s): ${extra.join(', ')}`);

  if (typeof it.itemId !== 'string' || !/^[0-9a-f-]{36}$/.test(it.itemId)) fail(id, 'itemId is not a uuid');
  if (seenIds.has(it.itemId)) fail(id, 'duplicate itemId');
  seenIds.add(it.itemId);

  if (it.typeCode !== TYPE_CODE) fail(id, `typeCode != ${TYPE_CODE}`);
  if (it.domain !== DOMAIN) fail(id, `domain != ${DOMAIN}`);
  if (it.demoPath !== `demos/${TYPE_CODE}.html`) fail(id, `demoPath is ${it.demoPath}`);
  if (it.syntheticOnly !== true) fail(id, 'syntheticOnly must be true');
  if (it.validated !== false) fail(id, 'validated must be false');
  if (!isNum(it.difficulty) || it.difficulty < 1 || it.difficulty > 20) fail(id, `difficulty ${it.difficulty} not a float in 1..20`);
  if (!Array.isArray(it.ageBands) || !it.ageBands.length) fail(id, 'ageBands empty');
  else if (!it.ageBands.every((b) => ALLOWED_BANDS.includes(b))) fail(id, `bad ageBand ${JSON.stringify(it.ageBands)}`);

  if (!it.scoring || it.scoring.mode !== 'computed_solver') fail(id, `scoring.mode != computed_solver`);
  if (!it.provenance || it.provenance.generator !== 'grammar') fail(id, 'provenance.generator != grammar');
  if (!it.provenance || typeof it.provenance.seed !== 'string' || !it.provenance.seed) fail(id, 'provenance.seed missing');
  if (!it.provenance || it.provenance.lexiconHash !== lexiconHash()) {
    fail(id, `provenance.lexiconHash ${it.provenance && it.provenance.lexiconHash} != current ${lexiconHash()} — bank is stale, regenerate`);
  }
  if (!it.provenance || it.provenance.lexiconId !== LEXICON_ID) fail(id, 'provenance.lexiconId mismatch');

  const c = it.content || {};
  const a = it.answer || {};

  // ---- 5. leak screen ----
  for (const k of LEXICON_LEAK_KEYS) {
    if (Object.prototype.hasOwnProperty.call(c, k)) fail(id, `content leaks "${k}" — a renderer could judge validity locally`);
  }
  const contentBlob = JSON.stringify(c);
  if (a.optimalPath && a.optimalPath.length > 2) {
    const middle = a.optimalPath.slice(1, -1);
    for (const w of middle) if (contentBlob.includes(`"${w}"`)) fail(id, `content mentions the intermediate word ${w}`);
  }
  if (contentBlob.includes(String(a.optimalRungs)) && /"(optimal|rungs|steps|minSteps|budget)"/i.test(contentBlob)) {
    fail(id, 'content appears to carry a rung budget derived from the optimum');
  }

  // ---- content shape ----
  const len = c.wordLength;
  if (![3, 4, 5].includes(len)) { fail(id, `content.wordLength ${len} is not 3/4/5`); continue; }
  if (typeof c.start !== 'string' || c.start.length !== len) { fail(id, 'content.start malformed'); continue; }
  if (typeof c.goal !== 'string' || c.goal.length !== len) { fail(id, 'content.goal malformed'); continue; }
  if (c.start === c.goal) fail(id, 'start equals goal');
  if (c.presentation !== 'word') fail(id, 'content.presentation must be "word" (D-017: text only, never audio)');
  if (c.alphabet !== ALPHABET) fail(id, 'content.alphabet must be the full A-Z (a narrowed alphabet leaks the neighbourhood)');
  if (typeof c.stepLimit !== 'number') fail(id, 'content.stepLimit missing'); else stepLimits.add(c.stepLimit);

  const pairKey = `${c.start}>${c.goal}`;
  if (seenPairs.has(pairKey)) fail(id, `duplicate ladder ${pairKey}`);
  seenPairs.add(pairKey);

  const g = graph(len);
  if (!g.set.has(c.start)) fail(id, `start ${c.start} is not in the lexicon`);
  if (!g.set.has(c.goal)) fail(id, `goal ${c.goal} is not in the lexicon`);

  // ---- 2. independent solvability ----
  const dist = distancesFrom(g, c.start);
  if (!dist.has(c.goal)) { fail(id, `UNSOLVABLE: no ladder ${c.start} -> ${c.goal} exists in ${LEXICON_ID}`); continue; }
  solvable++;
  const bfsRungs = dist.get(c.goal);

  // ---- 3. key agrees with our BFS, and the stored path is a legal optimal ladder ----
  let ok = true;
  if (a.optimalRungs !== bfsRungs) { fail(id, `answer.optimalRungs ${a.optimalRungs} != independent BFS ${bfsRungs}`); ok = false; }
  if (a.correctKey !== String(bfsRungs)) { fail(id, `answer.correctKey "${a.correctKey}" != BFS optimum ${bfsRungs}`); ok = false; }
  const fault = ladderFault(g, a.optimalPath, c.start, c.goal);
  if (fault) { fail(id, `stored optimalPath is not a legal ladder: ${fault}`); ok = false; }
  else if (a.optimalPath.length - 1 !== bfsRungs) { fail(id, `stored optimalPath uses ${a.optimalPath.length - 1} rungs, optimum is ${bfsRungs}`); ok = false; }
  if (ok) keyAgrees++;

  // ---- 4. alternates + shortest-ladder count ----
  const nAlt = countShortest(g, c.start, c.goal);
  if (a.shortestLadderCount !== nAlt) fail(id, `shortestLadderCount ${a.shortestLadderCount} != independent count ${nAlt}`);
  for (const alt of a.altOptimalSamples || []) {
    const f = ladderFault(g, alt, c.start, c.goal);
    if (f) fail(id, `altOptimalSample is not a legal ladder: ${f}`);
    else if (alt.length - 1 !== bfsRungs) fail(id, 'altOptimalSample is not actually optimal');
  }
  if (!a.equivalence || a.equivalence.rule !== 'any_shortest_valid_ladder') {
    fail(id, 'answer.equivalence.rule must be any_shortest_valid_ladder (alternate optimal routes must be credited)');
  }
  if (!a.equivalence || a.equivalence.lexiconHash !== lexiconHash()) fail(id, 'answer.equivalence.lexiconHash is stale');
  if (!Object.keys(a.distractorRationales || {}).includes('optimal')) {
    fail(id, 'answer.distractorRationales must document the response taxonomy');
  }

  // ---- vocabulary bookkeeping (M-VOCABLVL must be derivable) ----
  const bands = (a.optimalPath || []).map((w) => bandOf(w));
  if (bands.some((b) => b === 0)) fail(id, 'a word on the optimal path has no vocabulary band');
  if (a.pathVocab && a.pathVocab.rarestBand !== Math.min(...bands)) fail(id, 'answer.pathVocab.rarestBand disagrees with the lexicon');

  // ---- 6. reading gate (D-017) ----
  if (it.ageBands.includes('K-1')) {
    if (len > K1_MAX_WORD_LEN) fail(id, `K-1 reading gate: ${len}-letter words`);
    const worst = Math.min(...bands);
    if (worst < K1_MIN_BAND) fail(id, `K-1 reading gate: path contains a band-${worst} word (need >= ${K1_MIN_BAND})`);
  }
}

if (stepLimits.size > 1) {
  fail('leak', `content.stepLimit varies across the bank (${[...stepLimits].join(', ')}) — a per-item budget leaks the optimum`);
}

// ---------------------------------------------------------------------------
// 7. Difficulty density.
// ---------------------------------------------------------------------------
const diffs = items.map((it) => it.difficulty).filter(isNum);
const min = Math.min(...diffs);
const max = Math.max(...diffs);
if (!(min <= 1.5)) fail('coverage', `min difficulty ${round2(min)} > 1.5 (ramp does not reach the floor)`);
if (!(max >= 19.5)) fail('coverage', `max difficulty ${round2(max)} < 19.5 (ramp does not reach the ceiling)`);

const binCounts = Array.from({ length: 20 }, () => 0);
const bandCounts = Array.from({ length: 20 }, () => 0);
for (const d of diffs) {
  const k = Math.round(d);
  if (k >= 1 && k <= 20) binCounts[k - 1]++;
  for (let kk = 1; kk <= 20; kk++) if (Math.abs(d - kk) <= 1.0) bandCounts[kk - 1]++;
}
for (let k = 1; k <= 19; k++) {
  if (binCounts[k - 1] < MIN_PER_BUCKET) fail('coverage', `integer bucket ${k} has ${binCounts[k - 1]} items (< ${MIN_PER_BUCKET})`);
  if (bandCounts[k - 1] < MIN_PER_BUCKET) fail('coverage', `+/-1pt band around ${k} has ${bandCounts[k - 1]} items (< ${MIN_PER_BUCKET})`);
}

// ---------------------------------------------------------------------------
// Report.
// ---------------------------------------------------------------------------
const rungs = items.map((it) => it.answer && it.answer.optimalRungs).filter(isNum);
console.log(`${TYPE_CODE} bank check: ${items.length} items`);
console.log(`lexicon: ${LEXICON_ID} hash=${lexiconHash()}`);
console.log(`solvability (independent BFS): ${solvable}/${items.length} = ${items.length ? round2(100 * solvable / items.length) : 0}%`);
console.log(`key agreement (BFS optimum == stored key, stored path legal): ${keyAgrees}/${items.length}`);
console.log(`optimal rungs: ${Math.min(...rungs)}..${Math.max(...rungs)}`);
console.log(`difficulty span: ${round2(min)} .. ${round2(max)}`);
console.log('per integer bucket (k:n): ' + binCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log('per +/-1pt band  (k:n): ' + bandCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log(`min per-bucket density (1..19): ${Math.min(...binCounts.slice(0, 19))}`);

if (failures.length) {
  console.error(`\nFAIL — ${failures.length} problem(s):`);
  for (const f of failures.slice(0, 40)) console.error('  - ' + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log('\nPASS — 100% solvable by independent BFS, every key re-derived, no solution or lexicon reachable from content, reading gate held, >=5 items per integer bucket 1..19.');
