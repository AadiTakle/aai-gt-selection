import type { Vector3Tuple } from 'three';

/**
 * The ground plan of the ranch, in metres.
 *
 * This module is deliberately dependency-free and contains no geometry: the terrain reads it to know
 * where to flatten, the props read it to know where not to grow, and the slime track reads
 * `CORRAL_POSITIONS` to know where to put creatures. If it lived inside a component, placing a slime
 * would mean importing three.js and a renderer, so it stays a leaf.
 *
 * The shape is a horseshoe. Six corrals stand on an arc that opens to the south, the keeper's hut
 * sits inside the opening facing them, and the whole plateau is held in a bowl of hills. A child
 * spawning at `SPAWN` is looking down the throat of the horseshoe with every corral in frame, which
 * is the one composition decision the rest of the world is arranged around: you should never have to
 * be told where to go.
 */

export const CORRAL_COUNT = 6;

/** Inner floor radius of a pen. The wall sits on this, so a slime should stay inside ~3.4. */
export const CORRAL_RADIUS = 4.1;

/** Distance from plateau centre to each pen's centre. */
const CORRAL_RING = 18;

/**
 * Where each pen's gate faces, as an angle off north (-z), and the pad height.
 *
 * The heights are hand-picked rather than noise-derived. A plateau of six pens all at exactly 0 reads
 * as a table top, and one derived from noise puts a step in whichever pen the noise happened to
 * dislike; ±20cm chosen by eye keeps the ground alive without ever making a pen feel like a pit.
 */
const CORRAL_SPEC: readonly { angleDeg: number; pad: number }[] = [
  { angleDeg: -100, pad: 0.18 },
  { angleDeg: -60, pad: 0.06 },
  { angleDeg: -20, pad: -0.08 },
  { angleDeg: 20, pad: -0.04 },
  { angleDeg: 60, pad: 0.1 },
  { angleDeg: 100, pad: 0.22 },
];

function ringPos(angleDeg: number, radius: number): readonly [number, number] {
  const a = (angleDeg * Math.PI) / 180;
  return [Math.sin(a) * radius, -Math.cos(a) * radius];
}

/** Pad centres and heights, the form the terrain wants. */
export const CORRAL_PADS: readonly { x: number; z: number; y: number; angleDeg: number }[] =
  CORRAL_SPEC.map((spec) => {
    const [x, z] = ringPos(spec.angleDeg, CORRAL_RING);
    return { x, z, y: spec.pad, angleDeg: spec.angleDeg };
  });

/**
 * Pen centres in world space, indexed to match `Slime.corral`.
 *
 * The y is the pen floor, not the slime's centre: a slime of radius r wants to sit at
 * `CORRAL_POSITIONS[i][1] + r`.
 */
export const CORRAL_POSITIONS: Vector3Tuple[] = CORRAL_PADS.map((p) => [p.x, p.y, p.z]);

/** Pen centre by index, tolerant of a stale or out-of-range corral number in saved state. */
export function corralAt(index: number | null | undefined): Vector3Tuple | null {
  if (index == null) return null;
  return CORRAL_POSITIONS[index] ?? null;
}

/**
 * A resting spot inside a pen, spread so several slimes in one corral do not stack.
 *
 * Sunflower/golden-angle placement rather than a ring, because a ring of four looks arranged and a
 * ring of five looks like a mistake, while this looks like animals choosing where to lie down.
 */
export function corralSlot(index: number, slot: number): Vector3Tuple | null {
  const centre = corralAt(index);
  if (!centre) return null;
  if (slot <= 0) return [centre[0], centre[1], centre[2]];
  const golden = 2.39996;
  const r = Math.sqrt(slot / 7) * (CORRAL_RADIUS - 1.1);
  const a = slot * golden;
  return [centre[0] + Math.cos(a) * r, centre[1], centre[2] + Math.sin(a) * r];
}

/** The keeper's hut. Inside the horseshoe, turned a few degrees so it is not dead-on square. */
export const HUT = { x: -4.5, z: 21, y: 0.15, rotationDeg: -18, radius: 4.6 } as const;

/** The pond, south-east of the hut. `level` is the water surface, the basin floor is below it. */
export const POND = { x: 13.5, z: 17.5, radius: 6.4, level: -0.5, depth: 1.5 } as const;

/** Three raised beds beside the hut. */
export const GARDEN_BEDS: readonly { x: number; z: number; w: number; d: number; rotationDeg: number }[] = [
  { x: -14.5, z: 16.5, w: 4.6, d: 2.4, rotationDeg: -18 },
  { x: -15.8, z: 20.2, w: 4.6, d: 2.4, rotationDeg: -18 },
  { x: -12.2, z: 24.4, w: 3.4, d: 2.4, rotationDeg: 26 },
];

/** Where the child stands on arrival, and which way they are looking. */
export const SPAWN = { x: 0, z: 9.5, yawDeg: 0 } as const;

/** Flat-ish heart of the valley. Beyond this the ground starts to roll toward the hills. */
export const PLATEAU_R = 25;

/** Meadow the wild slimes roam. Between the pens and the foot of the hills. */
export const ROAM_INNER_R = 25.5;
export const ROAM_OUTER_R = 39;

/** Where the hills begin to lift, and where they have finished lifting. */
export const HILL_START_R = 31;
export const HILL_END_R = 54;

/** The player is nudged back from here, and can never pass here. */
export const BOUND_SOFT_R = 41;
export const BOUND_HARD_R = 45.5;

/** Radius of the whole terrain mesh. Comfortably past the hills so no edge is ever in frame. */
export const TERRAIN_R = 78;

/**
 * The worn path: a loop past every gate, with a spur back to the hut door.
 *
 * Returns 0..1, how much this point is trodden. The terrain uses it to flatten and de-saturate, which
 * is the cheapest possible way to say "people walk here" — and it does the wayfinding job that an
 * arrow or a quest marker would otherwise have to do.
 */
export function pathMask(x: number, z: number): number {
  const r = Math.hypot(x, z);
  // The loop itself, a soft annulus through the pen gates.
  const loop = 1 - Math.min(1, Math.abs(r - CORRAL_RING) / 2.4);
  // A spur down the middle from the loop to the hut door.
  const spurX = 1 - Math.min(1, Math.abs(x - HUT.x * 0.35) / 2.1);
  const spurZ = z > 1 && z < HUT.z - 2 ? 1 : 1 - Math.min(1, Math.abs(z - (z > 1 ? HUT.z - 2 : 1)) / 3);
  const spur = spurX * spurZ;
  let m = Math.max(loop, spur);
  // The loop is a full annulus and the pond sits across part of it, so the path is cut where the
  // water is. Without this the worn earth walks straight into the pond, which reads as a bug.
  const dPond = Math.hypot(x - POND.x, z - POND.z);
  m *= Math.min(1, Math.max(0, (dPond - (POND.radius - 0.4)) / 2.2));
  const dHut = Math.hypot(x - HUT.x, z - HUT.z);
  m *= Math.min(1, Math.max(0, (dHut - (HUT.radius - 1.2)) / 1.8));
  return m * m * (3 - 2 * m);
}

/** How strongly this point is inside a pen pad, 0..1, and which pen it belongs to. */
export function padMask(x: number, z: number): { mask: number; pad: number } {
  let best = 0;
  let bestPad = 0;
  for (const p of CORRAL_PADS) {
    const d = Math.hypot(x - p.x, z - p.z);
    // Flat across the floor, easing out just past the wall so the pen is not a plinth.
    const t = 1 - Math.min(1, Math.max(0, (d - (CORRAL_RADIUS + 0.5)) / 3.2));
    const m = t * t * (3 - 2 * t);
    if (m > best) {
      best = m;
      bestPad = p.y;
    }
  }
  return { mask: best, pad: bestPad };
}
