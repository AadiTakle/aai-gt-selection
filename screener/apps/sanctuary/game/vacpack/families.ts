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
};

export function glyphOf(family: Family): readonly GlyphPiece[] {
  return GLYPH[family] ?? GLYPH.waffle;
}
