import { describe, expect, it } from 'vitest';

import {
  BARN,
  BARN_D,
  BARN_FLOOR_Y,
  BARN_IN_HALF_D,
  BARN_IN_HALF_W,
  BARN_W,
  DOOR,
  LOFT,
  LOFT_EYE,
  LOFT_TOP,
  barnSolids,
} from './barn';
import { GROUND_BLEND, MEADOW_Y, barnFloorInset, groundY } from './ground';
import { EYE, overLoft, supportEye } from './ladder';
import { KEEPER_EYE, pushOut, toWorld } from './plan';

/**
 * WHERE THE GROUND IS, PROVED RATHER THAN LOOKED AT.
 *
 * The bug this answers is 7cm deep and a screenshot of it is ambiguous — a slime standing 7cm into a plank
 * floor and a slime standing on it differ by four pixels at the distance a child plays at, which is exactly
 * why it survived to be reported in words ("they lowkey sink through the floor") rather than seen in review.
 * So the claims are measured here at the millimetre, and the two that a picture cannot show at all are the
 * ones this file exists for:
 *
 *   NOTHING FLICKERS. A height that steps at a boundary makes a slime resting on that boundary shudder
 *   between two heights forever, and a shudder is a worse defect than a sink. The rule is therefore
 *   continuous, and continuity is asserted as a Lipschitz bound rather than by eye.
 *
 *   THE RAMP IS SOMEWHERE NOBODY CAN STAND. The blend that buys the continuity above costs up to 3.5cm of
 *   error at the lip, and the claim in `ground.ts` is that the band lies inside the barn's 34cm walls
 *   everywhere except the doorway it is for. That is a claim about the COLLIDER as much as the geometry, so
 *   it is answered by sweeping every spot a creature can actually stand.
 */

/** A slime narrower than the narrowest pip, so "somewhere a creature can stand" errs toward more ground. */
const SMALL = 0.2;

/** The outer lip of the stone sill in the doorway: where the raised floor truly ends. See `BARN_THRESHOLD`. */
const SILL_TO = BARN_D / 2 + 0.25;

/** Local (lx, lz) in the barn's frame to a world pair, so every case below reads in barn coordinates. */
function at(lx: number, lz: number): [number, number] {
  const w = toWorld(BARN, lx, lz);
  return [w[0], w[1]];
}

function heightAtLocal(lx: number, lz: number, fromY?: number): number {
  const [x, z] = at(lx, lz);
  return fromY === undefined ? groundY(x, z) : groundY(x, z, fromY);
}

describe('the ground under a creature', () => {
  it('is the meadow everywhere outside the barn', () => {
    /* A ring at every bearing, at radii that cover the whole playable ranch, plus the three pens and the
       spawn. The barn is at (-14.5, 1.5) and is 10.5 x 14, so the only points skipped are its own. */
    for (let a = 0; a < 64; a += 1) {
      const th = (a / 64) * Math.PI * 2;
      for (const r of [0, 2, 6, 11, 17, 23, 29, 33.9]) {
        const x = Math.cos(th) * r;
        const z = Math.sin(th) * r;
        if (barnFloorInset(x, z) > -1) continue;
        expect(groundY(x, z)).toBe(MEADOW_Y);
      }
    }
    for (const [x, z] of [
      [0, 8],
      [-6, 15.5],
      [11.4, 4.2],
      [-15.5, -16.5],
    ] as const) {
      expect(groundY(x, z)).toBe(MEADOW_Y);
    }
  });

  it('is the threshing floor everywhere inside the barn', () => {
    // A 20cm lattice over the whole interior, held a blend-width off the inner faces — which is further in
    // than any collider lets a creature reach anyway; the sweep below proves that separately.
    const margin = GROUND_BLEND;
    for (let lx = -BARN_IN_HALF_W + margin; lx <= BARN_IN_HALF_W - margin; lx += 0.2) {
      for (let lz = -BARN_IN_HALF_D + margin; lz <= BARN_IN_HALF_D - margin; lz += 0.2) {
        expect(heightAtLocal(lx, lz)).toBeCloseTo(BARN_FLOOR_Y, 12);
      }
    }
  });

  it('carries the floor out over the stone sill in the doorway, and stops at its lip', () => {
    // On the sill, past the wall's own outer face, a creature still stands on stone at floor height.
    expect(heightAtLocal(0, BARN_D / 2)).toBeCloseTo(BARN_FLOOR_Y, 12);
    expect(heightAtLocal(0, SILL_TO - GROUND_BLEND)).toBeCloseTo(BARN_FLOOR_Y, 12);
    // Half a metre out on the grass in front of it, the meadow, exactly.
    expect(heightAtLocal(0, SILL_TO + 0.5)).toBe(MEADOW_Y);
    // And the blend is CENTRED on the lip, which is the claim that halves the worst error to 3.5cm.
    expect(heightAtLocal(0, SILL_TO)).toBeCloseTo(BARN_FLOOR_Y / 2, 12);
  });

  it('does not raise a creature standing beside the doorway, outside the barn', () => {
    // Level with the sill but out past its notch: this is grass in front of a 44cm footing, not floor.
    for (const lx of [DOOR.halfW + 1.2, -(DOOR.halfW + 1.2), BARN_W / 2 + 1]) {
      expect(heightAtLocal(lx, SILL_TO)).toBe(MEADOW_Y);
    }
    // And behind the barn, a metre off the closed gable.
    expect(heightAtLocal(0, -(BARN_D / 2 + 1))).toBe(MEADOW_Y);
  });

  /* ------------------------------------------------------------------ *\
     The loft, which is one-way
  \* ------------------------------------------------------------------ */

  it('is the loft deck for a body that is already up there', () => {
    const [lx, lz] = [1.5, LOFT.from + 1.5];
    expect(overLoft(...at(lx, lz))).toBe(true);
    expect(heightAtLocal(lx, lz, LOFT_TOP)).toBe(LOFT_TOP);
    // Coming down onto it from above — a keeper who has just walked off a bale — still lands on the deck.
    expect(heightAtLocal(lx, lz, LOFT_TOP + 0.9)).toBe(LOFT_TOP);
  });

  it('is the threshing floor for a body UNDER the loft, which is what stops the deck being a lid', () => {
    /**
     * THE CASE THAT WOULD HAVE RUINED THE BARN. The loft covers the FRONT half of the interior — the half a
     * child walks into and plops a slime in — so a two-sided deck would teleport a wandering slime 3.4m into
     * the air. A slime passes no height at all, and the default has to resolve to the floor.
     */
    for (let lz = LOFT.from + 0.1; lz < BARN_IN_HALF_D - GROUND_BLEND; lz += 0.25) {
      for (const lx of [-3.5, -1, 0, 1, 3.5]) {
        expect(overLoft(...at(lx, lz))).toBe(true);
        expect(heightAtLocal(lx, lz)).toBeCloseTo(BARN_FLOOR_Y, 12);
        expect(heightAtLocal(lx, lz, 0)).toBeCloseTo(BARN_FLOOR_Y, 12);
        // And a body most of the way up is still not on it: `JUMP` buys 1.14m and the deck is 1.9m clear.
        expect(heightAtLocal(lx, lz, LOFT_TOP - 0.5)).toBeCloseTo(BARN_FLOOR_Y, 12);
      }
    }
  });

  it('agrees with `supportEye` about the loft to the millimetre', () => {
    /* The one place where two functions over the same geometry MUST NOT drift: a disagreement here is a
       child standing with their feet inside the floor they just climbed to. Both derive from `LOFT_TOP`,
       and this is what keeps that true. Off the loft they differ on purpose — see the note in `ground.ts`. */
    for (let lz = LOFT.from + 0.2; lz < BARN_IN_HALF_D; lz += 0.4) {
      for (let lx = -BARN_IN_HALF_W + 0.2; lx < BARN_IN_HALF_W; lx += 0.6) {
        const [x, z] = at(lx, lz);
        for (const fromEye of [LOFT_EYE, LOFT_EYE + 0.5, LOFT_EYE - 0.01]) {
          expect(supportEye(x, z, fromEye)).toBeCloseTo(groundY(x, z, fromEye - KEEPER_EYE) + KEEPER_EYE, 12);
        }
      }
    }
    // And below the deck both hand back their own storey: eye height for the camera, boards for a body.
    const [x, z] = at(0, LOFT.from + 1);
    expect(supportEye(x, z, EYE)).toBe(EYE);
    expect(groundY(x, z)).toBeCloseTo(BARN_FLOOR_Y, 12);
  });

  /* ------------------------------------------------------------------ *\
     The threshold, walked
  \* ------------------------------------------------------------------ */

  it('steps a creature UP as it walks in and DOWN as it walks out, and never back and forth', () => {
    /**
     * The owner's own words for what this should feel like. Walked at 5mm — a slime at full tilt covers 11mm
     * a frame — from 3m out in the yard to the middle of the threshing floor, along the doorway centreline.
     *
     * MONOTONE IS THE WHOLE ASSERTION. Any dip anywhere in this sequence is a creature bobbing on its way
     * through a doorway, and a dip small enough to pass a spot check is exactly what a step-shaped rule
     * hides in the seam between two boxes.
     */
    const heights: number[] = [];
    for (let lz = BARN_D / 2 + 3; lz >= 0; lz -= 0.005) heights.push(heightAtLocal(0, lz));

    expect(heights[0]).toBe(MEADOW_Y);
    expect(heights[heights.length - 1]).toBeCloseTo(BARN_FLOOR_Y, 12);

    let rises = 0;
    let biggest = 0;
    for (let i = 1; i < heights.length; i += 1) {
      const d = (heights[i] as number) - (heights[i - 1] as number);
      // Never downhill on the way in, at any point.
      expect(d).toBeGreaterThanOrEqual(-1e-12);
      if (d > 1e-12) rises += 1;
      if (d > biggest) biggest = d;
    }
    // It does rise, and it rises over a stretch of walking rather than in one frame.
    expect(rises).toBeGreaterThan(30);
    // The steepest 5mm of it, against the 37% grade the blend width promises.
    expect(biggest).toBeLessThan(0.005 * 0.4);
    // And walking back out steps DOWN the whole way, with no rise anywhere: the mirror of the above, walked
    // rather than inferred, because "steps up and down as it crosses" is two claims and this is the second.
    let last = heightAtLocal(0, 0);
    for (let lz = 0; lz <= BARN_D / 2 + 3; lz += 0.005) {
      const h = heightAtLocal(0, lz);
      expect(h).toBeLessThanOrEqual(last + 1e-12);
      last = h;
    }
    expect(last).toBe(MEADOW_Y);
  });

  it('cannot vibrate: a body jittered by a micron moves by a micron', () => {
    /**
     * THE FLICKER TEST, and it is the reason the edge is blended instead of stepped.
     *
     * A resting slime is not perfectly still — a neighbour's push-out nudges it by fractions of a
     * millimetre — so a height with a jump in it would swap between two values 7cm apart every frame for as
     * long as the slime stood there. A Lipschitz bound is the honest way to say "that cannot happen": the
     * output moves by at most a fixed multiple of the input, everywhere, including on the lip itself.
     */
    const eps = 1e-6;
    const bound = (1.5 * BARN_FLOOR_Y) / GROUND_BLEND;
    for (let lz = BARN_D / 2 + 1.5; lz >= -BARN_D / 2 - 1.5; lz -= 0.01) {
      for (const lx of [0, 1.4, DOOR.halfW + 0.28, 3, BARN_IN_HALF_W, BARN_W / 2 + 0.4]) {
        const h = heightAtLocal(lx, lz);
        for (const [dx, dz] of [
          [eps, 0],
          [-eps, 0],
          [0, eps],
          [0, -eps],
        ] as const) {
          expect(Math.abs(heightAtLocal(lx + dx, lz + dz) - h)).toBeLessThan(bound * eps * 2);
        }
      }
    }
  });

  /* ------------------------------------------------------------------ *\
     And the ramp is nowhere a creature can be, bar the one place it is for
  \* ------------------------------------------------------------------ */

  it('puts the whole ramp inside the walls, except at the doorway it exists for', () => {
    /**
     * The blend costs up to 3.5cm of error at the lip. This is the measurement that says where that error
     * can be seen: at every spot a small creature can actually stand — the barn's own colliders asked the
     * same way `Game.tsx` asks them — the ground is EXACTLY the meadow or EXACTLY the boards, unless the
     * spot is on the doorway's stone sill.
     *
     * 5cm lattice over the barn and three metres around it, which is 34,000 spots.
     */
    const solids = barnSolids();
    let standable = 0;
    let ramped = 0;
    for (let lx = -BARN_W / 2 - 3; lx <= BARN_W / 2 + 3; lx += 0.05) {
      for (let lz = -BARN_D / 2 - 3; lz <= BARN_D / 2 + 3; lz += 0.05) {
        const [x, z] = at(lx, lz);
        if (pushOut(solids, x, z, SMALL).pushed > 0) continue;
        standable += 1;
        const h = groundY(x, z);
        if (h === MEADOW_Y || Math.abs(h - BARN_FLOOR_Y) < 1e-12) continue;
        ramped += 1;
        // Everything left is on the sill: within the notch's width, and within a blend of its outer lip.
        expect(Math.abs(lx)).toBeLessThanOrEqual(DOOR.halfW + 0.28);
        expect(Math.abs(lz - SILL_TO)).toBeLessThanOrEqual(GROUND_BLEND / 2 + 1e-9);
      }
    }
    // The sweep found ground, and the ramp is a sliver of it: the doorway's sill and nothing else.
    expect(standable).toBeGreaterThan(10000);
    expect(ramped).toBeGreaterThan(0);
    expect(ramped / standable).toBeLessThan(0.01);
  });
});
