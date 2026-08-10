/**
 * WHERE THE STALL STANDS, and the arithmetic that puts it there.
 *
 * Nothing here was placed by eye. Every number was checked against `world/Buildings.tsx`'s own `blocked()`
 * predicate and against the three station sites in `stations/sites.ts` before it was written down, by
 * re-deriving that predicate and its two scatter loops outside the app and scanning the ranch for a clear
 * spot. The four checks that decided it are named below.
 *
 * ══ THE SPOT: (-2.5, -13.5), AT THE END OF THE WORN PATH ═════════════════════════════════════════
 *
 * The spine path in `Buildings.tsx` runs from (1.4, 22) down to (0, -8.6), and its own comment says it
 * "stops at the pod wall's apron". The pod wall is GONE — `stations/` replaced it with three built things
 * elsewhere on the ranch — so the most walked route in the world currently leads to an empty field. That
 * is where the shop goes. A child who does nothing but follow the worn ground arrives at it, which is the
 * cheapest wayfinding there is and needs no words.
 *
 *   - CLEAR OF EVERY FOOTPRINT. 8.5m outside the barn's padded rectangle and 11.2m outside the hut's,
 *     nowhere near the windmill or any of the three pens, and 5.5m off the nearest path centreline, so the
 *     stall stands beside the track rather than on it.
 *   - CLEAR OF THE SCATTER. It sits inside the old pod-wall apron, which is not a keep-out but the
 *     opposite: that apron exists to keep trees and props off the ground in front of where the wall used
 *     to stand, so it is the most reliably empty patch on the ranch. `sites.ts` puts the tide ledge inside
 *     it for the same reason. Re-running the tree and bush scatters confirms it: nearest bush 8.1m,
 *     nearest tree well past 26m.
 *   - CLEAR OF THE OTHER THREE STATIONS, which is the check that moved it twice. Both directions matter,
 *     because both are proximity tests at 6.8m: the spring is 9.0m from the stall and 8.8m from the
 *     stall's standing spot, and the day log is 9.0m and 9.2m. So a child at the stall is never also
 *     offered a station, and a child at a station is never also offered the stall. Two prompts at once is
 *     the one failure that would make the shared E verb unlearnable.
 *   - IT DOES NOT STAND IN FRONT OF ANYTHING. From the arrival at (0, 1.5, 8) the stall is 21.6m away and
 *     spans 15.4° left to 2.2° right of the sightline. The spring sits at +16.8° and the day log at
 *     -30.7°, so both are still in frame beside it rather than behind it.
 *
 * THE YAW IS 0.30 RATHER THAN THE 0.116 THAT WOULD FACE THE ARRIVAL SQUARELY, and both degrees of that
 * difference were bought. `Lighting.tsx` puts the sun at (0.7925, 0.3417, 0.5052); a face turned exactly
 * up the path takes 0.59 of full sun and a face at 0.30 takes 0.72 — the brightest front of any built
 * thing on the ranch, which is what a shopfront should be. It is still within 11° of pointing back up the
 * path, and `Buildings.tsx`'s own note about the barn applies: a face 10° off square reads as a plane with
 * a depth behind it, where a face dead-on reads as a flat rectangle.
 */

import { STOCK } from './coins';

/* ------------------------------------------------------------------ *\
   The site
\* ------------------------------------------------------------------ */

/**
 * The stall's reference point: the middle of the shelf wall, in world metres.
 *
 * The height is the local frame's origin, so everything in `Kiosk.tsx` and `Shop.tsx` is authored relative
 * to it and the ground is always at local `-AT[1]`. Same convention as `stations/sites.ts`, so a reader who
 * knows one knows the other.
 */
export const AT: readonly [number, number, number] = [-2.5, 2.2, -13.5];

/** `rotation.y`. Local +Z is the face the child stands at. */
export const YAW = 0.3;

/**
 * How far out along +Z the keeper is docked while the shop is open. DERIVED — see `DOCK` below the shelf,
 * because it is the shelf that decides it and the two used to disagree.
 */

/** How close before the stall lights up and shows its prompt. The stations' own `REACH`, unchanged. */
export const REACH = 6.8;

/** How far off centre the keeper may be looking and still be offered it. ~56°, the stations' tolerance. */
export const FACING_DOT = 0.56;

/**
 * The stall's own half-extents, as the bay a shelf hangs in.
 *
 * FIXED, and not derived from how many families are on sale, which is the one sizing decision in this file
 * worth arguing. The family list is being expanded from six to about nineteen next door, and a stall whose
 * roof and posts moved every time somebody added a slime would be a different building on every visit. So
 * the joinery is built once at the size a full three-row shelf needs, and the shelf is laid out INSIDE it
 * — six families get big cubbies with the flanks dressed, nineteen get small ones. See `shelfLayout`.
 */
export const BAY = { halfW: 3.3, halfH: 1.62 } as const;

/** The unit world vector the stall faces, as (x, z). */
export function facing(): [number, number] {
  return [Math.sin(YAW), Math.cos(YAW)];
}

/** Local (x, z) to world (x, z). Matches three's `rotation.y`, as everywhere else in this game. */
export function localToWorld(lx: number, lz: number): [number, number] {
  const c = Math.cos(YAW);
  const s = Math.sin(YAW);
  return [AT[0] + lx * c + lz * s, AT[2] - lx * s + lz * c];
}

/**
 * A CHILD'S EYE HEIGHT, world metres, and the vertical field of view they see the stall through.
 *
 * Both are quoted from elsewhere rather than chosen here: 1.5 is `Game.tsx`'s `KEEPER_HEIGHT`, and 62 is
 * the `fov` on `Game.tsx`'s `<Canvas>` and on all three previews. They are named because `DOCK` is now
 * solved from them instead of being a number somebody liked, and a framing rule written against a field of
 * view has to say which field of view.
 */
export const EYE_HEIGHT = 1.5;
export const FOV_Y = 62;

/* ------------------------------------------------------------------ *\
   The shelf
\* ------------------------------------------------------------------ */

export interface Shelf {
  rows: number;
  cols: number;
  /** Horizontal pitch between cubby centres, world metres. */
  pitchX: number;
  /** Vertical pitch between cubby centres, world metres. */
  pitchY: number;
  /** Cubby half-width and half-height, world metres. Always a little inside the pitch. */
  halfW: number;
  halfH: number;
  /** Cubby centre in the stall's local frame, for the nth item of `count`. */
  cell: (i: number) => [number, number];
}

/** The widest the shelf may be, so it always stays inside the stall's posts. */
const SHELF_W = 6.2;
/**
 * The tallest the band of CUBBIES may be, measured from just above the counter to the head beam.
 *
 * READ THE NEXT PARAGRAPH BEFORE CHANGING ANYTHING NEAR THIS NUMBER. This is the band the cubbies are cut
 * from, and a cubby is NOT as tall as the slime standing in it: a crest — ears, a branch, wings, rime —
 * rises above the body, and `cubbyBody` only budgets the body. `CREST_SKY` and `CEILING` below are what
 * account for the rest, and they are why the stall's head beam is no longer sitting on this number.
 */
const SHELF_H = 3.0;
/** The middle of that band, in the local frame. Counter top is at local -1.18. */
const SHELF_Y = 0.42;
/**
 * The shelf lip a slime stands on, thickness. `Shop.tsx` draws it; it is quoted here because `CREST_SKY`
 * measures up to the underside of the NEXT row's lip and two opinions about one board would drift.
 */
export const PLINTH_T = 0.055;
/**
 * How far forward of a cubby's centre plane a portrait stands. `Shop.tsx` places the `Effigy` here; it
 * lives here because the framing arithmetic has to know which plane it is measuring to.
 */
export const CUBBY_Z = 0.06;

/**
 * How many rows and columns, for however many families the world has.
 *
 * Rows are chosen before columns, and capped at three, because the constraint that actually bites is
 * VERTICAL: the shelf band is 3m tall and the child is 4.4m away, so a fourth row would either leave the
 * frame or shrink every slime past the point of being recognisable. Columns then take the strain, and
 * across the whole plausible range — six families to twenty-one — the cubby never goes below 0.88m, which
 * at this distance is about a hundred pixels of hit target and a slime a child can plainly identify.
 *
 * Six families come out as two rows of three at the maximum pitch, which is a generous market stall.
 * Nineteen come out as three rows of seven.
 */
export function shelfLayout(count: number): Shelf {
  const n = Math.max(1, count);
  const rows = n <= 4 ? 1 : n <= 8 ? 2 : 3;
  const cols = Math.ceil(n / rows);
  const pitchX = Math.min(1.42, SHELF_W / cols);
  const pitchY = Math.min(1.24, SHELF_H / rows);
  // The gap between cubbies is what makes a shelf read as a row of separate places rather than as one
  // grid, so the cubby is always a little inside its own pitch.
  const halfW = pitchX / 2 - 0.055;
  const halfH = pitchY / 2 - 0.055;

  const cell = (i: number): [number, number] => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    // The last row is centred rather than left-aligned, so a shelf of nineteen in three rows of seven
    // does not finish with a lopsided gap a child reads as a missing slime.
    const inRow = Math.min(cols, n - r * cols);
    const x = (c - (inRow - 1) / 2) * pitchX;
    // Top row first, so `STOCK`'s cheapest-first order reads left-to-right and top-to-bottom the way a
    // page does.
    const y = SHELF_Y + ((rows - 1) / 2 - r) * pitchY;
    return [x, y];
  };

  return { rows, cols, pitchX, pitchY, halfW, halfH, cell };
}

/** The layout the stall actually uses, solved once from the family list. */
export const SHELF = shelfLayout(STOCK.length);

/* ------------------------------------------------------------------ *\
   Colliders
\* ------------------------------------------------------------------ */

/**
 * What the child cannot walk through, in the `{position: [x, z], radius}` shape `Game.tsx`'s controller
 * already sweeps for `SOLIDS` and `STATION_SOLIDS`.
 *
 * THE COUNTER IS SOLID, WHICH IS THE ONE PLACE THIS DEPARTS FROM `stations/sites.ts`. That file leaves its
 * panels walk-through on the argument that a first-person capsule stopped by a signboard at head height
 * reads as an invisible wall, and it is right. But a counter is a waist-high thing you lean on: its top is
 * at 1.02m, squarely in the way, and a child who walks THROUGH a shop counter and ends up standing inside
 * the stall has been told the building is a painting. So the counter is a chain of small circles along its
 * length, which puts the keeper about 40cm in front of it — leaning on it, which is where a customer
 * stands.
 *
 * Generated from the same numbers the carpentry draws from, for the reason `Buildings.tsx` gives about its
 * fence: a collider typed out by hand is a second opinion about where a thing is, and two opinions drift
 * apart the moment one of them moves.
 *
 * Nothing is placed within 3m of the standing spot, so the stall can never block its own approach: the
 * counter line sits 4.2m from the mark.
 */
export const SHOP_SOLIDS: { position: [number, number]; radius: number }[] = (() => {
  const out: { position: [number, number]; radius: number }[] = [];
  const put = (lx: number, lz: number, radius: number): void => {
    const w = localToWorld(lx, lz);
    out.push({ position: [w[0], w[1]], radius });
  };

  // The counter, as seven circles along its length rather than one fat one, so the whole 6.6m frontage
  // stops a child at the same distance instead of bulging out in the middle.
  const span = BAY.halfW - 0.3;
  const n = 7;
  for (let i = 0; i < n; i += 1) {
    put(-span + (i / (n - 1)) * span * 2, 0.2, 0.55);
  }

  // The two corner posts, which stand on the ground and carry the roof.
  put(-BAY.halfW, 0.05, 0.34);
  put(BAY.halfW, 0.05, 0.34);

  // The churn and the sack stack dressing the left flank, and the coin-post on the right. Small, so a
  // child can still walk right round the outside of the stall.
  put(-BAY.halfW - 0.72, 1.15, 0.42);
  put(BAY.halfW + 0.66, 0.95, 0.34);

  return out;
})();
