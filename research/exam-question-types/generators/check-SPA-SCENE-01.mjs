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
// Checks (exit nonzero on any failure):
//   1. JSONL parses; every line is a well-formed BankItem (BUILD_PLAN §2 shape).
//   2. Born-synthetic + server/renderable split: content carries NO order, key or lure.
//   3. Scene is legal: the robot faces the scene centre, every object is in front of it,
//      objects are separated on the ground and separated in bearing.
//   4. Key is COMPUTED: the cross-product order reproduces answer.correctKey, and the
//      nearest-object mark (where required) is reproduced by Euclidean distance.
//   5. Perspective actually bites: for a viewpoint offset >= 45 deg the child's own
//      left-to-right order must NOT be the correct answer, and the exact left-right
//      REVERSAL must be present as a chirality:'mirror' lure (M-MIRRORFA depends on it).
//   6. M-ROTSLOPE: angularDisparityDeg is present, matches the robot's heading, and
//      spans a usable range so a rotation-rate slope can be fit across items.
//   7. Difficulty is a float 1..20 with >=5 items per integer bin AND per +/-1 pt band.
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

const failures = [];
const fail = (id, msg) => failures.push(`[${id}] ${msg}`);
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

  // 4. Independent recompute of the key.
  const ans = it.answer || {};
  const re = orderFrom(objects, robot);
  if (keyOf(re) !== ans.correctKey) fail(id, `cross-product order ${keyOf(re)} != correctKey ${ans.correctKey}`);
  if (keyOf(ans.correctOrder || []) !== ans.correctKey) fail(id, 'correctOrder != correctKey');
  if (new Set(ans.correctOrder || []).size !== objects.length) fail(id, 'correctOrder is not a permutation of the objects');
  const d = ans.diagnostics || {};
  if (d.objectCount !== objects.length) fail(id, 'diagnostics.objectCount wrong');
  if (d.orderedPairTotal !== (objects.length * (objects.length - 1)) / 2) fail(id, 'orderedPairTotal wrong (partial credit basis)');
  const bs = bearingsDeg(objects, robot).sort((a, b) => a - b);
  let sep = Infinity;
  for (let i = 0; i + 1 < bs.length; i++) sep = Math.min(sep, bs[i + 1] - bs[i]);
  if (Math.abs(sep - d.minAngularSepDeg) > 0.02) fail(id, `min angular separation ${round2(sep)} != diagnostics ${d.minAngularSepDeg}`);
  if (sep < 6) fail(id, `two objects are only ${round2(sep)} deg apart (visually ambiguous)`);
  if (c.question && c.question.requireNearest) {
    let best = null, bestD = Infinity, secondD = Infinity;
    for (const o of objects) {
      const dist = Math.hypot(o.x - robot.x, o.y - robot.y);
      if (dist < bestD) { secondD = bestD; bestD = dist; best = o.id; } else if (dist < secondD) secondD = dist;
    }
    if (ans.nearestId !== best) fail(id, `nearestId ${ans.nearestId} != recomputed ${best}`);
    if (secondD - bestD < 0.15) fail(id, 'nearest object is ambiguous');
  } else if (ans.nearestId !== null) fail(id, 'nearestId set on an item that does not ask for it');

  // 5. Perspective must bite + mirror foil present.
  const R = Math.hypot(robot.x, robot.y);
  const child = { x: 0, y: R };                            // the child views the map from below
  const own = orderFrom(objects, child);
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
    if (new Set(f.order || []).size !== objects.length) fail(id, `lure ${f.key} is not a permutation`);
    const wantChir = f.orderKey === ans.correctKey ? 'same' : (f.orderKey === reversed ? 'mirror' : 'same');
    if (f.chirality !== wantChir) fail(id, `lure ${f.key} chirality ${f.chirality} != recomputed ${wantChir}`);
    if (lureLabel(f) !== 'correct' && f.orderKey === ans.correctKey) fail(id, `lure ${f.key} equals the key`);
    const der = f.derivation || {};
    let got = null;
    if (der.kind === 'line_of_sight') got = keyOf(re);
    else if (der.kind === 'reverse') got = reversed;
    else if (der.kind === 'own_view') got = keyOf(own);
    else if (der.kind === 'depth_order') {
      got = keyOf(objects.map(o => ({ id: o.id, dist: Math.hypot(o.x - robot.x, o.y - robot.y) }))
        .sort((a, b) => a.dist - b.dist).map(o => o.id));
    } else if (der.kind === 'swap_closest_pair') {
      const bb = objects.map((o, i) => ({ id: o.id, ang: bearingsDeg(objects, robot)[i] })).sort((a, b) => a.ang - b.ang);
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
console.log(`ramp correlation: objects r=${rObjects.toFixed(3)} · disparity r=${rDisp.toFixed(3)} · min-separation r=${rSep.toFixed(3)}`);
console.log('per integer bin (k:n):  ' + binCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log('per +/-1pt band (k:n):  ' + bandCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
if (failures.length) {
  console.error(`\nFAIL - ${failures.length} problem(s):`);
  for (const f of failures.slice(0, 40)) console.error('  - ' + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log('\nPASS - parses, structure valid, every seen order re-derived by a trig-free cross-product line-of-sight sort, mirror foils confirmed, coverage 1..20 with >=5 per bin and per +/-1pt band.');
