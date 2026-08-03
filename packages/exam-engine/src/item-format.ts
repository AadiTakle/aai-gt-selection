/**
 * Facts about an item's RESPONSE FORMAT, read off the bank record rather than declared per type.
 *
 * Two callers need the same fact for unrelated reasons — burst policy asks whether an item is a
 * one-tap choice, and the Phase 2 learning-curve fit asks what a child who knows nothing scores on
 * it — and both answers turn on the option count. Keeping one reader means a bank whose format
 * changes moves both at once, which a per-type table of counts would not: the table would still
 * hold the old number and nothing would say so.
 *
 * Pure: no I/O, no framework, no node-only APIs.
 */
import type { ItemContent } from './types';

/** The minimum an item must expose to be read here; both `BankItem` and `ServedItem` satisfy it. */
export interface FormattedItem {
  readonly content: ItemContent;
}

/**
 * How many options an item offers, or `null` when it declares no option list at all.
 *
 * Two spellings are accepted because the engine runs over two different views of the same bank. A
 * full bank item carries the option list itself. A selection index carries only `optionCount`: the
 * pool a browser selects over is fetched without stimulus content (megabytes of it), so the count
 * is sent instead, and burst policy has to decide before an item's content exists.
 *
 * A DECLARED count is returned as it stands, including a degenerate 0 or 1, rather than being
 * folded into `null`. "Declares no options" and "declares an option list that cannot be chosen
 * from" are different facts about a bank, and the two callers want different things done about
 * them — so the judgment belongs to each caller rather than being made here.
 */
export function itemOptionCount(item: FormattedItem): number | null {
  const content = item.content as { options?: unknown; optionCount?: unknown };
  if (Array.isArray(content.options)) return content.options.length;
  if (typeof content.optionCount === 'number' && Number.isFinite(content.optionCount)) {
    return content.optionCount;
  }
  return null;
}
