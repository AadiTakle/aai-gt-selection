// SPA-XSCAN-01 "Scan Stacker" — structured bank generator (Bucket A: grammar).
//
// Emits a STRUCTURED item bank (JSONL) conforming to EXAM_ADAPTIVE_BUILD_PLAN.md §2
// (BankItem) and EXAM_ITEM_SCHEMA_SPEC.md. Born-synthetic: syntheticOnly=true,
// validated=false. Deterministic given the seed strings below.
//
// The child scrubs a stack of horizontal cross-sections taken through a hidden
// solid and picks which candidate 3D solid would produce that exact slice stack.
// The key is COMPUTED, never authored: every candidate's slice stack is sampled
// from its own geometry and compared against the shown stack; exactly one
// candidate reproduces it and that candidate is the declared correctKey.
//
// Difficulty (FLOAT 1..20, a DESIGN rung — not a calibrated IRT parameter) is
// derived from the type's declared difficulty_levers (master_types.jsonl
// SPA-XSCAN-01): solid complexity, candidate count, candidate similarity, how
// much the slice changes with height, and how abstract the slice stack is
// (fewer sampled slices + no height scale = more interpolation).
//
// Run:  node research/exam-question-types/generators/SPA-XSCAN-01.mjs
//       writes ../banks/SPA-XSCAN-01.jsonl and prints a coverage summary.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serializeBank } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../banks/SPA-XSCAN-01.jsonl');
const TYPE_CODE = 'SPA-XSCAN-01';
const DOMAIN = 'spatial';
const GENERATOR_REF = 'spa-xscan-01-grammar@1';
const DEMO_PATH = 'demos/SPA-XSCAN-01.html';
const OPT_KEYS = ['A', 'B', 'C', 'D', 'E', 'F'];

/* ------------------------------------------------------------------ *
 * Seeded RNG (xmur3 -> mulberry32) + seeded uuid, for a reproducible bank.
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
/* ------------------------------------------------------------------ *
 * KEY-POSITION BALANCE (E-073)
 * Shuffling every item's candidates independently still leaves the correct
 * key's POSITION uneven over the bank, and an uneven pseudo-guessing floor
 * inflates low-ability accuracy (M-ACC) and makes raw accuracy non-comparable
 * across types. The bank builder hands each item a target slot and the item
 * seats its correct candidate there. The candidate SET, the foils and the
 * difficulty levers are untouched.
 *
 * Slots are allocated uniformly WITHIN each candidate-count stratum first and
 * only then balanced across the whole bank. Candidate count is itself a
 * difficulty lever, so balancing the pooled key counts alone would make the
 * last slot of the longer items almost always correct — a larger exploit than
 * the one being fixed.
 * ------------------------------------------------------------------ */
function makeSlotAllocator(maxSlots) {
  const globalUse = new Array(maxSlots).fill(0);
  const byOptionCount = new Map();
  let tick = 0;
  return (n) => {
    if (!byOptionCount.has(n)) byOptionCount.set(n, new Array(n).fill(0));
    const localUse = byOptionCount.get(n);
    let best = tick % n;
    for (let k = 1; k < n; k++) {
      const i = (tick + k) % n;
      if (localUse[i] < localUse[best] || (localUse[i] === localUse[best] && globalUse[i] < globalUse[best])) best = i;
    }
    tick++;
    localUse[best]++;
    globalUse[best]++;
    return best;
  };
}
// Seat the correct entry of an already-shuffled list at `slot`, leaving the
// foils in their shuffled relative order. `slot` is either a resolved index or
// the allocator callback, which is handed this item's candidate count.
function seatCorrect(list, isCorrect, slot) {
  const ci = list.findIndex(isCorrect);
  const at = typeof slot === 'function' ? slot(list.length) : slot;
  if (ci < 0 || !Number.isInteger(at) || at < 0 || at >= list.length) return { list, slot: ci };
  const rest = list.filter((_, i) => i !== ci);
  return { list: [...rest.slice(0, at), list[ci], ...rest.slice(at)], slot: at };
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

/* ================================================================== *
 * SOLID MODEL — renderer-agnostic "axial stack".
 *
 * A solid spans the scan axis y in [-1, 1] and is a list of segments.
 * Each segment covers [y0, y1] and has:
 *   sides  : 0 = circular cross-section, n>=3 = regular n-gon cross-section
 *   rotDeg : polygon orientation (ignored when sides === 0)
 *   r0, r1 : circumradius at y0 and y1
 *   curv   : optional parabolic bulge added to the linear radius ramp
 *   arc    : optional {yc, R} circular meridian (sphere-like), overrides r0/r1
 * Cross-section at height y is therefore fully determined by geometry alone.
 * Segment boundaries are placed OFF the sampled heights (see SAMPLE_GUARD).
 * ================================================================== */
const TINY_R = 0.03; // apex radius: a true point is degenerate to render/compare

function seg(y0, y1, sides, r0, r1, extra = {}) {
  const s = { y0: round4(y0), y1: round4(y1), sides, rotDeg: extra.rotDeg || 0, r0: round4(r0), r1: round4(r1) };
  if (extra.curv) s.curv = round4(extra.curv);
  if (extra.arc) s.arc = { yc: round4(extra.arc.yc), R: round4(extra.arc.R) };
  return s;
}
const solidOf = (segments) => ({ axis: 'y', axisRange: [-1, 1], segments });

// Boundaries used by multi-segment solids; chosen to never coincide with a
// sampled height for sliceCount in {5,7,9} (all of which sample y=0).
const B_LOW = -0.3;
const B_MID = 0.1;
const B_HIGH = 0.45;

export const SOLID = {
  cylinder: (r) => solidOf([seg(-1, 1, 0, r, r)]),
  coneUp: (r) => solidOf([seg(-1, 1, 0, r, TINY_R)]),
  coneDown: (r) => solidOf([seg(-1, 1, 0, TINY_R, r)]),
  sphere: () => solidOf([seg(-1, 1, 0, 0, 0, { arc: { yc: 0, R: 1 } })]),
  frustum: (r0, r1) => solidOf([seg(-1, 1, 0, r0, r1)]),
  barrel: (r, curv) => solidOf([seg(-1, 1, 0, r, r, { curv })]),
  prism: (n, r, rotDeg) => solidOf([seg(-1, 1, n, r, r, { rotDeg })]),
  pyramid: (n, r, rotDeg) => solidOf([seg(-1, 1, n, r, TINY_R, { rotDeg })]),
  pyramidDown: (n, r, rotDeg) => solidOf([seg(-1, 1, n, TINY_R, r, { rotDeg })]),
  frustumN: (n, r0, r1, rotDeg) => solidOf([seg(-1, 1, n, r0, r1, { rotDeg })]),
  bicone: (r) => solidOf([seg(-1, B_MID, 0, TINY_R, r), seg(B_MID, 1, 0, r, TINY_R)]),
  hourglass: (r, waist) => solidOf([seg(-1, B_MID, 0, r, waist), seg(B_MID, 1, 0, waist, r)]),
  cylinderCone: (r) => solidOf([seg(-1, B_MID, 0, r, r), seg(B_MID, 1, 0, r, TINY_R)]),
  coneCylinder: (r) => solidOf([seg(-1, B_LOW, 0, TINY_R, r), seg(B_LOW, 1, 0, r, r)]),
  prismCone: (n, r, rotDeg) => solidOf([seg(-1, B_LOW, n, r, r, { rotDeg }), seg(B_LOW, 1, 0, r, TINY_R)]),
  conePrism: (n, r, rotDeg) => solidOf([seg(-1, B_MID, 0, TINY_R, r), seg(B_MID, 1, n, r, r, { rotDeg })]),
  prismPyramid: (n, r, rotDeg) => solidOf([seg(-1, B_MID, n, r, r, { rotDeg }), seg(B_MID, 1, n, r, TINY_R, { rotDeg })]),
  twistPrism: (n, r, rotA, rotB) =>
    solidOf([seg(-1, B_HIGH, n, r, r, { rotDeg: rotA }), seg(B_HIGH, 1, n, r, r, { rotDeg: rotB })]),
  stepPrism: (n, r0, r1, rotDeg) =>
    solidOf([seg(-1, B_LOW, n, r0, r0, { rotDeg }), seg(B_LOW, 1, n, r1, r1, { rotDeg })]),
};

/* ---- geometry: cross-section at a height, and the sampled slice stack ---- */
function segAt(segments, y) {
  for (const g of segments) if (y >= g.y0 - 1e-9 && y < g.y1 - 1e-9) return g;
  for (const g of segments) if (y >= g.y0 - 1e-9 && y <= g.y1 + 1e-9) return g;
  return null;
}
export function sliceAt(solid, y) {
  const g = segAt(solid.segments, y);
  if (!g) return null;
  let r;
  if (g.arc) {
    const d = y - g.arc.yc;
    r = Math.sqrt(Math.max(0, g.arc.R * g.arc.R - d * d));
  } else {
    const u = (y - g.y0) / (g.y1 - g.y0);
    r = g.r0 + (g.r1 - g.r0) * u + (g.curv || 0) * 4 * u * (1 - u);
  }
  return { sides: g.sides, r: round4(Math.max(0, r)), rotDeg: g.sides ? ((g.rotDeg % 360) + 360) % 360 : 0 };
}
// Sampled heights: mid-bin, so a slice never lands on the axis end caps.
export const heightsFor = (K) => Array.from({ length: K }, (_, k) => round4((k + 0.5) / K));
export function sampleStack(solid, K) {
  return heightsFor(K).map((t) => ({ t, section: sliceAt(solid, -1 + 2 * t) }));
}
// Two stacks are the SAME stimulus iff every sampled slice agrees. Polygon
// orientation only matters modulo the polygon's own rotational symmetry.
//
// The comparison uses a GUARD BAND: a radius gap below R_NEAR counts as "same"
// and above R_FAR counts as "different"; anything in between is "fuzzy" and a
// candidate producing it is rejected outright. That keeps this generator and the
// independent validator from ever disagreeing because of floating-point noise
// near a single threshold.
export const R_NEAR = 0.012;
export const R_FAR = 0.035;
export const ROT_NEAR = 1.0;
export const ROT_FAR = 4.0;
export function sectionRel(a, b) {
  if (!a || !b) return a === b ? 'same' : 'diff';
  if (a.sides !== b.sides) return 'diff';
  const dr = Math.abs(a.r - b.r);
  if (dr > R_NEAR && dr < R_FAR) return 'fuzzy';
  let rotSame = true;
  if (a.sides >= 3) {
    const period = 360 / a.sides;
    const raw = (((a.rotDeg - b.rotDeg) % period) + period) % period;
    const d = Math.min(raw, period - raw);
    if (d > ROT_NEAR && d < ROT_FAR) return 'fuzzy';
    rotSame = d <= ROT_NEAR;
  }
  return dr <= R_NEAR && rotSame ? 'same' : 'diff';
}
const sameSection = (a, b) => sectionRel(a, b) === 'same';
export function sameStack(A, B) {
  return A.length === B.length && A.every((s, i) => sameSection(s.section, B[i].section));
}
const stackKey = (S) =>
  S.map((s) => (s.section ? `${s.section.sides}:${s.section.r.toFixed(2)}:${Math.round(s.section.rotDeg)}` : 'x')).join('|');

/* ================================================================== *
 * DIFFICULTY MODEL — derived from the declared difficulty_levers.
 *   solidComplexity : circular-constant .. sides-changing composite
 *   candidateCount  : 2 .. 6
 *   abstraction     : slice count 9 -> 5 and dropping the height scale
 *   lureSimilarity  : continuous 0..1 fine-positioner (how near-miss the
 *                     distractor solids are); also drives distractor choice.
 * ================================================================== */
export const COMPLEXITY = {
  circle_constant: 0.0, // cylinder
  circle_taper: 0.7, // cone, frustum, sphere, barrel
  circle_multi: 1.9, // bicone, hourglass, cylinder+cone
  poly_constant: 1.5, // prism
  poly_taper: 2.4, // pyramid, frustum-n
  poly_multi: 3.5, // prism+pyramid, step prism, twist prism
  sides_change: 4.6, // prism+cone (cross-section family changes with height)
};
const CANDIDATE_TERM = 0.85; // per candidate above 2
const ABSTRACTION = { 9: 0.0, 7: 0.8, 5: 1.6 }; // fewer sampled slices = more interpolation
const LURE_SPAN = 4.0;

const rawScore = (complexity, nCand, sliceCount, sim) =>
  1.0 + COMPLEXITY[complexity] + CANDIDATE_TERM * (nCand - 2) + ABSTRACTION[sliceCount] + LURE_SPAN * sim;

const RAW_MIN = rawScore('circle_constant', 2, 9, 0);
const RAW_MAX = rawScore('sides_change', 6, 5, 1);

export function difficultyFromLevers(complexity, nCand, sliceCount, sim) {
  const raw = rawScore(complexity, nCand, sliceCount, sim);
  return clamp(1 + ((raw - RAW_MIN) * 19) / (RAW_MAX - RAW_MIN), 1, 20);
}
function solveSimilarity(complexity, nCand, sliceCount, targetD) {
  const rawNeeded = RAW_MIN + ((targetD - 1) * (RAW_MAX - RAW_MIN)) / 19;
  return clamp((rawNeeded - rawScore(complexity, nCand, sliceCount, 0)) / LURE_SPAN, 0, 1);
}

/* ---- solid families keyed by complexity class (seeded picks per item) ---- */
const FAMILY = {
  circle_constant: (rng) => SOLID.cylinder(0.55 + 0.3 * rng()),
  circle_taper: (rng) => {
    const r = 0.6 + 0.3 * rng();
    const pick = Math.floor(rng() * 5);
    if (pick === 0) return SOLID.coneUp(r);
    if (pick === 1) return SOLID.coneDown(r);
    if (pick === 2) return SOLID.sphere();
    if (pick === 3) return SOLID.frustum(r, 0.25 + 0.2 * rng());
    return SOLID.barrel(0.45 + 0.15 * rng(), 0.2 + 0.2 * rng());
  },
  circle_multi: (rng) => {
    const r = 0.6 + 0.25 * rng();
    const pick = Math.floor(rng() * 4);
    if (pick === 0) return SOLID.bicone(r);
    if (pick === 1) return SOLID.hourglass(r, 0.15 + 0.15 * rng());
    if (pick === 2) return SOLID.cylinderCone(r);
    return SOLID.coneCylinder(r);
  },
  poly_constant: (rng) => SOLID.prism(3 + Math.floor(rng() * 4), 0.6 + 0.25 * rng(), Math.floor(rng() * 6) * 15),
  poly_taper: (rng) => {
    const n = 3 + Math.floor(rng() * 4);
    const r = 0.6 + 0.25 * rng();
    const rot = Math.floor(rng() * 6) * 15;
    const pick = Math.floor(rng() * 3);
    if (pick === 0) return SOLID.pyramid(n, r, rot);
    if (pick === 1) return SOLID.pyramidDown(n, r, rot);
    return SOLID.frustumN(n, r, 0.25 + 0.15 * rng(), rot);
  },
  poly_multi: (rng) => {
    const n = 3 + Math.floor(rng() * 4);
    const r = 0.6 + 0.25 * rng();
    const rot = Math.floor(rng() * 6) * 15;
    const pick = Math.floor(rng() * 3);
    if (pick === 0) return SOLID.prismPyramid(n, r, rot);
    if (pick === 1) return SOLID.stepPrism(n, r, 0.3 + 0.2 * rng(), rot);
    return SOLID.twistPrism(n, r, rot, rot + 20 + Math.floor(rng() * 4) * 8);
  },
  sides_change: (rng) => {
    const n = 3 + Math.floor(rng() * 4);
    const r = 0.6 + 0.25 * rng();
    const rot = Math.floor(rng() * 6) * 15;
    return rng() < 0.5 ? SOLID.prismCone(n, r, rot) : SOLID.conePrism(n, r, rot);
  },
};

/* ================================================================== *
 * DISTRACTOR GRAMMAR — every foil is a NAMED transformation of the correct
 * solid, so each wrong answer carries a diagnostic lure label (M-ERRTYPE).
 * `mirror_inverted` is an EXACT reflection of the solid through the mid-plane
 * of the scan axis; chirality is recorded because M-MIRRORFA depends on it.
 * ================================================================== */
const cloneSolid = (s) => JSON.parse(JSON.stringify(s));

function tfConstantProfile(solid) {
  const g0 = solid.segments[0];
  const r = g0.arc ? round4(Math.sqrt(Math.max(0, g0.arc.R * g0.arc.R - 1))) : g0.r0;
  const rr = Math.max(0.35, r);
  return solidOf([seg(-1, 1, g0.sides, rr, rr, { rotDeg: g0.rotDeg })]);
}
function tfMirrorInverted(solid) {
  const segs = solid.segments
    .map((g) => {
      const m = seg(-g.y1, -g.y0, g.sides, g.r1, g.r0, { rotDeg: g.rotDeg, curv: g.curv });
      if (g.arc) m.arc = { yc: round4(-g.arc.yc), R: g.arc.R };
      return m;
    })
    .reverse();
  return solidOf(segs);
}
function tfTaperFamilySwap(solid) {
  const segs = solid.segments.map((g) => {
    if (g.arc) return seg(g.y0, g.y1, g.sides, TINY_R, TINY_R, { rotDeg: g.rotDeg, curv: g.arc.R * 0.95 });
    const bulge = g.r0 >= g.r1 ? 0.28 : -0.28;
    return seg(g.y0, g.y1, g.sides, g.r0, g.r1, { rotDeg: g.rotDeg, curv: (g.curv || 0) + bulge });
  });
  return solidOf(segs);
}
function tfSidesShift(solid, delta) {
  const segs = solid.segments.map((g) => {
    let n = g.sides;
    if (n === 0) n = 4 + (delta > 0 ? 1 : 0);
    else n = clamp(n + delta, 3, 8);
    return seg(g.y0, g.y1, n, g.r0, g.r1, { rotDeg: g.rotDeg, curv: g.curv, arc: g.arc });
  });
  return solidOf(segs);
}
function tfRotate(solid, deg) {
  const segs = solid.segments.map((g) => seg(g.y0, g.y1, g.sides, g.r0, g.r1, { rotDeg: g.rotDeg + deg, curv: g.curv, arc: g.arc }));
  return solidOf(segs);
}
function tfScaleRadius(solid, k) {
  const segs = solid.segments.map((g) => {
    const m = seg(g.y0, g.y1, g.sides, g.r0 * k, g.r1 * k, { rotDeg: g.rotDeg, curv: g.curv ? g.curv * k : 0 });
    if (g.arc) m.arc = { yc: g.arc.yc, R: round4(g.arc.R * k) };
    return m;
  });
  return solidOf(segs);
}
function tfEndpointSwap(solid) {
  const segs = solid.segments.map((g) => {
    if (g.arc) return seg(g.y0, g.y1, g.sides, g.arc.R * 0.9, TINY_R, { rotDeg: g.rotDeg });
    return seg(g.y0, g.y1, g.sides, g.r1, g.r0, { rotDeg: g.rotDeg, curv: g.curv });
  });
  return solidOf(segs);
}
function tfBoundaryShift(solid, dy) {
  if (solid.segments.length < 2) return null;
  const segs = cloneSolid(solid).segments;
  for (let i = 0; i < segs.length - 1; i++) {
    segs[i].y1 = round4(clamp(segs[i].y1 + dy, segs[i].y0 + 0.25, 0.9));
    segs[i + 1].y0 = segs[i].y1;
  }
  return solidOf(segs);
}
function tfForeign(rng) {
  const keys = Object.keys(FAMILY);
  return FAMILY[keys[Math.floor(rng() * keys.length)]](rng);
}

const LURE_NOTES = {
  constant_profile: 'reads only the first slice: keeps that cross-section unchanged for the whole height',
  mirror_inverted: 'the same solid flipped top-to-bottom: right slices, wrong order along the scan axis',
  taper_family_swap: 'same start and end slice, wrong curvature of the change between them',
  sides_shift: 'right taper, wrong cross-section family (polygon side count off)',
  rotational_offset: 'right solid, cross-section twisted about the scan axis',
  radius_scale: 'right profile shape, wrong overall size',
  endpoint_swap: 'taper runs the wrong way within the segment',
  boundary_shift: 'right parts, wrong height at which the solid changes',
  foreign_solid: 'unrelated solid: a random pick that matches no slice progression',
};

function buildDistractors(correct, want, sim, sliceCount, rng) {
  const baseStack = sampleStack(correct, sliceCount);
  const seen = new Set([stackKey(baseStack)]);
  const out = [];
  const delta = 0.06 + 0.3 * (1 - sim); // radius perturbation magnitude
  const theta = Math.round(8 + 52 * (1 - sim)); // rotational perturbation magnitude
  const push = (solid, lure, extra = {}) => {
    if (!solid || out.length >= want) return false;
    const st = sampleStack(solid, sliceCount);
    if (st.some((s) => !s.section || s.section.r > 1.05)) return false;
    // Reject any foil that sits in the guard band against the shown stack: a
    // borderline slice would make "matches / does not match" ambiguous.
    const rels = st.map((s, i) => sectionRel(s.section, baseStack[i].section));
    if (rels.includes('fuzzy') || !rels.includes('diff')) return false;
    const k = stackKey(st);
    if (seen.has(k)) return false;
    seen.add(k);
    out.push({ solid, lure, note: LURE_NOTES[lure], ...extra });
    return true;
  };

  const near = [
    () => push(tfRotate(correct, theta), 'rotational_offset', { rotationDeg: theta }),
    () => push(tfTaperFamilySwap(correct), 'taper_family_swap'),
    () => push(tfScaleRadius(correct, 1 - delta), 'radius_scale', { scale: round4(1 - delta) }),
    () => push(tfMirrorInverted(correct), 'mirror_inverted', { chirality: 'reflected_scan_axis', exactMirror: true }),
    () => push(tfEndpointSwap(correct), 'endpoint_swap'),
    () => push(tfSidesShift(correct, 1), 'sides_shift', { sidesDelta: 1 }),
    () => push(tfBoundaryShift(correct, 0.3), 'boundary_shift'),
    () => push(tfScaleRadius(correct, 1 + delta * 0.7), 'radius_scale', { scale: round4(1 + delta * 0.7) }),
    () => push(tfRotate(correct, -theta), 'rotational_offset', { rotationDeg: -theta }),
    () => push(tfConstantProfile(correct), 'constant_profile'),
  ];
  const far = [
    () => push(tfConstantProfile(correct), 'constant_profile'),
    () => push(tfMirrorInverted(correct), 'mirror_inverted', { chirality: 'reflected_scan_axis', exactMirror: true }),
    () => push(tfSidesShift(correct, -1), 'sides_shift', { sidesDelta: -1 }),
    () => push(tfScaleRadius(correct, 1 - delta), 'radius_scale', { scale: round4(1 - delta) }),
    () => push(tfEndpointSwap(correct), 'endpoint_swap'),
    () => push(tfTaperFamilySwap(correct), 'taper_family_swap'),
    () => push(tfSidesShift(correct, 2), 'sides_shift', { sidesDelta: 2 }),
    () => push(tfRotate(correct, theta), 'rotational_offset', { rotationDeg: theta }),
  ];
  for (const step of sim >= 0.5 ? near : far) step();
  // Top up with foreign solids if de-duplication left us short.
  for (let guard = 0; out.length < want && guard < 60; guard++) push(tfForeign(rng), 'foreign_solid');
  return out;
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
export function genItem({ complexity, nCand, sliceCount, lureSimilarity, keyPosition, seed }) {
  const rng = makeRng(seed);
  const correct = FAMILY[complexity](rng);
  const slices = sampleStack(correct, sliceCount);

  const foils = buildDistractors(correct, nCand - 1, lureSimilarity, sliceCount, rng);
  const seated = seatCorrect(
    shuffle([{ solid: correct, lure: 'correct', note: 'its slice stack reproduces every shown cross-section' }, ...foils], rng),
    (p) => p.lure === 'correct',
    keyPosition,
  );
  const pool = seated.list;

  const options = pool.map((p, i) => ({ key: OPT_KEYS[i], solid: p.solid }));
  let correctKey = null;
  const distractorRationales = {};
  pool.forEach((p, i) => {
    const key = OPT_KEYS[i];
    if (p.lure === 'correct') correctKey = key;
    const st = sampleStack(p.solid, sliceCount);
    const mismatch = st.filter((s, k) => !sameSection(s.section, slices[k].section)).length;
    distractorRationales[key] = {
      lure: p.lure,
      note: p.note,
      slicesMismatched: mismatch,
      ...(p.chirality ? { chirality: p.chirality, exactMirror: true } : {}),
      ...(p.rotationDeg != null ? { rotationDeg: p.rotationDeg } : {}),
      ...(p.sidesDelta != null ? { sidesDelta: p.sidesDelta } : {}),
      ...(p.scale != null ? { scale: p.scale } : {}),
    };
  });

  // Angular disparity: candidates are drawn at a fixed yaw while the slice
  // window is read top-down, so a polygonal cross-section must be mentally
  // rotated through this offset before it can be matched (M-ROTSLOPE input).
  const candidateYawDeg = Math.floor(rng() * 8) * 15;
  const polySlice = slices.find((s) => s.section && s.section.sides >= 3);
  const rawDisp = polySlice ? Math.abs(polySlice.section.rotDeg - candidateYawDeg) % 360 : 0;
  const angularDisparityDeg = polySlice ? Math.round(rawDisp > 180 ? 360 - rawDisp : rawDisp) : 0;

  const difficulty = round2(difficultyFromLevers(complexity, nCand, sliceCount, lureSimilarity));
  const mirrorKey = Object.keys(distractorRationales).find((k) => distractorRationales[k].lure === 'mirror_inverted');

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
        mode: 'pick_solid',
        prompt: 'Scan up and down through the hidden solid. Which solid makes these slices?',
      },
      scan: {
        axis: 'y',
        axisRange: [-1, 1],
        sliceCount,
        showHeightScale: sliceCount >= 7,
        slices, // [{t, section:{sides,r,rotDeg}}] — sides 0 means a circle
      },
      optionKind: 'axial_stack_solid',
      options, // display order; geometry ONLY (no lure, no key)
      display: { candidateYawDeg, candidatePitchDeg: 22 },
      scaffold: { warmup: difficulty <= 6, replayHint: difficulty <= 9 },
    },
    answer: {
      correctKey,
      distractorRationales,
      relation: 'slice_stack_reproduces_shown_cross_sections',
      angularDisparityDeg,
      angularDisparityApplies: !!polySlice,
      mirrorFoilKey: mirrorKey || null,
      chiralityRelevant: !!mirrorKey,
    },
    scoring: { mode: 'deterministic_key' },
    provenance: {
      generator: 'grammar',
      generatorRef: GENERATOR_REF,
      seed,
      levers: { complexity, nCand, sliceCount, lureSimilarity, keyPosition: seated.slot },
    },
    syntheticOnly: true,
    validated: false,
  };
}

/* ================================================================== *
 * BANK BUILDER — >=perBin items in every integer difficulty bin 1..20.
 * ================================================================== */
export const ALLOWED_CONFIGS = [];
for (const complexity of Object.keys(COMPLEXITY))
  for (const nCand of [2, 3, 4, 5, 6])
    for (const sliceCount of [9, 7, 5]) {
      if (complexity === 'circle_constant' && nCand > 4) continue; // a plain cylinder cannot carry 5 near foils
      if (nCand === 2 && sliceCount === 5) continue; // 2 options + heavy abstraction is a guessing item
      ALLOWED_CONFIGS.push({ complexity, nCand, sliceCount });
    }

export function buildBank({ perBin = 7 } = {}) {
  const items = [];
  const keyPosition = makeSlotAllocator(OPT_KEYS.length);
  for (let k = 1; k <= 20; k++) {
    const lo = Math.max(1, k - 0.44);
    const hi = Math.min(20, k + 0.44);
    const segments = [];
    for (const cfg of ALLOWED_CONFIGS) {
      const dLo = difficultyFromLevers(cfg.complexity, cfg.nCand, cfg.sliceCount, 0);
      const dHi = difficultyFromLevers(cfg.complexity, cfg.nCand, cfg.sliceCount, 1);
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
      const sim = solveSimilarity(s.complexity, s.nCand, s.sliceCount, t);
      const seed = `${TYPE_CODE}|bin=${k}|i=${i}|${s.complexity}|C${s.nCand}|S${s.sliceCount}`;
      items.push(genItem({ complexity: s.complexity, nCand: s.nCand, sliceCount: s.sliceCount, lureSimilarity: sim, keyPosition, seed }));
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
  writeFileSync(OUT, serializeBank(items));

  const bins = Array.from({ length: 20 }, () => 0);
  let min = Infinity;
  let max = -Infinity;
  let mirrors = 0;
  for (const it of items) {
    const k = Math.round(it.difficulty);
    if (k >= 1 && k <= 20) bins[k - 1]++;
    min = Math.min(min, it.difficulty);
    max = Math.max(max, it.difficulty);
    if (it.answer.mirrorFoilKey) mirrors++;
  }
  console.log(`${TYPE_CODE} bank: ${items.length} items -> ${OUT}`);
  console.log(`difficulty span: ${round2(min)} .. ${round2(max)}  (target 1..20)`);
  console.log(`items carrying an exact mirror foil: ${mirrors}`);
  console.log('per-bin counts (k:n):  ' + bins.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
  const short = bins.map((n, i) => ({ k: i + 1, n })).filter((b) => b.n < 5 && b.k <= 19);
  console.log(short.length ? `SHORT BINS (<5): ${short.map((b) => b.k).join(',')}` : 'all bins 1..19 >=5 OK');
}
