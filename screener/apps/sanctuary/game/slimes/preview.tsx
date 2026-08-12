/**
 * TEMPORARY preview harness for the slime track. Delete with `preview.html` once Slime.tsx is wired.
 *
 * It exists to answer four questions that cannot be answered by reading the code: do the six read as
 * six from the silhouette alone, does a pip read as a baby, do they actually wander/turn/avoid and stay
 * inside the ring, and what does forty of them cost. The last one writes a number into `#fps` so a
 * screenshot is a measurement rather than an impression.
 */
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { StrictMode, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import * as THREE from 'three';

import { FAMILIES, STAGES, type Family, type Stage } from '../contract';
import { FAMILY_FEATURE, Slime, SLIME_RADIUS, slimeColliders } from './Slime';

/**
 * `far` and `grow` were added for the re-theme, and `far` is the one that matters.
 *
 * The whole claim of the object families is that each is identifiable IN SILHOUETTE from across the
 * ranch, and that claim cannot be checked in a close-up — every one of them is obvious at arm's length.
 * `far` puts the camera far enough back that a crested slime is about forty screen pixels tall, which is
 * roughly what a child sees looking across the pen, and it is the view that killed two earlier versions
 * of the frost crown.
 */
type Mode = 'lineup' | 'far' | 'stages' | 'grow' | 'pen' | 'stress';
const q = new URLSearchParams(location.search);
const mode = ((q.get('mode') as Mode) ?? 'lineup') || 'lineup';
/** Extra renders per frame. Wall-clock fps is vsync-capped, so cost has to be measured by saturation. */
const BURN = Math.max(0, Number(q.get('burn') ?? 0) | 0);
/** Child's-eye camera rather than the diagram view. */
const LOW = q.get('eye') === 'low';
/**
 * `?face=RADIANS` — which way the posed slimes in `lineup` and `grow` are turned.
 *
 * Those two modes exist to judge a crest rather than a heading, so they pin `facing` instead of letting the
 * wander pick one. Pinning it at zero, though, only ever answers the FRONT question, and several crests are
 * mirrored pairs whose whole failure mode — two parts leaning the same way, or across each other — is
 * invisible head-on and obvious from the side. So the pin is a dial: 0 front, ~1.57 side, ~3.14 back.
 */
const FACE = Number(q.get('face') ?? 0) || 0;

/**
 * Frame cost, written straight to the DOM so a screenshot carries the measurement.
 *
 * `?burn=N` is how the real number is obtained. Wall-clock frame time on this machine pegs at the
 * 8.33 ms vsync interval whatever is on screen, which measures the display and not the scene. Taking
 * over the render (priority 1 stops r3f's own render) and submitting the frame N+1 times saturates the
 * pipe, so the per-frame cost is the measured block divided by N+1. Draw calls and triangles are
 * reported alongside because those are hardware-independent and are what a reviewer can check.
 */
function Meter() {
  const acc = useRef({ n: 0, t: 0, worst: 0, since: performance.now(), render: 0 });
  useFrame(({ gl, scene, camera }, dt) => {
    const a = acc.current;
    const t0 = performance.now();
    for (let i = 0; i <= BURN; i += 1) gl.render(scene, camera);
    a.render += performance.now() - t0;

    a.n += 1;
    a.t += dt;
    if (dt > a.worst) a.worst = dt;
    const now = performance.now();
    if (now - a.since > 1000) {
      const el = document.getElementById('fps');
      if (el) {
        const info = gl.info.render;
        const each = a.render / a.n / (BURN + 1);
        el.textContent =
          `${(1 / (a.t / a.n)).toFixed(0)} fps · frame ${((a.t / a.n) * 1000).toFixed(2)} ms · ` +
          `render ${each.toFixed(2)} ms${BURN ? ` (of ${BURN + 1}x)` : ''} · ` +
          `${info.calls} draws · ${(info.triangles / 1000).toFixed(0)}k tris · ` +
          `${slimeColliders().length} slimes`;
      }
      a.n = 0;
      a.t = 0;
      a.render = 0;
      a.worst = 0;
      a.since = now;
    }
  }, 1);
  return null;
}

/** Slow orbit, so a pair of screenshots seconds apart shows the creatures moving and not the camera. */
function Rig({ at, look }: { at: [number, number, number]; look: [number, number, number] }) {
  const { camera } = useThree();
  useMemo(() => {
    camera.position.set(...at);
    camera.lookAt(new THREE.Vector3(...look));
  }, [camera, at, look]);
  return null;
}

function Ground({ r }: { r: number }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[r + 8, 64]} />
        <meshStandardMaterial color="#8fc46b" roughness={0.95} />
      </mesh>
      {/* The ring they may not leave, drawn so an escape is obvious in a screenshot. */}
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[r - 0.12, r + 0.12, 96]} />
        <meshBasicMaterial color="#f3e0a8" />
      </mesh>
    </group>
  );
}

function Post({ x, z, r }: { x: number; z: number; r: number }) {
  return (
    <mesh position={[x, 0.7, z]} castShadow>
      <cylinderGeometry args={[r, r * 1.1, 1.4, 20]} />
      <meshStandardMaterial color="#a2795a" roughness={0.8} />
    </mesh>
  );
}

const BOUNDS_BIG = { center: [0, 0] as [number, number], radius: 16 };

function Scene() {
  if (mode === 'lineup') {
    /**
     * All NINETEEN families, one stage, in three rows.
     *
     * Three rows rather than one because nineteen in a line at a readable size is off both edges of any
     * window. The rows step BACK as well as up the screen and the camera is lifted, so no slime is hidden
     * behind the one in front and every silhouette is against sky or grass rather than against another
     * slime — which is the only way this view answers the question it exists to answer.
     */
    const bounds = { center: [0, 0] as [number, number], radius: 30 };
    const rows = [FAMILIES.slice(0, 7), FAMILIES.slice(7, 13), FAMILIES.slice(13, 19)];
    return (
      <>
        {/* Lifted and pulled back from the first attempt, where the three rows overlapped in screen space
            and half the roster was hidden behind the other half. Rows are further apart in z AND each is
            offset sideways by half a spacing, so every silhouette has clear sky or grass behind it. */}
        <Rig at={[0, 5.6, 13.5]} look={[0, 0.5, -3.4]} />
        <Ground r={30} />
        {rows.map((row, ri) =>
          row.map((f, i) => (
            <Slime
              key={f}
              family={f}
              stage="crested"
              position={[(i - (row.length - 1) / 2) * 2.4 + (ri % 2) * 1.2, 0, 2.2 - ri * 4.2]}
              seed={101 + FAMILIES.indexOf(f) * 7}
              bounds={bounds}
              // Posed to camera so this view judges silhouette and face, not heading. `pen` is where
              // heading variety and movement are checked.
              facing={FACE}
              wander={false}
            />
          )),
        )}
      </>
    );
  }

  if (mode === 'far') {
    /**
     * THE TEST VIEW, and the one the whole brief turns on: all nineteen at about 25 m, where a crested
     * slime is roughly forty screen pixels tall. If a family is not nameable HERE, its signature feature
     * is a texture and has to become geometry.
     *
     * Two ranks, the back one offset by half a spacing so nothing occludes anything, and the back one
     * TURNED AWAY — because most of what a child sees of a wandering slime is its back and three-quarter,
     * and that is exactly where a feature placed on the front disappears.
     */
    const bounds = { center: [0, 0] as [number, number], radius: 50 };
    const front = FAMILIES.slice(0, 10);
    const back = FAMILIES.slice(10, 19);
    return (
      <>
        <Rig at={[0, 3.4, 25]} look={[0, 0.9, -3.5]} />
        <Ground r={50} />
        {front.map((f, i) => (
          <Slime
            key={f}
            family={f}
            stage="crested"
            position={[(i - (front.length - 1) / 2) * 2.95, 0, 0]}
            seed={101 + i * 7}
            bounds={bounds}
            facing={0.5}
            wander={false}
          />
        ))}
        {back.map((f, i) => (
          <Slime
            key={`${f}-back`}
            family={f}
            stage="warden"
            position={[(i - (back.length - 1) / 2) * 2.95 + 1.48, 0, -7.5]}
            seed={7 + i * 13}
            bounds={bounds}
            facing={Math.PI + 0.6}
            wander={false}
          />
        ))}
      </>
    );
  }

  if (mode === 'grow') {
    /**
     * Any number of families through all four stages, close enough to judge whether the feature grows with
     * the creature rather than the creature growing into a costume.
     *
     * Generalised from exactly two to any count for the nineteen-family pass, because the brief asks for
     * four stages of three of the NEW families and hard-coding a pair made that impossible.
     */
    const bounds = { center: [0, 0] as [number, number], radius: 30 };
    const asked = ((q.get('fams') ?? 'waffle,fairy').split(',') as Family[]).filter((f) =>
      (FAMILIES as readonly string[]).includes(f),
    );
    const fams = asked.length > 0 ? asked : (['waffle', 'fairy'] as Family[]);
    // Pulled back as rows are added, so three families frame as well as two did.
    const depth = 2.7;
    const back = 4.4 + fams.length * 2.2;
    return (
      <>
        <Rig at={[0, 2.4 + fams.length * 0.5, back]} look={[0, 0.7, -0.4]} />
        <Ground r={30} />
        {fams.map((f, fi) =>
          STAGES.map((s, si) => (
            <Slime
              key={`${f}${s}`}
              family={f}
              stage={s}
              position={[(si - 1.5) * 1.95, 0, ((fams.length - 1) / 2 - fi) * depth]}
              seed={fi * 17 + si * 3 + 5}
              bounds={bounds}
              facing={FACE}
              wander={false}
            />
          )),
        )}
      </>
    );
  }

  if (mode === 'stages') {
    // Nineteen columns by four rows. Pulled well back and up from the six-family version, which framed
    // twenty-four slimes and would have cropped six of these off each edge.
    const bounds = { center: [0, 0] as [number, number], radius: 60 };
    return (
      <>
        <Rig at={[0, 13, 25]} look={[0, 0.1, -1.4]} />
        <Ground r={60} />
        {FAMILIES.map((f, fi) =>
          STAGES.map((s, si) => (
            <Slime
              key={`${f}${s}`}
              family={f}
              stage={s}
              position={[(fi - (FAMILIES.length - 1) / 2) * 2.35, 0, (si - 1.5) * 2.6]}
              seed={fi * 17 + si * 3 + 5}
              bounds={bounds}
              facing={0}
              wander={false}
            />
          )),
        )}
      </>
    );
  }

  return <Pen count={mode === 'stress' ? 40 : 12} />;
}

/** Wandering, bounded, with furniture. The mode that proves the movement claims. */
function Pen({ count }: { count: number }) {
  const posts = useMemo(
    () => [
      { x: 0, z: 0, r: 1.1 },
      { x: 6.5, z: -4, r: 0.8 },
      { x: -7, z: 3.5, r: 0.9 },
      { x: 2, z: 8, r: 0.7 },
    ],
    [],
  );
  const obstacles = useMemo(
    () => posts.map((p) => ({ position: [p.x, p.z] as [number, number], radius: p.r })),
    [posts],
  );
  const herd = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 * 3.7;
        const r = 3 + ((i * 5.1) % 11);
        return {
          family: FAMILIES[i % FAMILIES.length] as Family,
          stage: (count > 20 ? STAGES[i % 4] : STAGES[(i % 3) + 1]) as Stage,
          position: [Math.cos(a) * r, 0, Math.sin(a) * r] as [number, number, number],
          seed: i * 13 + 3,
        };
      }),
    [count],
  );

  return (
    <>
      {/* `?eye=low` is the view that actually ships: a keeper's eye height, 1.5 m off the grass. */}
      <Rig at={LOW ? [-6.5, 1.45, 12.5] : [0, 9, 22]} look={LOW ? [0, 0.8, 2] : [0, 0.5, 0]} />
      <Ground r={BOUNDS_BIG.radius} />
      {posts.map((p, i) => (
        <Post key={i} {...p} />
      ))}
      {herd.map((h, i) => (
        <Slime key={i} {...h} bounds={BOUNDS_BIG} obstacles={obstacles} />
      ))}
    </>
  );
}

const labels = document.getElementById('labels');
if (labels) {
  const named = FAMILIES.map((f) => `${f} (${FAMILY_FEATURE[f]})`).join(' · ');
  labels.textContent =
    mode === 'lineup'
      ? `${named}   —   player collision radius ${SLIME_RADIUS('crested').toFixed(2)}`
      : mode === 'far'
        ? `silhouette test at ~25 m · front rank crested, back rank warden facing away · ${FAMILIES.join(' · ')}`
        : mode === 'grow'
          ? `${q.get('fams') ?? 'waffle,fairy'} · pip → tuffet → crested → warden`
          : mode === 'stages'
            ? `columns: the ${FAMILIES.length} families · rows: pip · tuffet · crested · warden`
            : 'wandering inside the ring, avoiding the posts and each other';
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Canvas shadows="variance" camera={{ fov: 55, near: 0.1, far: 200 }} dpr={[1, 1.75]}>
      <color attach="background" args={['#bfe4f2']} />
      <fog attach="fog" args={['#cfe9f4', 40, 130]} />
      <hemisphereLight args={['#dff0ff', '#7fa860', 0.75]} />
      <directionalLight
        position={[18, 26, 12]}
        intensity={2.1}
        color="#fff2d8"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <Meter />
      <Scene />
    </Canvas>
  </StrictMode>,
);
