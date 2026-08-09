import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type JSX } from 'react';
import { createRoot } from 'react-dom/client';

import { Buildings, SOLIDS } from './Buildings';
import { doorSweepOk, doorTarget, doorwayWalkReport } from './barn';
import { Lighting } from './Lighting';
import { roofInvariantReport } from './roofs';
import { windowReport } from './windows';

/**
 * TEMPORARY. A harness for looking at `Buildings` and `Lighting` without the rest of the game — no
 * pointer lock, no session layer, no API. Served by the sanctuary vite config at
 * `/game/world/preview.html`, because that config's root is `apps/sanctuary` and any `.html` under it is
 * an entry point, so this needs no config change and touches no file outside this directory.
 *
 * Delete once the components are wired into `Game.tsx`.
 *
 * Query parameters, so a screenshot script can drive it without a UI:
 *   ?cam=x,y,z&look=x,y,z   camera eye and target, world metres
 *   &orbit=1                slow orbit instead of a fixed shot
 *   &probes=1               draw the collider circles and a 1.5m eye-height pole for scale
 *
 * `window.__ranch` carries the numbers worth measuring: rolling fps, draw calls, triangles, the collider
 * count, and the roof invariant sweep from `roofs.ts`.
 */

interface RanchStats {
  ready: boolean;
  fps: number;
  frames: number;
  drawCalls: number;
  triangles: number;
  programs: number;
  solids: number;
  roofMinY: number[];
  roofOk: boolean;
  /**
   * THE THREE THINGS A SCREENSHOT CANNOT SEE, which is the whole reason they are here.
   *
   * `walkIn` is the doorway promise: a keeper of radius 0.45 stepped down the centreline from the yard to
   * the middle of the floor, against the WHOLE collider set, reporting the worst push-out and the clear
   * width it measured. A photograph of an open doorway looks identical whether or not a child can walk
   * through it.
   *
   * `doorSweep` is the no-clip promise, swept at 1°.
   *
   * `door` is the live leaf angle, so a shot claiming to show the doors open can be checked against the
   * number rather than against somebody's eyes.
   */
  walkIn: { ok: boolean; clearWidth: number; worstPush: number; steps: number };
  doorSweep: boolean;
  doorway: boolean;
  door: { angle: number; open: boolean; distance: number; inside: boolean };
  windows: ReturnType<typeof windowReport>;
}

declare global {
  interface Window {
    __ranch?: RanchStats;
  }
}

const params = new URLSearchParams(window.location.search);

function triple(name: string, fallback: [number, number, number]): [number, number, number] {
  const raw = params.get(name);
  if (!raw) return fallback;
  const parts = raw.split(',').map((n) => Number.parseFloat(n));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return fallback;
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

const EYE = triple('cam', [0, 1.5, 8]);
const LOOK = triple('look', [0, 2.2, -13]);
const ORBIT = params.get('orbit') === '1';
const PROBES = params.get('probes') === '1';

const roofs = roofInvariantReport();
const walk = doorwayWalkReport(SOLIDS, 0.45);
window.__ranch = {
  ready: false,
  fps: 0,
  frames: 0,
  drawCalls: 0,
  triangles: 0,
  programs: 0,
  solids: SOLIDS.length,
  roofMinY: roofs.map((r) => r.minY),
  roofOk: roofs.every((r) => Math.abs(r.minY) < 1e-6),
  walkIn: {
    ok: walk.ok,
    clearWidth: walk.clearWidth,
    worstPush: walk.worst?.pushed ?? 0,
    steps: walk.steps,
  },
  doorSweep: doorSweepOk(),
  doorway: walk.ok && doorSweepOk(),
  door: { angle: 0, open: false, distance: 0, inside: false },
  windows: windowReport(),
};

/** Rolling fps over the last second, plus the renderer's own counters. */
function Stats(): null {
  const gl = useThree((s) => s.gl);
  const acc = useRef({ t: 0, n: 0, total: 0 });

  useFrame((_, dt) => {
    const a = acc.current;
    a.t += dt;
    a.n += 1;
    a.total += 1;
    const s = window.__ranch;
    if (!s) return;
    s.frames = a.total;
    // Ignore the first half second: shader compilation and the first shadow pass are not steady state.
    if (a.total > 40) s.ready = true;
    if (a.t >= 1) {
      s.fps = a.n / a.t;
      s.drawCalls = gl.info.render.calls;
      s.triangles = gl.info.render.triangles;
      s.programs = gl.info.programs?.length ?? 0;
      a.t = 0;
      a.n = 0;
    }
  });
  return null;
}

/**
 * Reports what the doors are doing, read from the same camera the doors themselves read.
 *
 * Needed because a shot captioned "the doors are open" is not evidence. At a distance where they should be
 * shut and one where they should be open the two frames differ by an angle, and the angle is the thing
 * under test — so it goes on `window.__ranch` where the screenshot script prints it beside the file name.
 *
 * Recomputing `doorTarget` here rather than reaching into the door component keeps the preview a read-only
 * observer. The cost of that choice is honest: this reports the COMMITTED target for the current distance,
 * not the eased angle mid-swing.
 */
function DoorProbe(): null {
  const camera = useThree((s) => s.camera);
  useFrame(() => {
    const s = window.__ranch;
    if (!s) return;
    const target = doorTarget(camera.position.x, camera.position.z, s.door.open);
    s.door = { angle: target.angle, open: target.open, distance: target.distance, inside: target.inside };
  });
  return null;
}

function Camera(): null {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    camera.position.set(EYE[0], EYE[1], EYE[2]);
    camera.lookAt(LOOK[0], LOOK[1], LOOK[2]);
  }, [camera]);
  useFrame(({ clock }) => {
    if (!ORBIT) return;
    const r = Math.hypot(EYE[0], EYE[2]) || 24;
    const a = clock.elapsedTime * 0.08;
    camera.position.set(Math.sin(a) * r, EYE[1], Math.cos(a) * r);
    camera.lookAt(LOOK[0], LOOK[1], LOOK[2]);
  });
  return null;
}

/** Stand-in for the pod wall, so the clear apron in front of it can be checked. */
function PodWallStandIn(): JSX.Element {
  return (
    <group position={[0, 3.6, -13]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[6.6, 6.6, 0.5]} />
        <meshStandardMaterial color="#8e7a61" roughness={0.85} />
      </mesh>
    </group>
  );
}

function Probes(): JSX.Element {
  const rings = useMemo(() => SOLIDS, []);
  return (
    <group>
      {rings.map((s, i) => (
        <mesh key={i} position={[s.position[0], 0.06, s.position[1]]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[s.radius - 0.05, s.radius, 16]} />
          <meshBasicMaterial color="#ff2d6f" toneMapped={false} />
        </mesh>
      ))}
      {/* A 1.5m pole at the spawn: the child's eye height, for judging every other dimension. */}
      <mesh position={[0, 0.75, 8]}>
        <boxGeometry args={[0.1, 1.5, 0.1]} />
        <meshBasicMaterial color="#00e5ff" toneMapped={false} />
      </mesh>
    </group>
  );
}

function Scene(): JSX.Element {
  return (
    <>
      <Lighting />
      <Buildings />
      <PodWallStandIn />
      {PROBES ? <Probes /> : null}
      <Camera />
      <DoorProbe />
      <Stats />
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <Canvas
    // Matches `Game.tsx` exactly, so what is seen here is what the game will show.
    shadows
    camera={{ fov: 62, near: 0.1, far: 220 }}
    dpr={[1, 1.75]}
    gl={{ antialias: true }}
  >
    <Scene />
  </Canvas>,
);
