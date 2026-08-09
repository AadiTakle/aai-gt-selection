import { chainSegment, pushOut, toWorld, type P2, type Placed, type Solid } from './plan';

/**
 * THE BARN, AS A PLAN. No three.js, no React — just the numbers and the promises they have to keep.
 *
 * THE OWNER'S ASK: "i also want the barn to be interactable in the way that the doors swing open and you
 * can go into the barn and see stables or something along those lines".
 *
 * That is three requirements wearing one sentence, and only one of them is about doors.
 *
 * 1. THE BARN WAS SOLID. `Buildings.tsx` built its walls as a single `RoundedBoxGeometry` 10.5 x 5 x 14.
 *    A rounded box is a SOLID, so the barn was a block of painted timber with boards on the outside and
 *    no inside at all. This is the same mistake `stations/carpentry.tsx` records against the first spring
 *    basin — "a rounded box is SOLID: its top face is closed, so the water was sealed inside an opaque
 *    stone block" — and it has the same fix. A building you can enter has to be a RING, not a block. So
 *    the walls below are four slabs with a real thickness, and the +Z gable end is three of them: two
 *    jambs and a header over the opening.
 *
 * 2. THE DOORWAY WAS SEALED BY THE COLLIDER. Even hollow, the footprint chain put a 0.95m circle every
 *    1.45m all the way round, including straight across the doors. `barnSolids()` replaces that chain with
 *    explicit segments so the opening is a stated width rather than an artefact of where arc-length
 *    sampling happened to land, and `doorwayWalkReport()` proves a 0.45m keeper can walk the centreline
 *    from the yard to the middle of the floor without being pushed a millimetre.
 *
 * 3. THE FLOOR HAS TO BE AT THE KEEPER'S FEET. `Game.tsx` locks the camera to `KEEPER_HEIGHT = 1.5` over
 *    a flat plane at y = 0 and has no notion of a step. So an interior floor at the plinth top, 44cm up,
 *    would put a child's eye 1.06m above it and the whole barn would read at half again its true size —
 *    like standing in a pit. The plinth therefore becomes a footing RING with the doorway notched out of
 *    it, and the floor is laid at 7cm, which is where the keeper's feet actually are. The stone course
 *    that makes the building look planted is kept; it just stops being a plug.
 *
 * WHY THE DOORS CANNOT CLIP, and this is proved rather than asserted — see `doorSweepReport()`. Each leaf
 * hangs from a hinge at the OUTER edge of the opening and swings outward, so:
 *
 *   - Its every point stays at or beyond the hinge plane in z, and the hinge plane is `HINGE_STANDOFF`
 *     in front of the wall's outer face. It therefore cannot enter the wall at any angle, including zero.
 *   - The right leaf's x never falls below `halfW - leaf` and the left leaf's never rises above
 *     `-(halfW - leaf)`. With a leaf shorter than the half-opening those two ranges are separated by a
 *     gap that exists at every angle, so the two leaves cannot reach each other either.
 *
 * Both facts are consequences of the hinge being outboard. Hinging at the INNER edges — the arrangement
 * that looks the same when shut — makes both of them false: the leaves would sweep through each other
 * across the middle of the opening.
 */

/* ------------------------------------------------------------------ *\
   Where it stands, and how big it is
\* ------------------------------------------------------------------ */

/**
 * The barn. The hero building, and the thing in frame at arrival that a child will walk toward.
 *
 * Turned 94.5° so the gable end with the big doors is presented about 29° off the arrival sightline
 * rather than square to it. Square-on you read one flat rectangle; off-axis you read two faces at
 * different brightnesses and the building acquires volume.
 *
 * A HAPPY CONSEQUENCE OF THAT ANGLE, and it is what makes the walk-in worth doing: the barn's local +Z
 * points to world (0.997, -0.079), almost due +X, and the sun's horizontal bearing is (0.79, 0.51). Their
 * dot product is 0.75 — so the low sun shines very nearly straight through the open doorway. The light
 * spilling across the floor inside is not an effect that had to be authored; it is the real sun through
 * the real opening, and it is the whole reason the inside of this building is worth standing in.
 *
 * NOTE FOR ANYONE MOVING THIS: `stations/sites.ts` mirrors `BARN`, `BARN_W` and `BARN_D` rather than
 * importing them, because that directory may not depend on this one. The mirror is documented there. The
 * OUTER dimensions below are therefore load-bearing for the coat-wall station bolted to the -X wall, and
 * the hollowing-out deliberately leaves every outer face exactly where it was.
 */
export const BARN: Placed = { x: -14.5, z: 1.5, rot: 1.65 };
/** Across the slopes, outside face to outside face. */
export const BARN_W = 10.5;
/** Along the ridge, outside face to outside face. */
export const BARN_D = 14;
export const BARN_WALL_H = 5.0;
export const BARN_RISE = 3.6;
export const BARN_ROOF_T = 0.44;
export const BARN_EAVE = 0.62;
export const BARN_RAKE = 0.75;
export const BARN_PLINTH_H = 0.44;

/**
 * Wall thickness, which is a new number because the walls are now walls.
 *
 * 34cm: thick enough that the reveal at the doorway reads as a wall you are passing through rather than
 * as a sheet of card with a hole in it, thin enough that the inside is still 9.8 x 13.3 metres. The
 * reveal is the whole reason to have a thickness at all — a door frame with no depth is the single
 * clearest tell that a building is a facade.
 */
export const BARN_WALL_T = 0.34;

/** Half the interior, wall face to centre. */
export const BARN_IN_HALF_W = BARN_W / 2 - BARN_WALL_T;
export const BARN_IN_HALF_D = BARN_D / 2 - BARN_WALL_T;

/** The gable walls' mid-plane, unchanged from the original so the roof and the gable fills still agree. */
export const BARN_GABLE_Z = BARN_D / 2 - BARN_WALL_T / 2;

/**
 * The threshing floor, at 7cm.
 *
 * Not zero: a floor exactly on the ground plane z-fights with the meadow that is also exactly on the
 * ground plane, and the two are edge-on to a camera at a child's eye height, which is the worst case for
 * it. Not more than about 10cm either, because that is a step and this controller has no steps.
 */
export const BARN_FLOOR_Y = 0.07;

/* ------------------------------------------------------------------ *\
   The doorway and its leaves
\* ------------------------------------------------------------------ */

export const DOOR = {
  /**
   * Half the clear opening, in local x. 1.9 gives a 3.8m doorway — a cart's width, which is what a barn
   * door is for, and four times the keeper's own 0.9m so a child never has to aim.
   */
  halfW: 1.9,
  /** Head of the opening above the plinth top. Leaves the header 1.38m of wall to carry the gable. */
  height: 3.62,
  /**
   * Leaf width. 1.87 against a 1.9 half-opening, which leaves a 3cm reveal at each hinge and a 6cm gap
   * where the two leaves meet in the middle when shut.
   *
   * THAT GAP IS DELIBERATE AND IT IS DOING TWO JOBS. Cosmetically, a pair of barn doors that meet in a
   * perfect seam looks machined; a dark line between them looks like timber that has moved. Structurally
   * it is what makes `doorSweepReport()`'s separation claim true with room to spare instead of exactly
   * true: leaves sized to meet at x = 0 would touch at every angle, and "touching" is one floating-point
   * rounding away from "intersecting".
   */
  leaf: 1.87,
  leafT: 0.14,
  /**
   * Leaf height, and it is set by where the FLOOR is rather than by where the wall starts.
   *
   * 3.9 rather than the 3.5 the old static doors used, and the difference is the whole reason it is worth
   * a note. Those doors hung from the plinth top, 44cm up, because that is where the walls begin — and now
   * that the barn has an interior at 7cm and a notch cut through the footing at the doorway, a door
   * starting at 44cm would leave a 37cm gap under it that you could see the meadow through from inside.
   * The leaf therefore runs from just above the threshold to just under the head: 3.9m of timber in a
   * 3.62m opening measured from the plinth, which is the same thing measured from the floor.
   */
  leafH: 3.9,
  /**
   * How far the hinge plane stands in front of the wall's outer face.
   *
   * This single number is what makes the no-clip proof trivial. Every point of a leaf is at or beyond its
   * hinge plane in z for any opening angle in [0, 90°], so putting the hinge plane 6cm proud of the wall
   * puts the whole swing 6cm proud of the wall — at every angle, with no case analysis. Hung flush, the
   * proof would depend on the leaf's thickness and the answer at 0° would be "exactly touching".
   */
  standoff: 0.06,
  /**
   * Fully open, in radians. 82° rather than 90°: a barn door swung dead flat against the wall reads as
   * missing, and stopping a little short leaves the leaf angled into the light so it catches the sun and
   * throws a diagonal shadow across the doorway.
   */
  open: 1.43,
  /** How near the keeper has to be, in metres from the doorway's outside face, before they open. */
  nearRadius: 7.5,
  /** And how far before they close again. The gap is hysteresis: see `doorTarget`. */
  farRadius: 9.5,
} as const;

/** The hinge plane's local z. */
export const DOOR_HINGE_Z = BARN_D / 2 + DOOR.standoff;

/** The middle of the doorway, on the outside face, in world metres. Where proximity is measured from. */
export const DOORWAY_WORLD: P2 = toWorld(BARN, 0, BARN_D / 2);

/**
 * Which way each leaf turns. `+1` is the leaf hinged at local `+x`.
 *
 * The sign convention, because it is the one thing here that is easy to get backwards. three's
 * `rotation.y = φ` sends a local `(x, z)` to `(x cos φ + z sin φ, -x sin φ + z cos φ)`. For the leaf
 * hinged at `+halfW`, whose body runs from the hinge in the `-x` direction, a point at `(-L, 0)` goes to
 * `(-L cos φ, +L sin φ)` — so a POSITIVE φ carries its free edge to positive z, which is outward. The
 * leaf hinged at `-halfW` is the mirror and therefore takes a negative φ.
 */
export const DOOR_SIDES: readonly (1 | -1)[] = [-1, 1];

/** True when a point is inside the barn's footprint, with a little padding. */
export function insideBarn(x: number, z: number, pad = 0.5): boolean {
  const c = Math.cos(BARN.rot);
  const s = Math.sin(BARN.rot);
  const dx = x - BARN.x;
  const dz = z - BARN.z;
  const lx = dx * c - dz * s;
  const lz = dx * s + dz * c;
  return Math.abs(lx) < BARN_W / 2 + pad && Math.abs(lz) < BARN_D / 2 + pad;
}

/**
 * Where a leaf's swing angle should be, given where the keeper is.
 *
 * TWO RADII, NOT ONE, and the reason is a defect you get for free with a single threshold: a child standing
 * exactly on the line — which is precisely where they end up, because the doors opening is the interesting
 * thing — makes the doors flutter open and shut as they shift their weight. Opening at 7.5m and closing at
 * 9.5m means the state can only change after two metres of committed walking.
 *
 * AND A THIRD CONDITION, WHICH A SCREENSHOT FOUND. With distance alone, a child who walks in and keeps
 * walking gets shut in: the barn is 14m deep, so eight metres down the floor they are outside the closing
 * radius and the doors swing shut behind them, in a building whose only daylight came through those doors.
 * That is not a rough edge, it is the interaction actively working against the thing it exists to enable.
 * So the doors are open whenever the keeper is INSIDE, unconditionally, and no radius can override it.
 *
 * The alternative — a near radius wide enough to cover the whole interior — would have to be about 15m,
 * which would swing the doors for anybody crossing the yard and spend the effect on nothing.
 */
export function doorTarget(
  x: number,
  z: number,
  currentlyOpen: boolean,
): { open: boolean; angle: number; distance: number; inside: boolean } {
  const distance = distanceToDoorway(x, z);
  const inside = insideBarn(x, z);
  const open = inside || (currentlyOpen ? distance < DOOR.farRadius : distance < DOOR.nearRadius);
  return { open, angle: open ? DOOR.open : 0, distance, inside };
}

/**
 * Distance from the doorway's outside face to a point in the world, in metres.
 *
 * Measured to the doorway rather than to the barn's centre, which matters more than it sounds: the barn
 * is 14m long, so a keeper walking along the far side of it is 8m from the middle and 12m from the doors.
 * Measuring to the centre would swing the doors open for somebody who is nowhere near them and cannot see
 * them move — which spends the whole effect on nothing.
 */
export function distanceToDoorway(x: number, z: number): number {
  return Math.hypot(x - DOORWAY_WORLD[0], z - DOORWAY_WORLD[1]);
}

/* ------------------------------------------------------------------ *\
   The walls, as slabs
\* ------------------------------------------------------------------ */

export interface Slab {
  /** Local centre, in the plinth-top frame: x, y above the plinth top, z. */
  at: readonly [number, number, number];
  /** Local size. */
  size: readonly [number, number, number];
  tag: 'long' | 'gable' | 'jamb' | 'header';
}

/**
 * The wall ring: two long walls, a closed gable end, and a gable end with a hole in it.
 *
 * Abutting rather than overlapping, which is a decision about z-fighting. Extending the gable ends to the
 * full 10.5m so they cover the corners would make their side faces coplanar with the long walls' outer
 * faces over the 34cm of the overlap, and two coplanar faces at 20m in a shadowed corner is a flickering
 * seam. So the gable ends span only the interior width and stop dead on the long walls' inner faces, and
 * the corner joint that leaves is COVERED — see the corner boards in `BarnInterior`. Barns have corner
 * boards for the same reason.
 */
export const BARN_WALLS: readonly Slab[] = (() => {
  const out: Slab[] = [];
  const midY = BARN_WALL_H / 2;

  for (const sx of [-1, 1] as const) {
    out.push({
      at: [sx * (BARN_W / 2 - BARN_WALL_T / 2), midY, 0],
      size: [BARN_WALL_T, BARN_WALL_H, BARN_D],
      tag: 'long',
    });
  }

  // The closed end.
  out.push({
    at: [0, midY, -BARN_GABLE_Z],
    size: [BARN_IN_HALF_W * 2, BARN_WALL_H, BARN_WALL_T],
    tag: 'gable',
  });

  // The end with the doors: a jamb each side of the opening, and a header across the top of it.
  const jambW = BARN_IN_HALF_W - DOOR.halfW;
  for (const sx of [-1, 1] as const) {
    out.push({
      at: [sx * (DOOR.halfW + jambW / 2), midY, BARN_GABLE_Z],
      size: [jambW, BARN_WALL_H, BARN_WALL_T],
      tag: 'jamb',
    });
  }
  out.push({
    at: [0, (DOOR.height + BARN_WALL_H) / 2, BARN_GABLE_Z],
    size: [DOOR.halfW * 2, BARN_WALL_H - DOOR.height, BARN_WALL_T],
    tag: 'header',
  });

  return out;
})();

/**
 * The footing course, as a ring with the doorway notched out of it.
 *
 * `y` here is the centre of the plinth, measured from the ground, and every piece is `BARN_PLINTH_H`
 * tall except the threshold — which is cut down to the floor's own height so a child walks in over a
 * stone sill instead of stepping over a 44cm kerb they cannot see.
 */
export const BARN_PLINTH: readonly Slab[] = (() => {
  const out: Slab[] = [];
  /** How far the footing oversails the wall on the outside. */
  const oversail = 0.25;
  /** Total footing width, so it reads under the wall from both sides. */
  const width = oversail + BARN_WALL_T + 0.06;
  const outerHalfW = BARN_W / 2 + oversail;
  const outerHalfD = BARN_D / 2 + oversail;
  const midY = BARN_PLINTH_H / 2;

  for (const sx of [-1, 1] as const) {
    out.push({
      at: [sx * (outerHalfW - width / 2), midY, 0],
      size: [width, BARN_PLINTH_H, outerHalfD * 2],
      tag: 'long',
    });
  }
  const endW = outerHalfW * 2 - width * 2;
  out.push({
    at: [0, midY, -(outerHalfD - width / 2)],
    size: [endW, BARN_PLINTH_H, width],
    tag: 'gable',
  });

  /**
   * The notch, 28cm wider than the opening on each side, and both reasons are geometric.
   *
   * Cut flush with the jamb, the footing's rounded corner would stand up inside the doorway as a 3cm stone
   * lip in the one place a child's foot goes. And a swinging leaf reaches `leafT * sin θ` past its own
   * hinge in x — 14cm at full open — so a notch that stopped at the hinge line would have the doors
   * grazing the stone every time they opened. 28cm clears both with room over.
   */
  const notchHalf = DOOR.halfW + 0.28;
  const sideW = outerHalfW - width - notchHalf;
  for (const sx of [-1, 1] as const) {
    out.push({
      at: [sx * (notchHalf + sideW / 2), midY, outerHalfD - width / 2],
      size: [sideW, BARN_PLINTH_H, width],
      tag: 'jamb',
    });
  }

  return out;
})();

/** The threshold slab that fills the notch, level with the floor. */
export const BARN_THRESHOLD: Slab = {
  at: [0, BARN_FLOOR_Y / 2, BARN_D / 2 + 0.25 - (0.25 + BARN_WALL_T + 0.06) / 2],
  size: [(DOOR.halfW + 0.28) * 2, BARN_FLOOR_Y, 0.25 + BARN_WALL_T + 0.06],
  tag: 'header',
};

/* ------------------------------------------------------------------ *\
   Colliders
\* ------------------------------------------------------------------ */

/**
 * How far the collider holds a keeper off the inner wall face.
 *
 * 0.55 circles centred on the footprint mean the keeper stops 1.0m from the wall's centre-line and so
 * about 0.66m from its inner face — which is not arbitrary: the stalls project 1.15m in from that face,
 * so this alone would let a child stand inside a stall divider. The stall fronts therefore get their own
 * inner chain, `INNER_R`, and the two together are what make the interior a room rather than a shell.
 */
const WALL_R = 0.55;
const WALL_SPACING = 0.85;
const INNER_R = 0.5;

/**
 * WHERE THE STALLS ARE, and why they stop where they do.
 *
 * The barn is 13.3m long inside. The stalls take the back 7.1m of it, from the closed gable to local
 * z = 0.6, and the front 6m is left as an open threshing floor. That split is the difference between a
 * barn and a corridor: stalls the whole length would put a child in a 4.5m-wide aisle for the entire
 * building, whereas walking in under a loft and having the space open out in front of you is the thing a
 * barn actually feels like.
 *
 * It also leaves room for the ladder to stand clear of a stall front, which it otherwise cannot.
 */
export const STALL_RANGE = { from: -BARN_IN_HALF_D + 0.2, to: 0.6 } as const;
/**
 * How far a stall reaches in from the inner wall face — 2.7m, UP FROM 1.15.
 *
 * THE NUMBER THAT MADE THE INTERIOR A DOLL'S HOUSE. A stall for a horse is a room a horse can turn around
 * in: a box stall is 3.0-3.6m square and even a standing stall is 2.4m deep. At 1.15m these were 1.15m
 * deep and 2.35m wide, which is not a stall at any scale — it is a pew, and that is exactly what the
 * screenshot showed. Nothing else about the interior was as wrong, because everything else was only
 * detail, and detail cannot rescue a proportion.
 *
 * With `STALL_DIVIDERS` giving three bays of 2.35m a side, a stall is now 2.35 x 2.7m. Measured against the
 * keeper's 1.5m eye height, that is a room they could lie down across twice, with a front they can see over
 * and a partition whose top sits level with their eyes — see the heights in `barnInterior.tsx`.
 *
 * WHAT IT COSTS AND WHY THE COLLIDER STILL HOLDS. The threshing floor narrows from 9.8m to 4.4m of clear
 * geometry, and the stall-front chains — which sit ON this line and hold a 0.45m keeper 0.95m off it —
 * narrow the WALKABLE aisle behind the stall line from 5.6m to 2.5m. Both are still comfortable for a 0.9m
 * keeper, the doorway walk down the centreline is untouched (it is at x = 0 the whole way), and the chains
 * are still continuous, so the deeper stalls are no more enterable than the shallow ones were. `barn.test.ts`
 * asserts all of it, including two new points deep inside a stall that a child must not be able to reach.
 */
export const STALL_DEPTH = 2.7;
/** Local x of a stall's front line. */
export const STALL_FRONT_X = BARN_IN_HALF_W - STALL_DEPTH;

/** Divider positions, so the renderer and the collider agree on where the stalls are. */
export const STALL_DIVIDERS: readonly number[] = (() => {
  const n = 3;
  const out: number[] = [];
  for (let i = 0; i <= n; i += 1) {
    out.push(STALL_RANGE.from + (i / n) * (STALL_RANGE.to - STALL_RANGE.from));
  }
  return out;
})();

/**
 * The hayloft, over the front of the barn.
 *
 * OVER THE FRONT, not the back, and that is the one placement decision in the interior worth arguing.
 * The hay door is up in the +Z gable — it was already there, where a hoist would be — so a loft at the
 * other end would have hay being lifted through a door into thin air. Putting it under its own door is
 * both correct and better: a child walks in beneath a low ceiling and the barn opens up in front of them,
 * which is a far stronger sense of having entered somewhere than a uniform box gives.
 *
 * `y` is 3.35, which leaves the loft's edge crossing the top 27cm of the 3.62m doorway. That is deliberate
 * too: seeing a floor edge through the opening from outside tells a child there is an upstairs before they
 * have gone in.
 */
export const LOFT = { from: 1.2, to: BARN_IN_HALF_D, y: 3.35 } as const;

/** The two posts under the loft's open edge. */
export const LOFT_POSTS: readonly { x: number; z: number }[] = [
  { x: -(BARN_IN_HALF_W - 0.7), z: LOFT.from + 0.3 },
  { x: BARN_IN_HALF_W - 0.7, z: LOFT.from + 0.3 },
];

/** The ladder to the loft, standing just clear of its edge on the +X wall. */
export const LADDER = { x: BARN_IN_HALF_W - 0.32, z: LOFT.from - 0.55 } as const;

/** The two feed bins against the closed end. */
export const FEED_BINS: readonly { x: number; z: number }[] = [
  { x: -1.5, z: -BARN_IN_HALF_D + 0.65 },
  { x: 1.5, z: -BARN_IN_HALF_D + 0.65 },
];

/**
 * Everything about the barn a child cannot walk through.
 *
 * Five segments for the shell — two long walls, the closed end, and the two jambs — plus two inner
 * chains along the stall fronts. The doorway is the space between where the two jamb segments stop, and
 * its width is therefore a stated number rather than a leftover:
 *
 *   clear half-width  =  (DOOR.halfW - 0.05)  -  WALL_R  -  keeper radius
 *
 * which at a 0.45m keeper is 1.85 - 0.55 - 0.45 = 0.85m each side, a 1.7m walkable slot in a 3.8m
 * opening. `doorwayWalkReport()` measures it rather than trusting this comment.
 */
export function barnSolids(): Solid[] {
  const out: Solid[] = [];
  const hw = BARN_W / 2;
  const hd = BARN_D / 2;

  // The shell, on the footprint.
  out.push(...chainSegment(BARN, [-hw, -hd], [-hw, hd], WALL_R, WALL_SPACING));
  out.push(...chainSegment(BARN, [hw, -hd], [hw, hd], WALL_R, WALL_SPACING));
  out.push(...chainSegment(BARN, [-hw, -hd], [hw, -hd], WALL_R, WALL_SPACING));

  /**
   * The jambs, stopping 5cm inside the stated opening.
   *
   * Inside rather than outside, so the arithmetic errs toward a WIDER doorway than the geometry. A
   * collider that reached past the jamb would produce the defect this whole exercise is about — a doorway
   * that is plainly open and cannot be walked through — and it would be invisible in every screenshot.
   */
  const jambX = DOOR.halfW - 0.05;
  out.push(...chainSegment(BARN, [jambX, hd], [hw, hd], WALL_R, WALL_SPACING));
  out.push(...chainSegment(BARN, [-hw, hd], [-jambX, hd], WALL_R, WALL_SPACING));

  // The stall fronts, so a child cannot stand inside the joinery.
  for (const sx of [-1, 1] as const) {
    out.push(
      ...chainSegment(
        BARN,
        [sx * STALL_FRONT_X, STALL_RANGE.from],
        [sx * STALL_FRONT_X, STALL_RANGE.to],
        INNER_R,
        1.0,
      ),
    );
  }

  /**
   * The four things standing in the open part of the floor.
   *
   * The stall chains cover everything behind the stall line, but the threshing floor in front of it is
   * walkable in full — so the loft's posts, the ladder and the feed bins need their own circles or a child
   * walks through them. Every one of them is at least 1.3m off the doorway centreline, which is what keeps
   * `doorwayWalkReport` clean: furniture that blocked the way in would be the same defect as a sealed
   * collider chain, arrived at from the other direction.
   */
  for (const post of LOFT_POSTS) {
    out.push({ position: [...toWorld(BARN, post.x, post.z)] as [number, number], radius: 0.3 });
  }
  out.push({ position: [...toWorld(BARN, LADDER.x, LADDER.z)] as [number, number], radius: 0.36 });
  for (const bin of FEED_BINS) {
    out.push({ position: [...toWorld(BARN, bin.x, bin.z)] as [number, number], radius: 0.62 });
  }

  return out;
}

/* ------------------------------------------------------------------ *\
   The two invariants, as reports rather than as claims
\* ------------------------------------------------------------------ */

export interface LeafExtent {
  angle: number;
  /** Smallest local z reached by any corner of either leaf. Must never be below the wall's outer face. */
  minZ: number;
  /** Largest local x of the left leaf, and smallest of the right. Must stay on their own sides of zero. */
  leftMaxX: number;
  rightMinX: number;
}

/**
 * The eight corners of one leaf at one angle, in the barn's local frame.
 *
 * The leaf is modelled in its hinge's frame as `x ∈ [-leaf, 0]` running inward and `z ∈ [0, leafT]`
 * running outward, then rotated by `side * angle` about the hinge and translated to it. Only x and z
 * matter: the swing is about Y, so y is invariant and cannot be the thing that clips.
 */
function leafCorners(side: 1 | -1, angle: number): P2[] {
  const hingeX = side * DOOR.halfW;
  const φ = side * angle;
  const c = Math.cos(φ);
  const s = Math.sin(φ);
  const out: P2[] = [];
  // `-side * leaf` runs from the hinge toward the middle of the opening whichever side we are on.
  for (const lx of [0, -side * DOOR.leaf]) {
    for (const lz of [0, DOOR.leafT]) {
      out.push([hingeX + lx * c + lz * s, DOOR_HINGE_Z - lx * s + lz * c]);
    }
  }
  return out;
}

/**
 * Sweeps both leaves through their whole range and reports the extremes.
 *
 * Exported so a test — or a preview page — can PROVE the no-clip claim instead of believing the comment
 * at the top of this file. The two things every row must satisfy:
 *
 *   minZ >= BARN_D / 2      the leaf never enters the wall, at any angle including shut
 *   leftMaxX < 0 < rightMinX   the two leaves never reach each other
 *
 * Swept at 1° so the endpoints and the whole interior of the range are covered; the extremes of a
 * rotation about a fixed axis are on the boundary or at 90°, so a fine sweep is belt and braces.
 */
export function doorSweepReport(steps = 90): LeafExtent[] {
  const out: LeafExtent[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const angle = (i / steps) * DOOR.open;
    let minZ = Infinity;
    let leftMaxX = -Infinity;
    let rightMinX = Infinity;
    for (const side of DOOR_SIDES) {
      for (const p of leafCorners(side, angle)) {
        minZ = Math.min(minZ, p[1]);
        if (side < 0) leftMaxX = Math.max(leftMaxX, p[0]);
        else rightMinX = Math.min(rightMinX, p[0]);
      }
    }
    out.push({ angle, minZ, leftMaxX, rightMinX });
  }
  return out;
}

/** True when every angle in the sweep keeps the leaves out of the wall and off each other. */
export function doorSweepOk(): boolean {
  return doorSweepReport().every(
    (r) => r.minZ >= BARN_D / 2 - 1e-9 && r.leftMaxX < -1e-6 && r.rightMinX > 1e-6,
  );
}

export interface WalkStep {
  /** Local z along the doorway centreline. Positive is outside, negative is deep inside. */
  localZ: number;
  world: [number, number];
  /** How far the collider set would shove a keeper standing here. Must be zero. */
  pushed: number;
}

export interface WalkReport {
  ok: boolean;
  /** The widest clear gap found at the doorway, in metres, for the keeper radius asked about. */
  clearWidth: number;
  worst: WalkStep | null;
  steps: number;
}

/**
 * THE WALK-IN, PROVED.
 *
 * Steps a keeper of `radius` along the doorway's centreline from 4m outside the barn to the middle of its
 * floor, at 5cm intervals, and asks the same push-out arithmetic `Game.tsx` runs every frame whether it
 * would be moved. Any non-zero push anywhere on that line means the doorway is shut, however open it
 * looks — which is exactly the defect this exists to prevent, and exactly the defect no screenshot can
 * catch.
 *
 * `clearWidth` is then measured rather than derived: the keeper is stepped sideways across the doorway
 * plane until it is pushed, from both directions, and the answer is how much room a child actually has.
 * A number that comes from the same code the game runs cannot drift away from the geometry the way a
 * comment can.
 *
 * `solids` is the WHOLE collider set, not just the barn's, because the promise is about the world. A
 * fence post or a hay bale dropped in the doorway by some later edit would be caught here.
 */
export function doorwayWalkReport(
  solids: readonly Solid[],
  radius = 0.45,
  from = BARN_D / 2 + 4,
  to = 0,
): WalkReport {
  const steps: WalkStep[] = [];
  const step = 0.05;
  for (let lz = from; lz >= to - 1e-9; lz -= step) {
    const w = toWorld(BARN, 0, lz);
    const { pushed } = pushOut(solids, w[0], w[1], radius);
    steps.push({ localZ: lz, world: [w[0], w[1]], pushed });
  }

  let worst: WalkStep | null = null;
  for (const s of steps) {
    if (!worst || s.pushed > worst.pushed) worst = s;
  }

  // Sideways, in the plane of the doorway, to find the real clear width.
  let clearHalf = 0;
  for (let x = 0; x <= DOOR.halfW + 0.5; x += 0.01) {
    const a = toWorld(BARN, x, BARN_D / 2);
    const b = toWorld(BARN, -x, BARN_D / 2);
    if (
      pushOut(solids, a[0], a[1], radius).pushed > 0 ||
      pushOut(solids, b[0], b[1], radius).pushed > 0
    ) {
      break;
    }
    clearHalf = x;
  }

  return {
    ok: (worst?.pushed ?? 0) <= 1e-9,
    clearWidth: clearHalf * 2 + radius * 2,
    worst,
    steps: steps.length,
  };
}
