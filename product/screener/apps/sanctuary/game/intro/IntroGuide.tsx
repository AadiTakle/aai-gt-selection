import { useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from 'react';

import { SHOP_AT, SHOP_YAW, balance, earn, shopDockPoint } from '../economy';
import { useVacpackTank } from '../vacpack';
import { usePrefersReducedMotion } from '../world/motion';
import { ChallengeBoard } from './Board';
import { boardTaken, introSeen, markIntroSeen } from './keeper';
import { PaddockFence } from './Paddock';
import { skipRequests } from './signals';
import { dockPoint, insideAPen, nearestPen } from './site';
import { introQuiet, introUnlocked, publishBusy, publishTutorial } from './store';
import { NO_SIGNALS, advance, begin, skip, type Mark, type Signals, type Tutorial } from './tutorial';
import { Waypoint } from './Waypoint';

/**
 * THE TOUR, RUNNING.
 *
 * ══ WHAT IT WATCHES, AND WHY IT ASKS THE WORLD RATHER THAN BEING TOLD ═════════════════════════════
 *
 * Every signal below is read from something this directory can already see — the camera, the vacpack's
 * own tank, the purse — rather than plumbed in from `Game.tsx`. That is a deliberate limit on how much
 * of somebody else's file this feature costs to mount. The whole wiring is a component in the canvas, a
 * component outside it, one boolean passed in and one boolean read back; there is no callback to thread
 * through `onBuy`, no counter to hoist, and nothing in `Game.tsx` that has to know a tutorial exists
 * beyond where to put it.
 *
 * The one thing that cannot be observed from here is whether a STATION or the STALL currently has the
 * child, because both of those live in flags `Game.tsx` owns. That arrives as `busy`, and it is honest
 * to pass it explicitly: guessing it from the camera sitting near a known standing spot would work most
 * of the time and be wrong in exactly the case that matters, which is a child standing still.
 *
 * ══ SIGNALS ARE LATCHED HERE, NOT IN THE MACHINE ══════════════════════════════════════════════════
 *
 * `tutorial.ts` takes "has this ever happened" and is pure. Turning a frame-by-frame world into that is
 * this file's job: distances become "has been near", a tank that went up becomes "has carried", a purse
 * that went down becomes "has bought". Latching also means a child who does things in the wrong order is
 * never asked to do them again — see the note on `Signals` in that file.
 */

/** How far the child has to have turned, in radians of accumulated yaw, to have looked around. */
const LOOKED_RADIANS = 2.2;
/** And how far they have to have walked from where they arrived. */
const WALKED_METRES = 8;
/** How near the stall's standing mark counts as having reached it. */
const AT_SHOP_METRES = 6;

/**
 * THE TOUR DOES NOT START UNTIL THE CHILD IS ACTUALLY IN THE GAME, and the reason is two problems that
 * turn out to have one fix.
 *
 * `Game.tsx` opens with a button — "Click to look around · WASD to walk" — and until it is pressed the
 * page has had no user gesture and the keeper has no pointer lock. Both matter:
 *
 *   NOTHING CAN BE HEARD. Every browser refuses `speechSynthesis` before a gesture. Nan's greeting is her
 *   introduction and her longest line, and starting it into a muted tab means the one child in the room
 *   who cannot read the caption gets nothing at all from it.
 *
 *   NOTHING CAN BE DONE. "Move your mouse and turn your head" is not an instruction that can be followed
 *   without the lock, so its timer would be running against a child who is not yet able to obey it.
 *
 * So the clock starts on the first pointer lock. The fallback is there because a lock is not guaranteed —
 * a preview, a screenshot, a browser that refuses it — and a guide that waits forever for a permission it
 * may never get is exactly the kind of silent nothing this whole feature is written to avoid.
 */
const START_AFTER_MS = 20000;

/**
 * What Nan puts in the till.
 *
 * NOT FLAVOUR — see the note on the `shop` step in `tutorial.ts`. The purse starts at zero and the
 * cheapest slime costs two, so without this the buying step is an instruction a new child physically
 * cannot carry out, which is the exact shape of trap this whole feature is written to avoid. Five buys
 * any everyday family and most of the treats, and leaves the gold one still worth saving for.
 *
 * Given once, at the step that needs it, and only during a live tour: `earn` cannot be handed a negative
 * number, so there is no way for this to become a thing that takes coins away.
 */
const NEST_EGG = 5;

/**
 * THE TOUR'S CLOCK STOPS WHILE SHE CANNOT SPEAK, and this is the difference between deferring a line and
 * losing it.
 *
 * `IntroPortrait` holds a line back while `quiet` and says it when quiet lifts, which is correct as far as
 * it goes — but it can only hold ONE, because all it has is the current `line` and the current `say`. If
 * the machine keeps ticking while a station has the child, then every line the tour produces in that
 * window overwrites the last one, and only the final survivor is ever spoken. Two minutes at the sorting
 * gate is enough to burn a nudge and a whole step: the child comes back, hears the step AFTER the one they
 * were on, and is never told the one they missed. It was on screen the whole time, dimmed, in text a
 * five-year-old cannot read — which is precisely the failure the voice exists to prevent, arriving by a
 * route that looks like it is working.
 *
 * Queueing the missed lines would be worse. They are instructions, they were about a moment that has now
 * passed, and reciting a backlog at a child who has walked somewhere else is noise.
 *
 * So the clock is paused instead. Every threshold in `tutorial.ts` — `nudgeMs`, `skipMs` — is measured
 * against a clock that only advances while Nan is actually able to be heard, so a step cannot expire and a
 * nudge cannot fire during a silence. Nothing is missed because nothing happens. It is also the honest
 * reading of what those timeouts mean: `skipMs` is "how long this child has been left on this step", and a
 * child working through a station has not been left on anything.
 *
 * `at` is stamped from the same clock, so the machine never sees the two disagree.
 */
function useAttentionClock(): () => number {
  const spentQuiet = useRef(0);
  const quietSince = useRef<number | null>(null);
  return useCallback(() => {
    const now = performance.now();
    if (introQuiet()) {
      quietSince.current ??= now;
    } else if (quietSince.current !== null) {
      spentQuiet.current += now - quietSince.current;
      quietSince.current = null;
    }
    // While quiet, the clock is frozen at the instant it began rather than merely slowed.
    const frozen = quietSince.current === null ? 0 : now - quietSince.current;
    return now - spentQuiet.current - frozen;
  }, []);
}

export function IntroGuide({
  busy,
  onEarn,
  onComplete,
}: {
  /** `!!engaged || shopOpen` from `Game.tsx`. See the header. */
  busy: boolean;
  /** Optional. `() => setFlight((f) => f + 1)`, so coins earned at the board fly like coins anywhere else. */
  onEarn?: () => void;
  /**
   * THE SEAM, and the thing that is deliberately not built behind it.
   *
   * Fires once, when the board has been worked through and the paddock is open. Whatever comes next —
   * the deed, an email address, a certificate for a parent — hangs here.
   *
   * NOTHING IS COLLECTED FROM THE CHILD ANYWHERE IN THIS DIRECTORY, and that is not an oversight. Taking
   * an email address from a child under 13 is a COPPA question rather than an engineering one and it
   * needs the owner's decision, not a component. The summary handed over is counts and nothing else: no
   * ability, no interval, no correctness — none of which exist on this side of the wire anyway.
   */
  onComplete?: (summary: { answered: number; perBattery: Record<string, number> }) => void;
}): JSX.Element {
  const camera = useThree((s) => s.camera);
  const reduced = usePrefersReducedMotion();
  const { held } = useVacpackTank();

  const seen = useMemo(() => introSeen(), []);
  const taken = useMemo(() => boardTaken(), []);

  const [tour, setTour] = useState<Tutorial>(() => begin(performance.now(), seen));
  const [markAt, setMarkAt] = useState<{ key: string; at: readonly [number, number] } | null>(null);

  const signals = useRef<Signals>(NO_SIGNALS);
  const spun = useRef(0);
  const lastYaw = useRef<number | null>(null);
  const origin = useRef<[number, number] | null>(null);
  const purse = useRef(balance());
  const heldWas = useRef(held.length);
  const gifted = useRef(false);
  const persisted = useRef(false);
  const sawSkips = useRef(skipRequests());
  const tickAt = useRef(0);
  const penMark = useRef<readonly [number, number] | null>(null);
  const mountedAt = useRef(performance.now());
  /** Whether the tour has begun. See `START_AFTER_MS`. */
  const started = useRef(false);
  /** The clock the machine is driven by, which stops while Nan cannot be heard. See `useAttentionClock`. */
  const attention = useAttentionClock();

  /** The stall's own front, where a bought slime lands, derived rather than copied from `Game.tsx`. */
  const stallFront = useMemo<[number, number]>(
    () => [SHOP_AT[0] + Math.sin(SHOP_YAW) * 1.9, SHOP_AT[2] + Math.cos(SHOP_YAW) * 1.9],
    [],
  );

  /* ---------------------------------------------------------------- *\
     Watching
  \* ---------------------------------------------------------------- */

  useFrame(() => {
    const now = performance.now();
    const s = signals.current;
    let next = s;

    const x = camera.position.x;
    const z = camera.position.z;
    if (!origin.current) origin.current = [x, z];

    // Turning. Only counted under pointer lock, because before the child has clicked in, the camera does
    // not move and a mouse that wanders across the page is not a child looking around.
    if (document.pointerLockElement) {
      const yaw = camera.rotation.y;
      if (lastYaw.current !== null) {
        let d = yaw - lastYaw.current;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        spun.current += Math.abs(d);
      }
      lastYaw.current = yaw;
    } else {
      lastYaw.current = null;
    }
    if (!next.looked && spun.current >= LOOKED_RADIANS) next = { ...next, looked: true };

    if (!next.walked && origin.current) {
      const d = Math.hypot(x - origin.current[0], z - origin.current[1]);
      if (d >= WALKED_METRES) next = { ...next, walked: true };
    }

    if (!next.atShop) {
      const p = shopDockPoint();
      if (Math.hypot(x - p[0], z - p[2]) <= AT_SHOP_METRES) next = { ...next, atShop: true };
    }

    // A purse that went DOWN. Only the stall spends coins, so a fall is a purchase and needs no callback
    // from the shop to say so.
    const coins = balance();
    if (coins < purse.current && !next.bought) next = { ...next, bought: true };
    purse.current = coins;

    // The tank going up is a capture; the tank going down while standing in a pen is a slime penned. The
    // vacpack shifts its tank at the moment of LAUNCH, so a fall is the release rather than the landing —
    // which is what makes the pen test read the child's position, not the slime's.
    if (held.length > heldWas.current && !next.carrying) next = { ...next, carrying: true };
    if (held.length < heldWas.current && !next.penned && insideAPen(x, z)) next = { ...next, penned: true };
    heldWas.current = held.length;

    // The board publishes its own unlock, so the tour learns about it the same way anything else would.
    if (!next.boardDone && introUnlocked()) next = { ...next, boardDone: true };

    if (next !== s) signals.current = next;

    /**
     * The machine's own clock, which is NOT `now`. Read every frame, including the frames this function
     * returns early on, because it is what accumulates the time spent quiet — see `useAttentionClock`.
     */
    const clock = attention();

    // Not yet. See `START_AFTER_MS`: the clock begins when the child is in the game, not when the page is.
    if (!started.current) {
      if (!document.pointerLockElement && now - mountedAt.current < START_AFTER_MS) return;
      started.current = true;
      setTour(begin(clock, seen));
      return;
    }

    // The machine itself, eight times a second. Every threshold in it is in seconds; running it per frame
    // would be a hundred and twenty identical calls for each one that could possibly change anything.
    if (now - tickAt.current < 120) return;
    tickAt.current = now;

    const asked = skipRequests();
    if (asked !== sawSkips.current) {
      sawSkips.current = asked;
      setTour((t) => skip(t, clock));
      return;
    }

    /**
     * Nothing while she cannot be heard.
     *
     * The clock is frozen anyway, so `advance` would return the same object on every tick and this is
     * mostly an assertion of intent — with one case where it is not. `boardDone` arriving while the board
     * still has the child would fire the closing line into a silence, and the closing line is the last
     * thing she ever says: there is no later step to carry it. Held here, it is said the moment the board
     * lets the child go, over the paddock gate they just opened, which is where it belongs.
     */
    if (introQuiet()) return;

    setTour((t) => advance(t, next, clock));
  });

  /* ---------------------------------------------------------------- *\
     Consequences
  \* ---------------------------------------------------------------- */

  useEffect(() => {
    // Nothing is on screen and nothing is said until the tour has actually begun. The frame loop flips
    // `started` and sets a fresh machine in the same tick, so this effect runs again immediately after.
    if (!started.current) return;
    publishTutorial(tour);

    if (tour.step === 'shop' && !gifted.current && !seen) {
      gifted.current = true;
      earn(NEST_EGG);
      onEarn?.();
    }

    // Persist the moment it settles, however it settled — completed, timed out or skipped. That is what
    // "it must not run twice" means in practice: not "once completed", but once SEEN.
    if (tour.settled && !persisted.current) {
      persisted.current = true;
      markIntroSeen();
    }
  }, [tour, seen, onEarn]);

  /**
   * Nan is silent while anything else has the child. See `quiet` in `store.ts`.
   *
   * Only half of it: this is the station-and-stall half, which is the half `Game.tsx` can see. The board's
   * own half is published by `Board` from its own `engaged`, and the store ORs the two — because neither
   * component can see the other's condition and a single shared field would have them cancelling each
   * other's silence.
   */
  useEffect(() => {
    publishBusy(busy);
  }, [busy]);

  /**
   * Where the light on the ground goes.
   *
   * Resolved here rather than in `tutorial.ts` because it depends on the ranch and on where the child is
   * standing, and that file is deliberately pure. Recomputed only when the mark CHANGES, so a marker
   * does not slide across the meadow as the child walks toward it.
   */
  useEffect(() => {
    const mark: Mark = tour.mark;
    if (mark === 'none') {
      setMarkAt(null);
      penMark.current = null;
      return;
    }
    const here: [number, number] = [camera.position.x, camera.position.z];
    let at: readonly [number, number];
    switch (mark) {
      case 'ahead':
        // A few metres down the worn track, which is the direction everything else in the tour lies in.
        at = [0.2, -1.0];
        break;
      case 'shop': {
        const p = shopDockPoint();
        at = [p[0], p[2]];
        break;
      }
      case 'slime':
        // Where the slime they just bought landed. If they never bought one — the step timed out, or
        // they were already carrying — point at the nearest pen instead, which is where the fifteen
        // slimes the ranch came with are. Pointing at an empty patch of gravel would be worse than
        // pointing at nothing.
        at = signals.current.bought ? stallFront : nearestPen(here[0], here[1]).centre;
        break;
      case 'pen': {
        // Captured once, on entering the step, so it does not hop to a different pen mid-walk.
        penMark.current ??= nearestPen(here[0], here[1]).centre;
        at = penMark.current;
        break;
      }
      case 'board': {
        const p = dockPoint();
        at = [p[0], p[2]];
        break;
      }
      default:
        at = here;
    }
    setMarkAt({ key: `${mark}-${at[0].toFixed(1)}-${at[1].toFixed(1)}`, at });
    // Only on a change of mark: `camera` is read imperatively and must not be a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour.mark, stallFront]);

  return (
    <group>
      <PaddockFence />
      <ChallengeBoard busy={busy} alreadyTaken={taken} onEarn={onEarn} onComplete={onComplete} />
      {markAt ? <Waypoint key={markAt.key} at={markAt.at} reduced={reduced} /> : null}
    </group>
  );
}
