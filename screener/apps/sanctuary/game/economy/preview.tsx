import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useCallback, useEffect, useRef, useState, type JSX } from 'react';
import { createRoot } from 'react-dom/client';
import * as THREE from 'three';

import type { Family } from '../contract';
import { Buildings } from '../world/Buildings';
import { Lighting } from '../world/Lighting';
import { CoinFlight, Purse } from './Purse';
import { Shop } from './Shop';
import { EARN, balance, earn, earnTicks, priceOf } from './coins';
import { AT, dockPoint } from './site';
import '../game.css';

/**
 * TEMPORARY. A looking-glass for the coin stall, in the real ranch, with the real lights.
 *
 * WHY IT EXISTS. The stall has to be understood by a five-year-old with no words, and there is exactly one
 * way to find out whether it is: look at it. Reaching it through the game means starting an API, walking a
 * keeper twenty-two metres across a meadow, answering four questions to earn anything, and hoping the
 * adaptive engine hands back a type the world can draw.
 *
 * WHAT IS REAL HERE AND WHAT IS NOT. The world, the lighting, the carpentry, the proximity check, the
 * crosshair, the key handling, the docking, the shelf layout, the cloth, the prices, the purse, the flight
 * and the purchase are all the shipping code. The only mock is the session: instead of answering a question
 * to earn a coin, `window.__earn(n)` pays one directly, which is precisely what `Game.tsx` will do when
 * `s.answered` goes up.
 *
 * Query parameters:
 *   ?view=far|near|open   across the meadow, in range with the prompt up, or docked at the counter
 *   &coins=N              start the purse at N, to photograph both sides of the affordability line
 *
 * `window.__shop` carries what a screenshot cannot see: the purse, whether the counter is open, and every
 * family bought so far.
 *
 * Not part of the game. Nothing imports it. Delete when the stall is wired into `Game.tsx`.
 */

declare global {
  interface Window {
    __previewRoot?: ReturnType<typeof createRoot>;
    __shop?: { coins: number; open: boolean; bought: string[]; ticks: number };
    __earn?: (n: number) => void;
    __moveTo?: (x: number, y: number, z: number) => void;
    __lookAt?: (x: number, y: number, z: number) => void;
  }
}

const params = new URLSearchParams(window.location.search);
const VIEW = params.get('view') ?? 'near';
const START_COINS = Number.parseInt(params.get('coins') ?? '0', 10) || 0;

/** Three vantages, all at a child's own eye height of 1.5m so nothing is seen from an adult's view. */
function vantage(): { eye: [number, number, number]; at: [number, number, number] } {
  const dock = dockPoint();
  if (VIEW === 'far') {
    // The arrival. Exactly where `Game.tsx` puts a child on their first frame.
    return { eye: [0, 1.5, 8], at: [AT[0], AT[1] - 0.2, AT[2]] };
  }
  if (VIEW === 'open') {
    return { eye: [dock[0], dock[1], dock[2]], at: [AT[0], AT[1] + 0.1, AT[2]] };
  }
  // In range, a little back from the mark, so the press badge and the whole stall are both in frame.
  const fx = dock[0] - AT[0];
  const fz = dock[2] - AT[2];
  return {
    eye: [AT[0] + fx * 1.35, 1.5, AT[2] + fz * 1.35],
    at: [AT[0], AT[1] - 0.1, AT[2]],
  };
}

/** Mouse-look, copied off `Game.tsx`'s keeper controller: same sensitivities, same clamp, same YXZ order. */
function Look({ eye, at }: { eye: [number, number, number]; at: [number, number, number] }): null {
  const camera = useThree((s) => s.camera);
  const yaw = useRef(0);
  const pitch = useRef(0);

  useEffect(() => {
    camera.position.set(eye[0], eye[1], eye[2]);
    const dx = at[0] - eye[0];
    const dy = at[1] - eye[1];
    const dz = at[2] - eye[2];
    const flat = Math.hypot(dx, dz) || 1e-6;
    // For YXZ with yaw θ and pitch φ the forward vector is (-sinθcosφ, sinφ, -cosθcosφ).
    yaw.current = Math.atan2(-dx, -dz);
    pitch.current = Math.atan2(dy, flat);
    const move = (e: MouseEvent): void => {
      yaw.current -= e.movementX * 0.0016;
      pitch.current = THREE.MathUtils.clamp(pitch.current - e.movementY * 0.0014, -1.1, 1.1);
    };
    window.addEventListener('mousemove', move);
    window.__moveTo = (x, y, z) => camera.position.set(x, y, z);
    window.__lookAt = (x, y, z) => {
      const ax = x - camera.position.x;
      const ay = y - camera.position.y;
      const az = z - camera.position.z;
      yaw.current = Math.atan2(-ax, -az);
      pitch.current = THREE.MathUtils.clamp(Math.atan2(ay, Math.hypot(ax, az)), -1.1, 1.1);
    };
    return () => window.removeEventListener('mousemove', move);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eye[0], eye[1], eye[2], at[0], at[1], at[2]]);

  useFrame(() => {
    camera.rotation.set(pitch.current, yaw.current, 0, 'YXZ');
  });
  return null;
}

function App(): JSX.Element {
  const [open, setOpen] = useState(VIEW === 'open');
  const [bought, setBought] = useState<Family[]>([]);
  const [ticks, setTicks] = useState(0);
  const v = vantage();

  /** The purse starts wherever the query says, so both sides of every price can be photographed. */
  useEffect(() => {
    const want = START_COINS - balance();
    if (want > 0) earn(want);
    setTicks(earnTicks());
  }, []);

  const pay = useCallback((n: number) => {
    earn(n);
    setTicks(earnTicks());
  }, []);

  useEffect(() => {
    window.__earn = pay;
    return () => {
      window.__earn = undefined;
    };
  }, [pay]);

  useEffect(() => {
    window.__shop = { coins: balance(), open, bought: bought.map(String), ticks };
  }, [open, bought, ticks]);

  return (
    <div className="bh-root">
      <Canvas shadows camera={{ fov: 62, near: 0.1, far: 220 }} dpr={[1, 1.75]}>
        <color attach="background" args={['#eec89a']} />
        <Suspense fallback={null}>
          <Lighting />
          <Buildings />
        </Suspense>
        <Shop
          engaged={open}
          onEngage={() => setOpen(true)}
          onLeave={() => setOpen(false)}
          onBuy={(family) => setBought((b) => [...b, family])}
        />
        <Look eye={v.eye} at={v.at} />
      </Canvas>

      <Purse />
      <CoinFlight trigger={ticks} />

      {/* Temporary, and only in the preview: what a screenshot cannot show. Never shipped. */}
      <div className="bh-hud">
        <p className="bh-cares">
          {open ? 'counter open' : 'walking'} · {balance()} coins ·{' '}
          {bought.length ? bought.map((b) => `${b} for ${priceOf(b)}`).join(', ') : 'nothing bought'}
        </p>
        <p className="bh-cares">
          answer pays {EARN.perAnswer} · round pays {EARN.perRound}
        </p>
      </div>
    </div>
  );
}

const el = document.getElementById('root');
if (el) {
  window.__previewRoot ??= createRoot(el);
  window.__previewRoot.render(<App />);
}
