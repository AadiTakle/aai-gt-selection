import type { CSSProperties } from 'react';

/**
 * The DEFAULT theme's renderer for one abstract element.
 *
 * This is the proof that the abstraction is usable and not just lossless: it receives nothing but a bag
 * of resolved dimension values and reproduces the archive's own look. `identity` picks a shape,
 * `category` tints it, `count` repeats it, `rotation` turns it, `fill` decides solid or outline, `scale`
 * sizes it.
 *
 * A themed renderer is a drop-in replacement for this file and nothing else, which is the whole point:
 * the same dimension values arrive, and only the vocabulary they resolve to differs.
 */

export interface ResolvedVars {
  readonly identity?: string | number;
  readonly category?: string | number;
  readonly count?: string | number;
  readonly scale?: string | number;
  readonly rotation?: string | number;
  readonly fill?: string | number;
  readonly tilt?: string | number;
  readonly position?: string | number;
  readonly border?: string | number;
  readonly text?: string | number;
}

/** The archive's geometric vocabulary, as SVG. Anything unrecognised falls back to a labelled token. */
const PATHS: Record<string, string> = {
  circle: 'M50 8a42 42 0 1 0 .1 0z',
  dot: 'M50 26a24 24 0 1 0 .1 0z',
  square: 'M14 14h72v72H14z',
  rect: 'M10 26h80v48H10z',
  diamond: 'M50 6 94 50 50 94 6 50z',
  triangle: 'M50 8 92 88H8z',
  pent: 'M50 6 94 38 77 90H23L6 38z',
  pentagon: 'M50 6 94 38 77 90H23L6 38z',
  hex: 'M28 10h44l22 40-22 40H28L6 50z',
  hexagon: 'M28 10h44l22 40-22 40H28L6 50z',
  star: 'M50 4 62 38h36L69 60l11 34-30-22-30 22 11-34L2 38h36z',
  cross: 'M38 6h24v32h32v24H62v32H38V62H6V38h32z',
  arrow: 'M8 38h48V14l36 36-36 36V62H8z',
  chevron: 'M18 10 58 50 18 90l16 0 40-40L34 10z',
  drop: 'M50 6c18 26 30 38 30 54a30 30 0 1 1-60 0c0-16 12-28 30-54z',
  bolt: 'M58 4 22 54h22l-8 42 38-54H52z',
  capsule: 'M30 20h40a30 30 0 0 1 0 60H30a30 30 0 0 1 0-60z',
  petal: 'M50 6c26 16 34 34 20 52S52 94 50 94 44 76 30 58 24 22 50 6z',
  leaf: 'M88 12C46 14 12 40 12 74c0 8 4 14 4 14C22 56 50 30 88 12z',
  kite: 'M50 4 92 46 50 96 8 46z',
  blob: 'M50 8c26 0 42 14 42 34s-10 46-42 46S8 62 8 42 24 8 50 8z',
};

/** The archive's colour vocabulary is already hex, so `category` is used directly when it looks like one. */
function colourOf(category: string | number | undefined, fallback = '#4a6fa5'): string {
  if (typeof category === 'string' && category.startsWith('#')) return category;
  if (category === undefined) return fallback;
  // Named colours from the bank ('teal', 'mint', ...) get a stable hue so two names never collide.
  const NAMED: Record<string, string> = {
    teal: '#0f9b9b', mint: '#28ad9c', azure: '#3eb7d3', indigo: '#4f46e5', violet: '#7c3aed',
    purple: '#8e4ec6', amber: '#d98324', rose: '#d6455d', slate: '#5a6b7a', olive: '#7a8b3a',
    coral: '#e06a52', lime: '#62b86c', sand: '#c4a35a', plum: '#9b4f8e', sky: '#4a8fd6',
  };
  const key = String(category);
  if (NAMED[key]) return NAMED[key]!;
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return `hsl(${hash % 360} 52% 46%)`;
}

function isHollow(fill: string | number | undefined): boolean {
  return fill === 'outline' || fill === 'hollow' || fill === 0;
}

function isHatched(fill: string | number | undefined): boolean {
  return fill === 'hatch';
}

/** Scale comes through as either a rank (0,1,2) or a word. Both must keep their order. */
function sizeOf(scale: string | number | undefined, base: number): number {
  if (scale === undefined) return base;
  const WORDS: Record<string, number> = { small: 0.72, big: 1, huge: 1.28 };
  if (typeof scale === 'string' && WORDS[scale] !== undefined) return base * WORDS[scale]!;
  const rank = typeof scale === 'number' ? scale : Number(scale);
  return Number.isFinite(rank) ? base * (0.72 + Math.min(2, rank) * 0.28) : base;
}

export function DefaultGlyph({
  vars,
  base = 34,
  title,
}: {
  vars: ResolvedVars;
  base?: number;
  title?: string;
}) {
  // Language-bearing items are their text. Nothing is gained by drawing a shape beside it.
  if (vars.text !== undefined) {
    return <span className="dg-text">{String(vars.text)}</span>;
  }

  const identity = vars.identity === undefined ? undefined : String(vars.identity);
  const path = identity ? PATHS[identity] : undefined;
  const colour = colourOf(vars.category);
  const hollow = isHollow(vars.fill);
  const hatched = isHatched(vars.fill);
  const size = sizeOf(vars.scale, base);
  const rotation = typeof vars.rotation === 'number' ? vars.rotation : Number(vars.rotation ?? 0);
  const repeats = Math.max(1, Math.min(9, typeof vars.count === 'number' ? vars.count : 1));
  const leaning = vars.tilt === 'leaning' || vars.tilt === 10;

  const style: CSSProperties = {
    width: size,
    height: size,
    transform: `rotate(${Number.isFinite(rotation) ? rotation : 0}deg)${leaning ? ' skewX(-12deg)' : ''}`,
  };

  const one = (key: number) =>
    path ? (
      <svg key={key} viewBox="0 0 100 100" style={style} className="dg-svg" aria-hidden="true">
        {hatched ? (
          <defs>
            <pattern id={`h${key}`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="8" stroke={colour} strokeWidth="3" />
            </pattern>
          </defs>
        ) : null}
        <path
          d={path}
          fill={hollow ? 'none' : hatched ? `url(#h${key})` : colour}
          stroke={colour}
          strokeWidth={hollow ? 9 : hatched ? 4 : 0}
        />
      </svg>
    ) : (
      // Unrecognised identity: a labelled token, so it is still distinguishable and obviously a stand-in.
      <span key={key} className="dg-token" style={{ borderColor: colour, color: colour, width: size, height: size }}>
        {identity ? identity.slice(0, 3) : '?'}
      </span>
    );

  return (
    <span className="dg" title={title}>
      {Array.from({ length: repeats }, (_, i) => one(i))}
      {vars.position !== undefined ? <span className="dg-pos">{String(vars.position)}</span> : null}
      {vars.border === 1 ? <span className="dg-border" aria-hidden="true" /> : null}
    </span>
  );
}
