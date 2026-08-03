/**
 * The scoring engine as a standalone cloud function (D-019).
 *
 * WHY THIS RUNS OUT OF PROCESS. Three reasons converge on the same shape:
 *
 * 1. Scoring must not happen on the child's device, or a score is something the client can assert.
 * 2. A score has to be reproducible from the stored trace — the outcome row's claim boundary says
 *    so — which means the computation must be a pure function of its recorded input.
 * 3. `@gt-selection/exam-scoring` is already self-contained: no database, no network, no framework.
 *    It lifts out cleanly, which is why this is the piece that becomes a function rather than
 *    something that merely could be.
 *
 * The handler therefore does exactly three things: validate the event, score it, and return the
 * outcome next to a fingerprint of what was scored. It deliberately does NOT read the database.
 * WHICH items are authoritative is a decision the caller has already made (see the exam-results
 * route: for a persisted session the only safe answer is the rows the database's own verifier
 * wrote). Re-deciding that here would put a second, competing answer in the system.
 */
import { DEFAULT_EXAM_POLICY, type ExamPolicy } from './../policy';
import { scoreExam } from './../scorer';
import type { ExamScore, ScoredItem } from './../types';
import { UncanonicalScorerInputError, scorerInputFingerprint } from './scorer-input-hash';

export {
  UncanonicalScorerInputError,
  canonicalScorerInput,
  scorerInputFingerprint,
} from './scorer-input-hash';

export interface ScoringLambdaEvent {
  /** Session the trace belongs to. Echoed back so a caller can correlate the response. */
  readonly sessionId: string;
  /** The authoritative scored items, already chosen by the caller. */
  readonly scoredItems: readonly ScoredItem[];
  /** Optional tunable policy; the deployed defaults are used when absent. */
  readonly policy?: ExamPolicy;
}

export interface ScoringLambdaResponse {
  readonly ok: boolean;
  readonly sessionId: string;
  readonly outcome: ExamScore | null;
  /**
   * Stable fingerprint of the exact input that produced `outcome`, in the `sha256:<64 hex>` form
   * `app.exam_scorer_input_hash` records and `packages/contracts` requires — the same value for
   * the same trace, so the two can be compared. Two runs that agree on this must agree on the
   * score; if they do not, the engine changed and the difference is a bug.
   */
  readonly inputHash: string | null;
  readonly itemsScored: number;
  readonly error?: string;
}

function isScoredItem(value: unknown): value is ScoredItem {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Partial<ScoredItem>;
  return (
    typeof item.itemId === 'string' &&
    typeof item.domain === 'string' &&
    typeof item.difficulty === 'number' &&
    Number.isFinite(item.difficulty) &&
    typeof item.score === 'number' &&
    Number.isFinite(item.score)
  );
}

/**
 * Score one session.
 *
 * Never throws: a malformed event comes back as `ok: false` with a reason, because the caller is a
 * queue or an HTTP route that has to record something either way, and a thrown error there loses
 * the session id that would let anyone find the run again.
 */
export function handler(event: ScoringLambdaEvent): ScoringLambdaResponse {
  const sessionId = typeof event?.sessionId === 'string' ? event.sessionId : '';
  if (!sessionId) {
    return {
      ok: false,
      sessionId: '',
      outcome: null,
      inputHash: null,
      itemsScored: 0,
      error: 'MISSING_SESSION_ID',
    };
  }
  if (!Array.isArray(event.scoredItems) || event.scoredItems.length === 0) {
    return {
      ok: false,
      sessionId,
      outcome: null,
      inputHash: null,
      itemsScored: 0,
      error: 'NO_SCORED_ITEMS',
    };
  }
  if (!event.scoredItems.every(isScoredItem)) {
    return {
      ok: false,
      sessionId,
      outcome: null,
      inputHash: null,
      itemsScored: 0,
      error: 'MALFORMED_SCORED_ITEM',
    };
  }

  const items = event.scoredItems;
  let inputHash: string;
  try {
    inputHash = scorerInputFingerprint(items);
  } catch (error) {
    // A value with no faithful `jsonb::text` rendering would produce a hash that cannot be
    // compared with the database's. Refusing is the only honest answer; returning the score
    // beside an incomparable fingerprint is how the divergence got in last time.
    if (!(error instanceof UncanonicalScorerInputError)) throw error;
    return {
      ok: false,
      sessionId,
      outcome: null,
      inputHash: null,
      itemsScored: 0,
      error: 'UNCANONICAL_SCORER_INPUT',
    };
  }

  return {
    ok: true,
    sessionId,
    outcome: scoreExam(items, event.policy ?? DEFAULT_EXAM_POLICY),
    inputHash,
    itemsScored: items.length,
  };
}
