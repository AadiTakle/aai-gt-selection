/**
 * The drawing vocabulary every experience shares.
 *
 * WHY THIS FILE IS THE WHOLE POINT. The bank's items name their parts abstractly: a cell is
 * `{shape:'star', color:'ink', count:1, rot:120}`, a series term is `{value:4}`, a balance load is
 * `['cube','cube']`. Nothing in the item says how a star looks. The prebuilt HTML renderers answer
 * that question one way and can only be retinted afterwards, which is why a themed iframe can give
 * you a crimson star but never a dragon egg.
 *
 * Drawing from the content ourselves means the item's STRUCTURE is fixed and its DEPICTION is not.
 * A world supplies a `Skin`: a mapping from the abstract shape and colour names to whatever that
 * world draws. The engine still sees "shape rule satisfied"; the child sees eggs.
 *
 * THE VOCABULARY IS MEASURED, NOT GUESSED. Both lists below were extracted from the curated banks
 * rather than invented, because getting them wrong is a correctness bug and not a cosmetic one: if
 * two distinct shape names fall back to the same picture, or two colour names resolve to the same
 * fill, then the rule the item is testing becomes invisible and the question is unanswerable. An
 * earlier version of this file had four of the six colours and eight of the sixteen shapes missing,
 * which silently broke every colour-rule and several shape-rule items.
 *
 *   colours  teal, ink, violet, blue, gold, coral                              (6, all present)
 *   shapes   flag, hook, boot, comma, star, pentagon, kite, hexagon, triangle,
 *            drop, dot, bolt, chevron, leaf, capsule, petal                    (16, all present)
 *
 * ROTATION IS IN DEGREES. The banks carry `rot` values of 0, 45, 90, 120, 135, 180 and 240, so it is
 * not quarter turns and 120 is not a multiple of 90. Pass bank values to `rotDeg`. The older `rot`
 * prop is retained as quarter turns for callers already written against it.
 *
 * Everything is SVG on a 100x100 viewBox, so a caller sizes with CSS and never with maths.
 */
import type { CSSProperties, ReactNode } from 'react';

/** The abstract shape names the curated banks actually use, plus a few generic extras. */
export type ShapeName =
  | 'flag'
  | 'hook'
  | 'boot'
  | 'comma'
  | 'star'
  | 'pentagon'
  | 'kite'
  | 'hexagon'
  | 'triangle'
  | 'drop'
  | 'dot'
  | 'bolt'
  | 'chevron'
  | 'leaf'
  | 'capsule'
  | 'petal'
  | 'circle'
  | 'square'
  | 'diamond'
  | 'cube'
  | 'teardrop'
  | 'crescent'
  | 'spiral'
  | 'trefoil'
  | 'zigzag';

export interface Skin {
  id: string;
  /** Maps a bank colour name onto this world's palette. */
  color: (name: string) => string;
  /** Optional override per abstract shape. Return undefined to use the geometric default. */
  draw?: (shape: ShapeName, fill: string) => ReactNode | undefined;
  /** Emoji or short label used where a pictorial stand-in reads better than geometry. */
  token?: (shape: ShapeName) => string | undefined;
}

/**
 * The six colour names the banks use, and nothing else.
 *
 * These must stay mutually distinguishable at a glance and remain distinguishable to the common
 * colour-vision deficiencies, since a colour rule a child cannot see is a question they cannot
 * answer. They differ in lightness as well as hue for that reason.
 */
const DEFAULT_COLORS: Record<string, string> = {
  teal: '#2f9c95',
  ink: '#26303c',
  violet: '#8a5fbf',
  blue: '#3f76c9',
  gold: '#dda032',
  coral: '#e0685c',
};

export function paletteColor(name: string): string {
  return DEFAULT_COLORS[name] ?? DEFAULT_COLORS.teal!;
}

/** Every colour name the banks use, for a world building its own mapping. */
export const BANK_COLORS = Object.keys(DEFAULT_COLORS);

export const NEUTRAL_SKIN: Skin = { id: 'neutral', color: paletteColor };

/**
 * Geometric fallbacks, as path data on a 100x100 box.
 *
 * flag / hook / boot / comma are the four chiral figures the op-chain items transform, and they are
 * deliberately handed: each is asymmetric on both axes so a mirror is visibly different from a
 * rotation. That is the entire construct of those items, so a symmetric stand-in would destroy it.
 */
const PATHS: Record<ShapeName, string> = {
  flag: 'M30 12V90M30 18C48 8 66 26 84 16V52C66 62 48 44 30 54Z',
  hook: 'M34 14V58a20 20 0 0 0 40 0V44',
  boot: 'M38 12H62V58H82V88H38Z',
  comma: 'M62 20a24 24 0 1 0-6 44c10 0 6 16-14 24 40-4 52-32 44-52a24 24 0 0 0-24-16Z',
  star: 'M50 8 61 38 93 38 67 57 77 89 50 70 23 89 33 57 7 38 39 38Z',
  pentagon: 'M50 8 92 39 76 89 24 89 8 39Z',
  kite: 'M50 6 86 44 50 94 14 44Z',
  hexagon: 'M50 8 87 29V71L50 92 13 71V29Z',
  triangle: 'M50 12 90 84H10Z',
  drop: 'M50 8C68 34 82 48 82 62A32 32 0 1 1 18 62C18 48 32 34 50 8Z',
  dot: 'M50 22a28 28 0 1 0 .1 0Z',
  bolt: 'M58 6 26 54H46L38 94 74 42H52Z',
  chevron: 'M18 22 50 48 82 22 82 46 50 72 18 46Z',
  leaf: 'M50 10C78 28 84 58 50 92 16 58 22 28 50 10Z',
  capsule: 'M32 22H68a18 18 0 0 1 0 56H32a18 18 0 0 1 0-56Z',
  petal: 'M50 10C74 30 74 62 50 90 26 62 26 30 50 10Z',
  circle: 'M50 10a40 40 0 1 0 .1 0Z',
  square: 'M14 14H86V86H14Z',
  diamond: 'M50 8 88 50 50 92 12 50Z',
  cube: 'M50 10 86 30V70L50 90 14 70V30Z',
  teardrop: 'M50 8C68 34 82 48 82 62A32 32 0 1 1 18 62C18 48 32 34 50 8Z',
  crescent: 'M62 12a40 40 0 1 0 0 76 32 32 0 1 1 0-76Z',
  spiral: 'M50 50a12 12 0 1 1 12 12 24 24 0 1 1-24-24 36 36 0 1 1 36 36',
  trefoil: 'M50 20a16 16 0 1 1 0 32 16 16 0 1 1 0-32M32 58a16 16 0 1 1 0 26 16 16 0 1 1 0-26M68 58a16 16 0 1 1 0 26 16 16 0 1 1 0-26',
  zigzag: 'M10 70 30 30 50 70 70 30 90 70',
};

/** Shapes whose fallback reads as a stroke rather than a fill. */
const STROKED = new Set<ShapeName>(['flag', 'hook', 'spiral', 'zigzag']);

export function Glyph({
  shape,
  color = 'teal',
  skin = NEUTRAL_SKIN,
  rot,
  rotDeg,
  flip = false,
  hollow = false,
  className,
  style,
}: {
  shape: string;
  color?: string;
  skin?: Skin;
  /** Quarter turns. Retained for older callers; prefer rotDeg. */
  rot?: number;
  /** Degrees, which is what the banks carry. */
  rotDeg?: number;
  /** Mirror on the vertical axis. The op-chain items need it: their figures are chiral. */
  flip?: boolean;
  hollow?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const fill = skin.color(color);
  // The skin is asked about the RAW name, before any fallback. Folding first would mean a world can
  // never see the bank's own vocabulary, so every renderer would keep a private alias table onto
  // these primitives, and a bank using both `petal` and `leaf` would be one alias collision away
  // from two distinct shapes drawing identically, which makes the item unanswerable.
  const custom = skin.draw?.(shape as ShapeName, fill);
  const name = (shape as ShapeName) in PATHS ? (shape as ShapeName) : 'dot';
  const deg = rotDeg ?? (rot ?? 0) * 90;
  const outline = STROKED.has(name) || hollow;

  const transform = [deg ? `rotate(${deg}deg)` : '', flip ? 'scaleX(-1)' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      style={{ transform: transform || undefined, ...style }}
      role="presentation"
      aria-hidden="true"
    >
      {custom ?? (
        <path
          d={PATHS[name]}
          fill={outline ? 'none' : fill}
          stroke={outline ? fill : 'none'}
          strokeWidth={outline ? 9 : 0}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

/**
 * A count, drawn as a cluster rather than a numeral.
 *
 * The quantitative series and function items carry `{value:n}` with a `display` of `dots`. Showing
 * the numeral would turn a reasoning item into a reading item for the youngest band, so the cluster
 * is the default and a numeral is never drawn here at all.
 *
 * Carries rotation, hollowness and scale through to every member, because bank cells legitimately
 * combine `count > 1` with `rot != 0` or `fill = 0` and a cluster that dropped those would be
 * showing a different item than the one the engine served.
 */
export function Cluster({
  n,
  color = 'teal',
  skin = NEUTRAL_SKIN,
  shape = 'dot',
  max = 12,
  rotDeg,
  hollow = false,
  scale = 1,
}: {
  n: number;
  color?: string;
  skin?: Skin;
  shape?: string;
  max?: number;
  rotDeg?: number;
  hollow?: boolean;
  /** Bank cells carry a discrete `size` step; pass it through as a multiplier. */
  scale?: number;
}) {
  const count = Math.max(0, Math.min(max, Math.round(n)));
  const cols = count <= 1 ? 1 : count <= 4 ? 2 : count <= 9 ? 3 : 4;
  return (
    <div
      className="cluster"
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      aria-label={`${count}`}
    >
      {Array.from({ length: count }, (_, i) => (
        <Glyph
          key={i}
          shape={shape}
          color={color}
          skin={skin}
          rotDeg={rotDeg}
          hollow={hollow}
          style={scale === 1 ? undefined : { transform: `scale(${scale})` }}
        />
      ))}
    </div>
  );
}
