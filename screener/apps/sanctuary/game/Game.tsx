import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

import { toRef } from '../shared/ItemStage';
import { VERBS, typesFor, verbFor, type Battery } from '../shared/batteries';
import { useSortie } from '../shared/useSortie';
import { FAMILIES, type Family } from './contract';
import { PodWall } from './screener/PodWall';
import { TideLine } from './screener/TideLine';
import { DayLog } from './screener/DayLog';
import { Buildings, SOLIDS } from './world/Buildings';
import { Lighting } from './world/Lighting';
import { Slime, pushOutOfSlimes } from './slimes/Slime';

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
/** How wide the keeper is, for pushing out of solids. */
const KEEPER_RADIUS = 0.45;
/** Pen centres, from the buildings track. */
const PEN_RADIUS = 3.4;
const PENS: [number, number][] = [
  [-6, 15.5],
  [11.4, 4.2],
  [-15.5, -16.5],
];

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

    // Slimes are solid too: they slide rather than stick, and yield a little if you are inside one.
    pushOutOfSlimes(camera.position, KEEPER_RADIUS);

    // Push out of anything solid. SOLIDS is a chain of small circles per structure rather than one
    // circle per building, so a child can walk up to a barn door instead of being stopped short of it,
    // and gate openings are deliberately left empty so every pen is walkable.
    for (const solid of SOLIDS) {
      const dx = camera.position.x - solid.position[0];
      const dz = camera.position.z - solid.position[1];
      const d = Math.hypot(dx, dz);
      const min = solid.radius + KEEPER_RADIUS;
      if (d < min && d > 1e-4) {
        const push = (min - d) / d;
        camera.position.x += dx * push;
        camera.position.z += dz * push;
      }
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
/**
 * Item types that have an in-world presentation. Anything absent falls back to the flat tile row,
 * which draws none of the item's content and is a gap rather than a design: the owner's report that
 * the tide-line was "pressing random numbers for no reason" was exactly this fallback.
 */
export const IN_WORLD: Record<
  string,
  React.ComponentType<{
    content: Record<string, unknown>;
    onPick: (handed: string) => void;
    disabled?: boolean;
  }>
> = {
  'FLU-MATRIX-01': PodWall,
  'QUANT-SERIES-01': TideLine,
  'VER-SEQUENCE-01': DayLog,
};

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
  const inWorld = !!IN_WORLD[s.serve.typeCode];

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
      // Inside the three pens the buildings track actually placed, five to a pen. Each is bounded to
      // its own pen so wandering never leaks across the ranch.
      PENS.flatMap((pen, p) =>
        Array.from({ length: 5 }, (_, k) => {
          const a = (k / 5) * Math.PI * 2 + p * 1.1;
          const r = 1.1 + (k % 3) * 0.85;
          return {
            family: FAMILIES[(p * 5 + k) % FAMILIES.length]!,
            stage: (['pip', 'tuffet', 'crested', 'warden'] as const)[k % 4]!,
            position: [pen[0] + Math.cos(a) * r, 0, pen[1] + Math.sin(a) * r] as [number, number, number],
            seed: p * 977 + k * 131 + 7,
            bounds: { center: pen, radius: PEN_RADIUS },
          };
        }),
      ),
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
        <color attach="background" args={['#eec89a']} />
        <Suspense fallback={null}>
          <Lighting />
          <Buildings />
          {slimes.map((sl, i) => (
            <Slime key={i} {...sl} />
          ))}
        </Suspense>
        {live && IN_WORLD[live.serve.typeCode] ? (
          <group position={[0, 3.6, -13]}>
            <pointLight position={[0, 1.5, 5]} intensity={22} distance={16} color="#fff4de" />
            {(() => {
              const Presentation = IN_WORLD[live.serve.typeCode]!;
              const content = live.serve.served.content;
              return (
                <Presentation
                  // Keyed on the item so the presentation remounts per question. Without this its
                  // internal `picked` state survives into the next item and every further click is
                  // swallowed, which made the game unplayable after the first round.
                  key={live.serve.served.itemId}
                  content={content}
                  disabled={!live.asking}
                  onPick={(handed: string) => void live.answer(toRef(content, handed))}
                />
              );
            })()}
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
