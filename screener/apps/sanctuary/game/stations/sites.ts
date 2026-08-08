import type { Battery } from '../../shared/batteries';
import type { Family } from '../contract';

/**
 * WHERE THE THREE STATIONS STAND, and the arithmetic that puts them there.
 *
 * WHAT THIS REPLACES. Three HUD buttons in the corner of the screen. The owner's note on them is the
 * whole brief for this directory: "i'm just a little confused how these relate to the game in any way.
 * they are random side buttons that essentially mean nothing with no immediate benefit ... maybe it
 * must be a physical thing on like an actual wall or something that you can come back to". So each of
 * the three is now a built thing standing on the ranch, at a place where a child would expect to find
 * it: the coat wall bolted flat to the barn, the tide ledge at a water's edge, the day log on a felled
 * trunk.
 *
 * NOTHING HERE IS PLACED BY EYE. Every number below was checked against `world/Buildings.tsx`'s own
 * layout predicates before it was written down: no station or standing spot lands inside a building
 * footprint, inside a pen, on a worn path, inside the pod-wall apron, or where the tree scatter can put
 * a trunk. The three checks that mattered are named at each site.
 *
 * THE ONE THING TAKEN ON FAITH. `Buildings.tsx` does not export `BARN`, its dimensions, or `toWorld`,
 * and this directory may not edit it. The barn block below therefore MIRRORS constants owned by that
 * file. If the barn ever moves, the coat wall moves with it only if these five numbers are updated
 * together — which is why they are quarantined in one block with this note on them rather than spread
 * through the carpentry.
 */

/* ------------------------------------------------------------------ *\
   Mirrored from world/Buildings.tsx. See the note above.
\* ------------------------------------------------------------------ */

const BARN = { x: -14.5, z: 1.5, rot: 1.65 } as const;
/** Across the roof slopes, i.e. the barn's local X. */
const BARN_W = 10.5;
/** Along the ridge, i.e. the barn's local Z. The big doors are on the +Z end. */
const BARN_D = 14;
/** The pens the buildings track actually fenced, as centres. A hatchling heads for the nearest. */
export const PEN_CENTRES: readonly (readonly [number, number])[] = [
  [-6, 15.5],
  [11.4, 4.2],
  [-15.5, -16.5],
];

/**
 * The barn's local (x, z) to world (x, z).
 *
 * Matches three's `rotation.y` exactly — `x' = x cos + z sin`, `z' = -x sin + z cos` — because the
 * carpentry for the coat wall is authored in the barn's frame and then handed a world transform. Typing
 * world coordinates for a board on a wall rotated 94.5° is how a sign ends up inside a building.
 */
function fromBarn(lx: number, lz: number): [number, number] {
  const c = Math.cos(BARN.rot);
  const s = Math.sin(BARN.rot);
  return [BARN.x + lx * c + lz * s, BARN.z - lx * s + lz * c];
}

/* ------------------------------------------------------------------ *\
   The coat wall's mounting, solved rather than chosen
\* ------------------------------------------------------------------ */

/**
 * Which barn wall, and why this one.
 *
 * The barn presents its door end to the middle of the ranch — `fromBarn(0, 7)` is (-7.5, 0.9), which is
 * where `Buildings.tsx`'s own barn-door path stops. That end is the brightest face (its own file
 * measures it at 0.76 of full sun) and it was the first candidate. It loses on furniture: the barn yard
 * puts three hay bales at local x 3.1..4.4 and three feed sacks at local x -3.4..-4.2, both between
 * local z 7.6 and 9.6 — which is exactly the ground a child has to stand on to see a panel on that end,
 * and exactly where the presentation's own shelf of choices would hang.
 *
 * So the coat wall goes on the LONG wall at local x = -5.25, the one facing +Z. Three reasons, in the
 * order they decided it:
 *
 *   - It is fourteen metres long and, between the lean-to (which occupies local z -5.3 to 0.5) and the
 *     rake at local z 7, it has a clear five-and-a-half-metre stretch with nothing in front of it.
 *   - Its normal comes out at (0.079, 0.997), and `Lighting.tsx` puts the sun's horizontal bearing at
 *     (0.843, 0.537). The dot is 0.60, so with elevation it lands at 0.56 of full sun — the second of
 *     the two faces that file describes as "unmistakably gold". A panel a child has to read may not sit
 *     on a terminator.
 *   - Pen 0 is at (-6, 15.5), nine metres away, so the slime that arrives has somewhere to go that the
 *     child can see from where they are standing.
 *
 * The panel's plane sits at local x = -5.65. The wall's face is at -5.25 and its battens stand 0.07 proud
 * of that; the extra 0.33 is `PodWall`'s own frame depth, which builds BACKWARD from its origin. Any
 * closer and the frame the pods hang on is inside the barn — which is exactly what the first pass did, and
 * from six metres away it read as pods painted on the boarding with nothing holding them.
 */
const COAT_LOCAL_X = -5.65;
/**
 * Along the wall. The bay is 2.55 wide either side, so it spans local z 1.05 to 6.15 — clear of the
 * lean-to, which ends at 0.5, and leaving room at 6.9 for the cradle post before the rake at 7.
 */
const COAT_LOCAL_Z = 3.6;

/* ------------------------------------------------------------------ *\
   Station records
\* ------------------------------------------------------------------ */

export type Build = 'coatwall' | 'tideledge' | 'daylog';

export interface StationSite {
  /** The verb id `Game.tsx` opens a round with. Matches `VERBS` in `shared/batteries.ts`. */
  verbId: string;
  typeCode: string;
  battery: Battery;
  build: Build;
  /**
   * Centre of the panel's plane, world metres. The three presentations are all built roughly
   * symmetrically about their own origin, so this is also the middle of what a child looks at.
   */
  at: readonly [number, number, number];
  /** `rotation.y`. Local +Z is the face the child stands in front of. */
  yaw: number;
  /**
   * How far out along +Z the keeper is docked while engaged.
   *
   * Not a comfort number. `PodWall`'s shelf of choices is up to 14.5 units wide before scaling and has
   * to be entirely on screen or an option is unreachable, while the panel itself wants to be as large
   * in frame as possible. Those pull opposite ways and the trade is fixed: with the panel scaled so its
   * widest element is `FIT_W`, the best available ratio puts the panel at a bit over half the screen
   * height, and 4.6m is where that lands for all three at a 62° vertical field. Closer and a six-option
   * shelf runs off the sides of a 4:3 window.
   */
  dock: number;
  /** The housing the panel hangs in, as half-extents. Fixed per station, not per item. */
  bay: { halfW: number; halfH: number };
  /**
   * Which slime families this station's rounds bring, cycled in order.
   *
   * Straight off `FAMILY_BATTERY` in `contract.ts`, which already pairs two families to each battery.
   * This is flavour and nothing else: which family arrives depends on WHICH STATION was visited, never
   * on anything the child chose there.
   */
  families: readonly Family[];
  /** Stable per-station variation for the hatchling. Same station, same little creature. */
  seed: number;
}

export const SITES: readonly StationSite[] = [
  {
    verbId: 'coat',
    typeCode: 'FLU-MATRIX-01',
    battery: 'Nonverbal',
    build: 'coatwall',
    /**
     * `fromBarn(-5.65, 3.6)` = (-10.46, 6.85). Out at -5.65 rather than hard against the -5.25 wall
     * face because `PodWall` builds its own frame 0.7 units BEHIND its origin, which at the largest
     * scale it ever takes is 0.30m — so any less clearance and the frame the pods hang on is inside the
     * barn. The panel's centre is at 2.3m: its bottom lands at 0.8m and its roof at 4.52m, between the
     * barn's own 0.44m stone footing and its 5.44m eave soffit.
     */
    at: [fromBarn(COAT_LOCAL_X, COAT_LOCAL_Z)[0], 2.3, fromBarn(COAT_LOCAL_X, COAT_LOCAL_Z)[1]],
    /**
     * The outward normal of the barn's -X wall is `(-cos rot, sin rot)`, which is `(sin θ, cos θ)` for
     * θ = rot - π/2. So the coat wall's yaw is the barn's own rotation turned a quarter turn, and it
     * cannot drift out of agreement with the wall it is bolted to.
     */
    yaw: BARN.rot - Math.PI / 2,
    dock: 4.6,
    bay: { halfW: 2.55, halfH: 1.7 },
    families: ['frost', 'rose'],
    seed: 1301,
  },
  {
    verbId: 'tide-line',
    typeCode: 'QUANT-SERIES-01',
    battery: 'Quantitative',
    build: 'tideledge',
    /**
     * A spring basin, built here rather than borrowed. `Buildings.tsx` does have a trough, but it stands
     * INSIDE pen 1 — a nine-by-seven-metre enclosure — and a station needs 4.6m of clear standing room
     * on its axis, which that pen does not have without putting a child's back against a fence.
     *
     * (7.5, -6.0) instead, and every one of `Buildings.tsx`'s keep-outs was checked at it: outside the
     * arrival corridor (|x| < 5.5), 10.3m from the pod-wall apron's 9m radius, 5.4m outside the hut's
     * padded footprint, 5.9m outside pen 1's, 3.8m from the nearest path centreline, and inside the 23m
     * radius where the tree scatter never starts. Fifteen metres from the arrival point and in frame
     * on the right as a child spawns.
     */
    at: [7.5, 2.15, -6.0],
    /**
     * Turned to face the arrival, not the ranch centre: the normal points at (-0.47, 0.88), which aims
     * the basin back up the sightline a child walks in on. The standing spot that falls out of it,
     * (5.33, -1.94), lands within a centimetre of the hut path's centreline — so the mark on the ground
     * is on a track a child is already walking, which is the cheapest wayfinding there is.
     */
    yaw: -0.49,
    dock: 4.6,
    bay: { halfW: 2.55, halfH: 1.7 },
    families: ['waffle', 'rock'],
    seed: 2207,
  },
  {
    verbId: 'log',
    typeCode: 'VER-SEQUENCE-01',
    battery: 'Verbal',
    build: 'daylog',
    /**
     * A felled trunk with its sawn stumps still standing, out on the south-west meadow.
     *
     * (-11.0, -10.5): 11.3m from the pod-wall apron, 11.7m outside the barn's padded footprint, 2.1m
     * outside pen 2's, no path within 8m, and at 15.2m from the origin it is well inside the radius
     * where trees never scatter. Twenty-one metres from the arrival point and just inside the frame on
     * the left, so it reads as a landmark to walk toward rather than a thing to stumble on.
     */
    at: [-11.0, 2.2, -10.5],
    /** Faces the arrival: normal (0.51, 0.86). Standing spot (-8.65, -6.55), clear ground. */
    yaw: 0.536,
    dock: 4.6,
    bay: { halfW: 2.55, halfH: 1.7 },
    families: ['grass', 'fairy'],
    seed: 3109,
  },
];

export function siteFor(verbId: string | null): StationSite | null {
  if (!verbId) return null;
  return SITES.find((s) => s.verbId === verbId) ?? null;
}

/** A station's local (x, z) to world (x, z). Local +Z is the face the child stands in front of. */
export function localToWorld(site: StationSite, lx: number, lz: number): [number, number] {
  const c = Math.cos(site.yaw);
  const s = Math.sin(site.yaw);
  return [site.at[0] + lx * c + lz * s, site.at[2] - lx * s + lz * c];
}

/** The unit world vector the station faces, as (x, z). */
export function facingOf(site: StationSite): [number, number] {
  return [Math.sin(site.yaw), Math.cos(site.yaw)];
}

/**
 * Where the keeper is held while engaged, at a child's eye height.
 *
 * `KEEPER_HEIGHT` in `Game.tsx` is 1.5 and that file returns the camera to it the moment the keeper is
 * walking again, so docking to any other height would produce a hop on leaving.
 */
export function dockPoint(site: StationSite): [number, number, number] {
  const f = facingOf(site);
  return [site.at[0] + f[0] * site.dock, 1.5, site.at[2] + f[1] * site.dock];
}

/** The nearest fenced pen to a station, which is where its hatchlings head. */
export function penFor(site: StationSite): readonly [number, number] {
  let best = PEN_CENTRES[0] ?? ([0, 0] as const);
  let bestD = Infinity;
  for (const pen of PEN_CENTRES) {
    const d = Math.hypot(pen[0] - site.at[0], pen[1] - site.at[2]);
    if (d < bestD) {
      bestD = d;
      best = pen;
    }
  }
  return best;
}

/* ------------------------------------------------------------------ *\
   Panel fitting
\* ------------------------------------------------------------------ */

/**
 * How wide and how tall the scaled panel is allowed to be, in world metres.
 *
 * The height is the number that was wrong on the first pass and it was wrong in a way only a screenshot
 * shows: at 3.5 the panel is 3.5m tall, its centre has to sit at 1.9m or more to keep its bottom shelf out
 * of the grass, and the bay's own sill then lands at or below ground level on all three stations. 3.0
 * leaves the sill a comfortable third of a metre of daylight and costs about a tenth of the panel's
 * apparent size, which is a trade worth making for furniture that stands on the ground properly.
 */
const FIT_W = 4.7;
const FIT_H = 3.0;

/**
 * The half-extents one item's presentation occupies in its own units.
 *
 * Read off the three presentation files rather than guessed, because the numbers that decide this are
 * not the panel's — they are the SHELF OF CHOICES, which is the widest thing in all three and which
 * grows with the option count. `FLU-MATRIX-01` runs to six options and a six-option shelf is 14.5 units
 * wide against a 6.6-unit grid, so an item's scale has to come from its content or a hard six-option
 * item silently pushes two of its choices off the sides of the screen. 63 of that bank's 120 items have
 * four options and get to be half again as large for it, which is the good half of the same rule.
 *
 * All three presentations are built roughly symmetrically about their own origin — `PodWall` spans 3.3
 * up and 3.5 down, `TideLine` 2.8 and 3.1, `DayLog` 3.3 and 3.5 — so one half-height is enough and the
 * panel's centre can sit at the site's own height.
 */
export function extentOf(typeCode: string, content: Record<string, unknown>): { halfW: number; halfH: number } {
  const options = Array.isArray(content.options) ? (content.options as unknown[]) : [];
  const n = Math.max(1, options.length);

  if (typeCode === 'FLU-MATRIX-01') {
    const m = (content.matrix ?? {}) as Record<string, unknown>;
    const raw = Array.isArray(m.cells) ? (m.cells as unknown[][]) : [];
    const rows = typeof m.rows === 'number' ? m.rows : raw.length || 3;
    const cols = typeof m.cols === 'number' ? m.cols : (raw[0]?.length ?? 3);
    // `gap` 1.9, frame padding 0.9, shelf pitch 2.25 with 1.0 of plank past the ends.
    return {
      halfW: Math.max(cols * 1.9 + 0.9, n * 2.25 + 1.0) / 2,
      // The shelf hangs 2.4 below the origin and its hit volumes are 1.05 tall, so the floor is -3.45.
      halfH: Math.max((rows * 1.9 + 0.9) / 2, 3.5),
    };
  }

  if (typeCode === 'QUANT-SERIES-01') {
    // `SPAN_X` 8.7 plus 1.0 of carved bank either side; the shelf is 1.95 per portion plus 0.8.
    return { halfW: Math.max(9.7, n * 1.95 + 0.8) / 2, halfH: 3.2 };
  }

  if (typeCode === 'VER-SEQUENCE-01') {
    const events = Array.isArray(content.events) ? (content.events as unknown[]) : [];
    const e = Math.max(1, events.length);
    // Lifted from `DayLog`'s own layout block so the housing cannot disagree with what it draws.
    const slabPitch = Math.min(2.2, (8.0 - 0.4) / e);
    const rowW = e * slabPitch;
    const rowPitch = n >= 4 ? 1.14 : 1.44;
    const slabH = Math.min(1.0, rowPitch * 0.76);
    const logH = slabH + 0.95;
    const top = 2.4 + logH / 2;
    const bottom = 2.4 - logH / 2 - 0.3 - slabH - (n - 1) * rowPitch - 0.36;
    return { halfW: (rowW + 1.0) / 2, halfH: Math.max(top, -bottom) };
  }

  // Anything without a measured presentation gets the most cautious box there is.
  return { halfW: 7.25, halfH: 3.5 };
}

/**
 * The scale one item's presentation is mounted at.
 *
 * Clamped at the bottom so a pathological item cannot shrink itself into illegibility — it would run
 * off the sides instead, which is at least visible — and at the top so an easy two-by-two item does not
 * grow taller than the bay it hangs in.
 */
export function fitScale(typeCode: string, content: Record<string, unknown>): number {
  const e = extentOf(typeCode, content);
  const s = Math.min(FIT_W / (2 * e.halfW), FIT_H / (2 * e.halfH));
  return Math.max(0.24, Math.min(0.52, s));
}

/* ------------------------------------------------------------------ *\
   Colliders
\* ------------------------------------------------------------------ */

/**
 * What the child cannot walk through, in the same `{position: [x, z], radius}` shape `Game.tsx`'s
 * controller already sweeps for `SOLIDS`.
 *
 * Generated from the same numbers the carpentry draws from, for the reason `Buildings.tsx` gives about
 * its fence: a collider written out by hand is a second opinion about where a thing is, and two
 * opinions drift apart the moment one of them moves.
 *
 * DELIBERATELY NOT SOLID: the panel itself, its shelf, and the egg cradle. All three are above 1.2m and
 * a first-person capsule that is stopped by a signboard at head height reads as an invisible wall. The
 * uprights, the basin and the felled trunk are what actually occupy the ground, and they are what is
 * here. Nothing is placed within 3m of a standing spot, so a station can never block its own approach.
 */
export const STATION_SOLIDS: { position: [number, number]; radius: number }[] = (() => {
  const out: { position: [number, number]; radius: number }[] = [];

  const put = (site: StationSite, lx: number, lz: number, radius: number): void => {
    const w = localToWorld(site, lx, lz);
    out.push({ position: [w[0], w[1]], radius });
  };

  for (const site of SITES) {
    if (site.build === 'coatwall') {
      // The barn's own collider chain already walls this line off; these only stop a child sliding into
      // the two mounting posts from along the wall.
      put(site, -site.bay.halfW, 0.25, 0.28);
      put(site, site.bay.halfW, 0.25, 0.28);
      // The cradle post, which does stand on the ground.
      put(site, site.bay.halfW + 0.75, 0.3, 0.3);
      continue;
    }

    if (site.build === 'tideledge') {
      // The basin, as three circles along its length rather than one fat one, so a child can stand at
      // the water rather than being held off it.
      for (const lx of [-1.35, 0, 1.35]) put(site, lx, 0.95, 0.62);
      put(site, -site.bay.halfW, 0, 0.3);
      put(site, site.bay.halfW, 0, 0.3);
      put(site, site.bay.halfW + 0.75, 0.3, 0.3);
      continue;
    }

    // The felled trunk lies along local X behind the panel; its stumps carry the bay.
    for (const lx of [-2.0, -0.7, 0.7, 2.0]) put(site, lx, -1.3, 0.55);
    put(site, -site.bay.halfW, -0.1, 0.32);
    put(site, site.bay.halfW, -0.1, 0.32);
    put(site, site.bay.halfW + 0.75, 0.3, 0.3);
  }

  return out;
})();
