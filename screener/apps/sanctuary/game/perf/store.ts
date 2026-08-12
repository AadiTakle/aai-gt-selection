/**
 * WHAT THE LAST FRAME COST. A module store, read identically from inside and outside the Canvas.
 *
 * The sampler lives inside `<Canvas>` because only a component in the r3f tree can see the renderer;
 * the panel that displays it is flat DOM outside the Canvas, in a different React reconciler. State
 * cannot be lifted between two reconcilers without hoisting it above both, which would put a
 * `useState` in `Game.tsx`. `vacpack/tank.ts` and `slimes/keep.ts` both solve this the same way and
 * this file follows them rather than inventing a third arrangement.
 *
 * Nothing here runs unless `?perf=1` is in the URL — see `enabled.ts`. This is a workshop instrument,
 * not a feature, and a child must never meet it.
 */
import { useSyncExternalStore } from 'react';

export interface Reading {
  /** Frame intervals in ms, oldest first. A ring the sampler trims. */
  frames: readonly number[];
  /** `WebGLRenderer.info.render` for the previous frame — see `Probe.tsx` on the one-frame lag. */
  calls: number;
  triangles: number;
  programs: number;
  geometries: number;
  textures: number;
}

let snapshot: Reading | null = null;
const listeners = new Set<() => void>();

export function publish(next: Reading | null): void {
  snapshot = next;
  for (const l of listeners) l();
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Stable identity between publishes, or `useSyncExternalStore` re-renders forever. */
function read(): Reading | null {
  return snapshot;
}

export function useReading(): Reading | null {
  return useSyncExternalStore(subscribe, read, read);
}
