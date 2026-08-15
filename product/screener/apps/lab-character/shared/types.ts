/**
 * The shapes this lab talks to the API in, plus the contract a rendered item honours.
 *
 * These used to be declared here on purpose, and the reason given was sound: the HTTP shapes are not the same
 * as the engine's internal `QbankSessionConfig` — precision is an index here and resolved on the server — and
 * an app should not have to read the engine's types to call its endpoints.
 *
 * Task 3.4 answered that objection rather than overruling it. `@gt/qbank` now publishes the *wire* contract as
 * its own thing: `CreateSessionRequest` carries `precisionIndex`, and `ResolvedSessionConfig` is what comes
 * back. So an app imports HTTP shapes and still never reads the engine. Keeping these local had also let them
 * drift — `SessionState` here knows nothing of the per-domain bands or the pass route, both of which the
 * server has been returning since 8 Aug.
 */

// Imported as well, because the declarations kept below refer to them.
import type { AgeBand } from '@gt/qbank';

export type {
  AgeBand,
  Domain,
  ServedItem,
  PrecisionSetting as PrecisionStep,
  BankCatalogueResponse as BankSummary,
  QbankServe as Serve,
  QbankState as SessionState,
  DomainBand,
  PassRoute,
} from '@gt/qbank';

export interface SessionConfig {
  precisionIndex?: number;
  ageBand?: AgeBand;
  abilityThreshold?: number;
  perDomainMinimum?: number;
  recommendProbability?: number;
  seed?: number;
}

/**
 * What every renderer in `renderers/` is.
 *
 * A renderer receives the headless content and a way to answer, and draws the question however its
 * world wants. It is handed `onAnswer` rather than returning a value because several types are
 * answered by a single tap and should not need a submit button for a five-year-old.
 *
 * `correctKey` is deliberately absent from this type. A renderer cannot mark, cannot know, and so
 * cannot leak.
 */
export interface RendererProps {
  content: Record<string, unknown>;
  /** The option key to send back. Called once; further calls are ignored by the stage. */
  onAnswer: (key: string) => void;
  /** True once answered, so a renderer can settle rather than stay live. */
  answered: boolean;
  /** The band the session is drawing for, so a renderer can size targets for the youngest hands. */
  band: AgeBand;
}
