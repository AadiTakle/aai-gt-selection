import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from 'react';
import { createRoot } from 'react-dom/client';
import * as THREE from 'three';

import type { Family } from '../contract';
import type { LiveItem } from '../Game';
import { Slime } from '../slimes/Slime';
import { Buildings, SOLIDS } from '../world/Buildings';
import { Lighting } from '../world/Lighting';
import { Stations } from './Stations';
import { SITES, STATION_SOLIDS, dockPoint, facingOf, localToWorld, siteFor } from './sites';

/**
 * TEMPORARY. A looking-glass for the three stations, in the real ranch, with the real lights.
 *
 * WHY IT EXISTS. These are objects a five-year-old has to understand without being told anything, and
 * there is exactly one way to find out whether that is true: look at them. Reaching them through the game
 * means starting an API, walking a keeper across a meadow, and hoping the adaptive engine serves the
 * option count you wanted to check the layout against.
 *
 * WHAT IS REAL HERE AND WHAT IS NOT. The world, the lighting, the carpentry, the proximity check, the
 * crosshair, the key handling, the panel fitting, the cradle and the hatch are all the shipping code. The
 * only mock is the session: `useSortie` is stood in for by a fake that serves items straight off disk,
 * advances after a choice, and closes after four — which is what the real one does, minus the network.
 * That mock is what makes the whole loop drivable from a screenshot script, INCLUDING the reward, because
 * the pips and the hatch are driven by real choices made through the real crosshair.
 *
 * `/@fs/` reaches outside vite's root, which the sanctuary config already widens to the screener root.
 *
 * Query parameters:
 *   ?shot=coat|tide|log     which station
 *   &view=far|near|engaged  the vantage: across the meadow, in range, or docked and answering
 *   &i=N                    which item from that bank to start on
 *   &band=K-1               restrict the bank to one age band
 *
 * `window.__stations` carries what a screenshot cannot see: which station is engaged, how many choices
 * have been made, and every slime the stations have granted.
 *
 * Not part of the game. Nothing imports it. Delete when the stations are wired into `Game.tsx`.
 */

const BANKS = '/@fs/Users/alphaintern/gt-dev-view/screener/data/sanctuary/banks';

const PENS: [number, number][] = [
  [-6, 15.5],
  [11.4, 4.2],
  [-15.5, -16.5],
];
const PEN_RADIUS = 3.4;

interface BankItem {
  itemId: string;
  difficulty: number;
  ageBands: string[];
  content: Record<string, unknown>;
}

interface Granted {
  family: Family;
  position: [number, number, number];
  seed: number;
  pen: [number, number];
}

declare global {
  interface Window {
    __stations?: {
      ready: boolean;
      engaged: string | null;
      served: number;
      answered: number;
      granted: string[];
      itemId: string | null;
      cradle: [number, number, number];
      rewardEye: [number, number, number];
    };
    __lookAt?: (x: number, y: number, z: number) => void;
    __moveTo?: (x: number, y: number, z: number) => void;
    __aim?: {
      hits: number;
      choosable: boolean;
      distance: number;
      baby: { visible: boolean; at: number[]; scale: number; kids: number } | null;
    };
  }
}

function App(): JSX.Element | null {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot') ?? 'coat';
  const view = params.get('view') ?? 'far';
  const start = Number(params.get('i') ?? '0');
  const band = params.get('band');

  // `tide` is offered as a shorthand: the verb's real id is `tide-line`.
  const site = useMemo(() => siteFor(shot === 'tide' ? 'tide-line' : shot) ?? SITES[0]!, [shot]);

  const [items, setItems] = useState<BankItem[] | null>(null);
  const [cursor, setCursor] = useState(start);
  const [engaged, setEngaged] = useState<string | null>(view === 'engaged' ? site.verbId : null);
  const [asking, setAsking] = useState(true);
  const [answered, setAnswered] = useState(0);
  const [granted, setGranted] = useState<Granted[]>([]);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    void fetch(`${BANKS}/${site.typeCode}.jsonl`)
      .then((r) => r.text())
      .then((t) =>
        t
          .split('\n')
          .filter((l) => l.trim())
          .map((l) => JSON.parse(l) as BankItem),
      )
      .then((all) => setItems(band ? all.filter((it) => it.ageBands.includes(band)) : all));
  }, [site.typeCode, band]);

  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t));
    },
    [],
  );

  const item = items ? items[Math.min(cursor, items.length - 1)] : undefined;
  /** Where the egg is, in world metres, so a script can point the head at it for the hatch shots. */
  const cradle = useMemo(() => localToWorld(site, site.bay.halfW + 0.5, 1.25), [site]);
  /**
   * Where to stand to watch the egg hatch, and it took three tries to find.
   *
   * Not the standing spot: from there the cradle is 40° off axis with the press badge and the emblem sign
   * in between, and those shots were mostly a photograph of a keycap. Not directly in front of the nest
   * either — the hatchling leaves along the station's own +Z, which is straight at a camera placed there,
   * so it hops past the lens and out of frame. Off to the nest's outboard side, a little high and three and
   * a half metres back: the egg, its post, and the whole run across the grass are all in shot.
   */
  const rewardEye = useMemo(() => localToWorld(site, site.bay.halfW + 2.6, 1.25 + 2.95), [site]);

  /** The mock session. Four items, then it closes itself, exactly as a real round does. */
  const answer = useCallback(
    async (): Promise<void> => {
      setAsking(false);
      const n = answered + 1;
      setAnswered(n);
      timers.current.push(
        window.setTimeout(() => {
          if (n >= 4) {
            setEngaged(null);
            return;
          }
          setCursor((c) => c + 1);
          setAsking(true);
        }, 700),
      );
    },
    [answered],
  );

  const live: LiveItem | null = useMemo(() => {
    if (!engaged || !item) return null;
    return {
      serve: { typeCode: site.typeCode, served: { itemId: item.itemId, content: item.content } },
      asking,
      answer,
    } as unknown as LiveItem;
  }, [engaged, item, site.typeCode, asking, answer]);

  const onGrant = useCallback((family: Family): void => {
    setGranted((g) => {
      // Into the pen nearest the station, spread so several arrivals do not stack.
      let pen = PENS[0]!;
      let best = Infinity;
      for (const p of PENS) {
        const d = Math.hypot(p[0] - site.at[0], p[1] - site.at[2]);
        if (d < best) {
          best = d;
          pen = p;
        }
      }
      const a = (g.length / 6) * Math.PI * 2;
      return [
        ...g,
        {
          family,
          position: [pen[0] + Math.cos(a) * 1.6, 0, pen[1] + Math.sin(a) * 1.6] as [number, number, number],
          seed: 4400 + g.length * 137,
          pen,
        },
      ];
    });
  }, [site]);

  useEffect(() => {
    window.__stations = {
      ready: !!items,
      engaged,
      served: cursor,
      answered,
      granted: granted.map((g) => g.family),
      itemId: item?.itemId ?? null,
      // Where the egg is, and where to stand to watch it, so a script can frame the reward.
      cradle: [cradle[0], 1.5, cradle[1]],
      rewardEye: [rewardEye[0], 2.5, rewardEye[1]],
    };
  }, [items, engaged, cursor, answered, granted, item, cradle, rewardEye]);

  const eye = useMemo<[number, number, number]>(() => {
    const dock = dockPoint(site);
    const f = facingOf(site);
    if (view === 'engaged') return [dock[0], dock[1], dock[2]];
    // `near` has to be inside `REACH` (6.8) to raise the prompt. 5.4 rather than 6.2: at the coat wall,
    // 6.2 out puts the camera inside pen 0, and a gate post a metre from the lens is all you can see.
    if (view === 'near') return [site.at[0] + f[0] * 5.4, 1.5, site.at[2] + f[1] * 5.4];
    /*
      Across the meadow and off to one side, so the station is read as an object standing in a place.
      WHICH side is chosen rather than fixed: at a fixed offset one station's establishing shot is taken
      from inside pen 0's fence and another from inside the barn's lean-to, and a photograph of a station
      through a fence says nothing about the station. So both sides are tried and the one that puts the
      lens further from the two buildings wins.
    */
    const clear = (x: number, z: number): number =>
      Math.min(Math.hypot(x + 14.5, z - 1.5), Math.hypot(x - 13, z + 5));
    const a: [number, number, number] = [
      site.at[0] + f[0] * 10.5 - f[1] * 4.5,
      3.4,
      site.at[2] + f[1] * 10.5 + f[0] * 4.5,
    ];
    const b: [number, number, number] = [
      site.at[0] + f[0] * 10.5 + f[1] * 4.5,
      3.4,
      site.at[2] + f[1] * 10.5 - f[0] * 4.5,
    ];
    return clear(a[0], a[2]) >= clear(b[0], b[2]) ? a : b;
  }, [site, view]);

  if (!items) return null;

  return (
    <>
      <Canvas
        shadows
        camera={{ fov: 62, near: 0.1, far: 220 }}
        dpr={[1, 1.75]}
        onCreated={({ camera }) => {
          camera.position.set(eye[0], eye[1], eye[2]);
          camera.rotation.order = 'YXZ';
        }}
      >
        <Look eye={eye} at={[site.at[0], site.at[1] - (view === 'far' ? 0.5 : 0.2), site.at[2]]} />
        <Aim verbId={site.verbId} />
        <color attach="background" args={['#eec89a']} />
        <Lighting />
        <Buildings />
        <Stations
          engaged={engaged}
          live={live}
          onEngage={(id) => {
            setEngaged(id);
            setAnswered(0);
            setAsking(true);
            setCursor(start);
          }}
          onLeave={() => setEngaged(null)}
          onGrant={onGrant}
        />
        {granted.map((g, i) => (
          <Slime
            key={i}
            family={g.family}
            stage="pip"
            position={g.position}
            seed={g.seed}
            bounds={{ center: g.pen, radius: PEN_RADIUS }}
            obstacles={[...SOLIDS, ...STATION_SOLIDS]}
          />
        ))}
      </Canvas>
      <p
        style={{
          position: 'fixed',
          left: 10,
          bottom: 8,
          margin: 0,
          font: '12px ui-monospace, monospace',
          color: '#4b3626',
          background: 'rgba(255,246,226,0.72)',
          padding: '3px 7px',
          borderRadius: 6,
        }}
      >
        {site.verbId} · {view} · {item?.itemId ?? '—'} · answered {answered} ·{' '}
        {granted.length ? `granted ${granted.map((g) => g.family).join(',')}` : 'granted none'}
      </p>
    </>
  );
}

/**
 * Mouse-look, copied off `Game.tsx`'s keeper controller — same 0.0016 and 0.0014 sensitivities, same
 * clamp, same YXZ order.
 *
 * Not a convenience. Choosing an option means aiming the CROSSHAIR at it, so a harness with a fixed
 * camera cannot exercise the interaction at all; the first run of the screenshot script clicked four
 * times at dead centre, hit the middle of the matrix, and reported nothing answered. With this, a
 * `page.mouse.move` turns the head exactly as a child's would, and the reward shots are produced by real
 * aiming rather than by poking at the state.
 */
function Look({ eye, at }: { eye: [number, number, number]; at: [number, number, number] }): null {
  const camera = useThree((s) => s.camera);
  const yaw = useRef(0);
  const pitch = useRef(0);

  useEffect(() => {
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
    // Deterministic aim, for a script that needs the head pointed at a known thing rather than swept
    // there by mouse deltas. Nothing in the game uses it.
    window.__moveTo = (tx: number, ty: number, tz: number): void => {
      camera.position.set(tx, ty, tz);
    };
    window.__lookAt = (tx: number, ty: number, tz: number): void => {
      const ax = tx - camera.position.x;
      const ay = ty - camera.position.y;
      const az = tz - camera.position.z;
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

/**
 * What the crosshair is on, published for the screenshot script.
 *
 * `choosable` is true when the ray finds an INVISIBLE mesh, which is precisely what all three
 * presentations build their hit targets out of. So the script can sweep the head downward until the
 * crosshair is genuinely on an option and only then click, instead of guessing pixel coordinates that
 * would change with every layout tweak.
 */
function Aim({ verbId }: { verbId: string }): null {
  const siteId = useRef(verbId);
  siteId.current = verbId;
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  const ray = useRef(new THREE.Raycaster());
  const centre = useRef(new THREE.Vector2(0, 0));
  const since = useRef(0);

  useFrame((_, dt) => {
    since.current += dt;
    if (since.current < 0.07) return;
    since.current = 0;
    ray.current.setFromCamera(centre.current, camera);
    const hits = ray.current.intersectObjects(scene.children, true);
    const pick = hits.find((h) => h.object.visible === false);
    // Temporary: what the hatchling is actually doing, since a creature that does not appear looks
    // identical to a creature that was never created.
    const baby = scene.getObjectByName(`hatchling-${siteId.current}`);
    const at = baby ? baby.getWorldPosition(new THREE.Vector3()) : null;
    const sc = baby ? baby.getWorldScale(new THREE.Vector3()) : null;
    window.__aim = {
      hits: hits.length,
      choosable: !!pick,
      distance: pick ? Number(pick.distance.toFixed(2)) : -1,
      baby: baby
        ? {
            visible: baby.visible,
            at: [Number(at!.x.toFixed(2)), Number(at!.y.toFixed(2)), Number(at!.z.toFixed(2))],
            scale: Number(sc!.y.toFixed(3)),
            kids: baby.children[0]?.children.length ?? 0,
          }
        : null,
    };
  });
  return null;
}

/**
 * One root, kept on `window`.
 *
 * Vite re-executes this module on a dependency re-optimisation as well as on an edit, and a second
 * `createRoot` on the same container warns and detaches the first tree — which silently broke the middle
 * of a screenshot run once, and looked exactly like the interaction having failed.
 */
declare global {
  interface Window {
    __previewRoot?: ReturnType<typeof createRoot>;
  }
}

const el = document.getElementById('root');
if (el) {
  window.__previewRoot ??= createRoot(el);
  window.__previewRoot.render(<App />);
}
