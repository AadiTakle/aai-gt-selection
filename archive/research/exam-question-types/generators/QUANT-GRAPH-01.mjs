#!/usr/bin/env node
/**
 * QUANT-GRAPH-01 — "Story Graph" structured bank generator (Bucket A: grammar).
 *
 * Emits a JSONL bank of BankItem rows conforming to the Adaptive Exam item
 * contract (docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md §2). Every item is
 * born-synthetic (syntheticOnly:true, validated:false); `difficulty` is a DESIGN
 * rung (FLOAT 1..20), NOT a calibrated IRT parameter.
 *
 * CONSTRUCT: graph comprehension across Friel/Curcio/Bright's levels (read the
 * data -> read between the data -> read beyond the data) driven by covariational
 * reasoning (Carlson et al. 2002). One latent quantity story is generated first;
 * BOTH the animation frames and the keyed graph are derived from that same data
 * (Koedinger & Nathan 2004), so the graph is never decoration.
 *
 * The QUESTION a rung asks is the main difficulty lever, because the mapping a
 * child must invert gets deeper without the numbers getting bigger:
 *   amount  (rungs 1-8)   graph the level shown at each beat        (read the data)
 *   compare (rungs 9-12)  graph two quantities, incl. where they cross
 *   total   (rungs 13-16) accumulate visible rate strips into a running total
 *   step    (rungs 17-20) recover the per-beat rate from an amount story
 * Secondary levers: beat count, constant vs changing rate, turning points, bar vs
 * path representation, and foil proximity. Values stay tiny throughout (levels
 * <= 12 blocks, rates <= 4 drops): the ceiling is the relation, not the counting.
 *
 * Every emitted item is verified by a solver that reads the SERVED content only:
 * it re-derives the target series from `content.story` + `content.question`
 * (identity / cumulative sum / successive difference) and requires exactly one
 * option to carry it, so no answer data need live in `content`.
 *
 * Usage:  node QUANT-GRAPH-01.mjs [--seed=<str>] [--per=<n>] [--out=<path>]
 * Default: seed "quant-graph-01-v1", 7 items per difficulty rung (1..20) -> 140.
 */

import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serializeBank } from './item-shape.mjs';
import { VarietyLedger } from './variety.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const TYPE_CODE = 'QUANT-GRAPH-01';
export const ITEMS_PER_RUNG = 7;
const DOMAIN = 'quantitative';
const DEMO_PATH = 'demos/QUANT-GRAPH-01.html';
const GENERATOR_REF = 'QUANT-GRAPH-01-grammar@1';
const OPTION_KEYS = ['A', 'B', 'C', 'D'];
const LEVEL_CAP = 12;    // tallest tank level (blocks) the story ever reaches
const RATE_CAP = 4;      // most drops a single beat can deliver

/* ------------------------------------------------------------------ *
 * Seeded PRNG (deterministic, reproducible per provenance.seed)
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
  pick(arr) { return arr[this.int(0, arr.length - 1)]; }
  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = this.int(0, i);[a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  uuid() {
    const b = Array.from({ length: 16 }, () => this.int(0, 255));
    b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
    const h = b.map((x) => x.toString(16).padStart(2, '0'));
    return `${h.slice(0, 4).join('')}-${h.slice(4, 6).join('')}-${h.slice(6, 8).join('')}-${h.slice(8, 10).join('')}-${h.slice(10, 16).join('')}`;
  }
}

/* ------------------------------------------------------------------ *
 * Series algebra — the ONLY transformations the task ever asks for.
 * ------------------------------------------------------------------ */
export const cumulative = (rates) => { let s = 0; return rates.map((r) => (s += r)); };
export const successiveDiff = (levels) => levels.slice(1).map((v, i) => v - levels[i]);
const same = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => v === b[i]);
const sameSeries = (a, b) => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) if (!same(a[k], b[k])) return false;
  return true;
};

/**
 * Re-derive the keyed graph series from the SERVED story alone.
 * This is the whole answer key: identity, running total, or per-beat change.
 */
export function deriveTargetSeries(content) {
  const track = (id) => content.story.tracks.find((t) => t.id === id);
  switch (content.question) {
    case 'amount': return { A: track('A').values.slice() };
    case 'compare': return { A: track('A').values.slice(), B: track('B').values.slice() };
    case 'total': return { A: cumulative(track('A').values) };
    case 'step': return { A: successiveDiff(track('A').values) };
    default: return null;
  }
}

/* ------------------------------------------------------------------ *
 * Story generators — a latent quantity story, in the story's own units.
 * ------------------------------------------------------------------ */
function levelsFromSteps(start, steps, cap) {
  const out = [start];
  for (const s of steps) {
    const next = out[out.length - 1] + s;
    if (next < 0 || next > cap) return null;
    out.push(next);
  }
  return out;
}
// `stepChoices` / `startMax` widen the steady-climb floor (rungs 1 and 3),
// where the default 2 step sizes x 3 starting levels is fewer distinct stories
// than the rung has items to fill.
function amountStory(rng, shape, beats, cap = LEVEL_CAP, opts = {}) {
  const n = beats - 1;
  const stepChoices = opts.stepChoices || [1, 2];
  let steps;
  switch (shape) {
    case 'up_steady': { const k = rng.pick(stepChoices); steps = Array.from({ length: n }, () => k); break; }
    case 'up_varied': {
      steps = Array.from({ length: n }, () => rng.int(1, 3));
      // A "varied" climb that happens to draw one step size IS a steady climb,
      // and would collide with the steady rung one rung below.
      if (steps.every((s) => s === steps[0])) return null;
      break;
    }
    case 'with_flat': {
      steps = Array.from({ length: n }, () => rng.int(0, 2));
      if (!steps.includes(0)) steps[rng.int(0, n - 1)] = 0;
      if (steps.every((s) => s === 0)) return null;
      break;
    }
    case 'turn': {
      const up = rng.int(1, Math.max(1, n - 1));
      steps = Array.from({ length: n }, (_, i) => (i < up ? rng.int(1, 3) : -rng.int(1, 2)));
      break;
    }
    case 'accelerate': { let k = rng.int(1, 2); steps = Array.from({ length: n }, () => k++); break; }
    case 'decelerate': { let k = rng.int(2, 3); steps = Array.from({ length: n }, () => Math.max(0, k--)); break; }
    default: return null;
  }
  const start = shape === 'turn' ? rng.int(1, 3) : rng.int(0, opts.startMax ?? 2);
  return levelsFromSteps(start, steps, cap);
}
function rateStory(rng, shape, beats, opts = {}) {
  let rates;
  switch (shape) {
    case 'flat_rate': { const k = rng.int(1, opts.rateMax ?? 3); rates = Array.from({ length: beats }, () => k); break; }
    case 'varied_rate': {
      rates = Array.from({ length: beats }, () => rng.int(1, RATE_CAP));
      // Same reason as up_varied: a constant "varied" rate is the flat rung.
      if (rates.every((r) => r === rates[0])) return null;
      break;
    }
    case 'rate_with_pause': {
      rates = Array.from({ length: beats }, () => rng.int(1, RATE_CAP));
      rates[rng.int(1, beats - 2)] = 0;
      break;
    }
    case 'rising_rate': { let k = rng.int(1, 2); rates = Array.from({ length: beats }, () => Math.min(RATE_CAP, k++)); break; }
    default: return null;
  }
  if (cumulative(rates).some((v) => v > LEVEL_CAP + 6)) return null;
  return rates;
}

/* ------------------------------------------------------------------ *
 * Difficulty schedule: rung (1..20) -> question + story shape + levers.
 * The QUESTION deepens first (read the data -> between -> beyond), then the
 * story gains beats, turning points and changing rates, then foils tighten.
 * ------------------------------------------------------------------ */
// `story` collects the knobs that only widen a rung's stimulus space; they do
// not move a difficulty lever. Rungs 1, 3 and 13 carry them because the levers
// alone leave those rungs with fewer distinct stories than they have items:
// rung 1 and 3 had 6 steady climbs each and rung 13 had 3 constant-rate
// stories, against 7 items per rung.
function configFor(rng, d) {
  const table = {
    1: { question: 'amount', mode: 'bars', beats: 3, shape: 'up_steady', options: 3, proximity: 'far', story: { stepChoices: [1, 2, 3], startMax: 5 } },
    2: { question: 'amount', mode: 'bars', beats: 3, shape: 'up_varied', options: 3, proximity: 'far' },
    3: { question: 'amount', mode: 'bars', beats: 4, shape: 'up_steady', options: 3, proximity: 'far', story: { stepChoices: [1, 2, 3], startMax: 4 } },
    4: { question: 'amount', mode: 'bars', beats: 4, shape: 'up_varied', options: 3, proximity: 'medium' },
    5: { question: 'amount', mode: 'line', beats: 4, shape: 'up_varied', options: 3, proximity: 'medium' },
    6: { question: 'amount', mode: 'line', beats: 4, shape: 'with_flat', options: 4, proximity: 'medium' },
    7: { question: 'amount', mode: 'line', beats: 5, shape: 'turn', options: 4, proximity: 'medium' },
    8: { question: 'amount', mode: 'line', beats: 5, shape: 'accelerate', options: 4, proximity: 'near' },
    9: { question: 'compare', mode: 'twoline', beats: 4, shape: 'up_steady', shapeB: 'turn', options: 3, proximity: 'medium' },
    10: { question: 'compare', mode: 'twoline', beats: 4, shape: 'up_varied', shapeB: 'up_steady', options: 4, proximity: 'medium' },
    11: { question: 'compare', mode: 'twoline', beats: 5, shape: 'with_flat', shapeB: 'up_varied', options: 4, proximity: 'near' },
    12: { question: 'compare', mode: 'twoline', beats: 5, shape: 'accelerate', shapeB: 'decelerate', options: 4, proximity: 'near' },
    13: { question: 'total', mode: 'line', beats: [3, 5], shape: 'flat_rate', options: 3, proximity: 'medium', story: { rateMax: RATE_CAP } },
    14: { question: 'total', mode: 'line', beats: 4, shape: 'varied_rate', options: 4, proximity: 'medium' },
    15: { question: 'total', mode: 'line', beats: 4, shape: 'rate_with_pause', options: 4, proximity: 'near' },
    16: { question: 'total', mode: 'line', beats: 5, shape: 'rate_with_pause', options: 4, proximity: 'near' },
    17: { question: 'step', mode: 'bars', beats: 4, shape: 'up_varied', options: 4, proximity: 'medium' },
    18: { question: 'step', mode: 'bars', beats: 5, shape: 'with_flat', options: 4, proximity: 'near' },
    19: { question: 'step', mode: 'bars', beats: 6, shape: 'up_varied', options: 4, proximity: 'near' },
    20: { question: 'step', mode: 'bars', beats: 6, shape: 'with_flat', options: 4, proximity: 'near' },
  };
  const cfg = { ...table[d] };
  cfg.rung = d;
  if (Array.isArray(cfg.beats)) cfg.beats = rng.int(cfg.beats[0], cfg.beats[1]);
  if (cfg.question === 'compare') cfg.shapeB = rng.pick([cfg.shapeB, 'up_varied', 'turn']);
  return cfg;
}

/* ------------------------------------------------------------------ *
 * Foils — one NAMED graph misconception each (Friel et al. 2001 lists the
 * classic confusions: height vs slope, slope vs level, missed intersection,
 * iconic/temporal misreading). Each foil is a full series, drawn on the SAME
 * fixed scale as the key so no foil can be dismissed on shape alone.
 * ------------------------------------------------------------------ */
const clampTo = (v, hi) => Math.max(0, Math.min(hi, v));
const flatAt = (v, n) => Array.from({ length: n }, () => v);
const linearBetween = (a, b, n) => Array.from({ length: n }, (_, i) => Math.round(a + ((b - a) * i) / (n - 1)));
const laggedByOne = (s) => [s[0], ...s.slice(0, -1)];
const bumpAt = (s, i, delta, hi) => s.map((v, j) => (j === i ? clampTo(v + delta, hi) : v));

function foilCandidates(rng, ctx) {
  const { target, content, cfg, hi } = ctx;
  const A = target.A, n = A.length;
  const out = [];
  const add = (series, lure, misconception, note) => out.push({ series, lure, misconception, note });
  const trackA = content.story.tracks.find((t) => t.id === 'A');

  if (cfg.question === 'compare') {
    const B = target.B;
    add({ A: B.slice(), B: A.slice() }, 'track_swap', 'swaps_the_two_quantities',
      'draws each path against the wrong quantity');
    add({ A: A.slice(), B: A.map((v) => clampTo(v + 1, hi)) }, 'intersection_error', 'removes_the_crossing',
      'keeps the paths apart so they never meet, losing the catch-up moment');
    add({ A: A.slice(), B: laggedByOne(B) }, 'temporal_shift', 'misaligns_the_second_beat',
      'shifts one path a beat late, moving where the paths meet');
    add({ A: A.slice(), B: B.slice().reverse() }, 'direction_reversal', 'reverses_the_second_path',
      'runs the second quantity backwards in time');
    add({ A: linearBetween(A[0], A[n - 1], n), B: B.slice() }, 'constant_rate', 'straightens_a_changing_rate',
      'replaces a changing rate with one steady slope between the same endpoints');
    add({ A: A.slice(), B: bumpAt(B, rng.int(1, n - 1), rng.pick([1, -1]), hi) }, 'near_height', 'one_beat_off_by_one',
      'one point of the second path sits a block off');
    return out;
  }

  add(A.slice().reverse(), 'direction_reversal', 'reads_the_story_backwards',
    'plots the story in reverse time order');
  add(laggedByOne(A), 'temporal_shift', 'lags_one_beat',
    'lines the graph up one beat late against the animation');
  add(flatAt(A[Math.min(1, n - 1)], n), 'slope_as_level', 'flattens_to_one_value',
    'reads a single value as the whole story: no change over time');
  add(linearBetween(A[0], A[n - 1], n), 'constant_rate', 'straightens_a_changing_rate',
    'replaces the changing rate with one steady slope between the same endpoints');
  add(bumpAt(A, rng.int(0, n - 1), 1, hi), 'near_height', 'one_beat_too_high',
    'one point sits one block too high');
  add(bumpAt(A, rng.int(0, n - 1), -1, hi), 'near_height', 'one_beat_too_low',
    'one point sits one block too low');
  add(A.map((v) => clampTo(v + 1, hi)), 'start_offset', 'shifts_the_whole_story_up',
    'right shape, wrong starting amount');

  if (cfg.question === 'total') {
    add(trackA.values.slice(), 'rate_as_total', 'plots_the_rate_strips',
      'graphs how much arrived each beat instead of the running total');
    add(trackA.values.map((v, i) => clampTo(v + (i > 0 ? trackA.values[i - 1] : 0), hi)), 'rate_as_total', 'adds_only_the_last_two_beats',
      'accumulates only the previous beat instead of the whole story');
  }
  if (cfg.question === 'step') {
    add(trackA.values.slice(0, n), 'amount_as_rate', 'plots_the_levels',
      'graphs how full the tank was instead of how much was added');
    add(trackA.values.slice(1, n + 1), 'amount_as_rate', 'plots_the_later_levels',
      'graphs the tank level after each beat instead of the amount added');
    add(cumulative(A).map((v) => clampTo(v, hi)), 'rate_as_total', 'accumulates_instead_of_stepping',
      'adds the steps up rather than showing each step on its own');
  }
  return out;
}

function makeFoils(rng, ctx) {
  const wanted = ctx.cfg.options - 1;
  const seen = [ctx.target];
  const picked = [];
  const proximityRank = {
    far: ['direction_reversal', 'slope_as_level', 'start_offset', 'temporal_shift', 'constant_rate', 'near_height'],
    medium: ['rate_as_total', 'amount_as_rate', 'slope_as_level', 'direction_reversal', 'constant_rate', 'track_swap', 'intersection_error', 'temporal_shift', 'start_offset', 'near_height'],
    near: ['amount_as_rate', 'rate_as_total', 'near_height', 'temporal_shift', 'intersection_error', 'constant_rate', 'track_swap', 'slope_as_level', 'start_offset', 'direction_reversal'],
  }[ctx.cfg.proximity];

  const pool = foilCandidates(rng, ctx).map((f) => ({
    ...f,
    series: ctx.cfg.question === 'compare' ? f.series : { A: f.series },
  }));
  const take = (f) => {
    if (picked.length >= wanted) return;
    if (seen.some((s) => sameSeries(s, f.series))) return;       // never duplicate the key or a sibling foil
    if (Object.values(f.series).some((s) => s.some((v) => v < 0 || v > ctx.hi))) return;
    seen.push(f.series);
    picked.push(f);
  };
  for (const lure of proximityRank) pool.filter((f) => f.lure === lure).forEach(take);
  pool.forEach(take);
  return picked.length === wanted ? picked : null;
}

/* ------------------------------------------------------------------ *
 * Age-band targeting hint. QUANT-GRAPH-01 declares 2-3 | 4-5 | 6-8 only
 * (master_types.jsonl): icon axes already demand coordinating two ordered
 * dimensions, so the type has no K-1 floor even at rung 1.
 * ------------------------------------------------------------------ */
export function ageBandsFor(target) {
  if (target <= 6) return ['2-3'];
  if (target <= 8) return ['2-3', '4-5'];
  if (target <= 12) return ['4-5'];
  if (target === 13) return ['4-5', '6-8'];
  return ['6-8'];
}

const PROMPTS = {
  amount: 'Watch the tank. Tap the graph that shows how full it is at each beat.',
  compare: 'Watch both tanks. Tap the graph that shows what each one does at every beat.',
  total: 'Drops arrive at each beat. Tap the graph that shows the total collected so far.',
  step: 'Watch the tank. Tap the graph that shows how much was added at each beat.',
};

/* ------------------------------------------------------------------ *
 * Assemble a single verified BankItem for a target difficulty rung
 * ------------------------------------------------------------------ */
export function buildItem(masterSeed, target, ordinal, ledger = new VarietyLedger()) {
  const MAX_TRIES = 900;
  const STRICT_TRIES = 400;    // budget spent insisting on a story the bank has not told yet
  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    const seed = `${masterSeed}:${TYPE_CODE}:d${target}:i${ordinal}:a${attempt}`;
    const rng = new Rng(seed);
    const cfg = configFor(rng, target);

    // ---- latent story (animation frames and the keyed graph share this data) ----
    const tracks = [];
    if (cfg.question === 'total') {
      const rates = rateStory(rng, cfg.shape, cfg.beats, cfg.story);
      if (!rates) continue;
      tracks.push({ id: 'A', kind: 'rate', icon: 'drops', values: rates });
    } else {
      const levels = amountStory(rng, cfg.shape, cfg.beats, LEVEL_CAP, cfg.story);
      if (!levels) continue;
      tracks.push({ id: 'A', kind: 'amount', icon: 'tank', values: levels });
      if (cfg.question === 'compare') {
        const other = amountStory(rng, cfg.shapeB, cfg.beats);
        if (!other) continue;
        if (same(other, levels)) continue;
        tracks.push({ id: 'B', kind: 'amount', icon: 'tower', values: other });
      }
    }

    const draft = { question: cfg.question, story: { beats: cfg.beats, tracks } };
    const targetSeries = deriveTargetSeries(draft);
    if (!targetSeries) continue;
    const xCount = targetSeries.A.length;
    if (xCount < 2) continue;
    if (Object.values(targetSeries).some((s) => s.some((v) => v < 0))) continue;

    // A flat key is not a graph-comprehension item: require visible variation.
    if (new Set(targetSeries.A).size < 2) continue;
    if (cfg.question === 'step' && cfg.rung >= 18 && new Set(targetSeries.A).size < 3) continue;
    // Two-quantity items must actually covary (and, when they cross, cross once).
    if (cfg.question === 'compare') {
      const diffSigns = new Set(targetSeries.A.map((v, i) => Math.sign(v - targetSeries.B[i])));
      diffSigns.delete(0);
      if (diffSigns.size < (cfg.rung >= 11 ? 2 : 1)) continue;    // 11+ must contain a crossing
    }

    const hi = Math.max(4, ...Object.values(targetSeries).flat()) + 1;
    const foils = makeFoils(rng, { target: targetSeries, content: draft, cfg, hi });
    if (!foils) continue;

    const yMax = Math.max(hi, ...foils.flatMap((f) => Object.values(f.series).flat()));

    // ---- options: key + foils, shuffled; keys assigned by final position ----
    const optDefs = rng.shuffle([{ series: targetSeries, _correct: true }, ...foils]);
    const options = optDefs.map((o, i) => ({ key: OPTION_KEYS[i], series: o.series }));
    const correctKey = OPTION_KEYS[optDefs.findIndex((o) => o._correct)];
    const distractorRationales = {};
    optDefs.forEach((o, i) => {
      if (o._correct) return;
      distractorRationales[OPTION_KEYS[i]] = { lure: o.lure, misconception: o.misconception, note: o.note };
    });

    const jitter = (rng.next() - 0.5) * 0.84;
    const difficulty = Math.min(20, Math.max(1, Math.round((target + jitter) * 100) / 100));

    const content = {
      typeCode: TYPE_CODE,
      prompt: PROMPTS[cfg.question],
      question: cfg.question,                 // amount | compare | total | step
      story: {
        beats: cfg.beats,
        tracks,                                // animation data == graph source data
        replayable: true,                      // working memory must not be the hidden test
      },
      graph: {
        mode: cfg.mode,                        // bars | line | twoline
        yMax,                                  // ONE fixed scale for every option
        xCount,                                // points per series
        series: cfg.question === 'compare' ? ['A', 'B'] : ['A'],
        xLabel: cfg.question === 'step' ? 'beat' : 'time',
        yLabel: cfg.question === 'step' ? 'added' : cfg.question === 'total' ? 'total' : 'blocks',
      },
      options,                                 // {key, series} only — no lure, no key
    };

    // Final no-leak gate: the solver must recover the key from `content` alone.
    const recovered = deriveTargetSeries(content);
    const carriers = options.filter((o) => sameSeries(o.series, recovered));
    if (carriers.length !== 1 || carriers[0].key !== correctKey) continue;

    // Variety gate. The ledger's key ignores option order, so a rejected
    // attempt has to change the story, not the seating — and acceptance stays
    // independent of which slot the key landed in.
    if (!ledger.wants(content, attempt < STRICT_TRIES)) continue;
    ledger.add(content);

    return {
      itemId: rng.uuid(),
      typeCode: TYPE_CODE,
      domain: DOMAIN,
      difficulty,
      ageBands: ageBandsFor(target),
      demoPath: DEMO_PATH,
      content,
      answer: { correctKey, distractorRationales },
      scoring: { mode: 'deterministic_key' },
      provenance: {
        generator: 'grammar',
        generatorRef: GENERATOR_REF,
        seed,
        storyShape: cfg.question === 'compare' ? `${cfg.shape}+${cfg.shapeB}` : cfg.shape,
        levers: {
          difficultyRung: target,
          question: cfg.question,
          relation: { amount: 'read_the_data', compare: 'covariation_and_intersection', total: 'accumulation', step: 'rate_of_change' }[cfg.question],
          beats: cfg.beats,
          quantities: tracks.length,
          representation: cfg.mode,
          foilProximity: cfg.proximity,
          aboveLevel: target >= 16,
        },
        validator: [
          { check: 'unique_answer', status: 'pass', detail: `1 of ${options.length} options matches the derived series` },
          { check: 'key_matches_solver', status: 'pass', detail: `${cfg.question} -> [${recovered.A.join(',')}]` },
          { check: 'fixed_scale_no_deception', status: 'pass', detail: `yMax=${yMax} shared by every option` },
          { check: 'lure_taxonomy_ok', status: 'pass' },
          { check: 'reading_load_ok', status: 'pass', detail: 'one instruction line; no prose stimulus; replayable animation' },
        ],
      },
      syntheticOnly: true,
      validated: false,
    };
  }
  return null;
}

/**
 * The whole bank, in emission order. One variety ledger spans every rung, so
 * two rungs cannot tell the same story either. The checker regenerates through
 * this same entry point, which is what keeps the committed bank byte-exact.
 */
export function buildBank(masterSeed, perTarget = ITEMS_PER_RUNG) {
  const ledger = new VarietyLedger();
  const items = [];
  const perTargetCount = {};
  for (let target = 1; target <= 20; target++) {
    let made = 0;
    for (let ordinal = 0; ordinal < perTarget; ordinal++) {
      const it = buildItem(masterSeed, target, ordinal, ledger);
      if (it) { items.push(it); made++; }
    }
    perTargetCount[target] = made;
  }
  return { items, perTargetCount };
}

/* ------------------------------------------------------------------ *
 * Post-write verification (generator smoke check; the binding independent
 * re-derivation lives in check-QUANT-GRAPH-01.mjs)
 * ------------------------------------------------------------------ */
function verifyBank(path) {
  const lines = readFileSync(path, 'utf8').split('\n').filter((l) => l.trim());
  const items = [], problems = [];
  lines.forEach((line, i) => {
    let it; try { it = JSON.parse(line); } catch (e) { problems.push(`line ${i + 1}: JSON parse error`); return; }
    items.push(it);
    if (it.typeCode !== TYPE_CODE) problems.push(`${it.itemId}: bad typeCode`);
    if (it.domain !== DOMAIN) problems.push(`${it.itemId}: bad domain`);
    if (!(it.difficulty >= 1 && it.difficulty <= 20)) problems.push(`${it.itemId}: difficulty out of range`);
    if (it.syntheticOnly !== true || it.validated !== false) problems.push(`${it.itemId}: born-synthetic flags wrong`);
    if (it.scoring?.mode !== 'deterministic_key') problems.push(`${it.itemId}: scoring mode`);
    const opts = it.content?.options || [];
    if (opts.length < 3 || opts.length > 4) problems.push(`${it.itemId}: option count ${opts.length}`);
    const recovered = deriveTargetSeries(it.content);
    const carriers = opts.filter((o) => sameSeries(o.series, recovered));
    if (carriers.length !== 1) problems.push(`${it.itemId}: ${carriers.length} options match the derived series`);
    else if (carriers[0].key !== it.answer.correctKey) problems.push(`${it.itemId}: solver key ${carriers[0].key} != ${it.answer.correctKey}`);
    for (const k of opts.map((o) => o.key).filter((k) => k !== it.answer.correctKey)) {
      if (!it.answer.distractorRationales?.[k]) problems.push(`${it.itemId}: missing rationale for ${k}`);
    }
    if (/"correctKey"|"lure"|"misconception"/.test(JSON.stringify(it.content))) problems.push(`${it.itemId}: content leaks answer data`);
  });

  const bands = {}, rounded = {};
  for (let p = 1; p <= 20; p++) bands[p] = 0;
  for (const it of items) {
    for (let p = 1; p <= 20; p++) if (Math.abs(it.difficulty - p) <= 1) bands[p]++;
    const r = Math.round(it.difficulty); rounded[r] = (rounded[r] || 0) + 1;
  }
  const thinBands = Object.entries(bands).filter(([, c]) => c < 5).map(([p]) => p);
  const thinBins = Array.from({ length: 20 }, (_, i) => i + 1).filter((k) => (rounded[k] || 0) < 5);
  return { count: items.length, bands, rounded, thinBands, thinBins, problems, items };
}

/* ------------------------------------------------------------------ */
function main() {
  const args = Object.fromEntries(process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.*)$/); return m ? [m[1], m[2]] : [a.replace(/^--/, ''), true];
  }));
  const masterSeed = args.seed || 'quant-graph-01-v1';
  const perTarget = parseInt(args.per || String(ITEMS_PER_RUNG), 10);
  const outPath = resolve(HERE, args.out || '../banks/QUANT-GRAPH-01.jsonl');
  mkdirSync(dirname(outPath), { recursive: true });

  const { items, perTargetCount } = buildBank(masterSeed, perTarget);

  writeFileSync(outPath, serializeBank(items), 'utf8');
  const v = verifyBank(outPath);

  console.log(`\nQUANT-GRAPH-01 bank written: ${outPath}`);
  console.log(`items: ${v.count}  (target ${perTarget}/rung x 20 rungs)`);
  console.log('\nrung -> made:');
  console.log('  ' + Array.from({ length: 20 }, (_, i) => `${i + 1}:${perTargetCount[i + 1]}`).join('  '));
  console.log('\ninteger bin counts (need >=5):');
  console.log('  ' + Array.from({ length: 20 }, (_, i) => `${i + 1}:${v.rounded[i + 1] || 0}`).join('  '));
  console.log('\n±1pt band coverage (need >=5):');
  console.log('  ' + Array.from({ length: 20 }, (_, i) => `${i + 1}:${v.bands[i + 1]}`).join('  '));
  const qs = {}, lures = {};
  for (const it of v.items) {
    qs[it.content.question] = (qs[it.content.question] || 0) + 1;
    for (const r of Object.values(it.answer.distractorRationales)) lures[r.lure] = (lures[r.lure] || 0) + 1;
  }
  console.log('\ngraph relations:', JSON.stringify(qs));
  console.log('lure taxonomy:', JSON.stringify(lures));

  if (v.problems.length) {
    console.log(`\nFAIL ${v.problems.length} validation problem(s):`);
    v.problems.slice(0, 25).forEach((p) => console.log('  - ' + p));
    process.exitCode = 1;
    return;
  }
  if (v.thinBins.length || v.thinBands.length) {
    console.log(`\nFAIL thin coverage — bins: ${v.thinBins.join(', ') || 'none'} / bands: ${v.thinBands.join(', ') || 'none'}`);
    process.exitCode = 1;
    return;
  }
  console.log('\nOK: JSONL parses, >=5 items per integer bin and per ±1pt band, and the story solver re-derives every key from served content (no leak).');
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) main();
