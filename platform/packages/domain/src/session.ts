import type { AppConfig } from './app.js';
import type { DomainName } from './domains.js';
import type { ItemParameters } from './item.js';
import type { Decision, StopReason } from './scoresheet.js';

/**
 * A response row is written when the item is served and completed when it is answered.
 *
 * Writing at serve time costs one extra round trip and buys two things: abandonment becomes
 * visible instead of invisible, and the conditional update on `state` gives idempotent scoring for
 * free. A retried submission fails the condition rather than counting the same evidence twice.
 */
export type ResponseState = 'served' | 'answered' | 'expired';

export interface SelectionTrace {
  readonly reason: string;
  readonly informationAtThreshold: number;
  readonly candidatePoolSize: number;
  /** How wide the randomesque band was for this draw. */
  readonly k: number;
  /** Which variety layer decided, for debugging a sequence that looks wrong. */
  readonly layer: string;
}

export interface SessionRecord {
  readonly sessionId: string;
  readonly appId: string;
  readonly personaId: string | null;
  readonly snapshotId: string;
  readonly engineVersion: string;
  readonly criteriaVersion: string;
  /**
   * The app config as it stood when the session began. Frozen so that editing an app mid-session
   * cannot change the rules a child is being measured under.
   */
  readonly resolvedConfig: AppConfig;
  readonly rngSeed: string;
  readonly ageBand: string | null;
  /**
   * A narrowing of the app's approved types, requested when the session was created.
   *
   * Null means the whole approved list. This is how a caller asks for one battery rather than the whole
   * pool, and it is frozen onto the session for the same reason the config is: a session that could widen
   * its own pool halfway through would be measuring against a moving blueprint.
   */
  readonly restrictedTypes: readonly string[] | null;
  readonly startedAt: string;
  readonly endedAt: string | null;
  readonly status: 'active' | 'stopped' | 'abandoned';
  readonly stopReason: StopReason | null;
  readonly decision: Decision | null;
}

export interface ResponseRecord {
  readonly sessionId: string;
  readonly ordinal: number;
  readonly state: ResponseState;
  readonly itemId: string;
  /** Which revision was served. Without this a recompute cannot tell a wrong answer from a
   * corrected difficulty. */
  readonly itemRevision: number;
  readonly typeCode: string;
  readonly domain: DomainName;
  readonly difficulty: number;
  /** The parameters in force at serve time, not at read time. */
  readonly params: ItemParameters;
  readonly optionCount: number;
  readonly rawResponse: unknown;
  /** Null when the platform could not mark it. Null moves no evidence. */
  readonly correct: boolean | null;
  readonly latencyMs: number | null;
  /** Optional telemetry the catalogue renderers already emit: revisions, focus losses. */
  readonly metrics: Record<string, unknown> | null;
  /**
   * Markers the engine attached while grading, `rapid-guess` being the one that exists today.
   *
   * A response too fast to be an attempt is unscorable rather than wrong, which matters far more in a game
   * than on a web page because tapping is cheap. Stored because the distinction is invisible afterwards:
   * a null `correct` alone cannot say whether the platform could not read the response or decided not to
   * believe it.
   */
  readonly flags: readonly string[];
  readonly selection: SelectionTrace;
  readonly idempotencyKey: string | null;
  readonly servedAt: string;
  readonly answeredAt: string | null;
}
