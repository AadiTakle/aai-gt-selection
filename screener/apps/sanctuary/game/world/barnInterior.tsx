import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef, type JSX } from 'react';
import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  Euler,
  type Group,
  Matrix4,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

import {
  BARN,
  BARN_D,
  BARN_IN_HALF_D,
  BARN_IN_HALF_W,
  BARN_PLINTH_H,
  BARN_RISE,
  BARN_W,
  BARN_WALL_H,
  BARN_EAVE,
  BARN_FLOOR_Y,
  DOOR,
  DOOR_HINGE_Z,
  LADDER,
  LOFT,
  LOFT_POSTS,
  STALL_RANGE,
  STALL_FRONT_X,
  STALL_DIVIDERS,
  doorTarget,
} from './barn';
import { Instanced, type Placement } from './instanced';
import { usePrefersReducedMotion } from './motion';
import { damp, rng } from './noise';
import { PIG, materials } from './pigment';

/**
 * INSIDE THE BARN, AND THE DOORS THAT LET YOU IN.
 *
 * The owner asked for three things in one sentence — doors that swing, a barn you can walk into, and
 * stables to find when you do. `barn.ts` holds the plan and the two proofs; this file is what you see.
 *
 * WHAT MAKES AN INTERIOR WORTH WALKING INTO, in the order the eye takes it:
 *
 *   A CEILING THAT IS NOT THE SKY. The gable roof's soffit is already overhead — it is a closed slab, so
 *   the underside is really there. What was NOT there is the strip between the wall head and that soffit:
 *   the soffit sits 38cm above the wall head at the wall line, so hollowing the barn opened a 14-metre
 *   slot of daylight along each eave. `eaveClosure` fills it and the RAFTERS in front of it are what turn
 *   a ceiling into a roof you are standing under.
 *
 *   SOMETHING AT EVERY HEIGHT. Stalls at knee-to-chest, mangers and bedding below them, a hayloft
 *   overhead you have to duck under coming in, rafters above that. A room a child wants to stand in is a
 *   room where looking up is rewarded, and the loft is the piece that does that: you walk in beneath it,
 *   the space opens out, and there is a ladder up to a floor with bales on it.
 *
 *   LIGHT THAT COMES FROM SOMEWHERE. Two lanterns, and the real sun through the real doorway. That
 *   second one is not an effect: the barn's 94.5° turn happens to face its doors within 41° of the sun's
 *   bearing, so the sun genuinely shines in, and the walls genuinely shadow it. The bright wedge on the
 *   floor inside is cast by the doorway it came through, and it moves correctly across the leaves of the
 *   doors as they swing.
 *
 * WHAT IT COSTS, AND THE ONE OPTIMISATION THAT MATTERS. Every repeated part is one `InstancedMesh`, so
 * the whole interior — four stalls a side, their dividers, fronts, bedding and mangers, eight loft joists,
 * a ladder, bales, lanterns and a scatter of straw — is about twenty draw calls. But three has no
 * occlusion culling, so from outside the barn all twenty would be drawn behind an opaque wall for nothing.
 * The interior group therefore turns its own `visible` off past 26 metres, which drops it from the render
 * list entirely for the majority of the time a child spends on the ranch. Nothing inside casts a shadow
 * either: the only light that could cast is the sun, the sun cannot see most of this, and the shadow pass
 * is the more expensive half of every mesh.
 *
 * REDUCED MOTION. The brief is explicit: the doors SNAP rather than swing. They still open and close on
 * proximity, because that is the interaction and taking it away would be taking away the feature; what
 * goes is the eased arc, which is the part that moves for a second and a half after a child stops walking.
 */

/* ------------------------------------------------------------------ *\
   Heights, in world metres, because the interior meets the ground
\* ------------------------------------------------------------------ */

/** The top of the plinth, which is where the walls start and where a wall-mounted thing is measured from. */
const WALL_BASE = BARN_PLINTH_H;
const WALL_TOP = BARN_PLINTH_H + BARN_WALL_H;
/** Half the roof's span, needed to find where its soffit crosses the wall. */
const ROOF_HALF_W = BARN_W / 2 + BARN_EAVE;

/**
 * The height of the roof's soffit above the wall head, at a given local x.
 *
 * Taken from `roofs.ts`'s own construction rather than measured off a screenshot: the soffit ring lies on
 * the wall-head plane at the eave corners and rises linearly to `rise` at the ridge, so its height at `x`
 * is `rise * (1 - |x| / halfRoof)`. Everything that has to fit under the roof from the inside — the eave
 * closure boards, the rafters, the loft — is derived from this function, which is the same discipline
 * `roofs.ts` uses to keep a roof out of its own walls one storey down.
 */
function soffitAbove(localX: number): number {
  return BARN_RISE * (1 - Math.abs(localX) / ROOF_HALF_W);
}

/* ------------------------------------------------------------------ *\
   The stalls, sized against the keeper rather than against the wall
\* ------------------------------------------------------------------ */

/**
 * EVERY STALL HEIGHT, WITH THE KEEPER'S EYE WRITTEN BESIDE IT.
 *
 * `Game.tsx` walks a child at about 1.5m and the preview draws a 1.5m pole at the spawn for exactly this
 * purpose, so 1.5m is the ruler every number below is set against. The old interior had a 1.37m partition
 * and a 0.70m front on a stall 1.15m deep, which measured against that ruler is a bench with a back on it.
 *
 *   `dividerTop` = 1.52 — LEVEL WITH THE KEEPER'S EYE, and the single most load-bearing number here. A
 *   child standing in the aisle looks along the tops of the partitions rather than down onto them, which is
 *   what "these are rooms for something much bigger than me" feels like from the inside. Real box-stall
 *   partitions are 1.4m of boarding with a grill above; this is that, one notch taller so the ruler lands
 *   on it exactly.
 *
 *   `frontBoard` = 0.88 — DELIBERATELY BELOW the horse scale, and the one member that is. The original
 *   file's argument for a low front is right and survives: boarded to the top and a child cannot see the
 *   bedding, the manger or the bucket, which wastes everything inside. 0.88 is a five-year-old's shoulder,
 *   so they look over it into a stall whose walls are taller than they are — which is a better read than
 *   either extreme, because it needs BOTH heights to work.
 *
 *   Between the two, spindles. Open, so the stall is visible right up to the rail, and vertical, because a
 *   horizontal grill at a child's eye height reads as a cage.
 */
const STALL = {
  /** Top of the boarded lower half of a partition. */
  dividerSolid: 1.16,
  /** Top of the partition, and of the stall front's rail. The keeper's eye height. */
  dividerTop: 1.52,
  /** Top of the boarded front, at a child's shoulder. */
  frontBoard: 0.88,
  /** Section of the top rail, so the rail's centre can be derived from `dividerTop`. */
  rail: 0.12,
  /** The corner post where a partition meets the aisle. */
  post: 0.15,
} as const;
const RAIL_Y = STALL.dividerTop - STALL.rail / 2;

/* ------------------------------------------------------------------ *\
   Bales
\* ------------------------------------------------------------------ */

/**
 * A BALE, AND WHAT MAKES ONE.
 *
 * The owner's words were "the haybales and stables inside the barn also look poorly rendered ... they
 * overall need more detail and proportional scale", and the bales were the clearer of the two failures: one
 * `RoundedBoxGeometry(1, 1, 1)` with a 14cm fillet, scaled per instance to whatever size was wanted. Two
 * things follow from that and both are visible in a screenshot. A unit rounded box scaled to 1.25 x 0.72 x
 * 0.85 gets three different fillet radii, so it arrives as a pillow rather than a compressed block; and
 * scaled to 0.42 x 0.30 x 0.8 for a forkful in a manger it arrives as a stick of butter, which is precisely
 * what the shot of the stalls showed sitting in every manger.
 *
 * A bale is three things the box had none of: a REAL SIZE, TWINE, and CUT ENDS. Small square bales are
 * about 0.95 x 0.45 x 0.40, which is a size a child has a reference for — it is a thing one person picks up
 * — and at that size the twine spacing and the depth of the cut ends are fixed rather than arbitrary.
 *
 * ONE FIXED GEOMETRY, TRANSFORMED, NOT SCALED. Every bale is the same size and only its placement differs,
 * so the fillet is the same on all of them and the twine sits in the same place relative to the body on all
 * of them. Variety comes from where they are and how they are turned, which is where a stack's variety
 * actually comes from.
 */
export const BALE = { l: 0.95, h: 0.4, d: 0.45 } as const;

/**
 * The three geometries a bale is made of, so the yard outside the barn builds the same bale as the loft
 * inside it.
 *
 * EXPORTED RATHER THAN DUPLICATED, and the reason is the thing this whole change is about: `Buildings.tsx`
 * had its own 1.25 x 0.72 x 0.82 rounded box with its own twine bands, so there were two answers to "what
 * does a bale look like on this ranch" and they did not match. Three bales stood five metres outside the
 * barn doors and eleven inside them, and a child walks past the first set on the way to the second.
 */
export function baleGeometries(): {
  body: RoundedBoxGeometry;
  twine: RoundedBoxGeometry;
  cut: RoundedBoxGeometry;
} {
  return {
    // A 4cm fillet on a 40cm-deep block reads as compressed hay; the 14cm one it replaces read as a pillow.
    body: new RoundedBoxGeometry(BALE.l, BALE.h, BALE.d, 2, 0.04),
    // Twine wrapping the girth: thin along the bale and 1cm proud of it on the other two axes, so it shows
    // on the top and both long faces. Sunk inside instead, it showed only as two dots on the cut ends.
    twine: new RoundedBoxGeometry(0.026, BALE.h + 0.02, BALE.d + 0.02, 1, 0.01),
    // The cut ends, inset a little and a hair proud of each end face.
    cut: new RoundedBoxGeometry(0.022, BALE.h - 0.055, BALE.d - 0.055, 1, 0.012),
  };
}

/** Where a bale's twine and cut ends sit along its own length, so both callers space them identically. */
export const BALE_TWINE_X = BALE.l * 0.26;
export const BALE_CUT_X = BALE.l / 2 + 0.004;

/* ------------------------------------------------------------------ *\
   Feed sacks
\* ------------------------------------------------------------------ */

/**
 * A FEED SACK, WITH THE BALES' OWN BUG TAKEN OUT OF IT.
 *
 * The three sacks by the barn door were the last thing on the ranch still built the way the bales used to
 * be, and they had the same two failures — which is why they read as marshmallows standing next to what are
 * now crisp bales. `RoundedBoxGeometry(0.62, 0.86, 0.5, 4, 0.22)`:
 *
 *   THE FILLET WAS 88% OF THE HALF-DEPTH. A 22cm radius on a box only 50cm deep leaves 3cm of flat face in
 *   the middle of a 50cm span. That is not a rounded box, it is a capsule; there is no edge anywhere on it
 *   for the sun to break over, so it lit as one smooth blob whatever angle it was seen from.
 *
 *   AND IT WAS SCALED PER INSTANCE, at 1, 0.9 and 0.85, so the three of them had three different fillet
 *   radii — the exact defect recorded at `BALE` above, where one rounded box scaled per instance came out a
 *   pillow at one size and a stick of butter at another. A fillet is a physical radius. It cannot be scaled
 *   any more than the corner of a real sack changes shape when you stand a smaller sack beside it.
 *
 * So this is the bale's doctrine applied to a sack: ONE FIXED SIZE, a fillet fixed in world units, and
 * variety from how they are turned rather than from how big they are.
 *
 * AND A SACK IS NOT A BOX, which is the other half of it. What makes the silhouette read is the GATHERED
 * TOP — the neck where the cloth is folded over and tied — so there are three parts here rather than one,
 * exactly as a bale is a body plus twine plus cut ends. Take the neck away and no radius saves it: it is a
 * bag only because it has been closed at the top.
 *
 * IT TAKES THREE STAGES TO READ, WHICH A SCREENSHOT SETTLED. The first attempt was a body with a single
 * gathered block on top of it, and at 0.34 wide that block sat on the shoulders like a stopper: the thing
 * came out a storage jar with a lid, which is a different wrong answer from a marshmallow but not a better
 * one. What a sack actually does is TAPER — full at the floor where the weight is, drawn in at the
 * shoulder, pinched to a twist at the tie — so it is modelled as three stages that each step in from the
 * one below. Two stages is a jar. Three is a sack, and the third is only 18cm across.
 *
 * 0.54 at the base and about 80cm to the top of the twist puts it at a size one farmhand lifts, and stands
 * it correctly against the 40cm bale it is beside — which is the comparison that matters, because they are
 * in the same frame and the bales are the thing the eye has already accepted.
 */
export const SACK = {
  /** The base: full width, where the feed has settled. */
  w: 0.54,
  h: 0.5,
  d: 0.38,
  /** The shoulder, drawn in from the base. */
  shoulderW: 0.42,
  shoulderH: 0.26,
  shoulderD: 0.3,
  /** And the twisted top above the tie. */
  neckW: 0.2,
  neckH: 0.2,
  neckD: 0.17,
  /**
   * Centre heights above the ground, so a caller places the four parts of one sack in agreement.
   *
   * THE STAGES OVERLAP BY MORE THAN HALF THE STEP THEY TAKE IN, and that is the number a screenshot had to
   * settle rather than arithmetic. Stacked so they merely touch, the three read as three boxes on top of
   * each other — every stage's rounded underside shows as a shelf and the thing comes out a wedding cake.
   * Sunk into each other by 12cm and 7cm, the same three silhouettes merge into one form that narrows as
   * it rises, which is what a sack of feed does.
   */
  bodyY: 0.25,
  shoulderY: 0.5,
  neckY: 0.68,
  /**
   * The tie sits ABOVE the shoulder, not at the neck's own base, and that is a consequence of the overlap
   * above rather than an independent choice. Sunk 7cm into the shoulder, the neck's base is inside it, so a
   * band placed there is inside it too and shows as a pale speck — which is exactly what the first pass
   * put on screen. So the neck is lifted until 15cm of it is in the clear and the tie goes on THAT, 7cm
   * above the shoulder, leaving the last 8cm standing above the twine as the ear of cloth every tied sack
   * has. Sat down on the shoulder's own top instead, the band reads as a plank laid across the sack.
   */
  tieY: 0.7,
} as const;

/**
 * The three geometries a feed sack is made of.
 *
 * EXPORTED RATHER THAN BUILT WHERE THEY ARE DRAWN, for the same reason `baleGeometries` is: the sacks are
 * placed by `Buildings.tsx`, in the yard, but what a sack IS belongs beside what a bale is. Keeping the two
 * definitions in one file is what stopped the ranch having two different bales, and the sacks stand in the
 * same frame as the bales do.
 */
export function sackGeometries(): {
  body: RoundedBoxGeometry;
  shoulder: RoundedBoxGeometry;
  neck: RoundedBoxGeometry;
  tie: RoundedBoxGeometry;
} {
  return {
    // A 7cm fillet on a 38cm depth is 37% of the half-span: soft enough to be cloth over loose feed, hard
    // enough to keep an edge for the sun to break over. The 22cm one it replaces was 88%, which is a
    // capsule — no edge anywhere on it, which is exactly why it lit as a marshmallow.
    body: new RoundedBoxGeometry(SACK.w, SACK.h, SACK.d, 2, 0.07),
    // The shoulder, where the sack is drawn in above the weight.
    shoulder: new RoundedBoxGeometry(SACK.shoulderW, SACK.shoulderH, SACK.shoulderD, 2, 0.06),
    // The twist above the tie. Rounder in proportion than anything below it, because up here it is only
    // cloth — this is the one part of a sack that has no shape of its own.
    neck: new RoundedBoxGeometry(SACK.neckW, SACK.neckH, SACK.neckD, 2, 0.05),
    // And the twine round the throat, proud of the neck on every side so it reads as a band rather than as
    // a seam. Same trick, and the same reason, as the bale's twine standing 1cm off the hay.
    tie: new RoundedBoxGeometry(SACK.neckW + 0.04, 0.05, SACK.neckD + 0.04, 1, 0.016),
  };
}

interface BaleParts {
  baleBody: Placement[];
  baleTwine: Placement[];
  baleCut: Placement[];
}

/**
 * One bale's five parts, in the frame the bale is placed in.
 *
 * THE MATRIX IS BUILT THE WAY `Instanced` BUILDS ITS OWN — `Euler(x, y, z, 'ZYX')` into a quaternion into
 * `Matrix4.compose` — and that is not incidental. A bale tipped on a stack has a roll as well as a yaw, and
 * its twine has to be tipped with it. Composing the child offsets by hand from sines and cosines would be a
 * second, independent opinion about what `rot` means, and the two would disagree the first time a bale was
 * given a roll — which is when it matters, because that is when the twine would slide off the bale.
 *
 * `shade` IS A MULTIPLIER, NOT A COLOUR, and the distinction is the one `pigment.ts` warns about at the top:
 * an instance colour multiplies the material's own, so the body and twine — whose materials carry the hay
 * and twine pigments — take a near-white brightness that varies bale to bale, while the cut ends, whose
 * material is white precisely so it can be coloured per instance, take a real colour.
 */
function baleParts(
  into: BaleParts,
  at: readonly [number, number, number],
  rot: readonly [number, number, number],
  shade: Color,
  cutTint: Color,
): void {
  const m = new Matrix4().compose(
    new Vector3(at[0], at[1], at[2]),
    new Quaternion().setFromEuler(new Euler(rot[0], rot[1], rot[2], 'ZYX')),
    new Vector3(1, 1, 1),
  );
  const put = (list: Placement[], lx: number, ly: number, lz: number, color: Color): void => {
    const p = new Vector3(lx, ly, lz).applyMatrix4(m);
    list.push({ position: [p.x, p.y, p.z], rot, color });
  };
  put(into.baleBody, 0, 0, 0, shade);
  // Twine wraps the girth: two bands at a quarter of the length in from each cut end.
  for (const dx of [-BALE_TWINE_X, BALE_TWINE_X]) put(into.baleTwine, dx, 0, 0, shade);
  // And the cut ends, which are the paler, rougher faces where the knife went through.
  for (const dx of [-BALE_CUT_X, BALE_CUT_X]) put(into.baleCut, dx, 0, 0, cutTint);
}

/* ------------------------------------------------------------------ *\
   The doors
\* ------------------------------------------------------------------ */

/**
 * THE LEAF, AS LAYERS, MEASURED BACK FROM THE WALL'S OUTER FACE.
 *
 * Every number here is a DEPTH BEHIND the pivot plane, so every one of them is positive and every member
 * is placed at minus its own entry. That sign convention is the discipline that keeps the door seated: the
 * plane `z = 0` in the hinge's frame is the masonry's outer face, nothing is allowed in front of it, and a
 * member's depth is simply how far into the 34cm reveal it sits. `DOOR.depth` in `barn.ts` is the back of
 * the deepest layer and is what the no-clip sweep bounds the assembly by, so the two have to agree — the
 * assertion in `barn.test.ts` is what says they do.
 *
 * The order is the order a door is actually built up, outermost first, and each layer stands proud of the
 * one behind it by enough to throw a shadow at the distance a child stands. That relief is not decoration:
 * a flat face in this world resolves to near-black — it is why the eave soffits had to become painted trim
 * — so a door whose members all sit in one plane reads as a hole cut in the wall, which is the exact fault
 * being fixed here. Tonal steps between the layers do the other half of that job.
 */
const LAYER = {
  /** Brass: bolt heads, hinge knuckles, ring pulls, the drop bar. Dead flush with the wall's own face. */
  brass: 0,
  /** The strap hinges, 1.2cm back, so the bolt heads that hold them stand proud of them. */
  strap: 0.012,
  /** The painted frame — kick board, ledges, braces — with the straps standing 1.8cm off it. */
  frame: 0.03,
  /** The boarded face, 5.5cm behind the frame that crosses it. That step is the door's biggest shadow. */
  board: 0.085,
  /** The dark core the boards are laid on. It is what shows through the gaps between them. */
  core: 0.119,
  /** The ledges on the INSIDE, which is all a child sees of the leaves once the doors have opened. */
  back: 0.174,
} as const;

/** Member thicknesses, so a layer's back edge is `LAYER.x + THICK.x` and the stack has no air in it. */
const THICK = {
  brass: 0.024,
  strap: 0.03,
  frame: 0.055,
  board: 0.034,
  core: 0.055,
  back: 0.046,
} as const;

/**
 * The bottom of the leaf, 3cm above the threshold slab, in world metres.
 *
 * The threshold is laid level with the floor at `BARN_FLOOR_Y`, and 3cm of daylight under a barn door is
 * what a barn door has. Nought would z-fight with the stone; more would be a gap a child looks through.
 */
const LEAF_BASE_Y = BARN_FLOOR_Y + 0.03;
/** Boards to a leaf, and the dark line left between them. See the note where the pitch is worked out. */
const BOARDS = 7;
const BOARD_GAP = 0.026;
/** Where the three straps and their knuckles land, in world metres: on the kick board and each ledge. */
const STRAP_Y = [0.36, 2.05, 3.72] as const;
/**
 * The drop bar: how far its pivot sits in from the free edge, and how far it throws open.
 *
 * LENGTH EQUALS SETBACK, WHICH IS WHY THERE IS ONLY ONE NUMBER. The bar has to land its tip exactly on the
 * leaf's free edge: any shorter and it stops in open air short of the join, which reads as a broken part
 * rather than a fastening; any longer and it crosses into the other leaf's half, where it would foul the
 * catch the moment the doors moved and would put the assembly outside the box `barn.ts` sweeps. Pivoting
 * it `BAR_SPAN` in from the edge and running it `BAR_SPAN` back out is the one arrangement that lands on
 * the edge and stays there however the leaf is sized later.
 */
const BAR_SPAN = 0.72;
const BAR_LIFT = 0.85;

/**
 * The back of the deepest layer, which has to be exactly `DOOR.depth`, and is asserted to be.
 *
 * THE ONE NUMBER TWO FILES SHARE, so it is derived here and checked there rather than typed twice. The
 * no-clip sweep in `barn.ts` bounds the whole assembly by a box `DOOR.depth` deep; if a later edit puts a
 * fourth layer on the back of the leaf and forgets to widen that box, the sweep would go on reporting a
 * clean swing for geometry that had grown out of it — a proof quietly measuring the wrong object, which is
 * worse than no proof. `barn.test.ts` fails the moment these two disagree.
 */
export const LEAF_STACK_DEPTH = LAYER.back + THICK.back;

/**
 * The two leaves, swinging on proximity.
 *
 * PROXIMITY IS THE WHOLE INTERACTION, per the brief: nothing to press, nothing to learn. The keeper IS the
 * camera in `Game.tsx` — it locks the camera to a walking height and pushes it out of `SOLIDS` — so this
 * needs no wiring and no prop. It reads `useThree`'s camera, which is the same object the player
 * controller moves, and therefore cannot fall out of step with where the child actually is.
 *
 * THE EASING IS `damp`, not a lerp on a fixed step, so the arc is identical at 30fps and 144fps. At a rate
 * of 2.6 a leaf covers most of its 82° in about half a second and settles over the next second, which is
 * the weight a four-metre timber door has. A linear tween reads as a garage door.
 *
 * THE HYSTERESIS IS IN `barn.ts`. A single distance threshold makes the doors flutter for a child standing
 * on it, and a child WILL stand on it, because the doors moving is the interesting thing.
 */
function BarnDoors({ reduced }: { reduced: boolean }): JSX.Element {
  const m = materials();
  const camera = useThree((s) => s.camera);
  const leaves = useRef<(Group | null)[]>([null, null]);
  const bar = useRef<Group>(null);
  const angle = useRef(0);
  const open = useRef(false);

  const g = useMemo(() => {
    const L = DOOR.leaf;
    const H = DOOR.leafH;
    /** The leaf's mid-height in world metres. Every height below is quoted from the ground and shifted. */
    const midY = LEAF_BASE_Y + H / 2;
    const y = (worldY: number): number => worldY - midY;

    /**
     * SEVEN BOARDS TO A LEAF, WHICH IS A SIZE RATHER THAN A COUNT.
     *
     * 1.85m over seven gives a 24cm board, and that is the number that had to come out right: sawn barn
     * boarding is 8 to 12 inches, a child has seen a fence, and boards half that width read as a shutter
     * while boards twice it read as nothing at all. The 2.6cm gap between them is the whole point of
     * boarding it — the dark core shows through as a hard line, so the face has fourteen tonal steps
     * across the pair instead of being one flat brown.
     */
    const pitch = L / BOARDS;
    const boardW = pitch - BOARD_GAP;

    /**
     * The braces, sized so their CORNERS fit the leaf rather than their centre lines.
     *
     * A brace is a box rotated about z, so what has to fit inside the leaf is its bounding box —
     * `len·cos θ + h·sin θ` across and `len·sin θ + h·cos θ` up. Sized by its length alone, a brace at 40°
     * pokes about a centimetre past the stile at each end, and on the HINGE stile that centimetre is past
     * the pivot line and therefore inside the jamb, where the sweep in `barn.ts` would catch it but no
     * screenshot could. So the run is set first and the length derived from it.
     */
    const braceRun = L - 0.22;
    const braceRise = 1.37;
    const braceLen = Math.hypot(braceRun, braceRise);

    return {
      L,
      y,
      boardX: (i: number): number => -L / 2 + pitch * (i + 0.5),
      /** The dark backing. Every other timber member is laid on it and reads against it. */
      core: new RoundedBoxGeometry(L, H, THICK.core, 1, 0.02),
      /** One board. Short of the full height, so a dark line closes the boarding top and bottom. */
      board: new RoundedBoxGeometry(boardW, H - 0.04, THICK.board, 1, 0.012),
      /** Kick board: the bottom rail, deeper than a ledge because it is the one that gets kicked. */
      kick: new RoundedBoxGeometry(L - 0.1, 0.52, THICK.frame, 1, 0.022),
      ledge: new RoundedBoxGeometry(L - 0.1, 0.24, THICK.frame, 1, 0.022),
      brace: new RoundedBoxGeometry(braceLen, 0.2, THICK.frame, 1, 0.022),
      braceAngle: Math.atan2(braceRise, braceRun),
      /** Ledges on the back, which is the face a child sees once the doors have swung. */
      backLedge: new RoundedBoxGeometry(L - 0.1, 0.2, THICK.back, 1, 0.018),
      /** A strap half the width of the leaf. The hut's are 0.5m on a 1.05m door; this is the same ratio. */
      strap: new RoundedBoxGeometry(0.95, 0.11, THICK.strap, 1, 0.012),
      /** The knuckle the strap turns on, at its root. Brass, because this world has no other metal. */
      knuckle: new CylinderGeometry(0.05, 0.05, 0.13, 8),
      /** Bolt heads through the straps. Small, but they are the only specular on the door. */
      bolt: new CylinderGeometry(0.026, 0.026, THICK.brass, 8),
      /** A real ring rather than the disc that was here before, which read as a coin glued on. */
      ring: new TorusGeometry(0.082, 0.016, 6, 14),
      ringBoss: new CylinderGeometry(0.045, 0.052, 0.032, 10),
      /** The drop bar, and the catch on the far leaf that it falls into. */
      dropBar: new RoundedBoxGeometry(BAR_SPAN, 0.11, 0.06, 1, 0.024),
      barPivot: new CylinderGeometry(0.05, 0.05, 0.036, 10),
      catch: new RoundedBoxGeometry(0.09, 0.17, 0.075, 1, 0.028),
    };
  }, []);

  useFrame((_, dt) => {
    const target = doorTarget(camera.position.x, camera.position.z, open.current);
    open.current = target.open;
    // Reduced motion: the doors still open, they simply arrive. See the note at the top of the file.
    angle.current = reduced ? target.angle : damp(angle.current, target.angle, 2.6, Math.min(dt, 0.05));
    leaves.current.forEach((leaf, i) => {
      if (!leaf) return;
      const side = i === 0 ? -1 : 1;
      leaf.rotation.y = side * angle.current;
    });
    /**
     * THE BAR IS THROWN BEFORE THE DOORS MOVE, which is the only reason it can exist at all.
     *
     * A drop bar is the detail a barn door wants most and the one an animated pair cannot have: a timber
     * bar lying across BOTH leaves has to break in half the moment they part. This one is fixed to one leaf
     * and reaches the join, so it never crosses — and it lifts out of its catch over the first 9° of swing,
     * mapped steeply on purpose so a child reads "the bar came up, then the doors opened" rather than "the
     * bar rotated while the doors rotated". Divided by the full 82° instead, it would drift up in lazy
     * parallel with the leaves and look like a part that had come loose.
     */
    if (bar.current) bar.current.rotation.z = Math.min(1, angle.current / 0.16) * BAR_LIFT;
  });

  return (
    <group>
      {[-1, 1].map((side, i) => (
        <group
          key={side}
          ref={(node) => {
            leaves.current[i] = node;
          }}
          /**
           * THE PIVOT: AT THE OUTER EDGE OF THE OPENING, AND IN THE WALL'S OUTER FACE.
           *
           * Both halves of that carry weight, and this one placement is what makes the whole no-clip
           * argument in `barn.ts` hold, so it is worth saying why here rather than only there.
           *
           * OUTBOARD in x, so each leaf sweeps AWAY from the middle and the two can never reach each
           * other. Hinged at the inner edges instead, which looks identical when shut, that is false.
           *
           * IN THE WALL FACE in z, with every member of the leaf hanging BACK from this plane rather than
           * forward of it. That is what seats the door: shut, its proudest face is coplanar with the
           * masonry. It is also what keeps the swing legal, and the two are the same fact. A point at
           * `x <= 0`, `z <= 0` relative to this pivot goes to `x·cos φ + z·sin φ <= 0` for any angle in
           * [0°, 90°], so nothing can pass `±halfW` and reach into a jamb.
           *
           * THE TEMPTING WRONG MOVE, recorded because it is the obvious one. The complaint was that the
           * leaves stood proud, and the reflex is to push the MESH back in its own local space and leave
           * the pivot where it was. That seats the shut door and breaks the open one: the leaf would then
           * sit behind its own hinge line, and opening it would scythe its back corner sideways through
           * the jamb — inside the masonry, where no screenshot can show it. The pivot has to move with it.
           */
          position={[side * DOOR.halfW, 0, DOOR_HINGE_Z]}
        >
          <group position={[(-side * DOOR.leaf) / 2, LEAF_BASE_Y + DOOR.leafH / 2, 0]}>
            {/* The core, and the boarding laid on it. The gaps between the boards are what the core is
                for: seven light boards over a dark back, so a face that would otherwise be one unlit
                brown has fourteen edges catching the sun across the pair. */}
            <mesh
              geometry={g.core}
              material={m.timberDeep}
              position={[0, 0, -(LAYER.core + THICK.core / 2)]}
              castShadow
              receiveShadow
            />
            <Instanced
              geometry={g.board}
              material={m.timber}
              items={Array.from({ length: BOARDS }, (_, i) => ({
                position: [g.boardX(i), 0, -(LAYER.board + THICK.board / 2)] as const,
              }))}
              frustumCulled
            />

            {/*
              THE PAINTED FRAME, AND WHY IT IS PAINTED.

              Kick board, two ledges and two braces, all in `trim` — the same cream as the battens down
              the barn's long walls, the eave boards and the barge boards. That is not a colour picked for
              the door; it is the building's existing exterior motif, and putting the door's frame in it is
              what makes the door part of the barn rather than a brown rectangle in a red wall. It is also
              the answer to this world's oldest lesson: an unlit timber face resolves to near-black, and a
              door with no tonal range between its members reads as the hole it is meant to fill.

              The braces run LOW AT THE HINGE, HIGH AT THE FREE EDGE, which is the way a brace works in
              compression — it carries the free stile's weight back down to the hinge. Mirrored between the
              leaves, the four of them make one chevron across the pair, which is the shape a child has
              seen on every barn they have ever been shown.
            */}
            <mesh
              geometry={g.kick}
              material={m.trim}
              position={[0, g.y(0.36), -(LAYER.frame + THICK.frame / 2)]}
              castShadow
            />
            <Instanced
              geometry={g.ledge}
              material={m.trim}
              items={[2.05, 3.72].map((worldY) => ({
                position: [0, g.y(worldY), -(LAYER.frame + THICK.frame / 2)] as const,
              }))}
              frustumCulled
            />
            <Instanced
              geometry={g.brace}
              material={m.trim}
              items={[1.275, 2.885].map((worldY) => ({
                position: [0, g.y(worldY), -(LAYER.frame + THICK.frame / 2)] as const,
                rot: [0, 0, -side * g.braceAngle] as const,
              }))}
              frustumCulled
            />

            {/* Straps the length of half the leaf, running from the hinge stile across the boarding, each
                on its knuckle and each bolted through three times. Long straps are the one piece of
                ironwork that reads on a door this size from across the yard. */}
            <Instanced
              geometry={g.strap}
              material={m.timberDeep}
              items={STRAP_Y.map((worldY) => ({
                position: [side * 0.44, g.y(worldY), -(LAYER.strap + THICK.strap / 2)] as const,
              }))}
              frustumCulled
            />
            <Instanced
              geometry={g.knuckle}
              material={m.brass}
              items={STRAP_Y.map((worldY) => ({
                position: [side * (g.L / 2 - 0.07), g.y(worldY), -0.05] as const,
              }))}
              frustumCulled
            />
            <Instanced
              geometry={g.bolt}
              material={m.brass}
              items={STRAP_Y.flatMap((worldY) =>
                [0.3, 0.56, 0.85].map((u) => ({
                  position: [side * (g.L / 2 - u), g.y(worldY), -(LAYER.brass + THICK.brass / 2)] as const,
                  rot: [Math.PI / 2, 0, 0] as const,
                })),
              )}
              frustumCulled
            />

            {/* A ring pull rather than a house knob, on the free stile at a height a child can reach. The
                hut's brass ball is right for a cottage door; a four-metre barn leaf is pulled, not turned. */}
            <mesh
              geometry={g.ringBoss}
              material={m.brass}
              position={[-side * 0.705, g.y(1.36), -(LAYER.brass + 0.016)]}
              castShadow
            />
            <mesh
              geometry={g.ring}
              material={m.brass}
              position={[-side * 0.705, g.y(1.26), -(LAYER.brass + 0.016)]}
              castShadow
            />

            {/* The drop bar lives on one leaf and its catch on the other, so nothing spans the join. */}
            {side < 0 ? (
              <group position={[-side * (g.L / 2 - BAR_SPAN), g.y(0.98), 0]}>
                <mesh
                  geometry={g.barPivot}
                  material={m.brass}
                  position={[0, 0, -(LAYER.brass + 0.018)]}
                  castShadow
                />
                <group ref={bar}>
                  <mesh
                    geometry={g.dropBar}
                    material={m.timberDeep}
                    position={[BAR_SPAN / 2, 0, -(LAYER.brass + 0.03)]}
                    castShadow
                  />
                </group>
              </group>
            ) : (
              <mesh
                geometry={g.catch}
                material={m.brass}
                position={[-side * (g.L / 2 - 0.045), g.y(0.98), -(LAYER.brass + 0.0375)]}
                castShadow
              />
            )}

            {/* And the inside of the leaf, which is the whole of what a child sees of these doors once
                they have opened — and, unlit, was a flat near-black panel two metres from their face. */}
            <Instanced
              geometry={g.backLedge}
              material={m.timber}
              items={[0.62, 2.05, 3.6].map((worldY) => ({
                position: [0, g.y(worldY), -(LAYER.back + THICK.back / 2)] as const,
              }))}
              frustumCulled
            />
          </group>
        </group>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ *\
   The interior
\* ------------------------------------------------------------------ */

interface Bins {
  lining: Placement[];
  stud: Placement[];
  divider: Placement[];
  /** The open grill above a partition's boarding, and above a stall front's. */
  spindle: Placement[];
  /** The capping rail on a partition and on a stall front. One section, one bin. */
  stallRail: Placement[];
  /** The post where a partition meets the aisle. */
  stallPost: Placement[];
  stallFront: Placement[];
  bedding: Placement[];
  manger: Placement[];
  /** Loose hay in a manger. Not a bale — see `BALE`. */
  forkful: Placement[];
  bucket: Placement[];
  bucketWater: Placement[];
  joist: Placement[];
  rafter: Placement[];
  eaveClosure: Placement[];
  loftPost: Placement[];
  loftRail: Placement[];
  ladderStile: Placement[];
  rung: Placement[];
  baleBody: Placement[];
  baleTwine: Placement[];
  baleCut: Placement[];
  bin: Placement[];
  lanternBody: Placement[];
  lanternGlass: Placement[];
  straw: Placement[];
  cornerBoard: Placement[];
}

/**
 * Everything inside, solved once, in the barn's own local frame.
 *
 * LOCAL rather than world, which is the opposite choice from `windows.tsx`, and both are right for their
 * own reason. The windows belong to two different buildings, so authoring them in world space is what lets
 * one instanced mesh serve both. Everything here belongs to one building, so nesting it under that
 * building's transform costs nothing and buys a frame in which "along the ridge" is just `z` — which is
 * what makes a rafter's pitch a single rotation about local Z instead of a compound one.
 */
const BINS: Bins = (() => {
  const b: Bins = {
    lining: [],
    stud: [],
    divider: [],
    spindle: [],
    stallRail: [],
    stallPost: [],
    stallFront: [],
    bedding: [],
    manger: [],
    forkful: [],
    bucket: [],
    bucketWater: [],
    joist: [],
    rafter: [],
    eaveClosure: [],
    loftPost: [],
    loftRail: [],
    ladderStile: [],
    rung: [],
    baleBody: [],
    baleTwine: [],
    baleCut: [],
    bin: [],
    lanternBody: [],
    lanternGlass: [],
    straw: [],
    cornerBoard: [],
  };
  const rand = rng(0xba21);
  const strawTint = new Color(PIG.straw);
  const strawDeep = new Color(PIG.hay);
  /** A near-white brightness multiplier per bale — see the note on `baleParts`. */
  const baleShade = (t: number): Color => new Color().setScalar(0.86 + t * 0.22);
  const cutTint = new Color(PIG.straw);
  const hayTint = new Color(PIG.hay);

  /**
   * THE LINING, WHICH IS THE SINGLE BIGGEST THING THE FIRST PASS GOT WRONG.
   *
   * The walls are one slab each and one slab has one material, so hollowing the barn out meant the INSIDE
   * of it was painted barn red. The screenshot was unambiguous: nine metres of unbroken blood-red wall with
   * nothing on it, lit by two weak lamps. It read as a cellar, not a barn — and it was wrong twice over,
   * because barn red is EXTERIOR paint. Nobody has ever painted the inside of a barn; the inside is the
   * bare back of the boards and the frame that carries them.
   *
   * So a 6cm timber lining goes on the inside face of every wall, and the exposed studs go on the lining.
   * `BoxGeometry` rather than `RoundedBoxGeometry` for the lining specifically, which lets all six panels
   * share one geometry and one draw call: a rounded box scaled to six different sizes gets six different
   * anisotropic fillets, and here there is nothing to round anyway — every edge of these panels is covered
   * by the footing below, the eave closure above, or a stud at the corner.
   */
  const liningT = 0.06;
  const liningY = WALL_BASE + BARN_WALL_H / 2;
  const jambW = BARN_IN_HALF_W - DOOR.halfW;
  const liningPanels: readonly (readonly [number, number, number, number, number, number])[] = [
    // x, y, z, sizeX, sizeY, sizeZ
    [-(BARN_IN_HALF_W - liningT / 2), liningY, 0, liningT, BARN_WALL_H, BARN_IN_HALF_D * 2],
    [BARN_IN_HALF_W - liningT / 2, liningY, 0, liningT, BARN_WALL_H, BARN_IN_HALF_D * 2],
    [0, liningY, -(BARN_IN_HALF_D - liningT / 2), BARN_IN_HALF_W * 2, BARN_WALL_H, liningT],
    [
      -(DOOR.halfW + jambW / 2),
      liningY,
      BARN_IN_HALF_D - liningT / 2,
      jambW,
      BARN_WALL_H,
      liningT,
    ],
    [DOOR.halfW + jambW / 2, liningY, BARN_IN_HALF_D - liningT / 2, jambW, BARN_WALL_H, liningT],
    // Over the doorway, so the head of the opening is lined too.
    [
      0,
      WALL_BASE + (DOOR.height + BARN_WALL_H) / 2,
      BARN_IN_HALF_D - liningT / 2,
      DOOR.halfW * 2,
      BARN_WALL_H - DOOR.height,
      liningT,
    ],
  ];
  for (const panel of liningPanels) {
    b.lining.push({
      position: [panel[0], panel[1], panel[2]],
      scale: [panel[3], panel[4], panel[5]],
    });
  }

  /**
   * Exposed studs on the lining, which is what gives nine metres of wall a rhythm.
   *
   * A lining alone is a brown wall instead of a red one, and a flat wall of any colour is the problem. A
   * post every 1.15m turns it into a frame, gives the two lanterns something to throw shadowless gradients
   * across, and sets the scale of the building from inside the way the battens do from outside.
   */
  const studStep = 1.15;
  const studCount = Math.floor((BARN_IN_HALF_D * 2 - 0.4) / studStep);
  for (let i = 0; i <= studCount; i += 1) {
    const z = -BARN_IN_HALF_D + 0.2 + i * studStep;
    for (const sx of [-1, 1] as const) {
      b.stud.push({
        position: [sx * (BARN_IN_HALF_W - liningT - 0.04), liningY, z],
        scale: [1, BARN_WALL_H, 1],
      });
    }
  }
  // And across the closed end.
  for (let i = -3; i <= 3; i += 1) {
    b.stud.push({
      position: [i * 1.35, liningY, -(BARN_IN_HALF_D - liningT - 0.04)],
      rot: [0, Math.PI / 2, 0],
      scale: [1, BARN_WALL_H, 1],
    });
  }

  /* ---- stalls, both sides -------------------------------------------- */
  /**
   * Four partitions and three box stalls a side, at 2.35m wide by 2.7m deep. See `STALL_DEPTH` in `barn.ts`
   * for why the depth more than doubled and `STALL` above for every height, each written against the
   * keeper's 1.5m eye.
   *
   * Each partition is now three members rather than one board: boarding to 1.16m, an open grill of spindles
   * above it, and a capping rail at eye height. Each front is the same three, with its boarding held down at
   * a child's shoulder so they can see over it. The corner post where a partition meets the aisle is what
   * makes the whole run read as joinery instead of as panels floating between walls, and it is the member a
   * child's hand goes to when they lean in to look.
   */
  const stallDepth = BARN_IN_HALF_W - STALL_FRONT_X;
  const stallMidX = STALL_FRONT_X + stallDepth / 2;
  for (const sx of [-1, 1] as const) {
    for (const z of STALL_DIVIDERS) {
      b.divider.push({
        position: [sx * stallMidX, BARN_FLOOR_Y + STALL.dividerSolid / 2, z],
        scale: [stallDepth, 1, 1],
      });
      b.stallRail.push({
        position: [sx * stallMidX, BARN_FLOOR_Y + RAIL_Y, z],
        scale: [stallDepth, 1, 1],
      });
      // The grill over the boarding, along the partition's depth.
      const grill = STALL.dividerTop - STALL.rail - STALL.dividerSolid;
      const spindles = 5;
      for (let i = 0; i < spindles; i += 1) {
        const t = (i + 0.5) / spindles;
        b.spindle.push({
          position: [
            sx * (STALL_FRONT_X + t * stallDepth),
            BARN_FLOOR_Y + STALL.dividerSolid + grill / 2,
            z,
          ],
          rot: [0, Math.PI / 2, 0],
          scale: [1, grill, 1],
        });
      }
      b.stallPost.push({
        position: [sx * STALL_FRONT_X, BARN_FLOOR_Y + STALL.dividerTop / 2, z],
        scale: [1, STALL.dividerTop, 1],
      });
    }
    for (let i = 0; i < STALL_DIVIDERS.length - 1; i += 1) {
      const z0 = STALL_DIVIDERS[i];
      const z1 = STALL_DIVIDERS[i + 1];
      if (z0 === undefined || z1 === undefined) continue;
      const mid = (z0 + z1) / 2;
      const span = z1 - z0 - 0.11;

      b.stallFront.push({
        position: [sx * STALL_FRONT_X, BARN_FLOOR_Y + STALL.frontBoard / 2, mid],
        scale: [1, STALL.frontBoard, span],
      });
      b.stallRail.push({
        position: [sx * STALL_FRONT_X, BARN_FLOOR_Y + RAIL_Y, mid],
        rot: [0, Math.PI / 2, 0],
        scale: [span, 1, 1],
      });
      const grill = STALL.dividerTop - STALL.rail - STALL.frontBoard;
      const bars = Math.max(3, Math.round(span / 0.34));
      for (let k = 0; k < bars; k += 1) {
        const t = (k + 0.5) / bars;
        b.spindle.push({
          position: [
            sx * STALL_FRONT_X,
            BARN_FLOOR_Y + STALL.frontBoard + grill / 2,
            z0 + 0.055 + t * span,
          ],
          scale: [1, grill, 1],
        });
      }

      // Bedding over the whole floor of the stall, banked a little deeper at the back.
      b.bedding.push({
        position: [sx * (stallMidX + 0.1), BARN_FLOOR_Y + 0.045, mid],
        scale: [stallDepth - 0.34, 1, span - 0.12],
        color: strawTint.clone().lerp(strawDeep, rand()),
      });
      b.manger.push({
        position: [sx * (BARN_IN_HALF_W - 0.32), BARN_FLOOR_Y + 0.38, mid],
        scale: [1, 1, Math.min(1.25, span * 0.62)],
      });
      /**
       * A forkful in each manger, and it is LOOSE HAY rather than a bale.
       *
       * This is what used to be a scaled bale box, and at 0.42 x 0.30 x 0.80 it read as a stick of butter
       * lying in every manger — the single most conspicuous thing in the shot of the stalls. Loose hay has
       * no flat faces and no edges, so three overlapping squashed lumps at different yaws is both the truer
       * shape and the cheaper one.
       */
      for (let k = 0; k < 3; k += 1) {
        const r = 0.15 + rand() * 0.09;
        b.forkful.push({
          position: [
            sx * (BARN_IN_HALF_W - 0.32 + (rand() - 0.5) * 0.16),
            BARN_FLOOR_Y + 0.62 + rand() * 0.05,
            mid + (k - 1) * 0.22 + (rand() - 0.5) * 0.1,
          ],
          rot: [0, rand() * 6.28, (rand() - 0.5) * 0.4],
          scale: [r * 1.5, r * 0.8, r * 1.2],
          color: hayTint.clone().lerp(cutTint, rand() * 0.7),
        });
      }
      // A bucket in the front corner of each stall, where a bucket hangs.
      const bucketZ = mid + (sx > 0 ? -1 : 1) * (span / 2 - 0.36);
      b.bucket.push({ position: [sx * (STALL_FRONT_X + 0.46), BARN_FLOOR_Y + 0.15, bucketZ] });
      b.bucketWater.push({ position: [sx * (STALL_FRONT_X + 0.46), BARN_FLOOR_Y + 0.255, bucketZ] });
      /**
       * A bale STOOD ON END in the middle stall, at the far end from the bucket.
       *
       * On end rather than flat, and the reason is the front board. Lying down a bale is 40cm tall and the
       * boarded front is 88cm, so it would be completely hidden from the aisle — which is where a child
       * stands. Upright it is 95cm, so its top and one twine band clear the board and a child looking into
       * the stall can see there is hay in it. `rot[2] = π/2` maps the bale's length onto world Y, and because
       * `baleParts` transforms the twine by the whole placement rather than by its yaw, the bands come round
       * the standing bale horizontally without any extra arithmetic.
       */
      if (i === 1) {
        baleParts(
          b,
          [
            sx * (STALL_FRONT_X + 0.55),
            BARN_FLOOR_Y + BALE.l / 2,
            mid + (sx > 0 ? 1 : -1) * (span / 2 - 0.48),
          ],
          [0, sx > 0 ? 0.22 : -0.34, Math.PI / 2],
          baleShade(rand()),
          cutTint,
        );
      }
    }
  }

  /* ---- the eave closure and the rafters ------------------------------ */
  /**
   * The slot the hollowing-out opened, and the boards that close it.
   *
   * `soffitAbove` at the closure's outboard edge is the ceiling this board has to stay under, and it is
   * consulted rather than guessed: at 45cm tall the board's top lands about 7cm below the soffit, which
   * leaves a thin vent along the eave. That gap is kept on purpose. It is what a real barn has there, and
   * a horizontal sliver of daylight high on a shaded wall is worth more to the inside of this building
   * than a sealed joint would be.
   */
  const closureX = BARN_IN_HALF_W + 0.06;
  const closureH = Math.min(0.45, soffitAbove(closureX + 0.06) - 0.07);
  for (const sx of [-1, 1] as const) {
    b.eaveClosure.push({
      position: [sx * closureX, WALL_TOP + closureH / 2, 0],
      scale: [1, closureH, BARN_D - BARN_W * 0 - 0.7],
    });
  }

  /**
   * Rafters, eleven pairs, from the wall head to the ridge.
   *
   * Pitched by `atan2(rise, halfRoof)` — the roof's own pitch, from the roof's own numbers — so they lie
   * flat against the soffit instead of crossing it. Their inboard ends stop 20cm short of the ridge line so
   * the pairs do not pile into each other at the apex where nobody can see them anyway.
   */
  const pitch = Math.atan2(BARN_RISE, ROOF_HALF_W);
  const rafterLength = Math.hypot(ROOF_HALF_W - 0.2, BARN_RISE) * 0.86;
  const rafterCount = 11;
  for (let i = 0; i < rafterCount; i += 1) {
    const z = -BARN_IN_HALF_D + 0.5 + (i / (rafterCount - 1)) * (BARN_IN_HALF_D * 2 - 1.0);
    for (const sx of [-1, 1] as const) {
      // Positioned at the midpoint of its own run, which is where a rotated box's origin is.
      const midX = sx * (BARN_IN_HALF_W - (rafterLength * Math.cos(pitch)) / 2);
      const midY = WALL_TOP + soffitAbove(BARN_IN_HALF_W) + (rafterLength * Math.sin(pitch)) / 2 - 0.06;
      b.rafter.push({
        position: [midX, midY, z],
        // Local Z, inside the barn's own frame: the pitch tips the rafter in the plane across the ridge,
        // which is exactly the plane the roof slopes in.
        rot: [0, 0, sx > 0 ? pitch : -pitch],
        scale: [rafterLength, 1, 1],
      });
    }
  }

  /* ---- the hayloft ---------------------------------------------------- */
  const loftMidZ = (LOFT.from + LOFT.to) / 2;
  const loftSpan = LOFT.to - LOFT.from;
  // Six rather than eight. At eight, seen down the length of the barn from the doorway, they read as a
  // slatted blind across the whole ceiling rather than as the floor above having a structure.
  const joists = 6;
  for (let i = 0; i < joists; i += 1) {
    b.joist.push({
      position: [0, LOFT.y - 0.14, LOFT.from + ((i + 0.5) / joists) * loftSpan],
      scale: [BARN_IN_HALF_W * 2, 1, 1],
    });
  }
  for (const post of LOFT_POSTS) {
    b.loftPost.push({
      position: [post.x, BARN_FLOOR_Y + (LOFT.y - 0.2 - BARN_FLOOR_Y) / 2, post.z],
      scale: [1, LOFT.y - 0.2 - BARN_FLOOR_Y, 1],
    });
  }
  // A rail along the open edge, because a loft with no edge is a shelf and also a thing a child worries
  // about falling off.
  b.loftRail.push({
    position: [0, LOFT.y + 0.44, LOFT.from + 0.06],
    scale: [BARN_IN_HALF_W * 2, 1, 1],
  });
  for (const sx of [-1, 1] as const) {
    b.loftPost.push({
      position: [sx * (BARN_IN_HALF_W - 0.2), LOFT.y + 0.22, LOFT.from + 0.06],
      scale: [1, 0.44, 1],
    });
  }
  /**
   * Bales up top, which is the whole reason a hayloft exists and the thing that makes it read as one.
   *
   * STACKED, AND STACKED BADLY ON PURPOSE. Seven bales at seven different scales lying flat in a row is a
   * shelf of cushions; two courses of same-sized bales with the upper course crossing the lower, one turned
   * a few degrees out of true and one tipped, is a stack somebody built in a hurry — which is what a hayloft
   * looks like and what tells a child somebody works here. The tips and yaws are hand-picked rather than
   * random because "slightly uneven" is a composition: a random roll on every bale reads as an earthquake.
   *
   * `row` is the local x of the bale's own long axis, `at` its z along the loft, `lift` which course it is
   * in, and `yaw`/`tip` how badly it was thrown down.
   */
  const loftBales: readonly {
    x: number;
    at: number;
    lift: number;
    yaw: number;
    tip: number;
  }[] = [
    // Lower course, laid along the barn against the -X side.
    { x: -3.4, at: 1.5, lift: 0, yaw: 0.04, tip: 0 },
    { x: -3.4, at: 2.55, lift: 0, yaw: -0.02, tip: 0 },
    { x: -3.4, at: 3.6, lift: 0, yaw: 0.06, tip: 0 },
    { x: -2.42, at: 1.95, lift: 0, yaw: 0.02, tip: 0 },
    { x: -2.42, at: 3.0, lift: 0, yaw: -0.05, tip: 0 },
    // Upper course, crossing the lower one, which is how a stack is bonded.
    { x: -3.0, at: 2.1, lift: 1, yaw: Math.PI / 2 + 0.07, tip: 0 },
    { x: -3.0, at: 2.62, lift: 1, yaw: Math.PI / 2 - 0.04, tip: 0 },
    { x: -2.95, at: 3.3, lift: 1, yaw: Math.PI / 2 + 0.16, tip: 0.07 },
    // And a short stack on the +X side with the top one thrown on crooked.
    { x: 3.3, at: 2.2, lift: 0, yaw: -0.03, tip: 0 },
    { x: 3.3, at: 3.25, lift: 0, yaw: 0.05, tip: 0 },
    { x: 3.24, at: 2.75, lift: 1, yaw: 0.38, tip: -0.09 },
    // One dropped on its own in the middle, waiting to be carried down the ladder.
    { x: 0.9, at: 4.5, lift: 0, yaw: 1.12, tip: 0 },
  ];
  for (const bale of loftBales) {
    baleParts(
      b,
      [
        bale.x,
        LOFT.y + 0.06 + BALE.h / 2 + bale.lift * BALE.h,
        loftMidZ + bale.at - loftSpan / 2,
      ],
      [0, bale.yaw, bale.tip],
      baleShade(rand()),
      cutTint,
    );
  }

  /* ---- the ladder ----------------------------------------------------- */
  for (const sz of [-1, 1] as const) {
    b.ladderStile.push({
      position: [LADDER.x, BARN_FLOOR_Y + (LOFT.y + 0.2 - BARN_FLOOR_Y) / 2, LADDER.z + sz * 0.24],
      scale: [1, LOFT.y + 0.2 - BARN_FLOOR_Y, 1],
    });
  }
  const rungs = 9;
  for (let i = 0; i < rungs; i += 1) {
    b.rung.push({
      position: [LADDER.x, BARN_FLOOR_Y + 0.34 + (i / (rungs - 1)) * (LOFT.y - 0.55), LADDER.z],
    });
  }

  /* ---- feed bins, lanterns, straw ------------------------------------ */
  for (const sx of [-1, 1] as const) {
    b.bin.push({
      position: [sx * 1.5, BARN_FLOOR_Y + 0.45, -BARN_IN_HALF_D + 0.65],
      rot: [0, sx * 0.06, 0],
    });
  }

  /**
   * THREE lanterns, and where they hang is the composition.
   *
   * One under the loft just inside the doorway, so the first thing a child sees on stepping in is a warm
   * light rather than a dark rectangle. One over the stalls halfway down. One at the far end, thirteen
   * metres away, so the barn has a depth cue — a single lamp lights a room, lamps at three distances light
   * a SPACE, and the difference is whether a child can tell how far off the back wall is.
   *
   * THE CAP IS ABOVE THE GLASS AND NOT AROUND IT. The first pass put a 22cm timber body at the lamp's
   * position and a 15cm emissive glass at the same place — so the glass was entirely INSIDE the body and
   * every lantern rendered as an opaque black box with a halo behind it. A lantern is a lens with a hood
   * over it, so the hood goes above and the glass hangs below where it can be seen.
   */
  const lanterns: readonly (readonly [number, number, number])[] = [
    [1.0, LOFT.y - 0.5, LOFT.from + 1.15],
    [BARN_IN_HALF_W - 0.28, WALL_BASE + 2.75, -1.9],
    [0, WALL_BASE + 2.5, -BARN_IN_HALF_D + 0.28],
  ];
  for (const at of lanterns) {
    b.lanternBody.push({ position: [at[0], at[1] + 0.17, at[2]] });
    b.lanternGlass.push({ position: [at[0], at[1], at[2]] });
  }

  /**
   * Straw trodden across the floor. A hundred and thirty wisps in one draw call.
   *
   * Denser near the stalls and thinning toward the doorway, because that is where it would be: straw comes
   * out of the stalls on somebody's boots. Bunched rather than uniform, so it reads as swept and walked
   * over rather than as a texture.
   *
   * LONG AND THIN, NOT SQUARE. The first pass gave these a 16-42cm length and a 10-22cm WIDTH, which at
   * 2cm thick is not a wisp of straw — it is a playing card, and the shot of the stalls had a dozen bright
   * yellow ones lying flat on the floor. Straw is a stalk: 12-34cm long and 2-5cm across, laid in twos and
   * threes at slightly different angles so a clump reads as several stalks rather than one lozenge.
   */
  for (let i = 0; i < 60; i += 1) {
    const z = -BARN_IN_HALF_D + 0.5 + rand() * (BARN_IN_HALF_D * 2 - 1.2);
    // Toward the doorway there is less of it. Rejection, so the density curve is real rather than a
    // scale ramp on the same count.
    if (z > 1.5 && rand() > 0.45) continue;
    const x = (rand() - 0.5) * 2 * (STALL_FRONT_X - 0.25);
    const yaw = rand() * 6.28;
    for (let k = 0; k < 2 + Math.floor(rand() * 2); k += 1) {
      b.straw.push({
        position: [x + (rand() - 0.5) * 0.16, BARN_FLOOR_Y + 0.01, z + (rand() - 0.5) * 0.16],
        rot: [0, yaw + (rand() - 0.5) * 0.7, 0],
        scale: [0.12 + rand() * 0.22, 1, 0.02 + rand() * 0.03],
        color: strawTint.clone().lerp(strawDeep, rand() * 0.8),
      });
    }
  }

  /* ---- corner boards -------------------------------------------------- */
  /**
   * What covers the joint where the gable ends abut the long walls.
   *
   * The two wall slabs meet on the plane `x = ±BARN_IN_HALF_W`, which is hidden from outside — but both are
   * rounded boxes, so their fillets leave a few millimetres of groove at the corner arris. A corner board
   * is the real building's answer to the same problem and it costs four instances.
   */
  for (const sx of [-1, 1] as const) {
    for (const sz of [-1, 1] as const) {
      b.cornerBoard.push({
        position: [sx * (BARN_W / 2 - 0.02), WALL_BASE + BARN_WALL_H / 2, sz * (BARN_D / 2 - 0.02)],
      });
    }
  }

  return b;
})();

/**
 * The stalls, the loft, the ladder and the light, drawn only when somebody is near enough to see them.
 */
export function BarnInterior(): JSX.Element {
  const m = materials();
  const reduced = usePrefersReducedMotion();
  const camera = useThree((s) => s.camera);
  const inside = useRef<Group>(null);

  const g = useMemo(() => {
    const stallDepth = BARN_IN_HALF_W - STALL_FRONT_X;
    return {
      floor: new RoundedBoxGeometry(BARN_IN_HALF_W * 2, BARN_FLOOR_Y, BARN_IN_HALF_D * 2, 1, 0.02),
      // Unit box, scaled per panel. See the note on `lining` above for why this one is not rounded.
      lining: new BoxGeometry(1, 1, 1),
      stud: new RoundedBoxGeometry(0.13, 1, 0.09, 1, 0.03),
      // Unit-length along X, scaled per instance, so one geometry serves every divider whatever the
      // stalls end up being.
      divider: new RoundedBoxGeometry(1, STALL.dividerSolid, 0.1, 1, 0.03),
      /** Unit HEIGHT, so the same spindle serves a partition's grill and a stall front's. */
      spindle: new RoundedBoxGeometry(0.055, 1, 0.07, 1, 0.022),
      /** Unit length along X. Yawed a quarter turn where it caps a front rather than a partition. */
      stallRail: new RoundedBoxGeometry(1, STALL.rail, 0.14, 1, 0.05),
      stallPost: new RoundedBoxGeometry(STALL.post, 1, STALL.post, 1, 0.042),
      /** Unit height AND unit length along Z: a front is scaled in both. */
      stallFront: new RoundedBoxGeometry(0.09, 1, 1, 1, 0.03),
      bedding: new RoundedBoxGeometry(1, 0.09, 1, 1, 0.028),
      manger: new RoundedBoxGeometry(0.52, 0.72, 1, 1, 0.06),
      /** Loose hay: a coarse sphere, so it has no flat face and cannot come out as a block. */
      forkful: new SphereGeometry(1, 7, 5),
      bucket: new CylinderGeometry(0.15, 0.115, 0.28, 12, 1),
      bucketWater: new CylinderGeometry(0.132, 0.132, 0.012, 12, 1),
      joist: new RoundedBoxGeometry(1, 0.17, 0.15, 1, 0.04),
      rafter: new RoundedBoxGeometry(1, 0.15, 0.13, 1, 0.035),
      closure: new RoundedBoxGeometry(0.12, 1, 1, 1, 0.03),
      loftFloor: new RoundedBoxGeometry(BARN_IN_HALF_W * 2, 0.12, LOFT.to - LOFT.from, 1, 0.03),
      post: new RoundedBoxGeometry(0.2, 1, 0.2, 1, 0.05),
      rail: new RoundedBoxGeometry(1, 0.12, 0.12, 1, 0.045),
      stile: new RoundedBoxGeometry(0.09, 1, 0.09, 1, 0.03),
      rung: new RoundedBoxGeometry(0.07, 0.055, 0.5, 1, 0.022),
      /** One fixed bale, shared with the yard outside. See `baleGeometries`. */
      ...(() => {
        const bale = baleGeometries();
        return { bale: bale.body, baleTwine: bale.twine, baleCut: bale.cut };
      })(),
      bin: new RoundedBoxGeometry(1.05, 0.9, 0.8, 2, 0.11),
      lantern: new RoundedBoxGeometry(0.3, 0.07, 0.3, 1, 0.025),
      lanternGlass: new RoundedBoxGeometry(0.17, 0.26, 0.17, 1, 0.045),
      straw: new RoundedBoxGeometry(1, 0.018, 1, 1, 0.006),
      cornerBoard: new RoundedBoxGeometry(0.2, BARN_WALL_H, 0.2, 1, 0.05),
      stallDepth,
    };
  }, []);

  /**
   * Off when nobody is near, which is the one optimisation the interior needs.
   *
   * Three has no occlusion culling: from anywhere on the ranch that has the barn in frame, every mesh in
   * here is inside the view frustum and behind an opaque wall, and all of it would be submitted, shaded
   * and discarded by the depth test. Twenty-six metres is comfortably past the point where the doorway is
   * a few pixels across, and toggling a group's `visible` removes its whole subtree from the render list
   * in one test — no remounting, no shader recompilation, no hitch on the way back in.
   */
  useFrame(() => {
    const group = inside.current;
    if (!group) return;
    const d = Math.hypot(camera.position.x - BARN.x, camera.position.z - BARN.z);
    group.visible = d < 26;
  });

  return (
    <group position={[BARN.x, 0, BARN.z]} rotation={[0, BARN.rot, 0]}>
      {/* Outside the visibility gate: the doors are the thing a child sees from across the meadow. */}
      <BarnDoors reduced={reduced} />

      <group ref={inside}>
        {/* The threshing floor. Receives, so the wedge of sun through the doorway lands on it. */}
        <mesh
          geometry={g.floor}
          material={m.barnFloor}
          position={[0, BARN_FLOOR_Y / 2, 0]}
          receiveShadow
        />

        {/*
          Nothing below casts. The only light that casts is the sun, which cannot see into a closed
          building except through the doorway, and the shadow pass is the more expensive half of a mesh.
          Everything still RECEIVES, so the sun through the doorway and the lanterns both land on it.
        */}
        {/*
          The lining and its studs. These two sets are the difference between a cellar and a barn, and they
          cost two draw calls between them for fifty-odd parts.
        */}
        <Instanced
          geometry={g.lining}
          material={m.barnLining}
          items={BINS.lining}
          castShadow={false}
          frustumCulled
        />
        <Instanced
          geometry={g.stud}
          material={m.timberDeep}
          items={BINS.stud}
          castShadow={false}
          frustumCulled
        />

        <Instanced
          geometry={g.divider}
          material={m.timber}
          items={BINS.divider}
          castShadow={false}
          frustumCulled
        />
        <Instanced
          geometry={g.stallFront}
          material={m.timberDeep}
          items={BINS.stallFront}
          castShadow={false}
          frustumCulled
        />
        <Instanced
          geometry={g.stallRail}
          material={m.timber}
          items={BINS.stallRail}
          castShadow={false}
          frustumCulled
        />
        <Instanced
          geometry={g.spindle}
          material={m.timber}
          items={BINS.spindle}
          castShadow={false}
          frustumCulled
        />
        <Instanced
          geometry={g.stallPost}
          material={m.timberDeep}
          items={BINS.stallPost}
          castShadow={false}
          frustumCulled
        />
        <Instanced
          geometry={g.bedding}
          material={m.straw}
          items={BINS.bedding}
          castShadow={false}
          frustumCulled
        />
        <Instanced
          geometry={g.manger}
          material={m.timberDeep}
          items={BINS.manger}
          castShadow={false}
          frustumCulled
        />
        <Instanced
          geometry={g.forkful}
          material={m.straw}
          items={BINS.forkful}
          castShadow={false}
          frustumCulled
        />
        <Instanced
          geometry={g.bucket}
          material={m.timberDeep}
          items={BINS.bucket}
          castShadow={false}
          frustumCulled
        />
        {/* The water in them. Unlit-ish and bright, so it catches the lanterns and reads as a full bucket. */}
        <Instanced
          geometry={g.bucketWater}
          material={m.water}
          items={BINS.bucketWater}
          castShadow={false}
          frustumCulled
        />

        <Instanced
          geometry={g.closure}
          material={m.timber}
          items={BINS.eaveClosure}
          castShadow={false}
          frustumCulled
        />
        <Instanced
          geometry={g.rafter}
          material={m.timberDeep}
          items={BINS.rafter}
          castShadow={false}
          frustumCulled
        />

        <mesh
          geometry={g.loftFloor}
          material={m.timber}
          position={[0, LOFT.y, (LOFT.from + LOFT.to) / 2]}
          receiveShadow
        />
        <Instanced
          geometry={g.joist}
          material={m.timberDeep}
          items={BINS.joist}
          castShadow={false}
          frustumCulled
        />
        <Instanced
          geometry={g.post}
          material={m.timber}
          items={BINS.loftPost}
          castShadow={false}
          frustumCulled
        />
        <Instanced
          geometry={g.rail}
          material={m.timber}
          items={BINS.loftRail}
          castShadow={false}
          frustumCulled
        />
        <Instanced
          geometry={g.stile}
          material={m.timber}
          items={BINS.ladderStile}
          castShadow={false}
          frustumCulled
        />
        <Instanced
          geometry={g.rung}
          material={m.timberDeep}
          items={BINS.rung}
          castShadow={false}
          frustumCulled
        />

        {/*
          Bales, in three sets: the body, the twine round its girth, and the cut ends. Three draw calls for
          every bale in the building, and it is the twine and the ends that do the work — the body alone is
          the box this replaced.
        */}
        <Instanced
          geometry={g.bale}
          material={m.hay}
          items={BINS.baleBody}
          castShadow={false}
          frustumCulled
        />
        <Instanced
          geometry={g.baleTwine}
          material={m.twine}
          items={BINS.baleTwine}
          castShadow={false}
          frustumCulled
        />
        <Instanced
          geometry={g.baleCut}
          material={m.straw}
          items={BINS.baleCut}
          castShadow={false}
          frustumCulled
        />
        <Instanced geometry={g.bin} material={m.burlap} items={BINS.bin} castShadow={false} frustumCulled />
        <Instanced
          geometry={g.straw}
          material={m.straw}
          items={BINS.straw}
          castShadow={false}
          receiveShadow={false}
          frustumCulled
        />

        {/* Corner boards are the one interior set that is seen from OUTSIDE, so they cast. */}
        <Instanced geometry={g.cornerBoard} material={m.trim} items={BINS.cornerBoard} />

        {/*
          The lanterns. Two unshadowed point lights, which keeps the world's promise that exactly one light
          casts: `Lighting.tsx` owns that one, and it is the sun.
        */}
        <Instanced
          geometry={g.lantern}
          material={m.timberDeep}
          items={BINS.lanternBody}
          castShadow={false}
          frustumCulled
        />
        <Instanced
          geometry={g.lanternGlass}
          material={m.lamplight}
          items={BINS.lanternGlass}
          castShadow={false}
          receiveShadow={false}
          frustumCulled
        />
        {BINS.lanternGlass.map((lamp, i) => (
          <pointLight
            key={i}
            position={lamp.position as unknown as [number, number, number]}
            color={PIG.honey}
            /**
             * BRIGHT, and the number is set by a documented trap rather than by taste. `Lighting.tsx`
             * warns twice that a hemisphere light fills an up-facing surface with its SKY colour — and the
             * barn's floor is nothing but up-facing normals, so at the old intensity of 5.5 the blue fill
             * won and the threshing floor came out cold grey inside a warm building. Three lamps at 22 with
             * inverse-square decay put roughly 2.4 of warm light on the floor beneath each one against the
             * hemisphere's 0.72, which is what it takes for the warm to read as the dominant light.
             */
            intensity={22}
            distance={15}
            decay={2}
          />
        ))}
      </group>
    </group>
  );
}
