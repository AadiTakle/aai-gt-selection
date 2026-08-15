import { describe, expect, it } from 'vitest';

import {
  NO_SIGNALS,
  STEPS,
  WORST_CASE_MS,
  advance,
  begin,
  skip,
  type Signals,
  type StepId,
  type Tutorial,
} from './tutorial';

/**
 * THE TWO PROMISES, ASSERTED.
 *
 * The tour has to be impossible to get stuck in and impossible to see twice, and both are properties of
 * the machine rather than of anything drawn. So they are tested here, against the pure module, where a
 * counterexample is a loop rather than a play-through.
 *
 * The trap tests matter more than the rest of this file put together. There has already been one trap
 * bug in this game — `Game.tsx`'s own comment calls it THE TRAP BUG — where a station held the keeper
 * docked with nothing on screen to press, and the failure mode for a five-year-old is not a bug report,
 * it is a child who does not come back.
 */

/** Drive the machine forward in 200ms steps until it settles or the clock runs out. */
function run(from: Tutorial, signals: Signals, forMs: number, step = 200): { end: Tutorial; ticks: number } {
  let t = from;
  let ticks = 0;
  for (let now = from.at; now <= from.at + forMs; now += step) {
    t = advance(t, signals, now);
    ticks += 1;
    if (t.settled) break;
  }
  return { end: t, ticks };
}

const ALL: Signals = {
  looked: true,
  walked: true,
  atShop: true,
  bought: true,
  carrying: true,
  penned: true,
  boardDone: true,
};

describe('the tour cannot trap', () => {
  it('reaches a settled state on a child who does absolutely nothing', () => {
    const t = begin(0, false);
    const { end } = run(t, NO_SIGNALS, WORST_CASE_MS + 60_000);
    expect(end.settled).toBe(true);
    // Timed out rather than completed: nothing was done on the child's behalf.
    expect(end.step).toBe<StepId>('idle');
  });

  it('settles within the sum of its own timeouts and not one tick later', () => {
    const t = begin(0, false);
    const { end } = run(t, NO_SIGNALS, WORST_CASE_MS + 1000);
    expect(end.settled).toBe(true);
    expect(end.at).toBeLessThanOrEqual(WORST_CASE_MS + 1000);
  });

  it('gives every step a finite way past it', () => {
    for (const step of STEPS) {
      expect(Number.isFinite(step.skipMs)).toBe(true);
      expect(step.skipMs).toBeGreaterThan(0);
      // A nudge that is never said is a nudge that does not exist; a nudge with no words is fine.
      if (step.nudge) expect(step.nudgeMs).toBeGreaterThan(0);
      if (step.nudgeMs > 0) expect(step.nudgeMs).toBeLessThan(step.skipMs);
    }
  });

  it('never goes backwards, on any interleaving of signals', () => {
    let t = begin(0, false);
    let seen = t.index;
    // A deliberately awkward walk: signals arriving late, out of order and in bursts.
    const script: Partial<Signals>[] = [
      {},
      { penned: true },
      {},
      { looked: true },
      {},
      {},
      { carrying: true },
      { walked: true },
      {},
      { atShop: true },
      {},
    ];
    let signals: Signals = { ...NO_SIGNALS };
    for (let i = 0; i < script.length; i += 1) {
      signals = { ...signals, ...script[i] };
      for (let k = 0; k < 40; k += 1) {
        t = advance(t, signals, i * 20_000 + k * 500);
        expect(t.index).toBeGreaterThanOrEqual(seen);
        seen = t.index;
      }
    }
  });

  it('leaves the machine alone when nothing has changed', () => {
    const t = begin(0, false);
    const a = advance(t, NO_SIGNALS, 10);
    const b = advance(a, NO_SIGNALS, 20);
    expect(a).toBe(t);
    expect(b).toBe(t);
  });
});

describe('the tour cannot run twice', () => {
  it('says nothing at all to a keeper who has already seen it', () => {
    const t = begin(1234, true);
    expect(t.settled).toBe(true);
    expect(t.line).toBe('');
    expect(t.glyph).toBe('none');
    expect(t.mark).toBe('none');
    expect(t.say).toBe(0);
  });

  it('is a fixed point once settled, whatever happens afterwards', () => {
    const t = begin(0, true);
    expect(advance(t, ALL, 1)).toBe(t);
    expect(advance(t, NO_SIGNALS, 10_000_000)).toBe(t);
    expect(skip(t, 5)).toBe(t);
  });

  it('settles a live tour exactly once, so the caller persists once', () => {
    let t = begin(0, false);
    let settledAt = -1;
    for (let now = 0; now <= WORST_CASE_MS + 10_000; now += 250) {
      const was = t.settled;
      t = advance(t, NO_SIGNALS, now);
      if (t.settled && !was) {
        expect(settledAt).toBe(-1);
        settledAt = now;
      }
    }
    expect(settledAt).toBeGreaterThan(0);
  });
});

describe('the steps themselves', () => {
  it('runs greet, look, walk, shop, buy, vac, pen, board in that order', () => {
    expect(STEPS.map((s) => s.id)).toEqual(['greet', 'look', 'walk', 'shop', 'buy', 'vac', 'pen', 'board']);
  });

  it('walks the whole way through on a child who does each thing as it is asked', () => {
    let t = begin(0, false);
    let now = 0;
    const order: StepId[] = [t.step];
    const doIt: Partial<Record<StepId, keyof Signals>> = {
      look: 'looked',
      walk: 'walked',
      shop: 'atShop',
      buy: 'bought',
      vac: 'carrying',
      pen: 'penned',
      board: 'boardDone',
    };
    let signals: Signals = { ...NO_SIGNALS };
    for (let i = 0; i < 40 && !t.settled; i += 1) {
      const key = doIt[t.step];
      if (key) signals = { ...signals, [key]: true };
      now += 1500;
      const next = advance(t, signals, now);
      if (next.step !== t.step) order.push(next.step);
      t = next;
    }
    expect(order).toEqual(['greet', 'look', 'walk', 'shop', 'buy', 'vac', 'pen', 'board', 'done']);
    expect(t.settled).toBe(true);
  });

  it('does not ask for something the child has already done', () => {
    // Everything is already true except the board. The tour should collapse to it in one call.
    const t = begin(0, false);
    const nearly: Signals = { ...ALL, boardDone: false };
    // The greeting still runs — it is time-based and is not a task — so one timeout, then the collapse.
    const after = advance(t, nearly, STEPS[0]!.skipMs);
    expect(after.step).toBe<StepId>('board');
  });

  it('ends the tour from wherever the child is if they find the board early', () => {
    let t = begin(0, false);
    t = advance(t, NO_SIGNALS, 500);
    expect(t.step).toBe<StepId>('greet');
    const jumped = advance(t, { ...NO_SIGNALS, boardDone: true }, 900);
    expect(jumped.step).toBe<StepId>('done');
    expect(jumped.settled).toBe(true);
    // And she says something about it, because that is the one ending she has a line for.
    expect(jumped.line.length).toBeGreaterThan(0);
    expect(jumped.say).toBeGreaterThan(t.say);
  });

  it('nudges once, and the nudge is spoken rather than only shown', () => {
    let t = begin(0, false);
    // Past the greeting and into the first step that has a nudge.
    t = advance(t, NO_SIGNALS, STEPS[0]!.skipMs);
    expect(t.step).toBe<StepId>('look');
    const before = t.say;
    const nudged = advance(t, NO_SIGNALS, t.at + STEPS[1]!.nudgeMs);
    expect(nudged.nudged).toBe(true);
    expect(nudged.line).toBe(STEPS[1]!.nudge);
    expect(nudged.say).toBe(before + 1);
    // And only once.
    const again = advance(nudged, NO_SIGNALS, nudged.at + STEPS[1]!.nudgeMs + 500);
    expect(again).toBe(nudged);
  });

  it('never mentions being right, being wrong, or being clever', () => {
    const words = /\b(correct|wrong|right answer|score|clever|smart|well done|good job|test|quiz|grade)\b/i;
    for (const step of STEPS) {
      expect(step.line).not.toMatch(words);
      expect(step.nudge).not.toMatch(words);
    }
  });
});

describe('skipping', () => {
  it('stops the tour dead and completes nothing on the child’s behalf', () => {
    let t = begin(0, false);
    t = advance(t, NO_SIGNALS, 400);
    const done = skip(t, 500);
    expect(done.settled).toBe(true);
    expect(done.step).toBe<StepId>('idle');
    expect(done.line).toBe('');
    expect(done.mark).toBe('none');
    // No new line is spoken on the way out. Nan simply stops.
    expect(done.say).toBe(t.say);
  });

  it('is still skippable at the very last step', () => {
    let t = begin(0, false);
    let now = 0;
    while (!t.settled && t.step !== 'board') {
      now += 5000;
      t = advance(t, NO_SIGNALS, now);
    }
    expect(t.step).toBe<StepId>('board');
    expect(skip(t, now).settled).toBe(true);
  });
});
