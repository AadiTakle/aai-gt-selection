/**
 * WHAT IS IN THE TANK. A four-slot queue, and the one piece of vacpack state anything outside the Canvas
 * is allowed to see.
 *
 * WHY A MODULE STORE AND NOT REACT STATE IN `Vacpack`. `useVacpackTank()` is the interface the integrator
 * asked for, and the thing that wants it is a HUD — flat DOM, outside `<Canvas>`, and therefore in a
 * different React reconciler from the component that owns the pack. State cannot be lifted between two
 * reconcilers without hoisting it above both, which would put a `useState` in `Game.tsx` and put the tank's
 * rules in a file this track does not own. A module store subscribed to with `useSyncExternalStore` is read
 * identically from either tree and keeps every rule about capacity and order in this file.
 *
 * The singleton is per-process, like `herd.ts` next door and for the same reason. Two Canvases on one page
 * share one tank; that is a preview-harness concern only, and `tankReset()` exists for it.
 *
 * FIRST IN, FIRST OUT, which is the rule the brief gives and is also the only rule a child can predict.
 * A stack would hand back the slime you caught most recently, so catching a second one would bury the first —
 * and a five-year-old who caught a rose slime and then a grass slime is going to plop and expect the rose.
 */
import { useSyncExternalStore } from 'react';

import type { Family } from '../contract';

export interface Held {
  /**
   * Which slime this is, as an opaque string. Today it is the `herd.ts` registry id stringified; see
   * `identity.ts` for why that is not the world's `Slime.id` yet and what it would take to make it one.
   */
  id: string;
  family: Family;
}

/** Four. Enough to feel like a collection, few enough that the row of windows stays readable at a glance. */
export const TANK_CAPACITY = 4;

const queue: Held[] = [];
const listeners = new Set<() => void>();

/**
 * The snapshot handed to React. Replaced on change and never mutated, because `useSyncExternalStore` will
 * loop forever if `getSnapshot` returns a fresh array each call.
 */
let snapshot: Held[] = [];

function publish(): void {
  snapshot = queue.slice();
  for (const l of listeners) l();
}

export function tankItems(): readonly Held[] {
  return snapshot;
}

export function tankCount(): number {
  return queue.length;
}

export function tankFull(): boolean {
  return queue.length >= TANK_CAPACITY;
}

/** The next one out. Null when empty. */
export function tankPeek(): Held | null {
  return queue[0] ?? null;
}

/** Returns false if the tank was full, in which case NOTHING was taken and the caller must not drop it. */
export function tankPush(h: Held): boolean {
  if (queue.length >= TANK_CAPACITY) return false;
  queue.push(h);
  publish();
  return true;
}

/** Takes the front-most. Null when empty. */
export function tankShift(): Held | null {
  const out = queue.shift();
  if (!out) return null;
  publish();
  return out;
}

/**
 * Empties the tank and hands back everything that was in it, so a caller that is going away can put them
 * back in the world. Used by `Vacpack`'s unmount, which is the one path where a slime could otherwise be
 * lost — and "nothing can be lost or destroyed" is the first rule of the mechanic.
 */
export function tankDrain(): Held[] {
  const out = queue.slice();
  queue.length = 0;
  publish();
  return out;
}

/** Preview and test only. */
export function tankReset(): void {
  queue.length = 0;
  publish();
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * WHAT THE HUD CALLS. Re-renders only when the contents actually change, which for a row of four windows is
 * a handful of times a minute.
 */
export function useVacpackTank(): { held: Held[] } {
  const held = useSyncExternalStore(subscribe, tankItems, tankItems);
  return { held: held as Held[] };
}
