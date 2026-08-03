// Types for `stage2-serve-time-materialisation.mjs`, so `apps/web` can import it under `strict`.
//
// WHY A SIDECAR AND NOT A PORT. The app's serve path needs the materialiser and the §3 difficulty
// model, and the §3 difficulty model IS the PR #48 learnability oracle — residual ambiguity is the
// quantity that oracle was written to compute. Re-implementing either in TypeScript would give the
// serve path a second definition of what a reveal rules out, free to disagree with the one the
// learnability report and every Gate A figure use. The repo's usual move for research code
// (`verifiers/*.ts`: "ported, never imported") is right for a checker whose job is to disagree
// independently, and wrong here for exactly the same reason.
//
// So the module is imported, and this file is the type boundary. It is hand-written and must be kept
// in step with the `.mjs`; `stage2-materialisation.test.ts` exercises every function declared here
// through the app's own module, so a signature that drifts fails a test rather than passing silently.

/** A figure state: the thing the machine transforms. */
export interface OpchainFigure {
  glyph: string;
  orient: { a: number; b: number };
  shade: string;
  border: number;
  pair: number;
}

export interface OpchainRationale {
  rationaleId: string;
  lure: string;
  note?: string;
  transform: {
    kind: 'reorder' | 'drop' | 'repeat' | 'substitute' | 'prefix' | 'reverse';
    at?: number;
    withSlot?: number;
    length?: number;
  };
}

/** One bank record under serve-time materialisation. No key, no difficulty, no meaning named. */
export interface OpchainTemplate {
  templateId: string;
  typeCode: string;
  domain: string;
  ageBands: string[];
  input: OpchainFigure;
  /** References to symbol SLOTS, in the order the machine applies them. */
  chain: number[];
  rationales: OpchainRationale[];
  structure: {
    slotCount: number;
    chainLength: number;
    slots: number[];
    glyphIndex: number;
    band: string;
    reachableFigures: number;
  };
  optionCount: number;
  syntheticOnly: true;
  validated: false;
}

/** The hidden system for one session. NONE of this may reach the browser. */
export interface SessionSystem {
  systemId: string;
  slotToOperator: string[];
  slotToBadge: string[];
  badgeToOperator: Record<string, string>;
}

export interface MaterialisedItem {
  itemId: string;
  typeCode: string;
  domain: string;
  ageBands: string[];
  /** Null until a session prices it: difficulty is not a property of the item alone. */
  difficulty: number | null;
  content: {
    typeCode: string;
    badgeTray: string[];
    input: OpchainFigure;
    chain: string[];
    options: { key: string; figure: OpchainFigure }[];
  };
  answer: {
    correctKey: string;
    operatorChain: string[];
    badgeChain: string[];
    strategyTrace: Record<string, { ruleId: string; kind: string }>;
    distractorRationales: Record<string, { lure: string; ruleId: string; note?: string }>;
    keyDistanceFromInput: number;
    relabelling: { optionVotes: number[]; viableOptions: number };
  };
  scoring: { mode: string };
  syntheticOnly: true;
  validated: false;
}

/** The R7 record for one served trial. Everything needed to say what the child saw. */
export interface MaterialisationRecord {
  templateId: string;
  keySlot: number;
  correctKey: string;
  optionRationaleIds: string[];
  optionFigureKeys: string[];
  chainLength: number;
  slots: number[];
}

export interface DifficultyLevers {
  chainLength: number;
  vocabularyInPlay: number;
  evidenceCounts: number[];
  evidence: number;
  residualAmbiguity: number;
  /** The evidence-free part of the same scale, for a fit needing a covariate free of trial index. */
  structural: number;
}

export interface LedgerRow extends MaterialisationRecord {
  trial: number;
  itemId: string;
  difficulty: number;
  levers: DifficultyLevers;
  chosenKey: string | null;
  correct: boolean | null;
}

export interface MaterialisedEntry {
  template: OpchainTemplate;
  item: MaterialisedItem;
  materialisation: MaterialisationRecord;
}

export interface Candidate {
  entry: MaterialisedEntry;
  item: MaterialisedItem;
  difficulty: number;
  levers: DifficultyLevers;
}

export interface MaterialisedSession {
  sessionSeed: string;
  system: SessionSystem;
  readingsTotal: number;
  materialised: MaterialisedEntry[];
  excluded: { templateId: string; reason: string }[];
  candidates(): Candidate[];
  serve(templateId: string): { item: MaterialisedItem; row: LedgerRow };
  commit(response: { chosenKey: string }): LedgerRow;
  ledger: LedgerRow[];
  readonly evidenceVersion: number;
  readonly surviving: number;
}

export declare const OPTION_KEYS: string[];
export declare const CHAIN_LENGTH_LOAD: Record<number, number>;
export declare const VOCABULARY_WEIGHT: number;
export declare const MAX_LENGTH_STEP: number;
export declare const EVIDENCE_WEIGHT: number;
export declare const AMBIGUITY_WEIGHT: number;
export declare const EXCLUSION_REASONS: {
  readonly FEWER_THAN_TWO_REACHABLE: string;
  readonly TOO_FEW_DISTRACTORS: string;
  readonly CHAIN_IS_A_NO_OP: string;
  readonly GEOMETRIC_PART_CANCELS: string;
};

export declare function drawSessionSystem(sessionSeed: string): SessionSystem;
export declare function materialiseTemplate(
  template: OpchainTemplate,
  system: SessionSystem,
  options: { sessionSeed: string },
):
  | { item: MaterialisedItem; materialisation: MaterialisationRecord; excluded?: undefined }
  | { excluded: string; rejected?: { rationaleId: string; why: string }[] };
export declare function evidenceRelief(evidenceCounts: number[]): number;
export declare function priceItem(input: {
  chainLength: number;
  vocabularyInPlay: number;
  slotCount: number;
  evidenceCounts: number[];
  residualAmbiguity: number;
  readingsTotal: number;
}): { difficulty: number; levers: DifficultyLevers };
export declare function openSession(options: {
  sessionSeed: string;
  templates: OpchainTemplate[];
  revealMode?: 'outcome' | 'option';
}): MaterialisedSession;
export declare function replaySession(options: {
  sessionSeed: string;
  templates: OpchainTemplate[];
  choices: { templateId: string; chosenKey: string }[];
  revealMode?: 'outcome' | 'option';
}): MaterialisedSession;
export declare function nearestCandidate(candidates: Candidate[], target: number): Candidate | null;
