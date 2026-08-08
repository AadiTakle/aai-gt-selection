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
 * And then the fourth note, which is what the six families now are:
 *
 *   "the slimes should be more distinct in that they have a clear element, theme, object ... like
 *   waffles, roses, grass, rock, fairy"
 *        → `crests.ts`. Each family owns a signature feature that changes its OUTLINE, because a child
 *          sees these from across a ranch where a texture is four pixels of mush: a butter pat on the
 *          skyline, a scalloped rosette, a tuft of blades, a low broad mossy lump, wings, ice spires over
 *          a rime skirt. `look.ts` owns the colour and material that confirm it up close.
 *
 * WHAT WAS KEPT because it already worked: the big glossy doe eyes with a catchlight, the physical
 * jelly material, and the idle squash. The squash now preserves volume (y up means x and z in by the
 * square root), which is the entire difference between jelly and a pulsing balloon — a balloon changes
 * volume, jelly does not. All six families keep the doe eyes; they are the charm and they are not
 * negotiable.
 *
 * PERFORMANCE, because forty of these are on screen. Every buffer and every material is created once
 * per family and shared: a family's body is one `LatheGeometry` (`gumdrop.ts`), the face is three unit
 * spheres shared by all twenty-four looks, and a family's signature feature is MERGED into at most two
 * buffers per stage in `crests.ts` — so a warden rose draws its sixteen petals and four sepals in one
 * call, and costs exactly what a pip waffle does. Forty slimes allocate no geometry, no material and —
 * in the frame loop — no objects at all. Nothing in `useFrame` calls `new`; even the per-frame neighbour
 * lists and the sparkle matrices are reused.
 *
 * WHAT THIS DIRECTORY SUPERSEDED. `geometry.ts` is gone: its bodies were deformed icospheres, which is
 * the shape the owner rejected, and its crests included a visibly faceted pebble. `look.ts` STAYS and is
 * the source of every colour, every material feel, the eye-to-body ratio and the stage proportions.
 *
 * WHAT THE INTEGRATOR CALLS. `SLIME_RADIUS(stage)` to size a collider, and `pushOutOfSlimes(pos, r)`
 * from the player controller after its own movement integration. See `herd.ts`.
 */
import { useFrame } from '@react-three/fiber';
// `JSX` is no longer a global namespace under @types/react 19; it is exported from 'react'.
import { useEffect, useMemo, useRef, type JSX } from 'react';
import * as THREE from 'three';

import type { Family, Stage } from '../contract';
import { FAMILY_FEATURE, featureGeometry } from './crests';
import {
  GUMDROP,
  SLIME_RADIUS,
  bodyMaterial,
  catchlightMaterial,
  faceGeometry,
  glazeMaterial,
  gumdropGeometry,
  irisMaterial,
  scleraMaterial,
  slimeHeight,
  slimeRadius,
  sparkGeometry,
  sparkMaterial,
  stageScale,
  trimMaterial,
  worldScale,
} from './gumdrop';
import { FAMILY_LOOK, resolveStage } from './look';
import { joinHerd, leaveHerd, slimeColliders, type SlimeCollider } from './herd';
import { createWander, holdWander, rngFor, stepWander, type Circle, type WanderWorld } from './wander';

export { SLIME_RADIUS, slimeRadius, slimeHeight, GUMDROP, stageScale, worldScale };
export { FAMILY_FEATURE } from './crests';
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

/**
 * Frame scratch for the sparkle instances, at module scope.
 *
 * Safe because `useFrame` bodies never overlap — there is one render thread — and it is the difference
 * between forty slimes allocating nothing per frame and forty slimes allocating four objects each.
 */
const AT = new THREE.Matrix4();
const P = new THREE.Vector3();
const Q = new THREE.Quaternion();
const K = new THREE.Vector3();

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
  /**
   * The signature feature — syrup and butter, petals, blades, boulders, wings, spires — already merged
   * into one opaque buffer and one translucent one by `crests.ts`, and shared by every slime of this
   * family at this stage. Two draw calls however many petals a rose has.
   */
  const feature = useMemo(() => featureGeometry(family, stage), [family, stage]);

  const scale = worldScale(stage);
  const radius = slimeRadius(family, stage);

  const root = useRef<THREE.Group>(null);
  const shell = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group>(null);
  const gazeL = useRef<THREE.Group>(null);
  const gazeR = useRef<THREE.Group>(null);
  const sparks = useRef<THREE.InstancedMesh>(null);
  /**
   * The group holding whatever moves on its own: fire's flame crown, radioactive's trefoil, air's spiral,
   * sleepy's Z. Not mounted for the fifteen families whose `aura` buffer is null, and never touched at all
   * when `prefers-reduced-motion` is set — which is the whole of the reduced-motion story for the new
   * families. Left alone, the group sits at its rest pose, which every one of the four was authored to
   * look correct in.
   */
  const aura = useRef<THREE.Group>(null);

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
     a squat rock a fixed offset floats the eyes in front of the face, and on a slender fairy it buries
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
    // fairy the widest part of the body is nowhere near the face, so sizing the eyes off `halfWidth`
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

  /**
   * The sparkle clock, offset per slime so a field of fairies does not twinkle in unison.
   *
   * It is only advanced when motion is allowed, which is the whole of the `prefers-reduced-motion`
   * handling for the sparkles: the matrices are still written every frame, they just stop describing a
   * different arrangement, so the motes hang in the air exactly where they were.
   */
  const clock = useRef((seed % 977) * 0.031);

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
  /**
   * The neighbour list, as a pool plus a view.
   *
   * `pool` holds the Circle objects and only ever grows; `view` is the array actually handed to the brain
   * and is emptied and refilled each frame from the pool. Truncating the view does not release the pooled
   * objects, so a slime that has seen six neighbours once never allocates a Circle again. Building this
   * the obvious way — `near.push({ x, z, r })` — is forty small objects per slime per frame, which at
   * forty slimes and sixty frames is ninety-six thousand short-lived objects a second and a collection
   * pause every few seconds. On a game for a five-year-old that pause lands exactly when something
   * interesting is happening.
   */
  const herdPool = useRef<Circle[]>([]);
  const herdView = useRef<Circle[]>([]);
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
    const pool = herdPool.current;
    const near = herdView.current;
    near.length = 0;
    const self = collider.current;
    for (const o of live) {
      if (self && o.id === self.id) continue;
      // Only what could matter this frame. Cheap box reject before any square root: an interaction cannot
      // start from further than a few metres at these speeds, and this turns the herd loop from 40x40 into
      // 40x(a handful).
      if (Math.abs(o.x - s.x) > 4 || Math.abs(o.z - s.z) > 4) continue;
      let c = pool[near.length];
      if (!c) {
        c = { x: 0, z: 0, r: 0 };
        pool[near.length] = c;
      }
      c.x = o.x;
      c.z = o.z;
      c.r = o.r;
      near.push(c);
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
    // A closed eye does not blink, and squashing the group in y would flatten the lash arc into a line.
    // `sleepy` is the only family this applies to; see `eyesClosed` in `look.ts`.
    if (e && look.eyesClosed) e.scale.y = 1;
    else if (e && !reduced) {
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

    /**
     * WHAT MOVES ON ITS OWN, for the four families that have any. See `Motion` in `look.ts`.
     *
     * The clock is only advanced when motion is allowed, and the group is only written when motion is
     * allowed, so under `prefers-reduced-motion` this whole block is one boolean test and the aura stays
     * exactly where `crests.ts` put it. That is deliberately stronger than freezing the clock: a frozen
     * clock still writes a transform every frame, and the requirement was that these hold still.
     */
    /**
     * The clock is advanced HERE, once, rather than inside the sparkle block where it used to live.
     *
     * It has to be, now that motion and sparkles are no longer the same families: `sleepy` has an aura and
     * zero sparkles, so a clock advanced only when sparkles exist left its Z frozen at the bottom of its
     * travel forever. Anything that reads `clock.current` below is downstream of this line.
     */
    if (!reduced) clock.current += dt;

    const au = aura.current;
    if (au && !reduced) {
      const time = clock.current;
      switch (look.motion) {
        case 'flicker': {
          // Two incommensurate sines, so the flicker never repeats on a beat a child could count. The
          // horizontal squeeze is the opposite sign to the vertical stretch, which is the same
          // volume-preserving idea the body's squash uses — a flame that only grows taller looks inflated.
          const f = 1 + 0.17 * Math.sin(time * 9.3) + 0.1 * Math.sin(time * 15.7 + 1.3);
          const side = 1 - (f - 1) * 0.45;
          au.scale.set(side, f, side);
          au.rotation.y = Math.sin(time * 2.1) * 0.07;
          break;
        }
        case 'throb': {
          const s = 1 + 0.075 * Math.sin(time * 2.2);
          au.scale.set(s, s, s);
          // A slow turn as well, so the trefoil presents all three lobes over time rather than hiding one.
          au.rotation.y = time * 0.5;
          break;
        }
        case 'turn':
          au.rotation.y = time * 0.62;
          break;
        case 'rise': {
          /**
           * Sleepy's Z: drifts up, shrinking away, then loops back to the bottom.
           *
           * Shrinking to nothing rather than fading, because a fade needs per-slime opacity and therefore
           * a material per slime — the same reason the sparkles twinkle by SIZE. A Z that shrinks as it
           * rises reads as one drifting away, and it costs one scale write.
           */
          const p = (time * 0.32) % 1;
          au.position.y = feature.auraOrigin[1] + p * 0.55;
          const s = Math.max(0.02, 1 - p);
          au.scale.set(s, s, s);
          break;
        }
        default:
          break;
      }
    }

    /* sparkles. One instanced mesh of three motes, drifting on slow independent orbits and twinkling
       out of phase with each other. Three matrices a frame, and only for the families that have any. */
    const motes = sparks.current;
    if (motes && feature.sparks > 0) {
      const time = clock.current;
      const R = bake.halfWidth;
      const anchor = feature.sparkAt;
      for (let i = 0; i < feature.sparks; i += 1) {
        const ph = i * 2.27;
        const a = ph + time * (0.42 + i * 0.13);
        const rr = R * (1.3 + 0.34 * Math.sin(time * 0.71 + ph));
        /**
         * ANCHORED, for bomb, whose one spark belongs on the tip of its fuse and nowhere else.
         *
         * A spark that orbits the body is a firefly, and a firefly circling a bomb is a different and much
         * worse idea than a bomb with a lit fuse. The jitter is a hundredth of a body unit — enough to look
         * alive, far too small to look like travel.
         */
        if (anchor) {
          P.set(
            anchor[0] + Math.sin(time * 5.3 + ph) * 0.012,
            anchor[1] + Math.cos(time * 6.1 + ph) * 0.012,
            anchor[2],
          );
        } else P.set(Math.sin(a) * rr, bake.height * (0.5 + 0.42 * Math.sin(time * 0.53 + ph * 1.7)), Math.cos(a) * rr);
        // Twinkle by SIZE rather than by opacity: the material is shared by every fairy on the page, so
        // per-mote opacity would need a material each. A mote that shrinks to a quarter reads as a mote
        // that has dimmed, and costs nothing.
        const tw = 0.34 + 0.66 * Math.abs(Math.sin(time * 1.7 + ph * 2.3));
        // An ANCHORED spark is nearly twice the size of an orbiting mote. A drifting sparkle is one of
        // several and reads as atmosphere; bomb's is the single brightest point on the creature and has to
        // read as the lit end of a fuse, which at mote size it did not.
        const s = R * (anchor ? 0.155 : 0.085) * tw;
        K.set(s, s, s);
        motes.setMatrixAt(i, AT.compose(P, Q, K));
      }
      motes.instanceMatrix.needsUpdate = true;
    }
  });

  /* --- what grows out of the body -----------------------------------------
     Nothing is placed here any more, and that is the point. Every petal, blade, boulder, wing, spire,
     drip and pat of butter is positioned, coloured and MERGED in `crests.ts`, once per family per stage,
     against the same profile curve the body is baked from. This component just draws the two buffers
     that come back, so a warden rose with thirteen petals costs exactly what a pip waffle does. */

  const eyeR = layout.eyeR;

  return (
    <group ref={root} position={position}>
      <group ref={shell} scale={scale}>
        {/* The gumdrop. One shared lathe per family. */}
        <mesh geometry={bake.geometry} material={bodyMaterial(family)} castShadow receiveShadow />

        {/* The opaque half of the signature feature: petals and sepals, blades and daisy, boulders and
            moss, the butter, the rime. One buffer, one draw call, colours baked per vertex. */}
        {feature.trim ? (
          <mesh geometry={feature.trim} material={trimMaterial(family)} castShadow receiveShadow />
        ) : null}

        {/* The translucent half: syrup, wings, ice spires. Drawn after the opaque pass, which is what
            lets a wing be see-through and still be occluded correctly by the body in front of it. */}
        {/* No `castShadow`: a shadow cast by a translucent thing is drawn at full strength by a depth-only
            pass, so a see-through wing lays down an opaque black wing on the grass. Dropping it is both
            more truthful and one less pass over four wings, thirteen spires and a syrup cap. */}
        {feature.glaze ? <mesh geometry={feature.glaze} material={glazeMaterial(family)} /> : null}

        {/* What moves on its own — fire's flames, radioactive's trefoil, air's spiral, sleepy's Z. Mounted
            only for the four families that have an aura buffer, so the other fifteen still cost exactly
            the two draw calls they always did. Positioned at the aura's own origin so the animation in
            `useFrame` scales and spins about something meaningful on the creature. */}
        {feature.aura ? (
          <group ref={aura} position={feature.auraOrigin}>
            <mesh geometry={feature.aura} material={glazeMaterial(family)} />
          </group>
        ) : null}

        {/* The face. `eyes` is scaled in y to blink; the pieces inside it never change size. */}
        <group ref={eyes} position={[0, layout.y, 0]}>
          {([-1, 1] as const).map((side) => (
            <group key={side} position={[side * layout.gap, 0, layout.depth]}>
              {look.eyesClosed ? (
                /**
                 * CLOSED EYES, and `sleepy` is the only family that has them.
                 *
                 * The arc is convex UP — a ⌒ rather than a ‿ — and that is the whole difference between
                 * contentedly asleep and unconscious. It is also flattened to half its height, because a
                 * closed eye drawn as a deep semicircle reads as a cartoon "dead" eye; a shallow curve
                 * reads as a lid. Both the arc and the lashes are in the family's own warm iris brown, so
                 * the face is the same value it would have been with eyes open and the palette rule that
                 * forbids black still holds here.
                 *
                 * The lashes are what make it charming rather than merely closed. Three, fanning up and
                 * OUTWARD from the outer corner, which is where every illustrator puts them.
                 */
                <>
                  <mesh
                    geometry={face.closed}
                    material={irisMaterial(family)}
                    // 0.1π turns the torus arc so its midpoint is at the top. See `faceGeometry`.
                    rotation={[0, 0, Math.PI * 0.1]}
                    scale={[eyeR * 0.82, eyeR * 0.46, eyeR * 0.82]}
                  />
                  {[0, 1, 2].map((li) => (
                    <mesh
                      key={li}
                      geometry={face.lash}
                      material={irisMaterial(family)}
                      position={[side * eyeR * (0.5 + li * 0.07), eyeR * (0.06 + li * 0.11), 0]}
                      rotation={[0, 0, side * -(0.55 + li * 0.4)]}
                      scale={[eyeR * 0.045, eyeR * 0.2, eyeR * 0.045]}
                    />
                  ))}
                </>
              ) : (
                <>
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
                </>
              )}
            </group>
          ))}
        </group>
      </group>

      {/* Motes of light, for the one family that has them. OUTSIDE the shell group on purpose: a
          sparkle is in the air, not on the slime, so the body's squash must not stretch it. One
          instanced mesh means three motes cost one draw call. */}
      {feature.sparks > 0 ? (
        <instancedMesh
          ref={sparks}
          args={[sparkGeometry(), sparkMaterial(family), feature.sparks]}
          scale={scale}
          frustumCulled={false}
        />
      ) : null}
    </group>
  );
}
