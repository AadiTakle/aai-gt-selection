/**
 * Brackenhollow's ink and light.
 *
 * ONE RULE ABOVE ALL: there is no black here. The darkest value in the world is `bark`, a warm brown,
 * because a picture-book hollow lit by late sun has no true black in it and a #000 outline is the
 * single fastest way to make hand-drawn artwork look like a wireframe.
 *
 * THE SIX BANK COLOUR NAMES ARE MAPPED, ALL SIX. `shared/glyphs.tsx` says why in detail and it is a
 * correctness constraint rather than a taste one: a matrix or carpet item whose active rule is
 * `color` is only answerable while distinct names stay visibly distinct. So the mapping below is
 * spread across LIGHTNESS as well as hue — bark, river, moss, dusk, ember, honey runs dark to light
 * in that order — which keeps the rule readable to the common colour-vision deficiencies too.
 */

/** The world's own surfaces. Nothing in this list is neutral grey; everything leans warm. */
export const HUE = {
  /** Page. Late-afternoon paper. */
  paper: '#f8f0e1',
  paperDeep: '#efe0c8',
  /** Where light pools. */
  mist: '#fdf8ee',
  /** The darkest ink in Brackenhollow. */
  bark: '#4b3626',
  barkSoft: '#7d654c',
  /** Growing things. */
  moss: '#5b8a55',
  mossDeep: '#3d6647',
  fern: '#8aac5f',
  frond: '#a8c47a',
  /** Warm things. */
  honey: '#e0a63f',
  ember: '#d4694a',
  rosehip: '#b8503f',
  /** Cool things, kept warm-sided so nothing reads as a blue-purple gradient. */
  river: '#4d7f96',
  dusk: '#8a6a95',
  /** Stone. */
  stone: '#b9a68c',
  stoneDeep: '#8e7a61',
} as const;

/**
 * The bank's six colour names, retold as things in this hollow.
 *
 * Kept as a plain record so a name the bank grows later is noticed (see `BRACKEN_SKIN`'s startup
 * check) rather than silently folded onto one of these.
 */
export const BANK_HUE: Record<string, string> = {
  ink: HUE.bark,
  blue: HUE.river,
  teal: '#4f8a6b',
  violet: HUE.dusk,
  coral: HUE.ember,
  gold: HUE.honey,
};

/** Warm-to-cool order, used when an unknown name has to be given a stable distinct fill. */
const HUE_RING = Object.values(BANK_HUE);

/**
 * A stable fill for a colour name.
 *
 * An unknown name is hashed into the ring rather than folded onto one default, because two unknown
 * names sharing a fill turns a colour-rule item into a coin flip. Deterministic, so the same name is
 * the same colour across renders and reloads.
 */
export function brackenColor(name: string): string {
  const known = BANK_HUE[name];
  if (known) return known;
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return HUE_RING[h % HUE_RING.length] ?? HUE.moss;
}

/** Mix a hex toward bark (negative) or mist (positive). Enough for outlines and gleams. */
export function shade(hex: string, amount: number): string {
  const raw = hex.replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  const n = Number.parseInt(full, 16);
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  // Toward bark rather than toward black, so a darkened green stays a warm green.
  const toward = amount < 0 ? [75, 54, 38] : [253, 248, 238];
  const t = Math.abs(amount);
  return `#${rgb
    .map((c, i) => Math.round(c + ((toward[i] ?? c) - c) * t))
    .map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0'))
    .join('')}`;
}

/**
 * The four seasons the hollow turns through on the wall clock, whether or not anyone visits.
 *
 * Absence is never punished, so a season is pure novelty: it re-lights the whole world and costs the
 * child nothing to have missed. Each is a light, a ground and an accent, and no two are close enough
 * to be mistaken for a redraw of the same afternoon.
 */
export interface SeasonLook {
  id: Season;
  sky: readonly [string, string];
  ground: string;
  canopy: string;
  ridge: string;
  accent: string;
  /** The one round light in the sky. */
  lamp: string;
}

export type Season = 'greening' | 'high' | 'ember' | 'hush';

export const SEASONS: readonly Season[] = ['greening', 'high', 'ember', 'hush'];

export const SEASON_LOOK: Record<Season, SeasonLook> = {
  greening: {
    id: 'greening',
    sky: ['#fdf6e6', '#ddecd2'],
    ground: '#cfe0b6',
    canopy: '#7fa85c',
    ridge: '#4e7b47',
    accent: HUE.frond,
    lamp: '#f6e6b0',
  },
  high: {
    id: 'high',
    sky: ['#fdf3dd', '#f6dfae'],
    ground: '#d8dda3',
    canopy: '#6f9a4e',
    ridge: '#456f42',
    accent: HUE.honey,
    lamp: '#f7dc95',
  },
  ember: {
    id: 'ember',
    sky: ['#fdeeda', '#f3cfa8'],
    ground: '#dfcb9c',
    canopy: '#b7823f',
    ridge: '#7d5a34',
    accent: HUE.ember,
    lamp: '#f2c07a',
  },
  hush: {
    id: 'hush',
    sky: ['#f2ecdf', '#cfd3c9'],
    ground: '#dcd8c6',
    canopy: '#8d9b84',
    ridge: '#5c6357',
    accent: HUE.dusk,
    lamp: '#efeadc',
  },
};

/** One easing curve for the whole world. */
export const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
