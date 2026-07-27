import { accuracyFrom, difficultyFrom } from './harvest';
import { toServedItem, type BankItem, type ServedItem } from './item';
import { scoreResponse, type PlayerResponse } from './scoring';
import type { Sequencer, SequencerContext } from './sequencer';
import { summarize, type ExamItemResult, type ExamSummary, type MetricMap } from './types';

/**
 * The session shell: it drives the loop
 *   start → nextItem(sequencer) → present(player) → record → repeat until stop → summarize
 * and is agnostic to BOTH the sequencing structure (owned by the `Sequencer`) and
 * the item rendering (owned by the player). This module is the pure, framework-free
 * core; `use-exam-session.ts` wraps it for React, and tests drive it directly.
 */

/** What the player hands back after the child finishes (or skips) an item. */
export interface PlayerOutcome {
  /** Raw response, or null for embedded-demo items that self-score in-frame. */
  response: PlayerResponse | null;
  /** Telemetry map (M-* ids). For embedded-demo this is the harvested panel. */
  telemetry: MetricMap;
  /** Present → response latency in ms (null if unavailable). */
  responseTimeMs: number | null;
  /** True if the child skipped or the item timed out. */
  skipped: boolean;
}

/** Ask the sequencer for the next item given what has happened so far. */
export function nextBankItem(
  sequencer: Sequencer,
  bank: readonly BankItem[],
  presentedItemIds: readonly string[],
  results: readonly ExamItemResult[],
): BankItem | null {
  const ctx: SequencerContext = { bank, presentedItemIds, results };
  return sequencer.next(ctx);
}

function accuracyToMetric(accuracy: number): string {
  return `${accuracy >= 1 ? 1 : 0}/1  ${Math.round(accuracy * 100)}%`;
}

/**
 * Turn a player outcome into a stored per-item result. Scores server-side style:
 * - single-select: deterministic key comparison via {@link scoreResponse}
 *   (the bank item holds the key; the player never saw it).
 * - embedded-demo: accuracy/difficulty parsed from the demo's harvested metrics.
 */
export function buildItemResult(item: BankItem, outcome: PlayerOutcome): ExamItemResult {
  const metrics: MetricMap = { ...outcome.telemetry };

  if (item.renderKind === 'single-select') {
    const { accuracy, correct } = scoreResponse(item, outcome.response);
    if (!outcome.skipped && accuracy != null) metrics['M-ACC'] = accuracyToMetric(accuracy);
    if (outcome.responseTimeMs != null) metrics['M-RT'] = `${Math.round(outcome.responseTimeMs)} ms`;
    return {
      typeCode: item.typeCode,
      domain: item.domain,
      skipped: outcome.skipped,
      metrics,
      accuracy: outcome.skipped ? null : accuracy,
      // Reached the item's ordinal rung only when solved (not calibrated difficulty).
      difficultyReached: !outcome.skipped && correct ? item.difficultyLevel : null,
      responseTimeMs: outcome.responseTimeMs,
      response: outcome.response ?? null,
    };
  }

  // embedded-demo: the demo scored itself; read it back from the panel.
  return {
    typeCode: item.typeCode,
    domain: item.domain,
    skipped: outcome.skipped,
    metrics,
    accuracy: outcome.skipped ? null : accuracyFrom(metrics),
    difficultyReached: outcome.skipped ? null : difficultyFrom(metrics),
    responseTimeMs: outcome.responseTimeMs,
    response: null,
  };
}

export { summarize };

export interface SessionRun {
  results: ExamItemResult[];
  summary: ExamSummary;
  /** Presentation order actually produced by the sequencer. */
  order: string[];
}

/**
 * Synchronously drive a whole session: exactly the shell loop above, with the
 * "present(player)" step supplied by `respond`. Used by tests to prove an
 * end-to-end run, and mirrors what the React hook does asynchronously.
 */
export function driveSession(
  bank: readonly BankItem[],
  sequencer: Sequencer,
  respond: (served: ServedItem, item: BankItem) => PlayerOutcome,
): SessionRun {
  const results: ExamItemResult[] = [];
  const presentedItemIds: string[] = [];

  for (;;) {
    const item = nextBankItem(sequencer, bank, presentedItemIds, results);
    if (item === null) break; // sequencer says stop
    presentedItemIds.push(item.itemId);
    const served = toServedItem(item);
    const outcome = respond(served, item);
    results.push(buildItemResult(item, outcome));
  }

  return { results, summary: summarize(results), order: presentedItemIds };
}
