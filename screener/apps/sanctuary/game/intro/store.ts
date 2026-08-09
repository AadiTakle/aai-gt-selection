import { useSyncExternalStore } from 'react';

import type { Glyph, StepId, Tutorial } from './tutorial';

/**
 * ONE PLACE THE TOUR'S STATE LIVES, and the reason it is not React state in a component.
 *
 * Two things have to agree about it in the same frame and they are on opposite sides of the `<Canvas>`
 * boundary: `IntroGuide`, which runs inside the canvas because it needs the camera, and `IntroPortrait`,
 * which is flat HTML outside it. Threading a value between them would mean hoisting the whole machine
 * into `Game.tsx` — a file this directory may not edit, and one whose author asked for a mount, not a
 * refactor. `economy/coins.ts` sets the precedent: a module-scope store read through
 * `useSyncExternalStore` means both sides see the same value on the same frame and a component mounted
 * later is never one behind.
 *
 * Nothing here is persisted. `keeper.ts` owns the two things that outlive a visit.
 */

export interface IntroView {
  /** Which step the tour is on. `idle` and `done` both mean it has finished with the child. */
  step: StepId;
  /** The words on screen beside Nan. Empty means the card is not shown at all. */
  line: string;
  /** Which drawn control picture goes with them. */
  glyph: Glyph;
  /** Bumped whenever something new should be said out loud. The portrait speaks on a change of this. */
  say: number;
  /** Whether the tour will do anything else. Drives the skip control's presence. */
  settled: boolean;
  /** True while the challenge board is engaged. `Game.tsx` gates the keeper and the vacpack on it. */
  boardEngaged: boolean;
  /** Which item the board is on, 1-based, and how many there are. Zero while it is not running. */
  boardAt: number;
  boardOf: number;
  /** True while the board is serving a Verbal item, so the headphone prompt can be raised for it. */
  boardSpeaking: boolean;
  /** True once the paddock gate is open, for the closing line and the completion seam. */
  unlocked: boolean;
  /**
   * True while something else owns the child's attention and their ears: one of the three stations, the
   * stall, or this directory's own board.
   *
   * NAN MUST NOT TALK OVER A STATION, and that is not politeness. `screener/speak.ts` is one queue with
   * one generation counter, so a second narration cancels the first — and the verbal station's entire
   * item IS a narration. A nudge starting in the middle of the day-log's story would delete the story
   * and leave a child looking at a row of pictures nobody ever told them about.
   */
  quiet: boolean;
}

const BLANK: IntroView = {
  step: 'greet',
  line: '',
  glyph: 'none',
  say: 0,
  /**
   * SETTLED UNTIL PROVEN OTHERWISE, and it is the skip control this protects.
   *
   * `IntroGuide` holds the tour back until the child has clicked into the game, so between the first
   * frame and that click there is no tour — and a "Skip the tour" button offering to skip a tour that
   * has not started is a control that does nothing. For a keeper who has already seen the tour it would
   * sit there for the whole session. Photographed, that is exactly what it looked like.
   */
  settled: true,
  boardEngaged: false,
  boardAt: 0,
  boardOf: 0,
  boardSpeaking: false,
  unlocked: false,
  quiet: false,
};

let view: IntroView = BLANK;

const listeners = new Set<() => void>();

function publish(next: IntroView): void {
  view = next;
  for (const l of listeners) l();
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

function snapshot(): IntroView {
  return view;
}

/** Push the tour's own state across. Called from inside the canvas, on a change and not per frame. */
export function publishTutorial(t: Tutorial): void {
  if (view.step === t.step && view.line === t.line && view.glyph === t.glyph && view.say === t.say && view.settled === t.settled) {
    return;
  }
  publish({ ...view, step: t.step, line: t.line, glyph: t.glyph, say: t.say, settled: t.settled });
}

/** Push the board's own state across, and whether anything at all is holding the child. */
export function publishBoard(
  patch: Partial<Pick<IntroView, 'boardEngaged' | 'boardAt' | 'boardOf' | 'boardSpeaking' | 'unlocked' | 'quiet'>>,
): void {
  let changed = false;
  for (const k of Object.keys(patch) as (keyof typeof patch)[]) {
    if (view[k] !== patch[k]) changed = true;
  }
  if (!changed) return;
  publish({ ...view, ...patch });
}

/** The whole view. For the flat overlay, which needs most of it. */
export function useIntroView(): IntroView {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/**
 * The one boolean `Game.tsx` needs.
 *
 * True exactly while the challenge board holds the keeper, which is when the keeper must not walk and
 * the vacpack must not fire — the identical condition the shop and the three stations already impose,
 * and for the identical reason: while the board is up a click means "choose this" and nothing else.
 */
export function useBoardEngaged(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => view.boardEngaged,
    () => false,
  );
}

/** Asking outside React, for the handful of places that are not components. */
export function boardEngaged(): boolean {
  return view.boardEngaged;
}

/** Whether the paddock is open. Read from the guide's frame loop, which cannot call a hook. */
export function introUnlocked(): boolean {
  return view.unlocked;
}

/** Only for the tests and for a hot reload: put the store back where it started. */
export function resetIntroStore(): void {
  publish(BLANK);
}
