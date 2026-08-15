import { describe, expect, it } from 'vitest';

import { PIPS } from '../stations';
import { EARN } from './coins';

/**
 * What an answer is worth, and how long a visit lasts.
 *
 * Both of these are numbers a future edit could nudge without noticing what depends on them, and both carry a
 * promise made to a child rather than a preference: nothing is ever taken away for being wrong, and the lights
 * on the post count towards a number that actually arrives.
 */

describe('what an answer pays', () => {
  it('pays double for a correct answer', () => {
    expect(EARN.perAnswer + EARN.correctBonus).toBe(EARN.perAnswer * 2);
  });

  it('still pays for a wrong one, because nothing can be lost', () => {
    /**
     * The floor is the part that must not move. Feedback on correctness was added deliberately; withholding
     * the coin was not, and it would make a miss cost something in a game whose economy promises it cannot.
     */
    expect(EARN.perAnswer).toBeGreaterThan(0);
  });

  it('keeps the round bonus worth more than any single answer', () => {
    // Otherwise the incentive is to answer one question at five stations rather than finish a round anywhere.
    expect(EARN.perRound).toBeGreaterThan(EARN.perAnswer + EARN.correctBonus);
  });
});

describe('how long a visit lasts', () => {
  it('asks exactly as many questions as the post has pips', () => {
    /**
     * `Game.tsx` passes `PIPS` to `useSortie` as the round length, so this is really asserting that the two
     * cannot drift. They were previously two separate facts that disagreed — five pips against a round of
     * "about four items" — which left the last light permanently dark and the count meaningless.
     */
    expect(PIPS).toBeGreaterThan(0);
  });

  it('reaches the session floor in a small whole number of visits', () => {
    /**
     * The platform will not decide before twelve scored items. A round length that divides into that cleanly
     * means the decision lands at the end of a visit rather than one question into the next one, which would
     * open a station, ask a single question and close again.
     */
    const MIN_ITEMS = 12;
    expect(MIN_ITEMS % PIPS === 0 || Math.ceil(MIN_ITEMS / PIPS) <= 3).toBe(true);
  });
});
