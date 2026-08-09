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
   *
   * Or, third, because the page has not been touched yet and no browser will speak into that — see
   * `gestured`. All three are the same fact from the tour's point of view: A LINE SAID NOW WOULD NOT BE
   * HEARD. Nothing distinguishes them downstream, and the two things that read this field want the same
   * behaviour from all three: `IntroPortrait` holds the line back, and `IntroGuide` stops the clock so the
   * held line cannot be overtaken by the next one.
   *
   * DERIVED, NEVER SET DIRECTLY — see `withQuiet`. It used to be written by `IntroGuide` as the plain
   * `busy` boolean `Game.tsx` hands down, which left the third of the three cases in the sentence above
   * simply not implemented: `busy` is `!!engaged || shopOpen`, and `Game.tsx` cannot see the challenge
   * board because the board is not one of its `SITES`. The board serves `VER-SEQUENCE-01` on its middle
   * leg through the same `DayLog` and the same single-queue `speak.ts`, and the `board` step's own nudge
   * lands twenty seconds after the step is entered — comfortably inside a child's first item. So the
   * exact failure this field exists to prevent was reachable at the one station this directory owns.
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

/**
 * The half of `quiet` that comes from outside this directory: `Game.tsx`'s `!!engaged || shopOpen`.
 *
 * Kept beside the view rather than in it because `quiet` has two independent sources and neither of them
 * can see the other. `IntroGuide` knows what `Game.tsx` told it and knows nothing about the board's inner
 * state; `Board` knows whether it is engaged and never receives `busy`. Left as one writable field, the
 * later of the two publishes would erase the earlier — and the one it would erase is whichever silence
 * happened to be established first.
 */
let externallyBusy = false;

/**
 * Whether the page has had a user gesture yet, which is the third and quietest reason she cannot be heard.
 *
 * EVERY BROWSER REFUSES `speechSynthesis` UNTIL THE PAGE HAS BEEN TOUCHED. `IntroGuide` holds the tour
 * back until the first pointer lock partly for this reason — but only partly, because it also has a
 * twenty-second fallback for the case where a lock never arrives, and a lock is a gesture while the
 * fallback expiring is the absence of one. Down that path the tour used to start into a page that had
 * never been touched: the greeting, which is her longest line and her introduction, went to a muted tab
 * and was never said again, and by the time the child finally clicked in the tour had moved on. Silent,
 * unreported, and worst for exactly the child who cannot read the caption that was left.
 *
 * Latched from the first gesture of any kind rather than from pointer lock, because pointer lock is the
 * one gesture this game cannot count on: it is refused in headless Chrome, refused in some embeddings, and
 * a child who presses W before clicking has already unmuted the page.
 */
let gestured = false;

if (typeof window !== 'undefined') {
  const woke = (): void => {
    if (gestured) return;
    gestured = true;
    for (const e of ['pointerdown', 'keydown', 'touchstart']) window.removeEventListener(e, woke, true);
    document.removeEventListener('pointerlockchange', woke);
    // Nothing about the view changed, but `quiet` is derived and has just become false.
    publish({ ...view });
  };
  for (const e of ['pointerdown', 'keydown', 'touchstart']) window.addEventListener(e, woke, true);
  // A lock can only have been granted off a gesture, so its arrival is proof of one even if the gesture
  // itself was swallowed by something that stopped propagation before it reached the window.
  document.addEventListener('pointerlockchange', woke);
}

const listeners = new Set<() => void>();

/** `quiet`, from all three of the things that impose it. The only place the field is ever written. */
function withQuiet(next: IntroView): IntroView {
  const quiet = !gestured || externallyBusy || next.boardEngaged;
  return next.quiet === quiet ? next : { ...next, quiet };
}

/**
 * Derived on the way in as well as on the way through `publish`, so the very first render already agrees.
 *
 * `BLANK` cannot carry the right answer as a literal: on a page nobody has touched yet the correct value
 * is `true`, and a `false` sitting there until the first publish is a window — short, but real — in which
 * `IntroPortrait` believes it may speak.
 */
let view: IntroView = withQuiet(BLANK);

function publish(next: IntroView): void {
  const settled = withQuiet(next);
  if (settled === view) return;
  view = settled;
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

/** Push the board's own state across. Engaging it is one of the two things that makes Nan go quiet. */
export function publishBoard(
  patch: Partial<Pick<IntroView, 'boardEngaged' | 'boardAt' | 'boardOf' | 'boardSpeaking' | 'unlocked'>>,
): void {
  let changed = false;
  for (const k of Object.keys(patch) as (keyof typeof patch)[]) {
    if (view[k] !== patch[k]) changed = true;
  }
  if (!changed) return;
  publish({ ...view, ...patch });
}

/**
 * The other one: `Game.tsx`'s `busy`, meaning a station or the stall has the child.
 *
 * Separate entry point rather than a field on the patch above, so the two sources of silence cannot
 * overwrite each other — see `externallyBusy`.
 */
export function publishBusy(busy: boolean): void {
  if (externallyBusy === busy) return;
  externallyBusy = busy;
  publish({ ...view });
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

/** Whether anything at all is currently holding the child. Read from frame loops, which cannot use hooks. */
export function introQuiet(): boolean {
  return view.quiet;
}

/**
 * Only for the tests and for a hot reload: put the store back where it started.
 *
 * `gestured` is deliberately NOT cleared. It is a fact about the page rather than about the tour, and a
 * hot reload does not un-touch it — putting it back would silence a Nan the child can perfectly well hear.
 */
export function resetIntroStore(): void {
  externallyBusy = false;
  publish(BLANK);
}
