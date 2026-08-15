/**
 * WHICH SLIME WAS THAT. Closed now, and the way it used to be open is worth keeping on the record, because
 * it was the most expensive gap in the game.
 *
 * THE GAP, AS IT STOOD. `onCapture(slimeId: string)` needs the world's identity for a slime. The only thing
 * the vacpack could see was `herd.ts`, and a `SlimeCollider` carried:
 *
 *      id: number      // a counter local to the registry, handed out by joinHerd on mount
 *      family, stage, x, z, top, r
 *
 * That `id` is stable and unique, but it is NOT the world's id: it is an ordinal assigned in mount order and
 * it changes on every remount, so a slime that is caught and released comes back with a new one and a page
 * reload renumbers the whole herd from 1. So a capture could only be described to the integrator as "a
 * crested rose slime, last seen about here", and the integrator resolved it by taking the nearest slime of
 * the same family and stage.
 *
 * WHY THAT WAS NOT GOOD ENOUGH, MEASURED RATHER THAN GUESSED. The position it matched against is where a
 * slime was PUT DOWN, and wandering happens in the frame loop — a slime bounded to a pen roams 3.4m from
 * its mark and one plopped outside a pen roams `ROAM` (6m) from it, which is why the owner noticed the bug
 * on a slime that "was outside the pen". The match therefore picked the WRONG slime of the same family and
 * stage often enough to be the everyday case: the one the child had just sucked up stayed standing where it
 * was, an innocent one elsewhere on the ranch blinked out, and the plop looked like a copy. Four sucks, four
 * copies, four slimes destroyed somewhere else to pay for them.
 *
 * HOW IT IS CLOSED. Exactly the two lines this comment used to ask for, now made:
 *
 *      // slimes/herd.ts — one optional field on the interface, carried and never read
 *      export interface SlimeCollider { readonly id: number; readonly uid?: number; ... }
 *
 *      // slimes/Slime.tsx — passed through from a prop Game.tsx was already spreading
 *      joinHerd({ uid, family, stage, ... })
 *
 * `capturedId()` below is therefore the world's uid whenever there is one, and `CapturedTrace.uid` carries
 * it to the integrator, which removes the slime by identity — `findIndex(sl => sl.uid === t.uid)` — and can
 * no longer be wrong. See `slimes/keep.ts`, which does the removing and counts every fallback so that
 * "the fallback is never used" is a measurement.
 *
 * THE TRACE STAYS, and it is still doing work: the stage, the collision radius and the world height are
 * what let a plopped slime come back the size it went in as, and the position is the fallback match for a
 * slime that reached the herd without a uid. Traces are kept for a couple of minutes and then dropped, so
 * this never grows without bound on a long session.
 */
import type { Family, Stage } from '../contract';
import type { SlimeCollider } from '../slimes/herd';

export interface CapturedTrace {
  /** The `herd.ts` registry id the capture was made against. */
  herdId: number;
  /**
   * THE WORLD'S IDENTITY FOR THE SLIME, and the only field the integrator should ever resolve on.
   *
   * Null only for a slime that joined the herd without one, which in the game cannot happen — every slime
   * on the ranch is mounted by `Game.tsx` from a `keep.ts` record that has a uid. It is nullable because a
   * preview page mounts slimes with no world behind them.
   */
  uid: number | null;
  family: Family;
  stage: Stage;
  /** Where it was standing, on the ground plane, at the instant it was grabbed. */
  x: number;
  z: number;
  /** Its collision radius, in case the caller wants a tolerance proportional to the slime. */
  r: number;
  /** Its world height. Kept so the slime can be drawn at its true size all the way through the flight. */
  top: number;
  /** `performance.now()` at the grab. */
  at: number;
}

const traces = new Map<string, CapturedTrace>();
/** Two minutes. Long enough to survive any plausible async round trip, short enough to never accumulate. */
const TRACE_TTL = 120_000;

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

/**
 * The id handed to `onCapture`.
 *
 * THE WORLD'S UID WHEN THERE IS ONE. Prefixed rather than bare so a uid can never collide with a registry
 * ordinal in the trace table: `herd.ts` hands out `1, 2, 3…` and so does `keep.ts`, and a page on which
 * some slimes carry a uid and some do not would otherwise have two different creatures answering to "7".
 */
export function capturedId(c: SlimeCollider): string {
  return c.uid != null ? `u${c.uid}` : `h${c.id}`;
}

/** Called at the grab, before the collider is gone. Records everything needed to find the slime again. */
export function recordCapture(c: SlimeCollider): string {
  const id = capturedId(c);
  const t = now();
  traces.set(id, {
    herdId: c.id,
    uid: c.uid ?? null,
    family: c.family,
    stage: c.stage,
    x: c.x,
    z: c.z,
    r: c.r,
    top: c.top,
    at: t,
  });
  if (traces.size > 32) {
    for (const [k, v] of traces) if (t - v.at > TRACE_TTL) traces.delete(k);
  }
  return id;
}

/** What the integrator calls to turn an opaque capture id back into something it can match on. */
export function capturedTrace(slimeId: string): CapturedTrace | null {
  return traces.get(slimeId) ?? null;
}

/** Preview and test only. */
export function clearTraces(): void {
  traces.clear();
}
