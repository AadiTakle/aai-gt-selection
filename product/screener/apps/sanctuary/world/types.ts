/**
 * What Bramblebrook is made of.
 *
 * NOTHING IN HERE IS A SCORE. There is no field for an estimate, an ability, a level, a streak, a
 * total or a currency, and there is nowhere for one to be added without it being obvious in review.
 * The two numbers that do exist — `night` and `performed` — are a wall clock and a count of care
 * given, and neither is ever drawn as a numeral. The measurement is harvested server-side from the
 * ledger and this file is deliberately not where it lives.
 *
 * THE ONE INVARIANT THAT SHAPES EVERY TYPE HERE: **choices set flavour, performances set amount.**
 * How much hollow there is — burrow room, perches, bands of bed, how many markings a coat carries —
 * is a function of how many times a verb was performed. WHICH markings, which motifs, which stone
 * plan, which rhythm is a function of what the child tapped. So an all-wrong visit and an all-right
 * visit grow the hollow by exactly the same amount and grow it into different-looking hollows, which
 * is the only honest way to build a world on top of a measurement it is not allowed to see.
 */

export type VerbId = 'coat' | 'mossbed' | 'stones' | 'tumbler' | 'tide-line' | 'sprouter' | 'bough';

/** The three Verbal verbs have no renderer yet. They are named so the hooks can exist unwired. */
export type LaterVerbId = 'log' | 'gate' | 'kinship';

/**
 * Six families, keyed to silhouette so the bank's sixteen shapes can be reused as their markings.
 * Bellow is low and heavy, Rill is water, Cobble is stone, Ember is warm, Fern is green, Kite flies.
 */
export type Family = 'bellow' | 'rill' | 'cobble' | 'ember' | 'fern' | 'kite';

export const FAMILY_WHEEL: readonly Family[] = ['bellow', 'rill', 'cobble', 'ember', 'fern', 'kite'];

export type Stage = 'pip' | 'tuffet' | 'crested' | 'warden';

export const STAGES: readonly Stage[] = ['pip', 'tuffet', 'crested', 'warden'];

/** One thing the child chose, kept as the bank's own vocabulary so the skin can draw it anywhere. */
export interface Mark {
  shape: string;
  color: string;
}

/**
 * A tuffet.
 *
 * `care` counts acts of care received, on visits and overnight alike. It is what advances a creature,
 * and it advances the same amount whatever was tapped. `ready` means the next becoming is available
 * and waiting; it never expires, nothing decays back out of it, and a creature that is ready stays
 * ready across any length of absence.
 */
export interface Creature {
  id: string;
  seed: number;
  family: Family;
  stage: Stage;
  /** Grown by the coat lattice. Drawn on the animal, and what decides its adult family. */
  marks: Mark[];
  /** The shape of its crest, set when it crests. Drawn with the same skin as the items. */
  crest: string | null;
  /** A doubled crest, from a Tumbler reading that came out paired. */
  twin: boolean;
  care: number;
  gladeId: string | null;
  bornNight: number;
  /** Which verbs this one has received, newest last. Shapes what it becomes. */
  received: VerbId[];
}

/** How a glade's floor yields: set by the tide-line, and never a quantity of anything. */
export type Rhythm = 'steady' | 'rising' | 'turning';

/** Who may share a glade: set by the weighing bough. */
export type PairRule = 'kin' | 'unlike' | 'elder';

export interface Glade {
  id: string;
  seed: number;
  /** Closed glades are drawn, visible and quiet. They are LATER, never earned. */
  open: boolean;
  /** Laid by the mossbed. Decides which wild things visit. */
  weave: Mark[];
  /**
   * The burrow's stone plan, as cell indices on the 4x4 lattice the stone-setting item works in.
   * This is literally the layout the child chose, and it decides which silhouettes can shelter here.
   */
  burrow: number[];
  /** How many bands of the bed have filled. One per sprouting, never more, never fewer. */
  bands: number;
  rhythm: Rhythm;
  /** Which of three shoot arrangements the sprouter set. Flavour, not amount. */
  arrangement: number;
  /** Wild things that have started visiting, as weave motif names. */
  visitors: string[];
}

/**
 * What the Tumbler read.
 *
 * The old stone mechanism does not decide WHETHER a creature becomes something — care does that. It
 * decides WHAT. A reading is only in force for the visit it was taken on, so the mechanism is
 * something you consult before a becoming rather than a switch you flip once.
 */
export interface TumblerRead {
  /** Quarter turns the figure came out by. */
  turn: number;
  mirrored: boolean;
  /** A solid figure holds its line; a hollow one is open to change. */
  filled: boolean;
  /** A paired figure means a doubled crest. */
  doubled: boolean;
  night: number;
}

export type BeatKind =
  | 'season'
  | 'hatched'
  | 'ready'
  | 'visitor'
  | 'sprout'
  | 'settle'
  | 'waiting';

/** One thing that happened while nobody was watching. Shown on arrival, as a picture. */
export interface Beat {
  kind: BeatKind;
  /** Creature or glade id, where the beat is about one. */
  subject?: string;
  night: number;
}

export interface World {
  /** Schema version. A world from an older shape is re-seeded rather than migrated wrongly. */
  v: 3;
  keeperId: string;
  createdAt: number;
  lastVisitAt: number;
  /** Nights elapsed on the wall clock since the hollow was found. Advances whether or not anyone comes. */
  night: number;
  visits: number;
  /** How many times each verb has been performed. THIS is what sets how much hollow there is. */
  performed: Record<VerbId, number>;
  creatures: Creature[];
  glades: Glade[];
  pairRule: PairRule;
  tumbler: TumblerRead | null;
  /** Item ids already served, per battery, so a returning keeper is not asked the same thing twice. */
  served: Record<string, string[]>;
  beats: Beat[];
  /** Pips curled up on the ridge because no burrow has room yet. Visible, patient, not lost. */
  waiting: number;
}

/** What one tap on one option told the world. Never whether it was right; that is not knowable here. */
export interface VerbYield {
  verb: VerbId;
  mark?: Mark;
  /** Stone-setting: the 4x4 cell indices of the plan the child chose. */
  blocks?: number[];
  /** A quantity the child chose. Used to pick a rhythm or an arrangement, never as an amount. */
  value?: number;
  /** The weighing bough: the mix of pieces on the pan the child chose. */
  load?: string[];
  /** The Tumbler: what came out of the mechanism. */
  read?: Omit<TumblerRead, 'night'>;
}
