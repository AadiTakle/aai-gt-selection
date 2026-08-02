import type { ServedItem } from '@gt-selection/exam-engine';

import type { RawBankItem } from './bank-loader';

/**
 * PROOF OF CONCEPT — the hidden system drawn PER SESSION, server-side, for `FLU-OPCHAIN-01`.
 *
 * NOT WIRED IN. Nothing imports this from a route, the loader, the runner or the verifier, and no
 * child is served anything by it. It exists so that the design in
 * `docs/product/STAGE2_SESSION_KEYED_SYSTEMS.md` can be checked against running code rather than
 * argued about, and so the four things that have to move server-side are demonstrably server-side.
 *
 * ---------------------------------------------------------------------------
 * THE DEFECT THIS ADDRESSES
 *
 * `FLU-OPCHAIN-01` is built around a badge->operator mapping the child induces across ~30 trials.
 * That mapping is drawn once at BUILD time and baked into `banks/FLU-OPCHAIN-01.jsonl`, one system
 * for the whole file. Intersecting "the machine's output was one of the figures on that screen"
 * across served items therefore constrains the SAME unknown every time, and pins it exactly after
 * 4 to 12 items (`docs/product/STAGE2_ANTILEAK_COMPARISON.md` §7.1). A block serves 30–60 trials,
 * so this is available inside one ordinary session — and because the system ships in the file, one
 * offline scrape breaks that bank permanently, for every subsequent child.
 *
 * Better distractors cannot fix it. The system has to persist across trials or there is nothing to
 * learn, and that same persistence is what makes it solvable from a handful of examples.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS MODULE DOES INSTEAD
 *
 * The bank ships item STRUCTURES — input figure, badge chain, option set — with no key and no
 * mapping. At session start the server draws a mapping for that child. The key of an item is
 * whichever option the session's mapping produces, so the same structure keys differently for
 * different children, and a scrape of one child's session says nothing about another's.
 *
 * Four things live here and nowhere else, which is the whole point:
 *
 *   THE MAPPING   {@link drawSessionSystem} — never serialised into a served item, never sent.
 *   THE KEY       {@link deriveKey} — computed from the mapping, per session, per item.
 *   THE VERIFIER  {@link verifySessionAnswer} — the only thing that decides correctness.
 *   THE ORACLE    {@link deducibility} — which primitives the child could have pinned by trial `t`,
 *                 recomputed against THIS session's mapping rather than a build-time constant.
 *
 * {@link toSessionServedItem} is the projection, and it is built by construction rather than by
 * omission: it names the seven fields a browser may have, so a field added to a structure cannot
 * reach a child by being forgotten.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT DOES NOT FIX, MEASURED AND STATED HERE BECAUSE IT BELONGS NEXT TO THE CODE
 *
 * A child still meets 30–60 items keyed by ONE mapping — their own. The same intersection attack
 * therefore still runs inside their session: with the post-commit reveal a learning block gives by
 * design, the session mapping is pinned exactly by a median of 6 trials and a client scores 91.3%
 * over a 30-trial block. Per-session generation converts "one scrape breaks the bank forever" into
 * "each child must re-derive it from their own first few trials". That is a large reduction and it
 * is not a closure, and whether the residual is acceptable is a threat-model question for the
 * owner rather than one this module answers.
 *
 * And the blocking cost, also measured: only about 28% of the shipped bank is keyable under any one
 * draw, concentrated at shallow chains, so the served ladder loses its top and 87.8% of the
 * 0.5-point rungs fall short of the five items the bank is built to guarantee. See §5 of the design
 * note. That is why this is a proof of concept and not a wiring change.
 *
 * Re-measure everything above with:
 *   node research/exam-question-types/stage2-session-keying-feasibility.mjs
 */

/* ================================================================== *
 * FIGURE SEMANTICS
 *
 * These are on the server today only inside the generator (a research `.mjs`) and inside the guard
 * test that brute-forces against it. Per-session keying needs them at request time, so this is the
 * first of the four things that has to move: the ALGEBRA moves server-side with the mapping,
 * because a key that is derived rather than stored has to be derivable somewhere.
 * ================================================================== */

/** The six operators. Three act on orientation and generate D4; three toggle an attribute. */
export const GEOMETRIC_OPS = ['turn', 'flip', 'slant'] as const;
export const ATTRIBUTE_OPS = ['swap', 'ring', 'twin'] as const;
export const OPERATORS = [...GEOMETRIC_OPS, ...ATTRIBUTE_OPS] as const;
export type Operator = (typeof OPERATORS)[number];

const isGeometric = (op: Operator): boolean => (GEOMETRIC_OPS as readonly string[]).includes(op);

export interface Figure {
  glyph: string;
  orient: { a: number; b: number };
  shade: string;
  border: number;
  pair: number;
}

/** D4 written as r^a m^b, under the relation `m r = r^-1 m`. This is why `turn` and `flip` do not
 * commute, which is what makes "the badges compose IN ORDER" a real thing for a child to learn. */
const GEOM_ELEMENT: Record<string, { a: number; b: number }> = {
  turn: { a: 1, b: 0 },
  flip: { a: 0, b: 1 },
  slant: { a: 1, b: 1 },
};

function applyOp(op: Operator, figure: Figure): Figure {
  if (isGeometric(op)) {
    const g = GEOM_ELEMENT[op]!;
    return {
      ...figure,
      orient: {
        a: (((g.a + (g.b ? -figure.orient.a : figure.orient.a)) % 4) + 4) % 4,
        b: (g.b + figure.orient.b) % 2,
      },
    };
  }
  if (op === 'swap') return { ...figure, shade: figure.shade === 'solid' ? 'hollow' : 'solid' };
  if (op === 'ring') return { ...figure, border: figure.border ? 0 : 1 };
  if (op === 'twin') return { ...figure, pair: figure.pair ? 0 : 1 };
  throw new Error(`unknown operator "${String(op)}"`);
}

/** Apply a chain left to right: the first badge acts first. */
export function applyChain(chain: readonly Operator[], figure: Figure): Figure {
  return chain.reduce<Figure>((state, op) => applyOp(op, state), figure);
}

const figureKey = (f: Figure): string =>
  `${f.glyph}|${String(f.orient.a)}${String(f.orient.b)}|${f.shade}|${String(f.border)}|${String(f.pair)}`;

/* ================================================================== *
 * THE HIDDEN SYSTEM — drawn per session, held server-side, never served.
 * ================================================================== */

/**
 * A badge->operator bijection and the identifier a session records instead of the mapping itself.
 *
 * The mapping is the secret. `systemId` is deliberately NOT derived from it — it is a random label,
 * so persisting the id in a session row (for replay, audit or a reveal) discloses nothing even if
 * that row is read. The mapping itself belongs in the server-side session record, and the design
 * note's §6 says what that costs.
 */
export interface SessionSystem {
  readonly systemId: string;
  readonly mapping: Readonly<Record<string, Operator>>;
}

function xmur3(str: string): () => number {
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

function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Draw the session's mapping.
 *
 * Seeded rather than directly random for the reason D-202 gives for the engine seed: a session must
 * replay exactly from its own recorded state or the audit trail is gone. The caller supplies a seed
 * from the platform CSPRNG once per sitting; the same seed reproduces the same system, and two
 * sittings get unrelated ones.
 *
 * Drawn from ALL 720 bijections. The narrower family that keeps each badge inside its operator
 * class was measured and rejected: it holds the calibrated difficulty exactly fixed, and it costs
 * so much of the key space that a client brute-forcing it scores 57.5% against a 20% floor. §3 of
 * the design note has the table.
 */
export function drawSessionSystem(sessionSeed: string): SessionSystem {
  const rng = mulberry32(xmur3(`stage2-session-system|${sessionSeed}`)());
  const ops: Operator[] = [...OPERATORS];
  for (let i = ops.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [ops[i], ops[j]] = [ops[j]!, ops[i]!];
  }
  const mapping: Record<string, Operator> = {};
  BADGE_SYMBOLS.forEach((symbol, i) => {
    mapping[symbol] = ops[i]!;
  });
  return { systemId: `ses-${xmur3(`id|${sessionSeed}`)().toString(16)}`, mapping };
}

/** The badge tray, in the one canonical order every item of the bank lists it in. */
export const BADGE_SYMBOLS = ['circle', 'square', 'triangle', 'diamond', 'hexagon', 'star'];

/* ================================================================== *
 * ITEM STRUCTURES — what a re-keyable bank would ship.
 * ================================================================== */

/**
 * An item with NO key and NO mapping.
 *
 * This is the shape a re-keyed bank file would hold. `levers` is server-side and is not part of the
 * served projection: it exists because `difficulty` has to be recomputed per session (the priced
 * `geom` lever is a property of the mapping, not of the structure), and the recomputation needs the
 * within-rung positioner the generator solved for.
 */
export interface ItemStructure {
  readonly itemId: string;
  readonly typeCode: string;
  readonly domain: ServedItem['domain'];
  readonly ageBands: ServedItem['ageBands'];
  readonly content: {
    readonly typeCode: string;
    readonly badgeTray: readonly string[];
    readonly input: Figure;
    readonly chain: readonly string[];
    readonly options: readonly { readonly key: string; readonly figure: Figure }[];
  };
  readonly levers: { readonly depth: number; readonly distractorSimilarity: number };
}

/**
 * Read a structure out of a bank item, dropping the key and the mapping.
 *
 * The PoC derives structures from the SHIPPED bank rather than from a new file, deliberately: it
 * demonstrates that the served projection plus one lever is all a session needs, without touching a
 * bank another workstream owns and without a migration whose value depends on a decision nobody has
 * taken yet.
 */
export function toStructure(item: RawBankItem): ItemStructure {
  const content = item.content as unknown as ItemStructure['content'];
  const levers = (item.provenance?.levers ?? {}) as {
    depth?: number;
    distractorSimilarity?: number;
  };
  return {
    itemId: item.itemId,
    typeCode: item.typeCode,
    domain: item.domain,
    ageBands: item.ageBands,
    content: {
      typeCode: content.typeCode,
      badgeTray: content.badgeTray,
      input: content.input,
      chain: content.chain,
      options: content.options,
    },
    levers: {
      depth: levers.depth ?? content.chain.length,
      distractorSimilarity: levers.distractorSimilarity ?? 0,
    },
  };
}

/* ================================================================== *
 * THE KEY — derived, never stored.
 * ================================================================== */

/**
 * The option this session's mapping makes correct, or `null` when the mapping puts the machine's
 * output off screen.
 *
 * `null` is not an error and not a rare case: at chain depth 4 only about 14% of the 720 mappings
 * land on one of the five figures, because there are 360 distinct operator chains to land and five
 * places to land. An item that returns `null` is UNSERVABLE in this session — it has no answer the
 * child could give — and {@link sessionPool} drops it. That drop is the design's main cost.
 */
export function deriveKey(structure: ItemStructure, system: SessionSystem): string | null {
  const ops = structure.content.chain.map((badge) => system.mapping[badge]);
  if (ops.some((op) => op === undefined)) return null;
  const output = figureKey(applyChain(ops as Operator[], structure.content.input));
  const hits = structure.content.options.filter((o) => figureKey(o.figure) === output);
  // Two options showing the same figure would make the key ambiguous. The generator's distractor
  // selection dedupes on `figureKey`, so this cannot happen on the shipped bank; it is checked
  // rather than assumed because a re-keyed bank is a new artifact and this is the invariant it must
  // hold, not one it inherits.
  return hits.length === 1 ? hits[0]!.key : null;
}

/* ================================================================== *
 * DIFFICULTY — recomputed per session, because the priced lever moves with the mapping.
 *
 * `difficulty` is `1 + (raw - RAW_MIN) * 19 / (RAW_MAX - RAW_MIN)` over a raw score built from the
 * levers. `depth` is the chain length and no relabelling touches it. `geom` — the count of DISTINCT
 * orientation operators — is a property of the OPERATORS the badges stand for, so it moves whenever
 * the mapping does: measured over the shipped bank, a free relabelling moves it on 48.3% of (item,
 * mapping) pairs, worth a mean 0.83 and a p95 of 2.94 points on the 1..20 scale.
 *
 * Keeping the shipped rung is therefore not an option — it would be wrong for 48.3% of the items a
 * session serves. Recomputing is, and the constants are transcribed from the generator rather than
 * imported because the generator is a research `.mjs` outside the app's build. §7 of the design
 * note records that duplication as a cost and names the test that pins the two together.
 * ================================================================== */

const DEPTH_LOAD: Record<number, number> = { 1: 0, 2: 2.4, 3: 4.4, 4: 6.0 };
const GEOM_WEIGHT = 0.9;
const ORDER_WEIGHT = 1.5;
const MIX_WEIGHT = 1.2;
const SIMILARITY_SPAN = 2.6;

const isMixed = (depth: number, geom: number): number => (geom > 0 && geom < depth ? 1 : 0);

export function baseScore(depth: number, geom: number): number {
  return (
    1.0 +
    (DEPTH_LOAD[depth] ?? 0) +
    GEOM_WEIGHT * geom +
    ORDER_WEIGHT * Math.max(0, geom - 1) +
    MIX_WEIGHT * isMixed(depth, geom)
  );
}

/** The ends of the raw scale, over every lever combination the grammar can build. */
const RAW_BOUNDS = ((): { min: number; max: number } => {
  const scores: number[] = [];
  for (let depth = 1; depth <= 4; depth++) {
    for (let geom = Math.max(0, depth - 3); geom <= Math.min(depth, 3); geom++) {
      scores.push(baseScore(depth, geom));
    }
  }
  return { min: Math.min(...scores), max: Math.max(...scores) + SIMILARITY_SPAN };
})();

export function difficultyFromLevers(
  depth: number,
  geom: number,
  distractorSimilarity: number,
): number {
  const raw = baseScore(depth, geom) + SIMILARITY_SPAN * distractorSimilarity;
  const scaled = 1 + ((raw - RAW_BOUNDS.min) * 19) / (RAW_BOUNDS.max - RAW_BOUNDS.min);
  return Math.round(Math.max(1, Math.min(20, scaled)) * 100) / 100;
}

/** How many DISTINCT orientation operators this session's mapping puts in the chain. */
export function geomCount(structure: ItemStructure, system: SessionSystem): number {
  const ops = structure.content.chain
    .map((badge) => system.mapping[badge])
    .filter((op): op is Operator => op !== undefined && isGeometric(op));
  return new Set(ops).size;
}

/* ================================================================== *
 * THE SESSION POOL
 * ================================================================== */

/** One item as this session sees it. Server-side: `correctKey` must never leave the process. */
export interface SessionKeyedItem {
  readonly structure: ItemStructure;
  readonly correctKey: string;
  readonly difficulty: number;
}

/**
 * The items this session can serve, keyed and priced for its own mapping.
 *
 * Items the mapping cannot key are dropped rather than repaired. Over 40 seeded draws on the
 * shipped bank this keeps a mean of 28.0% of the file (worst draw 16.2%), and it keeps the shallow
 * end far more often than the deep end, so the caller must check the ladder it is left with rather
 * than assume one. {@link sessionLadder} is that check.
 */
export function sessionPool(
  structures: readonly ItemStructure[],
  system: SessionSystem,
): SessionKeyedItem[] {
  const out: SessionKeyedItem[] = [];
  for (const structure of structures) {
    const correctKey = deriveKey(structure, system);
    if (correctKey === null) continue;
    out.push({
      structure,
      correctKey,
      difficulty: difficultyFromLevers(
        structure.levers.depth,
        geomCount(structure, system),
        structure.levers.distractorSimilarity,
      ),
    });
  }
  return out;
}

/**
 * What is left of the 0.5-point ladder after the draw.
 *
 * The bank is built so every 0.5 rung of the 1..20 scale carries at least five items, because a
 * pool that thins out before a climbing child reaches it saturates and pushes the fitted rate to
 * the bound (STAGE2_QUESTION_DESIGN §1.1(c)). A session pool is a subset, so that property does not
 * survive on its own and has to be reported.
 */
export function sessionLadder(pool: readonly SessionKeyedItem[]): {
  rungsCovered: number;
  rungsTotal: number;
  rungsShortOfFive: number;
  span: { lo: number; hi: number } | null;
} {
  const rungs: number[] = [];
  for (let d = 1; d <= 20 + 1e-9; d += 0.5) rungs.push(Math.round(d * 100) / 100);
  const counts = new Map<number, number>();
  for (const entry of pool) {
    const rung = Math.round(entry.difficulty * 2) / 2;
    counts.set(rung, (counts.get(rung) ?? 0) + 1);
  }
  const difficulties = pool.map((entry) => entry.difficulty);
  return {
    rungsCovered: rungs.filter((r) => (counts.get(r) ?? 0) > 0).length,
    rungsTotal: rungs.length,
    rungsShortOfFive: rungs.filter((r) => (counts.get(r) ?? 0) < 5).length,
    span:
      difficulties.length === 0
        ? null
        : { lo: Math.min(...difficulties), hi: Math.max(...difficulties) },
  };
}

/* ================================================================== *
 * THE VERIFIER
 * ================================================================== */

/**
 * Decide a trial. The ONLY thing that may.
 *
 * Under the shipped design a key can be precomputed, so a demo can self-verify and an offline
 * harness can score a trace without a session. Under per-session keying neither is possible: the
 * key does not exist until a mapping is drawn, so correctness is decided here and nowhere else, and
 * anything that used to compare against `answer.correctKey` has to be handed the session's system
 * instead. §6 of the design note lists what that breaks.
 */
export function verifySessionAnswer(
  structure: ItemStructure,
  system: SessionSystem,
  selectedKey: string,
): { correct: boolean; machineOutput: string } | null {
  const correctKey = deriveKey(structure, system);
  if (correctKey === null) return null;
  // `machineOutput` is the post-commit reveal (§9 U6/U7) — the option the MACHINE made, which is
  // not a verdict. It is returned from the same place as the verdict so no other code path can
  // produce one, and callers must not send it for a skipped item.
  return { correct: selectedKey === correctKey, machineOutput: correctKey };
}

/* ================================================================== *
 * THE SERVED PROJECTION
 * ================================================================== */

/**
 * Everything a browser may see, built by naming fields rather than by deleting them.
 *
 * `toServedItem` in the loader omits `answer`, `scoring`, `provenance` and `demoPath` from a full
 * bank item. That is safe today only because those four are the complete list. A structure has no
 * key to omit, so this projection cannot leak one by forgetting — but it CAN leak the levers, which
 * would hand the client the `geom` count directly, so `levers` is named as excluded here and
 * asserted absent by the test.
 */
export function toSessionServedItem(entry: SessionKeyedItem): ServedItem {
  return {
    itemId: entry.structure.itemId,
    typeCode: entry.structure.typeCode,
    domain: entry.structure.domain,
    difficulty: entry.difficulty,
    ageBands: entry.structure.ageBands,
    content: entry.structure.content as unknown as Record<string, unknown>,
    syntheticOnly: true,
    validated: false,
  };
}

/* ================================================================== *
 * THE ORACLE — recomputed per session.
 * ================================================================== */

/** Every bijection from the tray onto the six operators: the hypothesis space, 720 of them. */
export function allSystems(tray: readonly string[]): Record<string, Operator>[] {
  const out: Record<string, Operator>[] = [];
  const acc: Record<string, Operator> = {};
  const used = new Set<Operator>();
  const walk = (i: number): void => {
    if (i === tray.length) {
      out.push({ ...acc });
      return;
    }
    for (const op of OPERATORS) {
      if (used.has(op)) continue;
      used.add(op);
      acc[tray[i]!] = op;
      walk(i + 1);
      used.delete(op);
    }
  };
  walk(0);
  return out;
}

export interface Observation {
  /** The badge chain the child saw. */
  readonly chain: readonly string[];
  readonly input: Figure;
  /** The figure the machine produced, i.e. the post-commit reveal for that trial. */
  readonly output: Figure;
}

/**
 * Which badges a child could have pinned from what they have been shown, and what is still open.
 *
 * This is the cumulative learnability oracle, and the point of reproducing it here is that it can
 * be recomputed per session AT ALL: it takes the observations and the hypothesis space and needs
 * nothing that was fixed at build time. Under the shipped design it happens to be computable
 * offline once per bank, because there is one system per bank; under per-session keying that shortcut
 * is gone and the oracle becomes a per-session, per-trial computation. Nothing else about it changes,
 * which is the finding.
 *
 * It is also, read the other way, the attack: the set it maintains is exactly the set an
 * intersecting client maintains. That symmetry is not a flaw in the oracle — it is why the oracle
 * is the right instrument for measuring the exposure.
 */
export function deducibility(
  observations: readonly Observation[],
  tray: readonly string[] = BADGE_SYMBOLS,
): {
  /** Systems still consistent with everything shown, out of `tray.length!`. */
  candidates: number;
  /** Badges whose operator is now determined — the primitives a child COULD have learned by now. */
  pinned: string[];
  /** What each pinned badge is determined to be. Server-side; this is a fragment of the key. */
  resolved: Record<string, Operator>;
  /** For each badge, how many operators are still possible for it. */
  openPerBadge: Record<string, number>;
} {
  let surviving = allSystems(tray);
  for (const observation of observations) {
    const wanted = figureKey(observation.output);
    surviving = surviving.filter((mapping) => {
      const ops = observation.chain.map((badge) => mapping[badge]);
      if (ops.some((op) => op === undefined)) return false;
      return figureKey(applyChain(ops as Operator[], observation.input)) === wanted;
    });
  }
  const openPerBadge: Record<string, number> = {};
  const resolved: Record<string, Operator> = {};
  for (const badge of tray) {
    const options = new Set(surviving.map((mapping) => mapping[badge]!));
    openPerBadge[badge] = options.size;
    if (options.size === 1) resolved[badge] = [...options][0]!;
  }
  return {
    candidates: surviving.length,
    pinned: tray.filter((badge) => openPerBadge[badge] === 1),
    resolved,
    openPerBadge,
  };
}
