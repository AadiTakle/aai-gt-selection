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
 *
 * THE SECOND HALF OF THIS FILE is what a tank window actually draws, and it is no longer a table of
 * abstract marks — see the long note above `PORTRAIT_STAGE`. It reads the real slime bakes out of
 * `slimes/`, which is a direction of dependency this directory already has: `Vacpack.tsx` borrows the
 * same two functions for the slime that flies up the nozzle.
 */
import * as THREE from 'three';

import type { Family, Stage } from '../contract';
import { featureGeometry, type FeatureBake } from '../slimes/crests';
import { gumdropGeometry } from '../slimes/gumdrop';
import { FAMILY_LOOK } from '../slimes/look';

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

/* ================================================================================================
   WHAT A TANK WINDOW DRAWS: A PORTRAIT, NOT A SYMBOL
   ============================================================================================== */

/**
 * THE TABLE THIS REPLACED, AND WHY IT WAS WRONG.
 *
 * Until now a window held a coloured dome with an abstract mark floating in front of it — four dimples
 * for waffle, a letter Z for sleepy, a crown outline for gold. The justification written here was that a
 * window "gets about eight pixels", where a mane is mush, so it needs a symbol rather than a creature.
 *
 * That premise was simply not measured, and it is false. `WINDOW.r` is 0.0125 in camera space at a
 * distance of 0.42 m; the game's camera is 62° vertical, so half the viewport subtends 0.42·tan(31°) =
 * 0.252 m. A window is therefore 0.0125/0.252 = 5.0% of the half-height, which on a 800 px-tall canvas
 * is a disc about FIFTY pixels across, and more on any larger window. Fifty pixels is not a pixel-art
 * budget: it is a portrait. It is roughly the size of a favicon, and a favicon holds a face.
 *
 * So the owner's report — "all it really has is the colour and the gumdrop shape, it's super hard to
 * tell what is inside your vacuum gun" — is not a rendering problem, it is the symbol premise. Nineteen
 * hand-drawn abstractions were being asked to teach a child a second visual language, one whose words
 * appear for a few seconds each, when the child already knows the first language perfectly: they have
 * just spent ten minutes looking at the actual animal on the grass.
 *
 * WHAT REPLACES IT. The window draws the REAL SLIME, tiny: the family's own baked body, its own baked
 * signature feature, its own colours, its own face. `crests.ts` already merges every petal, blade,
 * boulder, wing, spire, ear, crown and nightcap into at most three buffers per family per stage, and
 * `gumdrop.ts` bakes one lathe per family with the family's colour and relief written into a vertex
 * attribute. `Vacpack.tsx` already borrows exactly these for the slime that flies up the nozzle, for
 * exactly this reason — the note there reads "a proxy without one is a smooth dome that could be
 * anybody", which is the same complaint the owner has now made about the windows.
 *
 * WHY REUSING THE BAKES IS ALSO THE CHEAP ANSWER, which was the other half of the brief:
 *
 *   · NO NEW GEOMETRY AND NO NEW MEMORY. Every buffer a window draws is already resident and is already
 *     being drawn dozens of times a frame by the herd. Four windows add four instances of geometry the
 *     frame already submits forty times.
 *   · NO NEW MATERIALS AND THEREFORE NO NEW SHADER PROGRAMS. `bodyMaterial`, `trimMaterial`,
 *     `glazeMaterial`, `scleraMaterial` and `irisMaterial` come from `slimes/gumdrop.ts` already
 *     compiled. A window costs draw calls, not a pipeline stall.
 *   · FEWER PIECES THAN THE SYMBOLS HAD. A symbol was up to seven separate pip/bar/blade meshes on top
 *     of the dome; a portrait is a body, at most three feature buffers and four small face meshes, and
 *     the median family draws fewer meshes now than it did before.
 *   · IT CANNOT DRIFT. Nineteen hand-authored symbols are nineteen things to re-draw every time a
 *     family is re-themed, and `crests.ts` has already moved once under this file's feet — the note at
 *     the top of `PAINT` is about exactly that breakage. A portrait is derived, so a re-theme lands in
 *     the window for free.
 *
 * THE ONE THING THAT IS STILL AUTHORED HERE is the two-tier read, below: the socket behind the slime is
 * flooded with the family's own `inner` colour, so a window says its family by COLOUR before any shape
 * resolves and by PORTRAIT as soon as it does. That is what keeps `air` (a nearly colourless body) and
 * `bomb` (a very dark one) legible in a small bright socket, which is the problem `PAINT`'s two
 * deliberate disagreements with `look.ts` were invented to solve and now solve properly.
 */

/**
 * Every portrait wears its family's WARDEN crest, whatever age the slime actually is.
 *
 * Two decisions in one constant, and both are about what a badge is for.
 *
 * ONE STAGE FOR ALL AGES. A window says "there is a bunny in slot two", and that sentence does not
 * change when the bunny is a baby, so a pip and a warden of the same family must produce the same
 * picture or the row stops being readable at a glance. (`Held` carries no stage anyway — see `tank.ts` —
 * so this is a choice the data could not currently override even if it should.)
 *
 * AND THAT STAGE IS THE OLDEST ONE, which is the fix for the half of the row that was still weak after
 * the portraits went in. `STAGE_LOOK` scales a feature by stage in two ways: `crestScale`, which is size,
 * and `crestCount`, which is HOW MANY pieces — petals in the outer ring, blades in the tuft, spires in
 * the crown, points on gold's crown. At `crested` that count is three; at `warden` it is five, and
 * `look.ts` calls warden "the only stage with a full crown". A three-blade tuft and a two-point crown
 * are legible on a whole slime standing on grass and are two pale slivers in a socket; the five-piece
 * versions are the same signature drawn emphatically, which is exactly what an icon wants.
 *
 * It costs nothing extra. The BODY buffer is per-family and has no stage in it at all — stage is a
 * uniform scale applied outside — so this changes only which of the ≤24 already-cached feature bakes the
 * window points at. The herd contains wardens, so it is a bake the page is holding regardless.
 */
export const PORTRAIT_STAGE: Stage = 'warden';

/**
 * How much of the window's APERTURE the portrait may fill, in window radii.
 *
 * The number that matters here is 0.85, and it is not the window's radius. `Pack.tsx` lays a rim over the
 * socket as a torus of radius `r` and tube `0.15 r`, so the ring covers everything from 0.85 r outward and
 * the hole a child can actually see through is 85% of the disc. The first pass budgeted against the full
 * radius and every portrait in the row came out with its chin behind the rim.
 *
 * So: a shade under the aperture on both axes, the width allowance the larger of the two because a round
 * hole has more room across the middle than at the top, and it is the top the tall families need.
 */
const FIT = { across: 1.64, tall: 1.56 };

/**
 * HOW MUCH OF THE PICTURE A CREST MAY CLAIM, and this is the number that decides whether the row reads.
 *
 * Fitting the honest bounding box of body-plus-feature into the socket sounds obviously right and looks
 * obviously wrong, and it took a screenshot to see why. Measured at `warden`, several families are more
 * crest than creature: `wood` is a 1.52-tall body under a branch that reaches 3.10, `fire` 1.52 under
 * flames to 3.05, `ice` 1.68 under shards to 3.07. Scale that whole box into a 1.56-radius aperture and
 * the BODY comes out 0.70 across while the top half of the disc holds a few translucent wisps. Which is
 * what the first pass shipped: four correct portraits of nothing much, huddled along the bottom rim.
 *
 * The asymmetry is that a bounding box weights a hair the same as a head. So the extent is CAPPED at a
 * multiple of the body's own size before the fit is solved, and anything past the cap is allowed to run
 * off the top of the socket and be trimmed by the rim. Cropping the tips off a flame crown costs almost
 * nothing — a licking flame is legible from its base — while shrinking the animal to fit the flame costs
 * the whole picture. Every family's body now lands between 45% and 72% of the aperture, which is the
 * consistency a row of four badges needs.
 *
 * `across` is capped the same way and for the same reason, and it binds on exactly one family: `lion`,
 * whose mane ring is nearly three body-widths across and is, quite correctly, most of its icon.
 */
const ROOM = { crest: 0.62, across: 1.6 };

/**
 * Flattening in z, and it is free legibility rather than a compromise.
 *
 * Squashing depth ONLY cannot deform anything a face-on viewer can see, which is the trap `Vacpack.tsx`
 * documents for the flying proxy: that one is squashed in Y, which does ovalise the eyes, whereas Z is the
 * one axis nobody is looking down. What it buys is twofold — the portrait fits in a socket about 0.6 radii
 * deep, and the crest is pressed toward the picture plane, so a fairy's four wings and a frost's ring of
 * spires read as four wings and a ring of spires rather than as two of each with the rest behind.
 *
 * WHY IT IS 0.44 AND NOT MORE. See `CLEAR_OF_LENS`: the depth a portrait is allowed is the gap between the
 * socket's back wall and its glass, and this is the flattening that fits the widest family into it.
 */
const SQUASH_Z = 0.44;

/**
 * How far in FRONT of the socket's back wall a portrait's own back face is planted, in window radii.
 *
 * THE BUG THIS EXISTS TO FIX, which is the single worst thing the first pass shipped and took a 8×
 * magnified screenshot to see. The socket floor is `disc()` — a cylinder 0.1 long — scaled `0.06` in z,
 * which is ±0.003 pack units, and at a window radius of 0.0142 that is a slab ±0.21 RADII thick. The
 * portrait was mounted at +0.1 radii with its geometry centred on its own origin, so the whole back half of
 * every slime was inside that slab. What you saw was the front cap of a body and nothing else: `wood`'s
 * branch, rooted on the body's axis at z ≈ 0, was entirely inside the floor, and `fairy`'s wings — which
 * `buildFairy` deliberately sweeps BACK to z = -0.94 so they hinge at the shoulder — were buried to the
 * last triangle. Two of the nineteen families were rendering as blank domes and the geometry was innocent.
 *
 * So the depth stack is now explicit, and it is solved per family rather than shared: the lens goes behind
 * the slime instead of under it, and the portrait's own measured back face is planted just clear of it. A
 * fraction of a radius, because the socket is shallow and the budget between the lens and the glass is all
 * the room there is.
 */
const CLEAR_OF_LENS = 0.05;

export interface Portrait {
  /** The family's body: the same shared lathe the herd draws, colour baked per vertex. */
  body: THREE.BufferGeometry;
  /** Its signature feature, already merged: opaque, translucent and self-moving buffers. */
  feature: FeatureBake;
  /** Uniform scale from body units into window radii, solved from the real bounds below. */
  fit: number;
  /** Where to put the group's origin so the portrait is centred in the socket, in window radii. */
  lift: number;
  /**
   * And where to put it in DEPTH, so the portrait's own back face lands `CLEAR_OF_LENS` in front of the
   * socket's back wall rather than inside it. Per family, because the families are not the same depth: a
   * rock is as deep as it is wide and a fairy carries a pair of wings a body-length behind its shoulder.
   */
  sink: number;
  /**
   * The face, in body units. An unashamed simplification of `Slime.tsx`'s layout — that one solves for
   * lids, brows, gaze targets and blink at four stages against `STAGE_LOOK`, none of which survives at
   * fifty pixels. What does survive, and what a child reads first, is TWO DARK DOTS LOW ON A ROUND
   * BODY, so that is what this solves for: sat on the real surface via the profile's own `radiusAt`,
   * because a fixed offset floats the eyes off a squat rock and buries them in a slender fairy.
   */
  eye: { r: number; gap: number; y: number; z: number };
  /**
   * Whether this family's eyes are shut, straight off `look.ts`. `sleepy` is the only one, and its shut
   * eyes are a third of its stated signature — "flopped nightcap + closed eyes + Z" — so a portrait
   * that opened them would be drawing a different animal.
   */
  shut: boolean;
  /**
   * The resting yaw, radians, and the ONLY per-family art direction left in this file.
   *
   * Zero is face-on. A face-on slime shows its crown and its face and hides everything that is a
   * profile: cat's curled tail, mango's lean, wood's forking branch, bunny's one flopped ear. So the
   * default is a three-quarter turn, and the handful of families whose read is a silhouette rather
   * than a crown are turned further. Nothing here changes WHAT is drawn — only which side of it faces
   * a child first.
   */
  turn: number;
}

/**
 * WHICH WAY A FAMILY FACES IN ITS WINDOW, and this table earned its existence the hard way.
 *
 * The first pass turned everything a generous three-quarters, on the reasoning that a three-quarter view
 * shows both the crown and the profile. In the shots, `bunny` — whose ears are the most legible signature
 * in the whole set on the grass — came back as a cream teardrop with two THREADS on it. The reason is
 * written in `buildBunny`: an ear is a broad flat shell posed `RY(±0.24)`, i.e. its face pointed almost
 * straight at a viewer standing in front, and that builder's own note records that the ears had to be
 * widened once already because "seen from anywhere but dead ahead, a cupped ear presents its edge and
 * becomes a line". Turning the portrait 29° is being somewhere but dead ahead. The badge was undoing a
 * fix that `crests.ts` had already had to make.
 *
 * So the angles below are read off the builders rather than guessed, and they split three ways:
 *
 *   · BROAD SHELLS POSED FORWARD want to be seen forward. Bunny's ears, lion's mane ring (which is
 *     centred at FACE height and whose whole point is the face inside it), strawberry's calyx.
 *   · PARTS POSED AT AN ANGLE want that angle cancelled. Sleepy's cap is built `RY(-0.5)` with its
 *     pompom on the cap's own +x, so turning the slime +0.5 squares the cap up and puts the pompom out
 *     on the silhouette. Mango's leaf is `RY(-0.9)` and its body leans in X — the lean shows face-on
 *     either way, so the turn is spent on the leaf.
 *   · PARTS BEHIND THE HIP need a turn the other way, and cat is the only one. Its tail is rooted at
 *     2.3 rad, on the back-right quarter; a NEGATIVE turn walks that quarter round onto the silhouette,
 *     where `buildCat` says a silhouette feature has to work. A positive turn of the same size hides it
 *     behind the body, which is what the first pass did.
 *
 * Everything not named takes `TURN_DEFAULT`: enough of a three-quarter to give a body form and to show
 * that this is a solid object rather than a sticker, not enough to foreshorten anything that matters.
 */
const TURN: Partial<Record<Family, number>> = {
  /** Ears are broad shells aimed forward. Almost face-on, with just enough turn to round the body. */
  bunny: 0.12,
  /** The tail is on the back-right quarter. Negative brings it round onto the outline. */
  cat: -0.7,
  /** The mane is a ring at face height and the face belongs inside it. */
  lion: 0.15,
  /** Cancels the cap's own `RY(-0.5)`, which squares the cap and swings the pompom out. */
  sleepy: 0.5,
  /** Spends the turn on the leaf; the body's lean is in X and reads at any angle. */
  mango: 0.35,
  /** The fuse curves in one plane and the lit tip should be off the shoulder, not behind it. */
  bomb: 0.45,
  /** The calyx points are broad and forward-facing, like bunny's ears. */
  strawberry: 0.2,
  /** The trunk leans in X and the two forks splay symmetrically: nearly face-on is the widest read. */
  wood: 0.2,
};
const TURN_DEFAULT = 0.3;

/**
 * The bounding box of a whole slime — body plus every feature buffer — in body units.
 *
 * Solved rather than typed, which is the point: nineteen families times a crest each is nineteen chances
 * to hand-tune a scale until a rose's petals are clipped or a rock rattles around in a socket four times
 * its size. `computeBoundingBox` on a shared buffer is idempotent and its result is the same cache
 * three.js keeps for frustum culling, so this is free after the first family.
 */
function boundsOf(body: THREE.BufferGeometry, feature: FeatureBake): THREE.Box3 {
  const box = new THREE.Box3();
  const eat = (g: THREE.BufferGeometry | null, offset?: readonly [number, number, number]) => {
    if (!g) return;
    if (!g.boundingBox) g.computeBoundingBox();
    const b = g.boundingBox;
    if (!b) return;
    const own = b.clone();
    // The aura layer is baked relative to its own origin — see `featureGeometry` — so it has to be put
    // back into body space before it can be unioned with anything else. Getting this wrong shows up as
    // a fire slime whose flames are measured at the floor and whose portrait is therefore half-size.
    if (offset) own.translate(new THREE.Vector3(offset[0], offset[1], offset[2]));
    box.union(own);
  };
  eat(body);
  eat(feature.trim);
  eat(feature.glaze);
  eat(feature.aura, feature.auraOrigin);
  return box;
}

const portraits = new Map<Family, Portrait>();

/**
 * A family's window portrait. Nineteen of these exist at most, each built on first sight.
 *
 * Every number in it is derived from the same bakes the ranch is drawn from, so the only way for a
 * window to disagree with the grass is for the grass itself to have changed.
 */
export function portraitOf(family: Family): Portrait {
  const hit = portraits.get(family);
  if (hit) return hit;

  const bake = gumdropGeometry(family);
  const feature = featureGeometry(family, PORTRAIT_STAGE);
  const box = boundsOf(bake.geometry, feature);

  // The extent the fit is solved against: honest at the bottom, capped at the top and at the sides. See
  // `ROOM` for why the honest box is the wrong thing to fit.
  const floor = Math.min(box.min.y, 0);
  const ceiling = Math.min(box.max.y, floor + bake.height * (1 + ROOM.crest));
  const across = Math.max(
    Math.min(Math.max(box.max.x - box.min.x, box.max.z - box.min.z), bake.halfWidth * 2 * ROOM.across),
    1e-4,
  );
  const tall = Math.max(ceiling - floor, 1e-4);
  const fit = Math.min(FIT.across / across, FIT.tall / tall);
  // Centre the extent that was fitted, so the crop the cap implies is spent entirely at the TOP — where a
  // trimmed crest is a crest behind a rim, rather than at the bottom, where a trimmed body is an animal
  // sinking through the floor of its own window.
  const lift = -((floor + ceiling) / 2) * fit;
  // The back face of the whole thing, forward of the lens. `box.min.z` is negative for every family and is
  // a long way negative for the two with parts behind the shoulder, which is exactly why this is solved
  // from the bounds rather than shared.
  const sink = CLEAR_OF_LENS - box.min.z * fit * SQUASH_Z;

  /* --- the face ---------------------------------------------------------------
     Low on the body, which is the oldest baby-proportion trick there is and is what `Slime.tsx` does
     with `eyeRise`. The ring is the body's real half-width at that height, so the pair sits on the
     hide rather than in front of it, and the eye is capped against that ring so a narrow family does
     not get eyes wider than its own head. */
  const t = 0.4;
  const ring = bake.radiusAt(t);
  const eyeR = Math.min(bake.halfWidth * 0.3, ring * 0.44);
  const portrait: Portrait = {
    body: bake.geometry,
    feature,
    fit,
    lift,
    sink,
    eye: {
      r: eyeR,
      gap: Math.max(eyeR * 1.1, ring * 0.46),
      y: t * bake.height,
      // Set INTO the hide: most of the ball inside the jelly, only its front cap out. Same reasoning as
      // `Slime.tsx`, and at this size it is also what stops the two eyes reading as ears.
      z: ring * 0.82,
    },
    shut: FAMILY_LOOK[family]?.eyesClosed === true,
    turn: TURN[family] ?? TURN_DEFAULT,
  };
  portraits.set(family, portrait);
  return portrait;
}

/** How far to flatten a portrait in depth so it stays behind its own glass. Read by `Pack.tsx`. */
export const PORTRAIT_SQUASH = SQUASH_Z;

const lenses = new Map<Family, THREE.MeshStandardMaterial>();

/**
 * Perceived lightness of an sRGB hex, 0..1. Rec.601 weights, which is the cheap one and is more than
 * accurate enough to answer the only question asked of it below: is this body pale or not.
 *
 * PARSED BY HAND RATHER THAN THROUGH `THREE.Color`, and that is not fussiness — the first version used
 * `THREE.Color` and silently got the wrong answer for the one family it mattered most for. Three's colour
 * management is on by default from r152, so `new THREE.Color('#cfe6f2').r` is not 0.81, it is 0.63: the
 * constructor converts sRGB to the LINEAR working space. Every channel comes out lower, so a threshold
 * reasoned about in sRGB is quietly applied against linear values and lands in the wrong place. `air`
 * measured 0.75 instead of 0.88, fell on the wrong side of the test, and got the pale backing that makes
 * a white slime invisible — which is the exact failure this function exists to prevent.
 */
function lightness(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  return r * 0.299 + g * 0.587 + b * 0.114;
}

/**
 * Above this, a body is too pale to be seen against its own pale inner colour. Set so that exactly the two
 * families `PAINT`'s own note calls out — `bunny` at 0.90 and `air` at 0.88 — fall on the far side of it,
 * and the next lightest, `lion` at 0.72, does not.
 */
const PALE = 0.78;

/**
 * THE FLOOD BEHIND THE SLIME, in the family's own colour, chosen to be the one that the family's body is
 * NOT.
 *
 * This is the first tier of the two-tier read and it is doing three jobs at once.
 *
 *   1. COLOUR AT ANY SIZE. A portrait needs about fifty pixels; a flooded disc needs four. Whatever
 *      happens to the pack's size on a small display, the row still says *rose, grass, grass, gold* by
 *      colour alone, so the read degrades gracefully instead of falling off a cliff.
 *   2. CONTRAST, WHICHEVER WAY ROUND THE FAMILY NEEDS IT. For the fifteen mid-toned families the flood is
 *      `inner`, the family's own lit underside: a mid body on a pale backing. For the pale ones —
 *      `bunny`'s cream and `air`'s almost-white, the two `PAINT` singles out as vanishing at this size —
 *      that would be white on white, so they take `glyph` instead, the family's darkest relative, which
 *      is already documented in `Paint` as the value that reads at eight pixels. Same hue either way, so
 *      job 1 is unaffected; only the direction of the contrast flips. Nothing is hand-picked: the choice
 *      falls out of the skin's own lightness.
 *   3. IT SEPARATES THE PAIRS. `frost`/`ice` and `rose`/`strawberry` are near neighbours as bodies and
 *      clearly different as flooded discs, because `inner` is the most spread channel in `PAINT`.
 *
 * Lifted with a little emissive so the row reads the same in the barn's shadow as in the open, which a
 * purely diffuse disc a centimetre from the eye does not. Nineteen tiny standard materials at most, built
 * on demand, shared by every window that shows that family.
 */
export function lensMaterial(family: Family): THREE.MeshStandardMaterial {
  const hit = lenses.get(family);
  if (hit) return hit;
  const p = paintOf(family);
  /**
   * A MIRROR HAS NO COLOUR OF ITS OWN, so the flood has to carry all of it.
   *
   * `gold` is `metalness: 0.95` against the procedural sky in `gumdrop.ts`, which means everything you see
   * on its hide is a reflection: pale sky on the shoulders and GRASS GREEN underneath. That is not a bug
   * and it is not this file's business to correct it — a gold slime on the ranch looks exactly the same
   * way, and `PAINT`'s own note admits "the window cannot show a reflection". But it does mean gold is the
   * one family whose body cannot be trusted to say which family it is, so it is treated like the pale ones
   * and takes the deep tone: a rich gold disc with a mirror-bright creature standing on it. Gated on
   * `look.metal` above a half, which is `gold` alone — `bomb` at 0.3 and `ice` at 0.12 keep their own
   * colours and want the pale backing.
   */
  const mirrored = (FAMILY_LOOK[family]?.metal ?? 0) > 0.5;
  const tone = mirrored || lightness(p.skin) > PALE ? p.glyph : p.inner;
  const m = new THREE.MeshStandardMaterial({
    color: tone,
    roughness: 0.85,
    metalness: 0,
    emissive: new THREE.Color(tone),
    // Enough to hold its value in shadow, low enough that the socket never out-glows the slime standing
    // in it — which is the one thing that would turn a portrait back into a silhouette.
    emissiveIntensity: 0.34,
  });
  lenses.set(family, m);
  return m;
}
