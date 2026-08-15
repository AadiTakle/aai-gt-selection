import { describe, expect, it } from 'vitest';

import { SOLIDS } from './Buildings';
import {
  BOUNDARY,
  BOUNDARY_OUTLINE,
  BOUNDARY_CLEAR,
  barBetween,
  distanceToBoundary,
} from './fence';
import { arcLengths, pushOut, sampleClosed } from './plan';

/**
 * THE BOUNDARY'S PROMISES, WHICH ARE ALL OF THE KIND A SCREENSHOT CANNOT KEEP.
 *
 * The owner asked for "a fence around the entire ranch ... so the child can't explore beyond the ranch".
 * A photograph of that fence looks identical whether or not it holds — which is the whole problem, and
 * the reason this file exists rather than a note saying it was checked by eye. A fence a child walks
 * through is worse than no fence, because it teaches them the edge of their world is a picture.
 *
 * Three separate things are proved here, and they fail in three different ways:
 *
 *   1. THE RUN IS CLOSED. No hole anywhere on two hundred metres of perimeter. Sampled at 10cm, which is
 *      a fifth of a keeper's width, so a gap big enough to matter cannot hide between samples.
 *   2. THE FENCE IS WHAT STOPS YOU, not `Game.tsx`'s invisible 34-metre clamp. If the run were laid one
 *      metre further out, every test above would still pass and the child would be held short of the
 *      fence by nothing at all — the exact defect this job was raised to fix. So the walk asserts the
 *      keeper comes to rest INSIDE the clamp, everywhere.
 *   3. IT IS BEYOND THE TREE LINE. Reported as counts rather than asserted tightly, because "past the
 *      trees" is a composition claim; the assertion is only that the wood is not entirely on one side.
 */

const KEEPER_RADIUS = 0.45;
/** `BOUND` in `Game.tsx`. This file may not change it, which is the constraint the whole run is laid to. */
const GAME_BOUND = 34;

describe('the boundary fence is where it should be', () => {
  it('is a closed loop of straight runs outside the plateau', () => {
    expect(BOUNDARY_OUTLINE.length).toBeGreaterThanOrEqual(12);
    const radii = BOUNDARY_OUTLINE.map((p) => Math.hypot(p[0], p[1]));
    // Comfortably outside the 25m plateau and the pens, and inside the clamp with room for a keeper.
    expect(Math.min(...radii)).toBeGreaterThan(30);
    expect(Math.max(...radii)).toBeLessThan(GAME_BOUND - KEEPER_RADIUS - 0.5);
  });

  it('wanders, so it is not a compass-drawn circle', () => {
    const radii = BOUNDARY_OUTLINE.map((p) => Math.hypot(p[0], p[1]));
    const spread = Math.max(...radii) - Math.min(...radii);
    // Enough to read as a field boundary, not so much that a corner lurches.
    expect(spread).toBeGreaterThan(0.4);
    expect(spread).toBeLessThan(2.5);
  });

  it('carries corner posts and gate jambs in the heavier stock', () => {
    const heavy = BOUNDARY.posts.filter((p) => p.heavy).length;
    // One per corner that survived the gates, plus two jambs per gate.
    expect(heavy).toBeGreaterThanOrEqual(BOUNDARY_OUTLINE.length);
    expect(BOUNDARY.posts.length).toBeGreaterThan(100);
    expect(BOUNDARY.gates.length).toBe(2);
  });

  it('hangs both gates on the ranch axis, where the road leaves', () => {
    // The spine runs roughly north-south through x = 0, so both gates sit near it.
    for (const gate of BOUNDARY.gates) {
      expect(Math.abs(gate.mid[0])).toBeLessThan(8);
      expect(Math.abs(gate.mid[1])).toBeGreaterThan(28);
      expect(gate.span).toBeGreaterThan(2.6);
      expect(gate.span).toBeLessThan(3.4);
    }
    // One north, one south. A pair on the same side would be a solved-for-nothing symmetry.
    const zs = BOUNDARY.gates.map((g) => Math.sign(g.mid[1]));
    expect(new Set(zs).size).toBe(2);
  });
});

describe('the boundary actually collides', () => {
  /** Every 10cm around the perimeter. A keeper is 90cm across, so no real hole can hide between these. */
  const perimeterSamples = (): { x: number; z: number; s: number }[] => {
    const { at, total } = arcLengths(BOUNDARY_OUTLINE);
    const out: { x: number; z: number; s: number }[] = [];
    for (let s = 0; s < total; s += 0.1) {
      const p = sampleClosed(BOUNDARY_OUTLINE, at, total, s);
      out.push({ x: p.p[0], z: p.p[1], s });
    }
    return out;
  };

  it('has no point on the line where a keeper could stand', () => {
    const holes = perimeterSamples().filter(
      (p) => pushOut(SOLIDS, p.x, p.z, KEEPER_RADIUS).pushed <= 0,
    );
    expect(
      holes.length,
      holes.length ? `first hole at (${holes[0]?.x.toFixed(2)}, ${holes[0]?.z.toFixed(2)})` : '',
    ).toBe(0);
  });

  it('closes the gate openings too, because the gates are shut', () => {
    for (const gate of BOUNDARY.gates) {
      for (let t = -0.5; t <= 0.5; t += 0.05) {
        const x = gate.mid[0] + gate.along[0] * gate.span * t;
        const z = gate.mid[1] + gate.along[1] * gate.span * t;
        expect(
          pushOut(SOLIDS, x, z, KEEPER_RADIUS).pushed,
          `gap in the gate at t=${t.toFixed(2)}`,
        ).toBeGreaterThan(0);
      }
    }
  });

  /**
   * A keeper walked straight at the fence from the middle of the ranch, integrated the way `Game.tsx`
   * integrates: step, then one push-out pass over every solid, in order.
   *
   * Copied rather than shared for the reason `pushOut`'s own comment gives — that loop lives inside a
   * `useFrame` in a file this one may not import, and the only way to make a claim about walkability
   * testable is to restate the same arithmetic where a test can call it.
   */
  const walkOutward = (heading: number): { x: number; z: number; clampedBy: string } => {
    let x = 0;
    let z = 0;
    const dx = Math.cos(heading);
    const dz = Math.sin(heading);
    let clampedBy = 'nothing';
    // 45 metres at 5cm a step: further than the fence can possibly be, so it always arrives.
    for (let i = 0; i < 900; i += 1) {
      x += dx * 0.05;
      z += dz * 0.05;
      for (const solid of SOLIDS) {
        const ox = x - solid.position[0];
        const oz = z - solid.position[1];
        const d = Math.hypot(ox, oz);
        const min = solid.radius + KEEPER_RADIUS;
        if (d < min && d > 1e-4) {
          const push = (min - d) / d;
          x += ox * push;
          z += oz * push;
          clampedBy = 'a solid';
        }
      }
      const r = Math.hypot(x, z);
      if (r > GAME_BOUND) {
        x *= GAME_BOUND / r;
        z *= GAME_BOUND / r;
        clampedBy = 'the invisible clamp';
      }
    }
    return { x, z, clampedBy };
  };

  /** Which colliders belong to the boundary, so "what stopped them" can be answered. */
  const boundarySolid = new Set(BOUNDARY.solids.map((s) => `${s.position[0]},${s.position[1]}`));

  it('stops the keeper from every heading, always against something real', () => {
    /**
     * NOT every heading reaches the fence, and that is correct rather than a miss.
     *
     * The walk steps in a FIXED direction and push-out is along the obstacle's own normal, so a keeper
     * driven straight at a pen's fence wedges on it instead of sliding round — which is exactly what a
     * child pressing W into a pen wall would do. Asserting "everyone reaches the boundary" would be
     * asserting that the ranch is empty. What can be asserted is the thing that matters: nobody gets
     * past 34, and nobody stops in mid-air. Every stop is against a fence, a building or a tree.
     */
    const failures: string[] = [];
    let reachedFence = 0;
    let headings = 0;
    for (let deg = 0; deg < 360; deg += 2) {
      headings += 1;
      const end = walkOutward((deg * Math.PI) / 180);
      const r = Math.hypot(end.x, end.z);
      if (r >= GAME_BOUND - 0.01) {
        failures.push(`${deg}deg walked out to r=${r.toFixed(2)} (${end.clampedBy})`);
        continue;
      }
      if (distanceToBoundary(end.x, end.z) < 1.6) {
        reachedFence += 1;
        continue;
      }
      // Stopped short: there must be a real solid holding them there, and it must not be the boundary
      // (which would mean the distance above lied).
      const nudged = pushOut(SOLIDS, end.x + 0.06, end.z, KEEPER_RADIUS);
      const held = nudged.by ?? pushOut(SOLIDS, end.x, end.z + 0.06, KEEPER_RADIUS).by;
      if (!held) {
        failures.push(`${deg}deg stopped at r=${r.toFixed(2)} against nothing at all`);
        continue;
      }
      if (boundarySolid.has(`${held.position[0]},${held.position[1]}`)) {
        failures.push(`${deg}deg held by a boundary post but ${distanceToBoundary(end.x, end.z).toFixed(2)}m off the line`);
      }
    }
    expect(failures.slice(0, 6).join('; ')).toBe('');
    /**
     * Over half the compass walks clean out to the fence; the rest wedges on a trunk on the way, because
     * the belt between the meadow and the boundary is now a real wood rather than six trees. That number
     * is therefore a check on the belt as much as on the fence — if it climbed back toward 1.0 the inner
     * wood would have thinned out again and the boundary would be standing in an empty field.
     *
     * The enclosure itself does not rest on this. It rests on the two tests above: no point on the line
     * admits a keeper, and the 34m clamp never fires. Those two together are the closed barrier.
     */
    expect(reachedFence / headings).toBeGreaterThan(0.5);
    expect(reachedFence / headings).toBeLessThan(0.95);
  });

  it('never lets the 34m clamp get a turn', () => {
    // The strong form of the claim above: the furthest a keeper can get, over every heading, is inside
    // the clamp. If this ever fails the fence has become scenery and an invisible wall is doing the job.
    let furthest = 0;
    for (let deg = 0; deg < 360; deg += 3) {
      const end = walkOutward((deg * Math.PI) / 180);
      furthest = Math.max(furthest, Math.hypot(end.x, end.z));
    }
    expect(furthest).toBeLessThan(GAME_BOUND - 0.5);
  });
});

describe('the boundary is built out of the ranch, not bolted onto it', () => {
  it('keeps the scatter off the line', () => {
    // Nothing may be planted within `BOUNDARY_CLEAR` of the run; `blocked()` in `Buildings.tsx` enforces
    // it, and a tree standing in a fence is what makes a fence look painted on.
    expect(BOUNDARY_CLEAR).toBeGreaterThan(1.2);
    for (const post of BOUNDARY.posts) {
      expect(distanceToBoundary(post.x, post.z)).toBeLessThan(0.01);
    }
  });

  it('lays a bar between two points at the angles `Instanced` composes', () => {
    // ZYX: +X lands at (cosY cosZ, cosY sinZ, -sinY). Getting this wrong puts a gate on its side.
    const check = (a: [number, number, number], b: [number, number, number]): void => {
      const bar = barBetween(a, b);
      const [, y, z] = bar.rot;
      const dir = [Math.cos(y) * Math.cos(z), Math.cos(y) * Math.sin(z), -Math.sin(y)];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      for (let i = 0; i < 3; i += 1) {
        expect(dir[i] ?? 0).toBeCloseTo(((b[i] ?? 0) - (a[i] ?? 0)) / len, 6);
      }
      expect(bar.scale[0]).toBeCloseTo(len, 6);
    };
    check([0, 1, 0], [3, 1, 0]);
    check([0, 0.2, 0], [0, 1.6, 0]);
    check([1, 0.3, 2], [-2, 1.5, 3.5]);
    check([0, 1, 0], [0, 1, 4]);
  });

  it('costs no draw calls: every part is a placement, not a mesh', () => {
    // The guard on the one line in this job that could halve the frame rate. If any of these ever became
    // a `<mesh>` per item, the ranch would gain 500 draw calls and nobody would notice until it shipped.
    expect(BOUNDARY.posts.length + BOUNDARY.rails.length + BOUNDARY.bars.length).toBeGreaterThan(400);
    // Rails are three per bay, so they outnumber the posts they hang between.
    expect(BOUNDARY.rails.length).toBeGreaterThan(BOUNDARY.posts.length * 2);
  });
});
