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
// between neighbouring objects, an added near/far judgment, object distinctiveness
// (distinct shape+colour -> one shape, colour only), and - from 4-5 up - OCCLUSION
// (plan §4 band -> 1..20 scale; §6.3 SPA-SCENE-01 curve):
//
//   K-1 (1-4)     2 objects, no occluder
//   2-3 (5-8)     3 objects, no occluder
//   4-5 (9-12)    4 objects, ONE opaque wall hiding exactly one of them
//   6-8 (13-16)   5-6 objects, two or three walls hiding one or two
//   above (17-20) 6 objects, a wall with a WINDOW: some objects are hidden by the same
//                 barrier that another object is seen THROUGH
//
// OCCLUSION MODEL (one rule, three implementations that must agree - the generator here,
// `verifyScene` in apps/web/src/lib/exam/verifiers/spatial.ts, and the demo renderer):
// a barrier is the segment (x0,y0)-(x1,y1). The robot's sight line to an object is the
// segment robot->object. If the two segments cross at barrier parameter t in (0,1) and
// sight parameter u in (0,1), the object is HIDDEN - unless the barrier carries a window
// [t0,t1] and t falls inside it, in which case the robot sees straight through. A window
// is therefore partial by construction: the same barrier hides one object and passes
// another, which is the discrimination the above-level band asks for.
//
// The answer is the seen order of the VISIBLE objects only. Hidden objects stay in the
// tray as cards the child must decline to place. `content.response.slots` is the visible
// count, which does tell the child HOW MANY are hidden; it does not tell them which, nor
// the order. That is a deliberate scaffold, recorded here so it is not mistaken for an
// oversight, and it is what keeps the strip a fixed-length affordance for a five-year-old.
//
// Geometric decisions are only emitted with a MARGIN (see OCC_MARGIN): a sight line must
// clear a barrier by a real distance or cross it well away from either end and from either
// edge of a window, so no item's key depends on floating-point luck or on a hairline the
// child cannot see.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serializeBank } from './item-shape.mjs';

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
// Occlusion geometry. Every decision below is taken with a margin so the item is
// answerable from the picture rather than from the twelfth decimal place.
// ---------------------------------------------------------------------------
const OCC_MARGIN = {
  clear: 0.07,      // an unblocked sight line must miss the barrier by this distance
  end: 0.05,        // ...or cross it this far from either end
  windowEdge: 0.06, // ...and this far from either edge of a window
  // No barrier may pass this close to an object or the robot. Generous because the demo
  // lifts each token off the ground plane to stand it up, so a barrier grazing an object
  // reads ambiguously even when the geometry is unambiguous.
  keepOut: 0.26,
};

/** Segment (P,Q) x segment (A,B): {t along A->B, u along P->Q} or null when parallel. */
function segCross(P, Q, A, B) {
  const rx = Q[0] - P[0], ry = Q[1] - P[1];
  const sx = B[0] - A[0], sy = B[1] - A[1];
  const den = rx * sy - ry * sx;
  if (Math.abs(den) < 1e-9) return null;
  const dx = A[0] - P[0], dy = A[1] - P[1];
  return { u: (dx * sy - dy * sx) / den, t: (dx * ry - dy * rx) / den };
}
function pointSegDist(p, a, b) {
  const vx = b[0] - a[0], vy = b[1] - a[1];
  const L2 = vx * vx + vy * vy;
  const t = L2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / L2));
  return Math.hypot(p[0] - (a[0] + t * vx), p[1] - (a[1] + t * vy));
}
function segSegDist(p, q, a, b) {
  const hit = segCross(p, q, a, b);
  if (hit && hit.t >= 0 && hit.t <= 1 && hit.u >= 0 && hit.u <= 1) return 0;
  return Math.min(pointSegDist(p, a, b), pointSegDist(q, a, b), pointSegDist(a, p, q), pointSegDist(b, p, q));
}

/** THE visibility rule. `strict` also demands the margin every emitted item must have. */
function isVisible(robot, o, barriers, strict) {
  const P = [robot.x, robot.y], Q = [o.x, o.y];
  for (const b of barriers) {
    const A = [b.x0, b.y0], B = [b.x1, b.y1];
    const hit = segCross(P, Q, A, B);
    const crosses = hit && hit.t > 0 && hit.t < 1 && hit.u > 0 && hit.u < 1;
    if (!crosses) {
      if (strict && segSegDist(P, Q, A, B) < OCC_MARGIN.clear) return null;
      continue;
    }
    if (strict && (hit.t < OCC_MARGIN.end || hit.t > 1 - OCC_MARGIN.end)) return null;
    if (strict && (hit.u < OCC_MARGIN.end || hit.u > 1 - OCC_MARGIN.end)) return null;
    if (b.window) {
      const inside = hit.t >= b.window.t0 && hit.t <= b.window.t1;
      if (strict && Math.abs(hit.t - b.window.t0) < OCC_MARGIN.windowEdge) return null;
      if (strict && Math.abs(hit.t - b.window.t1) < OCC_MARGIN.windowEdge) return null;
      if (inside) continue;              // seen THROUGH the window
    }
    return { visible: false, throughWindow: false };
  }
  // Visible: does any sight line get there through a window rather than past everything?
  let through = false;
  for (const b of barriers) {
    if (!b.window) continue;
    const hit = segCross(P, Q, [b.x0, b.y0], [b.x1, b.y1]);
    if (hit && hit.t > 0 && hit.t < 1 && hit.u > 0 && hit.u < 1) through = true;
  }
  return { visible: true, throughWindow: through };
}

function partitionByVisibility(objects, robot, barriers, strict) {
  const visible = [], hidden = [];
  let throughWindow = 0;
  for (const o of objects) {
    const v = isVisible(robot, o, barriers, strict);
    if (!v) return null;                 // margin violated somewhere: reject the scene
    if (v.visible) { visible.push(o); if (v.throughWindow) throughWindow++; }
    else hidden.push(o);
  }
  return { visible, hidden, throughWindow };
}

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
// `walls` / `windows` / `hidden` / `through` are the occlusion levers: how many barriers
// stand in the scene, how many of them carry a window, how many objects the robot cannot
// see, and how many it sees only through a window.
const PROFILES = {
  1: { n: 2, offsets: [0], minSepDeg: 22, nearest: false, distinct: 'shape_and_color', walls: 0, windows: 0, hidden: 0, through: 0 },
  2: { n: 2, offsets: [30], minSepDeg: 22, nearest: false, distinct: 'shape_and_color', walls: 0, windows: 0, hidden: 0, through: 0 },
  3: { n: 2, offsets: [45], minSepDeg: 20, nearest: false, distinct: 'shape_and_color', walls: 0, windows: 0, hidden: 0, through: 0 },
  4: { n: 2, offsets: [90], minSepDeg: 20, nearest: false, distinct: 'shape_and_color', walls: 0, windows: 0, hidden: 0, through: 0 },
  5: { n: 3, offsets: [30], minSepDeg: 19, nearest: false, distinct: 'shape_and_color', walls: 0, windows: 0, hidden: 0, through: 0 },
  6: { n: 3, offsets: [90], minSepDeg: 18, nearest: false, distinct: 'shape_and_color', walls: 0, windows: 0, hidden: 0, through: 0 },
  7: { n: 3, offsets: [135], minSepDeg: 17, nearest: false, distinct: 'shape_and_color', walls: 0, windows: 0, hidden: 0, through: 0 },
  8: { n: 3, offsets: [180], minSepDeg: 16, nearest: false, distinct: 'shape_and_color', walls: 0, windows: 0, hidden: 0, through: 0 },
  9: { n: 4, offsets: [45], minSepDeg: 16, nearest: false, distinct: 'shape_and_color', walls: 1, windows: 0, hidden: 1, through: 0 },
  10: { n: 4, offsets: [90], minSepDeg: 15, nearest: false, distinct: 'shape_and_color', walls: 1, windows: 0, hidden: 1, through: 0 },
  11: { n: 4, offsets: [135], minSepDeg: 14, nearest: false, distinct: 'shape_and_color', walls: 1, windows: 0, hidden: 1, through: 0 },
  12: { n: 4, offsets: [180], minSepDeg: 13, nearest: true, distinct: 'shape_and_color', walls: 1, windows: 0, hidden: 1, through: 0 },
  13: { n: 5, offsets: [90], minSepDeg: 13, nearest: true, distinct: 'shape_and_color', walls: 2, windows: 0, hidden: 1, through: 0 },
  14: { n: 5, offsets: [135], minSepDeg: 12, nearest: true, distinct: 'shape_and_color', walls: 2, windows: 0, hidden: 2, through: 0 },
  15: { n: 5, offsets: [180], minSepDeg: 11, nearest: true, distinct: 'shape_and_color', walls: 3, windows: 0, hidden: 2, through: 0 },
  16: { n: 6, offsets: [135], minSepDeg: 11, nearest: true, distinct: 'shape_and_color', walls: 3, windows: 0, hidden: 2, through: 0 },
  17: { n: 6, offsets: [90], minSepDeg: 10, nearest: true, distinct: 'shape_and_color', walls: 2, windows: 1, hidden: 1, through: 1 },
  18: { n: 6, offsets: [135], minSepDeg: 9.5, nearest: true, distinct: 'color_only', walls: 2, windows: 1, hidden: 2, through: 1 },
  19: { n: 6, offsets: [165], minSepDeg: 9, nearest: true, distinct: 'color_only', walls: 3, windows: 1, hidden: 2, through: 1 },
  20: { n: 6, offsets: [180], minSepDeg: 8.5, nearest: true, distinct: 'color_only', walls: 3, windows: 2, hidden: 2, through: 2 },
};
const BAND_RULE = {
  'K-1': '2 objects, nothing in the way',
  '2-3': '3 objects, nothing in the way',
  '4-5': '4 objects, one opaque wall hiding exactly one',
  '6-8': '5-6 objects, two or three walls hiding one or two',
  'above-level': '6 objects, a wall with a window: something hidden by the same barrier another is seen through',
};
function bandOfLevel(L) { return L <= 4 ? 'K-1' : L <= 8 ? '2-3' : L <= 12 ? '4-5' : L <= 16 ? '6-8' : 'above-level'; }
const BANDS = ['K-1', '2-3', '4-5', '6-8', 'above-level'];

function ageBandsForLevel(L) {
  if (L <= 4) return ['2-3'];
  if (L <= 8) return ['2-3', '4-5'];
  if (L <= 12) return ['4-5', '6-8'];
  return ['6-8'];
}

const PROMPT = 'Put the cards in the order the robot sees them, from the robot\u2019s left to its right.';
const PROMPT_NEAR = 'Put the cards in the order the robot sees them, from the robot\u2019s left to its right, then tap the one that looks nearest to the robot.';
function promptFor(nBarriers, nWindows, nearest) {
  if (nBarriers === 0) return nearest ? PROMPT_NEAR : PROMPT;
  const wall = nBarriers === 1 ? 'A wall is' : 'Walls are';
  const glass = nWindows > 0 ? ' The robot can see through a glass window, but not through solid wall.' : '';
  const tail = nearest
    ? ' Leave out anything the robot cannot see, then tap the one that looks nearest to the robot.'
    : ' Leave out anything the robot cannot see.';
  return `${wall} in the way. Put the cards the robot CAN see in order, from the robot\u2019s left to its right.${glass}${tail}`;
}

// ---------------------------------------------------------------------------
// Scene search.
// ---------------------------------------------------------------------------
/**
 * A barrier that certainly hides `target`: a segment laid across the robot's sight line
 * to it, part-way along. Building it from the sight line rather than at random is what
 * makes the occlusion search converge at all.
 */
function barrierAcross(rng, robot, target) {
  const dx = target.x - robot.x, dy = target.y - robot.y;
  const L = Math.hypot(dx, dy);
  const ux = dx / L, uy = dy / L;
  const s = 0.42 + rng() * 0.3;                        // how far along the sight line it sits
  const mx = robot.x + ux * L * s, my = robot.y + uy * L * s;
  const half = 0.45 + rng() * 0.5;
  const skew = (rng() - 0.5) * 0.7;                    // not perfectly perpendicular
  const px = -uy + ux * skew, py = ux + uy * skew;
  const pl = Math.hypot(px, py);
  return {
    x0: round3(mx - (px / pl) * half), y0: round3(my - (py / pl) * half),
    x1: round3(mx + (px / pl) * half), y1: round3(my + (py / pl) * half),
    window: null,
  };
}

/** Punch a window into `bar` at the point where the robot's sight line to `seer` crosses it. */
function windowFor(bar, robot, seer) {
  const hit = segCross([robot.x, robot.y], [seer.x, seer.y], [bar.x0, bar.y0], [bar.x1, bar.y1]);
  if (!hit || hit.t <= 0.12 || hit.t >= 0.88 || hit.u <= 0 || hit.u >= 1) return null;
  return { t0: round3(Math.max(0.02, hit.t - 0.11)), t1: round3(Math.min(0.98, hit.t + 0.11)) };
}

/** A barrier standing somewhere in the scene on its own account, hiding nobody. */
function decoyBarrier(rng) {
  const ang = rng() * Math.PI * 2, rad = 0.4 + rng() * 0.8;
  const mx = Math.cos(ang) * rad, my = Math.sin(ang) * rad;
  const dir = rng() * Math.PI, half = 0.3 + rng() * 0.45;
  return {
    x0: round3(mx - Math.cos(dir) * half), y0: round3(my - Math.sin(dir) * half),
    x1: round3(mx + Math.cos(dir) * half), y1: round3(my + Math.sin(dir) * half),
    window: null,
  };
}

function barrierClearsScene(bar, objects, robot) {
  const A = [bar.x0, bar.y0], B = [bar.x1, bar.y1];
  if (pointSegDist([robot.x, robot.y], A, B) < OCC_MARGIN.keepOut) return false;
  return objects.every((o) => pointSegDist([o.x, o.y], A, B) >= OCC_MARGIN.keepOut);
}

/**
 * Barriers hiding exactly `P.hidden` objects, `P.windows` of them carrying a window that
 * exactly `P.through` objects are seen through, and the remainder standing in the scene
 * hiding nobody — a decoy the child still has to check, which is what makes "look at each
 * barrier" the strategy rather than "count the barriers".
 *
 * Everything is measured against the visibility rule, never assumed from the construction.
 */
function genBarriers(rng, objects, robot, P) {
  if (P.walls === 0) return P.hidden === 0 ? [] : null;
  if (P.hidden > P.walls || P.windows > P.hidden) return null;
  for (let attempt = 0; attempt < 150; attempt++) {
    const targets = shuffle(rng, objects);
    const bars = [];
    const add = (bar) => {
      if (!barrierClearsScene(bar, objects, robot)) return false;
      if (bars.some((b) => segSegDist([b.x0, b.y0], [b.x1, b.y1], [bar.x0, bar.y0], [bar.x1, bar.y1]) < 0.12)) return false;
      bars.push(bar);
      return true;
    };
    let built = true;
    for (let w = 0; w < P.hidden && built; w++) built = add(barrierAcross(rng, robot, targets[w]));
    for (let w = P.hidden; w < P.walls && built; w++) built = add(decoyBarrier(rng));
    if (!built) continue;

    // Punch windows into the blocking barriers, each aimed at a different object's sight line.
    let cut = 0;
    for (let bi = 0; bi < P.hidden && cut < P.windows; bi++) {
      for (const seer of shuffle(rng, objects)) {
        const win = windowFor(bars[bi], robot, seer);
        if (win) { bars[bi].window = win; cut++; break; }
      }
    }
    if (cut !== P.windows) continue;

    const part = partitionByVisibility(objects, robot, bars, true);
    if (!part) continue;
    if (part.hidden.length !== P.hidden) continue;
    if (part.throughWindow !== P.through) continue;
    if (part.visible.length < 2) continue;
    return bars;
  }
  return null;
}

function genScene(rng, P, L) {
  const offsetDeg = P.offsets[Math.floor(rng() * P.offsets.length)];
  const side = rng() < 0.5 ? 1 : -1;
  const a = (offsetDeg * side) / DEG;
  // Robot position: angle 0 puts it on the child's own side (bottom of the map).
  const pos = [Math.sin(a) * ROBOT_R, Math.cos(a) * ROBOT_R];
  const headingDeg = Math.atan2(-pos[1], -pos[0]) * DEG;   // always faces the scene centre
  const robot = { x: round3(pos[0]), y: round3(pos[1]), headingDeg: round2(headingDeg), offsetDeg, side };

  for (let t = 0; t < 700; t++) {
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
    const bs = bearings(objects, robot);
    if (bs.some(b => b.depth <= 0.4)) continue;                   // everything must be in front of the robot

    const barriers = genBarriers(rng, objects, robot, P);
    if (!barriers) continue;
    const part = partitionByVisibility(objects, robot, barriers, true);
    if (!part) continue;
    const visible = part.visible;

    // Every judgment below is about the objects the robot can actually see.
    const sep = minSeparationDeg(visible, robot);
    if (sep < P.minSepDeg || sep > P.minSepDeg + 26) continue;   // banded: the ramp needs the tight cases
    const correct = seenOrder(visible, robot);
    const own = seenOrder(visible, { x: 0, y: ROBOT_R, headingDeg: CHILD_HEADING_DEG });
    if (L >= 3 && orderKey(correct) === orderKey(own)) continue;  // the egocentric answer must be wrong
    const near = nearestInfo(visible, robot);
    if (P.nearest && near.margin < 0.18) continue;                // near/far must be unambiguous
    return {
      objects, robot, barriers, visible, hidden: part.hidden,
      throughWindow: part.throughWindow,
      correct, own, sep: round2(sep), nearest: near,
    };
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
  const { objects, robot, visible, hidden, correct, own } = scene;
  const out = [];
  const push = (lure, derivation, order, sameLength = true) => {
    if (!order) return;
    if (sameLength && order.length !== correct.length) return;
    if (orderKey(order) === orderKey(correct)) return;
    out.push({ lure, chirality: chiralityOf(correct, order), derivation, order: order.slice() });
  };
  push('egocentric_left_right_reversal', { kind: 'reverse' }, correct.slice().reverse());
  push('own_viewpoint_order', { kind: 'own_view' }, own);
  push('near_miss_adjacent_transposition', { kind: 'swap_closest_pair' }, swapClosestPair(visible, robot, correct));
  push('depth_for_lateral_confusion', { kind: 'depth_order' }, depthOrder(visible, robot));
  // Ordering the whole tray: the child read the geometry but not the barrier.
  if (hidden.length) push('over_general', { kind: 'ignored_occlusion' }, seenOrder(objects, robot), false);
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
  const band = bandOfLevel(L);
  const barriers = scene.barriers.map((b, i) => ({
    id: i,
    x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1,
    kind: b.window ? 'window_wall' : 'wall',
    window: b.window ? { t0: b.window.t0, t1: b.window.t1 } : null,
  }));
  const nWindows = barriers.filter((b) => b.window).length;
  const visibleCount = scene.visible.length;

  const content = {
    typeCode: TYPE_CODE,
    question: {
      mode: 'order_from_viewpoint',
      relation: 'left_to_right_as_seen_by_robot',
      prompt: promptFor(barriers.length, nWindows, !!P.nearest),
      requireNearest: !!P.nearest,
      hasOcclusion: barriers.length > 0,
    },
    scene: {
      objects,
      robot: { x: scene.robot.x, y: scene.robot.y, headingDeg: scene.robot.headingDeg },
      barriers,
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
    // `slots` is the number of cards the child places: the visible objects. The tray still
    // offers every object, so the child must decide which ones to leave out.
    response: { mode: 'order_cards', slots: visibleCount, requireNearest: !!P.nearest },
    scaffold: { liveStrip: false, warmup: L <= 2 },
  };
  const answer = {
    correctKey: orderKey(scene.correct),
    correctOrder: scene.correct.slice(),
    relation: 'left_to_right_as_seen_by_robot',
    nearestId: P.nearest ? scene.nearest.id : null,
    band,
    bandRule: BAND_RULE[band],
    occlusion: {
      barriers: barriers.length,
      windows: nWindows,
      visibleIds: scene.visible.map((o) => o.id),
      hiddenIds: scene.hidden.map((o) => o.id),
      seenThroughWindow: scene.throughWindow,
    },
    diagnostics: {
      objectCount: n,
      visibleCount,
      hiddenCount: scene.hidden.length,
      angularDisparityDeg: scene.robot.offsetDeg,
      minAngularSepDeg: scene.sep,
      nearestMargin: scene.nearest.margin === Infinity ? null : round3(scene.nearest.margin),
      orderedPairTotal: (visibleCount * (visibleCount - 1)) / 2,
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
    provenance: { generator: 'grammar', generatorRef: GENERATOR_REF, seed, level: L, levers: { band, objects: n, visible: visibleCount, barriers: barriers.length, windows: nWindows, offsetDeg: scene.robot.offsetDeg, minSepDeg: P.minSepDeg, nearest: !!P.nearest, distinct: P.distinct } },
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
    // Re-derive visibility and the seen order from the rendered scene alone.
    const sc = it.content.scene;
    const part = partitionByVisibility(sc.objects, sc.robot, sc.barriers, true);
    if (!part) { bad++; problems.push(`${it.itemId}: a sight line sits inside the decision margin`); continue; }
    const P = PROFILES[it.provenance.level];
    if (sc.barriers.length !== P.walls) problems.push(`${it.itemId}: ${sc.barriers.length} barriers, band wants ${P.walls}`);
    if (sc.barriers.filter(b => b.window).length !== P.windows) problems.push(`${it.itemId}: window count off band`);
    if (part.hidden.length !== P.hidden) problems.push(`${it.itemId}: ${part.hidden.length} hidden, band wants ${P.hidden}`);
    if (part.throughWindow !== P.through) problems.push(`${it.itemId}: ${part.throughWindow} seen through a window, band wants ${P.through}`);
    if (it.content.response.slots !== part.visible.length) problems.push(`${it.itemId}: slots != visible count`);
    if (it.answer.diagnostics.orderedPairTotal !== (part.visible.length * (part.visible.length - 1)) / 2) {
      problems.push(`${it.itemId}: orderedPairTotal not over the visible set`);
    }
    if (P.nearest) {
      const nearVisible = nearestInfo(part.visible, sc.robot).id;
      if (it.answer.nearestId !== nearVisible) problems.push(`${it.itemId}: nearestId is not the nearest VISIBLE object`);
    }
    const re = seenOrder(part.visible, sc.robot);
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
  writeFileSync(OUT, serializeBank(items));
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

  // Measured occlusion curve: what a child actually has to reason around, per band.
  console.log(`[${TYPE_CODE}] measured band curve:`);
  for (const band of BANDS) {
    const inBand = items.filter((it) => it.answer.band === band);
    const rng2 = (xs) => `${Math.min(...xs)}-${Math.max(...xs)}`;
    console.log(
      `  ${band.padEnd(11)} n=${String(inBand.length).padStart(3)}` +
      `  objects=${rng2(inBand.map(i => i.answer.diagnostics.objectCount))}` +
      `  barriers=${rng2(inBand.map(i => i.answer.occlusion.barriers))}` +
      `  windows=${rng2(inBand.map(i => i.answer.occlusion.windows))}` +
      `  hidden=${rng2(inBand.map(i => i.answer.diagnostics.hiddenCount))}` +
      `  seen-through-window=${rng2(inBand.map(i => i.answer.occlusion.seenThroughWindow))}` +
      `  ordered=${rng2(inBand.map(i => i.answer.diagnostics.visibleCount))}`,
    );
  }

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
