/**
 * ONE SLIME. The only component this directory exports for mounting.
 *
 * Built directly against the three notes the owner gave, in the order they were given:
 *
 *   "shaped more like gumdrops than spheres and ellipses"
 *        → the body is a revolved 2D profile curve, authored as a curve. See `gumdrop.ts`. Nothing in
 *          the silhouette is derived from a sphere, and the base is flat so it SITS.
 *
 *   "they should have physics ... you bump into stuff and are unable to walk through them"
 *        → `herd.ts`. Every slime publishes its live circle; slimes resolve against each other, against
 *          furniture and against the player; the player controller calls `pushOutOfSlimes`. That file
 *          argues the case for this over a Rapier world.
 *
 *   "all facing the same direction which is weird ... should be more randomized PLUS ... move randomly
 *   around the ranch. obviously not enough to the point of escaping"
 *        → `wander.ts`. A full random heading from the seed, and a rest/choose/walk/rest loop that
 *          cannot leave `bounds` — steered away from the rim, and hard-clamped as a guarantee.
 *
 * WHAT WAS KEPT because it already worked: the big glossy doe eyes with a catchlight, the physical
 * jelly material, and the idle squash. The squash now preserves volume (y up means x and z in by the
 * square root), which is the entire difference between jelly and a pulsing balloon — a balloon changes
 * volume, jelly does not.
 *
 * PERFORMANCE, because forty of these are on screen. Every buffer and every material is created once
 * per family and shared: a family's body is one `LatheGeometry` (`gumdrop.ts`), the face is three unit
 * spheres shared by all twenty-four looks, and the six crests are cached in `crests.ts`. Forty slimes
 * therefore allocate no geometry, no material and — in the frame loop — no objects at all. Nothing in
 * `useFrame` calls `new`; even the per-frame neighbour and obstacle lists are reused arrays.
 *
 * WHAT THIS DIRECTORY SUPERSEDED. `geometry.ts` is gone: its bodies were deformed icospheres, which is
 * the shape the owner rejected, and its crests included a visibly faceted pebble. `look.ts` STAYS and is
 * the source of every colour, the eye-to-body ratio and the stage proportions — but its `Profile` and
 * `crestKind` fields are dead, replaced by `GUMDROP` and `FAMILY_CREST`.
 *
 * WHAT THE INTEGRATOR CALLS. `SLIME_RADIUS(stage)` to size a collider, and `pushOutOfSlimes(pos, r)`
 * from the player controller after its own movement integration. See `herd.ts`.
 */
import { useFrame, useThree } from '@react-three/fiber';
// `JSX` is no longer a global namespace under @types/react 19; it is exported from 'react'.
import { useEffect, useMemo, useRef, type JSX } from 'react';
import * as THREE from 'three';

import type { Family, Stage } from '../contract';
import { FAMILY_CREST, crestGeometry } from './crests';
import {
  GUMDROP,
  SLIME_RADIUS,
  bodyMaterial,
  catchlightMaterial,
  crestMaterial,
  faceGeometry,
  gumdropGeometry,
  irisMaterial,
  scleraMaterial,
  slimeHeight,
  slimeRadius,
  stageScale,
  worldScale,
} from './gumdrop';
import { FAMILY_LOOK, resolveStage } from './look';
import { joinHerd, leaveHerd, slimeColliders, type SlimeCollider } from './herd';
import { createWander, holdWander, rngFor, stepWander, type Circle, type WanderWorld } from './wander';

export { SLIME_RADIUS, slimeRadius, slimeHeight, GUMDROP, stageScale, worldScale };
export {
  pushOutOfSlimes,
  slimeColliders,
  nearestSlime,
  type SlimeCollider,
} from './herd';

/** How close the child has to be before a slime turns its eyes to look at them. */
const NOTICE = 9;
/** Assumed player radius, only for the slime's own gentle yielding. The controller passes its own. */
const PLAYER_R = 0.45;

export interface SlimeProps {
  family: Family;
  stage?: Stage;
  /** Where it starts. y is the ground height under it; x and z are only the first frame's x and z. */
  position: [number, number, number];
  /** Deterministic per-slime variation: heading, gait, pauses, blink rhythm. Same seed, same slime. */
  seed: number;
  /** The ranch. A slime may not leave this, ever. */
  bounds: { center: [number, number]; radius: number };
  /** Things to walk around: hut, trees, corral posts, and other slimes if you want to pass them. */
  obstacles?: { position: [number, number]; radius: number }[];
  /** Radians. Poses a slime on purpose instead of taking the seeded heading. */
  facing?: number;
  /** Default true. False keeps it on its mark, still breathing and blinking, and still collidable. */
  wander?: boolean;
}

export function Slime({
  family,
  stage = 'crested',
  position,
  seed,
  bounds,
  obstacles,
  facing,
  wander = true,
}: SlimeProps): JSX.Element {
  const look = FAMILY_LOOK[family];
  const st = useMemo(() => resolveStage(stage, 0), [stage]);
  const bake = useMemo(() => gumdropGeometry(family), [family]);
  const face = useMemo(() => faceGeometry(), []);
  const kind = FAMILY_CREST[family];
  const crest = useMemo(() => crestGeometry(kind), [kind]);

  const scale = worldScale(stage);
  const radius = slimeRadius(family, stage);

  const root = useRef<THREE.Group>(null);
  const shell = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group>(null);
  const gazeL = useRef<THREE.Group>(null);
  const gazeR = useRef<THREE.Group>(null);

  const reduced = useMemo(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  /* --- the face, laid out on the actual surface -----------------------------
     Placed from `radiusAt` rather than from a guessed offset, so an eye sits ON the hide of whichever
     family this is. Guessing works for a sphere and fails immediately for six different profiles: on
     a squat cobble a fixed offset floats the eyes in front of the face, and on a slender kite it buries
     them. Everything here is in body units and scales with the stage as one number. */
  const layout = useMemo(() => {
    // LOW on the body, not high. `eyeRise` is a -1..1 coordinate in `look.ts` and the first pass read
    // it as "up the dome", which put the eyes on the crown looking at the sky. Low-set eyes on a big
    // round body is the oldest baby-proportion trick there is, and it also puts the face on the WALL of
    // the gumdrop, where there is a broad flat-ish surface for it to be on.
    const t = Math.min(0.72, 0.4 + st.eyeRise * 0.5);
    const ring = bake.radiusAt(t);
    // THE baby/adult number: eye radius against body half-width, falling from 1.0 at pip to 0.46 at
    // warden. Everything else about growing up is decoration next to this ratio.
    // Against HALF-width, so this factor had to be raised when the profile table was rescaled to true
    // gumdrop proportions: the bodies got half again as tall and the eyes, which are sized off width,
    // suddenly read as beady. The face has to grow with the whole creature, not with one axis of it.
    //
    // The `ring` cap is the second half of it, and it is what keeps the narrow families honest: on a
    // kite the widest part of the body is nowhere near the face, so sizing the eyes off `halfWidth`
    // alone put two spheres wider than the head on the front of it. Capping against the local radius
    // means an eye is always a fraction of the surface it is actually sitting on.
    const eyeR = Math.min(bake.halfWidth * st.eye * 0.62, ring * 0.48);
    // Wide enough never to intersect, close enough never to look wall-eyed, and — the upper bound —
    // never so wide that the pair breaks the body's own outline. Eyes bulging past the silhouette read
    // as googly eyes on stalks, which is a different and much cheaper kind of cute than doe eyes.
    const spread = Math.max(eyeR * 1.04, ring * 1.02 - eyeR);
    const gap = Math.min(spread, Math.max(eyeR * 1.04, ring * st.eyeGap * 0.66));
    // SET INTO THE HIDE, RADIALLY. This is the fix for the one thing that looked like a bug rather than
    // a choice: place an eye on the surface and half the sphere sticks out, so a slime seen from behind
    // has two white beads on its flanks. Placing the centre a little way DOWN the radius instead means
    // most of the ball is inside the jelly and only its front cap is out — which is both what an eye set
    // into a soft body looks like, and invisible from behind. The gap is converted to an angle first so
    // the eyes stay on the round cross-section however wide apart they are.
    //
    // The angle is CAPPED, and that cap is the real fix rather than the sinking. A visible eye on a
    // convex body must break that body's cross-section — if it did not, it would be entirely inside the
    // jelly and invisible. So the protrusion cannot be removed; it can only be aimed. Held within about
    // thirty degrees of dead ahead, the part that sticks out sticks out FORWARD, where it is the doe-eyed
    // bulge the owner likes, and the body's own bulk hides it from behind.
    const phi = Math.min(0.55, Math.asin(Math.min(0.94, gap / Math.max(ring, 1e-4))));
    const dist = Math.max(eyeR * 0.2, ring - eyeR * 0.78);
    const across = Math.sin(phi) * dist;
    const depth = Math.cos(phi) * dist;
    return {
      t,
      ring,
      eyeR,
      gap: across,
      depth,
      y: t * bake.height,
      // Resting openness. Kept shallow — at 0.75 of `lid` the older stages looked half-asleep, and a
      // sleepy slime reads as an unwell slime.
      openAt: 1 - st.lid * 0.3,
    };
  }, [bake, st]);

  /* --- the brain ----------------------------------------------------------- */
  const state = useRef(
    createWander({
      seed,
      x: position[0],
      z: position[2],
      radius,
      facing,
      height: bake.height * scale,
      jiggle: look.jiggle * st.jiggle,
      bounds: { cx: bounds.center[0], cz: bounds.center[1], r: bounds.radius },
    }),
  );

  /* --- blink --------------------------------------------------------------- */
  const blink = useRef(
    (() => {
      const rng = rngFor(seed ^ 0x5f3759df);
      return { open: 1, next: 0.5 + rng() * 5, closing: -1, again: 0, rng };
    })(),
  );

  /* --- reusable frame scratch. Nothing in the loop allocates. --------------- */
  const world = useRef<WanderWorld>({
    bounds: { cx: bounds.center[0], cz: bounds.center[1], r: bounds.radius },
    solids: [],
    herd: [],
    player: { x: 0, z: 0, r: PLAYER_R },
  });
  const herdScratch = useRef<Circle[]>([]);
  const solidScratch = useRef<Circle[]>([]);
  /**
   * Which entries of `obstacles` are actually other slimes and must be ignored.
   *
   * The integrator is told it may pass slime positions in `obstacles`, and it is a reasonable thing to
   * pass. But those are the positions the slimes STARTED at, and once everything has wandered they are
   * phantom pillars sitting in empty grass that the herd politely walks around forever. So on the first
   * frame — when every slime is still on its start position and so still matches its own entry — any
   * obstacle sitting on top of a live slime is marked and skipped from then on. Slime-versus-slime is
   * handled from the live registry instead, which is the only version of it that stays true.
   */
  const phantom = useRef<Uint8Array | null>(null);

  const solids = useMemo<Circle[]>(
    () => (obstacles ?? []).map((o) => ({ x: o.position[0], z: o.position[1], r: o.radius })),
    [obstacles],
  );

  useEffect(() => {
    phantom.current = null;
  }, [solids]);

  /* --- registration, so the player can collide with this ------------------- */
  const collider = useRef<SlimeCollider | null>(null);
  useEffect(() => {
    const entry = joinHerd({
      family,
      stage,
      x: state.current.x,
      z: state.current.z,
      top: bake.height * scale,
      r: radius,
    });
    collider.current = entry;
    return () => {
      leaveHerd(entry);
      collider.current = null;
    };
  }, [family, stage, bake.height, scale, radius]);

  useFrame(({ camera }, dt) => {
    const s = state.current;
    const w = world.current;

    w.bounds.cx = bounds.center[0];
    w.bounds.cz = bounds.center[1];
    w.bounds.r = bounds.radius;

    /* neighbours, live, minus self */
    const live = slimeColliders();
    const near = herdScratch.current;
    near.length = 0;
    const self = collider.current;
    for (const o of live) {
      if (self && o.id === self.id) continue;
      // Only what could matter this frame. Cheap distance reject: an interaction cannot start from
      // further than a few metres at these speeds, and this turns the herd loop from 40x40 into
      // 40x(a handful).
      if (Math.abs(o.x - s.x) > 4 || Math.abs(o.z - s.z) > 4) continue;
      near.push({ x: o.x, z: o.z, r: o.r });
    }
    w.herd = near;

    /* furniture, minus the phantoms described above */
    if (!phantom.current && solids.length > 0) {
      const mask = new Uint8Array(solids.length);
      for (let i = 0; i < solids.length; i += 1) {
        const o = solids[i];
        if (!o) continue;
        if (Math.hypot(o.x - s.x, o.z - s.z) < 0.6) mask[i] = 1;
        else {
          for (const other of live) {
            if (Math.hypot(o.x - other.x, o.z - other.z) < 0.6) {
              mask[i] = 1;
              break;
            }
          }
        }
      }
      phantom.current = mask;
    }
    const keep = solidScratch.current;
    keep.length = 0;
    const mask = phantom.current;
    for (let i = 0; i < solids.length; i += 1) {
      if (mask && mask[i]) continue;
      const o = solids[i];
      if (o) keep.push(o);
    }
    w.solids = keep;

    /* the child */
    const player = w.player;
    if (player) {
      player.x = camera.position.x;
      player.z = camera.position.z;
    }

    if (wander && !reduced) stepWander(s, dt, w);
    else holdWander(s, dt);

    /* publish */
    if (self) {
      self.x = s.x;
      self.z = s.z;
    }

    /* pose */
    const g = root.current;
    if (g) {
      g.position.set(s.x, position[1] + s.bob * scale, s.z);
      // Face the way it is going. Local +Z is the face, so rotation.y IS the heading.
      g.rotation.y = s.heading;
    }
    const body = shell.current;
    if (body) {
      // Volume-preserving squash: taller means narrower by the square root, so the slime keeps its
      // mass. This is the difference between jelly and a balloon, and it is one line.
      const sq = s.squash;
      const side = scale / Math.sqrt(sq);
      body.scale.set(side, scale * sq, side);
    }

    /* blink. A quick close, a slower open, and sometimes a second one straight after — a single
       perfectly periodic blink reads as a machine. */
    const b = blink.current;
    const e = eyes.current;
    if (e && !reduced) {
      if (b.closing >= 0) {
        b.closing += dt;
        const T = 0.16;
        if (b.closing >= T) {
          b.closing = -1;
          b.open = 1;
          if (b.again > 0) {
            b.again -= 1;
            b.next = 0.14;
          } else {
            b.next = 1.6 + b.rng() * 5.4;
          }
        } else {
          const p = b.closing / T;
          // Down fast, up gently.
          b.open = p < 0.4 ? 1 - p / 0.4 : Math.pow((p - 0.4) / 0.6, 0.7);
        }
      } else {
        b.next -= dt;
        if (b.next <= 0) {
          b.closing = 0;
          if (b.rng() < 0.22) b.again = 1;
        }
      }
      e.scale.y = layout.openAt * Math.max(0.055, b.open);
    } else if (e) {
      e.scale.y = layout.openAt;
    }

    /* gaze. Look toward the child when they are close, and drift back to front-and-centre when they
       are not. Done by sliding the iris inside the sclera rather than by rotating the eyeball, because
       a rotated sphere shows no change at all and a rotated eye SOCKET separates from the face. */
    const dx = camera.position.x - s.x;
    const dz = camera.position.z - s.z;
    const flat = Math.hypot(dx, dz);
    const attention = flat < NOTICE ? 1 - flat / NOTICE : 0;
    // Into the slime's own frame, by hand: a Matrix4 inverse per slime per frame is forty matrix
    // inversions a frame to answer a question that is two multiplies and an add.
    const c = Math.cos(s.heading);
    const sn = Math.sin(s.heading);
    const lx = dx * c - dz * sn;
    const lz = dx * sn + dz * c;
    const dy = camera.position.y - (position[1] + layout.y * scale);
    const ahead = lz > 0.2 ? 1 : 0;
    const reach = layout.eyeR * 0.3;
    const wantX = THREE.MathUtils.clamp((lx / (flat + 0.001)) * reach, -reach, reach) * attention * ahead;
    const wantY = THREE.MathUtils.clamp((dy / (flat + 1.2)) * reach * 1.4, -reach, reach) * attention * ahead;
    const ease = Math.min(1, dt * 5);
    for (const eye of [gazeL.current, gazeR.current]) {
      if (!eye) continue;
      eye.position.x += (wantX - eye.position.x) * ease;
      eye.position.y += (wantY - eye.position.y) * ease;
    }
  });

  /* --- what grows out of the top ------------------------------------------
     The crest is what stops the six from being one shape in six colours once they are wandering and
     you only ever see them from behind. Geometry comes from the existing shared cache in
     `geometry.ts` — six buffers for the whole page — and only the placement is decided here. */
  const crests = useMemo(() => {
    const n = Math.max(1, Math.round(st.crestCount));
    // Crests grow with the stage, but not all the way. `crestScale` runs to 1.34 at warden and at full
    // strength that made a warden's fins and leaves large enough to compete with its own body for the
    // outline. A grown slime should have a BIGGER crest, not a costume.
    const k = Math.min(st.crestScale, 1.12);
    const out: { pos: [number, number, number]; rot: [number, number, number]; s: [number, number, number] }[] = [];

    switch (kind) {
      case 'leaf': {
        // A small sprig at the crown, fanned back and out. Three leaves at most: the first pass put a
        // leaf the size of the whole slime on its head and the creature disappeared under its salad.
        const leaves = Math.min(3, n);
        for (let i = 0; i < leaves; i += 1) {
          const a = ((i - (leaves - 1) / 2) / Math.max(1, leaves)) * 3.2;
          out.push({
            pos: [0, bake.height * 0.88, -bake.radiusAt(0.88) * 0.1],
            // Fanned wide and leaned well over, so three leaves read as a sprig and not as one stalk.
            rot: [-0.75, a, 0],
            s: [k * 0.62, k * 0.7, k * 0.62],
          });
        }
        break;
      }
      case 'fin': {
        // Paired, swept BACK and DOWN along the wall. High and upright, which is where the first pass
        // put them, is where a pair of anything on a head reads as horns.
        const t = 0.56;
        const r = bake.radiusAt(t);
        for (const side of [-1, 1]) {
          out.push({
            pos: [side * r * 0.82, bake.height * t, -r * 0.24],
            rot: [-0.35, side * 1.2, side * 0.7],
            s: [k * 0.52, k * 0.54, k * 0.52],
          });
        }
        break;
      }
      case 'flame': {
        // A warm tuft on the peak: WIDER than the body is at that height, so it reads as a soft flame
        // sitting on the slime. Narrower than the body — which is what the first two passes had — and it
        // is a stalk growing out of its head instead.
        out.push({ pos: [0, bake.height * 0.82, 0], rot: [0, 0, 0], s: [k * 0.76, k * 0.62, k * 0.76] });
        break;
      }
      case 'bead': {
        // A dew drop balanced on the peak. Same rule as the flame: wide and low, never tall and thin.
        out.push({ pos: [0, bake.height * 0.9, 0], rot: [0, 0, 0], s: [k * 0.46, k * 0.34, k * 0.46] });
        break;
      }
      case 'stone': {
        // A few small stones on the shoulder, at real surface height so they sit on the hide. Kept to
        // the BACK half so they never crowd the face.
        const stones = Math.min(3, n);
        for (let i = 0; i < stones; i += 1) {
          // Spread from one flank round the back to the other, so at least one is in view from any
          // angle. Tucked entirely behind the shoulder they were invisible from the front, which made
          // cobble the one family with no distinguishing feature at all.
          // Asymmetric on purpose: an even fan put one stone on each flank at exactly the same height,
          // and a symmetrical pair either side of a head reads as EARS whatever it is made of.
          const a = Math.PI + 0.45 + ((i - (stones - 1) / 2) / Math.max(1, stones)) * 2.3;
          const t = 0.68 + (i % 2) * 0.1;
          // Sat ON the surface, not inside it: at 0.82 of the radius a stone this size never broke the
          // hide at all and cobble shipped with an invisible crest.
          const r = bake.radiusAt(t) * 0.94;
          out.push({
            pos: [Math.sin(a) * r, t * bake.height, Math.cos(a) * r],
            rot: [0.1, a, 0.18],
            s: [k * 0.26, k * 0.2, k * 0.26],
          });
        }
        break;
      }
      case 'bun': {
        // A rounded knob rising out of the crown.
        //
        // The rule that finally got this right, after a brim and a lid: THE BLOB'S OWN EQUATOR MUST BE
        // BURIED. Its widest circle has to sit at a height where the body is wider than it is, or that
        // circle pokes out sideways and its outline crosses the body's outline at an angle — which is
        // read, correctly, as a hard edge. So the centre goes well down inside the body and only the top
        // of the sphere is allowed out.
        const mid = 0.82;
        const w = bake.radiusAt(mid) * 0.62 * k;
        const yr = bake.height * (1 - mid) + bake.height * 0.1 * k;
        out.push({ pos: [0, bake.height * mid, 0], rot: [0, 0, 0], s: [w, yr, w] });
        break;
      }
    }
    return out;
  }, [kind, bake, st.crestCount, st.crestScale]);

  const eyeR = layout.eyeR;

  return (
    <group ref={root} position={position}>
      <group ref={shell} scale={scale}>
        {/* The gumdrop. One shared lathe per family. */}
        <mesh geometry={bake.geometry} material={bodyMaterial(family)} castShadow receiveShadow />

        {crests.map((c, i) => (
          <mesh
            key={i}
            geometry={crest}
            material={crestMaterial(family)}
            position={c.pos}
            rotation={c.rot}
            scale={c.s}
            castShadow
          />
        ))}

        {/* The face. `eyes` is scaled in y to blink; the pieces inside it never change size. */}
        <group ref={eyes} position={[0, layout.y, 0]}>
          {([-1, 1] as const).map((side) => (
            <group key={side} position={[side * layout.gap, 0, layout.depth]}>
              {/* Sclera. Warm off-white, never #fff, so it stays soft next to a saturated body. */}
              <mesh geometry={face.sclera} material={scleraMaterial()} scale={eyeR} />
              {/* Iris and catchlight travel together, so the sparkle stays on the pupil as it looks
                  around. Physically the catchlight belongs to the cornea, but a sparkle that tracks
                  the gaze is what a picture book draws, and this is a picture book. */}
              <group ref={side < 0 ? gazeL : gazeR}>
                <mesh
                  geometry={face.iris}
                  material={irisMaterial(family)}
                  position={[0, 0, eyeR * 0.56]}
                  // Two thirds of the eye, not a half. A doe eye is mostly IRIS with a thin rim of
                  // sclera; a small pupil in a wide white is a cartoon googly eye, which is a cheaper
                  // and much less warm kind of cute.
                  scale={eyeR * 0.66}
                />
                <mesh
                  geometry={face.catchlight}
                  material={catchlightMaterial()}
                  position={[eyeR * 0.24 * side * -1, eyeR * 0.34, eyeR * 0.9]}
                  scale={eyeR * 0.26}
                />
              </group>
            </group>
          ))}
        </group>
      </group>
    </group>
  );
}
