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
  /**
   * Whether the platform can mark this item, as decided by the loader rather than inferred here.
   *
   * This used to be a test on `scoringMode === 'deterministic_key'`, and that inference was wrong.
   * `SPA-PUNCH-01` declares `computed_solver` and is markable, because its key is a stored cell set
   * compared as a set; fourteen other `computed_solver` types are not, because nobody has written
   * their comparison rule. The mode does not distinguish those cases and never did — the loader's
   * decision does, and this records it instead of guessing.
   */
  readonly markable: boolean;
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
  /**
   * Carried because marking dispatches on it.
   *
   * `scoreResponse` decides how to compare an answer partly from the type code — a cell-set type is
   * compared as a set before anything else looks at the key. A marker handed only the key would fall
   * through to the string path and compare a cell set like `'0,0|0,3'` against a child's tap, marking
   * every one of those items wrong without erroring.
   */
  readonly typeCode: string;
  readonly revision: number;
  /**
   * A letter for types whose options carry keys, a 0-based option index for the five verbal types whose
   * options are positional, and a serialised cell set for the punch types. Marked down separate paths
   * which must never be compared with each other.
   */
  readonly correctKey: string | number;
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
