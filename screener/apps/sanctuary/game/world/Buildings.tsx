import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef, type JSX } from 'react';
import {
  BoxGeometry,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Euler,
  Float32BufferAttribute,
  Group,
  type InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

import { usePrefersReducedMotion } from './motion';
import { clamp, fbm, lerp, noise2, rng, smoothstep } from './noise';
import { gableRoofGeometry, gableWallGeometry, hipRoofGeometry } from './roofs';
import { grainTexture, rippleTexture } from './textures';

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

interface Placed {
  x: number;
  z: number;
  /** Rotation about Y, radians. */
  rot: number;
}

/**
 * The barn. The hero building, and the thing in frame at arrival that a child will walk toward.
 *
 * Turned 94.5° so the gable end with the big doors is presented about 29° off the arrival sightline
 * rather than square to it. Square-on you read one flat rectangle; off-axis you read two faces at
 * different brightnesses and the building acquires volume. The angle also decides which face the sun
 * lands on: with the sun where `Lighting.tsx` puts it, the long side takes the full gold and the door end
 * takes a softer gold, and that difference between two adjacent planes is most of why the building looks
 * like it has weight.
 */
const BARN = { x: -14.5, z: 1.5, rot: 1.65 } satisfies Placed;
const BARN_W = 10.5; // across the slopes
const BARN_D = 14; // along the ridge
const BARN_WALL_H = 5.0;
const BARN_RISE = 3.6;
const BARN_ROOF_T = 0.44;
const BARN_EAVE = 0.62;
const BARN_RAKE = 0.75;
const BARN_PLINTH_H = 0.44;

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

/* ------------------------------------------------------------------ *\
   Pigment

   Unlit albedo, not finished colour. `palette3d.ts` states the rule and it is the one that keeps this
   from clipping to white: a value picked to look right on a flat 2D page already has its light baked in,
   and handing it to a 3.15-intensity sun blows it out. Everything below is the pigment that *resolves*
   to the palette's intent once the golden sun is on it. Per `world/palette.ts` there is no black and no
   neutral grey in the list — even the stone is a warm brown.
\* ------------------------------------------------------------------ */

const PIG = {
  // Warmer and paler than a midday green on purpose. A flat meadow under an 18° sun receives only
  // `sin(18°)` of it, so a deep saturated green resolves to cold olive no matter how strong the sun is.
  // Late-summer grass is half-dry anyway, and the dry pigment is both truer and twice as bright.
  grass: '#9dbd63',
  grassDeep: '#6c9052',
  grassPale: '#c6cd7b',
  // Pale dust, not damp soil. The first pass used a mid brown and the worn tracks came out *darker* than
  // the grass beside them, so at eye level the whole path network read as a shadow lying on the meadow
  // rather than as a path. A dry track in a dry field is the lighter of the two.
  earth: '#bb9a6c',
  earthPale: '#d2b485',
  stone: '#b09c81',
  stoneDeep: '#8a7659',
  timber: '#8a6a49',
  timberDeep: '#684d34',
  barnRed: '#9a4030',
  cream: '#ece5d2',
  creamDeep: '#d8c4a0',
  shingle: '#6a5340',
  thatch: '#c9964f',
  canopy: '#568644',
  canopyLit: '#7ea653',
  water: '#3d708a',
  honey: '#dda43d',
  hay: '#d6b060',
  burlap: '#c9ad80',
} as const;

/* ------------------------------------------------------------------ *\
   Materials

   Shared instances rather than one per mesh, so three can batch state changes, and module-memoised so
   remounting the ranch does not rebuild them. The grain map from `textures.ts` does quiet but
   load-bearing work: the same seamless map on every surface at ~6% contrast, driving both albedo and
   roughness, which is the difference between a wall and a coloured rectangle.
\* ------------------------------------------------------------------ */

type MatName =
  | 'ground'
  | 'decal'
  | 'barnWall'
  | 'trim'
  | 'shingle'
  | 'thatch'
  | 'plaster'
  | 'timber'
  | 'timberDeep'
  | 'stone'
  | 'stoneDeep'
  | 'hay'
  | 'burlap'
  | 'water'
  | 'lamplight'
  | 'canopy'
  | 'painted';

let MATS: Record<MatName, MeshStandardMaterial> | null = null;

function materials(): Record<MatName, MeshStandardMaterial> {
  if (MATS) return MATS;
  const grain = grainTexture();
  const make = (color: string, roughness: number, repeat: number, vertexColors = false): MeshStandardMaterial => {
    const m = new MeshStandardMaterial({ color, roughness, metalness: 0, vertexColors });
    if (grain) {
      // Cloned so each surface picks its own repeat; the clone shares the source, so this is still one
      // texture on the GPU.
      const t = grain.clone();
      t.repeat.set(repeat, repeat);
      t.needsUpdate = true;
      m.map = t;
      m.roughnessMap = t;
    }
    return m;
  };

  MATS = {
    // Repeat 1: the ground's UVs are already in units of `GRAIN_METRES`, so the tiling is set there.
    ground: make('#ffffff', 0.98, 1, true),
    decal: new MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.95,
      transparent: true,
      depthWrite: false,
      /**
       * The decal is a flat triangle soup in the XZ plane with an explicit `(0, 1, 0)` normal attribute,
       * and back-face culling does not consult that attribute — it consults winding. The first pass wound
       * these quads for a downward normal and the entire path network was culled away invisibly, which is
       * a silent failure worth naming: the geometry was correct, the lighting was correct, and nothing
       * was on screen. Double-sided rather than re-wound because the underside of a ground decal is not
       * reachable, so this cannot cost anything and cannot be got wrong again.
       */
      side: DoubleSide,
      // Held 2cm off the ground and given a depth nudge as well: belt and braces against z-fighting
      // when the camera is at a child's eye height and the ground is nearly edge-on.
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
    barnWall: make(PIG.barnRed, 0.82, 0.6),
    trim: make(PIG.cream, 0.8, 0.9),
    shingle: make(PIG.shingle, 0.74, 1.4),
    thatch: make(PIG.thatch, 0.95, 2.2),
    plaster: make(PIG.cream, 0.88, 0.7),
    timber: make(PIG.timber, 0.78, 1.6),
    timberDeep: make(PIG.timberDeep, 0.74, 1.6),
    stone: make(PIG.stone, 0.92, 0.8),
    stoneDeep: make(PIG.stoneDeep, 0.9, 0.9),
    hay: make(PIG.hay, 0.96, 1.8),
    burlap: make(PIG.burlap, 0.95, 2.0),
    water: new MeshStandardMaterial({ color: PIG.water, roughness: 0.16, metalness: 0.12 }),
    lamplight: new MeshStandardMaterial({
      color: '#6b4a2c',
      emissive: new Color(PIG.honey),
      emissiveIntensity: 2.8,
      roughness: 0.5,
    }),
    canopy: make('#ffffff', 0.9, 0.5),
    painted: make(PIG.creamDeep, 0.62, 1.2),
  };
  return MATS;
}

/* ------------------------------------------------------------------ *\
   Geometry helpers
\* ------------------------------------------------------------------ */

type P2 = readonly [number, number];

/**
 * Local (x, z) to world (x, z) for a placed object.
 *
 * Matches three's `rotation.y`: `x' = x cos + z sin`, `z' = -x sin + z cos`. Props are authored in their
 * building's local frame and converted through here, because typing world coordinates for a prop beside
 * a building rotated 94.5° is exactly how a hay bale ends up inside a wall.
 */
function toWorld(p: Placed, lx: number, lz: number): P2 {
  const c = Math.cos(p.rot);
  const s = Math.sin(p.rot);
  return [p.x + lx * c + lz * s, p.z - lx * s + lz * c];
}

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

/** A closed rounded-rectangle outline in local (x, z). Pens, their floors and their fences share it. */
function roundedRectOutline(halfW: number, halfD: number, radius: number, perCorner: number): P2[] {
  const r = Math.min(radius, Math.min(halfW, halfD) * 0.92);
  const cx = halfW - r;
  const cz = halfD - r;
  const corners: readonly (readonly [number, number, number])[] = [
    [cx, cz, 0],
    [-cx, cz, Math.PI / 2],
    [-cx, -cz, Math.PI],
    [cx, -cz, (3 * Math.PI) / 2],
  ];
  const out: P2[] = [];
  for (const corner of corners) {
    const ox = corner[0];
    const oz = corner[1];
    const a0 = corner[2];
    for (let i = 0; i <= perCorner; i += 1) {
      const a = a0 + (i / perCorner) * (Math.PI / 2);
      out.push([ox + Math.cos(a) * r, oz + Math.sin(a) * r]);
    }
  }
  return out;
}

/** Cumulative arc length of a closed polyline, plus its total. */
function arcLengths(points: readonly P2[]): { at: number[]; total: number } {
  const at: number[] = [0];
  let total = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i] ?? [0, 0];
    const b = points[(i + 1) % points.length] ?? [0, 0];
    total += Math.hypot(b[0] - a[0], b[1] - a[1]);
    at.push(total);
  }
  return { at, total };
}

/** Point and tangent at arc length `s` around a closed polyline. */
function sampleClosed(
  points: readonly P2[],
  at: readonly number[],
  total: number,
  s: number,
): { p: P2; angle: number } {
  const target = ((s % total) + total) % total;
  let i = 0;
  while (i < points.length - 1 && (at[i + 1] ?? total) < target) i += 1;
  const a = points[i % points.length] ?? [0, 0];
  const b = points[(i + 1) % points.length] ?? [0, 0];
  const s0 = at[i] ?? 0;
  const seg = (at[i + 1] ?? total) - s0;
  const f = seg > 1e-6 ? (target - s0) / seg : 0;
  return {
    p: [lerp(a[0], b[0], f), lerp(a[1], b[1], f)],
    angle: Math.atan2(b[1] - a[1], b[0] - a[0]),
  };
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
 * radially. The two buildings are wrapped as *chains* of small circles around their footprints rather
 * than as one big circle each: a single circle inscribing the barn would be 10.5m across and would stop a
 * child three metres short of its own doors, and one circumscribing it would swallow the path. A chain
 * costs about thirty entries per building and is accurate to 10cm.
 *
 * The gate openings are deliberately left empty, so every pen can be walked into.
 *
 * `position` is `[x, z]` in world metres. About 140 entries, so a brute-force pass is a few microseconds.
 */
export const SOLIDS: { position: [number, number]; radius: number }[] = (() => {
  const out: { position: [number, number]; radius: number }[] = [];

  const chainRect = (p: Placed, halfW: number, halfD: number, radius: number, spacing: number): void => {
    const outline = roundedRectOutline(halfW, halfD, Math.min(halfW, halfD) * 0.35, 4);
    const { at, total } = arcLengths(outline);
    const n = Math.max(4, Math.round(total / spacing));
    for (let i = 0; i < n; i += 1) {
      const sample = sampleClosed(outline, at, total, (i / n) * total);
      const w = toWorld(p, sample.p[0], sample.p[1]);
      out.push({ position: [w[0], w[1]], radius });
    }
  };

  chainRect(BARN, BARN_W / 2, BARN_D / 2, 0.95, 1.45);
  chainRect(HUT, HUT_W / 2, HUT_D / 2, 0.9, 1.4);

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
   Instanced helper
\* ------------------------------------------------------------------ */

interface Placement {
  position: readonly [number, number, number];
  /**
   * Euler angles in radians, composed in `ZYX` order — about X first, then Y, then Z. That order is
   * what lets a windmill vane be given a pitch about its own long axis and *then* be swung into place
   * around the hub; the default XYZ would tilt the whole wheel instead.
   */
  rot?: readonly [number, number, number];
  scale?: readonly [number, number, number];
  color?: Color;
}

/**
 * One `InstancedMesh`, filled once.
 *
 * Written out rather than using drei's `<Instances>` because every placement here is static: solved at
 * module scope, never animated, never picked. A component per instance would buy reactivity nothing uses
 * and cost a React node per fence post.
 */
function Instanced({
  geometry,
  material,
  items,
  castShadow = true,
  receiveShadow = true,
}: {
  geometry: BufferGeometry;
  material: MeshStandardMaterial;
  items: readonly Placement[];
  castShadow?: boolean;
  receiveShadow?: boolean;
}): JSX.Element {
  const ref = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const matrix = new Matrix4();
    const q = new Quaternion();
    const euler = new Euler(0, 0, 0, 'ZYX');
    const scale = new Vector3();
    const pos = new Vector3();
    let anyColor = false;
    items.forEach((item, i) => {
      pos.set(item.position[0], item.position[1], item.position[2]);
      scale.set(item.scale?.[0] ?? 1, item.scale?.[1] ?? 1, item.scale?.[2] ?? 1);
      euler.set(item.rot?.[0] ?? 0, item.rot?.[1] ?? 0, item.rot?.[2] ?? 0, 'ZYX');
      q.setFromEuler(euler);
      matrix.compose(pos, q, scale);
      mesh.setMatrixAt(i, matrix);
      if (item.color) {
        mesh.setColorAt(i, item.color);
        anyColor = true;
      }
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (anyColor && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items, geometry]);

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, Math.max(1, items.length)]}
      count={items.length}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      // The bounding sphere of a world-spanning instance set never culls anyway, and skipping the test
      // avoids a per-frame sphere transform for nothing.
      frustumCulled={false}
    />
  );
}

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
      // A wide, soft de-saturation under the worn tracks. The crisp path is a decal on top of this; the
      // point of doing both is that the decal's fade then has something to fade into.
      const dPath = distanceToPaths(x, z);
      if (dPath < 6) {
        scratch.copy(earth).lerp(grassPale, 0.35);
        c.lerp(scratch, (1 - smoothstep(1.4, 6, dPath)) * 0.5);
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
 * The worn earth — tracks and pen floors — as one transparent decal mesh.
 *
 * Vertex *alpha*, via a four-component colour attribute that three reads as RGBA, is what lets a path
 * fade out at its edges instead of ending on a cut line. A path with a hard edge looks like a road
 * marking; a path that dissolves into the grass looks like something walked into being, and it does the
 * wayfinding job an arrow or a quest marker would otherwise have to do.
 */
function useDecalGeometry(): BufferGeometry {
  return useMemo(() => {
    const position: number[] = [];
    const rgba: number[] = [];
    const normal: number[] = [];
    const y = 0.02;

    const earth = new Color(PIG.earthPale);
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

    // Tracks. Four longitudinal lanes per segment: two at core opacity, two feathering to nothing.
    const lanes: readonly (readonly [number, number])[] = [
      [-1, -0.58],
      [-0.58, 0],
      [0, 0.58],
      [0.58, 1],
    ];
    const laneAlpha = (t: number): number => (Math.abs(t) >= 0.999 ? 0 : Math.abs(t) > 0.6 ? 0.6 : 0.94);

    PATHS.forEach((line, li) => {
      const half = (PATH_WIDTH[li] ?? 2) / 2;
      // Averaged joint normals, so a corner does not open a wedge of grass down the middle of the path.
      const normals: P2[] = line.map((_, i) => {
        const prev = line[Math.max(0, i - 1)] ?? [0, 0];
        const next = line[Math.min(line.length - 1, i + 1)] ?? [0, 0];
        const dx = next[0] - prev[0];
        const dz = next[1] - prev[1];
        const len = Math.hypot(dx, dz) || 1;
        return [-dz / len, dx / len];
      });
      for (let i = 0; i < line.length - 1; i += 1) {
        const p0 = line[i];
        const p1 = line[i + 1];
        const n0 = normals[i];
        const n1 = normals[i + 1];
        if (!p0 || !p1 || !n0 || !n1) continue;
        // The width wanders, so no two stretches of the same track are the same width.
        const w0 = half * (1 + fbm(p0[0] * 0.2, p0[1] * 0.2, 2) * 0.18);
        const w1 = half * (1 + fbm(p1[0] * 0.2, p1[1] * 0.2, 2) * 0.18);
        for (const lane of lanes) {
          const t0 = lane[0];
          const t1 = lane[1];
          quad(
            [p0[0] + n0[0] * w0 * t0, p0[1] + n0[1] * w0 * t0],
            [p1[0] + n1[0] * w1 * t0, p1[1] + n1[1] * w1 * t0],
            [p1[0] + n1[0] * w1 * t1, p1[1] + n1[1] * w1 * t1],
            [p0[0] + n0[0] * w0 * t1, p0[1] + n0[1] * w0 * t1],
            [laneAlpha(t0), laneAlpha(t0), laneAlpha(t1), laneAlpha(t1)],
            earth,
          );
        }
      }
    });

    // Pen floors: trodden bare earth inside the fence, feathering out just past it.
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
  const decal = useDecalGeometry();
  return (
    <>
      {/* Receives but does not cast: 20k triangles of flat ground contribute nothing to a shadow map. */}
      <mesh geometry={ground} material={m.ground} receiveShadow />
      <mesh geometry={decal} material={m.decal} receiveShadow renderOrder={1} />
    </>
  );
}

/* ------------------------------------------------------------------ *\
   The barn
\* ------------------------------------------------------------------ */

function Barn(): JSX.Element {
  const m = materials();

  const g = useMemo(() => {
    const roofHalfW = BARN_W / 2 + BARN_EAVE;
    const roofHalfD = BARN_D / 2 + BARN_RAKE;
    return {
      plinth: new RoundedBoxGeometry(BARN_W + 0.5, BARN_PLINTH_H, BARN_D + 0.5, 2, 0.1),
      walls: new RoundedBoxGeometry(BARN_W, BARN_WALL_H, BARN_D, 3, 0.18),
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
      door: new RoundedBoxGeometry(1.85, 3.5, 0.16, 2, 0.06),
      ledge: new RoundedBoxGeometry(1.78, 0.19, 0.09, 1, 0.045),
      brace: new RoundedBoxGeometry(Math.hypot(1.7, 2.6), 0.19, 0.09, 1, 0.045),
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

  const gableZ = BARN_D / 2 - 0.17;

  // Vertical battens down the long walls. Board-and-batten is *the* ranch-barn surface, and it is also
  // what breaks a 14-metre wall into something with a scale a child can read.
  const battens = useMemo<Placement[]>(() => {
    const out: Placement[] = [];
    const n = 13;
    for (let i = 0; i < n; i += 1) {
      const z = -BARN_D / 2 + 0.6 + (i / (n - 1)) * (BARN_D - 1.2);
      for (const side of [-1, 1] as const) {
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
      {/* Footing. A building that meets the grass on a stone course looks planted; one that does not
          looks dropped. */}
      <mesh
        geometry={g.plinth}
        material={m.stone}
        position={[0, BARN_PLINTH_H / 2, 0]}
        castShadow
        receiveShadow
      />

      <group position={[0, BARN_PLINTH_H, 0]}>
        <mesh
          geometry={g.walls}
          material={m.barnWall}
          position={[0, BARN_WALL_H / 2, 0]}
          castShadow
          receiveShadow
        />
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

        {/* Big doors on the +Z gable end, shut, with the cross brace that makes a barn door a barn
            door. Hung 9mm proud of the wall so they read as boards on it rather than as part of it. */}
        <group position={[0, 0, BARN_D / 2 + 0.13]}>
          {[-1, 1].map((side) => (
            <group key={side} position={[side * 0.95, 1.78, 0]}>
              <mesh geometry={g.door} material={m.timber} castShadow receiveShadow />
              {/* Ledge, ledge, brace: the Z-frame every real barn door is built on. Mirrored per leaf so
                  the two diagonals meet at the middle, which is the shape the eye recognises. */}
              {[-1.3, 1.3].map((y) => (
                <mesh key={y} geometry={g.ledge} material={m.trim} position={[0, y, 0.1]} castShadow />
              ))}
              <mesh
                geometry={g.brace}
                material={m.trim}
                position={[0, 0, 0.1]}
                rotation={[0, 0, side * Math.atan2(2.6, 1.7)]}
                castShadow
              />
            </group>
          ))}
        </group>
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
      ridge: new CylinderGeometry(0.2, 0.2, HUT_D * 0.34 + 0.5, 9, 1),
      beam: new RoundedBoxGeometry(0.17, HUT_WALL_H - 0.1, 0.17, 2, 0.055),
      lintel: new RoundedBoxGeometry(HUT_W - 0.5, 0.2, 0.17, 2, 0.06),
      door: new RoundedBoxGeometry(1.05, 2.05, 0.14, 2, 0.09),
      window: new RoundedBoxGeometry(0.86, 0.78, 0.1, 2, 0.07),
      sill: new RoundedBoxGeometry(1.12, 0.12, 0.24, 2, 0.05),
      chimney: new RoundedBoxGeometry(0.72, 2.5, 0.72, 2, 0.1),
      chimneyCap: new RoundedBoxGeometry(0.94, 0.18, 0.94, 2, 0.06),
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

  const windows: readonly { at: readonly [number, number, number]; rotY: number }[] = [
    { at: [1.35, 1.75, HUT_D / 2 + 0.05], rotY: 0 },
    { at: [-HUT_W / 2 - 0.05, 1.75, 0.75], rotY: Math.PI / 2 },
    { at: [-HUT_W / 2 - 0.05, 1.75, -1.3], rotY: Math.PI / 2 },
  ];

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

        {/* Door on +Z, the face turned toward the arrival path. */}
        <mesh
          geometry={g.door}
          material={m.timber}
          position={[-0.9, 1.03, HUT_D / 2 + 0.07]}
          castShadow
          receiveShadow
        />

        {/*
          Lamplight. With the sun where it is, the hut is the one building left in shadow, which would
          make it the dead corner of the composition — so it gets a warm interior instead. Three emissive
          panes and one unshadowed point light at the door is the whole cost, and against a blue shadow
          side it is the most inviting thing in the ranch.
        */}
        {windows.map((w, i) => (
          <group key={i} position={w.at as unknown as [number, number, number]} rotation={[0, w.rotY, 0]}>
            <mesh geometry={g.window} material={m.lamplight} />
            <mesh geometry={g.sill} material={m.timberDeep} position={[0, -0.48, 0.04]} castShadow />
          </group>
        ))}
        <pointLight
          position={[-0.9, 1.5, HUT_D / 2 + 0.9]}
          color={PIG.honey}
          intensity={5.5}
          distance={7}
          decay={2}
        />

        <group position={[0, HUT_WALL_H, 0]}>
          <mesh geometry={g.roof} material={m.thatch} castShadow receiveShadow />
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
        <group position={[HUT_W / 2 - 1.1, 0, -HUT_D / 2 + 1.0]}>
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
      <Hut />
      <Pens />
      <Trough />
      <BarnYard />
      <Windmill reduced={reduced} />
      <Foliage />
    </group>
  );
}
