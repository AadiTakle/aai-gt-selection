// CX-figural-01 "Squiggle Studio" — structured bank generator (Bucket A: grammar).
//
// Emits a STRUCTURED item bank (JSONL) conforming to EXAM_ADAPTIVE_BUILD_PLAN.md §2
// (BankItem). This type is an OPEN FIGURAL PRODUCTION task: the child draws on a
// starter squiggle to turn it into a picture, then makes a different picture from
// a fresh copy of the same squiggle. There is no right answer, so:
//
//   * scoring.mode is 'model_judge_deferred' — the drawing artifacts are stored
//     for a later consensual-assessment (human/model panel) rating of originality.
//     NO automated originality or creativity judge is defined here; automated
//     creativity scoring of drawings is unreliable (Amabile 1982; Torrance 1974).
//   * `answer.correctKey` is null and there are no distractors.
//   * The renderer still emits COUNT/PROCESS metrics (M-IDEAFLU, M-ELAB, M-PATH,
//     M-PERSIST, M-ENGAGE plus the basic-core timing metrics), so the type
//     participates in adaptive selection and metric-coverage stopping (§0, §4)
//     without ever claiming a creativity score.
//
// `difficulty` is therefore a DEMAND rung, not a probability-of-correct rung: it
// orders stimuli by how much the task asks of the child (ambiguity of the line,
// number of base lines, how binding the constraint is, how many distinct ideas
// are requested, how much time pressure). The spec's own adaptive note says
// "branching selects stimulus complexity rather than scoring correctness".
//
// Governance: born-synthetic only (syntheticOnly:true, validated:false).
//
// Run:  node research/exam-question-types/generators/CX-figural-01.mjs
//       writes ../banks/CX-figural-01.jsonl and prints a coverage summary.

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
const round1 = (x) => Math.round(x * 10) / 10;
const round2 = (x) => Math.round(x * 100) / 100;

/* ================================================================== *
 * STIMULUS GRAMMAR — a starter squiggle drawn as renderer-agnostic polylines.
 * AMBIGUITY is the continuous lever: at 0 the line is a smooth symmetric arc
 * (one or two obvious readings: a hill, a rainbow); as it rises the line gains
 * control points, vertical jitter and, past 0.55, horizontal backtracking that
 * can make it cross itself — many more readings, none obvious.
 * ================================================================== */
export const CANVAS = { width: 320, height: 160 };
const MARGIN_X = 22;
const MARGIN_Y = 18;
const SAMPLES_PER_SEGMENT = 8;
export const controlCountFor = (ambiguity) => 3 + Math.round(ambiguity * 5); // 3..8
export const pointCountFor = (ambiguity) => (controlCountFor(ambiguity) - 1) * SAMPLES_PER_SEGMENT + 1;

function catmullRom(ctrl, per) {
  const P = (i) => ctrl[clamp(i, 0, ctrl.length - 1)];
  const out = [];
  for (let i = 0; i < ctrl.length - 1; i++) {
    const [p0, p1, p2, p3] = [P(i - 1), P(i), P(i + 1), P(i + 2)];
    for (let s = 0; s < per; s++) {
      const t = s / per;
      const t2 = t * t;
      const t3 = t2 * t;
      const at = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([at(p0[0], p1[0], p2[0], p3[0]), at(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(ctrl[ctrl.length - 1].slice());
  return out.map(([x, y]) => [round1(clamp(x, 2, CANVAS.width - 2)), round1(clamp(y, 2, CANVAS.height - 2))]);
}

export function makeStrokes(baseLines, ambiguity, rng) {
  const strokes = [];
  const laneH = (CANVAS.height - 2 * MARGIN_Y) / baseLines;
  for (let i = 0; i < baseLines; i++) {
    const n = controlCountFor(ambiguity);
    const top = MARGIN_Y + laneH * i;
    const ctrl = [];
    for (let k = 0; k < n; k++) {
      const tx = k / (n - 1);
      const arcY = top + laneH * (0.5 - 0.42 * Math.sin(Math.PI * tx));
      const jitter = (rng() * 2 - 1) * ambiguity * laneH * 0.46;
      const backtrack = ambiguity > 0.55 ? (rng() * 2 - 1) * ambiguity * 0.12 : 0;
      ctrl.push([
        MARGIN_X + (CANVAS.width - 2 * MARGIN_X) * clamp(tx + backtrack, 0, 1),
        clamp(arcY + jitter, MARGIN_Y * 0.6, CANVAS.height - MARGIN_Y * 0.6),
      ]);
    }
    strokes.push({ id: `base-${i + 1}`, points: catmullRom(ctrl, SAMPLES_PER_SEGMENT) });
  }
  return strokes;
}

/* ================================================================== *
 * TASK CONSTRAINTS — on-screen TEXT only (reading is a required baseline-literacy
 * gate, D-017; never audio). Wording is kept to high-frequency words a beginning
 * reader can handle at the low rungs; the binding constraints only appear at the
 * higher demand rungs, which target older bands.
 * ================================================================== */
export const CONSTRAINTS = [
  { id: 'open', load: 0.0, text: 'Draw on the line to turn it into a picture.' },
  { id: 'living', load: 0.8, text: 'Draw on the line to turn it into a living thing.' },
  { id: 'motion', load: 1.4, text: 'Draw on the line to turn it into something that moves.' },
  { id: 'avoid_obvious', load: 2.4, text: 'Draw on the line to turn it into something that is not an animal and not a plant.' },
  { id: 'dual_image', load: 3.4, text: 'Make one drawing that shows two different things at the same time.' },
];
export const TIME_WINDOWS = [180, 150, 120, 90, 60];
export const IDEA_TARGETS = [1, 2, 3, 4];
export const BASE_LINES = [1, 2, 3];
const MIN_SECONDS_PER_IDEA = 20; // feasibility floor: never ask for more ideas than the window allows

export const LABEL_CATEGORIES = ['animal', 'plant', 'person', 'machine', 'place', 'weather', 'something else'];

/* ================================================================== *
 * DEMAND MODEL — difficulty derives from the type's declared difficulty_levers
 * (master_types.jsonl CX-figural-01): "stimulus ambiguity, number of base lines,
 * constraints, time window" (+ how many distinct ideas are asked for). Mapped
 * linearly onto a FLOAT 1..20 rung.
 * ================================================================== */
const AMBIGUITY_SPAN = 2.6;
const baseLineTerm = (n) => 1.5 * (n - 1);
const ideaTerm = (n) => 0.9 * (n - 1);
const timeTerm = (sec) => (2.0 * (180 - sec)) / 120;
const constraintLoad = (id) => CONSTRAINTS.find((c) => c.id === id).load;

function rawScore(cfg, ambiguity) {
  return (
    1.0 +
    baseLineTerm(cfg.baseLines) +
    constraintLoad(cfg.constraint) +
    ideaTerm(cfg.ideaTargetMin) +
    timeTerm(cfg.timeWindowSec) +
    AMBIGUITY_SPAN * ambiguity
  );
}
export function allConfigs() {
  const out = [];
  for (const baseLines of BASE_LINES)
    for (const c of CONSTRAINTS)
      for (const ideaTargetMin of IDEA_TARGETS)
        for (const timeWindowSec of TIME_WINDOWS) {
          if (timeWindowSec / ideaTargetMin < MIN_SECONDS_PER_IDEA) continue;
          // A dual-image drawing cannot be asked for many times over in one window.
          if (c.id === 'dual_image' && ideaTargetMin > 2 && timeWindowSec < 120) continue;
          out.push({ baseLines, constraint: c.id, ideaTargetMin, timeWindowSec });
        }
  return out;
}
const RAW_MIN = Math.min(...allConfigs().map((c) => rawScore(c, 0)));
const RAW_MAX = Math.max(...allConfigs().map((c) => rawScore(c, 1)));
export function difficultyFromLevers(cfg, ambiguity) {
  return clamp(1 + ((rawScore(cfg, ambiguity) - RAW_MIN) * 19) / (RAW_MAX - RAW_MIN), 1, 20);
}
function solveAmbiguity(cfg, targetD) {
  const rawNeeded = RAW_MIN + ((targetD - 1) * (RAW_MAX - RAW_MIN)) / 19;
  return clamp((rawNeeded - rawScore(cfg, 0)) / AMBIGUITY_SPAN, 0, 1);
}

// Age-band targeting hint from the demand rung (this type declares all four bands;
// the same canvas mechanic works from K-1 up, only the demand changes).
export function ageBandsFor(difficulty) {
  const bands = [];
  if (difficulty < 4.5) bands.push('K-1');
  if (difficulty >= 3.5 && difficulty < 8.5) bands.push('2-3');
  if (difficulty >= 7.5 && difficulty < 12.5) bands.push('4-5');
  if (difficulty >= 11.5) bands.push('6-8');
  if (bands.length === 0) bands.push(difficulty < 3 ? 'K-1' : '6-8');
  return bands;
}

function promptFor(cfg) {
  const c = CONSTRAINTS.find((x) => x.id === cfg.constraint);
  const more =
    cfg.ideaTargetMin > 1
      ? ` Then press New idea to get the same line again and make something different. Try to make at least ${cfg.ideaTargetMin} different pictures.`
      : ' When you are happy with it, press the check to send it.';
  return c.text + more;
}

/* ================================================================== *
 * ITEM BUILDER
 * ================================================================== */
/**
 * Generate ONE structured BankItem.
 * @param {{baseLines:number, constraint:string, ideaTargetMin:number,
 *          timeWindowSec:number, ambiguity:number, seed:string}} lever
 */
export function genItem({ baseLines, constraint, ideaTargetMin, timeWindowSec, ambiguity, seed }) {
  const cfg = { baseLines, constraint, ideaTargetMin, timeWindowSec };
  const a = clamp(ambiguity, 0, 1);
  const rng = makeRng(seed);
  const strokes = makeStrokes(baseLines, a, rng);
  const difficulty = round2(difficultyFromLevers(cfg, a));

  return {
    itemId: seededUuid(seed),
    typeCode: 'CX-figural-01',
    domain: 'fluid_reasoning',
    difficulty, // FLOAT 1..20 — DEMAND rung for stimulus selection, not a correctness rung
    ageBands: ageBandsFor(difficulty),
    demoPath: 'demos/CX-figural-01.html',
    content: {
      typeCode: 'CX-figural-01',
      prompt: promptFor(cfg), // on-screen text only (D-017); never narrated
      constraint: { id: constraint, text: CONSTRAINTS.find((c) => c.id === constraint).text },
      stimulus: {
        viewBox: { width: CANVAS.width, height: CANVAS.height },
        baseLineCount: baseLines,
        strokes, // renderer-agnostic polylines: [{id, points:[[x,y],...]}]
      },
      ideaTargetMin,
      timeWindowSec,
      labelCategories: LABEL_CATEGORIES, // tappable fallback for a child who cannot type a name
      responseSpec: {
        kind: 'open_figural_production',
        artifactPerIdea: ['strokes', 'label'],
        minIdeas: ideaTargetMin,
      },
    },
    answer: {
      // OPEN-ENDED: there is no correct response and no distractor to key.
      correctKey: null,
      distractorRationales: {},
      scorable: false,
      deferredJudge: {
        method: 'consensual_assessment_technique',
        rater: 'human_or_model_panel',
        dimensions: ['originality', 'elaboration', 'transformation_of_base_line', 'fit_to_constraint'],
        artifact: ['response.ideas[].strokes', 'response.ideas[].label'],
        note:
          'Automated originality scoring of childrens drawings is unreliable, so no automated creativity judge is defined. Store the artifacts and rate them later; flag low scoring reliability on any report that uses them.',
      },
      automatedProcessMetrics: ['M-IDEAFLU', 'M-ELAB', 'M-PATH', 'M-PERSIST', 'M-ENGAGE'],
      automatedProcessMetricsNote:
        'counts, ratios and timings only — none of these is a correctness, originality or creativity score',
    },
    scoring: {
      mode: 'model_judge_deferred',
      autoScored: false,
      participatesInSelection: true,
      selectionSignals: ['M-IDEAFLU', 'M-PERSIST', 'M-ELAB'],
      note: 'contributes metric coverage and stimulus-complexity branching only; it never moves an accuracy bracket',
    },
    provenance: {
      generator: 'grammar',
      generatorRef: 'cx-figural-01-grammar@1',
      seed,
      levers: {
        baseLines,
        constraint,
        ideaTargetMin,
        timeWindowSec,
        // Full precision (not rounded): enables exact, reproducible regeneration.
        ambiguity: a,
      },
    },
    syntheticOnly: true,
    validated: false,
  };
}

/* ================================================================== *
 * BANK BUILDER — fill each integer difficulty bin k=1..20 with >=perBin items
 * (BUILD_PLAN §0: >=5 per +/-1 pt band, gradual 1..20). Ambiguity is the
 * continuous fine-positioner inside a bin; configs vary the discrete demand.
 * ================================================================== */
export function buildBank({ perBin = 6 } = {}) {
  const configs = allConfigs();
  const items = [];
  for (let k = 1; k <= 20; k++) {
    const lo = Math.max(1, k - 0.45);
    const hi = Math.min(20, k + 0.45);

    const segments = [];
    for (const cfg of configs) {
      const a = Math.max(lo, difficultyFromLevers(cfg, 0));
      const b = Math.min(hi, difficultyFromLevers(cfg, 1));
      if (b > a + 1e-6) segments.push({ cfg, tLo: a, tHi: b });
    }
    if (segments.length === 0) throw new Error(`no reachable lever config for difficulty bin k=${k}`);

    // Spread across distinct configs (variety of constraint / lines / window).
    const stride = Math.max(1, Math.floor(segments.length / perBin));
    const picked = [];
    for (let i = 0; i < perBin; i++) picked.push(segments[(i * stride) % segments.length]);

    const sigOf = (s) => `${s.cfg.baseLines}|${s.cfg.constraint}|${s.cfg.ideaTargetMin}|${s.cfg.timeWindowSec}`;
    const seen = new Map();
    for (let i = 0; i < perBin; i++) {
      const seg = picked[i];
      const sig = sigOf(seg);
      const li = seen.get(sig) || 0;
      seen.set(sig, li + 1);
      const nHits = picked.filter((s) => sigOf(s) === sig).length;
      const t = seg.tLo + (seg.tHi - seg.tLo) * ((li + 0.5) / nHits);
      const ambiguity = solveAmbiguity(seg.cfg, t);
      items.push(genItem({ ...seg.cfg, ambiguity, seed: `CX-figural-01|bin=${k}|i=${i}|${sig}` }));
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
  const outPath = resolve(__dirname, '../banks/CX-figural-01.jsonl');
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
  console.log(`CX-figural-01 bank: ${items.length} items -> ${outPath}`);
  console.log(`lever configs: ${allConfigs().length}`);
  console.log(`demand span: ${round2(min)} .. ${round2(max)}  (target 1..20)`);
  console.log('per-bin counts (k: n):');
  console.log(bins.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join('  '));
  const short = bins.map((n, i) => ({ k: i + 1, n })).filter((b) => b.n < 5);
  console.log(short.length ? `SHORT BINS (<5): ${short.map((b) => b.k).join(',')}` : 'all bins >=5 OK');
  console.log('scoring.mode = model_judge_deferred (no automated originality judge)');
}
