#!/usr/bin/env node
// GB-WORDLADDER-01 (Letter Climb) — structured bank generator (grammar, seeded, deterministic).
//
// The child climbs from a start word to a length-matched goal word by changing exactly ONE
// letter at a time; every rung must be a real word. That is literally a shortest-path search
// over the one-letter-change graph of a lexicon, which makes the item DETERMINISTICALLY
// CHECKABLE: the key is not authored, it is COMPUTED by breadth-first search over
// `lexicon-child-en.mjs` and can be independently re-derived by anyone (see
// check-GB-WORDLADDER-01.mjs, which re-runs its own BFS and refuses to trust this file).
//
// Contract sources (this worktree):
//   docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md  §2 item/result contract, §0 difficulty ramp,
//                                                  §4 basic-core metrics (M-EFF/M-PATH/M-PLANFUL,
//                                                  M-VOCABLVL for verbal)
//   research/exam-question-types/catalog/master_types.jsonl  GB-WORDLADDER-01 spec
//
// scoring.mode = 'computed_solver': there are no enumerated options. The server takes the
// submitted word path, replays it against the lexicon (every rung a word, each consecutive
// pair one letter apart, starts at start, ends at goal) and compares its length to the stored
// optimum. `answer.equivalence` states the accepted-equivalence rule so ANY shortest ladder —
// not just the canonical one stored here — earns full credit.
//
// Difficulty levers (spec `adaptive.difficulty_levers`), all recorded per item:
//   (1) word length            3 -> 4 -> 5
//   (2) minimum ladder length  1 -> 7 rungs (BFS distance)
//   (3) branching factor       mean neighbourhood size along the optimal path (lower = harder)
//   (4) lexical rarity         rarest vocabulary band on the optimal path (rarer = harder)
// Word length + rarity also carry the D-017 reading gate: the floor rungs of the ramp are
// three-letter, high-frequency words the weakest reader in the declared band can decode.
//
// Governance: born-synthetic. syntheticOnly:true, validated:false. The 1..20 difficulty is a
// design rung, NOT calibrated IRT, and no live child data was used (RES-012/RES-013).
//
// Usage:
//   node generators/GB-WORDLADDER-01.mjs             # build + write banks/GB-WORDLADDER-01.jsonl
//   node generators/GB-WORDLADDER-01.mjs --verify    # also print the full per-level report
//   node generators/GB-WORDLADDER-01.mjs --print 1   # print the first N built items

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LEXICON_ID, wordsOfLength, bandOf, lexiconHash } from './lexicon-child-en.mjs';
import { serializeBank } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../banks/GB-WORDLADDER-01.jsonl');

const TYPE_CODE = 'GB-WORDLADDER-01';
const DOMAIN = 'verbal';
const DEMO_PATH = 'demos/GB-WORDLADDER-01.html';
const GENERATOR_REF = 'GB-WORDLADDER-01/bfs-over-lexicon@v1';
const BASE_SEED = 20260724;
const ITEMS_PER_LEVEL = 6;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// A constant, generous UI bound on how many rungs the renderer will accept. It is the SAME
// for every item on purpose: a per-item budget would leak the optimum into `content`.
export const STEP_LIMIT = 20;

// ---------------------------------------------------------------------------
// Deterministic RNG + seeded uuid (same primitives as the other generators here).
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

// ---------------------------------------------------------------------------
// Ladder graph over the curated lexicon (exported so the checker can reuse the SHAPE
// of the construction while still running its own independent BFS).
// ---------------------------------------------------------------------------
const graphCache = new Map();
export function ladderGraph(len) {
  if (graphCache.has(len)) return graphCache.get(len);
  const words = wordsOfLength(len);
  const set = new Set(words);
  const nb = new Map();
  for (const w of words) {
    const out = [];
    for (let i = 0; i < len; i++) {
      for (const c of ALPHABET) {
        if (c === w[i]) continue;
        const cand = w.slice(0, i) + c + w.slice(i + 1);
        if (set.has(cand)) out.push(cand);
      }
    }
    out.sort();
    nb.set(w, out);
  }
  const g = { len, words, set, nb };
  graphCache.set(len, g);
  return g;
}

/** BFS distance map from `src` over the ladder graph. */
export function bfsDistances(g, src) {
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

/**
 * The canonical (lexicographically smallest) shortest ladder from `start` to `goal`,
 * or null if unreachable. Includes both endpoints; rung count = path.length - 1.
 */
export function shortestLadder(g, start, goal) {
  if (!g.set.has(start) || !g.set.has(goal)) return null;
  const distToGoal = bfsDistances(g, goal);
  if (!distToGoal.has(start)) return null;
  const path = [start];
  let cur = start;
  while (cur !== goal) {
    const need = distToGoal.get(cur) - 1;
    let next = null;
    for (const x of g.nb.get(cur)) if (distToGoal.get(x) === need && (next === null || x < next)) next = x;
    if (next === null) return null;
    path.push(next);
    cur = next;
  }
  return path;
}

/** How many distinct shortest ladders exist (capped, so a hub pair cannot blow up). */
export function countShortestLadders(g, start, goal, cap = 100000) {
  const distToGoal = bfsDistances(g, goal);
  if (!distToGoal.has(start)) return 0;
  const memo = new Map();
  const walk = (w) => {
    if (w === goal) return 1;
    if (memo.has(w)) return memo.get(w);
    const need = distToGoal.get(w) - 1;
    let total = 0;
    for (const x of g.nb.get(w)) {
      if (distToGoal.get(x) === need) { total += walk(x); if (total >= cap) { total = cap; break; } }
    }
    memo.set(w, total);
    return total;
  };
  return walk(start);
}

/** Up to `k` alternate shortest ladders (excluding the canonical one), in lex order. */
function alternateLadders(g, start, goal, canonical, k) {
  const distToGoal = bfsDistances(g, goal);
  const canonKey = canonical.join('>');
  const out = [];
  const stack = [[start]];
  let guard = 0;
  while (stack.length && out.length < k && guard++ < 20000) {
    const path = stack.pop();
    const cur = path[path.length - 1];
    if (cur === goal) {
      const key = path.join('>');
      if (key !== canonKey) out.push(path.slice());
      continue;
    }
    const need = distToGoal.get(cur) - 1;
    const nexts = g.nb.get(cur).filter((x) => distToGoal.get(x) === need);
    for (let i = nexts.length - 1; i >= 0; i--) stack.push(path.concat([nexts[i]]));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Difficulty ramp: one profile per level 1..20.
//   len              word length
//   depth            required shortest-ladder length in rungs
//   minBand          reading/vocabulary floor — EVERY word on the optimal path must be at
//                    least this common (band 7 = earliest, 1 = rare). This is the D-017
//                    reading gate at the bottom of the ramp.
//   quantile         where in the (easy -> hard) ordering of qualifying pairs to draw from,
//                    so difficulty still rises smoothly INSIDE a fixed length/depth step.
// ---------------------------------------------------------------------------
const PROFILES = {
  1:  { len: 3, depth: 1, minBand: 6, quantile: 0.00 },
  2:  { len: 3, depth: 1, minBand: 5, quantile: 0.35 },
  3:  { len: 3, depth: 2, minBand: 5, quantile: 0.10 },
  4:  { len: 3, depth: 2, minBand: 5, quantile: 0.45 },
  5:  { len: 3, depth: 3, minBand: 4, quantile: 0.15 },
  6:  { len: 3, depth: 3, minBand: 4, quantile: 0.55 },
  7:  { len: 3, depth: 4, minBand: 4, quantile: 0.45 },
  8:  { len: 4, depth: 2, minBand: 4, quantile: 0.35 },
  9:  { len: 4, depth: 3, minBand: 4, quantile: 0.30 },
  10: { len: 4, depth: 3, minBand: 3, quantile: 0.60 },
  11: { len: 4, depth: 4, minBand: 3, quantile: 0.35 },
  12: { len: 4, depth: 4, minBand: 3, quantile: 0.70 },
  13: { len: 4, depth: 5, minBand: 2, quantile: 0.45 },
  14: { len: 4, depth: 5, minBand: 2, quantile: 0.80 },
  15: { len: 4, depth: 6, minBand: 2, quantile: 0.70 },
  16: { len: 5, depth: 3, minBand: 3, quantile: 0.40 },
  17: { len: 5, depth: 4, minBand: 2, quantile: 0.55 },
  18: { len: 5, depth: 5, minBand: 2, quantile: 0.70 },
  19: { len: 5, depth: 6, minBand: 1, quantile: 0.85 },
  20: { len: 5, depth: 7, minBand: 1, quantile: 0.95 },
};

// BUILD_PLAN §0 grade mapping. Levels 17-20 are the "above-level / clearly gifted" tail;
// the AgeBand vocabulary tops out at 6-8, so the tail is tagged 6-8 and flagged in provenance.
// The catalog declares only [4-5, 6-8] for this type, so levels 1-12 all sit in the
// 4-5 band: levels 1-8 are its easy floor rather than bands of their own.
function ageBandsForLevel(L) {
  if (L <= 12) return ['4-5'];
  return ['6-8'];
}
function targetLabelForLevel(L) {
  if (L <= 12) return 'grades 4-5';
  if (L <= 16) return 'grades 6-8';
  return 'above-level';
}

const RESPONSE_TAXONOMY = [
  { kind: 'optimal', rationale: 'legal ladder reaching the goal in exactly optimalRungs rungs (full credit)' },
  { kind: 'detour', rationale: 'legal ladder reaching the goal but longer than optimal (efficiency loss, M-EFF < 1)' },
  { kind: 'nonword_rung', rationale: 'a submitted rung is not in the lexicon (orthographic-lexical access failure)' },
  { kind: 'multi_letter_change', rationale: 'consecutive rungs differ in more than one position (rule violation)' },
  { kind: 'incomplete', rationale: 'the ladder never reaches the goal word' },
  { kind: 'abandoned', rationale: 'no rung was committed at all' },
];

// ---------------------------------------------------------------------------
// Candidate selection for one level.
// ---------------------------------------------------------------------------
function meanDegree(g, path) {
  const degs = path.map((w) => g.nb.get(w).length);
  return degs.reduce((a, b) => a + b, 0) / degs.length;
}

// Higher = harder: rarer path vocabulary and a thinner neighbourhood to search.
function hardness(minBandOnPath, meanDeg) {
  return (7 - minBandOnPath) * 1.0 + Math.max(0, 12 - meanDeg) * 0.18;
}

const candidateCache = new Map();
function candidatesFor(len, depth, minBand) {
  const key = `${len}|${depth}|${minBand}`;
  if (candidateCache.has(key)) return candidateCache.get(key);
  const g = ladderGraph(len);
  const out = [];
  // Deterministic full sweep: for every start word, BFS once and take goals at `depth`.
  for (const start of g.words) {
    if (bandOf(start) < minBand) continue;
    const dist = bfsDistances(g, start);
    for (const [goal, d] of dist) {
      if (d !== depth) continue;
      if (goal <= start) continue;             // one orientation per unordered pair
      if (bandOf(goal) < minBand) continue;
      const path = shortestLadder(g, start, goal);
      if (!path) continue;
      let worst = 7;
      for (const w of path) worst = Math.min(worst, bandOf(w));
      if (worst < minBand) continue;           // reading/vocabulary gate on EVERY rung
      const md = meanDegree(g, path);
      out.push({ start, goal, path, minBandOnPath: worst, meanDeg: md, hard: hardness(worst, md) });
    }
  }
  out.sort((a, b) => (a.hard - b.hard) || (a.start < b.start ? -1 : a.start > b.start ? 1 : 0)
    || (a.goal < b.goal ? -1 : a.goal > b.goal ? 1 : 0));
  candidateCache.set(key, out);
  return out;
}

// ---------------------------------------------------------------------------
// Build the bank.
// ---------------------------------------------------------------------------
export function generate() {
  const items = [];
  const usedPairs = new Set();
  const usedWords = new Map(); // word -> how many items already use it as start/goal

  for (let L = 1; L <= 20; L++) {
    const prof = PROFILES[L];
    const g = ladderGraph(prof.len);
    const pool = candidatesFor(prof.len, prof.depth, prof.minBand);
    if (pool.length < ITEMS_PER_LEVEL) {
      throw new Error(`level ${L}: only ${pool.length} candidate ladders for len=${prof.len} depth=${prof.depth} minBand=${prof.minBand}`);
    }

    // Draw around the level's quantile in the easy->hard ordering, widening the window
    // deterministically until ITEMS_PER_LEVEL distinct, non-overlapping ladders are found.
    const center = Math.min(pool.length - 1, Math.max(0, Math.round(prof.quantile * (pool.length - 1))));
    const rng = mulberry32(hashStr(`${TYPE_CODE}|L${L}|${BASE_SEED}`));
    const picked = [];
    const seen = new Set();
    for (let radius = Math.max(6, Math.ceil(pool.length * 0.03)); picked.length < ITEMS_PER_LEVEL && radius <= pool.length; radius = Math.ceil(radius * 2)) {
      const lo = Math.max(0, center - radius);
      const hi = Math.min(pool.length - 1, center + radius);
      const window = [];
      for (let i = lo; i <= hi; i++) if (!seen.has(i)) window.push(i);
      // deterministic shuffle of the window
      for (let i = window.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [window[i], window[j]] = [window[j], window[i]]; }
      for (const i of window) {
        if (picked.length >= ITEMS_PER_LEVEL) break;
        seen.add(i);
        const c = pool[i];
        const pairKey = `${c.start}>${c.goal}`;
        if (usedPairs.has(pairKey)) continue;
        // Keep the level visually varied: cap how often a word anchors an item.
        if ((usedWords.get(c.start) || 0) >= 2 || (usedWords.get(c.goal) || 0) >= 2) continue;
        usedPairs.add(pairKey);
        usedWords.set(c.start, (usedWords.get(c.start) || 0) + 1);
        usedWords.set(c.goal, (usedWords.get(c.goal) || 0) + 1);
        picked.push(c);
      }
    }
    if (picked.length < ITEMS_PER_LEVEL) {
      throw new Error(`level ${L}: could only place ${picked.length}/${ITEMS_PER_LEVEL} distinct ladders`);
    }

    picked.forEach((c, idx) => items.push(buildItem(L, idx, g, prof, c)));
  }
  return items;
}

function buildItem(L, idx, g, prof, c) {
  const seed = `${TYPE_CODE}|L${L}|#${idx}|${c.start}>${c.goal}|${BASE_SEED}`;
  const rng = mulberry32(hashStr(seed));
  const difficulty = Math.round(Math.min(20, Math.max(1, L + (rng() * 0.8 - 0.4))) * 100) / 100;

  const rungs = c.path.length - 1;
  const bands = c.path.map((w) => bandOf(w));
  const altCount = countShortestLadders(g, c.start, c.goal);
  const altSamples = alternateLadders(g, c.start, c.goal, c.path, 3);
  const degrees = c.path.map((w) => g.nb.get(w).length);

  const content = {
    typeCode: TYPE_CODE,
    presentation: 'word',              // D-017: printed text only. No audio. Reading IS the gate.
    prompt: 'Change one letter at a time. Every step must be a real word. Climb to the goal word in as few steps as you can.',
    start: c.start,
    goal: c.goal,
    wordLength: prof.len,
    alphabet: ALPHABET,                // full A-Z: narrowing it would leak the neighbourhood
    stepLimit: STEP_LIMIT,             // constant across the whole bank; carries no solution info
    scaffold: { warmup: L <= 1 },
  };

  const answer = {
    correctKey: String(rungs),         // the optimum, COMPUTED by BFS (never authored)
    optimalRungs: rungs,
    optimalPath: c.path.slice(),
    shortestLadderCount: altCount,
    altOptimalSamples: altSamples,
    pathVocab: {
      bands,
      rarestBand: Math.min(...bands),  // drives M-VOCABLVL server-side
      meanBand: Math.round((bands.reduce((a, b) => a + b, 0) / bands.length) * 100) / 100,
    },
    branching: {
      degrees,
      meanDegree: Math.round(c.meanDeg * 100) / 100,
      minDegree: Math.min(...degrees),
    },
    equivalence: {
      rule: 'any_shortest_valid_ladder',
      detail: 'A submitted ladder is LEGAL iff it starts at content.start, ends at content.goal, '
        + 'every rung is a word in the referenced lexicon, and each consecutive pair differs in exactly '
        + 'one letter position. Any legal ladder of length optimalRungs earns full credit — the stored '
        + 'optimalPath is only one of shortestLadderCount equally good routes. A longer legal ladder earns '
        + 'partial credit optimalRungs / submittedRungs (that ratio is M-EFF).',
      lexiconId: LEXICON_ID,
      lexiconHash: lexiconHash(),
      lexiconLength: prof.len,
      caseInsensitive: true,
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
      solver: 'word_ladder_bfs@v1',
      solverInput: { lexiconId: LEXICON_ID, lexiconHash: lexiconHash(), wordLength: prof.len },
      credit: {
        full: 'legal ladder with submittedRungs == optimalRungs',
        partial: 'legal ladder reaching the goal: optimalRungs / submittedRungs',
        zero: 'illegal step, non-word rung, or the goal was never reached',
      },
      // The renderer has NO lexicon, so it cannot judge validity. Outcome metrics are
      // therefore server-derived; the renderer only reports its own process metrics.
      serverComputedMetrics: ['M-ACC', 'M-EFF', 'M-VOCABLVL', 'M-ERRTYPE', 'M-DIFFREACH'],
      clientReportedMetrics: ['M-RT', 'M-RTFIRST', 'M-PATH', 'M-PLANFUL', 'M-REV', 'M-IDEAFLU', 'M-ENGAGE', 'M-RAPIDGUESS'],
    },
    provenance: {
      generator: 'grammar',
      generatorRef: GENERATOR_REF,
      seed,
      lexiconId: LEXICON_ID,
      lexiconHash: lexiconHash(),
      levers: {
        level: L,
        wordLength: prof.len,
        minLadderRungs: prof.depth,
        rarestBandOnPath: Math.min(...bands),
        meanNeighbourhood: Math.round(c.meanDeg * 100) / 100,
        hardnessQuantile: prof.quantile,
      },
      targetBand: targetLabelForLevel(L),
      catalogAgeBands: ['4-5', '6-8'],   // the catalog's declared floor; see the bank README note
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
  let solvable = 0;

  for (const it of items) {
    const id = it.itemId;
    const c = it.content, a = it.answer;
    const g = ladderGraph(c.wordLength);
    const re = shortestLadder(g, c.start, c.goal);
    if (!re) { problems.push(`${id}: ${c.start}->${c.goal} is UNSOLVABLE`); continue; }
    solvable++;
    if (re.length - 1 !== a.optimalRungs) problems.push(`${id}: stored optimum ${a.optimalRungs} != BFS ${re.length - 1}`);
    if (a.optimalPath.length - 1 !== a.optimalRungs) problems.push(`${id}: stored path length disagrees with optimalRungs`);
    for (let i = 1; i < a.optimalPath.length; i++) {
      const p = a.optimalPath[i - 1], q = a.optimalPath[i];
      let diff = 0;
      for (let k = 0; k < p.length; k++) if (p[k] !== q[k]) diff++;
      if (diff !== 1) problems.push(`${id}: stored path step ${i} changes ${diff} letters`);
      if (!g.set.has(q)) problems.push(`${id}: stored path rung ${q} is not a lexicon word`);
    }
    for (const leak of ['optimalPath', 'optimalRungs', 'answer', 'solution', 'lexicon']) {
      if (Object.prototype.hasOwnProperty.call(c, leak)) problems.push(`${id}: content leaks "${leak}"`);
    }
    const k = Math.round(it.difficulty);
    if (k >= 1 && k <= 20) bins[k - 1]++;
  }
  return { problems, bins, solvable };
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--print')) {
    const n = Number(argv[argv.indexOf('--print') + 1]) || 1;
    console.log(JSON.stringify(generate().slice(0, n), null, 2));
    return;
  }

  const items = generate();
  const { problems, bins, solvable } = selfCheck(items);
  if (problems.length) {
    console.error(`[${TYPE_CODE}] REFUSING TO WRITE — ${problems.length} problem(s):`);
    problems.slice(0, 20).forEach(p => console.error('  - ' + p));
    process.exit(1);
  }

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, serializeBank(items));
  console.log(`[${TYPE_CODE}] wrote ${items.length} items -> ${OUT}`);
  console.log(`[${TYPE_CODE}] lexicon ${LEXICON_ID} hash=${lexiconHash()}`);
  console.log(`[${TYPE_CODE}] solvable by BFS: ${solvable}/${items.length}`);
  const rungs = items.map(it => it.answer.optimalRungs);
  console.log(`[${TYPE_CODE}] optimal rungs: min ${Math.min(...rungs)}, max ${Math.max(...rungs)}`);
  console.log(`[${TYPE_CODE}] per integer difficulty bin: ` + bins.map((n, i) => `${i + 1}:${n}`).join(' '));

  if (argv.includes('--verify')) {
    for (let L = 1; L <= 20; L++) {
      const lv = items.filter(it => it.provenance.levers.level === L);
      const ex = lv[0];
      console.log(`  L${String(L).padStart(2)} len${ex.content.wordLength} rungs${ex.answer.optimalRungs} `
        + `band>=${ex.provenance.levers.rarestBandOnPath} deg${ex.provenance.levers.meanNeighbourhood} `
        + `| ${lv.map(i => `${i.content.start}>${i.content.goal}`).join(', ')}`);
    }
  }
  console.log(`[${TYPE_CODE}] OK: optima BFS-computed, ladders legal, born-synthetic.`);
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main();
