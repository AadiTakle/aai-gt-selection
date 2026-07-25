// SPA-VIEW-01 "What Do They See" — structured bank generator (Bucket A: grammar).
//
// Emits a STRUCTURED item bank (JSONL) conforming to EXAM_ADAPTIVE_BUILD_PLAN.md §2
// (BankItem) and EXAM_ITEM_SCHEMA_SPEC.md. Born-synthetic: syntheticOnly=true,
// validated=false. Deterministic given the seed strings below.
//
// Two response shells, both keyed by GEOMETRY (never authored by hand):
//   match_viewpoint — a scene of labelled objects is shown from above with several
//     candidate viewpoints. A "view strip" gives the left-to-right order one of
//     them sees; the child taps that viewpoint.        scoring: deterministic_key
//   point_heading  — the child imagines standing at one station facing its heading
//     and turns a dial toward a named target object.   scoring: computed_solver
//     (signed heading error inside a recorded, server-applicable tolerance).
//
// Both shells record `angularDisparityDeg` (the imagined viewpoint's offset from
// the child's own station) so M-ROTSLOPE and M-VIEWANG can be fit, and both carry
// an exact LEFT-RIGHT REVERSAL foil with chirality recorded, since M-MIRRORFA
// depends on distinguishing a mirrored response from a random one.
//
// Difficulty (FLOAT 1..20, a DESIGN rung, not a calibrated IRT parameter) derives
// from the type's declared difficulty_levers (master_types.jsonl SPA-VIEW-01):
// number of objects; number of viewpoints; discrete match vs continuous pointing;
// viewpoint offset magnitude; and how finely the view must be discriminated.
//
// Run:  node research/exam-question-types/generators/SPA-VIEW-01.mjs
//       writes ../banks/SPA-VIEW-01.jsonl and prints a coverage summary.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../banks/SPA-VIEW-01.jsonl');
const TYPE_CODE = 'SPA-VIEW-01';
const DOMAIN = 'spatial';
const GENERATOR_REF = 'spa-view-01-grammar@1';
const DEMO_PATH = 'demos/SPA-VIEW-01.html';
const OPT_KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

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
const DEG = 180 / Math.PI;
const RAD = Math.PI / 180;
export const wrap180 = (d) => {
  let x = ((d + 180) % 360 + 360) % 360 - 180;
  if (x === -180) x = 180;
  return x;
};
const angGap = (a, b) => Math.abs(wrap180(a - b));

/* ================================================================== *
 * SCENE GEOMETRY
 * Map coordinates are standard math axes (x right, y up), viewed from above.
 * A station's `headingDeg` is its facing direction, CCW from +x.
 * A target's BEARING from a station is measured CLOCKWISE-POSITIVE (to the
 * viewer's right) from that facing: bearing = wrap180(heading - angleTo).
 * Left-to-right order is therefore ascending bearing.
 * ================================================================== */
export const VIEWER_RADIUS = 2.1;
export const SELF_STATION = { x: 0, y: -2.9, headingDeg: 90, label: 'you' };
const MAX_OBJ_RADIUS = 1.6;
const MIN_OBJ_GAP = 0.5;
const MIN_OBJ_TO_STATION = 0.8;

export function bearingDeg(station, p) {
  const a = Math.atan2(p.y - station.y, p.x - station.x) * DEG;
  return wrap180(station.headingDeg - a);
}
export function viewOrder(objects, station) {
  return objects
    .map((o) => ({ id: o.id, b: bearingDeg(station, o) }))
    .sort((u, v) => u.b - v.b)
    .map((u) => u.id);
}
const sameOrder = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const reversed = (a) => a.slice().reverse();

/* ---- object vocabulary: short high-frequency WORDS (reading gate, D-017) ---- */
export const OBJECT_WORDS = [
  { glyph: 'tree', label: 'tree' },
  { glyph: 'house', label: 'house' },
  { glyph: 'car', label: 'car' },
  { glyph: 'flag', label: 'flag' },
  { glyph: 'pond', label: 'pond' },
  { glyph: 'rock', label: 'rock' },
  { glyph: 'bench', label: 'bench' },
  { glyph: 'tower', label: 'tower' },
];

/* ================================================================== *
 * DIFFICULTY MODEL — from the declared difficulty_levers.
 * ================================================================== */
export const MODE_TERM = { match_viewpoint: 0, point_heading: 3.0 };
const OBJ_TERM = 1.0; // per object above 2
const VIEW_TERM = 0.62; // per viewpoint above 2
const OFFSET_TERM = 2.2; // scaled by offsetDeg/180
const TIGHT_SPAN = 4.0; // continuous fine-positioner

const rawScore = (mode, nObjects, nViewpoints, offsetDeg, tight) =>
  1.0 +
  MODE_TERM[mode] +
  OBJ_TERM * (nObjects - 2) +
  VIEW_TERM * (nViewpoints - 2) +
  OFFSET_TERM * (offsetDeg / 180) +
  TIGHT_SPAN * tight;

const RAW_MIN = rawScore('match_viewpoint', 2, 2, 0, 0);
const RAW_MAX = rawScore('point_heading', 6, 8, 180, 1);

export function difficultyFromLevers(mode, nObjects, nViewpoints, offsetDeg, tight) {
  const r = rawScore(mode, nObjects, nViewpoints, offsetDeg, tight);
  return clamp(1 + ((r - RAW_MIN) * 19) / (RAW_MAX - RAW_MIN), 1, 20);
}
function solveTightness(mode, nObjects, nViewpoints, offsetDeg, targetD) {
  const rawNeeded = RAW_MIN + ((targetD - 1) * (RAW_MAX - RAW_MIN)) / 19;
  return clamp((rawNeeded - rawScore(mode, nObjects, nViewpoints, offsetDeg, 0)) / TIGHT_SPAN, 0, 1);
}

/* ---- what the tightness lever buys, per shell ---- */
// match: how finely adjacent objects must be discriminated in the target view.
export const minSepDegFor = (t) => 30 - 24 * t;
const gapWindow = (t) => [minSepDegFor(t), minSepDegFor(t) + 8];
// point_heading: how tight the accepted answer band is.
export const toleranceDegFor = (t) => round2(22 - 15 * t);
// A viewpoint at radius VIEWER_RADIUS can only see objects inside a bounded
// bearing cone, so wide view strips are geometrically impossible; require a
// minimum tightness for object-rich scenes.
const MAX_STRIP_SPAN = 99;
export function minTightnessFor(nObjects) {
  if (nObjects <= 2) return 0;
  return clamp((38 - MAX_STRIP_SPAN / (nObjects - 1)) / 24, 0, 1);
}

/* ================================================================== *
 * SCENE CONSTRUCTION
 * Objects are placed BY BEARING from the acting viewpoint, so the width of the
 * view strip (the discrimination the child must make) is set exactly.
 * ================================================================== */
function placeFromBearing(station, bearing, rho) {
  // Distance t along the bearing ray that lands the object at radius rho from
  // the scene origin: t^2 - 2 t R cos(b) + R^2 - rho^2 = 0  (R = |station|).
  const R = Math.hypot(station.x, station.y);
  const b = bearing * RAD;
  const disc = rho * rho - R * R * Math.sin(b) * Math.sin(b);
  if (disc < 1e-6) return null;
  return { root: Math.sqrt(disc), base: R * Math.cos(b) };
}
function objectAt(station, bearing, rho, farSide) {
  const s = placeFromBearing(station, bearing, rho);
  if (!s) return null;
  const t = farSide ? s.base + s.root : s.base - s.root;
  if (t < 0.6) return null;
  const dir = (station.headingDeg - bearing) * RAD;
  return { x: round4(station.x + t * Math.cos(dir)), y: round4(station.y + t * Math.sin(dir)) };
}

function buildScene({ nObjects, nViewpoints, offsetDeg, tight, rng }) {
  const [gapLo, gapHi] = gapWindow(tight);
  for (let attempt = 0; attempt < 400; attempt++) {
    // The acting viewpoint sits so its heading is `offsetDeg` off the child's own.
    const phi0 = offsetDeg - 90;
    const stations = [];
    const spacing = 360 / nViewpoints;
    for (let j = 0; j < nViewpoints; j++) {
      const phi = phi0 + j * spacing + (j === 0 ? 0 : (rng() - 0.5) * spacing * 0.4);
      const x = VIEWER_RADIUS * Math.cos(phi * RAD);
      const y = VIEWER_RADIUS * Math.sin(phi * RAD);
      stations.push({ x: round4(x), y: round4(y), headingDeg: round2(wrap180(phi + 180)) });
    }
    const acting = stations[0];

    // Bearings for the acting view: a centred run of gaps inside the window.
    const gaps = [];
    for (let i = 0; i < nObjects - 1; i++) gaps.push(gapLo + rng() * (gapHi - gapLo));
    const span = gaps.reduce((a, b) => a + b, 0);
    if (span > MAX_STRIP_SPAN) continue;
    let b = -span / 2 + (rng() - 0.5) * 6;
    const bearings = [b];
    for (const g of gaps) bearings.push((b += g));

    const words = shuffle(OBJECT_WORDS, rng).slice(0, nObjects);
    const objects = [];
    let ok = true;
    for (let i = 0; i < nObjects; i++) {
      let placed = null;
      for (let k = 0; k < 24 && !placed; k++) {
        const rho = 0.55 + rng() * (MAX_OBJ_RADIUS - 0.55);
        const p = objectAt(acting, bearings[i], rho, rng() < 0.55);
        if (!p) continue;
        if (objects.some((o) => Math.hypot(o.x - p.x, o.y - p.y) < MIN_OBJ_GAP)) continue;
        if (stations.some((s) => Math.hypot(s.x - p.x, s.y - p.y) < MIN_OBJ_TO_STATION)) continue;
        placed = { id: 'o' + i, glyph: words[i].glyph, label: words[i].label, x: p.x, y: p.y };
      }
      if (!placed) { ok = false; break; }
      objects.push(placed);
    }
    if (!ok) continue;

    // Every station must see every object clearly in front of it, so the
    // left-to-right order is a well-defined total order.
    if (stations.some((s) => objects.some((o) => Math.abs(bearingDeg(s, o)) > 82))) continue;

    // The acting view must actually sit in the intended discrimination window.
    const actingBearings = objects.map((o) => bearingDeg(acting, o)).sort((u, v) => u - v);
    let minGap = Infinity;
    for (let i = 1; i < actingBearings.length; i++) minGap = Math.min(minGap, actingBearings[i] - actingBearings[i - 1]);
    if (nObjects > 1 && (minGap < gapLo - 0.5 || minGap > gapHi + 3)) continue;

    // All station views must be pairwise distinct, so "who sees this" has one answer.
    const orders = stations.map((s) => viewOrder(objects, s));
    const sigs = new Set(orders.map((o) => o.join('>')));
    if (sigs.size !== stations.length) continue;

    return { stations, objects, orders, actingMinGapDeg: round2(minGap) };
  }
  return null;
}

/* ---- age bands: the type's declared bands (2-3 | 4-5 | 6-8) ---- */
export function ageBandsFor(difficulty, mode) {
  let bands;
  if (difficulty < 5) bands = ['2-3'];
  else if (difficulty < 9) bands = ['2-3', '4-5'];
  else if (difficulty < 14) bands = ['4-5', '6-8'];
  else bands = ['6-8'];
  // The continuous pointing shell is an older-band response format
  // (age_rationale: "6-8 uses continuous pointing-dial heading estimation").
  if (mode === 'point_heading') {
    bands = bands.filter((b) => b !== '2-3');
    if (!bands.includes('6-8')) bands.push('6-8');
  }
  return bands;
}

/* ================================================================== *
 * ITEM BUILDERS
 * ================================================================== */
const LURE_NOTES = {
  correct: 'the only station whose left-to-right view is the strip shown',
  mirror_reversal: 'sees the strip exactly reversed left-to-right: the classic mirrored perspective response',
  egocentric_own_view: "the station closest to the child's own heading: answering from where the child is sitting",
  adjacent_viewpoint: 'the nearest station to the correct one: right side of the scene, viewpoint under-rotated',
  opposite_viewpoint: 'a station roughly opposite the correct one without producing an exact reversal',
  other_viewpoint: 'an unrelated station: no systematic relation to the correct view',
};
const HEADING_LURE_NOTES = {
  egocentric: "the heading the child would give from their OWN station: the frame was never rotated",
  mirror_reflected: 'the correct angle turned the wrong way: an exact left-right reflection of the answer',
  array_frame: "the bearing read off the map's own up-direction instead of the station's facing",
  opposite: 'pointing directly away from the target: the facing direction was inverted',
};

function buildMatchItem({ nObjects, nViewpoints, offsetDeg, tight, seed }) {
  const rng = makeRng(seed);
  const scene = buildScene({ nObjects, nViewpoints, offsetDeg, tight, rng });
  if (!scene) return null;
  const { stations, objects, orders } = scene;
  const target = 0; // station 0 is the acting viewpoint by construction
  const targetOrder = orders[target];

  // Assign display keys in a shuffled order so position never leaks the key.
  const perm = shuffle(stations.map((_, i) => i), rng);
  const keyOf = new Array(stations.length);
  perm.forEach((stationIdx, slot) => { keyOf[stationIdx] = OPT_KEYS[slot]; });

  const selfBearing = SELF_STATION.headingDeg;
  let egoIdx = -1;
  let egoGap = Infinity;
  stations.forEach((s, i) => {
    if (i === target) return;
    const g = angGap(s.headingDeg, selfBearing);
    if (g < egoGap) { egoGap = g; egoIdx = i; }
  });
  let adjIdx = -1;
  let adjGap = Infinity;
  stations.forEach((s, i) => {
    if (i === target) return;
    const g = angGap(s.headingDeg, stations[target].headingDeg);
    if (g < adjGap) { adjGap = g; adjIdx = i; }
  });

  const distractorRationales = {};
  let mirrorKey = null;
  stations.forEach((s, i) => {
    const key = keyOf[i];
    const offFromKey = round2(angGap(s.headingDeg, stations[target].headingDeg));
    if (i === target) {
      distractorRationales[key] = { lure: 'correct', note: LURE_NOTES.correct, viewpointOffsetDeg: 0 };
      return;
    }
    let lure;
    if (sameOrder(orders[i], reversed(targetOrder)) && nObjects >= 2) lure = 'mirror_reversal';
    else if (i === egoIdx && egoGap < 45) lure = 'egocentric_own_view';
    else if (i === adjIdx) lure = 'adjacent_viewpoint';
    else if (offFromKey >= 150) lure = 'opposite_viewpoint';
    else lure = 'other_viewpoint';
    distractorRationales[key] = {
      lure,
      note: LURE_NOTES[lure],
      viewpointOffsetDeg: offFromKey,
      ...(lure === 'mirror_reversal' ? { chirality: 'left_right_reversed', exactMirror: true } : {}),
    };
    if (lure === 'mirror_reversal') mirrorKey = key;
  });

  const options = perm.map((stationIdx, slot) => ({ key: OPT_KEYS[slot] }));
  const angularDisparityDeg = Math.round(angGap(stations[target].headingDeg, SELF_STATION.headingDeg));

  return {
    mode: 'match_viewpoint',
    scene,
    keyOf,
    content: {
      typeCode: TYPE_CODE,
      question: {
        mode: 'match_viewpoint',
        prompt: 'The strip shows what one person sees, from their left to their right. Tap the person who sees it.',
      },
      scene: {
        frame: { coords: 'map_top_down', extent: 3.2, selfStation: { ...SELF_STATION } },
        objects: objects.map((o) => ({ id: o.id, label: o.label, glyph: o.glyph, x: o.x, y: o.y })),
        stations: stations.map((s, i) => ({ key: keyOf[i], x: s.x, y: s.y, headingDeg: s.headingDeg })),
      },
      targetView: { orderedObjectIds: targetOrder.slice() },
      optionKind: 'viewpoint',
      options,
      scaffold: { livePreviewStrip: true, warmup: nObjects <= 3 },
    },
    answer: {
      correctKey: keyOf[target],
      distractorRationales,
      relation: 'station_left_to_right_view_equals_strip',
      angularDisparityDeg,
      angularDisparityApplies: true,
      mirrorFoilKey: mirrorKey,
      chiralityRelevant: !!mirrorKey,
      minAdjacentBearingGapDeg: scene.actingMinGapDeg,
    },
    scoring: { mode: 'deterministic_key' },
  };
}

function buildHeadingItem({ nObjects, nViewpoints, offsetDeg, tight, seed }) {
  const rng = makeRng(seed);
  const scene = buildScene({ nObjects, nViewpoints, offsetDeg, tight, rng });
  if (!scene) return null;
  const { stations, objects } = scene;
  const acting = stations[0];
  const tol = toleranceDegFor(tight);
  const margin = Math.max(4, round2(tol * 0.6)); // every named error zone must sit clear of the accept band

  // Pick the target object that separates the named error zones from the answer
  // best, so a wrong dial angle still classifies into a diagnostic error type.
  let chosen = null;
  let bestGap = -Infinity;
  for (const o of shuffle(objects, rng)) {
    const correct = round2(bearingDeg(acting, o));
    const zones = {
      egocentric: round2(bearingDeg(SELF_STATION, o)),
      mirror_reflected: round2(wrap180(-correct)),
      array_frame: round2(wrap180(90 - Math.atan2(o.y - acting.y, o.x - acting.x) * DEG)),
      opposite: round2(wrap180(correct + 180)),
    };
    const worst = Math.min(...Object.values(zones).map((z) => angGap(z, correct)));
    if (worst > bestGap) { bestGap = worst; chosen = { o, correct, zones }; }
  }
  if (!chosen || bestGap < tol + margin) return null;

  const keyOf = stations.map((_, i) => OPT_KEYS[i]);
  const distractorRationales = { HEADING: { lure: 'correct', note: 'the dial angle from the station\u2019s own facing to the target', headingDeg: chosen.correct } };
  for (const [lure, headingDeg] of Object.entries(chosen.zones)) {
    distractorRationales[lure] = {
      lure,
      note: HEADING_LURE_NOTES[lure],
      headingDeg,
      offFromCorrectDeg: round2(angGap(headingDeg, chosen.correct)),
      ...(lure === 'mirror_reflected' ? { chirality: 'left_right_reversed', exactMirror: true } : {}),
    };
  }
  const dialStepDeg = tol >= 12 ? 5 : 1;
  const angularDisparityDeg = Math.round(angGap(acting.headingDeg, SELF_STATION.headingDeg));

  return {
    mode: 'point_heading',
    scene,
    keyOf,
    content: {
      typeCode: TYPE_CODE,
      question: {
        mode: 'point_heading',
        prompt: 'Stand where the marked person stands and face the way they face. Turn the dial to point at the named place, then send it.',
      },
      scene: {
        frame: { coords: 'map_top_down', extent: 3.2, selfStation: { ...SELF_STATION } },
        objects: objects.map((o) => ({ id: o.id, label: o.label, glyph: o.glyph, x: o.x, y: o.y })),
        stations: stations.map((s, i) => ({ key: keyOf[i], x: s.x, y: s.y, headingDeg: s.headingDeg })),
      },
      pointing: {
        fromStationKey: keyOf[0],
        targetObjectId: chosen.o.id,
        targetLabel: chosen.o.label,
        dialStepDeg,
        dialZeroIsStationFacing: true,
      },
      optionKind: 'heading_dial',
      options: [],
      scaffold: { livePreviewStrip: false, warmup: false },
    },
    answer: {
      correctKey: 'HEADING',
      correctHeadingDeg: chosen.correct,
      toleranceDeg: tol,
      distractorRationales,
      relation: 'signed_bearing_from_station_facing_to_target',
      angularDisparityDeg,
      angularDisparityApplies: true,
      mirrorFoilKey: 'mirror_reflected',
      chiralityRelevant: true,
      minAdjacentBearingGapDeg: scene.actingMinGapDeg,
    },
    scoring: {
      mode: 'computed_solver',
      solver: 'signed_heading_error_within_tolerance',
      rule:
        'let e = wrap180(response.headingDeg - answer.correctHeadingDeg); correct iff abs(e) <= answer.toleranceDeg. ' +
        'M-VIEWANG = e (signed degrees). Responses are quantised to content.pointing.dialStepDeg, so the check is exact and reproducible.',
      toleranceDeg: tol,
      responseField: 'headingDeg',
      partialCreditMetric: 'M-VIEWANG',
    },
  };
}

export function genItem({ mode, nObjects, nViewpoints, offsetDeg, tight, seed }) {
  let built = null;
  for (let retry = 0; retry < 12 && !built; retry++) {
    const s = retry ? `${seed}|r${retry}` : seed;
    built = mode === 'match_viewpoint'
      ? buildMatchItem({ nObjects, nViewpoints, offsetDeg, tight, seed: s })
      : buildHeadingItem({ nObjects, nViewpoints, offsetDeg, tight, seed: s });
  }
  if (!built) throw new Error(`could not realise scene for ${JSON.stringify({ mode, nObjects, nViewpoints, offsetDeg, tight })}`);
  const difficulty = round2(difficultyFromLevers(mode, nObjects, nViewpoints, offsetDeg, tight));
  return {
    itemId: seededUuid(seed),
    typeCode: TYPE_CODE,
    domain: DOMAIN,
    difficulty,
    ageBands: ageBandsFor(difficulty, mode),
    demoPath: DEMO_PATH,
    content: built.content,
    answer: built.answer,
    scoring: built.scoring,
    provenance: {
      generator: 'grammar',
      generatorRef: GENERATOR_REF,
      seed,
      levers: { mode, nObjects, nViewpoints, offsetDeg, tight },
    },
    syntheticOnly: true,
    validated: false,
  };
}

/* ================================================================== *
 * BANK BUILDER
 * ================================================================== */
export const ALLOWED_CONFIGS = [];
for (const mode of ['match_viewpoint', 'point_heading'])
  for (const nObjects of [2, 3, 4, 5, 6])
    for (const nViewpoints of [2, 3, 4, 5, 6, 8])
      for (const offsetDeg of [0, 60, 120, 180]) {
        // A view strip only discriminates n(n-1) distinct orders around the circle.
        if (nViewpoints > nObjects * (nObjects - 1)) continue;
        // Pointing needs a real frame rotation, or the map-frame lure coincides
        // with the answer and the item stops diagnosing anything.
        if (mode === 'point_heading' && offsetDeg < 60) continue;
        if (mode === 'point_heading' && nObjects < 3) continue;
        ALLOWED_CONFIGS.push({ mode, nObjects, nViewpoints, offsetDeg });
      }

export function buildBank({ perBin = 7 } = {}) {
  const items = [];
  for (let k = 1; k <= 20; k++) {
    const lo = Math.max(1, k - 0.44);
    const hi = Math.min(20, k + 0.44);
    const segments = [];
    for (const cfg of ALLOWED_CONFIGS) {
      const tMin = minTightnessFor(cfg.nObjects);
      const dLo = difficultyFromLevers(cfg.mode, cfg.nObjects, cfg.nViewpoints, cfg.offsetDeg, tMin);
      const dHi = difficultyFromLevers(cfg.mode, cfg.nObjects, cfg.nViewpoints, cfg.offsetDeg, 1);
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
      const tight = solveTightness(s.mode, s.nObjects, s.nViewpoints, s.offsetDeg, t);
      const seed = `${TYPE_CODE}|bin=${k}|i=${i}|${s.mode}|O${s.nObjects}V${s.nViewpoints}D${s.offsetDeg}`;
      items.push(genItem({ ...s, tight, seed }));
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
  let heading = 0;
  let mirrors = 0;
  for (const it of items) {
    const k = Math.round(it.difficulty);
    if (k >= 1 && k <= 20) bins[k - 1]++;
    min = Math.min(min, it.difficulty);
    max = Math.max(max, it.difficulty);
    if (it.scoring.mode === 'computed_solver') heading++;
    if (it.answer.mirrorFoilKey) mirrors++;
  }
  console.log(`${TYPE_CODE} bank: ${items.length} items -> ${OUT}`);
  console.log(`difficulty span: ${round2(min)} .. ${round2(max)}  (target 1..20)`);
  console.log(`shells: ${items.length - heading} deterministic_key (match) / ${heading} computed_solver (pointing dial)`);
  console.log(`items carrying an exact left-right reversal foil: ${mirrors}`);
  console.log('per-bin counts (k:n):  ' + bins.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
  const short = bins.map((n, i) => ({ k: i + 1, n })).filter((b) => b.n < 5 && b.k <= 19);
  console.log(short.length ? `SHORT BINS (<5): ${short.map((b) => b.k).join(',')}` : 'all bins 1..19 >=5 OK');
}
