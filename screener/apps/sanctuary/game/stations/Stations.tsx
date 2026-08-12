import { useFrame, useThree, type ComputeFunction } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type JSX } from 'react';
import { Raycaster, Vector2, Vector3, type Group } from 'three';

import { toRef } from '../../shared/ItemStage';
import type { Family } from '../contract';
import type { LiveItem } from '../Game';
import { IN_WORLD } from '../screener/inWorld';
import { PodWall } from '../screener/PodWall';
import { TideLine } from '../screener/TideLine';
import { usePrefersReducedMotion } from '../world/motion';
import { PressBadge, Reticle, StandMark, Wisp } from './Beacon';
import { Bay, CoatWallBase, DayLogBase, Emblem, Lanterns, TideLedgeBase } from './carpentry';
import { Cradle, hatchTiming } from './Cradle';
import { SITES, dockPoint, facingOf, fitScale, siteFor } from './sites';

export { STATION_SOLIDS } from './sites';

/**
 * THE THREE REASONING STATIONS, as things standing on the ranch.
 *
 * ══ WHAT THIS REPLACES, AND WHY ═══════════════════════════════════════════════════════════════════
 *
 * Three `.bh-call` buttons in the bottom corner of the screen. The owner's note on them is the entire
 * specification for this directory and all three of its criticisms were correct:
 *
 *   "i'm just a little confused how these relate to the game in any way. they are random side buttons
 *    that essentially mean nothing with no immediate benefit. you also have to press esc to click those
 *    which i don't think a child will understand those game mechanics so maybe it must be a physical
 *    thing on like an actual wall or something that you can come back to or answer and it gives you a
 *    slime or something?"
 *
 *   1. NOT PART OF THE WORLD. A button in the corner of the screen has no relationship to a ranch. Fixed
 *      by `sites.ts` and `carpentry.tsx`: each station is now built joinery standing at a place on the
 *      map — bolted to the barn's long wall, at a spring basin, on a felled trunk — with a lantern, a
 *      roof and a nest on a post beside it. A child finds them by walking around.
 *
 *   2. ESCAPE IS NOT A MECHANIC A FIVE-YEAR-OLD HAS. Fixed here, and it is the one genuinely technical
 *      thing in this file. Pointer lock is never released. Instead, for exactly as long as a station is
 *      engaged, R3F's `compute` is swapped for one that raycasts from the CENTRE OF THE SCREEN rather
 *      than from the operating system's cursor — which under pointer lock is frozen wherever it was when
 *      the lock was taken and is therefore useless. Every pointer event the canvas already receives
 *      (`pointermove` for hover, `click` for choosing; both still fire while locked) is then answered
 *      against whatever the child is LOOKING at. So aiming a choice is the same act as aiming a walk,
 *      the mouse in their hand still clicks, and Escape is not on the path.
 *
 *   3. NO BENEFIT. Fixed by `Cradle.tsx`: finishing a round hatches an egg and a new slime joins the
 *      ranch. It is earned by taking part and never by being right — see that file, which argues it at
 *      length, and the note on `handlePick` below.
 *
 * ══ WHAT `Game.tsx` HAS TO DO ════════════════════════════════════════════════════════════════════
 *
 * This component owns the stations and nothing else; the session layer stays where it is. The contract:
 *
 *   onEngage(verbId)  a child pressed E at a station. Open a round for that verb.
 *   onLeave()         a child left. Close the round. Nothing is kept and nothing is lost.
 *   engaged           which verbId is open, or null. Driven by the parent, read here.
 *   live              the current item, or null. This file mounts the presentation for it.
 *   onGrant(family)   a round finished. Add a slime of this family to the ranch, permanently.
 *
 * TWO THINGS THE KEEPER CONTROLLER MUST DO WHILE `engaged` IS SET, because this file cannot reach into
 * it and they are not optional:
 *
 *   - Its `locked` flag must be false, so WASD does not walk the child out of a question they are
 *     part-way through and so Space does not make them jump while they are choosing. Its mouse-look must
 *     keep running: aiming by looking IS the interaction.
 *   - Its old `viewing` behaviour must be OFF (`viewing={false}` or the prop dropped). That path lerps
 *     the camera to a hard-coded vantage at (0, 3.0, -4.6) which was the pod wall's old fixed position
 *     in the middle of the meadow. This file docks the camera to the engaged station's own standing spot
 *     instead. If both run, they average, and the child ends up looking at nothing in particular.
 */

/** How close before a station lights up and shows its prompt. */
const REACH = 6.8;
/** How far off dead-centre the keeper may be looking and still be offered the station. ~56°. */
const FACING_DOT = 0.56;
/** Screen centre, in normalised device coordinates. The crosshair, and the only pointer this file uses. */
const CENTRE = new Vector2(0, 0);

/**
 * The in-world presentation per item type.
 *
 * A direct import rather than reading `IN_WORLD` off `Game.tsx`: that would be a runtime import cycle
 * (the parent imports this file), and a cycle that happens to work today because both sides only touch
 * each other at render time is not a thing to leave lying around. `LiveItem` is imported from there as a
 * TYPE only, which is erased and cannot cycle.
 *
 * A type absent from this table falls through to the station's idle emblem rather than to a row of
 * numbered buttons — which is the correct failure. The owner's report that the tide-line was "pressing
 * random numbers for no reason" was that fallback, and it should never be reachable again.
 */
/* The registry now lives in `screener/inWorld.ts`, imported by this file AND by `Game.tsx`.
   It used to be duplicated here to avoid an import cycle, and the two copies drifted: four new
   presentations were registered in Game's copy only, so the world suppressed the fallback because a
   presentation supposedly existed while this file drew its idle emblem because it had never heard of the
   type. Blank panel, no error. See that file's header. */
const PRESENTATION = IN_WORLD;

interface Hatch {
  verbId: string;
  family: Family;
  startedAt: number;
}

export function Stations({
  onEngage,
  onLeave,
  engaged,
  live,
  onGrant,
}: {
  onEngage: (verbId: string) => void;
  onLeave: () => void;
  engaged: string | null;
  live: LiveItem | null;
  onGrant: (family: Family) => void;
}): JSX.Element {
  const reduced = usePrefersReducedMotion();
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const setEvents = useThree((s) => s.setEvents);
  const events = useThree((s) => s.events);

  /** Which station is in range and roughly faced. Changes rarely, so it is state rather than a ref. */
  const [near, setNear] = useState<string | null>(null);
  /** How many things the child has handed over this round. Participation. Never accuracy. */
  const [pips, setPips] = useState(0);
  const [hatch, setHatch] = useState<Hatch | null>(null);
  /** Whether the crosshair is over something choosable. Drives the reticle only. */
  const [hot, setHot] = useState(false);

  const picks = useRef(0);
  /** Rounds finished per station, so the two families of a battery alternate across visits. */
  const grants = useRef<Record<string, number>>({});
  const timers = useRef<number[]>([]);
  const panel = useRef<Group>(null);
  const ray = useRef(new Raycaster());
  const forward = useRef(new Vector3());
  const target = useRef(new Vector3());

  const engagedSite = siteFor(engaged);

  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    },
    [],
  );

  /* ------------------------------------------------------------------ *\
     Proximity
  \* ------------------------------------------------------------------ */

  /**
   * Which station is on offer.
   *
   * Three conditions, and the second one is the one that stops a child being offered a station through
   * the back of it: they must be within reach, they must be on the FRONT side of the panel, and they must
   * be looking roughly at it. The facing tolerance is deliberately loose — 56° off centre, which is most
   * of the screen — because a five-year-old walking up to something does not aim first, and a prompt that
   * requires aim is a prompt that flickers.
   */
  useFrame(() => {
    if (engaged) {
      if (near !== null) setNear(null);
      return;
    }
    camera.getWorldDirection(forward.current);
    const flat = Math.hypot(forward.current.x, forward.current.z) || 1;
    let best: string | null = null;
    let bestRank = -Infinity;
    for (const site of SITES) {
      const dx = site.at[0] - camera.position.x;
      const dz = site.at[2] - camera.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.3 || d > REACH) continue;
      const f = facingOf(site);
      // (keeper - station) · facing > 0: in front of the panel, not behind the barn wall it is on.
      if (-(dx * f[0] + dz * f[1]) <= 0.25) continue;
      const look = (forward.current.x * dx + forward.current.z * dz) / (flat * d);
      if (look < FACING_DOT) continue;
      // Prefer the one being looked at most squarely, then the nearer. With three stations eight metres
      // apart this only ever matters if two are somehow in reach at once, but a stable rule costs nothing.
      // Called `rank` rather than the obvious word, because the obvious word is on the banned list for
      // this app and a banned word does not become safe by being a local variable.
      const rank = look * 2 - d / REACH;
      if (rank > bestRank) {
        bestRank = rank;
        best = site.verbId;
      }
    }
    if (best !== near) setNear(best);
  });

  /* ------------------------------------------------------------------ *\
     Looking is aiming
  \* ------------------------------------------------------------------ */

  /**
   * R3F's pointer, moved to the centre of the screen for as long as a station is engaged.
   *
   * This is the whole fix for criticism 2 and it is four lines, so it is worth saying exactly why it
   * works rather than leaving it to look like a trick. R3F resolves every pointer event by calling
   * `events.compute(event, state)`, whose default reads `event.offsetX/offsetY` — the cursor's position
   * on the canvas. Under pointer lock the cursor does not move, so those coordinates are frozen at
   * wherever it happened to be when the lock was taken and every raycast lands in the same wrong place.
   * Replacing `compute` with one that sets the pointer to (0, 0) makes every event a crosshair event: a
   * `pointermove` (which pointer lock still delivers, with movement deltas) becomes hover on whatever is
   * under the centre of the screen, and a real mouse click becomes a choice of that thing.
   *
   * Restored on leaving, and on unmount, because the rest of the app picks with a real cursor.
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

  /** Is the crosshair on something choosable? The presentations' hit volumes are invisible but solid to
   *  a raycast, which is what lets this be asked without knowing anything about their internals. */
  useFrame(() => {
    if (!engaged || !panel.current) {
      if (hot) setHot(false);
      return;
    }
    ray.current.setFromCamera(CENTRE, camera);
    const next = ray.current.intersectObject(panel.current, true).length > 0;
    if (next !== hot) setHot(next);
  });

  /* ------------------------------------------------------------------ *\
     Keys
  \* ------------------------------------------------------------------ */

  /**
   * E to go in, E again or Escape to come out. E ONLY.
   *
   * Space used to work too, on the theory that a child who has been told nothing will press the key
   * they have been hopping with. The owner ruled against it, and they are right: Space was doing three
   * jobs at once. It jumped, it opened things, and once inside it chose. A key that means three
   * different things depending on where you are standing is not a shortcut, it is a trap. Space is now
   * only ever jump, and E is the one and only interact key in the game.
   *
   * SPACE IS NOT A CONVENIENCE, it is a prediction about the player. A child who has been told nothing
   * will press Space, because Space is what they have been pressing to hop since they arrived. So Space
   * enters a station, and once inside it chooses whatever the crosshair is on — dispatched as an ordinary
   * `click` on the canvas so it travels the exact same path a mouse click does and cannot behave
   * differently from it.
   *
   * ESCAPE ALSO RELEASES POINTER LOCK, which no page can prevent. That is why it is the third way out and
   * not the first: E is the promoted path and it keeps the lock. The `pointerlockchange` watch below
   * catches the Escape case from the other side, so a child who finds Escape leaves the station cleanly
   * rather than ending up locked out of a panel that is still up.
   */
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.repeat) return;
      if (engaged) {
        if (e.code === 'KeyE' || e.code === 'Escape') {
          onLeave();
          return;
        }
        if (e.code === 'Enter' || e.code === 'NumpadEnter') {
          e.preventDefault();
          gl.domElement.dispatchEvent(
            new MouseEvent('click', { bubbles: true, cancelable: true, view: window }),
          );
        }
        return;
      }
      if (!near) return;
      if (e.code === 'KeyE') {
        e.preventDefault();
        onEngage(near);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [engaged, near, onEngage, onLeave, gl]);

  useEffect(() => {
    if (!engaged) return;
    // Only armed if the lock was actually held on entering. Engaged without a lock is a legitimate state
    // — a preview, or a child who has not clicked to look around yet — and must not self-close.
    if (!document.pointerLockElement) return;
    const onChange = (): void => {
      if (!document.pointerLockElement) onLeave();
    };
    document.addEventListener('pointerlockchange', onChange);
    return () => document.removeEventListener('pointerlockchange', onChange);
  }, [engaged, onLeave]);

  /* ------------------------------------------------------------------ *\
     Docking
  \* ------------------------------------------------------------------ */

  /**
   * While engaged, hold the keeper on the station's standing spot.
   *
   * POSITION ONLY. The keeper controller keeps its mouse-look running and writes `camera.rotation` every
   * frame, which is exactly what is wanted — the child looks around freely and the crosshair goes where
   * they look. Touching the rotation here would fight it and the two would cancel to a locked stare.
   *
   * The spot is the same one the ground mark is drawn on, so a child who walked onto the mark barely
   * moves; one who pressed E from three metres away glides back to the framing rather than reading a
   * panel from underneath it.
   */
  useFrame((_, dt) => {
    if (!engagedSite) return;
    const p = dockPoint(engagedSite);
    target.current.set(p[0], p[1], p[2]);
    camera.position.lerp(target.current, 1 - Math.exp(-5 * dt));
  });

  /* ------------------------------------------------------------------ *\
     Handing something over, and what comes of it
  \* ------------------------------------------------------------------ */

  /**
   * The child chose something.
   *
   * Two things happen and NEITHER of them looks at what was chosen. The pip count goes up by one, which
   * lights a light on the cradle post and rocks the egg — immediate, visible, and a function of having
   * taken part. And the choice is handed to the session layer, which is the only thing in the system that
   * knows or cares what it was. `useSortie` deletes correctness before returning, so there is nothing
   * here to branch on even if this file wanted to.
   */
  const handlePick = useCallback((
    item: LiveItem,
    content: Record<string, unknown>,
    handed: string,
    flags?: readonly string[],
  ): void => {
    picks.current += 1;
    setPips(picks.current);
    void item.answer(toRef(content, handed), flags);
  }, []);

  const begin = useCallback(
    (verbId: string): void => {
      const site = siteFor(verbId);
      if (!site) return;
      const seen = grants.current[verbId] ?? 0;
      grants.current[verbId] = seen + 1;
      const family = site.families[seen % site.families.length] ?? site.families[0];
      if (!family) return;
      const startedAt = performance.now();
      setHatch({ verbId, family, startedAt });
      const { grantAt, endAt } = hatchTiming(reduced);
      timers.current.push(window.setTimeout(() => onGrant(family), grantAt));
      timers.current.push(
        window.setTimeout(() => {
          setHatch((h) => (h && h.startedAt === startedAt ? null : h));
          setPips(0);
        }, endAt),
      );
    },
    [onGrant, reduced],
  );

  /**
   * A round ended, so an egg hatches.
   *
   * The end of a round is `engaged` going null, whatever caused it — the session closing itself after
   * about four items, or the child walking out with E. Both hatch, provided at least one thing was handed
   * over, and that is on purpose rather than an oversight: the brief is that the slime is earned by
   * PARTICIPATION, the rules are that nothing can be lost and that leaving mid-question is free, and a
   * child who answered two things and then wandered off has participated. The alternative — withholding
   * the slime from a child who left early — would be the first punishment in the whole app, and it would
   * be a punishment for exactly the behaviour a five-year-old is most likely to produce.
   *
   * Handing over nothing at all hatches nothing, because there is no round to have finished.
   */
  const previous = useRef<string | null>(null);
  useEffect(() => {
    const was = previous.current;
    previous.current = engaged;
    if (engaged) {
      if (engaged !== was) {
        picks.current = 0;
        setPips(0);
      }
      return;
    }
    if (!was) return;
    const n = picks.current;
    picks.current = 0;
    if (n > 0) begin(was);
    else setPips(0);
  }, [engaged, begin]);

  /* ------------------------------------------------------------------ *\
     Draw
  \* ------------------------------------------------------------------ */

  const mounted = useMemo(() => {
    if (!live) return null;
    const Presentation = PRESENTATION[live.serve.typeCode];
    if (!Presentation) return null;
    const content = live.serve.served.content;
    return {
      Presentation,
      content,
      scale: fitScale(live.serve.typeCode, content),
      itemId: live.serve.served.itemId,
      showWords: live.showWords,
    };
  }, [live]);

  return (
    <group>
      {SITES.map((site) => {
        const isEngaged = engaged === site.verbId;
        const hatching = hatch?.verbId === site.verbId;
        const lit = isEngaged || near === site.verbId ? 1 : 0;
        const showPanel = isEngaged && mounted !== null;

        return (
          <group
            key={site.verbId}
            position={[site.at[0], site.at[1], site.at[2]]}
            rotation={[0, site.yaw, 0]}
          >
            {site.build === 'coatwall' ? <CoatWallBase site={site} /> : null}
            {site.build === 'tideledge' ? <TideLedgeBase site={site} reduced={reduced} /> : null}
            {site.build === 'daylog' ? <DayLogBase site={site} /> : null}

            <Bay site={site} lit={lit} />
            <Lanterns site={site} lit={lit} reduced={reduced} />
            <StandMark site={site} lit={lit} reduced={reduced} />
            <Wisp site={site} lit={lit} reduced={reduced} />

            {/* The board carries its emblem whenever nothing is being asked — including the second or
                two while the first item of a round is on its way, so the station is never blank. */}
            {showPanel ? null : <Emblem site={site} reduced={reduced} />}

            {/* The prompt. Only while in range and only while not already inside. */}
            {lit === 1 && !engaged ? (
              /* Low and well forward: level with the emblem sign it would otherwise sit on top of, and
                 clear of the sill. Only ever mounted while not engaged, so it cannot cover an item. */
              <group position={[0, -1.4, 2.0]}>
                <PressBadge site={site} reduced={reduced} />
              </group>
            ) : null}

            <Cradle
              site={site}
              pips={isEngaged || hatching ? pips : 0}
              phase={hatching ? 'hatching' : 'resting'}
              family={hatching && hatch ? hatch.family : null}
              startedAt={hatching && hatch ? hatch.startedAt : 0}
              reduced={reduced}
            />

            {showPanel && mounted && live ? (
              <>
                {/* One soft lamp on the panel. The barn's long wall takes 0.56 of the sun and the other
                    two stations can be in a building's shadow at this time of day; an item a child is
                    being asked to look at may not be the darkest thing on screen. */}
                <pointLight position={[0, 0.5, 2.4]} intensity={16} distance={9} color="#fff4de" />
                <group ref={panel} scale={mounted.scale}>
                  <mounted.Presentation
                    // Keyed on the item, so the presentation remounts per question. Without this its
                    // internal `picked` state survives into the next item and every further choice is
                    // swallowed — which made the game unplayable after the first question once before.
                    key={mounted.itemId}
                    content={mounted.content}
                    disabled={!live.asking}
                    showWords={mounted.showWords}
                    onPick={(handed: string, flags?: readonly string[]) =>
                      handlePick(live, mounted.content, handed, flags)
                    }
                  />
                </group>
              </>
            ) : null}
          </group>
        );
      })}

      {engaged ? <Reticle hot={hot} /> : null}
    </group>
  );
}
