import { grade, initialPosteriors, scoreResponse, type BankRecord } from '@gt/qbank/server';
import type { AnswerKeyRecord } from '@platform/domain';

/**
 * Mark a response against a stored key.
 *
 * Delegates to the prototype's own `scoreResponse` rather than reimplementing it. The scorable types were
 * authored independently and disagree about how an answer is addressed — a bare string, an object under
 * `key`, `selectedKey` or `value`, a 0-based index under `selectedIndex`, or a set of grid cells under
 * `cells` — and that accumulated knowledge is exactly the kind of thing that goes wrong when written twice.
 *
 * The type code has to travel with the key. `scoreResponse` tests it first, because a cell-set answer is
 * compared as a set before anything else looks at it; an earlier version of this function passed only the
 * key, which would have sent `SPA-PUNCH-01`'s 140 items down the string path to compare `'0,0|0,3'` against
 * a tap and mark every one of them wrong without raising anything.
 *
 * The record built here is minimal and deliberately so: `scoreResponse` reads `typeCode` and
 * `answer.correctKey` and nothing else, and inventing content or a difficulty it never looks at would
 * suggest those values mattered.
 */
export function markAgainstKey(key: AnswerKeyRecord, response: unknown): boolean | null {
  const record = {
    typeCode: key.typeCode,
    answer: { correctKey: key.correctKey },
  } as unknown as BankRecord;
  return scoreResponse(record, response);
}

export interface MarkOutcome {
  readonly correct: boolean | null;
  readonly flags: readonly string[];
}

/**
 * Mark a response, and decline to believe one that arrived too fast to be an attempt.
 *
 * `rapidGuessFloorMs` derives a per-item floor from how much there was to read and how many options there
 * were to consider, so a four-option figure matrix and a nine-option word problem get different floors. Under
 * it, the response is **unscorable rather than wrong** — a tap that fast is evidence about the interface, not
 * about the child, and counting it against them would let a bored moment lower an estimate.
 *
 * This matters far more in a game than on a web page. Tapping is cheap in Bramblebrook, the stations are
 * reachable at a run, and a child crossing the ranch can hit a pod wall in passing.
 *
 * Deliberately not `grade()`. That function also returns updated posteriors, and this platform rebuilds
 * belief from the trace so that live scoring and a backfill run the same derivation — taking its posteriors
 * would introduce a second path that could disagree. What is reused is the floor and the flag, which is the
 * part with the knowledge in it.
 */
export function markResponse(input: {
  readonly key: AnswerKeyRecord | null;
  readonly response: unknown;
  readonly latencyMs: number | null;
  readonly difficulty: number;
  readonly content: Record<string, unknown>;
  readonly floorScale?: number;
}): MarkOutcome {
  const record = {
    typeCode: input.key?.typeCode ?? '',
    difficulty: input.difficulty,
    content: input.content,
    answer: { correctKey: input.key?.correctKey ?? '' },
    scoring: { mode: input.key?.scoringMode ?? 'deterministic_key' },
  } as unknown as BankRecord;

  /**
   * `grade` is called for its judgement and its flags, and its posteriors are thrown away.
   *
   * `rapidGuessFloorMs` is not re-exported from `@gt/qbank/server`, and reaching past what a package chose to
   * export is worse than paying for one discarded posterior update. The posteriors must be discarded either
   * way: this platform rebuilds belief from the trace so that live scoring and a backfill run the same
   * derivation, and folding an incremental update in here would create a second path that could disagree
   * with it.
   */
  /**
   * No timing means no claim about timing.
   *
   * Passing zero would be a lie the engine believes: every floor is above zero, so an absent latency would be
   * flagged as instant and the response discarded. A caller that does not measure how long a child took has
   * not told us they were fast.
   */
  if (input.latencyMs === null) {
    return { correct: input.key ? markAgainstKey(input.key, input.response) : null, flags: [] };
  }

  const result = grade({
    item: record,
    response: input.response,
    latencyMs: input.latencyMs,
    posteriors: initialPosteriors(),
    ...(input.floorScale === undefined ? {} : { rapidGuessFloorScale: input.floorScale }),
  });

  return { correct: result.correct, flags: result.flags };
}
