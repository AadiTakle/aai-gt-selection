#!/usr/bin/env node
// SPA-SCENE-01 - What the Robot Sees structured bank generator (grammar, Bucket A).
//
// Emits a JSONL bank of BankItem rows (research/exam-question-types/banks/SPA-SCENE-01.jsonl)
// conforming to the item/result contract in docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md (2)
// and docs/architecture/EXAM_ITEM_SCHEMA_SPEC.md. Born-synthetic: syntheticOnly=true,
// validated=false. Deterministic given BASE_SEED.
//
// This is a CONSTRUCTED-RESPONSE type (scoring.mode = 'computed_solver'). The child sees a
// top-down scene with a robot standing on one side and rebuilds what the robot sees by
// ordering the object cards left-to-right from the ROBOT's viewpoint (Level-2 perspective
// taking). Partial credit (M-POLY) is graded server-side over correctly ordered pairs.
//
// The seen order is COMPUTED by line of sight, never authored: with the robot's forward
// vector f (it always faces the scene centre) and right vector r = (-f.y, f.x) in map
// coordinates (x right, y down), each object's bearing is atan2(rel.r, rel.f) and the
// seen order is that bearing ascending. Because the map is drawn from the CHILD's side,
// the child's own left-to-right order is a different permutation whenever the viewpoint
// offset is large - that egocentric order is recorded as a labelled lure.
//
// M-ROTSLOPE: every item records `angularDisparityDeg`, the angle between the child's
// viewing direction and the robot's, so a perspective-rotation rate slope can be fit
// across items. The exact left-right REVERSAL foil is tagged chirality 'mirror'.
//
// Usage:
//   node generators/SPA-SCENE-01.mjs            # write bank
//   node generators/SPA-SCENE-01.mjs --verify   # write bank + independent self-check
//
// Difficulty is a FLOAT 1..20 (a design rung, provisional; not calibrated). It rises via
// object count (2 -> 6), viewpoint offset (0 -> 180 deg), shrinking angular separation
// between neighbouring objects, an added near/far judgment, and object distinctiveness
// (distinct shape+colour -> one shape, colour only).

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../banks/SPA-SCENE-01.jsonl');
const BASE_SEED = 20260724;
const TYPE_CODE = 'SPA-SCENE-01';
const DOMAIN = 'spatial';
const DEMO_PATH = 'demos/SPA-SCENE-01.html';
const GENERATOR_REF = 'SPA-SCENE-01@1';
const ITEMS_PER_LEVEL = 7;
const ROBOT_R = 1.9;               // robot stands outside the scene, facing its centre
const CHILD_HEADING_DEG = -90;     // the child looks "up" the map: heading (0,-1)

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
function shuffle(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function seededUuid(seedStr) {
  const b = new Uint8Array(16);
  let h = hashStr(seedStr);
  for (let i = 0; i < 16; i++) { h = (Math.imul(h ^ (h >>> 13), 0x5bd1e995) + i * 0x9e3779b1) >>> 0; b[i] = h & 0xff; }
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const hex = [...b].map(x => x.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
}
const round2 = (x) => Math.round(x * 100) / 100;
const round3 = (x) => Math.round(x * 1000) / 1000;
const DEG = 180 / Math.PI;

// ---------------------------------------------------------------------------
// Stimulus vocabulary (outline shapes + colours; no emoji, house rule).
// ---------------------------------------------------------------------------
const SHAPES = ['triangle', 'square', 'circle', 'diamond', 'pentagon', 'star', 'hexagon', 'cross'];
const COLORS = ['#e5484d', '#2f6bd0', '#2f9e56', '#f5a300', '#8e4ec6', '#d6409f', '#0f9b9b', '#7a5b3a'];

// ---------------------------------------------------------------------------
// Line-of-sight ordering.
// ---------------------------------------------------------------------------
function bearings(objects, robot) {
  const f = [Math.cos(robot.headingDeg / DEG), Math.sin(robot.headingDeg / DEG)];
  const r = [-f[1], f[0]];
  return objects.map((o) => {
    const rel = [o.x - robot.x, o.y - robot.y];
    const depth = rel[0] * f[0] + rel[1] * f[1];
    const lateral = rel[0] * r[0] + rel[1] * r[1];
    return { id: o.id, ang: Math.atan2(lateral, depth), depth, dist: Math.hypot(rel[0], rel[1]) };
  });
}
function seenOrder(objects, robot) {
  return bearings(objects, robot).sort((a, b) => a.ang - b.ang).map((b) => b.id);
}
function minSeparationDeg(objects, robot) {
  const bs = bearings(objects, robot).sort((a, b) => a.ang - b.ang);
  let m = Infinity;
  for (let i = 0; i + 1 < bs.length; i++) m = Math.min(m, (bs[i + 1].ang - bs[i].ang) * DEG);
  return bs.length > 1 ? m : 180;
}
function nearestInfo(objects, robot) {
  const bs = bearings(objects, robot).sort((a, b) => a.dist - b.dist);
  return { id: bs[0].id, margin: bs.length > 1 ? bs[1].dist - bs[0].dist : Infinity };
}
const orderKey = (ids) => ids.join('>');

// ---------------------------------------------------------------------------
// Difficulty ramp: one hand-authored profile per level 1..20.
// ---------------------------------------------------------------------------
const PROFILES = {
  1: { n: 2, offsets: [0], minSepDeg: 22, nearest: false, distinct: 'shape_and_color' },
  2: { n: 2, offsets: [30], minSepDeg: 22, nearest: false, distinct: 'shape_and_color' },
  3: { n: 3, offsets: [30], minSepDeg: 20, nearest: false, distinct: 'shape_and_color' },
  4: { n: 3, offsets: [45], minSepDeg: 20, nearest: false, distinct: 'shape_and_color' },
  5: { n: 3, offsets: [90], minSepDeg: 18, nearest: false, distinct: 'shape_and_color' },
  6: { n: 4, offsets: [45], minSepDeg: 17, nearest: false, distinct: 'shape_and_color' },
  7: { n: 4, offsets: [90], minSepDeg: 16, nearest: false, distinct: 'shape_and_color' },
  8: { n: 3, offsets: [180], minSepDeg: 16, nearest: false, distinct: 'shape_and_color' },
  9: { n: 4, offsets: [135], minSepDeg: 15, nearest: false, distinct: 'shape_and_color' },
  10: { n: 4, offsets: [180], minSepDeg: 14, nearest: false, distinct: 'shape_and_color' },
  11: { n: 5, offsets: [90], minSepDeg: 13, nearest: false, distinct: 'shape_and_color' },
  12: { n: 5, offsets: [135], minSepDeg: 12, nearest: true, distinct: 'shape_and_color' },
  13: { n: 5, offsets: [180], minSepDeg: 12, nearest: true, distinct: 'shape_and_color' },
  14: { n: 5, offsets: [135, 150], minSepDeg: 11, nearest: true, distinct: 'shape_and_color' },
  15: { n: 6, offsets: [90], minSepDeg: 10, nearest: true, distinct: 'shape_and_color' },
  16: { n: 6, offsets: [135], minSepDeg: 10, nearest: true, distinct: 'shape_and_color' },
  17: { n: 6, offsets: [180], minSepDeg: 9, nearest: true, distinct: 'shape_and_color' },
  18: { n: 6, offsets: [150], minSepDeg: 8, nearest: true, distinct: 'color_only' },
  19: { n: 6, offsets: [165], minSepDeg: 7.5, nearest: true, distinct: 'color_only' },
  20: { n: 6, offsets: [180], minSepDeg: 7, nearest: true, distinct: 'color_only' },
};

function ageBandsForLevel(L) {
  if (L <= 4) return ['2-3'];
  if (L <= 8) return ['2-3', '4-5'];
  if (L <= 12) return ['4-5', '6-8'];
  return ['6-8'];
}

const PROMPT = 'Put the cards in the order the robot sees them, from the robot\u2019s left to its right.';
const PROMPT_NEAR = 'Put the cards in the order the robot sees them, from the robot\u2019s left to its right, then tap the one that looks nearest to the robot.';

// ---------------------------------------------------------------------------
// Scene search.
// ---------------------------------------------------------------------------
function genScene(rng, P, L) {
  const offsetDeg = P.offsets[Math.floor(rng() * P.offsets.length)];
  const side = rng() < 0.5 ? 1 : -1;
  const a = (offsetDeg * side) / DEG;
  // Robot position: angle 0 puts it on the child's own side (bottom of the map).
  const pos = [Math.sin(a) * ROBOT_R, Math.cos(a) * ROBOT_R];
  const headingDeg = Math.atan2(-pos[1], -pos[0]) * DEG;   // always faces the scene centre
  const robot = { x: round3(pos[0]), y: round3(pos[1]), headingDeg: round2(headingDeg), offsetDeg, side };

  for (let t = 0; t < 3000; t++) {
    const objects = [];
    let placed = true;
    for (let k = 0; k < P.n; k++) {
      let ok = false;
      for (let tries = 0; tries < 80 && !ok; tries++) {
        const ang = rng() * Math.PI * 2, rad = 0.35 + rng() * 0.75;
        const x = round3(Math.cos(ang) * rad), y = round3(Math.sin(ang) * rad);
        if (objects.every(o => Math.hypot(o.x - x, o.y - y) > 0.55)) { objects.push({ id: k, x, y }); ok = true; }
      }
      if (!ok) { placed = false; break; }
    }
    if (!placed) continue;
    const sep = minSeparationDeg(objects, robot);
    if (sep < P.minSepDeg || sep > P.minSepDeg + 26) continue;   // banded: the ramp needs the tight cases
    const bs = bearings(objects, robot);
    if (bs.some(b => b.depth <= 0.4)) continue;                   // everything must be in front of the robot
    const correct = seenOrder(objects, robot);
    const own = seenOrder(objects, { x: 0, y: ROBOT_R, headingDeg: CHILD_HEADING_DEG });
    if (L >= 3 && orderKey(correct) === orderKey(own)) continue;  // the egocentric answer must be wrong
    const near = nearestInfo(objects, robot);
    if (P.nearest && near.margin < 0.18) continue;                // near/far must be unambiguous
    return { objects, robot, correct, own, sep: round2(sep), nearest: near };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Labelled lure orderings (M-ERRTYPE) with computed chirality.
// ---------------------------------------------------------------------------
function swapClosestPair(objects, robot, correct) {
  const bs = bearings(objects, robot).sort((a, b) => a.ang - b.ang);
  let at = 0, best = Infinity;
  for (let i = 0; i + 1 < bs.length; i++) { const d = bs[i + 1].ang - bs[i].ang; if (d < best) { best = d; at = i; } }
  const s = correct.slice();
  [s[at], s[at + 1]] = [s[at + 1], s[at]];
  return s;
}
function depthOrder(objects, robot) {
  return bearings(objects, robot).sort((a, b) => a.dist - b.dist).map(b => b.id);
}
function chiralityOf(correct, order) {
  if (orderKey(order) === orderKey(correct)) return 'same';
  return orderKey(order) === orderKey(correct.slice().reverse()) ? 'mirror' : 'same';
}
function buildLures(rng, scene) {
  const { objects, robot, correct, own } = scene;
  const out = [];
  const push = (lure, derivation, order) => {
    if (!order || order.length !== correct.length) return;
    if (orderKey(order) === orderKey(correct)) return;
    out.push({ lure, chirality: chiralityOf(correct, order), derivation, order: order.slice() });
  };
  push('egocentric_left_right_reversal', { kind: 'reverse' }, correct.slice().reverse());
  push('own_viewpoint_order', { kind: 'own_view' }, own);
  push('near_miss_adjacent_transposition', { kind: 'swap_closest_pair' }, swapClosestPair(objects, robot, correct));
  push('depth_for_lateral_confusion', { kind: 'depth_order' }, depthOrder(objects, robot));
  if (correct.length >= 4) {
    for (let t = 0; t < 12 && out.length < 5; t++) {
      const s = shuffle(rng, correct);
      if (orderKey(s) !== orderKey(correct) && !out.some(o => orderKey(o.order) === orderKey(s))) {
        push('random_scramble', { kind: 'stated_permutation', order: s.slice() }, s);
        break;
      }
    }
  }
  const seen = new Set();
  return out.filter(f => (seen.has(orderKey(f.order)) ? false : (seen.add(orderKey(f.order)), true))).slice(0, 5);
}

// ---------------------------------------------------------------------------
// Build one item.
// ---------------------------------------------------------------------------
function buildItem(L, idx, usedSigs) {
  const P = PROFILES[L];
  let salt = 0, seed = '', rng = null, scene = null;
  for (; ; salt++) {
    seed = `${TYPE_CODE}|L${L}|#${idx}|s${salt}|${BASE_SEED}`;
    rng = makeRng(seed);
    scene = genScene(rng, P, L);
    if (!scene) { if (salt > 400) throw new Error(`level ${L} item ${idx}: no scene found`); continue; }
    const sig = scene.robot.offsetDeg + '|' + scene.objects.map(o => `${o.x},${o.y}`).join(';');
    if (!usedSigs.has(sig) || salt >= 60) { usedSigs.add(sig); break; }
  }

  // Distinctiveness lever: distinct shapes + colours, or one shape and colour only.
  const shapePool = shuffle(rng, SHAPES), colorPool = shuffle(rng, COLORS);
  const oneShape = shapePool[0];
  const objects = scene.objects.map((o, i) => ({
    id: o.id,
    shape: P.distinct === 'color_only' ? oneShape : shapePool[i],
    color: colorPool[i],
    x: o.x, y: o.y,
  }));

  const lures = buildLures(rng, scene).map((f, i) => ({
    key: `F${i + 1}`,
    lure: f.lure,
    chirality: f.chirality,
    derivation: f.derivation,
    order: f.order,
    orderKey: orderKey(f.order),
  }));
  const distractorRationales = [
    { key: 'K', lure: 'correct', chirality: 'same', derivation: { kind: 'line_of_sight' }, order: scene.correct.slice(), orderKey: orderKey(scene.correct) },
    ...lures,
  ];

  const difficulty = round2(Math.min(20, Math.max(1, L + (rng() * 0.9 - 0.45))));
  const n = objects.length;

  const content = {
    typeCode: TYPE_CODE,
    question: {
      mode: 'order_from_viewpoint',
      relation: 'left_to_right_as_seen_by_robot',
      prompt: P.nearest ? PROMPT_NEAR : PROMPT,
      requireNearest: !!P.nearest,
    },
    scene: {
      objects,
      robot: { x: scene.robot.x, y: scene.robot.y, headingDeg: scene.robot.headingDeg },
      bounds: { minX: -1.4, maxX: 1.4, minY: -1.4, maxY: 1.4 },
    },
    view: {
      childHeadingDeg: CHILD_HEADING_DEG,
      robotHeadingDeg: scene.robot.headingDeg,
      viewpointOffsetDeg: scene.robot.offsetDeg,
      viewpointSide: scene.robot.side,
      angularDisparityDeg: scene.robot.offsetDeg,
    },
    distinctiveness: P.distinct,
    response: { mode: 'order_cards', slots: n, requireNearest: !!P.nearest },
    scaffold: { liveStrip: false, warmup: L <= 2 },
  };
  const answer = {
    correctKey: orderKey(scene.correct),
    correctOrder: scene.correct.slice(),
    relation: 'left_to_right_as_seen_by_robot',
    nearestId: P.nearest ? scene.nearest.id : null,
    diagnostics: {
      objectCount: n,
      angularDisparityDeg: scene.robot.offsetDeg,
      minAngularSepDeg: scene.sep,
      nearestMargin: scene.nearest.margin === Infinity ? null : round3(scene.nearest.margin),
      orderedPairTotal: (n * (n - 1)) / 2,
      egocentricOrderKey: orderKey(scene.own),
    },
    distractorRationales,
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
    scoring: { mode: 'computed_solver' },
    provenance: { generator: 'grammar', generatorRef: GENERATOR_REF, seed, level: L, levers: { objects: n, offsetDeg: scene.robot.offsetDeg, minSepDeg: P.minSepDeg, nearest: !!P.nearest, distinct: P.distinct } },
    syntheticOnly: true,
    validated: false,
  };
}

function generate() {
  const items = [];
  for (let L = 1; L <= 20; L++) {
    const used = new Set();
    for (let i = 0; i < ITEMS_PER_LEVEL; i++) items.push(buildItem(L, i, used));
  }
  return items;
}

// ---------------------------------------------------------------------------
// Self-check: recompute the seen order straight from the rendered scene.
// ---------------------------------------------------------------------------
function verify(items) {
  let ok = 0, bad = 0; const problems = [];
  const bands = {}; for (let L = 1; L <= 20; L++) bands[L] = 0;
  const seenIds = new Set();
  for (const it of items) {
    const req = ['itemId', 'typeCode', 'domain', 'difficulty', 'ageBands', 'demoPath', 'content', 'answer', 'scoring', 'provenance', 'syntheticOnly', 'validated'];
    for (const k of req) if (!(k in it)) problems.push(`${it.itemId}: missing ${k}`);
    if (seenIds.has(it.itemId)) problems.push(`${it.itemId}: duplicate itemId`);
    seenIds.add(it.itemId);
    if (it.syntheticOnly !== true || it.validated !== false) problems.push(`${it.itemId}: born-synthetic flags wrong`);
    if (it.difficulty < 1 || it.difficulty > 20) problems.push(`${it.itemId}: difficulty out of range`);
    for (const leak of ['correctKey', 'correctOrder', 'answer', 'nearestId', 'diagnostics'])
      if (leak in it.content) problems.push(`${it.itemId}: content leaks ${leak}`);
    const nCorrect = it.answer.distractorRationales.filter(d => d.lure === 'correct').length;
    if (nCorrect !== 1) problems.push(`${it.itemId}: expected 1 correct rationale, got ${nCorrect}`);
    const re = seenOrder(it.content.scene.objects, it.content.scene.robot);
    if (orderKey(re) === it.answer.correctKey) ok++;
    else { bad++; problems.push(`${it.itemId}: recomputed order ${orderKey(re)} != key ${it.answer.correctKey}`); }
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
  writeFileSync(OUT, items.map(it => JSON.stringify(it)).join('\n') + '\n');
  console.log(`[${TYPE_CODE}] wrote ${items.length} items -> ${OUT}`);

  const byN = {}; for (const it of items) byN[it.answer.diagnostics.objectCount] = (byN[it.answer.diagnostics.objectCount] || 0) + 1;
  console.log(`[${TYPE_CODE}] objects per scene:`, JSON.stringify(byN));
  const disp = [...new Set(items.map(it => it.content.view.angularDisparityDeg))].sort((a, b) => a - b);
  console.log(`[${TYPE_CODE}] angular disparity (M-ROTSLOPE) values: ${disp.join(', ')}`);
  const seps = items.map(it => it.answer.diagnostics.minAngularSepDeg);
  console.log(`[${TYPE_CODE}] min angular separation: ${Math.min(...seps)}..${Math.max(...seps)} deg`);
  const nearN = items.filter(it => it.content.question.requireNearest).length;
  const mirrors = items.filter(it => it.answer.distractorRationales.some(d => d.chirality === 'mirror')).length;
  console.log(`[${TYPE_CODE}] items with a near/far judgment: ${nearN}  ·  items carrying a MIRROR foil: ${mirrors}`);

  const v = verify(items);
  const cov = coverageReport(v.bands);
  console.log(`[${TYPE_CODE}] key check (recompute line-of-sight order): ${v.ok} ok, ${v.bad} bad`);
  console.log(`[${TYPE_CODE}] coverage (min band count = ${cov.minBand}, need >= ${ITEMS_PER_LEVEL}):`);
  if (doVerify) console.log(cov.text);
  if (v.problems.length) {
    console.error(`[${TYPE_CODE}] FAIL: ${v.problems.length} problem(s):`);
    v.problems.slice(0, 20).forEach(p => console.error('  - ' + p));
    process.exit(1);
  }
  if (mirrors !== items.length) { console.error(`[${TYPE_CODE}] FAIL: every item must carry the exact left-right reversal as a mirror foil`); process.exit(1); }
  if (cov.minBand < ITEMS_PER_LEVEL) { console.error(`[${TYPE_CODE}] FAIL: coverage below ${ITEMS_PER_LEVEL} in some band`); process.exit(1); }
  console.log(`[${TYPE_CODE}] OK: orders computed by line of sight, mirror foils present, coverage satisfied, born-synthetic.`);
}

main();
