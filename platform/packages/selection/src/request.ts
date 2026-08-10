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
