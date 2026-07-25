// CX-diverge-01 "Brainstorm Blaster" — structured bank generator (Bucket A: grammar).
//
// Emits a STRUCTURED item bank (JSONL) conforming to EXAM_ADAPTIVE_BUILD_PLAN.md §2
// (BankItem). An "item" here is a TASK CONFIGURATION: an open divergent-production
// prompt (alternate uses / instances / similarities), any category constraints, and
// the ideation window. There is NO answer key — divergent production has no single
// correct response, and nothing the child types is ever marked wrong.
//
// SCORING (`scoring.mode='model_judge_deferred'`):
//   deterministic now  — M-IDEAFLU as a PLAIN AUTO COUNT of distinct ideas
//                        (exact normalized-string dedupe, no semantic judgement),
//                        M-ELAB as a surface word count, M-PERSIST as ideas produced
//                        in the final third of the window, plus M-RT / M-RTFIRST /
//                        M-REV / M-EXPLORE / M-PATH from the interaction log.
//   deferred           — M-FLEX (semantic category clustering), M-ORIG (statistical
//                        infrequency against a per-prompt norm bank) and the
//                        appropriateness/depth rubric. NO automated originality or
//                        rubric judge is invented here: METRIC_FRAMEWORK §4 flags the
//                        per-prompt response bank as an OPEN feasibility task, and the
//                        previous demo's hard-coded frequency table was a stand-in that
//                        would have been mistaken for a real norm. It is removed.
//
// D-017 DEVIATION (recorded deliberately): the catalog's age_rationale offers a
// picture-icon / drawing mode for K-1 so pre-readers can respond. D-017 makes reading
// a REQUIRED baseline-literacy gate delivered as on-screen text only, so every band
// uses typed text; low-difficulty prompts instead use very simple, high-frequency
// wording. No audio and no text-to-speech anywhere.
//
// Governance: born-synthetic only (syntheticOnly:true, validated:false). The
// `difficulty` float is a DESIGN rung, NOT a calibrated IRT parameter — and per the
// type's own adaptive notes this is not a classic-CAT construct: "difficulty" here
// means how demanding the prompt is (abstractness, constraints, window), not a
// right/wrong ladder.
//
// Run:  node research/exam-question-types/generators/CX-diverge-01.mjs
//       writes ../banks/CX-diverge-01.jsonl and prints a coverage summary.

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
 * PROMPT INVENTORY — 3 modes x 3 abstractness tiers. Mode and abstractness are
 * difficulty levers; WHICH subject inside a cell is picked is surface variety.
 * Wording stays short and high-frequency at tier 0 (the reading gate must test
 * ideation, not decoding).
 * ------------------------------------------------------------------ */
export const MODES = ['alternate_uses', 'instances', 'similarities'];
export const SUBJECTS = {
  alternate_uses: [
    ['a shoe', 'a cup', 'a paper clip', 'a big box', 'a brick', 'a spoon'],
    ['a circle', 'a long string', 'a mirror', 'a shadow', 'a hole', 'a wheel'],
    ['the number zero', 'silence', 'an empty room', 'a rainy day', 'the colour blue', 'waiting'],
  ],
  instances: [
    [
      'things that are round',
      'things you can eat',
      'things with wheels',
      'things that are soft',
      'things that make a noise',
      'things you find in a kitchen',
    ],
    [
      'things that can float',
      'things that come in pairs',
      'things that fold',
      'things that get smaller over time',
      'things that fit in one hand',
      'things that go up and come back down',
    ],
    [
      'things you cannot touch',
      'things that read the same forwards and backwards',
      'things that can only happen once',
      'things that are true for everyone',
      'things that have no end',
      'things you can only notice by waiting',
    ],
  ],
  similarities: [
    [
      ['a cat', 'a dog'],
      ['a spoon', 'a fork'],
      ['a bike', 'a bus'],
      ['a book', 'a box'],
      ['an apple', 'an orange'],
      ['a chair', 'a bed'],
    ],
    [
      ['a river', 'a road'],
      ['a clock', 'a heart'],
      ['a key', 'a password'],
      ['a tree', 'an umbrella'],
      ['a map', 'a story'],
      ['a mirror', 'a lake'],
    ],
    [
      ['a promise', 'a bridge'],
      ['silence', 'an empty page'],
      ['a rule', 'a fence'],
      ['a memory', 'a photograph'],
      ['time', 'a river'],
      ['hunger', 'a question'],
    ],
  ],
};

// Category constraints. These narrow the search space, which is the second
// difficulty lever from the spec ("category constraints").
export const CONSTRAINT_POOL = [
  { id: 'pretend_only', text: 'Only ideas that are pretend or made up.' },
  { id: 'not_normal_use', text: 'No idea may be the way it is normally used.' },
  { id: 'different_kind', text: 'Each idea must be a different kind from the ones before it.' },
  { id: 'helps_someone', text: 'Every idea must help another person.' },
  { id: 'no_repeat_start', text: 'No two ideas may start with the same word.' },
  { id: 'works_in_dark', text: 'Every idea must still work in the dark.' },
];

// The judging aid the DEFERRED M-FLEX clusterer will need. Shipped in `answer`,
// never in `content` (it would hint at what to produce).
export const CATEGORY_SCHEME = [
  { id: 'functional', label: 'Functional / tool use', cue: 'does a job: cut, hold, dig, fix, carry' },
  { id: 'physical', label: 'Physical property', cue: 'uses shape, weight, material, size' },
  { id: 'imaginative', label: 'Imaginative / pretend', cue: 'story, magic, tiny world, character' },
  { id: 'social', label: 'Social / helping', cue: 'gift, signal, teaching, helping someone' },
  { id: 'aesthetic', label: 'Art / decoration', cue: 'art, pattern, music, display' },
  { id: 'symbolic', label: 'Symbolic / abstract', cue: 'stands for something: sign, code, measure, metaphor' },
];

/* ------------------------------------------------------------------ *
 * THE AUTO-COUNT RULE (M-IDEAFLU) — the one deterministic quantity this type
 * yields. It is a PLAIN COUNT: lowercase, strip punctuation, collapse spaces,
 * drop leading articles, then dedupe on exact string equality. Deliberately NOT
 * fuzzy: near-duplicate merging is a semantic judgement and belongs to the
 * deferred judge. The renderer, this generator and the validator all use this
 * exact rule so the client count and the server count cannot diverge.
 * ------------------------------------------------------------------ */
export const AUTO_COUNT_RULE = {
  normalize: 'lowercase; replace non-alphanumerics with spaces; drop leading a/an/the; collapse spaces; trim',
  dedupe: 'exact equality on the normalized string (no fuzzy or semantic merging)',
};
export function normalizeIdea(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/^(a|an|the)\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}
export function countDistinctIdeas(list) {
  const seen = new Set();
  for (const raw of list) {
    const n = normalizeIdea(raw);
    if (n) seen.add(n);
  }
  return seen.size;
}

/* ================================================================== *
 * DIFFICULTY MODEL — for an open ideation task there is no right/wrong ladder,
 * so difficulty is PROMPT DEMAND, derived from the type's declared
 * difficulty_levers (master_types.jsonl CX-diverge-01: "object abstractness,
 * category constraints, time window length, prompt novelty"):
 *
 *   mode M (0..2)         -> alternate uses < instances < similarities
 *                            (similarities demands relational abstraction)
 *   abstractness A (0..2) -> concrete object < semi-abstract < abstract concept
 *   constraints C (0..2)  -> how much of the idea space is ruled out
 *   window w (0..1, cont) -> 150s down to 60s; the fine positioner inside a bin
 *
 * Guilford/Runco: the demand of a divergent task rises with the abstractness of
 * the stimulus and with constraints that block the obvious first responses.
 * ================================================================== */
const MODE_W = 1.4;
const ABSTRACT_W = 2.4;
const CONSTRAINT_W = 1.8;
const WINDOW_SPAN = 3.0;
export const WINDOW_MAX_SEC = 150;
export const WINDOW_MIN_SEC = 60;

function rawScore(M, A, C, w) {
  return 1.0 + MODE_W * M + ABSTRACT_W * A + CONSTRAINT_W * C + WINDOW_SPAN * w;
}
const RAW_MIN = rawScore(0, 0, 0, 0); // 1.0
const RAW_MAX = rawScore(2, 2, 2, 1); // 15.2

export function difficultyFromLevers(M, A, C, w) {
  return clamp(1 + ((rawScore(M, A, C, w) - RAW_MIN) * 19) / (RAW_MAX - RAW_MIN), 1, 20);
}
function solveWindow(M, A, C, targetD) {
  const rawNeeded = RAW_MIN + ((targetD - 1) * (RAW_MAX - RAW_MIN)) / 19;
  return clamp((rawNeeded - rawScore(M, A, C, 0)) / WINDOW_SPAN, 0, 1);
}
export function windowSecFor(w) {
  return Math.round(WINDOW_MAX_SEC - (WINDOW_MAX_SEC - WINDOW_MIN_SEC) * clamp(w, 0, 1));
}

export const ALLOWED_CONFIGS = (() => {
  const out = [];
  for (const M of [0, 1, 2]) for (const A of [0, 1, 2]) for (const C of [0, 1, 2]) out.push({ M, A, C });
  return out;
})();

/**
 * Generate ONE structured BankItem (one ideation prompt).
 * @param {{modeIndex:number, abstractness:number, constraintCount:number,
 *          subjectIndex:number, windowTightness:number, seed:string}} lever
 */
export function genItem({ modeIndex, abstractness, constraintCount, subjectIndex, windowTightness, seed }) {
  const rng = makeRng(seed);
  const mode = MODES[modeIndex];
  if (!mode) throw new Error(`unknown mode index ${modeIndex}`);
  const cell = SUBJECTS[mode][abstractness];
  const subject = cell[subjectIndex % cell.length];

  let headline;
  let subjectA;
  let subjectB = null;
  if (mode === 'alternate_uses') {
    subjectA = subject;
    headline = `How many different ways could you use ${subject}?`;
  } else if (mode === 'instances') {
    subjectA = subject;
    headline = `Name as many ${subject} as you can.`;
  } else {
    subjectA = subject[0];
    subjectB = subject[1];
    headline = `How are ${subject[0]} and ${subject[1]} alike? Name as many ways as you can.`;
  }

  const constraints = shuffle(CONSTRAINT_POOL, rng).slice(0, constraintCount);
  const timeWindowSec = windowSecFor(windowTightness);
  const difficulty = round2(difficultyFromLevers(modeIndex, abstractness, constraintCount, windowTightness));

  return {
    itemId: seededUuid(seed),
    typeCode: 'CX-diverge-01',
    domain: 'fluid_reasoning',
    difficulty, // FLOAT 1..20 — DESIGN rung from prompt demand (validated:false)
    ageBands: ageBandsFor(difficulty),
    demoPath: 'demos/CX-diverge-01.html',
    content: {
      typeCode: 'CX-diverge-01',
      prompt: {
        mode,
        subject: subjectA,
        subjectB, // only used by the similarities mode
        headline,
        note: 'There is no wrong answer. Try to think of ideas that are different from each other.',
      },
      constraints, // on-screen text the child must read and honour
      timeWindowSec,
      minIdeasToSend: 1,
      responseMode: 'text', // D-017: typed text for every band; no picture-only mode, no audio
      ideaMaxChars: 60,
      instructions: {
        howto: 'Type one idea and press Enter. Keep adding ideas until the time runs out or you press Send.',
      },
    },
    answer: {
      // There is no deterministic key for divergent production.
      correctKey: null,
      noKeyRationale:
        'Divergent production has no single correct response; no idea is ever marked wrong. ' +
        'The deterministic signal is the AUTO COUNT of distinct ideas and the timing of their production; ' +
        'quality dimensions require the deferred judge.',
      autoCountRule: AUTO_COUNT_RULE, // the server re-counts M-IDEAFLU with this exact rule
      rubric: {
        judge: 'deferred',
        dimensions: [
          {
            id: 'flexibility',
            metric: 'M-FLEX',
            question: 'How many distinct categories from answer.categoryScheme do the ideas span?',
            anchors: { 0: 'one category', 1: 'two categories', 2: 'three categories', 3: 'four or more categories' },
          },
          {
            id: 'originality',
            metric: 'M-ORIG',
            question: 'How infrequent are the ideas against a per-prompt norm bank?',
            anchors: {
              0: 'all ideas are the most common responses',
              1: 'one uncommon idea',
              2: 'several uncommon ideas',
              3: 'multiple rare but appropriate ideas',
            },
          },
          {
            id: 'elaboration',
            metric: 'M-ELAB',
            question: 'Beyond raw word count, do the ideas add detail that changes the idea?',
            anchors: {
              0: 'bare labels only',
              1: 'one idea carries a detail',
              2: 'several ideas carry a detail',
              3: 'ideas are developed with a purpose or mechanism',
            },
          },
          {
            id: 'appropriateness',
            metric: null,
            question: 'Are the ideas on topic and do they honour the stated constraints?',
            anchors: {
              0: 'mostly off topic or ignores the constraints',
              1: 'on topic but drifts from the constraints',
              2: 'on topic and mostly within the constraints',
              3: 'every idea is on topic and inside the constraints',
            },
          },
        ],
      },
      categoryScheme: CATEGORY_SCHEME, // judging aid for the deferred M-FLEX clusterer
      originalityNormBank: null,
      openAssumptions: [
        'No per-prompt response-frequency norm bank exists yet, so M-ORIG cannot be computed ' +
          '(METRIC_FRAMEWORK §4 feasibility flag). No stand-in frequency table is shipped, because a ' +
          'hand-written one would be mistaken for a norm.',
        'Automated semantic clustering for M-FLEX is not built; the category scheme above is the ' +
          'input a future clusterer or judge would use.',
      ],
    },
    scoring: {
      mode: 'model_judge_deferred',
      deterministic: [
        'M-IDEAFLU: plain auto count of distinct ideas (exact normalized-string dedupe, no semantic judgement)',
        'M-ELAB: surface mean words per idea (the semantic elaboration grade stays deferred)',
        'M-PERSIST: ideas produced in the final third of the window',
        'M-RT / M-RTFIRST: submit latency and time to the first idea',
        'M-REV: ideas deleted or rewritten before sending',
        'M-EXPLORE / M-PATH: entry attempts (including rejected duplicates) and the full action sequence',
      ],
      deferred: [
        'M-FLEX: semantic category clustering against answer.categoryScheme (clusterer NOT built)',
        'M-ORIG: statistical infrequency against a per-prompt norm bank (bank NOT built)',
        'appropriateness / on-topic and constraint-compliance screen',
        'rubric grading of idea depth (answer.rubric.dimensions)',
      ],
      judgeRubricRef: 'answer.rubric',
      notApplicable: {
        'M-PLANFUL': 'no pre-commit search to be systematic about; ideation order is not a plan',
        'M-EFF': 'no optimal solution exists for a divergent prompt, so efficiency-vs-optimal is undefined',
      },
    },
    provenance: {
      generator: 'grammar',
      generatorRef: 'cx-diverge-01-grammar@1',
      seed,
      levers: {
        modeIndex,
        abstractness,
        constraintCount,
        subjectIndex,
        // Full precision (not rounded): enables exact, reproducible regeneration.
        windowTightness,
      },
    },
    syntheticOnly: true,
    validated: false,
  };
}

// Age-band targeting hint from the difficulty rung. CX-diverge-01 declares all
// four bands (generate-many-answers works from kindergarten upward).
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
 * (BUILD_PLAN §0: >=5 per +/-1 pt band, gradual 1..20). Prompt demand configs
 * rotate within a bin; the ideation window is the continuous fine-positioner
 * and the subject rotates for surface variety.
 * ================================================================== */
export function buildBank({ perBin = 6 } = {}) {
  const items = [];
  for (let k = 1; k <= 20; k++) {
    const lo = Math.max(1, k - 0.45);
    const hi = Math.min(20, k + 0.45);

    const segments = [];
    for (const cfg of ALLOWED_CONFIGS) {
      const dLo = difficultyFromLevers(cfg.M, cfg.A, cfg.C, 0);
      const dHi = difficultyFromLevers(cfg.M, cfg.A, cfg.C, 1);
      const a = Math.max(lo, dLo);
      const b = Math.min(hi, dHi);
      if (b > a + 1e-6) segments.push({ ...cfg, tLo: a, tHi: b });
    }
    if (segments.length === 0) throw new Error(`no reachable prompt-demand config for difficulty bin k=${k}`);

    const hits = segments.map(() => 0);
    for (let i = 0; i < perBin; i++) hits[i % segments.length]++;
    const localSeen = segments.map(() => 0);

    for (let i = 0; i < perBin; i++) {
      const segIdx = i % segments.length;
      const seg = segments[segIdx];
      const li = localSeen[segIdx]++;
      const t = seg.tLo + (seg.tHi - seg.tLo) * ((li + 0.5) / hits[segIdx]);
      const windowTightness = solveWindow(seg.M, seg.A, seg.C, t);
      const subjectIndex = (k + i * 2) % 6;
      const seed = `CX-diverge-01|bin=${k}|i=${i}|M${seg.M}A${seg.A}C${seg.C}|s${subjectIndex}`;
      items.push(
        genItem({
          modeIndex: seg.M,
          abstractness: seg.A,
          constraintCount: seg.C,
          subjectIndex,
          windowTightness,
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
  const outPath = resolve(__dirname, '../banks/CX-diverge-01.jsonl');
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
  console.log(`CX-diverge-01 bank: ${items.length} items -> ${outPath}`);
  console.log(`difficulty span: ${round2(min)} .. ${round2(max)}  (target 1..20)`);
  console.log('per-bin counts (k: n):');
  console.log(bins.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join('  '));
  const short = bins.map((n, i) => ({ k: i + 1, n })).filter((b) => b.n < 5);
  console.log(short.length ? `SHORT BINS (<5): ${short.map((b) => b.k).join(',')}` : 'all bins >=5 OK');
}
