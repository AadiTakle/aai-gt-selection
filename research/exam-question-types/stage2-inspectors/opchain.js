// Figure inspector for FLU-OPCHAIN-01.
//
// This is the stimulus view the Stage 2 review window draws. It is NOT the shipping renderer: that
// is `demos/FLU-OPCHAIN-01.html`, which is being built in a separate workstream and does not exist
// yet. The two are not interchangeable — the demo is the artifact under review, this is a plain
// readable drawing of `item.content` so the block can be played and judged before the demo lands.
// The window does not currently prefer the demo when it appears; wiring the iframe over the demos'
// postMessage protocol is deliberately left until there is a demo to drive.
//
// WHAT IS AND IS NOT DUPLICATED HERE. The figure ALGEBRA is not restated — `applyChain`, `applyOp`
// and `figureKey` are imported from the generator that wrote the bank, so "what the machine does"
// has exactly one definition. What this file owns is drawing: how a `{glyph, orient, shade, border,
// pair}` record becomes a picture. The four glyphs are single-path, chiral and have no rotational
// symmetry, which is a correctness requirement rather than taste — a symmetric glyph would make
// `flip` and `turn` invisible and the geometric half of the operator vocabulary unlearnable.
//
// Adding an inspector for a second Stage 2 type means adding a module with these same exports and
// naming it in the catalog's `inspector` field. Nothing in `stage2-review.js` is type-specific.

import {
  OPERATORS,
  applyChain,
  applyOp,
  figureKey,
} from '../generators/FLU-OPCHAIN-01.mjs';

export const id = 'opchain';

/* ------------------------------------------------------------------ *
 * Drawing
 * ------------------------------------------------------------------ */

/**
 * Glyph outlines in a 100x100 box.
 *
 * Each is chiral (its mirror image is not any rotation of it) and has trivial rotational symmetry,
 * so all eight orientations of the dihedral group are visually distinct. Without that, two of the
 * six operators would be no-ops on screen.
 */
const GLYPH_PATHS = {
  flag: 'M30,10 L40,10 L40,20 L84,36 L40,52 L40,90 L30,90 Z',
  hook: 'M60,10 L76,10 L76,54 Q76,82 50,82 Q22,82 22,56 L22,42 L40,42 L40,56 Q40,66 50,66 Q58,66 58,54 Z',
  boot: 'M24,12 L44,12 L44,64 L88,64 L88,88 L24,88 Z',
  comma: 'M18,56 L38,38 L54,54 L80,18 L94,30 L54,78 L38,62 L28,70 Z',
};

const BADGE_SHAPES = {
  circle: '<circle cx="50" cy="50" r="30" />',
  square: '<rect x="22" y="22" width="56" height="56" rx="4" />',
  triangle: '<polygon points="50,18 82,76 18,76" />',
  diamond: '<polygon points="50,16 84,50 50,84 16,50" />',
  hexagon: '<polygon points="50,16 79,33 79,67 50,84 21,67 21,33" />',
  star: '<polygon points="50,14 60,40 88,40 65,57 74,84 50,67 26,84 35,57 12,40 40,40" />',
};

/** One glyph copy, oriented. */
function glyphNode(figure) {
  const path = GLYPH_PATHS[figure.glyph] ?? GLYPH_PATHS.flag;
  const solid = figure.shade === 'solid';
  const fill = solid ? '#12202e' : '#ffffff';
  // `rotate` is applied after `scale` because an SVG transform list composes right to left, which
  // matches the generator's orientation element r^a m^b: mirror first, then the quarter turns.
  const mirror = figure.orient.b ? 'scale(-1,1)' : '';
  const rot = `rotate(${(figure.orient.a % 4) * 90} 50 50)`;
  const inner = mirror ? `translate(100,0) ${mirror}` : '';
  return (
    `<g transform="${rot}">` +
    `<g transform="${inner}">` +
    `<path d="${path}" fill="${fill}" stroke="#12202e" stroke-width="5" ` +
    `stroke-linejoin="round" />` +
    `</g></g>`
  );
}

/** A `{glyph, orient, shade, border, pair}` record as an SVG string. */
export function figureSvg(figure, size = 92) {
  if (!figure) return `<svg width="${size}" height="${size}"></svg>`;
  const copies = figure.pair
    ? // Two copies side by side, each oriented identically. `twin` toggles this component.
      `<g transform="translate(6,26) scale(0.46)">${glyphNode(figure)}</g>` +
      `<g transform="translate(50,26) scale(0.46)">${glyphNode(figure)}</g>`
    : `<g transform="translate(8,8) scale(0.84)">${glyphNode(figure)}</g>`;
  // A CIRCLE, not the rounded rectangle this used to draw. The intuitiveness audit found the old
  // rectangle indistinguishable from the cell and card outlines that surround every figure: three of
  // four evaluators reported a "heavy dark border" that appeared to mean four different interface
  // things and turned out to be part of the stimulus. A component of the hidden vocabulary cannot
  // share a visual language with interface chrome — the child would be inducing over the furniture.
  // Nothing about the algebra changes; `ring` is a boolean and how it is drawn is free.
  const ring = figure.border
    ? '<circle cx="50" cy="50" r="47" fill="none" stroke="#12202e" stroke-width="4" />'
    : '';
  return (
    `<svg width="${size}" height="${size}" viewBox="0 0 100 100" role="img" ` +
    `aria-label="${figureLabel(figure)}">${ring}${copies}</svg>`
  );
}

/** Plain-text description, so the figure is readable by a screen reader and greppable in a report. */
export function figureLabel(figure) {
  if (!figure) return 'no figure';
  const parts = [
    figure.shade,
    figure.glyph,
    `turned ${figure.orient.a} quarter${figure.orient.a === 1 ? '' : 's'}`,
  ];
  if (figure.orient.b) parts.push('mirrored');
  if (figure.border) parts.push('ringed');
  parts.push(figure.pair ? 'doubled' : 'single');
  return parts.join(', ');
}

export function badgeSvg(symbol, size = 30) {
  const shape = BADGE_SHAPES[symbol] ?? BADGE_SHAPES.circle;
  return (
    `<svg width="${size}" height="${size}" viewBox="0 0 100 100" role="img" aria-label="${symbol}">` +
    `<g fill="#1b3a5b">${shape}</g></svg>`
  );
}

/* ------------------------------------------------------------------ *
 * What the item asks
 * ------------------------------------------------------------------ */

/** Difference between two figures, named component by component — for the peek panel. */
export function figureDelta(before, after) {
  const out = [];
  if (before.orient.a !== after.orient.a || before.orient.b !== after.orient.b) {
    out.push('orientation');
  }
  if (before.shade !== after.shade) out.push(`fill → ${after.shade}`);
  if (before.border !== after.border) out.push(after.border ? 'ring on' : 'ring off');
  if (before.pair !== after.pair) out.push(after.pair ? 'doubled' : 'single again');
  return out.length === 0 ? 'nothing changed' : out.join(', ');
}

/** Short lever tag for the trace table: depth, orientation count, whether the chain mixes. */
export function describeItem(meta) {
  const l = meta?.levers;
  if (!l) return '—';
  return `d${l.depth}·g${l.geom}${l.mixed ? '·mix' : ''}`;
}

// THERE IS DELIBERATELY NO `prompt` EXPORT. An earlier version of this file carried a sentence
// stating what the child had to do, and the screen printed it above the options. That is the wrong
// shape: a written direction is an instruction, and an instruction is a reading task bolted onto a
// non-verbal reasoning task. The task is carried by the layout instead — see the header of
// `stage2-child-stage.js` for the four devices that do it and the audit that tested whether they
// work. If a caption ever seems necessary again, that is evidence the layout has stopped explaining
// itself and the layout is what should change.

/* ------------------------------------------------------------------ *
 * The induction model
 *
 * Used only by the "induces the system" auto-responder. It is a model of a LEARNER, not of the
 * selection rule and not of the response curve being fitted: it answers from what it has worked out
 * about the badge-to-operator mapping so far, and it works that out only from reveals it has
 * already seen. In the scrambled arm the mapping is redrawn every trial, so its accumulated
 * knowledge is worthless by construction — which is the whole point of the control.
 *
 * It is given the SET of six operators but never the mapping. The set is identical in both arms, so
 * knowing it helps the control exactly as much as it helps the live arm.
 * ------------------------------------------------------------------ */

export function newMemory() {
  return { candidates: new Map(), resets: 0, pinned: 0 };
}

function candidatesFor(memory, badge) {
  if (!memory.candidates.has(badge)) memory.candidates.set(badge, new Set(OPERATORS));
  return memory.candidates.get(badge);
}

/** Every assignment of operators to the chain's badges that the memory still permits. */
function assignments(chain, memory, useAll) {
  const pools = chain.map((badge) =>
    useAll ? OPERATORS.slice() : [...candidatesFor(memory, badge)],
  );
  const out = [];
  const walk = (depth, picked) => {
    if (out.length > 4096) return;
    if (depth === chain.length) {
      out.push(picked.slice());
      return;
    }
    for (const op of pools[depth]) {
      // No operator repeats inside a chain (five of the six are involutions, so a repeat would
      // cancel), so an assignment that reuses one cannot be the real chain.
      if (picked.includes(op)) continue;
      picked.push(op);
      walk(depth + 1, picked);
      picked.pop();
    }
  };
  walk(0, []);
  return out;
}

/**
 * Pick an option using only what has been induced so far.
 *
 * Returns `{ key, confident }`. `confident` means every assignment the memory still allows agrees on
 * the same option — the state a child reaches once they have pinned the badges in the chain.
 */
export function respond(item, memory, unit) {
  const chain = item.content.chain;
  const input = item.content.input;
  const options = item.content.options;
  const byKey = new Map(options.map((o) => [figureKey(o.figure), o.key]));

  const votes = new Map();
  for (const assignment of assignments(chain, memory, false)) {
    const key = byKey.get(figureKey(applyChain(assignment, input)));
    if (key === undefined) continue;
    votes.set(key, (votes.get(key) ?? 0) + 1);
  }

  if (votes.size === 0) {
    const pick = options[Math.min(options.length - 1, Math.floor(unit * options.length))];
    return { key: pick.key, confident: false };
  }
  const ranked = [...votes.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  const top = ranked[0][1];
  const tied = ranked.filter(([, n]) => n === top);
  const chosen = tied[Math.min(tied.length - 1, Math.floor(unit * tied.length))];
  return { key: chosen[0], confident: votes.size === 1 };
}

/**
 * Narrow the memory using the figure the machine actually produced.
 *
 * If no permitted assignment explains the reveal, the memory about these badges must be wrong — so
 * it is thrown away for them and rebuilt from the full operator set. That reset is the observable
 * signature of the scrambled arm: knowledge that keeps being contradicted.
 */
export function learn(item, revealedFigure, memory) {
  const chain = item.content.chain;
  const input = item.content.input;
  const target = figureKey(revealedFigure);

  let consistent = assignments(chain, memory, false).filter(
    (assignment) => figureKey(applyChain(assignment, input)) === target,
  );
  let reset = false;
  if (consistent.length === 0) {
    reset = true;
    memory.resets += 1;
    for (const badge of chain) memory.candidates.set(badge, new Set(OPERATORS));
    consistent = assignments(chain, memory, true).filter(
      (assignment) => figureKey(applyChain(assignment, input)) === target,
    );
  }
  if (consistent.length === 0) return { reset, pinnedNow: [] };

  const pinnedNow = [];
  chain.forEach((badge, position) => {
    const survivors = new Set(consistent.map((assignment) => assignment[position]));
    const before = candidatesFor(memory, badge);
    const next = new Set([...before].filter((op) => survivors.has(op)));
    memory.candidates.set(badge, next.size > 0 ? next : survivors);
    if (before.size > 1 && memory.candidates.get(badge).size === 1) pinnedNow.push(badge);
  });
  memory.pinned = [...memory.candidates.values()].filter((set) => set.size === 1).length;
  return { reset, pinnedNow };
}

/** How much of the vocabulary the model currently believes it has pinned down. */
export function memoryState(memory) {
  const pinned = [...memory.candidates.entries()]
    .filter(([, set]) => set.size === 1)
    .map(([badge, set]) => `${badge}=${[...set][0]}`);
  return { pinned, resets: memory.resets, seen: memory.candidates.size };
}

/* ------------------------------------------------------------------ *
 * The peek panel: what the hidden system is, for this item
 * ------------------------------------------------------------------ */

/** Step-by-step application of the true chain, for the reviewer-only reveal. */
export function steps(item, meta) {
  if (!meta?.operatorChain) return [];
  const out = [];
  let figure = item.content.input;
  meta.operatorChain.forEach((op, i) => {
    const after = applyOp(op, figure);
    out.push({
      badge: item.content.chain[i],
      operator: op,
      before: figure,
      after,
      change: figureDelta(figure, after),
    });
    figure = after;
  });
  return out;
}
