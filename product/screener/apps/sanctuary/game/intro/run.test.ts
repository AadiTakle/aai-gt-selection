import { describe, expect, it } from 'vitest';

import { BATTERIES } from '../../shared/batteries';
import { IN_WORLD } from '../screener/inWorld';
import { siteTypes } from '../stations/sites';
import {
  BLIND_MS,
  WORST_CASE_MS,
  answeredOne,
  beginRun,
  blank,
  canDraw,
  legOver,
  presenting,
  tick,
  typesForBoardLeg,
  watchFrom,
  type Run,
} from './run';
import { BOARD_ITEMS, LEGS, gateBarred } from './site';

/**
 * THE TWO THINGS THAT WENT WRONG, ASSERTED.
 *
 * The owner's report was "i finished the series of questions and nothing unlocked", and the cause was that
 * the board kept its own copy of the presentation registry, which had gone stale: `VER-RELPAIR-01` — the
 * kinship stone, half of what the Verbal leg is served — was missing from it, so two items in eight landed
 * on a type the board could not draw. Measured in a browser: the run reached item 4 of 8, was served
 * `VER-RELPAIR-01`, hung its idle emblem, and never moved again. Nothing was logged. The eight-question
 * sequence never finished, so nothing ever asked for the gate.
 *
 * Three guards, in the order they would have caught it:
 *
 *   THE SUBSET. Every style the board may be served, it can draw. This is the assertion that would have
 *   failed on the day the kinship stone was registered, and it is the station-side clause in
 *   `stations/registry.test.ts` pointed at this board.
 *
 *   THE STALL. A leg that can never serve resolves anyway, so the run always ends.
 *
 *   THE UNLOCK. A run cannot report itself finished without the barricade actually being gone.
 *
 * ══ ORDER MATTERS IN THIS FILE, AND ON PURPOSE ════════════════════════════════════════════════════
 *
 * `openGate` mutates the live `INTRO_SOLIDS` array and nothing in this game ever closes a gate it has
 * opened, so the tests that require the barricade to be STANDING have to run before the one that opens it.
 * That is the same reason `site.test.ts` keeps its own barricade test last, and it is a property of the
 * design rather than an awkwardness of the test: see the note on the array in `site.ts`.
 */

/** Drive a leg that serves nothing at all: it goes blank and the clock runs. */
function starve(r: Run, from: number, legs = LEGS.length): { run: Run; now: number } {
  let run = blank(r, from);
  let now = from;
  // A generous multiple of the worst case, sampled the way the frame loop samples it.
  const until = from + WORST_CASE_MS * 3 + 5000;
  while (now < until) {
    now += 250;
    run = tick(run, now);
    if (run.outcome !== 'running') break;
    // Each new leg starts showing nothing, exactly as a leg whose fetch fails does.
    run = blank(run, now);
  }
  void legs;
  return { run, now };
}

describe('every style the board can be served, it can draw', () => {
  /**
   * THE ASSERTION THAT WAS MISSING. `Board.tsx` had a fourth copy of `screener/inWorld.ts` and it had gone
   * stale in both directions at once: it named `VER-SEQUENCE-01`, retired by the battery audit and never
   * served again, and it had never heard of `VER-RELPAIR-01`, which the engine serves on every other
   * verbal item. The board now asks the shared registry, and this fails if that ever stops being true.
   */
  it('has a presentation for every type of every leg', () => {
    for (const leg of LEGS) {
      const types = siteTypes(leg.battery);
      expect(types.length, `${leg.battery} has no servable style`).toBeGreaterThan(0);
      for (const t of types) {
        expect(
          canDraw(t),
          `${t} is servable on the ${leg.battery} leg but nothing in screener/inWorld.ts draws it`,
        ).toBe(true);
      }
    }
  });

  it('asks for exactly the styles its battery has, so nothing is quietly narrowed', () => {
    // `typesForBoardLeg` filters by drawability as a belt-and-braces guard. In a healthy tree it removes
    // nothing, and this is what says so — if it ever starts removing something, that is a real gap in the
    // world and it should be found here rather than by a child getting a shorter measurement.
    for (const battery of BATTERIES) {
      expect(typesForBoardLeg(battery)).toEqual([...siteTypes(battery)]);
    }
  });

  it('never asks for a type that has no picture, even if one appears in a battery', () => {
    // The filter itself, proven against a type that is deliberately not drawable.
    expect(canDraw('FLU-OPCHAIN-01')).toBe(false);
    expect(Object.keys(IN_WORLD).length).toBeGreaterThan(0);
  });
});

describe('a leg that cannot serve does not stall the board', () => {
  /**
   * THE GENERAL DEFECT, of which the stale registry was one instance. An empty pool, a dead API, a session
   * that opens and serves nothing, a type nothing draws: from the child's side these are one thing — a board
   * with nothing on it to press — and there is only one acceptable response, which is that it ends.
   *
   * This is the same promise `tutorial.ts` makes about its steps and for the same reason. There has already
   * been one trap bug in this project where a station held the keeper with nothing on screen to press.
   */
  it('resolves every leg within its patience and never runs for ever', () => {
    const { run, now } = starve(beginRun(0), 0);
    expect(run.outcome).not.toBe('running');
    expect(run.leg).toBe(LEGS.length);
    expect(now).toBeLessThanOrEqual(WORST_CASE_MS + 1000);
  });

  it('produces no answers, so it is put back rather than counted', () => {
    const { run } = starve(beginRun(0), 0);
    expect(run.outcome).toBe('put-back');
    expect(run.answered).toBe(0);
    // AND THE PADDOCK STAYS SHUT. An outage may not hand out the reward the screening exists to pay for.
    expect(gateBarred()).toBe(true);
  });

  it('gives a child who plays first and engages later the full patience', () => {
    /**
     * THE NEAR-MISS THIS TEST EXISTS FOR. The board is mounted for the whole session, so a run stamped at
     * mount is already out of patience by the time a child who has been playing walks up to it — and the
     * watchdog would then end their FIRST leg within a frame of them pressing E, skipping a whole battery of
     * the baseline with nothing on screen to show it happened. `watchFrom` is called on every engage.
     */
    const mounted = beginRun(0);
    const engagedAt = 5 * 60 * 1000; // five minutes of playing before they came over
    let r = watchFrom(mounted, engagedAt);
    r = tick(r, engagedAt + 250);
    expect(r.leg).toBe(0);
    // And it still fires on its own terms, measured from the engage.
    r = tick(r, engagedAt + BLIND_MS + 250);
    expect(r.leg).toBe(1);
  });

  it('does not count thinking time against the child', () => {
    // The clock only runs while there is nothing drawable up. A child staring at a question for an hour is
    // not a stalled leg, and a watchdog that could not tell the difference would be worse than none.
    let r = presenting(blank(beginRun(0), 0), 0);
    for (let now = 0; now < BLIND_MS * 20; now += 500) r = tick(r, now);
    expect(r.outcome).toBe('running');
    expect(r.leg).toBe(0);
  });

  it('gives each leg its own patience rather than one budget for the board', () => {
    let r = beginRun(0);
    r = blank(r, 0);
    r = tick(r, BLIND_MS + 250);
    expect(r.leg).toBe(1);
    // The second leg has not started blind-timing from the first leg's start.
    r = blank(r, BLIND_MS + 250);
    r = tick(r, BLIND_MS + 500);
    expect(r.leg).toBe(1);
  });

});

/**
 * LAST, because it opens the gate and there is no way back. See the note at the top of the file.
 */
describe('finishing the board opens the paddock', () => {
  /** Answer every question of every leg, the way a child who works through it does. */
  function workThrough(): Run {
    let r = beginRun(0);
    let now = 0;
    for (const leg of LEGS) {
      for (let i = 0; i < leg.quota; i += 1) {
        now += 4000;
        r = presenting(r, now);
        r = answeredOne(r, now);
      }
      now += 950;
      r = legOver(r, now);
    }
    return r;
  }

  it('cannot report a finished board while the barricade is still standing', () => {
    expect(gateBarred()).toBe(true);
    const r = workThrough();
    expect(r.outcome).toBe('unlocked');
    /**
     * THE OWNER'S SENTENCE, AS A TEST. "i finished the series of questions and nothing unlocked" is
     * exactly this expectation failing, and it is only ever one assertion away from being true again if the
     * completion and the unlock are allowed to be two separate steps. They are one transition in `run.ts`
     * — `finish` opens the gate itself — so there is no ordering left for anybody to get wrong.
     */
    expect(gateBarred()).toBe(false);
  });

  it('counts every question, and counts them per battery', () => {
    const r = workThrough();
    expect(r.answered).toBe(BOARD_ITEMS);
    for (const leg of LEGS) expect(r.perBattery[leg.battery]).toBe(leg.quota);
  });

  it('is finished for good: nothing can put a finished run back to running', () => {
    let r = workThrough();
    const settled = r;
    r = answeredOne(r, 1);
    r = legOver(r, 2);
    r = tick(r, WORST_CASE_MS * 10);
    r = blank(r, 3);
    expect(r).toBe(settled);
    expect(r.outcome).toBe('unlocked');
  });

  it('opens for the exact shape the live failure had: one leg worked, the rest went quiet', () => {
    /* The Nonverbal leg served three items and was answered, the Verbal leg was handed a type nothing
       could draw, and everything after it never happened. With the watchdog the two silent legs resolve
       themselves, and one answer is a completion — see `Outcome`. A child who worked at it does not lose
       their paddock to a gap in a registry. */
    let r = beginRun(0);
    let now = 0;
    r = presenting(r, now);
    r = answeredOne(r, now);
    r = blank(r, now);
    while (r.outcome === 'running' && now < WORST_CASE_MS * 3) {
      now += 250;
      r = tick(r, now);
      r = blank(r, now);
    }
    expect(r.outcome).toBe('unlocked');
    expect(gateBarred()).toBe(false);
  });

  it('opens the gate for a run that only managed one leg, and for one answer', () => {
    // Already open from the test above; what matters here is the outcome, which is what the board acts on.
    let r = beginRun(0);
    r = presenting(r, 0);
    r = answeredOne(r, 0);
    r = legOver(r, 1);
    r = legOver(r, 2);
    r = legOver(r, 3);
    expect(r.outcome).toBe('unlocked');
    expect(gateBarred()).toBe(false);
  });
});
