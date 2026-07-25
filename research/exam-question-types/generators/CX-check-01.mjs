// CX-check-01 "Check It Twice" — structured bank generator (Bucket A: grammar).
//
// Emits a STRUCTURED item bank (JSONL) conforming to EXAM_ADAPTIVE_BUILD_PLAN.md §2
// (BankItem). An "item" here is a TASK CONFIGURATION: a board the sorter has already
// filled in, with a known number of planted misplacements, plus the controls that let
// the child review, correct, and turn it in whenever they like.
//
// The measured construct is BEHAVIOURAL CONSCIENTIOUSNESS — does the child
// voluntarily review before submitting? — so "turn it in" is available from the first
// moment and submit speed is never rewarded (spec: construct_irrelevant_risks).
//
// SORT CONTENT: abstract repetition patterns (ABA, AABB, ...) instantiated with
// distinct letters, NOT semantic categories. A letter string belongs to exactly one
// bin because its canonical repetition signature is unique, so the key is fully
// determined by the visible board and carries no world-knowledge (verbal) load — the
// type sits in fluid_reasoning.
//
// SCORING: this is the one type in the open-ended workstream that needs NO judge.
// Both the sort key and every carefulness behaviour (review coverage, corrections,
// planted-error catch rate, active review time) are machine-computable from the
// interaction log, so `scoring.mode='deterministic_key'` and `scoring.deferred` is
// empty. See METRIC_FRAMEWORK §0 (M-RUBRIC was removed by design). Setting this type
// to `model_judge_deferred` would invent a judge that the framework forbids.
//
// Governance: born-synthetic only (syntheticOnly:true, validated:false). The
// `difficulty` float is a DESIGN rung, NOT a calibrated IRT parameter.
//
// Run:  node research/exam-question-types/generators/CX-check-01.mjs
//       writes ../banks/CX-check-01.jsonl and prints a coverage summary.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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
 * Pattern pools. Every entry is a CANONICAL repetition signature (first
 * occurrence order A, B, C, ...), so two entries are the same rule iff the
 * strings are equal, and a token's true bin is decidable from its own text.
 * ------------------------------------------------------------------ */
export const LETTERS = 'KMRSTVWXZQNPDFGH';
export const TEMPLATE_POOL = {
  3: ['ABA', 'AAB', 'ABB', 'AAA', 'ABC'],
  4: ['ABBA', 'AABB', 'ABAB', 'ABCD', 'AAAB', 'ABAA'],
  5: ['ABCBA', 'AABBC', 'ABACA', 'ABCDE', 'AABAB', 'ABBBA'],
};

// Canonical repetition signature of a concrete string ("KMK" -> "ABA").
export function signature(text) {
  const map = new Map();
  let next = 0;
  return [...text]
    .map((ch) => {
      if (!map.has(ch)) map.set(ch, String.fromCharCode(65 + next++));
      return map.get(ch);
    })
    .join('');
}
function hamming(a, b) {
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
  return d;
}
function combinations(arr, k) {
  const out = [];
  const walk = (start, acc) => {
    if (acc.length === k) {
      out.push(acc.slice());
      return;
    }
    for (let i = start; i < arr.length; i++) {
      acc.push(arr[i]);
      walk(i + 1, acc);
      acc.pop();
    }
  };
  walk(0, []);
  return out;
}

/* ================================================================== *
 * DIFFICULTY MODEL — difficulty here is TASK COMPLEXITY (how much board there
 * is to review and how hard a slip is to notice), derived from the type's
 * declared difficulty_levers (master_types.jsonl CX-check-01: "number of items;
 * number/subtlety of planted errors; optional time-pressure framing"):
 *
 *   tokenCount N (6..16)   -> how much board a full review costs
 *   binCount   B (2..4)    -> how many rules must be held while scanning
 *   patternLen P (3..5)    -> finer discrimination per tile
 *   plantedErr E (1..4)    -> how many slips there are to catch
 *   subtlety   s (0..1)    -> continuous fine positioner: how SIMILAR the bin
 *                             rules are to each other, and therefore how close
 *                             a misplaced tile looks to belonging where it sits
 *
 * The time-pressure lever offered by the spec is deliberately NOT used: the
 * spec's own construct_irrelevant_risks warn "do NOT reward submit-speed", and a
 * deadline would turn voluntary review into a speed test.
 * ================================================================== */
const N_W = 0.16; // per extra tile
const B_W = 1.5; // per extra bin/rule
const P_W = 1.6; // per extra pattern position
const E_W = 0.9; // per extra planted slip
const SUBTLETY_SPAN = 3.2; // rule-similarity contributes 0..3.2

function rawScore(N, B, P, E, s) {
  return 1.0 + N_W * (N - 6) + B_W * (B - 2) + P_W * (P - 3) + E_W * (E - 1) + SUBTLETY_SPAN * s;
}
const RAW_MIN = rawScore(6, 2, 3, 1, 0); // 1.0
const RAW_MAX = rawScore(16, 4, 5, 4, 1); // 14.7

export function difficultyFromLevers(N, B, P, E, s) {
  return clamp(1 + ((rawScore(N, B, P, E, s) - RAW_MIN) * 19) / (RAW_MAX - RAW_MIN), 1, 20);
}
function solveSubtlety(N, B, P, E, targetD) {
  const rawNeeded = RAW_MIN + ((targetD - 1) * (RAW_MAX - RAW_MIN)) / 19;
  return clamp((rawNeeded - rawScore(N, B, P, E, 0)) / SUBTLETY_SPAN, 0, 1);
}

// Allowed board shapes: every bin needs at least two tiles to be a real group,
// and no more than a third of the board may be planted slips (otherwise the
// "pre-sorted" framing collapses and the task becomes a plain sort).
export const ALLOWED_CONFIGS = (() => {
  const out = [];
  for (const N of [6, 8, 10, 12, 14, 16])
    for (const B of [2, 3, 4])
      for (const P of [3, 4, 5])
        for (const E of [1, 2, 3, 4]) {
          if (N < 2 * B) continue;
          if (E > Math.floor(N / 3)) continue;
          out.push({ N, B, P, E });
        }
  return out;
})();

/* ================================================================== *
 * BOARD BUILDER
 * `subtlety` drives TWO observable things (so it is never a phantom lever):
 *   1. which set of bin rules is used — high subtlety picks the B templates
 *      that are most similar to each other;
 *   2. where each planted tile is dropped — high subtlety drops it in the bin
 *      whose rule is closest to the tile's own.
 * ================================================================== */
function pickTemplates(pool, B, subtlety) {
  const subsets = combinations(pool, B)
    .map((sub) => {
      let sum = 0;
      let n = 0;
      for (let i = 0; i < sub.length; i++)
        for (let j = i + 1; j < sub.length; j++) {
          sum += hamming(sub[i], sub[j]);
          n++;
        }
      return { sub, dist: n ? sum / n : 0 };
    })
    .sort((a, b) => a.dist - b.dist || a.sub.join('').localeCompare(b.sub.join('')));
  const idx = Math.round((1 - clamp(subtlety, 0, 1)) * (subsets.length - 1));
  return subsets[idx].sub;
}
function instantiate(template, rng) {
  const symbols = [...new Set([...template])];
  const letters = shuffle([...LETTERS], rng).slice(0, symbols.length);
  const map = new Map(symbols.map((sym, i) => [sym, letters[i]]));
  return [...template].map((sym) => map.get(sym)).join('');
}

/**
 * Generate ONE structured BankItem (one pre-sorted board).
 * @param {{tokenCount:number, binCount:number, patternLength:number,
 *          plantedErrors:number, subtlety:number, seed:string}} lever
 */
export function genItem({ tokenCount, binCount, patternLength, plantedErrors, subtlety, seed }) {
  const rng = makeRng(seed);
  const pool = TEMPLATE_POOL[patternLength];
  if (!pool) throw new Error(`no template pool for pattern length ${patternLength}`);
  const templates = pickTemplates(pool, binCount, subtlety);

  const bins = templates.map((pattern, i) => ({ key: `b${i}`, pattern }));

  // Tiles: round-robin across bins so every bin is genuinely populated, then a
  // seeded display shuffle so planted slips are not positionally predictable.
  const tokens = [];
  for (let i = 0; i < tokenCount; i++) {
    const binIdx = i % binCount;
    const template = templates[binIdx];
    let text = instantiate(template, rng);
    let guard = 0;
    while (tokens.some((t) => t.text === text) && guard++ < 40) text = instantiate(template, rng);
    tokens.push({ id: `t${i}`, text, trueBinIdx: binIdx });
  }

  // Plant the slips on tiles spread across the board (every other one first).
  const order = shuffle(
    tokens.map((_, i) => i),
    rng,
  );
  const plantedIdx = order.slice(0, plantedErrors);
  const placed = tokens.map((t) => ({ ...t, placedBinIdx: t.trueBinIdx }));
  const planted = [];
  for (const ti of plantedIdx) {
    const trueIdx = placed[ti].trueBinIdx;
    const cands = bins
      .map((b, i) => ({ i, dist: hamming(b.pattern, templates[trueIdx]) }))
      .filter((c) => c.i !== trueIdx)
      .sort((a, b) => a.dist - b.dist || a.i - b.i);
    const pick = cands[Math.round((1 - clamp(subtlety, 0, 1)) * (cands.length - 1))];
    placed[ti].placedBinIdx = pick.i;
    planted.push({
      tokenId: placed[ti].id,
      text: placed[ti].text,
      placedBin: bins[pick.i].key,
      trueBin: bins[trueIdx].key,
      patternDistance: pick.dist,
    });
  }

  const display = shuffle(placed, rng);
  const contentTokens = display.map((t) => ({ id: t.id, text: t.text, bin: bins[t.placedBinIdx].key }));

  // ---- Ground truth (SERVER-ONLY) -------------------------------------
  // Keyed in DISPLAY order so the record matches the board a validator reads.
  const trueBin = {};
  for (const t of display) trueBin[t.id] = bins[t.trueBinIdx].key;
  const correctKey = display.map((t) => `${t.id}:${trueBin[t.id]}`).join('|');
  const distractorRationales = {};
  for (const t of display) {
    const isPlanted = planted.some((p) => p.tokenId === t.id);
    const p = planted.find((x) => x.tokenId === t.id);
    distractorRationales[t.id] = isPlanted
      ? {
          lure: 'planted_error',
          note: `sorter dropped ${t.text} (pattern ${signature(t.text)}) into ${p.placedBin}; ` +
            `${p.patternDistance} of ${patternLength} positions differ from that bin's rule`,
          patternDistance: p.patternDistance,
        }
      : { lure: 'correct_placement', note: `${t.text} already sits in the bin matching its pattern`, patternDistance: 0 };
  }

  const difficulty = round2(difficultyFromLevers(tokenCount, binCount, patternLength, plantedErrors, subtlety));

  return {
    itemId: seededUuid(seed),
    typeCode: 'CX-check-01',
    domain: 'fluid_reasoning',
    difficulty, // FLOAT 1..20 — DESIGN rung from task complexity (validated:false)
    ageBands: ageBandsFor(difficulty),
    demoPath: 'demos/CX-check-01.html',
    content: {
      typeCode: 'CX-check-01',
      promptText:
        'The sorter put these tiles into groups. Some tiles are in the wrong group. ' +
        'You can fix them, or you can turn it in right away.',
      binRuleKind: 'repetition_pattern',
      bins, // visible group headers (the rule the child reads)
      tokens: contentTokens, // as delivered by the sorter; NO truth marker
      tokenCount,
      binCount,
      patternLength,
      controls: {
        canMove: true,
        canMarkChecked: true,
        submitAvailableFrom: 'start', // checking must stay voluntary
        timeLimitSec: null, // deliberately no deadline: never reward submit speed
      },
      instructions: {
        howto:
          'Tap a tile to pick it up, then tap the group it belongs in. ' +
          'Tap the small check on a tile to mark that you looked at it. ' +
          'Press Turn it in whenever you want.',
      },
    },
    answer: {
      correctKey, // canonical tile:bin assignment
      trueBin,
      plantedErrors: planted,
      distractorRationales,
      scoringRule:
        'per-tile placement accuracy; planted slips split into caught / missed; ' +
        'correctly-placed tiles moved away count as over-corrections',
      validityCaveat:
        'Long review time alone is ambiguous. Read M-PERSIST jointly with review coverage, ' +
        'corrections and final accuracy, and gate on M-ENGAGE, so slow processing is not scored as carefulness.',
    },
    scoring: {
      // No judge is required for this type — see the header note.
      mode: 'deterministic_key',
      deterministic: [
        'placement: response.finalPlacement vs answer.trueBin (M-ACC)',
        'planted slips caught / missed / over-corrections vs answer.plantedErrors (M-ERRTYPE)',
        'review coverage: distinct tiles inspected before submit (M-EXPLORE)',
        'active review time before submit (M-PERSIST)',
        'systematic review order and corrections (M-PLANFUL / M-REV / M-PATH)',
      ],
      deferred: [],
      deferredRationale:
        'Both the sort key and every carefulness behaviour are machine-computable from the interaction log, ' +
        'so no LLM/human rubric judge is introduced (METRIC_FRAMEWORK §0 removed M-RUBRIC by design).',
    },
    provenance: {
      generator: 'grammar',
      generatorRef: 'cx-check-01-grammar@1',
      seed,
      levers: {
        tokenCount,
        binCount,
        patternLength,
        plantedErrors,
        // Full precision (not rounded): enables exact, reproducible regeneration.
        subtlety,
      },
    },
    syntheticOnly: true,
    validated: false,
  };
}

// Age-band targeting hint from the difficulty rung. CX-check-01 declares all four
// bands (the behavioural signal is age-general; only the board scales).
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
 * (BUILD_PLAN §0: >=5 per +/-1 pt band, gradual 1..20). Board shapes rotate
 * within a bin; rule-similarity is the continuous fine-positioner.
 * ================================================================== */
export function buildBank({ perBin = 6 } = {}) {
  const items = [];
  for (let k = 1; k <= 20; k++) {
    const lo = Math.max(1, k - 0.45);
    const hi = Math.min(20, k + 0.45);

    const segments = [];
    for (const cfg of ALLOWED_CONFIGS) {
      const dLo = difficultyFromLevers(cfg.N, cfg.B, cfg.P, cfg.E, 0);
      const dHi = difficultyFromLevers(cfg.N, cfg.B, cfg.P, cfg.E, 1);
      const a = Math.max(lo, dLo);
      const b = Math.min(hi, dHi);
      if (b > a + 1e-6) segments.push({ ...cfg, tLo: a, tHi: b });
    }
    if (segments.length === 0) throw new Error(`no reachable board config for difficulty bin k=${k}`);

    // Spread across distinct board shapes rather than clustering on one.
    const step = Math.max(1, Math.floor(segments.length / perBin));
    const chosen = [];
    for (let i = 0; i < perBin; i++) chosen.push(segments[(i * step) % segments.length]);
    const seenPerSeg = new Map();

    for (let i = 0; i < perBin; i++) {
      const seg = chosen[i];
      const tag = `${seg.N}-${seg.B}-${seg.P}-${seg.E}`;
      const li = seenPerSeg.get(tag) || 0;
      seenPerSeg.set(tag, li + 1);
      const nHits = chosen.filter((s) => `${s.N}-${s.B}-${s.P}-${s.E}` === tag).length;
      const t = seg.tLo + (seg.tHi - seg.tLo) * ((li + 0.5) / nHits);
      const subtlety = solveSubtlety(seg.N, seg.B, seg.P, seg.E, t);
      const seed = `CX-check-01|bin=${k}|i=${i}|N${seg.N}B${seg.B}P${seg.P}E${seg.E}`;
      items.push(
        genItem({
          tokenCount: seg.N,
          binCount: seg.B,
          patternLength: seg.P,
          plantedErrors: seg.E,
          subtlety,
          seed,
        }),
      );
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
  const outPath = resolve(__dirname, '../banks/CX-check-01.jsonl');
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
  console.log(`CX-check-01 bank: ${items.length} items -> ${outPath}`);
  console.log(`difficulty span: ${round2(min)} .. ${round2(max)}  (target 1..20)`);
  console.log('per-bin counts (k: n):');
  console.log(bins.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join('  '));
  const short = bins.map((n, i) => ({ k: i + 1, n })).filter((b) => b.n < 5);
  console.log(short.length ? `SHORT BINS (<5): ${short.map((b) => b.k).join(',')}` : 'all bins >=5 OK');
}
