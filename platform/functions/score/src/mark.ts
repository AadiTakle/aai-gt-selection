import { scoreResponse, type BankRecord } from '@gt/qbank/server';

/**
 * Mark a response against a key.
 *
 * Delegates to the prototype's own `scoreResponse` rather than reimplementing it. The 53 scorable
 * types were authored independently and do not agree about where they put the selected option — some
 * report a bare string, others an object under `key`, `selectedKey` or `value` — and that accumulated
 * knowledge is exactly the kind of thing that goes wrong when it is written twice.
 *
 * `scoreResponse` reads only `record.answer.correctKey`, so a minimal record carries everything it
 * needs. The cast is narrow and deliberate: building a whole `BankRecord` here would mean inventing
 * content and difficulty that the marker never looks at.
 */
export function markAgainstKey(correctKey: string, response: unknown): boolean | null {
  return scoreResponse({ answer: { correctKey } } as BankRecord, response);
}
