import { useCallback, useEffect, useState, type ReactNode } from 'react';

import type { Choice, Facets, Question } from '../shared/headless/adapt';
import { visualChoices, type VisualChoice } from '../shared/headless/distinct';
import { useQuestionSession } from '../shared/headless/useQuestionSession';
import { loadProgress, recordRound, type Progress } from '../shared/progression';
import type { ExperienceMeta } from '../shared/types';
import './Obby.css';

/**
 * Obby: a blocky character runs an obstacle course, and every question is a gap in it.
 *
 * THE BAND IS THE BRIEF. K-1 is five to seven years old, so the working assumption here is that the
 * player cannot read a single word. Nothing on screen is load-bearing text. The prompt is a picture,
 * the choices are platforms, the feedback is a hop, and the only text present is small, dim and aimed
 * at whichever adult is watching over the child's shoulder. `question.ask` is never printed: it is
 * written for readers and would be noise at best here.
 *
 * THE LOOP. Each question is a gap. The choices are the platforms spanning it. A right answer lands
 * the character and lights the next checkpoint. A wrong answer bounces them, with a spring and a grin,
 * back onto the platform they were already standing on. There is no fall, no life, no restart and no
 * red cross anywhere, because a five-year-old who feels they have lost something stops playing.
 *
 * WHY THE COURSE IS THE PULL. The finish line and the trophy on it are drawn from the first frame, at
 * full size, before the child has answered anything. The thing that makes them want the next question
 * is that they can see how much course is left.
 *
 * NOTHING HERE USES A LIBRARY RENDERER. The question arrives as a normalised stem plus a bag of
 * abstract facets, and every pixel of the drawing is this file's. `count` becomes a visible pile of
 * coins because quantity is the one thing this band reads instantly.
 */

export const meta: ExperienceMeta = {
  id: 'obby',
  title: 'Obby Run',
  world: 'Roblox',
  band: 'K-1',
  pull: 'Jump the right block. Reach the finish',
  accent: '#e2231a',
};

/* ------------------------------------------------------------------ platform identity */

interface SlotStyle {
  /** Saturated plastic, one per platform. Bright enough that a five-year-old names it. */
  readonly body: string;
  readonly edge: string;
  /** A shape badge as well as a colour, so the platforms stay distinct without colour vision. */
  readonly badge: string;
  /** Spoken by a screen reader, and by the adult reading over the child's shoulder. */
  readonly name: string;
}

const FALLBACK_SLOT: SlotStyle = { body: '#e2231a', edge: '#9d1109', badge: 'circle', name: 'red' };

/**
 * Eight platforms, allocated by SLOT rather than by hashing a facet token.
 *
 * Hashing collides. Four of the five FLU-OPCHAIN choices in this bank reduce to the identical facet
 * bag `{glyph: flag, color: hollow}` once the adapter has run, and a skin that draws from facets alone
 * puts four indistinguishable platforms over the gap and makes a good item unanswerable. The slot from
 * `visualChoices` is unique within a question, so the frame colour and badge never collide.
 */
const SLOTS: readonly SlotStyle[] = [
  FALLBACK_SLOT,
  { body: '#0a7bd8', edge: '#05539a', badge: 'triangle', name: 'blue' },
  { body: '#ffc400', edge: '#c08c00', badge: 'square', name: 'yellow' },
  { body: '#3bb143', edge: '#22782a', badge: 'star', name: 'green' },
  { body: '#9146ff', edge: '#5f24bd', badge: 'diamond', name: 'purple' },
  { body: '#ff7a00', edge: '#bd5100', badge: 'heart', name: 'orange' },
  { body: '#00c2d1', edge: '#00889a', badge: 'hexagon', name: 'cyan' },
  { body: '#ff4fa3', edge: '#c01f6f', badge: 'plus', name: 'pink' },
];

function slotStyle(slot: number): SlotStyle {
  return SLOTS[slot % SLOTS.length] ?? FALLBACK_SLOT;
}

/* ------------------------------------------------------------------ colour */

const INK = '#1b2440';

const COLOR_TOKEN: Record<string, string> = {
  blue: '#0a7bd8',
  coral: '#ff5a4a',
  gold: '#ffbe0b',
  teal: '#00b8ad',
  violet: '#8b5cf6',
  ink: '#2b3350',
  red: '#e2231a',
  green: '#3bb143',
  orange: '#ff7a00',
  pink: '#ff4fa3',
  yellow: '#ffc400',
  purple: '#9146ff',
  cyan: '#00c2d1',
  lime: '#a4e034',
  brown: '#9a6b3f',
  grey: '#8b97ad',
  gray: '#8b97ad',
  white: '#eef3fb',
  black: '#20263a',
};

const COLOR_WHEEL = ['#0a7bd8', '#ff5a4a', '#ffbe0b', '#00b8ad', '#8b5cf6', '#3bb143', '#ff7a00', '#ff4fa3'];

function hashOf(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * A facet colour, in plastic.
 *
 * `hollow` and `solid` arrive here because the adapter folds an item's `shade` into `color`. They are
 * fill modes rather than hues, so they keep the neutral ink and are drawn as outline versus filled.
 */
function colorFor(token: string | undefined): string {
  if (!token || token === 'hollow' || token === 'solid') return INK;
  const named = COLOR_TOKEN[token.toLowerCase()];
  if (named) return named;
  return COLOR_WHEEL[hashOf(token) % COLOR_WHEEL.length] ?? INK;
}

function isHollow(f: Facets): boolean {
  return f.color === 'hollow' || f.fill === 'outline' || f.fill === 'hollow';
}

/** `size` is ordered, so magnitude has to survive. Huge values are pixel radii, not ranks. */
function scaleFor(size: Facets['size']): number {
  if (typeof size === 'number') {
    if (!Number.isFinite(size) || size > 8) return 1;
    return 0.8 + Math.max(0, Math.min(4, size)) * 0.1;
  }
  if (size === 'small') return 0.8;
  if (size === 'large') return 1.2;
  return 1;
}

/** `rot` is a quarter-turn index on some types and degrees on others. */
function degreesFor(rot: number | undefined): number {
  if (rot === undefined || !Number.isFinite(rot)) return 0;
  return Math.abs(rot) <= 4 ? rot * 90 : rot;
}

/* ------------------------------------------------------------------ glyphs */

/** Drawn as a line rather than a filled body, whatever the fill facet says. */
const STROKED = new Set(['spiral', 'zigzag', 'hook']);

const GEOMETRIC = ['circle', 'square', 'triangle', 'diamond', 'hexagon', 'star', 'kite', 'capsule'];

/**
 * The bank's own tokens, drawn.
 *
 * The K-1 slice of the bank speaks in animals (bear, frog, turtle, rabbit) as much as in polygons,
 * which is a gift at this band: a five-year-old who cannot read a word knows a frog on sight. So the
 * animals are drawn as animals rather than flattened into coloured hexagons.
 */
function glyphBody(token: string): ReactNode {
  switch (token) {
    case 'circle':
      return <circle cx="50" cy="50" r="34" />;
    case 'square':
      return <rect x="17" y="17" width="66" height="66" rx="8" />;
    case 'triangle':
      return <path d="M50 12 L88 84 H12 Z" />;
    case 'diamond':
      return <path d="M50 10 L88 50 L50 90 L12 50 Z" />;
    case 'hexagon':
      return <path d="M50 10 L85 30 V70 L50 90 L15 70 V30 Z" />;
    case 'pentagon':
      return <path d="M50 10 L89 39 L74 86 H26 L11 39 Z" />;
    case 'star':
      return <path d="M50 6 L62 38 L96 40 L69 61 L79 94 L50 75 L21 94 L31 61 L4 40 L38 38 Z" />;
    case 'kite':
      return <path d="M50 8 L84 40 L50 92 L16 40 Z" />;
    case 'capsule':
      return <rect x="10" y="34" width="80" height="32" rx="16" />;
    case 'chevron':
      return <path d="M30 10 L68 50 L30 90 L48 90 L86 50 L48 10 Z" />;
    case 'bolt':
      return <path d="M60 4 L24 56 H46 L40 96 L78 42 H54 Z" />;
    case 'crescent':
      return <path d="M68 10a40 40 0 1 0 0 80 32 32 0 1 1 0-80z" />;
    case 'trefoil':
      return (
        <>
          <circle cx="50" cy="28" r="21" />
          <circle cx="29" cy="64" r="21" />
          <circle cx="71" cy="64" r="21" />
        </>
      );
    case 'teardrop':
    case 'drop':
      return <path d="M50 6c21 27 31 42 31 54a31 31 0 0 1-62 0c0-12 10-27 31-54z" />;
    case 'leaf':
      return (
        <>
          <path d="M14 86C14 44 44 14 86 14c0 42-30 72-72 72z" />
          <path d="M22 78 L74 26" fill="none" stroke="#ffffff" strokeWidth="6" strokeOpacity="0.5" />
        </>
      );
    case 'spiral':
      return <path d="M50 42a8 8 0 1 1-8 8 18 18 0 1 0 18-18 28 28 0 1 0-28 28" />;
    case 'zigzag':
      return <path d="M10 70 L32 30 L50 70 L68 30 L90 70" />;
    case 'hook':
      return <path d="M52 10 v34 a19 19 0 1 1-19 19" />;
    case 'flag':
      return (
        <>
          <rect x="24" y="8" width="9" height="84" rx="4" />
          <path d="M33 14 h48 l-12 16 12 16 H33 Z" />
        </>
      );
    case 'boot':
      return <path d="M30 8 h22 v46 h18 a18 18 0 0 1 18 18 v20 H30 Z" />;
    case 'comma':
      return <path d="M60 20a23 23 0 1 0 4 45c-4 13-15 21-29 25 31-3 46-25 46-47A23 23 0 0 0 60 20z" />;
    case 'bear':
      return (
        <>
          <circle cx="24" cy="26" r="14" />
          <circle cx="76" cy="26" r="14" />
          <circle cx="50" cy="57" r="32" />
          <ellipse cx="50" cy="70" rx="16" ry="12" fill="#fff6e6" />
          <circle cx="38" cy="48" r="5" fill={INK} />
          <circle cx="62" cy="48" r="5" fill={INK} />
          <ellipse cx="50" cy="64" rx="6" ry="4.5" fill={INK} />
        </>
      );
    case 'cat':
      return (
        <>
          <path d="M20 44 L24 10 L46 28 Z" />
          <path d="M80 44 L76 10 L54 28 Z" />
          <circle cx="50" cy="58" r="31" />
          <circle cx="38" cy="52" r="5" fill={INK} />
          <circle cx="62" cy="52" r="5" fill={INK} />
          <path d="M50 62 L44 68 h12 Z" fill={INK} />
          <rect x="2" y="60" width="20" height="4" rx="2" fill={INK} />
          <rect x="78" y="60" width="20" height="4" rx="2" fill={INK} />
        </>
      );
    case 'rabbit':
      return (
        <>
          <ellipse cx="35" cy="24" rx="9" ry="23" />
          <ellipse cx="65" cy="24" rx="9" ry="23" />
          <circle cx="50" cy="66" r="26" />
          <circle cx="40" cy="62" r="4.5" fill={INK} />
          <circle cx="60" cy="62" r="4.5" fill={INK} />
          <ellipse cx="50" cy="72" rx="5" ry="4" fill={INK} />
        </>
      );
    case 'frog':
      return (
        <>
          <ellipse cx="50" cy="64" rx="37" ry="27" />
          <circle cx="30" cy="34" r="15" />
          <circle cx="70" cy="34" r="15" />
          <circle cx="30" cy="34" r="7" fill="#ffffff" />
          <circle cx="70" cy="34" r="7" fill="#ffffff" />
          <circle cx="31" cy="35" r="3.5" fill={INK} />
          <circle cx="71" cy="35" r="3.5" fill={INK} />
          <path d="M32 70 q18 13 36 0" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
        </>
      );
    case 'fish':
      return (
        <>
          <path d="M8 50 L36 28 V72 Z" />
          <ellipse cx="60" cy="50" rx="32" ry="23" />
          <path d="M52 27 L66 8 L72 30 Z" />
          <circle cx="78" cy="44" r="5" fill={INK} />
        </>
      );
    case 'bird':
      return (
        <>
          <path d="M6 74 L34 82 L36 60 Z" />
          <ellipse cx="46" cy="58" rx="29" ry="24" />
          <circle cx="70" cy="34" r="17" />
          <path d="M85 32 L100 39 L85 45 Z" fill="#ff9500" />
          <circle cx="74" cy="30" r="4.5" fill={INK} />
          <ellipse cx="44" cy="60" rx="15" ry="10" fill="#ffffff" fillOpacity="0.45" />
        </>
      );
    case 'bug':
      return (
        <>
          <path d="M34 20 L24 4" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
          <path d="M66 20 L76 4" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
          <circle cx="50" cy="26" r="14" />
          <ellipse cx="50" cy="62" rx="31" ry="32" />
          <rect x="47" y="34" width="6" height="58" rx="3" fill={INK} />
          <circle cx="34" cy="52" r="6" fill={INK} />
          <circle cx="66" cy="70" r="6" fill={INK} />
        </>
      );
    case 'turtle':
      return (
        <>
          <ellipse cx="18" cy="76" rx="11" ry="8" />
          <ellipse cx="82" cy="76" rx="11" ry="8" />
          <circle cx="84" cy="42" r="13" />
          <circle cx="88" cy="39" r="3.5" fill={INK} />
          <ellipse cx="46" cy="56" rx="36" ry="29" />
          <path d="M46 33 L64 47 L57 70 H35 L28 47 Z" fill="#ffffff" fillOpacity="0.35" />
        </>
      );
    case 'heart':
      return <path d="M50 90C20 68 8 52 8 35A22 22 0 0 1 50 23 22 22 0 0 1 92 35c0 17-12 33-42 55z" />;
    case 'plus':
      return <path d="M39 8h22v31h31v22H61v31H39V61H8V39h31z" />;
    default: {
      const pick = GEOMETRIC[hashOf(token) % GEOMETRIC.length] ?? 'circle';
      return glyphBody(pick);
    }
  }
}

function Glyph({
  token,
  color = INK,
  hollow = false,
  rot = 0,
  scale = 1,
  className = '',
}: {
  token: string;
  color?: string;
  hollow?: boolean;
  rot?: number;
  scale?: number;
  className?: string;
}) {
  const outline = hollow || STROKED.has(token);
  return (
    <svg
      className={`ob-glyph ${className}`}
      viewBox="0 0 100 100"
      role="presentation"
      style={{ color, transform: `rotate(${rot}deg) scale(${scale})` }}
    >
      <g
        fill={outline ? 'none' : 'currentColor'}
        stroke={outline ? 'currentColor' : 'none'}
        strokeWidth={outline ? 9 : 0}
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {glyphBody(token)}
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ cargo on a platform */

/** Quantity, as a pile of studs. The one thing this band reads without being taught. */
function Pile({ n, color = '#ffbe0b', max = 20 }: { n: number; color?: string; max?: number }) {
  const shown = Math.max(0, Math.min(max, Math.round(n)));
  return (
    <span className="ob-pile" data-n={shown}>
      {Array.from({ length: shown }).map((_, i) => (
        <span key={i} className="ob-stud" style={{ background: color }} />
      ))}
    </span>
  );
}

/** Positions on a grid, which several spatial types carry as their whole content. */
function BlockGrid({ blocks, cols = 4, color = INK }: { blocks: readonly number[]; cols?: number; color?: string }) {
  const max = blocks.reduce((m, b) => Math.max(m, b), 0);
  const rows = Math.max(cols, Math.ceil((max + 1) / cols));
  const lit = new Set(blocks);
  return (
    <span className="ob-bgrid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {Array.from({ length: cols * rows }).map((_, i) => (
        <span
          key={i}
          className={lit.has(i) ? 'ob-bcell on' : 'ob-bcell'}
          style={lit.has(i) ? { background: color } : undefined}
        />
      ))}
    </span>
  );
}

/**
 * One facet bag, standing on a platform.
 *
 * The order of these branches is the order of legibility at this band: a shape beats a number, a
 * number beats a word, and a word is very nearly worthless. When a bag carries nothing the adapter
 * could name, the platform's own badge is drawn large instead, so the platform is still a thing the
 * child can point at and choose rather than an empty grey rectangle.
 */
function Cargo({ facets: f, slot }: { facets: Facets; slot: number }) {
  const color = colorFor(f.color);
  const hollow = isHollow(f);
  const rot = degreesFor(f.rot);
  const scale = scaleFor(f.size);
  const leaning = f.tilt === 'leaning' || f.tilt === 'tilted';

  if (f.blocks && f.blocks.length > 0) {
    return <BlockGrid blocks={f.blocks} color={color === INK ? '#0a7bd8' : color} />;
  }

  const token = f.shape ?? f.glyph;
  if (token) {
    const copies = Math.max(1, Math.min(4, f.count ?? 1));
    return (
      <span className={leaning ? 'ob-cargo leaning' : 'ob-cargo'}>
        {Array.from({ length: copies }).map((_, i) => (
          <Glyph key={i} token={token} color={color} hollow={hollow} rot={rot} scale={scale} />
        ))}
      </span>
    );
  }

  const quantity = f.value ?? f.count;
  if (quantity !== undefined) {
    // A count of one with a colour is an identity, not a quantity, so it draws as a single tile in
    // that colour rather than as a lonely coin.
    if (quantity <= 1 && f.color) {
      return (
        <span className="ob-cargo">
          <Glyph token="square" color={color} hollow={hollow} rot={rot} scale={scale} />
        </span>
      );
    }
    return <Pile n={quantity} color={f.color ? color : '#ffbe0b'} />;
  }

  if (f.series && f.series.length > 0) {
    return (
      <span className="ob-series">
        {f.series.map((v, i) => (
          <span key={i} className="ob-bar" style={{ height: `${Math.max(8, Math.min(100, v * 9))}%` }} />
        ))}
      </span>
    );
  }

  if (f.seq && f.seq.length > 0) {
    return (
      <span className="ob-cargo">
        {f.seq.slice(0, 3).map((s, i) => (
          <Glyph key={i} token={s} color={COLOR_WHEEL[i % COLOR_WHEEL.length] ?? INK} scale={0.8} />
        ))}
      </span>
    );
  }

  if (f.text !== undefined) {
    return <span className="ob-word">{f.text}</span>;
  }

  return (
    <span className="ob-cargo">
      <Glyph token={slotStyle(slot).badge} color={slotStyle(slot).body} scale={1.05} />
    </span>
  );
}

/* ------------------------------------------------------------------ the character */

/** The blocky avatar: boxy head, boxy torso, four boxy limbs, permanent grin. */
function Noob({ pose }: { pose: 'idle' | 'jump' | 'bounce' | 'cheer' }) {
  return (
    <svg className={`ob-noob pose-${pose}`} viewBox="0 0 64 92" role="presentation">
      <defs>
        <linearGradient id="ob-skin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe14d" />
          <stop offset="1" stopColor="#e5b800" />
        </linearGradient>
        <linearGradient id="ob-shirt" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3aa0ff" />
          <stop offset="1" stopColor="#0a5fbf" />
        </linearGradient>
        <linearGradient id="ob-legs" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5ee06a" />
          <stop offset="1" stopColor="#25913a" />
        </linearGradient>
      </defs>
      <g className="ob-arm left">
        <rect x="2" y="30" width="12" height="27" rx="3" fill="url(#ob-skin)" />
      </g>
      <g className="ob-arm right">
        <rect x="50" y="30" width="12" height="27" rx="3" fill="url(#ob-skin)" />
      </g>
      <g className="ob-leg left">
        <rect x="17" y="58" width="13" height="30" rx="3" fill="url(#ob-legs)" />
      </g>
      <g className="ob-leg right">
        <rect x="34" y="58" width="13" height="30" rx="3" fill="url(#ob-legs)" />
      </g>
      <rect x="16" y="30" width="32" height="29" rx="3" fill="url(#ob-shirt)" />
      <rect x="16" y="30" width="32" height="6" rx="3" fill="#ffffff" fillOpacity="0.28" />
      <g className="ob-head">
        <rect x="14" y="2" width="36" height="27" rx="4" fill="url(#ob-skin)" />
        <rect x="14" y="2" width="36" height="6" rx="3" fill="#ffffff" fillOpacity="0.35" />
        <rect x="22" y="12" width="6" height="9" rx="3" fill="#1b2440" />
        <rect x="36" y="12" width="6" height="9" rx="3" fill="#1b2440" />
        <path d="M24 23 q8 6 16 0" fill="none" stroke="#1b2440" strokeWidth="3" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ the course */

function Trophy({ won, big = false }: { won: boolean; big?: boolean }) {
  return (
    <svg
      className={`ob-trophy${won ? ' won' : ''}${big ? ' big' : ''}`}
      viewBox="0 0 64 72"
      role="presentation"
    >
      <defs>
        <linearGradient id="ob-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe680" />
          <stop offset="0.5" stopColor="#ffc400" />
          <stop offset="1" stopColor="#d18f00" />
        </linearGradient>
      </defs>
      <path d="M12 4h40v16a20 20 0 0 1-40 0z" fill="url(#ob-gold)" />
      <path d="M12 8H4v6a12 12 0 0 0 10 12" fill="none" stroke="url(#ob-gold)" strokeWidth="6" />
      <path d="M52 8h8v6a12 12 0 0 1-10 12" fill="none" stroke="url(#ob-gold)" strokeWidth="6" />
      <rect x="27" y="38" width="10" height="14" fill="url(#ob-gold)" />
      <rect x="14" y="52" width="36" height="9" rx="3" fill="url(#ob-gold)" />
      <rect x="8" y="61" width="48" height="9" rx="3" fill="#e59a00" />
      <path d="M32 10 L35 18 L44 18 L37 23 L40 32 L32 26 L24 32 L27 23 L20 18 L29 18 Z" fill="#fff3c4" />
    </svg>
  );
}

/**
 * A pad on the course, lit once the character has stood on it.
 *
 * Only the middle pads carry a checkpoint flag. The spawn pad keeps its own colour so the child can
 * always see where the run began, and the finish pad has a checkered banner instead.
 */
function Pad({ lit, kind }: { lit: boolean; kind: 'start' | 'mid' | 'finish' }) {
  return (
    <span className={`ob-pad ${kind} ${lit ? 'lit' : ''}`}>
      <span className="ob-pad-top" />
      {kind === 'mid' ? (
        <span className="ob-checkpoint">
          <span className="ob-cp-pole" />
          <span className="ob-cp-flag" />
        </span>
      ) : null}
    </span>
  );
}

/* ------------------------------------------------------------------ the stem, as a picture */

function StemCell({ facets }: { facets: Facets | null }) {
  if (facets === null) {
    return (
      <span className="ob-cell hole">
        <span className="ob-holemark">?</span>
      </span>
    );
  }
  // A one-word facet like `cube` is a shape name wearing a label. Drawn as a shape it is legible at
  // this band; printed as the word `cube` it is not legible at all. A sentence stays a sign.
  const bare = facets.text !== undefined && /^[\w-]{1,14}$/.test(facets.text) ? facets.text : undefined;
  const token = facets.shape ?? facets.glyph ?? bare;
  return (
    <span className="ob-cell">
      {token ? (
        <Glyph
          token={token}
          color={colorFor(facets.color)}
          hollow={isHollow(facets)}
          rot={degreesFor(facets.rot)}
          scale={scaleFor(facets.size)}
        />
      ) : facets.value !== undefined || facets.count !== undefined ? (
        <Pile n={facets.value ?? facets.count ?? 0} color={colorFor(facets.color)} max={9} />
      ) : facets.blocks ? (
        <BlockGrid blocks={facets.blocks} />
      ) : (
        <span className="ob-word small">{facets.text ?? ''}</span>
      )}
    </span>
  );
}

/**
 * The setup for the gap, drawn.
 *
 * Every stem shape the adapter can produce has a branch, because an untreated one renders nothing and
 * turns the gap into a row of platforms with no reason to prefer any of them.
 *
 * `passage` is the exception, and deliberately. A passage is several sentences of prose with a written
 * question after it, which a five-year-old cannot read and will not sit through being read. So the
 * sentences are not drawn at all: the gap shows a closed book and the platforms alone. The item is
 * still answered and still scored; it is simply not pretended that the prose was available.
 */
function StemPicture({ question }: { question: Question }) {
  const s = question.stem;

  if (s.kind === 'compare') {
    // The two piles move onto the platforms themselves when there are exactly two choices, which is
    // every compare item this bank serves at K-1. Drawing them twice would only split the child's
    // attention, so the gap states the rule instead, in the only vocabulary available: a small heap
    // and a big heap, with the big one wearing the star. Every compare item in the K-1 slice of this
    // bank asks for the larger side, so the rule shown is the rule that applies.
    return (
      <div className="ob-stem rule">
        <span className="ob-heap">
          <Pile n={3} color="#7b859a" max={3} />
        </span>
        <span className="ob-heap pick">
          <Pile n={8} max={8} />
          <span className="ob-heap-star">
            <Glyph token="star" color="#ffc400" />
          </span>
        </span>
      </div>
    );
  }

  if (s.kind === 'matrix') {
    return (
      <div className="ob-stem">
        <span className="ob-grid" style={{ gridTemplateColumns: `repeat(${s.cols}, 1fr)` }}>
          {s.cells.map((cell, i) => (
            <StemCell key={i} facets={cell} />
          ))}
        </span>
      </div>
    );
  }

  if (s.kind === 'transform') {
    return (
      <div className="ob-stem">
        <div className="ob-machine">
          <StemCell facets={s.input} />
          <span className="ob-pipe">
            {s.chain.map((op, i) => (
              <span key={i} className="ob-badge">
                <Glyph token={op} color="#ffffff" scale={0.9} />
              </span>
            ))}
            <span className="ob-arrow" />
          </span>
          <span className="ob-cell hole">
            <span className="ob-holemark">?</span>
          </span>
        </div>
      </div>
    );
  }

  if (s.kind === 'target') {
    return (
      <div className="ob-stem">
        <div className="ob-goal">
          <span className="ob-goalrow">
            {s.target.slice(0, 8).map((f, i) => (
              <StemCell key={i} facets={f} />
            ))}
          </span>
          <span className="ob-equals" />
          <span className="ob-cell hole">
            <span className="ob-holemark">?</span>
          </span>
        </div>
      </div>
    );
  }

  if (s.kind === 'constraints') {
    return (
      <div className="ob-stem">
        <div className="ob-notes">
          {s.clues.slice(0, 4).map((clue, i) => (
            <span key={i} className="ob-note">
              <span className="ob-note-dot" />
              <span className="ob-note-text">{clue}</span>
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (s.kind === 'passage') {
    return (
      <div className="ob-stem">
        <span className="ob-book" />
      </div>
    );
  }

  if (s.kind === 'pairs') {
    return (
      <div className="ob-stem rule">
        <span className="ob-oddmark" />
      </div>
    );
  }

  return null;
}

/* ------------------------------------------------------------------ the app */

const CONFETTI = ['#e2231a', '#0a7bd8', '#ffc400', '#3bb143', '#9146ff', '#ff7a00', '#00c2d1', '#ff4fa3'];

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return reduced;
}

type Flash = { readonly kind: 'land' | 'bounce'; readonly id: number };

export default function Obby() {
  const reduced = useReducedMotion();
  const [progress, setProgress] = useState<Progress>(() => loadProgress(meta.id));
  const [courseLength, setCourseLength] = useState(6);
  const [position, setPosition] = useState(0);
  const [coins, setCoins] = useState(0);
  const [flash, setFlash] = useState<Flash | null>(null);
  const [picked, setPicked] = useState<string | null>(null);

  const session = useQuestionSession({
    ageBand: 'K-1',
    // Taster: four to six gaps. A five-year-old will not sit through a longer course, and a course
    // they abandon halfway measures less than a short one they finish.
    precisionIndex: 0,
    onAnswered: ({ correct }) => {
      // An item the server could not mark is not the child's doing. The engine already excludes it
      // from the estimate, so it carries them forward rather than bouncing them for a fault that is
      // the bank's. Only a genuine miss bounces, and a bounce costs nothing but the hop.
      const landed = correct !== false;
      if (landed) {
        setPosition((p) => Math.min(p + 1, courseLength));
        setCoins((c) => c + 1);
      }
      setFlash({ kind: landed ? 'land' : 'bounce', id: Date.now() });
      setPicked(null);
    },
    onFinished: (result) => {
      setProgress(recordRound(meta.id, result.itemsServed).progress);
    },
  });

  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(null), reduced ? 260 : 1150);
    return () => window.clearTimeout(t);
  }, [flash, reduced]);

  /**
   * The victory lap.
   *
   * However far the character actually hopped, the course carries them the rest of the way once the
   * run is over. The trophy is for finishing the run, not for being right about it, which is the same
   * rule `shared/progression` enforces on the currency: nothing here is contingent on correctness.
   */
  useEffect(() => {
    if (session.phase !== 'finished') return;
    if (reduced) {
      setPosition(courseLength);
      return;
    }
    let hops = 0;
    const id = window.setInterval(() => {
      hops += 1;
      setPosition((p) => Math.min(courseLength, p + 1));
      if (hops >= courseLength) window.clearInterval(id);
    }, 430);
    return () => window.clearInterval(id);
  }, [session.phase, courseLength, reduced]);

  const begin = useCallback(() => {
    setCourseLength(session.expectedItems?.max ?? 6);
    setPosition(0);
    setCoins(0);
    setFlash(null);
    setPicked(null);
    void session.start();
  }, [session]);

  const again = useCallback(() => {
    setPosition(0);
    setCoins(0);
    setFlash(null);
    setPicked(null);
    session.reset();
  }, [session]);

  const jump = useCallback(
    async (choice: Choice) => {
      if (session.busy) return;
      setPicked(choice.key);
      await session.answer(choice);
    },
    [session],
  );

  const question = session.question;
  const finished = session.phase === 'finished';
  const atFinish = position >= courseLength;
  const stops = courseLength + 1;

  const pose: 'idle' | 'jump' | 'bounce' | 'cheer' =
    finished && atFinish ? 'cheer' : flash?.kind === 'land' ? 'jump' : flash?.kind === 'bounce' ? 'bounce' : 'idle';

  return (
    <div className="ob">
      {/* ---------------------------------------------------------------- the course */}
      <div className="ob-sky">
        <span className="ob-cloud a" />
        <span className="ob-cloud b" />
        <span className="ob-cloud c" />
        <span className="ob-sun" />

        <div className="ob-course">
          {Array.from({ length: stops }).map((_, i) => {
            const left = `${(i / courseLength) * 100}%`;
            if (i === courseLength) {
              return (
                <div key="finish" className="ob-stop finish" style={{ left }}>
                  <Trophy won={atFinish} />
                  <span className="ob-banner" />
                  <Pad lit={atFinish} kind="finish" />
                </div>
              );
            }
            return (
              <div key={i} className="ob-stop" style={{ left }}>
                {i > 0 && i > position ? <span className="ob-coin" /> : null}
                <Pad lit={i <= position} kind={i === 0 ? 'start' : 'mid'} />
              </div>
            );
          })}

          <div
            className="ob-runner"
            style={{ left: `${(position / courseLength) * 100}%` }}
            data-pos={position}
          >
            <div key={flash?.id ?? 'still'} className={`ob-hop ${pose}`}>
              <Noob pose={pose} />
            </div>
            {/* The spring belongs on whatever bounced, not in the middle of the screen. */}
            {flash?.kind === 'bounce' ? (
              <span className="ob-spring" key={`spring-${flash.id}`} aria-hidden="true">
                <span className="ob-coil" />
                <span className="ob-coil" />
                <span className="ob-coil" />
              </span>
            ) : null}
          </div>
        </div>

        <div className="ob-ground" />
      </div>

      {/* ---------------------------------------------------------------- the gap */}
      <div className="ob-stage">
        {/* Small, dim and off to the side: this line is for the adult in the room, not the player. */}
        <p className="ob-adult">
          Obby Run · ages 5–7 · nothing here is read aloud, and no answer is ever marked wrong
        </p>

        {session.phase === 'idle' ? (
          <div className="ob-cold">
            <button type="button" className="ob-go" onClick={begin} aria-label="Start the run">
              <svg viewBox="0 0 100 100" role="presentation">
                <path d="M36 24 L78 50 L36 76 Z" fill="#ffffff" />
              </svg>
            </button>
            <span className="ob-point" />
            {progress.rounds > 0 ? (
              <span className="ob-tally" aria-label={`${progress.rounds} runs finished`}>
                {Array.from({ length: Math.min(8, progress.rounds) }).map((_, i) => (
                  <span key={i} className="ob-tallycoin" />
                ))}
              </span>
            ) : null}
          </div>
        ) : null}

        {session.phase === 'starting' ? (
          <div className="ob-cold">
            <span className="ob-spinner" />
          </div>
        ) : null}

        {session.phase === 'error' ? (
          <div className="ob-cold">
            <button type="button" className="ob-go retry" onClick={begin} aria-label="Try the run again">
              <svg viewBox="0 0 100 100" role="presentation">
                <path
                  d="M50 18a32 32 0 1 0 30 42"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="11"
                  strokeLinecap="round"
                />
                <path d="M50 4 L50 32 L28 18 Z" fill="#ffffff" />
              </svg>
            </button>
            <p className="ob-adult error">{session.error}</p>
          </div>
        ) : null}

        {session.phase === 'asking' ? (
          <div className="ob-gap">
            {question ? <StemPicture question={question} /> : null}
            <span className="ob-qblock" aria-hidden="true">
              ?
            </span>
          </div>
        ) : null}

        {finished ? (
          <div className="ob-cold win">
            {/* The trophy is for finishing the run, not for being right about it, which is the same
                rule the currency in `shared/progression` follows. Every child who reaches here gets
                exactly this screen. */}
            <div className="ob-prizerow">
              <div className="ob-prize">
                <span className="ob-rays" />
                <Trophy won big />
              </div>
              <span className="ob-winrow">
                {Array.from({ length: Math.max(1, coins) }).map((_, i) => (
                  <span key={i} className="ob-tallycoin big" style={{ animationDelay: `${i * 90}ms` }} />
                ))}
              </span>
            </div>
            <button type="button" className="ob-go" onClick={again} aria-label="Run it again">
              <svg viewBox="0 0 100 100" role="presentation">
                <path
                  d="M50 18a32 32 0 1 0 30 42"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="11"
                  strokeLinecap="round"
                />
                <path d="M50 4 L50 32 L28 18 Z" fill="#ffffff" />
              </svg>
            </button>
          </div>
        ) : null}
      </div>

      {/* ---------------------------------------------------------------- the platforms */}
      <div className="ob-platforms">
        {session.phase === 'asking' && question
          ? visualChoices(question.choices).map((vc, i) => (
              <PlatformButton
                key={vc.choice.key}
                vc={vc}
                index={i}
                question={question}
                picked={picked === vc.choice.key}
                disabled={session.busy}
                onPick={jump}
              />
            ))
          : Array.from({ length: 3 }).map((_, i) => <span key={i} className="ob-plat ghost" />)}
      </div>

      {/* ---------------------------------------------------------------- landing */}
      {flash?.kind === 'land' ? (
        <div className="ob-burst" key={flash.id} aria-hidden="true">
          {Array.from({ length: 20 }).map((_, i) => (
            <span
              key={i}
              className="ob-conf"
              style={{
                ['--a' as string]: `${i * 18}deg`,
                ['--d' as string]: `${130 + (i % 5) * 38}px`,
                ['--c' as string]: CONFETTI[i % CONFETTI.length] ?? '#ffc400',
                ['--t' as string]: `${(i % 6) * 35}ms`,
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ one platform */

function PlatformButton({
  vc,
  index,
  question,
  picked,
  disabled,
  onPick,
}: {
  vc: VisualChoice;
  index: number;
  question: Question;
  picked: boolean;
  disabled: boolean;
  onPick: (choice: Choice) => void | Promise<void>;
}) {
  const style = slotStyle(vc.slot);
  const stem = question.stem;

  /**
   * What stands on this platform.
   *
   * Two stems put their content on the platforms rather than in the gap. `compare` serves two options
   * whose facet bags are empty — the counts live on the stem's left and right — so without this the
   * child is asked to choose between two blank pads. `pairs` does the same: the adapter marks the
   * choices as stem rows and leaves the shapes behind on the stem.
   */
  let cargo: ReactNode;
  if (stem.kind === 'compare' && question.choices.length === 2) {
    const side = index === 0 ? stem.left : stem.right;
    cargo = <Pile n={side.count ?? 0} color="#ffbe0b" />;
  } else if (stem.kind === 'pairs') {
    const row = stem.rows[index];
    cargo = row ? (
      <span className="ob-cargo">
        <StemCell facets={row.left} />
        <StemCell facets={row.right} />
      </span>
    ) : (
      <Cargo facets={vc.facets} slot={vc.slot} />
    );
  } else {
    cargo = <Cargo facets={vc.facets} slot={vc.slot} />;
  }

  return (
    <button
      type="button"
      className={`ob-plat ${picked ? 'picked' : ''}`}
      style={{ ['--body' as string]: style.body, ['--edge' as string]: style.edge }}
      disabled={disabled}
      onClick={() => void onPick(vc.choice)}
      aria-label={`Jump to the ${style.name} platform`}
    >
      <span className="ob-plat-face">
        <span className="ob-plat-plate">{cargo}</span>
      </span>
      <span className="ob-plat-edge">
        <Glyph token={style.badge} color="#ffffff" scale={0.55} className="ob-plat-badge" />
      </span>
    </button>
  );
}
