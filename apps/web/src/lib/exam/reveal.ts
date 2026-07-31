import type { RawBankItem } from './bank-loader';

/**
 * Post-commit informational feedback, for the one family of types that cannot work without it.
 *
 * A Stage 2 learning block has to give the child something to learn FROM: the whole design rests on
 * a hidden system the child induces across ~30 items that never repeat, and induction with no
 * observable outcome is not induction (STAGE2_QUESTION_DESIGN §1.5). But the correct output cannot
 * travel in `content`, because that would put the key in the browser before the child answers, and
 * the renderer cannot derive it, because the badge->operator mapping is server-only. So the outcome
 * is sent back in the SUBMIT RESPONSE and the runner forwards it to the demo, which draws it as the
 * machine's next visible state.
 *
 * WHY THIS IS NOT A KEY LEAK, STATED PRECISELY. A reveal is produced only by `/api/exam-submit`,
 * only for an item the child has just committed an answer to, and the learning block never serves
 * an item twice (`selectNextNovelServedItem` excludes everything administered). There is no request
 * that returns a reveal for an unanswered item. What it does disclose is one (badge chain ->
 * output) observation of the hidden system, which is exactly what the child is meant to see and
 * exactly what the on-screen figure already shows them.
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

const REVEAL_BUILDERS: Record<string, RevealBuilder> = {
  /**
   * FLU-OPCHAIN-01: the machine completes its action. The option shown is the one the chain
   * produces, taken from the server-only key the verifier has just re-derived independently.
   */
  'FLU-OPCHAIN-01': (item) => {
    const key = item.answer.correctKey;
    return typeof key === 'string' && key.length > 0 ? { machineOutput: key } : null;
  },
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
