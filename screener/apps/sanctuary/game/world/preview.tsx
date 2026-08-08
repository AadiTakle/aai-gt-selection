import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type JSX } from 'react';
import { createRoot } from 'react-dom/client';

import { Buildings, SOLIDS } from './Buildings';
import { Lighting } from './Lighting';
import { roofInvariantReport } from './roofs';

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
