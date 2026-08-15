import { useThree, type ComputeFunction } from '@react-three/fiber';
import { useCallback, useEffect, useRef } from 'react';
import { Vector2 } from 'three';

const CENTRE = new Vector2(0, 0);

/**
 * ONE owner of R3F's pointer `compute`, for every surface that aims by looking.
 *
 * ══ WHAT THIS REPLACED, AND THE BUG THAT MADE IT NECESSARY ═════════════════════════════════════════
 *
 * `Stations`, `intro/Board` and `economy/Shop` each carried an identical copy of this: capture
 * `events.compute` on first render, swap in a crosshair version while engaged, restore the captured one on
 * cleanup. Each copy was correct alone. Together they were not, because `compute` is a SINGLE GLOBAL on the
 * R3F store and all three were writing it.
 *
 * The failure: a child engages a station, so `Stations` sets the crosshair. Then anything makes another of
 * the three re-run its effect — the shop opening or closing, the tutorial board mounting, a prop identity
 * changing — and its cleanup fires `setEvents({ compute: restore })`, putting the DEFAULT compute back while
 * the station is still engaged. The default reads `event.offsetX/offsetY`, and under pointer lock the cursor
 * never moves, so from that moment every click resolves at whatever screen position the mouse happened to
 * occupy when the lock was taken.
 *
 * What that looks like to a player is the thing the owner reported twice: the clickable spot is nowhere near
 * the card — usually well above it, sometimes off to one side — and it moves between sessions, because it is
 * the last resting place of a mouse pointer rather than a property of the scene. It also explains why
 * tightening a hit volume did not help: the volumes were never the problem. Card and hit box project to the
 * same screen point to within 0.0001 of NDC.
 *
 * ══ WHY ONE OWNER FIXES IT ════════════════════════════════════════════════════════════════════════
 *
 * There is one global, so there is one component allowed to write it, mounted once, driven by a single
 * boolean that is the OR of every surface that aims by looking. Nothing to capture, nothing to restore
 * between surfaces, and no ordering between unrelated components to get right. Moving from the shop straight
 * into a station no longer passes through a frame of default compute.
 *
 * `active` must be true whenever the pointer is locked and aiming is done with the camera. It is false in the
 * open world, where a real cursor picks slimes and the default compute is correct.
 */
export function CrosshairAiming({ active }: { active: boolean }): null {
  const setEvents = useThree((s) => s.setEvents);
  const events = useThree((s) => s.events);

  /**
   * The default, captured once and never re-captured.
   *
   * A ref rather than state because writing it must not re-render, and captured on first render rather than in
   * an effect because by the time an effect runs this component may already have replaced it.
   */
  const fallback = useRef<ComputeFunction | undefined>(undefined);
  if (fallback.current === undefined) fallback.current = events.compute;

  const crosshair = useCallback<ComputeFunction>((_event, state) => {
    state.pointer.set(0, 0);
    state.raycaster.setFromCamera(CENTRE, state.camera);
  }, []);

  useEffect(() => {
    const restore = fallback.current;
    setEvents({ compute: active ? crosshair : restore });
    return () => {
      // Only on unmount, and only back to the default: there is no other owner to hand it to.
      if (restore) setEvents({ compute: restore });
    };
  }, [active, crosshair, setEvents]);

  return null;
}
