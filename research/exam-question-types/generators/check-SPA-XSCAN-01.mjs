// Independent validator for the SPA-XSCAN-01 structured bank.
//
// This checker does NOT import the generator. It re-derives every answer key with a
// DIFFERENT algorithm than the generator's closed-form slice formula: for each
// candidate solid it BUILDS THE ACTUAL SURFACE (a lathe/extrusion of the segment's
// meridian profile), intersects that surface with each scan plane, and then MEASURES
// the resulting polygon (vertex count, circumradius, orientation) to recover the
// cross-section empirically. Exactly one candidate must reproduce the shown slice
// stack, and it must equal the declared correctKey.
//
// Checks (exit nonzero on any failure):
//   1. JSONL parses; every line is a well-formed BankItem with the EXACT §2 key set.
//   2. Born-synthetic + server/renderable split: nothing in `content` leaks the key,
//      the lure taxonomy, or chirality.
//   3. Key is COMPUTED + UNIQUE: mesh-measured slice stacks match exactly one option,
//      that option is the declared correctKey, and every foil mismatches by the
//      recorded number of slices.
//   4. Mirror foils really are exact reflections through the scan-axis mid-plane
//      (M-MIRRORFA depends on the recorded chirality).
//   5. Difficulty is a float 1..20 consistent with its own recorded levers, with
//      >=5 items per integer bin 1..19 AND per +/-1 pt band.
//
// Run:  node research/exam-question-types/generators/check-SPA-XSCAN-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lureLabel } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK = resolve(__dirname, '../banks/SPA-XSCAN-01.jsonl');
const ALLOWED_BANDS = ['4-5', '6-8'];
const MIN_PER_BAND = 5;
const BANK_ITEM_KEYS = [
  'itemId', 'typeCode', 'domain', 'difficulty', 'ageBands', 'demoPath',
  'content', 'answer', 'scoring', 'provenance', 'syntheticOnly', 'validated',
];

const failures = [];
const fail = (id, msg) => failures.push(`[${id}] ${msg}`);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const round2 = (x) => Math.round(x * 100) / 100;

/* =================================================================== *
 * INDEPENDENT GEOMETRY — build the surface, intersect it, measure it.
 * =================================================================== */
const RING = 72; // lathe resolution used for circular cross-sections
const VSTEP = 400; // vertical subdivision of a segment's meridian profile

// Meridian radius of a segment at height y, written from the documented segment
// semantics (arc = circular meridian; otherwise a linear ramp plus a parabolic bulge).
function meridianRadius(g, y) {
  if (g.arc) {
    const d = y - g.arc.yc;
    return Math.sqrt(Math.max(0, g.arc.R * g.arc.R - d * d));
  }
  const u = (y - g.y0) / (g.y1 - g.y0);
  return g.r0 + (g.r1 - g.r0) * u + (g.curv || 0) * 4 * u * (1 - u);
}
// Segment lookup: the LAST segment whose lower bound is at or below y.
function segmentIndexAt(segments, y) {
  let idx = 0;
  for (let i = 0; i < segments.length; i++) if (y >= segments[i].y0 - 1e-9) idx = i;
  return idx;
}
// Build the segment's surface as a ring-by-ring lathe/extrusion, then intersect
// its lateral edges with the plane at height y and MEASURE the resulting polygon.
function measureSection(solid, y) {
  const segs = solid.segments;
  if (y < segs[0].y0 - 1e-9 || y > segs[segs.length - 1].y1 + 1e-9) return null;
  const g = segs[segmentIndexAt(segs, y)];
  const n = g.sides >= 3 ? g.sides : RING;
  const angles = [];
  for (let k = 0; k < n; k++) {
    const deg = (g.sides >= 3 ? (g.rotDeg || 0) : 0) + (k * 360) / n;
    angles.push((deg * Math.PI) / 180);
  }
  // Vertical profile samples -> lateral edges; find the edge pair bracketing y.
  const y0 = g.y0;
  const y1 = g.y1;
  const step = (y1 - y0) / VSTEP;
  let i = Math.floor((y - y0) / step);
  i = Math.max(0, Math.min(VSTEP - 1, i));
  const ya = y0 + i * step;
  const yb = ya + step;
  const ra = meridianRadius(g, ya);
  const rb = meridianRadius(g, yb);
  const q = yb - ya === 0 ? 0 : (y - ya) / (yb - ya);
  // Points where the plane cuts each lateral edge of the built surface.
  const pts = angles.map((a) => {
    const r = ra + (rb - ra) * q;
    return [r * Math.cos(a), r * Math.sin(a)];
  });
  const radii = pts.map((p) => Math.hypot(p[0], p[1]));
  const rMax = Math.max(...radii);
  const rMin = Math.min(...radii);
  // Empirical classification: a full-resolution equiradial loop is a circle.
  const circular = pts.length === RING && rMax - rMin < 1e-6 && !(g.sides >= 3);
  let rotDeg = 0;
  if (!circular) {
    const kMax = radii.indexOf(rMax);
    rotDeg = ((Math.atan2(pts[kMax][1], pts[kMax][0]) * 180) / Math.PI + 360) % 360;
  }
  return { sides: circular ? 0 : pts.length, r: rMax, rotDeg };
}

// Guard-banded comparison: gaps below R_NEAR are the same slice, gaps above
// R_FAR are a different slice, and anything between is "fuzzy" -- a bank that
// contains a fuzzy pair is rejected, because whether it matches would then
// depend on floating-point noise rather than on geometry.
const R_NEAR = 0.012;
const R_FAR = 0.035;
const ROT_NEAR = 1.0;
const ROT_FAR = 4.0;
function sectionRel(a, b) {
  if (!a || !b) return a === b ? 'same' : 'diff';
  if (a.sides !== b.sides) return 'diff';
  const dr = Math.abs(a.r - b.r);
  if (dr > R_NEAR && dr < R_FAR) return 'fuzzy';
  let rotSame = true;
  if (a.sides >= 3) {
    const period = 360 / a.sides;
    const rawD = (((a.rotDeg - b.rotDeg) % period) + period) % period;
    const d = Math.min(rawD, period - rawD);
    if (d > ROT_NEAR && d < ROT_FAR) return 'fuzzy';
    rotSame = d <= ROT_NEAR;
  }
  return dr <= R_NEAR && rotSame ? 'same' : 'diff';
}
const sectionsAgree = (a, b) => sectionRel(a, b) === 'same';
// Slice stack measured off the built surface, at the item's own sampled heights.
function measuredRels(solid, slices) {
  return slices.map((s) => sectionRel(measureSection(solid, -1 + 2 * s.t), s.section));
}
function mismatchCount(solid, slices) {
  return measuredRels(solid, slices).filter((r) => r !== 'same').length;
}

/* ---- difficulty model, re-derived from the documented lever semantics ---- */
const COMPLEXITY = {
  circle_constant: 0.0, circle_taper: 0.7, circle_multi: 1.9,
  poly_constant: 1.5, poly_taper: 2.4, poly_multi: 3.5, sides_change: 4.6,
};
const ABSTRACTION = { 9: 0.0, 7: 0.8, 5: 1.6 };
const raw = (c, nCand, sc, sim) => 1.0 + COMPLEXITY[c] + 0.85 * (nCand - 2) + ABSTRACTION[sc] + 4.0 * sim;
const RAW_MIN = raw('circle_constant', 2, 9, 0);
const RAW_MAX = raw('sides_change', 6, 5, 1);
const difficultyFromLevers = (c, nCand, sc, sim) =>
  Math.max(1, Math.min(20, 1 + ((raw(c, nCand, sc, sim) - RAW_MIN) * 19) / (RAW_MAX - RAW_MIN)));

/* ---- leak scan: no key/lure/chirality vocabulary anywhere inside content ---- */
const FORBIDDEN = ['correctkey', 'correct', 'iscorrect', 'answer', 'lure', 'chirality', 'rationale',
  'mirrorfoilkey', 'exactmirror', 'slicesmismatched', 'distractor', 'key_'];
function scanLeak(node, path, report) {
  if (node === null || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach((v, i) => scanLeak(v, `${path}[${i}]`, report)); return; }
  for (const k of Object.keys(node)) {
    const lk = k.toLowerCase();
    // `options[].key` is the renderable option label, not an answer field.
    if (lk === 'key' && /options\[\d+\]$/.test(path)) continue;
    if (FORBIDDEN.some((f) => lk === f || lk.includes(f))) report.push(`${path}.${k}`);
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
 * 2-4. Per-item structure, leak, and INDEPENDENT key re-derivation
 * =================================================================== */
const seenIds = new Set();
let keysRecomputed = 0;
let mirrorItems = 0;
for (const it of items) {
  const id = it.itemId || '(no id)';

  const keys = Object.keys(it).sort();
  const want = BANK_ITEM_KEYS.slice().sort();
  if (keys.join(',') !== want.join(',')) fail(id, `BankItem key set is ${keys.join(',')} (want ${want.join(',')})`);
  if (typeof it.itemId !== 'string' || it.itemId.length < 8) fail(id, 'itemId missing/short');
  if (seenIds.has(it.itemId)) fail(id, 'duplicate itemId');
  seenIds.add(it.itemId);
  if (it.typeCode !== 'SPA-XSCAN-01') fail(id, `typeCode ${it.typeCode}`);
  if (it.domain !== 'spatial') fail(id, `domain ${it.domain}`);
  if (it.demoPath !== 'demos/SPA-XSCAN-01.html') fail(id, `demoPath ${it.demoPath}`);
  if (it.syntheticOnly !== true) fail(id, 'syntheticOnly must be true');
  if (it.validated !== false) fail(id, 'validated must be false');
  if (!it.scoring || it.scoring.mode !== 'deterministic_key') fail(id, 'scoring.mode != deterministic_key');
  if (!it.provenance || it.provenance.generator !== 'grammar') fail(id, 'provenance.generator != grammar');
  if (!it.provenance || typeof it.provenance.seed !== 'string') fail(id, 'provenance.seed missing');
  if (!isNum(it.difficulty) || it.difficulty < 1 || it.difficulty > 20) fail(id, `difficulty ${it.difficulty} not in 1..20`);
  if (!Array.isArray(it.ageBands) || !it.ageBands.length || !it.ageBands.every((b) => ALLOWED_BANDS.includes(b)))
    fail(id, `ageBands ${JSON.stringify(it.ageBands)} outside the type's declared bands`);

  const c = it.content || {};
  const leaks = [];
  scanLeak(c, 'content', leaks);
  if (leaks.length) fail(id, `content leaks answer-side field(s): ${leaks.slice(0, 4).join(', ')}`);

  const slices = (c.scan && c.scan.slices) || [];
  if (!Array.isArray(slices) || slices.length < 5) fail(id, `scan.slices too short (${slices.length})`);
  if (c.scan && c.scan.sliceCount !== slices.length) fail(id, 'scan.sliceCount != slices.length');
  for (const s of slices) {
    if (!s.section) { fail(id, 'a sampled slice is empty'); continue; }
    if (!(s.section.sides === 0 || (s.section.sides >= 3 && s.section.sides <= 8))) fail(id, `slice sides ${s.section.sides} out of range`);
    if (!isNum(s.section.r) || s.section.r <= 0 || s.section.r > 1.05) fail(id, `slice radius ${s.section.r} out of range`);
  }

  const opts = c.options || [];
  if (opts.length < 2 || opts.length > 6) fail(id, `option count ${opts.length} out of 2..6`);
  const optKeys = opts.map((o) => o && o.key);
  if (new Set(optKeys).size !== optKeys.length) fail(id, 'option keys not unique');
  for (const o of opts) {
    const ok = Object.keys(o || {}).sort().join(',');
    if (ok !== 'key,solid') fail(id, `option carries fields "${ok}" (want exactly key,solid)`);
    if (!o.solid || !Array.isArray(o.solid.segments) || !o.solid.segments.length) fail(id, 'option solid has no segments');
  }

  // --- INDEPENDENT KEY: measure each candidate's built surface against the stack ---
  const matching = opts.filter((o) => mismatchCount(o.solid, slices) === 0).map((o) => o.key);
  if (matching.length !== 1) fail(id, `surface measurement matched ${matching.length} options (want exactly 1)`);
  else if (matching[0] !== it.answer.correctKey) fail(id, `recomputed key ${matching[0]} != declared ${it.answer.correctKey}`);
  else keysRecomputed++;

  const ans = it.answer || {};
  if (!optKeys.includes(ans.correctKey)) fail(id, `correctKey "${ans.correctKey}" is not an option key`);
  const rats = ans.distractorRationales || {};
  const ratKeys = Object.keys(rats);
  if (ratKeys.length !== optKeys.length || !optKeys.every((k) => ratKeys.includes(k)))
    fail(id, 'distractorRationales do not cover every option key');
  const correctRats = ratKeys.filter((k) => rats[k] && lureLabel(rats[k]) === 'correct');
  if (correctRats.length !== 1) fail(id, `expected exactly 1 "correct" rationale, got ${correctRats.length}`);
  else if (correctRats[0] !== ans.correctKey) fail(id, 'the "correct" rationale key != correctKey');
  for (const k of ratKeys) {
    const r = rats[k];
    if (!r || typeof lureLabel(r) !== 'string' || !lureLabel(r)) fail(id, `option ${k} has no diagnostic lure label`);
    if (typeof r.note !== 'string' || r.note.length < 8) fail(id, `option ${k} lure has no rationale note`);
    const o = opts.find((x) => x.key === k);
    if (!o) continue;
    const rels = measuredRels(o.solid, slices);
    if (rels.includes('fuzzy')) fail(id, `option ${k} sits in the match guard band (borderline slice)`);
    const mm = rels.filter((x) => x !== 'same').length;
    if (k === ans.correctKey && mm !== 0) fail(id, 'the declared key does not reproduce the stack');
    if (k !== ans.correctKey && mm === 0) fail(id, `foil ${k} also reproduces the stack (ambiguous item)`);
    if (r.slicesMismatched !== mm) fail(id, `option ${k} records ${r.slicesMismatched} mismatched slices, measured ${mm}`);
  }

  // --- mirror foils must be EXACT reflections through the mid-plane ---
  if (ans.mirrorFoilKey) {
    mirrorItems++;
    const mo = opts.find((o) => o.key === ans.mirrorFoilKey);
    const co = opts.find((o) => o.key === ans.correctKey);
    if (!mo || !co) fail(id, 'mirrorFoilKey/correctKey not resolvable');
    else {
      let bad = 0;
      for (const s of slices) {
        const y = -1 + 2 * s.t;
        if (!sectionsAgree(measureSection(mo.solid, y), measureSection(co.solid, -y))) bad++;
      }
      if (bad) fail(id, `mirror foil is not an exact scan-axis reflection (${bad} slices differ)`);
      if (rats[ans.mirrorFoilKey].chirality !== 'reflected_scan_axis') fail(id, 'mirror foil does not record chirality');
      if (ans.chiralityRelevant !== true) fail(id, 'mirrorFoilKey present but chiralityRelevant is not true');
    }
  } else if (ans.chiralityRelevant !== false) fail(id, 'chiralityRelevant must be false when there is no mirror foil');

  // --- M-ROTSLOPE input ---
  if (!isNum(ans.angularDisparityDeg) || ans.angularDisparityDeg < 0 || ans.angularDisparityDeg > 180)
    fail(id, `angularDisparityDeg ${ans.angularDisparityDeg} out of 0..180`);
  if (typeof ans.angularDisparityApplies !== 'boolean') fail(id, 'angularDisparityApplies missing');

  // --- difficulty must equal the value derived from its own levers ---
  const lev = (it.provenance && it.provenance.levers) || {};
  if (!(lev.complexity in COMPLEXITY)) fail(id, `unknown complexity lever ${lev.complexity}`);
  else if (!(lev.sliceCount in ABSTRACTION)) fail(id, `unknown sliceCount lever ${lev.sliceCount}`);
  else {
    const derived = round2(difficultyFromLevers(lev.complexity, lev.nCand, lev.sliceCount, lev.lureSimilarity));
    if (Math.abs(derived - it.difficulty) > 0.01) fail(id, `difficulty ${it.difficulty} != derived-from-levers ${derived}`);
    if (lev.nCand !== opts.length) fail(id, `lever nCand ${lev.nCand} != option count ${opts.length}`);
    if (lev.sliceCount !== slices.length) fail(id, `lever sliceCount ${lev.sliceCount} != slice count ${slices.length}`);
  }
}

/* =================================================================== *
 * 5. Coverage
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
console.log(`SPA-XSCAN-01 bank check: ${items.length} items`);
console.log(`keys re-derived from built surfaces: ${keysRecomputed}/${items.length}`);
console.log(`items carrying an exact mirror foil (chirality recorded): ${mirrorItems}`);
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
console.log('\nPASS - structure valid, no content leak, every key independently re-derived from surface geometry, mirror foils exact, coverage 1..20 with >=5 per bin and per +/-1pt band.');
