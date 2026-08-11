import { useFrame, useThree, type ComputeFunction } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from 'react';
import { Raycaster, Vector2, Vector3, type Group } from 'three';

import { toRef } from '../../shared/ItemStage';
import type { Battery } from '../../shared/batteries';
import { useSortie } from '../../shared/useSortie';
import { useAudio } from '../audio';
import { EARN, earn } from '../economy';
import { IN_WORLD } from '../screener/inWorld';
import { PressBadge, Reticle, StandMark, Wisp } from '../stations/Beacon';
import { Bay, Emblem, Lanterns } from '../stations/carpentry';
import { fitScale } from '../stations/sites';
import { usePrefersReducedMotion } from '../world/motion';
import { keeperId } from './keeper';
import { Gate } from './Paddock';
import {
  answeredOne,
  beginRun,
  blank,
  canDraw,
  legBattery,
  legOver,
  presenting,
  tick,
  typesForBoardLeg,
  watchFrom,
  type Run,
} from './run';
import {
  AS_SITE,
  BAY,
  BOARD_AT,
  BOARD_ITEMS,
  BOARD_YAW,
  FACING_DOT,
  LEGS,
  REACH,
  dockPoint,
  facing,
  openGate,
} from './site';
import { BOARD_QUIET, CLOSING } from './tutorial';
import { announceBoard, publishBoard, tourSettled } from './store';

/**
 * THE CHALLENGE BOARD.
 *
 * ══ WHAT IT IS ════════════════════════════════════════════════════════════════════════════════════
 *
 * A station in every mechanical respect — walk up, press E, aim by looking, press E again to leave —
 * built out of the stations' own joinery and their own invitation cues, standing across the back
 * paddock's gateway. What is different is only what it serves: eight items spread 3/2/3 across all three
 * batteries instead of a short single-battery round, and a gate that opens at the end of it.
 *
 * ══ IT GOES THROUGH `/sanctuary/chunk`, LIKE A STATION, AND THAT IS NOT OPTIONAL ══════════════════
 *
 * `useSortie({ steered: true })` is the only correct way to open a session in this game and there are
 * now three separate reasons, any one of which would be sufficient:
 *
 *   THE BASELINE HAS TO LAND IN THE SAME LEDGER. `server-plugin.ts` records every attempt under the
 *   keeper id and folds each closed chunk into that battery's running estimate. A board that opened its
 *   own qbank session would produce eight answers that no report can see.
 *
 *   THE DIFFICULTY HAS TO BE STEERED. The engine does not adapt on its own — measured, and written up in
 *   that file's header: at a fixed threshold the served sequence is byte-identical for an all-right and
 *   an all-wrong walk. The threshold is the whole lever and it lives server-side.
 *
 *   THE POOL GATE. Ten of `VER-SORTBOT-01`'s thirty-seven small-band items cannot honestly be answered
 *   from the pictures, and `server-plugin.ts` removes them with `excludeItemIds` BEFORE selection. On
 *   five of those the item inverts: a child reasoning correctly from what is on screen picks the trap and
 *   is recorded as unable. Creating a session directly would bypass that gate silently — the board would
 *   work, the items would draw, and the baseline would be quietly poisoned on the one style where it
 *   matters most. Everything about this file's session handling exists to stay on that route.
 *
 * ══ NOTHING HERE KNOWS WHETHER ANYTHING WAS RIGHT ═════════════════════════════════════════════════
 *
 * `useSortie` deletes `correct` before returning, so there is nothing to branch on. Coins are paid per
 * question ANSWERED, the gate opens for having worked through the board rather than for having done well
 * at it, and Nan's closing line is the same line whatever happened. That is deliberate at every level
 * and it is the property that keeps the measurement worth having.
 */

/** Screen centre, in normalised device coordinates. The crosshair, and the only pointer this file uses. */
const CENTRE = new Vector2(0, 0);

/**
 * THE PRESENTATIONS COME FROM `screener/inWorld.ts` AND THIS FILE NO LONGER KEEPS A LIST.
 *
 * There was a table here, and it was a fourth copy of one that already exists, and it was stale — it named
 * `VER-SEQUENCE-01`, which the battery audit retired and the engine will never serve again, and it had
 * never heard of `VER-RELPAIR-01`, the kinship stone, which is half of what the Verbal leg is served. So
 * two items in eight landed on a type this file could not draw, the board fell through to its idle emblem,
 * and the sequence stopped dead in the middle with nothing on screen to press and nothing in the console.
 * That is the owner's "i finished the series of questions and nothing unlocked", and it was measured: a
 * board driven end to end reached item 4 of 8, was served `VER-RELPAIR-01`, and never moved again.
 *
 * `inWorld.ts`'s own header records the same bug happening at the stations, for the same reason, and gives
 * the same remedy: ONE table, imported, never copied. `run.ts` asks it whether a type can be drawn, and
 * `run.test.ts` asserts the board's servable set is a subset of it, so this cannot come back quietly.
 */

interface LiveItem {
  serve: NonNullable<ReturnType<typeof useSortie>['serve']>;
  asking: boolean;
  answer: ReturnType<typeof useSortie>['answer'];
}

/**
 * Tell the server a chunk is over.
 *
 * `useSortie` does this itself when a session closes ITSELF, which is the only way a station ever ends.
 * This board ends its legs early on purpose — three items, then two, then three — so the close has to be
 * sent by hand or the posterior is never harvested, the attempts never reach the ledger, and the items
 * are never added to the keeper's seen list, which would let tomorrow's visit re-serve today's questions
 * and double-count them.
 *
 * Fire and forget, for the reason that file gives about the same call: this fires at the moment a child
 * sees the boards come off the gate, and a failed piece of housekeeping must never hold that up.
 */
function closeChunk(sessionId: string | null): void {
  if (!sessionId) return;
  void fetch('/sanctuary/close', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  }).catch(() => {});
}

/**
 * One battery's worth of the board.
 *
 * Mounted with a key of its own index, so moving to the next battery is a remount and there is no
 * session state to carry over. It reports each answer upward and says when its quota is met.
 */
function Leg({
  battery,
  quota,
  report,
  onSession,
  onAnswered,
  onLegDone,
}: {
  battery: Battery;
  quota: number;
  report: (live: LiveItem | null) => void;
  /** The session this leg opened, so the board can close it if the child walks off mid-leg. */
  onSession: (sessionId: string | null) => void;
  onAnswered: () => void;
  onLegDone: () => void;
}): JSX.Element | null {
  const id = useMemo(() => keeperId(), []);
  /**
   * DRAWABLE STYLES ONLY, which is where the stall is stopped at its source rather than caught downstream.
   *
   * `/sanctuary/chunk` builds the pool from exactly the types it is handed, so a type this board cannot
   * draw is best dealt with by not asking for it. The guard in `ChallengeBoard` and the watchdog in `run.ts`
   * are still there — a pool can drift, and a presentation can exist and refuse to draw a particular item —
   * but with this they should never have anything to do.
   */
  const types = useMemo(() => typesForBoardLeg(battery), [battery]);
  const s = useSortie({
    battery,
    types,
    // Ignored while steered — the server picks from its own record. Kept because the option is required
    // and because the measurement harness drives the same hook unsteered.
    threshold: -1.5,
    precisionIndex: 0,
    settleMs: 900,
    steered: true,
    keeperId: id,
  });

  const counted = useRef(0);
  const finished = useRef(false);
  /**
   * The one timer that says this leg is over, held in a ref rather than cleared by its own effect.
   *
   * IT USED TO BE CANCELLABLE BY THE CHILD, which was a second way to stall the board. The completion
   * timeout was returned as the cleanup of the `[s.answered]` effect, so an answer landing inside its 950ms
   * window — the session keeps serving past the quota until the chunk is closed, so one is reachable —
   * cleared the timer, and `finished` was already true so no new one was armed. `onLegDone` was then never
   * called by anybody. Rare, silent, and exactly the shape of the bug this whole file is being fixed for.
   */
  const over = useRef(0);
  useEffect(() => () => window.clearTimeout(over.current), []);

  useEffect(() => {
    void s.open();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    onSession(s.sessionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.sessionId]);

  /** Each answer, once. `answered` only ever goes up, so this cannot double-count a re-render. */
  useEffect(() => {
    if (s.answered <= counted.current) return;
    counted.current = s.answered;
    onAnswered();
    if (s.answered >= quota && !finished.current) {
      finished.current = true;
      // After the settle, so the last choice is seen to land before the panel changes battery.
      over.current = window.setTimeout(() => {
        closeChunk(s.sessionId);
        onLegDone();
      }, 950);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.answered]);

  /**
   * The session closed itself first.
   *
   * It should not — the Taster precision step has a floor of four items and no leg asks for more than
   * three — but a bank that runs out of unseen items for a returning child will end a leg short, and the
   * board has to move on rather than sit on a closed session. `useSortie` has already sent the close in
   * this branch, so this one only advances.
   */
  useEffect(() => {
    if (s.phase !== 'closed' || finished.current) return;
    finished.current = true;
    onLegDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.phase]);

  /**
   * The one failure a child can see.
   *
   * If the API is down the leg cannot serve anything, and the correct behaviour is to move on rather than
   * to leave a child looking at an empty frame with nothing to press. What happens after all three legs
   * have moved on that way is decided in `ChallengeBoard`: a board that produced no answers at all is put
   * back rather than counted, so an outage costs the child a couple of minutes and costs the screening
   * nothing.
   */
  useEffect(() => {
    if (s.phase !== 'error' || finished.current) return;
    finished.current = true;
    over.current = window.setTimeout(onLegDone, 1400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.phase]);

  useEffect(() => {
    report(s.serve ? { serve: s.serve, asking: s.phase === 'asking', answer: s.answer } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.serve, s.phase]);

  useEffect(() => () => report(null), [report]);

  return null;
}

export function ChallengeBoard({
  /** True while a station or the stall has the child, so the board never offers itself at the same time. */
  busy,
  /** Whether the gate is already open, from a previous visit. */
  alreadyTaken,
  onEarn,
  onComplete,
}: {
  busy: boolean;
  alreadyTaken: boolean;
  onEarn?: () => void;
  onComplete?: (summary: { answered: number; perBattery: Record<string, number> }) => void;
}): JSX.Element {
  const reduced = usePrefersReducedMotion();
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const setEvents = useThree((s) => s.setEvents);
  const events = useThree((s) => s.events);
  const audio = useAudio();

  const [near, setNear] = useState(false);
  const [engaged, setEngaged] = useState(false);
  const [hot, setHot] = useState(false);
  const [live, setLive] = useState<LiveItem | null>(null);
  /** The whole of where this board has got to. See `run.ts`: finishing it and opening the gate are one act. */
  const [run, setRun] = useState<Run>(() => beginRun(performance.now()));
  /** Whether the child has ever pressed E here. Drives the battens, and never goes back to false. */
  const [touched, setTouched] = useState(false);

  const panel = useRef<Group>(null);
  const ray = useRef(new Raycaster());
  const forward = useRef(new Vector3());
  const target = useRef(new Vector3());
  const told = useRef(false);

  const leg = run.leg;
  const answered = run.answered;
  const unlocked = alreadyTaken || run.outcome === 'unlocked';
  const done = unlocked;
  const active = LEGS[Math.min(leg, LEGS.length - 1)];

  /** The gate was already open when we arrived. Take the barricade out before the first frame. */
  useEffect(() => {
    if (alreadyTaken) openGate();
  }, [alreadyTaken]);

  /* ---------------------------------------------------------------- *\
     Proximity
  \* ---------------------------------------------------------------- */

  /**
   * Whether the board is on offer: within reach, on the FRONT of it, and looking roughly at it.
   *
   * The same three conditions and the same forgiving 56° as `stations/Stations.tsx`, because a child is
   * being asked to learn exactly one thing — walk up to a glowing thing and press E — and a fourth
   * variant of that rule would be a fourth thing to learn.
   */
  useFrame(() => {
    if (engaged || busy || done) {
      if (near) setNear(false);
      return;
    }
    const dx = BOARD_AT[0] - camera.position.x;
    const dz = BOARD_AT[2] - camera.position.z;
    const d = Math.hypot(dx, dz);
    let offer = false;
    if (d > 0.3 && d <= REACH) {
      const f = facing();
      // (keeper - board) · facing > 0: standing in front of the hoarding, not inside the paddock.
      if (-(dx * f[0] + dz * f[1]) > 0.25) {
        camera.getWorldDirection(forward.current);
        const flat = Math.hypot(forward.current.x, forward.current.z) || 1;
        offer = (forward.current.x * dx + forward.current.z * dz) / (flat * d) >= FACING_DOT;
      }
    }
    if (offer !== near) setNear(offer);
  });

  /* ---------------------------------------------------------------- *\
     Looking is aiming
  \* ---------------------------------------------------------------- */

  /**
   * R3F's pointer, moved to the centre of the screen for as long as the board is engaged.
   *
   * Verbatim in mechanism from `stations/Stations.tsx`, which explains it at length: under pointer lock
   * the OS cursor is frozen wherever it was when the lock was taken, so the default `compute` — which
   * reads `event.offsetX/offsetY` — raycasts into the same wrong place every time. Swapping it makes
   * every pointer event a crosshair event, so the child aims by looking exactly as they aim to walk, and
   * Escape is never on the path to answering anything.
   *
   * The stations and the shop swap the same function. None of the three can be engaged at once — this
   * board is 17m from the nearest of them and `busy` covers the rest — so there is no contest over it.
   */
  const original = useRef<ComputeFunction | undefined>(undefined);
  const captured = useRef(false);
  if (!captured.current) {
    original.current = events.compute;
    captured.current = true;
  }

  const crosshair = useCallback<ComputeFunction>((_event, state) => {
    state.pointer.set(0, 0);
    state.raycaster.setFromCamera(CENTRE, state.camera);
  }, []);

  useEffect(() => {
    const restore = original.current;
    if (engaged) setEvents({ compute: crosshair });
    else if (restore) setEvents({ compute: restore });
    return () => {
      if (restore) setEvents({ compute: restore });
    };
  }, [engaged, setEvents, crosshair]);

  /** Is the crosshair on something choosable? One raycast a frame; the hit volumes are invisible. */
  useFrame(() => {
    if (!engaged || !panel.current) {
      if (hot) setHot(false);
      return;
    }
    ray.current.setFromCamera(CENTRE, camera);
    const next = ray.current.intersectObject(panel.current, true).length > 0;
    if (next !== hot) setHot(next);
  });

  /* ---------------------------------------------------------------- *\
     Keys
  \* ---------------------------------------------------------------- */

  /**
   * Leaving, from whichever of the three routes got there.
   *
   * The part that matters is the close: a leg abandoned half-way has real answers recorded against a
   * session the server still believes is open, and without this they never reach the ledger and the
   * items never join the keeper's seen list — so tomorrow's visit would re-serve today's questions and
   * the estimate would count them twice. `leg` and `answered` are kept, so coming back resumes at the
   * battery they were on rather than starting the board again.
   */
  const sessionOfLeg = useRef<string | null>(null);
  const leave = useCallback(() => {
    setEngaged(false);
    setLive(null);
    closeChunk(sessionOfLeg.current);
    sessionOfLeg.current = null;
  }, []);

  /**
   * E to go in, E again or Escape to come out. E ONLY, and never Space.
   *
   * Space jumps and does nothing else anywhere in this game. The owner ruled on that and the reasoning is
   * in `stations/Stations.tsx`: a key that means three different things depending on where you are
   * standing is not a shortcut, it is a trap. Enter is accepted while engaged purely as a keyboard route
   * to the choice under the crosshair, dispatched as a real click so it travels the identical path.
   */
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.repeat) return;
      if (engaged) {
        if (e.code === 'KeyE' || e.code === 'Escape') {
          leave();
          return;
        }
        if (e.code === 'Enter' || e.code === 'NumpadEnter') {
          e.preventDefault();
          gl.domElement.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        }
        return;
      }
      if (!near || busy || done) return;
      if (e.code === 'KeyE') {
        e.preventDefault();
        setEngaged(true);
        setTouched(true);
        // The leg's patience starts NOW, not when this component mounted. See `watchFrom`.
        setRun((r) => watchFrom(r, performance.now()));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engaged, near, busy, done, gl, leave]);

  /**
   * Escape also releases pointer lock, which no page can prevent. Caught from the other side so a child
   * who finds it leaves the board cleanly rather than ending up locked out of a panel that is still up.
   * Only armed if the lock was held on entering: engaged-without-a-lock is legitimate — a screenshot, or
   * a child who has not clicked in yet — and must not self-close.
   */
  useEffect(() => {
    if (!engaged) return;
    if (!document.pointerLockElement) return;
    const onChange = (): void => {
      if (!document.pointerLockElement) leave();
    };
    document.addEventListener('pointerlockchange', onChange);
    return () => document.removeEventListener('pointerlockchange', onChange);
  }, [engaged, leave]);

  /* ---------------------------------------------------------------- *\
     Docking
  \* ---------------------------------------------------------------- */

  /**
   * While engaged, hold the keeper on the standing mark. POSITION ONLY — the keeper controller keeps
   * writing `camera.rotation` from the mouse every frame, which is exactly what is wanted, and touching
   * the rotation here would fight it to a locked stare.
   */
  useFrame((_, dt) => {
    if (!engaged) return;
    const p = dockPoint();
    target.current.set(p[0], p[1], p[2]);
    camera.position.lerp(target.current, 1 - Math.exp(-5 * dt));
  });

  /* ---------------------------------------------------------------- *\
     Working through it
  \* ---------------------------------------------------------------- */

  const handleAnswered = useCallback(() => {
    setRun((r) => answeredOne(r, performance.now()));
    // Paid for having answered, never for having answered correctly — see `economy/coins.ts`, which
    // argues it at length, and note that there is nothing here to branch on even if it did not.
    earn(EARN.perAnswer);
    onEarn?.();
  }, [onEarn]);

  const handleLegDone = useCallback(() => {
    setLive(null);
    sessionOfLeg.current = null;
    setRun((r) => legOver(r, performance.now()));
  }, []);

  /* ---------------------------------------------------------------- *\
     Nothing to press
  \* ---------------------------------------------------------------- */

  const mounted = useMemo(() => {
    if (!live) return null;
    const Presentation = IN_WORLD[live.serve.typeCode];
    if (!Presentation) return null;
    const content = live.serve.served.content;
    return { Presentation, content, scale: fitScale(live.serve.typeCode, content), itemId: live.serve.served.itemId };
  }, [live]);

  /**
   * A SERVED ITEM WITH NO PRESENTATION ENDS THE LEG, LOUDLY.
   *
   * It should be unreachable: a leg only ever asks for types the board can draw (`typesForBoardLeg`) and two
   * tests assert the two sets are the same set. It is here because the thing it guards against has already
   * happened once, and when it happened it was completely silent — a missing key in a lookup table is an
   * absence rather than an error, so the board hung its idle emblem and no console anywhere said a word.
   * Whatever comes next, it will not be that: the leg resolves, so the run cannot stall, and the reason is
   * printed with the type code in it so the next person to look does not have to drive a browser to find out.
   */
  useEffect(() => {
    if (!live || !engaged) return;
    const typeCode = live.serve.typeCode;
    if (canDraw(typeCode)) return;
    console.error(
      `[challenge board] ${typeCode} was served on the ${legBattery(run) ?? '?'} leg and nothing in ` +
        `screener/inWorld.ts draws it. Ending the leg rather than holding the child at a blank board. ` +
        `Register a presentation there, or withdraw the type in shared/batteries.ts.`,
    );
    closeChunk(sessionOfLeg.current);
    handleLegDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, engaged]);

  /**
   * The patience clock: running only while there is nothing on the board a child could press.
   *
   * Between the two of these, `run.ts` knows whether the board is showing anything, and its watchdog ends a
   * leg that has gone quiet — an empty pool, a dead fetch, a session that opened and never served.
   */
  useEffect(() => {
    if (!engaged) return;
    const now = performance.now();
    setRun((r) => (mounted ? presenting(r, now) : blank(r, now)));
  }, [engaged, mounted]);

  const ticked = useRef(0);
  useFrame(() => {
    if (!engaged) return;
    const now = performance.now();
    if (now - ticked.current < 250) return;
    ticked.current = now;
    setRun((r) => tick(r, now));
  });

  /* ---------------------------------------------------------------- *\
     The end of it
  \* ---------------------------------------------------------------- */

  /**
   * WORKED THROUGH. The gate is already open and the flag already written — `run.ts` does both inside the
   * transition that produced this outcome, so there is no ordering here that could go wrong. What is left is
   * everything a CHILD is owed for having finished, and the owner's report is the reason there is a list:
   * they finished and saw nothing.
   *
   *   The gate itself, which `Gate` animates off `unlocked`: eleven planks let go from the middle outward,
   *   the leaf swings 72°, the lantern on the far post lights. The keeper is held on the mark for 2.8s
   *   afterwards so the thing they unlocked is the thing they are looking at.
   *   The hatch sound, which is the one sound in `audio/` that means a thing has opened.
   *   Nan's closing line — spoken, not merely written, and see `announceBoard` for the case this file has to
   *   cover itself: a keeper who has seen the tour before has a SETTLED tour, and a settled tour has no step
   *   left to carry the line. That is every returning child, and it was silence.
   *   The coins, which fly because `Game.tsx` passes `onEarn`.
   */
  useEffect(() => {
    if (run.outcome !== 'unlocked' || told.current) return;
    told.current = true;
    earn(EARN.perRound);
    onEarn?.();
    // Optional in the audio API, and a game with no sound must still open its gate.
    audio.hatch?.();
    if (tourSettled()) announceBoard(CLOSING);
    // Long enough for the boards to fall and the leaf to swing before the keeper is let go.
    window.setTimeout(() => {
      setEngaged(false);
      setLive(null);
    }, 2800);
    onComplete?.({ answered: run.answered, perBattery: { ...run.perBattery } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.outcome]);

  /**
   * PUT BACK: three legs ran and not one question was answered, so the API is down or the banks are empty.
   *
   * Nothing is persisted and nothing opens — see `Outcome` in `run.ts` for why that is the right trade — but
   * the child is not sent away with silence either, because from where they are standing they did everything
   * they were asked. Nan says so, the keeper is released, and the board is put back exactly as it was so it
   * can be tried again.
   */
  useEffect(() => {
    if (run.outcome !== 'put-back') return;
    setEngaged(false);
    setLive(null);
    announceBoard(BOARD_QUIET);
    setRun(beginRun(performance.now()));
  }, [run.outcome]);

  /* ---------------------------------------------------------------- *\
     Telling everyone else
  \* ---------------------------------------------------------------- */

  useEffect(() => {
    publishBoard({
      boardEngaged: engaged,
      boardAt: engaged ? Math.min(answered + 1, BOARD_ITEMS) : 0,
      boardOf: engaged ? BOARD_ITEMS : 0,
      boardSpeaking: engaged && !done && active?.battery === 'Verbal',
      unlocked,
    });
  }, [engaged, answered, done, active, unlocked]);

  /** Nothing may be left holding the keeper if this unmounts mid-question. */
  useEffect(
    () => () => {
      publishBoard({ boardEngaged: false, boardSpeaking: false, boardAt: 0, boardOf: 0 });
    },
    [],
  );

  const handlePick = useCallback((item: LiveItem, content: Record<string, unknown>, handed: string): void => {
    void item.answer(toRef(content, handed));
  }, []);

  const lit = engaged || near ? 1 : 0;
  const showPanel = engaged && mounted !== null;

  return (
    <group>
      <group position={[BOARD_AT[0], BOARD_AT[1], BOARD_AT[2]]} rotation={[0, BOARD_YAW, 0]}>
        <Bay site={AS_SITE} lit={lit} />
        <Lanterns site={AS_SITE} lit={lit} reduced={reduced} />
        {/*
          The battens come off on the first press of E — see `Gate`. `touched` rather than `engaged`, so
          they do not go back on if the child steps away half-way through: nothing in this game undoes
          something a child has already done.
        */}
        <Gate open={unlocked ? 1 : 0} unboarded={touched || unlocked ? 1 : 0} bay={BAY} reduced={reduced} />

        {/* The stations' own invitation, so this reads as one more of the same kind of thing. The wisp is
            hung only while the board still has something to give: once the paddock is open there is
            nothing here to be called over to. */}
        {done ? null : <StandMark site={AS_SITE} lit={lit} reduced={reduced} />}
        {done ? null : <Wisp site={AS_SITE} lit={lit} reduced={reduced} />}

        {/*
          The emblem hangs whenever nothing is being asked — including the second or two while the first
          item of a leg is on its way, so the board is never blank.

          It comes down for good once the paddock is open, and that is deliberate rather than tidiness:
          the emblem's whole grammar is a row with the last place EMPTY and breathing honey light, which
          in this world means "something goes here". Leaving it up on a board with nothing left to give
          would be pointing a child at a job that no longer exists.
        */}
        {showPanel || unlocked ? null : <Emblem site={AS_SITE} reduced={reduced} />}

        {lit === 1 && !engaged ? (
          <group position={[0, -1.5, 2.0]}>
            <PressBadge site={AS_SITE} reduced={reduced} />
          </group>
        ) : null}

        {showPanel && mounted && live ? (
          <>
            {/* One soft lamp on the panel. This board faces south-west and spends the late afternoon
                looking away from the sun; an item a child is being asked to look at may not be the
                darkest thing on screen. */}
            <pointLight position={[0, 0.5, 2.4]} intensity={16} distance={9} color="#fff4de" />
            <group ref={panel} scale={mounted.scale}>
              <mounted.Presentation
                // Keyed on the item, so the presentation remounts per question. Without this its internal
                // `picked` state survives into the next item and every further choice is swallowed.
                key={mounted.itemId}
                content={mounted.content}
                disabled={!live.asking}
                onPick={(handed: string) => handlePick(live, mounted.content, handed)}
              />
            </group>
          </>
        ) : null}
      </group>

      {engaged && !done && active ? (
        <Leg
          key={leg}
          battery={active.battery}
          quota={active.quota}
          report={setLive}
          onSession={(id) => {
            sessionOfLeg.current = id;
          }}
          onAnswered={handleAnswered}
          onLegDone={handleLegDone}
        />
      ) : null}

      {engaged ? <Reticle hot={hot} /> : null}
    </group>
  );
}
