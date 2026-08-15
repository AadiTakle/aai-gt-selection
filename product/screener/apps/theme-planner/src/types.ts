/** Shapes the planner receives from its dev-server plugin. Kept separate so the UI stays readable. */

export type ContextCost = 'legend-only' | 'revoice' | 'reauthor';
export type AssetKind = 'art' | 'motion' | 'copy' | 'interaction';
export type ChannelOrder = 'nominal' | 'ordered' | 'cyclic';

export interface CatalogueType {
  readonly typeCode: string;
  readonly elements: readonly string[];
  readonly counts: Readonly<Record<string, number>>;
  readonly readingBand: string | null;
  readonly cogat: { readonly subtest: string; readonly strength: 'direct' | 'loose' } | null;
  readonly contextCost: ContextCost;
  readonly contextWhy: string;
  readonly authorSupplies: readonly string[] | null;
}

export interface AssetBrief {
  readonly id: string;
  readonly element: string;
  readonly title: string;
  readonly brief: string;
  readonly quantity: number;
  readonly neededBy: readonly string[];
  readonly kind: AssetKind;
}

export interface AssetPlan {
  readonly briefs: readonly AssetBrief[];
  readonly writing: Readonly<Record<ContextCost, readonly string[]>>;
  readonly totals: {
    readonly artPieces: number;
    readonly interactions: number;
    readonly promptsToRewrite: number;
    readonly typesNeedingNewItems: number;
  };
}

export interface LegendEntry {
  label: string;
  order: ChannelOrder;
  values: string[];
}

export interface ThemePack {
  theme: string;
  describes: string;
  legend: Record<string, LegendEntry>;
  voice?: Record<string, { prompt: string }>;
  material?: Record<string, unknown[]>;
}

export interface ThemeIssue {
  readonly severity: 'error' | 'warning';
  readonly typeCode?: string;
  readonly message: string;
}

/** An edit the user made to a generated brief, kept so regeneration does not wipe it. */
export interface BriefEdit {
  title?: string;
  brief?: string;
  quantity?: number;
  done?: boolean;
}
