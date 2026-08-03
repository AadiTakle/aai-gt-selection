import type { RawBankItem } from './bank-loader';

/**
 * Post-commit informational feedback, for the one family of types that cannot work without it.
 *
 * A Stage 2 learning block has to give the child something to learn FROM: the whole design rests on
 * a hidden system the child induces across ~30 items that never repeat, and induction with no
 * observable outcome is not induction (STAGE2_QUESTION_DESIGN §1.5). But the correct output cannot
 * travel in `content`, because that would put the key in the browser before the child answers, and
 * the renderer cannot derive it, because every one of these types keeps its symbol->meaning mapping
 * server-only. So the outcome is sent back in the SUBMIT RESPONSE and the runner forwards it to the
 * demo, which draws it as the mechanism's next visible state.
 *
 * WHY THIS IS NOT A KEY LEAK, STATED PRECISELY. A reveal is produced only by `/api/exam-submit`,
 * only for an item the child has just committed an answer to, and the learning block never serves
 * an item twice (`selectNextNovelServedItem` excludes everything administered). There is no request
 * that returns a reveal for an unanswered item. What it does disclose is one (stimulus -> outcome)
 * observation of the hidden system, which is exactly what the child is meant to see and exactly
 * what the on-screen figure already shows them.
 *
 * WHAT IT IS NOT ALLOWED TO BE. Not a verdict. The field names the option the MACHINE made, never
 * whether the child was right, and the renderer is required to present it as world-state with no
 * tick, score, streak or praise (§1.5; Kluger & DeNisi 1996; Deci, Koestner & Ryan 1999). The
 * response already carries `correct` for the client-side adaptive engine; the reveal adds no
 * evaluation on top of it.
 *
 * The map below is the whole surface. A type absent from it gets no reveal, which is the default.
 */

export interface ItemReveal {
  /** Option key of the output the machine produced. Never described as "the correct answer". */
  machineOutput: string;
}

type RevealBuilder = (item: RawBankItem) => ItemReveal | null;

/**
 * The one option key this item's mechanism resolved to, or `null` when the bank names none.
 *
 * Every reveal in this file is this and nothing else, and that is what bounds how much a reveal
 * can disclose. The browser already holds all of this item's options — it is drawing them — so
 * naming one adds a single (stimulus -> outcome) observation and no part of the system that
 * produced it. One observation is what §1.5 requires the block to supply and is far short of the
 * mapping: an item at composition depth 1 pins at most one primitive of a closed vocabulary of
 * five or six, and above depth 1 it pins none, because only the composition's net effect is
 * visible.
 *
 * It is also why a reveal cannot carry a verdict even by accident. A builder is handed the ITEM;
 * the child's response is not a parameter and is not in scope here. There is no expression in this
 * file that could evaluate to one thing for a child who was right and another for a child who was
 * wrong.
 */
function optionTheMechanismResolvedTo(item: RawBankItem): ItemReveal | null {
  const key = item.answer.correctKey;
  return typeof key === 'string' && key.length > 0 ? { machineOutput: key } : null;
}

const REVEAL_BUILDERS: Record<string, RevealBuilder> = {
  /**
   * FLU-OPCHAIN-01: the machine completes its action. The option shown is the one the chain
   * produces, taken from the server-only key the verifier has just re-derived independently.
   */
  'FLU-OPCHAIN-01': optionTheMechanismResolvedTo,
  /**
   * SPA-XFORM-01: the same machine frame over a lattice. Same argument, and the generator states
   * it from its own side — the correct output is deliberately kept out of `content` because the
   * renderer cannot be allowed to know it, so the reveal is the only path by which a child ever
   * sees what the machine made.
   */
  'SPA-XFORM-01': optionTheMechanismResolvedTo,
  /**
   * QUANT-GLYPHNUM-01: the machine puts its writing at a place on the line, and the reveal names
   * which of the five plates that place is.
   *
   * This is the weakest reveal of the four, because the position it points at is already on
   * screen: `content.options` carries all five tick RATIOS, so the reveal moves no number to the
   * browser that the browser did not already have — it selects one of five it is drawing. What the
   * child gains is one (expression -> magnitude) observation, and it does not resolve any glyph's
   * value on its own, because the line's numeric maximum stays server-only and a ratio without it
   * is not a quantity.
   *
   * This type grades on a placement tolerance rather than on the key
   * (`scoring.rule = 'placement_tolerance'`), so `correctKey` is here the tick the target ratio
   * falls on. `stage2-reveal.test.ts` holds that to the verifier: the revealed plate must be the
   * unique plate the shipped verifier scores correct, or the machine would be shown putting its
   * writing somewhere the server does not grade.
   */
  'QUANT-GLYPHNUM-01': optionTheMechanismResolvedTo,
  /**
   * VER-MORPHO-01: the system resolves the instance — which picture the written word means, or
   * which word names the pictured thing, depending on the item's direction.
   *
   * Of the four this is the type a missing reveal hurt most, and it shipped without one: the whole
   * of a child's evidence about an affix is the pairing between a word and a picture, so a silent
   * block closes not one pairing and the child leaves with nothing about the language they were
   * asked to induce. What one reveal discloses is one pairing, read against the reference stem
   * already on the bench — one affix of six at depth 1, and less than one above it. The affix map
   * itself is named nowhere in the payload.
   */
  'VER-MORPHO-01': optionTheMechanismResolvedTo,
};

/**
 * The reveal for a committed item, or `null`.
 *
 * Callers must only invoke this AFTER the response has been verified and recorded, and must never
 * send it for a skipped item: a child who skipped did not commit a retrieval attempt, so showing
 * them the outcome would turn a skip into a free exposure (Roediger & Karpicke 2006).
 */
export function revealFor(item: RawBankItem): ItemReveal | null {
  return REVEAL_BUILDERS[item.typeCode]?.(item) ?? null;
}

/** Type codes that produce a reveal at all — used by the tests that police the boundary. */
export const REVEAL_TYPE_CODES: readonly string[] = Object.keys(REVEAL_BUILDERS);
