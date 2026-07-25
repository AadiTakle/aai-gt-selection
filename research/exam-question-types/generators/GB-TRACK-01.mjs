#!/usr/bin/env node
// GB-TRACK-01 - Firefly Jars structured bank generator (grammar, game-based delivery).
//
// Emits a JSONL bank of BankItem rows (research/exam-question-types/banks/GB-TRACK-01.jsonl)
// conforming to the item/result contract in docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md (2)
// and docs/architecture/EXAM_ITEM_SCHEMA_SPEC.md. Born-synthetic: syntheticOnly=true,
// validated=false. Deterministic given BASE_SEED.
//
// GAME-BASED / INTERACTIVE multiple-object-tracking type. Some jars light up with fireflies,
// the lids close, and the jars then slide around each other for a number of phases. When the
// motion stops the child taps every jar they believe still holds a firefly.
//
// CONSTRUCT RISK, handled explicitly: tracking load must come from HOW MANY objects must be
// held and HOW COMPLEX the motion is - never from how fast the child can click. Therefore
//   * the difficulty ladder scales target count, jar count, phase count and the number of
//     SIMULTANEOUS swaps per phase (crossing density); phase duration falls only gently
//     (1000ms -> 560ms) and is floored, so it can never become a speed test;
//   * the response phase is UNTIMED. Input is locked while the jars move and released at the
//     response prompt, so no answer can be lost to slow motor control;
//   * efficiency (M-EFF) is TAP ECONOMY (taps spent versus the number of fireflies announced
//     on screen), not reaction time. M-RT is tracked but is not the efficiency metric.
//
// The motion is fully deterministic and REPLAYABLE. content.motion carries an explicit phase
// script (disjoint slot-swap pairs) generated from provenance.seed, and the answer carries a
// digest of the replayed permutation trajectory. The identical replayMotion() function below
// is used verbatim by generators/check-GB-TRACK-01.mjs and demos/GB-TRACK-01.html, so the
// motion the child watches and the motion the scorer replays are provably the same.
//
// Usage:
//   node generators/GB-TRACK-01.mjs            # write bank
//   node generators/GB-TRACK-01.mjs --verify   # write bank + independent self-check
//
// Difficulty is a FLOAT 1..20 (a design rung, provisional; not calibrated).

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serializeBank } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../banks/GB-TRACK-01.jsonl');
const BASE_SEED = 20260724;
const TYPE_CODE = 'GB-TRACK-01';
const DOMAIN = 'spatial';
const GENERATOR_REF = 'gb-track-01-grammar@1';
const DEMO_PATH = 'demos/GB-TRACK-01.html';
const SOLVER_ID = 'gb-track-01-replay-permutation@1';
const STAGE = { w: 520, h: 300, jar: 58 };

// ---------------------------------------------------------------------------
// Deterministic RNG (mulberry32) + string hashing.
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
function makeRng(seedStr) { return mulberry32(hashStr(seedStr)); }
function seededUuid(seedStr) {
  const b = new Uint8Array(16);
  let h = hashStr(seedStr);
  for (let i = 0; i < 16; i++) { h = (Math.imul(h ^ (h >>> 13), 0x5bd1e995) + i * 0x9e3779b1) >>> 0; b[i] = h & 0xff; }
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const hex = [...b].map(x => x.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
}
const round2 = (x) => Math.round(x * 100) / 100;
const rnd = (rng, n) => Math.floor(rng() * n);

// ===========================================================================
// SHARED REPLAY - this exact function body also lives in check-GB-TRACK-01.mjs
// and (between the REPLAY markers) in demos/GB-TRACK-01.html. Jar j starts in slot j; each
// phase applies its disjoint slot-swap pairs. The digest fingerprints the whole trajectory,
// so the checker and the renderer can be proven to animate the same motion.
// ===========================================================================
export function replayMotion(content) {
  const n = content.jarCount;
  const slotOfJar = [];
  for (let j = 0; j < n; j++) slotOfJar.push(j);
  const trace = [slotOfJar.join(',')];
  for (const phase of content.motion.phases) {
    for (const pair of phase.swaps) {
      let ja = -1, jb = -1;
      for (let j = 0; j < n; j++) { if (slotOfJar[j] === pair[0]) ja = j; if (slotOfJar[j] === pair[1]) jb = j; }
      if (ja < 0 || jb < 0) continue;
      const t = slotOfJar[ja]; slotOfJar[ja] = slotOfJar[jb]; slotOfJar[jb] = t;
    }
    trace.push(slotOfJar.join(','));
  }
  let h = 2166136261 >>> 0;
  const s = trace.join(';');
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return { slotOfJar: slotOfJar, trace: trace, digest: (h >>> 0).toString(16) };
}

// ---------------------------------------------------------------------------
// Slot layout: fixed positions the jars slide between.
// ---------------------------------------------------------------------------
function layoutSlots(n) {
  const rows = n <= 5 ? 1 : (n <= 10 ? 2 : 3);
  const cols = Math.ceil(n / rows);
  const slots = [];
  const gapX = (STAGE.w - STAGE.jar) / Math.max(1, cols - 1);
  const gapY = rows === 1 ? 0 : (STAGE.h - STAGE.jar - 20) / (rows - 1);
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / cols), c = i % cols;
    slots.push({
      x: Math.round(cols === 1 ? (STAGE.w - STAGE.jar) / 2 : c * gapX),
      y: Math.round(rows === 1 ? (STAGE.h - STAGE.jar) / 2 : 10 + r * gapY),
    });
  }
  return slots;
}

// ---------------------------------------------------------------------------
// Difficulty ramp. Load = targets x phases x simultaneous swaps; phaseMs is a floored,
// gentle lever so motion speed never becomes the discriminator.
// ---------------------------------------------------------------------------
const LEVELS = {
  1:  { jars: 4,  targets: 1, phases: 2,  swaps: 1, bugs: 0, phaseMs: 1000 },
  2:  { jars: 4,  targets: 1, phases: 3,  swaps: 1, bugs: 0, phaseMs: 980 },
  3:  { jars: 5,  targets: 1, phases: 4,  swaps: 1, bugs: 1, phaseMs: 950 },
  4:  { jars: 5,  targets: 2, phases: 4,  swaps: 1, bugs: 1, phaseMs: 920 },
  5:  { jars: 6,  targets: 2, phases: 5,  swaps: 1, bugs: 1, phaseMs: 900 },
  6:  { jars: 6,  targets: 2, phases: 6,  swaps: 2, bugs: 2, phaseMs: 880 },
  7:  { jars: 7,  targets: 2, phases: 7,  swaps: 2, bugs: 2, phaseMs: 860 },
  8:  { jars: 7,  targets: 3, phases: 7,  swaps: 2, bugs: 2, phaseMs: 840 },
  9:  { jars: 8,  targets: 3, phases: 8,  swaps: 2, bugs: 2, phaseMs: 820 },
  10: { jars: 8,  targets: 3, phases: 9,  swaps: 2, bugs: 3, phaseMs: 800 },
  11: { jars: 9,  targets: 3, phases: 10, swaps: 3, bugs: 3, phaseMs: 780 },
  12: { jars: 9,  targets: 4, phases: 10, swaps: 3, bugs: 3, phaseMs: 760 },
  13: { jars: 10, targets: 4, phases: 11, swaps: 3, bugs: 3, phaseMs: 740 },
  14: { jars: 10, targets: 4, phases: 12, swaps: 3, bugs: 4, phaseMs: 720 },
  15: { jars: 11, targets: 4, phases: 13, swaps: 3, bugs: 4, phaseMs: 700 },
  16: { jars: 11, targets: 5, phases: 14, swaps: 4, bugs: 4, phaseMs: 680 },
  17: { jars: 12, targets: 5, phases: 15, swaps: 4, bugs: 4, phaseMs: 660 },
  18: { jars: 12, targets: 5, phases: 16, swaps: 4, bugs: 5, phaseMs: 640 },
  19: { jars: 13, targets: 6, phases: 17, swaps: 4, bugs: 5, phaseMs: 600 },
  20: { jars: 14, targets: 6, phases: 18, swaps: 5, bugs: 6, phaseMs: 560 },
};
const ITEMS_PER_LEVEL = 6;
const ATTEMPTS = 40;
const GLOW_MS = 1400;               // how long the fireflies are visible before the lids close
const MIN_PHASE_MS = 550;           // hard floor: speed is never the discriminator

// Tap budget: a pure function of the jar count, so it cannot leak the number of fireflies.
export function maxTapsFor(jars) { return 4 * jars; }

// Age-band targeting hint from the difficulty rung. This type declares only 2-3 | 4-5 | 6-8 in
// catalog/master_types.jsonl, so the BUILD_PLAN ladder's bottom rungs target the lowest
// declared band rather than inventing K-1: the D-017 reading gate raises an age floor, it
// never lowers one. Boundary overlap is a targeting hint, not a hard cut.
export function ageBandsFor(difficulty) {
  const bands = [];
  const add = (b) => { if (!bands.includes(b)) bands.push(b); };
  if (difficulty < 8.5) add('2-3');
  if (difficulty >= 7.5 && difficulty < 12.5) add('4-5');
  if (difficulty >= 11.5) add('6-8');
  if (bands.length === 0) add(difficulty < 8 ? '2-3' : '6-8');
  return bands;
}

const RESPONSE_TAXONOMY = [
  { kind: 'exact_set', rationale: 'the selected slots are exactly the slots holding fireflies after the motion (correct)' },
  { kind: 'partial_hit', rationale: 'some but not all firefly jars found; the miss count indexes where tracking capacity broke down (M-SPAN)' },
  { kind: 'false_alarm', rationale: 'selected a jar that never held a firefly - a filtering failure rather than a capacity failure (M-FALSEALARM)' },
  { kind: 'start_position_error', rationale: 'selected the slots the fireflies STARTED in; the child memorised locations instead of updating bindings through the swaps' },
  { kind: 'wrong_count', rationale: 'selected more or fewer jars than the announced firefly count despite the count being on screen (tap economy failure, M-EFF)' },
  { kind: 'no_response', rationale: 'submitted with nothing selected' },
];

// ---------------------------------------------------------------------------
// Motion script: `phases` phases of `swaps` DISJOINT slot-pair exchanges.
// ---------------------------------------------------------------------------
function genMotion(rng, cfg, targetJars) {
  const n = cfg.jars;
  const slotOfJar = []; for (let j = 0; j < n; j++) slotOfJar.push(j);
  const touched = new Set();
  const phases = [];
  const targetSet = new Set(targetJars);
  for (let p = 0; p < cfg.phases; p++) {
    const free = []; for (let s = 0; s < n; s++) free.push(s);
    // shuffle the free slots
    for (let i = free.length - 1; i > 0; i--) { const j = rnd(rng, i + 1); [free[i], free[j]] = [free[j], free[i]]; }
    const swaps = [];
    const maxSwaps = Math.min(cfg.swaps, Math.floor(n / 2));
    // Bias the first swap of most phases onto a slot that currently holds a target jar, so
    // targets genuinely move rather than sitting still while decoys shuffle.
    if (rng() < 0.8) {
      const targetSlots = targetJars.map(j => slotOfJar[j]);
      const a = targetSlots[rnd(rng, targetSlots.length)];
      const b = free.find(s => s !== a);
      if (b !== undefined) {
        swaps.push([a, b]);
        free.splice(free.indexOf(a), 1); free.splice(free.indexOf(b), 1);
      }
    }
    while (swaps.length < maxSwaps && free.length >= 2) swaps.push([free.pop(), free.pop()]);
    for (const [a, b] of swaps) {
      let ja = -1, jb = -1;
      for (let j = 0; j < n; j++) { if (slotOfJar[j] === a) ja = j; if (slotOfJar[j] === b) jb = j; }
      if (targetSet.has(ja) || targetSet.has(jb)) { if (targetSet.has(ja)) touched.add(ja); if (targetSet.has(jb)) touched.add(jb); }
      const t = slotOfJar[ja]; slotOfJar[ja] = slotOfJar[jb]; slotOfJar[jb] = t;
    }
    phases.push({ swaps });
  }
  const finalTargetSlots = targetJars.map(j => slotOfJar[j]).sort((a, b) => a - b);
  const startTargetSlots = targetJars.slice().sort((a, b) => a - b);
  const everyTargetMoved = targetJars.every(j => touched.has(j));
  const setChanged = finalTargetSlots.join(',') !== startTargetSlots.join(',');
  return { phases, finalTargetSlots, everyTargetMoved, setChanged };
}

function genBugs(rng, count, phases) {
  const bugs = [];
  for (let i = 0; i < count; i++) {
    bugs.push({
      atPhase: rnd(rng, Math.max(1, phases)),
      y0: 20 + rnd(rng, STAGE.h - 60),
      y1: 20 + rnd(rng, STAGE.h - 60),
      fromLeft: rng() < 0.5,
    });
  }
  return bugs.sort((a, b) => a.atPhase - b.atPhase);
}

// ---------------------------------------------------------------------------
// Build one item.
// ---------------------------------------------------------------------------
function buildItem(L, idx) {
  const seed = `${TYPE_CODE}|L${L}|#${idx}|${BASE_SEED}`;
  const rng = makeRng(seed);
  const cfg = LEVELS[L];
  const n = cfg.jars;

  // target jars (jar j starts in slot j, so these are also the slots that glow at the start)
  const pool = []; for (let j = 0; j < n; j++) pool.push(j);
  for (let i = pool.length - 1; i > 0; i--) { const j = rnd(rng, i + 1); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const targetJars = pool.slice(0, cfg.targets).sort((a, b) => a - b);

  let motion = null;
  for (let t = 0; t < ATTEMPTS; t++) {
    const m = genMotion(rng, cfg, targetJars);
    if (m.everyTargetMoved && m.setChanged) { motion = m; break; }
    if (!motion) motion = m;                                  // keep the last as a fallback
  }

  const phaseMs = Math.max(MIN_PHASE_MS, cfg.phaseMs);
  const content = {
    typeCode: TYPE_CODE,
    question: {
      mode: 'track_targets',
      targetCount: cfg.targets,
      prompt: `Watch the ${cfg.targets} jar${cfg.targets > 1 ? 's' : ''} that light up. Keep your eyes on ${cfg.targets > 1 ? 'them' : 'it'} while the jars slide around.`,
      responsePrompt: `Tap the ${cfg.targets} jar${cfg.targets > 1 ? 's' : ''} that hold${cfg.targets > 1 ? '' : 's'} a firefly, then press DONE. Take as long as you need.`,
    },
    jarCount: n,
    slots: layoutSlots(n),
    initialTargets: targetJars,          // jar ids that glow at t=0 (shown to the child)
    motion: {
      seed,                              // the motion below was drawn from this seed
      glowMs: GLOW_MS,
      phaseMs,
      phaseCount: motion.phases.length,
      swapsPerPhase: Math.min(cfg.swaps, Math.floor(n / 2)),
      phases: motion.phases,             // explicit script: disjoint slot-swap pairs per phase
    },
    clutterBugs: { bugs: genBugs(rng, cfg.bugs, motion.phases.length) },
    limits: { maxTaps: maxTapsFor(n) },
    responseUntimed: true,               // renderer must not impose a response deadline
    optionKind: 'slot_set',
    scaffold: { warmup: L <= 2 },
  };

  const replay = replayMotion(content);
  const finalSlots = targetJars.map(j => replay.slotOfJar[j]).sort((a, b) => a - b);
  const difficulty = round2(Math.min(20, Math.max(1, L + (rng() * 0.7 - 0.35))));

  const answer = {
    correctKey: finalSlots.join(','),     // the slots holding fireflies when the motion stops
    canonicalSolution: {
      targetSlots: finalSlots,
      finalSlotOfJar: replay.slotOfJar.slice(),
      motionDigest: replay.digest,        // fingerprint of the whole replayed trajectory
      startSlots: targetJars.slice(),
    },
    cost: { taps: cfg.targets },          // a perfectly economical child taps exactly this often
    relation: 'replay_seeded_swap_permutation',
    acceptedEquivalence: {
      rule: 'unordered_slot_set_equality',
      note: 'The response is a SET of slots: tap order is irrelevant and re-taps that cancel out do '
        + 'not change it. A submission is CORRECT iff the selected slot set equals canonicalSolution.targetSlots. '
        + 'The server must re-run replayMotion(content) rather than trusting any client value, and may '
        + 'reject a trace whose reported motionDigest differs from the one recomputed here.',
      efficiency: 'M-EFF = cost.taps / tapsSpent (1.0 = no wasted taps or de-selections; NOT a speed measure)',
    },
    distractorRationales: RESPONSE_TAXONOMY,
  };

  return {
    itemId: seededUuid(seed),
    typeCode: TYPE_CODE,
    domain: DOMAIN,
    difficulty,
    ageBands: ageBandsFor(difficulty),
    demoPath: DEMO_PATH,
    content,
    answer,
    scoring: { mode: 'computed_solver', solverId: SOLVER_ID, partialCredit: true },
    provenance: {
      generator: 'grammar',
      generatorRef: GENERATOR_REF,
      seed,
      levers: { level: L, jars: n, targets: cfg.targets, phases: motion.phases.length, swapsPerPhase: content.motion.swapsPerPhase, bugs: cfg.bugs, phaseMs, load: cfg.targets * motion.phases.length * content.motion.swapsPerPhase },
    },
    syntheticOnly: true,
    validated: false,
  };
}

function generate() {
  const items = [];
  for (let L = 1; L <= 20; L++) for (let i = 0; i < ITEMS_PER_LEVEL; i++) items.push(buildItem(L, i));
  return items;
}

// ---------------------------------------------------------------------------
// Independent self-verification (the standalone checker re-does this from the JSONL).
// ---------------------------------------------------------------------------
function verify(items) {
  let ok = 0, bad = 0; const problems = [];
  const bands = {}; for (let L = 1; L <= 20; L++) bands[L] = 0;
  const seenIds = new Set();
  for (const it of items) {
    const req = ['itemId', 'typeCode', 'domain', 'difficulty', 'ageBands', 'demoPath', 'content', 'answer', 'scoring', 'provenance', 'syntheticOnly', 'validated'];
    for (const k of req) if (!(k in it)) problems.push(`${it.itemId}: missing ${k}`);
    if (seenIds.has(it.itemId)) problems.push(`${it.itemId}: duplicate itemId`); seenIds.add(it.itemId);
    if (it.syntheticOnly !== true || it.validated !== false) problems.push(`${it.itemId}: born-synthetic flags wrong`);
    if (it.scoring.mode !== 'computed_solver') problems.push(`${it.itemId}: scoring mode wrong`);
    const c = it.content, a = it.answer;
    for (const leak of ['answer', 'canonicalSolution', 'targetSlots', 'cost', 'finalSlotOfJar']) if (leak in c) problems.push(`${it.itemId}: content leaks ${leak}`);

    const re = replayMotion(c);
    if (re.digest !== a.canonicalSolution.motionDigest) { bad++; problems.push(`${it.itemId}: replay digest mismatch`); continue; }
    const finalSlots = c.initialTargets.map(j => re.slotOfJar[j]).sort((x, y) => x - y);
    if (finalSlots.join(',') !== a.correctKey) { bad++; problems.push(`${it.itemId}: replayed slots ${finalSlots} != correctKey ${a.correctKey}`); continue; }
    if (new Set(re.slotOfJar).size !== c.jarCount) { bad++; problems.push(`${it.itemId}: replay is not a permutation`); continue; }
    if (finalSlots.join(',') === c.initialTargets.slice().sort((x, y) => x - y).join(',')) { bad++; problems.push(`${it.itemId}: fireflies end where they started (no tracking required)`); continue; }
    ok++;
    for (let L = 1; L <= 20; L++) if (it.difficulty >= L - 1 && it.difficulty <= L + 1) bands[L]++;
  }
  return { ok, bad, problems, bands };
}

function coverageReport(bands) {
  const lines = []; let minBand = Infinity;
  for (let L = 1; L <= 20; L++) { lines.push(`  band ${String(L).padStart(2)} (+/-1pt): ${bands[L]}`); minBand = Math.min(minBand, bands[L]); }
  return { text: lines.join('\n'), minBand };
}

function main() {
  const doVerify = process.argv.includes('--verify');
  const items = generate();
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, serializeBank(items));
  console.log(`[${TYPE_CODE}] wrote ${items.length} items -> ${OUT}`);
  const tg = items.map(it => it.content.question.targetCount);
  const ph = items.map(it => it.content.motion.phases.length);
  const ms = items.map(it => it.content.motion.phaseMs);
  console.log(`[${TYPE_CODE}] fireflies: min ${Math.min(...tg)}, max ${Math.max(...tg)}`);
  console.log(`[${TYPE_CODE}] motion phases: min ${Math.min(...ph)}, max ${Math.max(...ph)}`);
  console.log(`[${TYPE_CODE}] phase duration: max ${Math.max(...ms)} ms, min ${Math.min(...ms)} ms (floor ${MIN_PHASE_MS})`);
  const moved = items.filter(it => it.answer.correctKey !== it.content.initialTargets.slice().sort((a, b) => a - b).join(',')).length;
  console.log(`[${TYPE_CODE}] items where the firefly slots actually changed: ${moved}/${items.length}`);

  const v = verify(items);
  const cov = coverageReport(v.bands);
  console.log(`[${TYPE_CODE}] key check (motion replay + permutation validation): ${v.ok} ok, ${v.bad} bad`);
  console.log(`[${TYPE_CODE}] coverage (min +/-1pt band count = ${cov.minBand}, need >= 5):`);
  if (doVerify) console.log(cov.text);
  if (v.problems.length) {
    console.error(`[${TYPE_CODE}] FAIL: ${v.problems.length} problem(s):`);
    v.problems.slice(0, 20).forEach(p => console.error('  - ' + p));
    process.exit(1);
  }
  if (cov.minBand < 5) { console.error(`[${TYPE_CODE}] FAIL: coverage below 5 in some band`); process.exit(1); }
  console.log(`[${TYPE_CODE}] OK: motion replays deterministically, every trial requires real tracking, coverage satisfied, born-synthetic.`);
}

if (process.argv[1] && process.argv[1].endsWith('GB-TRACK-01.mjs')) main();
