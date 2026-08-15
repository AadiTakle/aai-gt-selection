import type { Battery } from '../../shared/batteries';
import { IN_WORLD } from '../screener/inWorld';
import { markBoardTaken } from './keeper';
import { LEGS, openGate, typesForLeg } from './site';

/**
 * ONE RUN THROUGH THE CHALLENGE BOARD, AND THE ONE PLACE FINISHING IT MEANS ANYTHING.
 *
 * ══ WHY THIS IS A MODULE AND NOT THREE `useState`s IN `Board.tsx` ═════════════════════════════════
 *
 * Two promises about the board are properties of its SEQUENCING rather than of anything drawn, so they are
 * separated out here and asserted in `run.test.ts` against this file alone — the same argument, and the
 * same shape, as `tutorial.ts`:
 *
 *   FINISHING ALWAYS OPENS THE PADDOCK. The owner's report was "i finished the series of questions and
 *   nothing unlocked", and the only structural defence against that sentence is to make the completion and
 *   the unlock the SAME transition rather than two effects that have to agree. `finish` below opens the gate
 *   and writes the keeper's flag; `Board.tsx` cannot reach the `unlocked` outcome without them having
 *   happened, because it does not know how.
 *
 *   THE BOARD ALWAYS RESOLVES. Every leg carries a finite patience, exactly as every step of the tour
 *   carries a finite `skipMs`, so a leg that cannot serve — an empty pool, a dead API, a served type
 *   nothing can draw — moves on rather than holding a child in front of a board with nothing on it. That
 *   failure was live: `VER-RELPAIR-01` was servable and undrawable on the middle leg, the board showed its
 *   idle emblem, and the eight-question sequence simply stopped at four with nothing logged anywhere.
 *
 * ══ IT IS DELIBERATELY NOT PURE, AND THAT IS THE POINT ════════════════════════════════════════════
 *
 * `tutorial.ts` is pure and says so at length. This file is not: `finish` splices the barricade out of
 * `INTRO_SOLIDS` and persists the keeper's flag. That is not laziness about where side effects live — it is
 * the mechanism by which the first promise above is a fact rather than a hope. A pure machine that merely
 * REPORTED completion would leave the splice as a second thing somewhere else that could be forgotten,
 * which is precisely the bug being fixed. Both side effects are idempotent and both only ever run one way.
 */

/* ------------------------------------------------------------------ *\
   What the board can actually put in front of a child
\* ------------------------------------------------------------------ */

/**
 * Whether the board can DRAW an item type, asked of the one registry that knows.
 *
 * `screener/inWorld.ts` is the single source of truth and its header records what happens when there is
 * more than one: four presentations were registered in one of two duplicate tables and the two stations
 * that had gained styles went blank, with no error and nothing in the console. This directory then made
 * the same mistake a third time — `Board.tsx` kept a fourth copy, listing a retired `VER-SEQUENCE-01` and
 * missing the kinship stone — so the board's answer to "can I draw this" now comes from the same table as
 * everybody else's and there is nothing left to keep in agreement.
 */
export function canDraw(typeCode: string): boolean {
  return !!IN_WORLD[typeCode];
}

/**
 * The styles a leg may ASK FOR: its battery's servable set, less anything the board cannot draw.
 *
 * Belt as well as braces. `sites.test.ts` and `registry.test.ts` both assert the two sets are equal, so in
 * a healthy tree this filter removes nothing — but the filter is what makes a drift harmless instead of
 * fatal, because `/sanctuary/chunk` builds the pool out of exactly the types it is handed. A type that is
 * never requested is never served, so the guard below never has to fire.
 *
 * NOT a place to express a measurement decision. Withdrawing a type from a battery is `shared/batteries.ts`
 * and nowhere else; this only ever removes something that has no picture yet.
 */
export function typesForBoardLeg(battery: Battery): readonly string[] {
  return typesForLeg(battery).filter(canDraw);
}

/* ------------------------------------------------------------------ *\
   The run
\* ------------------------------------------------------------------ */

/**
 * How long the board may have nothing a child can press before the leg gives up on itself.
 *
 * Twelve seconds, and the number is bounded on both sides by something real. It has to be longer than the
 * gap between two items — a 900ms settle plus a fetch — or a leg would abandon itself between questions on
 * a slow school laptop. It has to be short enough that a child in front of a blank board is not left there:
 * five-year-olds give a broken thing a few seconds, and the whole cost of being wrong here is one leg of a
 * baseline, where the cost of being wrong the other way is the child leaving.
 *
 * NOTE THAT IT IS NOT A LIMIT ON THINKING TIME. The clock only runs while there is nothing drawable on the
 * board at all; `presenting` stops it. A child may stare at a question for an hour.
 */
export const BLIND_MS = 12000;

export type Outcome =
  /** Still going. */
  | 'running'
  /** Worked through, the paddock is open, the flag is written. */
  | 'unlocked'
  /**
   * Every leg gave up and not one answer was recorded, so the board is PUT BACK rather than counted.
   *
   * Treating that as a completion would be wrong twice over: it would open the paddock for a server
   * outage, and it would write the board's done-flag, so the one thing this feature exists to produce
   * would be silently gone and nothing would report a fault. The child is released, nothing is persisted,
   * and the board is still standing there to try again. Anything from ONE answer upward is a completion,
   * because a child who worked at it does not lose their paddock to how many items a bank had left.
   */
  | 'put-back';

export interface Run {
  /** Which leg of `LEGS` is up. `LEGS.length` once they have all run. NEVER DECREASES within a run. */
  readonly leg: number;
  /** How many questions have been answered, across every leg. */
  readonly answered: number;
  readonly perBattery: Readonly<Record<string, number>>;
  /** When the board last had nothing a child could press, in the caller's clock. */
  readonly blindSince: number;
  /** Whether something drawable is on the board right now. */
  readonly showing: boolean;
  readonly outcome: Outcome;
}

/** A fresh run. Called on mount, and again if a run is put back. */
export function beginRun(now: number): Run {
  return { leg: 0, answered: 0, perBattery: {}, blindSince: now, showing: false, outcome: 'running' };
}

/** The battery the run is currently on, or `null` once the legs have run out. */
export function legBattery(r: Run): Battery | null {
  return LEGS[r.leg]?.battery ?? null;
}

/** How many items the current leg still wants. Only for the display; the leg counts its own. */
export function legQuota(r: Run): number {
  return LEGS[r.leg]?.quota ?? 0;
}

/**
 * THE CHILD HAS JUST PRESSED E. START THE PATIENCE CLOCK HERE.
 *
 * Not optional, and it is worth stating why because it was nearly shipped the other way. The board is mounted
 * for the whole session, so a run stamped at MOUNT has been "blind" ever since: a child who plays for a
 * minute and then walks up would arrive with the patience already spent, and the watchdog would end their
 * first leg within a frame of them engaging — silently, and only on a machine fast enough to render a frame
 * before the first item arrived, which is every machine except the slow headless one it was first driven on.
 *
 * Called on every engage, so leaving and coming back starts fresh too. While the board is not engaged the
 * clock is never read: nothing is expected of a board nobody is standing at.
 */
export function watchFrom(r: Run, now: number): Run {
  if (r.outcome !== 'running') return r;
  return { ...r, showing: false, blindSince: now };
}

/**
 * Something drawable is on the board. Stops the patience clock.
 *
 * Returns the same object when nothing changed, so a React caller may call it from an effect on every
 * render without looping — the same contract `advance` in `tutorial.ts` keeps.
 */
export function presenting(r: Run, _now: number): Run {
  if (r.showing || r.outcome !== 'running') return r;
  return { ...r, showing: true };
}

/** Nothing drawable is on the board. Starts the patience clock, once, at the moment it went blank. */
export function blank(r: Run, now: number): Run {
  if (!r.showing || r.outcome !== 'running') return r;
  return { ...r, showing: false, blindSince: now };
}

/** One question answered, on whichever leg is up. Paid for having answered, never for being right. */
export function answeredOne(r: Run, now: number): Run {
  if (r.outcome !== 'running') return r;
  const b = legBattery(r) ?? 'Nonverbal';
  return {
    ...r,
    answered: r.answered + 1,
    perBattery: { ...r.perBattery, [b]: (r.perBattery[b] ?? 0) + 1 },
    showing: false,
    blindSince: now,
  };
}

/**
 * This leg is over, for any of the four reasons it can be: its quota is met, its session closed itself,
 * it errored, or it was handed something the board cannot draw. The board does not care which.
 */
export function legOver(r: Run, now: number): Run {
  if (r.outcome !== 'running') return r;
  const leg = r.leg + 1;
  const next: Run = { ...r, leg, showing: false, blindSince: now };
  return leg >= LEGS.length ? finish(next) : next;
}

/**
 * The watchdog. Nothing to press for `BLIND_MS` means this leg cannot serve, so it is over.
 *
 * Called from a frame loop a few times a second. Returns the same object unless it actually fires.
 */
export function tick(r: Run, now: number): Run {
  if (r.outcome !== 'running' || r.showing) return r;
  if (now - r.blindSince < BLIND_MS) return r;
  return legOver(r, now);
}

/** The longest a run can take with a board that can serve nothing at all. For the tests, and honesty. */
export const WORST_CASE_MS = BLIND_MS * LEGS.length;

/**
 * THE END OF THE RUN, AND THE ONLY PLACE THE PADDOCK EVER OPENS.
 *
 * Private on purpose. There is no exported "unlock" for a caller to forget to call and no exported
 * "complete" that could report success without one, so the outcome and the world cannot disagree.
 */
function finish(r: Run): Run {
  if (r.answered <= 0) return { ...r, outcome: 'put-back' };
  openGate();
  markBoardTaken();
  return { ...r, outcome: 'unlocked' };
}
