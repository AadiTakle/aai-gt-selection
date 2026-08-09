import type { Battery } from '../../shared/batteries';
import type { StationSite } from '../stations/sites';
import { siteTypes } from '../stations/sites';
import { arcLengths, roundedRectOutline, sampleClosed, toWorld, type P2, type Solid } from '../world/plan';

/**
 * THE BACK PADDOCK AND THE BOARD THAT HOLDS IT SHUT.
 *
 * ══ ONE OBJECT, NOT TWO ═══════════════════════════════════════════════════════════════════════════
 *
 * The brief is that finishing the challenge board "visibly unlocks a second pen", and the cheapest
 * honest way to make that visible is to make the board the thing in the way. So this is a fenced paddock
 * with a gateway, and a hoarding boarded across the gateway. A child stands in front of the hoarding,
 * presses E, works through it, and the boards come off the gate they were nailed to. Nothing has to be
 * explained, because the barrier and the reward are the same object.
 *
 * IT IS THE FOURTH ENCLOSURE ON THE RANCH, and that is worth stating plainly rather than glossing. The
 * three pens `world/Buildings.tsx` draws are Nan's own and are open from the first frame; this directory
 * may not edit that file and would not want to, because shutting a pen a child can already see slimes in
 * would be taking something away. The fiction the tour tells is therefore true of what is on screen: the
 * three pens are hers, the tour lends you one of them to put your first slime in, and the back paddock —
 * this one — is the second, and it is the one you are given.
 *
 * ══ NOTHING HERE WAS PLACED BY EYE ════════════════════════════════════════════════════════════════
 *
 * `Buildings.tsx`'s own `blocked()` predicate and both of its scatter loops were re-derived outside the
 * app and the whole ranch was scanned for ground that satisfies all of the following at once. The scan
 * found 3,807 poses; this is the one nearest the route a child actually walks.
 *
 *   - The paddock's whole footprint plus a metre of apron is outside every building, every pen, every
 *     worn track's 2.4m margin, the arrival corridor and the pod-wall apron.
 *   - No scattered tree within 1.5m of any part of it. (A BUSH clips the fence line by about 0.8m on the
 *     west side. Left alone deliberately: a bush is a 60cm sphere with no collider, and scrub growing
 *     through a fence is what scrub does.)
 *   - THE CHECK THAT ACTUALLY BOUND IT — 17.4m from the nearest existing press-E prompt or standing spot,
 *     against a proximity reach of 6.8m. Two prompts offered at once is the single failure that would
 *     make the shared E verb unlearnable, and `economy/site.ts` records moving the stall twice for it.
 *   - The board's standing spot and the seven metres of lane behind it are clear ground, so a child can
 *     walk onto the mark rather than being stopped short of it.
 *
 * ══ WHY THE BAY IS BIGGER THAN EVERY OTHER STATION'S ══════════════════════════════════════════════
 *
 * Because this one station serves ALL THREE batteries, so it has to contain the worst case of all three
 * at once. `stations/sites.ts` measured those over all 934 items in the seven banks: the widest
 * projection at the child's eye is 3.24 (Nonverbal, set by a four-option `FLU-MATRIX-01`, which scales
 * up and therefore hangs its shelf both wider and lower), the lowest 1.63 and the highest 1.49. That
 * file's Nonverbal bay is stuck at 2.55 and it says so at length — the barn wall it is bolted to has no
 * room. This board stands free in a meadow, so it is simply built big enough, and it is the first thing
 * in the game that actually contains a six-option matrix shelf.
 */

/* ------------------------------------------------------------------ *\
   The paddock
\* ------------------------------------------------------------------ */

/**
 * Centre, rotation and extents. Local +Z is the gate side, which is the side the board bars and the side
 * a child approaches from — the same convention `stations/sites.ts` uses for a panel's face, so a reader
 * who knows one knows the other.
 */
export const PADDOCK = {
  x: 10.5,
  z: 18.5,
  rot: -2.749,
  halfW: 4.4,
  halfD: 3.3,
  cornerR: 1.5,
} as const;

/** Half the gap left in the fence for the gateway, measured along the fence line. */
const GATE_HALF = 1.9;
/** Post spacing, and the post itself. Matched to `world/Buildings.tsx`'s fence so the two read as one ranch. */
const POST_SPACING = 1.62;
export const POST_H = 1.42;
export const POST_W = 0.17;
export const GATE_POST_EXTRA = 0.42;

/** The unit world vector the gate faces, as (x, z). */
export function facing(): [number, number] {
  return [Math.sin(PADDOCK.rot), Math.cos(PADDOCK.rot)];
}

/** Paddock-local (x, z) to world (x, z). */
export function localToWorld(lx: number, lz: number): P2 {
  return toWorld(PADDOCK, lx, lz);
}

export interface FencePost {
  /** World. */
  x: number;
  z: number;
  /** World `rotation.y`, so the cap board lies along the fence. */
  angle: number;
  gatePost: boolean;
}
export interface FenceRail {
  x: number;
  z: number;
  angle: number;
  length: number;
}

/**
 * The fence, solved once at module scope so the renderer and the collider read the same posts.
 *
 * Lifted in structure from `world/Buildings.tsx`'s own fence for exactly the reason that file gives: a
 * collider written out by hand is a second opinion about where a thing is, and two opinions drift apart
 * the moment one of them moves.
 */
export const FENCE: { posts: FencePost[]; rails: FenceRail[] } = (() => {
  const posts: FencePost[] = [];
  const rails: FenceRail[] = [];
  const outline = roundedRectOutline(PADDOCK.halfW, PADDOCK.halfD, PADDOCK.cornerR, 7);
  const { at, total } = arcLengths(outline);

  /**
   * The gateway goes at the MIDDLE OF A SEGMENT, not at the nearest vertex, and the difference is not a
   * refinement — it is the whole placement.
   *
   * `roundedRectOutline` emits points on the corner ARCS only; the straight sides are the segments
   * between one corner's last point and the next corner's first. So the nearest VERTEX to the middle of
   * the +Z side is a corner, 2.9m off centre, and `world/Buildings.tsx`'s vertex search — right for a
   * gate that only has to land "on the path side" — would put this gateway round the corner from the
   * board that is supposed to be barring it. Searching segment midpoints instead puts it dead centre,
   * which is where the board stands, and it stays dead centre if the paddock is ever resized.
   */
  let sGate = 0;
  let best = Infinity;
  for (let i = 0; i < outline.length; i += 1) {
    const a = outline[i] ?? [0, 0];
    const b = outline[(i + 1) % outline.length] ?? [0, 0];
    const mid: P2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const d = Math.hypot(mid[0] - 0, mid[1] - PADDOCK.halfD);
    if (d < best) {
      best = d;
      sGate = ((at[i] ?? 0) + (at[i + 1] ?? total)) / 2;
    }
  }

  const run = total - 2 * GATE_HALF;
  const bays = Math.max(2, Math.round(run / POST_SPACING));
  const step = run / bays;
  const made: { x: number; z: number }[] = [];
  for (let i = 0; i <= bays; i += 1) {
    const sample = sampleClosed(outline, at, total, sGate + GATE_HALF + i * step);
    const w = toWorld(PADDOCK, sample.p[0], sample.p[1]);
    posts.push({
      x: w[0],
      z: w[1],
      // A local tangent `a` maps to a world `rotation.y` of `rot - a`. See `worldYaw` in `world/plan.ts`.
      angle: PADDOCK.rot - sample.angle,
      gatePost: i === 0 || i === bays,
    });
    made.push({ x: w[0], z: w[1] });
  }

  for (let i = 0; i < made.length - 1; i += 1) {
    const a = made[i];
    const b = made[i + 1];
    if (!a || !b) continue;
    const length = Math.hypot(b.x - a.x, b.z - a.z) - POST_W;
    if (length <= 0.05) continue;
    rails.push({
      x: (a.x + b.x) / 2,
      z: (a.z + b.z) / 2,
      angle: -Math.atan2(b.z - a.z, b.x - a.x),
      length,
    });
  }

  return { posts, rails };
})();

/**
 * The gateway itself, in the BOARD's local frame — which is the paddock's frame slid out to the fence
 * line, so the leaf, the boards nailed over it and the hoarding above it are all authored in one place.
 *
 * The two gate posts are the first and last of `FENCE.posts`, and the leaf hangs from the one on local
 * -X so it swings out across the approach. `world/Buildings.tsx` draws its own pen gates permanently
 * open at 0.62 radians, on the argument that an open gate is an invitation to walk in; this one is the
 * exception that proves it, because being shut is what it is for.
 */
export const GATE = {
  /** Half the opening, along the fence. Local -X post at `-half`, local +X post at `+half`. */
  half: GATE_HALF,
  /** The leaf's span, a little inside the posts so it does not foul them as it swings. */
  span: GATE_HALF * 2 - 0.2,
  /**
   * How far open it stands once unlocked.
   *
   * 1.25 radians — 72° — where `world/Buildings.tsx` leaves its own pen gates at 0.62. The difference is
   * the viewing angle, and a photograph settled it. The ranch's pens are all seen obliquely, so 35° of
   * swing is plainly a gate standing open. THIS gate is looked at square-on, because the standing mark
   * is on its axis, and at 35° square-on a foreshortened leaf still spans most of the opening and reads
   * as shut. Which would be a poor thing for it to read as, given that opening it is the whole reward.
   *
   * At 72° the leaf swings out and to the left of the approach, ending 3.5m in front of the fence line —
   * well short of the 5.4m standing mark, and not solid in any case.
   */
  swing: 1.25,
} as const;

/* ------------------------------------------------------------------ *\
   The board
\* ------------------------------------------------------------------ */

/**
 * How far out along local +Z the hoarding stands: on the fence line itself, because it is nailed across
 * the gateway rather than standing in front of it.
 */
const BOARD_OUT = PADDOCK.halfD;

/**
 * Panel centre height.
 *
 * 2.35 rather than the stations' 2.15-2.3 because the bay is taller. With `halfH` 1.95 the sill lands at
 * 0.40m — a clear third of a metre of daylight under it, which `stations/sites.ts` argues for at length —
 * and the head beam at 4.30m, the same family of height as the three stations' 4.15.
 */
export const BOARD_HEIGHT = 2.35;

/** See the header: sized to contain the worst case of all three batteries at once. */
export const BAY = { halfW: 3.45, halfH: 1.95 } as const;

/**
 * How far out the keeper is docked while engaged.
 *
 * 5.4 RATHER THAN THE STATIONS' 4.6, and the extra 0.8m is bought rather than preferred. A screenshot
 * from the mark at 4.6 settled it: with a bay 6.9m wide instead of 5.1 the frame is simply full — the
 * posts sit outside both edges of a 1280-wide window, the head beam and its pent roof are above the top
 * of it, and the object a child is meant to read as one thing cannot be seen as one thing.
 *
 * What 4.6 was protecting is unharmed. `stations/sites.ts` sets it from the PANEL, not from the bay: with
 * the widest element scaled to `FIT_W` (4.7m) the panel is meant to fill a bit over half the frame, and
 * at 5.4m it still spans 47° of an 88° horizontal field — 53% of the width. The binding case, a
 * six-option `FLU-MATRIX-01` shelf projecting 3.24 either side, goes from 80% of the width to 70%, so
 * the case that was closest to running off the sides is now further from it rather than nearer.
 *
 * The whole bay including the roof comes inside the 62° vertical field at this distance and does not at
 * 4.6, which is the difference between a station and a wall.
 */
export const DOCK = 5.4;
/** How close before the board lights up. The stations' `REACH`, unchanged, so the verb feels identical. */
export const REACH = 6.8;
/** How far off centre the keeper may be looking and still be offered it. ~56°, the stations' tolerance. */
export const FACING_DOT = 0.56;

const boardXZ = localToWorld(0, BOARD_OUT);
/** Centre of the hoarding's plane, world metres. */
export const BOARD_AT: readonly [number, number, number] = [boardXZ[0], BOARD_HEIGHT, boardXZ[1]];
/** `rotation.y`. Local +Z is the face the child stands in front of, and it points away from the paddock. */
export const BOARD_YAW = PADDOCK.rot;

/** Where the keeper is held while engaged, at `Game.tsx`'s own 1.5m eye height. */
export function dockPoint(): [number, number, number] {
  const f = facing();
  return [BOARD_AT[0] + f[0] * DOCK, 1.5, BOARD_AT[2] + f[1] * DOCK];
}

/** Board-local (x, z) to world (x, z). Same frame as the paddock, offset down +Z. */
export function boardToWorld(lx: number, lz: number): P2 {
  return localToWorld(lx, lz + BOARD_OUT);
}

/* ------------------------------------------------------------------ *\
   The batteries this one board covers
\* ------------------------------------------------------------------ */

/**
 * THE SPREAD, AND WHY IT IS 3 / 2 / 3 RATHER THAN 8 OF ANYTHING.
 *
 * Aadi asked for 7-8 questions and for a baseline. The engine is unidimensional and a sortie is a
 * single-battery measurement (see `shared/useSortie.ts`), so a single eight-item session would produce
 * an eight-item estimate of ONE battery and nothing at all about the other two. Three short legs produce
 * three thin estimates, which is a worse number per battery and a better answer to the question actually
 * being asked. What that number can and cannot support is in the report; it is not a small caveat.
 *
 * Nonverbal first because it is wordless and the most approachable thing in the bank for a child who has
 * been playing for four minutes. Verbal in the middle because it is the slow one — the day-log narrates
 * the whole story out loud, twice over two items — and a slow thing is better in the middle than at the
 * end. Quantitative last because it is quick, so the board finishes briskly rather than trailing off.
 */
export const LEGS: readonly { battery: Battery; quota: number }[] = [
  { battery: 'Nonverbal', quota: 3 },
  { battery: 'Verbal', quota: 2 },
  { battery: 'Quantitative', quota: 3 },
];

/** Eight. Stated once so nothing has to add it up in its head. */
export const BOARD_ITEMS = LEGS.reduce((n, l) => n + l.quota, 0);

/**
 * Every style the board may present: each battery's drawable set, taken from `stations/sites.ts` rather
 * than listed, so a newly drawn style reaches the board the same day it reaches a station.
 */
export function typesForLeg(battery: Battery): readonly string[] {
  return siteTypes(battery);
}

/* ------------------------------------------------------------------ *\
   The adapter, so the board is built out of the stations' own joinery
\* ------------------------------------------------------------------ */

/**
 * The board described as a `StationSite`.
 *
 * AN ADAPTER, DELIBERATELY, on exactly the precedent `economy/Shop.tsx` sets and for the same reason:
 * `Bay`, `Lanterns`, `Emblem`, `StandMark` and `PressBadge` are the invitation and the joinery a child
 * has already learned on the three question stations, and reusing the components is the only way to
 * guarantee this board is identical to them rather than merely similar.
 *
 * `battery` is the one field here that is a simplification rather than a fact — the board is all three,
 * and the type has room for one. It is read only by `Lanterns`, which does not branch on it. `build` is
 * `daylog` because that is the value that makes `Bay` stand on its own posts and `Emblem` hang the plain
 * slab sign; there is no felled trunk here and nothing draws one, because `Stations.tsx` only draws bases
 * for sites in its own `SITES` array and this record is deliberately absent from it.
 */
export const AS_SITE: StationSite = {
  verbId: 'challenge-board',
  battery: 'Nonverbal',
  types: [...typesForLeg('Nonverbal'), ...typesForLeg('Verbal'), ...typesForLeg('Quantitative')],
  build: 'daylog',
  at: BOARD_AT,
  yaw: BOARD_YAW,
  dock: DOCK,
  bay: BAY,
  families: ['grass', 'waffle', 'frost'],
  seed: 5107,
};

/* ------------------------------------------------------------------ *\
   Colliders
\* ------------------------------------------------------------------ */

/**
 * What the child cannot walk through, in the `{position: [x, z], radius}` shape `Game.tsx`'s controller
 * already sweeps for `SOLIDS`, `STATION_SOLIDS` and `SHOP_SOLIDS`.
 *
 * ══ THIS ARRAY IS MUTATED EXACTLY ONCE, AND THAT IS THE POINT ═════════════════════════════════════
 *
 * The gateway is barred while the board is up and open afterwards, so the collider has to change. The
 * controller re-spreads the solid lists every frame, so the cheapest correct way to say that is a live
 * array with the gate chain spliced out of it by `openGate()`. It is idempotent and it only ever runs one
 * way: nothing in this game closes a gate it has opened.
 *
 * The hoarding above 1.2m is deliberately NOT solid, on `stations/sites.ts`'s rule that a first-person
 * capsule stopped by a signboard at head height reads as an invisible wall. What is solid is the fence,
 * the two board posts, and — until it opens — the barricade across the gap.
 */
const GATE_BAR: Solid[] = (() => {
  const out: Solid[] = [];
  for (const lx of [-1.4, -0.7, 0, 0.7, 1.4]) {
    const w = localToWorld(lx, PADDOCK.halfD);
    out.push({ position: [w[0], w[1]], radius: 0.5 });
  }
  return out;
})();

export const INTRO_SOLIDS: Solid[] = (() => {
  const out: Solid[] = [];
  for (const post of FENCE.posts) {
    out.push({ position: [post.x, post.z], radius: post.gatePost ? 0.36 : 0.42 });
  }
  // The hoarding's two posts, which stand on the ground just outside the gateway's corners.
  for (const side of [-1, 1] as const) {
    const w = boardToWorld(side * BAY.halfW, -0.1);
    out.push({ position: [w[0], w[1]], radius: 0.3 });
  }
  out.push(...GATE_BAR);
  return out;
})();

/** How far the nearest solid is from the standing mark. Nothing may be within 3m of a station's approach. */
export function clearanceAtDock(): number {
  const d = dockPoint();
  let best = Infinity;
  for (const s of INTRO_SOLIDS) best = Math.min(best, Math.hypot(s.position[0] - d[0], s.position[1] - d[2]));
  return best;
}

/** Take the barricade out of the world. Called once, when the board is finished or found already taken. */
export function openGate(): void {
  for (const bar of GATE_BAR) {
    const i = INTRO_SOLIDS.indexOf(bar);
    if (i >= 0) INTRO_SOLIDS.splice(i, 1);
  }
}

/** Whether the barricade is still standing. Only for the tests and the renderer's first frame. */
export function gateBarred(): boolean {
  return GATE_BAR.some((bar) => INTRO_SOLIDS.includes(bar));
}

/* ------------------------------------------------------------------ *\
   Where the tour points
\* ------------------------------------------------------------------ */

/**
 * The pens the world actually fenced, as ORIENTED RECTANGLES rather than as centres.
 *
 * Mirrored from `world/Buildings.tsx`'s own `PENS`, on the same terms `stations/sites.ts` mirrors the
 * barn: this directory may not edit that file and it does not export its layout, so these six numbers per
 * pen are quarantined here with this note on them. If a pen ever moves, it moves here too.
 *
 * ══ WHY RECTANGLES, WHEN A CIRCLE WOULD HAVE DONE ═════════════════════════════════════════════════
 *
 * The first pass tested "within 5 metres of a pen's centre", on the reasoning that the inscribed radius
 * plus a stride is generous enough. Sampled at 25cm over the whole ranch, that circle MISSES 242 of the
 * 3,328 points genuinely inside a pen — 7.3% of the interior, all of it in the four corners, because the
 * half-diagonal of the largest pen is 6.25 and the circle was 5.0.
 *
 * A child who carries their first slime to the far corner of a pen, puts it down, and is told nothing
 * happened is precisely the failure this step exists to avoid, and "it works unless you use the corner"
 * is not a rounding error — the corners are where a five-year-old with a vacuum pack ends up.
 */
const WORLD_PENS: readonly { x: number; z: number; rot: number; halfW: number; halfD: number }[] = [
  { x: -6.0, z: 15.5, rot: 0.14, halfW: 4.75, halfD: 3.5 },
  { x: 11.4, z: 4.2, rot: -0.2, halfW: 4.75, halfD: 3.5 },
  { x: -15.5, z: -16.5, rot: 0.3, halfW: 5.0, halfD: 3.75 },
];

/** Their centres, derived, for the waypoint to point at. */
export const PEN_CENTRES: readonly (readonly [number, number])[] = WORLD_PENS.map(
  (p) => [p.x, p.z] as const,
);

/**
 * How far outside a fence still counts.
 *
 * One stride. The generosity is deliberate and it is one-sided: the cost of being too strict is a child
 * doing the right thing and being told nothing happened, and the cost of being too loose is a step
 * completing a moment early — which nobody will ever notice, because the step has a timeout anyway.
 */
const PEN_PAD = 0.8;

function inRect(
  p: { x: number; z: number; rot: number; halfW: number; halfD: number },
  x: number,
  z: number,
  pad: number,
): boolean {
  const c = Math.cos(p.rot);
  const s = Math.sin(p.rot);
  const dx = x - p.x;
  const dz = z - p.z;
  return Math.abs(dx * c - dz * s) < p.halfW + pad && Math.abs(dx * s + dz * c) < p.halfD + pad;
}

/** The pen nearest a point, and how far its centre is. Used to decide where the tour's light goes. */
export function nearestPen(x: number, z: number): { centre: readonly [number, number]; distance: number } {
  let centre = PEN_CENTRES[1] ?? ([0, 0] as const);
  let distance = Infinity;
  for (const pen of PEN_CENTRES) {
    const d = Math.hypot(pen[0] - x, pen[1] - z);
    if (d < distance) {
      distance = d;
      centre = pen;
    }
  }
  return { centre, distance };
}

/** Inside any of the world's three pens, or inside the back paddock. */
export function insideAPen(x: number, z: number): boolean {
  for (const pen of WORLD_PENS) if (inRect(pen, x, z, PEN_PAD)) return true;
  return inRect(PADDOCK, x, z, PEN_PAD);
}
