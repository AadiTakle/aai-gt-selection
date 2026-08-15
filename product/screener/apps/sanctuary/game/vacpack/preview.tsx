/**
 * TEMPORARY. The harness that made it possible to see whether the suction reads as suction.
 *
 * It stands in for the integrator: it owns a list of slimes, hands `Vacpack` an `onCapture` that removes one
 * and an `onRelease` that adds one back, and keeps a running tally of whether any released slime ever landed
 * somewhere it should not have. That tally is the proof behind "never inside a building" — it is checked with
 * the same `overlaps()` predicate the mechanic clears itself against, on the real `SOLIDS` chain, after the
 * fact rather than before.
 *
 * IT USES THE REAL `<Slime>`, which matters more than it sounds. The vacpack never touches slime geometry, but
 * it does depend on two things being true of `Slime.tsx`, and only a real one can prove them:
 *
 *   · that the collider it publishes to `herd.ts` — centre, radius, crown height — is live and accurate every
 *     frame, since the proxy blob that flies up the nozzle is sized and placed entirely from those numbers, and
 *     a mismatch shows up instantly as a slime that changes size the moment it is caught;
 *   · that it writes `position` and `rotation.y` on its root group and NOTHING ELSE, since the lean rig in
 *     `airflow.ts` borrows `rotation.x` and `rotation.z` and would be fighting the slime for them otherwise.
 *
 * Both were checked against the file as it stands, and this harness is where they keep being checked.
 */
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { StrictMode, Suspense, useCallback, useEffect, useMemo, useRef, useState, type JSX } from 'react';
import { createRoot } from 'react-dom/client';
import * as THREE from 'three';

import { FAMILIES, type Family, type Stage } from '../contract';
import { pushOutOfSlimes } from '../slimes/herd';
import { Slime } from '../slimes/Slime';
import { Buildings, SOLIDS } from '../world/Buildings';
import { Lighting } from '../world/Lighting';
import { paintOf } from './families';
import { capturedTrace } from './identity';
import { circlesFrom, overlaps, type Ground } from './suction';
import { tankReset, useVacpackTank } from './tank';
import { Vacpack, vacpackCost } from './Vacpack';

const q = new URLSearchParams(location.search);
const WITH_PACK = q.get('vac') !== '0';
const START_STOWED = q.get('stow') === '1';
const PREFILL = Math.max(0, Math.min(4, Number(q.get('fill') ?? 0)));

const BOUND = 34;
const GROUND: Ground = { worldRadius: BOUND, y: 0, solids: circlesFrom(SOLIDS) };
const KEEPER_HEIGHT = 1.5;

/* ------------------------------------------------------------------ *\
   A slime in the harness's own list
\* ------------------------------------------------------------------ */

interface Grazer {
  key: number;
  family: Family;
  stage: Stage;
  /** Where it was put down. `Slime` wanders from here inside `pen`, and never leaves it. */
  x: number;
  z: number;
  seed: number;
  /** Small on purpose: it keeps every slime near its spawn so the position match has something to match on. */
  pen: number;
}

let grazerKey = 1;

function makeGrazer(family: Family, x: number, z: number, stage: Stage = 'crested', pen = 1.5): Grazer {
  return { key: grazerKey++, family, stage, x, z, seed: Math.floor(Math.random() * 9973), pen };
}

/* ------------------------------------------------------------------ *\
   A keeper, close enough to the shipped one to be a fair test
\* ------------------------------------------------------------------ */

function Keeper(): null {
  const { camera } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const yaw = useRef(0);
  const pitch = useRef(0);
  const vy = useRef(0);

  useEffect(() => {
    camera.position.set(0, KEEPER_HEIGHT, 8);
    const down = (e: KeyboardEvent) => (keys.current[e.code] = true);
    const up = (e: KeyboardEvent) => (keys.current[e.code] = false);
    // No pointer lock in the harness: a script cannot grant it, and the mechanic never asks for it anyway.
    const move = (e: MouseEvent) => {
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
  }, [camera]);

  useFrame((_, dt) => {
    const step = Math.min(dt, 0.05);
    camera.rotation.set(pitch.current, yaw.current, 0, 'YXZ');
    const f = (keys.current.KeyW ? 1 : 0) - (keys.current.KeyS ? 1 : 0);
    const s = (keys.current.KeyD ? 1 : 0) - (keys.current.KeyA ? 1 : 0);
    const dir = new THREE.Vector3(s, 0, -f);
    if (dir.lengthSq() > 0) dir.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw.current);
    camera.position.addScaledVector(dir, 4.2 * step);
    const onGround = camera.position.y <= KEEPER_HEIGHT + 1e-3;
    if (onGround && keys.current.Space) vy.current = 6.4;
    vy.current += -18 * step;
    camera.position.y += vy.current * step;
    if (camera.position.y < KEEPER_HEIGHT) {
      camera.position.y = KEEPER_HEIGHT;
      vy.current = 0;
    }
    pushOutOfSlimes(camera.position, 0.45);
    for (const solid of SOLIDS) {
      const dx = camera.position.x - solid.position[0];
      const dz = camera.position.z - solid.position[1];
      const d = Math.hypot(dx, dz);
      const min = solid.radius + 0.45;
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

/* ------------------------------------------------------------------ *\
   Frame cost, measured in the page
\* ------------------------------------------------------------------ */

function Meter(): null {
  const acc = useRef({ n: 0, t: 0, worst: 0 });
  useFrame((_, dt) => {
    const a = acc.current;
    a.n += 1;
    a.t += dt;
    if (dt > a.worst) a.worst = dt;
    if (a.t >= 1) {
      const ms = (a.t / a.n) * 1000;
      const el = document.getElementById('fps');
      // The pack's OWN cost, separately, because the display is vsynced: whole-frame ms is pinned at the refresh
      // interval whether the mechanic costs nothing or half a millisecond, and a figure that cannot move is not a
      // measurement. `vacpackCost` times the mechanic's frame callback directly.
      const v = WITH_PACK ? vacpackCost() : { ms: 0, worst: 0 };
      if (el) {
        el.textContent =
          `${(a.n / a.t).toFixed(0)} fps · ${ms.toFixed(2)} ms/frame · worst ${(a.worst * 1000).toFixed(1)} ms` +
          (WITH_PACK ? ` · vacpack ${v.ms.toFixed(3)} ms (peak ${v.worst.toFixed(2)})` : '');
      }
      a.n = 0;
      a.t = 0;
      a.worst = 0;
    }
  });
  return null;
}

/* ------------------------------------------------------------------ *\
   The harness, standing in for the integrator
\* ------------------------------------------------------------------ */

function Harness(): JSX.Element {
  const [herd, setHerd] = useState<Grazer[]>(() => {
    // A short arc of slimes a few metres in front of where the keeper starts, one of each family, at all four
    // ages — so the proxy's sizing is checked against a pip and a warden and not just the middle.
    const out: Grazer[] = [];
    FAMILIES.forEach((f, i) => {
      const a = -0.7 + (i / (FAMILIES.length - 1)) * 1.4;
      out.push(
        makeGrazer(
          f,
          Math.sin(a) * 5.2,
          8 - Math.cos(a) * 5.6,
          (['pip', 'tuffet', 'crested', 'warden'] as const)[i % 4]!,
        ),
      );
    });
    return out;
  });
  const [inHand, setInHand] = useState(0);
  const [legal, setLegal] = useState({ ok: 0, bad: 0, worst: '' });
  const { held } = useVacpackTank();

  useEffect(() => {
    tankReset();
  }, []);

  /**
   * THE POSITION MATCH, which is the workaround this track recommends to the integrator until `herd.ts` can
   * carry a world id — see `identity.ts`.
   *
   * Matched on family plus the nearest SPAWN position, not the nearest live position, because that is the only
   * information the real integrator has: `contract.ts`'s `Slime` has no position field at all, so a `WorldState`
   * entry can only be located by the mark it was put down on. It works because a slime never leaves its
   * `bounds`, so "nearest spawn of the right family to where the catch happened" is unambiguous as long as pens
   * are further apart than they are wide — which is how the ranch is laid out.
   */
  const onCapture = useCallback((slimeId: string) => {
    const t = capturedTrace(slimeId);
    setInHand((n) => n + 1);
    setHerd((list) => {
      if (!t) return list;
      let best = -1;
      let bestD = Infinity;
      list.forEach((d, i) => {
        if (d.family !== t.family || d.stage !== t.stage) return;
        const dd = Math.hypot(d.x - t.x, d.z - t.z);
        // Within its own pen plus a slime's width of slack.
        if (dd < bestD && dd < d.pen + t.r + 0.5) {
          bestD = dd;
          best = i;
        }
      });
      if (best < 0) return list;
      const next = list.slice();
      next.splice(best, 1);
      return next;
    });
  }, []);

  const onRelease = useCallback((family: Family, position: [number, number, number]) => {
    setInHand((n) => Math.max(0, n - 1));
    // The proof behind "never inside a building": checked AFTER the fact, with the same predicate the mechanic
    // clears itself against, over the real 140-circle SOLIDS chain.
    const bad = overlaps({ x: position[0], z: position[2] }, 0.46, GROUND);
    setLegal((l) => ({
      ok: l.ok + (bad ? 0 : 1),
      bad: l.bad + (bad ? 1 : 0),
      worst: bad ? `${position[0].toFixed(2)}, ${position[2].toFixed(2)}` : l.worst,
    }));
    setHerd((list) => [...list, makeGrazer(family, position[0], position[2])]);
  }, []);

  /* --- the flat HUD, which is also the `useVacpackTank` test ------------- */
  useEffect(() => {
    const row = document.getElementById('tank');
    if (!row) return;
    row.innerHTML = '';
    for (let i = 0; i < 4; i += 1) {
      const h = held[i];
      const el = document.createElement('div');
      el.className = 'slot';
      if (h) {
        el.style.background = paintOf(h.family).skin;
        el.textContent = h.family.slice(0, 2);
      }
      row.appendChild(el);
    }
  }, [held]);

  useEffect(() => {
    const c = document.getElementById('count');
    if (c) c.textContent = String(herd.length);
    const a = document.getElementById('air');
    if (a) a.textContent = String(inHand);
    const l = document.getElementById('legal');
    if (l) {
      l.className = legal.bad > 0 ? 'bad' : 'ok';
      l.textContent =
        legal.ok + legal.bad === 0
          ? 'no landings yet'
          : `landings: ${legal.ok} legal, ${legal.bad} inside something${legal.worst ? ` (${legal.worst})` : ''}`;
    }
    const m = document.getElementById('mode');
    if (m) m.textContent = `${WITH_PACK ? 'pack on' : 'pack OFF (baseline)'}${START_STOWED ? ' · stowed' : ''}`;
  }, [herd.length, inHand, legal]);

  /* Exposed for the screenshot script only: a read of the harness's own state, so the script can wait for a
     thing to have happened rather than for a number of milliseconds to have passed. */
  useEffect(() => {
    (window as unknown as { __vac: unknown }).__vac = {
      herd: herd.length,
      inHand,
      tank: held.length,
      legal,
    };
  }, [herd.length, inHand, held.length, legal]);

  const enabled = !START_STOWED;

  return (
    <>
      <Suspense fallback={null}>
        <Lighting />
        <Buildings />
        {herd.map((d) => (
          <Slime
            key={d.key}
            family={d.family}
            stage={d.stage}
            position={[d.x, 0, d.z]}
            seed={d.seed}
            bounds={{ center: [d.x, d.z], radius: d.pen }}
          />
        ))}
      </Suspense>
      <Keeper />
      <Meter />
      {WITH_PACK ? <Vacpack enabled={enabled} onCapture={onCapture} onRelease={onRelease} /> : null}
    </>
  );
}

function Preview(): JSX.Element {
  // `?fill=n` pre-loads the tank by faking n captures, so the row of windows can be shot without driving the
  // whole cycle first. It goes through the real store, so it is the real thing being photographed.
  const pre = useMemo(() => PREFILL, []);
  useEffect(() => {
    if (pre <= 0) return;
    // Deferred so it lands after `tankReset` in the harness.
    const id = setTimeout(() => {
      void import('./tank').then((t) => {
        for (let i = 0; i < pre; i += 1) t.tankPush({ id: `pre-${i}`, family: FAMILIES[i % FAMILIES.length]! });
      });
    }, 60);
    return () => clearTimeout(id);
  }, [pre]);

  return (
    <Canvas shadows="variance" camera={{ fov: 62, near: 0.1, far: 220 }} dpr={[1, 1.75]}>
      <color attach="background" args={['#eec89a']} />
      <Harness />
    </Canvas>
  );
}

if (q.get('slow') === '1') {
  // Force the reduced-motion path without needing the OS setting, so the shortened timings can be seen.
  const real = window.matchMedia.bind(window);
  window.matchMedia = ((query: string) => {
    if (query.includes('prefers-reduced-motion')) {
      return { matches: true, media: query, addEventListener() {}, removeEventListener() {} } as unknown as MediaQueryList;
    }
    return real(query);
  }) as typeof window.matchMedia;
}

/* One root per container, kept across hot updates. Vite re-executes this module on a hot update and a second
   `createRoot` on the same node is a console error and two competing reconcilers on one canvas. */
const host = document.getElementById('root')!;
const store = window as unknown as { __vacRoot?: ReturnType<typeof createRoot> };
store.__vacRoot ??= createRoot(host);
store.__vacRoot.render(
  <StrictMode>
    <Preview />
  </StrictMode>,
);
