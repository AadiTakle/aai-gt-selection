/**
 * WHAT A SLIME LOOKS LIKE — the whole art direction as data, with no three.js in it.
 *
 * Twenty-four looks come out of two orthogonal tables and nothing else, which is the only way twenty
 * four stay maintainable: a FAMILY decides hue, silhouette profile and what grows out of the body; a
 * STAGE decides proportion, and above all the eye-to-body ratio. Neither table knows about the other.
 *
 * ONE RULE INHERITED FROM `world/palette.ts`, AND IT IS THE IMPORTANT ONE: there is no black here.
 * The darkest value any slime is allowed is `BARK`, a warm brown. A #000 iris on a saturated toy is
 * the single fastest way to make a friendly creature look like a plastic doll, so even the pupils are
 * brown. Values are duplicated rather than imported because `world/` is another track's file and this
 * one must not break when they retune a season.
 *
 * WHY THE SILHOUETTES ARE SHAPED THE WAY THEY ARE. A five-year-old sorts by outline before colour, so
 * a family has to survive being a black shape at thirty pixels. The six are pulled apart on the two
 * axes a blob has — how tall it is, and where its mass sits:
 *
 *            squat  ·  waist  ·  tall            mass low        mass high
 *   bellow   ▓▓▓▓▓▓                              heavy skirt     —
 *   cobble   ▓▓▓▓                                broad facets    —
 *   rill              ▓▓▓▓                       round belly     drawn to a point
 *   fern              ▓▓▓▓                       —               leaf crest
 *   ember                    ▓▓▓▓                narrow foot     flame taper
 *   kite                     ▓▓▓▓▓▓              tiny foot       fins
 *
 * No two of those share both a height class and a mass placement, so no two share a silhouette.
 */
import type { Family, Stage } from '../contract';

/* ============================================================================
   the ink
   ========================================================================== */

/** The darkest value in the hollow. Nothing here may be darker, and nothing may be neutral grey. */
export const BARK = '#4b3626';
/** Where light pools: the paper-white used for gleams and sclera. Never #fff. */
export const MIST = '#fdf8ee';

/* ============================================================================
   family
   ========================================================================== */

/**
 * A body profile, evaluated over the unit sphere when the geometry is baked.
 *
 * `waist` is the whole silhouette trick. It is a list of (height, radius-multiplier) stops read as a
 * smooth curve from the bottom of the body to the top, so a droplet, a barrel and a pear are the same
 * eight lines of code with different numbers in them.
 */
export interface Profile {
  /** Radius multiplier at heights -1 (bottom) through +1 (top). Read as a smooth spline. */
  waist: readonly number[];
  /** Overall height against width. <1 squat, >1 tall. */
  aspect: number;
  /** How much the bottom flattens where it meets the ground, 0..1. */
  sit: number;
  /** Broad rounded facets, for stone. Amplitude of a quantised low-frequency lump field. */
  facet: number;
  /** Soft organic lumpiness. Amplitude of a smooth three-lobe field. */
  lump: number;
  /** Turns per unit height, for a flame's lean. */
  twist: number;
}

/** What sprouts from the body. Every family gets a different kit so the top halves differ too. */
export type CrestKind = 'none' | 'leaf' | 'fin' | 'pebble' | 'flame' | 'droplet' | 'fold';

export interface FamilyLook {
  /** Body colour, mid-tone. */
  skin: string;
  /** What the light looks like coming through the body. Lighter and MORE saturated than `skin`. */
  inner: string;
  /** Contour, markings, crest undersides. A darkened relative of `skin`, never a grey. */
  accent: string;
  /** Crest / fin / leaf top colour. */
  crest: string;
  /** The nucleus suspended in the jelly. */
  core: string;
  /** Added rim colour. Ember's is hot; everything else takes the paper-light. */
  rim: string;
  /** How much light bleeds through the body, 0..1. Watery high, stony low. */
  translucency: number;
  /** Wet gleam tightness. Stone is broad and dull, water is tight and bright. */
  gloss: number;
  /** Self-lit warmth, 0 for everything but ember. */
  glow: number;
  profile: Profile;
  crestKind: CrestKind;
  /** Wobble speed multiplier. A heavy slime wobbles slowly. */
  jiggle: number;
  /** Iris colour. Warm browns and greens only. */
  iris: string;
}

export const FAMILY_LOOK: Record<Family, FamilyLook> = {
  /** Low, wide, heavy. A bellows in a forge: sits like a beanbag and has a skirt where it meets the ground. */
  bellow: {
    skin: '#dfa03a',
    inner: '#ffe4a6',
    accent: '#a3652a',
    crest: '#c8832c',
    core: '#fff1cd',
    rim: '#fdf1d4',
    translucency: 0.5,
    gloss: 42,
    glow: 0,
    profile: { waist: [1.02, 1.1, 1.06, 0.94, 0.74, 0.48], aspect: 0.62, sit: 0.5, facet: 0, lump: 0.05, twist: 0 },
    crestKind: 'fold',
    jiggle: 0.72,
    iris: '#4b3626',
  },

  /** Smooth droplet. The one family with no lumps at all: a single unbroken curve drawn to a point. */
  rill: {
    skin: '#57a2bb',
    inner: '#bdeef7',
    accent: '#2f6580',
    crest: '#79c9dd',
    core: '#e6fbff',
    rim: '#eaf9ff',
    translucency: 0.95,
    gloss: 130,
    glow: 0,
    profile: { waist: [0.78, 1.0, 1.02, 0.9, 0.62, 0.16], aspect: 1.06, sit: 0.28, facet: 0, lump: 0, twist: 0 },
    crestKind: 'droplet',
    jiggle: 1.25,
    iris: '#2f5568',
  },

  /** Chunky and stony. Rounded facets, never sharp ones, and a shelf of pebbles round the shoulder. */
  cobble: {
    skin: '#c48f6b',
    inner: '#f3d3b0',
    accent: '#7a5334',
    crest: '#a5754f',
    core: '#ffe9cc',
    rim: '#f7e3cc',
    translucency: 0.3,
    gloss: 18,
    glow: 0,
    profile: { waist: [0.98, 1.08, 1.04, 1.0, 0.86, 0.5], aspect: 0.78, sit: 0.42, facet: 0.11, lump: 0.05, twist: 0 },
    crestKind: 'pebble',
    jiggle: 0.62,
    iris: '#4b3626',
  },

  /** Upright and warm, tapering like a held flame, lit softly from inside. */
  ember: {
    skin: '#d75f3c',
    inner: '#ffb877',
    accent: '#993326',
    crest: '#f39152',
    core: '#ffd7a0',
    rim: '#ffb271',
    translucency: 0.8,
    gloss: 70,
    glow: 0.55,
    profile: { waist: [0.7, 0.98, 1.04, 0.92, 0.66, 0.3], aspect: 1.2, sit: 0.3, facet: 0, lump: 0.04, twist: 0.16 },
    crestKind: 'flame',
    jiggle: 1.05,
    iris: '#5c2a1e',
  },

  /** Botanical. A round seed body under a crest of real leaves, plus a bud at the shoulder. */
  fern: {
    skin: '#6da04c',
    inner: '#d3ec9b',
    accent: '#3c6738',
    crest: '#8fb45c',
    core: '#f0ffd0',
    rim: '#eef7d8',
    translucency: 0.62,
    gloss: 34,
    glow: 0,
    profile: { waist: [0.9, 1.06, 1.05, 0.96, 0.78, 0.42], aspect: 0.9, sit: 0.4, facet: 0, lump: 0.07, twist: 0 },
    crestKind: 'leaf',
    jiggle: 0.95,
    iris: '#3c5c30',
  },

  /** Light and tall on a small foot, with paired fins. The only family that reads as ready to lift. */
  kite: {
    skin: '#8d78b6',
    inner: '#e6d4f7',
    accent: '#574179',
    crest: '#b49ad8',
    core: '#f6ecff',
    rim: '#f0e6ff',
    translucency: 0.85,
    gloss: 95,
    glow: 0.08,
    profile: { waist: [0.5, 0.86, 1.02, 1.0, 0.82, 0.34], aspect: 1.34, sit: 0.2, facet: 0, lump: 0.03, twist: -0.08 },
    crestKind: 'fin',
    jiggle: 1.45,
    iris: '#453163',
  },
};

/* ============================================================================
   stage
   ========================================================================== */

/**
 * Growing up, and the one number that does the work.
 *
 * `eye` falls from 1 to 0.46 across the four stages while the body grows, and that RATIO — not the
 * absolute eye size — is what makes a pip read as an infant and a warden read as an adult. It is the
 * same trick every animation studio uses on a baby character, and it is why the pip's eyes are drawn
 * nearly as wide as its whole face.
 *
 * `lid` is the second half of it. A pip's eye is uncovered, wide and startled; a warden carries a
 * heavy lid and a brow, which is the entire difference between "cute" and "dignified" on one mesh.
 */
export interface StageLook {
  /** World-units tall, before `growth`. */
  size: number;
  /** Multiplies the family aspect. Babies are rounder than their adult profile. */
  round: number;
  /** Eye radius as a fraction of body half-width. THE number. */
  eye: number;
  /** Eye separation, as a fraction of body half-width. */
  eyeGap: number;
  /** Eye height up the body, -1..1. */
  eyeRise: number;
  /** How far the resting lid comes down the eye, 0..1. */
  lid: number;
  /** Brow presence above the eye, 0..1. */
  brow: number;
  /** Crest size against the body. Pips have a nub. */
  crestScale: number;
  /** How many crest pieces. */
  crestCount: number;
  /** Nucleus visibility. Invisible in a pip, defined in a warden. */
  coreShow: number;
  /** Mouth width against body. */
  mouth: number;
  /** Extra marking coverage a grown slime accumulates. */
  markScale: number;
  /** Wobble amplitude. Small slimes are springier. */
  jiggle: number;
}

export const STAGE_LOOK: Record<Stage, StageLook> = {
  /** Tiny and round, and almost all eye. Barely a silhouette yet — that is the point of a baby. */
  pip: {
    size: 0.42,
    round: 0.78,
    eye: 1.0,
    eyeGap: 0.5,
    eyeRise: 0.1,
    lid: 0,
    brow: 0,
    crestScale: 0.34,
    crestCount: 1,
    coreShow: 0,
    mouth: 0.5,
    markScale: 0.55,
    jiggle: 1.5,
  },
  /** A toddler: taking on the family shape, eyes still far too big for it. */
  tuffet: {
    size: 0.68,
    round: 0.9,
    eye: 0.76,
    eyeGap: 0.56,
    eyeRise: 0.16,
    lid: 0.06,
    brow: 0.12,
    crestScale: 0.66,
    crestCount: 2,
    coreShow: 0.35,
    mouth: 0.72,
    markScale: 0.8,
    jiggle: 1.2,
  },
  /** Adolescent, and the reference silhouette: the family profile at full strength, crest up. */
  crested: {
    size: 0.98,
    round: 1.0,
    eye: 0.6,
    eyeGap: 0.6,
    eyeRise: 0.2,
    lid: 0.14,
    brow: 0.34,
    crestScale: 1.0,
    crestCount: 3,
    coreShow: 0.7,
    mouth: 0.88,
    markScale: 1.0,
    jiggle: 1.0,
  },
  /** Grown. Large, deliberate, heavy-lidded, and the only stage with a full crown. */
  warden: {
    size: 1.36,
    round: 1.06,
    eye: 0.46,
    eyeGap: 0.62,
    eyeRise: 0.24,
    lid: 0.24,
    brow: 0.6,
    crestScale: 1.34,
    crestCount: 5,
    coreShow: 1,
    mouth: 1.0,
    markScale: 1.25,
    jiggle: 0.82,
  },
};

const ORDER: readonly Stage[] = ['pip', 'tuffet', 'crested', 'warden'];

/**
 * The look for one slime, with `growth` easing it toward what it is about to become.
 *
 * Growth is deliberately partial: size and crest move most of the way to the next stage, eye ratio
 * moves only a third. A slime that is nearly ready to grow should look like it is outgrowing its
 * proportions, which is what a child actually notices about a pet, and the eyes are the last thing to
 * catch up.
 */
export function resolveStage(stage: Stage, growth: number): StageLook {
  const g = Math.min(1, Math.max(0, growth));
  const here = STAGE_LOOK[stage];
  const next = STAGE_LOOK[ORDER[Math.min(ORDER.length - 1, ORDER.indexOf(stage) + 1)] ?? stage];
  const mix = (a: number, b: number, t: number) => a + (b - a) * t;
  const soft = g * 0.62;
  const slow = g * 0.3;
  return {
    size: mix(here.size, next.size, soft),
    round: mix(here.round, next.round, soft),
    eye: mix(here.eye, next.eye, slow),
    eyeGap: mix(here.eyeGap, next.eyeGap, slow),
    eyeRise: mix(here.eyeRise, next.eyeRise, soft),
    lid: mix(here.lid, next.lid, slow),
    brow: mix(here.brow, next.brow, soft),
    crestScale: mix(here.crestScale, next.crestScale, soft),
    crestCount: here.crestCount,
    coreShow: mix(here.coreShow, next.coreShow, soft),
    mouth: mix(here.mouth, next.mouth, soft),
    markScale: mix(here.markScale, next.markScale, soft),
    jiggle: mix(here.jiggle, next.jiggle, soft),
  };
}

/* ============================================================================
   markings
   ========================================================================== */

/**
 * `Slime.markings` is a list of free strings the care verbs accumulate, and this file is not allowed
 * to decide what those strings will be. So every string is hashed into a coat instead: a KIND, a
 * scale, a placement and a tint. Six names are recognised outright so the world track can ask for a
 * specific coat when it wants one, and anything else still lands somewhere sensible and, critically,
 * lands in the SAME place every reload.
 */
export type MarkKind = 0 | 1 | 2 | 3;
/** 0 spots · 1 bands · 2 dapples · 3 saddle patch. */
const NAMED: Record<string, MarkKind> = {
  spots: 0,
  spot: 0,
  freckle: 0,
  freckles: 0,
  bands: 1,
  band: 1,
  ring: 1,
  rings: 1,
  stripe: 1,
  dapple: 2,
  dapples: 2,
  mottle: 2,
  patch: 3,
  saddle: 3,
  cap: 3,
};

export interface Mark {
  kind: MarkKind;
  /** Feature frequency. */
  scale: number;
  /** Rotates the whole pattern, so two coats of one kind never sit on top of each other. */
  phase: number;
  /** How much of the body it takes, 0..1. */
  coverage: number;
  /** 0 accent, 1 crest, 2 inner. Kept as an index so the shader picks from colours it already has. */
  tint: 0 | 1 | 2;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** At most three coats are drawn. A fourth would turn any slime into camouflage. */
export const MAX_MARKS = 3;

export function resolveMarks(markings: readonly string[] | undefined): Mark[] {
  if (!markings || markings.length === 0) return [];
  const out: Mark[] = [];
  for (const raw of markings.slice(0, MAX_MARKS)) {
    const key = raw.trim().toLowerCase();
    const h = hash(key);
    const named = NAMED[key];
    out.push({
      kind: named ?? ((h % 4) as MarkKind),
      scale: 2.4 + ((h >>> 3) % 100) / 100 * 4.2,
      phase: ((h >>> 11) % 628) / 100,
      coverage: 0.3 + ((h >>> 17) % 100) / 100 * 0.34,
      tint: (((h >>> 23) % 3) as 0 | 1 | 2),
    });
  }
  return out;
}
