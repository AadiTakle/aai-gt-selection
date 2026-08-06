/** The HTTP shapes, mirrored from apps/api/src/server.ts. Kept here so no experience guesses them. */

export type AgeBand = 'K-1' | '2-3' | '4-5' | '6-8';

export const AGE_BANDS: readonly AgeBand[] = ['K-1', '2-3', '4-5', '6-8'];

export interface PrecisionStep {
  readonly label: string;
  readonly confidenceAbove: number;
  readonly confidenceBelow: number;
  readonly minItems: number;
  readonly maxItems: number;
  readonly note: string;
}

export interface BankSummary {
  readonly typeCount: number;
  readonly scorable: number;
  readonly total: number;
  readonly precisionSteps: readonly PrecisionStep[];
}

export interface Serve {
  readonly served: {
    readonly itemId: string;
    readonly typeCode: string;
    readonly difficulty: number;
    readonly content: Record<string, unknown>;
  };
  readonly typeCode: string;
  readonly domain: string;
  readonly difficulty: number;
  readonly informationAtThreshold: number;
  readonly selectionReason: string;
}

export interface SessionState {
  readonly stopped: boolean;
  readonly stopReason: string | null;
  readonly pAbove: number;
  readonly decision: string | null;
  readonly itemsServed: number;
  readonly unscorable: number;
  readonly estimate: number;
  readonly interval: readonly [number, number];
  readonly perDomain: Record<string, number>;
}

/** A palette applied to the item iframe so a served item matches the world around it. */
export type Palette = Readonly<Record<string, string>>;

/**
 * What an experience declares about itself, so the launcher can describe it without being edited by
 * every worker in turn.
 */
export interface ExperienceMeta {
  readonly id: string;
  readonly title: string;
  /** The franchise or world it is dressed as. */
  readonly world: string;
  readonly band: AgeBand;
  /** One line on the mechanic doing the pulling. */
  readonly pull: string;
  readonly accent: string;
}
