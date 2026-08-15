/**
 * WHETHER A CHILD CAN BE EXPECTED TO READ THIS ITEM'S WORDS — one rule, shared by both verbal types.
 *
 * ══ WHY THERE IS A RULE AT ALL, NOW THAT WORDS ARE ON SCREEN ══════════════════════════════════════
 *
 * The verbal battery is about words, so the words are shown. The owner's instruction says so and also
 * says what the limit is: "it just might not be as big of words as you're used to". Two things follow, and
 * only one of them is this file's business.
 *
 * NOT THIS FILE'S BUSINESS: making the words smaller. The bank's wording is the item — `packages/qbank`
 * validates a `frequency_band_ok` check against it and the difficulty scale is calibrated on it — so
 * paraphrasing `heartbroken` to `very sad` would silently re-author a validated item and move its
 * difficulty without moving its `difficulty` field. Nothing here rewrites a word.
 *
 * THIS FILE'S BUSINESS: refusing the items whose vocabulary is beyond the child however well it is drawn.
 * `VER-SORTBOT-01` reaches `ad hominem`, `syllogism`, `parsimonious`, `garrulous`, `abate` and
 * `clandestine`. Those are not "bigger words than you're used to", they are a graduate reading list, and
 * showing them larger does not help. Gate them out.
 *
 * ══ WHY `frequencyBand` AND NOT A WORD LIST OR AN AGE BAND ════════════════════════════════════════
 *
 * The bank declares its own vocabulary rarity, per item, in the served payload: `content.frequencyBand`
 * is a Zipf tier, 7 for `dog` down to 1 for `ephemeral`, and `provenance.validator` carries a
 * `frequency_band_ok` check that says the generator meant it. So the measurement already exists, it
 * arrives with the item, and it is the same number the bank was validated against.
 *
 * The two alternatives are both worse. A HAND-WRITTEN WORD LIST goes stale the moment the bank is
 * regenerated, silently, which is the argument `sortbotGate.ts` makes at length against listing itemIds.
 * GATING THE WHOLE AGE BAND — which is what the owner offered as the fallback — would cost 43 items at
 * 6-8 to remove 18 bad ones, and 25 of the survivors are good: `words that rhyme with cat`, `compound
 * words`, `words with double letters`, `past-tense verbs`. Those four are worth stopping on, because they
 * are unanswerable in PICTURES as a matter of what they are and perfectly answerable in words. They are
 * the clearest single demonstration that the old rule was the thing doing the damage, and a band gate
 * would throw them away.
 *
 * So the floor is a rarity tier, not a band. It happens to lie entirely inside 6-8 today, which is
 * reported rather than assumed — see `prove-drawn-types.ts`, which asserts the count per band.
 *
 * ══ WHERE THE FLOOR IS SET, AND WHAT IT COSTS ═════════════════════════════════════════════════════
 *
 * Zipf 2 and above is served; Zipf 1 is refused. Read off the two banks item by item rather than chosen:
 *
 *   tier 1  `miserly/frugal/parsimonious`, `strawman/ad hominem/syllogism`, `anchoring/recency`,
 *           `helium/neon/argon`, `basalt/granite/obsidian`, `diminish/abate/mitigate`. Eighteen items,
 *           every one of them 6-8, and no six-year-old and few thirteen-year-olds have this vocabulary.
 *
 *   tier 2  `frog/toad/newt`, `iron/copper/silver`, `navy/sky/azure`, `inch/meter/mile`,
 *           `seven/eleven/thirteen`, `quickly/softly/boldly`, and at 4-5 `cotton/wool/silk`,
 *           `lemon/lime/orange`, `pine/fir/cedar`. Ordinary words for the bands that get them. Served.
 *
 * There is nothing to decide for `VER-RELPAIR-01`: its rarest item is tier 3 (`gigantic`, `heartbroken`,
 * `foundation`) so this refuses none of its 100. That is worth stating rather than skipping — a floor that
 * removes nothing from one bank and 18 items from the other is evidence the floor is measuring the
 * vocabulary and not the type.
 */

/**
 * The rarest Zipf tier a child may be shown. Tier 1 is refused; everything from 2 up is served.
 *
 * A CONSTANT AND NOT A PARAMETER, deliberately. A gate whose strictness is passed in gets two callers
 * with two opinions, and the pool the server builds then differs from the pool the component believes it
 * is drawing — which is the exact failure both gate files were split out of their components to prevent.
 */
export const VOCAB_FLOOR = 2;

/**
 * Whether this item's own declared vocabulary tier is at or above the floor.
 *
 * MISSING OR MALFORMED PASSES. `frequencyBand` is present on all 200 items of both banks, so the only way
 * to reach the fallback is a bank that stopped declaring it — and in that case refusing everything would
 * empty the verbal battery over a missing field, which is a far worse failure than serving a hard word.
 * The shape gates in the two callers are what stand between a malformed payload and a child; this one
 * answers a question about vocabulary and nothing else.
 */
export function vocabularyInReach(content: Record<string, unknown>): boolean {
  const band = content.frequencyBand;
  if (typeof band !== 'number' || !Number.isFinite(band)) return true;
  return band >= VOCAB_FLOOR;
}
