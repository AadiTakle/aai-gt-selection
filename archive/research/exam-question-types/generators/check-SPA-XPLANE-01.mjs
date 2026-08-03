// Independent validator for the SPA-XPLANE-01 structured bank.
//
// This checker does NOT import the generator. It re-derives every answer with a
// DIFFERENT cross-section algorithm: the generator intersects each EDGE of the
// solid with the plane and orders the hit points by angle around their centroid,
// whereas this checker CLIPS EACH FACE against the plane, collects the cut
// segment that face contributes, and CHAINS those segments end-to-end into the
// cut loop, then forces a counter-clockwise traversal from the signed area.
// Both must agree, or the item is rejected.
//
// Because this type's response is a positioned/tilted PLANE rather than a pick,
// re-deriving "the key" means re-deriving the whole accepted set: the checker
// sweeps every setting the child can reach on content.controls.step and counts
// how many pass the item's own tolerance rule.
//
// Checks (exit nonzero on any failure):
//   1. JSONL parses; every line is a well-formed BankItem with the EXACT §2 key set.
//   2. Born-synthetic + server/renderable split: nothing in `content` leaks the
//      keyed plane, the target signature's plane, the tolerance, or the lures.
//   3. The declared plane really does cut the declared target outline, recomputed
//      by face clipping.
//   4. The accepted set is non-empty, matches the recorded acceptFraction, and is
//      small enough that the item cannot be solved by scrubbing at random -- with
//      the budget tightening as the difficulty rung rises.
//   5. Every named error placement is genuinely REJECTED by the same rule, and
//      chirality is recorded correctly (a mirrored cut face must not pass when
//      the target is chiral -- M-MIRRORFA).
//   6. Difficulty is a float 1..20 consistent with its own recorded levers, with
//      >=5 items per integer bin 1..19 AND per +/-1 pt band.
//
// Run:  node research/exam-question-types/generators/check-SPA-XPLANE-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lureLabel } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK = resolve(__dirname, '../banks/SPA-XPLANE-01.jsonl');
const ALLOWED_BANDS = ['4-5', '6-8'];
const MIN_PER_BAND = 5;
const FRACTION_SLACK = 0.015; // plane-coincident settings may be classified differently
const BANK_ITEM_KEYS = [
  'itemId', 'typeCode', 'domain', 'difficulty', 'ageBands', 'demoPath',
  'content', 'answer', 'scoring', 'provenance', 'syntheticOnly', 'validated',
];

const failures = [];
const fail = (id, msg) => failures.push(`[${id}] ${msg}`);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const round2 = (x) => Math.round(x * 100) / 100;
const round4 = (x) => Math.round(x * 1e4) / 1e4;

/* =================================================================== *
 * INDEPENDENT GEOMETRY — face clipping + segment chaining
 * =================================================================== */
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a) => { const n = Math.hypot(...a) || 1; return [a[0] / n, a[1] / n, a[2] / n]; };
const near3 = (a, b) => Math.hypot(...sub(a, b)) < 1e-6;

function planeFrom(solid, pm, h, t, w) {
  const a = (t / 100) * pm.tiltMaxRad;
  const b = (w / 100) * pm.twistMaxRad;
  const n = unit([Math.sin(a) * Math.cos(b), Math.cos(a), Math.sin(a) * Math.sin(b)]);
  const ds = solid.verts.map((p) => dot(n, p));
  const lo = Math.min(...ds);
  const hi = Math.max(...ds);
  const d = lo + (pm.offsetBase + pm.offsetSpan * (h / 100)) * (hi - lo);
  // Any right-handed in-plane basis works: the comparison below is rotation
  // invariant, and (u, v, n) right-handedness is what fixes chirality.
  const ref = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 0, 1];
  const u = unit(cross(n, ref));
  const v = unit(cross(n, u));
  return { n, d, u, v };
}
function clipSection(solid, pl) {
  const segs = [];
  for (const f of solid.faces) {
    const hits = [];
    for (let i = 0; i < f.length; i++) {
      const A = solid.verts[f[i]];
      const B = solid.verts[f[(i + 1) % f.length]];
      const da = dot(pl.n, A) - pl.d;
      const db = dot(pl.n, B) - pl.d;
      if (Math.abs(da) < 1e-9) hits.push(A);
      else if (da * db < 0) hits.push(add(A, mul(sub(B, A), da / (da - db))));
    }
    const u = [];
    for (const p of hits) if (!u.some((q) => near3(p, q))) u.push(p);
    if (u.length >= 2) segs.push([u[0], u[u.length - 1]]);
  }
  if (segs.length < 3) return [];
  const used = segs.map(() => false);
  used[0] = true;
  const loop = [segs[0][0], segs[0][1]];
  for (let step = 0; step < segs.length; step++) {
    const end = loop[loop.length - 1];
    let advanced = false;
    for (let i = 0; i < segs.length; i++) {
      if (used[i]) continue;
      const [a, b] = segs[i];
      if (near3(a, end)) { loop.push(b); used[i] = true; advanced = true; break; }
      if (near3(b, end)) { loop.push(a); used[i] = true; advanced = true; break; }
    }
    if (!advanced) break;
  }
  if (loop.length > 2 && near3(loop[loop.length - 1], loop[0])) loop.pop();
  const uniq = [];
  for (const p of loop) if (!uniq.some((q) => near3(p, q))) uniq.push(p);
  return uniq.length >= 3 ? uniq : [];
}
// Centroid-centred 2D outline, forced counter-clockwise in the right-handed frame.
function outlineOf(poly, pl) {
  if (poly.length < 3) return [];
  const q = poly.map((p) => [dot(p, pl.u), dot(p, pl.v)]);
  const cx = q.reduce((s, p) => s + p[0], 0) / q.length;
  const cy = q.reduce((s, p) => s + p[1], 0) / q.length;
  const c = q.map((p) => [p[0] - cx, p[1] - cy]);
  let area = 0;
  for (let i = 0; i < c.length; i++) {
    const a = c[i];
    const b = c[(i + 1) % c.length];
    area += a[0] * b[1] - b[0] * a[1];
  }
  return area < 0 ? c.reverse() : c;
}
// Rotation-invariant, scale- and chirality-sensitive shape distance.
function shapeDistance(A, B) {
  const n = A.length;
  if (!n || n !== B.length) return Infinity;
  let best = Infinity;
  for (let k = 0; k < n; k++) {
    let sc = 0;
    let ss = 0;
    for (let i = 0; i < n; i++) {
      const a = A[i];
      const b = B[(i + k) % n];
      sc += a[0] * b[0] + a[1] * b[1];
      ss += a[1] * b[0] - a[0] * b[1];
    }
    const th = Math.atan2(ss, sc);
    const ct = Math.cos(th);
    const st = Math.sin(th);
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const a = A[i];
      const b = B[(i + k) % n];
      const rx = b[0] * ct - b[1] * st;
      const ry = b[0] * st + b[1] * ct;
      sum += (a[0] - rx) ** 2 + (a[1] - ry) ** 2;
    }
    best = Math.min(best, Math.sqrt(sum / n));
  }
  return best;
}
const reflectOutline = (P) => P.map((p) => [p[0], -p[1]]).reverse();
const cutOutline = (solid, pm, h, t, w) => {
  const pl = planeFrom(solid, pm, h, t, w);
  return outlineOf(clipSection(solid, pl), pl);
};

/* ---- difficulty + tolerance, re-derived from the documented lever semantics ---- */
const COMPLEXITY = { simple: 0.0, prism: 1.2, complex: 2.2, composite: 3.4 };
const DOF_TERM = { 1: 0.0, 2: 1.6, 3: 3.0 };
const raw = (c, dof, tilt, t) => 1.0 + COMPLEXITY[c] + DOF_TERM[dof] + 2.4 * (tilt / 100) + 4.2 * t;
const RAW_MIN = raw('simple', 1, 0, 0);
const RAW_MAX = raw('composite', 3, 100, 1);
const difficultyFromLevers = (c, dof, tilt, t) =>
  clamp(1 + ((raw(c, dof, tilt, t) - RAW_MIN) * 19) / (RAW_MAX - RAW_MIN), 1, 20);
const toleranceFor = (t) => round4(0.3 - 0.26 * t);
const maxAcceptFractionFor = (d) => round4(clamp(0.85 - 0.043 * d, 0.03, 0.85));

/* ---- leak scan ---- */
const FORBIDDEN = ['correctkey', 'correctplane', 'tolerance', 'lure', 'chirality', 'rationale', 'answer',
  'iscorrect', 'exactmirror', 'acceptfraction', 'accepted', 'signature', 'shapedistance', 'mirrordistance'];
function scanLeak(node, path, report) {
  if (node === null || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach((v, i) => scanLeak(v, `${path}[${i}]`, report)); return; }
  for (const k of Object.keys(node)) {
    const lk = k.toLowerCase();
    if (FORBIDDEN.some((f) => lk.includes(f))) report.push(`${path}.${k}`);
    scanLeak(node[k], `${path}.${k}`, report);
  }
}
const gridValues = (step) => {
  const out = [];
  for (let v = 0; v <= 100 + 1e-9; v += step) out.push(round2(v));
  return out;
};

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
let keysRecomputed = 0;
let chiralItems = 0;
let worstFractionDelta = 0;
let worstAcceptFraction = 0;
for (const it of items) {
  const id = it.itemId || '(no id)';

  const keys = Object.keys(it).sort();
  const want = BANK_ITEM_KEYS.slice().sort();
  if (keys.join(',') !== want.join(',')) fail(id, `BankItem key set is ${keys.join(',')} (want ${want.join(',')})`);
  if (typeof it.itemId !== 'string' || it.itemId.length < 8) fail(id, 'itemId missing/short');
  if (seenIds.has(it.itemId)) fail(id, 'duplicate itemId');
  seenIds.add(it.itemId);
  if (it.typeCode !== 'SPA-XPLANE-01') fail(id, `typeCode ${it.typeCode}`);
  if (it.domain !== 'spatial') fail(id, `domain ${it.domain}`);
  if (it.demoPath !== 'demos/SPA-XPLANE-01.html') fail(id, `demoPath ${it.demoPath}`);
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

  const solid = c.solid;
  const pm = c.planeModel || {};
  if (!solid || !Array.isArray(solid.verts) || !Array.isArray(solid.faces)) { fail(id, 'content.solid malformed'); continue; }
  for (const f of solid.faces)
    if (!Array.isArray(f) || f.length < 3 || f.some((i) => !Number.isInteger(i) || i < 0 || i >= solid.verts.length))
      fail(id, 'content.solid has a malformed face');
  for (const k of ['tiltMaxRad', 'twistMaxRad', 'offsetBase', 'offsetSpan'])
    if (!isNum(pm[k])) fail(id, `planeModel.${k} missing (the renderer and the server could not agree)`);
  if (typeof pm.normalFormula !== 'string' || typeof pm.offsetFormula !== 'string')
    fail(id, 'planeModel does not publish its formulas');

  if (it.scoring.mode !== 'computed_solver') fail(id, `scoring.mode ${it.scoring.mode} (want computed_solver)`);
  if (it.scoring.solver !== 'cross_section_shape_match') fail(id, `unexpected solver ${it.scoring.solver}`);
  if (typeof it.scoring.rule !== 'string' || !it.scoring.rule.includes('shapeDistance'))
    fail(id, 'computed_solver has no server-applicable acceptance rule');
  if (it.scoring.shapeToleranceRms !== ans.shapeToleranceRms) fail(id, 'scoring tolerance != answer tolerance');
  if (it.scoring.responseField !== 'plane') fail(id, 'scoring.responseField must name the plane response');

  const ctrl = c.controls || {};
  const dof = 1 + (ctrl.tilt ? 1 : 0) + (ctrl.twist ? 1 : 0);
  const step = ctrl.step || {};
  if (!(step.height > 0) || !(step.tilt > 0) || !(step.twist > 0)) fail(id, 'controls.step is not a quantised grid');
  if (ctrl.height !== true) fail(id, 'the height control must always be active');

  const tol = ans.shapeToleranceRms;
  const target = ans.correctPlane || {};
  const sig = ans.targetSignature || [];

  // --- 3. the declared plane really cuts the declared outline (face clipping) ---
  const recomputed = cutOutline(solid, pm, target.h, target.t, target.w);
  if (recomputed.length !== sig.length) fail(id, `face clipping gives a ${recomputed.length}-gon, target signature has ${sig.length}`);
  else {
    const d0 = shapeDistance(recomputed, sig);
    if (!(d0 < 1e-6)) fail(id, `the keyed plane does not reproduce the target signature (distance ${d0.toExponential(2)})`);
    else keysRecomputed++;
  }
  if (ans.vertexCount !== sig.length) fail(id, 'answer.vertexCount != target signature length');
  if ((c.target || {}).vertexCount !== sig.length) fail(id, 'content.target.vertexCount != the true cut');
  if (!Array.isArray((c.target || {}).outline) || c.target.outline.length !== sig.length)
    fail(id, 'content.target.outline does not show the shape the child must make');
  if (typeof (c.target || {}).shapeWord !== 'string' || !c.target.shapeWord.length)
    fail(id, 'content.target has no readable shape word (reading gate D-017)');
  // The displayed outline is the stimulus and must be the shape itself.
  if (Array.isArray(c.target && c.target.outline) && c.target.outline.length === sig.length) {
    const dd = shapeDistance(c.target.outline, sig);
    if (!(dd < 1e-5)) fail(id, `the outline shown to the child differs from the keyed cut (distance ${round4(dd)})`);
  }

  // --- 4. the accepted set, re-derived by sweeping every reachable setting ---
  const hs = gridValues(step.height);
  const ts = ctrl.tilt ? gridValues(step.tilt) : [target.t];
  const ws = ctrl.twist ? gridValues(step.twist) : [target.w];
  let total = 0;
  let pass = 0;
  for (const h of hs)
    for (const t of ts)
      for (const w of ws) {
        total++;
        const o = cutOutline(solid, pm, h, t, w);
        if (o.length === sig.length && shapeDistance(o, sig) <= tol) pass++;
      }
  const frac = pass / total;
  if (total !== ans.reachableSettings) fail(id, `reachable settings ${ans.reachableSettings}, swept ${total}`);
  if (pass === 0) fail(id, 'no reachable plane setting passes the item (unsolvable)');
  const delta = Math.abs(frac - ans.acceptFraction);
  worstFractionDelta = Math.max(worstFractionDelta, delta);
  worstAcceptFraction = Math.max(worstAcceptFraction, frac);
  if (delta > FRACTION_SLACK)
    fail(id, `acceptFraction ${ans.acceptFraction} but face clipping measures ${round4(frac)}`);
  const budget = maxAcceptFractionFor(it.difficulty);
  if (frac > budget)
    fail(id, `${round4(100 * frac)}% of reachable plane settings pass at difficulty ${it.difficulty} (budget ${round4(100 * budget)}%)`);

  // --- 5. every named error placement must be rejected, chirality recorded ---
  const rats = ans.distractorRationales || {};
  if (!rats.PLANE || lureLabel(rats.PLANE) !== 'correct') fail(id, 'no "correct" rationale for the keyed plane');
  if (ans.correctKey !== 'PLANE') fail(id, `correctKey must be PLANE, got ${ans.correctKey}`);
  const lureKeys = Object.keys(rats).filter((k) => k !== 'PLANE');
  if (lureKeys.length < 2) fail(id, `only ${lureKeys.length} diagnostic error placements`);
  for (const k of lureKeys) {
    const r = rats[k];
    if (typeof r.note !== 'string' || r.note.length < 8) fail(id, `error placement ${k} has no rationale note`);
    if (!r.plane) { fail(id, `error placement ${k} records no plane`); continue; }
    if (!ctrl.tilt && r.plane.t !== target.t) fail(id, `error placement ${k} moves a locked tilt control`);
    if (!ctrl.twist && r.plane.w !== target.w) fail(id, `error placement ${k} moves a locked twist control`);
    const o = cutOutline(solid, pm, r.plane.h, r.plane.t, r.plane.w);
    const d = o.length === sig.length ? shapeDistance(o, sig) : Infinity;
    if (d <= tol) fail(id, `error placement ${k} would actually be ACCEPTED (distance ${round4(d)} <= ${tol})`);
    if (isNum(r.shapeDistance) && Math.abs(r.shapeDistance - d) > 1e-3)
      fail(id, `error placement ${k} records distance ${r.shapeDistance}, measured ${round4(d)}`);
    if (k === 'mirrored_twist') {
      if (r.chirality !== 'reflected_cut_face') fail(id, 'mirrored_twist does not record chirality');
      const dm = o.length === sig.length ? shapeDistance(o, reflectOutline(sig)) : Infinity;
      if (!(dm <= tol)) fail(id, `mirrored_twist is not actually the mirror of the target (reflected distance ${round4(dm)})`);
    }
  }
  const mirrorD = shapeDistance(sig, reflectOutline(sig));
  if (Math.abs(mirrorD - ans.mirrorDistance) > 1e-3) fail(id, `mirrorDistance ${ans.mirrorDistance}, measured ${round4(mirrorD)}`);
  const discriminates = mirrorD > tol;
  if (ans.mirrorFoilDiscriminates !== discriminates) fail(id, 'mirrorFoilDiscriminates does not match the geometry');
  if (ans.chiralityRelevant !== discriminates) fail(id, 'chiralityRelevant does not match the geometry');
  if (discriminates) chiralItems++;

  // --- M-ROTSLOPE input: obliquity of the keyed cut ---
  const pl = planeFrom(solid, pm, target.h, target.t, target.w);
  const obliq = Math.round((Math.acos(clamp(Math.abs(pl.n[1]), -1, 1)) * 180) / Math.PI);
  if (ans.angularDisparityDeg !== obliq) fail(id, `angularDisparityDeg ${ans.angularDisparityDeg}, measured ${obliq}`);
  if (ans.angularDisparityApplies !== true) fail(id, 'angularDisparityApplies must be true for this type');

  // --- difficulty and tolerance must follow from the recorded levers ---
  const lev = (it.provenance && it.provenance.levers) || {};
  if (!(lev.complexity in COMPLEXITY)) fail(id, `unknown complexity lever ${lev.complexity}`);
  else {
    const derived = round2(difficultyFromLevers(lev.complexity, lev.dof, lev.tiltLever, lev.tight));
    if (Math.abs(derived - it.difficulty) > 0.01) fail(id, `difficulty ${it.difficulty} != derived-from-levers ${derived}`);
    if (lev.dof !== dof) fail(id, `lever dof ${lev.dof} != active controls ${dof}`);
    if (lev.tiltLever !== target.t) fail(id, `lever tiltLever ${lev.tiltLever} != keyed tilt ${target.t}`);
    const derivedTol = toleranceFor(lev.tight);
    if (Math.abs(derivedTol - tol) > 1e-6) fail(id, `tolerance ${tol} != derived-from-levers ${derivedTol}`);
  }
  // The starting plane must not already be the answer.
  const sp = ctrl.startPlane || {};
  const so = cutOutline(solid, pm, sp.h, sp.t, sp.w);
  if (so.length === sig.length && shapeDistance(so, sig) <= tol) fail(id, 'the item starts on an accepted plane');
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
console.log(`SPA-XPLANE-01 bank check: ${items.length} items`);
console.log(`keyed planes re-derived by face clipping: ${keysRecomputed}/${items.length}`);
console.log(`largest accept-fraction disagreement between the two section algorithms: ${round4(worstFractionDelta)}`);
console.log(`largest accepted share of reachable plane settings: ${round4(worstAcceptFraction)}`);
console.log(`items where a mirrored cut face is rejected (chirality matters): ${chiralItems}`);
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
console.log('\nPASS - structure valid, no content leak, every keyed plane re-derived by an independent section algorithm, accepted set bounded and reproducible, error placements genuinely rejected, coverage 1..20 with >=5 per bin and per +/-1pt band.');
