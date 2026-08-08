import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The item banks behind the playable catalogue.
 *
 * 53 files, 7,319 records, each carrying the item's content, a difficulty on a 1 to 20 scale, and
 * an answer. The catalogue pages are renderers: they accept an item over `postMessage`, display it,
 * and report the response back without ever being told what the right answer was.
 *
 * That split is what makes a real adaptive session possible on these items, and it is why this
 * module exists on the server rather than in the browser. The bank record is the only place the key
 * lives, `toServed` removes it before anything crosses to the frame, and scoring happens here.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
export const BANK_DIR =
  process.env.GT_QBANK_BANKS ?? join(HERE, '..', '..', '..', '..', 'qbank-library', 'banks');

/** How a record says it should be marked. Only the first can be scored without a solver. */
export type ScoringMode = 'deterministic_key' | 'computed_solver' | 'model_judge_deferred';

export interface BankRecord {
  readonly itemId: string;
  readonly typeCode: string;
  readonly domain: string;
  /** On the bank's own 1 to 20 scale, not in logits. Use `toLogits`. */
  readonly difficulty: number;
  readonly ageBands: readonly string[];
  readonly content: Record<string, unknown>;
  /**
   * `correctKey` is a letter for types whose options carry keys, and a 0-based INDEX for the several
   * types whose options are positional. Both are deterministic; they are marked down different paths.
   */
  readonly answer: { readonly correctKey: string | number } & Record<string, unknown>;
  readonly scoring: { readonly mode: ScoringMode } & Record<string, unknown>;
  readonly syntheticOnly?: boolean;
  readonly validated?: boolean;
}

/** What crosses to the frame. Answer, scoring and provenance are absent by construction. */
export type ServedItem = Omit<BankRecord, 'answer' | 'scoring'> & { provenance?: never };

export function toServed(record: BankRecord): ServedItem {
  const { answer, scoring, ...rest } = record as BankRecord & { provenance?: unknown };
  void answer;
  void scoring;
  const served = { ...rest } as Record<string, unknown>;
  delete served.provenance;
  return served as ServedItem;
}

/**
 * Map the bank's difficulty onto the ability scale the engine works in.
 *
 * The bank uses 1 to 20, near-uniformly, with a median of 10.59. Dividing the centred value by
 * three puts it at roughly plus or minus 3.2 logits, which covers the posterior grid without
 * clipping.
 *
 * This is a rescaling and not a calibration. The bank's difficulties are themselves synthetic on
 * most records, so an item's position on this scale is an assumption inherited from whoever
 * generated it, carried through a linear transform we chose. Nothing here has met a child.
 */
export const DIFFICULTY_MIDPOINT = 10.5;
export const DIFFICULTY_DIVISOR = 3;

export function toLogits(difficulty: number): number {
  return (difficulty - DIFFICULTY_MIDPOINT) / DIFFICULTY_DIVISOR;
}

export function fromLogits(b: number): number {
  return b * DIFFICULTY_DIVISOR + DIFFICULTY_MIDPOINT;
}

export interface LoadedBank {
  readonly typeCode: string;
  readonly domain: string;
  /** Only records this host can mark, sorted by difficulty. */
  readonly scorable: readonly BankRecord[];
  /** Everything, including records needing a solver or a judge. */
  readonly total: number;
  readonly excluded: Readonly<Record<string, number>>;
  readonly difficultyRange: readonly [number, number];
  readonly ageBands: readonly string[];
}

/**
 * Load every bank once.
 *
 * Reads 19 MB from disk, so it is done at startup and held. Records whose scoring mode needs a
 * solver or a human judge are counted and set aside rather than silently dropped, because "this
 * type has 120 items and we can mark 0 of them" is something a caller needs to be able to see.
 */
export function loadBanks(dir: string = BANK_DIR): Map<string, LoadedBank> {
  const out = new Map<string, LoadedBank>();
  if (!existsSync(dir)) return out;

  for (const file of readdirSync(dir).filter((f) => f.endsWith('.jsonl'))) {
    const typeCode = file.replace(/\.jsonl$/, '');
    const scorable: BankRecord[] = [];
    const excluded: Record<string, number> = {};
    const ageBands = new Set<string>();
    let total = 0;
    let domain = 'unknown';

    for (const line of readFileSync(join(dir, file), 'utf8').split('\n')) {
      if (!line.trim()) continue;
      let record: BankRecord;
      try {
        record = JSON.parse(line) as BankRecord;
      } catch {
        // A truncated line should cost one item rather than a whole type.
        excluded.unparseable = (excluded.unparseable ?? 0) + 1;
        continue;
      }
      total += 1;
      domain = record.domain ?? domain;
      for (const b of record.ageBands ?? []) ageBands.add(b);

      const mode = record.scoring?.mode;
      if (mode !== 'deterministic_key') {
        excluded[mode ?? 'unknown'] = (excluded[mode ?? 'unknown'] ?? 0) + 1;
        continue;
      }
      // A numeric key counts. Five verbal types — relation match, sentence completion, two meanings,
      // sorting robot and story order — put a 0-based option index here because their options are
      // positional and carry no letter. Requiring a string excluded all five from every pool, which is
      // why nothing verbal was ever served, and they are two of the constructs the screener is for.
      const key = record.answer?.correctKey;
      if (typeof key !== 'string' && typeof key !== 'number') {
        excluded['no-key'] = (excluded['no-key'] ?? 0) + 1;
        continue;
      }
      // A numeric key has to be a whole option index. QUANT-GLYPHNUM-01 declares deterministic_key
      // but stores a placement RATIO (0.235294) to be marked against a tolerance, and that rule is
      // not implemented here. Truncating it to an index would mark the first option correct on every
      // item and everything else wrong, which is the failure that looks healthiest from outside.
      if (typeof key === 'number' && (!Number.isInteger(key) || key < 0)) {
        excluded['non-index-numeric-key'] = (excluded['non-index-numeric-key'] ?? 0) + 1;
        continue;
      }
      if (typeof record.difficulty !== 'number') {
        excluded['no-difficulty'] = (excluded['no-difficulty'] ?? 0) + 1;
        continue;
      }
      scorable.push(record);
    }

    scorable.sort((a, b) => a.difficulty - b.difficulty);
    if (scorable.length === 0 && total === 0) continue;

    out.set(typeCode, {
      typeCode,
      domain,
      scorable,
      total,
      excluded,
      difficultyRange: scorable.length
        ? [scorable[0]!.difficulty, scorable[scorable.length - 1]!.difficulty]
        : [NaN, NaN],
      ageBands: [...ageBands].sort(),
    });
  }
  return out;
}

/**
 * Score a response against the key the host kept.
 *
 * The frame reports whatever the item's own UI produced, which for a keyed item is the option key.
 * Accepts a few shapes because the 38 scorable types were written independently and do not all
 * agree on where they put it.
 */
export function scoreResponse(record: BankRecord, response: unknown): boolean | null {
  const expected = record.answer?.correctKey;
  const body = typeof response === 'object' && response !== null ? (response as Record<string, unknown>) : undefined;

  /**
   * An index key is marked against the index the renderer reports, and a letter key against the letter,
   * and the two paths never meet.
   *
   * Keeping them separate is the whole care in this function. Letting an index be compared with a letter
   * would turn a type whose renderer reports only a position into one that is marked wrong every single
   * time — scored, counted, and confidently incorrect — which is far worse than the unscorable it
   * currently returns, and invisible from the outside.
   */
  if (typeof expected === 'number') {
    // Only a whole, non-negative key is an option index. A fractional one belongs to a scoring rule
    // this function does not implement, and guessing at it would mark confidently and wrongly.
    if (!Number.isInteger(expected) || expected < 0) return null;
    const picked = body?.selectedIndex ?? body?.index ?? (typeof response === 'number' ? response : undefined);
    if (typeof picked !== 'number' || !Number.isInteger(picked) || picked < 0) return null;
    return picked === expected;
  }

  if (typeof expected !== 'string') return null;

  const candidate =
    typeof response === 'string' ? response : (body?.key ?? body?.selectedKey ?? body?.value);

  if (typeof candidate !== 'string') return null;
  return candidate.trim().toUpperCase() === expected.trim().toUpperCase();
}

/**
 * How many options the candidate was choosing between, or null when the content does not enumerate any.
 *
 * This feeds the guessing floor, which `paramsFor` pins to 1/optionCount. Both call sites in
 * `session.ts` used to pass a literal 4 for every item in the bank, and measured across the 5,034
 * servable records only 2,373 actually have four options: counts run from 2 to 8, and QUANT-DOTS-01 is
 * 120 two-option items that were modelled as a 25% guess when the truth is a coin flip.
 *
 * Null is a real answer and not a failure. Four types answer with something that is not a choice from
 * a list — an assignment of tokens to bins, a path, a set of pipe rotations, a placement — so there is
 * no n for 1/n to be computed from. Returning null puts that decision at the call site instead of
 * inventing a number here.
 */
export function optionCountOf(record: BankRecord): number | null {
  const content = record.content ?? {};

  /**
   * The 53 types were written independently and three of them named their option list after the thing
   * being chosen rather than calling it `options`. They are ordinary keyed lists — `FLU-DEDUCE-01`
   * offers 4 to 8 candidates, `FLU-ODDPAIR-01` 4 to 6 rows, `GB-FLAWFINDER-01` 3 or 4 claims — so
   * missing them would put 360 perfectly guessable items on the unguessable floor.
   */
  for (const field of ['options', 'candidates', 'rows', 'claims']) {
    const list = content[field];
    if (Array.isArray(list) && list.length > 0) return list.length;
  }

  /**
   * `FLU-CONCEPT-01` asks three independent yes/no probes and keys all three as one string (`'YNN'`).
   * Marking is all-or-nothing, so the space a blind answer is drawn from is 2^probes, and reporting 3
   * here would say a child guesses right a third of the time when it is an eighth.
   */
  const probes = content.probes;
  if (Array.isArray(probes) && probes.length > 0) return 2 ** probes.length;

  /**
   * A declared stepper. `SPA-HIDDENCUBE-01` asks for a number between 0 and 60, so a blind answer is
   * right one time in 61 rather than never.
   */
  const response = content.response as { mode?: string; min?: number; max?: number; step?: number } | undefined;
  if (
    response?.mode === 'stepper' &&
    typeof response.min === 'number' &&
    typeof response.max === 'number' &&
    typeof response.step === 'number' &&
    response.step > 0
  ) {
    return Math.floor((response.max - response.min) / response.step) + 1;
  }

  /**
   * A count over a grid. `SPA-MAZE-01` answers with a path length, `SPA-PIPES-01` with a number of
   * pipes, `SPA-TANGRAM-01` with a filled-cell count. Every key in all three banks is within
   * `R * C * (L || 1)`, so the grid bounds the answer and the space is that many values plus zero.
   *
   * Deriving it per item rather than per type is the point: a 4x4 maze is one guess in 17 and a 12x12
   * one is one in 145, so the floor falls as the item gets harder, which is the behaviour wanted. A
   * per-type constant taken from the spread of keys in the bank would also be circular — it would set
   * the guessing floor from the answers, and move whenever a bank grew.
   */
  const grid = content.grid as { R?: number; C?: number; L?: number } | undefined;
  if (typeof grid?.R === 'number' && typeof grid.C === 'number') {
    const cells = grid.R * grid.C * (typeof grid.L === 'number' ? grid.L : 1);
    if (cells > 0) return cells + 1;
  }

  /**
   * An assignment of every token to a bin. `CX-check-01` has 6 to 14 tokens over 2 to 4 bins, so the
   * space runs from 64 to several million — effectively unguessable, but derived rather than asserted.
   */
  const { binCount, tokenCount } = content as { binCount?: number; tokenCount?: number };
  if (typeof binCount === 'number' && typeof tokenCount === 'number' && binCount > 1 && tokenCount > 0) {
    return binCount ** tokenCount;
  }

  return null;
}

/**
 * How the candidate produces an answer, which is a different question from how large the space is.
 *
 * Multiple choice means one pick from a list the item puts in front of them. Everything else — a number
 * on a stepper, a count over a grid, an assignment of tokens to bins, a run of yes/no probes — is
 * constructed: the candidate builds the answer rather than choosing it.
 *
 * The distinction exists because constructed items are genuinely more informative per item and much
 * slower to answer. Selection maximises information per item, so left alone it fills a session with
 * them. `session.ts` uses this to hold a share of each session for multiple choice.
 */
export type ResponseFormat = 'multiple-choice' | 'constructed';

/** Takes anything carrying content, so a host can classify a `ServedItem` without the answer. */
export function responseFormatOf(record: { readonly content: Record<string, unknown> }): ResponseFormat {
  const content = record.content ?? {};
  for (const field of ['options', 'candidates', 'rows', 'claims']) {
    const list = content[field];
    if (Array.isArray(list) && list.length > 0) return 'multiple-choice';
  }
  return 'constructed';
}

/** Domain labels the banks use, mapped to the four the engine blueprints against. */
export function domainOf(record: BankRecord | LoadedBank): 'quantitative' | 'verbal' | 'spatial' | 'fluid' {
  const code = ('typeCode' in record ? record.typeCode : '').toUpperCase();
  if (code.startsWith('QUANT')) return 'quantitative';
  if (code.startsWith('VER')) return 'verbal';
  if (code.startsWith('SPA')) return 'spatial';
  // FLU, GB, WM and CX all exercise rule-finding or capacity rather than a taught subject, so they
  // land in fluid. Crude, and better than inventing two more blueprint slots for one item each.
  return 'fluid';
}
