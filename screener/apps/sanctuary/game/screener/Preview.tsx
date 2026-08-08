import { Canvas } from '@react-three/fiber';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { DayLog } from './DayLog';
import { TideLine } from './TideLine';

/**
 * A LOOKING-GLASS for the two presentations, served by the sanctuary's own vite on 5230.
 *
 * WHY IT EXISTS. These are 3D things drawn for a five-year-old, and the only way to know whether a
 * child could tell what is being asked is to LOOK at them. Reaching them through the game means
 * walking a keeper across a ranch, clicking a call, and hoping the adaptive engine serves the
 * difficulty you wanted — which is no way to iterate on a silhouette.
 *
 * THE CAMERA IS NOT A CONVENIENCE. It is copied from `Game.tsx`'s `viewing` vantage exactly — position
 * (0, 3.0, -4.6), pitch -0.06, fov 62 — and the item group is placed at (0, 3.6, -13) where the pod
 * wall is placed, with the same lights and the same pale sky. So the framing here is the framing the
 * child gets, not a flattering one. `?tight=1` moves in for detail, which is for judging a berry, not
 * for judging the composition.
 *
 * ITEMS COME OFF DISK, whole. `/@fs/` reaches outside vite's root, which the sanctuary config already
 * widens to the screener root. Hand-written fixtures would let a wrong assumption about the payload
 * survive, which is the specific mistake this whole directory exists to correct.
 *
 * Not part of the game. Nothing imports it.
 */

const BANKS = '/@fs/Users/alphaintern/gt-dev-view/screener/data/sanctuary/banks';

interface Item {
  itemId: string;
  difficulty: number;
  ageBands: string[];
  content: Record<string, unknown>;
}

async function loadBank(typeCode: string): Promise<Item[]> {
  const res = await fetch(`${BANKS}/${typeCode}.jsonl`);
  const text = await res.text();
  return text
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as Item);
}

function App() {
  const params = new URLSearchParams(window.location.search);
  const show = params.get('show') ?? 'tide';
  const pick = Number(params.get('i') ?? '0');
  const tight = params.get('tight') === '1';
  const band = params.get('band');

  const [items, setItems] = useState<Item[] | null>(null);

  useEffect(() => {
    void loadBank(show === 'log' ? 'VER-SEQUENCE-01' : 'QUANT-SERIES-01').then(setItems);
  }, [show]);

  if (!items) return null;

  const pool = band ? items.filter((it) => it.ageBands.includes(band)) : items;
  const item = pool[Math.min(pick, pool.length - 1)];
  if (!item) return null;

  // Reported in the corner so a screenshot can never be mistaken for a different difficulty.
  const label = `${show === 'log' ? 'VER-SEQUENCE-01' : 'QUANT-SERIES-01'} · ${item.itemId} · b=${item.difficulty} · ${item.ageBands.join('/')}`;

  return (
    <>
      <Canvas
        shadows
        camera={{ fov: 62, near: 0.1, far: 220, position: [0, 3.0, tight ? -8.0 : -4.6] }}
        dpr={[1, 1.75]}
        onCreated={({ camera }) => {
          camera.rotation.order = 'YXZ';
          camera.rotation.set(-0.06, 0, 0);
        }}
      >
        <color attach="background" args={['#bfe4f2']} />
        <fog attach="fog" args={['#cfe9f4', 40, 130]} />
        <hemisphereLight args={['#dff0ff', '#7fa860', 0.75]} />
        <directionalLight position={[18, 26, 12]} intensity={2.1} color="#fff2d8" castShadow shadow-mapSize={[1024, 1024]} />
        {/* The grass the game stands the keeper on, so nothing floats in a void. */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[40, 48]} />
          <meshStandardMaterial color="#8fc46b" roughness={0.95} />
        </mesh>

        <group position={[0, 3.6, -13]}>
          <pointLight position={[0, 1.5, 5]} intensity={22} distance={16} color="#fff4de" />
          {show === 'log' ? (
            <DayLog key={item.itemId} content={item.content} onPick={(h) => console.log('picked', h)} />
          ) : (
            <TideLine key={item.itemId} content={item.content} onPick={(h) => console.log('picked', h)} />
          )}
        </group>
      </Canvas>
      <p
        style={{
          position: 'fixed',
          left: 10,
          bottom: 6,
          margin: 0,
          font: '12px ui-monospace, monospace',
          color: '#4b3626',
        }}
      >
        {label}
      </p>
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
