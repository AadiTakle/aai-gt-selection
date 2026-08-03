// Basic self-check for the SPA-XFORM-01 dual-mode banks (STAGE2_QUESTION_DESIGN §9.2, U3).
//
// SCOPE, STATED SO IT IS NOT MISTAKEN FOR U4.
//
// This is the U3 self-check: enough to show the two banks are well formed, contract-conformant,
// equated, and free of the two content-computable shortcuts. U4 — a full independent validator
// that re-implements the partial-rule taxonomy and proves every item is byte-reproducible from its
// own provenance, the way check-FLU-OPCHAIN-01.mjs does — is a separate task and is NOT this file.
//
// What is genuinely INDEPENDENT here: the lattice algebra (all six operator permutations are
// re-typed below from the documented coordinate maps rather than imported), the key re-derivation
// that rests on it, the relabelling attack, the difficulty arithmetic, the band ladder and the
// chrome audit. What is IMPORTED: only `BANK_PATHS`, so the checker reads the same two files the
// generator writes.
//
// Checks (exit nonzero on any failure):
//   1.  JSONL parses, and every item of BOTH banks parses against the repo's real
//       `bankItemSchema`, with its served projection parsing against `servedItemSchema`
//       (packages/contracts). The consistent arm is additionally covered in CI by
//       `packages/contracts/src/bank-conformance.test.ts`; the control arm lives outside `banks/`
//       and is covered only here.
//   2.  Key containment: `content` names no operator, states no mapping, carries no verdict, and
//       does not say which control arm it belongs to.
//   3.  Key re-derived: applying the mapping's operator chain to the input reproduces exactly the
//       figure `correctKey` names, on every item of both banks.
//   4.  Anti-leak, two invariants (E-075/E-076), both re-derived from `content` alone:
//       (a) the key is never separable by DISPLACEMENT — at least one distractor moves exactly as
//           many blocks as the key does, so "tap whichever picture moved the most" is dead; and
//       (b) at least four of five options are reachable by RELABELLING the badges, so a solver
//           with perfect spatial execution and no knowledge of the mapping is held near chance.
//           The count of items where the key IS derivable — only one option consistent with any
//           relabelling — is reported explicitly, because that is the measurement the reference
//           type reported as 11 of 234.
//   5.  Anti-chrome: every operator is a bijection on the 16 lattice cells, so no operator effect
//       can be drawn as a border, frame or halo; block count is invariant across all five options
//       on every item; and no operator or badge is named after interface furniture.
//   6.  Distractors: all five options distinct, and every wrong option carries a named partial
//       rule with a coarse lure class the shared registry can bucket.
//   7.  Difficulty equals the value re-derived from the item's own levers.
//   8.  Difficulty is MONOTONE in every declared lever (§1.1(d)) — asserted on the model, once.
//   9.  Coverage: 1..20 with >=5 items per 0.5-point rung.
//   10. Band ladder: depth and density never exceed the caps for the band the difficulty sits in.
//   11. Key positions uniform within tolerance, reported per option count (E-094).
//   12. Persistence: the consistent bank holds ONE system; the perTrial bank holds one per item.
//   13. Equating: the two banks match item-for-item on every scored property.
//
// Run:  node research/exam-question-types/generators/check-SPA-XFORM-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BANK_PATHS } from './SPA-XFORM-01.mjs';
import { coarseLureClass, lureLabel } from './item-shape.mjs';
import {
  bankItemSchema,
  servedItemSchema,
} from '../../../packages/contracts/src/assessment-exam-adaptive.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODES = ['consistent', 'perTrial'];
const bankPath = (mode) => resolve(__dirname, BANK_PATHS[mode]);

const failures = [];
const fail = (id, msg) => failures.push(`[${id}] ${msg}`);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const deepEq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const round2 = (x) => Math.round(x * 100) / 100;

/* ---- independent lattice algebra ------------------------------------------ *
 * The six permutations are re-typed here from the documented coordinate maps
 * rather than imported, because getting one of them wrong is the single most
 * likely way the generator could be confidently wrong about its own answer key.
 * ---------------------------------------------------------------------------- */
const GRID = 4;
const CELLS = GRID * GRID;
const permutation = (move) => {
  const table = new Array(CELLS);
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      const [nr, nc] = move(r, c);
      table[r * GRID + c] = nr * GRID + nc;
    }
  }
  return table;
};
const PERM = {
  pivot: permutation((r, c) => [c, GRID - 1 - r]),
  mirror: permutation((r, c) => [r, GRID - 1 - c]),
  braid: permutation((r, c) => [r, c ^ 1]),
  stagger: permutation((r, c) => [r ^ 1, c]),
  drift: permutation((r, c) => [(r + 2) % GRID, (c + 2) % GRID]),
  shunt: permutation((r, c) => [r, (c + 1) % GRID]),
};
const ORIENTATION = ['pivot', 'mirror'];
const ALL_OPS = [...ORIENTATION, 'braid', 'stagger', 'drift', 'shunt'];
const BADGES = ['crescent', 'spiral', 'trefoil', 'zigzag', 'teardrop', 'leaf'];
const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E'];
const MAX_DEPTH = 3;

const step = (op, blocks) => blocks.map((cell) => PERM[op][cell]).sort((a, b) => a - b);
const run = (chain, blocks) => chain.reduce((state, op) => step(op, state), blocks);
const fkey = (blocks) => blocks.join('.');
function moved(a, b) {
  const target = new Set(b);
  return a.filter((cell) => !target.has(cell)).length;
}

/**
 * Everything a client can compute from `content` alone: every figure produced by assigning
 * distinct operators to the chain's positions. At most 6*5*4 = 120 of them at this type's maximum
 * depth. This IS the attack, so it is re-implemented here rather than imported.
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

/* ========================================================================== *
 * 5. ANTI-CHROME, at the vocabulary level, before any item is read.
 *
 * The reference type's `ring` operator — "add a border" — was drawn as a
 * rounded rectangle indistinguishable from a UI border, and children were
 * inducing over the furniture. The structural guarantee that closes it is that
 * every operator here is a PERMUTATION of the lattice cells: a permutation
 * cannot add ink, so there is nothing for a renderer to draw around or beside
 * the figure. That is asserted, not promised.
 * ========================================================================== */
const CHROME_WORDS = [
  'ring',
  'border',
  'frame',
  'box',
  'panel',
  'bar',
  'button',
  'tab',
  'chevron',
  'caret',
  'arrow',
  'check',
  'tick',
  'cross',
  'plus',
  'close',
  'menu',
  'outline',
  'shadow',
  'highlight',
  'badge',
  'pill',
  'card',
  'tooltip',
  'slider',
  'toggle',
  'circle',
  'square',
  'rect',
  'underline',
  'divider',
];
function checkChrome() {
  for (const op of ALL_OPS) {
    const table = PERM[op];
    if (!table || table.length !== CELLS || new Set(table).size !== CELLS) {
      fail('chrome', `operator "${op}" is not a bijection on the ${CELLS} lattice cells, so its `
        + 'effect could add or remove ink and be drawn as decoration');
    }
  }
  for (const name of [...ALL_OPS, ...BADGES]) {
    const hit = CHROME_WORDS.find((word) => name.toLowerCase().includes(word));
    if (hit) fail('chrome', `"${name}" is named after interface furniture ("${hit}")`);
  }
}
checkChrome();

/* ---- independent difficulty arithmetic (documented lever model) ----------- */
const DEPTH_LOAD = { 1: 0, 2: 2.6, 3: 4.6 };
const W_TURN = 0.9;
const W_ORDER = 1.4;
const W_MIX = 1.1;
const W_DENSITY = 1.15;
const SIM_SPAN = 2.4;
const MIN_DENSITY = 2;
const MAX_DENSITY = 7;
const mixedOf = (depth, turns) => (turns > 0 && turns < depth ? 1 : 0);
const baseOf = (depth, turns, density) =>
  1.0 +
  DEPTH_LOAD[depth] +
  W_TURN * turns +
  W_ORDER * Math.max(0, turns - 1) +
  W_MIX * mixedOf(depth, turns) +
  W_DENSITY * (density - MIN_DENSITY);

const CONFIGS = (() => {
  const out = [];
  for (let depth = 1; depth <= MAX_DEPTH; depth++) {
    for (let turns = 0; turns <= Math.min(depth, ORIENTATION.length); turns++) {
      for (let density = MIN_DENSITY; density <= MAX_DENSITY; density++) {
        out.push({ depth, turns, density });
      }
    }
  }
  return out;
})();
const BASES = CONFIGS.map((c) => baseOf(c.depth, c.turns, c.density));
const RAW_LO = Math.min(...BASES);
const RAW_HI = Math.max(...BASES) + SIM_SPAN;
const difficultyOf = (depth, turns, density, sim) =>
  Math.max(
    1,
    Math.min(
      20,
      1 + ((baseOf(depth, turns, density) + SIM_SPAN * sim - RAW_LO) * 19) / (RAW_HI - RAW_LO),
    ),
  );

/* ---- independent band ladder (§4.3 developmental floor) ------------------- */
const BAND_LADDER = [
  { band: 'K-1', hi: 4, maxDepth: 1, maxDensity: 4 },
  { band: '2-3', hi: 8, maxDepth: 2, maxDensity: 5 },
  { band: '4-5', hi: 12, maxDepth: 2, maxDensity: 6 },
  { band: '6-8', hi: 20.01, maxDepth: 3, maxDensity: 7 },
];
const bandOf = (d) => BAND_LADDER.find((b) => d < b.hi) ?? BAND_LADDER[BAND_LADDER.length - 1];

/* ========================================================================== *
 * 8. MODEL-LEVEL MONOTONICITY, asserted once before any item is read.
 *
 * §1.1(d): the fit reads `difficulty` as known, and because the targeting rule
 * serves different item subsets early and late, difficulty error that
 * correlates with subset composition correlates with trialIndex and biases the
 * fitted rate rather than merely attenuating it. A monotone lever model is the
 * weaker claim that is actually needed to keep the fit unbiased, and it is the
 * one thing about difficulty this bank can prove without children.
 * ========================================================================== */
function checkMonotonicity() {
  const at = (c, sim) => difficultyOf(c.depth, c.turns, c.density, sim);
  for (const sim of [0, 0.5, 1]) {
    for (const density of [MIN_DENSITY, 4, MAX_DENSITY]) {
      // Composition depth, holding the orientation count fixed where both depths admit it.
      for (const turns of [0, 1, 2]) {
        const reachable = [1, 2, 3].filter((depth) => turns <= Math.min(depth, ORIENTATION.length));
        for (let i = 1; i < reachable.length; i++) {
          const lower = at({ depth: reachable[i - 1], turns, density }, sim);
          const higher = at({ depth: reachable[i], turns, density }, sim);
          if (!(higher > lower)) {
            fail(
              'monotonicity',
              `depth ${reachable[i]} not harder than ${reachable[i - 1]} at turns=${turns} density=${density}`,
            );
          }
        }
      }
      // Orientation count, holding depth fixed.
      for (const depth of [1, 2, 3]) {
        const reachable = [0, 1, 2].filter((turns) => turns <= Math.min(depth, ORIENTATION.length));
        for (let i = 1; i < reachable.length; i++) {
          const lower = at({ depth, turns: reachable[i - 1], density }, sim);
          const higher = at({ depth, turns: reachable[i], density }, sim);
          if (!(higher > lower)) {
            fail(
              'monotonicity',
              `turns ${reachable[i]} not harder than ${reachable[i - 1]} at depth=${depth} density=${density}`,
            );
          }
        }
      }
    }
    // Figure density, holding the rest fixed. This is the range-extending lever, so it carries the
    // most weight of the four and is the one whose sign matters most.
    for (const depth of [1, 2, 3]) {
      for (let turns = 0; turns <= Math.min(depth, ORIENTATION.length); turns++) {
        for (let density = MIN_DENSITY + 1; density <= MAX_DENSITY; density++) {
          const lower = at({ depth, turns, density: density - 1 }, sim);
          const higher = at({ depth, turns, density }, sim);
          if (!(higher > lower)) {
            fail(
              'monotonicity',
              `density ${density} not harder than ${density - 1} at depth=${depth} turns=${turns}`,
            );
          }
        }
      }
    }
  }
  // Distractor similarity, holding the config fixed. Tighter distractors are harder.
  for (const c of CONFIGS) {
    if (!(at(c, 1) > at(c, 0))) {
      fail(
        'monotonicity',
        `similarity not monotone at depth=${c.depth} turns=${c.turns} density=${c.density}`,
      );
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

/** The bank item minus everything `servedItemSchema` omits — the browser's view. */
function serve(item) {
  const served = { ...item };
  delete served.answer;
  delete served.scoring;
  delete served.provenance;
  return served;
}

function checkBank(mode, items) {
  const seenIds = new Set();
  const systemIds = new Set();
  const keyCounts = Object.fromEntries(OPTION_KEYS.map((k) => [k, 0]));
  const optionCounts = new Set();
  const reachableHistogram = {};
  let derivable = 0;
  let schemaFailures = 0;
  let servedFailures = 0;
  let firstSchemaIssue = null;

  for (const it of items) {
    const id = `${mode}:${it.itemId || '(no id)'}`;

    // ---- 1. The repo's real contract, on the full item and on its served projection ----
    const parsed = bankItemSchema.safeParse(it);
    if (!parsed.success) {
      schemaFailures++;
      firstSchemaIssue ??= `${parsed.error.issues[0].path.join('.')}: ${parsed.error.issues[0].message}`;
    }
    if (!servedItemSchema.safeParse(serve(it)).success) servedFailures++;

    if (seenIds.has(it.itemId)) fail(id, 'duplicate itemId');
    seenIds.add(it.itemId);
    if (it.typeCode !== 'SPA-XFORM-01') fail(id, `typeCode != SPA-XFORM-01 (${it.typeCode})`);
    if (it.domain !== 'spatial') fail(id, `domain != spatial (${it.domain})`);
    if (it.demoPath !== 'demos/SPA-XFORM-01.html') fail(id, `demoPath wrong (${it.demoPath})`);
    if (it.syntheticOnly !== true) fail(id, 'syntheticOnly must be true');
    if (it.validated !== false) fail(id, 'validated must be false');
    if (!it.scoring || it.scoring.mode !== 'deterministic_key') {
      fail(id, 'scoring.mode != deterministic_key');
    }

    const c = it.content || {};
    const ans = it.answer || {};
    const lev = (it.provenance && it.provenance.levers) || {};

    // ---- 2. Key containment ----
    const contentStr = JSON.stringify(c);
    for (const leak of ['correctKey', 'mapping', 'system', 'operatorChain', 'strategyTrace']) {
      if (contentStr.includes(leak)) fail(id, `content leaks "${leak}"`);
    }
    for (const op of ALL_OPS) {
      if (contentStr.includes(`"${op}"`)) fail(id, `content names the operator "${op}"`);
    }
    if (contentStr.includes('perTrial') || contentStr.includes('consistent')) {
      fail(id, 'content reveals which control arm it belongs to');
    }
    if (!deepEq(c.badgeTray, BADGES)) {
      fail(id, `badgeTray is not the canonical order (${JSON.stringify(c.badgeTray)})`);
    }
    if (!c.grid || c.grid.rows !== GRID || c.grid.cols !== GRID) fail(id, 'grid is not 4x4');

    // ---- 3. Key re-derived from the stated system ----
    const mapping = (ans.system || {}).mapping || {};
    const badgeChain = Array.isArray(c.chain) ? c.chain : [];
    if (badgeChain.length < 1 || badgeChain.length > MAX_DEPTH) {
      fail(id, `chain length ${badgeChain.length} outside 1..${MAX_DEPTH}`);
    }
    for (const badge of badgeChain) {
      if (!BADGES.includes(badge)) fail(id, `chain uses an unknown badge "${badge}"`);
    }
    const opChain = badgeChain.map((badge) => mapping[badge]);
    const resolves = opChain.length > 0 && opChain.every((op) => ALL_OPS.includes(op));
    if (!resolves) fail(id, 'the mapping does not resolve every badge in the chain');

    const options = Array.isArray(c.options) ? c.options : [];
    optionCounts.add(options.length);
    if (options.length !== 5) fail(id, `expected 5 options, got ${options.length}`);
    const input = c.input && Array.isArray(c.input.blocks) ? c.input.blocks : null;
    if (!input) fail(id, 'input figure malformed');

    if (resolves && input) {
      if (new Set(opChain).size !== opChain.length) {
        fail(id, `chain repeats an operator (${opChain.join('>')})`);
      }
      if (opChain.length !== lev.depth) {
        fail(id, `chain length ${opChain.length} != declared depth ${lev.depth}`);
      }
      const turnCount = opChain.filter((op) => ORIENTATION.includes(op)).length;
      if (turnCount !== lev.turns) {
        fail(id, `orientation count ${turnCount} != declared turns ${lev.turns}`);
      }
      if (input.length !== lev.density) {
        fail(id, `input holds ${input.length} blocks != declared density ${lev.density}`);
      }
      if (mixedOf(lev.depth, lev.turns) !== lev.mixed) {
        fail(id, `declared mixed ${lev.mixed} != derived ${mixedOf(lev.depth, lev.turns)}`);
      }
      if (!deepEq(ans.operatorChain, opChain)) {
        fail(id, 'answer.operatorChain disagrees with the mapping applied to content.chain');
      }

      const derived = run(opChain, input);
      const keyed = options.find((o) => o.key === ans.correctKey);
      if (!keyed) fail(id, `correctKey ${ans.correctKey} names no option`);
      else if (fkey(keyed.blocks) !== fkey(derived)) {
        fail(
          id,
          `solver output ${fkey(derived)} != the figure at correctKey ${ans.correctKey} (${fkey(keyed.blocks)})`,
        );
      }
      if (fkey(derived) === fkey(input)) {
        fail(id, 'the chain leaves the figure where it was (no observable transformation)');
      }

      // ---- 4a. Anti-leak: displacement carries no signal ----
      const keyDisplacement = moved(input, derived);
      if (ans.keyDisplacementFromInput !== keyDisplacement) {
        fail(id, `answer.keyDisplacementFromInput != independently computed ${keyDisplacement}`);
      }
      const rivals = options.filter((o) => o.key !== ans.correctKey);
      if (!rivals.some((o) => moved(input, o.blocks) === keyDisplacement)) {
        fail(
          id,
          `no distractor is displacement-matched to the key (${keyDisplacement} vs ` +
            `${rivals.map((o) => moved(input, o.blocks)).join(',')}) — "tap whichever picture ` +
            'moved the most" would beat chance without the system',
        );
      }

      // ---- 4b. Anti-leak: the relabelling attack ----
      const reachable = relabelReachable(opChain.length, input);
      const reachableKeys = options.filter((o) => reachable.has(fkey(o.blocks))).map((o) => o.key);
      reachableHistogram[reachableKeys.length] = (reachableHistogram[reachableKeys.length] ?? 0) + 1;
      if (reachableKeys.length < 2) derivable++;
      if (reachableKeys.length < 4) {
        fail(
          id,
          `only ${reachableKeys.length} option(s) [${reachableKeys.join(',')}] are consistent with ` +
            'ANY badge relabelling — a solver with perfect spatial execution and no knowledge of ' +
            'the system narrows the field on execution alone',
        );
      }
      if (ans.relabelReachableOptions !== reachableKeys.length) {
        fail(id, `answer.relabelReachableOptions != independently computed ${reachableKeys.length}`);
      }

      // ---- 5. Anti-chrome, per item: no operator adds or removes ink ----
      const wrongInk = options.filter((o) => o.blocks.length !== input.length);
      if (wrongInk.length > 0) {
        fail(
          id,
          `${wrongInk.length} option(s) show a different number of blocks than the input — an ` +
            'operator that changes the ink is an operator a renderer draws as decoration',
        );
      }

      // ---- 6. Distractors: distinct, and each a named partial rule ----
      const figures = options.map((o) => fkey(o.blocks));
      if (new Set(figures).size !== figures.length) fail(id, 'two options show the same figure');

      const rationales = ans.distractorRationales || {};
      const trace = ans.strategyTrace || {};
      const kinds = new Set();
      for (const option of options) {
        const rationale = rationales[option.key];
        if (!rationale) {
          fail(id, `no rationale for option ${option.key}`);
          continue;
        }
        if (option.key === ans.correctKey) {
          if (lureLabel(rationale) !== 'correct') {
            fail(id, `the key is labelled "${lureLabel(rationale)}" rather than correct`);
          }
          continue;
        }
        const kind = rationale.partialRuleKind;
        if (typeof kind !== 'string' || !kind) {
          fail(id, `option ${option.key} carries no partialRuleKind — §4.6 requires every ` +
            'distractor to name the incomplete rule it encodes');
          continue;
        }
        kinds.add(kind);
        if (lureLabel(rationale) !== kind) {
          fail(id, `option ${option.key} lure "${lureLabel(rationale)}" != its rule kind "${kind}"`);
        }
        try {
          coarseLureClass(kind);
        } catch (e) {
          fail(id, `option ${option.key}: ${e.message}`);
        }
        if (typeof rationale.ruleId !== 'string' || !rationale.ruleId) {
          fail(id, `option ${option.key} carries no ruleId`);
        }
        const traced = trace[option.key];
        if (!traced || traced.ruleId !== rationale.ruleId || traced.kind !== kind) {
          fail(id, `strategyTrace for ${option.key} disagrees with its rationale`);
        }
      }
      if (kinds.size < 2) {
        fail(id, `all four distractors encode the same failure ("${[...kinds][0]}") — the slate ` +
          'cannot show error migration');
      }
      if (!Array.isArray(ans.strategyTraceRules) || ans.strategyTraceRules.length !== 8) {
        fail(id, 'answer.strategyTraceRules does not declare the closed rule vocabulary');
      }
    }

    if (OPTION_KEYS.includes(ans.correctKey)) keyCounts[ans.correctKey]++;

    // ---- 7. Difficulty re-derived from the item's own levers ----
    const derivedDifficulty = round2(
      difficultyOf(lev.depth, lev.turns, lev.density, lev.distractorSimilarity),
    );
    if (!isNum(it.difficulty) || Math.abs(derivedDifficulty - it.difficulty) > 0.01) {
      fail(id, `difficulty ${it.difficulty} != derived-from-levers ${derivedDifficulty}`);
    }

    // ---- 10. Band ladder ----
    if (isNum(it.difficulty)) {
      const band = bandOf(it.difficulty);
      if (lev.depth > band.maxDepth) {
        fail(id, `depth ${lev.depth} exceeds the ${band.band} cap of ${band.maxDepth}`);
      }
      if (lev.density > band.maxDensity) {
        fail(id, `density ${lev.density} exceeds the ${band.band} cap of ${band.maxDensity}`);
      }
      if (!deepEq(it.ageBands, [band.band])) {
        fail(id, `ageBands ${JSON.stringify(it.ageBands)} != ["${band.band}"]`);
      }
    }

    // ---- 12. Persistence ----
    if (lev.systemPersistence !== mode) {
      fail(id, `provenance levers say persistence ${lev.systemPersistence}, bank is ${mode}`);
    }
    if (ans.system && typeof ans.system.systemId === 'string') systemIds.add(ans.system.systemId);
    else fail(id, 'answer.system.systemId missing');
    if (Object.keys(mapping).length !== BADGES.length) {
      fail(id, `mapping covers ${Object.keys(mapping).length} badges, expected ${BADGES.length}`);
    }
    if (new Set(Object.values(mapping)).size !== ALL_OPS.length) {
      fail(id, 'mapping is not a bijection onto the operator vocabulary');
    }
  }

  if (schemaFailures > 0) {
    fail(`schema:${mode}`, `${schemaFailures}/${items.length} items fail bankItemSchema — first: ${firstSchemaIssue}`);
  }
  if (servedFailures > 0) {
    fail(`schema:${mode}`, `${servedFailures}/${items.length} served projections fail servedItemSchema`);
  }

  // ---- 9. Coverage: 0.5-point grain across the whole scale ----
  const diffs = items.map((it) => it.difficulty).filter(isNum);
  const min = Math.min(...diffs);
  const max = Math.max(...diffs);
  if (!(min <= 1.25)) fail(`coverage:${mode}`, `min difficulty ${round2(min)} misses the floor`);
  if (!(max >= 19.75)) fail(`coverage:${mode}`, `max difficulty ${round2(max)} misses the ceiling`);
  const rungs = [];
  for (let d = 1; d <= 20 + 1e-9; d += 0.5) rungs.push(round2(d));
  const rungCounts = rungs.map((r) => diffs.filter((d) => Math.abs(d - r) <= 0.25).length);
  rungs.forEach((r, i) => {
    if (rungCounts[i] < 5) {
      fail(`coverage:${mode}`, `0.5-point rung ${r} has ${rungCounts[i]} items (<5)`);
    }
  });

  // ---- 11. Key balance (E-094: report per option count, never pooled across formats) ----
  const worst = Math.max(...OPTION_KEYS.map((k) => (100 * keyCounts[k]) / items.length));
  const floor = 100 / OPTION_KEYS.length;
  if (worst - floor > 5) {
    fail(
      `keybalance:${mode}`,
      `modal key beats the ${floor}% floor by ${(worst - floor).toFixed(1)}pt (>5pt)`,
    );
  }
  if (optionCounts.size !== 1) {
    fail(
      `keybalance:${mode}`,
      `bank mixes option counts (${[...optionCounts].join(',')}) — E-094 forbids pooling formats`,
    );
  }

  // ---- 12. Persistence, at bank level ----
  if (mode === 'consistent' && systemIds.size !== 1) {
    fail(`persistence:${mode}`, `consistent bank holds ${systemIds.size} systems, expected 1`);
  }
  if (mode === 'perTrial' && systemIds.size !== items.length) {
    fail(
      `persistence:${mode}`,
      `perTrial bank holds ${systemIds.size} systems for ${items.length} items, expected one each`,
    );
  }

  return { items, rungCounts, keyCounts, systemIds, min, max, reachableHistogram, derivable };
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
    if (a[i].answer.correctKey !== b[i].answer.correctKey) fail('equating', `item ${i}: key slot`);
    if (!deepEq(a[i].ageBands, b[i].ageBands)) fail('equating', `item ${i}: age band differs`);
    if (!deepEq(a[i].content.options, b[i].content.options)) {
      fail('equating', `item ${i}: option figures differ`);
    }
    if (!deepEq(a[i].content.input, b[i].content.input)) fail('equating', `item ${i}: input differs`);
    if (!deepEq(a[i].answer.operatorChain, b[i].answer.operatorChain)) {
      fail('equating', `item ${i}: operator chain differs`);
    }
    if (a[i].content.chain.length !== b[i].content.chain.length) {
      fail('equating', `item ${i}: badge chain length differs`);
    }
  }
  // And they must NOT be the same bank: the badge labelling has to move somewhere.
  const differing = a.filter(
    (item, i) => b[i] && item.content.chain.join('>') !== b[i].content.chain.join('>'),
  ).length;
  if (differing === 0) {
    fail('equating', 'the two banks are identical — the perTrial arm re-drew nothing');
  }
}

/* ---- Report --------------------------------------------------------------- */
for (const mode of MODES) {
  const b = banks[mode];
  const total = b.items.length;
  const floor = 20;
  const worst = Math.max(...OPTION_KEYS.map((k) => (100 * b.keyCounts[k]) / total));
  const meanCeiling =
    b.items.reduce((sum, it) => sum + 1 / it.answer.relabelReachableOptions, 0) / total;
  console.log(
    `SPA-XFORM-01.${mode}: ${total} items, difficulty ${round2(b.min)}..${round2(b.max)}, ` +
      `${b.systemIds.size} hidden system(s)`,
  );
  console.log(
    `  key positions (5-option stratum): ` +
      OPTION_KEYS.map((k) => `${k}:${b.keyCounts[k]}`).join(' ') +
      `  — modal advantage over the ${floor}.0% floor: +${(worst - floor).toFixed(1)}pt`,
  );
  console.log(
    `  anti-leak: key derivable from content on ${b.derivable}/${total} items; options consistent ` +
      `with some relabelling ` +
      Object.entries(b.reachableHistogram)
        .sort((x, y) => Number(x[0]) - Number(y[0]))
        .map(([n, count]) => `${n}:${count}`)
        .join(' ') +
      `  — mapping-blind ceiling mean ${meanCeiling.toFixed(3)} vs chance 0.200`,
  );
  console.log(`  per 0.5pt rung (1.0 -> 20.0): ${b.rungCounts.join(' ')}`);
}

if (failures.length) {
  console.error(`\nFAIL — ${failures.length} problem(s):`);
  for (const f of failures.slice(0, 40)) console.error('  - ' + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log(
  '\nPASS — both banks parse against the repo\u2019s bankItemSchema and servedItemSchema; the key is\n' +
    're-derived from the stated system on 100% of items using a lattice algebra re-typed from the\n' +
    'documented coordinate maps; the key is never separable by displacement and never the unique\n' +
    'option a badge relabelling can reach, so content does not determine it; every operator is a\n' +
    'bijection on the lattice and every option carries the same number of blocks, so no operator\n' +
    'effect can be drawn as interface furniture; every distractor names the incomplete rule it\n' +
    'encodes and every slate names at least two; difficulty is monotone in all four declared levers\n' +
    'and re-derived from each item\u2019s own levers; coverage is 1..20 with >=5 items per 0.5-point\n' +
    'rung; depth and density respect the band ladder; key positions sit at the 5-option floor; the\n' +
    'consistent bank holds one hidden system and the perTrial bank one per item; and the two banks\n' +
    'are equated on every scored property.\n\n' +
    'NOT GATED, AND THIS IS THE U3 SELF-CHECK, NOT U4. It says the instrument is well formed, not\n' +
    'that it measures learning: Gate A has not been run on this bank and Gate B needs ~128 real\n' +
    'children (STAGE2_QUESTION_DESIGN §4.1.3).',
);
