// Independent validator for the SPA-VIEW-01 structured bank.
//
// This checker does NOT import the generator. It re-derives every answer key with
// DIFFERENT algorithms than the generator's bearing formula:
//   match_viewpoint — the left-to-right order a station sees is rebuilt from
//     PAIRWISE 2D CROSS PRODUCTS ("is P to the left of Q from V") sorted by
//     insertion, not by sorting atan2 bearings. Exactly one station must
//     reproduce the shown strip, and it must be the declared correctKey.
//   point_heading  — the answer heading is recomputed by ROTATING the world into
//     the station's frame with an explicit rotation matrix and reading the angle
//     off the rotated vector, not by subtracting angles.
//
// Checks (exit nonzero on any failure):
//   1. JSONL parses; every line is a well-formed BankItem with the EXACT §2 key set.
//   2. Born-synthetic + server/renderable split: nothing in `content` leaks the key,
//      the accepted tolerance, the lure taxonomy, or chirality.
//   3. Keys are COMPUTED + UNIQUE, all station views are pairwise distinct, and
//      every declared lure label matches the geometry it claims.
//   4. Mirror foils really are exact left-right reversals (M-MIRRORFA), and every
//      named pointing error zone lies strictly outside the accepted band.
//   5. computed_solver items carry a deterministic, server-applicable tolerance
//      rule that a random dial angle cannot pass by luck.
//   6. Difficulty is a float 1..20 consistent with its own recorded levers, with
//      >=5 items per integer bin 1..19 AND per +/-1 pt band.
//
// Run:  node research/exam-question-types/generators/check-SPA-VIEW-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lureLabel } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK = resolve(__dirname, '../banks/SPA-VIEW-01.jsonl');
const ALLOWED_BANDS = ['2-3', '4-5', '6-8'];
const MIN_PER_BAND = 5;
const MAX_CHANCE_RATE = 0.13; // a random dial angle must not pass more than this often
const BANK_ITEM_KEYS = [
  'itemId', 'typeCode', 'domain', 'difficulty', 'ageBands', 'demoPath',
  'content', 'answer', 'scoring', 'provenance', 'syntheticOnly', 'validated',
];

const failures = [];
const fail = (id, msg) => failures.push(`[${id}] ${msg}`);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const round2 = (x) => Math.round(x * 100) / 100;
const DEG = 180 / Math.PI;
const RAD = Math.PI / 180;
function wrap180(d) {
  let x = ((d + 180) % 360 + 360) % 360 - 180;
  if (x === -180) x = 180;
  return x;
}
const angGap = (a, b) => Math.abs(wrap180(a - b));

/* =================================================================== *
 * INDEPENDENT GEOMETRY
 * =================================================================== */
// "P is to the left of Q, seen from station V": the 2D cross product of the two
// sight lines. Valid because every object is required to lie in front of V.
function leftOf(V, P, Q) {
  const ax = P.x - V.x, ay = P.y - V.y, bx = Q.x - V.x, by = Q.y - V.y;
  return ax * by - ay * bx < 0;
}
function inFront(V, P) {
  const f = [Math.cos(V.headingDeg * RAD), Math.sin(V.headingDeg * RAD)];
  return (P.x - V.x) * f[0] + (P.y - V.y) * f[1] > 0;
}
// Insertion sort under the pairwise comparator (no angles involved).
function orderByCrossProduct(objects, V) {
  const out = [];
  for (const o of objects) {
    let i = 0;
    while (i < out.length && leftOf(V, out[i], o)) i++;
    out.splice(i, 0, o);
  }
  return out.map((o) => o.id);
}
// Heading answer: rotate the world into the station frame, then read the angle.
function headingByRotation(V, P) {
  const h = V.headingDeg * RAD;
  const rx = P.x - V.x, ry = P.y - V.y;
  const along = rx * Math.cos(h) + ry * Math.sin(h);
  const left = -rx * Math.sin(h) + ry * Math.cos(h);
  return Math.atan2(-left, along) * DEG; // clockwise-positive from the facing
}

/* ---- difficulty model, re-derived from the documented lever semantics ---- */
const MODE_TERM = { match_viewpoint: 0, point_heading: 3.0 };
const raw = (mode, nO, nV, off, t) => 1.0 + MODE_TERM[mode] + 1.0 * (nO - 2) + 0.62 * (nV - 2) + 2.2 * (off / 180) + 4.0 * t;
const RAW_MIN = raw('match_viewpoint', 2, 2, 0, 0);
const RAW_MAX = raw('point_heading', 6, 8, 180, 1);
const difficultyFromLevers = (mode, nO, nV, off, t) =>
  Math.max(1, Math.min(20, 1 + ((raw(mode, nO, nV, off, t) - RAW_MIN) * 19) / (RAW_MAX - RAW_MIN)));
const toleranceDegFor = (t) => round2(22 - 15 * t);

/* ---- leak scan ---- */
const FORBIDDEN = ['correctkey', 'correctheading', 'tolerance', 'lure', 'chirality', 'rationale',
  'answer', 'iscorrect', 'exactmirror', 'mirrorfoil', 'angulardisparity', 'offfromcorrect', 'solver'];
function scanLeak(node, path, report) {
  if (node === null || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach((v, i) => scanLeak(v, `${path}[${i}]`, report)); return; }
  for (const k of Object.keys(node)) {
    const lk = k.toLowerCase();
    if (FORBIDDEN.some((f) => lk.includes(f))) report.push(`${path}.${k}`);
    scanLeak(node[k], `${path}.${k}`, report);
  }
}

/* =================================================================== *
 * 1. Parse
 * =================================================================== */
const rawText = readFileSync(BANK, 'utf8').trim();
const lines = rawText.length ? rawText.split('\n') : [];
if (!lines.length) fail('parse', 'bank is empty');
const items = [];
lines.forEach((line, i) => {
  try { items.push(JSON.parse(line)); } catch (e) { fail('parse', `line ${i + 1} invalid JSON: ${e.message}`); }
});

/* =================================================================== *
 * 2-5. Per-item checks
 * =================================================================== */
const seenIds = new Set();
let matchKeys = 0;
let headingKeys = 0;
let mirrorItems = 0;
for (const it of items) {
  const id = it.itemId || '(no id)';

  const keys = Object.keys(it).sort();
  const want = BANK_ITEM_KEYS.slice().sort();
  if (keys.join(',') !== want.join(',')) fail(id, `BankItem key set is ${keys.join(',')} (want ${want.join(',')})`);
  if (typeof it.itemId !== 'string' || it.itemId.length < 8) fail(id, 'itemId missing/short');
  if (seenIds.has(it.itemId)) fail(id, 'duplicate itemId');
  seenIds.add(it.itemId);
  if (it.typeCode !== 'SPA-VIEW-01') fail(id, `typeCode ${it.typeCode}`);
  if (it.domain !== 'spatial') fail(id, `domain ${it.domain}`);
  if (it.demoPath !== 'demos/SPA-VIEW-01.html') fail(id, `demoPath ${it.demoPath}`);
  if (it.syntheticOnly !== true) fail(id, 'syntheticOnly must be true');
  if (it.validated !== false) fail(id, 'validated must be false');
  if (!it.provenance || it.provenance.generator !== 'grammar') fail(id, 'provenance.generator != grammar');
  if (!it.provenance || typeof it.provenance.seed !== 'string') fail(id, 'provenance.seed missing');
  if (!isNum(it.difficulty) || it.difficulty < 1 || it.difficulty > 20) fail(id, `difficulty ${it.difficulty} not in 1..20`);
  if (!Array.isArray(it.ageBands) || !it.ageBands.length || !it.ageBands.every((b) => ALLOWED_BANDS.includes(b)))
    fail(id, `ageBands ${JSON.stringify(it.ageBands)} outside the type's declared bands`);

  const c = it.content || {};
  const ans = it.answer || {};
  const leaks = [];
  scanLeak(c, 'content', leaks);
  if (leaks.length) fail(id, `content leaks answer-side field(s): ${leaks.slice(0, 4).join(', ')}`);

  const scene = c.scene || {};
  const objects = scene.objects || [];
  const stations = scene.stations || [];
  const self = scene.frame && scene.frame.selfStation;
  if (objects.length < 2) fail(id, `only ${objects.length} objects`);
  if (stations.length < 2) fail(id, `only ${stations.length} stations`);
  if (!self || !isNum(self.headingDeg)) fail(id, 'scene.frame.selfStation missing');
  for (const o of objects) {
    if (typeof o.label !== 'string' || !o.label.length) fail(id, 'object has no on-screen text label (reading gate D-017)');
    if (!isNum(o.x) || !isNum(o.y)) fail(id, 'object has no map coordinates');
  }
  const stKeys = stations.map((s) => s.key);
  if (new Set(stKeys).size !== stKeys.length) fail(id, 'station keys not unique');
  // Every object must sit in front of every station or "left to right" is undefined.
  for (const s of stations)
    for (const o of objects) if (!inFront(s, o)) fail(id, `object ${o.id} is behind station ${s.key}`);

  // --- INDEPENDENT ORDERS, from pairwise cross products ---
  const orders = {};
  for (const s of stations) {
    const ord = orderByCrossProduct(objects, s);
    // The comparator must induce a strict total order (no cycles).
    for (let i = 0; i < ord.length; i++)
      for (let j = i + 1; j < ord.length; j++) {
        const P = objects.find((o) => o.id === ord[i]);
        const Q = objects.find((o) => o.id === ord[j]);
        if (!leftOf(s, P, Q)) fail(id, `cross-product order is not transitive at station ${s.key}`);
      }
    orders[s.key] = ord;
  }
  if (new Set(Object.values(orders).map((o) => o.join('>'))).size !== stations.length)
    fail(id, 'two stations share the same left-to-right view (the answer is not unique)');

  const mode = c.question && c.question.mode;
  const lev = (it.provenance && it.provenance.levers) || {};

  if (mode === 'match_viewpoint') {
    if (it.scoring.mode !== 'deterministic_key') fail(id, `match shell must be deterministic_key, got ${it.scoring.mode}`);
    const strip = (c.targetView && c.targetView.orderedObjectIds) || [];
    if (strip.length !== objects.length) fail(id, 'targetView strip does not list every object');
    const matching = stations.filter((s) => orders[s.key].join('>') === strip.join('>')).map((s) => s.key);
    if (matching.length !== 1) fail(id, `cross-product ordering matched ${matching.length} stations (want exactly 1)`);
    else if (matching[0] !== ans.correctKey) fail(id, `recomputed key ${matching[0]} != declared ${ans.correctKey}`);
    else matchKeys++;

    const optKeys = (c.options || []).map((o) => o.key);
    if (optKeys.length !== stations.length) fail(id, 'options do not cover every station');
    for (const o of c.options || [])
      if (Object.keys(o).join(',') !== 'key') fail(id, `option carries fields "${Object.keys(o).join(',')}" (want exactly key)`);
    if (!optKeys.every((k) => stKeys.includes(k))) fail(id, 'an option key is not a station key');

    const rats = ans.distractorRationales || {};
    if (Object.keys(rats).length !== stations.length || !stKeys.every((k) => k in rats))
      fail(id, 'distractorRationales do not cover every station');
    const correctRats = Object.keys(rats).filter((k) => lureLabel(rats[k]) === 'correct');
    if (correctRats.length !== 1 || correctRats[0] !== ans.correctKey) fail(id, 'exactly one "correct" rationale must be the correctKey');

    const correctStation = stations.find((s) => s.key === ans.correctKey);
    const reverseStrip = strip.slice().reverse().join('>');
    for (const s of stations) {
      const r = rats[s.key];
      if (!r || typeof lureLabel(r) !== 'string') { fail(id, `station ${s.key} has no lure label`); continue; }
      if (typeof r.note !== 'string' || r.note.length < 8) fail(id, `station ${s.key} lure has no rationale note`);
      if (s.key === ans.correctKey) continue;
      const off = round2(angGap(s.headingDeg, correctStation.headingDeg));
      if (Math.abs(r.viewpointOffsetDeg - off) > 0.02) fail(id, `station ${s.key} records offset ${r.viewpointOffsetDeg}, measured ${off}`);
      if (lureLabel(r) === 'mirror_reversal') {
        if (orders[s.key].join('>') !== reverseStrip) fail(id, `station ${s.key} is labelled a mirror but does not see the reversed strip`);
        if (r.chirality !== 'left_right_reversed') fail(id, `mirror foil ${s.key} does not record chirality`);
      } else if (orders[s.key].join('>') === reverseStrip && objects.length >= 2) {
        fail(id, `station ${s.key} sees the exact reversal but is not labelled a mirror foil`);
      }
    }
    if (ans.mirrorFoilKey) {
      mirrorItems++;
      if (rats[ans.mirrorFoilKey] === undefined || lureLabel(rats[ans.mirrorFoilKey]) !== 'mirror_reversal')
        fail(id, 'mirrorFoilKey does not point at the mirror lure');
      if (ans.chiralityRelevant !== true) fail(id, 'mirrorFoilKey present but chiralityRelevant is not true');
    } else if (ans.chiralityRelevant !== false) fail(id, 'chiralityRelevant must be false when no exact reversal exists');
    if (c.pointing) fail(id, 'match shell must not carry pointing params');
  } else if (mode === 'point_heading') {
    if (it.scoring.mode !== 'computed_solver') fail(id, `pointing shell must be computed_solver, got ${it.scoring.mode}`);
    const p = c.pointing || {};
    const station = stations.find((s) => s.key === p.fromStationKey);
    const target = objects.find((o) => o.id === p.targetObjectId);
    if (!station) fail(id, `pointing.fromStationKey ${p.fromStationKey} is not a station`);
    if (!target) fail(id, `pointing.targetObjectId ${p.targetObjectId} is not an object`);
    if (station && target) {
      const recomputed = round2(headingByRotation(station, target));
      if (angGap(recomputed, ans.correctHeadingDeg) > 0.02)
        fail(id, `recomputed heading ${recomputed} != declared ${ans.correctHeadingDeg}`);
      else headingKeys++;

      const tol = ans.toleranceDeg;
      if (!isNum(tol) || tol < 5 || tol > 25) fail(id, `toleranceDeg ${tol} outside 5..25`);
      if (it.scoring.toleranceDeg !== tol) fail(id, 'scoring.toleranceDeg != answer.toleranceDeg');
      if (typeof it.scoring.rule !== 'string' || !it.scoring.rule.includes('wrap180'))
        fail(id, 'computed_solver has no server-applicable tolerance rule');
      if (it.scoring.solver !== 'signed_heading_error_within_tolerance') fail(id, `unexpected solver ${it.scoring.solver}`);
      if (!(2 * tol / 360 <= MAX_CHANCE_RATE)) fail(id, `accept band passes ${round2(200 * tol / 360)}% of random dial angles`);
      if (!(p.dialStepDeg > 0 && p.dialStepDeg < tol)) fail(id, `dialStepDeg ${p.dialStepDeg} is not finer than the tolerance ${tol}`);

      // Every named error zone must be strictly outside the accepted band.
      const rats = ans.distractorRationales || {};
      const margin = Math.max(4, round2(tol * 0.6));
      const expectZones = {
        egocentric: round2(headingByRotation(self, target)),
        mirror_reflected: round2(wrap180(-ans.correctHeadingDeg)),
        array_frame: round2(headingByRotation({ x: station.x, y: station.y, headingDeg: 90 }, target)),
        opposite: round2(wrap180(ans.correctHeadingDeg + 180)),
      };
      for (const [zone, deg] of Object.entries(expectZones)) {
        const r = rats[zone];
        if (!r) { fail(id, `pointing item has no "${zone}" error zone`); continue; }
        if (angGap(r.headingDeg, deg) > 0.05) fail(id, `zone ${zone} records ${r.headingDeg}, recomputed ${deg}`);
        const gap = round2(angGap(deg, ans.correctHeadingDeg));
        if (gap < tol + margin) fail(id, `zone ${zone} is only ${gap} deg off the answer (needs >= ${round2(tol + margin)})`);
        if (Math.abs(r.offFromCorrectDeg - gap) > 0.05) fail(id, `zone ${zone} records offFromCorrectDeg ${r.offFromCorrectDeg}, measured ${gap}`);
        if (typeof r.note !== 'string' || r.note.length < 8) fail(id, `zone ${zone} has no rationale note`);
      }
      if (rats.mirror_reflected && rats.mirror_reflected.chirality !== 'left_right_reversed')
        fail(id, 'the reflected pointing zone does not record chirality');
      if (ans.chiralityRelevant !== true) fail(id, 'pointing items must mark chirality as relevant');
      if (ans.mirrorFoilKey !== 'mirror_reflected') fail(id, 'pointing mirrorFoilKey must name the reflected zone');
      if (ans.correctKey !== 'HEADING') fail(id, `pointing correctKey must be HEADING, got ${ans.correctKey}`);
      const derivedTol = toleranceDegFor(lev.tight);
      if (Math.abs(derivedTol - tol) > 0.02) fail(id, `toleranceDeg ${tol} != derived-from-levers ${derivedTol}`);
    }
    if ((c.options || []).length !== 0) fail(id, 'pointing shell must not carry pick-one options');
    if (c.targetView) fail(id, 'pointing shell must not carry a target view strip');
  } else fail(id, `unknown question mode ${mode}`);

  // --- M-ROTSLOPE input ---
  const actingKey = mode === 'match_viewpoint' ? ans.correctKey : (c.pointing || {}).fromStationKey;
  const acting = stations.find((s) => s.key === actingKey);
  if (acting && self) {
    const disp = Math.round(angGap(acting.headingDeg, self.headingDeg));
    if (ans.angularDisparityDeg !== disp) fail(id, `angularDisparityDeg ${ans.angularDisparityDeg}, measured ${disp}`);
    if (Math.abs(disp - lev.offsetDeg) > 1) fail(id, `angular disparity ${disp} does not match the offsetDeg lever ${lev.offsetDeg}`);
  }
  if (ans.angularDisparityApplies !== true) fail(id, 'angularDisparityApplies must be true for this type');

  // --- difficulty must equal the value derived from its own levers ---
  if (!(lev.mode in MODE_TERM)) fail(id, `unknown mode lever ${lev.mode}`);
  else {
    const derived = round2(difficultyFromLevers(lev.mode, lev.nObjects, lev.nViewpoints, lev.offsetDeg, lev.tight));
    if (Math.abs(derived - it.difficulty) > 0.01) fail(id, `difficulty ${it.difficulty} != derived-from-levers ${derived}`);
    if (lev.mode !== mode) fail(id, 'lever mode != content question mode');
    if (lev.nObjects !== objects.length) fail(id, `lever nObjects ${lev.nObjects} != ${objects.length}`);
    if (lev.nViewpoints !== stations.length) fail(id, `lever nViewpoints ${lev.nViewpoints} != ${stations.length}`);
  }
}

/* =================================================================== *
 * 6. Coverage
 * =================================================================== */
const diffs = items.map((it) => it.difficulty).filter(isNum);
const min = Math.min(...diffs);
const max = Math.max(...diffs);
if (!(min <= 1.5)) fail('coverage', `min difficulty ${round2(min)} > 1.5 (floor not reached)`);
if (!(max >= 19.5)) fail('coverage', `max difficulty ${round2(max)} < 19.5 (ceiling not reached)`);

const binCounts = Array.from({ length: 20 }, () => 0);
const bandCounts = Array.from({ length: 20 }, () => 0);
for (const d of diffs) {
  const k = Math.round(d);
  if (k >= 1 && k <= 20) binCounts[k - 1]++;
  for (let kk = 1; kk <= 20; kk++) if (Math.abs(d - kk) <= 1.0) bandCounts[kk - 1]++;
}
binCounts.forEach((n, i) => { if (i + 1 <= 19 && n < MIN_PER_BAND) fail('coverage', `integer bin k=${i + 1} has ${n} items (<${MIN_PER_BAND})`); });
bandCounts.forEach((n, i) => { if (i + 1 <= 19 && n < MIN_PER_BAND) fail('coverage', `+/-1pt band k=${i + 1} has ${n} items (<${MIN_PER_BAND})`); });

/* =================================================================== *
 * Report
 * =================================================================== */
console.log(`SPA-VIEW-01 bank check: ${items.length} items`);
console.log(`keys re-derived: ${matchKeys} match (pairwise cross products) + ${headingKeys} pointing (frame rotation)`);
console.log(`items carrying an exact left-right reversal foil: ${mirrorItems + headingKeys}`);
console.log(`difficulty span: ${round2(min)} .. ${round2(max)}`);
console.log('per integer bin (k:n):  ' + binCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log('per +/-1pt band (k:n):  ' + bandCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log(`min per-bin density 1..19: ${Math.min(...binCounts.slice(0, 19))}`);

if (failures.length) {
  console.error(`\nFAIL - ${failures.length} problem(s):`);
  for (const f of failures.slice(0, 40)) console.error('  - ' + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log('\nPASS - structure valid, no content leak, every key independently re-derived, views unique, mirror foils exact, tolerance rule deterministic, coverage 1..20 with >=5 per bin and per +/-1pt band.');
