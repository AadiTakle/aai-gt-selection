import { describe, expect, it } from 'vitest';

import { SHOP_SOLIDS } from '../economy/site';
import { STATION_SOLIDS } from '../stations/sites';
import { DOORWAY_WORLD, barnSolids } from './barn';
import { PENS, penGate } from './fence';
import {
  DRAFTS,
  LANES,
  NETWORK,
  buildNetwork,
  gapBetween,
  networkComponents,
  raisedTurfInsideDirt,
  regionsOf,
  walkGrass,
  type Network,
  type TrackDraft,
} from './paths';
import type { P2 } from './plan';

/**
 * THE OWNER'S SENTENCE, TURNED INTO ARITHMETIC.
 *
 * "the dirt ground path isn't connected in some of the spots, such as from some of the pens to the main
 * path and the barn to the main path. i don't want the patch of grass in between. the brown dirty
 * portion should be all cohesive and connected."
 *
 * Every claim in that sentence is measurable and none of it is settled by a screenshot, because a
 * screenshot only ever shows one junction from one angle — and the network has nine regions and six
 * junctions. So the shape of this file is: count the pieces, measure every gap, and check that no green
 * ridge is left lying across a mouth.
 *
 * `LEGACY` is what shipped before, kept here on purpose. A test that only asserts the fixed state cannot
 * tell you whether it is testing anything: run the same measurements over the old plan and they have to
 * FAIL in the specific way the owner described, or the measurement is not measuring the defect.
 */

const LEGACY: readonly TrackDraft[] = [
  {
    name: 'spine',
    points: [
      [1.4, 22],
      [0.4, 16.5],
      [-0.9, 10.5],
      [0.3, 4],
      [0.2, -3],
      [0, -8.6],
    ],
    width: 2.7,
    rutted: true,
    trunk: null,
  },
  {
    name: 'barn',
    points: [
      [-0.6, 2.6],
      [-3.6, 2.0],
      [-6.7, 1.2],
    ],
    width: 1.9,
    rutted: true,
    trunk: null,
  },
  {
    name: 'hut',
    points: [
      [0.7, -1.2],
      [4.8, -1.9],
      [9.2, -2.3],
      [12.3, -2.2],
    ],
    width: 1.9,
    rutted: false,
    trunk: null,
  },
  {
    name: 'pen1',
    points: [
      [2.6, 4.0],
      [5.4, 4.6],
    ],
    width: 1.6,
    rutted: false,
    trunk: null,
  },
];

const legacy = buildNetwork(LEGACY, PENS);

/** Where each spur is supposed to arrive. */
const DESTINATIONS: readonly (readonly [string, P2])[] = [
  ['barn doorway', [DOORWAY_WORLD[0], DOORWAY_WORLD[1]]],
  ['hut door', [13.45, -2.12]],
  ['pen0 gate', penGate(PENS[0]!).mid],
  ['pen1 gate', penGate(PENS[1]!).mid],
  ['pen2 gate', penGate(PENS[2]!).mid],
];

/** The nearest point of the main track — "the main path", in the owner's words. */
function onSpine(net: Network, p: P2): P2 {
  let best: P2 = [0, 0];
  let bd = Infinity;
  for (const st of net.stations[0] ?? []) {
    const d = Math.hypot(st.p[0] - p[0], st.p[1] - p[1]);
    if (d < bd) {
      bd = d;
      best = st.p;
    }
  }
  return best;
}

describe('the brown is one cohesive shape', () => {
  it('is a single connected region', () => {
    const after = networkComponents(NETWORK);
    expect(after.count, `pieces: ${JSON.stringify(after.groups)}`).toBe(1);
    // And every region is in it — a count of 1 over a list of 1 would pass vacuously.
    expect(after.groups[0]?.length).toBe(NETWORK.tracks.length + PENS.length);
  });

  it('was NOT one connected region before, which is what makes the test above mean something', () => {
    const before = networkComponents(legacy);
    expect(before.count).toBeGreaterThan(1);
    // The islands the owner would have been looking at: pen 1's yard and pen 2's yard, adrift.
    const alone = before.groups.filter((g) => g.length === 1).flat();
    expect(alone).toContain('pen2 yard');
  });
});

describe('every spur reaches the main track', () => {
  /**
   * Pen 2 is measured differently, and the exception is the point rather than a let-off.
   *
   * The other four spurs run where the eye expects them to, so the straight line from the destination to
   * the road is a fair test and it has to be all brown — a spur that bows off its own chord leaves a
   * crescent of meadow between two brown things, and that crescent WAS the owner's complaint for the barn
   * (3.4m of it) even though the two lanes overlapped at the junction.
   *
   * Pen 2's chord is blocked by the shop and the log station, so its track goes the long way round on
   * purpose. Asserting "no grass on the chord" there would be asserting that a track should be laid
   * through a milk churn. So what is asserted instead is that the detour is EARNED: the chord really is
   * impassable. If somebody later moves the shop, this fails and the detour should be reconsidered.
   */
  it('leaves no grass on the walk from any destination to the road', () => {
    const rows: string[] = [];
    for (const [name, p] of DESTINATIONS) {
      if (name === 'pen2 gate') continue;
      const walk = walkGrass(NETWORK, p, onSpine(NETWORK, p));
      if (walk.longest > 0.001) {
        rows.push(`${name}: ${walk.total.toFixed(2)}m of grass, longest run ${walk.longest.toFixed(2)}m`);
      }
    }
    expect(rows.join('; ')).toBe('');
  });

  it("routes pen 2 the long way round because the short way is genuinely blocked", () => {
    const gate = penGate(PENS[2]!).mid;
    const to = onSpine(NETWORK, gate);
    const obstacles = [...STATION_SOLIDS, ...SHOP_SOLIDS];
    const KEEPER = 0.45;
    // Widest gap a keeper could find anywhere along the direct chord.
    let tightest = Infinity;
    const steps = 400;
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const x = gate[0] + (to[0] - gate[0]) * t;
      const z = gate[1] + (to[1] - gate[1]) * t;
      let clear = Infinity;
      for (const o of obstacles) {
        clear = Math.min(clear, Math.hypot(x - o.position[0], z - o.position[1]) - o.radius);
      }
      tightest = Math.min(tightest, clear);
    }
    // The direct line pinches below a keeper's own radius, so there is no lane to be had along it.
    expect(tightest).toBeLessThan(KEEPER);
    // And the route that was laid instead is comfortable, not merely legal.
    const li = NETWORK.tracks.findIndex((t) => t.name === 'pen2');
    let worst = Infinity;
    for (const st of NETWORK.stations[li] ?? []) {
      for (const o of obstacles) {
        worst = Math.min(worst, Math.hypot(st.p[0] - o.position[0], st.p[1] - o.position[1]) - o.radius);
      }
    }
    expect(worst).toBeGreaterThan(1.2);
  });

  it('and the same walk crossed metres of grass before', () => {
    // pen 2 was the worst: ten metres of meadow between its yard and the nearest dirt.
    const pen2 = walkGrass(legacy, penGate(PENS[2]!).mid, onSpine(legacy, penGate(PENS[2]!).mid));
    expect(pen2.longest).toBeGreaterThan(8);
    const pen1 = walkGrass(legacy, penGate(PENS[1]!).mid, onSpine(legacy, penGate(PENS[1]!).mid));
    expect(pen1.longest).toBeGreaterThan(4);
  });

  it('touches the spine with every spur, dirt to dirt', () => {
    const regions = regionsOf(NETWORK);
    const spine = regions.find((r) => r.name === 'spine');
    expect(spine).toBeTruthy();
    if (!spine) return;
    for (const spur of NETWORK.tracks.slice(1)) {
      const region = regions.find((r) => r.name === spur.name);
      expect(region, `no region for ${spur.name}`).toBeTruthy();
      if (!region) continue;
      expect(gapBetween(region, spine), `${spur.name} does not touch the spine`).toBe(0);
    }
  });

  it('roots every spur ON its trunk rather than near it', () => {
    for (let li = 1; li < NETWORK.tracks.length; li += 1) {
      const spec = NETWORK.tracks[li];
      const root = spec?.points[0];
      if (!spec || !root) continue;
      // The root is pushed PAST the trunk centreline, so it must be inside the trunk's own dirt.
      expect(NETWORK.trackDepth(0, root[0], root[1]), `${spec.name} root is off the trunk`).toBeGreaterThan(0);
    }
  });
});

describe('the junctions look like junctions', () => {
  it('leaves no raised turf standing inside another track', () => {
    const after = raisedTurfInsideDirt(NETWORK);
    expect(
      after.count,
      after.at ? `worst at (${after.at[0].toFixed(1)}, ${after.at[1].toFixed(1)}) y=${after.worst.toFixed(3)}` : '',
    ).toBe(0);
  });

  it('flares the mouth where a spur meets its trunk', () => {
    for (let li = 1; li < NETWORK.tracks.length; li += 1) {
      const spec = NETWORK.tracks[li];
      if (!spec || spec.mouthRoot <= 0) continue;
      /**
       * Measured against the lane's PLAIN half-width rather than against a point further along it. The
       * first version of this compared the root with the midpoint, which passes for a long spur and fails
       * for a short one — pen 0's whole run is 3.4m, so its "midpoint" is still inside both the root
       * flare and the tip flare and comes out wider than either end. The claim being made is "the mouth
       * is wider than the lane", so that is what it should compare with.
       */
      const plain = spec.width / 2;
      expect(NETWORK.halfWidth(li, 0), `${spec.name} has no mouth`).toBeGreaterThan(plain * 1.3);
    }
  });

  /**
   * THE ANTI-FIX GUARD.
   *
   * Widening the lanes until the gaps disappear would pass every connectivity test above and would
   * re-create the "smudged" complaint that had already been answered once by cutting the meadow's
   * de-saturation skirt from 6m to 3.4m. So the lane widths are pinned: connectivity was bought with
   * where the centrelines START and END, not with how fat they are.
   */
  it('did not widen a single lane to close a gap', () => {
    const widths = new Map(NETWORK.tracks.map((t) => [t.name, t.width]));
    expect(widths.get('spine')).toBe(2.7);
    expect(widths.get('barn')).toBe(1.9);
    expect(widths.get('hut')).toBe(1.9);
    expect(widths.get('pen1')).toBe(1.6);
    // The two new spurs are no wider than the narrow spur that already existed, give or take a tenth.
    expect(widths.get('pen0') ?? 9).toBeLessThanOrEqual(1.7);
    expect(widths.get('pen2') ?? 9).toBeLessThanOrEqual(1.7);
  });
});

describe('the strip still faces up', () => {
  /**
   * THE REGRESSION THAT SHOWS AS NOTHING AT ALL.
   *
   * A previous pass wound the lane strip along-then-across, which is `T x N` = DOWN, and the entire path
   * network vanished behind back-face culling: correct geometry, correct colours, nothing on screen. The
   * winding lives in `Buildings.tsx` as `(a, b, d)` with lane first and station second; what makes that
   * correct is the ORDER `section()` emits its lanes in, which is here. So this walks real triangles.
   */
  it('winds lane-first, station-second, for an upward normal', () => {
    let checked = 0;
    for (let li = 0; li < NETWORK.tracks.length; li += 1) {
      const stations = NETWORK.stations[li] ?? [];
      for (let i = 0; i < stations.length - 1; i += 4) {
        const s0 = stations[i];
        const s1 = stations[i + 1];
        if (!s0 || !s1) continue;
        const row0 = NETWORK.section(li, s0);
        const row1 = NETWORK.section(li, s1);
        for (let k = 0; k < LANES - 1; k += 3) {
          const a = row0[k];
          const b = row0[k + 1];
          const d = row1[k + 1];
          if (!a || !b || !d) continue;
          // Normal of (a, b, d) — the first triangle of each quad, exactly as it is indexed.
          const ux = b.x - a.x;
          const uy = b.y - a.y;
          const uz = b.z - a.z;
          const vx = d.x - a.x;
          const vy = d.y - a.y;
          const vz = d.z - a.z;
          const ny = uz * vx - ux * vz;
          expect(ny, `downward triangle on track ${li} at station ${i} lane ${k}`).toBeGreaterThan(-1e-9);
          checked += 1;
        }
      }
    }
    expect(checked).toBeGreaterThan(200);
  });

  it('emits its lanes outermost -X first, which is what that winding assumes', () => {
    const st = NETWORK.stations[0]?.[10];
    expect(st).toBeTruthy();
    if (!st) return;
    const row = NETWORK.section(0, st);
    expect(row.length).toBe(LANES);
    for (let k = 1; k < row.length; k += 1) {
      const prev = row[k - 1];
      const cur = row[k];
      if (!prev || !cur) continue;
      /**
       * Non-DEcreasing rather than strictly increasing, and the difference is the junction machinery
       * working. Where a lane's banks stand down over another track's dirt they are pulled all the way
       * in onto the toe, so ranks 3, 4 and 5 land on the same offset and the outer quads become
       * zero-area — which is exactly the point: a degenerate triangle draws nothing, so there is no
       * crest and no transparent fringe left lying across the mouth.
       */
      const prevU = (prev.x - st.p[0]) * st.n[0] + (prev.z - st.p[1]) * st.n[1];
      const curU = (cur.x - st.p[0]) * st.n[0] + (cur.z - st.p[1]) * st.n[1];
      expect(curU).toBeGreaterThanOrEqual(prevU - 1e-9);
    }
  });
});

describe('the new spurs are walkable', () => {
  /**
   * A track laid through a collider is a track a child cannot walk down, and the two new spurs run past
   * the shop stall and the felled-log station. Neither is visible from the other end of the route, so
   * this is exactly the kind of thing that only shows up when somebody plays it.
   */
  it('keeps the lane clear of the stations, the shop and the barn', () => {
    const obstacles = [...STATION_SOLIDS, ...SHOP_SOLIDS, ...barnSolids()];
    const KEEPER = 0.45;
    const tight: string[] = [];
    for (let li = 0; li < NETWORK.tracks.length; li += 1) {
      const spec = NETWORK.tracks[li];
      if (!spec) continue;
      for (const st of NETWORK.stations[li] ?? []) {
        for (const o of obstacles) {
          const d = Math.hypot(st.p[0] - o.position[0], st.p[1] - o.position[1]);
          // The centreline itself has to stay walkable: a keeper must fit between the middle of the
          // track and anything solid beside it.
          if (d < o.radius + KEEPER) {
            tight.push(`${spec.name} centreline is ${d.toFixed(2)}m from a ${o.radius}m collider`);
          }
        }
      }
    }
    expect([...new Set(tight)].slice(0, 4).join('; ')).toBe('');
  });
});
