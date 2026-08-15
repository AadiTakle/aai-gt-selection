import { tokenGlyph } from './eventMeaning';
import { vocabularyInReach } from './readability';

/**
 * Which `VER-RELPAIR-01` items may be served, and — separately — which of them may carry PICTURES.
 *
 * ══ WHY THIS IS A SEPARATE, DEPENDENCY-FREE FILE ══════════════════════════════════════════════════
 *
 * The same reason `sortbotGate.ts` is one. A predicate that lives inside `KinshipStone.tsx` runs AFTER the
 * engine has chosen the item: the child is already looking at the question and an answer will be recorded
 * against it, so declining to draw at that point produces an unanswerable item plus a blank panel, which is
 * strictly worse than not gating at all. A pool gate has to run in `apps/sanctuary/server-plugin.ts` when
 * the session is opened, in Vite's node context, which cannot import a `.tsx` that pulls in three and
 * React. So: no React, no three, no JSX, importing only `eventMeaning.ts` and `readability.ts`, neither of
 * which imports anything. `KinshipStone.tsx` re-exports from here, so there is exactly one pair of
 * predicates and they cannot drift between the pool and the panel.
 *
 * ══ WHAT THIS TYPE USED TO BE, AND WHY IT WAS THE WORST CASE IN THE DIRECTORY ══════════════════════
 *
 * It was ANSWERED BY LISTENING. `tokenGlyph` is an exact-match noun table built for `VER-SORTBOT-01`'s
 * vocabulary and against this bank it covers 91 of 445 distinct words; the count of items in which EVERY
 * word has a drawing is zero in all four bands. So the pairs were spoken aloud and the stone was ten blank
 * slabs with a turned ring on each. On a muted tab, a school image with no voice packages, in a noisy room
 * or for a deaf child, THE ITEM CONTAINED NOTHING AT ALL — and the owner, who can hear, reported exactly
 * that: "i can't hear anything with the headphone one so i have no clue what it means".
 *
 * A question with one channel fails completely when that channel fails. The words are now ON SCREEN and
 * the voice reinforces them, which is the right way round for an emerging reader and the only way round
 * that survives a silent machine.
 *
 * ══ WHY THE PICTURES STILL CANNOT COME, AND WHY THAT IS NOW CHEAP ═════════════════════════════════
 *
 * The measurement that made this type spoken is unchanged and it is worth keeping, because it is a fact
 * about the bank rather than about the old rule. Per band, items where every word has a drawing:
 *
 *     band   items   fully drawable   distinct words   drawn
 *     K-1      17          0                95           45
 *     2-3      20          0               124           39
 *     4-5      20          0               114           14
 *     6-8      43          0               214           31
 *
 * Zero everywhere, and not for want of a bigger table. The most frequent misses are the superordinate
 * halves of `is a kind of` pairs — `animal`, `fruit`, `insect`, `number`, `person` — and A CATEGORY HAS NO
 * APPEARANCE. Both ways out remain closed: draw `animal` as one of its members and in
 * `robin : bird | maple : tree | robin : nest | bird : wing` the correct pair becomes a bird beside a bird
 * while the stem shows two visibly different creatures, so the item INVERTS; draw it as a category badge
 * and the badge appears in the stem and in exactly one option, which hands over the answer.
 *
 * WHAT HAS CHANGED IS THE COST OF THAT ZERO. It used to mean "this type has no visual channel"; it now
 * means "this type's plates carry words and no cow". The words are the channel.
 *
 * ══ WHY PICTURES ARE STILL ALL-OR-NOTHING PER ITEM, WHICH IS THE ONE JUDGEMENT CALL HERE ═══════════
 *
 * The instruction is to keep the pictures where they are good, and the obvious reading is per word: draw
 * `dog`, leave `animal` bare. That is the wrong reading FOR THIS TYPE, and the reason is the same
 * inversion in a new costume.
 *
 * Picture coverage is not random with respect to the answer. In `dog : animal -> cat : paw | dog : bone |
 * robin : bird` the answer is `robin : bird`; `robin` and `bird` are the one pair whose two words collide
 * on a single drawing, so a per-word rule would show pictures on both distractors and leave THE CORRECT
 * PAIR as the only bare one on the stone. A five-year-old scanning for the odd one out finds the answer
 * without reading anything. Across the bank the undrawable word is systematically the category — which is
 * to say, systematically the thing the relation is about.
 *
 * So an item is drawn throughout or drawn nowhere. Today that is nowhere, for all 100, and the plates are
 * words alone — which is sufficient, which is the whole point of the change, and which is why this
 * predicate is no longer load-bearing enough to argue about.
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
 * never share a picture, one word appearing twice is the same object seen twice.
 *
 * ══ WHAT THE SERVE GATE CHECKS, AND WHY IT STILL REFUSES NOTHING ══════════════════════════════════
 *
 * Shape, and the vocabulary floor every verbal type now shares. It refuses 0 of 100 — the rarest item in
 * this bank is Zipf tier 3 (`gigantic`, `heartbroken`, `foundation`, `deafening`), which is ordinary
 * reading for the 6-8 band that gets it, and nothing here comes near the `ad hominem` tier that costs
 * `VER-SORTBOT-01` eighteen items. Applying the same floor to both types and reporting one refusal count of
 * 18 and one of 0 is what makes the floor a measurement rather than a knob.
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
 * MAY THIS ITEM BE SERVED. Shape and vocabulary.
 *
 * It rejects nothing in the bank as it stands, and saying so plainly is the point of it existing: a gate
 * that refuses nothing is a claim, and the claim is that every word of every item is one a child of that
 * band can be shown and can hear read aloud. The shape check is not decoration either — a malformed pair
 * would draw a stone with a hole in it and still take an answer.
 *
 * IT NO LONGER HAS AN UNCHECKABLE HAZARD BEHIND IT. This used to carry a warning that it could not know
 * whether the machine had a voice, because on a mute machine a spoken item with no pictures has nothing
 * left. The words are on the stone now, so a voiceless machine loses the reinforcement and keeps the
 * question, which is the difference between a deployment risk and a preference.
 */
export function kinshipStoneServes(content: Record<string, unknown>): boolean {
  return pairWords(content) !== null && vocabularyInReach(content);
}

/**
 * MAY THIS ITEM'S WORDS CARRY PICTURES as well as being read.
 *
 * All or nothing per item — the header argues why per-word pictures would mark the correct pair on this
 * type specifically. Returns false for all 100 items today. It is here so that a growing `eventMeaning.ts`
 * turns pictures on DELIBERATELY and measurably rather than silently, and `prove-drawn-types.ts` asserts
 * the count. A failure there is not a regression; it is a prompt to go and LOOK at the item that became
 * drawable.
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
