import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type JSX } from 'react';
import {
  BoxGeometry,
  BufferGeometry,
  Color,
  CylinderGeometry,
  Euler,
  Float32BufferAttribute,
  type Group,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

import { SITES } from '../stations/sites';

import {
  BARN,
  BARN_D,
  BARN_EAVE,
  BARN_FLOOR_Y,
  BARN_GABLE_Z,
  BARN_PLINTH,
  BARN_PLINTH_H,
  BARN_RAKE,
  BARN_RISE,
  BARN_ROOF_T,
  BARN_THRESHOLD,
  BARN_W,
  BARN_WALLS,
  BARN_WALL_H,
  barnSolids,
} from './barn';
import {
  BALE,
  BALE_CUT_X,
  BALE_TWINE_X,
  BarnInterior,
  baleGeometries,
} from './barnInterior';
import {
  BOUNDARY,
  BOUNDARY_RAIL_HEIGHTS,
  FENCE,
  GATE_POST_EXTRA,
  PENS,
  PEN_RAIL_HEIGHTS,
  POST_H,
  POST_W,
  onBoundary,
} from './fence';
import { Instanced, type Placement } from './instanced';
import { usePrefersReducedMotion } from './motion';
import { clamp, fbm, lerp, noise2, rng, smoothstep } from './noise';
import { LANES, NETWORK, TRACK, distanceToTracks } from './paths';
import { PIG, materials } from './pigment';
import { chainOutline, roundedRectOutline, toWorld, type P2, type Placed, type Solid } from './plan';
import { eaveCollarGeometry, gableRoofGeometry, gableWallGeometry, hipRoofGeometry } from './roofs';
import { flowingWater, useWaterClock } from './water';
import { Windows, wallTaken } from './windows';

/**
 * The ranch: ground, a barn, a keeper's hut, penned corrals, and the props that say somebody works here.
 *
 * WHAT THIS REPLACES, and why it is a rewrite rather than a repair. `Ranch()` in `Game.tsx` drew a flat
 * green disc, six `torusGeometry` rings, a capsule with a cone shoved through it, and forty spheres in a
 * perfect circle. Every one of those is a *primitive standing in for* a thing rather than the thing, and
 * the owner spotted it in the one place the substitution is unmissable: a cone has no eaves, so it either
 * floats above a wall or sinks into it, and it did both at once. There is no adjustment to a cone that
 * makes it a roof. See `roofs.ts` for the construction that does, and for the invariant that makes the
 * defect impossible to reintroduce.
 *
 * WHAT IT IS INSTEAD. Two buildings assembled the way buildings are assembled — a stone footing, walls,
 * a wall head, a roof that lands on the wall head and oversails it, boards over the joins — because that
 * sequence is what the eye reads as "built", and a five-year-old does not need the word "fascia" to
 * notice its absence. Everything is chamfered or rounded; nothing in a child's world has a razor edge.
 *
 * GEOMETRY BUDGET. Anything repeated is one `InstancedMesh`: every fence post in the ranch is one draw
 * call, every rail a second, every tree trunk a third, every leaf mass a fourth. The valley floor and
 * the worn earth on it are one mesh each, coloured per vertex rather than textured, so the ground is two
 * draw calls with no splat shader to maintain.
 *
 * THE FRAME THIS IS AUTHORED IN. `Game.tsx`'s: the child arrives near `[0, 1.5, 8]` looking down `-z`,
 * the pod wall stands at `[0, 3.6, -13]`, and `BOUND` is 34. So the strip `|x| < 5.5` between `z = 9.5`
 * and `z = -9.5` is kept clear as the approach to the pod wall, and a 9-metre apron around the wall is
 * kept clear of anything that could stand in front of the thing a child is being asked to look at.
 * Nothing is placed by eye: `blocked()` is the single predicate every footprint and every scattered
 * tree is checked against, and `SOLIDS` is generated from the same numbers that draw the meshes.
 */

/* ------------------------------------------------------------------ *\
   Ground plan
\* ------------------------------------------------------------------ */

/** Ground stays exactly flat inside this radius, which comfortably contains `BOUND`. */
const FLAT_R = 42;
/** Where the ground mesh ends. Well past the fog, so no edge is ever in frame. */
const GROUND_R = 104;
/** Metres per tile of the ground's grain map. Small enough to read underfoot, large enough not to buzz. */
const GRAIN_METRES = 7;

/**
 * THE BARN'S NUMBERS NOW LIVE IN `barn.ts`, along with its doorway, its wall slabs, its collider and the
 * two invariants that make the walk-in provable. This file draws the barn; that one decides what it is.
 *
 * The split happened because the barn stopped being scenery and became a place. A doorway a child can walk
 * through is a promise about the COLLIDER, not about the geometry, and a promise like that has to be
 * testable — which means it cannot live in a file that imports a renderer.
 */

/**
 * The keeper's hut. Hip-roofed and thatched, so it reads as a home rather than as a smaller barn.
 *
 * The rotation is solved rather than chosen. The hut sits on the sun's side of the ranch, so most of its
 * faces are either turned away from an arriving child or turned away from the sun. Writing both
 * conditions out — visible from the spawn, and lit — leaves a window of about 45° of rotation that
 * satisfies both, and 5° sits in the middle of it: the door wall comes up at 0.57 of full sun and nearly
 * square to the approach, while the long wall beside it falls into deep shade. Lit plane next to shadow
 * plane, on the building whose job is to look like somewhere you could knock on the door of.
 */
const HUT = { x: 13.0, z: -5.0, rot: 0.087 } satisfies Placed;
const HUT_W = 6.6;
const HUT_D = 5.4;
const HUT_WALL_H = 3.0;
const HUT_RISE = 2.45;
const HUT_ROOF_T = 0.52;
const HUT_EAVE = 0.66;
const HUT_PLINTH_H = 0.36;
/** Depth of the soffit board that closes the eave. See `eaveCollarGeometry` in `roofs.ts`. */
const HUT_SOFFIT_T = 0.13;
/** Half the roof's span across the slopes, which is what sets its pitch and every height on it. */
const HUT_ROOF_HALF_W = HUT_W / 2 + HUT_EAVE;
/** The hip's pitch, from the roof's own two numbers rather than measured off a screenshot. */
const HUT_PITCH = Math.atan2(HUT_RISE, HUT_ROOF_HALF_W);
/**
 * The chimney, and the height of the roof's OUTER skin where it comes through.
 *
 * `hutSkinY` is the same expression `hipRoofGeometry` builds its skin from — `thickness` above a soffit
 * that falls linearly from `rise` at the ridge to zero at the eave — so the flashing collar lands ON the
 * roof rather than near it. The stack stands at 2.2m from the ridge on the +X slope, which is 55% of the
 * way down it, so the whole 1.06m collar is on one plane and needs no hip mitre.
 */
const CHIMNEY = { lx: HUT_W / 2 - 1.1, lz: -HUT_D / 2 + 1.0, w: 0.72, h: 2.5 };
function hutSkinY(localX: number): number {
  return HUT_ROOF_T + HUT_RISE * (1 - Math.abs(localX) / HUT_ROOF_HALF_W);
}

/**
 * The windmill. Turned to face the middle of the ranch rather than the wind.
 *
 * Two reasons, and neither is meteorology. A fan seen edge-on is a stick, so from anywhere in the ranch
 * the wheel has to be broadly face-on or the landmark disappears. And because the sun is out beyond it,
 * facing inward puts the wheel's shadow side toward the child — which means ten blades and a rim read as
 * dark filigree against the brightest part of the sky. That is the best thing this object can be.
 */
const WINDMILL = { x: 19.5, z: 6.0, rot: -1.9 } satisfies Placed;
const TOWER_H = 6.6;

/**
 * The blade wheel's radius, and how high its axle has to sit to clear the tower it stands on.
 *
 * WHAT WAS WRONG. The head hung at `TOWER_H + 0.4`, which put the axle 7.0m up and a 2.175m wheel
 * reaching down to 4.83 — while the legs top out at 6.61 and the platform occupies 6.52 to 6.68. So
 * the bottom 2.3m of the wheel shared its band of height with the top 2.3m of the tower: two legs ran
 * up ACROSS the pale blades, three blades were interrupted, the rim ring was broken in four places,
 * the leg tops ended in mid-air inside the wheel with no headstock, and the tail vane sat dead centre
 * behind the blades and never read as a vane at all.
 *
 * This is the tallest thing on the ranch and the file below says it is deliberately silhouetted
 * against the brightest part of the sky; it is in frame from the spawn and from two of the three pens,
 * so it was also the most-seen defect on it.
 *
 * DERIVED, not nudged. The axle sits a clear margin above the platform's top face, so the wheel's
 * lowest point cannot touch the tower whatever anyone does to the tower's height, the platform or the
 * rim. A real mill puts its wheel above its cap for the same reason: the blades have to pass.
 */
const MILL_RIM_R = 2.12;
/** Platform half-thickness above `TOWER_H`, from its own `CylinderGeometry(0.46, 0.5, 0.16, 12)`. */
const MILL_PLATFORM_TOP = TOWER_H + 0.08;
/** Rim tube included, plus a hand's breadth so the gap reads as clearance rather than as a near miss. */
const MILL_HEAD_Y = MILL_PLATFORM_TOP + MILL_RIM_R + 0.055 + 0.28;
const LEG_BASE_R = 1.05;
const LEG_TOP_R = 0.34;

/**
 * THE PENS AND THE FENCE PLAN NOW LIVE IN `fence.ts`, along with the boundary run around the whole ranch.
 *
 * The split happened for the reason the barn's did. The owner asked for a fence "around the entire ranch
 * ... so the child can't explore beyond the ranch", and a boundary is a promise about a COLLIDER rather
 * than about a picture of a fence — it has to be provable, and a proof cannot live in a file that imports
 * a renderer. Moving the pens out with it is what lets `paths.ts` end a worn spur exactly at a pen's gate
 * without either a cycle or a second hand-copied set of pen positions. This file draws all of it.
 */

/**
 * THE WORN TRACK PLAN NOW LIVES IN `paths.ts`.
 *
 * Moved for the reason the barn's plan and the fence's were: the owner reported that the dirt "isn't
 * connected in some of the spots ... the brown dirty portion should be all cohesive and connected", and
 * whether a region is connected is a question that has to be MEASURED rather than looked at. That module
 * has no three.js and no React in it, so `paths.test.ts` can flood-fill the network and count the pieces.
 * It also owns the cross-section, the junction arithmetic and the lane solver; this file colours what it
 * hands back and draws it.
 */

/* ------------------------------------------------------------------ *\
   Pigment and materials now live in `pigment.ts`

   Moved out for the same reason the barn's plan was: the windows and the barn's interior are their own
   modules now, and all three have to draw from one palette or the buildings stop looking like one place.
   Extracting it also breaks what would otherwise be a cycle — this file renders `Windows`, so `Windows`
   cannot reach back in here for its materials.
\* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *\
   Geometry helpers
\* ------------------------------------------------------------------ */

/**
 * The valley floor.
 *
 * Exactly zero inside `FLAT_R`, which is not laziness — it is the contract with the player controller.
 * `Game.tsx` integrates against a flat plane at `y = 0`, so any relief inside the walkable radius would
 * put the camera underground on one side of a bump and floating on the other. All the shape is spent
 * outside that radius instead, where it does the job it is needed for: a hill silhouette for a low sun to
 * sit behind, and a horizon that is not a straight line.
 */
function groundHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  if (r <= FLAT_R) return 0;
  // Squared, so the ground leaves the plateau tangentially with no crease at the join.
  const t = smoothstep(FLAT_R, 94, r);
  const lumps = fbm(x * 0.026 + 4.1, z * 0.026 - 2.3, 3);
  return t * t * 31 + t * lumps * (3 + t * 14);
}

/** Rounded rectangle in the XY plane. For flat shapes like the trough's water surface. */
function roundedRectShapeXY(w: number, h: number, r: number): Shape {
  const hw = w / 2 - r;
  const hh = h / 2 - r;
  const s = new Shape();
  s.moveTo(-hw - r, -hh);
  s.lineTo(-hw - r, hh);
  s.quadraticCurveTo(-hw - r, hh + r, -hw, hh + r);
  s.lineTo(hw, hh + r);
  s.quadraticCurveTo(hw + r, hh + r, hw + r, hh);
  s.lineTo(hw + r, -hh);
  s.quadraticCurveTo(hw + r, -hh - r, hw, -hh - r);
  s.lineTo(-hw, -hh - r);
  s.quadraticCurveTo(-hw - r, -hh - r, -hw - r, -hh);
  s.closePath();
  return s;
}

/* ------------------------------------------------------------------ *\
   Props, in their building's local frame
\* ------------------------------------------------------------------ */

/**
 * A bale in the yard. No `kind` and no `scale` any more: the sacks that needed both are gone (see
 * `BARN_YARD`), and a bale is a fixed object — see `BALE` in `barnInterior.tsx`.
 */
interface YardProp {
  lx: number;
  lz: number;
  rot: number;
  /**
   * Which course of the stack a bale is in, and it has to be STATED rather than inferred.
   *
   * The first pass at the stack lifted the third bale by index, on the assumption that a list of three was a
   * stack of two plus one. It was not: the three were 1.2m apart on the ground, so the lifted one hung in
   * mid-air a metre from anything, which a photograph of the yard showed immediately. A bale is in the upper
   * course only if it is directly over one in the lower course, and the only way to guarantee that is to say
   * so and give it the same footprint.
   */
  lift?: 0 | 1;
}

/**
 * Beside the barn doors: bales on the right, and a water trough on the left where the sacks used to be.
 *
 * WHAT THE OWNER WAS LOOKING AT, because he called them hay bales and they were not. "fix the haybales
 * next to the left side of the barn doors because they look like weird jugs" — approaching the doors from
 * the yard you are looking down the barn's local -Z, so your left hand points down its local -X, and the
 * three things standing at local x = -3.4 to -4.2 were the FEED SACKS. The bales are the other side, at
 * +3.15 to +3.55, on his right. Nothing on the left was ever a bale.
 *
 * AND "WEIRD JUGS" IS AN EXACT DESCRIPTION OF WHAT WAS THERE. The sacks had just been rebuilt from a badly
 * filleted capsule into four stacked stages — body, shoulder, neck, tie — and `SACK`'s own note records the
 * failure mode it was trying to walk away from: "Two stages is a jar. Three is a sack." Three stages plus a
 * pale band across the top is a jar with a lid on it, at any spacing, and a screenshot from a child's eye
 * height shows three canisters with screw caps. The rebuild is what he is reacting to and he is right.
 *
 * SO THEY ARE GONE, and his own suggestion is what stands there: a trough of water. The sack geometry stays
 * exported from `barnInterior.tsx` — nothing else uses it today, but deleting a shape is a separate
 * decision from deleting a placement, and the four-part construction is sound work whose only fault is
 * that a sack is the wrong object to put beside a door.
 */
const BARN_YARD: readonly YardProp[] = [
  { lx: 3.15, lz: 8.55, rot: 0.3, lift: 0 },
  { lx: 3.55, lz: 9.42, rot: -0.12, lift: 0 },
  // Thrown on top of the first, turned a little out of true with it.
  { lx: 3.22, lz: 8.62, rot: 0.52, lift: 1 },
];

/**
 * The two troughs, and there is ONE trough on this ranch rather than two different ones.
 *
 * Same doctrine as `BALE` in `barnInterior.tsx`, and it is here for the same reason it is there: the ranch
 * used to have two bales, "a pillow out here and a different pillow in the loft", and a child walks past
 * both. A trough beside the barn doors and a trough in the pen are forty metres apart in a world you can
 * walk across in fifteen seconds. So `TROUGH` below is one object at one size, and this is only where it
 * stands — which also means the fillet on it is a fixed radius on a fixed geometry and cannot be scaled
 * into a pillow at one site and a stick of butter at the other.
 *
 * The barn-door one is turned 4° out of square with the wall. Dead parallel reads as placed by a level;
 * a few degrees off reads as put down by somebody carrying it.
 */
const TROUGHS: readonly Placed[] = [
  (() => {
    const w = toWorld(BARN, -3.75, 8.15);
    return { x: w[0], z: w[1], rot: BARN.rot + 0.07 };
  })(),
  (() => {
    const pen = PENS[1];
    if (!pen) return { x: 14, z: 3, rot: 0 };
    const w = toWorld(pen, 2.8, -1.5);
    return { x: w[0], z: w[1], rot: pen.rot + 0.18 };
  })(),
];

/**
 * WHAT A TROUGH IS, and the one thing the trough that was already here was not: a VESSEL.
 *
 * The old one was `RoundedBoxGeometry(2.7, 0.62, 1.0)` in stone with a water plane laid at y = 0.79. The
 * box's top face is at 0.87. So the water was twelve centimetres INSIDE a solid block and had never once
 * been visible — the same failure `stations/carpentry.tsx` records against the first spring basin, "a
 * rounded box is SOLID: its top face is closed, so the water was sealed inside an opaque stone block",
 * repeated forty metres away. A trough with no visible water is a bench.
 *
 * So it is built the way the basin was rebuilt: FOUR WALLS AND A FLOOR, with a real thickness, and the
 * water is a surface inside them with a dark wet bed under it and 12cm of freeboard above it. The
 * freeboard is the number that does the work — water level WITH the rim reads as a painted lid, and the
 * only thing that says "there is a volume here" is being able to see the inside face of the far board
 * above the waterline.
 *
 * PLANKS, NOT STONE, and that is a deliberate move away from the old one. The barn-door trough stands
 * two metres in front of a stone plinth, and stone on stone in the same frame loses the object entirely;
 * the timber sits against it the way the fence rails sit against the pens. The two stone blocks it stands
 * on are what tie it back to the building, and they are the pale member in a stack that runs
 * pale stone → mid timber boards → dark capping rail and battens → darker wet bed → teal water. Five
 * values, because a flat unlit face on this ranch resolves to near-black and a trough built out of one
 * material would be a silhouette from the shaded side.
 *
 * ONE FIXED SIZE. Both troughs are this size and the fillets are radii in world units on a geometry that
 * is never scaled — the bale's doctrine, for the reason `BALE` gives.
 */
const TROUGH_BODY = {
  /** Outside, along the long axis. */
  l: 2.24,
  /** Outside, across. 88cm, and the width is set by the WATER rather than by the vessel — see below. */
  w: 0.88,
  /** Board thickness. Every wall and the floor. */
  t: 0.085,
  /** Height of the side boards, from the stone up. */
  h: 0.46,
  /** The capping rail laid over the boards' top edges, and how far it oversails them. */
  cap: 0.07,
  capOut: 0.04,
  /** The two stone blocks it stands on. */
  foot: 0.14,
  footL: 0.44,
  /**
   * How far the water sits below the top of the boards, and 5.5cm is a screenshot's answer rather than a
   * guess.
   *
   * EVERY NUMBER IN THIS BLOCK IS SET BY ONE SIGHTLINE: a five-year-old's eye is 1.5m up and they meet
   * this thing from three or four metres away, which is a depression of fifteen to twenty degrees. At that
   * angle a rim only has to stand a little above the water to hide all of it — the first pass had the
   * boards 74cm tall with 12cm of freeboard, and the shot from the approach showed a planter box. Nothing
   * about it was wrong except that the one thing it exists to show was behind a board.
   *
   * So the rim came down to 67cm over the grass and the water came up to 5.5cm under it, which is where a
   * trough somebody actually fills sits anyway. Deeper freeboard is not more realistic, it is emptier.
   */
  freeboard: 0.055,
} as const;

/** Heights derived once, so the boards, the bed and the water cannot drift out of agreement. */
const TROUGH_AT = {
  /** Underside of the boards, top of the stone. */
  base: TROUGH_BODY.foot,
  /** Top edge of the boards, under the cap. */
  lip: TROUGH_BODY.foot + TROUGH_BODY.h,
  /** Centre of a side board. */
  board: TROUGH_BODY.foot + TROUGH_BODY.h / 2,
  /** Centre of the capping rail. */
  cap: TROUGH_BODY.foot + TROUGH_BODY.h + TROUGH_BODY.cap / 2,
  /** Centre of the floor board. */
  bed: TROUGH_BODY.foot + TROUGH_BODY.t / 2,
  /** The waterline. */
  water: TROUGH_BODY.foot + TROUGH_BODY.h - TROUGH_BODY.freeboard,
} as const;

/** Clear inside the boards, which is what the water has to fit in. */
const TROUGH_IN = {
  l: TROUGH_BODY.l - TROUGH_BODY.t * 2,
  w: TROUGH_BODY.w - TROUGH_BODY.t * 2,
} as const;

/* ------------------------------------------------------------------ *\
   Keep-out, then the scatter
\* ------------------------------------------------------------------ */

function insideOrientedRect(
  p: Placed,
  halfW: number,
  halfD: number,
  x: number,
  z: number,
  pad: number,
): boolean {
  const c = Math.cos(p.rot);
  const s = Math.sin(p.rot);
  const dx = x - p.x;
  const dz = z - p.z;
  const lx = dx * c - dz * s;
  const lz = dx * s + dz * c;
  return Math.abs(lx) < halfW + pad && Math.abs(lz) < halfD + pad;
}

/**
 * How far from a station's panel nothing may grow.
 *
 * Enough to cover the panel AND the corridor a child stands in to read it: the docks sit about 4.6m out,
 * so a 5m circle keeps the whole approach clear.
 */
const STATION_CLEAR = 5;

/**
 * True where nothing may be planted or dropped.
 *
 * One predicate, used both to reject scattered trees and to reason about the fixed layout above. The two
 * hard rules are the approach corridor to the pod wall and the apron in front of it — a tree that grows
 * between a child and the question they are being asked is not a cosmetic problem.
 *
 * THAT RULE WAS BEING KEPT FOR A WALL THAT MOVED. The first clause below protects `|x| < 5.5`, which is
 * where the pod wall USED to stand; `stations/sites.ts` says as much in its own comment. The three
 * stations that exist now were protected by nothing, and two bushes duly grew 3.0m and 3.3m from the
 * coat wall's panel — from its own dock they flank the sightline, clip the bottom corners of the answer
 * panel and hide most of the sill. A bush between a child and the question is the same defect as a tree,
 * and this file already says so.
 *
 * The sites are imported rather than re-typed. `sites.ts` mirrors ITS constants from this file by hand,
 * so a second hand-typed copy going the other way is how the two drift apart.
 */
function blocked(x: number, z: number, pad = 0): boolean {
  /**
   * Never shrunk by a negative pad, which is the other half of the bug. The scrub below deliberately
   * passes -0.4 so it can hug fences and walls the way scrub does — a good rule for a barn and a
   * disastrous one for a sightline, because it let the bushes creep IN toward the panel.
   */
  for (const site of SITES) {
    if (Math.hypot(x - site.at[0], z - site.at[2]) < STATION_CLEAR + Math.max(pad, 0)) return true;
  }
  if (Math.abs(x) < 5.5 + pad && z < 9.5 && z > -9.5) return true;
  if (Math.hypot(x, z + 13) < 9 + pad) return true;
  if (insideOrientedRect(BARN, BARN_W / 2, BARN_D / 2, x, z, 1.6 + pad)) return true;
  if (insideOrientedRect(HUT, HUT_W / 2, HUT_D / 2, x, z, 1.6 + pad)) return true;
  if (Math.hypot(x - WINDMILL.x, z - WINDMILL.z) < 3.4 + pad) return true;
  for (const pen of PENS) {
    if (insideOrientedRect(pen, pen.halfW, pen.halfD, x, z, 1.2 + pad)) return true;
  }
  if (distanceToTracks(x, z) < 2.4 + pad) return true;
  // And off the boundary run, so nothing grows up through the rails. A trunk standing in a fence is the
  // one defect that makes a fence look painted on rather than built.
  if (onBoundary(x, z, pad)) return true;
  return false;
}

/**
 * Bark, as three pigments rather than one.
 *
 * Warmer and lighter than the `timberDeep`..`timber` pair they replace, because a trunk is thin, stands
 * in the open, and is the one vertical surface in the ranch that is almost never square to the sun — it
 * lives on fill light, and a pigment chosen to look right under direct sun is a silhouette out here.
 * Kept in this file rather than in `pigment.ts` because nothing else is made of bark.
 */
const BARK_DEEP = '#7c5a3c';
const BARK_PALE = '#b08a5c';
const BARK_GREY = '#8a7659';

interface Tree {
  x: number;
  z: number;
  y: number;
  trunkH: number;
  spread: number;
  lean: number;
  tint: number;
}

/**
 * Trees, in a loose belt that thickens toward the rim.
 *
 * The replacement for the forty spheres that sat in a perfect circle at the world edge: a ring reads as
 * a fence made of shrubbery, an uneven belt reads as the edge of a wood. The belt starts inside the
 * walkable radius so a child can walk among the first of them, and the density curve is what closes the
 * horizon without a wall.
 *
 * REBALANCED WHEN THE BOUNDARY LANDED, and the reason is the owner's own words: the fence had to go
 * "beyond the trees". The old curve put only ten of seventy-eight trees inside 32m, so a fence at the
 * furthest radius a child can actually reach — see `BOUNDARY_R` in `fence.ts` for why 34 is a hard
 * ceiling — would have stood in front of the wood rather than behind part of it, and the walk out from
 * the yard would have been meadow, fence, trees. That is a wall in a field.
 *
 * So the belt starts half a metre further in, the radius curve is bent the OTHER way (1.15 rather than
 * 0.6, which draws more of the belt into the inner rings instead of piling it on the rim), and the
 * thinning reaches full density by 29m instead of 40m. Measured rather than guessed: this puts 31 trees
 * inside the fence and 81 outside it, against 10 and 68 before. Walking out from the yard a child now
 * crosses meadow, then eight metres of open wood at about seven metres a tree, then meets the boundary
 * with the thick of the wood carrying on over the top rail.
 *
 * The count rises from 78 to 112 to fill the wider band. At ~490 triangles a tree that is about 17k
 * triangles on a scene that already draws 400k, and it is still two draw calls.
 */
const TREES: readonly Tree[] = (() => {
  const out: Tree[] = [];
  const rand = rng(0x5eed1a);
  for (let attempt = 0; attempt < 3000 && out.length < 112; attempt += 1) {
    const a = rand() * Math.PI * 2;
    const r = 22.5 + Math.pow(rand(), 1.15) * 25.5;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (blocked(x, z, 1.2)) continue;
    // Thin them near the middle so the first few read as individuals rather than as a hedge.
    if (rand() > smoothstep(22.5, 29, r) * 0.45 + 0.55) continue;
    let tooClose = false;
    for (const t of out) {
      if (Math.hypot(t.x - x, t.z - z) < 3.2) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;
    out.push({
      x,
      z,
      y: groundHeight(x, z),
      trunkH: 2.1 + rand() * 1.9,
      spread: 1.55 + rand() * 1.05,
      lean: (rand() - 0.5) * 0.13,
      tint: rand(),
    });
  }
  return out;
})();

/** Low scrub, hugging the fences and the buildings the way scrub does. */
const BUSHES: readonly { x: number; z: number; r: number; tint: number }[] = (() => {
  const out: { x: number; z: number; r: number; tint: number }[] = [];
  const rand = rng(0xb175e5);
  for (let attempt = 0; attempt < 900 && out.length < 42; attempt += 1) {
    const a = rand() * Math.PI * 2;
    const r = 8 + rand() * 26;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (blocked(x, z, -0.4)) continue;
    let tooClose = false;
    for (const b of out) if (Math.hypot(b.x - x, b.z - z) < 2.6) tooClose = true;
    for (const t of TREES) if (Math.hypot(t.x - x, t.z - z) < 2.2) tooClose = true;
    if (tooClose) continue;
    out.push({ x, z, r: 0.5 + rand() * 0.5, tint: rand() });
  }
  return out;
})();

/* ------------------------------------------------------------------ *\
   Colliders
\* ------------------------------------------------------------------ */

/**
 * Everything the child cannot walk through, as circles in the ground plane.
 *
 * Circles because the push-out is then one normalise, and because the player controller already thinks
 * radially. A building is wrapped as a CHAIN of small circles rather than as one big circle: a single
 * circle inscribing the barn would be 10.5m across and would stop a child three metres short of its own
 * doors, and one circumscribing it would swallow the path.
 *
 * The gate openings are deliberately left empty, so every pen can be walked into. So, now, is the barn's
 * doorway — see below.
 *
 * `position` is `[x, z]` in world metres. About 190 entries, so a brute-force pass is a few microseconds.
 */
export const SOLIDS: Solid[] = (() => {
  const out: Solid[] = [];

  /**
   * THE BARN'S COLLIDER IS NO LONGER A CLOSED CHAIN, and that single change is what makes the barn
   * enterable at all.
   *
   * It used to be one `chainRect(BARN, ...)` call: a 0.95m circle every 1.45m the whole way round the
   * footprint, INCLUDING straight across the big doors. So the doors could swing, a child could walk right
   * up to them, and the doorway was a wall — a defect invisible in every screenshot ever taken of it.
   *
   * `barnSolids()` in `barn.ts` builds the shell out of explicit segments instead, leaves the doorway as a
   * STATED gap rather than an artefact of where arc-length sampling happened to land, and adds an inner
   * chain along the stall fronts plus circles for the four things standing on the open floor.
   * `doorwayWalkReport()` in the same file then proves the result by stepping a keeper down the centreline,
   * which is the only kind of evidence this promise can have.
   */
  out.push(...barnSolids());

  /**
   * The hut stays a closed chain. It has no doorway a child can pass through and no interior to pass into,
   * and opening its collider would be a door onto the inside of a solid block.
   */
  out.push(...chainOutline(HUT, HUT_W / 2, HUT_D / 2, 0.9, 1.4));

  for (const post of FENCE.posts) {
    out.push({ position: [post.x, post.z], radius: post.gatePost ? 0.36 : 0.42 });
  }

  /**
   * THE BOUNDARY, AND THE REASON IT IS IN HERE RATHER THAN BEING SCENERY.
   *
   * The owner asked for a fence the child cannot get past. A fence you can walk through is worse than no
   * fence, because it teaches a five-year-old that the edge of their world is a picture — so the run
   * carries a collider at every post AND at every mid-bay, which is what closes the diagonal approach.
   * `fence.ts` explains the spacing arithmetic; `boundary.test.ts` walks the whole perimeter and proves
   * there is no angle that finds a hole, and that the keeper is always stopped by THIS rather than by
   * `Game.tsx`'s invisible 34-metre clamp.
   */
  out.push(...BOUNDARY.solids);

  out.push({ position: [WINDMILL.x, WINDMILL.z], radius: 1.5 });

  /**
   * THE TROUGH'S COLLIDER, AND WHY IT IS A CHAIN NOW.
   *
   * One 1.55m circle for a 2.24 x 0.82m box is the same mistake the barn's old closed chain was: a single
   * circle round an oblong thing is either inscribed and lets a child walk through the ends, or
   * circumscribed and holds them 1.1m off the sides of a vessel they are supposed to be able to lean over
   * and look into. 1.55 was the second, and the whole point of putting a trough where the sacks were is
   * that a child gets close enough to see the water in it.
   *
   * Three 0.46m circles along the long axis approximate a 2.2 x 0.92m capsule to about 4cm, and hold a
   * 0.45m keeper 0.45m off the boards — near enough to look down into, too far to stand inside.
   *
   * `TROUGH_BODY.l / 2 - 0.46` is arithmetic rather than a typed 0.66 for the reason the whole file
   * prefers derivation: a collider sized for a shape that has since changed is the defect the sacks'
   * 0.55m circle recorded, and it is invisible in every screenshot.
   */
  for (const t of TROUGHS) {
    const reach = TROUGH_BODY.l / 2 - 0.46;
    for (const along of [-reach, 0, reach]) {
      const w = toWorld(t, along, 0);
      out.push({ position: [w[0], w[1]], radius: 0.46 });
    }
  }

  for (const prop of BARN_YARD) {
    const w = toWorld(BARN, prop.lx, prop.lz);
    out.push({ position: [w[0], w[1]], radius: 0.72 });
  }

  // Only the trees a child can reach. `BOUND` is 34, so anything past 36 is decoration.
  for (const t of TREES) {
    if (Math.hypot(t.x, t.z) < 36) out.push({ position: [t.x, t.z], radius: 0.55 });
  }

  return out;
})();

/* ------------------------------------------------------------------ *\
   Ground
\* ------------------------------------------------------------------ */

/**
 * One polar disc, vertex-coloured.
 *
 * Polar rather than a grid, with power-law radial spacing: it puts most of its rings inside the flat
 * plateau where they are looked at, thins toward a rim nobody visits, and closes with a circular
 * silhouette that reads as a horizon instead of a square edge appearing out of the fog. Colour comes
 * from vertex attributes rather than a texture, so the whole valley is one draw call on plain
 * `MeshStandardMaterial` — no splat shader, and it still lights and receives shadow correctly.
 */
function useGroundGeometry(): BufferGeometry {
  return useMemo(() => {
    const thetaSeg = 132;
    const radialSeg = 78;
    const count = 1 + thetaSeg * radialSeg;
    const position = new Float32Array(count * 3);
    const color = new Float32Array(count * 3);
    // World-space UVs. Without these the ground carries a grain map it samples at a single texel, which
    // is a slow way of having no grain map at all.
    const uv = new Float32Array(count * 2);
    const index: number[] = [];

    const idx = (ring: number, theta: number): number =>
      1 + ring * thetaSeg + (((theta % thetaSeg) + thetaSeg) % thetaSeg);

    const c = new Color();
    const grass = new Color(PIG.grass);
    const grassDeep = new Color(PIG.grassDeep);
    const grassPale = new Color(PIG.grassPale);
    const earth = new Color(PIG.earth);
    const stone = new Color(PIG.stoneDeep);
    const scratch = new Color();

    const write = (i: number, x: number, z: number): void => {
      const y = groundHeight(x, z);
      position[i * 3] = x;
      position[i * 3 + 1] = y;
      position[i * 3 + 2] = z;
      uv[i * 2] = x / GRAIN_METRES;
      uv[i * 2 + 1] = z / GRAIN_METRES;

      // Patchy meadow at two scales, so the green is never one green.
      // Three scales: long drifts, clump-sized patches, and a fine break-up. One scale alone reads as a
      // gradient; two read as a pattern; three read as ground.
      const drift = noise2(x * 0.017 + 1.7, z * 0.017 - 9.4);
      const patch = noise2(x * 0.062 + 4.1, z * 0.062 - 2.7);
      const fine = noise2(x * 0.21 - 8.3, z * 0.21 + 5.9);
      c.copy(grassDeep).lerp(grass, smoothstep(0.2, 0.86, drift * 0.34 + patch * 0.46 + fine * 0.2));
      c.lerp(grassPale, clamp((drift - 0.55) * 1.5, 0, 0.55));
      // Sun-bleached where the ground lifts.
      c.lerp(grassPale, smoothstep(1, 9, y) * 0.5 + fine * 0.08);
      // Bare earth and stone on the steeper faces of the far hills.
      const steep =
        smoothstep(FLAT_R + 6, 88, Math.hypot(x, z)) * (0.4 + Math.abs(fbm(x * 0.05, z * 0.05, 2)));
      c.lerp(earth, clamp(steep * 0.7, 0, 0.7));
      c.lerp(stone, clamp(steep - 0.55, 0, 0.35));
      /**
       * A soft de-saturation under the worn tracks, so the track mesh's fade has something to fade into.
       *
       * NARROWED FROM SIX METRES TO THREE AND A HALF, AND HALVED IN STRENGTH, which is the other half of
       * the owner's "smudged" — and the half that was actually doing the smudging. A six-metre skirt either
       * side of four centrelines is a twelve-metre brown wash across a yard whose buildings are twenty
       * metres apart, so the meadow between the barn and the hut was not green at all; the track had no
       * edge because the whole yard was the same colour as the track. It also starts further out (2.2m,
       * past where the turf crest stands) and its falloff is broken up by the meadow's own fine noise, so
       * what is left is a hint of wear around a track rather than a halo painted on the grass.
       */
      const dPath = distanceToTracks(x, z);
      if (dPath < 3.4) {
        scratch.copy(earth).lerp(grassPale, 0.45);
        c.lerp(scratch, (1 - smoothstep(2.2, 3.4 + fine * 0.9, dPath)) * 0.26);
      }
      color[i * 3] = c.r;
      color[i * 3 + 1] = c.g;
      color[i * 3 + 2] = c.b;
    };

    write(0, 0, 0);
    for (let ring = 0; ring < radialSeg; ring += 1) {
      const t = (ring + 1) / radialSeg;
      const radius = GROUND_R * Math.pow(t, 1.75);
      for (let theta = 0; theta < thetaSeg; theta += 1) {
        const a = (theta / thetaSeg) * Math.PI * 2;
        write(idx(ring, theta), Math.cos(a) * radius, Math.sin(a) * radius);
      }
    }

    for (let theta = 0; theta < thetaSeg; theta += 1) {
      index.push(0, idx(0, theta + 1), idx(0, theta));
    }
    for (let ring = 0; ring < radialSeg - 1; ring += 1) {
      for (let theta = 0; theta < thetaSeg; theta += 1) {
        const a = idx(ring, theta);
        const b = idx(ring, theta + 1);
        const d = idx(ring + 1, theta + 1);
        const e = idx(ring + 1, theta);
        index.push(a, b, d, a, d, e);
      }
    }

    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(position, 3));
    g.setAttribute('color', new Float32BufferAttribute(color, 3));
    g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
    g.setIndex(index);
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }, []);
}

/**
 * The worn tracks, as a sunken lane with turf standing over its edges.
 *
 * See `TRACK` above for why the hollow is built by raising the field rather than by cutting into it. What
 * this function adds on top of that section is the four things that separate a worn track from a brown
 * band, and each one is a direct answer to "smudged and poorly rendered ... also completely flat":
 *
 *   RELIEF, so the mesh has normals that are not all straight up. That alone is most of it: the banks
 *   catch the low sun on one side of the track and fall into shadow on the other, which is the cue that
 *   says "this is a dip" without needing a single extra texture.
 *
 *   AN EDGE THAT INTERLOCKS. The toe of each bank wanders independently on each side, on a noise sampled
 *   along the track's own arc length rather than in world space — so the wobble follows the path instead of
 *   drifting across it — and the toe's COLOUR carries its own noise from bare dust to turf. Where those
 *   two coincide the grass reaches into the track and where they do not the dust reaches out, so the
 *   boundary is a ragged interlock rather than a clean line.
 *
 *   VARIATION ALONG THE LENGTH: width, crest height, hollow depth and the dust's own tone all move on
 *   slow noises, so no two stretches of the same track match.
 *
 *   RUTS, on the two tracks wide enough to have been driven — a crown down the middle with a wheel track
 *   either side of it. Modelled as relief and as tone together, because either alone reads as a stripe.
 *
 * Vertex *alpha* survives from the first pass and still does the same job at the outermost station only:
 * the fall back to meadow level fades to nothing, so the mesh never ends on a cut line. Everything inboard
 * of that is fully opaque, which is what lets the material write depth — with real relief it has to, or a
 * far bank can be drawn over a near one and the track turns inside out.
 */
function useTrackGeometry(): BufferGeometry {
  return useMemo(() => {
    const position: number[] = [];
    const rgba: number[] = [];
    // World-space UVs in units of a grain tile, exactly as the ground's are, so the two surfaces share one
    // continuous grain and the track does not read as a differently-textured patch laid on the meadow.
    const uv: number[] = [];
    const index: number[] = [];

    const dust = new Color(PIG.earthPale);
    const damp = new Color(PIG.earth);
    const rutTone = new Color(PIG.earth).lerp(new Color(PIG.stoneDeep), 0.32);
    const turf = new Color(PIG.grass);
    const turfDeep = new Color(PIG.grassDeep);
    const turfLit = new Color(PIG.grassPale);
    const col = new Color();
    /** What a lane's outer members turn into once a junction has flattened them: more trodden dust. */
    const scuff = new Color(PIG.earthPale).lerp(new Color(PIG.earth), 0.42);

    for (let li = 0; li < NETWORK.tracks.length; li += 1) {
      const spec = NETWORK.tracks[li];
      const stations = NETWORK.stations[li];
      if (!spec || !stations) continue;
      const ring = position.length / 3;

      for (const station of stations) {
        /**
         * THE SECTION IS SOLVED IN `paths.ts`, NOT HERE, and the split is what makes the owner's
         * complaint testable. Where each lane sits, how high it stands, and how far it stands DOWN
         * because another track's dirt is already there are all geometry, and geometry can be measured
         * in node. What is left in this file is pigment, which only a screenshot can settle.
         */
        for (const v of NETWORK.section(li, station)) {
          if (v.rank === 0) {
            // The crown, between the ruts.
            col.copy(dust).lerp(damp, 0.44 + v.dust * 0.3);
          } else if (v.rank === 1) {
            // The wheel track. Lowest point of the section, and the darkest.
            col.copy(spec.rutted ? rutTone : dust).lerp(damp, 0.5 + v.dust * 0.35);
          } else if (v.rank === 2) {
            col.copy(dust).lerp(damp, 0.36 + v.dust * 0.4);
          } else if (v.rank === 3) {
            /**
             * The toe, where dust meets turf, and where the interlock lives.
             *
             * Its colour runs from bare dust to full turf on a noise of its own, so the boundary is a
             * ragged mix along the length rather than a single blended edge everywhere.
             */
            col.copy(dust).lerp(damp, 0.46).lerp(turfDeep, 0.25 + v.grassIn * 0.55);
          } else if (v.rank === 4) {
            // The crest of the bank. Turf, and the brightest thing in the section under a low sun.
            col.copy(turf).lerp(turfDeep, 0.35).lerp(turfLit, v.lit * 0.5);
          } else {
            // And the long fall back to the meadow, which is where the mesh ends and fades out.
            col.copy(turf).lerp(turfDeep, 0.3);
          }

          /**
           * AND EVERY LANE GOES TO ONE SCUFFED TONE WHERE IT LIES OVER ANOTHER TRACK'S DIRT.
           *
           * TWO THINGS AT ONCE, and the second was caught by a screenshot of the crossroads.
           *
           * The obvious one is the banks: `paths.ts` has already collapsed them onto the toe and dropped
           * them to the floor at a junction, so the shape is right — but a flattened bank still painted
           * grass-green is a green stripe lying across a trodden mouth, which is the exact thing the
           * owner reported. Shape and colour have to stand down together or neither is worth doing.
           *
           * The subtler one is the crown and the ruts. Two lanes crossing are two INDEPENDENT dust
           * noises, and each carries its own vertical bias so they cannot z-fight — so whichever happens
           * to sit higher wins, and the join showed as a faint patchwork of straight-edged rectangles in
           * the middle of the junction. Straight edges are what give geometry away as geometry. Pulling
           * every rank toward one scuff tone in proportion to how much other dirt is under it makes the
           * overlap agree with itself, and the rectangles disappear into one trodden surface.
           */
          if (v.junction > 0) col.lerp(scuff, v.junction * (v.rank >= 3 ? 1 : 0.8));

          position.push(v.x, v.y, v.z);
          uv.push(v.x / GRAIN_METRES, v.z / GRAIN_METRES);
          rgba.push(col.r, col.g, col.b, v.alpha);
        }
      }

      /**
       * Stitch the strip, wound for an UPWARD normal, and the winding is arithmetic rather than a guess.
       *
       * `n = (-tz, tx)` for a tangent `t`, and in three dimensions `T x N` is straight DOWN — so a triangle
       * whose first edge runs along the track and whose second runs across it faces the floor. The first
       * attempt at this wound exactly that way and the entire track network vanished behind back-face
       * culling: correct geometry, correct colours, nothing on screen. It is the same silent failure the
       * note on the `decal` material records, which is why it is written down again here in the terms that
       * fix it: lane first, station second — `(a, b, d)` and `(a, d, c)` — giving `N x T`, which is up.
       */
      for (let i = 0; i < stations.length - 1; i += 1) {
        for (let k = 0; k < LANES - 1; k += 1) {
          const a = ring + i * LANES + k;
          const b = a + 1;
          const c = a + LANES;
          const d = c + 1;
          index.push(a, b, d, a, d, c);
        }
      }
    }

    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(position, 3));
    g.setAttribute('color', new Float32BufferAttribute(rgba, 4));
    g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
    g.setIndex(index);
    // Shared vertices along and across the strip, so this is smooth shading over the banks rather than a
    // faceted ribbon — which is the whole reason the strip is indexed.
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }, []);
}

/**
 * The stones and turf tufts that sit ON the track, which is the third of the three things that stop it
 * reading as paint.
 *
 * Relief gives the track a shape and the interlocked edge gives it a boundary; neither puts an OBJECT in
 * the ground plane, and until something breaks that plane a child's eye still has nothing to measure the
 * dip against. So: pebbles half-sunk in the wheel tracks, and tufts of grass straddling the crest so they
 * overhang the dust. Both are instanced — two draw calls for about two hundred parts — and both are small
 * enough to want no collider: nothing here is more than 9cm tall, and a keeper walks over it.
 */
function useTrackDressing(): { stones: Placement[]; tufts: Placement[] } {
  return useMemo(() => {
    const stones: Placement[] = [];
    const tufts: Placement[] = [];
    const rand = rng(0x7a11ed);
    const stoneWarm = new Color(PIG.stone);
    const stoneCool = new Color(PIG.stoneDeep);
    const leaf = new Color(PIG.grassDeep);
    // Toward the meadow's own green rather than its bleached highlight: tufts lerped all the way to
    // `grassPale` came out as pale pebbles lying beside the track instead of grass growing over it.
    const leafLit = new Color(PIG.grass).lerp(new Color(PIG.grassPale), 0.3);

    for (let li = 0; li < NETWORK.tracks.length; li += 1) {
      const stations = NETWORK.stations[li];
      if (!stations) continue;
      for (const station of stations) {
        const [px, pz] = station.p;
        const [nx, nz] = station.n;
        // The lane's own half-width, read from the plan rather than recomputed, so the dressing follows
        // a flared junction mouth out instead of sitting in a line down the middle of it.
        const hw = NETWORK.halfWidth(li, station.s);

        // A stone every few stations, out of the middle of the crown where feet fall. The radii are the
        // sphere's own, since the geometry is a unit sphere and the scale IS the radius — the first pass
        // read them as diameters and put half-metre boulders down the middle of a footpath.
        if (rand() < 0.17) {
          const u = (0.25 + rand() * 0.72) * hw * (rand() < 0.5 ? -1 : 1);
          const r = 0.03 + rand() * 0.045;
          stones.push({
            position: [px + nx * u, 0.012 + r * 0.3, pz + nz * u],
            rot: [0, rand() * 6.28, rand() * 0.4 - 0.2],
            // Squashed, because a stone in a track is a stone that has been trodden into it.
            scale: [r * 1.35, r * 0.72, r * 1.1],
            color: stoneWarm.clone().lerp(stoneCool, rand() * 0.8),
          });
        }

        /**
         * Tufts on both crests, straddling the line so their leaves hang over the dust.
         *
         * NOT AT A JUNCTION, though. `paths.ts` has taken the crest away where one track's dirt runs into
         * another's, so a tuft placed there is a clump of grass standing in the middle of a trodden
         * crossroads with nothing under it — the shape stood down and the dressing did not. It is the
         * same class of miss as leaving the crest green after flattening it.
         */
        for (const sgn of [-1, 1] as const) {
          if (rand() > 0.34) continue;
          const wob = NETWORK.toe(li, station.s, sgn) - hw;
          const u = sgn * (hw + wob + TRACK.bank * (0.15 + rand() * 0.8));
          if (NETWORK.cover(px + nx * u, pz + nz * u, li) > 0.25) continue;
          const r = 0.04 + rand() * 0.05;
          tufts.push({
            position: [px + nx * u, 0.032 + r * 0.3, pz + nz * u],
            rot: [0, rand() * 6.28, 0],
            scale: [r * 1.6, r * 0.78, r * 1.3],
            color: leaf.clone().lerp(leafLit, 0.1 + rand() * 0.7),
          });
        }
      }
    }
    return { stones, tufts };
  }, []);
}

/**
 * The pen floors: trodden bare earth inside the fence, feathering out just past it.
 *
 * Still flat, and still on the transparent decal material, because a pen floor is a trodden YARD rather
 * than a worn track — it has no direction, so it has no banks and nothing to break over an edge. The
 * tracks moved out into `useTrackGeometry` when they gained relief; this is what was left.
 */
function useDecalGeometry(): BufferGeometry {
  return useMemo(() => {
    const position: number[] = [];
    const rgba: number[] = [];
    const normal: number[] = [];
    const y = 0.02;

    /**
     * Lightened to sit with the tracks rather than against them.
     *
     * `PIG.earth` flat at 0.9 alpha was a much deeper brown than the track's dust, and with the ground's
     * wide de-saturation band cut back the pens started reading as dark holes in a green meadow next to
     * pale trodden lanes. Mixing dust into it puts the two worn surfaces in the same family, which is what
     * they are — trodden ground, in a yard and on a lane.
     */
    const earthCore = new Color(PIG.earthPale).lerp(new Color(PIG.earth), 0.55);

    const vert = (x: number, z: number, col: Color, alpha: number): void => {
      position.push(x, y, z);
      normal.push(0, 1, 0);
      rgba.push(col.r, col.g, col.b, alpha);
    };
    const quad = (
      a: P2,
      b: P2,
      cc: P2,
      d: P2,
      alphas: readonly [number, number, number, number],
      col: Color,
    ): void => {
      vert(a[0], a[1], col, alphas[0]);
      vert(b[0], b[1], col, alphas[1]);
      vert(cc[0], cc[1], col, alphas[2]);
      vert(a[0], a[1], col, alphas[0]);
      vert(cc[0], cc[1], col, alphas[2]);
      vert(d[0], d[1], col, alphas[3]);
    };

    for (const pen of PENS) {
      const inner = roundedRectOutline(pen.halfW - 0.4, pen.halfD - 0.4, pen.cornerR, 6);
      const outer = roundedRectOutline(pen.halfW + 0.9, pen.halfD + 0.9, pen.cornerR + 0.9, 6);
      const centre = toWorld(pen, 0, 0);
      for (let i = 0; i < inner.length; i += 1) {
        const a = inner[i] ?? [0, 0];
        const b = inner[(i + 1) % inner.length] ?? [0, 0];
        const wa = toWorld(pen, a[0], a[1]);
        const wb = toWorld(pen, b[0], b[1]);
        vert(centre[0], centre[1], earthCore, 0.9);
        vert(wa[0], wa[1], earthCore, 0.88);
        vert(wb[0], wb[1], earthCore, 0.88);
      }
      for (let i = 0; i < inner.length; i += 1) {
        const a = inner[i] ?? [0, 0];
        const b = inner[(i + 1) % inner.length] ?? [0, 0];
        const oa = outer[i] ?? [0, 0];
        const ob = outer[(i + 1) % outer.length] ?? [0, 0];
        quad(
          toWorld(pen, a[0], a[1]),
          toWorld(pen, b[0], b[1]),
          toWorld(pen, ob[0], ob[1]),
          toWorld(pen, oa[0], oa[1]),
          [0.88, 0.88, 0, 0],
          earthCore,
        );
      }
    }

    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(position, 3));
    g.setAttribute('normal', new Float32BufferAttribute(normal, 3));
    g.setAttribute('color', new Float32BufferAttribute(rgba, 4));
    g.computeBoundingSphere();
    return g;
  }, []);
}

function Ground(): JSX.Element {
  const m = materials();
  const ground = useGroundGeometry();
  const track = useTrackGeometry();
  const decal = useDecalGeometry();
  const dressing = useTrackDressing();
  const g = useMemo(
    () => ({
      stone: new SphereGeometry(1, 7, 5),
      tuft: new SphereGeometry(1, 6, 4),
    }),
    [],
  );
  return (
    <>
      {/* Receives but does not cast: 20k triangles of flat ground contribute nothing to a shadow map. */}
      <mesh geometry={ground} material={m.ground} receiveShadow />
      {/*
        The tracks. `renderOrder` 1 like the pen floors, but on the `track` material rather than `decal`
        because this one has relief and therefore has to write depth — see the note on the material.
      */}
      <mesh geometry={track} material={m.track} receiveShadow renderOrder={1} />
      <mesh geometry={decal} material={m.decal} receiveShadow renderOrder={2} />
      <Instanced geometry={g.stone} material={m.stones} items={dressing.stones} />
      {/* Tufts do not cast: two hundred 9cm shadow casters buy nothing and cost a shadow-map pass each. */}
      <Instanced geometry={g.tuft} material={m.canopy} items={dressing.tufts} castShadow={false} />
    </>
  );
}

/* ------------------------------------------------------------------ *\
   The barn
\* ------------------------------------------------------------------ */

/**
 * A rounded box of a given size, with a fillet that cannot be bigger than the thing it is rounding.
 *
 * `RoundedBoxGeometry` throws nothing and checks nothing if the radius exceeds half the smallest
 * dimension — it just folds the box inside out. A 34cm wall asked for a 6cm fillet is fine; the same call
 * on a 7cm threshold slab is not, so the radius is clamped to a third of the thinnest axis.
 */
function roundedSlab(size: readonly [number, number, number]): RoundedBoxGeometry {
  const min = Math.min(size[0], size[1], size[2]);
  return new RoundedBoxGeometry(size[0], size[1], size[2], 1, Math.min(0.06, min * 0.32));
}

/**
 * Slabs bucketed by identical size, so one geometry and one draw call serves every slab that shares it.
 *
 * The barn's ring has five wall pieces and five footing pieces but only four distinct sizes each, because
 * the two long walls match and so do the two jambs. Bucketing on the size alone finds that automatically
 * and would keep finding it if the ring ever gained another symmetrical pair.
 */
function slabGroups(
  slabs: readonly { at: readonly [number, number, number]; size: readonly [number, number, number] }[],
): { geometry: RoundedBoxGeometry; items: Placement[] }[] {
  const buckets = new Map<string, { size: readonly [number, number, number]; items: Placement[] }>();
  for (const slab of slabs) {
    const key = slab.size.map((n) => n.toFixed(4)).join('x');
    const bucket = buckets.get(key) ?? { size: slab.size, items: [] };
    bucket.items.push({ position: slab.at });
    buckets.set(key, bucket);
  }
  return [...buckets.values()].map((b) => ({ geometry: roundedSlab(b.size), items: b.items }));
}

function Barn(): JSX.Element {
  const m = materials();

  const g = useMemo(() => {
    const roofHalfW = BARN_W / 2 + BARN_EAVE;
    const roofHalfD = BARN_D / 2 + BARN_RAKE;
    return {
      /**
       * THE WALLS ARE A RING, and this is the change that turns the barn from an object into a place.
       *
       * `RoundedBoxGeometry` is SOLID: its faces are closed, so `new RoundedBoxGeometry(10.5, 5, 14)` — what
       * was here — is not a barn. It is a ten-tonne block of painted timber with boards nailed to the
       * outside, which is exactly the mistake `stations/carpentry.tsx` records against the first spring
       * basin, where a solid kerb sealed the water inside an opaque stone box. Same fix: a building you can
       * enter has to be a RING.
       *
       * `BARN_WALLS` and `BARN_PLINTH` in `barn.ts` are that ring — four wall slabs with the door end split
       * into two jambs and a header, and a footing course with the doorway notched out of it.
       *
       * GROUPED BY SIZE rather than scaled from one unit cube, and the reason is the fillet. Scaling a
       * rounded box 0.34 x 5 x 14 out of a unit cube scales its corner radius with it, so a 5.5cm fillet
       * becomes 2cm on one axis and 77cm on another — the wall would arrive as a gigantic rounded lozenge.
       * Since the two long walls share a size and so do the two jambs, grouping identical sizes gets the
       * whole ring into four draw calls anyway.
       */
      wallGroups: slabGroups(BARN_WALLS),
      plinthGroups: slabGroups(BARN_PLINTH),
      threshold: roundedSlab(BARN_THRESHOLD.size),
      roof: gableRoofGeometry({
        width: BARN_W,
        depth: BARN_D,
        rise: BARN_RISE,
        thickness: BARN_ROOF_T,
        eave: BARN_EAVE,
        rake: BARN_RAKE,
      }),
      gableWall: gableWallGeometry({
        width: BARN_W,
        rise: BARN_RISE,
        eave: BARN_EAVE,
        depth: 0.34,
        bevel: 0.05,
        inset: 0.07,
      }),
      /**
       * The same soffit board the hut got, on the two long eaves — and the barn's is the version with a
       * VENT SLOT.
       *
       * `barnInterior.tsx` deliberately leaves a 7cm gap above its inner eave closure so a horizontal
       * sliver of daylight comes in high on a shaded wall, and that daylight arrives through this annulus.
       * Sealing the outside would have put the interior's one natural light source out. So the board stops
       * 8cm short of the wall face instead: from the ground the roof plainly lands on the wall, the void is
       * no longer a 62cm hole with a chimney-sized view into it, and the slot still lets the sun in.
       *
       * It also fixes a distance bug worth naming. The interior group switches itself off past 26 metres,
       * and the inner closure board went with it — so from across the meadow the annulus opened up into
       * nothing at all. This board is exterior and is never culled, so the eave now reads the same from
       * three metres and from thirty.
       *
       * `'eaves'` only: a gable's rakes are already closed by its own barge boards and the gable wall.
       */
      eave: eaveCollarGeometry({
        width: BARN_W,
        depth: BARN_D,
        eave: BARN_EAVE,
        rake: BARN_RAKE,
        thickness: 0.16,
        reveal: 0.08,
        sides: 'eaves',
      }),
      // A gable meeting in a knife edge reads as folded card; a rolled ridge is what a real one looks
      // like, and it softens the single silhouette a child sees against the sky.
      // Held 4cm inside the barge boards at each end: proud of them, the cap's circular end cap reads
      // as a knob stuck on the apex.
      ridge: new CylinderGeometry(0.21, 0.21, roofHalfD * 2 - 0.08, 10, 1),
      /**
       * Eave trim. A thin board laid flat against the *outboard* face of the roof slab's fascia, not
       * rotated into the pitch and not tucked under it, so there is no angle to get wrong and nothing to
       * intersect. It exists to put a cream line under the eave, which is what stops a dark roof reading
       * as a hole cut in the sky.
       */
      eaveTrim: new BoxGeometry(0.07, BARN_ROOF_T * 0.72, roofHalfD * 2),
      batten: new RoundedBoxGeometry(0.16, BARN_WALL_H - 0.3, 0.1, 1, 0.04),
      hayDoor: new RoundedBoxGeometry(1.5, 1.4, 0.16, 2, 0.06),
      cupolaWall: new RoundedBoxGeometry(1.5, 1.15, 1.5, 2, 0.14),
      cupolaRoof: hipRoofGeometry({
        width: 1.5,
        depth: 1.5,
        rise: 0.72,
        thickness: 0.14,
        eave: 0.18,
        ridgeFraction: 0,
      }),
      leanPost: new RoundedBoxGeometry(0.19, 2.72, 0.19, 2, 0.06),
      leanSlab: new RoundedBoxGeometry(3.0, 0.16, 6.4, 2, 0.07),
      roofHalfW,
      roofHalfD,
    };
  }, []);

  const gableZ = BARN_GABLE_Z;

  /**
   * Vertical battens down the long walls. Board-and-batten is THE ranch-barn surface, and it is also what
   * breaks a 14-metre wall into something with a scale a child can read.
   *
   * SKIPPED WHERE A WINDOW IS. The battens stand 3.5cm proud of the wall face and a window frame stands
   * 10cm proud of the same face, so three of the barn's five windows would have had a cream board running
   * straight down the middle of them. That is not a subtle artefact: the siding is the loudest thing on
   * this wall, so the batten wins the eye and the window reads as pasted on afterwards. `wallTaken` asks
   * the window census, which is the right way round — real siding is cut around its openings.
   */
  const battens = useMemo<Placement[]>(() => {
    const out: Placement[] = [];
    const n = 13;
    for (let i = 0; i < n; i += 1) {
      const z = -BARN_D / 2 + 0.6 + (i / (n - 1)) * (BARN_D - 1.2);
      for (const side of [-1, 1] as const) {
        if (wallTaken(BARN, side > 0 ? Math.PI / 2 : -Math.PI / 2, z)) continue;
        out.push({
          position: [(side * BARN_W) / 2 + side * 0.035, BARN_WALL_H / 2 - 0.05, z],
          rot: [0, Math.PI / 2, 0],
        });
      }
    }
    return out;
  }, []);

  const leanPosts = useMemo<Placement[]>(
    () => [-1, 1].map((side) => ({ position: [-7.9, 1.36, -2.4 + side * 2.9] as const })),
    [],
  );

  return (
    <group position={[BARN.x, 0, BARN.z]} rotation={[0, BARN.rot, 0]}>
      {/*
        Footing, as a ring with the doorway notched out of it, plus a stone threshold laid level with the
        floor inside.
        A building that meets the grass on a stone course looks planted; one that does not looks dropped.
        But a SOLID course is a plug: it would put a 44cm kerb across the doorway at exactly the height a
        child cannot see and the controller cannot step over.
      */}
      {g.plinthGroups.map((group, i) => (
        <Instanced key={i} geometry={group.geometry} material={m.stone} items={group.items} />
      ))}
      <mesh
        geometry={g.threshold}
        material={m.stoneDeep}
        position={BARN_THRESHOLD.at as unknown as [number, number, number]}
        receiveShadow
      />

      <group position={[0, BARN_PLINTH_H, 0]}>
        {g.wallGroups.map((group, i) => (
          <Instanced key={i} geometry={group.geometry} material={m.barnWall} items={group.items} />
        ))}
        <Instanced geometry={g.batten} material={m.trim} items={battens} />

        {/* The gable walls, filling the triangle the roof leaves open. Traced from the roof's own soffit
            in `gableWallShape`, so the fit is arithmetic rather than eyeballed. */}
        {[-1, 1].map((side) => (
          <mesh
            key={side}
            geometry={g.gableWall}
            material={m.trim}
            position={[0, BARN_WALL_H, side * gableZ]}
            castShadow
            receiveShadow
          />
        ))}

        {/*
          THE BIG DOORS ARE NOT HERE ANY MORE. They were two static leaves hung flat on the wall; they are
          now in `barnInterior.tsx`, hinged at the outer edges of a real opening and swinging on proximity.
          They live there rather than here because they belong to the same story as the floor they open onto
          and the collider gap that lets a child through, and because they need a per-frame hook that this
          purely static component has no business owning.
        */}
        {/* Hay door up in the gable, where the hoist would be. Flush against the gable wall's face. */}
        <mesh
          geometry={g.hayDoor}
          material={m.timber}
          position={[0, BARN_WALL_H + 1.15, gableZ + 0.17 + 0.06]}
          castShadow
          receiveShadow
        />

        {/* Roof. Local origin sits on the wall head; every vertex is at or above it. */}
        <group position={[0, BARN_WALL_H, 0]}>
          <mesh geometry={g.roof} material={m.shingle} castShadow receiveShadow />
          {/* Soffit and fascia on the two long eaves, with the vent slot the interior is lit through. */}
          <mesh geometry={g.eave} material={m.trim} castShadow receiveShadow />
          <mesh
            geometry={g.ridge}
            material={m.shingle}
            position={[0, BARN_RISE + BARN_ROOF_T - 0.06, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            castShadow
          />
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              geometry={g.eaveTrim}
              material={m.trim}
              position={[side * (g.roofHalfW + 0.035), BARN_ROOF_T * 0.44, 0]}
              castShadow
            />
          ))}
          {/* Cupola. One small thing above the ridge gives the silhouette somewhere to end. */}
          <group position={[0, BARN_RISE + BARN_ROOF_T - 0.1, 0]}>
            <mesh geometry={g.cupolaWall} material={m.trim} position={[0, 0.58, 0]} castShadow receiveShadow />
            <mesh geometry={g.cupolaRoof} material={m.shingle} position={[0, 1.15, 0]} castShadow />
          </group>
        </group>
      </group>

      {/*
        A lean-to along the shaded long wall, so the barn is not one prism. Same rule as the roofs: the
        slab's low end sits on the post heads and it rises toward the wall, finishing at 3.56m — well
        under the 5.44m eave soffit, so it passes beneath the overhang instead of into it.
      */}
      <group position={[0, BARN_PLINTH_H, 0]}>
        <Instanced geometry={g.leanPost} material={m.timberDeep} items={leanPosts} />
        <mesh
          geometry={g.leanSlab}
          material={m.shingle}
          position={[-6.6, 3.12, -2.4]}
          rotation={[0, 0, 0.3]}
          castShadow
          receiveShadow
        />
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ *\
   The keeper's hut
\* ------------------------------------------------------------------ */

function Hut(): JSX.Element {
  const m = materials();

  const g = useMemo(
    () => ({
      plinth: new RoundedBoxGeometry(HUT_W + 0.44, HUT_PLINTH_H, HUT_D + 0.44, 2, 0.1),
      walls: new RoundedBoxGeometry(HUT_W, HUT_WALL_H, HUT_D, 3, 0.2),
      // A hip roof needs no gable wall: it closes itself, so there is no second number to keep in
      // agreement with the first. Thick and deeply oversailing, which is how thatch sits.
      roof: hipRoofGeometry({
        width: HUT_W,
        depth: HUT_D,
        rise: HUT_RISE,
        thickness: HUT_ROOF_T,
        eave: HUT_EAVE,
        ridgeFraction: 0.34,
      }),
      /**
       * THE BOARD THAT MAKES THE ROOF LAND ON THE HOUSE.
       *
       * A mitred soffit ring from the wall face out to the eave, hanging 15cm below the wall head, with its
       * outer edge sitting directly under the thatch's own fascia so the eave reads as one deep timber edge
       * a child can see the shadow of. `reveal: -0.015` laps it 15mm onto the wall face rather than butting
       * it exactly, because two coplanar faces fight over the same pixels and a 15mm lap is a joint.
       *
       * The hut is CLOSED all the way round — no vent slot — because it has no interior to light and
       * nothing behind the board except the void the chimney rises through, which is the whole point.
       */
      eave: eaveCollarGeometry({
        width: HUT_W,
        depth: HUT_D,
        eave: HUT_EAVE,
        rake: HUT_EAVE,
        thickness: HUT_SOFFIT_T,
        reveal: -0.015,
        sides: 'ring',
      }),
      ridge: new CylinderGeometry(0.2, 0.2, HUT_D * 0.34 + 0.5, 9, 1),
      beam: new RoundedBoxGeometry(0.17, HUT_WALL_H - 0.1, 0.17, 2, 0.055),
      lintel: new RoundedBoxGeometry(HUT_W - 0.5, 0.2, 0.17, 2, 0.06),
      door: new RoundedBoxGeometry(1.05, 2.05, 0.14, 2, 0.09),
      /** Four planks and two ledges on the leaf, so the knob has a door to be on. */
      doorPlank: new RoundedBoxGeometry(0.235, 1.93, 0.03, 1, 0.012),
      doorLedge: new RoundedBoxGeometry(0.95, 0.13, 0.035, 1, 0.014),
      strap: new RoundedBoxGeometry(0.5, 0.06, 0.026, 1, 0.011),
      /** The knob: a rose plate, a neck and the ball. */
      knobRose: new CylinderGeometry(0.062, 0.07, 0.022, 12),
      knobNeck: new CylinderGeometry(0.019, 0.024, 0.05, 8),
      knob: new SphereGeometry(0.052, 12, 9),
      chimney: new RoundedBoxGeometry(CHIMNEY.w, CHIMNEY.h, CHIMNEY.w, 2, 0.1),
      chimneyCap: new RoundedBoxGeometry(CHIMNEY.w + 0.22, 0.18, CHIMNEY.w + 0.22, 2, 0.06),
      /**
       * THE FLASHING, which is what says a chimney was BUILT through a roof rather than pushed into one.
       *
       * Two stepped collars lying in the roof's own plane: a wide apron dressed onto the slope and a
       * narrower course above it, both tilted by `HUT_PITCH` about local Z so they lie flat on the skin
       * instead of cutting across it. Thin in Y and oversized in X and Z, so what shows is a lead-ish
       * skirt spreading out from the stack onto the thatch and a shadow line under it — the two details a
       * real flashing produces, and the two the eye is looking for at a penetration.
       *
       * Solid rather than four dressed leaves. It intersects the stack it wraps, which is invisible
       * because both are opaque, and it saves modelling an up-slope back gutter that nothing can see from
       * a child's eye height on the ground.
       */
      flashApron: new RoundedBoxGeometry(CHIMNEY.w + 0.34, 0.075, CHIMNEY.w + 0.34, 1, 0.028),
      flashUpstand: new RoundedBoxGeometry(CHIMNEY.w + 0.17, 0.065, CHIMNEY.w + 0.17, 1, 0.024),
    }),
    [],
  );

  // Corner posts, an intermediate post per long wall, and a wall-head plate: a half-timbered cottage
  // rather than a cream box.
  const beams = useMemo<Placement[]>(() => {
    const out: Placement[] = [];
    for (const sx of [-1, 1] as const) {
      for (const sz of [-1, 1] as const) {
        out.push({ position: [(sx * HUT_W) / 2, HUT_WALL_H / 2 - 0.05, (sz * HUT_D) / 2] });
      }
    }
    for (const sz of [-1, 1] as const) {
      out.push({ position: [0, HUT_WALL_H / 2 - 0.05, (sz * HUT_D) / 2] });
    }
    return out;
  }, []);

  return (
    <group position={[HUT.x, 0, HUT.z]} rotation={[0, HUT.rot, 0]}>
      <mesh
        geometry={g.plinth}
        material={m.stone}
        position={[0, HUT_PLINTH_H / 2, 0]}
        castShadow
        receiveShadow
      />

      <group position={[0, HUT_PLINTH_H, 0]}>
        <mesh
          geometry={g.walls}
          material={m.plaster}
          position={[0, HUT_WALL_H / 2, 0]}
          castShadow
          receiveShadow
        />
        <Instanced geometry={g.beam} material={m.timberDeep} items={beams} />
        {[-1, 1].map((sz) => (
          <mesh
            key={sz}
            geometry={g.lintel}
            material={m.timberDeep}
            position={[0, HUT_WALL_H - 0.16, (sz * HUT_D) / 2]}
            castShadow
          />
        ))}

        {/*
          Door on +Z, the face turned toward the arrival path.

          THE KNOB, which the owner asked for, and the four things it needs to read as one. A ball on a
          blank slab is a bead stuck to a plank: what says "handle" is the ROSE it stands on and the shadow
          under it, what says "door" rather than "panel" is boarding and ledges, and what says which side
          the knob is on is a pair of straps on the other one. So the leaf is boarded — four planks in the
          lighter timber over the darker leaf, so the gaps between them read as gaps — two ledges cross it,
          the straps hang on the -X stile, and the brass sits at 0.99m up the leaf, which is the height a
          door handle is and a height a five-year-old can reach.
        */}
        <mesh
          geometry={g.door}
          material={m.timberDeep}
          position={[-0.9, 1.03, HUT_D / 2 + 0.07]}
          castShadow
          receiveShadow
        />
        {[-0.386, -0.129, 0.129, 0.386].map((dx) => (
          <mesh
            key={dx}
            geometry={g.doorPlank}
            material={m.timber}
            position={[-0.9 + dx, 1.03, HUT_D / 2 + 0.155]}
            castShadow
          />
        ))}
        {[-0.72, 0.72].map((dy) => (
          <mesh
            key={dy}
            geometry={g.doorLedge}
            material={m.timberDeep}
            position={[-0.9, 1.03 + dy, HUT_D / 2 + 0.1875]}
            castShadow
          />
        ))}
        {[-0.62, 0.62].map((dy) => (
          <mesh
            key={dy}
            geometry={g.strap}
            material={m.timberDeep}
            position={[-1.15, 1.03 + dy, HUT_D / 2 + 0.185]}
            castShadow
          />
        ))}
        <mesh
          geometry={g.knobRose}
          material={m.brass}
          position={[-0.52, 0.99, HUT_D / 2 + 0.181]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        />
        <mesh
          geometry={g.knobNeck}
          material={m.brass}
          position={[-0.52, 0.99, HUT_D / 2 + 0.217]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        />
        <mesh
          geometry={g.knob}
          material={m.brass}
          position={[-0.52, 0.99, HUT_D / 2 + 0.277]}
          castShadow
        />

        {/*
          LAMPLIGHT. With the sun where it is, the hut is the one building left in shadow, which would make
          it the dead corner of the composition — so it gets a warm interior instead, and against a blue
          shadow side it is the most inviting thing on the ranch.
          The three emissive panes that used to be here are gone. They were rounded boxes painted with an
          emissive material: a glowing rectangle stuck to a wall, which is a hole rather than a window.
          `windows.tsx` draws the hut's four real windows now — frame, mullions, glass, shutters, planting —
          in world space alongside the barn's five, so all nine share one set of instanced meshes. What
          stays here is the point light at the door, because that is a property of this building's porch
          rather than of any one window.
        */}
        <pointLight
          position={[-0.9, 1.5, HUT_D / 2 + 0.9]}
          color={PIG.honey}
          intensity={5.5}
          distance={7}
          decay={2}
        />

        <group position={[0, HUT_WALL_H, 0]}>
          <mesh geometry={g.roof} material={m.thatch} castShadow receiveShadow />
          {/*
            The soffit and fascia. Same frame as the roof — origin on the wall head — so the two cannot
            drift apart, and it hangs BELOW that plane, which is why it closes the eave without going
            anywhere near the wall solid. `roofs.ts` asserts both halves of that.
          */}
          {/*
            PAINTED, NOT BARE TIMBER, and a screenshot settled it. A soffit faces straight down, so the only
            light that reaches it is `Lighting.tsx`'s ground bounce and its weak warm ambient — and on the
            timber pigment those resolve to near-black. Photographed from below, the closed eave then read as
            a dark slot, which is very nearly the hole it was put there to fill. On the cream trim the same
            light resolves to a warm beige, so the board is legible from underneath, and because the wall
            below it is lit while it is not, the shadow line at the joint still separates the two.
          */}
          <mesh geometry={g.eave} material={m.trim} castShadow receiveShadow />
          <mesh
            geometry={g.ridge}
            material={m.thatch}
            position={[0, HUT_RISE + HUT_ROOF_T - 0.05, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            castShadow
          />
        </group>

        {/* Chimney. Rises from *inside* the footprint and passes through the roof, which is what a
            chimney does — as opposed to the floating stack you get from placing it by eye outside. */}
        <group position={[CHIMNEY.lx, 0, CHIMNEY.lz]}>
          <mesh
            geometry={g.chimney}
            material={m.stone}
            position={[0, HUT_WALL_H + 1.1, 0]}
            castShadow
            receiveShadow
          />
          <mesh
            geometry={g.chimneyCap}
            material={m.stoneDeep}
            position={[0, HUT_WALL_H + 2.44, 0]}
            castShadow
          />
          {/* Where it comes through: an apron dressed onto the slope and a course above it. */}
          <mesh
            geometry={g.flashApron}
            material={m.stoneDeep}
            position={[0, HUT_WALL_H + hutSkinY(CHIMNEY.lx) + 0.025, 0]}
            rotation={[0, 0, -HUT_PITCH]}
            castShadow
            receiveShadow
          />
          <mesh
            geometry={g.flashUpstand}
            material={m.stoneDeep}
            position={[0, HUT_WALL_H + hutSkinY(CHIMNEY.lx) + 0.155, 0]}
            rotation={[0, 0, -HUT_PITCH]}
            castShadow
            receiveShadow
          />
        </group>
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ *\
   Fencing
\* ------------------------------------------------------------------ */

function Pens(): JSX.Element {
  const m = materials();

  const g = useMemo(
    () => ({
      post: new RoundedBoxGeometry(POST_W, POST_H, POST_W, 2, 0.055),
      gatePost: new RoundedBoxGeometry(POST_W * 1.35, POST_H + GATE_POST_EXTRA, POST_W * 1.35, 2, 0.06),
      cap: new RoundedBoxGeometry(POST_W + 0.11, 0.09, POST_W + 0.11, 2, 0.035),
      // Unit length in X, scaled per instance. One geometry for every rail in the ranch.
      rail: new RoundedBoxGeometry(1, 0.14, 0.08, 1, 0.035),
      gateRail: new RoundedBoxGeometry(1, 0.13, 0.07, 1, 0.03),
    }),
    [],
  );

  /**
   * WEATHERING, AS AN INSTANCE COLOUR, AND WHY THE BOUNDARY GETS IT AND THE PENS DO NOT.
   *
   * Two hundred metres of identical posts does not read as a fence, it reads as an array — the eye finds
   * the repeat instantly at that length, and once it has, the thing stops being carpentry. A pen is nine
   * metres round and has no such problem, so its posts stay at the material's own pigment.
   *
   * The range is narrow and biased BRIGHT — 0.96 to 1.18 rather than either side of neutral — and the
   * bias is the whole point rather than a taste. Darkening timber in this world is dangerous: a face
   * that catches no sun already resolves close to black, which is the defect the barn's eaves had to be
   * painted trim to escape. A screenshot of the run's shaded side settled the numbers; at 0.9 the north
   * face of the fence crushed into the tree trunks behind it and two hundred metres of carpentry read as
   * a smear. So the variation is spent entirely on "some rails are more sun-bleached than others" and
   * never on shadow.
   *
   * Values above 1 are fine: `setColorAt` writes a float multiplier, and `new Color(r, g, b)` built from
   * numbers is taken as LINEAR rather than sRGB — unlike `new Color('#8a6a49')`, which is converted — so
   * 1.18 is exactly eighteen percent brighter and nothing clamps it on the way to the shader.
   *
   * `heavy` lifts harder still. The corner and jamb posts hang in the pens' `timberDeep` mesh so they
   * cost no extra draw call, but `timberDeep` is the darkest pigment on the ranch and on the shaded side
   * of the run it was the one thing that genuinely went black. Multiplying it back up by about a third
   * puts a corner post between the two timbers: still visibly deeper than the line posts either side of
   * it, which is what makes a corner read as a corner, and no longer a hole in the fence.
   */
  const weather = useMemo(() => {
    const worn = new Color(0.96, 0.94, 0.9);
    const bleached = new Color(1.18, 1.15, 1.08);
    const heavyWorn = new Color(1.24, 1.2, 1.14);
    const heavyBleached = new Color(1.46, 1.42, 1.32);
    return (t: number, heavy = false): Color =>
      heavy ? heavyWorn.clone().lerp(heavyBleached, t) : worn.clone().lerp(bleached, t);
  }, []);

  const posts = useMemo<Placement[]>(() => {
    const out: Placement[] = FENCE.posts
      .filter((p) => !p.gatePost)
      .map((p) => ({ position: [p.x, POST_H / 2, p.z] as const, rot: [0, p.angle, 0] as const }));
    // The boundary's line posts join the pens' in the same mesh, so the whole ranch is still one call.
    for (const p of BOUNDARY.posts) {
      if (p.heavy) continue;
      out.push({
        position: [p.x, POST_H / 2, p.z] as const,
        rot: [0, p.angle, 0] as const,
        color: weather(p.tint),
      });
    }
    return out;
  }, [weather]);
  const gatePosts = useMemo<Placement[]>(() => {
    const out: Placement[] = FENCE.posts
      .filter((p) => p.gatePost)
      .map((p) => ({
        position: [p.x, (POST_H + GATE_POST_EXTRA) / 2, p.z] as const,
        rot: [0, p.angle, 0] as const,
      }));
    // Corner and jamb posts on the boundary take the same heavier stock a pen's gate post does. A long
    // run needs punctuation or it reads as extrusion, and a corner is where a real fence is strained.
    for (const p of BOUNDARY.posts) {
      if (!p.heavy) continue;
      out.push({
        position: [p.x, (POST_H + GATE_POST_EXTRA) / 2, p.z] as const,
        rot: [0, p.angle, 0] as const,
        color: weather(p.tint, true),
      });
    }
    return out;
  }, [weather]);
  /**
   * CAPS ON THE BOUNDARY'S CORNER POSTS ONLY, AND THE OMISSION IS A MEASUREMENT RATHER THAN A STYLE.
   *
   * `RoundedBoxGeometry` costs 300 triangles at 2 segments whatever size it is asked for, so a 28 x 9cm
   * cap board costs exactly as much as the 1.42m post under it — and every one of them is counted twice,
   * because `SHADOW_RADIUS` is 52m and the whole boundary sits inside the shadow camera. Capping all 142
   * boundary posts was 85,000 triangles a frame for a detail that is 9cm tall at 30 metres through fog.
   *
   * The 18 corner and jamb posts keep theirs, because those are the ones the eye stops on and a capped
   * strainer post is what says a person built this. Tonal variation across the run does not depend on
   * them: line posts are timber with a weathering tint, corners are the deeper timber, rails are timber
   * again at a different tint, and the gates are cream. Four tones between members without the boards.
   */
  const caps = useMemo<Placement[]>(() => {
    const out: Placement[] = FENCE.posts.map((p) => ({
      position: [p.x, (p.gatePost ? POST_H + GATE_POST_EXTRA : POST_H) + 0.03, p.z] as const,
      rot: [0, p.angle, 0] as const,
    }));
    for (const p of BOUNDARY.posts) {
      if (!p.heavy) continue;
      out.push({
        position: [p.x, POST_H + GATE_POST_EXTRA + 0.03, p.z] as const,
        rot: [0, p.angle, 0] as const,
      });
    }
    return out;
  }, []);
  const rails = useMemo<Placement[]>(() => {
    const out: Placement[] = [];
    for (const r of FENCE.rails) {
      for (const h of PEN_RAIL_HEIGHTS) {
        out.push({
          position: [r.x, h, r.z] as const,
          rot: [0, r.angle, 0] as const,
          scale: [r.length, 1, 1] as const,
        });
      }
    }
    // The boundary's three rails per bay, already resolved to a height each by `fence.ts`.
    for (const r of BOUNDARY.rails) {
      out.push({
        position: [r.x, r.y, r.z] as const,
        rot: [0, r.angle, 0] as const,
        scale: [r.length, 1, 1] as const,
        color: weather(r.tint),
      });
    }
    return out;
  }, [weather]);

  /**
   * The two boundary gates, SHUT, and instanced with the pens' gate stock so they cost nothing extra.
   *
   * A pen's gate stands open because a pen is somewhere a child is invited into. The boundary's are shut
   * and barred, because the whole job here was to say "the ranch ends" — and the collider in `fence.ts`
   * runs across the closed leaf, so what stops a child is exactly the thing they can see stopping them.
   *
   * These cannot be built the way the pen gates below are, as a rotated `<group>` of tilted meshes: a
   * group's yaw-then-tilt is not the ZYX Euler an `InstancedMesh` composes, and a brace given the pens'
   * angles here lands flat on its face. `barBetween` in `fence.ts` solves the two angles from the bar's
   * endpoints instead, which is both correct and easier to read than either.
   */
  const gateBars = useMemo<Placement[]>(
    () => BOUNDARY.bars.map((b) => ({ position: b.position, rot: b.rot, scale: b.scale })),
    [],
  );

  return (
    <group>
      <Instanced geometry={g.post} material={m.timber} items={posts} />
      <Instanced geometry={g.gatePost} material={m.timberDeep} items={gatePosts} />
      <Instanced geometry={g.cap} material={m.timberDeep} items={caps} />
      <Instanced geometry={g.rail} material={m.timber} items={rails} />
      <Instanced geometry={g.gateRail} material={m.trim} items={gateBars} />
      {FENCE.gates.map((gate, i) => (
        <group key={i} position={[gate.x, 0, gate.z]} rotation={[0, gate.angle + gate.swing, 0]}>
          {[0.5, 1.0].map((h) => (
            <mesh
              key={h}
              geometry={g.gateRail}
              material={m.trim}
              position={[gate.span / 2, h, 0]}
              scale={[gate.span - 0.2, 1, 1]}
              castShadow
            />
          ))}
          <mesh
            geometry={g.gateRail}
            material={m.trim}
            position={[gate.span / 2, 0.75, 0]}
            rotation={[0, 0, Math.atan2(0.5, gate.span)]}
            scale={[Math.hypot(gate.span - 0.2, 0.5), 1, 1]}
            castShadow
          />
          <mesh
            geometry={g.gateRail}
            material={m.trim}
            position={[gate.span - 0.14, 0.75, 0]}
            rotation={[0, 0, Math.PI / 2]}
            scale={[0.66, 1, 1]}
            castShadow
          />
        </group>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ *\
   Props
\* ------------------------------------------------------------------ */

/**
 * Both troughs, in seven instanced draw calls plus one surface each.
 *
 * INSTANCED ACROSS BOTH SITES rather than a component per trough, and the reason is the same one
 * `instanced.tsx` gives: a plank trough is eighteen members, so two of them modelled as plain meshes would
 * cost thirty-six calls against a whole-ranch budget of about two hundred and seventy. Built through
 * `Instanced` the two cost nine, and the two that are not instanced are the water surfaces — which cannot
 * be, because each carries its own uniforms.
 *
 * THE BATTENS ARE ONE GEOMETRY TURNED, not two. The four on the long sides and the two on the ends are the
 * same board; the end ones are yawed a quarter turn. Two geometries would be two chances for them to stop
 * matching, and a fillet is a radius so a "just scale it" second copy is the bug this file keeps catching.
 */
function Troughs(): JSX.Element {
  const m = materials();
  const reduced = usePrefersReducedMotion();

  const g = useMemo(() => {
    const b = TROUGH_BODY;
    return {
      /** A side board. 2.2cm on an 8.5cm board: soft sawn timber that still keeps an edge for the sun. */
      side: new RoundedBoxGeometry(b.l, b.h, b.t, 2, 0.022),
      /** An end board, let in BETWEEN the sides, which is why it is `w - 2t` and not `w`. */
      end: new RoundedBoxGeometry(b.t, b.h, b.w - b.t * 2, 2, 0.022),
      /** The floor, sitting on the stone inside the four walls. */
      bed: new RoundedBoxGeometry(b.l - b.t * 2, b.t, b.w - b.t * 2, 1, 0.018),
      capLong: new RoundedBoxGeometry(b.l + b.capOut * 2, b.cap, b.t + b.capOut * 2, 1, 0.02),
      capEnd: new RoundedBoxGeometry(b.t + b.capOut * 2, b.cap, b.w - b.t * 2, 1, 0.02),
      /** A batten over the board joint. Turned a quarter for the two on the ends. */
      batten: new RoundedBoxGeometry(0.1, b.h + 0.04, 0.05, 1, 0.016),
      foot: new RoundedBoxGeometry(b.footL, b.foot, b.w - 0.1, 1, 0.03),
      /**
       * The water, 2cm over the clear opening so it tucks a centimetre under the boards all round. Without
       * that there is a hairline of bed showing at the join from a low angle, which reads as a gap between
       * the water and the vessel — the spring's surface oversails its basin by 6cm for the same reason.
       */
      water: new ShapeGeometry(roundedRectShapeXY(TROUGH_IN.l + 0.02, TROUGH_IN.w + 0.02, 0.05)),
    };
  }, []);

  /**
   * THE SAME WATER AS THE SPRING, and the differences are stated rather than invented.
   *
   * `world/water.ts` is the ranch's only water and this reuses its surface whole: the two drift layers, the
   * lensed caustics, the displaced bed and the fresnel that opens the alpha at a grazing angle. What a
   * trough is not is FED — there is no flume over it — so `disturbance` is 0, which takes the impact rings,
   * the churn patch and the travelling foam crest away together. Leaving them on would put ripples on the
   * surface radiating from a source that does not exist, which `water.ts` argues is worse than none.
   *
   * `speed` 0.3 because a trough does not turn over, and `rimBand` 0.035 because the wet line has to scale
   * with the vessel: the spring's 6cm band across a 65cm-wide trough would be a painted border, which is
   * the exact criticism that got it lowered to 6cm in the first place.
   *
   * ONE MATERIAL PER TROUGH, not one shared, because each carries its own `uHalf` — a shared material would
   * put the pen trough's waterline on the barn trough's boards.
   */
  const water = useMemo(
    () =>
      TROUGHS.map(() =>
        flowingWater({
          half: [(TROUGH_IN.l + 0.02) / 2, (TROUGH_IN.w + 0.02) / 2],
          speed: 0.3,
          disturbance: 0,
          rimBand: 0.035,
        }),
      ),
    [],
  );

  /** One tick for every piece of water in the world; `useWaterClock` advances it once however many call. */
  useWaterClock(reduced);

  /**
   * Every member of both troughs, in world space.
   *
   * `toWorld` for each offset rather than a `<group>` per trough, because an `InstancedMesh` has one
   * transform and its instances are already absolute. Getting this wrong is not subtle — the parts end up
   * in a heap at the origin — but writing it out is what lets both troughs share one call per member.
   */
  const parts = useMemo(() => {
    const b = TROUGH_BODY;
    const side: Placement[] = [];
    const end: Placement[] = [];
    const bed: Placement[] = [];
    const capLong: Placement[] = [];
    const capEnd: Placement[] = [];
    const batten: Placement[] = [];
    const foot: Placement[] = [];

    for (const t of TROUGHS) {
      const put = (into: Placement[], lx: number, y: number, lz: number, spin = 0) => {
        const w = toWorld(t, lx, lz);
        into.push({ position: [w[0], y, w[1]], rot: [0, t.rot + spin, 0] });
      };
      for (const sz of [-1, 1] as const) {
        put(side, 0, TROUGH_AT.board, (sz * (b.w - b.t)) / 2);
        put(capLong, 0, TROUGH_AT.cap, (sz * (b.w - b.t)) / 2);
      }
      for (const sx of [-1, 1] as const) {
        put(end, (sx * (b.l - b.t)) / 2, TROUGH_AT.board, 0);
        put(capEnd, (sx * (b.l - b.t)) / 2, TROUGH_AT.cap, 0);
        // The end batten, turned a quarter so the same board reads across the end grain.
        put(batten, sx * (b.l / 2 + 0.015), TROUGH_AT.board, 0, Math.PI / 2);
        for (const sz of [-1, 1] as const) {
          put(batten, sx * (b.l / 2 - 0.3), TROUGH_AT.board, sz * (b.w / 2 + 0.015));
        }
        put(foot, sx * (b.l / 2 - b.footL / 2 - 0.12), b.foot / 2, 0);
      }
      put(bed, 0, TROUGH_AT.bed, 0);
    }
    return { side, end, bed, capLong, capEnd, batten, foot };
  }, []);

  return (
    <group>
      <Instanced geometry={g.foot} material={m.stone} items={parts.foot} />
      <Instanced geometry={g.side} material={m.timber} items={parts.side} />
      <Instanced geometry={g.end} material={m.timber} items={parts.end} />
      {/*
        The bed, the cap and the battens are all `timberDeep` against the boards' `timber`. That is the
        tonal separation the whole thing rests on: a rim in the same tone as the board under it is not a
        rim, it is a thicker board, and the vessel goes back to being a box.
      */}
      <Instanced geometry={g.bed} material={m.timberDeep} items={parts.bed} receiveShadow />
      <Instanced geometry={g.capLong} material={m.timberDeep} items={parts.capLong} />
      <Instanced geometry={g.capEnd} material={m.timberDeep} items={parts.capEnd} />
      <Instanced geometry={g.batten} material={m.timberDeep} items={parts.batten} />
      {/*
        The surface, in a group of its own per trough. A group rather than a composed rotation on the mesh
        because the plane is laid flat by a turn about X and then has to be yawed about world Y, and those
        two do not commute in three's default Euler order — the same -90° that works inside a parent turns
        the sheet on edge when the yaw is written beside it.
      */}
      {TROUGHS.map((t, i) => (
        <group key={`${t.x},${t.z}`} position={[t.x, 0, t.z]} rotation={[0, t.rot, 0]}>
          <mesh
            geometry={g.water}
            material={water[i]?.material ?? m.water}
            position={[0, TROUGH_AT.water, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          />
        </group>
      ))}
    </group>
  );
}

function BarnYard(): JSX.Element {
  const m = materials();
  const g = useMemo(() => {
    const bale = baleGeometries();
    return {
      /**
       * THE SAME BALE AS INSIDE THE BARN, imported rather than modelled again.
       *
       * This file used to carry its own: a 1.25 x 0.72 x 0.82 rounded box with a 16cm fillet and two timber
       * bands. So the ranch had two bales — a pillow out here and a different pillow in the loft — and a
       * child walks past these three on the way through the doors to those eleven. Sharing the geometry is
       * what makes them one object that appears in two places, which is what they are.
       */
      bale: bale.body,
      band: bale.twine,
      cut: bale.cut,
    };
  }, []);

  /**
   * NO PER-BALE SCALE. A bale is a fixed object — see `BALE` in `barnInterior.tsx` — so the bales get their
   * variety from being turned and stacked. Two on the ground and one thrown on top of them, which is how
   * bales wait beside a door.
   *
   * THE SACKS THAT USED TO BE THE OTHER HALF OF THIS COMPONENT ARE GONE; see `BARN_YARD` for what the owner
   * was actually looking at and what stands there now. Their geometry is still exported from
   * `barnInterior.tsx` and is still the right way to build a sack — it is the OBJECT that was wrong beside
   * a door, not the modelling.
   */
  const bales = useMemo<Placement[]>(
    () =>
      BARN_YARD.map((p) => {
        const w = toWorld(BARN, p.lx, p.lz);
        return {
          position: [w[0], BALE.h * (0.5 + (p.lift ?? 0)), w[1]] as const,
          rot: [0, BARN.rot + p.rot, p.lift ? 0.04 : 0] as const,
        };
      }),
    [],
  );
  /**
   * Twine and cut ends, at the offsets `barnInterior.tsx` publishes, so the two sets of bales are wrapped
   * identically. The one bale here with a roll on it is why the offsets are turned by the full placement
   * rather than by its yaw alone: a `cos/sin` pair on `rot[1]` would leave that bale's twine level while the
   * bale itself leaned.
   */
  const dressing = useMemo(() => {
    const twine: Placement[] = [];
    const cut: Placement[] = [];
    const cutTint = new Color(PIG.straw);
    const pos = new Vector3();
    const q = new Quaternion();
    const mat = new Matrix4();
    for (const b of bales) {
      const rot = b.rot ?? [0, 0, 0];
      mat.compose(
        pos.set(b.position[0], b.position[1], b.position[2]),
        q.setFromEuler(new Euler(rot[0], rot[1], rot[2], 'ZYX')),
        new Vector3(1, 1, 1),
      );
      const put = (list: Placement[], dx: number, color?: Color): void => {
        const p = new Vector3(dx, 0, 0).applyMatrix4(mat);
        list.push({ position: [p.x, p.y, p.z], rot, color });
      };
      for (const dx of [-BALE_TWINE_X, BALE_TWINE_X]) put(twine, dx);
      for (const dx of [-BALE_CUT_X, BALE_CUT_X]) put(cut, dx, cutTint);
    }
    return { twine, cut };
  }, [bales]);

  return (
    <group>
      <Instanced geometry={g.bale} material={m.hay} items={bales} />
      <Instanced geometry={g.band} material={m.twine} items={dressing.twine} />
      <Instanced geometry={g.cut} material={m.straw} items={dressing.cut} />
    </group>
  );
}

/**
 * The windmill.
 *
 * The tallest thing on the ranch on purpose: a low sun needs something to rake past, and a slowly
 * turning wheel is the one piece of ambient motion at eye level that tells a child the world is running
 * rather than paused. It stops dead under `prefers-reduced-motion` — a child who asked for less movement
 * should not be handed a metronome.
 */
function Windmill({ reduced }: { reduced: boolean }): JSX.Element {
  const m = materials();
  const wheel = useRef<Group>(null);

  const g = useMemo(() => {
    const legLength = Math.hypot(TOWER_H, LEG_BASE_R - LEG_TOP_R);
    return {
      legLength,
      leg: new RoundedBoxGeometry(0.15, legLength, 0.15, 2, 0.05),
      // Unit radius, scaled per collar. One geometry for all three.
      collar: new CylinderGeometry(1, 1, 0.09, 16, 1, true),
      platform: new CylinderGeometry(0.46, 0.5, 0.16, 12),
      /* The mast the head rides on. Unit height, scaled to whatever gap the clearance leaves. */
      mast: new CylinderGeometry(0.115, 0.145, 1, 10),
      base: new CylinderGeometry(1.32, 1.5, 0.42, 16),
      hub: new SphereGeometry(0.3, 14, 10),
      vane: new RoundedBoxGeometry(1.6, 0.52, 0.05, 1, 0.025),
      // The rim is what makes a wheel of blades read instantly as a windmill rather than as a propeller.
      rim: new TorusGeometry(MILL_RIM_R, 0.055, 5, 30),
      tail: new RoundedBoxGeometry(1.35, 0.86, 0.05, 1, 0.04),
      boom: new RoundedBoxGeometry(1.6, 0.12, 0.12, 1, 0.04),
    };
  }, []);

  const collars: readonly number[] = [1.5, 3.3, 5.0];

  // Six blades, each pitched about its own long axis before being swung into place — see the `ZYX` note
  // on `Placement.rot`. The pitch is why the wheel catches the sun unevenly as it turns.
  const vanes = useMemo<Placement[]>(
    () =>
      // Ten rather than six. At six, three blades are edge-on to the camera at any moment and the wheel
      // reads as a bent propeller; ten fills the rim the way a farm windmill's fan does. The pitch is
      // shallow for the same reason — steeply pitched blades disappear when they face away.
      Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return { position: [Math.cos(a) * 1.3, Math.sin(a) * 1.3, 0] as const, rot: [0.3, 0, a] as const };
      }),
    [],
  );

  useFrame((_, dt) => {
    if (reduced || !wheel.current) return;
    wheel.current.rotation.z += dt * 0.5;
  });

  return (
    <group position={[WINDMILL.x, 0, WINDMILL.z]} rotation={[0, WINDMILL.rot, 0]}>
      <mesh geometry={g.base} material={m.stone} position={[0, 0.21, 0]} castShadow receiveShadow />

      {/*
        A four-legged lattice, not a solid tower.
        The first pass made this a tapered cylinder and it read unmistakably as a traffic cone: a smooth
        closed silhouette says "moulded object", and a windmill is the one thing on a ranch that is
        obviously a framework with sky showing through it. Four splayed legs and three collars is the
        cheapest structure that says so, and against a low sun the gaps are the whole point.
      */}
      {[0, 1, 2, 3].map((i) => (
        <group key={i} rotation={[0, (i * Math.PI) / 2 + Math.PI / 4, 0]}>
          <mesh
            geometry={g.leg}
            material={m.timber}
            position={[(LEG_BASE_R + LEG_TOP_R) / 2, TOWER_H / 2, 0]}
            rotation={[0, 0, Math.atan2(LEG_TOP_R - LEG_BASE_R, TOWER_H)]}
            castShadow
            receiveShadow
          />
        </group>
      ))}
      {collars.map((y) => {
        const r = LEG_BASE_R + ((LEG_TOP_R - LEG_BASE_R) * y) / TOWER_H;
        return (
          <mesh
            key={y}
            geometry={g.collar}
            material={m.timberDeep}
            position={[0, y, 0]}
            scale={[r, 1, r]}
            castShadow
          />
        );
      })}
      <mesh geometry={g.platform} material={m.timberDeep} position={[0, TOWER_H, 0]} castShadow receiveShadow />

      {/*
        THE MAST, and it is not decoration — it is what raising the head made necessary.

        The wheel has to clear the platform, and a 2.12m wheel clearing a 6.68m platform puts its axle
        2.46m higher. Without something in that gap the wheel hangs in the sky and the legs stop in
        mid-air beneath it, which is a worse read than the overlap it replaced. A real mill carries its
        wheel on a mast above the cap for exactly the same reason: the blades have to pass the tower.
      */}
      <mesh
        geometry={g.mast}
        material={m.timberDeep}
        position={[0, (MILL_PLATFORM_TOP + MILL_HEAD_Y) / 2, 0]}
        scale={[1, MILL_HEAD_Y - MILL_PLATFORM_TOP, 1]}
        castShadow
        receiveShadow
      />

      <group position={[0, MILL_HEAD_Y, 0]}>
        <mesh geometry={g.hub} material={m.timberDeep} position={[0, 0, 0.44]} castShadow />
        <group ref={wheel} position={[0, 0, 0.52]}>
          <Instanced geometry={g.vane} material={m.painted} items={vanes} receiveShadow={false} />
          <mesh geometry={g.rim} material={m.timberDeep} castShadow />
        </group>
        {/* Tail vane, so the head reads as pointing into a wind. */}
        <mesh
          geometry={g.boom}
          material={m.timberDeep}
          position={[0, 0, -0.9]}
          rotation={[0, Math.PI / 2, 0]}
          castShadow
        />
        <mesh
          geometry={g.tail}
          material={m.painted}
          position={[0, 0.12, -1.7]}
          rotation={[0, Math.PI / 2, 0]}
          castShadow
        />
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ *\
   Foliage
\* ------------------------------------------------------------------ */

function Foliage(): JSX.Element {
  const m = materials();
  const g = useMemo(
    () => ({
      trunk: new CylinderGeometry(0.16, 0.3, 1, 7, 1),
      // A tree is three overlapping masses, not one ball: the overlap is what gives the silhouette lobes
      // for a low sun to find edges in.
      leaf: new SphereGeometry(1, 11, 8),
    }),
    [],
  );

  /**
   * BARK, AND THE BUG THAT MADE EVERY TRUNK A HOLE CUT IN THE PICTURE.
   *
   * The trunks were handed `PIG.timberDeep -> PIG.timber` as an instance colour on the `timber`
   * material. That reads like "colour each trunk somewhere between these two browns" and it is not what
   * it does: an instance colour MULTIPLIES the material's own, which `pigment.ts` warns about in its
   * second paragraph. So the darkest trunk was being drawn at `timber x timberDeep`, and the arithmetic
   * is brutal — linear (0.035, 0.011, 0.002) against an intended (0.138, 0.074, 0.034). A quarter of the
   * red, a seventh of the green, and a FIFTEENTH of the blue.
   *
   * That last figure is why they did not merely look dark, they looked dead. Annihilating the blue
   * channel leaves no hue for the cool sky fill to land in, so the one light that reaches a backlit
   * surface in this scene had nothing to tint — and `Lighting.tsx` says outright that the fill is the
   * thing that stops an unlit face going hueless. Ninety-two trunks rendered as flat black cylinders,
   * and the defect was invisible in code review because the line names two perfectly good pigments.
   *
   * SO THE INSTANCE COLOUR IS NOW A TRUE MULTIPLIER: a target bark pigment divided by the material it
   * multiplies, which lands the product exactly on the target. Same one draw call, correct pigment.
   *
   * And having fixed it, the range is worth spending. Bark is not one brown, and ninety-two identical
   * cylinders read as instancing however well they are lit — so a tree draws on two independent axes.
   * `tint` runs it from a warm shaded bark to a sun-bleached one, and a noise sampled at the trunk's own
   * position turns some of them toward a grey-brown, so neighbours differ in HUE and not only in value.
   * The palest bark comes out at 1.76x the timber pigment, which is still below `PIG.stone`, already
   * shipped on the buildings — so nothing here is brighter than the world already goes.
   */
  const trunks = useMemo<Placement[]>(() => {
    const base = new Color(PIG.timber);
    const toward = (hex: string): Color => {
      const c = new Color(hex);
      return new Color(c.r / base.r, c.g / base.g, c.b / base.b);
    };
    const deep = toward(BARK_DEEP);
    const pale = toward(BARK_PALE);
    const grey = toward(BARK_GREY);
    return TREES.map((t) => {
      const bark = deep.clone().lerp(pale, t.tint);
      // Sampled off the trunk's position rather than drawn from the scatter's stream, so adding this
      // second axis could not move a single tree.
      bark.lerp(grey, noise2(t.x * 0.7 + 12.4, t.z * 0.7 - 5.1) * 0.6);
      return {
        position: [t.x, t.y + t.trunkH / 2, t.z] as const,
        rot: [0, t.tint * 6.28, t.lean] as const,
        scale: [1, t.trunkH, 1] as const,
        color: bark,
      };
    });
  }, []);

  const leaves = useMemo<Placement[]>(() => {
    const out: Placement[] = [];
    const deep = new Color(PIG.canopy);
    const lit = new Color(PIG.canopyLit);
    for (const t of TREES) {
      const blobs: readonly (readonly [number, number, number, number])[] = [
        [0, t.trunkH + t.spread * 0.62, 0, 1],
        [t.spread * 0.5, t.trunkH + t.spread * 0.24, t.spread * 0.32, 0.74],
        [-t.spread * 0.42, t.trunkH + t.spread * 0.3, -t.spread * 0.36, 0.68],
      ];
      blobs.forEach((b, i) => {
        const s = b[3];
        out.push({
          position: [t.x + b[0] + t.lean * b[1], t.y + b[1], t.z + b[2]] as const,
          rot: [0, t.tint * 3.14 + i, 0] as const,
          scale: [t.spread * s, t.spread * s * 0.82, t.spread * s] as const,
          // Higher blobs lean toward the sunlit pigment. Cheap standing-in for ambient occlusion, and
          // it is what stops a mass of instanced spheres reading as a mass of instanced spheres.
          color: deep.clone().lerp(lit, clamp(0.25 + (i === 0 ? 0.55 : 0) + t.tint * 0.3, 0, 1)),
        });
      });
    }
    for (const b of BUSHES) {
      out.push({
        position: [b.x, b.r * 0.62, b.z] as const,
        rot: [0, b.tint * 6.28, 0] as const,
        scale: [b.r * 1.5, b.r, b.r * 1.35] as const,
        color: deep.clone().lerp(lit, 0.15 + b.tint * 0.45),
      });
    }
    return out;
  }, []);

  return (
    <group>
      <Instanced geometry={g.trunk} material={m.timber} items={trunks} />
      <Instanced geometry={g.leaf} material={m.canopy} items={leaves} />
    </group>
  );
}

/* ------------------------------------------------------------------ *\
   Assembly
\* ------------------------------------------------------------------ */

export function Buildings(): JSX.Element {
  const reduced = usePrefersReducedMotion();
  return (
    <group>
      <Ground />
      <Barn />
      {/*
        Inside the barn, and the doors that let you in. A sibling of `Barn` rather than a child of it,
        because it owns two `useFrame` hooks — one for the door swing, one for the visibility gate — and
        `Barn` is deliberately a pure static component that renders once and never again.
      */}
      <BarnInterior />
      <Hut />
      {/*
        Every window on both buildings, in one place. Authored in world space so nine windows across two
        hosts share one set of instanced meshes, which is the whole reason they cost sixteen draw calls
        instead of a hundred and thirty.
      */}
      <Windows />
      <Pens />
      <Troughs />
      <BarnYard />
      <Windmill reduced={reduced} />
      <Foliage />
    </group>
  );
}
