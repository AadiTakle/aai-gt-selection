/**
 * WHAT A SLIME LOOKS LIKE — the whole art direction as data, with no three.js in it.
 *
 * Twenty-four looks come out of two orthogonal tables and nothing else, which is the only way twenty
 * four stay maintainable: a FAMILY decides hue, material feel, surface relief and what grows out of the
 * body; a STAGE decides proportion, and above all the eye-to-body ratio. Neither table knows about the
 * other.
 *
 * ONE RULE INHERITED FROM `world/palette.ts`, AND IT IS THE IMPORTANT ONE: there is no black here.
 * The darkest value any slime is allowed is `BARK`, a warm brown. A #000 iris on a saturated toy is
 * the single fastest way to make a friendly creature look like a plastic doll, so even the pupils are
 * brown. Values are duplicated rather than imported because `world/` is another track's file and this
 * one must not break when they retune a season.
 *
 * THERE IS ALSO NO NEUTRAL GREY, and `rock` is where that rule earns its keep. A stone slime wants to
 * read as grey, and the temptation is `#999`. A flat neutral next to five saturated bodies reads as an
 * ABSENCE of colour — as an untextured placeholder — so rock's greys are all pulled toward violet. They
 * still read as stone; they just belong to the same world as the others.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────────────
 * WHY THESE SIX, AND WHY THEY ARE OBJECTS NOW.
 *
 * The families used to be named after silhouette words — bellow, rill, cobble, ember, fern, kite — and
 * that table was built on a defensible idea: pull the six apart on the two axes a blob has, height and
 * where its mass sits, and no two will share an outline. It worked, and it still was not enough. A
 * five-year-old does not sort by "squat with a heavy skirt"; a child sorts by OBJECT. Six coloured
 * gumdrops of slightly different proportion are six coloured gumdrops.
 *
 * So each family is now a THING, and the thing owns three of the four channels a creature has:
 *
 *              colour                   material              signature feature (breaks the OUTLINE)
 *   waffle     golden brown             baked, waxy sheen     wavy syrup drip line + a butter pat
 *   rose       deep pink                soft petal bloom      a rosette of petal tips + sepals below
 *   grass      fresh green              leafy, low gloss      a tuft of tall blades + a daisy
 *   rock       violet-grey              dry, unlit stone      squattest body, mossy mounds, boulders
 *   fairy      violet, lit from within  translucent, glowing  a pair of wings + antennae
 *   frost      pale ice blue            wet ice, high coat    a crown of ice spires + a rime skirt
 *
 * THE SILHOUETTE TEST IS THE WHOLE JOB. A texture cannot be seen from across the ranch, so every
 * signature feature above is GEOMETRY that changes the outline: a child at thirty pixels sees a block on
 * top (waffle), a scalloped crown (rose), thin blades (grass), a wide low lump (rock), wings (fairy),
 * spires over a flared skirt (frost). Colour and material are the confirmation up close, never the read.
 *
 * WHAT SURVIVED THE RE-THEME UNTOUCHED, because the owner approved it: `STAGE_LOOK` and `resolveStage`,
 * and above all the `eye` ratio falling from 1.0 at pip to 0.46 at warden. That one number is what makes
 * a baby read as a baby. `jiggle` likewise, and every rule about the ink.
 *
 * The old `Profile` and `CrestKind` types are GONE rather than rekeyed. They were already dead — bodies
 * come from `GUMDROP` in `gumdrop.ts` and features from `featureGeometry` in `crests.ts` — and carrying six
 * sets of dead waist curves under six new names would have documented an intent nothing implements.
 * `relief` replaces them as the live field: the one surface treatment the body itself carries.
 */
import type { Family, Stage } from '../contract';

/* ============================================================================
   the ink
   ========================================================================== */

/** The darkest value in the hollow. Nothing here may be darker, and nothing may be neutral grey. */
export const BARK = '#4b3626';
/** Where light pools: the paper-white used for gleams, sclera and daisy petals. Never #fff. */
export const MIST = '#fdf8ee';
/** A daisy's eye, and the only pure yellow in the set. Shared because two families reach for it. */
export const POLLEN = '#f2c94a';

/* ============================================================================
   family
   ========================================================================== */

/**
 * The one treatment the BODY carries, as opposed to the parts bolted onto it.
 *
 * Kept to four kinds on purpose. Each is a smooth displacement field plus a matching vertex tint, both
 * evaluated in `gumdrop.ts` when the shared body buffer is baked, so a relief costs nothing per frame
 * and nothing per slime — forty waffles share one dimpled lathe.
 *
 *   none     · a plain gumdrop wall. rose, fairy.
 *   lattice  · a grid of soft square dimples with darkened grooves. THE waffle read up close, and it
 *              scallops the outline just enough to be visible at the rim.
 *   boulder  · broad smooth facet planes and moss patches on the upward faces. rock.
 *   crystal  · faint wide crystal panels, and a rime that whitens toward the base. frost.
 *   blade    · a soft vertical grain, as if the hide were fibrous. grass.
 */
export type Relief = 'none' | 'lattice' | 'boulder' | 'crystal' | 'blade';

export interface FamilyLook {
  /** Body colour, mid-tone. */
  skin: string;
  /** What the light looks like coming through the body. Lighter and MORE saturated than `skin`. */
  inner: string;
  /** Contour, grooves, crevices, the shaded half of a relief. A darkened relative of `skin`. */
  accent: string;
  /** The signature feature's main colour: petals, blades, spires, wings, butter, boulders. */
  crest: string;
  /** The secondary feature's colour: sepals, daisy, moss, rime. */
  trim: string;
  /** The wet or translucent layer: syrup, wing membrane, ice. Also the sparkle colour. */
  glaze: string;
  /** The nucleus suspended in the jelly. */
  core: string;
  /** Added rim colour. Fairy's is lit; everything else takes the paper-light. */
  rim: string;
  /** How much light bleeds through the body, 0..1. Fairy and frost high, rock nil. */
  translucency: number;
  /** Body roughness. Stone is dry and high, ice and jelly are wet and low. */
  roughness: number;
  /** Clearcoat strength, 0..1. What separates a glazed sweet from a dry stone. */
  coat: number;
  /** Self-lit warmth, 0..1. Fairy is the only one genuinely lit from inside. */
  glow: number;
  /** How rough the SIGNATURE PARTS are. Petals and moss are matte; butter and boulders are not. */
  partRoughness: number;
  /** Which body treatment, from the four above. */
  relief: Relief;
  /** Relief amplitude in body units. Zero is the same as `relief: 'none'`. */
  reliefDepth: number;
  /** Wobble speed multiplier. A heavy slime wobbles slowly. */
  jiggle: number;
  /** Iris colour. Warm browns and greens only. */
  iris: string;
}

export const FAMILY_LOOK: Record<Family, FamilyLook> = {
  /**
   * A WAFFLE. Golden brown, squat, a lattice of squares pressed into the hide, a wavy line of syrup
   * over the crown and a pat of butter sitting in it.
   *
   * The most food-like of the six by a distance, and deliberately: one family being obviously EDIBLE is
   * what tells a child the set is made of things rather than of colours. `translucency` is near the floor
   * because light does not pass through a waffle; what it keeps is a waxy `coat`, which is the syrup
   * sitting on top of it.
   */
  waffle: {
    skin: '#d99a4f',
    inner: '#ffdda4',
    accent: '#96581f',
    crest: '#fbe795',
    trim: '#c98a3c',
    glaze: '#a4561a',
    core: '#ffeec8',
    rim: '#ffe6bc',
    translucency: 0.12,
    roughness: 0.42,
    coat: 0.55,
    glow: 0,
    partRoughness: 0.36,
    relief: 'lattice',
    reliefDepth: 0.055,
    jiggle: 0.78,
    iris: '#4b3626',
  },

  /**
   * A ROSE. Deep pink, with layered petals wrapping the crown and a small green sepal at the base.
   *
   * The petals are the entire silhouette: a rosette of overlapping tips turns the crown into a scalloped
   * edge, which is a shape no other family has. Body colour sits DARKER than the petals so the rosette
   * reads as a separate object sitting on the creature rather than as the top of its head.
   */
  rose: {
    skin: '#d24278',
    inner: '#ffb8d6',
    accent: '#8e2450',
    crest: '#f7749f',
    trim: '#5d9a4c',
    glaze: '#ffd3e4',
    core: '#ffe3ee',
    rim: '#ffdcea',
    translucency: 0.42,
    roughness: 0.34,
    coat: 0.62,
    glow: 0,
    partRoughness: 0.68,
    relief: 'none',
    reliefDepth: 0,
    jiggle: 0.98,
    iris: '#7a2a4a',
  },

  /**
   * GRASS. Fresh green, with tufts and blades sprouting from the top and a daisy tucked among them.
   *
   * The blades are thin, tall and many, which is a silhouette nothing else in the set comes near — the
   * only other family with anything upright on its crown is frost, whose spires are few, fat and
   * straight. The daisy is the up-close reward and the reason a child calls this one the flower slime.
   */
  grass: {
    skin: '#6bab41',
    inner: '#d5f293',
    accent: '#3d6b2c',
    crest: '#7fc94a',
    trim: '#fdf8ee',
    glaze: '#e8f9c4',
    core: '#f0ffd2',
    rim: '#eaf8d6',
    translucency: 0.48,
    roughness: 0.46,
    coat: 0.4,
    glow: 0,
    partRoughness: 0.72,
    relief: 'blade',
    reliefDepth: 0.02,
    jiggle: 1.06,
    iris: '#3c5c30',
  },

  /**
   * ROCK. Violet-grey and heavy, on the lowest widest body of the six, with moss on its upward faces
   * and a couple of small boulders sitting on its shoulder.
   *
   * The only family whose silhouette read is the BODY rather than a part: it is squatter and broader than
   * anything else here, and it has nothing tall on it at all. That absence is the identifier, which is
   * why the moss mounds are kept low and wide. Stony but never faceted on the outline: the facet planes
   * are a smooth low-frequency field, so the profile stays a curve.
   */
  rock: {
    skin: '#9c96a3',
    inner: '#d8d2de',
    accent: '#5f5766',
    crest: '#8b8492',
    trim: '#8ec257',
    glaze: '#cfc8d6',
    core: '#e8e2ee',
    rim: '#e2dce8',
    translucency: 0.04,
    roughness: 0.88,
    coat: 0.12,
    glow: 0,
    partRoughness: 0.9,
    relief: 'boulder',
    reliefDepth: 0.055,
    jiggle: 0.54,
    iris: '#4b3626',
  },

  /**
   * A FAIRY. Violet, translucent, faintly lit from inside, with gossamer wings and a pair of antennae,
   * and one or two sparkles drifting near it.
   *
   * Wings are the strongest silhouette in the set and the tallest slenderest body carries them, so the
   * outline is unmistakable from any distance. It is also the only family that is genuinely emissive:
   * `glow` here is what makes the body look lit rather than painted, and the wings are the one part in
   * the whole directory that is actually transparent.
   */
  fairy: {
    skin: '#9b7ad4',
    inner: '#e8d6ff',
    accent: '#5b3f8f',
    crest: '#cba6f2',
    trim: '#f0e2ff',
    glaze: '#e9d8ff',
    core: '#f8efff',
    rim: '#f2e4ff',
    translucency: 0.92,
    roughness: 0.2,
    coat: 0.7,
    glow: 0.5,
    partRoughness: 0.3,
    relief: 'none',
    reliefDepth: 0,
    jiggle: 1.46,
    iris: '#4a3168',
  },

  /**
   * FROST. Pale ice blue, wet and high-gloss, with a crown of ice spires and a rime of frost flared
   * around its base.
   *
   * Two features rather than one, because a spire cluster alone could be mistaken for grass at distance:
   * the flared wavy skirt at the ground is a shape only this family has, and it reads at any size. The
   * spires are smooth tapered forms with tips that ROUND OVER — an ice slime is the family most likely
   * to break the "nothing jagged" rule and the tip profile is where it would happen.
   */
  frost: {
    skin: '#84c2dd',
    inner: '#d6f4ff',
    accent: '#3f7e9c',
    crest: '#dcf3fc',
    trim: '#fbfeff',
    glaze: '#cbeafa',
    core: '#eafbff',
    rim: '#e6f7ff',
    translucency: 0.72,
    roughness: 0.12,
    coat: 1,
    glow: 0.06,
    partRoughness: 0.16,
    relief: 'crystal',
    reliefDepth: 0.03,
    jiggle: 0.86,
    iris: '#2f5568',
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
 * heavy lid, which is the entire difference between "cute" and "dignified" on one mesh.
 *
 * NOTHING IN THIS TABLE MOVED FOR THE RE-THEME. `crestScale` and `crestCount` now drive petals, blades,
 * spires and wings instead of leaves and fins, and they drive them well, because the question they
 * answer — how much feature does a creature this age carry — did not change with the subject matter.
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
  /** Feature size against the body. Pips wear a nub of theirs. */
  crestScale: number;
  /** How many feature pieces: petals in the outer ring, blades in the tuft, spires in the crown. */
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
  /** Adolescent, and the reference silhouette: the family profile at full strength, feature up. */
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
 * Growth is deliberately partial: size and feature move most of the way to the next stage, eye ratio
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
