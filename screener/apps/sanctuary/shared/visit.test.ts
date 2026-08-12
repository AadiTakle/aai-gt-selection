import { describe, expect, it } from 'vitest';

import { visitOver } from './useSortie';

/**
 * The two different reasons a station closes, which are easy to conflate and mean opposite things about
 * whether the child should be invited back.
 */
describe('visitOver', () => {
  const going = { stopped: false };
  const measured = { stopped: true };

  it('ends the visit once the round has asked its questions', () => {
    expect(visitOver(going, 5, 5)).toBe(true);
  });

  it('keeps going before then', () => {
    expect(visitOver(going, 4, 5)).toBe(false);
  });

  it('does not overshoot the round by one', () => {
    /**
     * The regression this guards. The count lives in a ref because `advance` runs from a timer whose closure
     * captured the answer count from *before* the answer landed; reading React state there compared a stale
     * number and asked a sixth question every round.
     */
    expect(visitOver(going, 6, 5)).toBe(true);
  });

  it('ends the visit when the platform has finished measuring, whatever the round count', () => {
    expect(visitOver(measured, 1, 5)).toBe(true);
  });

  it('runs until the platform stops when no round length is set', () => {
    // Every caller behaved this way before stations had a set length, and the harness still does.
    expect(visitOver(going, 99, undefined)).toBe(false);
    expect(visitOver(measured, 1, undefined)).toBe(true);
  });
});
