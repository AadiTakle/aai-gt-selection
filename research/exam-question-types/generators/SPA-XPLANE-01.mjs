// SPA-XPLANE-01 "Place the Slice" — structured bank generator (Bucket A: grammar).
//
// Emits a STRUCTURED item bank (JSONL) conforming to EXAM_ADAPTIVE_BUILD_PLAN.md §2
// (BankItem) and EXAM_ITEM_SCHEMA_SPEC.md. Born-synthetic: syntheticOnly=true,
// validated=false. Deterministic given the seed strings below.
//
// This is an INVERSE-CONSTRUCTION type, not a pick-one: the child is shown the
// 2D outline they must produce and slides/tilts/twists a cutting plane through a
// 3D solid until the cut face matches it. The response is therefore a POSITIONED,
// TILTED PLANE, and scoring.mode is 'computed_solver' with an accepted-tolerance
// rule the server can apply deterministically:
//
//   correct iff  vertexCount(section(solid, submittedPlane)) == answer.vertexCount
//           AND  shapeDistance(section, answer.targetSignature) <= answer.shapeToleranceRms
//
// shapeDistance is translation-invariant (centroids aligned) and in-plane
// rotation-invariant (closed-form Procrustes rotation, minimised over cyclic
// vertex shifts) but SCALE- and CHIRALITY-SENSITIVE: a mirror image of the target
// is NOT accepted. Responses are quantised to content.controls.step, so the whole
// accepted set is a finite, enumerable grid and the check is exactly reproducible.
// Each item records `acceptFraction` — the share of reachable plane settings that
// pass — which is what keeps "scrub until it looks right" from working.
//
// Difficulty (FLOAT 1..20, a DESIGN rung, not a calibrated IRT parameter) derives
// from the declared difficulty_levers (master_types.jsonl SPA-XPLANE-01): solid
// type, number of plane degrees of freedom, distance from the obvious axis-aligned
// cut (plane obliquity), and match tolerance.
//
// Run:  node research/exam-question-types/generators/SPA-XPLANE-01.mjs
//       writes ../banks/SPA-XPLANE-01.jsonl and prints a coverage summary.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../banks/SPA-XPLANE-01.jsonl');
const TYPE_CODE = 'SPA-XPLANE-01';
const DOMAIN = 'spatial';
const GENERATOR_REF = 'spa-xplane-01-grammar@1';
const DEMO_PATH = 'demos/SPA-XPLANE-01.html';

/* ------------------------------------------------------------------ *
 * Seeded RNG + seeded uuid
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
const makeRng = (seed) => mulberry32(xmur3(seed)());
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
const round4 = (x) => Math.round(x * 1e4) / 1e4;
const round6 = (x) => Math.round(x * 1e6) / 1e6;

/* ================================================================== *
 * SOLID LIBRARY — plain polyhedral meshes (verts + face index loops).
 * y is the vertical axis the height slider travels along.
 * ================================================================== */
const V = (x, y, z) => [round4(x), round4(y), round4(z)];
function prismN(n, r, skew = 0) {
  const verts = [];
  for (const y of [-1, 1])
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      verts.push(V(r * Math.cos(a) + (y > 0 ? skew : 0), y, r * Math.sin(a)));
    }
  const faces = [[...Array(n).keys()].reverse(), [...Array(n).keys()].map((i) => i + n)];
  for (let i = 0; i < n; i++) faces.push([i, (i + 1) % n, ((i + 1) % n) + n, i + n]);
  return { verts, faces };
}
function frustumN(n, r0, r1) {
  const verts = [];
  for (const [y, r] of [[-1, r0], [1, r1]])
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      verts.push(V(r * Math.cos(a), y, r * Math.sin(a)));
    }
  const faces = [[...Array(n).keys()].reverse(), [...Array(n).keys()].map((i) => i + n)];
  for (let i = 0; i < n; i++) faces.push([i, (i + 1) % n, ((i + 1) % n) + n, i + n]);
  return { verts, faces };
}
export const SOLIDS = {
  cube: {
    verts: [V(-1, -1, -1), V(1, -1, -1), V(1, 1, -1), V(-1, 1, -1), V(-1, -1, 1), V(1, -1, 1), V(1, 1, 1), V(-1, 1, 1)],
    faces: [[0, 1, 2, 3], [4, 7, 6, 5], [0, 4, 5, 1], [3, 2, 6, 7], [1, 5, 6, 2], [0, 3, 7, 4]],
  },
  pyramid: {
    verts: [V(-1, -1, -1), V(1, -1, -1), V(1, -1, 1), V(-1, -1, 1), V(0, 1.25, 0)],
    faces: [[0, 1, 2, 3], [0, 4, 1], [1, 4, 2], [2, 4, 3], [3, 4, 0]],
  },
  tetra: {
    verts: [V(0, 1.25, 0), V(-1, -0.9, -0.8), V(1, -0.9, -0.8), V(0, -0.9, 1.1)],
    faces: [[0, 1, 2], [0, 2, 3], [0, 3, 1], [1, 3, 2]],
  },
  prism3: prismN(3, 1),
  prism5: prismN(5, 1),
  prism6: prismN(6, 1),
  frustum4: frustumN(4, 1.25, 0.1),
  obliquePrism: prismN(4, 1, 0.55),
  octa: {
    verts: [V(0, 1.3, 0), V(0, -1.3, 0), V(1, 0, 0), V(0, 0, 1), V(-1, 0, 0), V(0, 0, -1)],
    faces: [[0, 2, 3], [0, 3, 4], [0, 4, 5], [0, 5, 2], [1, 3, 2], [1, 4, 3], [1, 5, 4], [1, 2, 5]],
  },
  // A cube with one corner truncated: the cross-section family changes with
  // height, which is what makes the top band genuinely hard.
  cutcube: {
    verts: [V(-1, -1, -1), V(1, -1, -1), V(1, 1, -1), V(-1, 1, -1), V(-1, -1, 1), V(1, -1, 1), V(-1, 1, 1),
      V(1, 1, 0), V(1, 0, 1), V(0, 1, 1)],
    faces: [[0, 1, 2, 3], [4, 6, 9, 8, 5], [0, 4, 5, 1], [3, 2, 7, 9, 6], [1, 5, 8, 7, 2], [0, 3, 6, 4], [7, 8, 9]],
  },
};
// Solids whose cross-section changes with height even at zero tilt: required
// when the height slider is the only active control.
const TAPERING = ['pyramid', 'tetra', 'frustum4', 'octa', 'cutcube'];

/* ---- vector helpers ---- */
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const n = Math.hypot(...a) || 1; return [a[0] / n, a[1] / n, a[2] / n]; };

/* ================================================================== *
 * PLANE MODEL — the renderer, the generator and the server all use this.
 * It is published verbatim in content.planeModel.
 * ================================================================== */
export const PLANE_MODEL = {
  controlRange: [0, 100],
  tiltMaxRad: round6(Math.PI * 0.37),
  twistMaxRad: round6(Math.PI),
  offsetBase: 0.08,
  offsetSpan: 0.84,
  normalFormula: 'a = tilt/100*tiltMaxRad; b = twist/100*twistMaxRad; n = unit(sin a*cos b, cos a, sin a*sin b)',
  offsetFormula: 'ds = solid.verts . n; d = min(ds) + (offsetBase + offsetSpan*height/100)*(max(ds)-min(ds))',
};
function basisFor(n) {
  const ref = Math.abs(n[1]) < 0.88 ? [0, 1, 0] : [1, 0, 0];
  const u = norm(cross(n, ref));
  const v = norm(cross(n, u)); // (u, v, n) is right-handed, so chirality is well defined
  return { u, v };
}
export function planeFor(solid, h, t, w) {
  const a = (t / 100) * PLANE_MODEL.tiltMaxRad;
  const b = (w / 100) * PLANE_MODEL.twistMaxRad;
  const n = norm([Math.sin(a) * Math.cos(b), Math.cos(a), Math.sin(a) * Math.sin(b)]);
  const ds = solid.verts.map((p) => dot(n, p));
  const lo = Math.min(...ds);
  const hi = Math.max(...ds);
  const d = lo + (PLANE_MODEL.offsetBase + PLANE_MODEL.offsetSpan * (h / 100)) * (hi - lo);
  return { n, d, ...basisFor(n) };
}
function edgesOf(solid) {
  const seen = new Set();
  const out = [];
  for (const f of solid.faces)
    f.forEach((a, i) => {
      const b = f[(i + 1) % f.length];
      const k = a < b ? `${a},${b}` : `${b},${a}`;
      if (!seen.has(k)) { seen.add(k); out.push([a, b]); }
    });
  return out;
}
// Cross-section: intersect every edge with the plane, de-duplicate, then order
// the hit points counter-clockwise in the plane's own right-handed (u,v) frame.
export function section(solid, pl) {
  const pts = [];
  for (const [ia, ib] of edgesOf(solid)) {
    const A = solid.verts[ia];
    const B = solid.verts[ib];
    const da = dot(pl.n, A) - pl.d;
    const db = dot(pl.n, B) - pl.d;
    if (Math.abs(da) < 1e-9) pts.push(A);
    if (Math.abs(db) < 1e-9) pts.push(B);
    if (da * db < -1e-12) pts.push(add(A, mul(sub(B, A), da / (da - db))));
  }
  const uniq = [];
  for (const p of pts) if (!uniq.some((q) => Math.hypot(...sub(p, q)) < 1e-6)) uniq.push(p);
  if (uniq.length < 3) return [];
  const c = mul(uniq.reduce(add, [0, 0, 0]), 1 / uniq.length);
  return uniq.sort(
    (a, b) =>
      Math.atan2(dot(sub(a, c), pl.v), dot(sub(a, c), pl.u)) - Math.atan2(dot(sub(b, c), pl.v), dot(sub(b, c), pl.u)),
  );
}
// Centroid-centred 2D outline in the plane frame (no scaling: size counts).
export function outlineOf(poly, pl) {
  if (poly.length < 3) return [];
  const q = poly.map((p) => [dot(p, pl.u), dot(p, pl.v)]);
  const cx = q.reduce((s, p) => s + p[0], 0) / q.length;
  const cy = q.reduce((s, p) => s + p[1], 0) / q.length;
  return q.map((p) => [round6(p[0] - cx), round6(p[1] - cy)]);
}
// Rotation-invariant, scale- and chirality-SENSITIVE shape distance.
export function shapeDistance(A, B) {
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
    const cth = Math.cos(th);
    const sth = Math.sin(th);
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const a = A[i];
      const b = B[(i + k) % n];
      const rx = b[0] * cth - b[1] * sth;
      const ry = b[0] * sth + b[1] * cth;
      sum += (a[0] - rx) ** 2 + (a[1] - ry) ** 2;
    }
    best = Math.min(best, Math.sqrt(sum / n));
  }
  return best;
}
export const reflectOutline = (P) => P.map((p) => [p[0], -p[1]]).reverse();

/* ---- naming the target so the child can read what to make (D-017) ---- */
function shapeWord(outline) {
  const n = outline.length;
  if (n === 3) return 'triangle';
  if (n === 5) return 'pentagon';
  if (n === 6) return 'hexagon';
  if (n === 7) return 'seven-sided shape';
  if (n >= 8) return 'many-sided shape';
  if (n === 4) {
    const s = outline.map((p, i) => Math.hypot(p[0] - outline[(i + 1) % 4][0], p[1] - outline[(i + 1) % 4][1]));
    const eq = Math.max(...s) - Math.min(...s) < 0.08 * Math.max(...s);
    const opp = Math.abs(s[0] - s[2]) < 0.08 * Math.max(...s) && Math.abs(s[1] - s[3]) < 0.08 * Math.max(...s);
    let square = eq;
    if (eq || opp) {
      // right angles?
      for (let i = 0; i < 4; i++) {
        const a = sub2(outline[(i + 1) % 4], outline[i]);
        const b = sub2(outline[(i + 2) % 4], outline[(i + 1) % 4]);
        if (Math.abs(a[0] * b[0] + a[1] * b[1]) > 0.12 * Math.hypot(...a) * Math.hypot(...b)) { square = false; break; }
      }
      if (square && eq) return 'square';
      if (square) return 'rectangle';
    }
    return 'four-sided shape';
  }
  return 'shape';
}
const sub2 = (a, b) => [a[0] - b[0], a[1] - b[1]];

/* ================================================================== *
 * DIFFICULTY MODEL
 * ================================================================== */
export const COMPLEXITY = { simple: 0.0, prism: 1.2, complex: 2.2, composite: 3.4 };
export const CLASS_SOLIDS = {
  simple: ['cube', 'pyramid', 'tetra'],
  prism: ['prism3', 'prism5', 'frustum4'],
  complex: ['prism6', 'octa', 'obliquePrism'],
  composite: ['cutcube'],
};
const DOF_TERM = { 1: 0.0, 2: 1.6, 3: 3.0 };
const OBLIQUITY_TERM = 2.4; // scaled by tiltLever/100
const TIGHT_SPAN = 4.2;

const rawScore = (complexity, dof, tiltLever, tight) =>
  1.0 + COMPLEXITY[complexity] + DOF_TERM[dof] + OBLIQUITY_TERM * (tiltLever / 100) + TIGHT_SPAN * tight;
const RAW_MIN = rawScore('simple', 1, 0, 0);
const RAW_MAX = rawScore('composite', 3, 100, 1);

export function difficultyFromLevers(complexity, dof, tiltLever, tight) {
  const r = rawScore(complexity, dof, tiltLever, tight);
  return clamp(1 + ((r - RAW_MIN) * 19) / (RAW_MAX - RAW_MIN), 1, 20);
}
function solveTight(complexity, dof, tiltLever, targetD) {
  const rawNeeded = RAW_MIN + ((targetD - 1) * (RAW_MAX - RAW_MIN)) / 19;
  return clamp((rawNeeded - rawScore(complexity, dof, tiltLever, 0)) / TIGHT_SPAN, 0, 1);
}
// The match-tolerance lever, in the same units as shapeDistance.
export const toleranceFor = (tight) => round4(0.3 - 0.26 * tight);
// A hard item must not be reachable by scrubbing: the share of reachable plane
// settings that pass has to fall as the rung rises. An easy item is allowed a
// generous accepted region -- that is what makes it easy -- but the ceiling
// items have to be found, not stumbled into.
export const maxAcceptFractionFor = (difficulty) => round4(clamp(0.85 - 0.043 * difficulty, 0.03, 0.85));

/* ---- the response grid: every reachable (and therefore checkable) setting ---- */
export const STEP = { height: 5, tilt: 10, twist: 10 };
const gridValues = (step) => {
  const out = [];
  for (let v = 0; v <= 100 + 1e-9; v += step) out.push(round2(v));
  return out;
};
export function acceptSweep(solid, dof, target, targetOutline, tol) {
  const hs = gridValues(STEP.height);
  const ts = dof >= 2 ? gridValues(STEP.tilt) : [target.t];
  const ws = dof >= 3 ? gridValues(STEP.twist) : [target.w];
  let total = 0;
  let pass = 0;
  for (const h of hs)
    for (const t of ts)
      for (const w of ws) {
        total++;
        const pl = planeFor(solid, h, t, w);
        const o = outlineOf(section(solid, pl), pl);
        if (o.length === targetOutline.length && shapeDistance(o, targetOutline) <= tol) pass++;
      }
  return { total, pass, fraction: round6(pass / total) };
}

/* ---- age bands: the type's declared bands only (4-5 | 6-8; floor at 4-5) ---- */
export function ageBandsFor(difficulty) {
  if (difficulty < 8.5) return ['4-5'];
  if (difficulty < 13.5) return ['4-5', '6-8'];
  return ['6-8'];
}

/* ================================================================== *
 * ITEM BUILDER
 * ================================================================== */
const LURE_NOTES = {
  axis_aligned_default: 'the obvious straight cut at the same height: the knife was never tilted',
  cut_too_low: 'the right angle of cut, stopped short below the target height',
  cut_too_high: 'the right angle of cut, pushed past the target height',
  under_tilted: 'tilted, but not far enough: the cut face stops short of the target outline',
  over_tilted: 'tilted past the target: the cut face runs off the wrong faces of the solid',
  mirrored_twist: 'the same tilt turned the other way: the cut face is the mirror image of the target',
  wrong_twist: 'right height and tilt, plane turned about the wrong axis',
};

// Walk outward along the height slider until the cut stops being accepted, so a
// "wrong height" lure sits just outside the band rather than at a fixed offset
// that might still pass. Returns null when the band runs to the end of the slider.
function outsideHeight(solid, target, outline, tol, dir) {
  for (let h = target.h + dir * STEP.height; h >= 0 && h <= 100; h += dir * STEP.height) {
    const pl = planeFor(solid, h, target.t, target.w);
    const o = outlineOf(section(solid, pl), pl);
    if (o.length !== outline.length || shapeDistance(o, outline) > tol) return h;
  }
  return null;
}

export function genItem({ complexity, dof, tiltLever, tight, seed }) {
  const rng = makeRng(seed);
  const tol = toleranceFor(tight);
  const provisionalD = round2(difficultyFromLevers(complexity, dof, tiltLever, tight));
  const maxFrac = maxAcceptFractionFor(provisionalD);

  let solidNames = CLASS_SOLIDS[complexity];
  if (dof === 1) solidNames = solidNames.filter((s) => TAPERING.includes(s));
  if (!solidNames.length) throw new Error(`no tapering solid in class ${complexity} for dof=1`);

  const hCandidates = shuffle(gridValues(STEP.height).filter((h) => h >= 15 && h <= 85), rng);
  const wCandidates = dof >= 3 ? shuffle(gridValues(STEP.twist).filter((w) => w > 0 && w < 100), rng) : [0];

  // Interleave the candidate (solid, twist, height) triples before sampling, so
  // the sweep budget is spread over every solid in the class rather than spent
  // exhausting the first one.
  const combos = [];
  for (const name of solidNames) for (const w of wCandidates) for (const h of hCandidates) combos.push({ name, w, h });
  let chosen = null;
  let sweeps = 0;
  for (const { name, w, h } of shuffle(combos, rng)) {
    if (sweeps >= 40) break;
    const solid = SOLIDS[name];
    const target = { h, t: tiltLever, w };
    const pl = planeFor(solid, target.h, target.t, target.w);
    const poly = section(solid, pl);
    if (poly.length < 3 || poly.length > 8) continue;
    // Reject degenerate cuts (a vertex-grazing plane makes a hairline edge).
    let degenerate = false;
    for (let i = 0; i < poly.length; i++)
      if (Math.hypot(...sub(poly[i], poly[(i + 1) % poly.length])) < 0.06) degenerate = true;
    if (degenerate) continue;
    const outline = outlineOf(poly, pl);
    sweeps++;
    const sweep = acceptSweep(solid, dof, target, outline, tol);
    if (sweep.pass === 0 || sweep.fraction > maxFrac) continue;
    // The accepted height band must have a rejected setting on both sides, or
    // the item cannot diagnose "cut too low" versus "cut too high".
    if (outsideHeight(solid, target, outline, tol, -1) === null) continue;
    if (outsideHeight(solid, target, outline, tol, 1) === null) continue;
    chosen = { name, solid, target, poly, outline, sweep };
    break;
  }
  if (!chosen) throw new Error(`no target plane satisfies the accept budget for ${JSON.stringify({ complexity, dof, tiltLever, tight: round4(tight) })}`);

  const { name, solid, target, outline, sweep } = chosen;

  // Chirality: is a mirror image of this cut face rejected? (M-MIRRORFA)
  const mirrorDistance = round6(shapeDistance(outline, reflectOutline(outline)));
  const mirrorDiscriminates = mirrorDistance > tol;

  // Named error placements, each verified to fall OUTSIDE the accepted band.
  const onGrid = (v, step) => clamp(Math.round(v / step) * step, 0, 100);
  const lowH = outsideHeight(solid, target, outline, tol, -1);
  const highH = outsideHeight(solid, target, outline, tol, 1);
  const candidates = [
    ['axis_aligned_default', { h: target.h, t: 0, w: target.w }],
    ...(lowH === null ? [] : [['cut_too_low', { h: lowH, t: target.t, w: target.w }]]),
    ...(highH === null ? [] : [['cut_too_high', { h: highH, t: target.t, w: target.w }]]),
    ['under_tilted', { h: target.h, t: onGrid(Math.max(0, target.t - 30), STEP.tilt), w: target.w }],
    ['over_tilted', { h: target.h, t: onGrid(Math.min(100, target.t + 30), STEP.tilt), w: target.w }],
    ['mirrored_twist', { h: target.h, t: target.t, w: onGrid(100 - target.w, STEP.twist) }],
  ];
  const distractorRationales = {
    PLANE: {
      lure: 'correct',
      note: 'the cut face this plane produces is the target outline',
      plane: { ...target },
      shapeDistance: 0,
    },
  };
  let nLures = 0;
  for (const [rawLure, p] of candidates) {
    if (p.h === target.h && p.t === target.t && p.w === target.w) continue;
    if (dof < 2 && p.t !== target.t) continue; // an unreachable control cannot be an error
    if (dof < 3 && p.w !== target.w) continue;
    const pl = planeFor(solid, p.h, p.t, p.w);
    const o = outlineOf(section(solid, pl), pl);
    const dist = o.length === outline.length ? round6(shapeDistance(o, outline)) : null;
    if (dist !== null && dist <= tol) continue; // it would be accepted: not an error at all
    let lure = rawLure;
    const reflected = o.length === outline.length ? round6(shapeDistance(o, reflectOutline(outline))) : null;
    if (rawLure === 'mirrored_twist' && !(reflected !== null && reflected <= tol)) lure = 'wrong_twist';
    if (lure in distractorRationales) continue;
    distractorRationales[lure] = {
      lure,
      note: LURE_NOTES[lure],
      plane: p,
      vertexCount: o.length,
      shapeDistance: dist,
      ...(lure === 'mirrored_twist'
        ? { chirality: 'reflected_cut_face', exactMirror: true, reflectedShapeDistance: reflected }
        : {}),
    };
    nLures++;
  }
  if (nLures < 2) throw new Error(`only ${nLures} diagnostic error placements for ${seed}`);

  // Obliquity of the target cut relative to the solid's own axis: the angular
  // disparity the child has to imagine away (M-ROTSLOPE input).
  const tpl = planeFor(solid, target.h, target.t, target.w);
  const angularDisparityDeg = Math.round((Math.acos(clamp(Math.abs(tpl.n[1]), -1, 1)) * 180) / Math.PI);

  // Start the controls on the reachable setting that is furthest from the answer
  // and NOT itself accepted, so the item is a construction, not a confirmation.
  const startPlane = (() => {
    const hs = gridValues(STEP.height);
    const ts = dof >= 2 ? gridValues(STEP.tilt) : [target.t];
    const ws = dof >= 3 ? gridValues(STEP.twist) : [target.w];
    let best = null;
    let bestScore = -1;
    for (const h of hs)
      for (const t of ts)
        for (const w of ws) {
          const score = Math.abs(h - target.h) + Math.abs(t - target.t) + Math.abs(w - target.w);
          if (score <= bestScore) continue;
          const pl = planeFor(solid, h, t, w);
          const o = outlineOf(section(solid, pl), pl);
          if (o.length === outline.length && shapeDistance(o, outline) <= tol) continue;
          best = { h, t, w };
          bestScore = score;
        }
    return best || { h: target.h, t: target.t, w: target.w };
  })();
  const difficulty = provisionalD;
  const word = shapeWord(outline);

  return {
    itemId: seededUuid(seed),
    typeCode: TYPE_CODE,
    domain: DOMAIN,
    difficulty,
    ageBands: ageBandsFor(difficulty),
    demoPath: DEMO_PATH,
    content: {
      typeCode: TYPE_CODE,
      question: {
        mode: 'place_plane',
        prompt: 'Slide and tilt the cutting plane until the face it cuts matches the outline shown, then send it.',
      },
      solid: { id: name, verts: solid.verts.map((v) => v.slice()), faces: solid.faces.map((f) => f.slice()) },
      planeModel: { ...PLANE_MODEL },
      controls: {
        height: true,
        tilt: dof >= 2,
        twist: dof >= 3,
        step: { ...STEP },
        // Inactive controls simply stay wherever startPlane puts them; nothing
        // else about the keyed plane appears in the served content.
        startPlane,
      },
      target: { vertexCount: outline.length, shapeWord: word, outline: outline.map((p) => p.slice()) },
      scaffold: { warmup: difficulty <= 7, showLivePreview: true },
    },
    answer: {
      correctKey: 'PLANE',
      correctPlane: { ...target },
      vertexCount: outline.length,
      targetSignature: outline.map((p) => p.slice()),
      shapeToleranceRms: tol,
      acceptFraction: sweep.fraction,
      acceptedSettings: sweep.pass,
      reachableSettings: sweep.total,
      mirrorDistance,
      mirrorFoilDiscriminates: mirrorDiscriminates,
      chiralityRelevant: mirrorDiscriminates,
      angularDisparityDeg,
      angularDisparityApplies: true,
      distractorRationales,
      relation: 'submitted_plane_cuts_the_target_outline',
    },
    scoring: {
      mode: 'computed_solver',
      solver: 'cross_section_shape_match',
      rule:
        'p = planeFor(content.solid, response.plane.h, response.plane.t, response.plane.w) using content.planeModel; ' +
        'o = outlineOf(section(content.solid, p), p); ' +
        'correct iff o.length === answer.vertexCount AND shapeDistance(o, answer.targetSignature) <= answer.shapeToleranceRms. ' +
        'shapeDistance minimises RMS vertex distance over cyclic shifts after the closed-form Procrustes rotation; it is ' +
        'scale- and chirality-sensitive, so a mirror image of the target is rejected. Responses are quantised to ' +
        'content.controls.step, so the accepted set is finite and the verdict is exactly reproducible.',
      shapeToleranceRms: tol,
      responseField: 'plane',
      partialCreditMetric: 'M-POLY',
      partialCredit: 'M-POLY = shapeDistance(o, answer.targetSignature); lower is closer.',
    },
    provenance: {
      generator: 'grammar',
      generatorRef: GENERATOR_REF,
      seed,
      levers: { complexity, dof, tiltLever, tight },
      solidId: name,
    },
    syntheticOnly: true,
    validated: false,
  };
}

/* ================================================================== *
 * BANK BUILDER
 * ================================================================== */
export const ALLOWED_CONFIGS = [];
for (const complexity of Object.keys(COMPLEXITY))
  for (const dof of [1, 2, 3])
    // Tilt settings sit on the response grid (STEP.tilt), so the keyed plane is
    // always a setting the child can actually reach.
    for (const tiltLever of [0, 20, 40, 60, 80, 100]) {
      if (dof === 1 && tiltLever !== 0) continue; // tilt disabled means no oblique target
      if (dof === 1 && !CLASS_SOLIDS[complexity].some((s) => TAPERING.includes(s))) continue;
      if (dof >= 2 && tiltLever === 0) continue; // an enabled tilt slider should matter
      ALLOWED_CONFIGS.push({ complexity, dof, tiltLever });
    }

export function buildBank({ perBin = 7 } = {}) {
  const items = [];
  for (let k = 1; k <= 20; k++) {
    const lo = Math.max(1, k - 0.44);
    const hi = Math.min(20, k + 0.44);
    const segments = [];
    for (const cfg of ALLOWED_CONFIGS) {
      const dLo = difficultyFromLevers(cfg.complexity, cfg.dof, cfg.tiltLever, 0);
      const dHi = difficultyFromLevers(cfg.complexity, cfg.dof, cfg.tiltLever, 1);
      const a = Math.max(lo, dLo);
      const b = Math.min(hi, dHi);
      if (b > a + 1e-6) segments.push({ ...cfg, tLo: a, tHi: b });
    }
    if (!segments.length) throw new Error(`no reachable lever config for difficulty bin k=${k}`);
    const hits = segments.map(() => 0);
    for (let i = 0; i < perBin; i++) hits[i % segments.length]++;
    const localSeen = segments.map(() => 0);
    for (let i = 0; i < perBin; i++) {
      const si = i % segments.length;
      const s = segments[si];
      const li = localSeen[si]++;
      const t = s.tLo + (s.tHi - s.tLo) * ((li + 0.5) / hits[si]);
      const tight = solveTight(s.complexity, s.dof, s.tiltLever, t);
      const seed = `${TYPE_CODE}|bin=${k}|i=${i}|${s.complexity}|DOF${s.dof}|T${s.tiltLever}`;
      items.push(genItem({ complexity: s.complexity, dof: s.dof, tiltLever: s.tiltLever, tight, seed }));
    }
  }
  return items;
}

/* ------------------------------------------------------------------ *
 * CLI entrypoint
 * ------------------------------------------------------------------ */
function isMain() {
  return process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
}
if (isMain()) {
  const items = buildBank({ perBin: Number(process.env.PER_BIN || 7) });
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, items.map((it) => JSON.stringify(it)).join('\n') + '\n');

  const bins = Array.from({ length: 20 }, () => 0);
  let min = Infinity;
  let max = -Infinity;
  let chiral = 0;
  let maxFrac = 0;
  const shapes = {};
  for (const it of items) {
    const k = Math.round(it.difficulty);
    if (k >= 1 && k <= 20) bins[k - 1]++;
    min = Math.min(min, it.difficulty);
    max = Math.max(max, it.difficulty);
    if (it.answer.chiralityRelevant) chiral++;
    maxFrac = Math.max(maxFrac, it.answer.acceptFraction);
    shapes[it.content.target.shapeWord] = (shapes[it.content.target.shapeWord] || 0) + 1;
  }
  console.log(`${TYPE_CODE} bank: ${items.length} items -> ${OUT}`);
  console.log(`difficulty span: ${round2(min)} .. ${round2(max)}  (target 1..20)`);
  console.log(`scoring mode: computed_solver (accepted-tolerance rule) for all ${items.length} items`);
  console.log(`items where a mirrored cut face is rejected (chirality matters): ${chiral}`);
  console.log(`largest accept fraction across the bank: ${round4(maxFrac)}`);
  console.log('target shapes: ' + JSON.stringify(shapes));
  console.log('per-bin counts (k:n):  ' + bins.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
  const short = bins.map((n, i) => ({ k: i + 1, n })).filter((b) => b.n < 5 && b.k <= 19);
  console.log(short.length ? `SHORT BINS (<5): ${short.map((b) => b.k).join(',')}` : 'all bins 1..19 >=5 OK');
}
