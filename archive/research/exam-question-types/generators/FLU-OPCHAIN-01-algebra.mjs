// FLU-OPCHAIN-01 — the figure algebra, the operator vocabulary, and the seeded RNG, with NOTHING else.
//
// WHY THIS FILE EXISTS. `FLU-OPCHAIN-01.mjs` is a generator: it imports `node:fs`, writes two banks,
// and ends in a CLI block with a top-level `await import(...)`. That is all correct for a build-time
// script and all wrong for a module the SERVING PATH has to load — `apps/web` must not pull a
// bank writer and a top-level await into a request handler to find out what `turn` does.
//
// So the algebra moved here and `FLU-OPCHAIN-01.mjs` re-exports it. There is still exactly one
// definition of what the machine does, which is the property that matters: the generator, the
// serve-time materialiser, the learnability adapter and the Gate A probes all resolve to these
// functions, so a change to the D4 relation cannot make two of them disagree.
//
// This module imports nothing. That is a constraint, not an accident: it is what makes it safe for
// the app to import statically.

/* ================================================================== *
 * THE OPERATOR VOCABULARY — a small closed set whose primitives COMPOSE.
 *
 * Three of the six act on the figure's ORIENTATION and generate the dihedral group D4, so they do
 * not commute: `turn` then `flip` lands somewhere different from `flip` then `turn`. The other three
 * toggle independent attributes and commute with everything.
 * ================================================================== */
export const GEOMETRIC_OPS = ['turn', 'flip', 'slant'];
export const ATTRIBUTE_OPS = ['swap', 'ring', 'twin'];
export const OPERATORS = [...GEOMETRIC_OPS, ...ATTRIBUTE_OPS];
export const isGeometric = (op) => GEOMETRIC_OPS.includes(op);

/**
 * Badge symbols. Six neutral shapes. Under the shipped bank they appear in ONE canonical order in
 * every item so the tray never hints at the mapping; under serve-time materialisation the tray is
 * still canonical and the SESSION decides which symbol carries which operator.
 */
export const BADGE_SYMBOLS = ['circle', 'square', 'triangle', 'diamond', 'hexagon', 'star'];

/**
 * Figure glyphs. Every one is CHIRAL and has no rotational symmetry: a symmetric glyph would make
 * `flip` and `turn` invisible and the geometric half of the vocabulary unlearnable.
 */
export const GLYPHS = ['flag', 'hook', 'boot', 'comma'];

/**
 * Orientation is an element of D4 written uniquely as r^a m^b, with `a` quarter turns clockwise and
 * `b` a mirror flag. The product below is the D4 relation m r = r^-1 m — the entire reason `turn` and
 * `flip` fail to commute, so it is worth reading rather than trusting.
 */
export function composeOrient(g, o) {
  return {
    a: (((g.a + (g.b ? -o.a : o.a)) % 4) + 4) % 4,
    b: (g.b + o.b) % 2,
  };
}

/** Each geometric operator as the D4 element it left-multiplies by. */
export const GEOM_ELEMENT = {
  turn: { a: 1, b: 0 }, // quarter turn clockwise
  flip: { a: 0, b: 1 }, // mirror
  slant: { a: 1, b: 1 }, // mirror about a diagonal
};

/** Apply one operator to a figure state. Pure; never mutates. */
export function applyOp(op, figure) {
  if (isGeometric(op)) {
    return { ...figure, orient: composeOrient(GEOM_ELEMENT[op], figure.orient) };
  }
  if (op === 'swap') return { ...figure, shade: figure.shade === 'solid' ? 'hollow' : 'solid' };
  if (op === 'ring') return { ...figure, border: figure.border ? 0 : 1 };
  if (op === 'twin') return { ...figure, pair: figure.pair ? 0 : 1 };
  throw new Error(`unknown operator "${op}"`);
}

/** Apply a chain left-to-right: the first badge acts first. */
export function applyChain(chain, figure) {
  return chain.reduce((state, op) => applyOp(op, state), figure);
}

export const figureKey = (f) =>
  `${f.glyph}|${f.orient.a}${f.orient.b}|${f.shade}|${f.border}|${f.pair}`;

/**
 * Surface change between two figures, counted in components. Orientation counts as ONE component
 * however far it moved, because a child comparing pictures sees "pointing a different way", not a
 * rotation count.
 */
export function figureDistance(a, b) {
  let d = 0;
  if (a.orient.a !== b.orient.a || a.orient.b !== b.orient.b) d += 1;
  if (a.shade !== b.shade) d += 1;
  if (a.border !== b.border) d += 1;
  if (a.pair !== b.pair) d += 1;
  return d;
}

/**
 * Whether a chain's geometric operators cancel out.
 *
 * Not a corner case: in D4, `slant` then `flip` then `turn` composes to the identity, so a chain of
 * three DISTINCT orientation badges can leave the figure pointing exactly as it started. Such an
 * item is far easier than its stated depth — the child can ignore three badges and still be right.
 */
export function geometricPartIsIdentity(chain) {
  let orient = { a: 0, b: 0 };
  for (const op of chain) {
    if (isGeometric(op)) orient = composeOrient(GEOM_ELEMENT[op], orient);
  }
  return orient.a === 0 && orient.b === 0;
}

/**
 * Every output an attacker can reach WITHOUT the mapping, and how many relabellings reach it.
 *
 * A mapping is a badge->operator bijection and the badges in a chain are distinct, so guessing the
 * mapping is exactly guessing an ordered selection of `depth` distinct operators for the chain's
 * positions — at most 6*5*4*3 = 360 of them. The 720 full bijections project onto these with a
 * constant multiplicity of (6 - depth)!, so the vote RATIOS are identical and this map IS the
 * client's entire posterior over which option is the key.
 *
 * Note what it does NOT depend on: the session mapping. The reachable SET is a function of the input
 * figure and the chain LENGTH alone, which is why the reachability invariant survives re-keying.
 */
export function relabelVotes(depth, input) {
  const votes = new Map();
  const used = new Set();
  const walk = (position, state) => {
    if (position === depth) {
      const k = figureKey(state);
      votes.set(k, (votes.get(k) ?? 0) + 1);
      return;
    }
    for (const op of OPERATORS) {
      if (used.has(op)) continue;
      used.add(op);
      walk(position + 1, applyOp(op, state));
      used.delete(op);
    }
  };
  walk(0, input);
  return votes;
}

/**
 * Every partial rule this chain admits, as `{ruleId, kind, chain, note}`.
 *
 * These are the WRONG READINGS a child can hold: applied two steps in the wrong order, skipped a
 * step, ran one twice, read one step as a different operator, stopped after the first, did nothing.
 * §4.6 makes them a build requirement — with every wrong option encoding a named partial rule, each
 * response is classifiable, which gives both a falsification test and the §4.1.4 ordinal fallback.
 *
 * The chains handed in and out are OPERATOR chains, so this is the build-time form. The serve-time
 * form is `chainTransforms`, which expresses the same six classes over chain POSITIONS and is
 * therefore applicable before any operator is known.
 */
export function partialRules(chain) {
  const out = [];
  const label = (ops) => (ops.length ? ops.join('>') : 'none');

  for (let i = 0; i + 1 < chain.length; i++) {
    const swapped = chain.slice();
    [swapped[i], swapped[i + 1]] = [swapped[i + 1], swapped[i]];
    out.push({
      ruleId: `reorder@${i}:${label(swapped)}`,
      kind: 'order_error',
      chain: swapped,
      note: `applied badge ${i + 1} and badge ${i + 2} in the wrong order`,
    });
  }
  for (let i = 0; i < chain.length; i++) {
    const doubled = [...chain.slice(0, i + 1), chain[i], ...chain.slice(i + 1)];
    out.push({
      ruleId: `twice@${i}:${label(doubled)}`,
      kind: 'over_application',
      chain: doubled,
      note: `applied badge ${i + 1} twice`,
    });
  }
  for (let i = 0; i < chain.length; i++) {
    const dropped = chain.filter((_, j) => j !== i);
    out.push({
      ruleId: `drop@${i}:${label(dropped)}`,
      kind: 'omission',
      chain: dropped,
      note: `skipped badge ${i + 1}`,
    });
  }
  for (let i = 0; i < chain.length; i++) {
    for (const op of OPERATORS) {
      if (chain.includes(op)) continue;
      const swappedIn = chain.slice();
      swappedIn[i] = op;
      out.push({
        ruleId: `sub@${i}=${op}:${label(swappedIn)}`,
        kind: 'wrong_operator',
        chain: swappedIn,
        note: `read badge ${i + 1} as a different operator`,
      });
    }
  }
  if (chain.length > 1) {
    out.push({
      ruleId: `firstOnly:${label(chain.slice(0, 1))}`,
      kind: 'first_step_only',
      chain: chain.slice(0, 1),
      note: 'applied only the first badge and stopped',
    });
  }
  out.push({
    ruleId: 'identity:none',
    kind: 'identity_copy',
    chain: [],
    note: 'applied no operator at all',
  });
  return out;
}

/* ------------------------------------------------------------------ *
 * Seeded RNG (xmur3 -> mulberry32), the same idiom every generator here uses.
 * ------------------------------------------------------------------ */
export function xmur3(str) {
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

export function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed) {
  return mulberry32(xmur3(seed)());
}

export function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function seededUuid(seed) {
  const rng = makeRng('uuid|' + seed);
  const hex = [];
  for (let i = 0; i < 32; i++) hex.push(Math.floor(rng() * 16).toString(16));
  hex[12] = '4';
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const h = hex.join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
