import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

import { toRef } from '../shared/ItemStage';
import { VERBS, typesFor, verbFor, type Battery } from '../shared/batteries';
import { useSortie } from '../shared/useSortie';
import { FAMILIES, type Family } from './contract';
import { PodWall } from './screener/PodWall';

/**
 * A deliberately self-contained playable slice.
 *
 * WHY THIS EXISTS RATHER THAN AN INTEGRATION OF THE THREE TRACKS. The three build tracks produced a
 * large, good module set (slime geometry and looks, ranch terrain and palette, item theming) but a
 * sustained API outage killed every agent run before any of them emitted a mountable component. This
 * file depends on NONE of that work on purpose: it imports only the proven session layer, so it
 * renders and is playable even while the rest is unfinished. When the tracks land their components,
 * this becomes the integration point and the primitives here are replaced one at a time.
 *
 * What it is: a walkable ranch, slimes with the doe-eyed look the brief calls for, and the real
 * adaptive screener presented as an in-world thing rather than a quiz.
 *
 * Physics is hand-rolled rather than Rapier. One integrator over a heightless plane is a few lines
 * and cannot fail to initialise, and an unverifiable physics dependency was the wrong risk to take on
 * a night with no ability to run the page.
 */

const KEEPER_HEIGHT = 1.5;
const WALK = 4.2;
const GRAVITY = -18;
const JUMP = 6.4;
const BOUND = 34;

/** Warm, saturated but not neon. One hue per family so a child sorts by colour after silhouette. */
const FAMILY_HUE: Record<Family, string> = {
  bellow: '#e5834f',
  rill: '#5ec8d8',
  cobble: '#b3907a',
  ember: '#ef6d5a',
  fern: '#7cc06a',
  kite: '#c79ae0',
};

/**
 * One slime.
 *
 * The eyes are the whole charm and get the most attention: large, glossy, forward-facing, with a
 * white catchlight and a soft dark iris. Eye-to-body ratio is what makes a small one read as a baby,
 * so it is driven by `scale` rather than fixed.
 */
function Slime({
  family,
  position,
  scale = 1,
}: {
  family: Family;
  position: [number, number, number];
  scale?: number;
}) {
  const body = useRef<THREE.Group>(null);
  const hue = FAMILY_HUE[family];
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);
  const reduced = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  // Idle squash and stretch. Volume is roughly preserved, which is what makes it read as jelly
  // rather than as a pulsing ball.
  useFrame(({ clock }) => {
    if (!body.current || reduced) return;
    const t = clock.elapsedTime * 1.7 + phase;
    const squash = 1 + Math.sin(t) * 0.055;
    body.current.scale.set(scale / Math.sqrt(squash), scale * squash, scale / Math.sqrt(squash));
    body.current.position.y = position[1] + Math.abs(Math.sin(t * 0.5)) * 0.04 * scale;
  });

  // Silhouette per family, from primitives. Rounded everywhere: nothing here has a hard edge.
  const shape = useMemo(() => {
    switch (family) {
      case 'bellow':
        return { rx: 1.25, ry: 0.72, rz: 1.15 };
      case 'rill':
        return { rx: 0.92, ry: 1.06, rz: 0.92 };
      case 'cobble':
        return { rx: 1.05, ry: 0.95, rz: 1.05 };
      case 'ember':
        return { rx: 0.88, ry: 1.18, rz: 0.88 };
      case 'fern':
        return { rx: 1.0, ry: 1.0, rz: 1.0 };
      case 'kite':
        return { rx: 0.8, ry: 1.3, rz: 0.8 };
    }
  }, [family]);

  const eye = 0.3;

  return (
    <group position={position}>
      <group ref={body} scale={scale}>
        {/* Body. Physical material with transmission gives the jelly read without custom GLSL. */}
        <mesh castShadow position={[0, shape.ry, 0]} scale={[shape.rx, shape.ry, shape.rz]}>
          <sphereGeometry args={[1, 48, 32]} />
          <meshPhysicalMaterial
            color={hue}
            roughness={0.22}
            clearcoat={1}
            clearcoatRoughness={0.15}
            transmission={0.35}
            thickness={1.6}
            ior={1.35}
            sheen={0.6}
            sheenColor={'#ffffff'}
          />
        </mesh>

        {/* Eyes. Large, glossy, with a catchlight. */}
        {[-0.34, 0.34].map((x) => (
          <group key={x} position={[x * shape.rx, shape.ry * 1.08, shape.rz * 0.82]}>
            <mesh>
              <sphereGeometry args={[eye, 28, 20]} />
              <meshStandardMaterial color="#ffffff" roughness={0.08} />
            </mesh>
            <mesh position={[0, 0, eye * 0.66]}>
              <sphereGeometry args={[eye * 0.58, 24, 18]} />
              <meshStandardMaterial color="#241c22" roughness={0.05} />
            </mesh>
            <mesh position={[eye * 0.22, eye * 0.3, eye * 0.9]}>
              <sphereGeometry args={[eye * 0.19, 16, 12]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>
        ))}

        {/* A crest for the families whose silhouette needs one. */}
        {(family === 'fern' || family === 'kite') && (
          <mesh position={[0, shape.ry * 2.05, 0]} rotation={[0.2, 0, 0]}>
            <coneGeometry args={[0.3, 0.55, 16]} />
            <meshStandardMaterial color={family === 'fern' ? '#4e9c48' : '#a87fd0'} roughness={0.5} />
          </mesh>
        )}
      </group>
    </group>
  );
}

/** Ground, corrals and a few soft props. Everything rounded. */
function Ranch() {
  const corrals = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2;
        return [Math.cos(a) * 15, 0, Math.sin(a) * 15] as [number, number, number];
      }),
    [],
  );

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[BOUND + 6, 64]} />
        <meshStandardMaterial color="#8fc46b" roughness={0.95} />
      </mesh>

      {corrals.map((p, i) => (
        <group key={i} position={p}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
            <circleGeometry args={[4.2, 40]} />
            <meshStandardMaterial color="#d8c9a5" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.35, 0]}>
            <torusGeometry args={[4.2, 0.22, 12, 48]} />
            <meshStandardMaterial color="#a2795a" roughness={0.7} />
          </mesh>
        </group>
      ))}

      {/* Keeper's hut, rounded. */}
      <group position={[0, 0, -6]}>
        <mesh position={[0, 1.4, 0]} castShadow>
          <capsuleGeometry args={[2.1, 1.4, 8, 24]} />
          <meshStandardMaterial color="#f0e0c8" roughness={0.85} />
        </mesh>
        <mesh position={[0, 3.3, 0]} castShadow>
          <coneGeometry args={[2.9, 1.7, 26]} />
          <meshStandardMaterial color="#c4694f" roughness={0.75} />
        </mesh>
      </group>

      {/* A soft boundary of fern clumps so the edge reads as a place rather than a wall. */}
      {Array.from({ length: 40 }, (_, i) => {
        const a = (i / 40) * Math.PI * 2;
        const r = BOUND + 2.5;
        return (
          <mesh key={i} position={[Math.cos(a) * r, 0.8, Math.sin(a) * r]} castShadow>
            <sphereGeometry args={[1.5, 16, 12]} />
            <meshStandardMaterial color="#5d9c4f" roughness={0.9} />
          </mesh>
        );
      })}
    </group>
  );
}

/** First person: WASD, mouse look on pointer lock, space to jump. Tuned gentle for a child. */
function Keeper({ locked, viewing = false }: { locked: boolean; viewing?: boolean }) {
  const { camera, gl } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const vy = useRef(0);
  const yaw = useRef(0);
  const pitch = useRef(0);

  useEffect(() => {
    camera.position.set(0, KEEPER_HEIGHT, 8);
    const down = (e: KeyboardEvent) => (keys.current[e.code] = true);
    const up = (e: KeyboardEvent) => (keys.current[e.code] = false);
    const move = (e: MouseEvent) => {
      if (document.pointerLockElement !== gl.domElement) return;
      // Slower than an adult shooter on purpose.
      yaw.current -= e.movementX * 0.0016;
      pitch.current = THREE.MathUtils.clamp(pitch.current - e.movementY * 0.0014, -1.1, 1.1);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('mousemove', move);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('mousemove', move);
    };
  }, [camera, gl]);

  useFrame((_, dt) => {
    const step = Math.min(dt, 0.05);

    // While an item is up, glide to a fixed vantage that frames it. A child should never have to
    // aim the camera to find the thing they are being asked about.
    if (viewing) {
      const target = new THREE.Vector3(0, 3.0, -4.6);
      camera.position.lerp(target, Math.min(1, step * 3.2));
      yaw.current += (0 - yaw.current) * Math.min(1, step * 3.2);
      pitch.current += (-0.06 - pitch.current) * Math.min(1, step * 3.2);
      camera.rotation.set(pitch.current, yaw.current, 0, 'YXZ');
      return;
    }

    camera.rotation.set(pitch.current, yaw.current, 0, 'YXZ');
    if (!locked) return;

    const f = (keys.current.KeyW ? 1 : 0) - (keys.current.KeyS ? 1 : 0);
    const s = (keys.current.KeyD ? 1 : 0) - (keys.current.KeyA ? 1 : 0);
    const dir = new THREE.Vector3(s, 0, -f);
    if (dir.lengthSq() > 0) dir.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw.current);
    camera.position.addScaledVector(dir, WALK * step);

    const onGround = camera.position.y <= KEEPER_HEIGHT + 1e-3;
    if (onGround && keys.current.Space) vy.current = JUMP;
    vy.current += GRAVITY * step;
    camera.position.y += vy.current * step;
    if (camera.position.y < KEEPER_HEIGHT) {
      camera.position.y = KEEPER_HEIGHT;
      vy.current = 0;
    }

    // Soft bound rather than a wall.
    const r = Math.hypot(camera.position.x, camera.position.z);
    if (r > BOUND) {
      camera.position.x *= BOUND / r;
      camera.position.z *= BOUND / r;
    }
  });

  return null;
}

/**
 * The screener, in world.
 *
 * Presented as a thing the hollow needs rather than a question: the copy never says test, quiz,
 * score, correct or wrong, and nothing here can react to correctness because `useSortie` deletes it
 * before returning. Options are drawn as large tiles a child can hit without precision.
 */
export interface LiveItem {
  serve: NonNullable<ReturnType<typeof useSortie>['serve']>;
  asking: boolean;
  answer: ReturnType<typeof useSortie>['answer'];
}

function Beat({
  verbId,
  onDone,
  report,
}: {
  verbId: string;
  onDone: () => void;
  report: (live: LiveItem | null) => void;
}) {
  const verb = useMemo(() => VERBS.find((v) => v.id === verbId), [verbId]);
  const battery: Battery = verb?.battery ?? 'Nonverbal';
  // One type per verb. Coverage of a battery comes from doing its several verbs across visits, not
  // from mixing types inside one sitting.
  const types = useMemo(() => (verb ? [verb.typeCode] : typesFor(battery)), [verb, battery]);
  const s = useSortie({ battery, types, threshold: -1.5, precisionIndex: 0, settleMs: 900 });

  useEffect(() => {
    void s.open();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (s.phase === 'closed') onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.phase]);

  useEffect(() => {
    report(s.serve ? { serve: s.serve, asking: s.phase === 'asking', answer: s.answer } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.serve, s.phase]);

  if (s.phase === 'error') {
    return <p className="bh-beat-note">The hollow is quiet just now. {s.error}</p>;
  }
  if (!s.serve) return <p className="bh-beat-note">Looking…</p>;

  const content = s.serve.served.content;
  const options = Array.isArray(content.options) ? (content.options as Record<string, unknown>[]) : [];
  // Drawn in the world by the 3D layer. Only types without an in-world presentation fall back to the
  // flat tile row, and that fallback is a gap to close rather than a design.
  const inWorld = s.serve.typeCode === 'FLU-MATRIX-01';

  return (
    <div className={inWorld ? 'bh-beat bh-beat-slim' : 'bh-beat'}>
      <p className="bh-beat-title">{verb?.title ?? verbFor(s.serve.typeCode)?.title ?? 'Something to do'}</p>
      {inWorld ? null : (
        <div className="bh-beat-options">
          {options.map((o, i) => {
            const handed = typeof o.key === 'string' ? o.key : String(i);
            return (
              <button
                key={i}
                type="button"
                className="bh-opt"
                disabled={s.phase !== 'asking'}
                onClick={() => void s.answer(toRef(content, handed))}
                aria-label={`Choice ${i + 1}`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      )}
      <p className="bh-beat-note">
        {s.answered} of about 4 · {battery}
      </p>
    </div>
  );
}

export function Game() {
  const [locked, setLocked] = useState(false);
  const [beat, setBeat] = useState<string | null>(null);
  const [live, setLive] = useState<LiveItem | null>(null);
  const [cares, setCares] = useState(0);

  const slimes = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => {
        const a = (i / 18) * Math.PI * 2 + 0.3;
        const r = 6 + (i % 4) * 3.4;
        return {
          family: FAMILIES[i % FAMILIES.length]!,
          position: [Math.cos(a) * r, 0, Math.sin(a) * r] as [number, number, number],
          scale: 0.55 + (i % 3) * 0.28,
        };
      }).filter((sl) => {
        // The apron in front of the pod wall stays empty.
        const dx = sl.position[0] - 0;
        const dz = sl.position[2] - -13;
        return Math.hypot(dx, dz) > 7;
      }),
    [],
  );

  const lock = useCallback(() => {
    const el = document.querySelector('canvas');
    el?.requestPointerLock?.();
  }, []);

  useEffect(() => {
    const onChange = () => setLocked(!!document.pointerLockElement);
    document.addEventListener('pointerlockchange', onChange);
    return () => document.removeEventListener('pointerlockchange', onChange);
  }, []);

  return (
    <div className="bh-root">
      <Canvas shadows camera={{ fov: 62, near: 0.1, far: 220 }} dpr={[1, 1.75]}>
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
        <Suspense fallback={null}>
          <Ranch />
          {slimes.map((sl, i) => (
            <Slime key={i} {...sl} />
          ))}
        </Suspense>
        {live && live.serve.typeCode === 'FLU-MATRIX-01' ? (
          <group position={[0, 3.6, -13]}>
            <pointLight position={[0, 1.5, 5]} intensity={22} distance={16} color="#fff4de" />
            <PodWall
              // Keyed on the item so the wall remounts per question. Without this its internal
              // `picked` state survives into the next item and every further click is swallowed,
              // which made the game unplayable after the first round.
              key={live.serve.served.itemId}
              content={live.serve.served.content}
              disabled={!live.asking}
              onPick={(key) => void live.answer(toRef(live.serve.served.content, key))}
            />
          </group>
        ) : null}
        <Keeper locked={locked && !beat} viewing={!!live} />
      </Canvas>

      {!locked && !beat && (
        <button type="button" className="bh-enter" onClick={lock}>
          Click to look around · WASD to walk · Space to hop
        </button>
      )}

      {beat && (
        <div className="bh-overlay">
          <Beat
            verbId={beat}
            report={setLive}
            onDone={() => {
              setBeat(null);
              setLive(null);
              setCares((n) => n + 1);
            }}
          />
        </div>
      )}

      {!beat && (
        <div className="bh-hud">
          <p className="bh-cares">{cares} looked after</p>
          <div className="bh-calls">
            {['coat', 'tide-line', 'log'].map((id) => (
              <button key={id} type="button" className="bh-call" onClick={() => setBeat(id)}>
                {VERBS.find((v) => v.id === id)?.title ?? id}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
