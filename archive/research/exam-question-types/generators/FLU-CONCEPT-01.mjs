// FLU-CONCEPT-01 "Mystery Gate" — structured bank generator (Bucket A: grammar).
//
// Emits a STRUCTURED item bank (JSONL) conforming to EXAM_ADAPTIVE_BUILD_PLAN.md §2
// (BankItem) and EXAM_ITEM_SCHEMA_SPEC.md, following the FLU-MATRIX-01 reference
// vertical. Task (active/selection concept learning — Bruner, Goodnow & Austin 1956):
// a gate opens only for figures obeying a hidden rule; the child DESIGNS their own
// test figures, reads accept/reject, induces the rule, then classifies three probe
// figures. Only the three probe classifications are keyed; the tests are process data.
//
// ---------------------------------------------------------------------------
// WHY `content.gateOracle` IS NOT AN ANSWER LEAK
// The gate's verdict for a *buildable* figure is the item's STIMULUS — it is the
// evidence the child earns by experimenting, exactly as a matrix item's cells are
// the evidence it reasons over. What must never appear in `content` is the keyed
// answer, and it does not: the three PROBE figures are drawn from OUTSIDE the
// buildable palette (each probe carries at least one attribute value the child
// cannot build), so no probe verdict is present in the oracle. Recovering the key
// requires inducing the rule and generalising it — i.e. doing the task. The rule
// itself (the intensional description) and the probe verdicts stay SERVER-ONLY.
// The renderer consults the oracle only when the child presses SEND; it never
// displays it, and it computes no correctness.
// ---------------------------------------------------------------------------
//
// Governance: born-synthetic only (syntheticOnly:true, validated:false). The
// `difficulty` float is a DESIGN rung (hypothesis-space-search load model), NOT a
// calibrated IRT parameter.
//
// Difficulty derives from the type's declared difficulty_levers
// (master_types.jsonl FLU-CONCEPT-01):
//   size of the hypothesis space (number of features that vary) | rule form
//   (single -> relational/ordinal -> conjunction) | salience of the criterial
//   feature | feedback immediacy (per-send vs batched) | number of allowed tests.
//
// SERVED BANDS (2026-07 review: "grades 4-8 could do this but not the younger
// kids"). The type no longer emits K-1 or 2-3 items at all: the bank starts at
// difficulty 8, which is where the improvement plan §4 puts the bottom of the 4-5
// band on the shared 1..20 scale. Within the served range the rule FORM is banded
// too — a single-attribute gate rule for 4-5, a two-attribute conjunction for 6-8.
// The scale itself is unchanged, so a difficulty here still means what it means in
// every other type; the low rungs are simply not published for this one.
//
// Above level (16..20) keeps drawing from the full config space. The plan's
// above-level row asks for a disjunctive or negated rule, and that is not a bank
// change: `ruleAccepts` here, `conceptHypotheses` in apps/web verifiers/fluid.ts and
// the plpgsql port app.exam_verify_concept all enumerate CONJUNCTIONS, so a
// disjunction would leave the server unable to re-derive the key from the gate
// evidence. It needs a scoring-contract change across all three tiers, not a
// generator edit.
//
// ITEM-QUALITY INVARIANT (audited independently by check-FLU-CONCEPT-01.mjs):
//   the accept-set over the buildable palette IDENTIFIES the answer — every rule in
//   the hypothesis space consistent with that accept-set classifies all three probes
//   the same way, so the key is earnable from evidence alone (M-HYP is meaningful).
//
// Run:  node research/exam-question-types/generators/FLU-CONCEPT-01.mjs
//       writes ../banks/FLU-CONCEPT-01.jsonl and prints a coverage summary.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serializeBank } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

/* ------------------------------------------------------------------ *
 * Figure space. FULL[dim] is everything the renderer can draw; PALETTE[dim]
 * is the strict subset the child can BUILD (so probes can sit outside it).
 * ------------------------------------------------------------------ */
export const FULL = {
  shape: ['triangle', 'circle', 'star', 'square'],
  color: ['coral', 'blue', 'gold', 'mint'],
  count: [1, 2, 3, 4],
  size: ['small', 'big', 'huge'],
};
export const PALETTE = {
  shape: ['triangle', 'circle', 'star'],
  color: ['coral', 'blue', 'gold'],
  count: [1, 2, 3],
  size: ['small', 'big'],
};
export const DIMS = ['shape', 'color', 'count', 'size'];
export const figKey = (f) => DIMS.map((d) => f[d]).join('|');

/* ------------------------------------------------------------------ *
 * Seeded RNG (xmur3 -> mulberry32) for reproducible, born-synthetic content.
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
function makeRng(seed) {
  return mulberry32(xmur3(seed)());
}
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

/* ================================================================== *
 * RULE SEMANTICS — a rule is a conjunction of atoms over the varying dims.
 * atom: {kind:'eq', dim, value} | {kind:'gte', dim:'count', value}
 * ================================================================== */
export function atomHolds(a, f) {
  return a.kind === 'gte' ? f[a.dim] >= a.value : f[a.dim] === a.value;
}
export const ruleAccepts = (rule, f) => rule.atoms.every((a) => atomHolds(a, f));
export const ruleKey = (rule) =>
  rule.atoms
    .map((a) => `${a.dim}${a.kind === 'gte' ? '>=' : '='}${a.value}`)
    .sort()
    .join('&');

// Every figure the child can BUILD (the testable subspace).
export function paletteSpace(varyDims, fixed) {
  let out = [{ ...fixed }];
  for (const d of varyDims) {
    const next = [];
    for (const base of out) for (const v of PALETTE[d]) next.push({ ...base, [d]: v });
    out = next;
  }
  return out;
}
// Figures that carry at least one value the child CANNOT build (probe pool).
export function outsidePaletteSpace(varyDims, fixed) {
  let out = [{ ...fixed }];
  for (const d of varyDims) {
    const next = [];
    for (const base of out) for (const v of FULL[d]) next.push({ ...base, [d]: v });
    out = next;
  }
  return out.filter((f) => varyDims.some((d) => !PALETTE[d].includes(f[d])));
}
// The hypothesis space the child searches: conjunctions (arity 1..3) of atoms over
// distinct varying dims, using only values the child can actually build/test.
export function hypothesisSpace(varyDims, maxArity) {
  const atoms = [];
  for (const d of varyDims) {
    for (const v of PALETTE[d]) atoms.push({ kind: 'eq', dim: d, value: v });
    if (d === 'count') for (const k of [2, 3]) atoms.push({ kind: 'gte', dim: 'count', value: k });
  }
  const rules = [];
  const walk = (start, chosen, dimsUsed) => {
    if (chosen.length) rules.push({ atoms: chosen.slice() });
    if (chosen.length === maxArity) return;
    for (let i = start; i < atoms.length; i++) {
      if (dimsUsed.has(atoms[i].dim)) continue;
      chosen.push(atoms[i]);
      dimsUsed.add(atoms[i].dim);
      walk(i + 1, chosen, dimsUsed);
      dimsUsed.delete(atoms[i].dim);
      chosen.pop();
    }
  };
  walk(0, [], new Set());
  return rules;
}

/* ================================================================== *
 * DIFFICULTY MODEL — from the type's difficulty_levers. Grounded in
 * dual-search theory (Klahr & Dunbar 1988: cost grows with the size of the
 * hypothesis space and the number of experiments you may run) and concept
 * attainment (Bruner 1956: conjunctive categories are far harder than
 * single-feature ones). Mapped onto a FLOAT 1..20 rung.
 * ================================================================== */
export const FORM_LOAD = { single: 1.0, ordinal: 1.8, conj2: 2.8, conj3: 4.4 };
export const FORM_ARITY = { single: 1, ordinal: 1, conj2: 2, conj3: 3 };
// Perceptual salience of the criterial dimension (colour pops; count must be
// enumerated). Low salience => the child must search more of the space.
export const SALIENCE = { color: 0.0, shape: 0.6, size: 0.9, count: 1.4 };
const spaceTerm = (varyCount) => 1.3 * (varyCount - 2);
const salienceTerm = (ruleDims) => 1.2 * (ruleDims.reduce((s, d) => s + SALIENCE[d], 0) / ruleDims.length);
const feedbackTerm = (mode) => (mode === 'batched' ? 1.4 : 0);
const BUDGET_SPAN = 3.2; // test-budget lever contributes 0..3.2
const budgetTerm = (tightness) => BUDGET_SPAN * tightness;
// The budget is set RELATIVE to what the item actually needs: tightness 0 gives a
// generous allowance, tightness 1 gives exactly the disambiguation target, so a
// hard item is still winnable by a child who chooses informative tests (that is
// precisely what M-EFF scores). It is never below the target.
export const testsFor = (tightness, decideTarget) =>
  Math.max(decideTarget, Math.round(decideTarget + (1 - tightness) * (0.6 * decideTarget + 5)));

const subsets = (arr, k) => {
  const out = [];
  const walk = (i, cur) => {
    if (cur.length === k) return out.push(cur.slice());
    for (let j = i; j < arr.length; j++) {
      cur.push(arr[j]);
      walk(j + 1, cur);
      cur.pop();
    }
  };
  walk(0, []);
  return out;
};

function baseScore({ varyDims, form, ruleDims, feedbackMode }) {
  return 1.0 + FORM_LOAD[form] + spaceTerm(varyDims.length) + salienceTerm(ruleDims) + feedbackTerm(feedbackMode);
}

// Allowed lever configs. The rule may constrain at most |varyDims|-1 dimensions so
// a probe can always differ from the buildable space on a free varying dimension.
export const ALLOWED_CONFIGS = (() => {
  const out = [];
  for (let n = 2; n <= 4; n++)
    for (const varyDims of subsets(DIMS, n))
      for (const form of Object.keys(FORM_LOAD)) {
        const arity = FORM_ARITY[form];
        if (arity > varyDims.length - 1) continue;
        const dimChoices = form === 'ordinal' ? (varyDims.includes('count') ? [['count']] : []) : subsets(varyDims, arity);
        for (const ruleDims of dimChoices)
          for (const feedbackMode of ['immediate', 'batched'])
            out.push({ varyDims: varyDims.slice(), form, ruleDims: ruleDims.slice(), feedbackMode });
      }
  return out;
})();

/* ================================================================== *
 * SERVED BANDS — which rule form each grade band gets, on the plan §4 windows.
 *
 * `serves` is the reviewer's sentence expressed over the lever config; a config
 * that belongs to no served band is simply never published. Above level carries
 * `serves: null` (no restriction) because its row is not implementable in this
 * tier — see the header note on disjunctive rules.
 * ================================================================== */
export const BANDS = [
  // "4-5 single-attribute gate rule" — one atom, whether by identity or threshold.
  { band: '4-5', lo: 8, hi: 12, serves: (c) => c.form === 'single' || c.form === 'ordinal' },
  // "6-8 conjunctive rule (two attributes)".
  { band: '6-8', lo: 12, hi: 16, serves: (c) => c.form === 'conj2' },
  { band: 'above-level', lo: 16, hi: 20, serves: null },
];
/** Lowest difficulty this type publishes: K-1 and 2-3 are not served. */
export const SERVED_FLOOR = BANDS[0].lo;

/** The band whose window contains an integer difficulty bin. */
export function bandForBin(k) {
  return BANDS.find((b) => k <= b.hi) ?? BANDS[BANDS.length - 1];
}

const ALL_BASES = ALLOWED_CONFIGS.map(baseScore);
const RAW_MIN = Math.min(...ALL_BASES) + budgetTerm(0);
const RAW_MAX = Math.max(...ALL_BASES) + budgetTerm(1);

export function difficultyFromLevers(cfg, tightness) {
  const raw = baseScore(cfg) + budgetTerm(tightness);
  return clamp(1 + ((raw - RAW_MIN) * 19) / (RAW_MAX - RAW_MIN), 1, 20);
}
function solveTightness(cfg, targetD) {
  const rawNeeded = RAW_MIN + ((targetD - 1) * (RAW_MAX - RAW_MIN)) / 19;
  return clamp((rawNeeded - baseScore(cfg)) / BUDGET_SPAN, 0, 1);
}

/* ================================================================== *
 * GRAMMAR — rule, oracle, probes, identifiability audit.
 * ================================================================== */
const PROBE_KEYS = ['P1', 'P2', 'P3'];
// Ceiling items stay hard through rule form, hypothesis-space size and batched
// feedback — not through an unreasonably long experiment session.
const PRACTICAL_TEST_TARGET = 12;

function makeRule(form, ruleDims, rng) {
  if (form === 'ordinal') return { atoms: [{ kind: 'gte', dim: 'count', value: rng() < 0.5 ? 2 : 3 }] };
  return {
    atoms: ruleDims.map((d) => ({ kind: 'eq', dim: d, value: PALETTE[d][Math.floor(rng() * PALETTE[d].length)] })),
  };
}

// Rival rules a child plausibly settles on, used to label each wrong verdict string.
function rivalRules(rule, varyDims) {
  const rivals = [];
  if (rule.atoms.length > 1) {
    for (const a of rule.atoms)
      rivals.push({ rule: { atoms: [a] }, lure: 'over_general', note: `kept only the ${a.dim} part of the rule` });
    if (rule.atoms.length === 3)
      for (const pair of subsets(rule.atoms, 2))
        rivals.push({ rule: { atoms: pair }, lure: 'over_general', note: `dropped the ${rule.atoms.find((x) => !pair.includes(x)).dim} part of the rule` });
  }
  const free = varyDims.filter((d) => !rule.atoms.some((a) => a.dim === d));
  for (const d of free)
    rivals.push({
      rule: { atoms: [...rule.atoms, { kind: 'eq', dim: d, value: PALETTE[d][0] }] },
      lure: 'over_specific',
      note: `added an extra ${d} condition the evidence does not support`,
    });
  for (const d of varyDims) {
    if (rule.atoms.some((a) => a.dim === d)) continue;
    rivals.push({
      rule: { atoms: [{ kind: 'eq', dim: d, value: PALETTE[d][0] }] },
      lure: 'feature_swap',
      note: `latched onto ${d} instead of the criterial feature`,
    });
  }
  return rivals;
}
const verdictString = (rule, probes) => probes.map((p) => (ruleAccepts(rule, p.figure) ? 'Y' : 'N')).join('');

/* ------------------------------------------------------------------ *
 * KEY BALANCE (E-073)
 * The key here is the three-probe verdict string, and the reachable key space
 * is the six patterns that mix both verdicts. Left alone the grammar collapses
 * onto the three "exactly one accept" patterns, because a rule that accepts
 * only a narrow slice of the palette usually admits just one accepting probe
 * outside it. That hands a test-taker who always answers the modal pattern a
 * pseudo-guessing advantage, which inflates low-ability accuracy (M-ACC).
 *
 * The fix is not a permutation: the bank builder passes the six patterns in
 * least-used-first order, and the item re-draws its rule until the probe pool
 * can supply the top choice's accept-count, then lays the probes out so the
 * accepts fall on that pattern's slots. Configs that constrain every varying
 * dimension but one admit exactly ONE accepting probe outside the palette, so
 * they can never serve a two-accept pattern; those fall back to the best
 * reachable pattern in the same order and the builder re-balances against what
 * the item actually realised.
 * ------------------------------------------------------------------ */
export const VERDICT_PATTERNS = ['YNN', 'NYN', 'NNY', 'YYN', 'YNY', 'NYY'];
const acceptCount = (pattern) => [...pattern].filter((c) => c === 'Y').length;

function layOutProbes(figures, rule, pattern) {
  let seq = figures;
  if (pattern) {
    const yes = figures.filter((f) => ruleAccepts(rule, f));
    const no = figures.filter((f) => !ruleAccepts(rule, f));
    if (yes.length === acceptCount(pattern)) seq = [...pattern].map((c) => (c === 'Y' ? yes.shift() : no.shift()));
  }
  return seq.map((figure, i) => ({ key: PROBE_KEYS[i], figure }));
}

// Greedy disambiguation target: how many well-chosen tests are enough to DECIDE the
// three probes (the child never has to pin the rule down further than that). A
// heuristic upper bound on the true minimum, used as the M-EFF denominator and as
// the floor of the test budget.
export function greedyTestsToDecide(rule, probes, space, hyps) {
  const verdict = (r) => verdictString(r, probes);
  const truthString = verdict(rule);
  let candidates = hyps.filter((r) => space.some(() => true));
  let tests = 0;
  while (candidates.some((r) => verdict(r) !== truthString) && tests < space.length) {
    let best = null;
    for (const f of space) {
      const yes = candidates.filter((r) => ruleAccepts(r, f)).length;
      const split = Math.min(yes, candidates.length - yes);
      if (!best || split > best.split) best = { f, split };
    }
    if (!best || best.split === 0) break; // no remaining test can split the set
    const truth = ruleAccepts(rule, best.f);
    candidates = candidates.filter((r) => ruleAccepts(r, best.f) === truth);
    tests++;
  }
  return Math.max(1, tests);
}

/**
 * Generate ONE structured BankItem.
 * @param {{varyDims,form,ruleDims,feedbackMode,budgetTightness,keyPattern,seed}} lever
 */
export function genItem({ varyDims, form, ruleDims, feedbackMode, budgetTightness, keyPattern, seed }) {
  const rng = makeRng(seed);
  const fixed = {};
  for (const d of DIMS) if (!varyDims.includes(d)) fixed[d] = PALETTE[d][0];

  const space = paletteSpace(varyDims, fixed);
  const outside = outsidePaletteSpace(varyDims, fixed);
  const hyps = hypothesisSpace(varyDims, Math.min(3, Math.max(1, varyDims.length - 1)));

  const preference = (Array.isArray(keyPattern) ? keyPattern : []).filter((p) => VERDICT_PATTERNS.includes(p));
  let built = null;
  let bestSoFar = null;
  // Two passes: the first insists on the top-preference verdict pattern, the
  // second settles for the best reachable one so a config whose rules cannot
  // supply that accept-count still yields an item rather than throwing.
  for (let attempt = 0; attempt < 160 && !built; attempt++) {
    const strict = attempt < 80;
    const rule = makeRule(form, ruleDims, rng);
    const accepted = space.filter((f) => ruleAccepts(rule, f));
    if (!accepted.length || accepted.length === space.length) continue; // must split the space

    // Probes live OUTSIDE the buildable palette, and must include both verdicts.
    const pool = shuffle(outside, rng);
    const yes = pool.filter((f) => ruleAccepts(rule, f));
    const no = pool.filter((f) => !ruleAccepts(rule, f));
    if (!yes.length || !no.length) continue;
    // 1 or 2 accepting probes. The requested pattern fixes the count; without a
    // preference list it is drawn from the seed, as before.
    const reachable = (p) => yes.length >= acceptCount(p) && no.length >= 3 - acceptCount(p);
    let wanted = null;
    if (preference.length) {
      wanted = strict ? (reachable(preference[0]) ? preference[0] : null) : (preference.find(reachable) ?? null);
      if (!wanted) continue; // this rule cannot serve the request; draw another
    }
    let chosen;
    if (wanted) {
      const wantYes = acceptCount(wanted);
      chosen = [...yes.slice(0, wantYes), ...no.slice(0, 3 - wantYes)];
    } else {
      const wantYes = rng() < 0.5 ? 1 : 2;
      chosen = [...yes.slice(0, Math.min(wantYes, yes.length))];
      for (const f of no) {
        if (chosen.length >= 3) break;
        chosen.push(f);
      }
      for (const f of yes) {
        if (chosen.length >= 3) break;
        if (!chosen.includes(f)) chosen.push(f);
      }
      if (chosen.length !== 3) continue;
    }
    const probes = layOutProbes(shuffle(chosen, rng), rule, wanted);
    if (!probes.some((p) => ruleAccepts(rule, p.figure)) || !probes.some((p) => !ruleAccepts(rule, p.figure))) continue;

    // IDENTIFIABILITY: every hypothesis consistent with the accept-set over the
    // buildable palette must classify all three probes the same way.
    const consistent = hyps.filter((r) => space.every((f) => ruleAccepts(r, f) === ruleAccepts(rule, f)));
    if (!consistent.length) continue;
    const target = verdictString(rule, probes);
    if (!consistent.every((r) => verdictString(r, probes) === target)) continue;

    // Keep the session humane: prefer a rule/probe pair a child can settle within a
    // dozen well-chosen experiments, keeping the best candidate seen either way.
    const decide = greedyTestsToDecide(rule, probes, space, hyps);
    const candidate = { rule, probes, accepted, target, decide };
    if (decide <= PRACTICAL_TEST_TARGET) built = candidate;
    else if (!bestSoFar || decide < bestSoFar.decide) bestSoFar = candidate;
  }
  if (!built) built = bestSoFar;
  if (!built) throw new Error(`could not build an identifiable ${form} item (seed ${seed})`);

  const { rule, probes, accepted, target, decide: decideTarget } = built;
  const maxTests = testsFor(budgetTightness, decideTarget);

  // Verdict-string distractors, labelled by the mis-rule that produces them.
  const distractorRationales = {};
  for (const rival of rivalRules(rule, varyDims)) {
    const vs = verdictString(rival.rule, probes);
    if (vs === target || distractorRationales[vs]) continue;
    distractorRationales[vs] = { lure: rival.lure, note: rival.note, rivalRule: ruleKey(rival.rule) };
  }
  const inverted = target
    .split('')
    .map((c) => (c === 'Y' ? 'N' : 'Y'))
    .join('');
  if (inverted !== target && !distractorRationales[inverted])
    distractorRationales[inverted] = { lure: 'inverted_rule', note: 'read the gate backwards (accept vs reject swapped)' };
  for (let m = 0; m < 8; m++) {
    const vs = [4, 2, 1].map((bit) => (m & bit ? 'Y' : 'N')).join('');
    if (vs === target || distractorRationales[vs]) continue;
    distractorRationales[vs] = { lure: 'inconsistent_with_evidence', note: 'no rule consistent with the gate produces this pattern' };
  }

  const cfg = { varyDims, form, ruleDims, feedbackMode };
  const difficulty = round2(difficultyFromLevers(cfg, budgetTightness));

  return {
    itemId: seededUuid(seed),
    typeCode: 'FLU-CONCEPT-01',
    domain: 'fluid_reasoning',
    difficulty, // FLOAT 1..20 — DESIGN rung, not calibrated (validated:false)
    ageBands: ageBandsFor(difficulty),
    demoPath: 'demos/FLU-CONCEPT-01.html',
    content: {
      typeCode: 'FLU-CONCEPT-01',
      varyDims: varyDims.slice(), // which pickers the child gets
      fixedAttributes: { ...fixed }, // held constant across every figure
      palette: Object.fromEntries(varyDims.map((d) => [d, PALETTE[d].slice()])),
      // Evidence the gate returns for a BUILT figure (see the header note: this is
      // stimulus, not the key — no probe figure appears here).
      gateOracle: space.map((f) => ({ figure: { ...f }, accepts: ruleAccepts(rule, f) })),
      hintFigure: { ...accepted[0] }, // the hint lamp reveals one extra opener
      maxTests,
      feedback: { mode: feedbackMode, batchSize: feedbackMode === 'batched' ? 3 : 1 },
      probes: probes.map((p) => ({ key: p.key, figure: { ...p.figure } })), // classified one at a time
    },
    answer: {
      // Three keyed binary classifications, in probe order: Y = the gate opens.
      correctKey: target,
      probeVerdicts: probes.map((p) => ({ key: p.key, opens: ruleAccepts(rule, p.figure) })),
      rule: { form, atoms: rule.atoms.map((a) => ({ ...a })), key: ruleKey(rule) },
      greedyTestsToDecide: decideTarget, // M-EFF denominator (heuristic target)
      distractorRationales, // keyed by rival verdict string -> concept-error taxonomy
    },
    scoring: { mode: 'deterministic_key' },
    provenance: {
      generator: 'grammar',
      generatorRef: 'flu-concept-01-grammar@1',
      seed,
      levers: {
        varyDims: varyDims.slice(),
        form,
        ruleDims: ruleDims.slice(),
        feedbackMode,
        keyPattern: preference.slice(), // verdict patterns in least-used-first order at build time
        // Full precision (not rounded): enables exact, reproducible regeneration.
        budgetTightness,
      },
    },
    syntheticOnly: true,
    validated: false,
  };
}

// Age band, read straight off the §4 window the item's difficulty falls in. The
// bands no longer overlap: since the 2026-07 review restricted this type to 4-5 and
// up, the band also decides the rule form (BANDS above), and an item cannot be two
// rule forms at once. Declared bands are 4-5 | 6-8; above level (16..20) reports as
// `6-8` because the item schema's band vocabulary stops there (`ageBandSchema`,
// packages/contracts).
export function ageBandsFor(difficulty) {
  return difficulty < 12 ? ['4-5'] : ['6-8'];
}

/* ================================================================== *
 * BANK BUILDER — fill each integer difficulty bin in the SERVED range with
 * >=perBin items (BUILD_PLAN §0: >=5 per +/-1 pt band). The served range starts
 * at SERVED_FLOOR because the review took the younger bands off this type; bins
 * below it are not built at all. Items in a bin spread across the configs their
 * band allows; the test budget is the continuous fine-positioner within a bin.
 * ================================================================== */
export function buildBank({ perBin = 6 } = {}) {
  const items = [];
  // Offer the verdict patterns least-used-first, then re-balance against the
  // pattern the item actually realised (not every config can serve every one).
  const keyUse = new Map(VERDICT_PATTERNS.map((p) => [p, 0]));
  const patternPreference = () => VERDICT_PATTERNS.slice().sort((a, b) => keyUse.get(a) - keyUse.get(b));
  for (let k = Math.ceil(SERVED_FLOOR); k <= 20; k++) {
    // The bin is clipped to its band's window as well as to +/-0.45, so a boundary
    // bin cannot borrow the rule form of the band next door.
    const band = bandForBin(k);
    const lo = Math.max(SERVED_FLOOR, band.lo, k - 0.45);
    const hi = Math.min(20, band.hi, k + 0.45);
    const allowed = band.serves ? ALLOWED_CONFIGS.filter(band.serves) : ALLOWED_CONFIGS;

    const segments = [];
    for (const cfg of allowed) {
      const a = Math.max(lo, difficultyFromLevers(cfg, 0));
      const b = Math.min(hi, difficultyFromLevers(cfg, 1));
      if (b > a + 1e-6) segments.push({ cfg, tLo: a, tHi: b });
    }
    if (segments.length === 0)
      throw new Error(`no reachable ${band.band} lever config for difficulty bin k=${k}`);

    const stride = Math.max(1, Math.floor(segments.length / perBin));
    const hits = segments.map(() => 0);
    for (let i = 0; i < perBin; i++) hits[(i * stride) % segments.length]++;
    const localSeen = segments.map(() => 0);

    for (let i = 0; i < perBin; i++) {
      const segIdx = (i * stride) % segments.length;
      const seg = segments[segIdx];
      const li = localSeen[segIdx]++;
      const t = seg.tLo + (seg.tHi - seg.tLo) * ((li + 0.5) / hits[segIdx]);
      const tightness = solveTightness(seg.cfg, t);
      const c = seg.cfg;
      const seed = `FLU-CONCEPT-01|bin=${k}|i=${i}|V${c.varyDims.join('-')}|${c.form}|R${c.ruleDims.join('-')}|${c.feedbackMode}`;
      const item = genItem({ ...c, budgetTightness: tightness, keyPattern: patternPreference(), seed });
      keyUse.set(item.answer.correctKey, (keyUse.get(item.answer.correctKey) ?? 0) + 1);
      items.push(item);
    }
  }
  return items;
}

/* ------------------------------------------------------------------ *
 * CLI entrypoint: write the bank + print a coverage summary.
 * ------------------------------------------------------------------ */
function isMain() {
  return process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
}
if (isMain()) {
  const perBin = Number(process.env.PER_BIN || 6);
  const items = buildBank({ perBin });
  const outPath = resolve(__dirname, '../banks/FLU-CONCEPT-01.jsonl');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, serializeBank(items));

  const bins = Array.from({ length: 20 }, () => 0);
  let min = Infinity;
  let max = -Infinity;
  for (const it of items) {
    const k = Math.round(it.difficulty);
    if (k >= 1 && k <= 20) bins[k - 1]++;
    min = Math.min(min, it.difficulty);
    max = Math.max(max, it.difficulty);
  }
  console.log(`FLU-CONCEPT-01 bank: ${items.length} items -> ${outPath}`);
  console.log(`difficulty span: ${round2(min)} .. ${round2(max)}  (served target ${SERVED_FLOOR}..20)`);
  console.log('per-bin counts (k: n):');
  console.log(bins.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join('  '));
  const short = bins
    .map((n, i) => ({ k: i + 1, n }))
    .filter((b) => b.k >= Math.ceil(SERVED_FLOOR) && b.n < 5);
  console.log(short.length ? `SHORT BINS (<5): ${short.map((b) => b.k).join(',')}` : 'all served bins >=5 OK');
  const perBand = new Map();
  for (const it of items) perBand.set(it.ageBands.join('+'), (perBand.get(it.ageBands.join('+')) ?? 0) + 1);
  console.log(`bands served: ${[...perBand].map(([b, n]) => `${b}:${n}`).join('  ')}  (K-1 / 2-3 not served)`);
}
