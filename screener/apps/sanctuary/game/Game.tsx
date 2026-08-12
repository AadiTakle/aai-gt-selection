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
import { groundY } from './world/ground';
import { Slime, pushOutOfSlimes, setGroundHeight, setRanchSolids } from './slimes/Slime';
import { grantSlime, putSlime, seedHerd, takeSlime, useHerd } from './slimes/keep';
import {
  EYE as KEEPER_HEIGHT,
  LOFT_SOLIDS,
  solidBites,
  stepKeeper,
  type Ladder,
} from './world/ladder';
import { Stations, STATION_SOLIDS, SITES, PIPS } from './stations';
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

/**
 * Imported rather than declared, because `world/ladder.ts` integrates the keeper now and two copies of
 * the eye height cannot be allowed to drift — the loft's deck is resolved against it, so a disagreement
 * of a few centimetres is a child standing with their feet through the floor.
 */
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

/**
 * AND HOW HIGH THE GROUND IS, which is not everywhere the same.
 *
 * Owner: "when i drop slimes in the barn, they lowkey sink through the floor. so i think we need to make
 * the ground level a little higher." They sank by exactly 7cm: the barn's threshing floor is
 * `BARN_FLOOR_Y`, held off zero because a floor AT zero z-fights with a meadow at zero, while every slime
 * is handed `position: [x, 0, z]`.
 *
 * Raising the ground level as one number — which is what he suggested and the obvious reading — would have
 * fixed the barn by floating every slime on the meadow 7cm into the air instead. So it is a function of
 * position: `world/ground.ts`, reading the same constants the floor and the doorway's stone sill are drawn
 * from, with the lip blended over 28cm so a slime resting on the threshold cannot shudder between two
 * heights 7cm apart.
 *
 * Registered rather than imported, on the same terms and for the same reason as the collider set above:
 * nothing in `slimes/` may know that the ranch has a barn in it.
 */
setGroundHeight(groundY);
/** Pen centres, from the buildings track. */
/**
 * Where the keeper is standing and which way they face, for the things that must happen IN FRONT OF THEM
 * rather than at a place on the map — a bought slime, a hatched reward. Written once a frame by `Keeper`.
 *
 * A module-level object rather than state on purpose: it changes every frame and nothing should re-render
 * because a child turned their head.
 */
const pose = { x: 0, z: 8, yaw: 0 };

const PEN_RADIUS = 3.4;
const PENS: [number, number][] = [
  [-6, 15.5],
  [11.4, 4.2],
  [-15.5, -16.5],
];

/**
 * The fifteen the ranch starts with. Idempotent, so `StrictMode`'s double mount cannot double the herd —
 * a hazard the old `useState` initialiser hid rather than avoided.
 */
seedHerd(PENS, PEN_RADIUS, FAMILIES);

/** First person: WASD, mouse look on pointer lock, space to jump. Tuned gentle for a child. */
function Keeper({ locked }: { locked: boolean }) {
  const { camera, gl } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const vy = useRef(0);
  /** The ladder currently being held, if any. */
  const climbing = useRef<Ladder | null>(null);
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

    /**
     * Walking, jumping, gravity, the loft's floor and the barn's ladder, in one pure step.
     *
     * Owner: "i want to be able to climb the ladder in the barn, basically by using w and d up and down
     * it as if we are continuing the walking mechanic just up and down the ladder." W is up, S is down —
     * D is strafe, and the ask itself says the walking mechanic continues, so it has to be the same two
     * keys. The whole integrator moved rather than only the ladder part, because the TRANSITIONS are
     * where the bugs live and a ladder-only helper would have left them in this untestable file. A test
     * asserts the pure version reproduces the old one frame-for-frame to nine decimals out on the meadow.
     */
    const moved = stepKeeper(
      {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
        vy: vy.current,
        onLadder: climbing.current,
      },
      { forward: f, strafe: s, yaw: yaw.current, jump: !!keys.current.Space },
      step,
    );
    camera.position.set(moved.x, moved.y, moved.z);
    vy.current = moved.vy;
    climbing.current = moved.onLadder;

    /* A keeper holding a ladder is held BY the ladder, and nothing else may move them. The barn's +X
       wall chain and the ladder's own circle both sit within a metre of the rungs and would walk a
       climbing child sideways off them in about four frames. */
    if (!moved.onLadder) {
      // Slimes are solid too: they slide rather than stick, and yield a little if you are inside one.
      pushOutOfSlimes(camera.position, KEEPER_RADIUS);
    }

    // Push out of anything solid. SOLIDS is a chain of small circles per structure rather than one
    // circle per building, so a child can walk up to a barn door instead of being stopped short of it,
    // and gate openings are deliberately left empty so every pen is walkable.
    if (!moved.onLadder)
    for (const solid of [...SOLIDS, ...STATION_SOLIDS, ...SHOP_SOLIDS, ...INTRO_SOLIDS, ...LOFT_SOLIDS]) {
      /* Some circles belong to one storey only, now the barn has two — including a gable infill that
         exists solely to stop a child on the loft walking out of the 65cm slot above the big doors and
         falling into the yard. Ignoring the band is always safe; see `Solid.eye` in world/plan.ts. */
      if (!solidBites(solid, camera.position.y)) continue;
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
    pose.x = camera.position.x;
    pose.z = camera.position.z;
    pose.yaw = yaw.current;

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
  roundLength,
}: {
  verbId: string;
  onDone: () => void;
  report: (live: LiveItem | null) => void;
  /** `correct` is null when the platform could not mark the response, which is not the same as wrong. */
  onAnswered: (n: number, correct: boolean | null) => void;
  roundLength: number;
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
    settleMs: 900,
    keeperId,
    // A visit asks exactly as many questions as the post has pips, so the lights and the round agree.
    roundLength,
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
    onAnswered(s.answered, s.lastCorrect);
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
      {/*
        * Named for the STYLE that turned up, not for the station.
        *
        * `verb` is the station's tier-1 verb, so the tide ledge captioned a weighing-bough question "The
        * tide-line" and the coat wall captioned a woven mat "Coaxing a coat" — a station serves its whole
        * battery now, so the station's own name is the wrong name three times out of four.
        *
        * Every title here is an in-world job and none of them says test, quiz, score or battery, which is
        * the whole point: a child is doing a thing the ranch needs, not sitting a section.
        */}
      <p className="bh-beat-title">{verbFor(s.serve.typeCode)?.title ?? verb?.title ?? 'Something to do'}</p>
      {/*
        * The verdict, shown only while the pick is settling and only when the platform actually marked it.
        *
        * Wording chosen to be about the answer and not about the child: "That's it" and "Not that one" name
        * the choice, where "Correct" and "Wrong" name the person who made it. A child meeting deliberately
        * above-grade material will read the second one four times a visit.
        *
        * `null` shows nothing at all. A response that could not be marked — too fast to be an attempt, or a
        * type whose scoring rule is unwritten — must not appear as a miss.
        */}
      {s.phase === 'settling' && s.lastCorrect !== null && (
        <p className={s.lastCorrect ? 'bh-verdict bh-verdict-yes' : 'bh-verdict bh-verdict-no'}>
          {s.lastCorrect ? "That's it" : 'Not that one'}
        </p>
      )}
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
      {/*
        * NO LABEL, AND NO COUNTER. This line used to read `{answered} of about 4 · {battery}`, so the
        * weighing bough announced itself as "Quantitative" over the child's head.
        *
        * Owner: "i think it's best if the tests/stations didn't have the 'quantitative,' 'verbal,'
        * 'nonverbal' label because these are supposed to be stealth screeners. the students aren't
        * supposed to know that they're being tested in these regards ... if anything, no label needs to
        * pop up."
        *
        * The battery name is the whole game given away: it is the name of a TEST SECTION, it is the one
        * piece of vocabulary that tells a child their answers are being sorted into abilities, and it
        * appeared on the one screen they cannot look away from.
        *
        * The count went with it rather than being kept. "0 of about 4" is a section length, which is the
        * same disclosure in weaker words, and it is also the kind of progress bar that makes a child rush
        * the last one — which corrupts the estimate this exists to produce. What remains above is the
        * verb's own in-world name, which is a job on a ranch and not a category of mind.
        */}
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

  /**
   * WHO IS IN THE WORLD. `slimes/keep.ts` owns it, so "one capture removes exactly one" is a property a
   * test can drive rather than a claim about a component inside a <Canvas>. Re-renders only when a slime
   * is added or removed; wandering never touches this.
   */
  const slimes = useHerd();

  const grant = useCallback((proposed: Fam) => {
    const battery = FAMILY_BATTERY[proposed];
    const pool = (Object.keys(FAMILY_BATTERY) as Fam[]).filter((f) => FAMILY_BATTERY[f] === battery);
    const family = pool.length ? pool[Math.floor(Math.random() * pool.length)]! : proposed;
    /**
     * IN FRONT OF THE CHILD, not in a pen chosen by array length.
     *
     * The cradle's hatchling is theatre — `stations/Cradle.tsx` says so in as many words — and it unmounts
     * when the animation ends. Putting the real slime in `PENS[prev.length % PENS.length]` meant a child
     * watched a creature come out of an egg and stop existing, while their reward stood as much as 14m
     * from the station, worst at the tide-line. Same defect the shop had, same fix. `grantSlime` runs
     * `placeSlime`, so it is always somewhere they can walk to.
     */
    const ahead = 1.8;
    grantSlime(family, {
      x: pose.x - Math.sin(pose.yaw) * ahead,
      z: pose.z - Math.cos(pose.yaw) * ahead,
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
            /**
             * SPAT OUT IN FRONT OF THE CHILD, not at a fixed spot on the map.
             *
             * It used to land at the hard-coded (-2.5, -11.6), a point chosen to be just outside the
             * stall. The owner bought a slime and it "disappears" — and a fixed drop point is exactly
             * how that happens without anything being broken: it does not know where the child is
             * standing or which way they are facing, so depending on how they walked up, their new
             * slime is behind them, behind the counter, or off to one side while they are looking at
             * the shelf. A creature you paid for and never saw is a lost creature.
             *
             * 1.8m along the facing vector puts it clear of the keeper's own 0.45m radius and inside
             * the near clip, so it lands in view wherever they are. `placeSlime` still runs on mount,
             * so if that spot is inside the stall or off the walkable ranch it resolves to the nearest
             * reachable ground rather than vanishing.
             */
            if (!spend(PRICES[family] ?? 5)) return;
            const ahead = 1.8;
            /* `grantSlime`, not `putSlime`: a purchase has no held record behind it, and `putSlime` shifts
               the tank's FIFO — so buying a family you were already carrying handed you your OWN slime and
               left the tank still claiming to hold it, turning your next plop into an invented tuffet two
               stages smaller. */
            grantSlime(family, {
              x: pose.x - Math.sin(pose.yaw) * ahead,
              z: pose.z - Math.cos(pose.yaw) * ahead,
            });
            audio.plop?.();
          }}
        />
        <Vacpack
          enabled={locked && !engaged && !shopOpen && !boardEngaged}
          onCapture={(id) => {
            audio.squish();
            /* BY IDENTITY. The trace carries the slime's own uid now, so a capture cannot take the wrong
               one — which is what made one slime look like four, and silently destroyed an innocent slime
               elsewhere to pay for each copy. See `slimes/keep.ts`. */
            const t = capturedTrace(id);
            if (t) takeSlime(t);
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
        <IntroGuide
          busy={!!engaged || shopOpen}
          onEarn={() => setFlight((f) => f + 1)}
          /**
           * RE-PUBLISH THE COLLIDERS WHEN THE PADDOCK OPENS, and this is load-bearing.
           *
           * `setRanchSolids` above SPREADS `INTRO_SOLIDS` once at module scope — a snapshot of a world in
           * which the barricade still stands. The keeper is unaffected because its own sweep re-spreads
           * the arrays every frame, but `slimes/ground.ts` keeps the stale copy, and that copy is what
           * decides where a slime may be put down.
           *
           * Measured against the running game with the gate open: `findable(10.5, 18.5)` was still false,
           * and a slime plopped at the paddock's centre was relocated to (13.4, 21.8) — OUTSIDE the fence.
           * So the reward for finishing the board would have been a pen a child can walk into and cannot
           * put anything in, which is worse than no reward. Re-running the identical call fixes it.
           *
           * If the options on the call above ever change, both must match.
           */
          onComplete={() =>
            setRanchSolids([...SOLIDS, ...STATION_SOLIDS, ...SHOP_SOLIDS, ...INTRO_SOLIDS], {
              worldRadius: BOUND,
              from: [0, 8],
            })
          }
        />
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
            roundLength={PIPS}
            onAnswered={(n, correct) => {
              if (n <= paidFor.current) return;
              paidFor.current = n;
              /**
               * Every answer pays; a correct one pays double. An unmarked response pays the base rate rather
               * than nothing, because the child took their turn and the platform's inability to score it is
               * not theirs to be charged for.
               */
              earn(correct === true ? EARN.perAnswer + EARN.correctBonus : EARN.perAnswer);
              if (correct === true) audio.right?.();
              else if (correct === false) audio.wrong?.();
              else audio.coin?.();
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
