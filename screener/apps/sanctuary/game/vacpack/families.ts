/**
 * WHAT EACH FAMILY LOOKS LIKE, AS FAR AS THE VACPACK IS CONCERNED.
 *
 * WHY THIS FILE EXISTS AND IS NOT `slimes/look.ts`. It should be `look.ts`. That file is the source of
 * truth for every slime colour and it is the file this one duplicates a thin slice of. It is also, right
 * now, keyed by the SUPERSEDED family names — `bellow`, `rill`, `cobble`, `ember`, `fern`, `kite` — while
 * `contract.ts` has moved to `waffle`, `rose`, `grass`, `rock`, `fairy`, `frost`. `FAMILY_LOOK.waffle` is
 * therefore `undefined` today, and a pack that read from it would throw the moment a child caught anything.
 *
 * So the vacpack carries its own six-colour table, and carries it as the ONLY thing it knows about how a
 * slime looks. When the re-theme lands, this table is deleted and `paintOf` becomes one line reading
 * `FAMILY_LOOK[family]`. Everything else in this directory is already written against `paintOf` and will
 * not need to change.
 *
 * The colours are a golden-hour set on purpose: every skin is warm-shifted, including the two that want to
 * be cool. A pure cyan frost slime looks correct under a neutral light and looks dead under this one.
 */
import type { Family } from '../contract';

export interface Paint {
  /** The hide. What a child would name the slime by. */
  skin: string;
  /** The lit underside, and the fill of a tank window. */
  inner: string;
  /** Where light grazes the top. Also the window's rim highlight. */
  rim: string;
  /** The little family mark stamped in the tank window. Dark enough to read at eight pixels across. */
  glyph: string;
  /** Iris, for the proxy face. Never black: a black pupil on a warm body reads as a hole. */
  iris: string;
  /** How much light passes through the jelly, 0..1. Only used for the proxy body's sheen. */
  through: number;
}

/**
 * The six. Each `skin` is the colour a five-year-old would reach for if handed a crayon and asked for
 * "the waffle one", which is the only test this table has to pass.
 */
export const PAINT: Record<Family, Paint> = {
  /** Golden batter, syrup-lit. */
  waffle: { skin: '#e8a94a', inner: '#ffe3ab', rim: '#fff4d8', glyph: '#8a5a22', iris: '#4b3626', through: 0.5 },
  /** Warm pink, a garden rose rather than a bubblegum pink. */
  rose: { skin: '#e8748f', inner: '#ffd2dd', rim: '#fff0f4', glyph: '#96384f', iris: '#5c2438', through: 0.72 },
  /** Meadow green, yellowed toward the sun. */
  grass: { skin: '#7ec05c', inner: '#dcf2ab', rim: '#f2ffdc', glyph: '#3d6b34', iris: '#33512c', through: 0.62 },
  /** Warm sandstone. The one family that is more opaque than the rest, because a rock should be. */
  rock: { skin: '#c58c62', inner: '#f2d5b3', rim: '#fbe9d3', glyph: '#6c452a', iris: '#4b3626', through: 0.26 },
  /** Lilac, lit from inside. */
  fairy: { skin: '#bb90e2', inner: '#ead8ff', rim: '#f9f1ff', glyph: '#5f3f8c', iris: '#463063', through: 0.86 },
  /** Sky, pulled warm so it belongs under this light. */
  frost: { skin: '#7ec6da', inner: '#d1eff8', rim: '#eefaff', glyph: '#2f6d84', iris: '#2b5464', through: 0.9 },

  /* ----------------------------------------------------------------------------------------------
     THE THIRTEEN. Taken from each family's `FAMILY_LOOK` entry in `slimes/look.ts` and warm-shifted a
     little, exactly as the six above are, so a slime in the tank window is recognisably the one that
     just vanished off the grass. `skin` is the body's own mid-tone, `inner` its lit underside, `rim` its
     highlight, and `glyph` is the body's darkest relative — it has to read as a mark at eight pixels
     across, so it is always the family's `accent` and never its skin.

     WHERE THESE DELIBERATELY DISAGREE WITH `look.ts`: `air` and `bomb`. Air's body is nearly colourless
     by design, which is a fine read on the grass among eighteen saturated slimes and an invisible one
     inside a small tank window, so its `skin` here is pulled toward its own accent until it is a visible
     pale blue. Bomb's is lifted for the same reason in reverse — at the window's size its true value
     reads as an empty socket — and lifting it also keeps this table inside the no-black rule.
     -------------------------------------------------------------------------------------------- */

  /** Almost-white sky, darkened just enough to be visible in a small window. */
  air: { skin: '#cfe6f2', inner: '#f6feff', rim: '#ffffff', glyph: '#5f8798', iris: '#4a6a78', through: 0.96 },
  /** Cream plush, warm side of white. */
  bunny: { skin: '#f3e0d4', inner: '#fff8f1', rim: '#fff6ec', glyph: '#a87a62', iris: '#6b4632', through: 0.3 },
  /** Sand, with the mane's rust as the mark. */
  lion: { skin: '#eab259', inner: '#ffe2ac', rim: '#fff2d2', glyph: '#8a4413', iris: '#5a3a1c', through: 0.16 },
  /** Ginger. Green eyes, which is the one place a cat may differ from the warm-iris rule. */
  cat: { skin: '#e88b4a', inner: '#ffcf9e', rim: '#ffe6c8', glyph: '#a1521f', iris: '#4a7a3c', through: 0.22 },
  /** Acid green. The brightest skin in the table, as it is on the ranch. */
  radioactive: { skin: '#8ed24a', inner: '#daff86', rim: '#f0ffc8', glyph: '#3e6b18', iris: '#3e5c22', through: 0.6 },
  /** Bark brown, the most opaque family here after gold. */
  wood: { skin: '#9c7346', inner: '#e0c395', rim: '#f0dcbc', glyph: '#5d4023', iris: '#4b3626', through: 0.08 },
  /** Flame orange. */
  fire: { skin: '#e8632c', inner: '#ffc46a', rim: '#ffe0b0', glyph: '#9c2f10', iris: '#7a2c10', through: 0.55 },
  /** Deep gem blue — a clear step darker and bluer than `frost`, which is the whole point of the pair. */
  ice: { skin: '#5aa8d8', inner: '#aae6ff', rim: '#e2f6ff', glyph: '#245f8c', iris: '#1f4c6b', through: 0.95 },
  /** Metal. The window cannot show a reflection, so it shows the richest gold it can instead. */
  gold: { skin: '#e8b23c', inner: '#fff0b8', rim: '#fff8dc', glyph: '#9c6a12', iris: '#5c3f12', through: 0.04 },
  /** Dusty lavender, muted well away from fairy's lit violet. */
  sleepy: { skin: '#aeaad6', inner: '#e6e4ff', rim: '#f2efff', glyph: '#635f8f', iris: '#4b3f6a', through: 0.34 },
  /** Berry red, saturated further than rose's pink. */
  strawberry: { skin: '#e03a44', inner: '#ff8f96', rim: '#ffd0d4', glyph: '#96161f', iris: '#7a2028', through: 0.44 },
  /** Ripe red over gold. The window shows the red, which is the shoulder colour a child sees first. */
  mango: { skin: '#e8622e', inner: '#ffd07a', rim: '#ffe8bc', glyph: '#a03a12', iris: '#6b3418', through: 0.3 },
  /** Dark dusty violet, lifted for the window. Still comfortably lighter than the palette's floor. */
  bomb: { skin: '#5a5270', inner: '#a49ac0', rim: '#cdc6e0', glyph: '#3f3950', iris: '#4b3626', through: 0.1 },
};

/** The one accessor. Falls back to waffle rather than throwing, because nothing here may fail on a child. */
export function paintOf(family: Family): Paint {
  return PAINT[family] ?? PAINT.waffle;
}

/**
 * The mark stamped in a tank window, as a recipe rather than a mesh.
 *
 * Each is a handful of tiny rounded pieces laid out on a flat disc. Deliberately NOT the slime's crest
 * geometry from `crests.ts`: a crest is built to be seen at a metre and turns to mush at the eight screen
 * pixels a tank window gets. A window needs a SYMBOL — a grid, a flower, three blades — that survives
 * being tiny, which is a different drawing job from the same source idea.
 *
 * `kind` picks a primitive so the whole set shares three geometries; `at` is in window radii.
 */
export interface GlyphPiece {
  kind: 'pip' | 'bar' | 'blade';
  /** Position within the window disc, in window radii. x right, y up. */
  at: readonly [number, number];
  /** Radius (pip), or half-length (bar, blade), in window radii. */
  size: number;
  /** Radians, for bars and blades. */
  turn?: number;
}

export const GLYPH: Record<Family, readonly GlyphPiece[]> = {
  /** Four dimples in a two-by-two: a waffle, at any size, forever. */
  waffle: [
    { kind: 'pip', at: [-0.3, 0.3], size: 0.2 },
    { kind: 'pip', at: [0.3, 0.3], size: 0.2 },
    { kind: 'pip', at: [-0.3, -0.3], size: 0.2 },
    { kind: 'pip', at: [0.3, -0.3], size: 0.2 },
  ],
  /** Five petals round a heart. */
  rose: [
    { kind: 'pip', at: [0, 0.42], size: 0.21 },
    { kind: 'pip', at: [0.4, 0.13], size: 0.21 },
    { kind: 'pip', at: [0.25, -0.34], size: 0.21 },
    { kind: 'pip', at: [-0.25, -0.34], size: 0.21 },
    { kind: 'pip', at: [-0.4, 0.13], size: 0.21 },
    { kind: 'pip', at: [0, 0], size: 0.16 },
  ],
  /** Three blades from one tuft. */
  grass: [
    { kind: 'blade', at: [0, -0.1], size: 0.5, turn: 0 },
    { kind: 'blade', at: [-0.26, -0.16], size: 0.42, turn: 0.5 },
    { kind: 'blade', at: [0.26, -0.16], size: 0.42, turn: -0.5 },
  ],
  /** One round stone with two chips off it. */
  rock: [
    { kind: 'pip', at: [-0.06, -0.04], size: 0.42 },
    { kind: 'pip', at: [0.32, 0.28], size: 0.17 },
    { kind: 'pip', at: [0.3, -0.3], size: 0.13 },
  ],
  /** A four-point sparkle. */
  fairy: [
    { kind: 'bar', at: [0, 0], size: 0.52, turn: 0 },
    { kind: 'bar', at: [0, 0], size: 0.52, turn: Math.PI / 2 },
    { kind: 'pip', at: [0, 0], size: 0.16 },
    { kind: 'pip', at: [0.36, 0.36], size: 0.09 },
  ],
  /** Six spokes. */
  frost: [
    { kind: 'bar', at: [0, 0], size: 0.5, turn: 0 },
    { kind: 'bar', at: [0, 0], size: 0.5, turn: Math.PI / 3 },
    { kind: 'bar', at: [0, 0], size: 0.5, turn: (2 * Math.PI) / 3 },
    { kind: 'pip', at: [0, 0], size: 0.14 },
  ],

  /* ----------------------------------------------------------------------------------------------
     THE THIRTEEN.

     The rule from the note at the top of this table is the one that matters and it is NOT "draw the
     crest small": a window gets about eight pixels, where a mane is mush and a nightcap is a blob. Each
     of these is a SYMBOL of the family — the fewest strokes that survive being tiny — which is a
     different drawing job from the 3D crest, sometimes deliberately so. Bunny is two ears and a head,
     not a rabbit. Sleepy is a letter Z, not a cap. Gold is a crown outline, not a reflection.

     Where two families would have collided as symbols, the SYMBOLS were pulled apart rather than
     accepted: fire is three leaning strokes all raked the same way, ice is three of unequal length
     splayed both ways, and the two are further separated by skin colour in the window frame.
     -------------------------------------------------------------------------------------------- */

  /** A three-armed swirl. Reads as rotation at any size, which is air's whole idea. */
  air: [
    { kind: 'blade', at: [0, 0.2], size: 0.34, turn: 0.5 },
    { kind: 'blade', at: [0.2, -0.12], size: 0.34, turn: 2.59 },
    { kind: 'blade', at: [-0.2, -0.12], size: 0.34, turn: 4.71 },
    { kind: 'pip', at: [0, 0], size: 0.12 },
  ],
  /** Two ears over a head. The most legible symbol in the set at eight pixels. */
  bunny: [
    { kind: 'bar', at: [-0.2, 0.34], size: 0.32, turn: Math.PI / 2 },
    { kind: 'bar', at: [0.2, 0.34], size: 0.32, turn: Math.PI / 2 },
    { kind: 'pip', at: [0, -0.3], size: 0.3 },
  ],
  /** A ring of mane round a face. */
  lion: [
    { kind: 'pip', at: [0, 0], size: 0.24 },
    { kind: 'pip', at: [0, 0.44], size: 0.15 },
    { kind: 'pip', at: [0.38, 0.22], size: 0.15 },
    { kind: 'pip', at: [0.38, -0.22], size: 0.15 },
    { kind: 'pip', at: [0, -0.44], size: 0.15 },
    { kind: 'pip', at: [-0.38, -0.22], size: 0.15 },
    { kind: 'pip', at: [-0.38, 0.22], size: 0.15 },
  ],
  /** Two pointed ears over a head — the same grammar as bunny's, with the ears short and splayed. */
  cat: [
    { kind: 'blade', at: [-0.26, 0.28], size: 0.28, turn: 0.35 },
    { kind: 'blade', at: [0.26, 0.28], size: 0.28, turn: -0.35 },
    { kind: 'pip', at: [0, -0.18], size: 0.32 },
  ],
  /** The trefoil: three arms at 120° and a hub. */
  radioactive: [
    { kind: 'blade', at: [0, 0], size: 0.46, turn: 0 },
    { kind: 'blade', at: [0, 0], size: 0.46, turn: (2 * Math.PI) / 3 },
    { kind: 'blade', at: [0, 0], size: 0.46, turn: (4 * Math.PI) / 3 },
    { kind: 'pip', at: [0, 0], size: 0.18 },
  ],
  /** A trunk that forks. */
  wood: [
    { kind: 'bar', at: [0, -0.26], size: 0.3, turn: Math.PI / 2 },
    { kind: 'bar', at: [-0.2, 0.26], size: 0.26, turn: 2.2 },
    { kind: 'bar', at: [0.2, 0.26], size: 0.26, turn: 0.94 },
  ],
  /** Three flames, all raked the same way. The shared rake is what separates it from ice. */
  fire: [
    { kind: 'blade', at: [0, -0.08], size: 0.5, turn: 0.22 },
    { kind: 'blade', at: [-0.3, -0.22], size: 0.34, turn: 0.42 },
    { kind: 'blade', at: [0.3, -0.24], size: 0.3, turn: 0.16 },
  ],
  /** Three shards of unequal length, splayed both ways. Asymmetry is ice's signature everywhere. */
  ice: [
    { kind: 'blade', at: [0.06, -0.08], size: 0.52, turn: 0.14 },
    { kind: 'blade', at: [-0.3, -0.22], size: 0.3, turn: 0.52 },
    { kind: 'blade', at: [0.38, -0.26], size: 0.22, turn: -0.24 },
  ],
  /** A crown: a band and three points. */
  gold: [
    { kind: 'bar', at: [0, -0.3], size: 0.44, turn: 0 },
    { kind: 'blade', at: [-0.3, 0.04], size: 0.3, turn: 0 },
    { kind: 'blade', at: [0, 0.1], size: 0.36, turn: 0 },
    { kind: 'blade', at: [0.3, 0.04], size: 0.3, turn: 0 },
  ],
  /** A letter Z, which is the one symbol here that is literally a symbol. */
  sleepy: [
    { kind: 'bar', at: [0, 0.32], size: 0.3, turn: 0 },
    { kind: 'bar', at: [0, -0.32], size: 0.3, turn: 0 },
    { kind: 'bar', at: [0, 0], size: 0.44, turn: -0.86 },
  ],
  /** A berry under a calyx. */
  strawberry: [
    { kind: 'pip', at: [0, -0.18], size: 0.42 },
    { kind: 'blade', at: [-0.24, 0.32], size: 0.24, turn: 1.0 },
    { kind: 'blade', at: [0.24, 0.32], size: 0.24, turn: -1.0 },
    { kind: 'blade', at: [0, 0.38], size: 0.2, turn: 0 },
  ],
  /** A leaning fruit with one leaf. The offset centre is the lean, at window scale. */
  mango: [
    { kind: 'pip', at: [-0.08, -0.12], size: 0.44 },
    { kind: 'blade', at: [0.3, 0.34], size: 0.3, turn: -0.7 },
  ],
  /** A bauble with a fuse and a spark. */
  bomb: [
    { kind: 'pip', at: [0, -0.18], size: 0.46 },
    { kind: 'bar', at: [0.22, 0.32], size: 0.22, turn: 1.1 },
    { kind: 'pip', at: [0.36, 0.5], size: 0.1 },
  ],
};

export function glyphOf(family: Family): readonly GlyphPiece[] {
  return GLYPH[family] ?? GLYPH.waffle;
}
