import { VERBS, type Battery } from '../../shared/batteries';
import type { Family } from '../contract';

/**
 * WHERE THE THREE STATIONS STAND, and the arithmetic that puts them there.
 *
 * THREE STATIONS, ONE PER BATTERY, FOREVER. That is the owner's ruling and it is the shape of this file:
 * "i don't need there to be an infinite amount of battery question stations. i don't want there to
 * constantly be building new stations. if it's verbal, ALL questions at the verbal station should be
 * interchangeable at that station ... i don't want you to build something new and have the world be
 * overloaded with random stations, it should be that different STYLE of questions are appearing at the
 * same GENRE aka battery at each station."
 *
 * SO A SITE DECLARES A BATTERY AND A SET OF TYPES, never one type. The singular `typeCode` this file used
 * to carry was the whole problem: it made a station a synonym for an item type, so every newly drawable
 * style wanted a new building and the ranch would have grown a shed per question format. The coat wall is
 * now THE NONVERBAL STATION and presents figure matrices, stone-setting and carpet-weaving; the tide ledge
 * is THE QUANTITATIVE STATION and presents series, functions and balances; the day log is THE VERBAL
 * STATION. Which style a given round gets is decided upstream in `Game.tsx` — this file only says what a
 * station is ALLOWED to present, and `siteTypes` DERIVES even that from `shared/batteries.ts` crossed with
 * `DRAWN_TYPES`, so a new style joins the right station by being drawn and by nothing else. There is no
 * list here to forget to update.
 *
 * WHAT THIS REPLACED ORIGINALLY. Three HUD buttons in the corner of the screen: "i'm just a little
 * confused how these relate to the game in any way. they are random side buttons that essentially mean
 * nothing with no immediate benefit ... maybe it must be a physical thing on like an actual wall or
 * something that you can come back to". So each of the three is a built thing standing on the ranch, at a
 * place where a child would expect to find it: the coat wall bolted flat to the barn, the tide ledge at a
 * water's edge, the day log on a felled trunk.
 *
 * NOTHING HERE IS PLACED BY EYE. Every number below was checked against `world/Buildings.tsx`'s own
 * layout predicates before it was written down: no station or standing spot lands inside a building
 * footprint, inside a pen, on a worn path, inside the pod-wall apron, or where the tree scatter can put
 * a trunk. The three checks that mattered are named at each site.
 *
 * AND NO BAY IS SIZED BY EYE EITHER, which is the part that had to change when a station stopped being one
 * style. See the note above `BAYS`: a bay must now contain whichever of its battery's styles turns up,
 * those styles hang their shelves at different DEPTHS, and the answer is therefore a projection at the
 * child's eye rather than a comparison of half-extents. It was measured over all 934 items in the seven
 * banks on disk, not over a representative one.
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

/* ------------------------------------------------------------------ *\
   Which styles a station may present
\* ------------------------------------------------------------------ */

/**
 * The item types that have an in-world presentation. NECESSARY for a station to serve one, and since
 * the battery audit, no longer SUFFICIENT.
 *
 * `siteTypes` intersects this list with `VERBS`, and `shared/batteries.ts` now withdraws types that do
 * not belong to any CogAT battery — `SPA-XFORM-01` is drawn, is listed here, and is served nowhere,
 * which is the intended state and is asserted in `registry.test.ts`. The withdrawal lives in ONE place
 * and this is not it: do not prune this list to express a measurement decision, or there will be two
 * opinions about what a station may serve and they will drift.
 *
 * THE SINGLE SOURCE OF TRUTH FOR "IS THIS DRAWABLE", and it lives here rather than beside the components
 * for one structural reason: `Stations.tsx` imports this file, so this file cannot import `Stations.tsx`
 * to ask, and `Game.tsx`'s `IN_WORLD` is the same cycle one level up. What lives here is the LIST; what
 * lives in `Stations.tsx` is the list-to-component mapping, and `sites.test.ts` asserts the two agree so
 * they cannot drift apart in the one direction that matters — a type promised here and not drawn there
 * would fall through to the station's idle emblem and silently eat a round.
 *
 * `FLU-OPCHAIN-01` and `VER-RELPAIR-01` are deliberately absent: their banks exist and
 * the API will serve them, but nothing draws them yet. Adding one here after building its presentation is
 * the whole of what "a new question style" now costs — no new site, no new carpentry, no new verb wiring.
 * Re-run the bay measurement when you do, because a new style can widen its battery's worst case.
 */
export const DRAWN_TYPES: readonly string[] = [
  'FLU-MATRIX-01',
  'FLU-CARPET-01',
  'SPA-XFORM-01',
  'QUANT-SERIES-01',
  'QUANT-FUNC-01',
  'QUANT-BALANCE-01',
  'VER-SEQUENCE-01',
  /* Added when the sorting gate was built. Its pool is additionally gated in `server-plugin.ts`: 10 of
     its 37 small-band items cannot be answered from their pictures. Being drawable is necessary to reach
     a child; it is not sufficient. */
  'VER-SORTBOT-01',
];

/**
 * Every drawable type of a battery, in `VERBS` order, which is ascending tier.
 *
 * Derived rather than listed. A hand-written set per site is a second opinion about which styles belong to
 * which battery, and `shared/batteries.ts` already holds the first one.
 */
export function siteTypes(battery: Battery): readonly string[] {
  return VERBS.filter((v) => v.battery === battery && DRAWN_TYPES.includes(v.typeCode)).map((v) => v.typeCode);
}

/* ------------------------------------------------------------------ *\
   The bays, solved at the eye and measured over every item on disk
\* ------------------------------------------------------------------ */

/**
 * HOW BIG EACH STATION'S FRAME HAS TO BE, now that a station is a battery rather than a style.
 *
 * A BAY IS NOT SIZED BY COMPARING HALF-EXTENTS, and this is the number that a screenshot finds late and
 * arithmetic finds early. Every presentation hangs its shelf of candidates in FRONT of the panel plane —
 * `PodWall` by 3.1 units, `TideLine`, `StoneBed`, `Sprouter` and `BalanceBough` by about 2.3, `Weave` by
 * only 0.4, which that file argues at length. At the standing spot that shelf is up to a metre NEARER the
 * child than the bay's own posts, and a thing nearer the eye subtends more angle. So each element is
 * projected onto the plane of the board that has to contain it — posts at local z -0.10, sill at +0.04,
 * head beam at -0.06 — from the dock, at the keeper's own 1.5m eye height.
 *
 * MEASURED OVER ALL 934 ITEMS IN THE SEVEN BANKS, not over a representative one, because the binding case
 * is never the obvious one. For `FLU-MATRIX-01` it is a FOUR-option item rather than a six: four options
 * make a narrower shelf, so `fitScale` lets the whole panel grow from 0.324 to 0.429, and the shelf ends up
 * both wider on screen AND lower. The worst case of a set is not the worst-looking member of it.
 *
 *   battery        widest → post   lowest → sill   highest → head   set by
 *   Nonverbal          3.24            1.59            1.45         FLU-MATRIX-01 (every member)
 *   Quantitative       2.64            1.63            1.45         QUANT-BALANCE / SERIES / FUNC
 *   Verbal             1.81            1.44            1.49         VER-SEQUENCE-01
 *
 * THE PANEL IS NEVER SHRUNK TO FIT. The marks ARE the measurement — `marks.tsx` and `Weave.tsx` both spend
 * their whole length keeping mark size honest, and `Weave` pulls its own shelf forward by only 0.4 for
 * exactly that reason — so `FIT_W` stays and the bay grows.
 *
 * WHAT GREW, AND THE ONE PLACE IT COULD NOT.
 *
 *   Quantitative went 2.55 → 2.85 and 1.70 → 1.85, and its panel rose from 2.15 to 2.30 so the sill keeps
 *   the same relationship to the spring basin's rim that it has today. Margins: 0.21 past the posts, 0.25
 *   under the sill, 0.44 under the head beam. It stands free in the meadow, so there was nothing to stop
 *   it growing.
 *
 *   Verbal is unchanged at 2.55 x 1.70 and did not need to change: the day log is the narrowest of the
 *   three presentations and everything it draws sits AT the panel plane, so it has no parallax to pay and
 *   0.74m of width to spare. It is deliberately not shrunk to fit — a station is a landmark, and three
 *   frames of visibly different size read as three different kinds of thing.
 *
 *   Nonverbal grew only in height, 1.70 → 1.85, with its panel raised 2.3 → 2.5 so the sill keeps clear of
 *   the barn's 0.44m stone plinth. Its WIDTH is stuck at 2.55 and wants 3.24, and that is a real, stated,
 *   PRE-EXISTING shortfall rather than something the mixed types introduced: it is set by `FLU-MATRIX-01`,
 *   which the coat wall already serves alone today. The bay cannot grow, because the wall it is bolted to
 *   has no room — see `COAT_LOCAL_Z`, whose arithmetic caps any bay on that stretch at 2.725. The three
 *   ways out are all above this file's pay grade and are in the report: move the Nonverbal station off the
 *   barn wall, narrow `FIT_W` (which the rule above forbids), or pull `PodWall`'s shelf in from 3.1 toward
 *   `Weave`'s 0.4 (which is `game/screener/`, not this directory). Raising `dock` does not work: the shelf
 *   is already almost as wide as the biggest bay that wall can take, so it would need a dock of 15.8m.
 */
const BAYS: Record<Battery, { halfW: number; halfH: number }> = {
  Nonverbal: { halfW: 2.55, halfH: 1.85 },
  Quantitative: { halfW: 2.85, halfH: 1.85 },
  Verbal: { halfW: 2.55, halfH: 1.7 },
};

export interface StationSite {
  /**
   * The station's stable id: what `engaged` carries and what `Game.tsx` opens a round with.
   *
   * STILL A VERB ID, and specifically its battery's tier-1 verb — `coat`, `tide-line`, `log` — kept rather
   * than renamed because it is the key `Stations.tsx`, `Cradle.tsx` and the preview all address a station
   * by, and because the parent's beat title falls back on it. Read it as the NAME OF THIS STATION, not as
   * the one question it asks. What it may ask is `types`.
   */
  verbId: string;
  /** The battery this station IS. One station per battery, three forever. */
  battery: Battery;
  /**
   * Every style this station may present, in ascending tier. Always `siteTypes(battery)`.
   *
   * A SET, NEVER ONE, and the plural is the whole design — see the header. `Game.tsx` decides which member
   * a given round gets, so nothing in this directory chooses. What this directory guarantees is that every
   * member has a presentation (they come from `DRAWN_TYPES`) and that the station's bay contains all of
   * them at every item in their banks (see `BAYS`).
   */
  types: readonly string[];
  /**
   * DEPRECATED, unread, and present only so `economy/Shop.tsx` still compiles.
   *
   * That file describes the stall as a `StationSite` in order to borrow the stations' own invitation cues,
   * and it fills the fields it does not use with honest-but-unused values — `typeCode: 'none'` among them.
   * This directory may not edit `economy/`, so the field stays optional rather than being removed. Nothing
   * reads it; a station's styles are `types`, and the guard test asserts no real site sets this.
   */
  typeCode?: string;
  build: Build;
  /**
   * Centre of the panel's plane, world metres. Also the middle of what a child looks at: every
   * presentation is built about its own origin, and `extentOf` takes the larger of its two half-heights so
   * an asymmetric one still centres here.
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
    /**
     * DERIVED, never listed by hand.
     *
     * A literal array here would silently stop growing the day a new Nonverbal presentation is registered,
     * and the failure is invisible: the station keeps working, it just never shows the new style. That is
     * exactly how thirteen slime families sat unreachable for a night. `siteTypes` reads `VERBS` and the
     * drawn set, so registering a presentation is the whole job.
     *
     * Measured, so nobody has to trust it: a battery-wide pool serves both of its styles at every
     * threshold tried — `FLU-MATRIX:24 FLU-CARPET:18` over six sorties against the live API on 5203,
     * with `perDomain` coming back `fluid:42` and every other domain zero. The old collapse onto a
     * single type was `FLU-OPCHAIN-01` specifically, which is now retired outright.
     *
     * IT WAS THREE STYLES UNTIL THE BATTERY AUDIT. `SPA-XFORM-01` was half of everything this station
     * served — `spatial:24 fluid:24` over the same six sorties — and it is not a Nonverbal subtest;
     * `RETIRED` in `shared/batteries.ts` has the whole argument. Two styles here is the honest number,
     * and both are CogAT Figure Matrices, so it is two presentations of one subtest rather than two
     * subtests. `FLU-VENN-01` (Figure Classification) and `SPA-PUNCH-01` (Paper Folding) are the two
     * banks that would widen it for real.
     */
    types: siteTypes('Nonverbal'),
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
    /** Derived — see the note on the coat wall. Measured spread: `QUANT-BALANCE:3 QUANT-FUNC:3 QUANT-SERIES:2`. */
    types: siteTypes('Quantitative'),
    build: 'tideledge',
    /**
     * A spring basin, built here rather than borrowed. `Buildings.tsx` does have a trough, but it stands
     * INSIDE pen 1 — a nine-by-seven-metre enclosure — and a station needs 4.6m of clear standing room
     * on its axis, which that pen does not have without putting a child's back against a fence.
     *
     * (6.5, -13.5), and every one of `Buildings.tsx`'s keep-outs was checked at it and at its standing
     * spot: outside the arrival corridor (|x| < 5.5), nowhere near pen 1 or the windmill, 5.6m from the
     * nearest path centreline, and inside the 23m radius where the tree scatter never starts. It sits
     * inside the old pod-wall apron, which is not a keep-out but the opposite — that apron exists to keep
     * trees and props off the ground in front of where the wall used to stand, so it is the most reliably
     * empty patch on the ranch. Twenty-two metres from the arrival point and in frame slightly right as a
     * child spawns.
     *
     * MOVED TWICE, and both moves were away from the keeper's hut. The first pass put it at (7.5, -6.0),
     * two metres off the hut wall; the second at (8.5, -10.5), seven metres off it. Neither is a
     * collision — both are composition. The hut is the one building `Lighting.tsx` deliberately leaves in
     * shadow and gives warm lit windows to, so a station anywhere near it has a thatched roof and three
     * glowing panes competing with the thing a child is meant to be looking at, and there is no room on
     * that side to stand back and watch an egg hatch. From here the backdrop is meadow and treeline.
     */
    at: [6.5, 2.15, -13.5],
    /**
     * Turned mostly toward the arrival, and the compromise in that "mostly" is deliberate. Facing the
     * sightline squarely would put the normal at (-0.29, 0.96), whose dot with the sun's horizontal
     * bearing is 0.27, heading for the terminator — and the version of this that faced the arrival exactly
     * came out visibly grey. At -0.20 the normal is (-0.20, 0.98), the dot rises to 0.36, and the face is
     * still within 6° of pointing back up the path. The lantern light closes the rest of the gap.
     */
    yaw: -0.2,
    dock: 4.6,
    bay: { halfW: 2.55, halfH: 1.7 },
    families: ['waffle', 'rock'],
    seed: 2207,
  },
  {
    verbId: 'log',
    typeCode: 'VER-SEQUENCE-01',
    battery: 'Verbal',
    /**
     * Derived — see the note on the coat wall. Today this resolves to `VER-SEQUENCE-01` and
     * `VER-SORTBOT-01`, and it is about to resolve to something different in BOTH directions.
     *
     * `VER-SEQUENCE-01` IS ON ITS WAY OUT and is only still here because pulling it early would strand
     * this station on one style with a 27-item gated pool. `VER-RELPAIR-01` — Verbal Analogies, a real
     * CogAT Verbal subtest — is having its presentation built, and lands first. The order and the
     * one-commit rename that has to go with it are written out in `shared/batteries.ts` above `typesFor`;
     * `registry.test.ts` fails if the rename is skipped, because `Game.tsx` would otherwise call this
     * station Nonverbal and post its posterior to the wrong battery without saying anything.
     */
    types: siteTypes('Verbal'),
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

  /**
   * The sorting gate, and it is the one presentation whose APPARATUS is wider than its shelf.
   *
   * Every item of this type has exactly two `examplesIn` and one `examplesOut`, so the bins are a fixed
   * size and the shelf never wins the width — the 4-option shelf is 4.15 and the 3-option 3.23, against
   * the bins' outer edges at 4.37. Constant for both option counts, which is why there is no arithmetic
   * over `content` here.
   *
   * It also hangs its shelf AT the panel plane rather than 0.4 to 3.1 units in front of it, as the others
   * do, because a candidate nearer the camera renders larger and on a type whose question is "is this the
   * same KIND as those" a size difference is a false signal about membership. So it projects smaller than
   * its half-extents imply and has parallax to spare.
   */
  if (typeCode === 'VER-SORTBOT-01') {
    return { halfW: 4.37, halfH: 2.84 };
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

  /* ---------------------------------------------------------------- *\
     The four meadow types.

     MEASURED OFF THE COMPONENTS, NOT COPIED FROM THEM. The builder handed over four sets of numbers and
     three of the four were right; what follows is what re-deriving them found, because "it says so in its
     own constants" and "that is what it draws" are different claims.

     THE PATTERN IN ALL FOUR: the widest thing is the SHELF OF CANDIDATES, not the apparatus, exactly as
     `FLU-MATRIX-01` above; and the LOWEST thing is that shelf's plank, so the half-height is set from
     below rather than from above. All four are therefore asymmetric about their own origin — the stone
     bed reaches 2.28 up and 3.28 down — and `Math.max` of the two is taken, which is `VER-SEQUENCE-01`'s
     convention above and keeps the panel's centre at the site's own height.

     WHAT WAS WRONG WITH THE FALLBACK, precisely, since it was the whole reason for this block. `halfW`
     7.25 is `FLU-MATRIX-01`'s six-option width and none of these four is that wide: their true half-widths
     are 4.80 to 5.65, so the fallback under-scaled all four by between 22% and 28% — a panel a quarter
     smaller than the bay it hangs in, for no reason. `halfH` 3.5 UNDER-states three of the four (3.53,
     3.605 and 3.63), which is the more dangerous error of the two because an under-stated extent is a
     promise the fit cannot keep.
  \* ---------------------------------------------------------------- */

  if (typeCode === 'SPA-XFORM-01') {
    const g = (content.grid ?? {}) as Record<string, unknown>;
    const rows = typeof g.rows === 'number' ? Math.max(1, Math.round(g.rows)) : 4;
    const cols = typeof g.cols === 'number' ? Math.max(1, Math.round(g.cols)) : 4;
    // `StoneBed`'s tidal shelf is `2 * PAN_X + panW + 1.0` with `PAN_X` 2.85 and `panW = cols * 0.5 + 0.36`,
    // which is 9.06 on the 4x4 grid every one of the bank's 234 items uses. Derived rather than typed as
    // 9.06 so a grid that ever changes cannot leave the housing behind.
    const shelfW = 2 * 2.85 + (cols * 0.5 + 0.36) + 1.0;
    // The plank under the candidates hangs at `SHELF.y` -1.9, and its own underside is `optPanH/2 + 0.38`
    // below that plus half its 0.28 thickness. 3.28 on a 4-row grid.
    const optPanH = rows * 0.34 + 0.36;
    return {
      halfW: Math.max(shelfW, n * 2.1 + 0.8) / 2,
      halfH: 1.9 + optPanH / 2 + 0.38 + 0.14,
    };
  }

  if (typeCode === 'QUANT-FUNC-01') {
    // `2 * DISH_X + DISH_W` = 6.65 across the channel ends; the shelf is 2.2 per bundle plus 0.8.
    // The height is the 3-pair case, which is the tallest the bank produces: the stump's moss cap tops out
    // at `0.2 + (pairs - 1) * 1.25 + 0.66 + 0.29` = 3.65, and the candidate plank's underside is at 3.605.
    // Held as one constant because 3.65 is both the exact 3-pair figure and a correct bound for two.
    return { halfW: Math.max(6.65, n * 2.2 + 0.8) / 2, halfH: 3.65 };
  }

  if (typeCode === 'FLU-CARPET-01') {
    const c = (content.carpet ?? {}) as Record<string, unknown>;
    const raw = Array.isArray(c.cells) ? (c.cells as unknown[][]) : [];
    const rows = typeof c.rows === 'number' ? c.rows : raw.length || 1;
    const cols = typeof c.cols === 'number' ? c.cols : (raw[0]?.length ?? 1);
    // Both pitches lifted from `Weave`'s own layout block, so the housing cannot disagree with what it
    // draws. `matW` is `cols * matPitch + 0.5`; its rope border adds 0.09 either side, which never wins
    // because the candidate plank is always the wider of the two by at least 0.66m.
    const matPitch = Math.min(2.0, 7.8 / Math.max(1, cols), 4.35 / Math.max(1, rows));
    const optPitch = Math.min(2.25, 10.4 / n);
    // 3.53 covers both modes: a 3x3 mat's top border reaches 3.515, and a single row's candidate plank
    // reaches 3.53 downward. Neither exceeds it, and the mode is not known until the item arrives.
    return { halfW: Math.max(cols * matPitch + 0.5, n * optPitch + 0.8) / 2, halfH: 3.53 };
  }

  if (typeCode === 'QUANT-BALANCE-01') {
    const raw = Array.isArray(content.examples) ? (content.examples as unknown[]) : [];
    const ex = Math.max(1, raw.length);
    // Three things compete for the width and which one wins depends on the item: the limb (`BEAM_HALF * 2
    // + 1.6` = 7.0, fixed), the plank the swaps stand on (`ex * EX_PITCH + 0.6`), and the candidate shelf
    // (`n * OPT_PITCH + 0.8`). With four options the shelf wins at 10.6.
    // 3.63 is the candidate plank's underside, `SHELF.y` 2.5 plus `PAN_H/2 + 0.36 + 0.15`. It is below the
    // limb's mossy top at 3.31 in every case, including the 18 items with no swaps at all, where the whole
    // balance drops 0.95 and the plank is unmoved.
    return {
      halfW: Math.max(7.0, ex * 3.0 + 0.6, n * 2.45 + 0.8) / 2,
      halfH: 3.63,
    };
  }

  // Anything without a measured presentation gets the most cautious box there is. With all seven drawn
  // types measured above this is now unreachable in play, and it should stay unreachable: see the note on
  // `PRESENTATION` in `Stations.tsx` about what a missing type is allowed to fall through to.
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
      // The cradle post, which does stand on the ground. See `NEST_OUT`/`NEST_FWD` in `Cradle.tsx`.
      put(site, site.bay.halfW + 0.5, 1.25, 0.28);
      continue;
    }

    if (site.build === 'tideledge') {
      // The basin, as three circles along its length rather than one fat one, so a child can stand at
      // the water rather than being held off it.
      for (const lx of [-1.35, 0, 1.35]) put(site, lx, 0.95, 0.62);
      put(site, -site.bay.halfW, 0, 0.3);
      put(site, site.bay.halfW, 0, 0.3);
      put(site, site.bay.halfW + 0.5, 1.25, 0.28);
      continue;
    }

    // The felled trunk lies along local X behind the panel; its stumps carry the bay.
    for (const lx of [-2.0, -0.7, 0.7, 2.0]) put(site, lx, -1.3, 0.55);
    put(site, -site.bay.halfW, -0.1, 0.32);
    put(site, site.bay.halfW, -0.1, 0.32);
    put(site, site.bay.halfW + 0.5, 1.25, 0.28);
  }

  return out;
})();
