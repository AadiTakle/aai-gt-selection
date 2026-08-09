import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef, useState, type JSX } from 'react';
import { createRoot } from 'react-dom/client';
import * as THREE from 'three';

import { AudioProvider } from '../audio';
import { SHOP_SOLIDS, Shop } from '../economy';
import { FAMILIES } from '../contract';
import { Slime } from '../slimes/Slime';
import { STATION_SOLIDS } from '../stations';
import { Buildings, SOLIDS } from '../world/Buildings';
import { Lighting } from '../world/Lighting';
import { IntroGuide } from './IntroGuide';
import { IntroPortrait } from './IntroPortrait';
import { markBoardTaken, markIntroSeen } from './keeper';
import { INTRO_SOLIDS, PADDOCK, dockPoint } from './site';
import { boardEngaged, useIntroView } from './store';
import '../game.css';

/**
 * TEMPORARY. A looking-glass for the guided opening, in the real ranch, with the real lights and the real
 * adaptive engine behind the board.
 *
 * WHY IT EXISTS. `Game.tsx` belongs to the integrator and this directory may not edit it, so there is no
 * way to reach any of this in the game until they mount it — and "is a drawn old woman in the corner of
 * the screen legible at 116 pixels" and "does a hoarding across a gateway read as boarded up" are
 * questions only a screenshot answers.
 *
 * WHAT IS REAL HERE AND WHAT IS NOT. The world, the lighting, the stall, the paddock, the board, the
 * proximity check, the crosshair, the key handling, the panel fitting, the sortie legs and the tour's own
 * state machine are all the shipping code, and the board opens real sessions through `/sanctuary/chunk`
 * against the running API — so the pool gate on `VER-SORTBOT-01` and the server-side steering are both
 * live. The ONLY mock is the keeper: a stripped first-person controller standing in for `Game.tsx`'s,
 * with the same walk speed, the same radius and the same collider sweep, plus two hooks a screenshot
 * script can drive it with. There are no slimes in the pens beyond a token handful, because the herd is
 * `Game.tsx`'s state and this file is not pretending to be it.
 *
 * POINTER LOCK IS NEVER REQUIRED. Headless Chrome will not grant it, and every interaction here is
 * reachable without it: `near` is computed from the camera, E is a keydown, and while the board is
 * engaged R3F's `compute` is swapped so ANY click on the canvas resolves at the centre of the screen.
 * That is not a concession for the screenshot — it is the same property that lets a child answer a
 * question without ever touching Escape.
 *
 * Query parameters:
 *   ?at=arrive|shop|pen|board   where the keeper starts
 *   &yaw=N                      facing, in radians
 *   &tour=0                     start with the tour already seen, to shoot the board on its own
 *
 * `window.__intro` carries what a screenshot cannot see, and the two hooks that drive it.
 *
 * Not part of the game. Nothing in the game imports it. Delete once the opening is wired into `Game.tsx`.
 */

const KEEPER_HEIGHT = 1.5;
const KEEPER_RADIUS = 0.45;
const WALK = 4.2;
const BOUND = 34;

declare global {
  interface Window {
    __intro?: {
      ready: boolean;
      step: string;
      line: string;
      say: number;
      engaged: boolean;
      at: number;
      of: number;
      unlocked: boolean;
      camera: [number, number, number];
      moveTo: (x: number, z: number, yaw?: number) => void;
      /**
       * Aim the crosshair.
       *
       * The ONLY way a script can choose an option, and that is a property of the game rather than of
       * this file: while the board is engaged R3F's `compute` is swapped so every pointer event resolves
       * at the centre of the screen. Clicking a different pixel therefore changes nothing — turning the
       * head is what aims, exactly as it is for the child.
       */
      look: (yaw: number, pitch: number) => void;
      press: (code: string) => void;
    };
  }
}

/** The bare minimum of `Game.tsx`'s keeper: same speed, same radius, same sweep. */
function Keeper({ start, yaw0 }: { start: [number, number]; yaw0: number }): null {
  const { camera, gl } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const yaw = useRef(yaw0);
  const pitch = useRef(0);

  useEffect(() => {
    camera.position.set(start[0], KEEPER_HEIGHT, start[1]);
    const down = (e: KeyboardEvent): void => {
      keys.current[e.code] = true;
    };
    const up = (e: KeyboardEvent): void => {
      keys.current[e.code] = false;
    };
    const move = (e: MouseEvent): void => {
      if (document.pointerLockElement !== gl.domElement) return;
      yaw.current -= e.movementX * 0.0016;
      pitch.current = THREE.MathUtils.clamp(pitch.current - e.movementY * 0.0014, -1.1, 1.1);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('mousemove', move);

    window.__intro = {
      ready: true,
      step: '',
      line: '',
      say: 0,
      engaged: false,
      at: 0,
      of: 0,
      unlocked: false,
      camera: [start[0], KEEPER_HEIGHT, start[1]],
      moveTo: (x, z, y) => {
        camera.position.set(x, KEEPER_HEIGHT, z);
        if (typeof y === 'number') yaw.current = y;
      },
      look: (y, p) => {
        yaw.current = y;
        pitch.current = p;
      },
      press: (code) => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
        window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
      },
    };

    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('mousemove', move);
    };
  }, [camera, gl, start, yaw0]);

  useFrame((_, dt) => {
    const step = Math.min(dt, 0.05);
    camera.rotation.set(pitch.current, yaw.current, 0, 'YXZ');
    if (window.__intro) {
      window.__intro.camera = [camera.position.x, camera.position.y, camera.position.z];
    }
    if (boardEngaged()) return;

    const f = (keys.current.KeyW ? 1 : 0) - (keys.current.KeyS ? 1 : 0);
    const s = (keys.current.KeyD ? 1 : 0) - (keys.current.KeyA ? 1 : 0);
    const dir = new THREE.Vector3(s, 0, -f);
    if (dir.lengthSq() > 0) dir.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw.current);
    camera.position.addScaledVector(dir, WALK * step);
    camera.position.y = KEEPER_HEIGHT;

    for (const solid of [...SOLIDS, ...STATION_SOLIDS, ...SHOP_SOLIDS, ...INTRO_SOLIDS]) {
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
    const r = Math.hypot(camera.position.x, camera.position.z);
    if (r > BOUND) {
      camera.position.x *= BOUND / r;
      camera.position.z *= BOUND / r;
    }
  });

  return null;
}

/** Mirrors the store out to `window.__intro`, so a script can wait on the tour rather than on a timer. */
function Telemetry(): null {
  const view = useIntroView();
  useEffect(() => {
    if (!window.__intro) return;
    window.__intro.step = view.step;
    window.__intro.line = view.line;
    window.__intro.say = view.say;
    window.__intro.engaged = view.boardEngaged;
    window.__intro.at = view.boardAt;
    window.__intro.of = view.boardOf;
    window.__intro.unlocked = view.unlocked;
  }, [view]);
  return null;
}

const STARTS: Record<string, { at: [number, number]; yaw: number }> = {
  arrive: { at: [0, 8], yaw: 0 },
  shop: { at: [-1.2, -9.3], yaw: 0.3 + Math.PI },
  pen: { at: [11.4, 9.0], yaw: Math.PI },
  board: { at: [0, 0], yaw: 0 },
  paddock: { at: [PADDOCK.x + 9, PADDOCK.z + 9], yaw: 0 },
};

/**
 * `?tour=0` — shoot the board without the tour talking over it.
 *
 * Done here, at module scope, and NOT in an effect: `IntroGuide` reads the flag once during its own first
 * render, and a child's render happens before its parent's effects. An effect would set the flag a frame
 * after the only moment anything reads it, which is the kind of thing that looks like it works.
 */
{
  const p = new URLSearchParams(window.location.search);
  if (p.get('tour') === '0') markIntroSeen();
  /* `?unlocked=1` — shoot the paddock as a returning keeper finds it, without playing eight items first. */
  if (p.get('unlocked') === '1') markBoardTaken();
}

function App(): JSX.Element {
  const params = new URLSearchParams(window.location.search);
  const where = params.get('at') ?? 'arrive';
  const [shopOpen, setShopOpen] = useState(false);

  /** Standing on the board's own mark, looking at it, which is the framing it was designed against. */
  const start = useMemo(() => {
    if (where === 'board') {
      const d = dockPoint();
      // The board sits at the paddock's gate; face back up its own axis.
      return { at: [d[0], d[2]] as [number, number], yaw: PADDOCK.rot };
    }
    return STARTS[where] ?? STARTS.arrive!;
  }, [where]);

  const herd = useMemo(
    () =>
      ([
        [-6, 15.5],
        [11.4, 4.2],
        [-15.5, -16.5],
      ] as const).flatMap((pen, p) =>
        Array.from({ length: 3 }, (_, k) => ({
          family: FAMILIES[(p * 3 + k) % FAMILIES.length]!,
          stage: (['pip', 'tuffet', 'crested', 'warden'] as const)[k % 4]!,
          position: [pen[0] + Math.cos(k * 2.1) * 1.6, 0, pen[1] + Math.sin(k * 2.1) * 1.6] as [number, number, number],
          seed: p * 977 + k * 131 + 7,
          bounds: { center: pen as unknown as [number, number], radius: 3.4 },
        })),
      ),
    [],
  );

  return (
    <div className="bh-root">
      <Canvas shadows camera={{ fov: 62, near: 0.1, far: 220 }} dpr={[1, 1.75]}>
        <color attach="background" args={['#eec89a']} />
        <Suspense fallback={null}>
          <Lighting />
          <Buildings />
          {herd.map((sl, i) => (
            <Slime key={i} {...sl} />
          ))}
        </Suspense>
        <Shop engaged={shopOpen} onEngage={() => setShopOpen(true)} onLeave={() => setShopOpen(false)} onBuy={() => {}} />
        <IntroGuide busy={shopOpen} />
        <Keeper start={start.at} yaw0={start.yaw} />
      </Canvas>
      <IntroPortrait />
      <Telemetry />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <AudioProvider>
    <App />
  </AudioProvider>,
);
