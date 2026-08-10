import type { DomainName } from './domains.js';
import type { ItemParameters, ScoringMode } from './item.js';

/**
 * The projection of an item that selection needs, and nothing more.
 *
 * This is what a published snapshot contains. It is deliberately small — no content, no answer —
 * because the whole point is that a serving function can hold every eligible item in memory and
 * choose between them without touching a database. About 550 KB for the 4,534 scorable items.
 *
 * It lives in `domain` rather than in `selection` so that the compiler which produces snapshots and
 * the store which persists them do not have to depend on the selection algorithm.
 */
export interface SelectionCandidate {
  readonly itemId: string;
  readonly itemRevision: number;
  readonly typeCode: string;
  readonly domain: DomainName;
  readonly params: ItemParameters;
  /** Authoring difficulty, carried for the response record and for debugging. */
  readonly difficulty: number;
  readonly optionCount: number;
  readonly ageBands: readonly string[];
  readonly scoringMode: ScoringMode;
  /** Highest reading band this item's type demands, or null when it needs no reading. */
  readonly readingBand: string | null;
  readonly syntheticOnly: boolean;
}

/**
 * The answer, which lives in its own table that the serving function's IAM role cannot read.
 *
 * Keeping this out of the main table is the difference between "the code strips the key" and "the
 * key is unreachable from the code that serves items".
 */
export interface AnswerKeyRecord {
  readonly itemId: string;
  readonly revision: number;
  readonly correctKey: string;
  readonly scoringMode: ScoringMode;
  /** Distractor rationales, solver references: anything else the marker may need. */
  readonly extra: Record<string, unknown>;
}

export interface SnapshotRecord {
  readonly snapshotId: string;
  readonly createdAt: string;
  readonly itemCount: number;
  readonly typeCount: number;
  readonly s3Key: string;
  readonly checksum: string;
  readonly publishedBy: string;
  readonly notes: string;
}

export interface OutboxEvent {
  readonly eventId: string;
  readonly kind: 'session-qualified';
  readonly sessionId: string;
  readonly criteriaVersion: string;
  readonly occurredAt: string;
  readonly payload: Record<string, unknown>;
}
