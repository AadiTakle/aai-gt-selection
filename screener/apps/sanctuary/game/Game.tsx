import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

import { toRef } from '../shared/ItemStage';
import { VERBS, typesFor, verbFor, type Battery } from '../shared/batteries';
import { useSortie } from '../shared/useSortie';
import { FAMILIES, LS_KEEPER, type Family } from './contract';
import { PodWall } from './screener/PodWall';
import { TideLine } from './screener/TideLine';
import { DayLog } from './screener/DayLog';
import { StoneBed } from './screener/StoneBed';
import { Sprouter } from './screener/Sprouter';
import { Weave } from './screener/Weave';
import { BalanceBough } from './screener/BalanceBough';
import { IN_WORLD as IN_WORLD_MAP } from './screener/inWorld';
import { Buildings, SOLIDS } from './world/Buildings';
import { Lighting } from './world/Lighting';
import { Slime, pushOutOfSlimes, setRanchSolids, ROAM } from './slimes/Slime';
import { Stations, STATION_SOLIDS, SITES } from './stations';
import { Vacpack, capturedTrace } from './vacpack';
import { Shop, SHOP_SOLIDS, Purse, CoinFlight, useCoins, EARN, PRICES } from './economy';
import { useAudio, MuteButton, HeadphonePrompt } from './audio';
import { useVacpackTank } from './vacpack';
import { INTRO_SOLIDS, IntroGuide, IntroPortrait, useBoardEngaged } from './intro';
import { FAMILY_BATTERY, type Family as Fam } from './contract';

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

/**
 * Everything a slime may not walk through. One definition, read by the whole game.
 *
 * Slimes had no collision at all: `Slime`'s `obstacles` prop existed and the previews passed it, but the
 * game rendered `<Slime {...sl} />` and `sl` never carried it, so `wander.ts`'s push-out code was being
 * handed an empty array and had been for the life of the build.
 *
 * `from` is where the keeper spawns, and it is what makes "findable" mean something. A landing spot that
 * is merely outside a collider is not enough — 9% of this ranch's open ground is UNREACHABLE: the inside
 * of the hut, the second paddock before its gate is unbarred, and a ring of slivers between the boundary
 * fence and the keeper's own 34m clamp. A slime plopped there is gone permanently, because the child
 * physically cannot walk to it.
 */
setRanchSolids([...SOLIDS, ...STATION_SOLIDS, ...SHOP_SOLIDS, ...INTRO_SOLIDS], {
  worldRadius: BOUND,
  from: [0, 8],
});
/** Pen centres, from the buildings track. */
interface Slimelet {
  /**
   * Stable identity, because the array index is not one.
   *
   * Slimes were keyed `key={i}`, so catching the seventh renumbered every slime after it: React handed
   * the component that had been drawing slime 7 the family, stage, seed and bounds of slime 8 while it
   * kept slime 7's position, and the LAST slime in the list unmounted instead. A child watching sees a
   * creature change costume and a different one blink out.
   */
  uid: number;
  family: Fam;
  stage: 'pip' | 'tuffet' | 'crested' | 'warden';
  position: [number, number, number];
  seed: number;
  bounds: { center: [number, number]; radius: number };
}

/** Never reused, never derived from position in the list. */
let nextUid = 1;

const PEN_RADIUS = 3.4;
const PENS: [number, number][] = [
  [-6, 15.5],
  [11.4, 4.2],
  [-15.5, -16.5],
];

/** First person: WASD, mouse look on pointer lock, space to jump. Tuned gentle for a child. */
function Keeper({ locked }: { locked: boolean }) {
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

    /**
     * Where the keeper is, published for test harnesses.
     *
     * This exists because engaging a station requires pointer lock, headless Chrome refuses to grant it,
     * and so for the whole of this build NOBODY had ever driven a round from outside the app — every
     * "the station works" claim rested on driving the session layer directly, which is not the same
     * thing. Two bugs reached the owner that way: a station that swallowed every click after the first
     * item, and a last question that trapped the keeper with nothing on screen to press. A headed browser
     * will grant the lock; it just needs to know where it is standing in order to walk anywhere.
     *
     * Read-only, four numbers, written on a frame that is already running. Nothing in the game reads it.
     */
    (window as unknown as { __keeper?: unknown }).__keeper = {
      x: camera.position.x,
      z: camera.position.z,
      y: camera.position.y,
      yaw: yaw.current,
    };

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
export { IN_WORLD } from './screener/inWorld';

export interface LiveItem {
  serve: NonNullable<ReturnType<typeof useSortie>['serve']>;
  asking: boolean;
  answer: ReturnType<typeof useSortie>['answer'];
}

function Beat({
  verbId,
  onDone,
  report,
  onAnswered,
}: {
  verbId: string;
  onDone: () => void;
  report: (live: LiveItem | null) => void;
  onAnswered: (n: number) => void;
}) {
  const verb = useMemo(() => VERBS.find((v) => v.id === verbId), [verbId]);
  /**
   * Who the server is steering. The ONLY identifier this game keeps: no name, no age, no birth date.
   * Written once and reused, so a child who comes back tomorrow meets difficulty where they left it —
   * which is what makes the estimate accumulate across visits instead of restarting every time.
   */
  const keeperId = useMemo(() => {
    try {
      const had = localStorage.getItem(LS_KEEPER);
      if (had) return had;
      const made = `k-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(LS_KEEPER, made);
      return made;
    } catch {
      /* Private browsing refuses localStorage; a per-session keeper still plays, it just does not
         remember. Better than refusing to open the station. */
      return 'anon';
    }
  }, []);
  /**
   * THE STATION'S battery, not the verb's.
   *
   * This used to be `verb?.battery ?? 'Nonverbal'`, and that fallback is a silent contamination one
   * deleted line away at all times. A station is keyed by its battery's tier-1 verb id; retire that
   * type — which the battery audit is about to do to `VER-SEQUENCE-01` — and the lookup returns
   * undefined, so the VERBAL station calls itself Nonverbal. Nothing errors. `/sanctuary/chunk` then
   * steers it from the child's Nonverbal theta and `/sanctuary/close` folds a verbal posterior into the
   * Nonverbal estimate, so two of the three batteries go quietly wrong.
   *
   * `SITES` already states each station's battery as a fact about the station, so ask it. The verb
   * fallback is kept only for a caller that is not a site, and `registry.test.ts` asserts every site key
   * names a verb of its own battery so the two can never disagree.
   */
  const site = useMemo(() => SITES.find((x) => x.verbId === verbId), [verbId]);
  const battery: Battery = site?.battery ?? verb?.battery ?? 'Nonverbal';
  /**
   * THE WHOLE BATTERY, not this verb's one style. This single line is what the owner was describing:
   * "ALL questions at the verbal station should be interchangeable at that station ... so that the user
   * never gets bored at the station with the same questions repeated."
   *
   * It used to be `[verb.typeCode]`, with the reasoning that coverage of a battery came from doing its
   * several verbs across visits rather than from mixing styles in one sitting. Two things were wrong with
   * that. It gave a child the identical style every time they walked up to a station, and it required a
   * separate station per style, which is the clutter the owner rejected outright.
   *
   * It was ALSO a defensible reading of a real hazard, which is why it is worth recording that the hazard
   * was measured rather than argued away. `nextItem()` maximises information at the threshold and
   * selection is deterministic, so a battery-wide pool once lost every argmax to the type with the widest
   * difficulty spread and served one style forever. That type was `FLU-OPCHAIN-01`; it has no in-world
   * presentation, so it cannot be in `site.types`, and 18 runs against the live API now serve 3 of 3
   * styles at every threshold tried. If a wide-spread type ever gains a presentation, re-measure before
   * trusting this.
   *
   * `site.types` is derived from the drawn set, so a new presentation reaches children by being
   * registered in `IN_WORLD` and nothing else.
   */
  const types = useMemo(() => {
    const set = site?.types ?? typesFor(battery);
    return set.length ? set : verb ? [verb.typeCode] : typesFor(battery);
  }, [site, battery, verb]);
  /**
   * `steered` is the owner's adaptivity: "if they keep missing questions, they progressively get easier.
   * if they keep getting it right, it will probably show harder questions."
   *
   * The engine does not do this by itself — measured, not assumed: at a fixed threshold the served
   * sequence is byte-identical for all-right and all-wrong, because selection maximises information at
   * the threshold and the threshold never moves. `server-plugin.ts` moves it, from a record of the
   * child's own posteriors that never enters this process. `threshold` below is therefore ignored when
   * steered; it stays only for the measurement harness.
   */
  const s = useSortie({
    battery,
    types,
    threshold: -1.5,
    precisionIndex: 0,
    settleMs: 900,
    steered: true,
    keeperId,
  });

  useEffect(() => {
    void s.open();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (s.phase === 'closed') onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.phase]);

  // Paid per question ANSWERED, never per question answered correctly. Correctness is deleted before
  // it reaches this layer, and a payout on accuracy would teach a child to guess fast for coins,
  // which is exactly the behaviour the ability estimate depends on not happening.
  useEffect(() => {
    onAnswered(s.answered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.answered]);

  useEffect(() => {
    report(s.serve ? { serve: s.serve, asking: s.phase === 'asking', answer: s.answer } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.serve, s.phase]);

  if (s.phase === 'error') {
    return <p className="bh-beat-note">Bramblebrook is quiet just now. {s.error}</p>;
  }
  if (!s.serve) return <p className="bh-beat-note">Looking…</p>;

  const content = s.serve.served.content;
  const options = Array.isArray(content.options) ? (content.options as Record<string, unknown>[]) : [];
  // Drawn in the world by the 3D layer. Only types without an in-world presentation fall back to the
  // flat tile row, and that fallback is a gap to close rather than a design.
  const inWorld = !!IN_WORLD_MAP[s.serve.typeCode];

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
  const [engaged, setEngaged] = useState<string | null>(null);
  const [shopOpen, setShopOpen] = useState(false);
  const { coins, earn, spend } = useCoins();
  const [flight, setFlight] = useState(0);
  const paidFor = useRef(0);
  const audio = useAudio();
  const { held } = useVacpackTank();
  const heldWas = useRef(0);

  /**
   * The release sound.
   *
   * The vacpack reports a capture and a landing but never the launch itself, and `onRelease` fires at
   * the END of the bounce, so it is the landing rather than the plop. The tank is shifted at launch,
   * so a drop in what it holds IS a release. This also correctly stays silent when the button is
   * pressed with an empty tank, where the game deliberately makes no sound.
   */
  useEffect(() => {
    if (held.length < heldWas.current) audio.plop();
    heldWas.current = held.length;
  }, [held.length, audio]);

  /**
   * Suction, gated on exactly the same condition as the vacpack itself. The stop must also fire when
   * that condition goes false, or engaging a station mid-draw leaves the loop running under the
   * question. It is idempotent, so stopping defensively costs nothing.
   */
  /* The challenge board holds the keeper the same way a station does, so everything that stands down
     for a station stands down for it. Missing one of these is how a child ends up vacuuming a slime
     while answering a question. */
  const boardEngaged = useBoardEngaged();
  const canVac = locked && !engaged && !shopOpen && !boardEngaged;
  useEffect(() => {
    if (!canVac) {
      audio.suckStop();
      return;
    }
    const down = (e: MouseEvent) => {
      if (e.button === 0) audio.suckStart();
    };
    const up = (e: MouseEvent) => {
      if (e.button === 0) audio.suckStop();
    };
    window.addEventListener('mousedown', down);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousedown', down);
      window.removeEventListener('mouseup', up);
      audio.suckStop();
    };
  }, [canVac, audio]);
  const [live, setLive] = useState<LiveItem | null>(null);
  const [cares, setCares] = useState(0);

  const [slimes, setSlimes] = useState<Slimelet[]>(() =>
    // Inside the three pens the buildings track actually placed, five to a pen. Each is bounded to
    // its own pen so wandering never leaks across the ranch.
    PENS.flatMap((pen, p) =>
        Array.from({ length: 5 }, (_, k) => {
          const a = (k / 5) * Math.PI * 2 + p * 1.1;
          const r = 1.1 + (k % 3) * 0.85;
          return {
            uid: nextUid++,
            family: FAMILIES[(p * 5 + k) % FAMILIES.length]!,
            stage: (['pip', 'tuffet', 'crested', 'warden'] as const)[k % 4]!,
            position: [pen[0] + Math.cos(a) * r, 0, pen[1] + Math.sin(a) * r] as [number, number, number],
            seed: p * 977 + k * 131 + 7,
            bounds: { center: pen, radius: PEN_RADIUS },
          };
        }),
      ),
  );

  /**
   * A round finished, so a slime joins the ranch. Called by the station once its egg has hatched and
   * the hatchling is already bounding, so the permanent one appears while the eye is on movement.
   *
   * Granted for having taken part, never for having been right: correctness is deleted before it
   * reaches this layer, so there is nothing here to branch on even if we wanted to.
   */
  /**
   * A slime went into the tank, so it leaves the world.
   *
   * The herd's collider id is a mount-order counter that renumbers on remount, so it cannot address
   * anything here. `capturedTrace` gives back what was caught, and a slime is located by the mark it
   * was put down on rather than by where it currently is: it never leaves its own pen, so family plus
   * stage plus nearest spawn is unambiguous.
   */
  /**
   * Slimes currently in the tank, keyed by family, oldest first.
   *
   * The vacpack's `onRelease` only reports a family and a landing spot, so without this the released
   * slime had to be invented from scratch. That is what made a plopped slime shrink: it came back as a
   * hardcoded `tuffet`, so a warden returned two stages smaller, and with a fresh seed, so it was a
   * different creature wearing the same colour. Holding the record means what comes out is what went
   * in.
   */
  const inTank = useRef<Map<string, Slimelet[]>>(new Map());

  const takeSlime = useCallback((capturedId: string) => {
    const t = capturedTrace(capturedId);
    if (!t) return;
    setSlimes((prev) => {
      let best = -1;
      let bestD = Infinity;
      prev.forEach((sl, i) => {
        if (sl.family !== t.family || sl.stage !== t.stage) return;
        const d = Math.hypot(sl.position[0] - t.x, sl.position[2] - t.z);
        if (d < bestD) { bestD = d; best = i; }
      });
      if (best < 0) return prev;
      const taken = prev[best]!;
      const queue = inTank.current.get(taken.family) ?? [];
      queue.push(taken);
      inTank.current.set(taken.family, queue);
      return prev.filter((_, i) => i !== best);
    });
  }, []);

  /** And back out again. Nothing is ever destroyed, so a release always restores one. */
  const putSlime = useCallback((family: Fam, position: [number, number, number]) => {
    const queue = inTank.current.get(family) ?? [];
    const held = queue.shift();
    inTank.current.set(family, queue);
    /**
     * BOUNDED TO WHERE IT WAS PUT DOWN, and this is the fix for the slime that vanished in the barn.
     *
     * It used to be bounded to the NEAREST PEN, with the radius stretched to reach that pen:
     * `max(PEN_RADIUS, distanceToPen + 1.5)`. The barn is about 15m from the nearest pen, so a slime set
     * down in a stall was handed a 16.4m roaming circle centred on a pen it had never been in — and with
     * no collision it walked out through the barn wall. Simulated over five minutes from each stall it
     * ended up as far as 29.8m from where the child left it, and spent up to a fifth of its time PAST THE
     * BOUNDARY FENCE, where the keeper's own 34m clamp means the child can never follow.
     *
     * It had not disappeared. It had left, and one slime among nineteen at the far end of the ranch,
     * wearing a body a child cannot tell from the others, is a lost slime.
     */
    const bounds = { center: [position[0], position[2]] as [number, number], radius: ROAM };
    setSlimes((prev) => [
      ...prev,
      held
        ? { ...held, position, bounds }
        : {
            // Only reachable if a release arrives with nothing recorded, e.g. the tank flushing on
            // unmount after a reload. Keep it whole rather than dropping the slime.
            family,
            uid: nextUid++,
            stage: 'tuffet' as const,
            position,
            seed: 9001 + prev.length * 211,
            bounds,
          },
    ]);
  }, []);

  /**
   * A round finished, so a slime joins the ranch.
   *
   * The station proposes a family, but it chooses from a literal pair per site, so on its own it can
   * only ever grant the original six. The roster is nineteen now, so the family is re-drawn here from
   * every family mapped to that station's battery. Without this the thirteen new ones are unreachable
   * in play and only ever appear in a shop.
   *
   * Granted for having taken part, never for having been right: correctness is deleted before it
   * reaches this layer, so there is nothing here to branch on even if we wanted to.
   */
  const grant = useCallback((proposed: Fam) => {
    const battery = FAMILY_BATTERY[proposed];
    const pool = (Object.keys(FAMILY_BATTERY) as Fam[]).filter((f) => FAMILY_BATTERY[f] === battery);
    const family = pool.length ? pool[Math.floor(Math.random() * pool.length)]! : proposed;
    setSlimes((prev) => {
      const pen = PENS[prev.length % PENS.length]!;
      const a = prev.length * 1.7;
      const r = 1.0 + (prev.length % 3) * 0.8;
      return [
        ...prev,
        {
          family,
          uid: nextUid++,
          stage: 'pip' as const,
          position: [pen[0] + Math.cos(a) * r, 0, pen[1] + Math.sin(a) * r] as [number, number, number],
          seed: 4001 + prev.length * 173,
          bounds: { center: pen, radius: PEN_RADIUS },
        },
      ];
    });
    setCares((n) => n + 1);
  }, []);

  const lock = useCallback(() => {
    const el = document.querySelector('canvas');
    el?.requestPointerLock?.();
  }, []);

  // Escape always frees the keeper, no matter what state a station thinks it is in. A child who
  // cannot get out of a question will not come back, so this is deliberately unconditional and sits
  // above every other handler.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setEngaged(null);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
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
          {slimes.map((sl) => (
            <Slime key={sl.uid} {...sl} />
          ))}
        </Suspense>
        {/* Suck, carry, plop. Disabled while a station is engaged so a click means "choose" there
            and "hoover" everywhere else, with no mode the child has to learn. */}
        <Shop
          engaged={shopOpen}
          onEngage={() => setShopOpen(true)}
          onLeave={() => setShopOpen(false)}
          onBuy={(family) => {
            // Bought slimes land just outside the stall, so the child sees what they paid for.
            if (spend(PRICES[family] ?? 5)) putSlime(family, [-2.5, 0, -11.6]);
          }}
        />
        <Vacpack
          enabled={locked && !engaged && !shopOpen && !boardEngaged}
          onCapture={(id) => {
            audio.squish();
            takeSlime(id);
          }}
          // Fires at the end of the bounce, so this is the landing rather than the launch.
          onRelease={(family, position) => {
            audio.land();
            putSlime(family, position);
          }}
        />
        <Stations
          engaged={engaged}
          live={live}
          onEngage={setEngaged}
          onLeave={() => setEngaged(null)}
          onGrant={grant}
        />
        <Keeper locked={locked && !engaged && !shopOpen && !boardEngaged} />
        {/* The guided opening: Nan's tour, the waypoints, and the challenge board that unlocks the
            second paddock. `busy` is NOT optional — `speak.ts` is one queue, so without it a nudge from
            Nan cancels the day-log's story mid-sentence. */}
        <IntroGuide busy={!!engaged || shopOpen} onEarn={() => setFlight((f) => f + 1)} />
      </Canvas>

      {!locked && !engaged && (
        <button type="button" className="bh-enter" onClick={lock}>
          Click to look around · WASD to walk · Space to hop
        </button>
      )}

      {engaged && (
        <div className="bh-overlay">
          <Beat
            verbId={engaged}
            onAnswered={(n) => {
              if (n <= paidFor.current) return;
              paidFor.current = n;
              earn(EARN.perAnswer);
              audio.coin?.();
              setFlight((f) => f + 1);
            }}
            report={setLive}
            onDone={() => {
              // THE TRAP BUG. This used to clear only the item and leave `engaged` set, on the
              // assumption that the station would release. When the session closes itself on the last
              // question the station has no reason to fire onLeave, so the child was left docked with
              // no item, unable to walk, with nothing on screen to press. Releasing here is the
              // guarantee; the delay is only so the hatch has time to play.
              setLive(null);
              earn(EARN.perRound);
              audio.coin?.();
              audio.hatch?.();
              setFlight((f) => f + 1);
              paidFor.current = 0;
              window.setTimeout(() => setEngaged(null), 2600);
            }}
          />
        </div>
      )}

      <CoinFlight trigger={flight} />
      {/* Nan, who is selling the ranch. Portrait and a line; never pauses the game. */}
      <IntroPortrait />
      {/*
       * Headphones are asked for BY THE VERBAL STATION AND NOWHERE ELSE.
       *
       * It used to show from load and fade on the first gesture, which the owner found sitting at the top
       * of the screen permanently. Two separate faults: the sticky gesture flag was not clearing it, and
       * more importantly it was the wrong trigger. The verbal round is the only thing in this game that
       * SPEAKS — everything else is squelches and a pad, all of which a child can play without hearing.
       * An always-on plea for headphones is decoration, and decoration is ignored exactly when it matters.
       *
       * Keyed off the engaged station's own battery rather than the served typeCode, so it appears as the
       * child docks, BEFORE any narration starts — a prompt that arrives with the first spoken word is too
       * late to act on. It also means it keeps working when the verbal station starts serving more than one
       * verbal type, which is the direction this is going.
       */}
      {/* By verb ID, not `verbFor`, which keys on typeCode — `engaged` is a verb id, so `verbFor(engaged)`
          returns undefined for every station and the prompt would simply never appear. */}
      <HeadphonePrompt during={VERBS.find((v) => v.id === engaged)?.battery === 'Verbal'} />
      {!engaged && !shopOpen && (
        <div className="bh-hud">
          <Purse />
          <MuteButton />
          <p className="bh-cares">{cares} looked after</p>
          <p className="bh-cares">Walk up to the barn wall, the spring or the log</p>
        </div>
      )}
    </div>
  );
}
