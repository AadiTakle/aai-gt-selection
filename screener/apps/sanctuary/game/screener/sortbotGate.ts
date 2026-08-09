import { tokenGlyph } from './eventMeaning';

/**
 * Which `VER-SORTBOT-01` items may be served at all.
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
 * React. Hence this file: no React, no three, no JSX, importing only `eventMeaning.ts`, which has no
 * imports of its own. `SortingGate.tsx` re-exports from here, so there is exactly one predicate and it
 * cannot drift between the pool and the panel.
 *
 * The alternative — generating a list of rejected itemIds — was rejected because a list goes stale the
 * moment the bank is regenerated, silently, and the assertion in `prove-drawn-types.ts` would then be the
 * thing lying.
 *
 * ══ WHAT IT CHECKS ════════════════════════════════════════════════════════════════════════════════
 *
 * Every token pictured, and every picture ON SCREEN AT ONCE distinct — worked examples and candidates
 * together, not candidates against each other.
 *
 * That last clause is the one that matters and it cost seven of the thirty-seven small-band items. The
 * coverage measurement everyone had been quoting (155/155 tokens drawn, 0 collisions at K-1 and 2-3)
 * compared options against options. The sorting gate is the first thing that ever drew the examples and
 * the candidates in one frame, so it is the first thing that could see a candidate colliding with an
 * EXAMPLE — and when that happens the item does not get harder, it inverts:
 *
 *     rule `toys`     IN: ball, doll   OUT: soup   options: play, brick, kite*
 *     rule `hot`      IN: fire, sun    OUT: ice    options: oven*, burn, book
 *
 * `play` is drawn as a ball, and a ball is already sitting in the IN bin. In five of the six the colliding
 * word is a DISTRACTOR, so a child reasoning honestly from the pictures sees a copy of something already
 * sorted IN, puts it back beside its twin, and is marked wrong. Those five would have taught the engine
 * that a competent child cannot categorise. The sixth collides on the answer and hands the item over free.
 *
 * No table change rescues them: the bank's distractors are deliberately non-member words drawn from the
 * category's own theme, and the only honest picture of such a word is a picture of a member. The items are
 * unanswerable in pictures as a matter of what they are made of.
 *
 * Serving 27 good items beats serving 37 with six traps in them.
 */
export const SORTING_GATE_BANDS: readonly string[] = ['K-1', '2-3'];

/**
 * THREE ITEMS REFUSED BY NAME, because no rule over the served payload can catch them.
 *
 * Found by LOOKING at screenshots, which is the only way they could have been found. In the collisions
 * above every picture is fine and two are the same; here every picture is distinct and one of them is a
 * picture of the wrong thing.
 *
 * All three categories are defined by a VISIBLE attribute — red, four-sided, frozen — so the item is
 * answerable only if the drawing carries that attribute. `tokenGlyph` maps an undrawable word onto its
 * nearest picturable neighbour, which is right almost everywhere in this bank and exactly wrong here,
 * because the neighbour is chosen for what the WORD means while the item asks about what the PICTURE looks
 * like. `things that are frozen` is the worst: the answer `hail` draws as brown pebbles while the
 * distractor `cold` draws as a real ice crystal, so looking for the frozen thing finds the wrong answer.
 *
 * Keyed on the words, which is all the client is given — the rule lives in `provenance.derivation` on disk
 * and is never served, since it is the answer. A word-list key is brittle against a regenerated bank, and
 * that is a property: `prove-drawn-types.ts` asserts the pool is exactly 27, so a changed bank fails
 * loudly instead of quietly serving an unanswerable item again.
 */
const REFUSED: ReadonlySet<string> = new Set([
  // rule `things that are red`
  'tomato|rose|leaf|lime|cloud|brick|color',
  // rule `things with four sides`
  'box|tile|ball|corner|song|triangle|door',
  // rule `things that are frozen`
  'ice|snow|steam|glass|cold|hail|drum',
]);

/** Every word the child would be shown at once: both bins and the whole shelf. */
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
 * Whether one item can honestly be drawn — the measurement itself, applied to the item in hand, rather
 * than the band summary beside it. Running it over the bank rejects 20 of 20 at 4-5 and 43 of 43 at 6-8,
 * every single item of both, so it SUBSUMES `SORTING_GATE_BANDS` rather than merely agreeing with it.
 */
export function sortingGateServes(content: Record<string, unknown>): boolean {
  const words = tokenWords(content);
  if (words.length === 0) return false;
  const marks = words.map(tokenGlyph);
  if (marks.some((m) => !m.matched)) return false;
  const seen = new Set(marks.map((m) => `${m.glyph}/${m.state}`));
  if (seen.size !== marks.length) return false;
  return !REFUSED.has(words.map((w) => w.toLowerCase()).join('|'));
}
