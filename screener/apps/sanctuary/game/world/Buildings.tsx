import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type JSX } from 'react';
import {
  BoxGeometry,
  BufferGeometry,
  Color,
  CylinderGeometry,
  Float32BufferAttribute,
  type Group,
  MeshStandardMaterial,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  TorusGeometry,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

import {
  BARN,
  BARN_D,
  BARN_EAVE,
  BARN_FLOOR_Y,
  BARN_GABLE_Z,
  BARN_PLINTH,
  BARN_PLINTH_H,
  BARN_RAKE,
  BARN_RISE,
  BARN_ROOF_T,
  BARN_THRESHOLD,
  BARN_W,
  BARN_WALLS,
  BARN_WALL_H,
  barnSolids,
} from './barn';
import { BarnInterior } from './barnInterior';
import { Instanced, type Placement } from './instanced';
import { usePrefersReducedMotion } from './motion';
import { clamp, fbm, lerp, noise2, rng, smoothstep } from './noise';
import { PIG, materials } from './pigment';
import {
  arcLengths,
  chainOutline,
  roundedRectOutline,
  sampleClosed,
  toWorld,
  type P2,
  type Placed,
  type Solid,
} from './plan';
import { eaveCollarGeometry, gableRoofGeometry, gableWallGeometry, hipRoofGeometry } from './roofs';
import { rippleTexture } from './textures';
import { Windows, wallTaken } from './windows';

/**
 * The ranch: ground, a barn, a keeper's hut, penned corrals, and the props that say somebody works here.
 *
 * WHAT THIS REPLACES, and why it is a rewrite rather than a repair. `Ranch()` in `Game.tsx` drew a flat
 * green disc, six `torusGeometry` rings, a capsule with a cone shoved through it, and forty spheres in a
 * perfect circle. Every one of those is a *primitive standing in for* a thing rather than the thing, and
 * the owner spotted it in the one place the substitution is unmissable: a cone has no eaves, so it either
 * floats above a wall or sinks into it, and it did both at once. There is no adjustment to a cone that
 * makes it a roof. See `roofs.ts` for the construction that does, and for the invariant that makes the
 * defect impossible to reintroduce.
 *
 * WHAT IT IS INSTEAD. Two buildings assembled the way buildings are assembled — a stone footing, walls,
 * a wall head, a roof that lands on the wall head and oversails it, boards over the joins — because that
 * sequence is what the eye reads as "built", and a five-year-old does not need the word "fascia" to
 * notice its absence. Everything is chamfered or rounded; nothing in a child's world has a razor edge.
 *
 * GEOMETRY BUDGET. Anything repeated is one `InstancedMesh`: every fence post in the ranch is one draw
 * call, every rail a second, every tree trunk a third, every leaf mass a fourth. The valley floor and
 * the worn earth on it are one mesh each, coloured per vertex rather than textured, so the ground is two
 * draw calls with no splat shader to maintain.
 *
 * THE FRAME THIS IS AUTHORED IN. `Game.tsx`'s: the child arrives near `[0, 1.5, 8]` looking down `-z`,
 * the pod wall stands at `[0, 3.6, -13]`, and `BOUND` is 34. So the strip `|x| < 5.5` between `z = 9.5`
 * and `z = -9.5` is kept clear as the approach to the pod wall, and a 9-metre apron around the wall is
 * kept clear of anything that could stand in front of the thing a child is being asked to look at.
 * Nothing is placed by eye: `blocked()` is the single predicate every footprint and every scattered
 * tree is checked against, and `SOLIDS` is generated from the same numbers that draw the meshes.
 */

/* ------------------------------------------------------------------ *\
   Ground plan
\* ------------------------------------------------------------------ */

/** Ground stays exactly flat inside this radius, which comfortably contains `BOUND`. */
const FLAT_R = 42;
/** Where the ground mesh ends. Well past the fog, so no edge is ever in frame. */
const GROUND_R = 104;
/** Metres per tile of the ground's grain map. Small enough to read underfoot, large enough not to buzz. */
const GRAIN_METRES = 7;

/**
 * THE BARN'S NUMBERS NOW LIVE IN `barn.ts`, along with its doorway, its wall slabs, its collider and the
 * two invariants that make the walk-in provable. This file draws the barn; that one decides what it is.
 *
 * The split happened because the barn stopped being scenery and became a place. A doorway a child can walk
 * through is a promise about the COLLIDER, not about the geometry, and a promise like that has to be
 * testable — which means it cannot live in a file that imports a renderer.
 */

/**
 * The keeper's hut. Hip-roofed and thatched, so it reads as a home rather than as a smaller barn.
 *
 * The rotation is solved rather than chosen. The hut sits on the sun's side of the ranch, so most of its
 * faces are either turned away from an arriving child or turned away from the sun. Writing both
 * conditions out — visible from the spawn, and lit — leaves a window of about 45° of rotation that
 * satisfies both, and 5° sits in the middle of it: the door wall comes up at 0.57 of full sun and nearly
 * square to the approach, while the long wall beside it falls into deep shade. Lit plane next to shadow
 * plane, on the building whose job is to look like somewhere you could knock on the door of.
 */
const HUT = { x: 13.0, z: -5.0, rot: 0.087 } satisfies Placed;
const HUT_W = 6.6;
const HUT_D = 5.4;
const HUT_WALL_H = 3.0;
const HUT_RISE = 2.45;
const HUT_ROOF_T = 0.52;
const HUT_EAVE = 0.66;
const HUT_PLINTH_H = 0.36;
/** Depth of the soffit board that closes the eave. See `eaveCollarGeometry` in `roofs.ts`. */
const HUT_SOFFIT_T = 0.15;
/** Half the roof's span across the slopes, which is what sets its pitch and every height on it. */
const HUT_ROOF_HALF_W = HUT_W / 2 + HUT_EAVE;
/** The hip's pitch, from the roof's own two numbers rather than measured off a screenshot. */
const HUT_PITCH = Math.atan2(HUT_RISE, HUT_ROOF_HALF_W);
/**
 * The chimney, and the height of the roof's OUTER skin where it comes through.
 *
 * `hutSkinY` is the same expression `hipRoofGeometry` builds its skin from — `thickness` above a soffit
 * that falls linearly from `rise` at the ridge to zero at the eave — so the flashing collar lands ON the
 * roof rather than near it. The stack stands at 2.2m from the ridge on the +X slope, which is 55% of the
 * way down it, so the whole 1.06m collar is on one plane and needs no hip mitre.
 */
const CHIMNEY = { lx: HUT_W / 2 - 1.1, lz: -HUT_D / 2 + 1.0, w: 0.72, h: 2.5 };
function hutSkinY(localX: number): number {
  return HUT_ROOF_T + HUT_RISE * (1 - Math.abs(localX) / HUT_ROOF_HALF_W);
}

/**
 * The windmill. Turned to face the middle of the ranch rather than the wind.
 *
 * Two reasons, and neither is meteorology. A fan seen edge-on is a stick, so from anywhere in the ranch
 * the wheel has to be broadly face-on or the landmark disappears. And because the sun is out beyond it,
 * facing inward puts the wheel's shadow side toward the child — which means ten blades and a rim read as
 * dark filigree against the brightest part of the sky. That is the best thing this object can be.
 */
const WINDMILL = { x: 19.5, z: 6.0, rot: -1.9 } satisfies Placed;
const TOWER_H = 6.6;
const LEG_BASE_R = 1.05;
const LEG_TOP_R = 0.34;

interface PenSpec extends Placed {
  halfW: number;
  halfD: number;
  cornerR: number;
  /** A point in the world the gate should open toward. Puts the gate on the path side, always. */
  gateAim: readonly [number, number];
}

const PENS: readonly PenSpec[] = [
  { x: -6.0, z: 15.5, rot: 0.14, halfW: 4.75, halfD: 3.5, cornerR: 1.6, gateAim: [0, 8] },
  { x: 11.4, z: 4.2, rot: -0.2, halfW: 4.75, halfD: 3.5, cornerR: 1.6, gateAim: [3, 2] },
  { x: -15.5, z: -16.5, rot: 0.3, halfW: 5.0, halfD: 3.75, cornerR: 1.7, gateAim: [-7, -9] },
];

/** Worn tracks, as centrelines. Widths in `PATH_WIDTH`, index-matched. */
const PATHS: readonly (readonly (readonly [number, number])[])[] = [
  // The spine. Runs past the pens and stops at the pod wall's apron.
  [
    [1.4, 22],
    [0.4, 16.5],
    [-0.9, 10.5],
    [0.3, 4],
    [0.2, -3],
    [0, -8.6],
  ],
  // To the barn doors.
  [
    [-0.6, 2.6],
    [-3.6, 2.0],
    [-6.7, 1.2],
  ],
  // To the hut door, which `toWorld(HUT, -0.9, 2.77)` puts at (13.45, -2.12).
  [
    [0.7, -1.2],
    [4.8, -1.9],
    [9.2, -2.3],
    [12.3, -2.2],
  ],
  // To the near pen's gate.
  [
    [2.6, 4.0],
    [5.4, 4.6],
  ],
];
const PATH_WIDTH: readonly number[] = [2.7, 1.9, 1.9, 1.6];
/** Which tracks are wide enough to have been driven rather than only walked. Index-matched. */
const PATH_RUTTED: readonly boolean[] = [true, true, false, false];

/**
 * THE WORN TRACK'S CROSS-SECTION, AND WHY IT IS BUILT UPWARD.
 *
 * The owner's complaint was two complaints. "Smudged" is the ground's fault and is answered where the
 * meadow is coloured — a six-metre-wide de-saturation either side of every centreline had turned the whole
 * yard into brown-green mush, and it is now a third of that width and a third of the strength. "Completely
 * flat" is this section's fault, and it is the real one: a worn track is a HOLLOW, and what a child reads
 * is not the dirt but the turf standing above it and breaking over its edges.
 *
 * SO THE HOLLOW IS MADE BY RAISING THE FIELD, NOT BY SINKING THE TRACK, and that is forced rather than
 * chosen. Two constraints point the same way:
 *
 *   The ground mesh is OPAQUE and lies at exactly y = 0 across the whole plateau. Anything modelled below
 *   that plane is behind it from every angle a child can stand at, so a trench would not be a subtle
 *   effect — it would be invisible, and the code would look right while the screen showed nothing.
 *
 *   `groundHeight` is flat inside `FLAT_R` because `Game.tsx` integrates the keeper against a plane at
 *   y = 0. Relief that rises above that plane is harmless — the camera walks at eye height and a 9cm turf
 *   shoulder is nothing to it — but relief that falls below it would leave anything standing on the ground
 *   FLOATING over the dip. Building upward cannot produce a floating fence post; digging downward can.
 *
 * The section below is therefore a shallow gully whose floor is level with the meadow and whose banks
 * stand 6-9cm above it: crown, two ruts, a toe, a turf crest, and a long soft fall back to the meadow.
 * `u` is the lateral offset as a multiple of the track's half-width up to the toe, then in metres past it.
 */
const TRACK = {
  /** Distance from the toe of the bank out to the turf crest. */
  bank: 0.32,
  /** And from the crest back down to meadow level. Long, so the field reads as swelling away. */
  fall: 1.15,
  /** Crest height above the meadow, before the per-station variation. */
  crest: 0.062,
  /** How far the crest line and the toe wander, in metres, so no stretch of edge is a clean band. */
  wander: 0.3,
} as const;

/* ------------------------------------------------------------------ *\
   Pigment and materials now live in `pigment.ts`

   Moved out for the same reason the barn's plan was: the windows and the barn's interior are their own
   modules now, and all three have to draw from one palette or the buildings stop looking like one place.
   Extracting it also breaks what would otherwise be a cycle — this file renders `Windows`, so `Windows`
   cannot reach back in here for its materials.
\* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *\
   Geometry helpers
\* ------------------------------------------------------------------ */

/**
 * The valley floor.
 *
 * Exactly zero inside `FLAT_R`, which is not laziness — it is the contract with the player controller.
 * `Game.tsx` integrates against a flat plane at `y = 0`, so any relief inside the walkable radius would
 * put the camera underground on one side of a bump and floating on the other. All the shape is spent
 * outside that radius instead, where it does the job it is needed for: a hill silhouette for a low sun to
 * sit behind, and a horizon that is not a straight line.
 */
function groundHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  if (r <= FLAT_R) return 0;
  // Squared, so the ground leaves the plateau tangentially with no crease at the join.
  const t = smoothstep(FLAT_R, 94, r);
  const lumps = fbm(x * 0.026 + 4.1, z * 0.026 - 2.3, 3);
  return t * t * 31 + t * lumps * (3 + t * 14);
}

/** Rounded rectangle in the XY plane. For flat shapes like the trough's water surface. */
function roundedRectShapeXY(w: number, h: number, r: number): Shape {
  const hw = w / 2 - r;
  const hh = h / 2 - r;
  const s = new Shape();
  s.moveTo(-hw - r, -hh);
  s.lineTo(-hw - r, hh);
  s.quadraticCurveTo(-hw - r, hh + r, -hw, hh + r);
  s.lineTo(hw, hh + r);
  s.quadraticCurveTo(hw + r, hh + r, hw + r, hh);
  s.lineTo(hw + r, -hh);
  s.quadraticCurveTo(hw + r, -hh - r, hw, -hh - r);
  s.lineTo(-hw, -hh - r);
  s.quadraticCurveTo(-hw - r, -hh - r, -hw - r, -hh);
  s.closePath();
  return s;
}

/* ------------------------------------------------------------------ *\
   Fencing plan

   Solved once at module scope so the renderer and `SOLIDS` read the same posts. Generated inside a
   component, the collider would be a second, hand-maintained opinion about where the fence is, and two
   opinions drift apart the moment anything moves.
\* ------------------------------------------------------------------ */

const POST_SPACING = 1.62;
const POST_H = 1.42;
const POST_W = 0.17;
const GATE_POST_EXTRA = 0.42;
/** Half the gap left for the gate, measured along the fence line. */
const GATE_HALF = 1.55;

interface Post {
  x: number;
  z: number;
  /** Fence direction at this post, as a world `rotation.y`. Orients the cap board. */
  angle: number;
  gatePost: boolean;
}
interface Rail {
  x: number;
  z: number;
  angle: number;
  length: number;
}
interface Gate {
  /** Hinge post, in world. */
  x: number;
  z: number;
  /** World `rotation.y` that points local +X from the hinge post toward the latch post. */
  angle: number;
  span: number;
  /** How far the gate stands open. Always open: an open gate is an invitation to walk in. */
  swing: number;
}

const FENCE: { posts: Post[]; rails: Rail[]; gates: Gate[] } = (() => {
  const posts: Post[] = [];
  const rails: Rail[] = [];
  const gates: Gate[] = [];

  for (const pen of PENS) {
    const outline = roundedRectOutline(pen.halfW, pen.halfD, pen.cornerR, 7);
    const { at, total } = arcLengths(outline);

    // The gate goes wherever the fence passes closest to the point it should open toward, so it always
    // lands on the path side without anybody typing a gate position.
    let sGate = 0;
    let best = Infinity;
    for (let i = 0; i < outline.length; i += 1) {
      const local = outline[i] ?? [0, 0];
      const w = toWorld(pen, local[0], local[1]);
      const d = Math.hypot(w[0] - pen.gateAim[0], w[1] - pen.gateAim[1]);
      if (d < best) {
        best = d;
        sGate = at[i] ?? 0;
      }
    }

    // Posts march from one side of the gate opening all the way round to the other. The spacing is
    // solved to fit the run rather than fixed, so the last bay is never a stub.
    const run = total - 2 * GATE_HALF;
    const bays = Math.max(2, Math.round(run / POST_SPACING));
    const step = run / bays;
    const made: { x: number; z: number }[] = [];
    for (let i = 0; i <= bays; i += 1) {
      const sample = sampleClosed(outline, at, total, sGate + GATE_HALF + i * step);
      const w = toWorld(pen, sample.p[0], sample.p[1]);
      posts.push({
        x: w[0],
        z: w[1],
        // The local tangent angle `a` maps to a world direction of `a - rot`, and three's rotation.y is
        // the negative of an atan2(dz, dx) heading. Hence `rot - a`.
        angle: pen.rot - sample.angle,
        gatePost: i === 0 || i === bays,
      });
      made.push({ x: w[0], z: w[1] });
    }

    for (let i = 0; i < made.length - 1; i += 1) {
      const a = made[i];
      const b = made[i + 1];
      if (!a || !b) continue;
      const length = Math.hypot(b.x - a.x, b.z - a.z) - POST_W;
      if (length <= 0.05) continue;
      rails.push({
        x: (a.x + b.x) / 2,
        z: (a.z + b.z) / 2,
        angle: -Math.atan2(b.z - a.z, b.x - a.x),
        length,
      });
    }

    const hinge = made[made.length - 1];
    const latch = made[0];
    if (hinge && latch) {
      gates.push({
        x: hinge.x,
        z: hinge.z,
        angle: -Math.atan2(latch.z - hinge.z, latch.x - hinge.x),
        span: Math.hypot(latch.x - hinge.x, latch.z - hinge.z),
        swing: 0.62,
      });
    }
  }

  return { posts, rails, gates };
})();

/* ------------------------------------------------------------------ *\
   Props, in their building's local frame
\* ------------------------------------------------------------------ */

interface YardProp {
  kind: 'bale' | 'sack';
  lx: number;
  lz: number;
  rot: number;
  scale: number;
}

/** Beside the barn doors: bales one side, feed sacks the other, both clear of the door leaves. */
const BARN_YARD: readonly YardProp[] = [
  { kind: 'bale', lx: 3.1, lz: 8.5, rot: 0.3, scale: 1 },
  { kind: 'bale', lx: 4.35, lz: 8.35, rot: -0.15, scale: 0.96 },
  { kind: 'bale', lx: 3.7, lz: 9.55, rot: 0.55, scale: 0.92 },
  { kind: 'sack', lx: -3.4, lz: 8.3, rot: 0.2, scale: 1 },
  { kind: 'sack', lx: -4.2, lz: 8.1, rot: -0.5, scale: 0.9 },
  { kind: 'sack', lx: -3.9, lz: 7.6, rot: 0.9, scale: 0.85 },
];

/** The trough stands inside the near pen, where a trough belongs. */
const TROUGH = (() => {
  const pen = PENS[1];
  if (!pen) return { x: 14, z: 3, rot: 0 };
  const w = toWorld(pen, 2.8, -1.5);
  return { x: w[0], z: w[1], rot: pen.rot + 0.18 };
})();

/* ------------------------------------------------------------------ *\
   Keep-out, then the scatter
\* ------------------------------------------------------------------ */

function insideOrientedRect(
  p: Placed,
  halfW: number,
  halfD: number,
  x: number,
  z: number,
  pad: number,
): boolean {
  const c = Math.cos(p.rot);
  const s = Math.sin(p.rot);
  const dx = x - p.x;
  const dz = z - p.z;
  const lx = dx * c - dz * s;
  const lz = dx * s + dz * c;
  return Math.abs(lx) < halfW + pad && Math.abs(lz) < halfD + pad;
}

function distanceToPaths(x: number, z: number): number {
  let best = Infinity;
  for (const line of PATHS) {
    for (let i = 0; i < line.length - 1; i += 1) {
      const a = line[i];
      const b = line[i + 1];
      if (!a || !b) continue;
      const vx = b[0] - a[0];
      const vz = b[1] - a[1];
      const len2 = vx * vx + vz * vz;
      const t = len2 > 1e-6 ? clamp(((x - a[0]) * vx + (z - a[1]) * vz) / len2, 0, 1) : 0;
      best = Math.min(best, Math.hypot(x - (a[0] + vx * t), z - (a[1] + vz * t)));
    }
  }
  return best;
}

/**
 * True where nothing may be planted or dropped.
 *
 * One predicate, used both to reject scattered trees and to reason about the fixed layout above. The two
 * hard rules are the approach corridor to the pod wall and the apron in front of it — a tree that grows
 * between a child and the question they are being asked is not a cosmetic problem.
 */
function blocked(x: number, z: number, pad = 0): boolean {
  if (Math.abs(x) < 5.5 + pad && z < 9.5 && z > -9.5) return true;
  if (Math.hypot(x, z + 13) < 9 + pad) return true;
  if (insideOrientedRect(BARN, BARN_W / 2, BARN_D / 2, x, z, 1.6 + pad)) return true;
  if (insideOrientedRect(HUT, HUT_W / 2, HUT_D / 2, x, z, 1.6 + pad)) return true;
  if (Math.hypot(x - WINDMILL.x, z - WINDMILL.z) < 3.4 + pad) return true;
  for (const pen of PENS) {
    if (insideOrientedRect(pen, pen.halfW, pen.halfD, x, z, 1.2 + pad)) return true;
  }
  if (distanceToPaths(x, z) < 2.4 + pad) return true;
  return false;
}

interface Tree {
  x: number;
  z: number;
  y: number;
  trunkH: number;
  spread: number;
  lean: number;
  tint: number;
}

/**
 * Trees, in a loose belt that thickens toward the rim.
 *
 * The replacement for the forty spheres that sat in a perfect circle at the world edge: a ring reads as
 * a fence made of shrubbery, an uneven belt reads as the edge of a wood. The belt starts inside the
 * walkable radius so a child can walk among the first of them, and the density curve is what closes the
 * horizon without a wall.
 */
const TREES: readonly Tree[] = (() => {
  const out: Tree[] = [];
  const rand = rng(0x5eed1a);
  for (let attempt = 0; attempt < 1200 && out.length < 78; attempt += 1) {
    const a = rand() * Math.PI * 2;
    const r = 23 + Math.pow(rand(), 0.6) * 25;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (blocked(x, z, 1.2)) continue;
    // Thin them near the middle so the first few read as individuals rather than as a hedge.
    if (rand() > smoothstep(23, 40, r) * 0.75 + 0.25) continue;
    let tooClose = false;
    for (const t of out) {
      if (Math.hypot(t.x - x, t.z - z) < 3.4) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;
    out.push({
      x,
      z,
      y: groundHeight(x, z),
      trunkH: 2.1 + rand() * 1.9,
      spread: 1.55 + rand() * 1.05,
      lean: (rand() - 0.5) * 0.13,
      tint: rand(),
    });
  }
  return out;
})();

/** Low scrub, hugging the fences and the buildings the way scrub does. */
const BUSHES: readonly { x: number; z: number; r: number; tint: number }[] = (() => {
  const out: { x: number; z: number; r: number; tint: number }[] = [];
  const rand = rng(0xb175e5);
  for (let attempt = 0; attempt < 900 && out.length < 42; attempt += 1) {
    const a = rand() * Math.PI * 2;
    const r = 8 + rand() * 26;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (blocked(x, z, -0.4)) continue;
    let tooClose = false;
    for (const b of out) if (Math.hypot(b.x - x, b.z - z) < 2.6) tooClose = true;
    for (const t of TREES) if (Math.hypot(t.x - x, t.z - z) < 2.2) tooClose = true;
    if (tooClose) continue;
    out.push({ x, z, r: 0.5 + rand() * 0.5, tint: rand() });
  }
  return out;
})();

/* ------------------------------------------------------------------ *\
   Colliders
\* ------------------------------------------------------------------ */

/**
 * Everything the child cannot walk through, as circles in the ground plane.
 *
 * Circles because the push-out is then one normalise, and because the player controller already thinks
 * radially. A building is wrapped as a CHAIN of small circles rather than as one big circle: a single
 * circle inscribing the barn would be 10.5m across and would stop a child three metres short of its own
 * doors, and one circumscribing it would swallow the path.
 *
 * The gate openings are deliberately left empty, so every pen can be walked into. So, now, is the barn's
 * doorway — see below.
 *
 * `position` is `[x, z]` in world metres. About 190 entries, so a brute-force pass is a few microseconds.
 */
export const SOLIDS: Solid[] = (() => {
  const out: Solid[] = [];

  /**
   * THE BARN'S COLLIDER IS NO LONGER A CLOSED CHAIN, and that single change is what makes the barn
   * enterable at all.
   *
   * It used to be one `chainRect(BARN, ...)` call: a 0.95m circle every 1.45m the whole way round the
   * footprint, INCLUDING straight across the big doors. So the doors could swing, a child could walk right
   * up to them, and the doorway was a wall — a defect invisible in every screenshot ever taken of it.
   *
   * `barnSolids()` in `barn.ts` builds the shell out of explicit segments instead, leaves the doorway as a
   * STATED gap rather than an artefact of where arc-length sampling happened to land, and adds an inner
   * chain along the stall fronts plus circles for the four things standing on the open floor.
   * `doorwayWalkReport()` in the same file then proves the result by stepping a keeper down the centreline,
   * which is the only kind of evidence this promise can have.
   */
  out.push(...barnSolids());

  /**
   * The hut stays a closed chain. It has no doorway a child can pass through and no interior to pass into,
   * and opening its collider would be a door onto the inside of a solid block.
   */
  out.push(...chainOutline(HUT, HUT_W / 2, HUT_D / 2, 0.9, 1.4));

  for (const post of FENCE.posts) {
    out.push({ position: [post.x, post.z], radius: post.gatePost ? 0.36 : 0.42 });
  }

  out.push({ position: [WINDMILL.x, WINDMILL.z], radius: 1.5 });
  out.push({ position: [TROUGH.x, TROUGH.z], radius: 1.55 });

  for (const prop of BARN_YARD) {
    const w = toWorld(BARN, prop.lx, prop.lz);
    out.push({ position: [w[0], w[1]], radius: prop.kind === 'bale' ? 0.72 : 0.55 });
  }

  // Only the trees a child can reach. `BOUND` is 34, so anything past 36 is decoration.
  for (const t of TREES) {
    if (Math.hypot(t.x, t.z) < 36) out.push({ position: [t.x, t.z], radius: 0.55 });
  }

  return out;
})();

/* ------------------------------------------------------------------ *\
   Ground
\* ------------------------------------------------------------------ */

/**
 * One polar disc, vertex-coloured.
 *
 * Polar rather than a grid, with power-law radial spacing: it puts most of its rings inside the flat
 * plateau where they are looked at, thins toward a rim nobody visits, and closes with a circular
 * silhouette that reads as a horizon instead of a square edge appearing out of the fog. Colour comes
 * from vertex attributes rather than a texture, so the whole valley is one draw call on plain
 * `MeshStandardMaterial` — no splat shader, and it still lights and receives shadow correctly.
 */
function useGroundGeometry(): BufferGeometry {
  return useMemo(() => {
    const thetaSeg = 132;
    const radialSeg = 78;
    const count = 1 + thetaSeg * radialSeg;
    const position = new Float32Array(count * 3);
    const color = new Float32Array(count * 3);
    // World-space UVs. Without these the ground carries a grain map it samples at a single texel, which
    // is a slow way of having no grain map at all.
    const uv = new Float32Array(count * 2);
    const index: number[] = [];

    const idx = (ring: number, theta: number): number =>
      1 + ring * thetaSeg + (((theta % thetaSeg) + thetaSeg) % thetaSeg);

    const c = new Color();
    const grass = new Color(PIG.grass);
    const grassDeep = new Color(PIG.grassDeep);
    const grassPale = new Color(PIG.grassPale);
    const earth = new Color(PIG.earth);
    const stone = new Color(PIG.stoneDeep);
    const scratch = new Color();

    const write = (i: number, x: number, z: number): void => {
      const y = groundHeight(x, z);
      position[i * 3] = x;
      position[i * 3 + 1] = y;
      position[i * 3 + 2] = z;
      uv[i * 2] = x / GRAIN_METRES;
      uv[i * 2 + 1] = z / GRAIN_METRES;

      // Patchy meadow at two scales, so the green is never one green.
      // Three scales: long drifts, clump-sized patches, and a fine break-up. One scale alone reads as a
      // gradient; two read as a pattern; three read as ground.
      const drift = noise2(x * 0.017 + 1.7, z * 0.017 - 9.4);
      const patch = noise2(x * 0.062 + 4.1, z * 0.062 - 2.7);
      const fine = noise2(x * 0.21 - 8.3, z * 0.21 + 5.9);
      c.copy(grassDeep).lerp(grass, smoothstep(0.2, 0.86, drift * 0.34 + patch * 0.46 + fine * 0.2));
      c.lerp(grassPale, clamp((drift - 0.55) * 1.5, 0, 0.55));
      // Sun-bleached where the ground lifts.
      c.lerp(grassPale, smoothstep(1, 9, y) * 0.5 + fine * 0.08);
      // Bare earth and stone on the steeper faces of the far hills.
      const steep =
        smoothstep(FLAT_R + 6, 88, Math.hypot(x, z)) * (0.4 + Math.abs(fbm(x * 0.05, z * 0.05, 2)));
      c.lerp(earth, clamp(steep * 0.7, 0, 0.7));
      c.lerp(stone, clamp(steep - 0.55, 0, 0.35));
      /**
       * A soft de-saturation under the worn tracks, so the track mesh's fade has something to fade into.
       *
       * NARROWED FROM SIX METRES TO THREE AND A HALF, AND HALVED IN STRENGTH, which is the other half of
       * the owner's "smudged" — and the half that was actually doing the smudging. A six-metre skirt either
       * side of four centrelines is a twelve-metre brown wash across a yard whose buildings are twenty
       * metres apart, so the meadow between the barn and the hut was not green at all; the track had no
       * edge because the whole yard was the same colour as the track. It also starts further out (2.2m,
       * past where the turf crest stands) and its falloff is broken up by the meadow's own fine noise, so
       * what is left is a hint of wear around a track rather than a halo painted on the grass.
       */
      const dPath = distanceToPaths(x, z);
      if (dPath < 3.4) {
        scratch.copy(earth).lerp(grassPale, 0.45);
        c.lerp(scratch, (1 - smoothstep(2.2, 3.4 + fine * 0.9, dPath)) * 0.26);
      }
      color[i * 3] = c.r;
      color[i * 3 + 1] = c.g;
      color[i * 3 + 2] = c.b;
    };

    write(0, 0, 0);
    for (let ring = 0; ring < radialSeg; ring += 1) {
      const t = (ring + 1) / radialSeg;
      const radius = GROUND_R * Math.pow(t, 1.75);
      for (let theta = 0; theta < thetaSeg; theta += 1) {
        const a = (theta / thetaSeg) * Math.PI * 2;
        write(idx(ring, theta), Math.cos(a) * radius, Math.sin(a) * radius);
      }
    }

    for (let theta = 0; theta < thetaSeg; theta += 1) {
      index.push(0, idx(0, theta + 1), idx(0, theta));
    }
    for (let ring = 0; ring < radialSeg - 1; ring += 1) {
      for (let theta = 0; theta < thetaSeg; theta += 1) {
        const a = idx(ring, theta);
        const b = idx(ring, theta + 1);
        const d = idx(ring + 1, theta + 1);
        const e = idx(ring + 1, theta);
        index.push(a, b, d, a, d, e);
      }
    }

    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(position, 3));
    g.setAttribute('color', new Float32BufferAttribute(color, 3));
    g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
    g.setIndex(index);
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }, []);
}

/**
 * A track's centreline resampled fine enough to carry relief, with a joint normal at every station.
 *
 * The original geometry put four quads on each hand-typed segment, so the spine was six stations long over
 * twenty-two metres — a resolution at which a wandering edge is a zigzag and a bank is a crease. Every
 * segment is therefore subdivided to about 45cm, with the two end normals interpolated across it, which
 * keeps the existing behaviour at the corners (an averaged joint normal, so a bend does not open a wedge of
 * grass down the middle of the track) and gives the length something to vary along.
 */
function trackStations(line: readonly P2[]): { p: P2; n: P2; s: number }[] {
  const joints: P2[] = line.map((_, i) => {
    const prev = line[Math.max(0, i - 1)] ?? [0, 0];
    const next = line[Math.min(line.length - 1, i + 1)] ?? [0, 0];
    const dx = next[0] - prev[0];
    const dz = next[1] - prev[1];
    const len = Math.hypot(dx, dz) || 1;
    return [-dz / len, dx / len];
  });

  const out: { p: P2; n: P2; s: number }[] = [];
  let s = 0;
  for (let i = 0; i < line.length - 1; i += 1) {
    const p0 = line[i];
    const p1 = line[i + 1];
    const n0 = joints[i];
    const n1 = joints[i + 1];
    if (!p0 || !p1 || !n0 || !n1) continue;
    const length = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    const steps = Math.max(1, Math.ceil(length / 0.45));
    // The last station of a segment is the first of the next, so it is emitted once, at the top.
    for (let k = 0; k < steps; k += 1) {
      const t = k / steps;
      const nx = n0[0] + (n1[0] - n0[0]) * t;
      const nz = n0[1] + (n1[1] - n0[1]) * t;
      const nl = Math.hypot(nx, nz) || 1;
      out.push({
        p: [p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t],
        n: [nx / nl, nz / nl],
        s: s + length * t,
      });
    }
    s += length;
    if (i === line.length - 2) {
      out.push({ p: p1, n: n1, s });
    }
  }
  return out;
}

/**
 * The worn tracks, as a sunken lane with turf standing over its edges.
 *
 * See `TRACK` above for why the hollow is built by raising the field rather than by cutting into it. What
 * this function adds on top of that section is the four things that separate a worn track from a brown
 * band, and each one is a direct answer to "smudged and poorly rendered ... also completely flat":
 *
 *   RELIEF, so the mesh has normals that are not all straight up. That alone is most of it: the banks
 *   catch the low sun on one side of the track and fall into shadow on the other, which is the cue that
 *   says "this is a dip" without needing a single extra texture.
 *
 *   AN EDGE THAT INTERLOCKS. The toe of each bank wanders independently on each side, on a noise sampled
 *   along the track's own arc length rather than in world space — so the wobble follows the path instead of
 *   drifting across it — and the toe's COLOUR carries its own noise from bare dust to turf. Where those
 *   two coincide the grass reaches into the track and where they do not the dust reaches out, so the
 *   boundary is a ragged interlock rather than a clean line.
 *
 *   VARIATION ALONG THE LENGTH: width, crest height, hollow depth and the dust's own tone all move on
 *   slow noises, so no two stretches of the same track match.
 *
 *   RUTS, on the two tracks wide enough to have been driven — a crown down the middle with a wheel track
 *   either side of it. Modelled as relief and as tone together, because either alone reads as a stripe.
 *
 * Vertex *alpha* survives from the first pass and still does the same job at the outermost station only:
 * the fall back to meadow level fades to nothing, so the mesh never ends on a cut line. Everything inboard
 * of that is fully opaque, which is what lets the material write depth — with real relief it has to, or a
 * far bank can be drawn over a near one and the track turns inside out.
 */
function useTrackGeometry(): BufferGeometry {
  return useMemo(() => {
    const position: number[] = [];
    const rgba: number[] = [];
    // World-space UVs in units of a grain tile, exactly as the ground's are, so the two surfaces share one
    // continuous grain and the track does not read as a differently-textured patch laid on the meadow.
    const uv: number[] = [];
    const index: number[] = [];

    const dust = new Color(PIG.earthPale);
    const damp = new Color(PIG.earth);
    const rutTone = new Color(PIG.earth).lerp(new Color(PIG.stoneDeep), 0.32);
    const turf = new Color(PIG.grass);
    const turfDeep = new Color(PIG.grassDeep);
    const turfLit = new Color(PIG.grassPale);
    const col = new Color();

    for (let li = 0; li < PATHS.length; li += 1) {
      const line = PATHS[li];
      if (!line) continue;
      const half = (PATH_WIDTH[li] ?? 2) / 2;
      const rutted = PATH_RUTTED[li] ?? false;
      const stations = trackStations(line);
      const seed = li * 37.1;
      const ring = position.length / 3;
      /** Lateral stations, outermost -X first, so one strip of quads covers the whole section. */
      const lanes = 13;

      for (const station of stations) {
        const [px, pz] = station.p;
        const [nx, nz] = station.n;
        const s = station.s;

        // Slow variation along the length. Sampled on arc length so it travels with the track.
        const widthN = fbm(s * 0.13 + seed, seed * 2.3, 2);
        const hw = half * (1 + widthN * 0.2);
        const crest = TRACK.crest * (1 + fbm(s * 0.21 + seed, 5.5 + seed, 2) * 0.34);
        const dustN = noise2(s * 0.29 + seed, 11.3 + seed);
        // Which way the track leans this far along, so the centre of wear is not always the centreline.
        const lean = fbm(s * 0.11 + seed, 19.7, 2) * 0.22;

        for (let k = 0; k < lanes; k += 1) {
          // -1 at the outer edge of the -X fall, +1 at the outer edge of the +X fall.
          const sideIndex = k - (lanes - 1) / 2;
          const sgn = Math.sign(sideIndex);
          const rank = Math.abs(sideIndex);
          // Per-side edge wobble, independent so the two edges never mirror each other.
          const wob =
            fbm(s * 0.62 + seed, sgn > 0 ? 41.2 : 77.9, 2) * TRACK.wander * (sgn === 0 ? 0 : 1);
          const toe = hw + wob;

          let u: number;
          let y: number;
          let alpha = 1;
          if (rank === 0) {
            // The crown, between the ruts.
            u = 0;
            y = rutted ? 0.021 : 0.009;
            col.copy(dust).lerp(damp, 0.3 + dustN * 0.3);
          } else if (rank === 1) {
            // The wheel track. Lowest point of the section, and the darkest.
            u = sgn * toe * 0.42;
            y = 0.004;
            col.copy(rutted ? rutTone : dust).lerp(damp, 0.35 + dustN * 0.35);
          } else if (rank === 2) {
            u = sgn * toe * 0.79;
            y = 0.013;
            col.copy(dust).lerp(damp, 0.2 + dustN * 0.4);
          } else if (rank === 3) {
            /**
             * The toe, where dust meets turf, and where the interlock lives.
             *
             * Its colour runs from bare dust to full turf on a noise of its own, so the boundary is a
             * ragged mix along the length rather than a single blended edge everywhere.
             */
            u = sgn * toe;
            y = 0.03;
            const grassIn = smoothstep(0.35, 0.75, noise2(s * 0.85 + seed, sgn > 0 ? 3.1 : 63.4));
            col.copy(dust).lerp(damp, 0.3).lerp(turfDeep, 0.25 + grassIn * 0.55);
          } else if (rank === 4) {
            // The crest of the bank. Turf, and the brightest thing in the section under a low sun.
            u = sgn * (toe + TRACK.bank);
            y = crest;
            col
              .copy(turf)
              .lerp(turfDeep, 0.35)
              .lerp(turfLit, smoothstep(0.4, 0.85, noise2(s * 0.4 + seed, sgn > 0 ? 8.8 : 21.6)) * 0.5);
          } else {
            // And the long fall back to the meadow, which is where the mesh ends and fades out.
            u = sgn * (toe + TRACK.bank + TRACK.fall);
            y = 0.004;
            alpha = 0;
            col.copy(turf).lerp(turfDeep, 0.3);
          }

          const off = u + lean;
          const wx = px + nx * off;
          const wz = pz + nz * off;
          position.push(wx, y, wz);
          uv.push(wx / GRAIN_METRES, wz / GRAIN_METRES);
          rgba.push(col.r, col.g, col.b, alpha);
        }
      }

      /**
       * Stitch the strip, wound for an UPWARD normal, and the winding is arithmetic rather than a guess.
       *
       * `n = (-tz, tx)` for a tangent `t`, and in three dimensions `T × N` is straight DOWN — so a triangle
       * whose first edge runs along the track and whose second runs across it faces the floor. The first
       * attempt at this wound exactly that way and the entire track network vanished behind back-face
       * culling: correct geometry, correct colours, nothing on screen. It is the same silent failure the
       * note on the `decal` material records, which is why it is written down again here in the terms that
       * fix it: lane first, station second — `(a, b, d)` and `(a, d, c)` — giving `N × T`, which is up.
       */
      for (let i = 0; i < stations.length - 1; i += 1) {
        for (let k = 0; k < lanes - 1; k += 1) {
          const a = ring + i * lanes + k;
          const b = a + 1;
          const c = a + lanes;
          const d = c + 1;
          index.push(a, b, d, a, d, c);
        }
      }
    }

    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(position, 3));
    g.setAttribute('color', new Float32BufferAttribute(rgba, 4));
    g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
    g.setIndex(index);
    // Shared vertices along and across the strip, so this is smooth shading over the banks rather than a
    // faceted ribbon — which is the whole reason the strip is indexed.
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }, []);
}

/**
 * The stones and turf tufts that sit ON the track, which is the third of the three things that stop it
 * reading as paint.
 *
 * Relief gives the track a shape and the interlocked edge gives it a boundary; neither puts an OBJECT in
 * the ground plane, and until something breaks that plane a child's eye still has nothing to measure the
 * dip against. So: pebbles half-sunk in the wheel tracks, and tufts of grass straddling the crest so they
 * overhang the dust. Both are instanced — two draw calls for about two hundred parts — and both are small
 * enough to want no collider: nothing here is more than 9cm tall, and a keeper walks over it.
 */
function useTrackDressing(): { stones: Placement[]; tufts: Placement[] } {
  return useMemo(() => {
    const stones: Placement[] = [];
    const tufts: Placement[] = [];
    const rand = rng(0x7a11ed);
    const stoneWarm = new Color(PIG.stone);
    const stoneCool = new Color(PIG.stoneDeep);
    const leaf = new Color(PIG.grassDeep);
    // Toward the meadow's own green rather than its bleached highlight: tufts lerped all the way to
    // `grassPale` came out as pale pebbles lying beside the track instead of grass growing over it.
    const leafLit = new Color(PIG.grass).lerp(new Color(PIG.grassPale), 0.3);

    for (let li = 0; li < PATHS.length; li += 1) {
      const line = PATHS[li];
      if (!line) continue;
      const half = (PATH_WIDTH[li] ?? 2) / 2;
      for (const station of trackStations(line)) {
        const [px, pz] = station.p;
        const [nx, nz] = station.n;
        const hw = half * (1 + fbm(station.s * 0.13 + li * 37.1, li * 85.3, 2) * 0.2);

        // A stone every few stations, out of the middle of the crown where feet fall. The radii are the
        // sphere's own, since the geometry is a unit sphere and the scale IS the radius — the first pass
        // read them as diameters and put half-metre boulders down the middle of a footpath.
        if (rand() < 0.17) {
          const u = (0.25 + rand() * 0.72) * hw * (rand() < 0.5 ? -1 : 1);
          const r = 0.03 + rand() * 0.045;
          stones.push({
            position: [px + nx * u, 0.012 + r * 0.3, pz + nz * u],
            rot: [0, rand() * 6.28, rand() * 0.4 - 0.2],
            // Squashed, because a stone in a track is a stone that has been trodden into it.
            scale: [r * 1.35, r * 0.72, r * 1.1],
            color: stoneWarm.clone().lerp(stoneCool, rand() * 0.8),
          });
        }

        // Tufts on both crests, straddling the line so their leaves hang over the dust.
        for (const sgn of [-1, 1] as const) {
          if (rand() > 0.34) continue;
          const wob = fbm(station.s * 0.62 + li * 37.1, sgn > 0 ? 41.2 : 77.9, 2) * TRACK.wander;
          const u = sgn * (hw + wob + TRACK.bank * (0.15 + rand() * 0.8));
          const r = 0.04 + rand() * 0.05;
          tufts.push({
            position: [px + nx * u, 0.032 + r * 0.3, pz + nz * u],
            rot: [0, rand() * 6.28, 0],
            scale: [r * 1.6, r * 0.78, r * 1.3],
            color: leaf.clone().lerp(leafLit, 0.1 + rand() * 0.7),
          });
        }
      }
    }
    return { stones, tufts };
  }, []);
}

/**
 * The pen floors: trodden bare earth inside the fence, feathering out just past it.
 *
 * Still flat, and still on the transparent decal material, because a pen floor is a trodden YARD rather
 * than a worn track — it has no direction, so it has no banks and nothing to break over an edge. The
 * tracks moved out into `useTrackGeometry` when they gained relief; this is what was left.
 */
function useDecalGeometry(): BufferGeometry {
  return useMemo(() => {
    const position: number[] = [];
    const rgba: number[] = [];
    const normal: number[] = [];
    const y = 0.02;

    const earthCore = new Color(PIG.earth);

    const vert = (x: number, z: number, col: Color, alpha: number): void => {
      position.push(x, y, z);
      normal.push(0, 1, 0);
      rgba.push(col.r, col.g, col.b, alpha);
    };
    const quad = (
      a: P2,
      b: P2,
      cc: P2,
      d: P2,
      alphas: readonly [number, number, number, number],
      col: Color,
    ): void => {
      vert(a[0], a[1], col, alphas[0]);
      vert(b[0], b[1], col, alphas[1]);
      vert(cc[0], cc[1], col, alphas[2]);
      vert(a[0], a[1], col, alphas[0]);
      vert(cc[0], cc[1], col, alphas[2]);
      vert(d[0], d[1], col, alphas[3]);
    };

    for (const pen of PENS) {
      const inner = roundedRectOutline(pen.halfW - 0.4, pen.halfD - 0.4, pen.cornerR, 6);
      const outer = roundedRectOutline(pen.halfW + 0.9, pen.halfD + 0.9, pen.cornerR + 0.9, 6);
      const centre = toWorld(pen, 0, 0);
      for (let i = 0; i < inner.length; i += 1) {
        const a = inner[i] ?? [0, 0];
        const b = inner[(i + 1) % inner.length] ?? [0, 0];
        const wa = toWorld(pen, a[0], a[1]);
        const wb = toWorld(pen, b[0], b[1]);
        vert(centre[0], centre[1], earthCore, 0.9);
        vert(wa[0], wa[1], earthCore, 0.88);
        vert(wb[0], wb[1], earthCore, 0.88);
      }
      for (let i = 0; i < inner.length; i += 1) {
        const a = inner[i] ?? [0, 0];
        const b = inner[(i + 1) % inner.length] ?? [0, 0];
        const oa = outer[i] ?? [0, 0];
        const ob = outer[(i + 1) % outer.length] ?? [0, 0];
        quad(
          toWorld(pen, a[0], a[1]),
          toWorld(pen, b[0], b[1]),
          toWorld(pen, ob[0], ob[1]),
          toWorld(pen, oa[0], oa[1]),
          [0.88, 0.88, 0, 0],
          earthCore,
        );
      }
    }

    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(position, 3));
    g.setAttribute('normal', new Float32BufferAttribute(normal, 3));
    g.setAttribute('color', new Float32BufferAttribute(rgba, 4));
    g.computeBoundingSphere();
    return g;
  }, []);
}

function Ground(): JSX.Element {
  const m = materials();
  const ground = useGroundGeometry();
  const track = useTrackGeometry();
  const decal = useDecalGeometry();
  const dressing = useTrackDressing();
  const g = useMemo(
    () => ({
      stone: new SphereGeometry(1, 7, 5),
      tuft: new SphereGeometry(1, 6, 4),
    }),
    [],
  );
  return (
    <>
      {/* Receives but does not cast: 20k triangles of flat ground contribute nothing to a shadow map. */}
      <mesh geometry={ground} material={m.ground} receiveShadow />
      {/*
        The tracks. `renderOrder` 1 like the pen floors, but on the `track` material rather than `decal`
        because this one has relief and therefore has to write depth — see the note on the material.
      */}
      <mesh geometry={track} material={m.track} receiveShadow renderOrder={1} />
      <mesh geometry={decal} material={m.decal} receiveShadow renderOrder={2} />
      <Instanced geometry={g.stone} material={m.stones} items={dressing.stones} />
      {/* Tufts do not cast: two hundred 9cm shadow casters buy nothing and cost a shadow-map pass each. */}
      <Instanced geometry={g.tuft} material={m.canopy} items={dressing.tufts} castShadow={false} />
    </>
  );
}

/* ------------------------------------------------------------------ *\
   The barn
\* ------------------------------------------------------------------ */

/**
 * A rounded box of a given size, with a fillet that cannot be bigger than the thing it is rounding.
 *
 * `RoundedBoxGeometry` throws nothing and checks nothing if the radius exceeds half the smallest
 * dimension — it just folds the box inside out. A 34cm wall asked for a 6cm fillet is fine; the same call
 * on a 7cm threshold slab is not, so the radius is clamped to a third of the thinnest axis.
 */
function roundedSlab(size: readonly [number, number, number]): RoundedBoxGeometry {
  const min = Math.min(size[0], size[1], size[2]);
  return new RoundedBoxGeometry(size[0], size[1], size[2], 1, Math.min(0.06, min * 0.32));
}

/**
 * Slabs bucketed by identical size, so one geometry and one draw call serves every slab that shares it.
 *
 * The barn's ring has five wall pieces and five footing pieces but only four distinct sizes each, because
 * the two long walls match and so do the two jambs. Bucketing on the size alone finds that automatically
 * and would keep finding it if the ring ever gained another symmetrical pair.
 */
function slabGroups(
  slabs: readonly { at: readonly [number, number, number]; size: readonly [number, number, number] }[],
): { geometry: RoundedBoxGeometry; items: Placement[] }[] {
  const buckets = new Map<string, { size: readonly [number, number, number]; items: Placement[] }>();
  for (const slab of slabs) {
    const key = slab.size.map((n) => n.toFixed(4)).join('x');
    const bucket = buckets.get(key) ?? { size: slab.size, items: [] };
    bucket.items.push({ position: slab.at });
    buckets.set(key, bucket);
  }
  return [...buckets.values()].map((b) => ({ geometry: roundedSlab(b.size), items: b.items }));
}

function Barn(): JSX.Element {
  const m = materials();

  const g = useMemo(() => {
    const roofHalfW = BARN_W / 2 + BARN_EAVE;
    const roofHalfD = BARN_D / 2 + BARN_RAKE;
    return {
      /**
       * THE WALLS ARE A RING, and this is the change that turns the barn from an object into a place.
       *
       * `RoundedBoxGeometry` is SOLID: its faces are closed, so `new RoundedBoxGeometry(10.5, 5, 14)` — what
       * was here — is not a barn. It is a ten-tonne block of painted timber with boards nailed to the
       * outside, which is exactly the mistake `stations/carpentry.tsx` records against the first spring
       * basin, where a solid kerb sealed the water inside an opaque stone box. Same fix: a building you can
       * enter has to be a RING.
       *
       * `BARN_WALLS` and `BARN_PLINTH` in `barn.ts` are that ring — four wall slabs with the door end split
       * into two jambs and a header, and a footing course with the doorway notched out of it.
       *
       * GROUPED BY SIZE rather than scaled from one unit cube, and the reason is the fillet. Scaling a
       * rounded box 0.34 x 5 x 14 out of a unit cube scales its corner radius with it, so a 5.5cm fillet
       * becomes 2cm on one axis and 77cm on another — the wall would arrive as a gigantic rounded lozenge.
       * Since the two long walls share a size and so do the two jambs, grouping identical sizes gets the
       * whole ring into four draw calls anyway.
       */
      wallGroups: slabGroups(BARN_WALLS),
      plinthGroups: slabGroups(BARN_PLINTH),
      threshold: roundedSlab(BARN_THRESHOLD.size),
      roof: gableRoofGeometry({
        width: BARN_W,
        depth: BARN_D,
        rise: BARN_RISE,
        thickness: BARN_ROOF_T,
        eave: BARN_EAVE,
        rake: BARN_RAKE,
      }),
      gableWall: gableWallGeometry({
        width: BARN_W,
        rise: BARN_RISE,
        eave: BARN_EAVE,
        depth: 0.34,
        bevel: 0.05,
        inset: 0.07,
      }),
      /**
       * The same soffit board the hut got, on the two long eaves — and the barn's is the version with a
       * VENT SLOT.
       *
       * `barnInterior.tsx` deliberately leaves a 7cm gap above its inner eave closure so a horizontal
       * sliver of daylight comes in high on a shaded wall, and that daylight arrives through this annulus.
       * Sealing the outside would have put the interior's one natural light source out. So the board stops
       * 8cm short of the wall face instead: from the ground the roof plainly lands on the wall, the void is
       * no longer a 62cm hole with a chimney-sized view into it, and the slot still lets the sun in.
       *
       * It also fixes a distance bug worth naming. The interior group switches itself off past 26 metres,
       * and the inner closure board went with it — so from across the meadow the annulus opened up into
       * nothing at all. This board is exterior and is never culled, so the eave now reads the same from
       * three metres and from thirty.
       *
       * `'eaves'` only: a gable's rakes are already closed by its own barge boards and the gable wall.
       */
      eave: eaveCollarGeometry({
        width: BARN_W,
        depth: BARN_D,
        eave: BARN_EAVE,
        rake: BARN_RAKE,
        thickness: 0.16,
        reveal: 0.08,
        sides: 'eaves',
      }),
      // A gable meeting in a knife edge reads as folded card; a rolled ridge is what a real one looks
      // like, and it softens the single silhouette a child sees against the sky.
      // Held 4cm inside the barge boards at each end: proud of them, the cap's circular end cap reads
      // as a knob stuck on the apex.
      ridge: new CylinderGeometry(0.21, 0.21, roofHalfD * 2 - 0.08, 10, 1),
      /**
       * Eave trim. A thin board laid flat against the *outboard* face of the roof slab's fascia, not
       * rotated into the pitch and not tucked under it, so there is no angle to get wrong and nothing to
       * intersect. It exists to put a cream line under the eave, which is what stops a dark roof reading
       * as a hole cut in the sky.
       */
      eaveTrim: new BoxGeometry(0.07, BARN_ROOF_T * 0.72, roofHalfD * 2),
      batten: new RoundedBoxGeometry(0.16, BARN_WALL_H - 0.3, 0.1, 1, 0.04),
      hayDoor: new RoundedBoxGeometry(1.5, 1.4, 0.16, 2, 0.06),
      cupolaWall: new RoundedBoxGeometry(1.5, 1.15, 1.5, 2, 0.14),
      cupolaRoof: hipRoofGeometry({
        width: 1.5,
        depth: 1.5,
        rise: 0.72,
        thickness: 0.14,
        eave: 0.18,
        ridgeFraction: 0,
      }),
      leanPost: new RoundedBoxGeometry(0.19, 2.72, 0.19, 2, 0.06),
      leanSlab: new RoundedBoxGeometry(3.0, 0.16, 6.4, 2, 0.07),
      roofHalfW,
      roofHalfD,
    };
  }, []);

  const gableZ = BARN_GABLE_Z;

  /**
   * Vertical battens down the long walls. Board-and-batten is THE ranch-barn surface, and it is also what
   * breaks a 14-metre wall into something with a scale a child can read.
   *
   * SKIPPED WHERE A WINDOW IS. The battens stand 3.5cm proud of the wall face and a window frame stands
   * 10cm proud of the same face, so three of the barn's five windows would have had a cream board running
   * straight down the middle of them. That is not a subtle artefact: the siding is the loudest thing on
   * this wall, so the batten wins the eye and the window reads as pasted on afterwards. `wallTaken` asks
   * the window census, which is the right way round — real siding is cut around its openings.
   */
  const battens = useMemo<Placement[]>(() => {
    const out: Placement[] = [];
    const n = 13;
    for (let i = 0; i < n; i += 1) {
      const z = -BARN_D / 2 + 0.6 + (i / (n - 1)) * (BARN_D - 1.2);
      for (const side of [-1, 1] as const) {
        if (wallTaken(BARN, side > 0 ? Math.PI / 2 : -Math.PI / 2, z)) continue;
        out.push({
          position: [(side * BARN_W) / 2 + side * 0.035, BARN_WALL_H / 2 - 0.05, z],
          rot: [0, Math.PI / 2, 0],
        });
      }
    }
    return out;
  }, []);

  const leanPosts = useMemo<Placement[]>(
    () => [-1, 1].map((side) => ({ position: [-7.9, 1.36, -2.4 + side * 2.9] as const })),
    [],
  );

  return (
    <group position={[BARN.x, 0, BARN.z]} rotation={[0, BARN.rot, 0]}>
      {/*
        Footing, as a ring with the doorway notched out of it, plus a stone threshold laid level with the
        floor inside.
        A building that meets the grass on a stone course looks planted; one that does not looks dropped.
        But a SOLID course is a plug: it would put a 44cm kerb across the doorway at exactly the height a
        child cannot see and the controller cannot step over.
      */}
      {g.plinthGroups.map((group, i) => (
        <Instanced key={i} geometry={group.geometry} material={m.stone} items={group.items} />
      ))}
      <mesh
        geometry={g.threshold}
        material={m.stoneDeep}
        position={BARN_THRESHOLD.at as unknown as [number, number, number]}
        receiveShadow
      />

      <group position={[0, BARN_PLINTH_H, 0]}>
        {g.wallGroups.map((group, i) => (
          <Instanced key={i} geometry={group.geometry} material={m.barnWall} items={group.items} />
        ))}
        <Instanced geometry={g.batten} material={m.trim} items={battens} />

        {/* The gable walls, filling the triangle the roof leaves open. Traced from the roof's own soffit
            in `gableWallShape`, so the fit is arithmetic rather than eyeballed. */}
        {[-1, 1].map((side) => (
          <mesh
            key={side}
            geometry={g.gableWall}
            material={m.trim}
            position={[0, BARN_WALL_H, side * gableZ]}
            castShadow
            receiveShadow
          />
        ))}

        {/*
          THE BIG DOORS ARE NOT HERE ANY MORE. They were two static leaves hung flat on the wall; they are
          now in `barnInterior.tsx`, hinged at the outer edges of a real opening and swinging on proximity.
          They live there rather than here because they belong to the same story as the floor they open onto
          and the collider gap that lets a child through, and because they need a per-frame hook that this
          purely static component has no business owning.
        */}
        {/* Hay door up in the gable, where the hoist would be. Flush against the gable wall's face. */}
        <mesh
          geometry={g.hayDoor}
          material={m.timber}
          position={[0, BARN_WALL_H + 1.15, gableZ + 0.17 + 0.06]}
          castShadow
          receiveShadow
        />

        {/* Roof. Local origin sits on the wall head; every vertex is at or above it. */}
        <group position={[0, BARN_WALL_H, 0]}>
          <mesh geometry={g.roof} material={m.shingle} castShadow receiveShadow />
          {/* Soffit and fascia on the two long eaves, with the vent slot the interior is lit through. */}
          <mesh geometry={g.eave} material={m.trim} castShadow receiveShadow />
          <mesh
            geometry={g.ridge}
            material={m.shingle}
            position={[0, BARN_RISE + BARN_ROOF_T - 0.06, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            castShadow
          />
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              geometry={g.eaveTrim}
              material={m.trim}
              position={[side * (g.roofHalfW + 0.035), BARN_ROOF_T * 0.44, 0]}
              castShadow
            />
          ))}
          {/* Cupola. One small thing above the ridge gives the silhouette somewhere to end. */}
          <group position={[0, BARN_RISE + BARN_ROOF_T - 0.1, 0]}>
            <mesh geometry={g.cupolaWall} material={m.trim} position={[0, 0.58, 0]} castShadow receiveShadow />
            <mesh geometry={g.cupolaRoof} material={m.shingle} position={[0, 1.15, 0]} castShadow />
          </group>
        </group>
      </group>

      {/*
        A lean-to along the shaded long wall, so the barn is not one prism. Same rule as the roofs: the
        slab's low end sits on the post heads and it rises toward the wall, finishing at 3.56m — well
        under the 5.44m eave soffit, so it passes beneath the overhang instead of into it.
      */}
      <group position={[0, BARN_PLINTH_H, 0]}>
        <Instanced geometry={g.leanPost} material={m.timberDeep} items={leanPosts} />
        <mesh
          geometry={g.leanSlab}
          material={m.shingle}
          position={[-6.6, 3.12, -2.4]}
          rotation={[0, 0, 0.3]}
          castShadow
          receiveShadow
        />
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ *\
   The keeper's hut
\* ------------------------------------------------------------------ */

function Hut(): JSX.Element {
  const m = materials();

  const g = useMemo(
    () => ({
      plinth: new RoundedBoxGeometry(HUT_W + 0.44, HUT_PLINTH_H, HUT_D + 0.44, 2, 0.1),
      walls: new RoundedBoxGeometry(HUT_W, HUT_WALL_H, HUT_D, 3, 0.2),
      // A hip roof needs no gable wall: it closes itself, so there is no second number to keep in
      // agreement with the first. Thick and deeply oversailing, which is how thatch sits.
      roof: hipRoofGeometry({
        width: HUT_W,
        depth: HUT_D,
        rise: HUT_RISE,
        thickness: HUT_ROOF_T,
        eave: HUT_EAVE,
        ridgeFraction: 0.34,
      }),
      /**
       * THE BOARD THAT MAKES THE ROOF LAND ON THE HOUSE.
       *
       * A mitred soffit ring from the wall face out to the eave, hanging 15cm below the wall head, with its
       * outer edge sitting directly under the thatch's own fascia so the eave reads as one deep timber edge
       * a child can see the shadow of. `reveal: -0.015` laps it 15mm onto the wall face rather than butting
       * it exactly, because two coplanar faces fight over the same pixels and a 15mm lap is a joint.
       *
       * The hut is CLOSED all the way round — no vent slot — because it has no interior to light and
       * nothing behind the board except the void the chimney rises through, which is the whole point.
       */
      eave: eaveCollarGeometry({
        width: HUT_W,
        depth: HUT_D,
        eave: HUT_EAVE,
        rake: HUT_EAVE,
        thickness: HUT_SOFFIT_T,
        reveal: -0.015,
        sides: 'ring',
      }),
      ridge: new CylinderGeometry(0.2, 0.2, HUT_D * 0.34 + 0.5, 9, 1),
      beam: new RoundedBoxGeometry(0.17, HUT_WALL_H - 0.1, 0.17, 2, 0.055),
      lintel: new RoundedBoxGeometry(HUT_W - 0.5, 0.2, 0.17, 2, 0.06),
      door: new RoundedBoxGeometry(1.05, 2.05, 0.14, 2, 0.09),
      /** Four planks and two ledges on the leaf, so the knob has a door to be on. */
      doorPlank: new RoundedBoxGeometry(0.235, 1.93, 0.03, 1, 0.012),
      doorLedge: new RoundedBoxGeometry(0.95, 0.13, 0.035, 1, 0.014),
      strap: new RoundedBoxGeometry(0.5, 0.06, 0.026, 1, 0.011),
      /** The knob: a rose plate, a neck and the ball. */
      knobRose: new CylinderGeometry(0.062, 0.07, 0.022, 12),
      knobNeck: new CylinderGeometry(0.019, 0.024, 0.05, 8),
      knob: new SphereGeometry(0.052, 12, 9),
      chimney: new RoundedBoxGeometry(CHIMNEY.w, CHIMNEY.h, CHIMNEY.w, 2, 0.1),
      chimneyCap: new RoundedBoxGeometry(CHIMNEY.w + 0.22, 0.18, CHIMNEY.w + 0.22, 2, 0.06),
      /**
       * THE FLASHING, which is what says a chimney was BUILT through a roof rather than pushed into one.
       *
       * Two stepped collars lying in the roof's own plane: a wide apron dressed onto the slope and a
       * narrower course above it, both tilted by `HUT_PITCH` about local Z so they lie flat on the skin
       * instead of cutting across it. Thin in Y and oversized in X and Z, so what shows is a lead-ish
       * skirt spreading out from the stack onto the thatch and a shadow line under it — the two details a
       * real flashing produces, and the two the eye is looking for at a penetration.
       *
       * Solid rather than four dressed leaves. It intersects the stack it wraps, which is invisible
       * because both are opaque, and it saves modelling an up-slope back gutter that nothing can see from
       * a child's eye height on the ground.
       */
      flashApron: new RoundedBoxGeometry(CHIMNEY.w + 0.34, 0.075, CHIMNEY.w + 0.34, 1, 0.028),
      flashUpstand: new RoundedBoxGeometry(CHIMNEY.w + 0.17, 0.065, CHIMNEY.w + 0.17, 1, 0.024),
    }),
    [],
  );

  // Corner posts, an intermediate post per long wall, and a wall-head plate: a half-timbered cottage
  // rather than a cream box.
  const beams = useMemo<Placement[]>(() => {
    const out: Placement[] = [];
    for (const sx of [-1, 1] as const) {
      for (const sz of [-1, 1] as const) {
        out.push({ position: [(sx * HUT_W) / 2, HUT_WALL_H / 2 - 0.05, (sz * HUT_D) / 2] });
      }
    }
    for (const sz of [-1, 1] as const) {
      out.push({ position: [0, HUT_WALL_H / 2 - 0.05, (sz * HUT_D) / 2] });
    }
    return out;
  }, []);

  return (
    <group position={[HUT.x, 0, HUT.z]} rotation={[0, HUT.rot, 0]}>
      <mesh
        geometry={g.plinth}
        material={m.stone}
        position={[0, HUT_PLINTH_H / 2, 0]}
        castShadow
        receiveShadow
      />

      <group position={[0, HUT_PLINTH_H, 0]}>
        <mesh
          geometry={g.walls}
          material={m.plaster}
          position={[0, HUT_WALL_H / 2, 0]}
          castShadow
          receiveShadow
        />
        <Instanced geometry={g.beam} material={m.timberDeep} items={beams} />
        {[-1, 1].map((sz) => (
          <mesh
            key={sz}
            geometry={g.lintel}
            material={m.timberDeep}
            position={[0, HUT_WALL_H - 0.16, (sz * HUT_D) / 2]}
            castShadow
          />
        ))}

        {/*
          Door on +Z, the face turned toward the arrival path.

          THE KNOB, which the owner asked for, and the four things it needs to read as one. A ball on a
          blank slab is a bead stuck to a plank: what says "handle" is the ROSE it stands on and the shadow
          under it, what says "door" rather than "panel" is boarding and ledges, and what says which side
          the knob is on is a pair of straps on the other one. So the leaf is boarded — four planks in the
          lighter timber over the darker leaf, so the gaps between them read as gaps — two ledges cross it,
          the straps hang on the -X stile, and the brass sits at 0.99m up the leaf, which is the height a
          door handle is and a height a five-year-old can reach.
        */}
        <mesh
          geometry={g.door}
          material={m.timberDeep}
          position={[-0.9, 1.03, HUT_D / 2 + 0.07]}
          castShadow
          receiveShadow
        />
        {[-0.386, -0.129, 0.129, 0.386].map((dx) => (
          <mesh
            key={dx}
            geometry={g.doorPlank}
            material={m.timber}
            position={[-0.9 + dx, 1.03, HUT_D / 2 + 0.155]}
            castShadow
          />
        ))}
        {[-0.72, 0.72].map((dy) => (
          <mesh
            key={dy}
            geometry={g.doorLedge}
            material={m.timberDeep}
            position={[-0.9, 1.03 + dy, HUT_D / 2 + 0.1875]}
            castShadow
          />
        ))}
        {[-0.62, 0.62].map((dy) => (
          <mesh
            key={dy}
            geometry={g.strap}
            material={m.timberDeep}
            position={[-1.15, 1.03 + dy, HUT_D / 2 + 0.185]}
            castShadow
          />
        ))}
        <mesh
          geometry={g.knobRose}
          material={m.brass}
          position={[-0.52, 0.99, HUT_D / 2 + 0.181]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        />
        <mesh
          geometry={g.knobNeck}
          material={m.brass}
          position={[-0.52, 0.99, HUT_D / 2 + 0.217]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        />
        <mesh
          geometry={g.knob}
          material={m.brass}
          position={[-0.52, 0.99, HUT_D / 2 + 0.277]}
          castShadow
        />

        {/*
          LAMPLIGHT. With the sun where it is, the hut is the one building left in shadow, which would make
          it the dead corner of the composition — so it gets a warm interior instead, and against a blue
          shadow side it is the most inviting thing on the ranch.
          The three emissive panes that used to be here are gone. They were rounded boxes painted with an
          emissive material: a glowing rectangle stuck to a wall, which is a hole rather than a window.
          `windows.tsx` draws the hut's four real windows now — frame, mullions, glass, shutters, planting —
          in world space alongside the barn's five, so all nine share one set of instanced meshes. What
          stays here is the point light at the door, because that is a property of this building's porch
          rather than of any one window.
        */}
        <pointLight
          position={[-0.9, 1.5, HUT_D / 2 + 0.9]}
          color={PIG.honey}
          intensity={5.5}
          distance={7}
          decay={2}
        />

        <group position={[0, HUT_WALL_H, 0]}>
          <mesh geometry={g.roof} material={m.thatch} castShadow receiveShadow />
          {/*
            The soffit and fascia. Same frame as the roof — origin on the wall head — so the two cannot
            drift apart, and it hangs BELOW that plane, which is why it closes the eave without going
            anywhere near the wall solid. `roofs.ts` asserts both halves of that.
          */}
          <mesh geometry={g.eave} material={m.timber} castShadow receiveShadow />
          <mesh
            geometry={g.ridge}
            material={m.thatch}
            position={[0, HUT_RISE + HUT_ROOF_T - 0.05, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            castShadow
          />
        </group>

        {/* Chimney. Rises from *inside* the footprint and passes through the roof, which is what a
            chimney does — as opposed to the floating stack you get from placing it by eye outside. */}
        <group position={[CHIMNEY.lx, 0, CHIMNEY.lz]}>
          <mesh
            geometry={g.chimney}
            material={m.stone}
            position={[0, HUT_WALL_H + 1.1, 0]}
            castShadow
            receiveShadow
          />
          <mesh
            geometry={g.chimneyCap}
            material={m.stoneDeep}
            position={[0, HUT_WALL_H + 2.44, 0]}
            castShadow
          />
          {/* Where it comes through: an apron dressed onto the slope and a course above it. */}
          <mesh
            geometry={g.flashApron}
            material={m.stoneDeep}
            position={[0, HUT_WALL_H + hutSkinY(CHIMNEY.lx) + 0.025, 0]}
            rotation={[0, 0, -HUT_PITCH]}
            castShadow
            receiveShadow
          />
          <mesh
            geometry={g.flashUpstand}
            material={m.stoneDeep}
            position={[0, HUT_WALL_H + hutSkinY(CHIMNEY.lx) + 0.155, 0]}
            rotation={[0, 0, -HUT_PITCH]}
            castShadow
            receiveShadow
          />
        </group>
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ *\
   Fencing
\* ------------------------------------------------------------------ */

function Pens(): JSX.Element {
  const m = materials();

  const g = useMemo(
    () => ({
      post: new RoundedBoxGeometry(POST_W, POST_H, POST_W, 2, 0.055),
      gatePost: new RoundedBoxGeometry(POST_W * 1.35, POST_H + GATE_POST_EXTRA, POST_W * 1.35, 2, 0.06),
      cap: new RoundedBoxGeometry(POST_W + 0.11, 0.09, POST_W + 0.11, 2, 0.035),
      // Unit length in X, scaled per instance. One geometry for every rail in the ranch.
      rail: new RoundedBoxGeometry(1, 0.14, 0.08, 1, 0.035),
      gateRail: new RoundedBoxGeometry(1, 0.13, 0.07, 1, 0.03),
    }),
    [],
  );

  const posts = useMemo<Placement[]>(
    () =>
      FENCE.posts
        .filter((p) => !p.gatePost)
        .map((p) => ({ position: [p.x, POST_H / 2, p.z] as const, rot: [0, p.angle, 0] as const })),
    [],
  );
  const gatePosts = useMemo<Placement[]>(
    () =>
      FENCE.posts
        .filter((p) => p.gatePost)
        .map((p) => ({
          position: [p.x, (POST_H + GATE_POST_EXTRA) / 2, p.z] as const,
          rot: [0, p.angle, 0] as const,
        })),
    [],
  );
  const caps = useMemo<Placement[]>(
    () =>
      FENCE.posts.map((p) => ({
        position: [p.x, (p.gatePost ? POST_H + GATE_POST_EXTRA : POST_H) + 0.03, p.z] as const,
        rot: [0, p.angle, 0] as const,
      })),
    [],
  );
  const rails = useMemo<Placement[]>(() => {
    const out: Placement[] = [];
    for (const r of FENCE.rails) {
      for (const h of [0.52, 1.02] as const) {
        out.push({
          position: [r.x, h, r.z] as const,
          rot: [0, r.angle, 0] as const,
          scale: [r.length, 1, 1] as const,
        });
      }
    }
    return out;
  }, []);

  return (
    <group>
      <Instanced geometry={g.post} material={m.timber} items={posts} />
      <Instanced geometry={g.gatePost} material={m.timberDeep} items={gatePosts} />
      <Instanced geometry={g.cap} material={m.timberDeep} items={caps} />
      <Instanced geometry={g.rail} material={m.timber} items={rails} />
      {FENCE.gates.map((gate, i) => (
        <group key={i} position={[gate.x, 0, gate.z]} rotation={[0, gate.angle + gate.swing, 0]}>
          {[0.5, 1.0].map((h) => (
            <mesh
              key={h}
              geometry={g.gateRail}
              material={m.trim}
              position={[gate.span / 2, h, 0]}
              scale={[gate.span - 0.2, 1, 1]}
              castShadow
            />
          ))}
          <mesh
            geometry={g.gateRail}
            material={m.trim}
            position={[gate.span / 2, 0.75, 0]}
            rotation={[0, 0, Math.atan2(0.5, gate.span)]}
            scale={[Math.hypot(gate.span - 0.2, 0.5), 1, 1]}
            castShadow
          />
          <mesh
            geometry={g.gateRail}
            material={m.trim}
            position={[gate.span - 0.14, 0.75, 0]}
            rotation={[0, 0, Math.PI / 2]}
            scale={[0.66, 1, 1]}
            castShadow
          />
        </group>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ *\
   Props
\* ------------------------------------------------------------------ */

function Trough(): JSX.Element {
  const m = materials();
  const reduced = usePrefersReducedMotion();
  const ripple = useMemo(() => rippleTexture(), []);

  const g = useMemo(
    () => ({
      body: new RoundedBoxGeometry(2.7, 0.62, 1.0, 3, 0.16),
      leg: new RoundedBoxGeometry(0.18, 0.28, 0.7, 2, 0.06),
      water: new ShapeGeometry(roundedRectShapeXY(2.34, 0.68, 0.14)),
    }),
    [],
  );

  const water = useMemo(() => {
    const mat = m.water.clone();
    if (ripple) {
      mat.normalMap = ripple;
      mat.normalScale.set(0.55, 0.55);
    }
    return mat;
  }, [m.water, ripple]);

  useFrame(({ clock }) => {
    if (reduced || !ripple) return;
    ripple.offset.set(clock.elapsedTime * 0.012, clock.elapsedTime * 0.008);
  });

  return (
    <group position={[TROUGH.x, 0, TROUGH.z]} rotation={[0, TROUGH.rot, 0]}>
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={g.leg} material={m.timberDeep} position={[s * 1.05, 0.14, 0]} castShadow />
      ))}
      <mesh geometry={g.body} material={m.stone} position={[0, 0.56, 0]} castShadow receiveShadow />
      {/* Water sits below the rim, so the trough reads as containing it rather than wearing it. */}
      <mesh geometry={g.water} material={water} position={[0, 0.79, 0]} rotation={[-Math.PI / 2, 0, 0]} />
    </group>
  );
}

function BarnYard(): JSX.Element {
  const m = materials();
  const g = useMemo(
    () => ({
      bale: new RoundedBoxGeometry(1.25, 0.72, 0.82, 3, 0.16),
      // Wrapped around the bale's short way and standing 2cm proud of it, so the twine is visible on the
      // top and both long faces. Sunk inside instead, it showed only as two dots on the cut ends.
      band: new RoundedBoxGeometry(0.05, 0.75, 0.85, 1, 0.02),
      sack: new RoundedBoxGeometry(0.62, 0.86, 0.5, 4, 0.22),
    }),
    [],
  );

  const bales = useMemo<Placement[]>(
    () =>
      BARN_YARD.filter((p) => p.kind === 'bale').map((p) => {
        const w = toWorld(BARN, p.lx, p.lz);
        return {
          position: [w[0], 0.36 * p.scale, w[1]] as const,
          rot: [0, BARN.rot + p.rot, 0] as const,
          scale: [p.scale, p.scale, p.scale] as const,
        };
      }),
    [],
  );
  const sacks = useMemo<Placement[]>(
    () =>
      BARN_YARD.filter((p) => p.kind === 'sack').map((p) => {
        const w = toWorld(BARN, p.lx, p.lz);
        return {
          position: [w[0], 0.43 * p.scale, w[1]] as const,
          rot: [0, BARN.rot + p.rot, 0] as const,
          scale: [p.scale, p.scale, p.scale] as const,
        };
      }),
    [],
  );
  // Two twine bands per bale, spaced along the bale's own long axis.
  const bands = useMemo<Placement[]>(
    () =>
      bales.flatMap((b) => {
        const rotY = b.rot?.[1] ?? 0;
        const ax = Math.cos(rotY);
        const az = -Math.sin(rotY);
        const s = b.scale?.[0] ?? 1;
        return [-0.34, 0.34].map((o) => ({
          position: [b.position[0] + ax * o * s, b.position[1], b.position[2] + az * o * s] as const,
          rot: b.rot,
          scale: [s, s, s] as const,
        }));
      }),
    [bales],
  );

  return (
    <group>
      <Instanced geometry={g.bale} material={m.hay} items={bales} />
      <Instanced geometry={g.band} material={m.timber} items={bands} />
      <Instanced geometry={g.sack} material={m.burlap} items={sacks} />
    </group>
  );
}

/**
 * The windmill.
 *
 * The tallest thing on the ranch on purpose: a low sun needs something to rake past, and a slowly
 * turning wheel is the one piece of ambient motion at eye level that tells a child the world is running
 * rather than paused. It stops dead under `prefers-reduced-motion` — a child who asked for less movement
 * should not be handed a metronome.
 */
function Windmill({ reduced }: { reduced: boolean }): JSX.Element {
  const m = materials();
  const wheel = useRef<Group>(null);

  const g = useMemo(() => {
    const legLength = Math.hypot(TOWER_H, LEG_BASE_R - LEG_TOP_R);
    return {
      legLength,
      leg: new RoundedBoxGeometry(0.15, legLength, 0.15, 2, 0.05),
      // Unit radius, scaled per collar. One geometry for all three.
      collar: new CylinderGeometry(1, 1, 0.09, 16, 1, true),
      platform: new CylinderGeometry(0.46, 0.5, 0.16, 12),
      base: new CylinderGeometry(1.32, 1.5, 0.42, 16),
      hub: new SphereGeometry(0.3, 14, 10),
      vane: new RoundedBoxGeometry(1.6, 0.52, 0.05, 1, 0.025),
      // The rim is what makes a wheel of blades read instantly as a windmill rather than as a propeller.
      rim: new TorusGeometry(2.12, 0.055, 5, 30),
      tail: new RoundedBoxGeometry(1.35, 0.86, 0.05, 1, 0.04),
      boom: new RoundedBoxGeometry(1.6, 0.12, 0.12, 1, 0.04),
    };
  }, []);

  const collars: readonly number[] = [1.5, 3.3, 5.0];

  // Six blades, each pitched about its own long axis before being swung into place — see the `ZYX` note
  // on `Placement.rot`. The pitch is why the wheel catches the sun unevenly as it turns.
  const vanes = useMemo<Placement[]>(
    () =>
      // Ten rather than six. At six, three blades are edge-on to the camera at any moment and the wheel
      // reads as a bent propeller; ten fills the rim the way a farm windmill's fan does. The pitch is
      // shallow for the same reason — steeply pitched blades disappear when they face away.
      Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return { position: [Math.cos(a) * 1.3, Math.sin(a) * 1.3, 0] as const, rot: [0.3, 0, a] as const };
      }),
    [],
  );

  useFrame((_, dt) => {
    if (reduced || !wheel.current) return;
    wheel.current.rotation.z += dt * 0.5;
  });

  return (
    <group position={[WINDMILL.x, 0, WINDMILL.z]} rotation={[0, WINDMILL.rot, 0]}>
      <mesh geometry={g.base} material={m.stone} position={[0, 0.21, 0]} castShadow receiveShadow />

      {/*
        A four-legged lattice, not a solid tower.
        The first pass made this a tapered cylinder and it read unmistakably as a traffic cone: a smooth
        closed silhouette says "moulded object", and a windmill is the one thing on a ranch that is
        obviously a framework with sky showing through it. Four splayed legs and three collars is the
        cheapest structure that says so, and against a low sun the gaps are the whole point.
      */}
      {[0, 1, 2, 3].map((i) => (
        <group key={i} rotation={[0, (i * Math.PI) / 2 + Math.PI / 4, 0]}>
          <mesh
            geometry={g.leg}
            material={m.timber}
            position={[(LEG_BASE_R + LEG_TOP_R) / 2, TOWER_H / 2, 0]}
            rotation={[0, 0, Math.atan2(LEG_TOP_R - LEG_BASE_R, TOWER_H)]}
            castShadow
            receiveShadow
          />
        </group>
      ))}
      {collars.map((y) => {
        const r = LEG_BASE_R + ((LEG_TOP_R - LEG_BASE_R) * y) / TOWER_H;
        return (
          <mesh
            key={y}
            geometry={g.collar}
            material={m.timberDeep}
            position={[0, y, 0]}
            scale={[r, 1, r]}
            castShadow
          />
        );
      })}
      <mesh geometry={g.platform} material={m.timberDeep} position={[0, TOWER_H, 0]} castShadow receiveShadow />

      <group position={[0, TOWER_H + 0.4, 0]}>
        <mesh geometry={g.hub} material={m.timberDeep} position={[0, 0, 0.44]} castShadow />
        <group ref={wheel} position={[0, 0, 0.52]}>
          <Instanced geometry={g.vane} material={m.painted} items={vanes} receiveShadow={false} />
          <mesh geometry={g.rim} material={m.timberDeep} castShadow />
        </group>
        {/* Tail vane, so the head reads as pointing into a wind. */}
        <mesh
          geometry={g.boom}
          material={m.timberDeep}
          position={[0, 0, -0.9]}
          rotation={[0, Math.PI / 2, 0]}
          castShadow
        />
        <mesh
          geometry={g.tail}
          material={m.painted}
          position={[0, 0.12, -1.7]}
          rotation={[0, Math.PI / 2, 0]}
          castShadow
        />
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ *\
   Foliage
\* ------------------------------------------------------------------ */

function Foliage(): JSX.Element {
  const m = materials();
  const g = useMemo(
    () => ({
      trunk: new CylinderGeometry(0.16, 0.3, 1, 7, 1),
      // A tree is three overlapping masses, not one ball: the overlap is what gives the silhouette lobes
      // for a low sun to find edges in.
      leaf: new SphereGeometry(1, 11, 8),
    }),
    [],
  );

  const trunks = useMemo<Placement[]>(
    () =>
      TREES.map((t) => ({
        position: [t.x, t.y + t.trunkH / 2, t.z] as const,
        rot: [0, t.tint * 6.28, t.lean] as const,
        scale: [1, t.trunkH, 1] as const,
        color: new Color(PIG.timberDeep).lerp(new Color(PIG.timber), t.tint),
      })),
    [],
  );

  const leaves = useMemo<Placement[]>(() => {
    const out: Placement[] = [];
    const deep = new Color(PIG.canopy);
    const lit = new Color(PIG.canopyLit);
    for (const t of TREES) {
      const blobs: readonly (readonly [number, number, number, number])[] = [
        [0, t.trunkH + t.spread * 0.62, 0, 1],
        [t.spread * 0.5, t.trunkH + t.spread * 0.24, t.spread * 0.32, 0.74],
        [-t.spread * 0.42, t.trunkH + t.spread * 0.3, -t.spread * 0.36, 0.68],
      ];
      blobs.forEach((b, i) => {
        const s = b[3];
        out.push({
          position: [t.x + b[0] + t.lean * b[1], t.y + b[1], t.z + b[2]] as const,
          rot: [0, t.tint * 3.14 + i, 0] as const,
          scale: [t.spread * s, t.spread * s * 0.82, t.spread * s] as const,
          // Higher blobs lean toward the sunlit pigment. Cheap standing-in for ambient occlusion, and
          // it is what stops a mass of instanced spheres reading as a mass of instanced spheres.
          color: deep.clone().lerp(lit, clamp(0.25 + (i === 0 ? 0.55 : 0) + t.tint * 0.3, 0, 1)),
        });
      });
    }
    for (const b of BUSHES) {
      out.push({
        position: [b.x, b.r * 0.62, b.z] as const,
        rot: [0, b.tint * 6.28, 0] as const,
        scale: [b.r * 1.5, b.r, b.r * 1.35] as const,
        color: deep.clone().lerp(lit, 0.15 + b.tint * 0.45),
      });
    }
    return out;
  }, []);

  return (
    <group>
      <Instanced geometry={g.trunk} material={m.timber} items={trunks} />
      <Instanced geometry={g.leaf} material={m.canopy} items={leaves} />
    </group>
  );
}

/* ------------------------------------------------------------------ *\
   Assembly
\* ------------------------------------------------------------------ */

export function Buildings(): JSX.Element {
  const reduced = usePrefersReducedMotion();
  return (
    <group>
      <Ground />
      <Barn />
      {/*
        Inside the barn, and the doors that let you in. A sibling of `Barn` rather than a child of it,
        because it owns two `useFrame` hooks — one for the door swing, one for the visibility gate — and
        `Barn` is deliberately a pure static component that renders once and never again.
      */}
      <BarnInterior />
      <Hut />
      {/*
        Every window on both buildings, in one place. Authored in world space so nine windows across two
        hosts share one set of instanced meshes, which is the whole reason they cost sixteen draw calls
        instead of a hundred and thirty.
      */}
      <Windows />
      <Pens />
      <Trough />
      <BarnYard />
      <Windmill reduced={reduced} />
      <Foliage />
    </group>
  );
}
