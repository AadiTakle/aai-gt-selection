import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef, type JSX } from 'react';
import { BoxGeometry, Color, CylinderGeometry, type Group } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

import {
  BARN,
  BARN_D,
  BARN_IN_HALF_D,
  BARN_IN_HALF_W,
  BARN_PLINTH_H,
  BARN_RISE,
  BARN_W,
  BARN_WALL_H,
  BARN_EAVE,
  BARN_FLOOR_Y,
  DOOR,
  DOOR_HINGE_Z,
  LADDER,
  LOFT,
  LOFT_POSTS,
  STALL_RANGE,
  STALL_FRONT_X,
  STALL_DIVIDERS,
  doorTarget,
} from './barn';
import { Instanced, type Placement } from './instanced';
import { usePrefersReducedMotion } from './motion';
import { damp, rng } from './noise';
import { PIG, materials } from './pigment';

/**
 * INSIDE THE BARN, AND THE DOORS THAT LET YOU IN.
 *
 * The owner asked for three things in one sentence — doors that swing, a barn you can walk into, and
 * stables to find when you do. `barn.ts` holds the plan and the two proofs; this file is what you see.
 *
 * WHAT MAKES AN INTERIOR WORTH WALKING INTO, in the order the eye takes it:
 *
 *   A CEILING THAT IS NOT THE SKY. The gable roof's soffit is already overhead — it is a closed slab, so
 *   the underside is really there. What was NOT there is the strip between the wall head and that soffit:
 *   the soffit sits 38cm above the wall head at the wall line, so hollowing the barn opened a 14-metre
 *   slot of daylight along each eave. `eaveClosure` fills it and the RAFTERS in front of it are what turn
 *   a ceiling into a roof you are standing under.
 *
 *   SOMETHING AT EVERY HEIGHT. Stalls at knee-to-chest, mangers and bedding below them, a hayloft
 *   overhead you have to duck under coming in, rafters above that. A room a child wants to stand in is a
 *   room where looking up is rewarded, and the loft is the piece that does that: you walk in beneath it,
 *   the space opens out, and there is a ladder up to a floor with bales on it.
 *
 *   LIGHT THAT COMES FROM SOMEWHERE. Two lanterns, and the real sun through the real doorway. That
 *   second one is not an effect: the barn's 94.5° turn happens to face its doors within 41° of the sun's
 *   bearing, so the sun genuinely shines in, and the walls genuinely shadow it. The bright wedge on the
 *   floor inside is cast by the doorway it came through, and it moves correctly across the leaves of the
 *   doors as they swing.
 *
 * WHAT IT COSTS, AND THE ONE OPTIMISATION THAT MATTERS. Every repeated part is one `InstancedMesh`, so
 * the whole interior — four stalls a side, their dividers, fronts, bedding and mangers, eight loft joists,
 * a ladder, bales, lanterns and a scatter of straw — is about twenty draw calls. But three has no
 * occlusion culling, so from outside the barn all twenty would be drawn behind an opaque wall for nothing.
 * The interior group therefore turns its own `visible` off past 26 metres, which drops it from the render
 * list entirely for the majority of the time a child spends on the ranch. Nothing inside casts a shadow
 * either: the only light that could cast is the sun, the sun cannot see most of this, and the shadow pass
 * is the more expensive half of every mesh.
 *
 * REDUCED MOTION. The brief is explicit: the doors SNAP rather than swing. They still open and close on
 * proximity, because that is the interaction and taking it away would be taking away the feature; what
 * goes is the eased arc, which is the part that moves for a second and a half after a child stops walking.
 */

/* ------------------------------------------------------------------ *\
   Heights, in world metres, because the interior meets the ground
\* ------------------------------------------------------------------ */

/** The top of the plinth, which is where the walls start and where a wall-mounted thing is measured from. */
const WALL_BASE = BARN_PLINTH_H;
const WALL_TOP = BARN_PLINTH_H + BARN_WALL_H;
/** Half the roof's span, needed to find where its soffit crosses the wall. */
const ROOF_HALF_W = BARN_W / 2 + BARN_EAVE;

/**
 * The height of the roof's soffit above the wall head, at a given local x.
 *
 * Taken from `roofs.ts`'s own construction rather than measured off a screenshot: the soffit ring lies on
 * the wall-head plane at the eave corners and rises linearly to `rise` at the ridge, so its height at `x`
 * is `rise * (1 - |x| / halfRoof)`. Everything that has to fit under the roof from the inside — the eave
 * closure boards, the rafters, the loft — is derived from this function, which is the same discipline
 * `roofs.ts` uses to keep a roof out of its own walls one storey down.
 */
function soffitAbove(localX: number): number {
  return BARN_RISE * (1 - Math.abs(localX) / ROOF_HALF_W);
}

/* ------------------------------------------------------------------ *\
   The doors
\* ------------------------------------------------------------------ */

/**
 * The two leaves, swinging on proximity.
 *
 * PROXIMITY IS THE WHOLE INTERACTION, per the brief: nothing to press, nothing to learn. The keeper IS the
 * camera in `Game.tsx` — it locks the camera to a walking height and pushes it out of `SOLIDS` — so this
 * needs no wiring and no prop. It reads `useThree`'s camera, which is the same object the player
 * controller moves, and therefore cannot fall out of step with where the child actually is.
 *
 * THE EASING IS `damp`, not a lerp on a fixed step, so the arc is identical at 30fps and 144fps. At a rate
 * of 2.6 a leaf covers most of its 82° in about half a second and settles over the next second, which is
 * the weight a four-metre timber door has. A linear tween reads as a garage door.
 *
 * THE HYSTERESIS IS IN `barn.ts`. A single distance threshold makes the doors flutter for a child standing
 * on it, and a child WILL stand on it, because the doors moving is the interesting thing.
 */
function BarnDoors({ reduced }: { reduced: boolean }): JSX.Element {
  const m = materials();
  const camera = useThree((s) => s.camera);
  const leaves = useRef<(Group | null)[]>([null, null]);
  const angle = useRef(0);
  const open = useRef(false);

  const g = useMemo(() => {
    const braceLength = Math.hypot(DOOR.leaf - 0.24, DOOR.leafH - 0.9);
    return {
      leaf: new RoundedBoxGeometry(DOOR.leaf, DOOR.leafH, DOOR.leafT, 2, 0.045),
      ledge: new RoundedBoxGeometry(DOOR.leaf - 0.12, 0.2, 0.075, 1, 0.03),
      brace: new RoundedBoxGeometry(braceLength, 0.2, 0.075, 1, 0.03),
      braceAngle: Math.atan2(DOOR.leafH - 0.9, DOOR.leaf - 0.24),
      // A ring on the free edge of each leaf. The one thing that says "this is a door that opens" while it
      // is shut, which matters: a child has to want to walk toward it before it has moved.
      ring: new CylinderGeometry(0.075, 0.075, 0.03, 10),
      hinge: new RoundedBoxGeometry(0.3, 0.09, 0.05, 1, 0.02),
    };
  }, []);

  useFrame((_, dt) => {
    const target = doorTarget(camera.position.x, camera.position.z, open.current);
    open.current = target.open;
    // Reduced motion: the doors still open, they simply arrive. See the note at the top of the file.
    angle.current = reduced ? target.angle : damp(angle.current, target.angle, 2.6, Math.min(dt, 0.05));
    leaves.current.forEach((leaf, i) => {
      if (!leaf) return;
      const side = i === 0 ? -1 : 1;
      leaf.rotation.y = side * angle.current;
    });
  });

  return (
    <group>
      {[-1, 1].map((side, i) => (
        <group
          key={side}
          ref={(node) => {
            leaves.current[i] = node;
          }}
          /**
           * THE HINGE, AT THE OUTER EDGE OF THE OPENING. This one placement is what makes the whole
           * no-clip argument in `barn.ts` hold, and it is worth saying why here too rather than only
           * there: hinged outboard, a leaf's every point stays beyond its own hinge plane in z for any
           * angle in [0°, 90°], and the hinge plane is 6cm in front of the wall — so no angle can put
           * timber inside masonry. And because each leaf sweeps AWAY from the middle, the two can never
           * reach each other. Hinged at the inner edges instead, which looks identical when shut, both
           * of those become false at once.
           */
          position={[side * DOOR.halfW, 0, DOOR_HINGE_Z]}
        >
          <group position={[(-side * DOOR.leaf) / 2, BARN_FLOOR_Y + 0.03 + DOOR.leafH / 2, DOOR.leafT / 2]}>
            <mesh geometry={g.leaf} material={m.timber} castShadow receiveShadow />
            {/* Ledge, ledge, brace: the Z-frame every real barn door is built on. Mirrored per leaf so
                the two diagonals meet in the middle, which is the shape the eye recognises. */}
            {[-1.45, 1.45].map((y) => (
              <mesh
                key={y}
                geometry={g.ledge}
                material={m.trim}
                position={[0, y, DOOR.leafT / 2 + 0.03]}
                castShadow
              />
            ))}
            <mesh
              geometry={g.brace}
              material={m.trim}
              position={[0, 0, DOOR.leafT / 2 + 0.03]}
              rotation={[0, 0, side * g.braceAngle]}
              castShadow
            />
            <mesh
              geometry={g.ring}
              material={m.timberDeep}
              position={[(side * (DOOR.leaf - 0.22)) / 2, -0.25, DOOR.leafT / 2 + 0.04]}
              rotation={[Math.PI / 2, 0, 0]}
              castShadow
            />
          </group>
          {/* Straps, on the hinge stile, at the height a barn door's hinges actually are. */}
          {[0.55, 2.4, 3.7].map((y) => (
            <mesh
              key={y}
              geometry={g.hinge}
              material={m.timberDeep}
              position={[(-side * 0.3) / 2, y, DOOR.leafT + 0.02]}
              castShadow
            />
          ))}
        </group>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ *\
   The interior
\* ------------------------------------------------------------------ */

interface Bins {
  lining: Placement[];
  stud: Placement[];
  divider: Placement[];
  stallFront: Placement[];
  stallRail: Placement[];
  bedding: Placement[];
  manger: Placement[];
  joist: Placement[];
  rafter: Placement[];
  eaveClosure: Placement[];
  loftPost: Placement[];
  loftRail: Placement[];
  ladderStile: Placement[];
  rung: Placement[];
  bale: Placement[];
  bin: Placement[];
  lanternBody: Placement[];
  lanternGlass: Placement[];
  straw: Placement[];
  cornerBoard: Placement[];
}

/**
 * Everything inside, solved once, in the barn's own local frame.
 *
 * LOCAL rather than world, which is the opposite choice from `windows.tsx`, and both are right for their
 * own reason. The windows belong to two different buildings, so authoring them in world space is what lets
 * one instanced mesh serve both. Everything here belongs to one building, so nesting it under that
 * building's transform costs nothing and buys a frame in which "along the ridge" is just `z` — which is
 * what makes a rafter's pitch a single rotation about local Z instead of a compound one.
 */
const BINS: Bins = (() => {
  const b: Bins = {
    lining: [],
    stud: [],
    divider: [],
    stallFront: [],
    stallRail: [],
    bedding: [],
    manger: [],
    joist: [],
    rafter: [],
    eaveClosure: [],
    loftPost: [],
    loftRail: [],
    ladderStile: [],
    rung: [],
    bale: [],
    bin: [],
    lanternBody: [],
    lanternGlass: [],
    straw: [],
    cornerBoard: [],
  };
  const rand = rng(0xba21);
  const strawTint = new Color(PIG.straw);
  const strawDeep = new Color(PIG.hay);

  /**
   * THE LINING, WHICH IS THE SINGLE BIGGEST THING THE FIRST PASS GOT WRONG.
   *
   * The walls are one slab each and one slab has one material, so hollowing the barn out meant the INSIDE
   * of it was painted barn red. The screenshot was unambiguous: nine metres of unbroken blood-red wall with
   * nothing on it, lit by two weak lamps. It read as a cellar, not a barn — and it was wrong twice over,
   * because barn red is EXTERIOR paint. Nobody has ever painted the inside of a barn; the inside is the
   * bare back of the boards and the frame that carries them.
   *
   * So a 6cm timber lining goes on the inside face of every wall, and the exposed studs go on the lining.
   * `BoxGeometry` rather than `RoundedBoxGeometry` for the lining specifically, which lets all six panels
   * share one geometry and one draw call: a rounded box scaled to six different sizes gets six different
   * anisotropic fillets, and here there is nothing to round anyway — every edge of these panels is covered
   * by the footing below, the eave closure above, or a stud at the corner.
   */
  const liningT = 0.06;
  const liningY = WALL_BASE + BARN_WALL_H / 2;
  const jambW = BARN_IN_HALF_W - DOOR.halfW;
  const liningPanels: readonly (readonly [number, number, number, number, number, number])[] = [
    // x, y, z, sizeX, sizeY, sizeZ
    [-(BARN_IN_HALF_W - liningT / 2), liningY, 0, liningT, BARN_WALL_H, BARN_IN_HALF_D * 2],
    [BARN_IN_HALF_W - liningT / 2, liningY, 0, liningT, BARN_WALL_H, BARN_IN_HALF_D * 2],
    [0, liningY, -(BARN_IN_HALF_D - liningT / 2), BARN_IN_HALF_W * 2, BARN_WALL_H, liningT],
    [
      -(DOOR.halfW + jambW / 2),
      liningY,
      BARN_IN_HALF_D - liningT / 2,
      jambW,
      BARN_WALL_H,
      liningT,
    ],
    [DOOR.halfW + jambW / 2, liningY, BARN_IN_HALF_D - liningT / 2, jambW, BARN_WALL_H, liningT],
    // Over the doorway, so the head of the opening is lined too.
    [
      0,
      WALL_BASE + (DOOR.height + BARN_WALL_H) / 2,
      BARN_IN_HALF_D - liningT / 2,
      DOOR.halfW * 2,
      BARN_WALL_H - DOOR.height,
      liningT,
    ],
  ];
  for (const panel of liningPanels) {
    b.lining.push({
      position: [panel[0], panel[1], panel[2]],
      scale: [panel[3], panel[4], panel[5]],
    });
  }

  /**
   * Exposed studs on the lining, which is what gives nine metres of wall a rhythm.
   *
   * A lining alone is a brown wall instead of a red one, and a flat wall of any colour is the problem. A
   * post every 1.15m turns it into a frame, gives the two lanterns something to throw shadowless gradients
   * across, and sets the scale of the building from inside the way the battens do from outside.
   */
  const studStep = 1.15;
  const studCount = Math.floor((BARN_IN_HALF_D * 2 - 0.4) / studStep);
  for (let i = 0; i <= studCount; i += 1) {
    const z = -BARN_IN_HALF_D + 0.2 + i * studStep;
    for (const sx of [-1, 1] as const) {
      b.stud.push({
        position: [sx * (BARN_IN_HALF_W - liningT - 0.04), liningY, z],
        scale: [1, BARN_WALL_H, 1],
      });
    }
  }
  // And across the closed end.
  for (let i = -3; i <= 3; i += 1) {
    b.stud.push({
      position: [i * 1.35, liningY, -(BARN_IN_HALF_D - liningT - 0.04)],
      rot: [0, Math.PI / 2, 0],
      scale: [1, BARN_WALL_H, 1],
    });
  }

  /* ---- stalls, both sides -------------------------------------------- */
  const stallDepth = BARN_IN_HALF_W - STALL_FRONT_X;
  const stallMidX = STALL_FRONT_X + stallDepth / 2;
  for (const sx of [-1, 1] as const) {
    for (const z of STALL_DIVIDERS) {
      b.divider.push({
        position: [sx * stallMidX, BARN_FLOOR_Y + 0.65, z],
        scale: [stallDepth, 1, 1],
      });
    }
    for (let i = 0; i < STALL_DIVIDERS.length - 1; i += 1) {
      const z0 = STALL_DIVIDERS[i];
      const z1 = STALL_DIVIDERS[i + 1];
      if (z0 === undefined || z1 === undefined) continue;
      const mid = (z0 + z1) / 2;
      const span = z1 - z0 - 0.11;

      /**
       * A boarded front to chest height and an open rail above it.
       *
       * That split is what makes a stall read as a stall rather than as a cupboard. Boarded to the top and
       * you cannot see in, which wastes the bedding and the manger entirely; open all the way down and it
       * is a fence. Boarded to 70cm — a child's chest — is exactly the height that says "look over this".
       */
      b.stallFront.push({
        position: [sx * STALL_FRONT_X, BARN_FLOOR_Y + 0.35, mid],
        scale: [1, 1, span],
      });
      b.stallRail.push({
        position: [sx * STALL_FRONT_X, BARN_FLOOR_Y + 1.22, mid],
        scale: [1, 1, span],
      });
      b.bedding.push({
        position: [sx * stallMidX, BARN_FLOOR_Y + 0.04, mid],
        scale: [stallDepth - 0.1, 1, span - 0.1],
        color: strawTint.clone().lerp(strawDeep, rand()),
      });
      b.manger.push({
        position: [sx * (BARN_IN_HALF_W - 0.28), BARN_FLOOR_Y + 0.3, mid],
        scale: [1, 1, Math.min(1.0, span * 0.55)],
      });
      // A forkful in each manger, so they are plainly in use.
      b.bale.push({
        position: [sx * (BARN_IN_HALF_W - 0.28), BARN_FLOOR_Y + 0.6, mid],
        rot: [0, rand() * 6.28, 0],
        scale: [0.42, 0.3, Math.min(0.8, span * 0.4)],
      });
    }
  }

  /* ---- the eave closure and the rafters ------------------------------ */
  /**
   * The slot the hollowing-out opened, and the boards that close it.
   *
   * `soffitAbove` at the closure's outboard edge is the ceiling this board has to stay under, and it is
   * consulted rather than guessed: at 45cm tall the board's top lands about 7cm below the soffit, which
   * leaves a thin vent along the eave. That gap is kept on purpose. It is what a real barn has there, and
   * a horizontal sliver of daylight high on a shaded wall is worth more to the inside of this building
   * than a sealed joint would be.
   */
  const closureX = BARN_IN_HALF_W + 0.06;
  const closureH = Math.min(0.45, soffitAbove(closureX + 0.06) - 0.07);
  for (const sx of [-1, 1] as const) {
    b.eaveClosure.push({
      position: [sx * closureX, WALL_TOP + closureH / 2, 0],
      scale: [1, closureH, BARN_D - BARN_W * 0 - 0.7],
    });
  }

  /**
   * Rafters, eleven pairs, from the wall head to the ridge.
   *
   * Pitched by `atan2(rise, halfRoof)` — the roof's own pitch, from the roof's own numbers — so they lie
   * flat against the soffit instead of crossing it. Their inboard ends stop 20cm short of the ridge line so
   * the pairs do not pile into each other at the apex where nobody can see them anyway.
   */
  const pitch = Math.atan2(BARN_RISE, ROOF_HALF_W);
  const rafterLength = Math.hypot(ROOF_HALF_W - 0.2, BARN_RISE) * 0.86;
  const rafterCount = 11;
  for (let i = 0; i < rafterCount; i += 1) {
    const z = -BARN_IN_HALF_D + 0.5 + (i / (rafterCount - 1)) * (BARN_IN_HALF_D * 2 - 1.0);
    for (const sx of [-1, 1] as const) {
      // Positioned at the midpoint of its own run, which is where a rotated box's origin is.
      const midX = sx * (BARN_IN_HALF_W - (rafterLength * Math.cos(pitch)) / 2);
      const midY = WALL_TOP + soffitAbove(BARN_IN_HALF_W) + (rafterLength * Math.sin(pitch)) / 2 - 0.06;
      b.rafter.push({
        position: [midX, midY, z],
        // Local Z, inside the barn's own frame: the pitch tips the rafter in the plane across the ridge,
        // which is exactly the plane the roof slopes in.
        rot: [0, 0, sx > 0 ? pitch : -pitch],
        scale: [rafterLength, 1, 1],
      });
    }
  }

  /* ---- the hayloft ---------------------------------------------------- */
  const loftMidZ = (LOFT.from + LOFT.to) / 2;
  const loftSpan = LOFT.to - LOFT.from;
  // Six rather than eight. At eight, seen down the length of the barn from the doorway, they read as a
  // slatted blind across the whole ceiling rather than as the floor above having a structure.
  const joists = 6;
  for (let i = 0; i < joists; i += 1) {
    b.joist.push({
      position: [0, LOFT.y - 0.14, LOFT.from + ((i + 0.5) / joists) * loftSpan],
      scale: [BARN_IN_HALF_W * 2, 1, 1],
    });
  }
  for (const post of LOFT_POSTS) {
    b.loftPost.push({
      position: [post.x, BARN_FLOOR_Y + (LOFT.y - 0.2 - BARN_FLOOR_Y) / 2, post.z],
      scale: [1, LOFT.y - 0.2 - BARN_FLOOR_Y, 1],
    });
  }
  // A rail along the open edge, because a loft with no edge is a shelf and also a thing a child worries
  // about falling off.
  b.loftRail.push({
    position: [0, LOFT.y + 0.44, LOFT.from + 0.06],
    scale: [BARN_IN_HALF_W * 2, 1, 1],
  });
  for (const sx of [-1, 1] as const) {
    b.loftPost.push({
      position: [sx * (BARN_IN_HALF_W - 0.2), LOFT.y + 0.22, LOFT.from + 0.06],
      scale: [1, 0.44, 1],
    });
  }
  // Bales up top, which is the whole reason a hayloft exists and the thing that makes it read as one.
  const loftBales: readonly (readonly [number, number, number, number])[] = [
    [-2.9, 2.4, 0.35, 1],
    [-2.75, 3.5, -0.1, 0.94],
    [-3.05, 4.6, 0.5, 0.9],
    [2.7, 3.0, -0.3, 1],
    [2.95, 4.2, 0.25, 0.96],
    [1.4, 5.3, 0.6, 0.9],
    [-1.2, 5.6, -0.2, 0.92],
  ];
  for (const bale of loftBales) {
    b.bale.push({
      position: [bale[0], LOFT.y + 0.06 + 0.36 * bale[3], loftMidZ + bale[1] - loftSpan / 2],
      rot: [0, bale[2], 0],
      scale: [1.25 * bale[3], 0.72 * bale[3], 0.85 * bale[3]],
    });
  }

  /* ---- the ladder ----------------------------------------------------- */
  for (const sz of [-1, 1] as const) {
    b.ladderStile.push({
      position: [LADDER.x, BARN_FLOOR_Y + (LOFT.y + 0.2 - BARN_FLOOR_Y) / 2, LADDER.z + sz * 0.24],
      scale: [1, LOFT.y + 0.2 - BARN_FLOOR_Y, 1],
    });
  }
  const rungs = 9;
  for (let i = 0; i < rungs; i += 1) {
    b.rung.push({
      position: [LADDER.x, BARN_FLOOR_Y + 0.34 + (i / (rungs - 1)) * (LOFT.y - 0.55), LADDER.z],
    });
  }

  /* ---- feed bins, lanterns, straw ------------------------------------ */
  for (const sx of [-1, 1] as const) {
    b.bin.push({
      position: [sx * 1.5, BARN_FLOOR_Y + 0.45, -BARN_IN_HALF_D + 0.65],
      rot: [0, sx * 0.06, 0],
    });
  }

  /**
   * THREE lanterns, and where they hang is the composition.
   *
   * One under the loft just inside the doorway, so the first thing a child sees on stepping in is a warm
   * light rather than a dark rectangle. One over the stalls halfway down. One at the far end, thirteen
   * metres away, so the barn has a depth cue — a single lamp lights a room, lamps at three distances light
   * a SPACE, and the difference is whether a child can tell how far off the back wall is.
   *
   * THE CAP IS ABOVE THE GLASS AND NOT AROUND IT. The first pass put a 22cm timber body at the lamp's
   * position and a 15cm emissive glass at the same place — so the glass was entirely INSIDE the body and
   * every lantern rendered as an opaque black box with a halo behind it. A lantern is a lens with a hood
   * over it, so the hood goes above and the glass hangs below where it can be seen.
   */
  const lanterns: readonly (readonly [number, number, number])[] = [
    [1.0, LOFT.y - 0.5, LOFT.from + 1.15],
    [BARN_IN_HALF_W - 0.28, WALL_BASE + 2.75, -1.9],
    [0, WALL_BASE + 2.5, -BARN_IN_HALF_D + 0.28],
  ];
  for (const at of lanterns) {
    b.lanternBody.push({ position: [at[0], at[1] + 0.17, at[2]] });
    b.lanternGlass.push({ position: [at[0], at[1], at[2]] });
  }

  /**
   * Straw trodden across the floor. Fifty blades in one draw call.
   *
   * Denser near the stalls and thinning toward the doorway, because that is where it would be: straw comes
   * out of the stalls on somebody's boots. Bunched rather than uniform, so it reads as swept and walked
   * over rather than as a texture.
   */
  for (let i = 0; i < 54; i += 1) {
    const z = -BARN_IN_HALF_D + 0.5 + rand() * (BARN_IN_HALF_D * 2 - 1.2);
    // Toward the doorway there is less of it. Rejection, so the density curve is real rather than a
    // scale ramp on the same count.
    if (z > 1.5 && rand() > 0.45) continue;
    const x = (rand() - 0.5) * 2 * (STALL_FRONT_X - 0.25);
    b.straw.push({
      position: [x, BARN_FLOOR_Y + 0.012, z],
      rot: [0, rand() * 6.28, 0],
      scale: [0.16 + rand() * 0.26, 1, 0.1 + rand() * 0.12],
      color: strawTint.clone().lerp(strawDeep, rand() * 0.8),
    });
  }

  /* ---- corner boards -------------------------------------------------- */
  /**
   * What covers the joint where the gable ends abut the long walls.
   *
   * The two wall slabs meet on the plane `x = ±BARN_IN_HALF_W`, which is hidden from outside — but both are
   * rounded boxes, so their fillets leave a few millimetres of groove at the corner arris. A corner board
   * is the real building's answer to the same problem and it costs four instances.
   */
  for (const sx of [-1, 1] as const) {
    for (const sz of [-1, 1] as const) {
      b.cornerBoard.push({
        position: [sx * (BARN_W / 2 - 0.02), WALL_BASE + BARN_WALL_H / 2, sz * (BARN_D / 2 - 0.02)],
      });
    }
  }

  return b;
})();

/**
 * The stalls, the loft, the ladder and the light, drawn only when somebody is near enough to see them.
 */
export function BarnInterior(): JSX.Element {
  const m = materials();
  const reduced = usePrefersReducedMotion();
  const camera = useThree((s) => s.camera);
  const inside = useRef<Group>(null);

  const g = useMemo(() => {
    const stallDepth = BARN_IN_HALF_W - STALL_FRONT_X;
    return {
      floor: new RoundedBoxGeometry(BARN_IN_HALF_W * 2, BARN_FLOOR_Y, BARN_IN_HALF_D * 2, 1, 0.02),
      // Unit box, scaled per panel. See the note on `lining` above for why this one is not rounded.
      lining: new BoxGeometry(1, 1, 1),
      stud: new RoundedBoxGeometry(0.13, 1, 0.09, 1, 0.03),
      // Unit-length along X, scaled per instance, so one geometry serves every divider whatever the
      // stalls end up being.
      divider: new RoundedBoxGeometry(1, 1.3, 0.09, 1, 0.03),
      stallFront: new RoundedBoxGeometry(0.09, 0.7, 1, 1, 0.03),
      stallRail: new RoundedBoxGeometry(0.11, 0.11, 1, 1, 0.045),
      bedding: new RoundedBoxGeometry(1, 0.08, 1, 1, 0.025),
      manger: new RoundedBoxGeometry(0.46, 0.6, 1, 1, 0.06),
      joist: new RoundedBoxGeometry(1, 0.17, 0.15, 1, 0.04),
      rafter: new RoundedBoxGeometry(1, 0.15, 0.13, 1, 0.035),
      closure: new RoundedBoxGeometry(0.12, 1, 1, 1, 0.03),
      loftFloor: new RoundedBoxGeometry(BARN_IN_HALF_W * 2, 0.12, LOFT.to - LOFT.from, 1, 0.03),
      post: new RoundedBoxGeometry(0.2, 1, 0.2, 1, 0.05),
      rail: new RoundedBoxGeometry(1, 0.12, 0.12, 1, 0.045),
      stile: new RoundedBoxGeometry(0.09, 1, 0.09, 1, 0.03),
      rung: new RoundedBoxGeometry(0.07, 0.055, 0.5, 1, 0.022),
      bale: new RoundedBoxGeometry(1, 1, 1, 2, 0.14),
      bin: new RoundedBoxGeometry(1.05, 0.9, 0.8, 2, 0.11),
      lantern: new RoundedBoxGeometry(0.3, 0.07, 0.3, 1, 0.025),
      lanternGlass: new RoundedBoxGeometry(0.17, 0.26, 0.17, 1, 0.045),
      straw: new RoundedBoxGeometry(1, 0.022, 1, 1, 0.008),
      cornerBoard: new RoundedBoxGeometry(0.2, BARN_WALL_H, 0.2, 1, 0.05),
      stallDepth,
    };
  }, []);

  /**
   * Off when nobody is near, which is the one optimisation the interior needs.
   *
   * Three has no occlusion culling: from anywhere on the ranch that has the barn in frame, every mesh in
   * here is inside the view frustum and behind an opaque wall, and all of it would be submitted, shaded
   * and discarded by the depth test. Twenty-six metres is comfortably past the point where the doorway is
   * a few pixels across, and toggling a group's `visible` removes its whole subtree from the render list
   * in one test — no remounting, no shader recompilation, no hitch on the way back in.
   */
  useFrame(() => {
    const group = inside.current;
    if (!group) return;
    const d = Math.hypot(camera.position.x - BARN.x, camera.position.z - BARN.z);
    group.visible = d < 26;
  });

  return (
    <group position={[BARN.x, 0, BARN.z]} rotation={[0, BARN.rot, 0]}>
      {/* Outside the visibility gate: the doors are the thing a child sees from across the meadow. */}
      <BarnDoors reduced={reduced} />

      <group ref={inside}>
        {/* The threshing floor. Receives, so the wedge of sun through the doorway lands on it. */}
        <mesh
          geometry={g.floor}
          material={m.barnFloor}
          position={[0, BARN_FLOOR_Y / 2, 0]}
          receiveShadow
        />

        {/*
          Nothing below casts. The only light that casts is the sun, which cannot see into a closed
          building except through the doorway, and the shadow pass is the more expensive half of a mesh.
          Everything still RECEIVES, so the sun through the doorway and the lanterns both land on it.
        */}
        {/*
          The lining and its studs. These two sets are the difference between a cellar and a barn, and they
          cost two draw calls between them for fifty-odd parts.
        */}
        <Instanced
          geometry={g.lining}
          material={m.barnLining}
          items={BINS.lining}
          castShadow={false}
          frustumCulled
        />
        <Instanced
          geometry={g.stud}
          material={m.timberDeep}
          items={BINS.stud}
          castShadow={false}
          frustumCulled
        />

        <Instanced
          geometry={g.divider}
          material={m.timber}
          items={BINS.divider}
          castShadow={false}
          frustumCulled
        />
        <Instanced
          geometry={g.stallFront}
          material={m.timberDeep}
          items={BINS.stallFront}
          castShadow={false}
          frustumCulled
        />
        <Instanced
          geometry={g.stallRail}
          material={m.timber}
          items={BINS.stallRail}
          castShadow={false}
          frustumCulled
        />
        <Instanced
          geometry={g.bedding}
          material={m.straw}
          items={BINS.bedding}
          castShadow={false}
          frustumCulled
        />
        <Instanced
          geometry={g.manger}
          material={m.timberDeep}
          items={BINS.manger}
          castShadow={false}
          frustumCulled
        />

        <Instanced
          geometry={g.closure}
          material={m.timber}
          items={BINS.eaveClosure}
          castShadow={false}
          frustumCulled
        />
        <Instanced
          geometry={g.rafter}
          material={m.timberDeep}
          items={BINS.rafter}
          castShadow={false}
          frustumCulled
        />

        <mesh
          geometry={g.loftFloor}
          material={m.timber}
          position={[0, LOFT.y, (LOFT.from + LOFT.to) / 2]}
          receiveShadow
        />
        <Instanced
          geometry={g.joist}
          material={m.timberDeep}
          items={BINS.joist}
          castShadow={false}
          frustumCulled
        />
        <Instanced
          geometry={g.post}
          material={m.timber}
          items={BINS.loftPost}
          castShadow={false}
          frustumCulled
        />
        <Instanced
          geometry={g.rail}
          material={m.timber}
          items={BINS.loftRail}
          castShadow={false}
          frustumCulled
        />
        <Instanced
          geometry={g.stile}
          material={m.timber}
          items={BINS.ladderStile}
          castShadow={false}
          frustumCulled
        />
        <Instanced
          geometry={g.rung}
          material={m.timberDeep}
          items={BINS.rung}
          castShadow={false}
          frustumCulled
        />

        <Instanced geometry={g.bale} material={m.hay} items={BINS.bale} castShadow={false} frustumCulled />
        <Instanced geometry={g.bin} material={m.burlap} items={BINS.bin} castShadow={false} frustumCulled />
        <Instanced
          geometry={g.straw}
          material={m.straw}
          items={BINS.straw}
          castShadow={false}
          receiveShadow={false}
          frustumCulled
        />

        {/* Corner boards are the one interior set that is seen from OUTSIDE, so they cast. */}
        <Instanced geometry={g.cornerBoard} material={m.trim} items={BINS.cornerBoard} />

        {/*
          The lanterns. Two unshadowed point lights, which keeps the world's promise that exactly one light
          casts: `Lighting.tsx` owns that one, and it is the sun.
        */}
        <Instanced
          geometry={g.lantern}
          material={m.timberDeep}
          items={BINS.lanternBody}
          castShadow={false}
          frustumCulled
        />
        <Instanced
          geometry={g.lanternGlass}
          material={m.lamplight}
          items={BINS.lanternGlass}
          castShadow={false}
          receiveShadow={false}
          frustumCulled
        />
        {BINS.lanternGlass.map((lamp, i) => (
          <pointLight
            key={i}
            position={lamp.position as unknown as [number, number, number]}
            color={PIG.honey}
            /**
             * BRIGHT, and the number is set by a documented trap rather than by taste. `Lighting.tsx`
             * warns twice that a hemisphere light fills an up-facing surface with its SKY colour — and the
             * barn's floor is nothing but up-facing normals, so at the old intensity of 5.5 the blue fill
             * won and the threshing floor came out cold grey inside a warm building. Three lamps at 22 with
             * inverse-square decay put roughly 2.4 of warm light on the floor beneath each one against the
             * hemisphere's 0.72, which is what it takes for the warm to read as the dominant light.
             */
            intensity={22}
            distance={15}
            decay={2}
          />
        ))}
      </group>
    </group>
  );
}
