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
   * Stable fingerprint of the exact input that produced `outcome`. Two runs that agree on this
   * must agree on the score; if they do not, the engine changed and the difference is a bug.
   */
  readonly inputHash: string | null;
  readonly itemsScored: number;
  readonly error?: string;
}

/** FNV-1a over the canonical form. Small, dependency-free, and stable across runtimes. */
function fingerprint(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * Canonical form of the scored input.
 *
 * Only the fields the scorer actually reads go in, in a fixed order, so the fingerprint tracks the
 * score rather than incidental payload shape — a reordered key or an extra field the scorer ignores
 * must not look like a different result.
 */
export function scorerInputFingerprint(items: readonly ScoredItem[]): string {
  const canonical = items
    .map((item) =>
      [item.itemId, item.domain, item.typeCode, item.difficulty, item.score, item.correct].join(
        '|',
      ),
    )
    .join('\n');
  return fingerprint(canonical);
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
  return {
    ok: true,
    sessionId,
    outcome: scoreExam(items, event.policy ?? DEFAULT_EXAM_POLICY),
    inputHash: scorerInputFingerprint(items),
    itemsScored: items.length,
  };
}
