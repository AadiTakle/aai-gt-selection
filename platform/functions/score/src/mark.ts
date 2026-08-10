import { scoreResponse, type BankRecord } from '@gt/qbank/server';
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
