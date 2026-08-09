import { useMemo, type JSX } from 'react';
import {
  Color,
  ExtrudeGeometry,
  MeshBasicMaterial,
  Path,
  PlaneGeometry,
  Shape,
  SphereGeometry,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

import {
  BARN,
  BARN_D,
  BARN_PLINTH_H,
  BARN_W,
} from './barn';
import { Instanced, type Placement } from './instanced';
import { rng } from './noise';
import { PIG, materials } from './pigment';
import { toWorld, type Placed } from './plan';

/**
 * WINDOWS THAT LOOK LIVED IN.
 *
 * THE OWNER'S ASK, verbatim: "for the windows on the houses, make them actually paned and have decorations
 * on them, perhaps with shutters and a tiny bed of bushes beneath them or flower pots or SOMETHING to make
 * it look more homey".
 *
 * WHAT WAS THERE. Three rounded boxes on the hut, 86cm by 78cm, painted with an emissive honey material at
 * 2.8 intensity. Not a window: a glowing rectangle stuck to a wall. And the barn had none at all, which is
 * why a 14-metre red wall read as a shipping container with a roof on it. The word in the owner's note that
 * matters most is "homey", and homey is not a material property. It is the evidence that somebody lives
 * there, and evidence is made of objects: joinery somebody cut, paint somebody chose, and a plant somebody
 * is keeping alive.
 *
 * SO A WINDOW HERE IS NINE THINGS, and every one of them earns its place:
 *
 *   1. A FRAME standing 10cm proud of the wall, which gives the opening a reveal. A window with no reveal
 *      is a decal; the shadow the frame casts into its own opening under a 20° sun is most of what says
 *      "fitted".
 *   2. MULLIONS, a vertical and one or two horizontals, so the glass is four or six panes. This is the
 *      literal ask — "actually paned" — and it is also what sets the scale of the whole building: a child
 *      reads a six-pane window as about their own height without being told.
 *   3. THE ROOM BEHIND THE GLASS, as an UNLIT warm panel. Unlit is the decision: a lit room's light does
 *      not depend on where the sun is, so it must not be shaded. It is also what lets every window carry
 *      its own colour and brightness through one draw call — see `glow` below.
 *   4. A GLASS PANE in front of the glow, transparent, at roughness 0.09. This is the piece that turns a
 *      hole into a window. A specular highlight sitting IN FRONT of the glow is the only cue that says
 *      glazed, and it needs a second surface to sit on.
 *   5. A SILL, projecting, so rain would run off it and so the window has a base.
 *   6. SHUTTERS, hinged at the outer edges of the frame and standing open at an angle that differs window
 *      to window. Half of them are louvred and half are pierced with a round port.
 *   7. HINGE STRAPS, because a shutter attached to nothing hovers.
 *   8. PLANTING: a timber box on corbels with soil and blooms in it, or a bed of small clipped bushes in
 *      the ground beneath. Both, across the ranch, because the owner offered both.
 *   9. A LINTEL BOARD over the top of the frame, which is what stops the frame reading as a picture mount.
 *
 * NO TWO ARE THE SAME, which is a stated requirement and is met on seven axes at once: pane grid, overall
 * proportion, shutter style, shutter paint from a five-colour family, shutter opening angle, planting kind,
 * and bloom mix. `WINDOWS` below is the whole census and every row differs from every other in at least
 * three of those.
 *
 * WHAT IT COSTS. Fourteen draw calls for every window on both buildings — about 260 parts — because every
 * repeated piece goes through one `InstancedMesh` and the placements are solved in WORLD space at module
 * scope rather than under each building's transform. That is the whole reason this file authors in world
 * coordinates instead of nesting groups: nested groups would mean one instanced mesh per building per
 * part, and the draw-call count would double for no visual gain.
 */

/* ------------------------------------------------------------------ *\
   The mirrored hut constants

   The hut's numbers live in `Buildings.tsx` and the barn's in `barn.ts`. Rather than reach back into the
   component that renders this one — which would be a circular import — the four hut numbers this file
   needs are stated here, next to a note saying so. The barn's come from `barn.ts`, which is a plain
   module and safe to import.
\* ------------------------------------------------------------------ */

const HUT: Placed = { x: 13.0, z: -5.0, rot: 0.087 };
const HUT_W = 6.6;
const HUT_D = 5.4;
const HUT_PLINTH_H = 0.36;

/* ------------------------------------------------------------------ *\
   Which wall
\* ------------------------------------------------------------------ */

/**
 * A wall, as the yaw that turns a window's local frame onto it.
 *
 * The window's own frame is: origin on the wall's OUTER face, `+Z` pointing out of the building, `+X`
 * along the wall to the right as you face it, `+Y` up. So a wall is fully described by the yaw that maps
 * that `+Z` onto its outward normal.
 *
 * THE SIGNS ARE THE ONLY HARD PART and the existing hut had one of them wrong, harmlessly. three's
 * `rotation.y = φ` maps a local `(x, z)` to `(x cos φ + z sin φ, -x sin φ + z cos φ)`, so local `+Z` goes
 * to `(sin φ, cos φ)`. Hence `+π/2` faces local `+X` and `-π/2` faces local `-X`. The old windows on the
 * hut's `-X` wall were given `+π/2`, which pointed their fronts into the wall — invisible when a window is
 * a symmetrical box, and fatal the moment it has a sill and shutters on one side of it.
 */
const WALL = {
  frontZ: 0,
  backZ: Math.PI,
  plusX: Math.PI / 2,
  minusX: -Math.PI / 2,
} as const;

interface ShutterSpec {
  style: 'louvre' | 'pierced';
  paint: string;
  /** Radians open, about the vertical hinge at the frame's outer edge. 0 is shut across the glass. */
  angle: number;
}

interface WindowSpec {
  name: string;
  host: Placed;
  wallYaw: number;
  /** Where the window's centre sits: (along the wall, height above the plinth top). */
  on: readonly [number, number];
  /** The wall's outer face, as the host-local coordinate on the axis the wall is perpendicular to. */
  face: number;
  /** The host's plinth height, since a window is measured from the wall head down, not from the grass. */
  plinth: number;
  w: number;
  h: number;
  cols: number;
  rows: number;
  shutter: ShutterSpec | null;
  planting: 'box' | 'bed';
  /**
   * The colour of the room behind the glass. Warmth AND brightness both vary, window to window.
   *
   * DEEPER THAN THEY LOOK ON A SWATCH, and this is the correction a screenshot forced. The first pass used
   * near-white ambers around #ffc873; drawn unlit, that comes out BRIGHTER than the sunlit cream wall
   * around it, and a rectangle brighter than its wall is exactly the "hole" the owner's note is about. What
   * a lit room actually looks like from outside in daylight is DARKER than the wall and unmistakably warm —
   * so these sit two stops down, and they read as glowing precisely where they should: on the hut's shaded
   * wall, and in the low light at the end of the day.
   */
  glow: string;
  seed: number;
}

/**
 * A window's centre in the host's local frame, from its wall and its position along it.
 *
 * One function so a window is specified by "which wall, how far along, how high" and never by three raw
 * coordinates — which is how a window ends up 4cm inside a wall.
 */
function anchorOf(spec: WindowSpec): readonly [number, number, number] {
  const along = spec.on[0];
  switch (spec.wallYaw) {
    case WALL.frontZ:
      return [along, spec.on[1], spec.face];
    case WALL.backZ:
      return [-along, spec.on[1], spec.face];
    case WALL.plusX:
      return [spec.face, spec.on[1], -along];
    default:
      return [spec.face, spec.on[1], along];
  }
}

/**
 * A point in a window's own frame, converted to world metres.
 *
 * Two rotations, applied in the right order: the part is first turned onto its wall inside the host's
 * frame, then the whole host is turned into the world. Doing it the other way round puts every shutter on
 * the wrong side of every building.
 */
function place(
  spec: WindowSpec,
  px: number,
  py: number,
  pz: number,
): readonly [number, number, number] {
  const anchor = anchorOf(spec);
  const c = Math.cos(spec.wallYaw);
  const s = Math.sin(spec.wallYaw);
  const lx = anchor[0] + px * c + pz * s;
  const lz = anchor[2] - px * s + pz * c;
  const w = toWorld(spec.host, lx, lz);
  return [w[0], spec.plinth + anchor[1] + py, w[1]];
}

/** The world `rotation.y` for a part sitting square in a window's frame. */
function yawOf(spec: WindowSpec, extra = 0): number {
  return spec.host.rot + spec.wallYaw + extra;
}

/* ------------------------------------------------------------------ *\
   The census
\* ------------------------------------------------------------------ */

/** Half the wall thickness the frame has to stand clear of. Everything is measured from the outer face. */
const FRAME_T = 0.1;
const FRAME_W = 0.085;
/** The glass, and the room behind it. */
const GLOW_Z = 0.012;
const GLASS_Z = 0.055;
/** The shutter hinge plane, clear of the frame's front face by 15mm. */
const SHUTTER_Z = 0.115;
const SHUTTER_T = 0.05;

/**
 * NINE WINDOWS, and the reasoning for where each one is rather than a grid of them.
 *
 * THE HUT gets four: two flanking its door on the wall the arrival path runs into, and two on its long
 * `-X` wall. That `-X` wall is the one `Lighting.tsx` deliberately leaves in deep shade — "Lit plane next
 * to shadow plane, on the building whose job is to look like somewhere you could knock on the door of" —
 * which makes it the best wall on the ranch for a lit window, because a warm pane only reads as warm
 * against something cool.
 *
 * THE BARN gets five, and where they can go is decided for it. Its `-X` long wall is occupied: the
 * lean-to covers local z from -5.6 to 0.8, and `stations/sites.ts` bolts the coat-wall station flat to it
 * from 1.05 to 6.15. So the barn's windows go on the `+X` long wall, which is clear end to end, and two go
 * on the door end flanking the doors — which is the pair a child actually meets, because that end is what
 * you walk toward from the spawn.
 *
 * The barn's are wider and set higher than the hut's, in a 3x2 grid rather than 2x2 or 2x3. That is not
 * decoration either: a barn window is a hayloft window, high on the wall and wide rather than tall, and
 * getting that proportion right is what stops the barn reading as a very large cottage.
 */
export const WINDOWS: readonly WindowSpec[] = [
  /* ---- the hut ---- */
  {
    name: 'hut-front-right',
    host: HUT,
    wallYaw: WALL.frontZ,
    face: HUT_D / 2,
    plinth: HUT_PLINTH_H,
    on: [1.62, 1.62],
    w: 1.0,
    h: 0.92,
    cols: 2,
    rows: 2,
    // Wide open, and it is the first window a child sees. An open shutter is an invitation; a shut one is
    // a statement that nobody is in.
    shutter: { style: 'louvre', paint: PIG.shutterSage, angle: 1.15 },
    planting: 'box',
    glow: '#e09338',
    seed: 0x11a1,
  },
  {
    name: 'hut-front-left',
    host: HUT,
    wallYaw: WALL.frontZ,
    face: HUT_D / 2,
    plinth: HUT_PLINTH_H,
    on: [-2.55, 1.55],
    w: 0.82,
    h: 0.82,
    cols: 2,
    rows: 2,
    shutter: { style: 'pierced', paint: PIG.shutterClay, angle: 0.62 },
    planting: 'bed',
    // Dimmer and redder: one room with a fire in it and one with a lamp is a house, two identically lit
    // rectangles is an office.
    glow: '#c06a25',
    seed: 0x22b2,
  },
  {
    name: 'hut-side-near',
    host: HUT,
    wallYaw: WALL.minusX,
    face: -HUT_W / 2,
    plinth: HUT_PLINTH_H,
    on: [1.05, 1.66],
    w: 0.86,
    h: 1.16,
    cols: 2,
    rows: 3,
    shutter: { style: 'louvre', paint: PIG.shutterSky, angle: 0.86 },
    planting: 'box',
    glow: '#f0aa4c',
    seed: 0x33c3,
  },
  {
    name: 'hut-side-far',
    host: HUT,
    wallYaw: WALL.minusX,
    face: -HUT_W / 2,
    plinth: HUT_PLINTH_H,
    on: [-1.35, 1.58],
    w: 0.74,
    h: 0.98,
    cols: 2,
    rows: 2,
    // THE ONE PAIR THAT IS SHUT. Every shutter standing open at a jaunty angle is a pattern, and a
    // pattern reads as decoration; one closed pair is what makes the others read as somebody's choice.
    shutter: { style: 'pierced', paint: PIG.shutterRose, angle: 0.0 },
    planting: 'bed',
    glow: '#a85c22',
    seed: 0x44d4,
  },

  /* ---- the barn ---- */
  {
    name: 'barn-door-right',
    host: BARN,
    wallYaw: WALL.frontZ,
    face: BARN_D / 2,
    plinth: BARN_PLINTH_H,
    on: [3.42, 2.72],
    w: 1.14,
    h: 0.9,
    cols: 3,
    rows: 2,
    shutter: { style: 'louvre', paint: PIG.shutterButter, angle: 0.98 },
    planting: 'box',
    glow: '#d98a30',
    seed: 0x55e5,
  },
  {
    name: 'barn-door-left',
    host: BARN,
    wallYaw: WALL.frontZ,
    face: BARN_D / 2,
    plinth: BARN_PLINTH_H,
    on: [-3.42, 2.72],
    w: 1.14,
    h: 0.9,
    cols: 3,
    rows: 2,
    shutter: { style: 'louvre', paint: PIG.shutterSage, angle: 0.44 },
    planting: 'box',
    glow: '#c47a2a',
    seed: 0x66f6,
  },
  {
    name: 'barn-side-front',
    host: BARN,
    wallYaw: WALL.plusX,
    face: BARN_W / 2,
    plinth: BARN_PLINTH_H,
    on: [4.1, 2.62],
    w: 1.22,
    h: 0.86,
    cols: 3,
    rows: 2,
    shutter: { style: 'pierced', paint: PIG.shutterSky, angle: 1.22 },
    planting: 'bed',
    glow: '#e79b3e',
    seed: 0x7707,
  },
  {
    name: 'barn-side-middle',
    host: BARN,
    wallYaw: WALL.plusX,
    face: BARN_W / 2,
    plinth: BARN_PLINTH_H,
    on: [0.0, 2.66],
    w: 1.34,
    h: 0.96,
    cols: 3,
    rows: 2,
    shutter: { style: 'louvre', paint: PIG.shutterClay, angle: 0.72 },
    planting: 'box',
    glow: '#d6862c',
    seed: 0x8818,
  },
  {
    name: 'barn-side-back',
    host: BARN,
    wallYaw: WALL.plusX,
    face: BARN_W / 2,
    plinth: BARN_PLINTH_H,
    on: [-4.2, 2.58],
    w: 1.1,
    h: 0.82,
    cols: 2,
    rows: 2,
    shutter: { style: 'pierced', paint: PIG.shutterRose, angle: 1.34 },
    planting: 'bed',
    glow: '#b06826',
    seed: 0x9929,
  },
];

/* ------------------------------------------------------------------ *\
   Turning the census into placements
\* ------------------------------------------------------------------ */

interface WindowParts {
  frameJamb: Placement[];
  frameRail: Placement[];
  mullionV: Placement[];
  mullionH: Placement[];
  glow: Placement[];
  glass: Placement[];
  sill: Placement[];
  lintel: Placement[];
  louvrePanel: Placement[];
  piercedPanel: Placement[];
  slat: Placement[];
  strap: Placement[];
  planterBox: Placement[];
  corbel: Placement[];
  soil: Placement[];
  bloom: Placement[];
  bush: Placement[];
}

/**
 * Every part of every window, in world space, grouped by which instanced mesh draws it.
 *
 * Solved once at module scope. Nothing here is animated, nothing is picked, and the buildings do not
 * move, so a placement computed at import time is a placement for the life of the process.
 */
const PARTS: WindowParts = (() => {
  const parts: WindowParts = {
    frameJamb: [],
    frameRail: [],
    mullionV: [],
    mullionH: [],
    glow: [],
    glass: [],
    sill: [],
    lintel: [],
    louvrePanel: [],
    piercedPanel: [],
    slat: [],
    strap: [],
    planterBox: [],
    corbel: [],
    soil: [],
    bloom: [],
    bush: [],
  };

  const blooms = [PIG.bloomPoppy, PIG.bloomButter, PIG.bloomLilac, PIG.bloomSnow, PIG.bloomBlush];

  for (const spec of WINDOWS) {
    const rand = rng(spec.seed);
    const yaw = yawOf(spec);
    const hw = spec.w / 2;
    const hh = spec.h / 2;

    /**
     * FRAME: two jambs, a head and a bottom rail, scaled from unit bars.
     *
     * TWO BAR GEOMETRIES, ONE HORIZONTAL AND ONE VERTICAL, and the reason is worth writing down because
     * the obvious single-geometry version is subtly wrong. A bar long in X can be stood upright with a
     * quarter turn about Z — but `Instanced` composes its Eulers in `ZYX` order, which applies the Z turn
     * LAST, i.e. about the world's Z axis after the yaw has already turned the part onto its wall. On the
     * hut, whose walls are nearly world-aligned, that happens to look almost right; on the barn at 94.5°
     * every jamb comes out leaning. Two geometries and a single rotation axis per part is the version
     * that cannot be wrong on one building and right on another.
     */
    for (const sx of [-1, 1] as const) {
      parts.frameJamb.push({
        position: place(spec, sx * (hw + FRAME_W / 2), 0, FRAME_T / 2),
        rot: [0, yaw, 0],
        scale: [1, spec.h + FRAME_W * 2, 1],
      });
    }
    for (const sy of [-1, 1] as const) {
      parts.frameRail.push({
        position: place(spec, 0, sy * (hh + FRAME_W / 2), FRAME_T / 2),
        rot: [0, yaw, 0],
        scale: [spec.w + FRAME_W * 2, 1, 1],
      });
    }

    /* ---- mullions: the actual panes ------------------------------------- */
    for (let i = 1; i < spec.cols; i += 1) {
      parts.mullionV.push({
        position: place(spec, -hw + (spec.w * i) / spec.cols, 0, FRAME_T * 0.62),
        rot: [0, yaw, 0],
        scale: [1, spec.h, 1],
      });
    }
    for (let i = 1; i < spec.rows; i += 1) {
      parts.mullionH.push({
        position: place(spec, 0, -hh + (spec.h * i) / spec.rows, FRAME_T * 0.62),
        rot: [0, yaw, 0],
        scale: [spec.w, 1, 1],
      });
    }

    /* ---- the room, and the glass in front of it ------------------------- */
    parts.glow.push({
      position: place(spec, 0, 0, GLOW_Z),
      rot: [0, yaw, 0],
      scale: [spec.w, spec.h, 1],
      color: new Color(spec.glow),
    });
    parts.glass.push({
      position: place(spec, 0, 0, GLASS_Z),
      rot: [0, yaw, 0],
      scale: [spec.w, spec.h, 1],
    });

    /* ---- sill and lintel ------------------------------------------------ */
    parts.sill.push({
      position: place(spec, 0, -(hh + FRAME_W + 0.055), FRAME_T * 0.2),
      rot: [0, yaw, 0],
      scale: [spec.w + FRAME_W * 2 + 0.16, 1, 1],
    });
    parts.lintel.push({
      position: place(spec, 0, hh + FRAME_W + 0.075, FRAME_T * 0.1),
      rot: [0, yaw, 0],
      scale: [spec.w + FRAME_W * 2 + 0.24, 1, 1],
    });

    /* ---- shutters ------------------------------------------------------- */
    if (spec.shutter) {
      const sh = spec.shutter;
      /**
       * The leaf is 3mm narrower than the half-opening it covers, so a shut pair leaves a 6mm line down
       * the middle rather than two coplanar faces fighting over the same pixels.
       */
      const leafW = hw + FRAME_W - 0.003;
      const paint = new Color(sh.paint);
      for (const side of [-1, 1] as const) {
        const hingeX = side * (hw + FRAME_W);
        /**
         * The panel's centre, and its yaw, from the hinge and the opening angle.
         *
         * Derived rather than modelled with the pivot baked into the geometry, and that is what keeps
         * both leaves on ONE instanced mesh. Baking a pivot means a left-hand geometry and a right-hand
         * geometry — or a negative scale, which inverts winding and turns every shutter inside out.
         *
         * Closed, a leaf runs from its hinge toward the middle of the window, so its direction is
         * `(-side, 0)`; opening rotates that outward into `(-side cos θ, sin θ)`. Matching that to
         * three's `rotation.y` mapping of local `+X` gives `π + θ` for the right leaf and `-θ` for the
         * left, which is the whole of the arithmetic below.
         */
        const dirX = -side * Math.cos(sh.angle);
        const dirZ = Math.sin(sh.angle);
        const centre = place(
          spec,
          hingeX + dirX * (leafW / 2),
          0,
          SHUTTER_Z + dirZ * (leafW / 2),
        );
        const leafYaw = yawOf(spec, side > 0 ? Math.PI + sh.angle : -sh.angle);
        const panel: Placement = {
          position: centre,
          rot: [0, leafYaw, 0],
          scale: [leafW, spec.h + FRAME_W * 2 - 0.02, 1],
          color: paint,
        };
        if (sh.style === 'louvre') {
          parts.louvrePanel.push(panel);
          // Three boards laid across the leaf's face. Instanced separately so the leaf itself stays one
          // scaled box and the boards keep a constant thickness however tall the window is.
          for (const t of [-0.3, 0, 0.3]) {
            parts.slat.push({
              position: place(
                spec,
                hingeX + dirX * (leafW / 2),
                t * (spec.h + FRAME_W * 2),
                SHUTTER_Z + dirZ * (leafW / 2) + SHUTTER_T * 0.55,
              ),
              rot: [0, leafYaw, 0],
              scale: [leafW - 0.06, 1, 1],
              color: paint.clone().multiplyScalar(0.86),
            });
          }
        } else {
          parts.piercedPanel.push(panel);
        }
        // Two straps per leaf, on the hinge side, so the leaf is plainly hung on something.
        for (const sy of [-1, 1] as const) {
          parts.strap.push({
            position: place(
              spec,
              hingeX + dirX * 0.075,
              sy * (spec.h * 0.32),
              SHUTTER_Z + dirZ * 0.075 + SHUTTER_T * 0.5,
            ),
            rot: [0, leafYaw, 0],
            scale: [0.19, 1, 1],
          });
        }
      }
    }

    /* ---- what grows under it -------------------------------------------- */
    const bedY = -(hh + FRAME_W + 0.42);
    if (spec.planting === 'box') {
      const boxW = spec.w + 0.2;
      parts.planterBox.push({
        position: place(spec, 0, bedY, 0.15),
        rot: [0, yaw, 0],
        scale: [boxW, 1, 1],
      });
      parts.soil.push({
        position: place(spec, 0, bedY + 0.075, 0.15),
        rot: [0, yaw, 0],
        scale: [boxW - 0.09, 1, 1],
      });
      for (const sx of [-1, 1] as const) {
        parts.corbel.push({
          position: place(spec, sx * boxW * 0.36, bedY - 0.15, 0.07),
          rot: [0, yaw, 0],
        });
      }
      /**
       * Blooms. Five to eight per box, and the counts and colours are drawn from the window's own seed so
       * the same window is the same window every visit — a flower that moves overnight is the same broken
       * promise as a tree that moves overnight, which `noise.ts` already argues at length.
       */
      const n = 5 + Math.floor(rand() * 4);
      const palette = [
        blooms[Math.floor(rand() * blooms.length)] ?? PIG.bloomPoppy,
        blooms[Math.floor(rand() * blooms.length)] ?? PIG.bloomButter,
      ];
      for (let i = 0; i < n; i += 1) {
        const t = (i + 0.5) / n;
        const size = 0.05 + rand() * 0.035;
        parts.bloom.push({
          position: place(
            spec,
            (t - 0.5) * (boxW - 0.14),
            bedY + 0.12 + rand() * 0.09,
            0.15 + (rand() - 0.5) * 0.1,
          ),
          scale: [size, size * 0.85, size],
          color: new Color(palette[i % 2] ?? PIG.bloomPoppy).lerp(
            new Color(PIG.bloomSnow),
            rand() * 0.3,
          ),
        });
        // A leaf or two per bloom, greener and lower, so the box is not a row of dots on soil.
        parts.bush.push({
          position: place(
            spec,
            (t - 0.5) * (boxW - 0.14) + (rand() - 0.5) * 0.08,
            bedY + 0.075,
            0.15 + (rand() - 0.5) * 0.12,
          ),
          scale: [0.09 + rand() * 0.04, 0.05, 0.08 + rand() * 0.04],
          color: new Color(PIG.gardenLeaf).lerp(new Color(PIG.gardenLeafLit), rand()),
        });
      }
    } else {
      /**
       * A bed in the ground rather than a box on the wall, and it sits at the FOOT of the wall rather
       * than under the window.
       *
       * `-spec.on[1] - spec.plinth` is the drop from the window's centre to the grass, so this is the one
       * place in the file that has to know how high off the ground the window is. Planting a bed at a
       * fixed offset below the sill would leave the barn's beds floating 1.7m up its wall, which is
       * exactly the class of mistake the roof module exists to prevent one storey higher.
       */
      const groundY = -spec.on[1] - spec.plinth;
      const bedW = spec.w + 0.55;
      parts.soil.push({
        position: place(spec, 0, groundY + 0.05, 0.3),
        rot: [0, yaw, 0],
        scale: [bedW, 1.2, 2.8],
      });
      const n = 3 + Math.floor(rand() * 3);
      for (let i = 0; i < n; i += 1) {
        const t = (i + 0.5) / n;
        const r = 0.17 + rand() * 0.12;
        parts.bush.push({
          position: place(
            spec,
            (t - 0.5) * bedW,
            groundY + r * 0.62,
            0.26 + (rand() - 0.5) * 0.14,
          ),
          rot: [0, rand() * 6.28, 0],
          scale: [r * 1.45, r, r * 1.3],
          color: new Color(PIG.gardenLeaf).lerp(new Color(PIG.gardenLeafLit), 0.15 + rand() * 0.5),
        });
      }
      // A few blooms among the bushes, so a bed is not just three green lumps.
      const petals = 3 + Math.floor(rand() * 3);
      for (let i = 0; i < petals; i += 1) {
        const size = 0.045 + rand() * 0.03;
        parts.bloom.push({
          position: place(
            spec,
            (rand() - 0.5) * bedW,
            groundY + 0.14 + rand() * 0.14,
            0.24 + (rand() - 0.5) * 0.2,
          ),
          scale: [size, size * 0.85, size],
          color: new Color(blooms[Math.floor(rand() * blooms.length)] ?? PIG.bloomSnow),
        });
      }
    }
  }

  return parts;
})();

/* ------------------------------------------------------------------ *\
   Geometry
\* ------------------------------------------------------------------ */

/**
 * A shutter leaf pierced with a round port.
 *
 * A round hole rather than the heart or crescent a storybook shutter often carries, and the reason is
 * risk rather than taste: a heart traced with two arcs and a corner is either right or it is a lumpy
 * blob, it cannot be checked without looking at it from six metres, and there are four of these. A round
 * port is unmistakable, is the real detail on half the working shutters ever made, and cannot come out
 * wrong at any size.
 *
 * No bevel: an `ExtrudeGeometry` with a hole and a bevel has to bevel the hole too, which triples the
 * triangle count for an edge nobody can see at 15cm across.
 */
function piercedLeafGeometry(): ExtrudeGeometry {
  const w = 0.5;
  const h = 0.5;
  const r = 0.06;
  const shape = new Shape();
  shape.moveTo(-w + r, -h);
  shape.lineTo(w - r, -h);
  shape.quadraticCurveTo(w, -h, w, -h + r);
  shape.lineTo(w, h - r);
  shape.quadraticCurveTo(w, h, w - r, h);
  shape.lineTo(-w + r, h);
  shape.quadraticCurveTo(-w, h, -w, h - r);
  shape.lineTo(-w, -h + r);
  shape.quadraticCurveTo(-w, -h, -w + r, -h);
  shape.closePath();

  const hole = new Path();
  // High on the leaf, where a real one is: it is a ventilation port, not a peephole.
  hole.absarc(0, h * 0.42, 0.16, 0, Math.PI * 2, true);
  shape.holes.push(hole);

  const g = new ExtrudeGeometry(shape, {
    depth: SHUTTER_T,
    bevelEnabled: false,
    curveSegments: 5,
    steps: 1,
  });
  // Extruded from z = 0; centre it so the caller positions by the leaf's mid-plane like every other part.
  g.translate(0, 0, -SHUTTER_T / 2);
  // The shape is 1.0 across and 1.0 tall, so an instance scale of (leafW, leafH, 1) sizes it exactly the
  // way the louvred leaf's unit rounded box is sized. Keeping the two interchangeable is what lets one
  // placement routine feed either style.
  g.computeVertexNormals();
  return g;
}

/* ------------------------------------------------------------------ *\
   The component
\* ------------------------------------------------------------------ */

/**
 * Every window on the ranch, in fourteen draw calls.
 *
 * Shadow casting is on for the joinery and the planting and OFF for the glass and the glow. That is not a
 * saving, it is a correction: a transparent pane in a VSM shadow pass writes its depth like a solid one,
 * so a glazed window would cast a hard black rectangle onto its own sill.
 */
export function Windows(): JSX.Element {
  const m = materials();

  const g = useMemo(() => {
    /**
     * Unit bars, scaled per instance along X.
     *
     * One geometry for every frame member, mullion, sill, lintel and slat on the ranch, at nine windows
     * with different proportions each. The alternative — a geometry per member per window — is about
     * seventy `RoundedBoxGeometry` allocations at import, and seventy draw calls at render.
     */
    return {
      barH: new RoundedBoxGeometry(1, FRAME_W, FRAME_T, 1, 0.022),
      barV: new RoundedBoxGeometry(FRAME_W, 1, FRAME_T, 1, 0.022),
      mullionH: new RoundedBoxGeometry(1, 0.05, FRAME_T * 0.5, 1, 0.014),
      mullionV: new RoundedBoxGeometry(0.05, 1, FRAME_T * 0.5, 1, 0.014),
      // Plain planes: they are always seen face on, inside a frame, and a rounded box here would only
      // spend triangles on edges the frame covers.
      pane: new PlaneGeometry(1, 1),
      sill: new RoundedBoxGeometry(1, 0.075, 0.2, 1, 0.026),
      lintel: new RoundedBoxGeometry(1, 0.075, 0.26, 1, 0.026),
      louvre: new RoundedBoxGeometry(1, 1, SHUTTER_T, 1, 0.018),
      pierced: piercedLeafGeometry(),
      slat: new RoundedBoxGeometry(1, 0.055, 0.022, 1, 0.008),
      strap: new RoundedBoxGeometry(1, 0.035, 0.018, 1, 0.007),
      planter: new RoundedBoxGeometry(1, 0.2, 0.24, 1, 0.045),
      soil: new RoundedBoxGeometry(1, 0.07, 0.19, 1, 0.02),
      // Pre-leaned, so an instance only ever carries a yaw. Baking the tilt into the geometry is what
      // keeps every part in this file on a single rotation axis, which is the difference between a
      // placement you can read and one you have to draw on paper.
      corbel: (() => {
        const c = new RoundedBoxGeometry(0.06, 0.3, 0.06, 1, 0.018);
        c.rotateX(-0.62);
        return c;
      })(),
      bloom: new SphereGeometry(1, 7, 5),
      bush: new SphereGeometry(1, 8, 6),
    };
  }, []);

  /**
   * The lit room, as an unlit material.
   *
   * `MeshBasicMaterial` rather than an emissive standard one, and this is the choice that buys per-window
   * variation for free. Instance colours multiply the DIFFUSE, and on a standard material the emissive is
   * where all the brightness is — so nine windows would need nine materials and nine draw calls to differ
   * from each other. On a basic material the colour IS the output, so all nine glow differently in one
   * call. It is also the physically honest answer: the light in a room does not depend on where the sun
   * is, so it must not be shaded by the sun.
   */
  const glowMat = useMemo(
    () => new MeshBasicMaterial({ color: '#ffffff', toneMapped: true }),
    [],
  );

  return (
    <group>
      <Instanced geometry={g.barV} material={m.trim} items={PARTS.frameJamb} />
      <Instanced geometry={g.barH} material={m.trim} items={PARTS.frameRail} />
      <Instanced geometry={g.mullionV} material={m.trim} items={PARTS.mullionV} castShadow={false} />
      <Instanced geometry={g.mullionH} material={m.trim} items={PARTS.mullionH} castShadow={false} />
      {/* No shadow from either surface of the glazing: see the note on the component. */}
      <Instanced
        geometry={g.pane}
        material={glowMat}
        items={PARTS.glow}
        castShadow={false}
        receiveShadow={false}
      />
      <Instanced
        geometry={g.pane}
        material={m.glass}
        items={PARTS.glass}
        castShadow={false}
        receiveShadow={false}
      />
      <Instanced geometry={g.sill} material={m.timberDeep} items={PARTS.sill} />
      <Instanced geometry={g.lintel} material={m.timberDeep} items={PARTS.lintel} />
      <Instanced geometry={g.louvre} material={m.shutter} items={PARTS.louvrePanel} />
      <Instanced geometry={g.pierced} material={m.shutter} items={PARTS.piercedPanel} />
      <Instanced geometry={g.slat} material={m.shutter} items={PARTS.slat} castShadow={false} />
      <Instanced geometry={g.strap} material={m.timberDeep} items={PARTS.strap} castShadow={false} />
      <Instanced geometry={g.planter} material={m.timber} items={PARTS.planterBox} />
      <Instanced geometry={g.corbel} material={m.timberDeep} items={PARTS.corbel} />
      <Instanced geometry={g.soil} material={m.soil} items={PARTS.soil} castShadow={false} />
      <Instanced geometry={g.bloom} material={m.bloom} items={PARTS.bloom} />
      <Instanced geometry={g.bush} material={m.canopy} items={PARTS.bush} />
    </group>
  );
}

/**
 * Where a wall is already occupied by a window, in the host's own local units along that wall.
 *
 * WHY THIS HAS TO BE EXPORTED. The barn's long walls carry thirteen vertical battens a side, instanced at
 * 3.5cm proud of the wall face — and a window frame stands 10cm proud of the same face. Left alone, three
 * of the barn's five windows would have a cream board running vertically through the middle of them, which
 * is not a subtle artefact: board-and-batten siding is the barn's defining surface, so the batten wins the
 * eye and the window looks like it was pasted on afterwards.
 *
 * So `Buildings.tsx` asks this before it lays its battens, and skips the bays a window is in. The window
 * census is the single source of truth for where windows are, and the siding defers to it — which is the
 * right way round, because a real barn's siding is cut around its openings.
 *
 * "Along the wall" means host-local `z` for the `±X` walls and host-local `x` for the `±Z` walls, i.e.
 * whichever axis the batten's own position varies along.
 */
export function wallOccupancy(
  host: Placed,
  wallYaw: number,
  margin = 0.22,
): { from: number; to: number }[] {
  const out: { from: number; to: number }[] = [];
  for (const spec of WINDOWS) {
    if (spec.host !== host || spec.wallYaw !== wallYaw) continue;
    const anchor = anchorOf(spec);
    // The anchor is already in host-local coordinates, so read whichever component the wall runs along
    // rather than re-deriving it from `on` and getting the sign wrong for one wall in four.
    const centre = wallYaw === WALL.plusX || wallYaw === WALL.minusX ? anchor[2] : anchor[0];
    const half = spec.w / 2 + FRAME_W + margin;
    out.push({ from: centre - half, to: centre + half });
  }
  return out;
}

/** True when `along` falls in a bay a window has already taken. */
export function wallTaken(host: Placed, wallYaw: number, along: number, margin?: number): boolean {
  return wallOccupancy(host, wallYaw, margin).some((r) => along > r.from && along < r.to);
}

/** The census, for a preview page or a test that wants to count what was built. */
export function windowReport(): { windows: number; parts: number; byPart: Record<string, number> } {
  const byPart: Record<string, number> = {};
  let parts = 0;
  for (const [key, list] of Object.entries(PARTS)) {
    byPart[key] = list.length;
    parts += list.length;
  }
  return { windows: WINDOWS.length, parts, byPart };
}
