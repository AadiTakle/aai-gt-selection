#!/usr/bin/env node
/**
 * QUANT-BUILD-01 — "Biggest Number" structured bank generator (Bucket A: grammar).
 *
 * Emits a JSONL bank of BankItem rows conforming to the Adaptive Exam item
 * contract (docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md §2). Every item is
 * born-synthetic (syntheticOnly:true, validated:false); difficulty is a design
 * rung (FLOAT 1..20), NOT a calibrated IRT parameter.
 *
 * CONSTRUCTION / OPTIMISATION TASK. The child arranges a row of quantity/digit
 * cards into ordered place slots to build the LARGEST (or SMALLEST) value that
 * obeys the pictured rules. The response is the final ARRANGEMENT; the server
 * scores its numeric value against the unique constrained optimum. scoring.mode
 * is 'deterministic_key': the key is the optimal arrangement / value, recovered
 * by exhaustively solving the (small) permutation space.
 *
 * Difficulty rises along the type's declared levers (types_quantitative.jsonl):
 *   number of cards / place slots, largest-vs-smallest goal, representation
 *   (dot-quantity lanes at the preliteracy floor -> digit cards with place-value
 *   support higher up), and the number of simultaneous property constraints
 *   (even/odd ending, equal-group factor divisibility, fixed-position digit).
 *
 * UNIQUE-answer verification: every permutation of the cards is enumerated,
 * filtered to the feasible set (no leading zero, plus the item's constraints),
 * and the optimum is taken. The item is accepted only when (a) a feasible
 * arrangement exists, (b) the optimal VALUE is strictly better than the next
 * distinct feasible value (a real gap, so the "best" is unambiguous), and (c)
 * the shown starting layout is not already optimal (>=1 swap is required).
 * `solveOptimum` recovers the key from served content alone (cards + goal +
 * constraints), so it doubles as the deterministic validator — no key leak.
 *
 * Usage:  node QUANT-BUILD-01.mjs [--seed=<str>] [--per=<n>] [--out=<path>]
 * Default: seed "quant-build-01-v1", 6 items per difficulty rung (1..20) -> ~120.
 */

import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const TYPE_CODE = 'QUANT-BUILD-01';
const DOMAIN = 'quantitative';
const GENERATOR_REF = 'QUANT-BUILD-01-grammar@1';

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
  pick(arr) { return arr[this.int(0, arr.length - 1)]; }
  chance(p) { return this.next() < p; }
  sample(arr, k) {                                    // k distinct picks
    const a = arr.slice(), out = [];
    for (let i = 0; i < k && a.length; i++) out.push(a.splice(this.int(0, a.length - 1), 1)[0]);
    return out;
  }
  shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = this.int(0, i);[a[i], a[j]] = [a[j], a[i]]; } return a; }
  uuid() {
    const b = Array.from({ length: 16 }, () => this.int(0, 255));
    b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
    const h = b.map((x) => x.toString(16).padStart(2, '0'));
    return `${h.slice(0, 4).join('')}-${h.slice(4, 6).join('')}-${h.slice(6, 8).join('')}-${h.slice(8, 10).join('')}-${h.slice(10, 16).join('')}`;
  }
}

/* ------------------------------------------------------------------ *
 * Permutation + feasibility (shared with the check script)
 * ------------------------------------------------------------------ */
export function permutations(values) {
  if (values.length <= 1) return [values.slice()];
  const out = [];
  values.forEach((v, i) => permutations(values.filter((_, j) => j !== i)).forEach((rest) => out.push([v, ...rest])));
  return out;
}
export const valueOf = (order) => Number(order.join(''));

// Feasibility under the served constraints (a construction that violates any of
// these is not a legal number / breaks a pictured rule).
export function feasible(order, constraints) {
  if (order.length > 1 && order[0] === 0) return false;         // no leading zero
  const last = order[order.length - 1];
  if (constraints.unitDiv && last % constraints.unitDiv !== 0) return false;
  if (constraints.odd && last % 2 !== 1) return false;
  if (constraints.fixed && order[constraints.fixed.pos] !== constraints.fixed.digit) return false;
  return true;
}

// Independent solver: the unique constrained optimum from served content alone.
// Returns { arrangement, value, arrangements, runnerUp } or null if infeasible.
export function solveOptimum(content) {
  const { cards, goal, constraints } = content;
  const feas = permutations(cards).filter((p) => feasible(p, constraints || {}));
  if (!feas.length) return null;
  const values = feas.map(valueOf);
  const best = goal === 'max' ? Math.max(...values) : Math.min(...values);
  const distinct = [...new Set(values)].sort((a, b) => a - b);
  const runnerUp = goal === 'max' ? distinct[distinct.length - 2] : distinct[1];
  const arrangements = feas.filter((p) => valueOf(p) === best);
  return { arrangement: arrangements[0].slice(), value: best, arrangements, runnerUp: runnerUp == null ? null : runnerUp };
}

/* ------------------------------------------------------------------ *
 * Difficulty schedule: rung (1..20) -> card count / representation / goal /
 * constraint set. Low = 2 dot-quantity lanes; high = 5 digit cards with several
 * simultaneous constraints.
 * ------------------------------------------------------------------ */
const RUNGS = {
  1:  { n: 2, rep: 'dots',   goal: 'max', cons: [] },
  2:  { n: 2, rep: 'dots',   goal: 'max', cons: [] },
  3:  { n: 2, rep: 'dots',   goal: 'min', cons: [] },
  4:  { n: 3, rep: 'dots',   goal: 'max', cons: [] },
  5:  { n: 3, rep: 'digits', goal: 'max', cons: [] },
  6:  { n: 3, rep: 'digits', goal: 'min', cons: [] },
  7:  { n: 3, rep: 'digits', goal: 'max', cons: ['even'] },
  8:  { n: 3, rep: 'digits', goal: 'max', cons: ['div5'] },
  9:  { n: 4, rep: 'digits', goal: 'max', cons: [] },
  10: { n: 4, rep: 'digits', goal: 'min', cons: [] },
  11: { n: 4, rep: 'digits', goal: 'max', cons: ['odd'] },
  12: { n: 4, rep: 'digits', goal: 'max', cons: ['even'] },
  13: { n: 4, rep: 'digits', goal: 'min', cons: ['div5'] },
  14: { n: 4, rep: 'digits', goal: 'max', cons: ['fixed'] },
  15: { n: 4, rep: 'digits', goal: 'max', cons: ['even', 'fixed'] },
  16: { n: 5, rep: 'digits', goal: 'max', cons: [] },
  17: { n: 5, rep: 'digits', goal: 'max', cons: ['odd'] },
  18: { n: 5, rep: 'digits', goal: 'min', cons: ['even'] },
  19: { n: 5, rep: 'digits', goal: 'max', cons: ['even', 'fixed'] },
  20: { n: 5, rep: 'digits', goal: 'min', cons: ['odd', 'fixed'] },
};

function ageBandsFor(target) {
  if (target <= 3) return ['K-1'];
  if (target === 4) return ['K-1', '2-3'];
  if (target <= 7) return ['2-3'];
  if (target === 8) return ['2-3', '4-5'];
  if (target <= 11) return ['4-5'];
  if (target === 12) return ['4-5', '6-8'];
  return ['6-8'];
}

// Build the constraints object for a rung from named tokens + the sampled cards.
function makeConstraints(rng, tokens, cards) {
  const c = {};
  for (const t of tokens) {
    if (t === 'even') c.unitDiv = 2;
    else if (t === 'div5') c.unitDiv = 5;
    else if (t === 'odd') c.odd = true;
    else if (t === 'fixed') {
      const pos = rng.int(0, cards.length - 1);
      c.fixed = { pos, digit: rng.pick(cards) };       // pin one card to one slot
    }
  }
  return c;
}

/* ------------------------------------------------------------------ *
 * Named-misconception wrong constructions (the distractor taxonomy). Each is a
 * concrete arrangement a documented error strategy would build. Scoring never
 * uses these — they annotate the error space.
 * ------------------------------------------------------------------ */
function misconstructions(cards, goal, constraints, optimalValue) {
  const sortedDesc = [...cards].sort((a, b) => b - a);
  const sortedAsc = [...cards].sort((a, b) => a - b);
  const cand = {};
  // ignore ALL rules, just sort for the goal by place value (greedy)
  const greedy = goal === 'max' ? sortedDesc : sortedAsc;
  cand.local_greedy = { arrangement: greedy, misconception: 'greedy_place_value_ignores_constraints', lure: 'rule_violation' };
  // optimise in the WRONG direction
  cand.reversed_goal = { arrangement: goal === 'max' ? sortedAsc : sortedDesc, misconception: 'reversed_optimization', lure: 'reversed_relation' };
  // if there is a units/parity constraint, the value-greedy build usually breaks it
  if (constraints.unitDiv || constraints.odd) {
    cand.ignored_units = { arrangement: greedy, misconception: constraints.odd ? 'ignored_odd_ending' : (constraints.unitDiv === 5 ? 'ignored_equal_group_factor' : 'ignored_even_ending'), lure: 'rule_violation' };
  }
  if (constraints.fixed) {
    cand.ignored_fixed = { arrangement: greedy, misconception: 'ignored_fixed_position', lure: 'rule_violation' };
  }
  // near-miss: swap the two highest-value places of the greedy build
  if (cards.length >= 2) {
    const sw = greedy.slice(); [sw[0], sw[1]] = [sw[1], sw[0]];
    cand.place_value_swap = { arrangement: sw, misconception: 'transposed_high_places', lure: 'near_order' };
  }
  // keep only arrangements that differ from the optimum, dedupe by arrangement
  const out = {}; const seen = new Set();
  for (const [name, d] of Object.entries(cand)) {
    const key = d.arrangement.join(',');
    if (valueOf(d.arrangement) === optimalValue) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out[name] = { arrangement: d.arrangement, value: valueOf(d.arrangement), misconception: d.misconception, lure: d.lure };
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Assemble one verified BankItem for a difficulty rung
 * ------------------------------------------------------------------ */
export function buildItem(masterSeed, target, ordinal) {
  const MAX_TRIES = 800;
  const cfg = RUNGS[target];

  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    const seed = `${masterSeed}:${TYPE_CODE}:d${target}:i${ordinal}:a${attempt}`;
    const rng = new Rng(seed);

    // distinct card values 1..9 (distinctness guarantees a unique optimum)
    const cards = rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], cfg.n);
    const constraints = makeConstraints(rng, cfg.cons, cards);

    const sol = solveOptimum({ cards, goal: cfg.goal, constraints });
    if (!sol) continue;                                       // infeasible under constraints
    // unique optimum: exactly one optimal arrangement AND a strictly worse runner-up
    if (sol.arrangements.length !== 1) continue;
    if (sol.runnerUp == null) continue;                       // need a real second-best
    if (cfg.goal === 'max' && !(sol.value > sol.runnerUp)) continue;
    if (cfg.goal === 'min' && !(sol.value < sol.runnerUp)) continue;

    // starting layout: a shuffle that is NOT already optimal (>=1 swap needed)
    let initial = null;
    for (let s = 0; s < 40; s++) {
      const cand = rng.shuffle(cards);
      if (valueOf(cand) !== sol.value) { initial = cand; break; }
    }
    if (!initial) continue;

    const distractors = misconstructions(cards, cfg.goal, constraints, sol.value);
    if (Object.keys(distractors).length < 1) continue;        // need >=1 named error

    // difficulty float: rung + small jitter (|.|<0.5 keeps the integer bin stable)
    const jitter = (rng.next() - 0.5) * 0.84;
    const difficulty = Math.min(20, Math.max(1, Math.round((target + jitter) * 100) / 100));

    // human-readable constraint captions for the renderer (drawn as rule icons)
    const ruleText = [];
    if (constraints.unitDiv === 2) ruleText.push('ends even');
    if (constraints.unitDiv === 5) ruleText.push('ends in an equal-group of five');
    if (constraints.odd) ruleText.push('ends odd');
    if (constraints.fixed) ruleText.push(`slot ${constraints.fixed.pos + 1} is fixed`);

    const content = {
      typeCode: TYPE_CODE,
      representation: cfg.rep,                 // 'dots' (magnitude lanes) | 'digits' (place value)
      goal: cfg.goal,                          // 'max' | 'min'
      slots: cfg.n,
      cards: initial.slice(),                  // the starting layout the child rearranges
      constraints,                             // shown to the child as rule icons (NOT the answer)
      ruleText,
      response: { kind: 'ordering', length: cfg.n },
      prompt: cfg.goal === 'max' ? 'Arrange the cards to build the biggest number that follows the rules.'
        : 'Arrange the cards to build the smallest number that follows the rules.',
    };

    return {
      itemId: rng.uuid(),
      typeCode: TYPE_CODE,
      domain: DOMAIN,
      difficulty,
      ageBands: ageBandsFor(target),
      content,
      answer: {
        correctKey: sol.arrangement.join(''),   // canonical optimal arrangement as a key string
        optimalArrangement: sol.arrangement,
        optimalValue: sol.value,
        runnerUpValue: sol.runnerUp,
        distractorRationales: distractors,       // named misconception -> wrong build + value
      },
      scoring: {
        mode: 'deterministic_key',
        rule: 'constructed_value_equals_optimum',
        optimalValue: sol.value,
        description:
          'correct iff the child\'s final arrangement is feasible (no leading zero + all shown ' +
          'constraints) AND Number(arrangement.join("")) == optimalValue. Deterministic and ' +
          'reproducible from the stored arrangement + the served cards/goal/constraints.',
      },
      provenance: {
        generator: 'grammar',
        generatorRef: GENERATOR_REF,
        seed,
        levers: {
          slots: cfg.n, representation: cfg.rep, goal: cfg.goal,
          constraintCount: cfg.cons.length, constraints,
          optimalValue: sol.value, runnerUpValue: sol.runnerUp,
          gapToRunnerUp: Math.abs(sol.value - sol.runnerUp),
        },
        ruleSpec: { difficultyRung: target, aboveLevel: target >= 16 },
        validator: [
          { check: 'unique_answer', status: 'pass', detail: `1 optimal arrangement, runner-up ${sol.runnerUp}` },
          { check: 'key_matches_solver', status: 'pass', detail: `solveOptimum -> ${sol.value}` },
          { check: 'requires_rearrangement', status: 'pass', detail: `start ${valueOf(initial)} != optimum ${sol.value}` },
          { check: 'reading_load_ok', status: 'pass', detail: 'no prose stimulus; goal + rules are pictorial' },
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
    if (!Array.isArray(c.cards) || c.cards.length !== c.slots) problems.push(`${it.itemId}: cards length != slots`);
    const sol = solveOptimum(c);
    if (!sol) { problems.push(`${it.itemId}: solver found no feasible arrangement`); return; }
    if (sol.arrangements.length !== 1) problems.push(`${it.itemId}: optimum not unique (${sol.arrangements.length} arrangements)`);
    if (sol.value !== it.answer.optimalValue) problems.push(`${it.itemId}: solver value ${sol.value} != answer ${it.answer.optimalValue}`);
    if (it.answer.correctKey !== sol.arrangement.join('')) problems.push(`${it.itemId}: correctKey != solver arrangement`);
    if (valueOf(c.cards) === sol.value) problems.push(`${it.itemId}: start layout already optimal`);
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
  const masterSeed = args.seed || 'quant-build-01-v1';
  const perTarget = parseInt(args.per || '6', 10);
  const outPath = resolve(HERE, args.out || '../banks/QUANT-BUILD-01.jsonl');

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

  const jsonl = items.map((it) => JSON.stringify(it)).join('\n') + '\n';
  writeFileSync(outPath, jsonl, 'utf8');

  const v = verifyBank(outPath);

  console.log(`\nQUANT-BUILD-01 bank written: ${outPath}`);
  console.log(`items: ${v.count}  (target ${perTarget}/rung x 20 rungs)`);
  console.log('\nrung -> made:');
  console.log('  ' + Array.from({ length: 20 }, (_, i) => `${i + 1}:${perTargetCount[i + 1]}`).join('  '));
  console.log('\n±1pt band coverage (need >=5):');
  console.log('  ' + Array.from({ length: 20 }, (_, i) => `${i + 1}:${v.bands[i + 1]}`).join('  '));
  const gs = {};
  for (const it of v.items) { const k = `${it.content.slots}c/${it.content.goal}/${(it.provenance.levers.constraintCount)}r`; gs[k] = (gs[k] || 0) + 1; }
  console.log('\nshapes (cards/goal/rules):', JSON.stringify(gs));

  if (v.thinBands.length) console.log(`\nWARN thin ±1pt bands (<5): ${v.thinBands.join(', ')}`);
  if (v.problems.length) {
    console.log(`\nFAIL ${v.problems.length} validation problem(s):`);
    v.problems.slice(0, 25).forEach((p) => console.log('  - ' + p));
    process.exitCode = 1;
    return;
  }
  if (v.thinBands.length) { process.exitCode = 1; return; }
  console.log('\nOK: JSONL parses, coverage >=5 per ±1pt band, unique optima verified, and the solver re-derives every key from served content (no leak).');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
