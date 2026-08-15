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
 * NINETEEN NOW, NOT SIX, and the table below is the original six. The thirteen the owner added — air,
 * bunny, lion, cat, radioactive, wood, fire, ice, gold, sleepy, strawberry, mango, bomb — are documented
 * at their own entries in `FAMILY_LOOK`, each with a note naming the family it was most at risk of being
 * confused with and what separates them. That per-entry note is the important discipline at this count:
 * with six families "they look different" is self-evident, and with nineteen it has to be argued
 * pairwise, because the real failure mode is no longer a dull set but a set with two of something in it.
 *
 * The two structural additions the thirteen needed are `metal` (gold, and the procedural environment in
 * `gumdrop.ts` that makes it possible) and `motion` (fire, radioactive, air, sleepy — the only four
 * families with a part that moves on its own, and all four hold still under `prefers-reduced-motion`).
 * `eyesClosed` is a third, used exactly once, by sleepy.
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
export type Relief =
  | 'none'
  | 'lattice'
  | 'boulder'
  | 'crystal'
  | 'blade'
  /**
   * ADDED FOR THE THIRTEEN. Same contract as the five above — a smooth analytic displacement plus a
   * matching vertex tint, evaluated once per family-stage in `gumdrop.ts` — so a relief still costs
   * nothing per frame and nothing per slime however many families exist.
   *
   *   bark    · deep vertical fissures with dark grooves and pale ridges. wood.
   *   seeded  · many small shallow pits, each with a pale pip in it. strawberry.
   *   facet   · broad flat crystal PANELS, wider and harder than `crystal`'s. ice, and the reason ice
   *             and frost do not read as one family. Still smooth-shaded: the panels are a
   *             low-frequency field, so the profile stays a curve and nothing is jagged on the outline.
   *   fur     · a fine soft nap with a warm tint break, so a body reads as plush rather than as jelly.
   *             bunny, lion, sleepy.
   *   tabby   · fur, plus broad soft stripes wrapping the flanks. cat.
   *   wisp    · almost no displacement and a soft diagonal swirl in the tint. air.
   *   ember   · dark at the foot running to bright at the shoulder, as if lit from above by its own
   *             crown. fire.
   *   ooze    · blotchy bright patches that look wet and slightly radioactive. radioactive.
   *   ripen   · a vertical two-tone: gold at the base, red at the shoulder. mango, and it is half of
   *             that family's identification.
   *   polish  · no displacement at all, a broad specular band and a darkened base. gold, bomb.
   */
  | 'bark'
  | 'seeded'
  | 'facet'
  | 'fur'
  | 'tabby'
  | 'wisp'
  | 'ember'
  | 'ooze'
  | 'ripen'
  | 'polish';

/**
 * What moves on a family, and it is a SHORT list on purpose.
 *
 * Four families needed something that animates independently of the body's own squash — a flame has to
 * lick, a trefoil has to throb, a swirl has to turn, a Z has to drift upward. Each is one transform on
 * one extra group in `Slime.tsx`, driven from a per-slime clock, and EVERY ONE OF THEM IS SKIPPED
 * ENTIRELY under `prefers-reduced-motion`: the part is still drawn, in its rest pose, and never touched
 * again. That is the whole of the reduced-motion story for the new families.
 *
 *   none    · the part is welded to the body. Fifteen of nineteen.
 *   flicker · fast, irregular vertical stretch. fire.
 *   throb   · slow uniform breathe. radioactive.
 *   turn    · continuous slow rotation about the body axis. air.
 *   rise    · drifts up and shrinks away, then loops. sleepy's Z.
 */
export type Motion = 'none' | 'flicker' | 'throb' | 'turn' | 'rise';

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
  /**
   * How much of the body is METAL, 0..1. Gold is the only family near 1 and it is the whole read.
   *
   * Defaulted by omission everywhere else, because a metal slime needs something to reflect and this
   * directory ships no image files: `gumdrop.ts` generates a two-stop sky/ground gradient environment
   * PROCEDURALLY as a `DataTexture` and hands it to any family whose `metal` is above zero. Without it a
   * `metalness: 1` body samples nothing and renders black, which is the single most common way a gold
   * material is shipped broken.
   */
  metal?: number;
  /**
   * Closed eyes, with lashes, instead of the doe eyes. `sleepy` ONLY, and it is the one exception the
   * owner allowed to "doe eyes on all nineteen".
   *
   * It is still a doe face: the lash arc is drawn at the same place, the same size and the same warm
   * brown the iris would have been, and it curves DOWNWARD in a smile rather than lying flat. A flat
   * closed eye reads as unconscious; a curved one with three lashes reads as contentedly asleep, which
   * is the difference between charming and worrying on a creature a five-year-old owns.
   */
  eyesClosed?: boolean;
  /** What moves independently of the body. See `Motion`. Omitted means `'none'`. */
  motion?: Motion;
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

  /* ==========================================================================
     THE THIRTEEN. Same three questions as the six above — what colour, what material, what breaks the
     OUTLINE — and one extra that the six never had to answer: what keeps this family off the six that
     already exist. Every entry below names the family it was most at risk of colliding with and says
     what separates them, because with nineteen families "it looks different to me" stops being a test.
     ======================================================================== */

  /**
   * AIR. Almost white, almost not there, with a spiral of wind turning slowly above it.
   *
   * The most translucent body in the game by a clear margin and the only one that is barely tinted at
   * all: air's colour is the ABSENCE of colour, which works here only because every other family is
   * saturated. Against nineteen coloured slimes, the pale one is instantly findable.
   *
   * AGAINST FROST, which is the collision. Frost is a solid pale blue with a hard white rime; air is
   * near-colourless, has no rime, and its identifier is a moving open HELIX — the only open spiral form
   * in the set, and the only feature that rotates.
   */
  air: {
    skin: '#cfe9f5',
    inner: '#f6feff',
    accent: '#8fb6c9',
    crest: '#e8f7ff',
    trim: '#fbffff',
    glaze: '#dff3ff',
    core: '#f8feff',
    rim: '#f0fbff',
    translucency: 0.96,
    roughness: 0.18,
    coat: 0.8,
    glow: 0.18,
    partRoughness: 0.2,
    relief: 'wisp',
    reliefDepth: 0.012,
    jiggle: 1.62,
    iris: '#4a6a78',
    motion: 'turn',
  },

  /**
   * BUNNY. Cream plush, two long upright ears with pink linings, and a round powder-puff tail.
   *
   * The strongest silhouette available to anybody, which is why it is spent on the simplest body in the
   * set: two long ears need no help. The ears are the only parts in this directory longer than the body
   * is tall, and the ONE FLOPPED TIP is what stops them reading as a pair of leaves — a perfectly
   * matched pair of uprights is a plant, an asymmetric pair is an animal.
   */
  bunny: {
    skin: '#f2d7b8',
    /**
     * OVER-WARMED AFTER THE FIRST RENDER, and this will happen again to anyone adding a pale family, so:
     *
     * These started at `#f3e0d4` / `#f9efe6` — a perfectly good warm cream ON PAPER — and bunny rendered
     * COLD GREY. A near-white dielectric has almost no colour of its own left to assert; what it shows is
     * its lighting, and the lighting here is a `hemisphereLight` with a pale blue sky in it plus a
     * `sheenColor` taken from `rim`. The paler a family is, the more of the sky it wears, and at cream it
     * wears nearly all of it.
     *
     * So the table is deliberately pushed until it looks a little too peachy in the source and lands
     * correct on screen. That is the standard correction for a light material under a cool key, and the
     * note about `rock` at the top of this file is the same lesson from the other end of the value range.
     */
    inner: '#fff2e2',
    accent: '#c2977a',
    crest: '#f7e0c4',
    trim: '#f7a8bd',
    glaze: '#fff4ea',
    core: '#fff8ee',
    rim: '#ffeeda',
    translucency: 0.3,
    roughness: 0.68,
    coat: 0.12,
    glow: 0,
    partRoughness: 0.78,
    relief: 'fur',
    reliefDepth: 0.018,
    jiggle: 1.18,
    iris: '#6b4632',
  },

  /**
   * LION. A sandy body inside a broad rust-red mane, with tufted ears and a tuft-tipped tail.
   *
   * The mane is a RING AROUND THE FACE at eye height, radiating nearly horizontally, and that is the
   * whole silhouette: an outline half again as wide as the body with a soft fringe on it.
   *
   * AGAINST ROSE, which is the collision, and it is settled by HEIGHT and by VALUE. Rose's rosette sits
   * on the CROWN, cups upward, and is palest in the middle; lion's mane sits at the FACE, lies flat, and
   * is darkest at the tips against a light body. AGAINST WAFFLE, which is the other one: waffle is a
   * brown body with a cream block on top, lion is a sandy body inside a rust halo, and the mane is a
   * bigger shape than anything waffle has.
   */
  lion: {
    skin: '#eab259',
    inner: '#ffe2ac',
    accent: '#a8701f',
    crest: '#b45f1c',
    trim: '#8a4413',
    glaze: '#ffd89a',
    core: '#ffeecb',
    rim: '#ffe3b4',
    translucency: 0.16,
    roughness: 0.62,
    coat: 0.16,
    glow: 0,
    partRoughness: 0.74,
    relief: 'fur',
    reliefDepth: 0.02,
    jiggle: 0.86,
    iris: '#5a3a1c',
  },

  /**
   * CAT. A ginger tabby: two pointed ears, broad soft stripes, and a tail curled up beside it.
   *
   * TWO features because one is not enough here. Pointed ears alone are close to bunny's; a raised
   * curled tail alone is close to nothing else but is easy to lose behind the body. Together — short
   * wide triangular ears AND a tail standing up in a question mark beside the flank — the outline is a
   * cat from any angle.
   *
   * AGAINST LION, which is the collision: cat is a deeper ginger with STRIPES and two small sharp ears,
   * lion is pale sand with a huge soft halo and no stripes. AGAINST BUNNY: ear length. Bunny's are
   * nearly the height of the body and rounded; cat's are a third of it and triangular.
   */
  cat: {
    skin: '#e88b4a',
    inner: '#ffcf9e',
    accent: '#a1521f',
    crest: '#f2a468',
    trim: '#f9b9c6',
    glaze: '#ffd9b4',
    core: '#ffeada',
    rim: '#ffdcc0',
    translucency: 0.22,
    roughness: 0.6,
    coat: 0.18,
    glow: 0,
    partRoughness: 0.7,
    relief: 'tabby',
    reliefDepth: 0.022,
    jiggle: 1.02,
    iris: '#4a7a3c',
  },

  /**
   * RADIOACTIVE. Acid green, lit from inside, a three-lobed trefoil turning slowly over its head, and
   * glowing drips running down from the crown.
   *
   * The ONLY family in the game whose crest is a SYMBOL rather than an object, and it earns that because
   * a trefoil is three fat lobes around a hub — a shape with no other candidate in the set. It throbs,
   * which nothing else does, and it is the brightest thing on the ranch.
   *
   * AGAINST GRASS, which is the collision: grass is a mid fresh green with thin blades and no glow;
   * radioactive is a yellow-shifted ACID green that emits light. Held next to each other the glow
   * separates them before the shape does.
   *
   * ON "OMINOUS", which the owner asked for and which has a floor: this is a five-year-old's pet. It is
   * ominous in COLOUR and lighting only. Nothing about it drips onto anything, nothing about it is
   * damaged, and it has the same doe eyes as the bunny.
   */
  radioactive: {
    skin: '#7ac93a',
    inner: '#daff86',
    accent: '#3e6b18',
    crest: '#c6ff3d',
    trim: '#eaffab',
    glaze: '#b6ff2e',
    core: '#e6ffb0',
    rim: '#d6ff8a',
    translucency: 0.6,
    roughness: 0.26,
    coat: 0.7,
    glow: 0.72,
    partRoughness: 0.24,
    relief: 'ooze',
    reliefDepth: 0.03,
    jiggle: 1.1,
    iris: '#3e5c22',
    motion: 'throb',
  },

  /**
   * WOOD. A little tree: bark fissures cut deep into a brown body, and one branch forking up out of the
   * crown with two leaves on it.
   *
   * `bark` is the deepest relief in the file at 0.05, and unusually it IS partly a silhouette feature —
   * vertical fissures that deep scallop the rim visibly, which is what makes the body read as timber
   * rather than as a brown gumdrop. The branch is deliberately ONE thick forking stem, not many stems,
   * because that is the entire difference from grass.
   *
   * AGAINST GRASS: one woody fork with two broad leaves, versus twelve thin blades. AGAINST ROCK: rock
   * is cool violet-grey and has nothing tall; wood is warm brown and has the second-tallest crest in the
   * game.
   */
  wood: {
    skin: '#9c7346',
    inner: '#e0c395',
    accent: '#5d4023',
    crest: '#7d5a33',
    trim: '#6faa3f',
    glaze: '#c9a875',
    core: '#e8d3ad',
    rim: '#dcc39a',
    translucency: 0.08,
    roughness: 0.82,
    coat: 0.1,
    glow: 0,
    partRoughness: 0.8,
    relief: 'bark',
    reliefDepth: 0.05,
    jiggle: 0.6,
    iris: '#4b3626',
  },

  /**
   * FIRE. A crown of licking flames, every one of them curling the same way round, over a body that is
   * dark at the foot and glowing at the shoulder.
   *
   * WHAT MAKES A FLAME A FLAME AND NOT A CONE, which is the whole brief for this family and is answered
   * in `crests.ts`: a flame's outline is an S. It swells above its root, pinches, swells again and then
   * draws off to a tip that CURLS SIDEWAYS. A cone does none of that. The second half of it is that all
   * of them curl in the SAME rotational direction and none of them is the same height — radial symmetry
   * is the signature of a hat, and asymmetry with a shared sense of rotation is the signature of fire.
   *
   * AGAINST FROST AND ICE: those crowns are straight, symmetric and pale. AGAINST MANGO, which shares
   * the red-gold palette: mango has no glow, no crown and a leaning body.
   */
  fire: {
    skin: '#e8632c',
    inner: '#ffc46a',
    accent: '#9c2f10',
    crest: '#ffb02e',
    trim: '#fff0a8',
    glaze: '#ff8a2b',
    core: '#ffe6a8',
    rim: '#ffb877',
    translucency: 0.55,
    roughness: 0.3,
    coat: 0.5,
    glow: 0.8,
    partRoughness: 0.22,
    relief: 'ember',
    reliefDepth: 0.022,
    jiggle: 1.24,
    iris: '#7a2c10',
    motion: 'flicker',
  },

  /**
   * ICE — AND THIS IS THE ENTRY THAT ARGUES FOR ITS OWN EXISTENCE, because the owner noticed that `frost`
   * was already here and asked whether the two should be folded.
   *
   * THEY ARE KEPT APART, and the split is FROST IS WEATHER, ICE IS MINERAL. Once said that way every
   * decision falls out of it and there is no overlap left to worry about:
   *
   *                     frost                              ice
   *   colour            pale, milky, whitened              deep saturated cyan-blue, clear
   *   body              soft, `crystal` relief, faint      hard `facet` panels, twice the depth
   *   crown             a symmetric ring of round spires    an ASYMMETRIC cluster of leaning shards,
   *                     around one central one              one dominant, prismatic, unmatched
   *   at the ground     a wavy flared RIME SKIRT            nothing at all
   *   material          wet and bright, opaque-ish          the clearest body in the game, faintly
   *                                                         specular off the procedural environment
   *
   * So at 25 m frost is "pale thing with a skirt" and ice is "blue thing with a leaning spike"; up close
   * one is powdery and one is a gemstone. They are also granted by different stations — see
   * `FAMILY_BATTERY` — so a child collects them in different places and never sees them offered as a pair.
   *
   * The alternative was to fold them and keep frost. That was rejected because the owner asked for ice
   * specifically and because a hard transparent crystal is a genuinely different TOY from a snowy one;
   * what it needed was to be drawn that way rather than tinted that way.
   *
   * NOTHING JAGGED STILL HOLDS. `facet` is a low-frequency smooth field and the shards are `spindle`s
   * whose tips round over, exactly as frost's do. Ice looks faceted and is smooth-shaded everywhere.
   */
  ice: {
    skin: '#4b9fd6',
    inner: '#aae6ff',
    accent: '#245f8c',
    crest: '#9fdcff',
    trim: '#d6f2ff',
    glaze: '#7fcdf0',
    core: '#cbeeff',
    rim: '#bfe8ff',
    translucency: 0.95,
    roughness: 0.06,
    coat: 1,
    glow: 0.12,
    partRoughness: 0.08,
    relief: 'facet',
    reliefDepth: 0.055,
    jiggle: 0.74,
    iris: '#1f4c6b',
    metal: 0.12,
  },

  /**
   * GOLD. A mirror-finished body with a little crown on it.
   *
   * THE ONLY METAL IN THE GAME, and that is a bigger identifier up close than any crest: nineteen
   * families are matte-to-glossy dielectrics and one of them REFLECTS. At distance the crown does the
   * work — a band with five rounded points and a bead on each, which is a shape a child knows before
   * they can read.
   *
   * `metal: 0.95` is only survivable because `gumdrop.ts` generates an environment to reflect. See the
   * note on `metal` above: a metal with nothing to reflect is a black slime.
   *
   * AGAINST WAFFLE AND LION, the other two golden families: neither reflects, and neither has a crown.
   */
  gold: {
    skin: '#e8b23c',
    inner: '#fff0b8',
    accent: '#9c6a12',
    crest: '#ffd766',
    trim: '#fff4c2',
    glaze: '#ffe08a',
    core: '#fff6d2',
    rim: '#ffeaa8',
    translucency: 0.04,
    roughness: 0.12,
    coat: 0.4,
    glow: 0.08,
    partRoughness: 0.16,
    relief: 'polish',
    reliefDepth: 0,
    jiggle: 0.7,
    iris: '#5c3f12',
    metal: 0.95,
  },

  /**
   * SLEEPY. Slumped, plush, dusty lavender, wearing a long nightcap that flops over with a pom-pom on
   * the end, eyes closed with lashes, and a Z drifting up off it.
   *
   * FOUR THINGS AT ONCE, which is more than any other family gets, and the reason is that "sleepy" is a
   * STATE rather than an object — there is no sleepy-shaped thing to point at, so it has to be built out
   * of the signs of sleep. The nightcap is the silhouette (a long soft flop with a ball on the end, the
   * only feature in the game that hangs sideways past the body); the droop is the posture; the closed
   * eyes are the face; the Z is the confirmation.
   *
   * `eyesClosed` is the one exception to doe eyes on all nineteen, and see the note on that field for
   * why the closed version still reads as charming rather than as unwell.
   *
   * AGAINST FAIRY, the collision: fairy is a bright LIT violet on the tallest body with wings up; sleepy
   * is a muted dusty lavender on a low slumped body with everything hanging down. They are opposites in
   * posture, which is the most reliable way to separate two families of one hue.
   */
  sleepy: {
    skin: '#a9a6d4',
    inner: '#e6e4ff',
    accent: '#635f8f',
    crest: '#8f8ac9',
    trim: '#fdf8ee',
    glaze: '#c9c5f0',
    core: '#e8e6ff',
    rim: '#ded9ff',
    translucency: 0.34,
    roughness: 0.7,
    coat: 0.1,
    glow: 0.05,
    partRoughness: 0.74,
    relief: 'fur',
    reliefDepth: 0.016,
    jiggle: 0.5,
    iris: '#4b3f6a',
    eyesClosed: true,
    motion: 'rise',
  },

  /**
   * STRAWBERRY. The classic berry: widest at the shoulder, TUCKED IN at the base, seeded all over, with
   * a green star of a calyx on top and a stub of stem.
   *
   * THE BODY IS THE IDENTIFIER AND IT IS THE ONLY ONE OF ITS KIND HERE. Every other family is a gumdrop —
   * widest at or near the ground. Strawberry inverts that with a strongly negative `skirt`, so its
   * widest point is up at the shoulder and it narrows toward the floor. That is a berry in outline before
   * a single seed or leaf is drawn, and it is the reason this family reads at 25 m.
   *
   * AGAINST ROSE, the collision: rose is deep PINK with a soft cupped rosette on a gumdrop body;
   * strawberry is saturated RED with a flat pointed green star on an inverted body. The calyx points
   * outward and slightly down, which is the opposite of the rosette's upward cup.
   */
  strawberry: {
    skin: '#e03a44',
    inner: '#ff8f96',
    accent: '#96161f',
    crest: '#5da83c',
    trim: '#f2d24a',
    glaze: '#ff6b72',
    core: '#ffd2d5',
    rim: '#ff9aa0',
    translucency: 0.44,
    roughness: 0.3,
    coat: 0.62,
    glow: 0,
    partRoughness: 0.66,
    relief: 'seeded',
    reliefDepth: 0.022,
    jiggle: 1.0,
    iris: '#7a2028',
  },

  /**
   * MANGO. A leaning teardrop, gold at the bottom running to red at the shoulder, with one broad leaf.
   *
   * THE LEAN IS THE IDENTIFIER, and it is the only one in the game that is not a part bolted on: the
   * BODY ITSELF is off-vertical, sheared over about a sixth of a radian by `GUMDROP.mango.lean`. Eighteen
   * families stand up straight and one leans, so at any distance and from any angle mango is the tilted
   * one. Everything else about it — the two-tone `ripen`, the single leaf where a stem would be — is
   * confirmation.
   *
   * AGAINST FIRE, which shares the palette exactly: fire glows, has a crown, and stands up. AGAINST
   * WAFFLE: waffle is one flat brown with a block on top.
   */
  mango: {
    skin: '#e8622e',
    inner: '#ffd07a',
    accent: '#a03a12',
    crest: '#f2b23c',
    trim: '#5da83c',
    glaze: '#ffb85e',
    core: '#ffe4a8',
    rim: '#ffc98a',
    translucency: 0.3,
    roughness: 0.3,
    coat: 0.66,
    glow: 0,
    partRoughness: 0.6,
    relief: 'ripen',
    reliefDepth: 0.012,
    jiggle: 0.96,
    iris: '#6b3418',
  },

  /**
   * BOMB. A round, glossy, very dark bauble with a brass collar, a curled rope fuse and a warm spark on
   * the end of it. Plus cheeks.
   *
   * THE BRIEF HAD A HARD CONSTRAINT — "it must not read as threatening to a five-year-old" — and it is
   * met by four specific decisions rather than by hoping:
   *
   *   IT IS NOT BLACK. It cannot be: `look.ts` forbids anything darker than `BARK`, and this body is
   *   measurably LIGHTER than BARK. It is a dark dusty violet that reads as "bomb-coloured" next to
   *   eighteen saturated slimes without ever being a hole in the screen.
   *   IT IS A BAUBLE. Highest `coat` outside frost and ice, on the roundest body in the game, so it
   *   reads as a shiny Christmas ornament — a thing you would hang up, not a thing you would run from.
   *   THE COLLAR IS BRASS AND THE SPARK IS WARM. Both are `POLLEN`-family yellows: the palette says toy.
   *   IT HAS CHEEKS. Two soft rosy patches, the only blush in the game, sitting under doe eyes on a dark
   *   body. That single addition is what moved it from "prop" to "pet" in the review shots.
   *
   * NOTHING EXPLODES, NOTHING IS EVER LOST, and there is no timer anywhere in this directory. The spark
   * twinkles on the spot forever, and it holds still under `prefers-reduced-motion`.
   *
   * AGAINST ROCK, the collision: rock is a mid violet-grey, matte, squat and broad; bomb is far darker,
   * mirror-glossy, and round, with a tall thin fuse. They are not close in practice.
   */
  bomb: {
    skin: '#4e4660',
    inner: '#a49ac0',
    accent: '#3f3950',
    crest: '#f2c94a',
    trim: '#c9a878',
    glaze: '#fff0a8',
    core: '#b8afd4',
    rim: '#c9c2de',
    translucency: 0.1,
    roughness: 0.18,
    coat: 0.9,
    glow: 0.1,
    partRoughness: 0.5,
    relief: 'polish',
    reliefDepth: 0,
    jiggle: 0.9,
    iris: '#4b3626',
    metal: 0.3,
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
