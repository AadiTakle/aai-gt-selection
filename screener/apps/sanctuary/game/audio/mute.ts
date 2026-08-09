import { useSyncExternalStore } from 'react';

/**
 * WHETHER THE GAME MAKES A SOUND. One boolean, at module scope, with subscribers — the same shape as the
 * coin purse in `economy/coins.ts`, and for the same reason: several things have to agree about it in the
 * same frame (the button's own icon, the engine's master gain, the pad scheduler) and one of them mounts
 * later than the others.
 *
 * IT IS SEPARATE FROM THE ENGINE ON PURPOSE. `MuteButton` must render, be pressable, and show the right
 * icon before any AudioContext exists — because on a fresh page load there has been no user gesture, so
 * there IS no AudioContext, and the first thing the button press does is bring one into being. A button
 * that depended on the engine would be dead exactly when it is most needed.
 *
 * ══ THE DEFAULT ══════════════════════════════════════════════════════════════════════════════════
 *
 * Sound ON at a gentle level, as the brief asks — EXCEPT when `prefers-reduced-motion` is set, in which
 * case it starts muted.
 *
 * That is a deliberate stretch of what the media query means. It is about motion, not sound. But it is the
 * only signal a browser gives us about sensory sensitivity at all, and the two things travel together: a
 * child who has had reduced-motion turned on for them by an adult is very often the same child for whom a
 * continuous vacuum noise is distressing. Guessing wrong in this direction costs a press of a visible
 * button. Guessing wrong in the other direction costs the child the session.
 *
 * A stored choice always wins over both, so an adult who turns the sound on for a reduced-motion child is
 * not overruled on the next visit.
 */

/** Alongside the other `gt-sanctuary:` keys in `contract.ts` and `economy/coins.ts`. */
export const LS_MUTED = 'gt-sanctuary:muted';

/**
 * Exported because the headphone invitation in `useAudio.tsx` must answer the same question this file
 * answers, and must answer it the same way. It cannot ask `muted()` instead: a stored choice overrides this
 * signal, so an adult who turned the sound ON for a reduced-motion child leaves `muted()` false while the
 * child's own preference — no pulsing thing on the screen, please — is still set and still binding.
 */
export function prefersReducedMotion(): boolean {
  try {
    return !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function read(): boolean {
  try {
    const raw = window.localStorage.getItem(LS_MUTED);
    if (raw === '1') return true;
    if (raw === '0') return false;
  } catch {
    // Private browsing or no storage. Fall through to the sensitivity default rather than throwing on the
    // way to the first frame.
  }
  return prefersReducedMotion();
}

let state = read();
const listeners = new Set<() => void>();

function write(next: boolean): void {
  try {
    window.localStorage.setItem(LS_MUTED, next ? '1' : '0');
  } catch {
    // Swallowed. The in-memory choice is still correct for this visit, which is the part that matters.
  }
}

export function muted(): boolean {
  return state;
}

export function setMuted(next: boolean): void {
  if (next === state) return;
  state = next;
  write(next);
  // Synchronous, because the engine's listener resumes the AudioContext and that is only permitted inside
  // the task of the gesture that caused it. Anything deferred here — a microtask, an effect — and the
  // first unmute would be refused by the browser's autoplay policy.
  for (const l of listeners) l();
}

/** Returns the new state, so a caller does not have to read it back. */
export function toggleMuted(): boolean {
  setMuted(!state);
  return state;
}

export function subscribeMuted(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** Whether sound is currently off, as a hook. */
export function useMuted(): boolean {
  return useSyncExternalStore(subscribeMuted, muted, muted);
}
