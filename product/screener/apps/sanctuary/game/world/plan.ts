/**
 * The ranch's layout arithmetic, with no three.js and no React in it.
 *
 * WHY THIS FILE EXISTS. `Buildings.tsx` had these helpers inline, which was fine while it was the only
 * thing that placed anything. It is not any more: the barn's doorway, its windows and its collider chain
 * all need the same frame conversion, and the doorway's walk-in promise needs to be provable in a test.
 * A test cannot import a `.tsx` that imports `@react-three/fiber` without dragging a renderer into node,
 * so the arithmetic lives here where it can be checked, and the components import it.
 *
 * ONE FRAME CONVENTION, USED EVERYWHERE. A `Placed` thing has a position and a rotation about Y, and
 * everything belonging to it is authored in its own local frame and converted through `toWorld`. That is
 * not a stylistic preference — the barn stands at 94.5°, and typing world coordinates for anything beside
 * a building at that angle is how a hay bale ends up inside a wall.
 */

export type P2 = readonly [number, number];

export interface Placed {
  x: number;
  z: number;
  /** Rotation about Y, radians. */
  rot: number;
}

/**
 * The keeper's eye height, which is `Game.tsx`'s `KEEPER_HEIGHT`.
 *
 * MIRRORED HERE FOR THE SAME REASON `pushOut` BELOW IS. That controller integrates over a flat plane and
 * clamps the camera to this number; every claim this file makes about where a child can stand is a claim
 * about a body whose eye is here. A test cannot import `Game.tsx` without dragging a renderer into node,
 * so the number is restated where the arithmetic lives. `world/ladder.ts` imports it rather than declaring
 * a third copy.
 */
export const KEEPER_EYE = 1.5;

/** A collider: a circle in the ground plane, as `Game.tsx` and `Vacpack.tsx` both expect it. */
export interface Solid {
  position: [number, number];
  radius: number;
  /**
   * The band of EYE heights over which this circle is solid, `[low, high]` inclusive. Absent means every
   * height, which is what a collider on a flat world means and what all but a handful of them are.
   *
   * WHY A FLAT WORLD SUDDENLY NEEDS THIS. The barn has a hayloft a child can now climb into, so for the
   * first time there are two floors over one footprint and some of the furniture belongs to only one of
   * them. The posts holding the loft up stop at its underside, so somebody standing ON the loft has to be
   * able to walk over where they are; the guard rail along the loft's open edge is three and a half metres
   * in the air, so somebody on the threshing floor has to be able to walk under it. As circles with no
   * height the first pair fence off the part of the loft you arrive at, and the second draws an invisible
   * wall across the middle of the barn.
   *
   * IGNORING THIS FIELD IS ALWAYS SAFE AT GROUND LEVEL, and that is deliberate. Every banded circle inside
   * `SOLIDS` is banded to stop existing ABOVE the loft, so a consumer that never reads the field sees
   * exactly the collider set it saw before this existed. The circles that exist only UP THERE are kept out
   * of `SOLIDS` altogether — see `LOFT_SOLIDS` in `barn.ts` — so they cannot leak into a caller that has
   * no notion of height.
   */
  eye?: readonly [number, number];
}

/** Whether a collider is solid at this eye height. A circle with no band is solid at all of them. */
export function solidBites(solid: Solid, eyeY: number): boolean {
  return !solid.eye || (eyeY >= solid.eye[0] && eyeY <= solid.eye[1]);
}

/**
 * Local (x, z) to world (x, z) for a placed object.
 *
 * Matches three's `rotation.y`: `x' = x cos + z sin`, `z' = -x sin + z cos`. Every other frame conversion
 * in the ranch is expressed through this one so there is a single place for the sign convention to be
 * right or wrong.
 */
export function toWorld(p: Placed, lx: number, lz: number): P2 {
  const c = Math.cos(p.rot);
  const s = Math.sin(p.rot);
  return [p.x + lx * c + lz * s, p.z - lx * s + lz * c];
}

/**
 * World (x, z) back into a placed object's own frame. The exact inverse of `toWorld`.
 *
 * WRITTEN DOWN BECAUSE IT WAS ALREADY INLINE IN THREE PLACES — `insideBarn`, `overLoft` and now the ground
 * height — each with its own copy of the four multiplies and its own chance of a sign the wrong way round.
 * `toWorld`'s note says there should be a single place for the convention to be right or wrong; that was
 * only true of the forward direction, and asking "am I inside that building" is the direction the game
 * actually asks more often.
 */
export function toLocal(p: Placed, wx: number, wz: number): P2 {
  const c = Math.cos(p.rot);
  const s = Math.sin(p.rot);
  const dx = wx - p.x;
  const dz = wz - p.z;
  return [dx * c - dz * s, dx * s + dz * c];
}

/**
 * A world `rotation.y` for something authored at local angle `a` (an `atan2(dz, dx)` heading).
 *
 * `rot - a`, and the minus is the whole point: three's `rotation.y` runs opposite to an atan2 heading, so
 * composing a local heading with a parent rotation is a subtraction. This got written down as a function
 * after being got wrong inline twice.
 */
export function worldYaw(p: Placed, localHeading: number): number {
  return p.rot - localHeading;
}

/** A closed rounded-rectangle outline in local (x, z). Pens, their floors and their fences share it. */
export function roundedRectOutline(halfW: number, halfD: number, radius: number, perCorner: number): P2[] {
  const r = Math.min(radius, Math.min(halfW, halfD) * 0.92);
  const cx = halfW - r;
  const cz = halfD - r;
  const corners: readonly (readonly [number, number, number])[] = [
    [cx, cz, 0],
    [-cx, cz, Math.PI / 2],
    [-cx, -cz, Math.PI],
    [cx, -cz, (3 * Math.PI) / 2],
  ];
  const out: P2[] = [];
  for (const corner of corners) {
    const ox = corner[0];
    const oz = corner[1];
    const a0 = corner[2];
    for (let i = 0; i <= perCorner; i += 1) {
      const a = a0 + (i / perCorner) * (Math.PI / 2);
      out.push([ox + Math.cos(a) * r, oz + Math.sin(a) * r]);
    }
  }
  return out;
}

/** Cumulative arc length of a closed polyline, plus its total. */
export function arcLengths(points: readonly P2[]): { at: number[]; total: number } {
  const at: number[] = [0];
  let total = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i] ?? [0, 0];
    const b = points[(i + 1) % points.length] ?? [0, 0];
    total += Math.hypot(b[0] - a[0], b[1] - a[1]);
    at.push(total);
  }
  return { at, total };
}

/** Point and tangent at arc length `s` around a closed polyline. */
export function sampleClosed(
  points: readonly P2[],
  at: readonly number[],
  total: number,
  s: number,
): { p: P2; angle: number } {
  const target = ((s % total) + total) % total;
  let i = 0;
  while (i < points.length - 1 && (at[i + 1] ?? total) < target) i += 1;
  const a = points[i % points.length] ?? [0, 0];
  const b = points[(i + 1) % points.length] ?? [0, 0];
  const s0 = at[i] ?? 0;
  const seg = (at[i + 1] ?? total) - s0;
  const f = seg > 1e-6 ? (target - s0) / seg : 0;
  return {
    p: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f],
    angle: Math.atan2(b[1] - a[1], b[0] - a[0]),
  };
}

/**
 * Collider circles laid along the rounded-rect footprint of a placed thing.
 *
 * A chain rather than one big circle, and the reason is worth keeping: a single circle inscribing the
 * barn would be 10.5m across and would stop a child three metres short of its own doors, while one
 * circumscribing it would swallow the path. A chain costs about thirty entries per building and is
 * accurate to 10cm.
 */
export function chainOutline(
  p: Placed,
  halfW: number,
  halfD: number,
  radius: number,
  spacing: number,
): Solid[] {
  const out: Solid[] = [];
  const outline = roundedRectOutline(halfW, halfD, Math.min(halfW, halfD) * 0.35, 4);
  const { at, total } = arcLengths(outline);
  const n = Math.max(4, Math.round(total / spacing));
  for (let i = 0; i < n; i += 1) {
    const sample = sampleClosed(outline, at, total, (i / n) * total);
    const w = toWorld(p, sample.p[0], sample.p[1]);
    out.push({ position: [w[0], w[1]], radius });
  }
  return out;
}

/**
 * Collider circles along one straight local segment, endpoints included.
 *
 * This is what a designed opening needs and `chainOutline` cannot give. A chain around a closed
 * footprint puts its circles wherever the arc-length sampling happens to land, so "leave a gap here" has
 * to be expressed as a filter over positions nobody chose — and whether the gap comes out 2.4m or 3.1m
 * wide then depends on the spacing, which is exactly the kind of accidental number a child walks into.
 * Building the barn's collider out of explicit segments instead makes the doorway a stated dimension:
 * the jamb ends where it is told to end, and the clear width is arithmetic rather than a leftover.
 *
 * Endpoints are always emitted, so two segments meeting at a corner both put a circle on it and no
 * corner can leak.
 */
export function chainSegment(p: Placed, a: P2, b: P2, radius: number, spacing: number): Solid[] {
  const out: Solid[] = [];
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const steps = Math.max(1, Math.ceil(length / spacing));
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const w = toWorld(p, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t);
    out.push({ position: [w[0], w[1]], radius });
  }
  return out;
}

/**
 * How far a keeper of `radius` standing at `(x, z)` would be pushed by `solids`.
 *
 * A COPY OF `Game.tsx`'s PUSH-OUT, ON PURPOSE, and the duplication is the point rather than a smell.
 * That loop is the definition of "can a child walk here", it lives inside a `useFrame` in a file this
 * one may not import, and the only way to make a claim about walkability testable is to state the same
 * arithmetic somewhere a test can call it. If the two ever disagree, the test is wrong about the game —
 * which is a failure worth having, because the alternative is a doorway that looks open and is not.
 *
 * Returns the total push-out distance. Zero means the keeper stands there unimpeded.
 *
 * `eyeY` defaults to the ground, so every caller written before the barn had an upstairs keeps asking the
 * question it was already asking: "can a child walk here, standing on the meadow".
 */
export function pushOut(
  solids: readonly Solid[],
  x: number,
  z: number,
  radius: number,
  eyeY: number = KEEPER_EYE,
): { pushed: number; by: Solid | null } {
  let worst = 0;
  let by: Solid | null = null;
  for (const solid of solids) {
    if (!solidBites(solid, eyeY)) continue;
    const dx = x - solid.position[0];
    const dz = z - solid.position[1];
    const d = Math.hypot(dx, dz);
    const min = solid.radius + radius;
    if (d < min) {
      const overlap = min - d;
      if (overlap > worst) {
        worst = overlap;
        by = solid;
      }
    }
  }
  return { pushed: worst, by };
}
