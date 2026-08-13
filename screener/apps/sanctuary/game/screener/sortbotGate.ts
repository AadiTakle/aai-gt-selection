import { tokenGlyph } from './eventMeaning';
import { vocabularyInReach } from './readability';

/**
 * Which `VER-SORTBOT-01` items may be served, and — separately — which of them may carry PICTURES.
 *
 * ══ WHY THIS IS A SEPARATE, DEPENDENCY-FREE FILE ══════════════════════════════════════════════════
 *
 * The gate began life inside `SortingGate.tsx`, and there it could not do its job. A render-time
 * predicate runs AFTER the engine has chosen the item: the child is already looking at the question and an
 * answer will be recorded against it, so declining to draw it produces an unanswerable item plus a blank
 * panel, which is worse than not gating at all.
 *
 * The gate has to remove items from the POOL, which happens in `apps/sanctuary/server-plugin.ts` when a
 * session is opened. That runs in Vite's node context and cannot import a `.tsx` that pulls in three and
 * React. Hence this file: no React, no three, no JSX, importing only `eventMeaning.ts` and
 * `readability.ts`, neither of which imports anything. `SortingGate.tsx` re-exports from here, so there is
 * exactly one pair of predicates and they cannot drift between the pool and the panel.
 *
 * ══ WHAT CHANGED, AND WHY THE POOL WENT FROM 27 TO 82 ═════════════════════════════════════════════
 *
 * This gate used to answer ONE question — can the item be drawn as pictures — because pictures were the
 * only channel: `presentation` is `"word"` and the whole screener was built on the rule that a
 * five-year-old cannot read, so a word that could not be drawn was a word that could not be asked. That
 * rule is right for figure matrices and WRONG FOR THE VERBAL BATTERY, and this is one of the two places
 * where the damage was measurable. It refused 73 of 100 items:
 *
 *     band          items   served   why the rest went
 *     K-1 + 2-3       37       27    six picture collisions, three misleading substitutes
 *     4-5             20        0    19 had an unpicturable option; nothing draws `nylon` or `hydro`
 *     6-8             43        0    42 unpicturable, and 26 had two options drawn identically
 *
 * WORDS ARE NOW THE PRIMARY CHANNEL, so being undrawable no longer means being unanswerable, and none of
 * those numbers is a reason to refuse an item any more. The two questions come apart the way they already
 * had for `kinshipGate.ts`:
 *
 *   `sortingGateServes`  may a child be given this item at all?   Shape and vocabulary. Refuses 18.
 *   `sortingGateDraws`   may its words carry pictures too?        The old measurement, unchanged.
 *
 * Only the first belongs in `excludeItemIds`. The second decides decoration, and its failure now costs a
 * pre-reader a helpful cow beside the word `cow` rather than costing everybody the item.
 *
 * AND THE ITEMS THAT COME BACK ARE NOT FILLER. Four of the 6-8 rules are `words that rhyme with cat`,
 * `compound words`, `words with double letters` and `past-tense verbs`. Every one of those is a question
 * about the letters in a word: unanswerable in pictures as a matter of what it is, and immediately
 * answerable once the word is on screen. The old rule was not merely narrowing this bank, it was
 * specifically deleting the items that most needed words.
 *
 * ══ WHAT `sortingGateServes` STILL CHECKS, AND WHY EACH CLAUSE IS STILL THERE ══════════════════════
 *
 * SHAPE. A malformed payload would draw a machine with empty bins and still take an answer. It costs one
 * line and it is the difference between a bad item and a recorded response to nothing.
 *
 * EVERY WORD ON SCREEN DISTINCT. This is the survivor of the old distinctness clause and it is now counted
 * against WORDS rather than against pictures. It refuses nothing in the bank as it stands, which is said
 * plainly because a clause that refuses nothing looks like a clause nobody finished: two options with the
 * same word are two correct answers or none, and one bank regeneration is all it would take. The picture
 * version of this clause was the expensive one — it cost six good items at K-1 and 2-3 because `play` and
 * `ball` drew alike — and it moves to `sortingGateDraws` where it belongs.
 *
 * VOCABULARY. `readability.ts` carries the argument. Eighteen items of tier-1 vocabulary — `ad hominem`,
 * `abate`, `parsimonious`, `argon` — are refused, all of them at 6-8, because showing a word larger does
 * not teach it. This is the one clause that is new, and it is the owner's own instruction: gate the band
 * rather than inventing words. It gates a rarity tier instead, which is the same intent applied more
 * precisely — see `readability.ts` for what a band gate would have cost.
 *
 * ══ THE PICTURE PREDICATE, KEPT WHOLE ═════════════════════════════════════════════════════════════
 *
 * `sortingGateDraws` is the old `sortingGateServes` with nothing removed, because everything it caught is
 * still true of PICTURES. It is worth restating what it catches, since it is now the only thing standing
 * between a drawing and a child who trusts it:
 *
 *   TWO WORDS DRAWN ALIKE INVERTS THE ITEM. `rule toys, IN: ball, doll, OUT: soup, options: play, brick,
 *     kite*` — `play` draws as a ball and a ball is already sitting in the IN bin, so a child reasoning
 *     from the pictures sees a copy of something already sorted in, puts it back beside its twin, and is
 *     marked wrong. In five of the six the colliding word is a DISTRACTOR, so those five would have taught
 *     the engine that a competent child cannot categorise.
 *
 *   A SUBSTITUTE DRAWING CAN BE A PICTURE OF THE WRONG THING. `REFUSED` below, three items, all of them
 *     categories defined by a VISIBLE attribute.
 *
 * Both hazards need pictures to happen. With the words on screen the same items are perfectly answerable,
 * so they are SERVED and drawn plain.
 */

/**
 * THREE ITEMS THAT MAY NEVER CARRY PICTURES, by name, because no rule over the served payload catches them.
 *
 * Found by LOOKING at screenshots, which is the only way they could have been found. In the collisions
 * above every picture is fine and two are the same; here every picture is distinct and one of them is a
 * picture of the wrong thing.
 *
 * All three categories are defined by a VISIBLE attribute — red, four-sided, frozen — so the item is
 * answerable from pictures only if the drawing carries that attribute. `tokenGlyph` maps an undrawable
 * word onto its nearest picturable neighbour, which is right almost everywhere in this bank and exactly
 * wrong here, because the neighbour is chosen for what the WORD means while the item asks what the PICTURE
 * looks like. `things that are frozen` is the worst: the answer `hail` draws as brown pebbles while the
 * distractor `cold` draws as a real ice crystal, so looking for the frozen thing finds the wrong answer.
 *
 * ALL THREE ARE NOW SERVED, and that is the clearest small illustration of what this change buys. With the
 * words on screen, `hail` says `hail`; the drawing was the only thing that ever lied.
 *
 * Keyed on the words, which is all the client is given — the rule lives in `provenance.derivation` on disk
 * and is never served, since it is the answer. A word-list key is brittle against a regenerated bank, and
 * that is a property: `prove-drawn-types.ts` asserts the drawn count, so a changed bank fails loudly
 * instead of quietly drawing a misleading picture again.
 */
const REFUSED: ReadonlySet<string> = new Set([
  // rule `things that are red`
  'tomato|rose|leaf|lime|cloud|brick|color',
  // rule `things with four sides`
  'box|tile|ball|corner|song|triangle|door',
  // rule `things that are frozen`
  'ice|snow|steam|glass|cold|hail|drum',
]);

/** Every word the child would be shown at once: both bins and the whole shelf, in reading order. */
export function tokenWords(content: Record<string, unknown>): string[] {
  const texts = (v: unknown, dig: (o: Record<string, unknown>) => unknown): string[] =>
    (Array.isArray(v) ? (v as Record<string, unknown>[]) : [])
      .map((o) => dig(o ?? {}))
      .map((t) => (typeof t === 'string' ? t.trim() : ''))
      .filter((t) => t.length > 0);
  return [
    ...texts(content.examplesIn, (o) => o.text),
    ...texts(content.examplesOut, (o) => o.text),
    ...texts(content.options, (o) => (o.token as Record<string, unknown> | undefined)?.text),
  ];
}

/**
 * MAY THIS ITEM BE SERVED. Shape, distinct words, vocabulary in reach.
 *
 * Nothing about drawability, which is the whole point of the change — see the header. Rejects 18 of 100,
 * all of them on the vocabulary clause and all of them at 6-8.
 */
export function sortingGateServes(content: Record<string, unknown>): boolean {
  const words = tokenWords(content);
  const examplesIn = Array.isArray(content.examplesIn) ? content.examplesIn.length : 0;
  const examplesOut = Array.isArray(content.examplesOut) ? content.examplesOut.length : 0;
  const options = Array.isArray(content.options) ? content.options.length : 0;
  // The shape the machine draws: at least one worked example each way, and a real choice to make.
  if (examplesIn < 1 || examplesOut < 1 || options < 2) return false;
  if (words.length !== examplesIn + examplesOut + options) return false;
  // Two identical words on screen are two correct answers or none. Refuses nothing today; see the header.
  const lower = words.map((w) => w.toLowerCase());
  if (new Set(lower).size !== lower.length) return false;
  return vocabularyInReach(content);
}

/**
 * MAY THIS ITEM'S WORDS CARRY PICTURES as well as being read.
 *
 * ALL OR NOTHING PER ITEM, and that is not tidiness — it is the same hazard `kinshipGate.ts` sets out.
 * Picture coverage tracks CONCRETENESS, and whether the answer is the concrete one varies by item: in
 * `helium, neon | oxygen -> balloon, nitrogen, argon, granite` the two words `tokenGlyph` can draw are
 * both distractors, so drawing what can be drawn would leave the answer as the one bare plate on the
 * shelf. Per-word pictures would hand over a subset of items and take away a subset, and neither would be
 * visible in a screenshot of any one item. So an item is drawn throughout or not at all.
 *
 * The old measurement, unchanged, plus `REFUSED`. It is true for the 27 items of K-1 and 2-3 whose
 * pictures were already proven good, and for nothing else — which is exactly where a pre-reader needs
 * them most.
 */
export function sortingGateDraws(content: Record<string, unknown>): boolean {
  const words = tokenWords(content);
  if (words.length === 0) return false;
  const marks = words.map(tokenGlyph);
  if (marks.some((m) => !m.matched)) return false;
  const seen = new Set(marks.map((m) => `${m.glyph}/${m.state}`));
  if (seen.size !== marks.length) return false;
  return !REFUSED.has(words.map((w) => w.toLowerCase()).join('|'));
}
