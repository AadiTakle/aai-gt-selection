// Independent validator for the FLU-OPCHAIN-01 dual-mode banks (STAGE2_QUESTION_DESIGN §9.2, U4).
//
// The D4 orientation algebra, the operator semantics, the partial-rule taxonomy and the difficulty
// arithmetic are RE-IMPLEMENTED here from the documented model rather than imported, so a bug in the
// generator cannot validate itself. The generator is imported only to prove each item is
// byte-reproducible from its own provenance.
//
// U4's acceptance is "independent re-derivation of the key agrees on 100% of BOTH banks", so this
// script checks the pair, not one file, and additionally checks the property that makes the pair a
// control condition rather than two banks: they are equated on every scored quantity and differ only
// in whether the hidden badge->operator mapping persists.
//
// Checks (exit nonzero on any failure):
//   1.  JSONL parses; every line is a well-formed BankItem (BUILD_PLAN §2 shape).
//   2.  Key containment: `content` names no operator, states no mapping, and carries no verdict.
//   3.  KEY RE-DERIVED: applying the mapping's operator chain to the input reproduces exactly the
//       option `correctKey` names — on every item of both banks.
//   4.  Anti-leak, two invariants (E-075/E-076):
//       (a) the key is never the UNIQUE option that changed the most components from the input, so
//           "tap whichever picture changed most" cannot beat chance; and
//       (b) the key is never the UNIQUE option reachable by RELABELLING the badges. Guessing the
//           hidden mapping is exactly guessing an ordered selection of distinct operators for the
//           chain's positions, so if only one option is consistent with any of them, a browser
//           recovers the key from `content` with no induction at all. This is a stronger attack
//           than (a) and it is the one that catches chains carrying all three orientation
//           operators, where the D4 product collapses several relabellings onto the key.
//   5.  Distractors: all five options distinct; every wrong option is the output of a named partial
//       rule, re-derived here, and its declared ruleId/kind agree (the §4.6 strategy trace).
//   6.  Chain invariants: length equals depth, no operator repeats, the declared geometric count is
//       right, and the geometric part never composes to the identity.
//   7.  Difficulty equals the value re-derived from the item's own levers, and the item regenerates
//       byte-identically from its provenance.
//   8.  Difficulty is MONOTONE in every declared lever (§1.1(d)) — asserted on the model, once.
//   9.  Coverage: 1..20 with >=5 items per 0.5-point rung and per +/-0.5pt band (the §1.1(c)
//       headroom requirement, which is about grain and reach, not item count).
//   10. Band ladder: composition depth never exceeds the cap for the band the difficulty sits in
//       (§4.3), and the declared ageBands match the window.
//   11. Key positions uniform within tolerance, reported per option count (E-094 requires the
//       per-option-count breakdown; every item here is 5-option, so there is one stratum).
//   12. Persistence: the consistent bank holds ONE system; the perTrial bank holds one per item.
//   13. Equating: the two banks match item-for-item on difficulty, key slot, option figures,
//       operator chain and age band.
//
// Run:  node research/exam-question-types/generators/check-FLU-OPCHAIN-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BANK_PATHS, genItem } from './FLU-OPCHAIN-01.mjs';
import { lureLabel, normalizeBankItem } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODES = ['consistent', 'perTrial'];
// The consistent arm is the live bank under banks/; the scrambled arm sits outside the served
// directory in control-banks/. Both are read here, because U4's acceptance is BOTH banks.
const bankPath = (mode) => resolve(__dirname, BANK_PATHS[mode]);

const failures = [];
const fail = (id, msg) => failures.push(`[${id}] ${msg}`);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const deepEq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const round2 = (x) => Math.round(x * 100) / 100;

/* ---- independent operator semantics ---------------------------------------- */
const GEOM = ['turn', 'flip', 'slant'];
const ATTR = ['swap', 'ring', 'twin'];
const ALL_OPS = [...GEOM, ...ATTR];
const BADGES = ['circle', 'square', 'triangle', 'diamond', 'hexagon', 'star'];
const GLYPH_SET = ['flag', 'hook', 'boot', 'comma'];
const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E'];

// D4 written as r^a m^b, with the relation m r = r^-1 m. Re-derived here rather than imported,
// because getting this product wrong is the single most likely way the generator could be wrong
// about its own answer key.
const dcompose = (g, o) => ({
  a: (((g.a + (g.b ? -o.a : o.a)) % 4) + 4) % 4,
  b: (g.b + o.b) % 2,
});
const ELEMENT = { turn: { a: 1, b: 0 }, flip: { a: 0, b: 1 }, slant: { a: 1, b: 1 } };

function step(op, fig) {
  if (GEOM.includes(op)) return { ...fig, orient: dcompose(ELEMENT[op], fig.orient) };
  if (op === 'swap') return { ...fig, shade: fig.shade === 'solid' ? 'hollow' : 'solid' };
  if (op === 'ring') return { ...fig, border: fig.border ? 0 : 1 };
  if (op === 'twin') return { ...fig, pair: fig.pair ? 0 : 1 };
  throw new Error(`unknown operator "${op}"`);
}
const run = (chain, fig) => chain.reduce((state, op) => step(op, state), fig);
const fkey = (f) => `${f.glyph}|${f.orient.a}${f.orient.b}|${f.shade}|${f.border}|${f.pair}`;
function dist(a, b) {
  let d = 0;
  if (a.orient.a !== b.orient.a || a.orient.b !== b.orient.b) d += 1;
  if (a.shade !== b.shade) d += 1;
  if (a.border !== b.border) d += 1;
  if (a.pair !== b.pair) d += 1;
  return d;
}
function geomIsIdentity(chain) {
  let o = { a: 0, b: 0 };
  for (const op of chain) if (GEOM.includes(op)) o = dcompose(ELEMENT[op], o);
  return o.a === 0 && o.b === 0;
}

/**
 * Everything a client can compute from `content` alone: every output produced by assigning
 * distinct operators to the chain's positions. Re-implemented here rather than imported, because
 * this IS the attack and validating it with the generator's own helper would prove nothing.
 */
function relabelReachable(depth, input) {
  const out = new Set();
  const walk = (position, used, state) => {
    if (position === depth) {
      out.add(fkey(state));
      return;
    }
    for (const op of ALL_OPS) {
      if (used.has(op)) continue;
      used.add(op);
      walk(position + 1, used, step(op, state));
      used.delete(op);
    }
  };
  walk(0, new Set(), input);
  return out;
}

/* ---- independent partial-rule taxonomy ------------------------------------ */
const KIND_LURE = {
  order_error: 'order_error',
  over_application: 'over_application',
  omission: 'omission',
  wrong_operator: 'wrong_operator',
  first_step_only: 'first_step_only',
  identity_copy: 'identity_copy',
};

/** Every partial rule a chain admits, as {ruleId, kind, chain}. */
function rulesFor(chain) {
  const out = [];
  const label = (ops) => (ops.length ? ops.join('>') : 'none');
  for (let i = 0; i + 1 < chain.length; i++) {
    const s = chain.slice();
    [s[i], s[i + 1]] = [s[i + 1], s[i]];
    out.push({ ruleId: `reorder@${i}:${label(s)}`, kind: 'order_error', chain: s });
  }
  for (let i = 0; i < chain.length; i++) {
    const s = [...chain.slice(0, i + 1), chain[i], ...chain.slice(i + 1)];
    out.push({ ruleId: `twice@${i}:${label(s)}`, kind: 'over_application', chain: s });
  }
  for (let i = 0; i < chain.length; i++) {
    const s = chain.filter((_, j) => j !== i);
    out.push({ ruleId: `drop@${i}:${label(s)}`, kind: 'omission', chain: s });
  }
  for (let i = 0; i < chain.length; i++) {
    for (const op of ALL_OPS) {
      if (chain.includes(op)) continue;
      const s = chain.slice();
      s[i] = op;
      out.push({ ruleId: `sub@${i}=${op}:${label(s)}`, kind: 'wrong_operator', chain: s });
    }
  }
  if (chain.length > 1) {
    out.push({
      ruleId: `firstOnly:${label(chain.slice(0, 1))}`,
      kind: 'first_step_only',
      chain: chain.slice(0, 1),
    });
  }
  out.push({ ruleId: 'identity:none', kind: 'identity_copy', chain: [] });
  return out;
}

/* ---- independent difficulty arithmetic (documented lever model) ----------- */
const DEPTH_LOAD = { 1: 0, 2: 2.4, 3: 4.4, 4: 6.0 };
const W_GEOM = 0.9;
const W_ORDER = 1.5;
const W_MIX = 1.2;
const SIM_SPAN = 2.6;
const mixedOf = (depth, geom) => (geom > 0 && geom < depth ? 1 : 0);
const baseOf = (depth, geom) =>
  1.0 +
  DEPTH_LOAD[depth] +
  W_GEOM * geom +
  W_ORDER * Math.max(0, geom - 1) +
  W_MIX * mixedOf(depth, geom);

const CONFIGS = (() => {
  const out = [];
  for (const depth of [1, 2, 3, 4]) {
    for (let geom = Math.max(0, depth - ATTR.length); geom <= Math.min(depth, GEOM.length); geom++) {
      out.push({ depth, geom });
    }
  }
  return out;
})();
const BASES = CONFIGS.map((c) => baseOf(c.depth, c.geom));
const RAW_LO = Math.min(...BASES);
const RAW_HI = Math.max(...BASES) + SIM_SPAN;
const difficultyOf = (depth, geom, sim) =>
  Math.max(
    1,
    Math.min(20, 1 + ((baseOf(depth, geom) + SIM_SPAN * sim - RAW_LO) * 19) / (RAW_HI - RAW_LO)),
  );

/* ---- independent band ladder (§4.3 developmental floor) ------------------- */
const BAND_LADDER = [
  { band: 'K-1', hi: 4, maxDepth: 1 },
  { band: '2-3', hi: 8, maxDepth: 2 },
  { band: '4-5', hi: 12, maxDepth: 3 },
  { band: '6-8', hi: 20.01, maxDepth: 4 },
];
const bandOf = (d) => BAND_LADDER.find((b) => d < b.hi) ?? BAND_LADDER[BAND_LADDER.length - 1];

/* ========================================================================== *
 * 8. MODEL-LEVEL MONOTONICITY, asserted once before any item is read.
 *
 * §1.1(d): the fit reads `difficulty` as known, and because the targeting rule
 * serves different item subsets early and late, difficulty error that correlates
 * with subset composition correlates with trialIndex and biases lambda. A
 * monotone lever model is the weaker claim that is actually needed to keep the
 * fit unbiased, and it is the one thing about difficulty this bank can prove.
 * ========================================================================== */
function checkMonotonicity() {
  for (const sim of [0, 0.5, 1]) {
    // Depth, holding the geometric count fixed where both depths admit it.
    for (const geom of [0, 1, 2, 3]) {
      const reachable = [1, 2, 3, 4].filter((depth) =>
        CONFIGS.some((c) => c.depth === depth && c.geom === geom),
      );
      for (let i = 1; i < reachable.length; i++) {
        const lower = difficultyOf(reachable[i - 1], geom, sim);
        const higher = difficultyOf(reachable[i], geom, sim);
        if (!(higher > lower)) {
          fail('monotonicity', `depth ${reachable[i]} not harder than ${reachable[i - 1]} at geom=${geom}`);
        }
      }
    }
    // Geometric count, holding depth fixed.
    for (const depth of [1, 2, 3, 4]) {
      const reachable = CONFIGS.filter((c) => c.depth === depth)
        .map((c) => c.geom)
        .sort((a, b) => a - b);
      for (let i = 1; i < reachable.length; i++) {
        const lower = difficultyOf(depth, reachable[i - 1], sim);
        const higher = difficultyOf(depth, reachable[i], sim);
        if (!(higher > lower)) {
          fail(
            'monotonicity',
            `geom ${reachable[i]} not harder than ${reachable[i - 1]} at depth=${depth}`,
          );
        }
      }
    }
  }
  // Distractor similarity, holding the config fixed. Tighter distractors are harder.
  for (const cfg of CONFIGS) {
    if (!(difficultyOf(cfg.depth, cfg.geom, 1) > difficultyOf(cfg.depth, cfg.geom, 0))) {
      fail('monotonicity', `similarity not monotone at depth=${cfg.depth} geom=${cfg.geom}`);
    }
  }
}
checkMonotonicity();

/* ========================================================================== *
 * Per-bank checks
 * ========================================================================== */
function loadBank(mode) {
  const raw = readFileSync(bankPath(mode), 'utf8').trim();
  const lines = raw.length ? raw.split('\n') : [];
  if (lines.length === 0) fail(`parse:${mode}`, 'bank is empty');
  const items = [];
  lines.forEach((line, i) => {
    try {
      items.push(JSON.parse(line));
    } catch (e) {
      fail(`parse:${mode}`, `line ${i + 1} is not valid JSON: ${e.message}`);
    }
  });
  return items;
}

/**
 * How much of the key `content` gives away, in expectation rather than as a yes/no.
 *
 * The binary invariant below asks whether exactly ONE option survives brute-forcing the mappings,
 * because that is the case where the key is recovered outright. It is not the whole exposure: an item
 * where two of five options survive hands a client a 50% hit rate with no induction, and averaged
 * over a block that is a floor under accuracy in BOTH arms — including the scrambled control, where
 * by construction nothing is learnable, so an elevated floor there is what makes the control stop
 * separating from the live arm.
 *
 * Reported per 2-point slice of the scale because the exposure is not uniform: chains get longer as
 * difficulty rises, and the reachable figure set collapses as they do (see ALLOWED_CONFIGS in the
 * generator). The guard is on the worst slice, so a future change that trades leak for difficulty
 * fails here instead of being discovered in a Gate B run.
 */
const LEAK_SLICE_WIDTH = 2;
/**
 * Ceiling on content-only chance in any slice. 0.35 is above today's worst slice (~0.30 at
 * difficulty 16-20) and well under the 0.50 a two-option item would give, so it is a regression
 * guard on a known, recorded exposure rather than a claim that the exposure is acceptable.
 */
const LEAK_CHANCE_CEILING = 0.35;

function checkBank(mode, items) {
  const seenIds = new Set();
  const systemIds = new Set();
  const keyCounts = Object.fromEntries(OPTION_KEYS.map((k) => [k, 0]));
  let optionCounts = new Set();
  /** slice index -> { n, viableSum } for the graded leak report. */
  const leakBySlice = new Map();
  let uniqueReachable = 0;

  for (const it of items) {
    const id = `${mode}:${it.itemId || '(no id)'}`;

    // ---- 1. Envelope ----
    if (typeof it.itemId !== 'string' || it.itemId.length < 8) fail(id, 'itemId missing/short');
    if (seenIds.has(it.itemId)) fail(id, 'duplicate itemId');
    seenIds.add(it.itemId);
    if (it.typeCode !== 'FLU-OPCHAIN-01') fail(id, `typeCode != FLU-OPCHAIN-01 (${it.typeCode})`);
    if (it.domain !== 'fluid_reasoning') fail(id, `domain != fluid_reasoning (${it.domain})`);
    if (it.demoPath !== 'demos/FLU-OPCHAIN-01.html') fail(id, `demoPath wrong (${it.demoPath})`);
    if (!isNum(it.difficulty) || it.difficulty < 1 || it.difficulty > 20)
      fail(id, `difficulty not a float in 1..20 (${it.difficulty})`);
    if (it.syntheticOnly !== true) fail(id, 'syntheticOnly must be true');
    if (it.validated !== false) fail(id, 'validated must be false');
    if (!it.scoring || it.scoring.mode !== 'deterministic_key')
      fail(id, 'scoring.mode != deterministic_key');
    if (!it.provenance || it.provenance.generator !== 'grammar')
      fail(id, 'provenance.generator != grammar');
    if (!it.provenance || typeof it.provenance.seed !== 'string')
      fail(id, 'provenance.seed missing');

    const c = it.content || {};
    const ans = it.answer || {};
    const lev = (it.provenance && it.provenance.levers) || {};

    // ---- 2. Key containment ----
    const contentStr = JSON.stringify(c);
    for (const leak of ['correctKey', 'mapping', 'system', 'operatorChain', 'strategyTrace'])
      if (contentStr.includes(leak)) fail(id, `content leaks "${leak}"`);
    // The operator NAMES must not appear in content either: content speaks badges only.
    for (const op of ALL_OPS)
      if (contentStr.includes(`"${op}"`)) fail(id, `content names the operator "${op}"`);
    if (contentStr.includes('perTrial') || contentStr.includes('consistent'))
      fail(id, 'content reveals which control arm it belongs to');
    if (!deepEq(c.badgeTray, BADGES))
      fail(id, `badgeTray is not the canonical order (${JSON.stringify(c.badgeTray)})`);

    // ---- 6. Chain invariants ----
    const mapping = (ans.system || {}).mapping || {};
    const badgeChain = Array.isArray(c.chain) ? c.chain : [];
    if (badgeChain.length < 1 || badgeChain.length > 4)
      fail(id, `chain length ${badgeChain.length} outside 1..4`);
    for (const badge of badgeChain)
      if (!BADGES.includes(badge)) fail(id, `chain uses an unknown badge "${badge}"`);
    const opChain = badgeChain.map((badge) => mapping[badge]);
    if (opChain.some((op) => !ALL_OPS.includes(op)))
      fail(id, `mapping does not resolve every badge in the chain`);
    else {
      if (new Set(opChain).size !== opChain.length)
        fail(id, `chain repeats an operator (${opChain.join('>')}) — a repeat cancels silently`);
      if (opChain.length !== lev.depth)
        fail(id, `chain length ${opChain.length} != declared depth ${lev.depth}`);
      const geomCount = opChain.filter((op) => GEOM.includes(op)).length;
      if (geomCount !== lev.geom) fail(id, `geometric count ${geomCount} != declared geom ${lev.geom}`);
      if (geomCount > 0 && geomIsIdentity(opChain))
        fail(id, `chain ${opChain.join('>')} has a geometric part that cancels to the identity`);
      if (mixedOf(lev.depth, lev.geom) !== lev.mixed)
        fail(id, `declared mixed ${lev.mixed} != derived ${mixedOf(lev.depth, lev.geom)}`);
      if (!deepEq(ans.operatorChain, opChain))
        fail(id, 'answer.operatorChain disagrees with the mapping applied to content.chain');
    }

    // ---- 3. KEY RE-DERIVED FROM THE STATED SYSTEM ----
    const options = Array.isArray(c.options) ? c.options : [];
    optionCounts.add(options.length);
    if (options.length !== 5) fail(id, `expected 5 options, got ${options.length}`);
    if (!deepEq(options.map((o) => o.key), OPTION_KEYS.slice(0, options.length)))
      fail(id, 'option keys are not A..E in order');
    const input = c.input;
    if (!input || !input.orient || !GLYPH_SET.includes(input.glyph))
      fail(id, 'input figure malformed');
    else if (opChain.every((op) => ALL_OPS.includes(op))) {
      const derived = run(opChain, input);
      const keyed = options.find((o) => o.key === ans.correctKey);
      if (!keyed) fail(id, `correctKey ${ans.correctKey} names no option`);
      else if (fkey(keyed.figure) !== fkey(derived))
        fail(
          id,
          `solver output ${fkey(derived)} != the figure at correctKey ${ans.correctKey} (${fkey(keyed.figure)})`,
        );
      if (fkey(derived) === fkey(input))
        fail(id, 'the chain is a no-op on its input (no observable transformation)');
      if (!isNum(ans.keyDistanceFromInput) || ans.keyDistanceFromInput !== dist(input, derived))
        fail(id, `answer.keyDistanceFromInput != independently computed ${dist(input, derived)}`);

      // ---- 4. Anti-leak: the key must not be the unique biggest change ----
      const keyDistance = dist(input, derived);
      const rivalDistances = options
        .filter((o) => o.key !== ans.correctKey)
        .map((o) => dist(input, o.figure));
      if (!rivalDistances.some((d) => d >= keyDistance))
        fail(
          id,
          `key is the UNIQUE largest change from the input (${keyDistance} vs ${rivalDistances.join(',')}) — ` +
            '"pick what changed most" would beat chance without the system',
        );

      // ---- 4b. Anti-leak: the key must not be the unique relabelling-reachable option ----
      const reachable = relabelReachable(opChain.length, input);
      const reachableKeys = options.filter((o) => reachable.has(fkey(o.figure))).map((o) => o.key);
      if (reachableKeys.length < 2) {
        uniqueReachable += 1;
        fail(
          id,
          `only ${reachableKeys.length} option(s) [${reachableKeys.join(',')}] are consistent with ANY ` +
            'badge->operator relabelling — a client that brute-forces the 720 mappings recovers the ' +
            'key from content alone, with no knowledge of the hidden system',
        );
      }

      // ---- 4c. Anti-leak, GRADED: how good a guess does content alone buy? ----
      const slice = Math.floor(it.difficulty / LEAK_SLICE_WIDTH);
      const bucket = leakBySlice.get(slice) ?? { n: 0, viableSum: 0, worst: OPTION_KEYS.length };
      bucket.n += 1;
      bucket.viableSum += reachableKeys.length;
      bucket.worst = Math.min(bucket.worst, reachableKeys.length);
      leakBySlice.set(slice, bucket);

      // ---- 5. Distractors: distinct, and each a named partial rule ----
      const figureKeys = options.map((o) => fkey(o.figure));
      if (new Set(figureKeys).size !== figureKeys.length) fail(id, 'two options show the same figure');

      const admissible = new Map();
      for (const rule of rulesFor(opChain)) {
        admissible.set(rule.ruleId, fkey(run(rule.chain, input)));
      }
      const rats = ans.distractorRationales || {};
      const trace = ans.strategyTrace || {};
      for (const option of options) {
        const rationale = rats[option.key];
        if (!rationale) {
          fail(id, `no rationale for option ${option.key}`);
          continue;
        }
        if (option.key === ans.correctKey) {
          if (lureLabel(rationale) !== 'correct')
            fail(id, `the key is labelled "${lureLabel(rationale)}" rather than correct`);
          continue;
        }
        const kind = rationale.partialRuleKind;
        if (!KIND_LURE[kind]) fail(id, `option ${option.key} has unknown partial rule kind "${kind}"`);
        else if (lureLabel(rationale) !== KIND_LURE[kind])
          fail(id, `option ${option.key} lure "${lureLabel(rationale)}" != ${KIND_LURE[kind]}`);
        const expected = admissible.get(rationale.ruleId);
        if (expected === undefined)
          fail(id, `option ${option.key} cites rule "${rationale.ruleId}", which this chain does not admit`);
        else if (expected !== fkey(option.figure))
          fail(
            id,
            `option ${option.key} figure is not what rule "${rationale.ruleId}" produces ` +
              `(${fkey(option.figure)} vs ${expected})`,
          );
        const traced = trace[option.key];
        if (!traced || traced.ruleId !== rationale.ruleId || traced.kind !== kind)
          fail(id, `strategyTrace for ${option.key} disagrees with its rationale`);
      }
      if (!Array.isArray(ans.strategyTraceRules) || ans.strategyTraceRules.length !== 6)
        fail(id, 'answer.strategyTraceRules does not declare the closed rule vocabulary');
    }

    if (OPTION_KEYS.includes(ans.correctKey)) keyCounts[ans.correctKey]++;

    // ---- 7. Difficulty + reproducibility ----
    const derivedDifficulty = round2(difficultyOf(lev.depth, lev.geom, lev.distractorSimilarity));
    if (Math.abs(derivedDifficulty - it.difficulty) > 0.01)
      fail(id, `difficulty ${it.difficulty} != derived-from-levers ${derivedDifficulty}`);

    // ---- 10. Band ladder ----
    if (isNum(it.difficulty)) {
      const band = bandOf(it.difficulty);
      if (lev.depth > band.maxDepth)
        fail(
          id,
          `depth ${lev.depth} exceeds the ${band.band} cap of ${band.maxDepth} at difficulty ${it.difficulty}`,
        );
      if (!deepEq(it.ageBands, [band.band]))
        fail(id, `ageBands ${JSON.stringify(it.ageBands)} != ["${band.band}"] for ${it.difficulty}`);
    }

    // ---- 12. Persistence ----
    if (lev.systemPersistence !== mode)
      fail(id, `provenance levers say persistence ${lev.systemPersistence}, bank is ${mode}`);
    if (ans.system && typeof ans.system.systemId === 'string') systemIds.add(ans.system.systemId);
    else fail(id, 'answer.system.systemId missing');
    if (Object.keys(mapping).length !== BADGES.length)
      fail(id, `mapping covers ${Object.keys(mapping).length} badges, expected ${BADGES.length}`);
    if (new Set(Object.values(mapping)).size !== ALL_OPS.length)
      fail(id, 'mapping is not a bijection onto the operator vocabulary');

    try {
      const regen = normalizeBankItem(genItem({ ...lev, seed: it.provenance.seed }));
      if (!deepEq(regen, it)) fail(id, 'item is NOT reproducible from its provenance (grammar drift)');
    } catch (e) {
      fail(id, `regeneration threw: ${e.message}`);
    }
  }

  // ---- 9. Coverage: 0.5-point grain across the whole scale ----
  const diffs = items.map((it) => it.difficulty).filter(isNum);
  const min = Math.min(...diffs);
  const max = Math.max(...diffs);
  if (!(min <= 1.25)) fail(`coverage:${mode}`, `min difficulty ${round2(min)} does not reach the floor`);
  if (!(max >= 19.75)) fail(`coverage:${mode}`, `max difficulty ${round2(max)} does not reach the ceiling`);

  const rungs = [];
  for (let d = 1; d <= 20 + 1e-9; d += 0.5) rungs.push(round2(d));
  const rungCounts = rungs.map((r) => diffs.filter((d) => Math.abs(d - r) <= 0.25).length);
  const bandCounts = rungs.map((r) => diffs.filter((d) => Math.abs(d - r) <= 0.5).length);
  rungs.forEach((r, i) => {
    if (rungCounts[i] < 5) fail(`coverage:${mode}`, `0.5-point rung ${r} has ${rungCounts[i]} items (<5)`);
    if (bandCounts[i] < 5)
      fail(`coverage:${mode}`, `+/-0.5pt band around ${r} has ${bandCounts[i]} items (<5)`);
  });

  // ---- 11. Key balance (E-094: report per option count, never pooled across formats) ----
  const total = items.length;
  const worst = Math.max(...OPTION_KEYS.map((k) => (100 * keyCounts[k]) / total));
  const floor = 100 / OPTION_KEYS.length;
  if (worst - floor > 5)
    fail(`keybalance:${mode}`, `modal key beats the ${floor}% floor by ${(worst - floor).toFixed(1)}pt (>5pt)`);
  if (optionCounts.size !== 1)
    fail(`keybalance:${mode}`, `bank mixes option counts (${[...optionCounts].join(',')}) — E-094 forbids pooling formats`);

  // ---- 12. Persistence, at bank level ----
  if (mode === 'consistent' && systemIds.size !== 1)
    fail(`persistence:${mode}`, `consistent bank holds ${systemIds.size} systems, expected exactly 1`);
  if (mode === 'perTrial' && systemIds.size !== items.length)
    fail(
      `persistence:${mode}`,
      `perTrial bank holds ${systemIds.size} systems for ${items.length} items, expected one each`,
    );

  // ---- 4c. Graded leak: the worst slice must stay under the stated ceiling ----
  const leakSlices = [...leakBySlice.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([slice, bucket]) => ({
      lo: slice * LEAK_SLICE_WIDTH,
      hi: (slice + 1) * LEAK_SLICE_WIDTH,
      n: bucket.n,
      meanViable: bucket.viableSum / bucket.n,
      fewestViable: bucket.worst,
      chance: bucket.n / bucket.viableSum,
    }));
  for (const s of leakSlices) {
    if (s.chance > LEAK_CHANCE_CEILING) {
      fail(
        `leak:${mode}`,
        `difficulty ${s.lo}-${s.hi}: brute-forcing the mappings leaves ${s.meanViable.toFixed(2)} of 5 ` +
          `options viable on average, a ${(100 * s.chance).toFixed(0)}% content-only hit rate, over the ` +
          `${(100 * LEAK_CHANCE_CEILING).toFixed(0)}% ceiling`,
      );
    }
  }

  return {
    items,
    rungCounts,
    keyCounts,
    systemIds,
    min,
    max,
    worstKeyAdvantage: worst - floor,
    uniqueReachable,
    leakSlices,
  };
}

const banks = {};
for (const mode of MODES) banks[mode] = checkBank(mode, loadBank(mode));

/* ---- 13. Equating: the two banks differ ONLY in persistence ---------------- */
{
  const a = banks.consistent.items;
  const b = banks.perTrial.items;
  if (a.length !== b.length) fail('equating', `item counts differ (${a.length} vs ${b.length})`);
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i].difficulty !== b[i].difficulty) fail('equating', `item ${i}: difficulty differs`);
    if (a[i].answer.correctKey !== b[i].answer.correctKey) fail('equating', `item ${i}: key slot differs`);
    if (!deepEq(a[i].ageBands, b[i].ageBands)) fail('equating', `item ${i}: age band differs`);
    if (!deepEq(a[i].content.options, b[i].content.options))
      fail('equating', `item ${i}: option figures differ`);
    if (!deepEq(a[i].content.input, b[i].content.input)) fail('equating', `item ${i}: input differs`);
    if (!deepEq(a[i].answer.operatorChain, b[i].answer.operatorChain))
      fail('equating', `item ${i}: operator chain differs`);
    if (a[i].content.chain.length !== b[i].content.chain.length)
      fail('equating', `item ${i}: badge chain length differs`);
  }
  // And they must NOT be the same bank: the badge labelling has to move somewhere.
  const differing = a.filter(
    (item, i) => b[i] && item.content.chain.join('>') !== b[i].content.chain.join('>'),
  ).length;
  if (differing === 0)
    fail('equating', 'the two banks are identical — the perTrial arm re-drew nothing');
}

/* ---- Report --------------------------------------------------------------- */
for (const mode of MODES) {
  const b = banks[mode];
  console.log(
    `FLU-OPCHAIN-01.${mode}: ${b.items.length} items, difficulty ${round2(b.min)}..${round2(b.max)}, ` +
      `${b.systemIds.size} hidden system(s)`,
  );
  console.log(
    `  key positions (5-option stratum): ` +
      OPTION_KEYS.map((k) => `${k}:${b.keyCounts[k]}`).join(' ') +
      `  — modal advantage over the 20.0% floor: +${b.worstKeyAdvantage.toFixed(1)}pt`,
  );
  console.log(`  per 0.5pt rung (1.0 -> 20.0): ${b.rungCounts.join(' ')}`);
  console.log(
    `  ANTI-LEAK: key derivable from content alone on ${b.uniqueReachable}/${b.items.length} items ` +
      '(only one option consistent with any badge relabelling)',
  );
  console.log('  graded leak — what brute-forcing the 720 mappings buys, by difficulty:');
  for (const s of b.leakSlices) {
    console.log(
      `    ${String(s.lo).padStart(2)}-${String(s.hi).padEnd(2)}  ${String(s.n).padStart(3)} items  ` +
        `${s.meanViable.toFixed(2)} of 5 options viable (fewest ${s.fewestViable})  ` +
        `content-only chance ${(100 * s.chance).toFixed(0)}%`,
    );
  }
}

if (failures.length) {
  console.error(`\nFAIL — ${failures.length} problem(s):`);
  for (const f of failures.slice(0, 40)) console.error('  - ' + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log(
  '\nPASS — both banks parse; the key is re-derived from the stated system on 100% of items; the key\n' +
    'is never the unique largest change from the input NOR the unique option any badge relabelling can\n' +
    'reach, so content does not determine it; every distractor is a named partial rule that\n' +
    'reproduces its figure; no chain repeats an operator or cancels its geometry; difficulty is\n' +
    'monotone in every lever and re-derived from each item\u2019s own levers; coverage is 1..20 with >=5\n' +
    'items per 0.5-point rung; depth respects the band ladder; key positions sit at the 5-option\n' +
    'floor; the consistent bank holds one hidden system and the perTrial bank one per item; and the\n' +
    'two banks are equated on every scored property.\n\n' +
    'NOT GATED. This says the instrument is well formed, not that it measures learning: Gate B needs\n' +
    '~128 real children (STAGE2_QUESTION_DESIGN §4.1.3).',
);
