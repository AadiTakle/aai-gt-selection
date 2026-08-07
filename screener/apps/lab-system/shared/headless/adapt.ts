/**
 * The headless adapter: a served bank item, reduced to something an app can draw in its own language.
 *
 * THE POINT. The library ships an HTML renderer per type, and using it makes every app look like the
 * same generic exam in a different frame. So nothing here uses those renderers. This takes the item's
 * DATA and normalises it into a stem plus a list of choices, where every choice is a bag of abstract
 * facets. An app then decides that `shape` is a Minecraft block type, `count` is a stack size and `rot`
 * is which way the block faces. The question is the library's; the entire presentation is the app's.
 *
 * WHY THIS IS TRACTABLE. The engine serves 16 distinct types in practice, not 53, and only 3 to 7 per
 * age band (measured over 48 sessions, 312 items). Fourteen of the sixteen reduce cleanly to the shape
 * below. The two that do not are named in UNPRESENTABLE and are declined, which the API already
 * supports by counting a response it cannot interpret as `unscorable` rather than guessing at it.
 *
 * FACETS ARE DELIBERATELY ABSTRACT. `shape: 'hex'` is not an instruction to draw a hexagon. It is an
 * identity token, and a skin is free to map it to a diamond block, a Pokémon type or a locked door.
 * What a skin must respect is which facets are ORDERED: `count` and `size` carry magnitude, so a skin
 * that maps them onto unordered variety breaks any item whose rule is a progression.
 */

import type { Serve } from '../types';

/** One facet bag. Every field optional, because types carry different ones. */
export interface Facets {
  /** Identity. Unordered: a skin may map these to anything, so long as they stay distinguishable. */
  readonly shape?: string;
  readonly glyph?: string;
  readonly color?: string;
  readonly fill?: string;
  /** ORDERED. Magnitude must survive the mapping. */
  readonly count?: number;
  readonly size?: number | string;
  /** CYCLIC. A rotation in degrees, or a quarter-turn index. */
  readonly rot?: number;
  readonly tilt?: string;
  /** Inside or outside, which some clue sets refer to directly. */
  readonly pos?: string;
  readonly border?: number;
  /** Literal content, when the item's material is language or number. */
  readonly text?: string;
  readonly value?: number;
  /** Positions on a grid, for block-placement types. */
  readonly blocks?: readonly number[];
  /** A move sequence, for fold types. */
  readonly seq?: readonly string[];
  /** A numeric series, for graph types. */
  readonly series?: readonly number[];
  /** Anything the adapter could not name, kept so a skin can fall back to a label. */
  readonly note?: string;
}

export interface Choice {
  /** The key the server marks against. Never shown to the child. */
  readonly key: string;
  /**
   * Where this choice sat in the item's own option list.
   *
   * Carried separately from `key` because several types mark against the position rather than a letter,
   * their options having no letters to mark against. Deriving it back from a key that happens to look
   * like a number would work until a type used "1" as a letter.
   */
  readonly index: number;
  readonly facets: Facets;
}

export type StemKind =
  /** Two quantities to compare. `left`/`right` carry counts. */
  | { readonly kind: 'compare'; readonly left: Facets; readonly right: Facets; readonly wants: 'more' | 'fewer' }
  /** A grid with one cell missing. */
  | { readonly kind: 'matrix'; readonly rows: number; readonly cols: number; readonly cells: readonly (Facets | null)[]; readonly blank: number }
  /** An input transformed by a chain of named operations. */
  | { readonly kind: 'transform'; readonly input: Facets; readonly chain: readonly string[]; readonly vocabulary: readonly string[] }
  /** Constraints that eliminate candidates. */
  | { readonly kind: 'constraints'; readonly clues: readonly string[] }
  /** A passage and a question about it. */
  | { readonly kind: 'passage'; readonly title: string; readonly sentences: readonly string[]; readonly question: string }
  /** Rows of pairs, one of which behaves differently. */
  | { readonly kind: 'pairs'; readonly rows: readonly { readonly key: string; readonly left: Facets; readonly right: Facets }[] }
  /** A target to reach or match, described in facets. */
  | { readonly kind: 'target'; readonly target: readonly Facets[]; readonly note: string }
  /** Nothing to show but the question itself. */
  | { readonly kind: 'plain' };

export interface Question {
  readonly itemId: string;
  readonly typeCode: string;
  readonly domain: string;
  readonly difficulty: number;
  /** The library's own wording. An app should re-voice this, not print it. */
  readonly ask: string;
  readonly stem: StemKind;
  readonly choices: readonly Choice[];
  /** True when the choices are rows of the stem rather than separate options. */
  readonly choicesAreStemRows: boolean;
  /**
   * The item's original content, untouched.
   *
   * Carried because the DEFAULT surface renders through the catalogue's own renderers, which need the
   * content in the shape they were written for. A themed surface should ignore this and work from the
   * normalised stem and choices; reaching into it is how a theme accidentally couples itself to the
   * archive's vocabulary, which is the thing the abstraction exists to prevent.
   */
  readonly raw: Record<string, unknown>;
}

/**
 * Types this adapter declines.
 *
 * `CX-check-01` expects a whole bin assignment as its answer (`t2:b0|t1:b1|...`), which is a different
 * interaction rather than a choice. `SPA-MAZE-01` is a route the child traces. Both would need bespoke
 * work per app, and together they are about 8% of what gets served, so they are declined rather than
 * faked. Declining is a supported path: the API counts a response it cannot interpret as `unscorable`
 * and excludes it from the estimate instead of guessing.
 */
export const UNPRESENTABLE: readonly string[] = [
  'CX-check-01',
  'SPA-MAZE-01',
  'SPA-VIEW-01',
  // VER-EVIDENCE-01 keys on a COMPOUND answer: `"A+s5"` means option A plus the sentence that supports
  // it, so the item wants two taps. Submitting the option alone is marked WRONG, which meant every one
  // of these was failed no matter what a child picked, silently, for roughly 8% of serves. Found by
  // `verify-provenance.ts` comparing the on-disk key against what the server accepted, not by any test.
  //
  // Declined rather than faked. Supporting it properly means a second selection phase (pick the answer,
  // then pick the line that proves it), which is a good mechanic and a real piece of work.
  'VER-EVIDENCE-01',
];

function rec(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function num(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function nums(value: unknown): number[] | undefined {
  return Array.isArray(value) && value.every((v) => typeof v === 'number')
    ? (value as number[])
    : undefined;
}

function strs(value: unknown): string[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  // The verbal banks wrap their words as `{text: 'dog'}` rather than listing bare strings, so a
  // strings-only check silently dropped every one of them and their stems came out empty.
  const out: string[] = [];
  for (const v of value) {
    if (typeof v === 'string') {
      out.push(v);
      continue;
    }
    const text = rec(v)?.text;
    if (typeof text === 'string') {
      out.push(text);
      continue;
    }
    return undefined;
  }
  return out;
}

/** Pull every facet this adapter knows about out of an arbitrary object. */
function facets(value: unknown): Facets {
  const o = rec(value);
  if (o === null) {
    // A bare string or number is itself the content.
    if (typeof value === 'string') return { text: value };
    if (typeof value === 'number') return { value };
    return {};
  }
  // Some types nest the interesting part one level down.
  const inner =
    rec(o.tile) ?? rec(o.figure) ?? rec(o.picture) ?? rec(o.solid) ?? rec(o.section) ?? rec(o.token);
  const src = inner ?? o;

  // Several types keep a choice's whole substance in a list rather than an object. Reduced to a
  // readable label here, because a choice with no facets at all cannot be reasoned about even though
  // it can be tapped.
  const listish =
    strs(o.load) ?? strs(o.order) ?? strs(o.terms) ?? strs(o.pair) ?? strs(o.seq) ?? null;
  const numlist = nums(o.load) ?? nums(o.order) ?? nums(o.terms) ?? null;

  const out: Record<string, unknown> = {};
  const shape = str(src.shape) ?? str(src.motif) ?? str(src.kind) ?? str(src.icon);
  if (shape !== undefined) out.shape = shape;
  const glyph = str(src.glyph) ?? str(src.sym);
  if (glyph !== undefined) out.glyph = glyph;
  const color = str(src.color) ?? str(src.colour);
  if (color !== undefined) out.color = color;
  // `shade` and `pos` are distinguishing facets that were being dropped. FLU-DEDUCE clues refer to
  // position explicitly ("dot inside"), so losing it made candidates identical on screen.
  const fill = str(src.fill) ?? str(src.shade);
  if (fill !== undefined) out.fill = fill;
  const pos = str(src.pos);
  if (pos !== undefined) out.pos = pos;
  const border = num(src.border);
  if (border !== undefined) out.border = border;
  const count = num(src.count) ?? num(src.dots) ?? num(src.sides) ?? num(src.n);
  if (count !== undefined) out.count = count;
  const size = num(src.size) ?? str(src.size) ?? num(src.r);
  if (size !== undefined) out.size = size;
  const rot = num(src.rot) ?? num(src.rotDeg) ?? num(src.headingDeg);
  if (rot !== undefined) out.rot = rot;
  const tilt = str(src.tilt);
  if (tilt !== undefined) out.tilt = tilt;
  const text = str(src.text) ?? str(src.label) ?? str(src.word);
  if (text !== undefined) out.text = text;
  const value2 = num(src.value) ?? num(src.number);
  if (value2 !== undefined) out.value = value2;
  const blocks = nums(o.blocks) ?? nums(src.blocks);
  if (blocks !== undefined) out.blocks = blocks;
  const seq = strs(o.seq) ?? strs(src.seq);
  if (seq !== undefined) out.seq = seq;
  if (listish && out.text === undefined && out.shape === undefined) out.text = listish.join(' + ');
  if (numlist && out.text === undefined) out.text = numlist.join(', ');
  // SPA-XSCAN keeps its solid's shape in `segments`, which is what made all five options empty.
  const segments = rec(o.solid)?.segments ?? src.segments;
  if (Array.isArray(segments) && segments.length > 0 && out.count === undefined) {
    out.count = segments.length;
  }

  // `series` arrives as {A: number[]} on graph options.
  const seriesRec = rec(o.series);
  if (seriesRec) {
    const first = Object.values(seriesRec).find((v) => nums(v) !== undefined);
    const s = nums(first);
    if (s) out.series = s;
  } else {
    const s = nums(o.series) ?? nums(src.values);
    if (s) out.series = s;
  }

  return out as Facets;
}

/** Everything the adapter can say about a type it only partly understands. */
function describe(o: Record<string, unknown>): string {
  const q = rec(o.question);
  return (
    str(o.prompt) ??
    str(q?.prompt) ??
    str(q?.text) ??
    str(o.promptText) ??
    str(rec(o.instructions)?.howto) ??
    'Work out which one fits.'
  );
}

function buildStem(typeCode: string, c: Record<string, unknown>): StemKind {
  // Two quantities, compare them.
  const left = rec(c.left);
  const right = rec(c.right);
  if (left && right) {
    const mode = str(c.mode) ?? '';
    return {
      kind: 'compare',
      left: facets(left),
      right: facets(right),
      wants: mode.includes('fewer') || mode.includes('less') ? 'fewer' : 'more',
    };
  }

  // A matrix with a hole in it.
  const matrix = rec(c.matrix) ?? rec(c.carpet);
  if (matrix) {
    const rows = num(matrix.rows) ?? 2;
    const cols = num(matrix.cols) ?? 2;
    const blankAt = rec(matrix.blank);
    const blankRow = num(blankAt?.row) ?? rows - 1;
    const blankCol = num(blankAt?.col) ?? cols - 1;
    const grid = Array.isArray(matrix.cells) ? (matrix.cells as unknown[]) : [];
    const cells: (Facets | null)[] = [];
    for (let r = 0; r < rows; r++) {
      const rowArr = Array.isArray(grid[r]) ? (grid[r] as unknown[]) : [];
      for (let col = 0; col < cols; col++) {
        cells.push(r === blankRow && col === blankCol ? null : facets(rowArr[col]));
      }
    }
    return { kind: 'matrix', rows, cols, cells, blank: blankRow * cols + blankCol };
  }

  /**
   * The three shapes below are all matrices wearing different clothes, and every one of them used to
   * fall through to a bare prompt.
   *
   * That is not a cosmetic loss. An app was left showing "choose the amount that belongs in the empty
   * cell" above four numbers and no cell, which is not a hard question, it is an impossible one. A child
   * picks at random, the engine reads the result as ability, and the item counts. Recognising the shape
   * costs a few lines and turns three of the strongest types in the bank from unanswerable into
   * answerable, using the matrix renderer every themed app already has.
   */

  // A grid carried at the top level rather than under `matrix`, with the hole marked on the cell.
  const flatCells = Array.isArray(c.cells) ? (c.cells as unknown[]) : undefined;
  if (flatCells && num(c.rows) !== undefined && num(c.cols) !== undefined) {
    const rows = num(c.rows)!;
    const cols = num(c.cols)!;
    const holeIndex =
      num(c.holeIndex) ?? flatCells.findIndex((cell) => rec(cell)?.hole === true);
    const blank = holeIndex >= 0 ? holeIndex : rows * cols - 1;
    const cells = flatCells
      .slice(0, rows * cols)
      .map((cell, i) => (i === blank || rec(cell)?.hole === true ? null : facets(cell)));
    while (cells.length < rows * cols) cells.push(null);
    return { kind: 'matrix', rows, cols, cells, blank };
  }

  // A series is a matrix one row tall. Rendering it that way means no app needs a second layout, and
  // "what comes next" is the same reasoning as "what fills the hole".
  const terms = Array.isArray(c.terms) ? (c.terms as unknown[]) : undefined;
  if (terms && terms.length > 0) {
    const slot = num(c.slotIndex) ?? terms.length;
    const cells: (Facets | null)[] = terms.map((t) => facets(t));
    // The missing step is usually past the end of the given terms, so it is appended rather than
    // overwriting one of them.
    if (slot >= cells.length) cells.push(null);
    else cells[slot] = null;
    return { kind: 'matrix', rows: 1, cols: cells.length, cells, blank: Math.min(slot, cells.length - 1) };
  }

  // An analogy is a two-by-two matrix: the example pair on the top row, the question on the bottom.
  // This is how figure analogies are drawn on paper, so it reads correctly rather than merely fitting.
  const example = rec(c.example);
  const asked = rec(c.question);
  if (example && asked) {
    const cells: (Facets | null)[] = [
      facets(example.source),
      facets(example.result),
      facets(asked.source),
      null,
    ];
    return { kind: 'matrix', rows: 2, cols: 2, cells, blank: 3 };
  }

  // An input put through a named chain of operations.
  const chain = strs(c.chain);
  if (chain) {
    return {
      kind: 'transform',
      input: facets(c.input),
      chain,
      vocabulary: strs(c.badgeTray) ?? [],
    };
  }

  // Clues that eliminate candidates.
  if (Array.isArray(c.clues)) {
    const clues = (c.clues as unknown[])
      .map((cl) => str(rec(cl)?.label) ?? str(rec(cl)?.value) ?? '')
      .filter(Boolean);
    return { kind: 'constraints', clues };
  }

  // A story held at the top level rather than nested under `passage`. QUANT-WORD-01 does this, and
  // without this branch its story never reaches the screen while its options are bare numbers.
  const loose = strs(c.storySentences);
  if (loose && loose.length > 0) {
    return {
      kind: 'passage',
      title: '',
      sentences: loose,
      question: str(rec(c.question)?.text) ?? str(c.question) ?? '',
    };
  }

  // A passage with a question about it.
  const passage = rec(c.passage);
  if (passage) {
    const sentences = Array.isArray(passage.sentences)
      ? (passage.sentences as unknown[]).map((s) => str(rec(s)?.text) ?? '').filter(Boolean)
      : [];
    return {
      kind: 'passage',
      title: str(passage.title) ?? '',
      sentences,
      question: str(rec(c.question)?.text) ?? str(c.question) ?? '',
    };
  }

  // Rows of pairs, one behaving differently. These rows ARE the choices.
  if (typeCode === 'FLU-ODDPAIR-01' && Array.isArray(c.rows)) {
    const rows = (c.rows as unknown[]).flatMap((r) => {
      const o = rec(r);
      const key = str(o?.key);
      if (!o || key === undefined) return [];
      return [{ key, left: facets(o.left), right: facets(o.right) }];
    });
    return { kind: 'pairs', rows };
  }

  // Something to match or reach.
  if (Array.isArray(c.target) || rec(c.target)) {
    const t = Array.isArray(c.target) ? (c.target as unknown[]).map(facets) : [facets(c.target)];
    return { kind: 'target', target: t, note: strs(c.attributes)?.join(', ') ?? '' };
  }

  /**
   * The verbal shapes. Every one of these used to reach the plain fallback, which meant a themed app
   * showed four words above nothing — no sentence, no pair, no sorted examples — and the child had to
   * guess. Sentence completion and word association are two of the five families the screener is built
   * on, so leaving them as bare option lists was leaving the verbal half of it out.
   */

  // Sentence completion: one sentence with a gap in it.
  const frame = str(c.sentenceFrame);
  if (frame) {
    return { kind: 'passage', title: '', sentences: [frame], question: str(c.prompt) ?? '' };
  }

  // A word used in a sentence, where the sentence is what disambiguates it.
  const sentence = str(c.sentence);
  if (sentence) {
    const word = str(c.word);
    return {
      kind: 'passage',
      title: word ? word.toUpperCase() : '',
      sentences: [sentence],
      question: str(c.prompt) ?? '',
    };
  }

  // Word association by analogy: the stem is a pair, and the relation names what holds between them.
  const stemPair = strs(c.stemPair);
  if (stemPair && stemPair.length >= 2) {
    const relation = str(c.relation);
    return {
      kind: 'passage',
      title: relation ? relation : '',
      sentences: [`${stemPair[0]!}  →  ${stemPair[1]!}`],
      question: str(c.prompt) ?? 'Which pair goes together the same way?',
    };
  }

  // Classification: the rule is shown by what was sorted in and what was sorted out.
  const inGroup = strs(c.examplesIn);
  const outGroup = strs(c.examplesOut);
  if (inGroup && inGroup.length > 0) {
    const clues = [`IN: ${inGroup.join(', ')}`];
    if (outGroup && outGroup.length > 0) clues.push(`OUT: ${outGroup.join(', ')}`);
    return { kind: 'constraints', clues };
  }

  /**
   * Three more shapes that were reaching the plain fallback and losing their stimulus on the way.
   *
   * `plain` is documented as "nothing to show but the question itself", but it is also where this
   * function lands when it does not recognise the content, and the second case is far commoner than the
   * first. The result is a prompt that refers to something not on screen — which reads as a hard
   * question and is an impossible one. Each branch below is a few lines and recovers a whole type.
   */

  // A machine shown by worked examples: pairs of in and out, then a new input. That is a matrix of
  // (input, output) rows with the last output missing, so it is drawn as one.
  const machinePairs = Array.isArray(c.pairs) ? (c.pairs as unknown[]) : undefined;
  if (machinePairs && machinePairs.length > 0 && (num(c.input) !== undefined || c.input !== undefined)) {
    const rows: (Facets | null)[] = [];
    for (const pair of machinePairs) {
      if (!Array.isArray(pair) || pair.length < 2) continue;
      rows.push(facets(pair[0]), facets(pair[1]));
    }
    if (rows.length > 0) {
      rows.push(facets(c.input), null); // the row the child completes
      return { kind: 'matrix', rows: rows.length / 2, cols: 2, cells: rows, blank: rows.length - 1 };
    }
  }

  // Two exemplar groups defining a rule by contrast. Same idea as sorted in/out, but the members are
  // figures rather than words, so they are described rather than listed verbatim.
  const leftEx = Array.isArray(c.leftExemplars) ? (c.leftExemplars as unknown[]) : undefined;
  const rightEx = Array.isArray(c.rightExemplars) ? (c.rightExemplars as unknown[]) : undefined;
  if (leftEx && leftEx.length > 0) {
    const describe = (list: readonly unknown[]): string =>
      list
        .map((e) => {
          const f = facets(e);
          return [f.count, f.fill, f.color, f.shape].filter((x) => x !== undefined).join(' ');
        })
        .filter(Boolean)
        .join(' · ');
    const clues = [`THIS GROUP: ${describe(leftEx)}`];
    if (rightEx && rightEx.length > 0) clues.push(`NOT THIS GROUP: ${describe(rightEx)}`);
    return { kind: 'constraints', clues };
  }

  // Ordering clues stored as above/below pairs over named characters. The adapter used to read `label`
  // and `value` off a clue, which these do not have, so every rule silently vanished and the child was
  // shown an ordering task with nothing to order by.
  const rawClues = Array.isArray(c.clues) ? (c.clues as unknown[]) : undefined;
  if (rawClues && rawClues.length > 0) {
    const cast = Array.isArray(c.characters) ? (c.characters as unknown[]) : [];
    const nameOf = (id: unknown): string => {
      const who = cast.map(rec).find((x) => x?.id === id);
      const f = who ? facets(who) : {};
      return [f.color, f.shape].filter((x) => x !== undefined).join(' ') || String(id ?? '?');
    };
    const lines = rawClues
      .map(rec)
      .map((cl) => {
        if (!cl) return '';
        if (cl.above !== undefined && cl.below !== undefined) {
          return `${nameOf(cl.above)} is above ${nameOf(cl.below)}`;
        }
        return str(cl.label) ?? str(cl.value) ?? '';
      })
      .filter(Boolean);
    if (lines.length > 0) return { kind: 'constraints', clues: lines };
  }

  return { kind: 'plain' };
}

/** Choices, from whichever field this type keeps them in. */
function buildChoices(typeCode: string, c: Record<string, unknown>, stem: StemKind): {
  choices: Choice[];
  fromStem: boolean;
} {
  // The odd-pair type's rows are its choices.
  if (stem.kind === 'pairs') {
    return {
      choices: stem.rows.map((r, i) => ({ key: r.key, index: i, facets: { note: 'pair' } })),
      fromStem: true,
    };
  }

  // Deduce keeps them under `candidates`.
  const raw = Array.isArray(c.options)
    ? (c.options as unknown[])
    : Array.isArray(c.candidates)
      ? (c.candidates as unknown[])
      : [];

  const choices = raw.flatMap((o, i) => {
    const obj = rec(o);
    const key = str(obj?.key) ?? String(i);
    return [{ key, index: i, facets: facets(o) }];
  });
  return { choices, fromStem: false };
}

/**
 * Normalise a serve, or return null when this type cannot be presented headlessly.
 *
 * A null return is not a failure to handle: it is the signal to decline the item, which the caller does
 * by posting a response the server cannot mark.
 */
export function adapt(serve: Serve): Question | null {
  if (UNPRESENTABLE.includes(serve.typeCode)) return null;

  const c = serve.served.content as Record<string, unknown>;
  const stem = buildStem(serve.typeCode, c);
  const { choices, fromStem } = buildChoices(serve.typeCode, c, stem);

  // Fewer than two choices is not a question a child can answer, whatever the stem says.
  if (choices.length < 2) return null;

  return {
    itemId: serve.served.itemId,
    typeCode: serve.typeCode,
    domain: serve.domain,
    difficulty: serve.difficulty,
    ask: describe(c),
    stem,
    choices,
    choicesAreStemRows: fromStem,
    raw: c,
  };
}

/** The response body for a chosen key. The server marks it; nothing is decided here. */
export function responseFor(choice: Choice): Record<string, unknown> {
  // Both, because the server decides which to mark against from the item's key rather than from what
  // arrives, and a surface has no way of knowing which style the type it was handed uses.
  return { selectedKey: choice.key, selectedIndex: choice.index };
}

/** The response body for an item we declined to present, which the server counts as unscorable. */
export function declineResponse(): Record<string, unknown> {
  return { declined: 'this surface cannot present this item type' };
}
