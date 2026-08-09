import { describe, expect, it } from 'vitest';

import {
  BARN,
  BARN_D,
  BARN_W,
  DOOR,
  barnSolids,
  distanceToDoorway,
  doorSweepReport,
  doorTarget,
  doorwayWalkReport,
  insideBarn,
} from './barn';
import { SOLIDS } from './Buildings';
import { pushOut, toWorld } from './plan';
import { roofInvariantReport } from './roofs';
import { WINDOWS } from './windows';

/**
 * THE PROMISES A SCREENSHOT CANNOT KEEP.
 *
 * Every claim tested here has the same shape: it is invisible when broken. A doorway a child cannot walk
 * through photographs exactly like one they can. A door leaf sweeping through a wall is hidden by the wall
 * it is sweeping through. A collider opened too far photographs exactly like one that was not, right up
 * until a child walks out through the side of the building. So these are the things that get a test, and
 * the looks — which a screenshot settles in a second — do not.
 *
 * `barn.ts` and `plan.ts` are deliberately free of React and three so this runs in node in milliseconds.
 * `Buildings.tsx` is not, and is imported anyway, because the walk-in promise is about the WHOLE world:
 * proving it against the barn's own colliders alone would miss a hay bale dropped in the doorway by some
 * later edit, which is exactly the regression this is here to catch.
 */

const KEEPER_RADIUS = 0.45;

describe('the barn doorway can actually be walked through', () => {
  it('never pushes a keeper stepping down the centreline, against the whole collider set', () => {
    const report = doorwayWalkReport(SOLIDS, KEEPER_RADIUS);
    // Reported rather than merely asserted, so a failure says WHERE.
    expect(report.worst, `worst push at ${JSON.stringify(report.worst)}`).toBeTruthy();
    expect(report.worst?.pushed ?? 0).toBe(0);
    expect(report.ok).toBe(true);
    // From four metres outside to the middle of the floor, at 5cm a step.
    expect(report.steps).toBeGreaterThan(200);
  });

  it('leaves a gap wide enough for a 0.45m keeper with room to spare', () => {
    const report = doorwayWalkReport(SOLIDS, KEEPER_RADIUS);
    // The keeper is 0.9m across. Anything under about 1.5m is a gap a child has to aim at, and aiming is
    // the one thing this interaction may not require.
    expect(report.clearWidth).toBeGreaterThan(2.0);
    // And it cannot exceed the opening it sits in, or the collider has been opened into the jambs.
    expect(report.clearWidth).toBeLessThan(DOOR.halfW * 2);
  });

  it('still holds a wider keeper', () => {
    // Half again the keeper's radius, as headroom against anybody tuning KEEPER_RADIUS upward later.
    expect(doorwayWalkReport(SOLIDS, 0.68).ok).toBe(true);
  });
});

describe('the walls are still walls', () => {
  /** How hard the collider set pushes a keeper standing at a point in the barn's own local frame. */
  const blockedAt = (lx: number, lz: number, solids = SOLIDS): number => {
    const w = toWorld(BARN, lx, lz);
    return pushOut(solids, w[0], w[1], KEEPER_RADIUS).pushed;
  };

  it('blocks both long walls along their length', () => {
    for (let lz = -6; lz <= 6; lz += 1) {
      expect(blockedAt(BARN_W / 2, lz), `+X wall at z=${lz}`).toBeGreaterThan(0);
      expect(blockedAt(-BARN_W / 2, lz), `-X wall at z=${lz}`).toBeGreaterThan(0);
    }
  });

  it('blocks the closed gable end', () => {
    for (let lx = -4; lx <= 4; lx += 1) {
      expect(blockedAt(lx, -BARN_D / 2), `back wall at x=${lx}`).toBeGreaterThan(0);
    }
  });

  it('blocks the jambs either side of the doorway', () => {
    // Just outside the stated opening, which is where the collider has to resume or the doorway leaks.
    for (const lx of [DOOR.halfW + 0.6, -(DOOR.halfW + 0.6)]) {
      expect(blockedAt(lx, BARN_D / 2), `jamb at x=${lx}`).toBeGreaterThan(0);
    }
  });

  it('keeps a keeper out of the stalls', () => {
    // The stall fronts get their own inner chain. Without it the wall chain alone would let a child stand
    // inside a stall divider, because the walls hold them only 0.66m off the inner face and a stall is
    // 1.15m deep.
    for (const lz of [-5, -3, -1]) {
      expect(blockedAt(4.3, lz), `+X stall at z=${lz}`).toBeGreaterThan(0);
      expect(blockedAt(-4.3, lz), `-X stall at z=${lz}`).toBeGreaterThan(0);
    }
  });

  it('leaves the threshing floor walkable', () => {
    // The point of going in. The open floor in front of the stalls has to be genuinely open.
    for (const lz of [1.5, 3, 4.5]) {
      expect(blockedAt(0, lz), `floor at z=${lz}`).toBe(0);
      expect(blockedAt(1.6, lz), `floor at (1.6, ${lz})`).toBe(0);
    }
  });

  it('is self-consistent in isolation', () => {
    // Sanity on the extraction: the barn's own chain has to pass the same walk without the rest of the
    // world helping or hindering it.
    expect(doorwayWalkReport(barnSolids(), KEEPER_RADIUS).ok).toBe(true);
  });
});

describe('the door leaves cannot clip', () => {
  const sweep = doorSweepReport();

  it('never puts a leaf inside the wall, at any angle', () => {
    for (const row of sweep) {
      // The wall's outer face is at BARN_D / 2, the hinge plane is DOOR.standoff in front of it, and a leaf
      // hinged outboard can never fall behind its own hinge plane.
      expect(row.minZ, `angle ${row.angle.toFixed(3)}`).toBeGreaterThanOrEqual(BARN_D / 2);
    }
  });

  it('holds the whole swing clear of the wall by the hinge standoff', () => {
    const worst = Math.min(...sweep.map((r) => r.minZ));
    expect(worst).toBeCloseTo(BARN_D / 2 + DOOR.standoff, 6);
  });

  it('never lets the two leaves reach each other', () => {
    for (const row of sweep) {
      expect(row.leftMaxX, `left leaf at ${row.angle.toFixed(3)}`).toBeLessThan(0);
      expect(row.rightMinX, `right leaf at ${row.angle.toFixed(3)}`).toBeGreaterThan(0);
      // And the gap between them is real rather than a rounding away from zero.
      expect(row.rightMinX - row.leftMaxX).toBeGreaterThan(0.04);
    }
  });

  it('sweeps the full stated range and stops short of flat', () => {
    expect(sweep[0]?.angle).toBe(0);
    expect(sweep[sweep.length - 1]?.angle).toBeCloseTo(DOOR.open, 6);
    // Under 90°, so a leaf never lies flat against the wall or goes past it.
    expect(DOOR.open).toBeLessThan(Math.PI / 2);
  });
});

describe('proximity opens them, and hysteresis keeps them from fluttering', () => {
  /** Somewhere on the doorway's outward normal, `d` metres from its face. */
  const outFront = (d: number): [number, number] => {
    const w = toWorld(BARN, 0, BARN_D / 2 + d);
    return [w[0], w[1]];
  };

  it('opens when the keeper is near the doorway and closes when they leave', () => {
    const near = outFront(3);
    expect(doorTarget(near[0], near[1], false).open).toBe(true);
    expect(doorTarget(near[0], near[1], false).angle).toBeCloseTo(DOOR.open, 6);
    const far = outFront(20);
    expect(doorTarget(far[0], far[1], true).open).toBe(false);
    expect(doorTarget(far[0], far[1], true).angle).toBe(0);
  });

  it('never shuts the doors on a keeper who is inside', () => {
    /**
     * THE DEFECT A SCREENSHOT FOUND, and the reason this test exists. The barn is 14m deep, so eight metres
     * down the floor a child is outside the closing radius — and with distance alone the doors swung shut
     * behind them, in a building whose only daylight came through those doors. The interaction was working
     * against the thing it exists to enable.
     */
    for (const lz of [6, 3, 0, -3, -6]) {
      const w = toWorld(BARN, 0, lz);
      expect(insideBarn(w[0], w[1]), `inside at z=${lz}`).toBe(true);
      expect(doorTarget(w[0], w[1], false).open, `doors at z=${lz}`).toBe(true);
    }
    // And the far back corner, which is the worst case for distance.
    const corner = toWorld(BARN, -4, -6);
    expect(distanceToDoorway(corner[0], corner[1])).toBeGreaterThan(DOOR.farRadius);
    expect(doorTarget(corner[0], corner[1], false).open).toBe(true);
  });

  it('does not flutter for a keeper standing on the threshold distance', () => {
    /**
     * THE DEFECT THIS EXISTS TO PREVENT. With one radius, a child standing exactly on it makes the doors
     * open and shut as they shift their weight — and a child WILL stand there, because the doors moving is
     * the interesting thing. Between the two radii the answer has to depend on which way they came.
     */
    // `outFront` already measures from the wall face, which is where the doorway is, so this is a distance
    // and not an offset to be corrected.
    const between = outFront((DOOR.nearRadius + DOOR.farRadius) / 2);
    expect(insideBarn(between[0], between[1])).toBe(false);
    expect(doorTarget(between[0], between[1], false).open).toBe(false);
    expect(doorTarget(between[0], between[1], true).open).toBe(true);
    expect(DOOR.farRadius).toBeGreaterThan(DOOR.nearRadius);
  });

  it('measures distance to the doorway rather than to the barn', () => {
    // Standing beside the far end of the barn is 8m from its centre and much further from its doors.
    // Measuring to the centre would swing them open for somebody who cannot see them move.
    const beside = toWorld(BARN, BARN_W / 2 + 2, -BARN_D / 2);
    expect(distanceToDoorway(beside[0], beside[1])).toBeGreaterThan(DOOR.farRadius);
    const infront = toWorld(BARN, 0, BARN_D / 2 + 2);
    expect(distanceToDoorway(infront[0], infront[1])).toBeCloseTo(2, 6);
  });
});

describe('the barn keeps the outer dimensions other files mirror', () => {
  it('has not moved or resized', () => {
    /**
     * `stations/sites.ts` MIRRORS these three values rather than importing them, because that directory may
     * not depend on this one, and it bolts the coat-wall station flat to the barn's -X wall using them.
     * Hollowing the barn out deliberately left every outer face exactly where it was; this is the guard that
     * says so, and it fails loudly if a later edit moves a face and forgets the mirror.
     */
    expect(BARN).toEqual({ x: -14.5, z: 1.5, rot: 1.65 });
    expect(BARN_W).toBe(10.5);
    expect(BARN_D).toBe(14);
  });

  it('still keeps every roof sitting exactly on its walls', () => {
    // The hollowing-out changed how the walls are built but not where their heads are, so the invariant
    // `roofs.ts` exists to protect has to be untouched.
    for (const row of roofInvariantReport()) {
      expect(Math.abs(row.minY), row.spec).toBeLessThan(1e-6);
    }
  });
});

describe('no two windows are the same', () => {
  it('varies on more than one axis per window', () => {
    /**
     * "Vary them so no two windows are identical" is a stated requirement, and the cheap way to satisfy it
     * is to jitter one number — which reads as a copy with a typo rather than as nine windows somebody
     * fitted. So the signature below includes every axis that is supposed to differ, and the assertion is
     * that all nine are distinct.
     */
    const signature = (w: (typeof WINDOWS)[number]): string =>
      [
        w.w.toFixed(2),
        w.h.toFixed(2),
        `${w.cols}x${w.rows}`,
        w.shutter?.style ?? 'none',
        w.shutter?.paint ?? '-',
        w.shutter?.angle.toFixed(2) ?? '-',
        w.planting,
        w.glow,
      ].join('|');
    expect(new Set(WINDOWS.map(signature)).size).toBe(WINDOWS.length);
  });

  it('puts windows on both buildings', () => {
    expect(new Set(WINDOWS.map((w) => `${w.host.x},${w.host.z}`)).size).toBe(2);
  });

  it('uses both plantings and both shutter styles, and shuts exactly one pair', () => {
    expect(new Set(WINDOWS.map((w) => w.planting))).toEqual(new Set(['box', 'bed']));
    expect(new Set(WINDOWS.map((w) => w.shutter?.style))).toEqual(new Set(['louvre', 'pierced']));
    // One closed pair is what makes the open ones read as somebody's choice rather than as a pattern.
    expect(WINDOWS.filter((w) => w.shutter?.angle === 0)).toHaveLength(1);
  });

  it('gives every window a real pane grid', () => {
    for (const w of WINDOWS) {
      expect(w.cols * w.rows, w.name).toBeGreaterThanOrEqual(4);
    }
  });
});
