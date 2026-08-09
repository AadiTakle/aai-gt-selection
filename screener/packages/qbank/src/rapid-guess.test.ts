/**
 * A response too fast to be an attempt is unscorable, not wrong.
 *
 * The only guessing protection before this was the static IRT floor, `c = 1/optionCount`. There was no
 * behavioural detection at all, while `latencyMs` was captured on every attempt and read by nothing.
 *
 * The plumbing already existed: an unscorable response is counted and excluded from the estimate, which is
 * exactly the right treatment. An attempt nobody can interpret must not be counted as a failure, and a click
 * that arrived before the child could have read the question is such an attempt.
 *
 * **Two things about the floors, because both are easy to get wrong in the expensive direction.**
 *
 * There is no latency data in this repo — attempts live in a `Map` that dies with the process — so every
 * constant here is invented. And the cost of the two errors is not symmetric. A floor set too low misses some
 * guesses. A floor set too high **discards real evidence from a fast, capable child**, and since unscorable
 * items are excluded from the estimate, it removes exactly the evidence that would have passed them. That runs
 * against this project's whole posture. So the floors are set to catch the physically implausible, not the
 * merely quick, and they sit far below any plausible reading time rather than near it.
 */

import { describe, expect, it } from 'vitest';

import type { BankRecord } from './bank';
import {
  RAPID_GUESS_BASE_MS,
  RAPID_GUESS_CAP_MS,
  grade,
  initialPosteriors,
  rapidGuessFloorMs,
} from './engine';

function figural(id: string, options = 4): BankRecord {
  return {
    itemId: id,
    typeCode: 'FLU-MATRIX-01',
    domain: 'fluid',
    difficulty: 10,
    ageBands: ['2-3'],
    content: { options: Array.from({ length: options }, (_, i) => ({ key: 'ABCDEFGH'[i] })) },
    answer: { correctKey: 'B' },
    scoring: { mode: 'deterministic_key' },
  } as unknown as BankRecord;
}

function wordy(id: string, words: number): BankRecord {
  return {
    itemId: id,
    typeCode: 'QUANT-WORD-01',
    domain: 'quantitative',
    difficulty: 10,
    ageBands: ['2-3'],
    content: {
      prompt: Array.from({ length: words }, (_, i) => `word${i}`).join(' '),
      options: [{ key: 'A' }, { key: 'B' }, { key: 'C' }, { key: 'D' }],
    },
    answer: { correctKey: 'B' },
    scoring: { mode: 'deterministic_key' },
  } as unknown as BankRecord;
}

describe('the floor comes off the item, not off a constant', () => {
  it('gives a text-heavy item a longer floor than a bare figural one', () => {
    // The requirement is explicitly per item type and not global: a paper folding item and a two-word
    // analogy have very different floors.
    expect(rapidGuessFloorMs(wordy('w', 30))).toBeGreaterThan(rapidGuessFloorMs(figural('f')));
  });

  it('grows with the number of options a candidate has to look at', () => {
    expect(rapidGuessFloorMs(figural('f8', 8))).toBeGreaterThan(rapidGuessFloorMs(figural('f2', 2)));
  });

  it('never goes below the base or above the cap', () => {
    // The cap matters. Past a couple of seconds we would be guessing about engagement rather than
    // measuring physical possibility, and that is where a floor starts destroying good evidence.
    const bare = { ...figural('bare'), content: {} } as BankRecord;
    expect(rapidGuessFloorMs(bare)).toBe(RAPID_GUESS_BASE_MS);
    expect(rapidGuessFloorMs(wordy('huge', 5000))).toBe(RAPID_GUESS_CAP_MS);
  });

  it('stays under the two seconds that the slowest plausible caller allows', () => {
    // Guards against a future edit pushing floors past what the project's own tools send. The smoke suite
    // answers at 2500ms, so a floor above that would make the whole suite unscorable and look like a
    // measurement change rather than a threshold mistake.
    expect(RAPID_GUESS_CAP_MS).toBeLessThan(2500);
  });
});

describe('a sub-floor response is unscorable rather than wrong', () => {
  const item = wordy('w1', 30);
  const floor = rapidGuessFloorMs(item);

  it('marks it null and says why', () => {
    const result = grade({ item, response: { key: 'B' }, latencyMs: floor - 1, posteriors: initialPosteriors() });
    expect(result.correct).toBeNull();
    expect(result.flags).toContain('rapid-guess');
  });

  it('leaves the posterior exactly as it was', () => {
    // The acceptance criterion. Not merely "does not count against them" — no evidence at all.
    const before = initialPosteriors();
    const snapshot = before.composite.snapshot();
    const result = grade({ item, response: { key: 'B' }, latencyMs: 10, posteriors: before });
    expect(result.posteriors.composite.snapshot()).toEqual(snapshot);
    expect(result.posteriors.byDomain.quantitative.snapshot()).toEqual(before.byDomain.quantitative.snapshot());
  });

  it('discards a correct answer that arrived too fast, which is the whole point', () => {
    // A lucky fast click must not become evidence of knowledge. This is the case the static guessing floor
    // cannot reach, because c is about the item and this is about the response.
    const result = grade({ item, response: { key: 'B' }, latencyMs: 5, posteriors: initialPosteriors() });
    expect(result.correct).not.toBe(true);
    expect(result.correct).toBeNull();
  });

  it('does not count a too-fast wrong answer against the candidate either', () => {
    const result = grade({ item, response: { key: 'A' }, latencyMs: 5, posteriors: initialPosteriors() });
    expect(result.correct).toBeNull();
    expect(result.flags).toContain('rapid-guess');
  });

  it('grades normally at and above the floor', () => {
    const atFloor = grade({ item, response: { key: 'B' }, latencyMs: floor, posteriors: initialPosteriors() });
    expect(atFloor.correct).toBe(true);
    expect(atFloor.flags).toEqual([]);

    const wrong = grade({ item, response: { key: 'A' }, latencyMs: floor + 500, posteriors: initialPosteriors() });
    expect(wrong.correct).toBe(false);
  });

  it('leaves an unmarkable response unmarkable without blaming speed', () => {
    // A response nobody could interpret is already null. It must not acquire a rapid-guess flag it did not
    // earn, or the transcript stops being able to tell the two apart.
    const result = grade({ item, response: { nonsense: true }, latencyMs: 5, posteriors: initialPosteriors() });
    expect(result.correct).toBeNull();
    expect(result.flags).not.toContain('rapid-guess');
  });
});

describe('the check can be turned off', () => {
  it('grades a fast response normally when the scale is zero', () => {
    // A host whose items are presented differently — pre-read aloud, or shown before the timer starts — has a
    // legitimate reason to disable this rather than fight it.
    const item = wordy('w2', 30);
    const result = grade({
      item,
      response: { key: 'B' },
      latencyMs: 5,
      posteriors: initialPosteriors(),
      rapidGuessFloorScale: 0,
    });
    expect(result.correct).toBe(true);
    expect(result.flags).toEqual([]);
  });

  it('scales the floor for a host that knows its population is slower', () => {
    const item = figural('f');
    const doubled = rapidGuessFloorMs(item, 2);
    expect(doubled).toBe(Math.min(RAPID_GUESS_CAP_MS, rapidGuessFloorMs(item) * 2));
  });
});

describe('the transcript can tell the two kinds of unscorable apart', () => {
  it('records the flag on the attempt', async () => {
    /**
     * `unscorable` used to mean one thing: nobody could mark it. It now also covers "answered too fast", and a
     * count that conflates them would hide a child clicking through a whole session. The flag travels on the
     * attempt so the transcript, the debug tray and any later person-fit work (1b.4) can separate them.
     */
    const { QbankSession } = await import('./session');
    const { buildPool } = await import('./engine');
    const item = wordy('w3', 30);
    const banks = new Map([
      ['QUANT-WORD-01', { typeCode: 'QUANT-WORD-01', domain: 'quantitative', scorable: [item], total: 1, excluded: {}, difficultyRange: [10, 10] as [number, number], ageBands: ['2-3'] }],
    ]);
    void buildPool;

    const session = new QbankSession(
      { abilityThreshold: 1, precision: { label: 't', confidenceAbove: 0.6, confidenceBelow: 0.9, minItems: 1, maxItems: 4, note: '' }, perDomainMinimum: 0, recommendProbability: 0.35 },
      banks as never,
      1,
    );
    const serve = session.nextItem();
    expect(serve).not.toBeNull();
    session.submit({ key: 'B' }, 5);

    const attempt = session.getAttempts().at(-1)!;
    expect(attempt.correct).toBeNull();
    expect(attempt.flags).toContain('rapid-guess');
    expect(session.state().unscorable).toBe(1);
  });
});
