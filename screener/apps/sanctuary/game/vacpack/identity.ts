/**
 * WHICH SLIME WAS THAT. The one genuinely unresolved thing in this mechanic, written down honestly.
 *
 * THE GAP. `onCapture(slimeId: string)` needs the world's identity for a slime — `Slime.id` from
 * `contract.ts`, the string the integrator's `WorldState.slimes` is keyed by. The only thing the vacpack can
 * see is `herd.ts`, and a `SlimeCollider` carries:
 *
 *      id: number      // a counter local to the registry, handed out by joinHerd on mount
 *      family, stage, x, z, top, r
 *
 * That `id` is stable and unique — it is genuinely usable, and it is what this file hands out — but it is NOT
 * the world's id. It is an ordinal assigned in mount order, and it changes on every remount: a slime that is
 * caught and released comes back with a new one, and a page reload renumbers the whole herd from 1. Nothing
 * in `WorldState` can be looked up with it.
 *
 * THE SMALLEST ADDITION THAT WOULD CLOSE IT. Two lines, both in files this track does not own:
 *
 *      // slimes/herd.ts — one optional field on the interface
 *      export interface SlimeCollider {
 *        readonly id: number;
 *        readonly key?: string;    // <- whatever the mounting code calls this slime. Opaque to the registry.
 *        ...
 *      }
 *
 *      // slimes/Slime.tsx — pass it through from a new optional prop
 *      export interface SlimeProps { id?: string; ... }
 *      joinHerd({ key: id, family, stage, ... })
 *
 * `herd.ts` never reads `key`; it only carries it. With that, `capturedId()` below returns `c.key ?? String(c.id)`
 * and `onCapture` hands the integrator the real world id. Until then the integrator resolves it by position.
 *
 * THE WORKAROUND, and it is a real one rather than a shrug. Every capture writes a TRACE: the family, the
 * stage, and the exact ground position the slime was standing on at the instant it was grabbed. The
 * integrator matches that against `WorldState.slimes` the same way it would match any other spatial query —
 * nearest slime of the same family within a metre or so — and it is unambiguous in practice because a slime
 * has to be metres from its neighbours to be the nearest one inside the suction cone in the first place.
 *
 *      const t = capturedTrace(id);
 *      if (t) {
 *        const hit = world.slimes.find(s => s.family === t.family && near(s, t.x, t.z));
 *        // ... remove `hit` from the world
 *      }
 *
 * Traces are kept for a couple of minutes and then dropped, so this never grows without bound on a long
 * session. Nothing in this directory's own behaviour depends on the trace: it exists purely so the
 * integration can be written today rather than after `herd.ts` changes.
 */
import type { Family, Stage } from '../contract';
import type { SlimeCollider } from '../slimes/herd';

export interface CapturedTrace {
  /** The `herd.ts` registry id the capture was made against. */
  herdId: number;
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
 * The id handed to `onCapture`. One line to change when `herd.ts` grows a `key`:
 * `return c.key ?? String(c.id)`.
 */
export function capturedId(c: SlimeCollider): string {
  return String(c.id);
}

/** Called at the grab, before the collider is gone. Records everything needed to find the slime again. */
export function recordCapture(c: SlimeCollider): string {
  const id = capturedId(c);
  const t = now();
  traces.set(id, { herdId: c.id, family: c.family, stage: c.stage, x: c.x, z: c.z, r: c.r, top: c.top, at: t });
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
