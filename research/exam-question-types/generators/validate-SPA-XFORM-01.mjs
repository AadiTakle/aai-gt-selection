// SPA-XFORM-01 — U4, the INDEPENDENT VALIDATOR (STAGE2_QUESTION_DESIGN §9.2).
//
// WHAT MAKES THIS DIFFERENT FROM check-SPA-XFORM-01.mjs, WHICH IS U3.
//
// U3 is the generator's own self-check: it imports `BANK_PATHS` from the generator and re-types the
// lattice algebra from the SAME documented coordinate maps the generator uses. That catches a bank
// that disagrees with its own generator. It cannot catch a generator that is confidently wrong,
// because a transcription error in `cellPermutation((r, c) => ...)` would be copied verbatim into
// the check.
//
// So this file imports NOTHING from the generator — not the algebra, not the difficulty model, not
// even the bank paths — and it types the six permutations a DIFFERENT WAY: as literal 16-entry
// index tables, written out cell by cell from the prose description of each operator. A coordinate
// map and a hand-written table are two independent transcriptions of the same geometry, so §1 below
// cross-checks them against each other before either is used on an item. If they ever disagree, one
// of the two is wrong and the validator says so instead of validating against a shared mistake.
//
// WHAT IT ESTABLISHES, on 100% of BOTH banks (no sampling anywhere):
//
//   1. The algebra itself. Literal tables agree with an independently written coordinate map; each
//      operator is a bijection on the 16 cells; each has the order its description implies
//      (pivot⁴ = mirror² = braid² = stagger² = drift² = shunt⁴ = identity).
//   2. THE KEY IS RE-DERIVED, not trusted. `content.chain` is mapped through `answer.system.mapping`
//      to an operator chain, that chain is applied to `content.input.blocks`, and the figure it
//      produces must be EXACTLY the option `answer.correctKey` names — and no other option.
//   3. Every distractor is the partial rule it claims to be. The operator chain is parsed out of the
//      option's own `ruleId`, re-derived a second time from the ruleId's PREFIX against the key
//      chain, and both must reproduce the option's figure. A distractor whose label was moved to a
//      different option fails this even though its figure is still a legitimate one.
//   4. The two content-only attacks, re-implemented from scratch (E-075/E-076): the relabelling
//      brute force and the displacement shortcut. Reported as measurements, by difficulty slice.
//   5. Difficulty, the band ladder and key-position balance, re-derived from the item's own levers
//      with an independently typed formula.
//   6. The two banks are equated item-for-item on every scored property, and the ink invariant
//      holds: all five options carry the same block count, because a permutation cannot add ink.
//
// PROVING IT HAS TEETH. A validator nobody has ever seen fail is a validator nobody has tested.
// `--prove-teeth` injects nine specific defects into in-memory copies of the banks — one per
// independent check — reports which checks fired for each, and asserts that the unmodified banks
// pass. It mutates nothing on disk.
//
// Run:  node research/exam-question-types/generators/validate-SPA-XFORM-01.mjs
//       node research/exam-question-types/generators/validate-SPA-XFORM-01.mjs --prove-teeth

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Deliberately NOT imported from the generator: an independent statement of where the banks are. */
const BANK_FILES = {
  consistent: resolve(__dirname, '../banks/SPA-XFORM-01.jsonl'),
  perTrial: resolve(__dirname, '../control-banks/SPA-XFORM-01.perTrial.jsonl'),
};
const MODES = ['consistent', 'perTrial'];
const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E'];
const OPTION_COUNT = OPTION_KEYS.length;

/* ========================================================================== *
 * 1. THE ALGEBRA, TYPED AS LITERAL TABLES
 *
 * `TABLE[op][i]` is the cell that cell `i` moves to. Cell index is r*4 + c on a
 * 4x4 lattice. Each row below was written out by hand from the operator's prose
 * description, NOT generated from a coordinate lambda, so it is a second and
 * independent transcription of the same geometry.
 * ========================================================================== */
const GRID = 4;
const CELLS = GRID * GRID;

const TABLE = {
  // Quarter turn clockwise: the top row becomes the right column.
  pivot: [3, 7, 11, 15, 2, 6, 10, 14, 1, 5, 9, 13, 0, 4, 8, 12],
  // Reflection left to right: each row reverses.
  mirror: [3, 2, 1, 0, 7, 6, 5, 4, 11, 10, 9, 8, 15, 14, 13, 12],
  // Neighbouring columns trade places: 0<->1 and 2<->3.
  braid: [1, 0, 3, 2, 5, 4, 7, 6, 9, 8, 11, 10, 13, 12, 15, 14],
  // Neighbouring rows trade places: 0<->1 and 2<->3.
  stagger: [4, 5, 6, 7, 0, 1, 2, 3, 12, 13, 14, 15, 8, 9, 10, 11],
  // The four quarters trade places diagonally: both coordinates shift by two.
  drift: [10, 11, 8, 9, 14, 15, 12, 13, 2, 3, 0, 1, 6, 7, 4, 5],
  // Every block steps one column right; the last column wraps to the first.
  shunt: [1, 2, 3, 0, 5, 6, 7, 4, 9, 10, 11, 8, 13, 14, 15, 12],
};

const ORIENTATION_OPS = ['pivot', 'mirror'];
const REARRANGE_OPS = ['braid', 'stagger', 'drift', 'shunt'];
const ALL_OPS = [...ORIENTATION_OPS, ...REARRANGE_OPS];
const BADGES = ['crescent', 'spiral', 'trefoil', 'zigzag', 'teardrop', 'leaf'];
const isOrientation = (op) => ORIENTATION_OPS.includes(op);

/** The order each operator's description implies. A wrong table almost never has the right order. */
const OPERATOR_ORDER = { pivot: 4, mirror: 2, braid: 2, stagger: 2, drift: 2, shunt: 4 };

/** Words a renderer reaches for when a name sounds like interface furniture. */
const CHROME_LEXICON = [
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

const apply1 = (op, blocks) => blocks.map((cell) => TABLE[op][cell]).sort((a, b) => a - b);
const applyChain = (chain, blocks) => chain.reduce((state, op) => apply1(op, state), blocks);
const fkey = (blocks) => blocks.join('.');
const identityTable = () => [...Array(CELLS).keys()];

/** How many blocks ended up somewhere new. Symmetric, because every operator is a permutation. */
function moved(from, to) {
  const target = new Set(to);
  return from.filter((cell) => !target.has(cell)).length;
}

/**
 * Everything a client holding `content` can compute: the figure produced by every ordered
 * assignment of `depth` DISTINCT operators to the chain's positions. At most 6*5*4 = 120 at this
 * type's maximum depth. This IS the attack, so it returns the count per figure rather than a bare
 * set — a client that weights options by how many relabellings point at each does strictly better
 * than one that only eliminates, and §4 measures both.
 */
function relabelCounts(depth, input) {
  const counts = new Map();
  const walk = (position, used, state) => {
    if (position === depth) {
      const k = fkey(state);
      counts.set(k, (counts.get(k) ?? 0) + 1);
      return;
    }
    for (const op of ALL_OPS) {
      if (used.has(op)) continue;
      used.add(op);
      walk(position + 1, used, apply1(op, state));
      used.delete(op);
    }
  };
  walk(0, new Set(), input);
  return counts;
}

/* ========================================================================== *
 * 2. THE DIFFICULTY MODEL, TYPED INDEPENDENTLY
 *
 * Same declared weights, written out here rather than imported, so a weight
 * edited in the generator without a matching edit to the spec is a failure
 * rather than a silent agreement.
 * ========================================================================== */
const DEPTH_LOAD = { 1: 0, 2: 2.6, 3: 4.6 };
const TURN_WEIGHT = 0.9;
const ORDER_WEIGHT = 1.4;
const MIX_WEIGHT = 1.1;
const DENSITY_WEIGHT = 1.15;
const SIMILARITY_SPAN = 2.4;
const MIN_DENSITY = 2;
const MAX_DENSITY = 7;
const MAX_DEPTH = 3;

const isMixed = (depth, turns) => (turns > 0 && turns < depth ? 1 : 0);

function baseScore({ depth, turns, density }) {
  return (
    1.0 +
    DEPTH_LOAD[depth] +
    TURN_WEIGHT * turns +
    ORDER_WEIGHT * Math.max(0, turns - 1) +
    MIX_WEIGHT * isMixed(depth, turns) +
    DENSITY_WEIGHT * (density - MIN_DENSITY)
  );
}

const CONFIGS = (() => {
  const out = [];
  for (let depth = 1; depth <= MAX_DEPTH; depth++) {
    const minTurns = Math.max(0, depth - REARRANGE_OPS.length);
    for (let turns = minTurns; turns <= Math.min(depth, ORIENTATION_OPS.length); turns++) {
      for (let density = MIN_DENSITY; density <= MAX_DENSITY; density++) out.push({ depth, turns, density });
    }
  }
  return out;
})();
const RAW_MIN = Math.min(...CONFIGS.map(baseScore));
const RAW_MAX = Math.max(...CONFIGS.map(baseScore)) + SIMILARITY_SPAN;

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const round2 = (x) => Math.round(x * 100) / 100;

function difficultyOf(cfg, similarity) {
  const raw = baseScore(cfg) + SIMILARITY_SPAN * similarity;
  return clamp(1 + ((raw - RAW_MIN) * 19) / (RAW_MAX - RAW_MIN), 1, 20);
}

const BANDS = [
  { band: 'K-1', hi: 4, maxDepth: 1, maxDensity: 4 },
  { band: '2-3', hi: 8, maxDepth: 2, maxDensity: 5 },
  { band: '4-5', hi: 12, maxDepth: 2, maxDensity: 6 },
  { band: '6-8', hi: 20, maxDepth: 3, maxDensity: 7 },
];
const bandFor = (d) => BANDS.find((b) => d < b.hi) ?? BANDS[BANDS.length - 1];

/* ========================================================================== *
 * 3. THE PARTIAL-RULE TAXONOMY, RE-IMPLEMENTED
 *
 * Every ruleId carries its own operator chain after the first colon, and its
 * PREFIX says how that chain was supposed to be derived from the key chain.
 * Checking only the first would accept a distractor whose label was swapped
 * with another option's; checking only the second would accept a figure that
 * does not match its own label. Both are checked.
 * ========================================================================== */
const RULE_KINDS = [
  'order_error',
  'wrong_axis',
  'over_application',
  'wrong_operator',
  'omission',
  'wrong_family',
  'first_step_only',
  'identity_copy',
];

/** The operator chain a ruleId names, read off the text after its first colon. */
function chainFromRuleId(ruleId) {
  const at = ruleId.indexOf(':');
  if (at < 0) return null;
  const tail = ruleId.slice(at + 1);
  if (tail === 'none') return [];
  const ops = tail.split('>');
  return ops.every((op) => ALL_OPS.includes(op)) ? ops : null;
}

/** The chain the ruleId's PREFIX implies, derived from the key chain a second time. */
function chainFromRulePrefix(ruleId, keyChain) {
  const at = ruleId.indexOf(':');
  const head = at < 0 ? ruleId : ruleId.slice(0, at);
  const swap = (chain, i) => {
    const out = chain.slice();
    [out[i], out[i + 1]] = [out[i + 1], out[i]];
    return out;
  };

  let m;
  if ((m = /^reorder@(\d+)$/.exec(head))) return { kind: 'order_error', chain: swap(keyChain, +m[1]) };
  if ((m = /^axis@(\d+)=(\w+)$/.exec(head))) {
    const out = keyChain.slice();
    out[+m[1]] = m[2];
    return { kind: 'wrong_axis', chain: out };
  }
  if ((m = /^twice@(\d+)$/.exec(head))) {
    const i = +m[1];
    return {
      kind: 'over_application',
      chain: [...keyChain.slice(0, i + 1), keyChain[i], ...keyChain.slice(i + 1)],
    };
  }
  if ((m = /^sub@(\d+)=(\w+)$/.exec(head))) {
    const out = keyChain.slice();
    out[+m[1]] = m[2];
    return { kind: 'wrong_operator', chain: out };
  }
  if ((m = /^drop@(\d+)$/.exec(head))) {
    return { kind: 'omission', chain: keyChain.filter((_, j) => j !== +m[1]) };
  }
  if ((m = /^pair@(\d+)=(\w+)\+(\w+)$/.exec(head))) {
    const out = keyChain.slice();
    out[+m[1]] = m[2];
    out[+m[1] + 1] = m[3];
    return { kind: 'wrong_family', chain: out };
  }
  if (head === 'firstOnly') return { kind: 'first_step_only', chain: keyChain.slice(0, 1) };
  if (head === 'identity') return { kind: 'identity_copy', chain: [] };
  if (head === 'full') return { kind: 'correct', chain: keyChain.slice() };
  return null;
}

/* ========================================================================== *
 * 4. THE VALIDATOR
 * ========================================================================== */

const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const deepEq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function loadBank(mode) {
  return readFileSync(BANK_FILES[mode], 'utf8')
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line, i) => {
      try {
        return JSON.parse(line);
      } catch (err) {
        throw new Error(`${mode} line ${i + 1} is not JSON: ${err.message}`);
      }
    });
}

/** Cross-check the two transcriptions of the geometry against each other, before either is used. */
function validateAlgebra(failures) {
  const fail = (msg) => failures.push(['ALGEBRA', msg]);
  const coordinate = {
    pivot: (r, c) => [c, GRID - 1 - r],
    mirror: (r, c) => [r, GRID - 1 - c],
    braid: (r, c) => [r, c ^ 1],
    stagger: (r, c) => [r ^ 1, c],
    drift: (r, c) => [(r + 2) % GRID, (c + 2) % GRID],
    shunt: (r, c) => [r, (c + 1) % GRID],
  };

  for (const op of ALL_OPS) {
    const table = TABLE[op];
    if (!Array.isArray(table) || table.length !== CELLS || new Set(table).size !== CELLS) {
      fail(`"${op}" is not a permutation of the ${CELLS} lattice cells`);
      continue;
    }
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const [nr, nc] = coordinate[op](r, c);
        const expected = nr * GRID + nc;
        if (table[r * GRID + c] !== expected) {
          fail(
            `"${op}" literal table disagrees with the coordinate map at (${r},${c}): ` +
              `table says ${table[r * GRID + c]}, map says ${expected}`,
          );
        }
      }
    }
    let composed = identityTable();
    for (let n = 1; n <= OPERATOR_ORDER[op]; n++) {
      composed = composed.map((cell) => table[cell]);
      const isIdentity = composed.every((cell, i) => cell === i);
      if (isIdentity && n !== OPERATOR_ORDER[op]) {
        fail(`"${op}" returns to the identity after ${n} applications, not ${OPERATOR_ORDER[op]}`);
        break;
      }
      if (!isIdentity && n === OPERATOR_ORDER[op]) {
        fail(`"${op}" does not return to the identity after ${OPERATOR_ORDER[op]} applications`);
      }
    }
  }

  for (const name of [...ALL_OPS, ...BADGES]) {
    const hit = CHROME_LEXICON.find((word) => name.toLowerCase().includes(word));
    if (hit) fail(`"${name}" is named after interface chrome ("${hit}")`);
  }
}

/**
 * Validate one arm, item by item, and collect the anti-leak measurements.
 *
 * Every check runs on every item — there is no sampling and no early exit — because the leak
 * measurement is a count over the whole bank and a partial count is not the measurement.
 */
function validateArm(mode, items, failures) {
  const fail = (id, msg) => failures.push([id, `${mode}: ${msg}`]);
  const leak = [];
  const keySlots = new Array(OPTION_COUNT).fill(0);
  const systems = new Set();
  const seenItemIds = new Set();
  const seenFingerprints = new Map();

  items.forEach((item, index) => {
    const where = `item ${index} (${item.itemId})`;
    const content = item.content ?? {};
    const answer = item.answer ?? {};
    const levers = item.provenance?.levers ?? {};
    const input = content.input?.blocks;
    const options = content.options;

    if (!Array.isArray(input) || !Array.isArray(options) || options.length !== OPTION_COUNT) {
      fail('SHAPE', `${where}: expected an input figure and ${OPTION_COUNT} options`);
      return;
    }
    if (seenItemIds.has(item.itemId)) fail('SHAPE', `${where}: duplicate itemId`);
    seenItemIds.add(item.itemId);

    // -- key containment: `content` must not name the system it is hiding ----------------------
    const contentText = JSON.stringify(content);
    for (const op of ALL_OPS) {
      if (contentText.includes(`"${op}"`)) fail('LEAK-NAMED', `${where}: content names operator "${op}"`);
    }
    for (const word of ['mapping', 'correctKey', 'systemPersistence', 'operatorChain']) {
      if (contentText.includes(word)) fail('LEAK-NAMED', `${where}: content carries "${word}"`);
    }

    // -- 2. THE KEY, RE-DERIVED ----------------------------------------------------------------
    const mapping = answer.system?.mapping;
    const badgeChain = content.chain;
    if (!mapping || !Array.isArray(badgeChain) || badgeChain.length === 0) {
      fail('KEY', `${where}: missing badge chain or hidden mapping`);
      return;
    }
    if (new Set(badgeChain).size !== badgeChain.length) {
      fail('KEY', `${where}: a badge repeats inside the chain`);
    }
    const derivedChain = badgeChain.map((badge) => mapping[badge]);
    if (derivedChain.some((op) => !ALL_OPS.includes(op))) {
      fail('KEY', `${where}: the mapping sends a badge to something that is not an operator`);
      return;
    }
    if (!deepEq(derivedChain, answer.operatorChain)) {
      fail(
        'KEY',
        `${where}: stated operatorChain ${JSON.stringify(answer.operatorChain)} is not the ` +
          `mapping's image of the badge chain (${JSON.stringify(derivedChain)})`,
      );
    }

    const derivedFigure = applyChain(derivedChain, input);
    const derivedKeyFigure = fkey(derivedFigure);
    const matching = options.filter((o) => fkey(o.blocks) === derivedKeyFigure).map((o) => o.key);
    if (matching.length === 0) {
      fail('KEY', `${where}: no option holds the figure the chain produces (${derivedKeyFigure})`);
    } else if (matching.length > 1) {
      fail('KEY', `${where}: options ${matching.join('/')} both hold the key figure`);
    } else if (matching[0] !== answer.correctKey) {
      fail(
        'KEY',
        `${where}: chain produces option ${matching[0]} but correctKey says ${answer.correctKey}`,
      );
    }
    if (derivedKeyFigure === fkey(input)) {
      fail('KEY', `${where}: the machine produced no visible change`);
    }
    const slot = OPTION_KEYS.indexOf(answer.correctKey);
    if (slot < 0) fail('SHAPE', `${where}: correctKey "${answer.correctKey}" is not an option key`);
    else keySlots[slot] += 1;

    // -- 3. EVERY DISTRACTOR IS THE PARTIAL RULE IT CLAIMS TO BE -------------------------------
    const keyChain = derivedChain;
    const figures = new Set();
    for (const option of options) {
      const fk = fkey(option.blocks);
      if (figures.has(fk)) fail('DISTRACTOR', `${where}: two options hold the same figure`);
      figures.add(fk);
      if (option.blocks.length !== input.length) {
        fail('INK', `${where}: option ${option.key} holds ${option.blocks.length} blocks, input holds ${input.length}`);
      }

      const trace = answer.strategyTrace?.[option.key];
      const rationale = answer.distractorRationales?.[option.key];
      if (!trace || !rationale) {
        fail('DISTRACTOR', `${where}: option ${option.key} carries no strategy trace or rationale`);
        continue;
      }
      if (trace.ruleId !== rationale.ruleId) {
        fail('DISTRACTOR', `${where}: option ${option.key} trace and rationale name different rules`);
      }
      if (option.key === answer.correctKey) {
        if (trace.kind !== 'correct') fail('DISTRACTOR', `${where}: the key is labelled "${trace.kind}"`);
        continue;
      }
      if (!RULE_KINDS.includes(trace.kind)) {
        fail('DISTRACTOR', `${where}: option ${option.key} has unknown partial rule "${trace.kind}"`);
        continue;
      }

      const stated = chainFromRuleId(trace.ruleId);
      const implied = chainFromRulePrefix(trace.ruleId, keyChain);
      if (stated === null || implied === null) {
        fail('DISTRACTOR', `${where}: option ${option.key} ruleId "${trace.ruleId}" is unparseable`);
        continue;
      }
      if (implied.kind !== trace.kind) {
        fail(
          'DISTRACTOR',
          `${where}: option ${option.key} ruleId "${trace.ruleId}" describes ${implied.kind}, labelled ${trace.kind}`,
        );
      }
      if (!deepEq(stated, implied.chain)) {
        fail(
          'DISTRACTOR',
          `${where}: option ${option.key} ruleId "${trace.ruleId}" — its own chain ` +
            `${JSON.stringify(stated)} is not what its prefix implies (${JSON.stringify(implied.chain)})`,
        );
      }
      if (fkey(applyChain(stated, input)) !== fk) {
        fail(
          'DISTRACTOR',
          `${where}: option ${option.key} does not hold the figure its rule "${trace.ruleId}" produces`,
        );
      }
    }

    // -- 4. THE TWO CONTENT-ONLY ATTACKS -------------------------------------------------------
    const keyDisplacement = moved(input, derivedFigure);
    if (answer.keyDisplacementFromInput !== keyDisplacement) {
      fail('LEAK-DISP', `${where}: stated key displacement ${answer.keyDisplacementFromInput} != ${keyDisplacement}`);
    }
    const displacementMatched = options.filter(
      (o) => o.key !== answer.correctKey && moved(input, o.blocks) === keyDisplacement,
    ).length;
    if (displacementMatched === 0) {
      fail(
        'LEAK-DISP',
        `${where}: the key is separable by displacement — no distractor moves ${keyDisplacement} blocks`,
      );
    }

    const counts = relabelCounts(keyChain.length, input);
    const reachable = options.filter((o) => counts.has(fkey(o.blocks)));
    if (reachable.length !== answer.relabelReachableOptions) {
      fail(
        'LEAK-RELABEL',
        `${where}: stated relabelReachableOptions ${answer.relabelReachableOptions} != ${reachable.length}`,
      );
    }
    if (reachable.length < 4) {
      fail(
        'LEAK-RELABEL',
        `${where}: only ${reachable.length} of ${OPTION_COUNT} options survive relabelling ` +
          `(invariant is >= 4; a mapping-blind solver reaches 1-in-${reachable.length})`,
      );
    }
    // The stronger attack: weight each option by how many relabellings point at it, take the argmax.
    //
    // NOT a failure, and deliberately so. This type's declared anti-leak invariants are the two
    // above — the key is never uniquely reachable, and at least four options survive relabelling —
    // and both hold on every item. Being the unique MODAL option is a third property that the
    // sibling type VER-MORPHO-01 asserts and this generator never claimed, so charging it here
    // would be this validator inventing a contract rather than checking one. It is measured
    // instead, counted, and reported in §4 of the Gate A write-up, because a residue nobody has
    // bounded is exactly what an independent validator exists to surface.
    const weights = options.map((o) => counts.get(fkey(o.blocks)) ?? 0);
    const best = Math.max(...weights);
    const argmax = weights.filter((w) => w === best).length;
    const keyWeight = counts.get(derivedKeyFigure) ?? 0;
    const bestAttack = keyWeight === best ? 1 / argmax : 0;
    leak.push({
      difficulty: item.difficulty,
      depth: keyChain.length,
      reachable: reachable.length,
      determined: reachable.length === 1,
      uniqueModalKey: keyWeight === best && argmax === 1,
      elimination: 1 / reachable.length,
      bestAttack,
    });

    // -- 5. DIFFICULTY, BAND LADDER, LEVERS ----------------------------------------------------
    const cfg = { depth: levers.depth, turns: levers.turns, density: levers.density };
    if (!isNum(cfg.depth) || !isNum(cfg.turns) || !isNum(cfg.density)) {
      fail('DIFFICULTY', `${where}: levers are missing`);
    } else {
      if (cfg.depth !== badgeChain.length) {
        fail('DIFFICULTY', `${where}: lever depth ${cfg.depth} != chain length ${badgeChain.length}`);
      }
      if (cfg.density !== input.length) {
        fail('DIFFICULTY', `${where}: lever density ${cfg.density} != ${input.length} blocks`);
      }
      const turns = derivedChain.filter(isOrientation).length;
      if (cfg.turns !== turns) fail('DIFFICULTY', `${where}: lever turns ${cfg.turns} != ${turns}`);
      if (levers.mixed !== isMixed(cfg.depth, cfg.turns)) {
        fail('DIFFICULTY', `${where}: lever mixed ${levers.mixed} is not implied by (depth, turns)`);
      }
      const expected = round2(difficultyOf(cfg, levers.distractorSimilarity));
      if (Math.abs(expected - item.difficulty) > 1e-9) {
        fail('DIFFICULTY', `${where}: stated ${item.difficulty}, re-derived ${expected}`);
      }
      const band = bandFor(item.difficulty);
      if (!deepEq(item.ageBands, [band.band])) {
        fail('BAND', `${where}: difficulty ${item.difficulty} sits in ${band.band}, item declares ${JSON.stringify(item.ageBands)}`);
      }
      if (cfg.depth > band.maxDepth) {
        fail('BAND', `${where}: depth ${cfg.depth} exceeds the ${band.band} cap of ${band.maxDepth}`);
      }
      if (cfg.density > band.maxDensity) {
        fail('BAND', `${where}: density ${cfg.density} exceeds the ${band.band} cap of ${band.maxDensity}`);
      }
    }

    // -- 6. PERSISTENCE AND CONTENT DISTINCTNESS -----------------------------------------------
    systems.add(JSON.stringify(answer.system?.mapping ?? null));
    const fingerprint = JSON.stringify([input, options.map((o) => o.blocks)]);
    if (seenFingerprints.has(fingerprint)) {
      fail('DUPE', `${where}: same figures as item ${seenFingerprints.get(fingerprint)}`);
    } else seenFingerprints.set(fingerprint, index);

    if (item.syntheticOnly !== true) fail('GOVERNANCE', `${where}: syntheticOnly is not true`);
    if (item.validated !== false) fail('GOVERNANCE', `${where}: validated is not false`);
  });

  if (mode === 'consistent' && systems.size !== 1) {
    fail('PERSISTENCE', `the consistent arm holds ${systems.size} systems, expected exactly 1`);
  }
  if (mode === 'perTrial' && systems.size < items.length * 0.5) {
    fail('PERSISTENCE', `the perTrial arm holds only ${systems.size} distinct systems for ${items.length} items`);
  }

  // Key-position balance (E-094): round-robin allocation, so this is tight by construction.
  const expectedPerSlot = items.length / OPTION_COUNT;
  const worst = Math.max(...keySlots.map((n) => Math.abs(n - expectedPerSlot)));
  if (worst > Math.max(1, 0.15 * expectedPerSlot)) {
    fail('KEYPOS', `key positions ${keySlots.join('/')} against an expected ${expectedPerSlot.toFixed(1)} each`);
  }

  return { leak, keySlots };
}

/** The two arms must be identical on every scored property; only the badge labels may differ. */
function validateEquating(banks, failures) {
  const [a, b] = [banks.consistent, banks.perTrial];
  if (a.length !== b.length) {
    failures.push(['EQUATING', `consistent holds ${a.length} items, perTrial holds ${b.length}`]);
    return;
  }
  for (let i = 0; i < a.length; i++) {
    const mismatch = [];
    if (a[i].difficulty !== b[i].difficulty) mismatch.push('difficulty');
    if (!deepEq(a[i].ageBands, b[i].ageBands)) mismatch.push('ageBands');
    if (a[i].answer?.correctKey !== b[i].answer?.correctKey) mismatch.push('correctKey');
    if (!deepEq(a[i].content?.input, b[i].content?.input)) mismatch.push('input figure');
    if (!deepEq(a[i].content?.options, b[i].content?.options)) mismatch.push('option figures');
    if (!deepEq(a[i].answer?.operatorChain, b[i].answer?.operatorChain)) mismatch.push('operator chain');
    if (!deepEq(a[i].provenance?.levers?.depth, b[i].provenance?.levers?.depth)) mismatch.push('depth');
    if (mismatch.length > 0) {
      failures.push(['EQUATING', `item ${i}: the arms differ on ${mismatch.join(', ')}`]);
    }
  }
}

function validate(banks) {
  const failures = [];
  validateAlgebra(failures);
  const perArm = {};
  for (const mode of MODES) perArm[mode] = validateArm(mode, banks[mode], failures);
  validateEquating(banks, failures);
  return { failures, perArm };
}

/* ========================================================================== *
 * 5. REPORTING
 * ========================================================================== */

const pct = (x) => `${(100 * x).toFixed(1)}%`;

function reportLeak(leak) {
  const sorted = leak.slice().sort((x, y) => x.difficulty - y.difficulty);
  const q = Math.ceil(sorted.length / 4);
  const slices = [];
  for (let i = 0; i < 4; i++) {
    const rows = sorted.slice(i * q, (i + 1) * q);
    if (rows.length === 0) continue;
    slices.push({
      label: `Q${i + 1} (${rows[0].difficulty.toFixed(2)}–${rows[rows.length - 1].difficulty.toFixed(2)})`,
      rows,
    });
  }
  console.log('\n| difficulty slice | items | key fully determined | mean viable options | elimination attack | modal attack | key uniquely modal |');
  console.log('| --- | --- | --- | --- | --- | --- | --- |');
  const line = (label, rows) => {
    const avg = (f) => rows.reduce((s, r) => s + f(r), 0) / rows.length;
    console.log(
      `| ${label} | ${rows.length} | ${rows.filter((r) => r.determined).length} | ` +
        `${avg((r) => r.reachable).toFixed(2)} / ${OPTION_COUNT} | ${pct(avg((r) => r.elimination))} | ` +
        `${pct(avg((r) => r.bestAttack))} | ${rows.filter((r) => r.uniqueModalKey).length} |`,
    );
  };
  for (const slice of slices) line(slice.label, slice.rows);
  line('**whole bank**', sorted);

  console.log('\nThe same two attacks by composition depth, which is where the structure actually lives:\n');
  console.log('| depth | items | mean viable options | elimination attack | modal attack | key uniquely modal |');
  console.log('| --- | --- | --- | --- | --- | --- |');
  for (const depth of [1, 2, 3]) {
    const rows = sorted.filter((r) => r.depth === depth);
    if (rows.length === 0) continue;
    const avg = (f) => rows.reduce((s, r) => s + f(r), 0) / rows.length;
    console.log(
      `| ${depth} | ${rows.length} | ${avg((r) => r.reachable).toFixed(2)} / ${OPTION_COUNT} | ` +
        `${pct(avg((r) => r.elimination))} | ${pct(avg((r) => r.bestAttack))} | ` +
        `${rows.filter((r) => r.uniqueModalKey).length} |`,
    );
  }

  const minReachable = Math.min(...leak.map((r) => r.reachable));
  console.log(
    `\n  declared invariants: key fully determined on ${leak.filter((r) => r.determined).length} / ${leak.length} items; ` +
      `minimum viable options ${minReachable} (invariant >= 4). Both hold.`,
  );
  console.log(
    `  UNDECLARED RESIDUE: the key is the unique modal option on ` +
      `${leak.filter((r) => r.uniqueModalKey).length} / ${leak.length} items, where the modal attack ` +
      `succeeds outright.`,
  );
  console.log(`  chance floor for a ${OPTION_COUNT}-option item: ${pct(1 / OPTION_COUNT)}`);
}

/* ========================================================================== *
 * 6. PROVING IT HAS TEETH
 *
 * Nine defects, one per independent check. Each mutates a deep copy, so nothing
 * on disk is touched, and each is expected to be caught by a NAMED check —
 * "some check fired" is not the assertion, because a defect caught only by an
 * unrelated check means the check that should have caught it is asleep.
 * ========================================================================== */
const clone = (x) => JSON.parse(JSON.stringify(x));

const DEFECTS = [
  {
    name: 'the key is moved to another slot',
    expect: 'KEY',
    apply: (banks) => {
      const item = banks.consistent[7];
      item.answer.correctKey = item.answer.correctKey === 'A' ? 'B' : 'A';
    },
  },
  {
    name: 'two badges trade meanings in the hidden mapping',
    expect: 'KEY',
    apply: (banks) => {
      const m = banks.consistent[12].answer.system.mapping;
      [m.crescent, m.spiral] = [m.spiral, m.crescent];
    },
  },
  {
    name: "a stated difficulty is understated by a rung",
    expect: 'DIFFICULTY',
    apply: (banks) => {
      banks.consistent[40].difficulty = round2(banks.consistent[40].difficulty - 0.5);
    },
  },
  {
    name: 'a distractor is relabelled with another partial rule',
    expect: 'DISTRACTOR',
    apply: (banks) => {
      const item = banks.consistent[60];
      const wrong = OPTION_KEYS.find((k) => k !== item.answer.correctKey);
      item.answer.strategyTrace[wrong].ruleId = 'identity:none';
      item.answer.strategyTrace[wrong].kind = 'identity_copy';
      item.answer.distractorRationales[wrong].ruleId = 'identity:none';
    },
  },
  {
    name: 'an option is replaced by a figure no relabelling reaches',
    expect: 'LEAK-RELABEL',
    apply: (banks) => {
      const item = banks.consistent[100];
      const wrong = item.content.options.find((o) => o.key !== item.answer.correctKey);
      const used = new Set(item.content.options.flatMap((o) => o.blocks));
      const free = [...Array(CELLS).keys()].filter((c) => !used.has(c));
      wrong.blocks = [...wrong.blocks.slice(1), free[0] ?? 15].sort((x, y) => x - y);
    },
  },
  {
    name: 'a high-difficulty item is given the K-1 band',
    expect: 'BAND',
    apply: (banks) => {
      banks.consistent[200].ageBands = ['K-1'];
    },
  },
  {
    name: "one item's figures are copied over another's",
    expect: 'EQUATING',
    apply: (banks) => {
      banks.perTrial[30].content.options = clone(banks.perTrial[31].content.options);
    },
  },
  {
    name: 'the displacement-matched distractor is moved off the key displacement',
    expect: 'LEAK-DISP',
    apply: (banks) => {
      const item = banks.consistent[150];
      item.answer.keyDisplacementFromInput += 1;
    },
  },
  {
    name: 'an option gains a block, so the figures no longer share an ink count',
    expect: 'INK',
    apply: (banks) => {
      const item = banks.consistent[170];
      const wrong = item.content.options.find((o) => o.key !== item.answer.correctKey);
      const free = [...Array(CELLS).keys()].find((c) => !wrong.blocks.includes(c));
      wrong.blocks = [...wrong.blocks, free].sort((x, y) => x - y);
    },
  },
];

function proveTeeth(pristine) {
  console.log('\n## Proving the validator has teeth\n');
  console.log(
    'Nine defects, one per independent check, each injected into a deep copy of the banks. A defect\n' +
      'is only counted as CAUGHT when the check that OWNS it fires — a defect caught by some other\n' +
      'check would mean the owning check is asleep. Nothing on disk is modified.\n',
  );
  console.log('| # | injected defect | check that must fire | failures raised | verdict |');
  console.log('| --- | --- | --- | --- | --- |');

  let allCaught = true;
  let totalFailures = 0;
  DEFECTS.forEach((defect, i) => {
    const banks = clone(pristine);
    defect.apply(banks);
    const { failures } = validate(banks);
    const owned = failures.filter(([id]) => id === defect.expect);
    const caught = owned.length > 0;
    if (!caught) allCaught = false;
    totalFailures += failures.length;
    console.log(
      `| ${i + 1} | ${defect.name} | \`${defect.expect}\` | ${failures.length} ` +
        `(${owned.length} from \`${defect.expect}\`) | ${caught ? 'CAUGHT' : '**MISSED**'} |`,
    );
  });

  const { failures: cleanFailures } = validate(clone(pristine));
  console.log(
    `\n  Total failures raised across the nine injections: **${totalFailures}**.\n` +
      `  The unmodified banks raise **${cleanFailures.length}**.`,
  );
  if (cleanFailures.length !== 0) {
    console.log('  The pristine banks do NOT pass, so the teeth result above says nothing.');
    return false;
  }
  return allCaught;
}

/* ========================================================================== *
 * 7. MAIN
 * ========================================================================== */

function main() {
  const proving = process.argv.includes('--prove-teeth');
  console.log('# SPA-XFORM-01 — U4 independent validator\n');
  console.log(
    'Born-synthetic. Both banks carry `validated: false` and `syntheticOnly: true`; nothing here is\n' +
      'evidence about a real child. This file imports nothing from the generator: the six lattice\n' +
      'permutations are typed as literal index tables and cross-checked against an independently\n' +
      'written coordinate map before any item is read.',
  );

  const banks = {};
  for (const mode of MODES) banks[mode] = loadBank(mode);
  console.log(
    `\nRead ${banks.consistent.length} consistent + ${banks.perTrial.length} perTrial items ` +
      `(100% of both banks validated; no sampling).`,
  );

  const { failures, perArm } = validate(banks);

  console.log('\n## The answer-key leak audit, re-derived from `content` alone\n');
  console.log('Consistent arm (the perTrial arm is identical, because the figures are equated):');
  reportLeak(perArm.consistent.leak);
  console.log(`\n  key positions, consistent arm: ${perArm.consistent.keySlots.join(' / ')} (A/B/C/D/E)`);

  if (failures.length === 0) {
    console.log('\n## Verdict\n\n  PASS — every check clean on 100% of both banks.');
  } else {
    console.log(`\n## Verdict\n\n  FAIL — ${failures.length} failure(s):\n`);
    for (const [id, msg] of failures.slice(0, 60)) console.log(`  [${id}] ${msg}`);
    if (failures.length > 60) console.log(`  ... and ${failures.length - 60} more`);
  }

  let teethOk = true;
  if (proving) teethOk = proveTeeth(banks);

  if (failures.length > 0 || !teethOk) process.exitCode = 1;
}

main();
