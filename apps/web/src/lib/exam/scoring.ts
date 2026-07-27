import type { BankItem } from './item';

/**
 * Deterministic, pure scoring for the synthetic prototype.
 *
 * Scoring takes the BANK item (which holds `answer` + `scoring`) and the child's
 * RAW response — never the served item. In production this runs server-side
 * (EXAM_ITEM_SCHEMA_SPEC §6.4/§9); here it is a pure function so the same logic
 * can move behind an API without change. Legacy `embedded-demo` items self-score
 * in-frame, so their accuracy is read from harvested metrics, not from here.
 */

/** Raw response captured by the player. Shape depends on the item's renderKind. */
export interface PlayerResponse {
  /** single-select: index into the served options. */
  selectedIndex?: number;
}

export interface ScoreResult {
  /** 0..1 accuracy, or null when not scorable (skipped / no key / demo-scored). */
  accuracy: number | null;
  /** Convenience boolean for keyed selection items. */
  correct: boolean | null;
}

const NOT_SCORED: ScoreResult = { accuracy: null, correct: null };

export function scoreResponse(item: BankItem, response: PlayerResponse | null): ScoreResult {
  if (item.renderKind !== 'single-select') return NOT_SCORED;
  if (item.scoring.mode !== 'deterministic_key') return NOT_SCORED;

  const key = item.answer.correctIndex;
  const picked = response?.selectedIndex;
  if (key == null || typeof picked !== 'number') return NOT_SCORED;

  const correct = picked === key;
  return { accuracy: correct ? 1 : 0, correct };
}
