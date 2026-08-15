// Independent validator for the SPA-SCENE-01 structured bank.
//
// This checker does NOT import the generator. It re-derives every seen order with a
// DIFFERENT algorithm than the generator's bearing computation: the generator projects
// each object onto the robot's forward/right axes and sorts by atan2(lateral, depth);
// this checker uses a trig-free 2D CROSS-PRODUCT comparator on the raw relative vectors
//
//     A appears left of B   <=>   relB.x*relA.y - relB.y*relA.x  <  0
//
// which is a valid total order whenever every object lies in front of the robot (checked
// separately from the declared heading). Nothing about the robot's heading enters the
// ordering itself, so a heading/handedness error in the generator would be caught.
//
// From the 4-5 band up the scene carries BARRIERS, and the answer is the seen order of the
// VISIBLE objects only (§6.3 SPA-SCENE-01: walls, barriers and windows, so the child must
// reason about what is actually visible behind a blocker). This checker re-derives the
// visible/hidden split by a DIFFERENT route than the generator: the generator solves the
// segment pair with one determinant ratio for both parameters, while this checker decides
// crossing by the four orientation signs and then recovers the barrier parameter by
// PROJECTING the crossing point onto the barrier. A sign or parameterisation slip in either
// implementation shows up as a disagreement about which objects the robot can see - which is
// the failure that would punish a child who reasoned correctly.
//
// Checks (exit nonzero on any failure):
//   1. JSONL parses; every line is a well-formed BankItem (BUILD_PLAN §2 shape).
//   2. Born-synthetic + server/renderable split: content carries NO order, key or lure.
//   3. Scene is legal: the robot faces the scene centre, every object is in front of it,
//      objects are separated on the ground and separated in bearing, and no barrier passes
//      within the keep-out distance of an object or of the robot.
//   4. Visibility is COMPUTED: the orientation-sign recompute reproduces answer.occlusion's
//      visible/hidden split and its through-a-window count exactly, and every sight-line
//      decision holds with a real margin (it clears the barrier, or crosses it well away
//      from either end and from either edge of a window) so no key rests on a hairline.
//   5. Key is COMPUTED: the cross-product order over the VISIBLE objects reproduces
//      answer.correctKey, and the nearest-object mark (where required) is reproduced by
//      Euclidean distance over the visible objects only - a hidden object cannot be the one
//      that "looks nearest".
//   6. Perspective actually bites: for a viewpoint offset >= 45 deg the child's own
//      left-to-right order must NOT be the correct answer, and the exact left-right
//      REVERSAL must be present as a chirality:'mirror' lure (M-MIRRORFA depends on it).
//   7. The band curve holds: no barrier below the 4-5 band, exactly one opaque wall hiding
//      exactly one object at 4-5, several barriers at 6-8, and at above-level a window that
//      at least one object is genuinely seen through.
//   8. M-ROTSLOPE: angularDisparityDeg is present, matches the robot's heading, and
//      spans a usable range so a rotation-rate slope can be fit across items.
//   9. Difficulty is a float 1..20 with >=5 items per integer bin AND per +/-1 pt band.
//
// Run:  node research/exam-question-types/generators/check-SPA-SCENE-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lureLabel } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK = resolve(__dirname, '../banks/SPA-SCENE-01.jsonl');
const ALLOWED_BANDS = ['2-3', '4-5', '6-8'];
const MIN_PER_BAND = 5;
const LEAK_KEYS = ['answer', 'correctKey', 'correctOrder', 'nearestId', 'diagnostics', 'distractorRationales', 'orderKey', 'solution'];
const DEG = 180 / Math.PI;

// The reviewer's curve (plan §6.3 SPA-SCENE-01), as inclusive ranges this checker enforces:
// nothing in the way for the two youngest bands, one opaque wall at 4-5, several barriers at
// 6-8, and at above-level a window something is genuinely seen through.
const BANDS = ['K-1', '2-3', '4-5', '6-8', 'above-level'];
const BAND_EXPECT = {
  'K-1': { objects: [2, 2], barriers: [0, 0], windows: [0, 0], hidden: [0, 0], through: [0, 0] },
  '2-3': { objects: [3, 3], barriers: [0, 0], windows: [0, 0], hidden: [0, 0], through: [0, 0] },
  '4-5': { objects: [4, 4], barriers: [1, 1], windows: [0, 0], hidden: [1, 1], through: [0, 0] },
  '6-8': { objects: [5, 6], barriers: [2, 3], windows: [0, 0], hidden: [1, 2], through: [0, 0] },
  'above-level': { objects: [6, 6], barriers: [2, 4], windows: [1, 3], hidden: [1, 3], through: [1, 6] },
};
const bandProfile = {};

const failures = [];
const fail = (id, msg) => failures.push(`[${id}] ${msg}`);
// Reported but not fatal: things that make an item uglier than intended without changing which
// answer is correct. Kept separate so a cosmetic regression cannot be mistaken for a scoring one.
const warnings = [];
const warn = (id, msg) => warnings.push(`[${id}] ${msg}`);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const round2 = (x) => Math.round(x * 100) / 100;
const keyOf = (ids) => ids.join('>');

// ---- independent ordering: trig-free cross-product comparator ----
function orderFrom(objects, obs) {
  const rel = objects.map(o => ({ id: o.id, x: o.x - obs.x, y: o.y - obs.y }));
  const cmp = (a, b) => (b.x * a.y - b.y * a.x);
  return rel.slice().sort(cmp).map(r => r.id);
}
function forwardOf(headingDeg) { return [Math.cos(headingDeg / DEG), Math.sin(headingDeg / DEG)]; }
function depthsFrom(objects, robot) {
  const f = forwardOf(robot.headingDeg);
  return objects.map(o => (o.x - robot.x) * f[0] + (o.y - robot.y) * f[1]);
}
function bearingsDeg(objects, robot) {
  const f = forwardOf(robot.headingDeg), r = [-f[1], f[0]];
  return objects.map(o => {
    const dx = o.x - robot.x, dy = o.y - robot.y;
    return Math.atan2(dx * r[0] + dy * r[1], dx * f[0] + dy * f[1]) * DEG;
  });
}
function angleBetweenDeg(a, b) { let d = Math.abs(a - b) % 360; if (d > 180) d = 360 - d; return d; }

// ---- independent occlusion recompute ----
// The margins the generator promises every emitted item holds to. Re-asserted here, because a
// decision taken on a hairline is one a child cannot see and therefore cannot be marked on.
const MARGIN = { clear: 0.07, end: 0.05, windowEdge: 0.06, keepOut: 0.16 };
const orient = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
/** Proper crossing by orientation signs alone: both segments straddle the other's line. */
function properlyCross(P, Q, A, B) {
  const d1 = orient(A, B, P), d2 = orient(A, B, Q), d3 = orient(P, Q, A), d4 = orient(P, Q, B);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}
/** Where along P->Q the barrier line falls, from the two orientation values (never a ratio of determinants). */
function sightParam(P, Q, A, B) {
  const d1 = orient(A, B, P), d2 = orient(A, B, Q);
  return d1 / (d1 - d2);
}
/** Where along A->B the crossing falls, recovered by projection rather than by solving again. */
function barrierParam(P, Q, A, B) {
  const u = sightParam(P, Q, A, B);
  const X = [P[0] + u * (Q[0] - P[0]), P[1] + u * (Q[1] - P[1])];
  const vx = B[0] - A[0], vy = B[1] - A[1];
  return ((X[0] - A[0]) * vx + (X[1] - A[1]) * vy) / (vx * vx + vy * vy);
}
function pointSegDist(p, a, b) {
  const vx = b[0] - a[0], vy = b[1] - a[1], L2 = vx * vx + vy * vy;
  const t = L2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / L2));
  return Math.hypot(p[0] - (a[0] + t * vx), p[1] - (a[1] + t * vy));
}
function segSegDist(p, q, a, b) {
  if (properlyCross(p, q, a, b)) return 0;
  return Math.min(pointSegDist(p, a, b), pointSegDist(q, a, b), pointSegDist(a, p, q), pointSegDist(b, p, q));
}
/**
 * THE visibility rule, restated: the robot's sight line to an object is blocked by any barrier
 * it properly crosses, unless that barrier carries a window and the crossing falls inside it.
 *
 * `tight` reports the margins the DECISION rests on, and only those. Blocking is monotone — one
 * solid crossing hides an object whatever the other barriers do — so a hidden object needs one
 * crossing that is legibly solid, and a hairline brush against some further barrier cannot
 * change its fate and is not held against the item. A VISIBLE object is the strict case: every
 * barrier has to clearly miss it, or clearly pass it through a window, because any one of them
 * going the other way would have hidden it.
 */
function visibilityOf(robot, o, barriers) {
  const P = [robot.x, robot.y], Q = [o.x, o.y];
  const misses = [], blocks = [], throughs = [];
  for (const b of barriers) {
    const A = [b.x0, b.y0], B = [b.x1, b.y1];
    if (!properlyCross(P, Q, A, B)) { misses.push({ b, gap: segSegDist(P, Q, A, B) }); continue; }
    const t = barrierParam(P, Q, A, B), u = sightParam(P, Q, A, B);
    const ends = Math.min(t, 1 - t, u, 1 - u);
    const windowEdge = b.window ? Math.min(Math.abs(t - b.window.t0), Math.abs(t - b.window.t1)) : Infinity;
    if (b.window && t >= b.window.t0 && t <= b.window.t1) throughs.push({ b, ends, windowEdge });
    else blocks.push({ b, t, ends, windowEdge });
  }
  const visible = blocks.length === 0;
  const tight = [];
  if (visible) {
    for (const m of misses) if (m.gap < MARGIN.clear) tight.push(`misses barrier ${m.b.id} by only ${round2(m.gap)}`);
    for (const t of throughs) {
      if (t.ends < MARGIN.end) tight.push(`is seen through barrier ${t.b.id} only ${round2(t.ends)} from an end`);
      if (t.windowEdge < MARGIN.windowEdge) tight.push(`is seen through barrier ${t.b.id} only ${round2(t.windowEdge)} from a window edge`);
    }
  } else {
    // One legible blocking crossing is enough to justify "hidden".
    const clean = blocks.some((k) => k.ends >= MARGIN.end && k.windowEdge >= MARGIN.windowEdge);
    if (!clean) {
      const best = blocks.reduce((a, k) => (k.ends > a.ends ? k : a), blocks[0]);
      tight.push(`is hidden only by a hairline: barrier ${best.b.id} at t=${round2(best.t)}, ${round2(best.ends)} from an end`);
    }
  }
  return { visible, throughWindow: visible && throughs.length > 0, tight };
}
function scanLeaks(node, path, id) {
  if (node === null || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach((v, i) => scanLeaks(v, `${path}[${i}]`, id)); return; }
  for (const k of Object.keys(node)) {
    if (LEAK_KEYS.includes(k)) fail(id, `content leaks "${k}" at ${path}.${k}`);
    scanLeaks(node[k], `${path}.${k}`, id);
  }
}

// ---- 1. Parse ----
const raw = readFileSync(BANK, 'utf8').trim();
const lines = raw.length ? raw.split('\n') : [];
if (lines.length === 0) fail('parse', 'bank is empty');
const items = [];
lines.forEach((line, i) => { try { items.push(JSON.parse(line)); } catch (e) { fail('parse', `line ${i + 1} not valid JSON: ${e.message}`); } });

// ---- 2..6. Per-item structural + independent key recompute ----
const seenIds = new Set();
let mirrorItems = 0;
for (const it of items) {
  const id = it.itemId || '(no id)';
  if (typeof it.itemId !== 'string' || it.itemId.length < 8) fail(id, 'itemId missing/short');
  if (seenIds.has(it.itemId)) fail(id, 'duplicate itemId'); seenIds.add(it.itemId);
  if (it.typeCode !== 'SPA-SCENE-01') fail(id, `typeCode != SPA-SCENE-01 (${it.typeCode})`);
  if (it.domain !== 'spatial') fail(id, `domain != spatial (${it.domain})`);
  if (it.demoPath !== 'demos/SPA-SCENE-01.html') fail(id, `demoPath wrong (${it.demoPath})`);
  if (!isNum(it.difficulty) || it.difficulty < 1 || it.difficulty > 20) fail(id, `difficulty not float 1..20 (${it.difficulty})`);
  if (!Array.isArray(it.ageBands) || it.ageBands.length === 0) fail(id, 'ageBands empty');
  else if (!it.ageBands.every((b) => ALLOWED_BANDS.includes(b))) fail(id, `bad ageBand (${it.ageBands})`);
  if (it.syntheticOnly !== true) fail(id, 'syntheticOnly must be true');
  if (it.validated !== false) fail(id, 'validated must be false');
  if (!it.scoring || it.scoring.mode !== 'computed_solver') fail(id, 'scoring.mode != computed_solver');
  if (!it.provenance || it.provenance.generator !== 'grammar') fail(id, 'provenance.generator != grammar');
  if (!it.provenance || typeof it.provenance.seed !== 'string') fail(id, 'provenance.seed missing');

  const c = it.content || {};
  scanLeaks(c, 'content', id);
  const S = c.scene || {};
  const objects = S.objects || [], robot = S.robot || {};
  if (!Array.isArray(objects) || objects.length < 2) { fail(id, 'scene needs >= 2 objects'); continue; }
  if (!isNum(robot.x) || !isNum(robot.y) || !isNum(robot.headingDeg)) { fail(id, 'robot pose malformed'); continue; }
  const ids = objects.map(o => o.id);
  if (new Set(ids).size !== ids.length) fail(id, 'object ids not unique');
  for (const o of objects) {
    if (!isNum(o.x) || !isNum(o.y)) fail(id, 'object position malformed');
    if (typeof o.shape !== 'string' || typeof o.color !== 'string') fail(id, 'object appearance missing');
  }
  const colors = objects.map(o => o.color);
  if (new Set(colors).size !== colors.length) fail(id, 'object colours not unique (objects would be indistinguishable)');
  if (c.distinctiveness === 'shape_and_color') {
    const shapes = objects.map(o => o.shape);
    if (new Set(shapes).size !== shapes.length) fail(id, 'shape_and_color item reuses a shape');
  }
  for (let a = 0; a < objects.length; a++) for (let b = a + 1; b < objects.length; b++) {
    if (Math.hypot(objects[a].x - objects[b].x, objects[a].y - objects[b].y) <= 0.5) fail(id, 'two objects overlap on the ground');
  }

  // 3. The robot must face the scene centre and hold everything in front of it.
  const wantHeading = Math.atan2(-robot.y, -robot.x) * DEG;
  if (angleBetweenDeg(wantHeading, robot.headingDeg) > 0.5) fail(id, `robot heading ${robot.headingDeg} does not face the scene centre (${round2(wantHeading)})`);
  if (depthsFrom(objects, robot).some(d => d <= 0.2)) fail(id, 'an object is behind (or level with) the robot');

  const ans = it.answer || {};

  // 4. Barriers, and an independent recompute of who the robot can see.
  const barriers = Array.isArray(S.barriers) ? S.barriers : [];
  if (S.barriers !== undefined && !Array.isArray(S.barriers)) fail(id, 'scene.barriers must be an array when present');
  if (!!(c.question || {}).hasOcclusion !== (barriers.length > 0)) fail(id, 'question.hasOcclusion disagrees with scene.barriers');
  barriers.forEach((b, i) => {
    if (b.id !== i) fail(id, `barrier ${i} has id ${b.id}`);
    if (![b.x0, b.y0, b.x1, b.y1].every(isNum)) { fail(id, `barrier ${i} endpoints malformed`); return; }
    const len = Math.hypot(b.x1 - b.x0, b.y1 - b.y0);
    if (len < 0.3) fail(id, `barrier ${i} is only ${round2(len)} long (too small to read)`);
    // A barrier that runs past the declared bounds draws off the ground plate. Today the demo
    // uses a fixed-size plate, so the wall's end is still visible and the answer still readable
    // — hence a warning. Any renderer that scales or clips to `scene.bounds` instead would cut
    // the end off, and a child cannot judge a sight line against a wall whose end they cannot
    // see. The fix is a clamp where the barrier is built, after which this can become a failure.
    const bnd = S.bounds || { minX: -1.4, maxX: 1.4, minY: -1.4, maxY: 1.4 };
    for (const p of [[b.x0, b.y0], [b.x1, b.y1]]) {
      if (p[0] < bnd.minX || p[0] > bnd.maxX || p[1] < bnd.minY || p[1] > bnd.maxY) {
        warn(id, `barrier ${i} ends at ${p} — outside the declared scene bounds, so it draws off the ground plate`);
      }
    }
    const wantKind = b.window ? 'window_wall' : 'wall';
    if (b.kind !== wantKind) fail(id, `barrier ${i} kind ${b.kind} != ${wantKind}`);
    if (b.window) {
      const { t0, t1 } = b.window;
      if (!isNum(t0) || !isNum(t1) || !(t0 >= 0 && t1 <= 1 && t1 - t0 > 0.05)) fail(id, `barrier ${i} window span [${t0},${t1}] is not a usable sub-span`);
    }
    // Nothing may stand on a barrier: not an object, not the robot.
    const A = [b.x0, b.y0], B = [b.x1, b.y1];
    for (const o of objects) {
      const gap = pointSegDist([o.x, o.y], A, B);
      if (gap < MARGIN.keepOut) fail(id, `object ${o.id} is ${round2(gap)} from barrier ${i} (keep-out ${MARGIN.keepOut})`);
    }
    const rGap = pointSegDist([robot.x, robot.y], A, B);
    if (rGap < MARGIN.keepOut) fail(id, `the robot is ${round2(rGap)} from barrier ${i} (keep-out ${MARGIN.keepOut})`);
  });

  const occ = ans.occlusion || (barriers.length ? null : { barriers: 0, windows: 0, visibleIds: objects.map(o => o.id), hiddenIds: [], seenThroughWindow: 0 });
  if (!occ) { fail(id, 'answer.occlusion missing on an item that has barriers'); continue; }
  const seenSplit = objects.map(o => ({ o, v: visibilityOf(robot, o, barriers) }));
  for (const { o, v } of seenSplit) for (const t of v.tight) fail(id, `object ${o.id} ${t} — the decision is not legible`);
  const visible = seenSplit.filter(s => s.v.visible).map(s => s.o);
  const hidden = seenSplit.filter(s => !s.v.visible).map(s => s.o);
  const through = seenSplit.filter(s => s.v.throughWindow).length;
  if (keyOf(visible.map(o => o.id)) !== keyOf(occ.visibleIds || [])) fail(id, `recomputed visible set ${keyOf(visible.map(o => o.id))} != occlusion.visibleIds ${keyOf(occ.visibleIds || [])}`);
  if (keyOf(hidden.map(o => o.id)) !== keyOf(occ.hiddenIds || [])) fail(id, `recomputed hidden set ${keyOf(hidden.map(o => o.id))} != occlusion.hiddenIds ${keyOf(occ.hiddenIds || [])}`);
  if (through !== occ.seenThroughWindow) fail(id, `${through} object(s) seen through a window, occlusion says ${occ.seenThroughWindow}`);
  if (occ.barriers !== barriers.length) fail(id, 'occlusion.barriers != scene.barriers length');
  if (occ.windows !== barriers.filter(b => b.window).length) fail(id, 'occlusion.windows miscounted');
  if (visible.length < 2) { fail(id, `only ${visible.length} object(s) visible: nothing to order`); continue; }
  // The strip length is what tells the child how many cards to place.
  if ((c.response || {}).slots !== visible.length) fail(id, `response.slots ${(c.response || {}).slots} != ${visible.length} visible objects`);

  // 4b. The reviewer's occlusion curve, recomputed rather than read off the bank.
  const nWindows = barriers.filter(b => b.window).length;
  const band = ans.band;
  if (!BAND_EXPECT[band]) fail(id, `unknown band "${band}"`);
  else {
    const want = BAND_EXPECT[band];
    if (objects.length < want.objects[0] || objects.length > want.objects[1]) fail(id, `band ${band} wants ${want.objects.join('-')} objects, item has ${objects.length}`);
    if (barriers.length < want.barriers[0] || barriers.length > want.barriers[1]) fail(id, `band ${band} wants ${want.barriers.join('-')} barrier(s), item has ${barriers.length}`);
    if (nWindows < want.windows[0] || nWindows > want.windows[1]) fail(id, `band ${band} wants ${want.windows.join('-')} window(s), item has ${nWindows}`);
    if (hidden.length < want.hidden[0] || hidden.length > want.hidden[1]) fail(id, `band ${band} wants ${want.hidden.join('-')} object(s) hidden, item hides ${hidden.length}`);
    if (through < want.through[0]) fail(id, `band ${band} needs >=${want.through[0]} object(s) seen THROUGH a window, item has ${through}`);
  }
  const prof = bandProfile[band] || (bandProfile[band] = { n: 0, objects: [], barriers: [], windows: [], hidden: [], through: [], visible: [] });
  prof.n++; prof.objects.push(objects.length); prof.barriers.push(barriers.length);
  prof.windows.push(nWindows); prof.hidden.push(hidden.length); prof.through.push(through); prof.visible.push(visible.length);

  // 5. Independent recompute of the key, over the VISIBLE objects only.
  const re = orderFrom(visible, robot);
  if (keyOf(re) !== ans.correctKey) fail(id, `cross-product order ${keyOf(re)} != correctKey ${ans.correctKey}`);
  if (keyOf(ans.correctOrder || []) !== ans.correctKey) fail(id, 'correctOrder != correctKey');
  if (new Set(ans.correctOrder || []).size !== visible.length) fail(id, 'correctOrder is not a permutation of the visible objects');
  const d = ans.diagnostics || {};
  if (d.objectCount !== objects.length) fail(id, 'diagnostics.objectCount wrong');
  if (d.visibleCount !== visible.length) fail(id, 'diagnostics.visibleCount wrong');
  if (d.hiddenCount !== hidden.length) fail(id, 'diagnostics.hiddenCount wrong');
  if (d.orderedPairTotal !== (visible.length * (visible.length - 1)) / 2) fail(id, 'orderedPairTotal wrong (partial credit basis is the visible objects)');
  const bs = bearingsDeg(visible, robot).sort((a, b) => a - b);
  let sep = Infinity;
  for (let i = 0; i + 1 < bs.length; i++) sep = Math.min(sep, bs[i + 1] - bs[i]);
  if (Math.abs(sep - d.minAngularSepDeg) > 0.02) fail(id, `min angular separation ${round2(sep)} != diagnostics ${d.minAngularSepDeg}`);
  if (sep < 6) fail(id, `two visible objects are only ${round2(sep)} deg apart (visually ambiguous)`);
  if (c.question && c.question.requireNearest) {
    // A hidden object cannot be the one that "looks nearest to the robot".
    let best = null, bestD = Infinity, secondD = Infinity;
    for (const o of visible) {
      const dist = Math.hypot(o.x - robot.x, o.y - robot.y);
      if (dist < bestD) { secondD = bestD; bestD = dist; best = o.id; } else if (dist < secondD) secondD = dist;
    }
    if (ans.nearestId !== best) fail(id, `nearestId ${ans.nearestId} != recomputed ${best}`);
    if (secondD - bestD < 0.15) fail(id, 'nearest object is ambiguous');
  } else if (ans.nearestId !== null) fail(id, 'nearestId set on an item that does not ask for it');

  // 6. Perspective must bite + mirror foil present.
  const R = Math.hypot(robot.x, robot.y);
  const child = { x: 0, y: R };                            // the child views the map from below
  const own = orderFrom(visible, child);
  if (keyOf(own) !== d.egocentricOrderKey) fail(id, `egocentricOrderKey ${d.egocentricOrderKey} != recomputed ${keyOf(own)}`);
  const disp = (c.view || {}).angularDisparityDeg;
  if (!isNum(disp)) fail(id, 'view.angularDisparityDeg missing (M-ROTSLOPE needs it)');
  else {
    const childHeading = (c.view || {}).childHeadingDeg;
    if (angleBetweenDeg(childHeading, robot.headingDeg) - disp > 0.5) fail(id, 'angularDisparityDeg does not match the robot heading');
    if (disp >= 45 && keyOf(own) === ans.correctKey) fail(id, `viewpoint offset ${disp} deg but the egocentric order is still correct`);
  }
  if (d.angularDisparityDeg !== disp) fail(id, 'diagnostics.angularDisparityDeg != view.angularDisparityDeg');

  const rats = Object.values(ans.distractorRationales || {});
  if (rats.length < 2) fail(id, `lure table too small (${rats.length})`);
  const correct = rats.filter(x => x && lureLabel(x) === 'correct');
  if (correct.length !== 1) fail(id, `expected exactly 1 'correct' lure, got ${correct.length}`);
  else if (correct[0].orderKey !== ans.correctKey) fail(id, "'correct' lure order != correctKey");
  const keys = rats.map(x => x && x.key);
  if (new Set(keys).size !== keys.length) fail(id, 'lure keys not unique');
  const oks = rats.map(x => x && x.orderKey);
  if (new Set(oks).size !== oks.length) fail(id, 'lure orders not unique');
  const reversed = keyOf(re.slice().reverse());
  const mirror = rats.find(x => x.chirality === 'mirror');
  if (!mirror) fail(id, 'no mirror (left-right reversal) foil recorded');
  else { mirrorItems++; if (mirror.orderKey !== reversed) fail(id, 'the mirror foil is not the exact reversal'); }
  for (const f of rats) {
    if (typeof lureLabel(f) !== 'string' || !lureLabel(f)) { fail(id, 'lure label missing'); continue; }
    if (keyOf(f.order || []) !== f.orderKey) fail(id, `lure ${f.key} order/orderKey mismatch`);
    const der = f.derivation || {};
    // Every foil is a permutation of the VISIBLE objects, except the one whose whole point is
    // that the child ordered the entire tray and never applied the barrier.
    const overGeneral = der.kind === 'ignored_occlusion';
    const wantSize = overGeneral ? objects.length : visible.length;
    if (new Set(f.order || []).size !== wantSize) fail(id, `lure ${f.key} is not a permutation of the ${overGeneral ? 'whole tray' : 'visible objects'}`);
    const wantChir = f.orderKey === ans.correctKey ? 'same' : (f.orderKey === reversed ? 'mirror' : 'same');
    if (f.chirality !== wantChir) fail(id, `lure ${f.key} chirality ${f.chirality} != recomputed ${wantChir}`);
    if (lureLabel(f) !== 'correct' && f.orderKey === ans.correctKey) fail(id, `lure ${f.key} equals the key`);
    let got = null;
    if (der.kind === 'line_of_sight') got = keyOf(re);
    else if (der.kind === 'reverse') got = reversed;
    else if (der.kind === 'own_view') got = keyOf(own);
    else if (der.kind === 'ignored_occlusion') {
      if (!hidden.length) fail(id, `lure ${f.key} claims ignored occlusion but nothing is hidden`);
      got = keyOf(orderFrom(objects, robot));
    } else if (der.kind === 'depth_order') {
      got = keyOf(visible.map(o => ({ id: o.id, dist: Math.hypot(o.x - robot.x, o.y - robot.y) }))
        .sort((a, b) => a.dist - b.dist).map(o => o.id));
    } else if (der.kind === 'swap_closest_pair') {
      const angs = bearingsDeg(visible, robot);
      const bb = visible.map((o, i) => ({ id: o.id, ang: angs[i] })).sort((a, b) => a.ang - b.ang);
      let at = 0, best = Infinity;
      for (let i = 0; i + 1 < bb.length; i++) { const gap = bb[i + 1].ang - bb[i].ang; if (gap < best) { best = gap; at = i; } }
      const s = re.slice(); [s[at], s[at + 1]] = [s[at + 1], s[at]];
      got = keyOf(s);
    } else if (der.kind === 'stated_permutation') got = keyOf(der.order || []);
    else fail(id, `unknown lure derivation kind (${der.kind})`);
    if (got !== null && got !== f.orderKey) fail(id, `lure ${f.key} (${lureLabel(f)}) does not re-derive to its order`);
  }
}

// ---- 7. Coverage + ramp ----
const diffs = items.map((it) => it.difficulty).filter(isNum);
const min = Math.min(...diffs), max = Math.max(...diffs);
if (!(min <= 1.5)) fail('coverage', `min difficulty ${round2(min)} > 1.5 (floor not reached)`);
if (!(max >= 19.5)) fail('coverage', `max difficulty ${round2(max)} < 19.5 (ceiling not reached)`);
const binCounts = Array.from({ length: 20 }, () => 0);
const bandCounts = Array.from({ length: 20 }, () => 0);
for (const d of diffs) {
  const k = Math.round(d); if (k >= 1 && k <= 20) binCounts[k - 1]++;
  for (let kk = 1; kk <= 20; kk++) if (Math.abs(d - kk) <= 1.0) bandCounts[kk - 1]++;
}
binCounts.forEach((n, i) => { if (n < MIN_PER_BAND) fail('coverage', `integer bin k=${i + 1} has ${n} items (<${MIN_PER_BAND})`); });
bandCounts.forEach((n, i) => { if (n < MIN_PER_BAND) fail('coverage', `+/-1pt band around k=${i + 1} has ${n} items (<${MIN_PER_BAND})`); });
function corr(xs, ys) {
  const n = xs.length, mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { const a = xs[i] - mx, b = ys[i] - my; sxy += a * b; sxx += a * a; syy += b * b; }
  return sxy / Math.sqrt(sxx * syy || 1);
}
const rObjects = corr(diffs, items.map((it) => it.answer.diagnostics.objectCount));
const rDisp = corr(diffs, items.map((it) => it.content.view.angularDisparityDeg));
const rSep = corr(diffs, items.map((it) => it.answer.diagnostics.minAngularSepDeg));
const rOccl = corr(diffs, items.map((it) => (it.content.scene.barriers || []).length));
if (rOccl < 0.5) fail('ramp', `difficulty vs barrier-count correlation ${rOccl.toFixed(2)} < 0.50 (occlusion is meant to be a difficulty lever)`);
if (rObjects < 0.8) fail('ramp', `difficulty vs object-count correlation ${rObjects.toFixed(2)} < 0.80`);
if (rDisp < 0.5) fail('ramp', `difficulty vs angular-disparity correlation ${rDisp.toFixed(2)} < 0.50`);
if (rSep > -0.5) fail('ramp', `difficulty vs min-separation correlation ${rSep.toFixed(2)} should be strongly negative`);
const dispValues = [...new Set(items.map((it) => it.content.view.angularDisparityDeg))];
if (dispValues.length < 4) fail('rotslope', `only ${dispValues.length} distinct angular disparities: M-ROTSLOPE cannot be fit`);
if (mirrorItems !== items.length) fail('mirror', `${items.length - mirrorItems} item(s) lack a mirror foil`);

// ---- Report ----
console.log(`SPA-SCENE-01 bank check: ${items.length} items`);
console.log(`difficulty span: ${round2(min)} .. ${round2(max)}`);
console.log(`M-ROTSLOPE angular disparities: ${dispValues.sort((a, b) => a - b).join(', ')} deg · every item carries a mirror foil: ${mirrorItems === items.length}`);
console.log(`ramp correlation: objects r=${rObjects.toFixed(3)} · disparity r=${rDisp.toFixed(3)} · min-separation r=${rSep.toFixed(3)} · barriers r=${rOccl.toFixed(3)}`);
console.log('measured occlusion curve (visibility recomputed from the served barriers):');
const span = (xs) => (Math.min(...xs) === Math.max(...xs) ? String(Math.min(...xs)) : `${Math.min(...xs)}-${Math.max(...xs)}`);
for (const band of BANDS) {
  const p = bandProfile[band];
  if (!p) { console.log(`  ${band.padEnd(11)} n=  0`); continue; }
  console.log(
    `  ${band.padEnd(11)} n=${String(p.n).padStart(3)}  objects=${span(p.objects)}` +
    `  barriers=${span(p.barriers)}  windows=${span(p.windows)}` +
    `  hidden=${span(p.hidden)}  visible(ordered)=${span(p.visible)}  seen-through-window=${span(p.through)}`,
  );
}
console.log('per integer bin (k:n):  ' + binCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log('per +/-1pt band (k:n):  ' + bandCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
if (warnings.length) {
  console.log(`\nWARN - ${warnings.length} cosmetic issue(s) (they do not change any key):`);
  for (const w of warnings.slice(0, 10)) console.log('  - ' + w);
  if (warnings.length > 10) console.log(`  ... and ${warnings.length - 10} more`);
}
if (failures.length) {
  console.error(`\nFAIL - ${failures.length} problem(s):`);
  for (const f of failures.slice(0, 40)) console.error('  - ' + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log('\nPASS - parses, structure valid, the visible/hidden split re-derived by orientation signs agrees with the bank on every object, every seen order re-derived by a trig-free cross-product line-of-sight sort over the visible objects, occlusion curve per band confirmed, mirror foils confirmed, coverage 1..20 with >=5 per bin and per +/-1pt band.');
