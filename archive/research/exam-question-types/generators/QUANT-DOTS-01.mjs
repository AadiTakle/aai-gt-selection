#!/usr/bin/env node
/**
 * QUANT-DOTS-01 — "More or Fewer" structured bank generator (Bucket A: grammar).
 *
 * Emits a JSONL bank of BankItem rows conforming to the Adaptive Exam item
 * contract (docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md §2). Every item is
 * born-synthetic (syntheticOnly:true, validated:false); difficulty is a design
 * rung (FLOAT 1..20), NOT a calibrated IRT parameter.
 *
 * NONSYMBOLIC 2AFC (approximate number system). Two dot arrays flash briefly,
 * hide behind neutral covers, and the child taps the side that had MORE dots.
 * There are exactly two response options (L / R); the correct one is the side
 * with the larger count. scoring.mode is 'deterministic_key': the "key" is the
 * more-numerous side, re-derivable from the served dot arrays alone.
 *
 * Difficulty rises along the type's declared levers (types_quantitative.jsonl):
 *   numerical ratio between the two arrays (S/L -> 1 is hardest), total
 *   numerosity, exposure duration, and — critically — the continuous-visual-cue
 *   condition. Because area/density/dot-size can leak count, every array pair is
 *   generated under one of three verified cue regimes:
 *     'equal-size'     : identical dot radius  -> total area follows count (congruent, easy floor)
 *     'area-controlled': equal TOTAL dot area  -> area is uninformative (neutral)
 *     'incongruent'    : the FEWER side carries MORE total area -> area cue points the wrong way
 *
 * A dot layout is scatter-placed with rejection sampling so dots do not overlap.
 * The item is accepted only when (a) the two counts differ (a unique 'more'
 * side exists) and (b) the intended cue relationship between the two total areas
 * actually holds. `deriveMoreSide` recovers the key from served content alone
 * (no key leak), so it doubles as the deterministic validator.
 *
 * Note on representation: this type is intentionally notation-free at every band
 * (per its spec, K-1 and 2-3 only) — quantities are ALWAYS nonsymbolic dots and
 * never numerals. The general "dots low / numerals high" ramp does not apply;
 * here the ramp is ratio + exposure + cue difficulty.
 *
 * Usage:  node QUANT-DOTS-01.mjs [--seed=<str>] [--per=<n>] [--out=<path>]
 * Default: seed "quant-dots-01-v1", 6 items per difficulty rung (1..20) -> ~120.
 */

import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serializeBank } from './item-shape.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const TYPE_CODE = 'QUANT-DOTS-01';
const DOMAIN = 'quantitative';
const GENERATOR_REF = 'QUANT-DOTS-01-grammar@1';
const OPTION_KEYS = ['L', 'R'];

export const WINDOW_PX = 240;          // nominal square field per side (for area maths)
const PACK_FRACTION = 0.24;            // fraction of the field the dots may cover (headroom for rejection sampling)
const PAD_PCT = 9;                     // keep dot centres away from the window edge
const R_MIN_PX = 7, R_MAX_PX = 26;     // rendered dot radius clamp

/* ------------------------------------------------------------------ *
 * Seeded PRNG
 * ------------------------------------------------------------------ */
function xfnv1a(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
class Rng {
  constructor(seedStr) { this.seed = seedStr; this._r = mulberry32(xfnv1a(seedStr)); }
  next() { return this._r(); }
  int(lo, hi) { return lo + Math.floor(this.next() * (hi - lo + 1)); }
  range(lo, hi) { return lo + this.next() * (hi - lo); }
  pick(arr) { return arr[this.int(0, arr.length - 1)]; }
  chance(p) { return this.next() < p; }
  uuid() {
    const b = Array.from({ length: 16 }, () => this.int(0, 255));
    b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
    const h = b.map((x) => x.toString(16).padStart(2, '0'));
    return `${h.slice(0, 4).join('')}-${h.slice(4, 6).join('')}-${h.slice(6, 8).join('')}-${h.slice(8, 10).join('')}-${h.slice(10, 16).join('')}`;
  }
}

const round1 = (x) => Math.round(x * 10) / 10;
const round3 = (x) => Math.round(x * 1e3) / 1e3;
const totalArea = (side) => side.count * Math.PI * side.r * side.r;   // r in px

/* ------------------------------------------------------------------ *
 * Independent solver: the 'more' side from served content alone.
 * ------------------------------------------------------------------ */
export function deriveMoreSide(content) {
  const l = content.left.count, r = content.right.count;
  if (l === r) return null;                 // no unique answer (should never happen)
  return l > r ? 'L' : 'R';
}

/* ------------------------------------------------------------------ *
 * Difficulty schedule: rung (1..20) -> ratio / numerosity / exposure / cue
 * ------------------------------------------------------------------ */
const RUNGS = {
  1:  { ratio: 0.40, lLo: 8,  lHi: 10, exposure: 1200, cue: 'equal-size' },
  2:  { ratio: 0.45, lLo: 8,  lHi: 11, exposure: 1120, cue: 'equal-size' },
  3:  { ratio: 0.50, lLo: 9,  lHi: 12, exposure: 1040, cue: 'equal-size' },
  4:  { ratio: 0.55, lLo: 10, lHi: 13, exposure: 960,  cue: 'equal-size' },
  5:  { ratio: 0.60, lLo: 10, lHi: 14, exposure: 900,  cue: 'area-controlled' },
  6:  { ratio: 0.64, lLo: 11, lHi: 15, exposure: 830,  cue: 'area-controlled' },
  7:  { ratio: 0.67, lLo: 12, lHi: 16, exposure: 760,  cue: 'area-controlled' },
  8:  { ratio: 0.70, lLo: 12, lHi: 17, exposure: 700,  cue: 'area-controlled' },
  9:  { ratio: 0.73, lLo: 13, lHi: 18, exposure: 640,  cue: 'incongruent' },
  10: { ratio: 0.75, lLo: 14, lHi: 19, exposure: 600,  cue: 'incongruent' },
  11: { ratio: 0.78, lLo: 15, lHi: 20, exposure: 560,  cue: 'incongruent' },
  12: { ratio: 0.80, lLo: 16, lHi: 21, exposure: 520,  cue: 'incongruent' },
  13: { ratio: 0.82, lLo: 17, lHi: 22, exposure: 480,  cue: 'incongruent' },
  14: { ratio: 0.84, lLo: 18, lHi: 23, exposure: 440,  cue: 'incongruent' },
  15: { ratio: 0.86, lLo: 19, lHi: 24, exposure: 400,  cue: 'incongruent' },
  16: { ratio: 0.88, lLo: 20, lHi: 25, exposure: 370,  cue: 'incongruent' },
  17: { ratio: 0.90, lLo: 21, lHi: 26, exposure: 340,  cue: 'incongruent' },
  18: { ratio: 0.92, lLo: 22, lHi: 27, exposure: 310,  cue: 'incongruent' },
  19: { ratio: 0.94, lLo: 23, lHi: 28, exposure: 280,  cue: 'incongruent' },
  20: { ratio: 0.95, lLo: 24, lHi: 30, exposure: 250,  cue: 'incongruent' },
};

function ageBandsFor(target) {
  if (target <= 6) return ['K-1'];
  if (target <= 10) return ['K-1', '2-3'];
  return ['2-3'];
}

/* ------------------------------------------------------------------ *
 * Radii per cue condition (r in px). Returns {rMore, rFew} or null.
 * areaBudget = the larger total-area a side may use.
 * ------------------------------------------------------------------ */
function radiiFor(cue, L, S) {
  const budget = PACK_FRACTION * WINDOW_PX * WINDOW_PX;      // px^2 available per window
  const rFrom = (area, n) => Math.sqrt(area / (Math.PI * n));
  let rMore, rFew;
  if (cue === 'equal-size') {
    rMore = rFrom(budget, L); rFew = rMore;                  // area follows count (congruent)
  } else if (cue === 'area-controlled') {
    rMore = rFrom(budget, L); rFew = rFrom(budget, S);       // equal TOTAL area on both sides
  } else { // incongruent: fewer side gets MORE area
    rFew = rFrom(budget, S); rMore = rFrom(budget / 1.3, L); // area_more = area_few / 1.3
  }
  rMore = Math.min(R_MAX_PX, Math.max(R_MIN_PX, rMore));
  rFew = Math.min(R_MAX_PX, Math.max(R_MIN_PX, rFew));
  return { rMore: round1(rMore), rFew: round1(rFew) };
}

/* ------------------------------------------------------------------ *
 * Scatter placement: `count` non-overlapping dots of radius r (px) inside a
 * field expressed in PERCENT (0..100). Returns [{x,y}] (centres, percent) or null.
 * ------------------------------------------------------------------ */
function scatter(rng, count, rPx) {
  const rPct = (rPx / WINDOW_PX) * 100;
  const minSep = 2 * rPct + 1.6;                             // centre-to-centre gap
  const lo = PAD_PCT + rPct, hi = 100 - PAD_PCT - rPct;
  if (hi <= lo) return null;
  const pts = [];
  let tries = 0, cap = 500 * count + 800;
  while (pts.length < count && tries < cap) {
    tries++;
    const x = rng.range(lo, hi), y = rng.range(lo, hi);
    let ok = true;
    for (const p of pts) { const dx = p.x - x, dy = p.y - y; if (dx * dx + dy * dy < minSep * minSep) { ok = false; break; } }
    if (ok) pts.push({ x: round1(x), y: round1(y) });
  }
  return pts.length === count ? pts : null;
}

/* ------------------------------------------------------------------ *
 * Assemble one verified BankItem for a difficulty rung
 * ------------------------------------------------------------------ */
export function buildItem(masterSeed, target, ordinal) {
  const MAX_TRIES = 400;
  const cfg = RUNGS[target];

  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    const seed = `${masterSeed}:${TYPE_CODE}:d${target}:i${ordinal}:a${attempt}`;
    const rng = new Rng(seed);

    const L = rng.int(cfg.lLo, cfg.lHi);
    let S = Math.round(L * cfg.ratio);
    if (S >= L) S = L - 1;
    if (S < 2) continue;
    const actualRatio = S / L;
    // keep the actual ratio near the rung's intended ratio so difficulty is honest
    if (Math.abs(actualRatio - cfg.ratio) > 0.06) continue;

    const { rMore, rFew } = radiiFor(cfg.cue, L, S);
    const moreSide = rng.chance(0.5) ? 'L' : 'R';
    const leftIsMore = moreSide === 'L';
    const left = { count: leftIsMore ? L : S, r: leftIsMore ? rMore : rFew };
    const right = { count: leftIsMore ? S : L, r: leftIsMore ? rFew : rMore };

    // scatter both sides (rejection sampling)
    const leftDots = scatter(rng, left.count, left.r);
    if (!leftDots) continue;
    const rightDots = scatter(rng, right.count, right.r);
    if (!rightDots) continue;
    left.dots = leftDots; right.dots = rightDots;

    // ---- verify cue relationship actually holds (independent of intent) ----
    const aMore = leftIsMore ? totalArea(left) : totalArea(right);
    const aFew = leftIsMore ? totalArea(right) : totalArea(left);
    let cueOk = false;
    if (cfg.cue === 'equal-size') cueOk = Math.abs(left.r - right.r) < 1e-6 && aMore > aFew;
    else if (cfg.cue === 'area-controlled') cueOk = Math.abs(aMore - aFew) / Math.max(aMore, aFew) < 0.06;
    else cueOk = aFew > aMore * 1.15;      // incongruent: fewer side carries clearly more area
    if (!cueOk) continue;

    // ---- unique 'more' side ----
    if (left.count === right.count) continue;
    const correctKey = left.count > right.count ? 'L' : 'R';

    // difficulty float: rung + small jitter (|.|<0.5 keeps the integer bin stable)
    const jitter = (rng.next() - 0.5) * 0.84;
    const difficulty = Math.min(20, Math.max(1, Math.round((target + jitter) * 100) / 100));

    // named-misconception rationale for the WRONG (fewer) side, keyed to the cue
    const wrongKey = correctKey === 'L' ? 'R' : 'L';
    const cueMis = {
      'equal-size': { lure: 'guess', misconception: 'chose_fewer_no_cue' },
      'area-controlled': { lure: 'dot_size_cue', misconception: 'chose_larger_individual_dots' },
      'incongruent': { lure: 'area_cue', misconception: 'followed_total_area_not_number' },
    }[cfg.cue];

    const content = {
      typeCode: TYPE_CODE,
      mode: 'compare_more',
      left: { count: left.count, r: left.r, dots: left.dots },
      right: { count: right.count, r: right.r, dots: right.dots },
      exposureMs: cfg.exposure,
      cueCondition: cfg.cue,               // served so the renderer can label the trial (not the answer)
      options: [{ key: 'L' }, { key: 'R' }],
      prompt: 'Which side had more dots?',
    };

    return {
      itemId: rng.uuid(),
      typeCode: TYPE_CODE,
      domain: DOMAIN,
      difficulty,
      ageBands: ageBandsFor(target),
      content,
      answer: {
        correctKey,
        distractorRationales: { [wrongKey]: cueMis },
      },
      scoring: {
        mode: 'deterministic_key',
        rule: 'more_side',
        description: 'correct iff selectedKey == side with the larger dot count; deterministic and reproducible from the served arrays.',
      },
      provenance: {
        generator: 'grammar',
        generatorRef: GENERATOR_REF,
        seed,
        levers: {
          largeCount: L, smallCount: S, ratio: round3(actualRatio),
          exposureMs: cfg.exposure, cueCondition: cfg.cue,
          rMorePx: rMore, rFewPx: rFew,
          areaMore: Math.round(aMore), areaFew: Math.round(aFew),
          areaRatioFewOverMore: round3(aFew / aMore),
        },
        ruleSpec: { difficultyRung: target, aboveLevel: target >= 16 },
        validator: [
          { check: 'unique_answer', status: 'pass', detail: `counts ${left.count} vs ${right.count} -> more=${correctKey}` },
          { check: 'key_matches_solver', status: 'pass', detail: `deriveMoreSide -> ${correctKey}` },
          { check: 'cue_balance_ok', status: 'pass', detail: `${cfg.cue}: areaFew/areaMore=${round3(aFew / aMore)}` },
          { check: 'no_overlap', status: 'pass', detail: 'rejection-sampled non-overlapping dots' },
        ],
      },
      syntheticOnly: true,
      validated: false,
    };
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * Post-write verification
 * ------------------------------------------------------------------ */
function verifyBank(path) {
  const lines = readFileSync(path, 'utf8').split('\n').filter((l) => l.trim());
  const items = [];
  const problems = [];
  lines.forEach((line, i) => {
    let it; try { it = JSON.parse(line); } catch (e) { problems.push(`line ${i + 1}: JSON parse error`); return; }
    items.push(it);
    if (it.typeCode !== TYPE_CODE) problems.push(`${it.itemId}: bad typeCode`);
    if (it.domain !== DOMAIN) problems.push(`${it.itemId}: bad domain`);
    if (!(it.difficulty >= 1 && it.difficulty <= 20)) problems.push(`${it.itemId}: difficulty out of range`);
    if (it.syntheticOnly !== true || it.validated !== false) problems.push(`${it.itemId}: born-synthetic flags wrong`);
    if (it.scoring?.mode !== 'deterministic_key') problems.push(`${it.itemId}: scoring mode`);
    const c = it.content || {};
    if (!c.left || !c.right) { problems.push(`${it.itemId}: missing sides`); return; }
    if (c.left.count === c.right.count) problems.push(`${it.itemId}: equal counts (no unique answer)`);
    if ((c.left.dots || []).length !== c.left.count || (c.right.dots || []).length !== c.right.count) problems.push(`${it.itemId}: dot array length != count`);
    const solved = deriveMoreSide(c);
    if (solved !== it.answer.correctKey) problems.push(`${it.itemId}: solver ${solved} != correctKey ${it.answer.correctKey}`);
    // no answer leak in served options
    for (const o of c.options || []) for (const leak of ['correct', 'isCorrect', 'more', 'lure']) if (Object.prototype.hasOwnProperty.call(o, leak)) problems.push(`${it.itemId}: option leaks ${leak}`);
  });

  const bands = {};
  for (let p = 1; p <= 20; p++) bands[p] = 0;
  for (const it of items) for (let p = 1; p <= 20; p++) if (Math.abs(it.difficulty - p) <= 1) bands[p]++;
  const thinBands = Object.entries(bands).filter(([, c]) => c < 5).map(([p]) => p);
  return { count: items.length, bands, thinBands, problems, items };
}

/* ------------------------------------------------------------------ */
function main() {
  const args = Object.fromEntries(process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.*)$/); return m ? [m[1], m[2]] : [a.replace(/^--/, ''), true];
  }));
  const masterSeed = args.seed || 'quant-dots-01-v1';
  const perTarget = parseInt(args.per || '6', 10);
  const outPath = resolve(HERE, args.out || '../banks/QUANT-DOTS-01.jsonl');

  mkdirSync(dirname(outPath), { recursive: true });

  const items = [];
  const perTargetCount = {};
  for (let target = 1; target <= 20; target++) {
    let made = 0;
    for (let ordinal = 0; ordinal < perTarget; ordinal++) {
      const it = buildItem(masterSeed, target, ordinal);
      if (it) { items.push(it); made++; }
    }
    perTargetCount[target] = made;
  }

  const jsonl = serializeBank(items);
  writeFileSync(outPath, jsonl, 'utf8');

  const v = verifyBank(outPath);

  console.log(`\nQUANT-DOTS-01 bank written: ${outPath}`);
  console.log(`items: ${v.count}  (target ${perTarget}/rung x 20 rungs)`);
  console.log('\nrung -> made:');
  console.log('  ' + Array.from({ length: 20 }, (_, i) => `${i + 1}:${perTargetCount[i + 1]}`).join('  '));
  console.log('\n±1pt band coverage (need >=5):');
  console.log('  ' + Array.from({ length: 20 }, (_, i) => `${i + 1}:${v.bands[i + 1]}`).join('  '));
  const cues = {};
  for (const it of v.items) cues[it.content.cueCondition] = (cues[it.content.cueCondition] || 0) + 1;
  console.log('\ncue conditions:', JSON.stringify(cues));

  if (v.thinBands.length) console.log(`\nWARN thin ±1pt bands (<5): ${v.thinBands.join(', ')}`);
  if (v.problems.length) {
    console.log(`\nFAIL ${v.problems.length} validation problem(s):`);
    v.problems.slice(0, 25).forEach((p) => console.log('  - ' + p));
    process.exitCode = 1;
    return;
  }
  if (v.thinBands.length) { process.exitCode = 1; return; }
  console.log('\nOK: JSONL parses, coverage >=5 per ±1pt band, cue balance verified, and the solver re-derives every key from served content (no leak).');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
