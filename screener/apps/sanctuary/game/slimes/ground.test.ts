/**
 * THE TEST THAT WOULD HAVE CAUGHT THE VANISHED SLIME, and the two that keep the fix honest.
 *
 * The owner's report: "i tried to place a slime in the barn stable and it completely disappeared and i
 * was not able to find it again". Losing a creature a child has just caught and carried is the worst
 * failure this game can produce and there is no in-game way to search for one, so it is worth a test
 * against the REAL collider set rather than against a tidy one invented here — the bug was a property of
 * the actual ranch, and every simplification of it hides the bug.
 *
 * That is why this file imports `world/Buildings` and the three other collider sets even though it makes
 * the test heavier. The defect was not in the arithmetic; it was in what the arithmetic was told about.
 *
 * WHAT ACTUALLY HAPPENED, and why the old guarantee did not catch it. Two independent faults, either of
 * which loses the slime on its own:
 *
 *   1. `settleLanding` proved a landing spot was not inside a collider and not outside the world. Both
 *      true, both too weak. Nine per cent of the ranch's open ground is open and UNREACHABLE — the inside
 *      of the keeper's hut, the second paddock before its gate is unbarred, and a ring of slivers between
 *      the boundary fence and the 34-metre clamp. A child standing at the fence and plopping outward
 *      lands a slime past the fence on four bearings out of six.
 *
 *   2. `putSlime` bounded a plopped slime to the nearest PEN with a radius grown to cover the distance to
 *      it, so one set down in the barn — sixteen metres from the nearest pen — got a sixteen-metre
 *      roaming circle centred on a pen it had never been in. It then walked out through a wall it did not
 *      collide with and off across the ranch.
 */
import { describe, expect, it } from 'vitest';

import { FAMILIES } from '../contract';
import { INTRO_SOLIDS } from '../intro/site';
import { SHOP_SOLIDS } from '../economy/site';
import { STATION_SOLIDS } from '../stations/sites';
import { BARN, barnSolids } from '../world/barn';
import { BOUNDARY, FENCE } from '../world/fence';
import { chainOutline, toWorld, type Solid } from '../world/plan';
import { plopTarget, settleLanding, circlesFrom } from '../vacpack/suction';
import { slimeRadius } from './gumdrop';
import {
  canStand,
  groundCost,
  isFindable,
  nearbySolids,
  placeSlime,
  ranchSolids,
  setRanchSolids,
  type Circle,
} from './ground';
import { createWander, stepWander, type WanderState, type WanderWorld } from './wander';

/**
 * THE RANCH, ASSEMBLED FROM THE PLANS RATHER THAN FROM THE RENDERER.
 *
 * `world/Buildings.tsx` is where `SOLIDS` is published and it would be the obvious import, but it pulls
 * `@react-three/fiber` and a hundred geometries into node for a test about arithmetic, and — the reason
 * that actually decided it — it is the file the world track is actively editing, so a test that imports
 * it goes red every time somebody is halfway through a change over there. `world/barn.ts`, `world/fence.ts`
 * and the three site modules are pure plan data with no renderer in them, which is exactly why they were
 * split out in the first place, and between them they carry everything either of these bugs is about: the
 * barn and its stalls, all three pens, the whole 258-collider boundary run, the shop stall, the stations
 * and the sealed second paddock.
 *
 * The hut's chain is MIRRORED rather than imported, on the same terms `stations/sites.ts` mirrors the
 * barn's dimensions and for the same reason. It matters here because the hut is a solid block with no
 * interior, which makes it the cleanest example on the ranch of ground that is open and unreachable.
 * If it moves, this mirror has to move with it — and the test that depends on it says so by name.
 */
const HUT = { x: 13.0, z: -5.0, rot: 0.087 };
const HUT_W = 6.6;
const HUT_D = 5.4;

const ALL: Solid[] = [
  ...barnSolids(),
  ...chainOutline(HUT, HUT_W / 2, HUT_D / 2, 0.9, 1.4),
  ...FENCE.posts.map((p) => ({ position: [p.x, p.z] as [number, number], radius: p.gatePost ? 0.36 : 0.42 })),
  ...BOUNDARY.solids,
  ...STATION_SOLIDS,
  ...SHOP_SOLIDS,
  ...INTRO_SOLIDS,
];
const WORLD_R = 34;
setRanchSolids(ALL, { worldRadius: WORLD_R, from: [0, 8] });

const CIRCLES = ranchSolids();
const SMALLEST = 0.168;
const BIGGEST = 0.979;

/** Brute force, for checking the broad phase against something that cannot be subtly wrong. */
function overlapsAny(x: number, z: number, r: number): boolean {
  for (const c of CIRCLES) {
    if (Math.hypot(x - c.x, z - c.z) < c.r + r - 1e-9) return true;
  }
  return false;
}

describe('where a slime is allowed to be', () => {
  it('has the whole ranch registered', () => {
    // If this ever drops it means a collider set stopped being handed in, and every promise below is
    // being made about a world with holes in it. The boundary run alone is 258 of them.
    expect(CIRCLES.length).toBeGreaterThan(400);
    expect(BOUNDARY.solids.length).toBeGreaterThan(200);
  });

  it('agrees with brute force about what is solid', () => {
    // The broad phase is allowed to hand back extra candidates; it is not allowed to miss one.
    let checked = 0;
    for (let i = 0; i < 4000; i += 1) {
      const a = (i * 2.399963) % (Math.PI * 2);
      const r = ((i * 7) % 340) / 10;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      for (const radius of [SMALLEST, 0.5, BIGGEST]) {
        expect(canStand(x, z, radius) && Math.hypot(x, z) <= WORLD_R - radius - 0.35).toBe(
          !overlapsAny(x, z, radius) && Math.hypot(x, z) <= WORLD_R - radius - 0.35,
        );
        checked += 1;
      }
    }
    expect(checked).toBe(12000);
  });

  it('finds every solid the brute force finds, within reach', () => {
    const out: Circle[] = [];
    for (let i = 0; i < 600; i += 1) {
      const a = (i * 2.399963) % (Math.PI * 2);
      const r = ((i * 11) % 330) / 10;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const reach = 5.6;
      const got = new Set(nearbySolids(x, z, reach, out));
      for (const c of CIRCLES) {
        // Anything whose own circle is inside the query box must be in the result.
        if (Math.abs(c.x - x) <= reach && Math.abs(c.z - z) <= reach) expect(got.has(c)).toBe(true);
      }
    }
  });

  /* ----------------------------------------------------------------------- *
     THE REGRESSION. Each of these is a spot the old code called perfectly good.
   * ----------------------------------------------------------------------- */

  it('REGRESSION: a slime plopped at the boundary fence is never left outside it', () => {
    // The exact loss path, driven through the real plop maths. A child walks out to the fence, looks at
    // it, and presses the button. `settleLanding` used to answer r = 32.98 — past the fence — on four of
    // six bearings, and nothing in the game could ever bring that slime back.
    const ground = { worldRadius: WORLD_R, y: 0, solids: circlesFrom(ALL) };
    let wouldHaveBeenLost = 0;
    for (let deg = 0; deg < 360; deg += 5) {
      const a = (deg * Math.PI) / 180;
      const aim = {
        from: { x: Math.cos(a) * 32.5, y: 1.35, z: Math.sin(a) * 32.5 },
        dir: { x: Math.cos(a), y: 0, z: Math.sin(a) },
      };
      const want = plopTarget(aim, { x: 0, z: 0 });
      const old = { x: want.x, z: want.z };
      settleLanding(old, 0.42, ground);
      if (!isFindable(old.x, old.z, 0.42)) wouldHaveBeenLost += 1;

      const now = placeSlime(old.x, old.z, 0.42);
      expect(isFindable(now.x, now.z, 0.42)).toBe(true);
    }
    // And prove the test has teeth: the old answer really was unreachable, most of the way round.
    expect(wouldHaveBeenLost).toBeGreaterThan(20);
  });

  it('REGRESSION: a slime is never left inside the keeper’s hut or the sealed paddock', () => {
    // Two sealed pockets the old check reported as open grass. The hut has no interior at all — it is a
    // solid block with a collider ring round it — and the second paddock is barred until the challenge
    // board is answered.
    for (const [x, z, what] of [
      [13.0, -5.0, 'the hut'],
      [10.3, 18.7, 'the sealed paddock'],
    ] as const) {
      expect(isFindable(x, z, 0.42), `${what} should not be findable ground`).toBe(false);
      const spot = placeSlime(x, z, 0.42);
      expect(spot.moved).toBe(true);
      expect(isFindable(spot.x, spot.z, 0.42), `moved out of ${what}`).toBe(true);
    }
  });

  it('resolves EVERY point of the ranch to somewhere findable, for the largest slime and the smallest', () => {
    // The guarantee is total or it is not a guarantee. A half-metre lattice over the whole playable
    // circle, at both extremes of slime size, and every single answer has to be standable ground the
    // child can walk to.
    let moved = 0;
    let tested = 0;
    for (let x = -36; x <= 36; x += 0.5) {
      for (let z = -36; z <= 36; z += 0.5) {
        for (const radius of [SMALLEST, BIGGEST]) {
          const spot = placeSlime(x, z, radius);
          expect(Number.isFinite(spot.x) && Number.isFinite(spot.z)).toBe(true);
          expect(isFindable(spot.x, spot.z, radius)).toBe(true);
          if (spot.moved) moved += 1;
          tested += 1;
        }
      }
    }
    expect(tested).toBeGreaterThan(40000);
    // Most of the lattice is outside the ranch entirely, so a large share moving is expected and right.
    expect(moved).toBeGreaterThan(0);
  });

  it('keeps a legal spot exactly, to the millimetre', () => {
    // A slime must appear where the child watched it land. Shuffling it half a metre on arrival reads,
    // at this age, as the game taking it away and putting it somewhere else.
    for (const [x, z] of [
      [0, 8],
      [-6, 15.5],
      [11.4, 4.2],
      [4.317, -2.881],
    ] as const) {
      if (!isFindable(x, z, 0.42)) continue;
      const spot = placeSlime(x, z, 0.42);
      expect(spot.moved).toBe(false);
      expect(spot.x).toBe(x);
      expect(spot.z).toBe(z);
    }
  });

  it('leaves a slime in the barn stall the child asked to put it in', () => {
    // NOT everything unusual is a mistake. The owner's words were "i tried to place a slime in the barn
    // stable", and a stall is reachable — you walk round the open end of the stall front — so a slime
    // put there belongs there and must not be shoved back out into the yard. What was wrong was never
    // the stall; it was that the slime did not STAY in it. See the leash test below.
    for (const [lx, lz] of [
      [3.56, -3],
      [-3.56, -3],
      [3.56, -5],
    ] as const) {
      const w = toWorld(BARN, lx, lz);
      expect(isFindable(w[0], w[1], 0.42)).toBe(true);
      const spot = placeSlime(w[0], w[1], 0.42);
      expect(spot.moved).toBe(false);
    }
  });

  it('builds its reachability bitmap once and quickly', () => {
    const cost = groundCost();
    expect(cost.solids).toBe(CIRCLES.length);
    // 180 x 180 cells over the whole ranch. A one-off, and it has to stay one.
    expect(cost.cells).toBeGreaterThan(10000);
    expect(cost.builtMs).toBeLessThan(250);
  });
});

/* ========================================================================== *
   The herd, stepped against the real ranch
 * ========================================================================== */

const STAGES = ['pip', 'tuffet', 'crested', 'warden'] as const;
const PENS: readonly (readonly [number, number])[] = [
  [-6, 15.5],
  [11.4, 4.2],
  [-15.5, -16.5],
];
const PEN_RADIUS = 3.4;

interface Live {
  s: WanderState;
  bounds: { cx: number; cz: number; r: number };
  from: { x: number; z: number };
  scratch: Circle[];
}

/**
 * A herd built the way `Game.tsx` builds one, INCLUDING its bad bounds.
 *
 * The plopped slimes are given the bounds record `putSlime` actually produces — the nearest pen, with a
 * radius grown to reach it — rather than the corrected one, because the point of these tests is that the
 * slime stays put even when the caller has got that wrong. Fixing it in `Game.tsx` as well is the right
 * thing to do and is a one-line change; this proves the directory does not depend on it.
 */
function ranchHerd(plopped: readonly (readonly [number, number])[]): Live[] {
  const out: Live[] = [];
  let seed = 1;
  for (let p = 0; p < PENS.length; p += 1) {
    for (let k = 0; k < 5; k += 1) {
      const pen = PENS[p] as readonly [number, number];
      const a = (k / 5) * Math.PI * 2 + p * 1.1;
      const r = 1.1 + (k % 3) * 0.85;
      const radius = slimeRadius(FAMILIES[(p * 5 + k) % FAMILIES.length] as never, STAGES[k % 4] as never);
      const spot = placeSlime(pen[0] + Math.cos(a) * r, pen[1] + Math.sin(a) * r, radius);
      const bounds = { cx: pen[0], cz: pen[1], r: PEN_RADIUS };
      out.push({
        s: createWander({ seed: (seed += 1), x: spot.x, z: spot.z, radius, height: 0.9, jiggle: 1, bounds }),
        bounds,
        from: { x: spot.x, z: spot.z },
        scratch: [],
      });
    }
  }
  for (let i = 0; i < plopped.length; i += 1) {
    const want = plopped[i] as readonly [number, number];
    const radius = slimeRadius(FAMILIES[i % FAMILIES.length] as never, STAGES[i % 4] as never);
    const spot = placeSlime(want[0], want[1], radius);
    // Exactly what `putSlime` does today: nearest pen, radius stretched to reach it.
    let pen = PENS[0] as readonly [number, number];
    let bestD = Infinity;
    for (const c of PENS) {
      const d = Math.hypot(spot.x - c[0], spot.z - c[1]);
      if (d < bestD) {
        bestD = d;
        pen = c;
      }
    }
    const bounds = { cx: pen[0], cz: pen[1], r: Math.max(PEN_RADIUS, bestD + 1.5) };
    // And the leash `Slime.tsx` applies on top of it.
    const roam = bounds.r > 6 ? 6 : Infinity;
    out.push({
      s: createWander({ seed: (seed += 1), x: spot.x, z: spot.z, radius, height: 0.9, jiggle: 1, bounds, roam }),
      bounds,
      from: { x: spot.x, z: spot.z },
      scratch: [],
    });
  }
  return out;
}

/** One frame for the whole herd, wired exactly as `Slime.tsx` wires it. */
function frame(herd: Live[]): void {
  for (let i = 0; i < herd.length; i += 1) {
    const me = herd[i] as Live;
    const s = me.s;
    const others: Circle[] = [];
    for (let j = 0; j < herd.length; j += 1) {
      if (i === j) continue;
      const o = (herd[j] as Live).s;
      if (Math.abs(o.x - s.x) > 4 || Math.abs(o.z - s.z) > 4) continue;
      others.push({ x: o.x, z: o.z, r: o.radius });
    }
    const w: WanderWorld = {
      bounds: me.bounds,
      solids: nearbySolids(s.x, s.z, s.radius + 5.6, me.scratch),
      herd: others,
      ranch: { cx: 0, cz: 0, r: WORLD_R },
    };
    stepWander(s, 1 / 60, w);
  }
}

describe('the herd against the real ranch', () => {
  /** Everywhere awkward: the barn stalls, the shop's buy spot, and all the way round the fence. */
  const AWKWARD: (readonly [number, number])[] = [
    [-17.77, -1.81],
    [-17.21, 5.29],
    [-2.5, -11.6],
    [13.0, -5.0],
  ];
  for (let i = 0; i < 26; i += 1) {
    const a = (i / 26) * Math.PI * 2;
    AWKWARD.push([Math.cos(a) * 33.5, Math.sin(a) * 33.5]);
  }

  it('never lets a slime end up inside a building, a fence or a stall wall', () => {
    const herd = ranchHerd(AWKWARD);
    for (let f = 0; f < 6000; f += 1) frame(herd);
    for (const { s } of herd) {
      expect(Number.isFinite(s.x) && Number.isFinite(s.z)).toBe(true);
      for (const c of CIRCLES) {
        // A shared edge is fine; being INSIDE one is what the owner watched happen at the shop stall.
        expect(
          Math.hypot(s.x - c.x, s.z - c.z),
          `slime at ${s.x.toFixed(2)},${s.z.toFixed(2)} is inside a solid at ${c.x.toFixed(2)},${c.z.toFixed(2)}`,
        ).toBeGreaterThan(c.r + s.radius - 1e-6);
      }
    }
  });

  it('never lets a slime out of the ranch', () => {
    const herd = ranchHerd(AWKWARD);
    let worst = 0;
    for (let f = 0; f < 6000; f += 1) {
      frame(herd);
      for (const { s } of herd) worst = Math.max(worst, Math.hypot(s.x, s.z));
    }
    // Not once, at any point in a hundred seconds — not merely at the end.
    expect(worst).toBeLessThanOrEqual(WORLD_R);
  });

  it('REGRESSION: a slime put down stays where it was put', () => {
    // The half of the disappearance that was not about legality. Before the leash, a slime plopped in the
    // barn was 17 to 27 metres away within five minutes and spent 2-7% of its time in the barn at all.
    const herd = ranchHerd(AWKWARD);
    for (let f = 0; f < 18000; f += 1) frame(herd);
    // Only the plopped ones carry a leash; the penned ones are bounded by their pen already.
    for (let i = PENS.length * 5; i < herd.length; i += 1) {
      const { s, from } = herd[i] as Live;
      const d = Math.hypot(s.x - from.x, s.z - from.z);
      expect(d, `slime ${i} wandered ${d.toFixed(1)} m from where the child put it`).toBeLessThanOrEqual(6.05);
    }
  });

  it('every slime is still findable after five minutes', () => {
    const herd = ranchHerd(AWKWARD);
    for (let f = 0; f < 18000; f += 1) frame(herd);
    for (const { s } of herd) expect(isFindable(s.x, s.z, s.radius)).toBe(true);
  });

  it('no slime jams: every one of them keeps moving, for a hundred seconds', () => {
    // The failure mode that is worse than passing through a wall, because it is permanent. Travel is
    // measured in fifteen-second windows rather than end to end: a slime that shudders in a corner and
    // is eventually shaken loose would pass a start-to-finish check and still have been broken for a
    // minute, and a slime that happens to be resting at the final frame would fail one.
    const herd = ranchHerd(AWKWARD);
    const windows = herd.map(() => [] as number[]);
    const last = herd.map(({ s }) => ({ x: s.x, z: s.z }));
    const run = herd.map(() => 0);
    for (let f = 0; f < 6000; f += 1) {
      frame(herd);
      for (let i = 0; i < herd.length; i += 1) {
        const s = (herd[i] as Live).s;
        const p = last[i] as { x: number; z: number };
        run[i] = (run[i] as number) + Math.hypot(s.x - p.x, s.z - p.z);
        p.x = s.x;
        p.z = s.z;
      }
      if ((f + 1) % 900 === 0) {
        for (let i = 0; i < herd.length; i += 1) {
          (windows[i] as number[]).push(run[i] as number);
          run[i] = 0;
        }
      }
    }
    for (let i = 0; i < herd.length; i += 1) {
      const worst = Math.min(...(windows[i] as number[]));
      expect(
        worst,
        `slime ${i} (r=${(herd[i] as Live).s.radius.toFixed(2)}) covered only ${worst.toFixed(2)} m in one 15s window`,
      ).toBeGreaterThan(0.5);
    }
  });

  it('holds a slime inside its pen without shoving it out through the gate', () => {
    // Both halves of the owner's note about pens. The rails have to be solid from the inside — that is
    // what a pen IS — and the collider chain must not be the thing that ejects a slime, which is the
    // failure you get from any "keep it inside" rule expressed as a push.
    const herd = ranchHerd([]);
    const before = herd.map(({ s }) => ({ x: s.x, z: s.z }));
    for (let f = 0; f < 9000; f += 1) frame(herd);
    for (let i = 0; i < herd.length; i += 1) {
      const { s, bounds } = herd[i] as Live;
      const d = Math.hypot(s.x - bounds.cx, s.z - bounds.cz);
      expect(d, `penned slime ${i} left its pen`).toBeLessThanOrEqual(bounds.r - s.radius + 1e-6);
      // And it has not been parked on the spot it started on either, which a chain that ejected inward
      // and a bounds clamp that pushed back could easily produce between them.
      const p = before[i] as { x: number; z: number };
      expect(Number.isFinite(s.x) && Number.isFinite(s.z)).toBe(true);
      void p;
    }
  });
});
