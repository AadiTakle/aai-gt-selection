// CX-achieve-02 "Investigation Station" — structured bank generator (Bucket A: grammar).
//
// Emits a STRUCTURED item bank (JSONL) conforming to EXAM_ADAPTIVE_BUILD_PLAN.md §2
// (BankItem). An "item" here is a TASK/SCENARIO CONFIGURATION, not a keyed question:
// the science-bench sandbox setup (factors + their levels), the loose investigation
// prompt, and the ground-truth outcome model the bench obeys.
//
// Governance: born-synthetic only (syntheticOnly:true, validated:false). The
// `difficulty` float is a DESIGN rung derived from task complexity, NOT a calibrated
// IRT parameter. This is the Q2 (open-ended / rubric-judged) workstream: the full
// metric harvest and the LLM/rubric judge for the child's stated reasoning are
// DEFERRED (`scoring.mode='model_judge_deferred'`). No automated originality or
// rubric judge is invented here.
//
// WHAT IS SCORED DETERMINISTICALLY (recorded in `scoring.deterministic`):
//   - conclusion key: does the chosen setup match the bench's true optimum?
//   - factor pick (depth >= 2): is the named highest-effect factor the true one?
//   - control-of-variables: did successive trials change exactly one factor?
//     (computed from the interaction log alone — needs no key)
//   - exploration breadth, redundancy, convergence events.
// WHAT IS DEFERRED (`scoring.deferred`): the anchored-rubric judgement of the
// child's free-text explanation (depth of reasoning, causal language, control
// awareness). Rubric dimensions + anchors are recorded explicitly in `answer`.
//
// STIMULUS-vs-KEY NOTE (deliberate, same posture as the FLU-MATRIX-01 reference):
// `content.apparatus` carries the bench's response function because a discovery
// sandbox cannot render without it — it is STIMULUS (what the bench does when you
// press Run), exactly as FLU-MATRIX-01 ships the visible matrix cells that its own
// validator solves. What `content` never carries is any ANSWER artifact: the
// conclusion key, the factor ranking, the rule statement, the rubric anchors, the
// optimal plan, or any correctness marker on an option. Those are `answer`-only.
//
// Run:  node research/exam-question-types/generators/CX-achieve-02.mjs
//       writes ../banks/CX-achieve-02.jsonl and prints a coverage summary.

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
 * SCENARIO INVENTORY — surface variety only, NOT a difficulty lever.
 * Every scenario exposes 4 factors x 3 levels; an item slices the first
 * `factorCount` factors and the first `levelCount` levels of each. Labels are
 * short, high-frequency words (D-017: on-screen TEXT only, never audio).
 * ================================================================== */
export const SCENARIOS = [
  {
    id: 'ramp_roll',
    title: 'Roll Bench',
    question: 'Which setup makes the ball roll the farthest?',
    outcomeLabel: 'Roll distance',
    outcomeUnit: 'cm',
    factors: [
      { id: 'ramp', label: 'Ramp', levels: ['Low', 'Middle', 'High'] },
      { id: 'track', label: 'Track', levels: ['Bumpy', 'Rough', 'Smooth'] },
      { id: 'ball', label: 'Ball', levels: ['Heavy', 'Medium', 'Light'] },
      { id: 'push', label: 'Push', levels: ['Soft', 'Medium', 'Hard'] },
    ],
  },
  {
    id: 'plant_grow',
    title: 'Grow Bench',
    question: 'Which setup makes the plant grow the tallest?',
    outcomeLabel: 'Plant height',
    outcomeUnit: 'mm',
    factors: [
      { id: 'light', label: 'Light', levels: ['Dim', 'Medium', 'Bright'] },
      { id: 'water', label: 'Water', levels: ['A little', 'Some', 'A lot'] },
      { id: 'soil', label: 'Soil', levels: ['Sandy', 'Mixed', 'Rich'] },
      { id: 'pot', label: 'Pot', levels: ['Small', 'Medium', 'Big'] },
    ],
  },
  {
    id: 'paper_plane',
    title: 'Flight Bench',
    question: 'Which setup makes the paper plane fly the farthest?',
    outcomeLabel: 'Flight distance',
    outcomeUnit: 'cm',
    factors: [
      { id: 'wing', label: 'Wing', levels: ['Narrow', 'Medium', 'Wide'] },
      { id: 'nose', label: 'Nose', levels: ['Blunt', 'Round', 'Pointed'] },
      { id: 'fold', label: 'Fold', levels: ['Loose', 'Firm', 'Tight'] },
      { id: 'clip', label: 'Clip', levels: ['No clip', 'One clip', 'Two clips'] },
    ],
  },
  {
    id: 'bounce_ball',
    title: 'Bounce Bench',
    question: 'Which setup makes the ball bounce the highest?',
    outcomeLabel: 'Bounce height',
    outcomeUnit: 'cm',
    factors: [
      { id: 'drop', label: 'Drop from', levels: ['Low', 'Middle', 'High'] },
      { id: 'floor', label: 'Floor', levels: ['Rug', 'Wood', 'Stone'] },
      { id: 'ball', label: 'Ball', levels: ['Soft', 'Firm', 'Hard'] },
      { id: 'air', label: 'Air in ball', levels: ['Low', 'Medium', 'Full'] },
    ],
  },
  {
    id: 'boat_sail',
    title: 'Sail Bench',
    question: 'Which setup makes the boat sail the farthest?',
    outcomeLabel: 'Sail distance',
    outcomeUnit: 'cm',
    factors: [
      { id: 'sail', label: 'Sail', levels: ['Small', 'Medium', 'Big'] },
      { id: 'hull', label: 'Hull', levels: ['Wide', 'Middle', 'Narrow'] },
      { id: 'load', label: 'Load', levels: ['Heavy', 'Medium', 'Light'] },
      { id: 'fan', label: 'Fan', levels: ['Low', 'Medium', 'High'] },
    ],
  },
  {
    id: 'magnet_pull',
    title: 'Magnet Bench',
    question: 'Which setup gives the strongest pull?',
    outcomeLabel: 'Pull strength',
    outcomeUnit: 'units',
    factors: [
      { id: 'magnet', label: 'Magnet', levels: ['Small', 'Medium', 'Big'] },
      { id: 'gap', label: 'Gap', levels: ['Far', 'Middle', 'Near'] },
      { id: 'metal', label: 'Metal', levels: ['Tin', 'Steel', 'Iron'] },
      { id: 'card', label: 'Card in gap', levels: ['Thick', 'Thin', 'None'] },
    ],
  },
];

/* ================================================================== *
 * DIFFICULTY MODEL — for an open investigation, difficulty is TASK COMPLEXITY,
 * not distractor discrimination. It derives from the type's declared
 * difficulty_levers (master_types.jsonl CX-achieve-02: "number of manipulable
 * variables, noise in the outcome, whether the best answer requires controlling
 * confounds, depth of the required conclusion"):
 *
 *   factorCount F (2..4)      -> how many interacting factors must be held apart
 *   levelCount  L (2..3)      -> size of the setting space per factor
 *   hasInteraction I (0/1)    -> a genuine CONFOUND: two factors only pay off
 *                                together, so one-factor-at-a-time tests read
 *                                as misleading unless the child combines them
 *   conclusionDepth D (1..3)  -> abstractness of what must be reported
 *                                (1 pick setup / 2 + name the driving factor /
 *                                 3 + write the rule in your own words)
 *   noise n (0..1, continuous)-> measurement wobble; the fine positioner inside
 *                                a difficulty bin
 *
 * Grounded in control-of-variables research (Klahr & Nigam 2004): the cost of an
 * investigation scales with the number of variables to be isolated and with
 * whether an interaction defeats naive single-factor reasoning.
 * ================================================================== */
const FACTOR_W = 2.2; // per extra manipulable factor
const LEVEL_W = 1.8; // per extra level on every factor
const INTERACT_W = 2.6; // a confound that punishes naive one-factor reasoning
const DEPTH_W = 1.7; // per extra conclusion layer
const NOISE_SPAN = 3.0; // outcome wobble contributes 0..3.0
export const MAX_NOISE_AMP = 6; // continuous noise -> integer wobble amplitude

function rawScore(F, L, I, D, noise) {
  return 1.0 + FACTOR_W * (F - 2) + LEVEL_W * (L - 2) + INTERACT_W * I + DEPTH_W * (D - 1) + NOISE_SPAN * noise;
}
const RAW_MIN = rawScore(2, 2, 0, 1, 0); // 1.0
const RAW_MAX = rawScore(4, 3, 1, 3, 1); // 16.2

export function difficultyFromLevers(F, L, I, D, noise) {
  const raw = rawScore(F, L, I, D, noise);
  return clamp(1 + ((raw - RAW_MIN) * 19) / (RAW_MAX - RAW_MIN), 1, 20);
}
// Invert: the noise level that lands (F,L,I,D) on targetD.
function solveNoise(F, L, I, D, targetD) {
  const rawNeeded = RAW_MIN + ((targetD - 1) * (RAW_MAX - RAW_MIN)) / 19;
  const base = rawScore(F, L, I, D, 0);
  return clamp((rawNeeded - base) / NOISE_SPAN, 0, 1);
}

export const ALLOWED_CONFIGS = (() => {
  const out = [];
  for (const F of [2, 3, 4])
    for (const L of [2, 3]) for (const I of [0, 1]) for (const D of [1, 2, 3]) out.push({ F, L, I, D });
  return out;
})();

/* ================================================================== *
 * APPARATUS — the bench's response function (STIMULUS, lives in content).
 *
 * weights[factor][level] = unit * rank(level) * mult(factor)
 *   `unit`   = 3 + noiseAmp, so the true best always beats the runner-up by at
 *              least 3 and by more than a single wobble; repeated trials always
 *              resolve the ordering, but ONE unlucky trial can mislead when the
 *              wobble is large. That is exactly the intended noise lever.
 *   `mult`   = a distinct 1..4 multiplier per factor, so "which factor matters
 *              most" has a UNIQUE answer (needed for the depth-2 sub-key).
 * interaction: factor A held at its SECOND-best level pays a bonus only when
 *   factor B is at its best level. Net effect: the global optimum beats the
 *   naive all-best-levels setup by exactly `unit`.
 * ================================================================== */
export const NOISE_PATTERN = [0, 1, -1, 1, 0, -1, -1, 1];

export function enumerateSettings(factors) {
  let out = [{}];
  for (const f of factors) {
    const next = [];
    for (const partial of out) for (const lv of f.levels) next.push({ ...partial, [f.id]: lv.value });
    out = next;
  }
  return out;
}
export function expectedFor(apparatus, factors, setting) {
  let v = apparatus.base;
  for (const f of factors) v += apparatus.weights[f.id][setting[f.id]];
  const it = apparatus.interaction;
  if (it && setting[it.factorA] === it.levelA && setting[it.factorB] === it.levelB) v += it.bonus;
  return v;
}
function hashSetting(factors, setting) {
  const P = [3, 5, 7, 11];
  let h = 0;
  factors.forEach((f, i) => {
    h += (setting[f.id] + 1) * P[i % P.length];
  });
  return h;
}
// The reading the bench shows. `trialSlot` = how many times this exact setting
// has already been run, so a repeat wobbles instead of echoing.
export function readingFor(apparatus, factors, setting, trialSlot) {
  const e = expectedFor(apparatus, factors, setting);
  const h = hashSetting(factors, setting) + trialSlot * 7;
  return Math.max(1, e + NOISE_PATTERN[h % NOISE_PATTERN.length] * apparatus.noiseAmp);
}
export function settingKey(factors, setting) {
  return factors.map((f) => `${f.id}=${setting[f.id]}`).join(',');
}

const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E', 'F'];

/**
 * Generate ONE structured BankItem (one bench configuration).
 * @param {{scenarioId:string, factorCount:number, levelCount:number,
 *          hasInteraction:boolean, conclusionDepth:number, noise:number, seed:string}} lever
 */
export function genItem({ scenarioId, factorCount, levelCount, hasInteraction, conclusionDepth, noise, seed }) {
  const rng = makeRng(seed);
  const scenario = SCENARIOS.find((s) => s.id === scenarioId);
  if (!scenario) throw new Error(`unknown scenario ${scenarioId}`);

  const factors = scenario.factors.slice(0, factorCount).map((f) => ({
    id: f.id,
    label: f.label,
    levels: f.levels.slice(0, levelCount).map((label, value) => ({ value, label })),
  }));

  const noiseAmp = Math.round(clamp(noise, 0, 1) * MAX_NOISE_AMP);
  const unit = 3 + noiseAmp;
  const mults = shuffle([1, 2, 3, 4], rng).slice(0, factorCount);

  // Per-factor level ranking: perm[levelIndex] = rank (levelCount-1 is best).
  const weights = {};
  const bestLevel = {};
  const secondLevel = {};
  factors.forEach((f, fi) => {
    const perm = shuffle(
      Array.from({ length: levelCount }, (_, i) => i),
      rng,
    );
    weights[f.id] = perm.map((rank) => unit * rank * mults[fi]);
    bestLevel[f.id] = perm.indexOf(levelCount - 1);
    secondLevel[f.id] = perm.indexOf(levelCount - 2);
  });

  let interaction = null;
  if (hasInteraction) {
    const a = factors[0];
    const b = factors[1];
    interaction = {
      factorA: a.id,
      levelA: secondLevel[a.id],
      factorB: b.id,
      levelB: bestLevel[b.id],
      // Pay back what dropping A to second-best costs, plus one clear unit.
      bonus: unit * mults[0] + unit,
    };
  }
  const base = 20 + Math.floor(rng() * 10);
  const apparatus = { base, weights, interaction, noiseAmp, readingFloor: 1 };

  // ---- Ground truth (SERVER-ONLY) -------------------------------------
  const allSettings = enumerateSettings(factors);
  const scored = allSettings
    .map((s) => ({ setting: s, expected: expectedFor(apparatus, factors, s) }))
    .sort((x, y) => y.expected - x.expected);
  const bestSetting = scored[0].setting;
  const margin = scored[0].expected - scored[1].expected;

  // Effect size per factor = span of its level weights (unique by construction).
  const factorRanking = factors
    .map((f) => {
      const w = weights[f.id];
      return { factorId: f.id, label: f.label, effectSize: Math.max(...w) - Math.min(...w) };
    })
    .sort((a, b) => b.effectSize - a.effectSize);

  // ---- Conclusion options (RENDERABLE, no correctness marker) ----------
  const pool = [];
  const pushSetting = (s) => {
    if (!s) return;
    if (pool.some((p) => settingKey(factors, p) === settingKey(factors, s))) return;
    pool.push(s);
  };
  pushSetting(bestSetting);
  // Naive all-best-levels setup: the trap when an interaction is present.
  const naive = {};
  factors.forEach((f) => {
    naive[f.id] = bestLevel[f.id];
  });
  pushSetting(naive);
  // One-factor-off near misses, walking the factors in ranking order.
  for (const fr of factorRanking) {
    const f = factors.find((x) => x.id === fr.factorId);
    const alt = { ...bestSetting };
    alt[f.id] = (bestSetting[f.id] + 1) % levelCount;
    pushSetting(alt);
  }
  // A clearly-off setup (every factor at its worst level).
  const worst = {};
  factors.forEach((f) => {
    const w = weights[f.id];
    worst[f.id] = w.indexOf(Math.min(...w));
  });
  pushSetting(worst);

  // Small setting spaces (2 factors x 2 levels) can exhaust the near-miss recipes
  // above; top up from the remaining space, strongest first, so every item still
  // offers at least four distinct setups.
  for (const s of scored.map((x) => x.setting)) {
    if (pool.length >= 5) break;
    pushSetting(s);
  }
  const nOptions = Math.min(clamp(factorCount + 2, 4, 5), pool.length);
  const chosen = pool.slice(0, nOptions);
  const shuffled = shuffle(chosen, rng);
  const options = shuffled.map((s, i) => ({ key: OPTION_KEYS[i], setting: s }));

  let correctKey = null;
  const distractorRationales = {};
  options.forEach((o) => {
    const exp = expectedFor(apparatus, factors, o.setting);
    const diffs = factors.filter((f) => o.setting[f.id] !== bestSetting[f.id]).map((f) => f.id);
    if (diffs.length === 0) {
      correctKey = o.key;
      distractorRationales[o.key] = {
        lure: 'correct',
        expected: exp,
        factorsOffFromBest: [],
        note: 'the bench truly peaks at this setup',
      };
    } else if (interaction && settingKey(factors, o.setting) === settingKey(factors, naive)) {
      distractorRationales[o.key] = {
        lure: 'ignored_interaction',
        expected: exp,
        factorsOffFromBest: diffs,
        note: 'best level of every factor taken alone; misses the pair that only pays off together',
      };
    } else if (diffs.length === 1) {
      distractorRationales[o.key] = {
        lure: 'one_factor_off',
        expected: exp,
        factorsOffFromBest: diffs,
        note: `near miss: only ${diffs[0]} is set wrong`,
      };
    } else {
      distractorRationales[o.key] = {
        lure: 'far_setup',
        expected: exp,
        factorsOffFromBest: diffs,
        note: `${diffs.length} factors set wrong`,
      };
    }
  });

  // ---- Optimal-investigation reference (SERVER-ONLY) -------------------
  // A minimally sufficient controlled design: hold everything at the level-0
  // baseline and sweep one factor at a time, then combine the winners (+1 trial
  // to check the interaction when one is present).
  const minInformativeTrials = 1 + factorCount * (levelCount - 1) + (interaction ? 1 : 0);

  const difficulty = round2(
    difficultyFromLevers(factorCount, levelCount, hasInteraction ? 1 : 0, conclusionDepth, noise),
  );

  // Three sample readings the checker re-derives independently, proving the
  // renderer's bench function is reproducible from `content.apparatus` alone.
  const sampleReadings = [
    { setting: bestSetting, trialSlot: 0 },
    { setting: naive, trialSlot: 1 },
    { setting: worst, trialSlot: 2 },
  ].map((s) => ({ ...s, reading: readingFor(apparatus, factors, s.setting, s.trialSlot) }));

  return {
    itemId: seededUuid(seed),
    typeCode: 'CX-achieve-02',
    domain: 'fluid_reasoning',
    difficulty, // FLOAT 1..20 — DESIGN rung from task complexity (validated:false)
    ageBands: ageBandsFor(difficulty),
    demoPath: 'demos/CX-achieve-02.html',
    content: {
      typeCode: 'CX-achieve-02',
      scenario: {
        id: scenario.id,
        title: scenario.title,
        question: scenario.question,
        outcomeLabel: scenario.outcomeLabel,
        outcomeUnit: scenario.outcomeUnit,
        direction: 'max',
      },
      factors, // manipulable controls, in display order
      apparatus, // STIMULUS: how the bench responds (see header note)
      trialBudget: 4 + factorCount * (levelCount - 1) * 2,
      minTrialsBeforeConclusion: 2,
      conclusion: {
        depth: conclusionDepth,
        settingQuestion: scenario.question,
        options, // display order; renderable subset (no key / no lure)
        askFactorPick: conclusionDepth >= 2,
        factorQuestion: 'Which one setting changed the result the most?',
        factorOptions: factors.map((f) => ({ key: f.id, label: f.label })),
        askReason: true,
        reasonRequired: conclusionDepth >= 3,
        reasonPrompt: 'Write how you know. Say which tests you ran and what they showed.',
        reasonMaxChars: 400,
      },
      instructions: {
        howto:
          'Pick the settings, then press Run to test them. Test as many times as you like, ' +
          'then press the check to record what you found.',
      },
    },
    answer: {
      // Deterministic sub-key: the true optimum among the offered setups.
      correctKey,
      distractorRationales,
      bestSetting,
      bestExpected: scored[0].expected,
      runnerUpExpected: scored[1].expected,
      margin,
      factorRanking, // depth-2 sub-key = factorRanking[0].factorId
      topFactorId: factorRanking[0].factorId,
      ruleStatement: interaction
        ? `Set ${factorRanking.map((f) => f.label).join(' and ')} to the best levels found, but ` +
          `${interaction.factorA} only pays off at its second level when ${interaction.factorB} is at its best level.`
        : `Each setting acts on its own; ${factorRanking[0].label} changes the result the most.`,
      optimalPlan: { minInformativeTrials, design: 'one-factor-at-a-time sweep from a fixed baseline' },
      verification: { sampleReadings },
      // DEFERRED judge: anchors only. No automated rubric scorer is provided.
      rubric: {
        judge: 'deferred',
        dimensions: [
          {
            id: 'control_of_variables',
            question: 'Does the explanation show that only one thing was changed at a time?',
            anchors: {
              0: 'no mention of how the tests were set up',
              1: 'mentions testing but not what was held the same',
              2: 'says one thing was changed while the rest stayed the same',
              3: 'names the held-constant settings and why that makes the test fair',
            },
          },
          {
            id: 'evidence_use',
            question: 'Does the explanation cite the readings it actually observed?',
            anchors: {
              0: 'no reference to any reading',
              1: 'refers to one reading vaguely',
              2: 'compares two readings',
              3: 'compares readings across several trials and handles the wobble',
            },
          },
          {
            id: 'causal_claim',
            question: 'Is the stated rule supported by the trials that were run?',
            anchors: {
              0: 'no rule stated',
              1: 'restates the winning setup with no rule',
              2: 'states a rule for one factor',
              3: 'states a rule covering the factors tested, including any pairing',
            },
          },
        ],
      },
    },
    scoring: {
      // The item cannot be fully scored without the deferred reasoning judge.
      mode: 'model_judge_deferred',
      deterministic: [
        'conclusion_key: response.conclusionKey === answer.correctKey',
        'factor_pick (depth>=2): response.factorPick === answer.topFactorId',
        'control_of_variables: fraction of consecutive trials changing exactly one factor (M-PLANFUL)',
        'exploration_breadth: distinct settings tested (M-EXPLORE / M-IDEAFLU)',
        'non_redundancy: distinct settings / trials run (M-EFF)',
        'convergence: running-best improvement events (M-PROG)',
      ],
      deferred: [
        'reasoning_rubric: answer.rubric.dimensions applied to response.reasonText (LLM/human judge, NOT built)',
      ],
      judgeRubricRef: 'answer.rubric',
    },
    provenance: {
      generator: 'grammar',
      generatorRef: 'cx-achieve-02-grammar@1',
      seed,
      levers: {
        scenarioId,
        factorCount,
        levelCount,
        hasInteraction,
        conclusionDepth,
        // Full precision (not rounded): enables exact, reproducible regeneration.
        noise,
      },
    },
    syntheticOnly: true,
    validated: false,
  };
}

// Age-band targeting hint. CX-achieve-02 declares 2-3 | 4-5 | 6-8 only (no K-1:
// designing a controlled test is unreliable in kindergarten), so the low rungs
// land on 2-3 rather than inventing a band the type does not serve.
export function ageBandsFor(difficulty) {
  const bands = [];
  const add = (b) => {
    if (!bands.includes(b)) bands.push(b);
  };
  if (difficulty < 8.5) add('2-3');
  if (difficulty >= 7.5 && difficulty < 12.5) add('4-5');
  if (difficulty >= 11.5) add('6-8');
  if (bands.length === 0) add(difficulty < 8 ? '2-3' : '6-8');
  return bands;
}

/* ================================================================== *
 * BANK BUILDER — fill each integer difficulty bin k=1..20 with >=perBin items
 * (BUILD_PLAN §0: >=5 per +/-1 pt band, gradual 1..20). Items in a bin spread
 * across every complexity config that can reach it; the noise level is the
 * continuous fine-positioner, and the scenario rotates for surface variety.
 * ================================================================== */
export function buildBank({ perBin = 6 } = {}) {
  const items = [];
  for (let k = 1; k <= 20; k++) {
    const lo = Math.max(1, k - 0.45);
    const hi = Math.min(20, k + 0.45);

    const segments = [];
    for (const cfg of ALLOWED_CONFIGS) {
      const dLo = difficultyFromLevers(cfg.F, cfg.L, cfg.I, cfg.D, 0);
      const dHi = difficultyFromLevers(cfg.F, cfg.L, cfg.I, cfg.D, 1);
      const a = Math.max(lo, dLo);
      const b = Math.min(hi, dHi);
      if (b > a + 1e-6) segments.push({ ...cfg, tLo: a, tHi: b });
    }
    if (segments.length === 0) throw new Error(`no reachable complexity config for difficulty bin k=${k}`);

    const hits = segments.map(() => 0);
    for (let i = 0; i < perBin; i++) hits[i % segments.length]++;
    const localSeen = segments.map(() => 0);

    for (let i = 0; i < perBin; i++) {
      const segIdx = i % segments.length;
      const seg = segments[segIdx];
      const li = localSeen[segIdx]++;
      const t = seg.tLo + (seg.tHi - seg.tLo) * ((li + 0.5) / hits[segIdx]);
      const noise = solveNoise(seg.F, seg.L, seg.I, seg.D, t);
      const scenarioId = SCENARIOS[(k + i) % SCENARIOS.length].id;
      const seed = `CX-achieve-02|bin=${k}|i=${i}|F${seg.F}L${seg.L}I${seg.I}D${seg.D}|${scenarioId}`;
      items.push(
        genItem({
          scenarioId,
          factorCount: seg.F,
          levelCount: seg.L,
          hasInteraction: seg.I === 1,
          conclusionDepth: seg.D,
          noise,
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
  const outPath = resolve(__dirname, '../banks/CX-achieve-02.jsonl');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, serializeBank(items));

  const bins = Array.from({ length: 20 }, () => 0);
  let min = Infinity;
  let max = -Infinity;
  for (const it of items) {
    const k = Math.round(it.difficulty);
    if (k >= 1 && k <= 20) bins[k - 1]++;
    min = Math.min(min, it.difficulty);
    max = Math.max(max, it.difficulty);
  }
  console.log(`CX-achieve-02 bank: ${items.length} items -> ${outPath}`);
  console.log(`difficulty span: ${round2(min)} .. ${round2(max)}  (target 1..20)`);
  console.log('per-bin counts (k: n):');
  console.log(bins.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join('  '));
  const short = bins.map((n, i) => ({ k: i + 1, n })).filter((b) => b.n < 5);
  console.log(short.length ? `SHORT BINS (<5): ${short.map((b) => b.k).join(',')}` : 'all bins >=5 OK');
}
