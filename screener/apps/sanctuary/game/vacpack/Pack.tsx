/**
 * THE THING IN YOUR HANDS. A chunky cream-and-apricot vacuum pack, held low and right, first person.
 *
 * THE ONE RULE THE SHAPE HAS TO OBEY. It is a toy, not a weapon. Every decision below is that rule applied:
 *
 *   · The nozzle is a BELL, not a taper. The profile in `blob.ts:horn()` opens on a curve and finishes in a
 *     fat rounded lip, so the silhouette is a trumpet or the rose of a watering can. A straight taper with a
 *     small opening is a muzzle, and the difference is entirely in the last third of the curve.
 *   · Nothing is a box. The tank is a bevelled pillow; every rib, lip and bumper is a torus or a capsule.
 *     There is not one hard edge in the model.
 *   · It is held ACROSS the body, canted inward, the way a child carries something heavy and precious —
 *     rather than shouldered and pointed, which is the pose that makes any prop read as a gun.
 *   · Warm cream shell, apricot on every part a hand would touch, soft brown rubber for the hose. No grey,
 *     no black, no metal.
 *
 * WHY ITS COORDINATES ARE CAMERA SPACE. `Vacpack` parents one group to the camera and mounts this inside it,
 * so everything below is written in camera space and needs no per-frame transform copying. That matters for
 * correctness and not just tidiness: a viewmodel whose transform is copied from the camera inside `useFrame`
 * lags the camera by one frame whenever the keeper controller's own `useFrame` is registered after it — and
 * mount order is decided by the integrator, not here. A viewmodel one frame behind the view swims sickeningly
 * when you turn. As a descendant of the camera the transform is composed at render time, after every frame
 * callback has run, and is exact regardless of who updates what when.
 *
 * DEPTH. The pack sits 0.4-0.6m from the eye and is about 0.2m across. The keeper controller keeps solids and
 * slimes at least `KEEPER_RADIUS` (0.45m) away and the eye 1.5m off the ground, so nothing in the world can get
 * between the eye and the pack. That is why this needs no second render pass, no `depthTest: false`, and no
 * layer juggling — the geometry of the game already guarantees it, and a viewmodel that participates honestly
 * in the depth buffer is one that a slime can visibly disappear INTO.
 */
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type JSX } from 'react';
import * as THREE from 'three';

import type { Family } from '../contract';
import {
  ball,
  disc,
  emptyMaterial,
  glassMaterial,
  glyphMaterial,
  horn,
  pennantMaterial,
  pillow,
  proxyBody,
  ring,
  rubberMaterial,
  shellMaterial,
  throatMaterial,
  trimMaterial,
} from './blob';
import { glyphOf } from './families';
import { TANK_CAPACITY, type Held } from './tank';

/* ------------------------------------------------------------------ *\
   Where the pack lives, in camera space
\* ------------------------------------------------------------------ */

/**
 * Camera space: -Z is forward, +X right, +Y up. Bottom-right of the view, close enough to be present and far
 * enough that the nozzle mouth is not a wall of cream across the lower half of the screen.
 */
export const PACK_POS: readonly [number, number, number] = [0.178, -0.155, -0.42];
/**
 * Canted so the nozzle swings in toward the middle of the screen and its mouth tips up into view. The Y term is
 * what puts the bell where a child's eye goes; without it the nozzle points off the right edge and the toy is a
 * lump in the corner.
 */
export const PACK_ROT: readonly [number, number, number] = [0.14, 0.5, -0.09];
/** The mouth of the bell, in the pack's own space. `MUZZLE_LOCAL` is derived from it and never hand-typed. */
export const NOZZLE_TIP: readonly [number, number, number] = [0, 0.004, -0.115];

/**
 * The nozzle mouth in CAMERA space, and the direction the bell faces. Solved once through a real `Object3D`
 * so it cannot drift out of step with the JSX below: change `PACK_ROT` and this follows.
 */
const anchor = new THREE.Object3D();
anchor.position.set(PACK_POS[0], PACK_POS[1], PACK_POS[2]);
anchor.rotation.set(PACK_ROT[0], PACK_ROT[1], PACK_ROT[2]);
anchor.updateMatrix();

export const MUZZLE_LOCAL: THREE.Vector3 = new THREE.Vector3(
  NOZZLE_TIP[0],
  NOZZLE_TIP[1],
  NOZZLE_TIP[2],
).applyMatrix4(anchor.matrix);

/* ------------------------------------------------------------------ *\
   Model dimensions
\* ------------------------------------------------------------------ */

/**
 * SIZES, and they were all halved once.
 *
 * The first pass was authored to the numbers that put the tank at a fifth of the screen height, which on paper
 * is a normal viewmodel and on screen was a cream wall across the bottom-right quarter of the ranch, hiding a
 * whole slime behind it. What a held object should occupy is much less than instinct suggests: the pack is now
 * about an eighth of the screen's width and the bell's mouth about an eighth of its height, which is present in
 * every frame without ever being the subject of one.
 *
 * The bell got LONGER as well as smaller. A short wide horn read as a porthole or a washing-machine drum; the
 * length-to-mouth ratio is what makes the same curve read as a nozzle.
 */
const TANK = { w: 0.105, h: 0.082, d: 0.058, r: 0.024, z: 0.042 };
const BARREL = { r: 0.019, z: -0.006 };
/**
 * LONG, and narrower at the throat than the first two passes. The bell is seen close to end-on — it has to be,
 * because it points where the child looks — so what tells you it is a spout is the length of the taper leading
 * into the mouth and the dark throat visible down it. Pass two had a wide mouth on a stubby horn with a fat lip
 * torus round it, and the only part that read at all was the torus: a beige doughnut floating in front of a box.
 */
const BELL = { back: 0.018, mouth: 0.037, len: 0.095, z: -0.02 };
/**
 * THE ROW OF WINDOWS, and the reason it is COUNTER-YAWED.
 *
 * The pack is canted inward by `PACK_ROT[1]` so the nozzle crosses into view. Anything mounted flat on the tank
 * inherits that cant, and a row of four small discs seen at fifty degrees off is four slivers — the contents,
 * which are the whole point of the row, become unreadable at the size a window actually gets. So the plate
 * cancels the pack's yaw and then tips about its own X toward the eye, which lands the row square to the camera
 * whatever the pack is doing. It is the only part of the model that is aimed at the viewer rather than posed.
 */
const WINDOW = { r: 0.0125, y: TANK.h / 2 + 0.003, z: 0.03, tilt: -Math.PI / 2 + 1.15 };

/** Four slots across the top of the tank, left to right. Slot 0 is the front of the queue: next one out. */
export const WINDOW_X: readonly number[] = [-0.04125, -0.01375, 0.01375, 0.04125];

/* ------------------------------------------------------------------ *\
   The mutable rig the mechanic drives the pack with
\* ------------------------------------------------------------------ */

/**
 * ONE MUTABLE OBJECT, WRITTEN BY `Vacpack` AND READ HERE.
 *
 * Not props. Every field changes every frame, and prop-driven animation at 60Hz is 60 reconciliations a second
 * of a subtree with thirty meshes in it. The pack is presentation over numbers the mechanic already has, so it
 * reads the numbers directly and re-renders only when the TANK CONTENTS change — a few times a minute.
 *
 * `Pack`'s frame callback runs before `Vacpack`'s (child effects subscribe first), so these values are one
 * frame old. That is correct for what they drive: a flare, a shake and two decaying impulses. It would not be
 * correct for a position, which is why the pack's position comes from the camera's own matrix instead.
 */
export interface PackRig {
  /** 0..1 wind-up. Rises while the button is held, falls when it is not. Drives flare, shake and glow. */
  charge: number;
  /** 1 while the button is actually down, smoothed. Separate from charge so release reads instantly. */
  suck: number;
  /** A catch. Set to 1 on a catch and decayed by the mechanic; the pack recoils and settles. */
  settle: number;
  /** A plop. Set to 1 on release; the nozzle punches forward and the pack rocks back. */
  punch: number;
  /** 0 held, 1 fully lowered out of view. Non-zero while a station is engaged. */
  stow: number;
  /** Seconds since mount. */
  t: number;
  /** Shortened, never removed. Every amplitude and duration in the pack is scaled by this. */
  motion: number;
  /** Which window just filled, and how long ago in seconds, for a soft flash. -1 for none. */
  litSlot: number;
  litAge: number;
}

export function makeRig(motion: number): PackRig {
  return { charge: 0, suck: 0, settle: 0, punch: 0, stow: 0, t: 0, motion, litSlot: -1, litAge: 99 };
}

/* ------------------------------------------------------------------ *\
   The tank windows
\* ------------------------------------------------------------------ */

function Glyph({ family, r }: { family: Family; r: number }): JSX.Element {
  const pieces = glyphOf(family);
  const mat = glyphMaterial(family);
  return (
    <group>
      {pieces.map((p, i) => {
        // Every piece is the same sphere at a different non-uniform scale: a pip is round, a bar is a rounded
        // ellipsoid, a blade is the same ellipsoid stood on end. Three symbols, one buffer, no sharp corners.
        const s: [number, number, number] =
          p.kind === 'pip'
            ? [p.size * r, p.size * r, p.size * r * 0.55]
            : p.kind === 'bar'
              ? [p.size * r, 0.15 * r, 0.1 * r]
              : [0.11 * r, p.size * r, 0.1 * r];
        return (
          <mesh
            key={i}
            geometry={ball()}
            material={mat}
            position={[p.at[0] * r, p.at[1] * r, r * 0.34]}
            rotation={[0, 0, p.turn ?? 0]}
            scale={s}
          />
        );
      })}
    </group>
  );
}

/**
 * ONE WINDOW. A recessed socket, a filleted apricot rim, and a thin bright glass over the top.
 *
 * When it holds something, the something is a little domed blob in the family's own colour with the family
 * mark floating in front of it, TURNING SLOWLY — the brief's "spin lazily in the tank". The spin is the single
 * detail that stops the row reading as four coloured stickers: a sticker cannot turn.
 */
function Window({ slot, held, rig }: { slot: number; held: Held | null; rig: PackRig }): JSX.Element {
  const spin = useRef<THREE.Group>(null);
  const flash = useRef<THREE.Mesh>(null);
  const x = WINDOW_X[slot] ?? 0;
  // Each slot turns at its own rate and starts at its own angle, so four caught slimes are never in lockstep.
  const rate = 0.55 + slot * 0.11;

  useFrame((_, dt) => {
    const g = spin.current;
    if (g) {
      g.rotation.y += dt * rate * rig.motion;
      // A slow nod on top of the turn. Held slimes are alive, not exhibits.
      g.rotation.z = Math.sin(rig.t * 1.3 + slot) * 0.1 * rig.motion;
    }
    const f = flash.current;
    if (f) {
      const lit = rig.litSlot === slot ? Math.max(0, 1 - rig.litAge / (0.45 * rig.motion)) : 0;
      const m = f.material as THREE.MeshBasicMaterial;
      m.opacity = lit * 0.75;
      f.visible = lit > 0.01;
      const s = 1 + lit * 0.55;
      f.scale.set(s, s, s);
    }
  });

  return (
    <group position={[x, 0, 0]}>
      {/* The socket floor. Pale wadding when empty, which is legible as "there is room here". */}
      <mesh geometry={disc()} material={emptyMaterial()} scale={[WINDOW.r * 0.94, WINDOW.r * 0.94, 0.06]} />

      {held ? (
        <group ref={spin} position={[0, 0, WINDOW.r * 0.18]}>
          <mesh
            geometry={proxyBody()}
            material={pennantMaterial(held.family)}
            // The blob is authored 0..1 tall about its base, so it is dropped half its height to sit centred
            // in the window rather than hanging off the top of it.
            position={[0, -WINDOW.r * 0.5, 0]}
            scale={[WINDOW.r * 0.78, WINDOW.r * 1.02, WINDOW.r * 0.78]}
          />
          <Glyph family={held.family} r={WINDOW.r} />
        </group>
      ) : null}

      {/* The catch flash. A bright disc that swells once and fades, so the child sees WHICH slot filled. */}
      <mesh
        ref={flash}
        geometry={disc()}
        position={[0, 0, WINDOW.r * 0.5]}
        scale={[WINDOW.r, WINDOW.r, 0.02]}
        visible={false}
      >
        <meshBasicMaterial
          color="#fff3d2"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Glass, then the rim over its edge so there is no visible seam. */}
      <mesh
        geometry={disc()}
        material={glassMaterial()}
        position={[0, 0, WINDOW.r * 0.6]}
        scale={[WINDOW.r * 0.98, WINDOW.r * 0.98, 0.03]}
      />
      <mesh
        geometry={ring(WINDOW.r, WINDOW.r * 0.22)}
        material={trimMaterial()}
        position={[0, 0, WINDOW.r * 0.52]}
      />
    </group>
  );
}

/* ------------------------------------------------------------------ *\
   The pack
\* ------------------------------------------------------------------ */

export function Pack({ rig, held }: { rig: PackRig; held: readonly Held[] }): JSX.Element {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const bell = useRef<THREE.Group>(null);
  const swirl = useRef<THREE.Mesh>(null);
  const needle = useRef<THREE.Group>(null);

  /* The intake swirl has its own material because its opacity is animated and a shared material animated from
     two frame callbacks is a race with no error message. */
  const swirlMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#ffdca0',
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [],
  );
  const glowMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#ffcf8a', transparent: true, opacity: 0, depthWrite: false }),
    [],
  );
  useEffect(
    () => () => {
      swirlMat.dispose();
      glowMat.dispose();
    },
    [swirlMat, glowMat],
  );

  /**
   * The hose. One swept tube from the back of the tank round to the underside of the barrel.
   *
   * Routed down the pack's OUTBOARD side and kept thin. The first pass ran it across the front at nearly the
   * barrel's own thickness, and a dark brown tube of that size in front of a cream shell read as a hole in the
   * middle of the toy rather than as a hose behind it.
   */
  const hose = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.03, 0.012, TANK.z + TANK.d / 2 - 0.004),
      new THREE.Vector3(0.05, -0.014, 0.048),
      new THREE.Vector3(0.043, -0.03, 0.012),
      new THREE.Vector3(0.024, -0.028, -0.012),
      new THREE.Vector3(0.006, -0.016, -0.024),
    ]);
    return { geo: new THREE.TubeGeometry(curve, 22, 0.0072, 9, false), curve };
  }, []);
  useEffect(() => () => hose.geo.dispose(), [hose]);

  /** Ribs along the hose, so it reads as a concertina hose rather than a wire. */
  const ribs = useMemo(() => {
    const out: { p: THREE.Vector3; q: THREE.Quaternion }[] = [];
    // A torus lies in the XY plane, so its axis is +Z. That is the vector to line up with the hose, and using
    // +Y instead — then patching it with a `rotation-x` prop — fights R3F, whose rotation setter overwrites the
    // quaternion it was just given.
    const axis = new THREE.Vector3(0, 0, 1);
    for (let i = 1; i <= 5; i += 1) {
      const t = i / 6;
      const p = hose.curve.getPointAt(t);
      const tan = hose.curve.getTangentAt(t);
      const q = new THREE.Quaternion().setFromUnitVectors(axis, tan.normalize());
      out.push({ p, q });
    }
    return out;
  }, [hose]);

  useFrame((_, dt) => {
    const g = root.current;
    if (!g) return;
    const m = rig.motion;
    const step = Math.min(dt, 0.05);

    /* --- hold, shake, recoil ---------------------------------------------
       Three sines at frequencies with no common factor. A single sine reads as a machine and a random jitter
       reads as a fault; incommensurate sines read as a thing straining in your hands. Amplitude is scaled by
       `motion`, so reduced-motion shortens the shake rather than deleting the feedback. */
    const t = rig.t;
    const sh = rig.charge * rig.charge * 0.0055 * m;
    const bx = (Math.sin(t * 27.3) + Math.sin(t * 41.1) * 0.6) * sh;
    const by = (Math.sin(t * 33.7 + 1.1) + Math.sin(t * 19.3) * 0.7) * sh;

    // Sway with the walk, so the pack is carried rather than welded to the eye. Tiny on purpose.
    const sway = Math.sin(t * 2.1) * 0.004 * m;
    const settle = rig.settle;
    const punch = rig.punch;

    g.position.set(
      PACK_POS[0] + bx + sway,
      // A catch pulls the pack down and back into the hands; a plop kicks it up. Both decay in the mechanic.
      PACK_POS[1] + by - settle * 0.022 * m + punch * 0.012 * m - rig.stow * 0.34,
      // The nozzle punches AWAY on a plop and is tugged back on a catch. This one line is most of the weight.
      PACK_POS[2] - punch * 0.03 * m + settle * 0.016 * m,
    );
    g.rotation.set(
      PACK_ROT[0] + by * 5 - punch * 0.2 * m + settle * 0.12 * m + rig.stow * 0.5,
      PACK_ROT[1] + bx * 4,
      PACK_ROT[2] + Math.sin(t * 1.7) * 0.012 * m - settle * 0.1 * m,
    );

    /* --- the bell flares while drawing -----------------------------------
       Radially only. Scaling z as well would move the mouth, and the mouth is where every flying slime is
       aimed — a nozzle that grows toward the target is a target that will not converge. */
    const b = bell.current;
    if (b) {
      const f = rig.charge;
      const wide = 1 + f * 0.15 * m + Math.sin(t * 24) * f * 0.012 * m;
      b.scale.set(wide, wide, 1);
    }

    /* --- the swirl at the lip -------------------------------------------- */
    const s = swirl.current;
    if (s) {
      s.rotation.z += step * (2.2 + rig.charge * 9) * m;
      swirlMat.opacity = rig.suck * 0.5 + rig.charge * 0.3;
      const p = 1 + Math.sin(t * 16) * 0.08 * rig.charge * m;
      s.scale.set(p, p, 1);
      s.visible = swirlMat.opacity > 0.01;
    }
    glowMat.opacity = rig.charge * 0.55;

    /* --- the gauge -------------------------------------------------------
       A needle, no numbers and no digits. It is the fill of the tank as a picture, which is the only form a
       five-year-old reads at a glance. */
    const n = needle.current;
    if (n) {
      const want = -2.0 + (held.length / TANK_CAPACITY) * 4.0;
      n.rotation.z += (want - n.rotation.z) * Math.min(1, step * 7);
    }

    /* --- squash the whole body a touch on a catch, so the toy feels soft -- */
    const bd = body.current;
    if (bd) {
      const k = 1 + settle * 0.05 * m;
      bd.scale.set(k, 1 / Math.sqrt(k), k);
    }
  });

  return (
    <group ref={root}>
      <group ref={body}>
        {/* --- the tank -------------------------------------------------- */}
        <mesh geometry={pillow(TANK.w, TANK.h, TANK.d, TANK.r)} material={shellMaterial()} position={[0, 0, TANK.z]} />
        {/* A wrap of apricot round its middle: a stripe is what makes a cream lump read as a designed object. */}
        <mesh
          geometry={pillow(TANK.w * 1.015, TANK.h * 0.3, TANK.d * 1.015, TANK.r * 0.7)}
          material={trimMaterial()}
          position={[0, -TANK.h * 0.24, TANK.z]}
        />
        {/* Soft bumpers underneath, so it looks like it can be put down. */}
        {[-0.032, 0.032].map((x) => (
          <mesh
            key={x}
            geometry={ball()}
            material={rubberMaterial()}
            position={[x, -TANK.h / 2 - 0.003, TANK.z]}
            scale={[0.013, 0.008, 0.013]}
          />
        ))}

        {/* --- the row of windows ----------------------------------------
             Two nested groups on purpose: the outer one cancels the pack's yaw, the inner one tips the plate
             toward the eye. Rolled into one Euler they would interact and the row would skew again. */}
        <group position={[0, WINDOW.y, WINDOW.z]} rotation={[0, -PACK_ROT[1], 0]}>
          <group rotation={[WINDOW.tilt, 0, 0]}>
            {/* A shallow apricot plate under the four, so the row is one feature and not four holes. */}
            <mesh geometry={pillow(0.112, 0.032, 0.009, 0.015)} material={trimMaterial()} position={[0, 0, -0.006]} />
            {Array.from({ length: TANK_CAPACITY }, (_, i) => (
              <Window key={i} slot={i} held={held[i] ?? null} rig={rig} />
            ))}
          </group>
        </group>

        {/* --- barrel, bell, throat -------------------------------------- */}
        <mesh
          geometry={ball()}
          material={shellMaterial()}
          position={[0, 0.003, BARREL.z + 0.012]}
          scale={[BARREL.r * 1.2, BARREL.r * 1.2, 0.03]}
        />
        <mesh geometry={ring(BARREL.r * 1.08, 0.005)} material={trimMaterial()} position={[0, 0.003, BARREL.z - 0.018]} />

        <group ref={bell} position={[NOZZLE_TIP[0], NOZZLE_TIP[1], 0]}>
          <mesh geometry={horn(BELL.back, BELL.mouth, BELL.len)} material={shellMaterial()} position={[0, 0, BELL.z]} />
          {/* Seen from inside, which is what makes the bell read as an opening rather than a cap. Inset a hair so
              the two coincident lathes cannot z-fight along the lip. */}
          <mesh
            geometry={horn(BELL.back, BELL.mouth, BELL.len)}
            material={throatMaterial()}
            position={[0, 0, BELL.z]}
            scale={[0.965, 0.965, 0.99]}
          />
          {/* And a dark plate across the narrow end, so there is unambiguously somewhere for a slime to GO. A
              liner alone leaves the back of the throat as whatever happens to be behind the pack. */}
          <mesh
            geometry={disc()}
            material={throatMaterial()}
            position={[0, 0, BELL.z + 0.001]}
            scale={[BELL.back * 0.94, BELL.back * 0.94, 0.02]}
          />
          {/* The rounded lip. Thin: at three times this thickness it was the only part of the nozzle that read. */}
          <mesh geometry={ring(BELL.mouth, 0.0055)} material={trimMaterial()} position={[0, 0, BELL.z - BELL.len]} />
          {/* An apricot band a third of the way down, and a collar where the horn meets the barrel. Two rings for
              the price of nothing, and they are what break a smooth cream taper into a nozzle with parts. */}
          <mesh geometry={ring(0.0262, 0.0046)} material={trimMaterial()} position={[0, 0, BELL.z - BELL.len * 0.72]} />
          <mesh geometry={ring(0.0202, 0.0058)} material={trimMaterial()} position={[0, 0, BELL.z - 0.002]} />
          {/* The swirl: a flat ring of light spinning across the mouth while the air moves. */}
          <mesh
            ref={swirl}
            geometry={ring(BELL.mouth * 0.66, BELL.mouth * 0.3)}
            material={swirlMat}
            position={[0, 0, BELL.z - BELL.len * 0.86]}
          />
          {/* A warm coal down the throat while drawing, so the nozzle has a lit interior. */}
          <mesh
            geometry={disc()}
            material={glowMat}
            position={[0, 0, BELL.z - BELL.len * 0.25]}
            scale={[BELL.back * 0.9, BELL.back * 0.9, 0.02]}
          />
        </group>

        {/* --- hose and ribs --------------------------------------------- */}
        <mesh geometry={hose.geo} material={rubberMaterial()} />
        {ribs.map((r, i) => (
          <mesh key={i} geometry={ring(0.0098, 0.0032)} material={trimMaterial()} position={r.p} quaternion={r.q} />
        ))}

        {/* --- the grip, and the gauge ----------------------------------- */}
        <mesh
          geometry={ring(0.017, 0.0072)}
          material={rubberMaterial()}
          position={[0.019, -0.022, -0.002]}
          rotation={[0.2, 1.35, 0]}
        />
        <group position={[-0.004, 0.004, TANK.z + TANK.d / 2 + 0.003]}>
          <mesh geometry={disc()} material={trimMaterial()} scale={[0.016, 0.016, 0.02]} />
          <mesh geometry={disc()} material={emptyMaterial()} position={[0, 0, 0.002]} scale={[0.0126, 0.0126, 0.02]} />
          <group ref={needle} position={[0, 0, 0.004]}>
            <mesh geometry={ball()} material={rubberMaterial()} position={[0, 0.005, 0]} scale={[0.0016, 0.0092, 0.0013]} />
          </group>
          <mesh geometry={ball()} material={rubberMaterial()} position={[0, 0, 0.005]} scale={[0.0026, 0.0026, 0.002]} />
        </group>

        {/* A small warm lamp that travels with the pack, so the toy is legible in a barn's shadow as well as
            in the open. Short range, low intensity and no shadow: it lifts the pack out of the dark without
            making it the brightest object on screen, which is what a stronger one did. */}
        {/* Range kept under half a metre so it reaches the pack and nothing else. At 0.7 it also lit whatever was
            being drawn in, and a slime lit from a hand's width away goes white. */}
        <pointLight position={[0.05, 0.06, 0.0]} intensity={0.16} distance={0.42} decay={2} color="#ffe9c6" />
      </group>
    </group>
  );
}
