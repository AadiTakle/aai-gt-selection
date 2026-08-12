import type {
  DomainName,
  SelectionCandidate,
  SelectionTrace,
  VarietyConfig,
} from '@platform/domain';
import type { ExposureSnapshot } from './exposure.js';
import type { SelectionIndex } from './index-model.js';

/**
 * Everything selection needs, passed in rather than fetched.
 *
 * Selection is a pure function of this record. That is deliberate: it means the eight variety layers
 * can be tested over a thousand simulated sessions without a database, and it means the simulation
 * harness that tunes the defaults runs the same code the Lambda does.
 */
export interface SelectionRequest {
  readonly index: SelectionIndex;
  /** The decision line. Information is maximised here, not at the running estimate. */
  readonly threshold: number;
  /** 1-based position in the session. Ordinal 1 takes the randomised opening path. */
  readonly ordinal: number;
  readonly rngSeed: string;
  readonly approvedTypes: ReadonlySet<string>;
  /**
   * Individual items this app must not serve, whatever their type says.
   *
   * Approval is per type, and a type is sometimes right in general and wrong in particular. `VER-SORTBOT-01`
   * is the case that forced this: 83 of its 100 items are sound categorical reasoning, 15 are synonym items
   * with more than one defensible answer, and 2 key on rhyme rather than category. Unapproving the type
   * discards the 83 to be rid of the 17, and there was no third option until this existed.
   *
   * Deliberately a property of the *app* rather than of the item. An item defect that a reviewer has
   * confirmed belongs on the item, and `RegistryItem.validated` is where that will live. This is the weaker
   * and more honest claim: this surface does not serve this item, for reasons recorded outside the bank.
   */
  readonly withheldItemIds: ReadonlySet<string>;
  /** Null means the session has not constrained age band. */
  readonly ageBand: string | null;
  /** Null means the app has not constrained reading. 'none' means it cannot present text. */
  readonly maxReadingBand: string | null;
  readonly allowSynthetic: boolean;
  readonly usedItemIds: ReadonlySet<string>;
  /** Items this persona saw in their recent sessions, so a retake is not a repeat. */
  readonly personaRecentItemIds: ReadonlySet<string>;
  readonly typeServedCounts: ReadonlyMap<string, number>;
  readonly domainServedCounts: ReadonlyMap<DomainName, number>;
  readonly lastDomain: DomainName | null;
  readonly perDomainMinimum: number;
  readonly variety: VarietyConfig;
  readonly exposure: ExposureSnapshot | null;
}

export interface SelectionResult {
  readonly candidate: SelectionCandidate;
  readonly trace: SelectionTrace;
}
