/**
 * The HTTP shapes this app talks to the API in, kept local on purpose.
 *
 * The wire shape is not `QbankSessionConfig`: precision arrives as an index and is resolved on the
 * server, and an app should not have to read the engine's internals to call its endpoints.
 */

/** The four the engine blueprints against. The bank says `fluid_reasoning`; the engine says `fluid`. */
export type Domain = 'quantitative' | 'verbal' | 'spatial' | 'fluid';

export const DOMAINS: readonly Domain[] = ['quantitative', 'verbal', 'spatial', 'fluid'];

export interface ServedItem {
  itemId: string;
  typeCode: string;
  difficulty: number;
  /** The headless payload. Carries no answer and no scoring rule; `toServed` strips both. */
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

export interface SortieState {
  stopped: boolean;
  stopReason: string | null;
  itemsServed: number;
  unscorable: number;
  perDomain: Record<string, number>;
}

/**
 * One option, as this app addresses it.
 *
 * Both are carried because `scoreResponse` has two entirely separate paths and they never meet: a
 * numeric `correctKey` is marked against `selectedIndex`, a string one against `key`. Sending both is
 * safe, and sending only one silently loses a whole family of types. `VER-*` options carry no `key`
 * field at all, so for those the position IS the answer.
 */
export interface OptionRef {
  key: string;
  index: number;
}

/** What every renderer receives. `correctKey` is deliberately absent: a renderer cannot leak it. */
export interface RendererProps {
  content: Record<string, unknown>;
  onAnswer: (key: string) => void;
  answered: boolean;
  band: 'K-1' | '2-3' | '4-5' | '6-8';
}
