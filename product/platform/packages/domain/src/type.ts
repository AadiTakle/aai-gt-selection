import type { DomainName } from './domains.js';
import type { ScoringMode } from './item.js';

/**
 * A type's lifecycle status.
 *
 * Transitions are forward-only and are recorded as appended events rather than as edits, because
 * the type record itself is write-once. Current status is the newest event.
 */
export type TypeStatus = 'active' | 'deprecated' | 'superseded';

export const TYPE_STATUSES: readonly TypeStatus[] = ['active', 'deprecated', 'superseded'] as const;

/** What `@gt/ui-contract` computes about a type, frozen into the registry at publish time. */
export interface UiRequirementSnapshot {
  readonly elements: readonly string[];
  readonly counts: Readonly<Record<string, number>>;
  /** Highest reading band the type demands, or null when it needs no reading at all. */
  readonly readingBand: string | null;
}

export interface QuestionTypeRecord {
  readonly typeCode: string;
  readonly family: string;
  readonly version: number;
  /**
   * Explicit, not inferred. The prefix heuristic in `domainFromTypeCode` seeds this for the 53
   * codes that predate the registry and is wrong for codes without a domain prefix.
   */
  readonly domain: DomainName;
  readonly title: string;
  readonly uiRequirement: UiRequirementSnapshot;
  readonly scoringModes: readonly ScoringMode[];
  readonly itemCount: number;
  readonly scorableCount: number;
  readonly difficultyRange: readonly [number, number] | null;
  readonly ageBands: readonly string[];
  readonly createdAt: string;
  /** Where this came from, so a type can be traced to its source. */
  readonly sourceRef: string;
}

export interface TypeLifecycleEvent {
  readonly typeCode: string;
  readonly status: TypeStatus;
  readonly at: string;
  readonly reason: string;
}
