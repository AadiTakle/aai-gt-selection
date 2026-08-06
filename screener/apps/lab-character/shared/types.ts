/**
 * The shapes this lab talks to the API in, plus the contract a rendered item honours.
 *
 * These are deliberately local rather than imported from @gt/qbank. The HTTP shapes are not the
 * same as the internal `QbankSessionConfig` (precision is an index here and resolved on the
 * server), and an app should not have to read the engine's types to call its endpoints.
 */

export type AgeBand = 'K-1' | '2-3' | '4-5' | '6-8';

/** The four the engine blueprints against. Note the engine says `fluid`, the bank says `fluid_reasoning`. */
export type Domain = 'quantitative' | 'verbal' | 'spatial' | 'fluid';

export interface PrecisionStep {
  label: string;
  confidenceAbove: number;
  confidenceBelow: number;
  minItems: number;
  maxItems: number;
  note: string;
}

export interface BankSummary {
  typeCount: number;
  scorable: number;
  total: number;
  precisionSteps: PrecisionStep[];
}

/**
 * An item as it reaches the browser. `content` is the headless payload: what the item asks, what
 * the choices are, how it is answered. It says nothing about how any of that looks, which is the
 * whole reason this lab can draw it as anything.
 *
 * The answer key is NOT here and never is. Marking is a round trip.
 */
export interface ServedItem {
  itemId: string;
  typeCode: string;
  difficulty: number;
  content: Record<string, unknown>;
}

export interface Serve {
  served: ServedItem;
  typeCode: string;
  domain: Domain;
  difficulty: number;
  informationAtThreshold: number;
  selectionReason: string;
}

export interface SessionState {
  stopped: boolean;
  stopReason: string | null;
  pAbove: number;
  decision: string | null;
  itemsServed: number;
  unscorable: number;
  estimate: number;
  interval: [number, number];
  perDomain: Record<string, number>;
}

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
