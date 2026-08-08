/**
 * THE VACUUM PACK. Hold the left button to draw a slime in; right button, or Q, to plop it back out.
 *
 * The owner's note: "players usually have a vaccuum to pick up the slimes and drag them around with them and
 * plop them down so i think we can introduce that game mechanic here too."
 *
 * ── THE ONE INVARIANT ─────────────────────────────────────────────────────────────────────────────────────
 *
 * NOTHING IS EVER LOST. A slime that goes in comes out. Every path is closed:
 *
 *   · A slime is only taken from the world once the draw is committed, and the same frame it is taken it
 *     becomes a proxy this component is holding. There is no window in which it exists nowhere.
 *   · The tank refuses a fifth slime rather than dropping one, and the mechanic checks capacity BEFORE it
 *     commits a grab, so the refusal is never reached in normal play. If it ever were, the slime in flight is
 *     turned round and plopped rather than discarded.
 *   · A plopped slime is handed back to the world with `onRelease` at the end of its bounce, at a position
 *     `settleLanding` has already proved is inside the bounds and clear of every building.
 *   · UNMOUNT FLUSHES. If this component goes away mid-flight or with a full tank — a route change, a hot
 *     reload, the integrator conditionally rendering it — the cleanup releases everything it is holding back
 *     into the world. That effect is the reason nothing here can leak a creature.
 *
 * ── AND NO GATING ─────────────────────────────────────────────────────────────────────────────────────────
 *
 * There is no failure state and nothing to get right. An empty tank plopped is a small puff of air. A full tank
 * sucked at still blows the dust about. Nothing counts anything, nothing is unlocked by catching, and no copy
 * anywhere in this directory tells a child they did something wrong. It is a toy.
 *
 * ── WHAT IT DRAWS, AND WHERE ──────────────────────────────────────────────────────────────────────────────
 *
 * Two groups, and the split between them is load-bearing:
 *
 *   CAMERA SPACE — the pack, the cone, the motes, and any slime being drawn IN. Parented to the camera, so all
 *   of it is composed at render time and none of it can lag the view by a frame. A slime being sucked is aimed
 *   at a CONSTANT point in this space (the nozzle mouth), which is what makes it enter the bell exactly rather
 *   than chasing a moving target.
 *
 *   WORLD SPACE — any slime in the air after a plop, and the ring on the ground under the current target. These
 *   must be pinned to the ranch: a lobbed slime whose arc was expressed relative to the camera would swing
 *   sideways every time the child turned their head mid-throw.
 */
import { useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from 'react';
import * as THREE from 'three';

import type { Family } from '../contract';
import { pushOutOfSlimes, slimeColliders } from '../slimes/herd';
import { SOLIDS } from '../world/Buildings';
import { LeanRig, MOTE_COUNT, Motes } from './airflow';
import {
  airMaterial,
  ball,
  bodyMaterial,
  catchlightMaterial,
  draught,
  irisMaterial,
  markMaterial,
  moteMaterial,
  proxyBody,
  ring,
  scleraMaterial,
  speck,
} from './blob';
import { capturedTrace, recordCapture } from './identity';
import { MUZZLE_LOCAL, Pack, makeRig } from './Pack';
import {
  CONE,
  DRAW,
  PLOP,
  arc,
  circlesFrom,
  drawEase,
  drawFlight,
  intakeScale,
  pick,
  plopTarget,
  ramp,
  settleLanding,
  squash,
  type Ground,
} from './suction';
import { tankCount, tankDrain, tankFull, tankPush, tankShift, useVacpackTank, type Held } from './tank';

/* Module-scope scratch for the frame loop. One vacpack exists per page, so a `useRef` per temporary would be
   three more objects and three more lines for nothing. Nothing here is read across frames. */
const tmpQuat = new THREE.Quaternion();
const tmp3 = new THREE.Vector3();
const wantSpot = { x: 0, z: 0 };

/** Every building, post, tree and trough as a circle. Converted once; static for the life of the page. */
const SOLID_CIRCLES = circlesFrom(SOLIDS);

/* ------------------------------------------------------------------ *\
   A slime in the air
\* ------------------------------------------------------------------ */

interface Flyer {
  key: number;
  /** `in` is being drawn to the nozzle and lives in camera space. `out` is lobbed and lives in world space. */
  kind: 'in' | 'out';
  id: string;
  family: Family;
  /** The herd id it was taken from, so the picker can refuse to grab the same slime twice. */
  herdId: number;
  /** Half-width and height, straight off the collider, so the proxy is exactly the size of what vanished. */
  r: number;
  top: number;
  /** Where it began, in world space. */
  sx: number;
  sy: number;
  sz: number;
  /** Where it is going to land, world space, already proved legal. Only for `out`. */
  lx: number;
  lz: number;
  /** 0..1 through the flight. */
  a: number;
  dur: number;
  /** `fly` then, for `out` only, `land` while it squashes and settles. */
  phase: 'fly' | 'land';
  /** Seconds into the landing squash. */
  bt: number;
  /** Its own tumble, so two slimes in the air never move alike. */
  spin: number;
  wob: number;
  obj: THREE.Group | null;
  shell: THREE.Group | null;
}

let nextKey = 1;

/** Fallbacks for the rare case a trace has aged out before a slime is plopped. A tuffet-ish slime. */
const FALLBACK_R = 0.42;
const FALLBACK_TOP = 0.95;

/* ------------------------------------------------------------------ *\
   The proxy body
\* ------------------------------------------------------------------ */

/**
 * WHAT A SLIME LOOKS LIKE WHILE THE VACPACK HAS HOLD OF IT.
 *
 * The shell is scaled UNIFORMLY by the collider's half-width and the body mesh alone carries the height, which
 * is the only arrangement that keeps the eyes round. Scaling the whole thing by `(r, top, r)` is the obvious
 * version and it gives every caught slime a pair of oval eyes, because a sphere in a non-uniformly scaled
 * parent is an ellipsoid — and oval eyes on a round body is the entire difference between doe-eyed and cheap.
 *
 * The squash goes on the shell, so it takes the eyes with it. That is correct: a slime landing squashes all
 * over, face included.
 */
function Proxy({ f }: { f: Flyer }): JSX.Element {
  const aspect = f.top / Math.max(0.01, f.r);
  const eyeR = 0.3;
  const eyeY = aspect * 0.52;
  return (
    <group
      ref={(o) => {
        f.obj = o;
        if (o) o.frustumCulled = false;
      }}
    >
      <group
        ref={(o) => {
          f.shell = o;
        }}
      >
        <mesh geometry={proxyBody()} material={bodyMaterial(f.family)} scale={[1, aspect, 1]} castShadow />
        {([-1, 1] as const).map((side) => (
          <group key={side} position={[side * 0.36, eyeY, 0.82]}>
            <mesh geometry={ball()} material={scleraMaterial()} scale={eyeR} />
            <mesh geometry={ball()} material={irisMaterial(f.family)} position={[0, 0, eyeR * 0.56]} scale={eyeR * 0.66} />
            <mesh
              geometry={ball()}
              material={catchlightMaterial()}
              position={[-side * eyeR * 0.24, eyeR * 0.34, eyeR * 0.9]}
              scale={eyeR * 0.26}
            />
          </group>
        ))}
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ *\
   The mechanic
\* ------------------------------------------------------------------ */

export function Vacpack({
  enabled,
  onCapture,
  onRelease,
  /**
   * The playable radius of the ranch, and the ground height. Optional, with the keeper controller's own numbers
   * as defaults, so the required interface stays exactly the three properties the integrator asked for — but
   * the two facts a plop has to respect are not hard-coded in a file that cannot see them.
   */
  worldRadius = 34,
  groundY = 0,
}: {
  enabled: boolean;
  onCapture: (slimeId: string) => void;
  onRelease: (family: Family, position: [number, number, number]) => void;
  worldRadius?: number;
  groundY?: number;
}): JSX.Element {
  const { camera, scene } = useThree();
  const { held } = useVacpackTank();

  /**
   * Reduced motion SHORTENS rather than removes. Everything in this directory multiplies its durations and its
   * amplitudes by this one number, and nothing is gated on it — because a slime that teleports into the tank is
   * more confusing than one that flies there quickly, which is the opposite of what the setting is asking for.
   */
  const motion = useMemo(() => {
    const reduced =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return reduced ? 0.45 : 1;
  }, []);

  const rig = useMemo(() => makeRig(motion), [motion]);
  const ground = useMemo<Ground>(
    () => ({ worldRadius, y: groundY, solids: SOLID_CIRCLES }),
    [worldRadius, groundY],
  );

  /* --- input ------------------------------------------------------------- */
  const sucking = useRef(false);
  const plopWanted = useRef(0);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    if (!enabled) sucking.current = false;
  }, [enabled]);

  useEffect(() => {
    const down = (e: MouseEvent) => {
      if (!enabledRef.current) return;
      if (e.button === 0) sucking.current = true;
      // Right button plops. The keyboard fallback below is the one a child will actually find.
      else if (e.button === 2) plopWanted.current += 1;
    };
    const up = (e: MouseEvent) => {
      if (e.button === 0) sucking.current = false;
    };
    const key = (e: KeyboardEvent) => {
      if (!enabledRef.current) return;
      // Q, because a five-year-old on a trackpad may never discover a right click, and because it is next to
      // the movement keys under the same hand.
      if (e.code === 'KeyQ') plopWanted.current += 1;
    };
    // Without this the browser menu opens over the game on the first right click, which under pointer lock
    // looks like the game has broken.
    const menu = (e: Event) => e.preventDefault();
    // A window that loses focus mid-suck must not come back still sucking.
    const blur = () => {
      sucking.current = false;
    };
    window.addEventListener('mousedown', down);
    window.addEventListener('mouseup', up);
    window.addEventListener('keydown', key);
    window.addEventListener('contextmenu', menu);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('mousedown', down);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('keydown', key);
      window.removeEventListener('contextmenu', menu);
      window.removeEventListener('blur', blur);
    };
  }, []);

  /* --- flight ------------------------------------------------------------ */
  const flyers = useRef<Flyer[]>([]);
  /** Bumped to re-render when a flyer is added or removed. Their MOTION is all refs and allocates nothing. */
  const [, bump] = useState(0);
  const reflow = useCallback(() => bump((n) => n + 1), []);
  const cooldown = useRef(0);
  /** Herd ids currently in the air, so the picker cannot grab the same slime twice before it is torn down. */
  const inFlight = useRef<Set<number>>(new Set());

  /* --- scratch. Nothing in the frame loop allocates. ---------------------- */
  const muzzle = useRef(new THREE.Vector3());
  const fwd = useRef(new THREE.Vector3());
  const aim = useRef({ from: { x: 0, y: 0, z: 0 }, dir: { x: 0, y: 0, z: -1 } });
  const tmp = useRef(new THREE.Vector3());
  const tmp2 = useRef(new THREE.Vector3());
  const spot = useRef({ x: 0, z: 0 });
  const lean = useMemo(() => new LeanRig(), []);
  const motes = useMemo(() => new Motes(MUZZLE_LOCAL), []);

  /* --- refs into the scene ----------------------------------------------- */
  const camRig = useRef<THREE.Group>(null);
  const worldRig = useRef<THREE.Group>(null);
  const cone = useRef<THREE.Mesh>(null);
  const swarm = useRef<THREE.InstancedMesh>(null);
  const mark = useRef<THREE.Mesh>(null);

  /**
   * The camera-space group, attached to the camera itself.
   *
   * The second half — putting the camera into the scene if it is not already there — is not defensive
   * programming, it is required. Three renders a scene by walking it; a camera that is not IN the scene never
   * has its children walked, so the pack would simply not appear, with no warning anywhere to say why.
   */
  useEffect(() => {
    const g = camRig.current;
    if (!g) return;
    camera.add(g);
    let attached = false;
    if (!camera.parent) {
      scene.add(camera);
      attached = true;
    }
    g.traverse((o) => {
      o.frustumCulled = false;
    });
    return () => {
      camera.remove(g);
      if (attached) scene.remove(camera);
    };
  }, [camera, scene]);

  /* --- putting things back ----------------------------------------------- */
  const releaseRef = useRef(onRelease);
  releaseRef.current = onRelease;
  const captureRef = useRef(onCapture);
  captureRef.current = onCapture;
  /** The last place the child stood, for the unmount flush — the camera may already be gone by then. */
  const lastStand = useRef({ x: 0, z: 0 });

  /**
   * Choose a legal spot for a slime and hand it to the world. The one function that ever calls `onRelease`.
   *
   * The order of corrections is the guarantee: buildings and bounds first (`settleLanding`), then live slimes
   * (`pushOutOfSlimes` from `herd.ts`), then buildings and bounds AGAIN — because pushing out of a slime can
   * push into a fence, and the bound has to be the last word. A residual overlap with another slime is fine and
   * resolves itself; a slime inside a barn wall never would.
   */
  const placeInWorld = useCallback(
    (family: Family, r: number, want: { x: number; z: number }): [number, number, number] => {
      const p = spot.current;
      p.x = want.x;
      p.z = want.z;
      settleLanding(p, r, ground);
      const v = tmp2.current.set(p.x, groundY, p.z);
      pushOutOfSlimes(v, r);
      p.x = v.x;
      p.z = v.z;
      settleLanding(p, r, ground);
      const at: [number, number, number] = [p.x, groundY, p.z];
      releaseRef.current(family, at);
      return at;
    },
    [ground, groundY],
  );

  /**
   * THE FLUSH. On unmount, everything the pack is holding goes back into the world.
   *
   * Deliberately not dependent on anything, so it runs exactly once, on the way out. Held slimes are fanned out
   * around where the child was standing rather than stacked on one spot, so four of them do not arrive inside
   * each other — `pushOutOfSlimes` would sort that out eventually, but arriving already spread is better than
   * arriving in a knot and shuffling apart.
   */
  useEffect(
    () => () => {
      lean.release();
      const stranded: { family: Family; r: number }[] = [];
      for (const f of flyers.current) stranded.push({ family: f.family, r: f.r });
      flyers.current = [];
      inFlight.current.clear();
      for (const h of tankDrain()) {
        const t = capturedTrace(h.id);
        stranded.push({ family: h.family, r: t?.r ?? FALLBACK_R });
      }
      const at = lastStand.current;
      stranded.forEach((s, i) => {
        const a = (i / Math.max(1, stranded.length)) * Math.PI * 2;
        placeInWorld(s.family, s.r, { x: at.x + Math.cos(a) * 1.8, z: at.z + Math.sin(a) * 1.8 });
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  /* --- the frame --------------------------------------------------------- */
  useFrame((_, dt) => {
    const step = Math.min(dt, 0.05);
    rig.t += step;
    lastStand.current.x = camera.position.x;
    lastStand.current.z = camera.position.z;

    /* Where the nozzle is and what it is pointed at. The mouth is a constant in camera space, so one rotation
       and one add is the whole of it — no matrix updates and no dependency on who ran first this frame. */
    const mz = muzzle.current.copy(MUZZLE_LOCAL).applyQuaternion(camera.quaternion).add(camera.position);
    /* AIMED WITH THE EYES, NOT THE NOZZLE. The bell is canted inward for looks; if the cone followed it, the
       thing a child grabbed would be a few degrees off the middle of the screen, which is unaimable. */
    const dir = fwd.current.set(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
    const A = aim.current;
    A.from.x = mz.x;
    A.from.y = mz.y;
    A.from.z = mz.z;
    A.dir.x = dir.x;
    A.dir.y = dir.y;
    A.dir.z = dir.z;

    /* --- wind-up ---------------------------------------------------------- */
    const on = enabled && sucking.current;
    rig.suck += ((on ? 1 : 0) - rig.suck) * Math.min(1, step * 14);
    if (on) rig.charge = Math.min(1, rig.charge + step / (DRAW.windUp * Math.max(0.35, motion)));
    else rig.charge = Math.max(0, rig.charge - step / 0.18);
    rig.settle = Math.max(0, rig.settle - step / (0.34 * Math.max(0.4, motion)));
    rig.punch = Math.max(0, rig.punch - step / (0.26 * Math.max(0.4, motion)));
    rig.stow += ((enabled ? 0 : 1) - rig.stow) * Math.min(1, step * 6);
    rig.litAge += step;
    cooldown.current = Math.max(0, cooldown.current - step);

    const colliders = slimeColliders();
    const target = on || rig.charge > 0.02 ? pick(colliders, A, inFlight.current) : null;

    /* --- commit a grab ---------------------------------------------------- */
    if (on && target && rig.charge >= 1 && cooldown.current <= 0 && !tankFull()) {
      const id = recordCapture(target);
      flyers.current.push({
        key: nextKey++,
        kind: 'in',
        id,
        family: target.family,
        herdId: target.id,
        r: target.r,
        top: target.top,
        sx: target.x,
        sy: groundY,
        sz: target.z,
        lx: 0,
        lz: 0,
        a: 0,
        dur: drawFlight(Math.hypot(target.x - mz.x, target.z - mz.z), motion),
        phase: 'fly',
        bt: 0,
        spin: Math.random() * Math.PI * 2,
        wob: 14 + Math.random() * 8,
        obj: null,
        shell: null,
      });
      inFlight.current.add(target.id);
      // Out of the world THIS frame, into this component's hands the same frame. There is no moment where the
      // slime is nowhere: the proxy is mounted on the very next render with the collider's own size and place.
      captureRef.current(id);
      rig.charge = DRAW.rewind;
      cooldown.current = DRAW.gap * Math.max(0.4, motion);
      reflow();
    }

    /* --- a plop ----------------------------------------------------------- */
    while (plopWanted.current > 0) {
      plopWanted.current -= 1;
      if (!enabled) break;
      const out = tankShift();
      if (!out) {
        // Nothing in the tank. A puff of air and no complaint: there is no wrong button in this game.
        rig.punch = Math.max(rig.punch, 0.35);
        break;
      }
      const t = capturedTrace(out.id);
      const r = t?.r ?? FALLBACK_R;
      const top = t?.top ?? FALLBACK_TOP;
      // Where it is going, decided NOW and proved legal now, so the arc cannot end anywhere illegal.
      const want = plopTarget(A, wantSpot);
      const p = spot.current;
      p.x = want.x;
      p.z = want.z;
      settleLanding(p, r, ground);
      const v = tmp2.current.set(p.x, groundY, p.z);
      pushOutOfSlimes(v, r);
      p.x = v.x;
      p.z = v.z;
      settleLanding(p, r, ground);
      flyers.current.push({
        key: nextKey++,
        kind: 'out',
        id: out.id,
        family: out.family,
        herdId: -1,
        r,
        top,
        sx: mz.x,
        sy: mz.y - top * 0.5,
        sz: mz.z,
        lx: p.x,
        lz: p.z,
        a: 0,
        dur: PLOP.flight * Math.max(0.4, motion),
        phase: 'fly',
        bt: 0,
        spin: Math.random() * Math.PI * 2,
        wob: 9 + Math.random() * 5,
        obj: null,
        shell: null,
      });
      rig.punch = 1;
      reflow();
    }

    /* --- move everything in the air --------------------------------------- */
    let changed = false;
    for (let i = flyers.current.length - 1; i >= 0; i -= 1) {
      const f = flyers.current[i];
      if (!f) continue;
      const g = f.obj;
      const sh = f.shell;

      if (f.kind === 'in') {
        f.a = Math.min(1, f.a + step / f.dur);
        const e = drawEase(f.a);
        // Held near full size for the first half of the flight — long enough to see WHAT is being taken — then
        // squeezed down to nozzle size. See `intakeScale`.
        const into = 1 - (1 - intakeScale(f.top)) * ramp(f.a, 0.42, 1);
        const height = f.top * into;
        if (g) {
          // The start point converted into camera space each frame; the END point is the constant nozzle mouth,
          // less half the slime's CURRENT height so its middle — not its feet — arrives at the bell.
          const s = tmp.current.set(f.sx, f.sy, f.sz).sub(camera.position).applyQuaternion(
            // Inverse of the camera rotation. `invert()` on a copy, never on the camera's own quaternion.
            tmpQuat.copy(camera.quaternion).invert(),
          );
          g.position.set(
            s.x + (MUZZLE_LOCAL.x - s.x) * e,
            s.y + (MUZZLE_LOCAL.y - height * 0.5 - s.y) * e,
            s.z + (MUZZLE_LOCAL.z - s.z) * e,
          );
          // Tumbling, and faster the closer it gets: it is not steering, it is being taken.
          g.rotation.y = f.spin + e * 7;
          g.rotation.x = Math.sin(rig.t * f.wob) * 0.22 * e * motion;
          g.rotation.z = Math.cos(rig.t * f.wob * 0.8) * 0.18 * e * motion;
        }
        if (sh) {
          // Wobble like a caught jelly, volume preserved, on top of the squeeze.
          const wob = 1 + Math.sin(rig.t * f.wob) * 0.16 * (0.3 + e) * motion;
          const k = f.r * into;
          sh.scale.set(k / Math.sqrt(wob), k * wob, k / Math.sqrt(wob));
        }
        if (f.a >= 1) {
          const stored: Held = { id: f.id, family: f.family };
          if (tankPush(stored)) {
            rig.settle = 1;
            // The slot it actually landed in, read from the store rather than from React's snapshot of it —
            // `held` is a render-time value and is one render behind at exactly the moment this fires.
            rig.litSlot = tankCount() - 1;
            rig.litAge = 0;
          } else {
            // Cannot happen in play — capacity is checked before a grab — but if it ever did, the slime is put
            // back on the ground rather than dropped on the floor of a Map somewhere.
            placeInWorld(f.family, f.r, { x: camera.position.x + dir.x * 2.4, z: camera.position.z + dir.z * 2.4 });
          }
          inFlight.current.delete(f.herdId);
          flyers.current.splice(i, 1);
          changed = true;
        }
        continue;
      }

      /* --- lobbed out ------------------------------------------------------ */
      if (f.phase === 'fly') {
        f.a = Math.min(1, f.a + step / f.dur);
        if (g) {
          const from = tmp.current.set(f.sx, f.sy, f.sz);
          const to = tmp2.current.set(f.lx, groundY, f.lz);
          arc(from, to, PLOP.rise * motion, f.a, tmp3);
          g.position.copy(tmp3);
          g.rotation.y = f.spin + f.a * 2.4;
          // Tips forward over the top of the arc, so it looks thrown rather than carried along a rail.
          g.rotation.x = Math.sin(f.a * Math.PI) * 0.3 * motion;
          g.rotation.z = Math.cos(f.a * 5) * 0.12 * motion;
        }
        if (sh) {
          // Stretched along the climb, rounder at the peak. Cheap anticipation for the squash to come.
          const st = 1 + (1 - f.a) * 0.14 * motion;
          sh.scale.set((f.r * 1) / Math.sqrt(st), f.r * st, (f.r * 1) / Math.sqrt(st));
        }
        if (f.a >= 1) {
          f.phase = 'land';
          f.bt = 0;
        }
        continue;
      }

      /* --- down, squashed, and handed back --------------------------------- */
      f.bt += step;
      const dur = PLOP.bounce * Math.max(0.4, motion);
      const a = Math.min(1, f.bt / dur);
      const sq = squash(a);
      if (g) {
        g.position.set(f.lx, groundY, f.lz);
        // Two small hops on the way to standing still. The rotation unwinds to upright as it settles.
        g.rotation.x *= 1 - Math.min(1, step * 9);
        g.rotation.z *= 1 - Math.min(1, step * 9);
      }
      if (sh) sh.scale.set(f.r / Math.sqrt(sq), f.r * sq, f.r / Math.sqrt(sq));
      if (a >= 1) {
        // Handed over at the END of the bounce, at exactly the spot the proxy finished on, so the real slime
        // appears already standing where the child watched it land.
        releaseRef.current(f.family, [f.lx, groundY, f.lz]);
        flyers.current.splice(i, 1);
        changed = true;
      }
    }
    if (changed) reflow();

    /* --- the airflow ------------------------------------------------------ */
    const flow = enabled ? Math.max(rig.charge * 0.85, rig.suck * 0.5) : 0;
    lean.update(scene, colliders, A, flow, target ? target.id : null, step, motion);

    const c = cone.current;
    if (c) {
      const m = c.material as THREE.MeshBasicMaterial;
      // A THIRD of the first pass. Additively blended over a cone nine metres long and four wide, 0.3 was not a
      // hint of moving air, it was a sunrise: the trees, the hills and the sky all lifted together and the ranch
      // looked overexposed every time a child held the button. The motes carry the airflow; the cone only has to
      // suggest where it is coming from.
      m.opacity = flow * 0.1;
      c.visible = m.opacity > 0.005;
    }
    const sw = swarm.current;
    if (sw) motes.update(sw, moteMaterial(), step, flow, CONE.halfAngle, CONE.range, motion);

    /* --- the ring on the ground under what is about to be taken ------------ */
    const mk = mark.current;
    if (mk) {
      const m = mk.material as THREE.MeshBasicMaterial;
      if (target && flow > 0.05) {
        mk.position.set(target.x, groundY + 0.03, target.z);
        const pulse = 1 + Math.sin(rig.t * 9) * 0.06 * motion;
        const s = target.r * 1.5 * pulse;
        mk.scale.set(s, s, s);
        m.opacity = Math.min(0.55, flow * 0.7);
        mk.visible = true;
      } else {
        m.opacity = 0;
        mk.visible = false;
      }
    }
  });

  return (
    <>
      {/* CAMERA SPACE. The pack, the draught, the motes, and anything being drawn in. */}
      <group ref={camRig}>
        <Pack rig={rig} held={held} />

        {/* The cone of influence, as light rather than as a solid. Drawn SHORTER than the cone actually reaches:
            the visible draught is a hint at the nozzle, and stretching it the full nine metres put a lit wedge
            across half the ranch — which reads as fog, not as suction. */}
        <mesh
          ref={cone}
          geometry={draught(CONE.range * 0.55, CONE.halfAngle * 0.9)}
          material={airMaterial()}
          position={[MUZZLE_LOCAL.x, MUZZLE_LOCAL.y, MUZZLE_LOCAL.z]}
          visible={false}
        />

        {/* Forty specks of moving air, one draw call. */}
        <instancedMesh ref={swarm} args={[speck(), moteMaterial(), MOTE_COUNT]} visible={false} />

        {flyers.current.filter((f) => f.kind === 'in').map((f) => (
          <Proxy key={f.key} f={f} />
        ))}
      </group>

      {/* WORLD SPACE. Anything lobbed, and the target ring. */}
      <group ref={worldRig}>
        <mesh ref={mark} geometry={ring(1, 0.12)} material={markMaterial()} rotation={[-Math.PI / 2, 0, 0]} visible={false} />
        {flyers.current.filter((f) => f.kind === 'out').map((f) => (
          <Proxy key={f.key} f={f} />
        ))}
      </group>
    </>
  );
}

export { useVacpackTank } from './tank';
export type { Held } from './tank';
