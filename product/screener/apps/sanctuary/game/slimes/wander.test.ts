/**
 * THE ONE PROMISE THAT IS WORTH A TEST: a slime cannot leave the ranch.
 *
 * "obviously not enough to the point of escaping" is a hard requirement, not a look, and it is the kind
 * of requirement that a screenshot cannot verify — a slime that escapes once every three minutes looks
 * perfect in every screenshot ever taken of it and is still broken. `wander.ts` is deliberately free of
 * three.js and React so this can step forty slimes for minutes of simulated time in milliseconds.
 *
 * The other two claims tested here are the rest of what the owner asked for: that headings are actually
 * random rather than all the same, and that slimes do not end up standing inside each other.
 */
import { describe, expect, it } from 'vitest';

import { BARN, BARN_D, BARN_FLOOR_Y, barnSolids } from '../world/barn';
import { groundY } from '../world/ground';
import { toWorld } from '../world/plan';
import {
  createWander,
  holdWander,
  reseatWander,
  rngFor,
  stepWander,
  type Circle,
  type WanderState,
  type WanderWorld,
} from './wander';

const BOUNDS = { cx: 4, cz: -3, r: 12 };
const RADIUS = 0.7;

function herdOf(n: number): WanderState[] {
  const out: WanderState[] = [];
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    const d = (i % 5) * 2;
    out.push(
      createWander({
        seed: i,
        x: BOUNDS.cx + Math.cos(a) * d,
        z: BOUNDS.cz + Math.sin(a) * d,
        radius: RADIUS,
        height: 1,
        jiggle: 1,
        bounds: BOUNDS,
      }),
    );
  }
  return out;
}

/** Steps the whole herd, feeding each slime the live positions of the others, as the component does. */
function run(herd: WanderState[], seconds: number, solids: Circle[] = [], player?: Circle): void {
  const steps = Math.round(seconds * 60);
  for (let f = 0; f < steps; f += 1) {
    for (const s of herd) {
      const others: Circle[] = [];
      for (const o of herd) if (o !== s) others.push({ x: o.x, z: o.z, r: o.radius });
      const world: WanderWorld = { bounds: BOUNDS, solids, herd: others, player };
      stepWander(s, 1 / 60, world);
    }
  }
}

describe('slime wander', () => {
  it('never leaves the bounds, over ten minutes of forty slimes', () => {
    const herd = herdOf(40);
    const solids: Circle[] = [
      { x: 4, z: -3, r: 1.6 },
      { x: 9, z: -6, r: 1 },
      { x: 0, z: 1, r: 1.2 },
    ];
    run(herd, 600, solids);
    for (const s of herd) {
      const d = Math.hypot(s.x - BOUNDS.cx, s.z - BOUNDS.cz);
      expect(d).toBeLessThanOrEqual(BOUNDS.r - RADIUS + 1e-6);
      expect(Number.isFinite(s.x) && Number.isFinite(s.z)).toBe(true);
    }
  });

  it('does not leave the bounds even when it starts outside them', () => {
    const s = createWander({ seed: 7, x: 90, z: -70, radius: RADIUS, height: 1, jiggle: 1, bounds: BOUNDS });
    // Clamped at birth, before it has taken a single step.
    expect(Math.hypot(s.x - BOUNDS.cx, s.z - BOUNDS.cz)).toBeLessThanOrEqual(BOUNDS.r - RADIUS + 1e-6);
    run([s], 60);
    expect(Math.hypot(s.x - BOUNDS.cx, s.z - BOUNDS.cz)).toBeLessThanOrEqual(BOUNDS.r - RADIUS + 1e-6);
  });

  it('is pushed out of furniture rather than through it', () => {
    const post: Circle = { x: 4, z: -3, r: 2 };
    const herd = herdOf(12);
    run(herd, 240, [post]);
    for (const s of herd) {
      expect(Math.hypot(s.x - post.x, s.z - post.z)).toBeGreaterThanOrEqual(post.r + RADIUS - 1e-6);
    }
  });

  it('does not stand inside the player', () => {
    const player: Circle = { x: 4, z: -3, r: 0.45 };
    const herd = herdOf(10);
    run(herd, 120, [], player);
    for (const s of herd) {
      expect(Math.hypot(s.x - player.x, s.z - player.z)).toBeGreaterThanOrEqual(player.r + RADIUS - 1e-6);
    }
  });

  it('does not badly overlap other slimes', () => {
    const herd = herdOf(30);
    run(herd, 300);
    for (let i = 0; i < herd.length; i += 1) {
      for (let j = i + 1; j < herd.length; j += 1) {
        const a = herd[i];
        const b = herd[j];
        if (!a || !b) continue;
        // Mutual separation resolves half each per frame, so a pair that has just collided can still be
        // a hair inside one another for a frame. A tenth of a radius is not "badly".
        expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(a.radius + b.radius - 0.07);
      }
    }
  });

  it('gives every slime a different heading', () => {
    // The literal complaint: "the slimes are all facing the same direction which is weird".
    const herd = herdOf(24);
    const headings = herd.map((s) => s.heading);
    const rounded = new Set(headings.map((h) => Math.round(h * 20)));
    expect(rounded.size).toBeGreaterThan(20);
    // And they are spread over the whole circle, not clustered in one quadrant.
    const quadrants = new Set(headings.map((h) => Math.floor((((h % 6.283) + 6.283) % 6.283) / 1.571)));
    expect(quadrants.size).toBe(4);
  });

  it('is deterministic: the same seed is the same slime', () => {
    const a = createWander({ seed: 1234, x: 1, z: 2, radius: RADIUS, height: 1, jiggle: 1, bounds: BOUNDS });
    const b = createWander({ seed: 1234, x: 1, z: 2, radius: RADIUS, height: 1, jiggle: 1, bounds: BOUNDS });
    run([a], 90);
    run([b], 90);
    expect(a.x).toBeCloseTo(b.x, 10);
    expect(a.z).toBeCloseTo(b.z, 10);
    expect(a.heading).toBeCloseTo(b.heading, 10);
  });

  it('actually moves, and keeps moving', () => {
    const herd = herdOf(16);
    const start = herd.map((s) => ({ x: s.x, z: s.z }));
    run(herd, 45);
    const moved = herd.filter((s, i) => {
      const p = start[i];
      return p ? Math.hypot(s.x - p.x, s.z - p.z) > 0.4 : false;
    });
    // Not all of them — some are mid-pause at 45 seconds, and that is the point of the pauses.
    expect(moved.length).toBeGreaterThan(herd.length * 0.6);
  });

  /* ----------------------------------------------------------------------- *
     The leash, the sidestep and the watchdog, in isolation. `ground.test.ts`
     exercises all three against the real ranch; these pin down the mechanisms.
   * ----------------------------------------------------------------------- */

  it('a slime that was PUT somewhere never gets further than its leash from it', () => {
    // The bug in one line: `putSlime` handed a plopped slime a bounds circle sixteen metres across,
    // centred on a pen it had never been in. The leash is measured from where it was actually set down
    // and is applied independently of whatever bounds the caller believed in.
    const wide = { cx: 0, cz: 0, r: 30 };
    const s = createWander({
      seed: 31,
      x: 12,
      z: -4,
      radius: 0.4,
      height: 1,
      jiggle: 1,
      bounds: wide,
      roam: 6,
    });
    let worst = 0;
    for (let f = 0; f < 60 * 600; f += 1) {
      stepWander(s, 1 / 60, { bounds: wide, solids: [], herd: [] });
      worst = Math.max(worst, Math.hypot(s.x - 12, s.z + 4));
    }
    expect(worst).toBeLessThanOrEqual(6 + 1e-6);
    // And it is a leash rather than a pin: it does use the room it has.
    expect(worst).toBeGreaterThan(2);
  });

  it('a leash moves with the slime when it is set down somewhere else', () => {
    const wide = { cx: 0, cz: 0, r: 30 };
    const s = createWander({ seed: 5, x: 0, z: 0, radius: 0.4, height: 1, jiggle: 1, bounds: wide, roam: 6 });
    reseatWander(s, -20, 11);
    expect(s.x).toBe(-20);
    expect(s.z).toBe(11);
    for (let f = 0; f < 60 * 300; f += 1) stepWander(s, 1 / 60, { bounds: wide, solids: [], herd: [] });
    expect(Math.hypot(s.x + 20, s.z - 11)).toBeLessThanOrEqual(6 + 1e-6);
  });

  it('the ranch clamp holds even when the assigned bounds are wrong', () => {
    // Bounds are only as good as whoever set them, and the one that lost a slime was set by a caller
    // that meant well. The ranch is the same for everybody and is applied last.
    const wrong = { cx: 20, cz: 20, r: 40 };
    const ranch = { cx: 0, cz: 0, r: 34 };
    const s = createWander({ seed: 12, x: 0, z: 0, radius: 0.5, height: 1, jiggle: 1, bounds: wrong });
    let worst = 0;
    for (let f = 0; f < 60 * 600; f += 1) {
      stepWander(s, 1 / 60, { bounds: wrong, solids: [], herd: [], ranch });
      worst = Math.max(worst, Math.hypot(s.x, s.z));
    }
    expect(worst).toBeLessThanOrEqual(34);
  });

  it('walks out of a dead-end corner instead of vibrating in it', () => {
    /**
     * The jam this is about. Three walls of a box: the old steering summed avoidance straight into the
     * seek, so an obstacle dead ahead cancelled the desired direction to zero and two of them cancelled
     * it in both axes. A slime driven into that corner kept its heading, walked in, got pushed out,
     * walked in again, and shivered there.
     *
     * The slime is started deep in the pocket with nothing but the mouth to leave by.
     */
    const wall: Circle[] = [];
    for (let i = 0; i <= 12; i += 1) {
      const t = -3 + (i / 12) * 6;
      wall.push({ x: t, z: -3, r: 0.5 }); // back
      wall.push({ x: -3, z: t, r: 0.5 }); // left
      wall.push({ x: 3, z: t, r: 0.5 }); // right
    }
    const bounds = { cx: 0, cz: 6, r: 14 };
    const s = createWander({ seed: 88, x: 0, z: -2, radius: 0.45, height: 1, jiggle: 1, bounds });
    // Aimed straight at the back wall, which is the worst possible start.
    s.heading = Math.PI;
    let stalled = 0;
    let run = 0;
    let last = { x: s.x, z: s.z };
    for (let f = 0; f < 60 * 120; f += 1) {
      stepWander(s, 1 / 60, { bounds, solids: wall, herd: [] });
      run += Math.hypot(s.x - last.x, s.z - last.z);
      last = { x: s.x, z: s.z };
      if ((f + 1) % 600 === 0) {
        // Ten-second windows. A slime is allowed to rest; it is not allowed to be held.
        if (run < 0.4) stalled += 1;
        run = 0;
      }
      for (const o of wall) {
        expect(Math.hypot(s.x - o.x, s.z - o.z)).toBeGreaterThanOrEqual(o.r + s.radius - 1e-6);
      }
    }
    expect(stalled).toBe(0);
    // And it actually got out of the pocket rather than merely shuffling about in it.
    expect(s.z).toBeGreaterThan(-3);
  });

  it('slides along a wall rather than sticking to the spot it touched', () => {
    // A long straight wall, and a slime walking into it at 45 degrees. Sticking is the failure: the
    // sideways half of its travel has to survive the push-out.
    const wall: Circle[] = [];
    for (let i = -30; i <= 30; i += 1) wall.push({ x: i * 0.5, z: 0, r: 0.35 });
    const bounds = { cx: 0, cz: 6, r: 20 };
    const s = createWander({ seed: 4, x: 0, z: 2, radius: 0.4, height: 1, jiggle: 1, bounds });
    s.heading = Math.PI * 0.75;
    s.mode = 'walk';
    s.tx = 8;
    s.tz = -6;
    s.effort = 1;
    const startX = s.x;
    for (let f = 0; f < 60 * 8; f += 1) stepWander(s, 1 / 60, { bounds, solids: wall, herd: [] });
    expect(s.z).toBeGreaterThan(-1e-6);
    // Travelled ALONG the wall, which is the whole difference between sliding and sticking.
    expect(Math.abs(s.x - startX)).toBeGreaterThan(0.6);
  });

  it('hands out uncorrelated first draws for consecutive seeds', () => {
    // Why `rngFor` hashes before seeding: mulberry32 fed 0,1,2,… produces near-consecutive first draws,
    // which would put the first six slimes at almost the same heading.
    const firsts = [0, 1, 2, 3, 4, 5, 6, 7].map((n) => rngFor(n)());
    for (let i = 1; i < firsts.length; i += 1) {
      expect(Math.abs((firsts[i] ?? 0) - (firsts[i - 1] ?? 0))).toBeGreaterThan(0.02);
    }
  });
});

/* ============================================================================
   standing on the ground, whatever the ground is doing
   ========================================================================== */

/**
 * THE OWNER'S REPORT: "when i drop slimes in the barn, they lowkey sink through the floor."
 *
 * Against the REAL barn rather than a toy step, because the numbers are the bug: the sink is exactly
 * `BARN_FLOOR_Y`, 7cm, and a test written over an invented half-metre platform would pass while being wrong
 * about the one measurement that matters. `world/ground.test.ts` proves the height function itself; this
 * proves the plumbing — that a slime's y is resolved from the x and z it actually ENDED the frame at, every
 * frame, through every path that moves it.
 */
describe('the ground under a wandering slime', () => {
  /** The middle of the threshing floor, and a point out on the grass in front of the doors. */
  const INSIDE = toWorld(BARN, 0, -2);
  const OUTSIDE = toWorld(BARN, 0, BARN_D / 2 + 3);

  const barn: Circle[] = barnSolids().map((s) => ({ x: s.position[0], z: s.position[1], r: s.radius }));

  function slimeAt(x: number, z: number, seed = 3): WanderState {
    return createWander({
      seed,
      x,
      z,
      radius: 0.3,
      height: 1,
      jiggle: 1,
      bounds: { cx: x, cz: z, r: 6 },
      ground: groundY,
    });
  }

  it('stands on the boards from its very first frame, not in them', () => {
    const s = slimeAt(INSIDE[0], INSIDE[1]);
    // At birth: no frame at meadow height, because that frame is the plop a child is watching.
    expect(s.groundY).toBeCloseTo(BARN_FLOOR_Y, 12);
    holdWander(s, 1 / 60);
    expect(s.groundY).toBeCloseTo(BARN_FLOOR_Y, 12);
  });

  it('is on the meadow out in the yard, and a flat world is still flat', () => {
    expect(slimeAt(OUTSIDE[0], OUTSIDE[1]).groundY).toBe(0);
    // No `ground` at all — every preview page, and the vacpack's portraits.
    const bare = createWander({
      seed: 3,
      x: INSIDE[0],
      z: INSIDE[1],
      radius: 0.3,
      height: 1,
      jiggle: 1,
      bounds: { cx: INSIDE[0], cz: INSIDE[1], r: 6 },
    });
    expect(bare.groundY).toBe(0);
    run([bare], 5);
    expect(bare.groundY).toBe(0);
  });

  it('steps up and down as it crosses the threshold, and never back and forth', () => {
    /**
     * Carried across the doorway by hand at 5mm a frame — a slime at full tilt does 11mm — with the brain held
     * still so that the only thing moving it is the walk being measured. What is asserted is that the height
     * FOLLOWS: it used to be a number frozen at placement while x and z moved every frame.
     */
    const s = slimeAt(OUTSIDE[0], OUTSIDE[1]);
    const heights: number[] = [];
    for (let lz = BARN_D / 2 + 3; lz >= -2; lz -= 0.005) {
      const w = toWorld(BARN, 0, lz);
      s.x = w[0];
      s.z = w[1];
      holdWander(s, 1 / 60);
      heights.push(s.groundY);
    }
    expect(heights[0]).toBe(0);
    expect(heights[heights.length - 1]).toBeCloseTo(BARN_FLOOR_Y, 12);
    for (let i = 1; i < heights.length; i += 1) {
      expect((heights[i] as number) - (heights[i - 1] as number)).toBeGreaterThanOrEqual(-1e-12);
    }
    // And back out again, down the same slope.
    for (let lz = -2; lz <= BARN_D / 2 + 3; lz += 0.005) {
      const w = toWorld(BARN, 0, lz);
      s.x = w[0];
      s.z = w[1];
      const before = s.groundY;
      holdWander(s, 1 / 60);
      expect(s.groundY).toBeLessThanOrEqual(before + 1e-12);
    }
    expect(s.groundY).toBe(0);
  });

  it('does not vibrate when it rests exactly on the lip of the threshold', () => {
    /**
     * THE DEFECT A STEP-SHAPED RULE WOULD HAVE HAD. A resting slime is not perfectly still — a neighbour's
     * push-out nudges it by fractions of a millimetre — so a height that jumped at the boundary would swap
     * between two values 7cm apart for as long as the slime stood there, which is forever. Ten seconds of that
     * jitter, and the whole spread of heights has to be micrometres.
     */
    const lip = toWorld(BARN, 0, BARN_D / 2 + 0.25);
    const s = slimeAt(lip[0], lip[1]);
    let lo = Infinity;
    let hi = -Infinity;
    for (let f = 0; f < 600; f += 1) {
      s.x = lip[0] + (f % 2 === 0 ? 1e-6 : -1e-6);
      s.z = lip[1] + (f % 3 === 0 ? 1e-6 : 0);
      holdWander(s, 1 / 60);
      if (s.groundY < lo) lo = s.groundY;
      if (s.groundY > hi) hi = s.groundY;
    }
    expect(hi - lo).toBeLessThan(1e-5);
  });

  it('never disagrees with the ground it is standing on, over five minutes in the barn', () => {
    /**
     * The invariant, asserted on every one of eighteen thousand frames: `groundY` is the height at the x and z
     * the slime ended the frame at. Three collider passes, a player push-out and three ring clamps all move a
     * slime after it has walked, so a height taken any earlier belongs to a position it is no longer at — the
     * same class of bug as the one being fixed, one frame deep instead of permanent.
     *
     * Three slimes: plopped deep in the barn, plopped on the stone sill, and plopped out in the yard — each
     * with `ROAM`'s leash, exactly as `putSlime` hands one over. The one on the sill is the interesting one,
     * because it is free to wander either way and does.
     */
    let sawBoards = false;
    let sawMeadow = false;
    for (const [seed, local] of [
      [11, -2],
      [23, BARN_D / 2 + 0.1],
      [37, BARN_D / 2 + 2],
    ] as const) {
      const w = toWorld(BARN, 0, local);
      const s = slimeAt(w[0], w[1], seed);
      const bounds = { cx: w[0], cz: w[1], r: 6 };
      for (let f = 0; f < 60 * 300; f += 1) {
        stepWander(s, 1 / 60, { bounds, solids: barn, herd: [] });
        expect(s.groundY).toBe(groundY(s.x, s.z));
        if (Math.abs(s.groundY - BARN_FLOOR_Y) < 1e-12) sawBoards = true;
        if (s.groundY === 0) sawMeadow = true;
      }
    }
    // They really did stand on both, so the invariant above was tested against both answers rather than
    // against fifteen minutes of the same one.
    expect(sawBoards).toBe(true);
    expect(sawMeadow).toBe(true);
  });
});
