/**
 * HOW AN OPTION IS ADDRESSED. One function, because it is one line and it is the whole hazard.
 *
 * `scoreResponse` has two paths that never meet: a numeric `correctKey` is marked against
 * `selectedIndex`, a string one against `key`. Which one an item uses is decided by the BANK, not by
 * the renderer, and it shows up as the presence or absence of a `key` field on the option:
 *
 *   `QUANT-SERIES-01` options are `{key: "A", value: 6}`   → addressed by letter
 *   `VER-SEQUENCE-01` options are `{order: [1, 0, 2]}`     → addressed by POSITION
 *
 * Getting this wrong does not throw, does not warn and does not look like a bug. It marks every item
 * of a whole family incorrect, silently and confidently, and the posterior fills with noise that
 * looks like a child who cannot sequence a story. That is why the rule lives in exactly one place
 * that both presentations import and that `prove-drawn-types.ts` drives against the live API rather
 * than re-deriving.
 */

/** What a presentation hands back for the option at `index`. Its `key` if it has one, else its position. */
export function handedFor(option: unknown, index: number): string {
  if (option && typeof option === 'object') {
    const key = (option as Record<string, unknown>).key;
    if (typeof key === 'string') return key;
  }
  return String(index);
}
