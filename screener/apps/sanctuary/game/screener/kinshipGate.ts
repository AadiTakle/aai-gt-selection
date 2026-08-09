import { tokenGlyph } from './eventMeaning';

/**
 * Which `VER-RELPAIR-01` items may be served, and — separately — which of them may be DRAWN.
 *
 * ══ WHY THIS IS A SEPARATE, DEPENDENCY-FREE FILE ══════════════════════════════════════════════════
 *
 * The same reason `sortbotGate.ts` is one. A predicate that lives inside `KinshipStone.tsx` runs AFTER the
 * engine has chosen the item: the child is already looking at the question and an answer will be recorded
 * against it, so declining to draw at that point produces an unanswerable item plus a blank panel, which is
 * strictly worse than not gating at all. A pool gate has to run in `apps/sanctuary/server-plugin.ts` when
 * the session is opened, in Vite's node context, which cannot import a `.tsx` that pulls in three and
 * React. So: no React, no three, no JSX, importing only `eventMeaning.ts`, which has no imports of its own.
 * `KinshipStone.tsx` re-exports from here, so there is exactly one pair of predicates and they cannot drift
 * between the pool and the panel.
 *
 * ══ WHY THERE ARE TWO PREDICATES AND NOT ONE ══════════════════════════════════════════════════════
 *
 * `sortbotGate.ts` has one, because `VER-SORTBOT-01` is answered by looking and an item it cannot draw is
 * an item it cannot serve. This type is answered by LISTENING — see the header of `KinshipStone.tsx` for
 * why — and speech has no vocabulary gap, so the two questions come apart:
 *
 *   `kinshipStoneServes`  may a child be given this item at all?   Shape only. Rejects 0 of 100.
 *   `kinshipStoneDraws`   may its words be shown as pictures too?  Rejects 100 of 100 today.
 *
 * Only the first belongs in `excludeItemIds`. Wiring the second into the pool would delete the whole bank
 * for failing a test it does not have to pass.
 *
 * ══ WHAT THE PICTURE MEASUREMENT FOUND, WHICH IS WHY THIS TYPE IS SPOKEN ══════════════════════════
 *
 * `tokenGlyph` is an exact-match noun table built for `VER-SORTBOT-01`'s vocabulary, and against this bank
 * it covers 91 of 445 distinct words. Measured per band, items where every word has a drawing:
 *
 *     band   items   fully drawable   distinct words   drawn
 *     K-1      17          0                95           45
 *     2-3      20          0               124           39
 *     4-5      20          0               114           14
 *     6-8      43          0               214           31
 *
 * Zero, everywhere, and not for want of a bigger table. The most frequent misses are the superordinate
 * halves of `is a kind of` pairs — `animal`, `fruit`, `insect`, `number`, `person` — and a category has no
 * appearance. Any honest drawing of `animal` is a drawing of some particular animal, which is the sentence
 * `sortbotGate.ts` arrives at from the other direction. Both ways out are closed:
 *
 *   Draw the category as one of its members and the correct pair becomes THE SAME PICTURE TWICE. In
 *     `robin : bird | maple : tree | robin : nest | bird : wing` the answer is `robin : bird`, and a robin
 *     drawn honestly is a bird, so the child is shown a bird beside a bird while the stem shows two visibly
 *     different creatures — the pair that shares the relation is the one pair that plainly does not match.
 *     The item does not get harder, it INVERTS.
 *
 *   Draw it as a category badge instead and the badge hands over the answer: a mark meaning "this one is a
 *     kind of thing" appears in the stem and in exactly one option.
 *
 * So the words are SPOKEN, and pictures are support rather than the channel.
 *
 * ══ THE DISTINCTNESS CLAUSE, WHICH GOVERNS DRAWING AND NOT SERVING ════════════════════════════════
 *
 * `sortbotGate.ts` spells "every picture on screen at once distinct" as
 * `new Set(marks).size === marks.length` — signatures counted against WORDS. That is correct there and
 * WRONG HERE, and copying it was the first thing this file did. No item in the sorting bank names the same
 * word twice; ALL 100 OF THESE DO, because the `surface_match` lure is built by reusing one of the stem's
 * own words:
 *
 *     stem  dog : animal      options   cat : paw     dog : bone     robin : bird
 *                                                     ^^^
 *
 * `dog` appears twice and must draw as the same dog both times — that repetition IS the lure, and a child
 * who sees the stem's dog turn up again in a pair that is not about kinds has read the item exactly right.
 * Counting signatures against words scores that as a collision and rejects the entire bank, 100 of 100, for
 * doing the one thing it was authored to do.
 *
 * The clause is therefore kept but CORRECTED to injectivity over DISTINCT words: two different words may
 * never share a picture, one word appearing twice is the same object seen twice. It is not dropped,
 * because the hazard it was written for is sharper here than at the gate — if `paw` and `bone` draw alike,
 * or an option's second word draws like the stem's, it is the RELATION that becomes unreadable, not one
 * option, and every candidate collapses to the same claim. It just has no business deciding what is
 * served, now that being undrawable no longer means being unanswerable.
 */

/* ============================================================================
   reading the payload
   ========================================================================== */

/** The two `{text}` of one pair, in reading order, or `null` if it is not a well-formed pair. */
function pairOf(value: unknown): [string, string] | null {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const texts = value.map((o) => {
    const t = (o as Record<string, unknown> | null)?.text;
    return typeof t === 'string' ? t.trim() : '';
  });
  if (texts.some((t) => t.length === 0)) return null;
  return [texts[0]!, texts[1]!];
}

/** The stem pair and every option pair, in reading order, or `null` if the payload is not this shape. */
export function pairsOf(content: Record<string, unknown>): { stem: [string, string]; options: [string, string][] } | null {
  const stem = pairOf(content.stemPair);
  if (!stem) return null;
  const raw = Array.isArray(content.options) ? (content.options as Record<string, unknown>[]) : [];
  if (raw.length < 2) return null;
  const options: [string, string][] = [];
  for (const o of raw) {
    const p = pairOf(o?.pair);
    if (!p) return null;
    options.push(p);
  }
  return { stem, options };
}

/**
 * Every word the child is given at once, in reading order, repeats intact.
 *
 * Repeats intact because the caller that draws needs the order and the caller that measures needs to know
 * that a word said twice is one object, not two — see the distinctness note in the header.
 */
export function pairWords(content: Record<string, unknown>): string[] | null {
  const p = pairsOf(content);
  if (!p) return null;
  return [...p.stem, ...p.options.flat()];
}

/** Case, spacing and a leading article, matching `tokenGlyph`'s own normalisation. */
function normalise(text: string): string {
  return text.trim().toLowerCase().replace(/^(a|an|the)\s+/, '');
}

/* ============================================================================
   the two questions
   ========================================================================== */

/**
 * MAY THIS ITEM BE SERVED. Shape, and nothing else.
 *
 * It rejects nothing in the bank as it stands, and saying so plainly is the point of it existing: a gate
 * that refuses nothing is a claim, and the claim is that every word of every item reaches the child
 * through the voice. The shape check is not decoration either — a malformed pair would draw a stone with a
 * hole in it and still take an answer.
 *
 * THE ONE THING THIS CANNOT CHECK is whether the machine has a voice. `speechSynthesis` is absent on some
 * school images and silently mute on others, and on such a machine an item with no pictures has nothing
 * left. That cannot be decided server-side when the pool is built, so it is not decided here; the
 * component detects it (`narration === 'unavailable'`) and it is written up in `KinshipStone.tsx` as the
 * operational risk it is.
 */
export function kinshipStoneServes(content: Record<string, unknown>): boolean {
  return pairWords(content) !== null;
}

/**
 * MAY THIS ITEM'S WORDS BE SHOWN AS PICTURES as well as spoken.
 *
 * ALL OR NOTHING PER ITEM, and that is the whole design decision. Drawing the pairs that happen to be
 * drawable and leaving the rest blank would make some candidates carry a picture and others not, and a
 * candidate with a picture on it is the one a child looks at. That is a preference produced by the noun
 * table rather than by the item — the same class of fault as a clearcoat highlight marking one card as
 * chosen — so an item is either drawn throughout or drawn nowhere, and uniform blankness is the honest
 * state of a spoken item.
 *
 * Returns false for all 100 items today. It is here so that a growing `eventMeaning.ts` turns pictures on
 * DELIBERATELY and measurably rather than silently, and `prove-drawn-types.ts` asserts the count.
 */
export function kinshipStoneDraws(content: Record<string, unknown>): boolean {
  const words = pairWords(content);
  if (!words) return false;
  const distinct = [...new Set(words.map(normalise))];
  const marks = distinct.map(tokenGlyph);
  if (marks.some((m) => !m.matched)) return false;
  // Injective over DISTINCT words — see the header for why this is not `marks.length`.
  return new Set(marks.map((m) => `${m.glyph}/${m.state}`)).size === distinct.length;
}
