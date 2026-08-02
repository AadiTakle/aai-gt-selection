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
//   4.  Anti-leak (E-075/E-076), now measured as a graded attack rather than only a determinacy
//       count, because "the key is not DETERMINED" is a much weaker property than "the key is not
//       PREDICTABLE" and the gap between them was 14 points:
//       (a) the key is never the UNIQUE option that changed the most components from the input, so
//           "tap whichever picture changed most" cannot beat chance;
//       (b) EVERY option is reachable by relabelling the badges. Guessing the hidden mapping is
//           exactly guessing an ordered selection of distinct operators for the chain's positions, so
//           an option no relabelling reaches is one the client can prove is not the key and delete.
//           With all five reachable, "eliminate, then guess" sits exactly on the 20% floor. The
//           previous invariant asked only that TWO survive, which bounds that attack at 50%;
//       (c) the key is never the unique most-backed NOR the unique least-backed option, counting how
//           many relabellings reach each. Both tails matter: pushing the key away from modal is
//           precisely the over-correction that hands the anti-modal attacker a certainty; and
//       (d) the GRADED attack is bounded per difficulty slice. A client conditions on the sorted
//           vote vector — which is content — and runs whichever rank tier is the key most often for
//           that shape. That strategy dominates (b) and (c), so it is the one the ceiling is set
//           against, and it is checked per slice because the block serves different slices to
//           different children.
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
 * Everything a client can compute from `content` alone: every output produced by assigning distinct
 * operators to the chain's positions, WITH the number of assignments that produce it.
 *
 * Re-implemented here rather than imported, because this IS the attack and validating it with the
 * generator's own helper would prove nothing. The counts matter and not merely the set: the
 * generator's guarantee is now that all five options are reachable AND that the key sits at no
 * exploitable rank among the counts, and a set cannot express either half.
 */
function relabelVotes(depth, input) {
  const votes = new Map();
  const used = new Set();
  const walk = (position, state) => {
    if (position === depth) {
      const k = fkey(state);
      votes.set(k, (votes.get(k) ?? 0) + 1);
      return;
    }
    for (const op of ALL_OPS) {
      if (used.has(op)) continue;
      used.add(op);
      walk(position + 1, step(op, state));
      used.delete(op);
    }
  };
  walk(0, input);
  return votes;
}

/**
 * The key's rank tier among the five vote counts.
 *
 * `above` is how many options strictly outrank the key, `size` how many share its count, so the key
 * occupies ranks [above, above + size - 1] of five and an attacker guessing inside that tier pays
 * 1/size. `unique` flags the two configurations that make a single rank strategy CERTAIN: the key
 * alone at the top (the modal attack) or alone at the bottom (the anti-modal attack, which is what
 * an over-correction against the first one produces).
 */
function keyTier(backing, keyIndex) {
  const above = backing.filter((v) => v > backing[keyIndex]).length;
  const size = backing.filter((v) => v === backing[keyIndex]).length;
  return {
    above,
    size,
    tier: new Set(backing.filter((v) => v > backing[keyIndex])).size,
    unique: size === 1 && (above === 0 || above + size === backing.length),
  };
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

function checkBank(mode, items) {
  const seenIds = new Set();
  const systemIds = new Set();
  const keyCounts = Object.fromEntries(OPTION_KEYS.map((k) => [k, 0]));
  const rankTargetCounts = [0, 0, 0, 0, 0];
  const leakRows = [];
  let optionCounts = new Set();

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

      // ---- 4b. Anti-leak: EVERY option must be relabelling-reachable, and the key must sit at no
      //          exploitable rank among the vote counts ----
      const votes = relabelVotes(opChain.length, input);
      const backing = options.map((o) => votes.get(fkey(o.figure)) ?? 0);
      const keyIndex = options.findIndex((o) => o.key === ans.correctKey);
      const viable = backing.filter((v) => v > 0).length;
      if (viable < options.length)
        fail(
          id,
          `only ${viable} of ${options.length} options are consistent with ANY badge->operator ` +
            'relabelling — a client can prove the rest are not the key and delete them, so ' +
            '"eliminate, then guess" beats the five-option chance floor',
        );
      if (backing[keyIndex] === 0)
        fail(id, 'the key itself is unreachable by relabelling — the answer key contradicts the semantics');

      const tier = keyTier(backing, keyIndex);
      if (tier.unique)
        fail(
          id,
          `the key is the unique ${tier.above === 0 ? 'MOST' : 'LEAST'}-backed option ` +
            `(votes ${backing.join(',')}) — a client running that one rank strategy takes this item ` +
            'every time, with no knowledge of the hidden system',
        );

      // The per-item audit the bank ships must be the audit re-derived here, or the reported figure
      // is the generator's opinion of itself.
      const rel = ans.relabelling || {};
      const total = backing.reduce((a, b) => a + b, 0);
      if (!deepEq(rel.optionVotes, backing))
        fail(id, `answer.relabelling.optionVotes ${JSON.stringify(rel.optionVotes)} != re-derived ${JSON.stringify(backing)}`);
      if (rel.viableOptions !== viable)
        fail(id, `answer.relabelling.viableOptions ${rel.viableOptions} != re-derived ${viable}`);
      if (Math.abs(rel.maxVoteShare - round2(Math.max(...backing) / total)) > 0.011)
        fail(id, `answer.relabelling.maxVoteShare ${rel.maxVoteShare} != re-derived ${round2(Math.max(...backing) / total)}`);
      if (Math.abs(rel.minVoteShare - round2(Math.min(...backing) / total)) > 0.011)
        fail(id, `answer.relabelling.minVoteShare ${rel.minVoteShare} != re-derived ${round2(Math.min(...backing) / total)}`);

      leakRows.push({
        difficulty: it.difficulty,
        shape: [...backing].sort((a, b) => b - a).join(','),
        tier: tier.tier,
        size: tier.size,
        viable,
        rankTargetMet: lev.voteRankTarget >= tier.above && lev.voteRankTarget <= tier.above + tier.size - 1,
      });

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
    if (Number.isInteger(lev.voteRankTarget) && lev.voteRankTarget >= 0 && lev.voteRankTarget < 5)
      rankTargetCounts[lev.voteRankTarget]++;
    else fail(id, `provenance levers voteRankTarget is not a rank in 0..4 (${lev.voteRankTarget})`);

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

  /* ---- 4c. Anti-leak at BANK level: the graded attacker, per difficulty slice ----------------- *
   *
   * The per-item checks above bound each item away from certainty. They do not bound the ATTACK,
   * because an attacker does not work item by item: it conditions on the vote SHAPE, which is
   * content, and runs whichever rank tier is the key most often for that shape. That is the
   * strongest permutation-invariant content-only strategy there is, and it is the one this bank has
   * to be measured against.
   *
   * The bound is 25% — a client running it must not do better than it would if one option were
   * simply removed from the item. That is a meaningful line rather than a round number: below it the
   * leak is worth less than the difference between a five-option and a four-option question, which
   * is the smallest unit of item design anyone here trades in.
   *
   * Sliced, because the block serves systematically different slices to different children, so a
   * leak concentrated in the hardest slice is invisible in a bank mean and lands on exactly the
   * children the measurement is about.
   */
  const SLICES = [
    [1, 5],
    [5, 10],
    [10, 15],
    [15, 20.01],
  ];
  const GRADED_ATTACK_CEILING = 0.25;
  const gradedSlices = [];
  for (const [lo, hi] of SLICES) {
    const inSlice = leakRows.filter((r) => r.difficulty >= lo && r.difficulty < hi);
    if (inSlice.length === 0) continue;
    const shapes = new Map();
    for (const r of inSlice) {
      const g = shapes.get(r.shape) ?? new Map();
      g.set(r.tier, { count: (g.get(r.tier)?.count ?? 0) + 1, size: r.size });
      shapes.set(r.shape, g);
    }
    let hits = 0;
    for (const g of shapes.values()) {
      let best = 0;
      for (const { count, size } of g.values()) best = Math.max(best, count / size);
      hits += best;
    }
    const accuracy = hits / inSlice.length;
    gradedSlices.push({ lo, hi, n: inSlice.length, accuracy, shapes: shapes.size });
    if (accuracy > GRADED_ATTACK_CEILING + 1e-9)
      fail(
        `antileak:${mode}`,
        `graded content-only attacker scores ${(100 * accuracy).toFixed(1)}% on difficulty ` +
          `${lo}–${hi === 20.01 ? 20 : hi} (${inSlice.length} items), above the ` +
          `${(100 * GRADED_ATTACK_CEILING).toFixed(0)}% ceiling`,
      );
  }

  // Every item must have all five options viable, which is what pins the elimination attack to the
  // five-option floor exactly rather than merely near it.
  const notFullyViable = leakRows.filter((r) => r.viable < 5).length;
  if (notFullyViable > 0)
    fail(`antileak:${mode}`, `${notFullyViable} item(s) have fewer than 5 relabelling-viable options`);

  /* ---- 14. No two items are the same QUESTION -------------------------------------------------- *
   *
   * Re-derived here rather than trusted from the builder's redraw loop. A duplicate stimulus is two
   * defects at once: `learning-block.ts` forbids re-serving an item because a repeat measures recall
   * of that item, and a pair priced at two difficulties is the §1.1(d) labelling error. The first
   * 12/rung draw produced one such pair, so this is a guard against a real failure mode and not a
   * hypothetical.
   *
   * Option ORDER is normalised away and the answer is identified by its figure rather than its slot,
   * because two items showing the same five pictures are the same question however the key has been
   * round-robined among them. The 6/rung bank on `dev` carried four such pairs that an order-sensitive
   * comparison did not see.
   */
  const stimuli = new Map();
  for (const it of items) {
    const ans = it.answer || {};
    const keyed = (it.content.options || []).find((o) => o.key === ans.correctKey);
    const fp = JSON.stringify([
      fkey(it.content.input),
      ans.operatorChain,
      keyed ? fkey(keyed.figure) : null,
      (it.content.options || []).map((o) => fkey(o.figure)).sort(),
    ]);
    stimuli.set(fp, [...(stimuli.get(fp) ?? []), it]);
  }
  for (const group of stimuli.values()) {
    if (group.length < 2) continue;
    fail(
      `duplicates:${mode}`,
      `${group.length} items share one stimulus (difficulties ${group.map((g) => g.difficulty).join(', ')}) — ` +
        'a re-served question, and if the difficulties differ, the same question priced twice',
    );
  }

  // ---- 4d. The rank quota is a declared lever, so it is balanced like any other (E-094) -------
  const rankTotal = rankTargetCounts.reduce((a, b) => a + b, 0);
  const worstRank = Math.max(...rankTargetCounts.map((n) => (100 * n) / rankTotal));
  if (worstRank - 20 > 5)
    fail(
      `antileak:${mode}`,
      `voteRankTarget is not uniform: modal rank beats the 20% floor by ${(worstRank - 20).toFixed(1)}pt (>5pt)`,
    );

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

  return {
    items,
    rungCounts,
    keyCounts,
    systemIds,
    min,
    max,
    worstKeyAdvantage: worst - floor,
    gradedSlices,
    rankTargetCounts,
    zeroInformation: leakRows.filter((r) => r.size === 5).length,
    rankTargetMet: leakRows.filter((r) => r.rankTargetMet).length,
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
    `  anti-leak: ${b.zeroInformation}/${b.items.length} items carry NO vote information at all ` +
      `(all five options equally backed); key vote-rank quota met on ${b.rankTargetMet}/${b.items.length}`,
  );
  console.log(
    `  graded content-only attacker by difficulty slice (ceiling 25.0%, floor 20.0%): ` +
      b.gradedSlices
        .map(
          (s) =>
            `${s.lo}–${s.hi === 20.01 ? 20 : s.hi}: ${(100 * s.accuracy).toFixed(1)}% (n=${s.n}, ${s.shapes} shapes)`,
        )
        .join('  '),
  );
}

if (failures.length) {
  console.error(`\nFAIL — ${failures.length} problem(s):`);
  for (const f of failures.slice(0, 40)) console.error('  - ' + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log(
  '\nPASS — both banks parse; the key is re-derived from the stated system on 100% of items; the key\n' +
    'is never the unique largest change from the input, EVERY option is reachable by relabelling the\n' +
    'badges so nothing can be eliminated, the key is never the unique most- nor least-backed option,\n' +
    'and the graded content-only attacker stays under 25% in every difficulty slice against a 20%\n' +
    'five-option floor; every distractor is a named partial rule that reproduces its figure; no chain\n' +
    'repeats an operator or cancels its geometry; difficulty is monotone in every lever and re-derived\n' +
    'from each item\u2019s own levers; coverage is 1..20 with >=5 items per 0.5-point rung; depth respects\n' +
    'the band ladder; key positions AND key vote ranks sit at the 5-option floor; the consistent bank\n' +
    'holds one hidden system and the perTrial bank one per item; and the two banks are equated on\n' +
    'every scored property.\n\n' +
    'NOT GATED. This says the instrument is well formed, not that it measures learning: Gate B needs\n' +
    '~128 real children (STAGE2_QUESTION_DESIGN §4.1.3).',
);
