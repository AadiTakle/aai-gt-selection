import {
  domainOf,
  loadBanks,
  optionCountOf,
  paramsForRecord,
  toLogits,
  type BankRecord,
  type LoadedBank,
} from '@gt/qbank/server';
import {
  scrubContent,
  tryParseTypeCode,
  type AnswerKeyRecord,
  type ItemParameters,
  type QuestionTypeRecord,
  type RegistryItem,
  type ScoringMode,
  type SelectionCandidate,
} from '@platform/domain';

import { uiRequirementFor } from './ui-requirement.js';

/**
 * The JSONL banks, turned into the four things the platform stores.
 *
 * One pass over `qbank-library/banks/*.jsonl` produces a type record per file, an item per scorable
 * record, an answer key per scorable record, and the selection index. The split is the whole point:
 * items and the index carry no key and are readable by the serving function, keys go to a table
 * whose IAM policy `serve` does not name, and the index is small enough to hold in a Lambda's
 * module scope — 4,534 candidates measure 1.3 MB of JSON and 137 KB gzipped.
 *
 * This is a pure function of the bank directory and the options. It makes no AWS call and opens no
 * socket; publishing those outputs is a separate step (spec §10) so that the compiler can be tested
 * against the real 19 MB of banks with no cloud in the loop.
 *
 * WHAT THIS DOES NOT DO. It does not calibrate. `params` comes from a linear rescale of an
 * authoring difficulty that is itself synthetic on every record in the library, so `calibrated` is
 * false on every item it emits and stays false until real responses exist. It also does not diff
 * against what is already stored: it emits revision 1 for everything and leaves revision arithmetic
 * to the store, which is the only component that can see the prior state.
 */

export interface CompileStats {
  readonly typeCount: number;
  /** Every record in every compiled bank, scorable or not. */
  readonly itemCount: number;
  readonly scorableCount: number;
  /**
   * Why records were set aside, tallied across all banks.
   *
   * Keyed by the loader's own reason strings rather than by scoring mode alone, because
   * "deterministic_key with no key on it" is a different problem from "needs a solver" and
   * collapsing them would hide 891 broken records behind a mode that looks supported.
   */
  readonly excludedByMode: Readonly<Record<string, number>>;
}

export interface CompiledCatalog {
  readonly snapshotId: string;
  readonly types: readonly QuestionTypeRecord[];
  readonly items: readonly RegistryItem[];
  readonly answerKeys: readonly AnswerKeyRecord[];
  readonly selectionIndex: readonly SelectionCandidate[];
  readonly stats: CompileStats;
}

export interface CompileOptions {
  /** Defaults to `@gt/qbank`'s `BANK_DIR`, i.e. `qbank-library/banks`. */
  readonly bankDir?: string;
  readonly snapshotId: string;
  /** Defaults to {@link DEFAULT_DISCRIMINATION}. */
  readonly discrimination?: number;
  /**
   * Timestamp stamped on every type record, defaulting to now.
   *
   * Exposed so a caller can make a compile reproducible. With the default, two compiles of an
   * unchanged bank differ in this field alone, which would make the publish step in spec §10 report
   * a new revision for every type on every run. Tests pass a fixed value for the same reason.
   */
  readonly createdAt?: string;
}

/**
 * Discrimination is assumed, not measured.
 *
 * 1.5 for every item, matching the `paramsFor(b, 4, 1.5)` the existing `QbankSession` already uses,
 * so the platform measures identically to the prototype it replaces. Anything else would silently
 * change the meaning of a score.
 */
export const DEFAULT_DISCRIMINATION = 1.5;

/**
 * Assumed option count when a record does not present a list to choose from.
 *
 * Four is what `QbankSession` has always passed, and it sets the guessing floor `c` to 0.25. For the
 * types that are constructed rather than chosen — trace a route, place the pieces, say how many
 * blocks — there is no option list and no honest guessing rate, so this is a placeholder that
 * preserves existing behaviour rather than a claim about those items.
 */
export const DEFAULT_OPTION_COUNT = 4;

/** Everything the compiler emits is a first revision; the store owns increments from there. */
export const INITIAL_REVISION = 1;

/**
 * Provenance is recorded as the canonical repository path, not as the directory actually read.
 *
 * A snapshot has to be traceable to a path someone else can open. An absolute path from whichever
 * machine ran the compile is not that, and `bankDir` is a test affordance rather than a second
 * source of truth.
 */
export const SOURCE_REF_PREFIX = 'qbank-library/banks/';

/** Tally key for a bank file whose name is not a parseable type code. */
export const UNPARSEABLE_TYPE_CODE = 'unparseable-type-code';

/** Fixed order so the emitted array does not depend on which reason the loader saw first. */
const SCORING_MODE_ORDER: readonly ScoringMode[] = [
  'deterministic_key',
  'computed_solver',
  'model_judge_deferred',
];

/**
 * A readable label from the code, e.g. `FLU-MATRIX-01` becomes "Flu Matrix".
 *
 * Deliberately mechanical. A hand-written table of 53 titles is a second source of truth that goes
 * stale, and the alternative — asking a model for a nice name — is not reproducible. The cost is
 * that "Wm Corsi" and "Gb Wordladder" read badly; a real display name belongs on the type record as
 * an authored field once anything shows these to a user.
 */
function titleFor(family: string): string {
  return family
    .split('-')
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

/**
 * How many choices the child is offered.
 *
 * A zero-length list is treated as absent rather than propagated, because `c = 1 / 0` is infinite
 * and would make the item look infinitely guessable to the information calculation.
 */
/**
 * Deliberately not implemented here. See the note on `params` below.
 */

/**
 * Which scoring modes a type actually contains.
 *
 * `no-key` and `no-difficulty` records declared `deterministic_key` and were set aside for missing
 * something else, so they still prove the mode is present in the bank. The loader's other reasons —
 * `unknown` and `unparseable` — name no mode and are omitted, which means a type made entirely of
 * unparseable lines reports no modes at all. That is accurate.
 */
function scoringModesIn(bank: LoadedBank): readonly ScoringMode[] {
  const present = new Set<ScoringMode>();
  // Read the records rather than assume the mode, now that `scorable` can hold more than one.
  for (const record of bank.scorable) present.add(record.scoring.mode);
  for (const [reason, count] of Object.entries(bank.excluded)) {
    if (count <= 0) continue;
    // These three all declared `deterministic_key` and were set aside for missing something else, so
    // they still prove the mode is present. `non-index-numeric-key` joined them when a numeric key
    // became legitimate: QUANT-GLYPHNUM-01's 391 records declare the mode and store a placement ratio.
    if (reason === 'no-key' || reason === 'no-difficulty' || reason === 'non-index-numeric-key') {
      present.add('deterministic_key');
    }
    if (reason === 'computed_solver' || reason === 'model_judge_deferred') present.add(reason);
    // `unusable-cell-set-key` is a computed_solver record whose stored set would not parse.
    if (reason === 'unusable-cell-set-key') present.add('computed_solver');
  }
  return SCORING_MODE_ORDER.filter((mode) => present.has(mode));
}

/** The loader reports `[NaN, NaN]` for a type with nothing scorable; the registry says `null`. */
function difficultyRangeOf(bank: LoadedBank): readonly [number, number] | null {
  const [low, high] = bank.difficultyRange;
  if (!Number.isFinite(low) || !Number.isFinite(high)) return null;
  return [low, high];
}

/** Stable key order, so the same tally always encodes to the same bytes. */
function sortedTally(tally: Readonly<Record<string, number>>): Readonly<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const key of Object.keys(tally).sort()) {
    const value = tally[key];
    if (value !== undefined) out[key] = value;
  }
  return out;
}

export function compileCatalog(opts: CompileOptions): CompiledCatalog {
  const discrimination = opts.discrimination ?? DEFAULT_DISCRIMINATION;
  const createdAt = opts.createdAt ?? new Date().toISOString();
  const banks = loadBanks(opts.bankDir);

  const types: QuestionTypeRecord[] = [];
  const items: RegistryItem[] = [];
  const answerKeys: AnswerKeyRecord[] = [];
  const selectionIndex: SelectionCandidate[] = [];
  const excluded: Record<string, number> = {};
  let itemCount = 0;

  // Sorted rather than left in readdir order, because the snapshot is checksummed and a directory
  // listing is not guaranteed to be stable across filesystems.
  const ordered = [...banks.entries()].sort(([left], [right]) =>
    left < right ? -1 : left > right ? 1 : 0,
  );

  for (const [typeCode, bank] of ordered) {
    const parsed = tryParseTypeCode(typeCode);
    if (!parsed) {
      // One badly named file costs one type rather than the whole publish. Its records are counted
      // under a single reason instead of by mode, because with no type record to hang them on,
      // reporting their mode split would imply the type was compiled.
      excluded[UNPARSEABLE_TYPE_CODE] = (excluded[UNPARSEABLE_TYPE_CODE] ?? 0) + bank.total;
      continue;
    }

    const uiRequirement = uiRequirementFor(typeCode);
    itemCount += bank.total;
    for (const [reason, count] of Object.entries(bank.excluded)) {
      excluded[reason] = (excluded[reason] ?? 0) + count;
    }

    for (const record of bank.scorable) {
      /**
       * Parameters come from the engine, not from here.
       *
       * This used to count `content.options` and assume four when it could not tell. Measured against the
       * real banks that was wrong for 818 of 4,934 items: `CX-check-01` is a set of six or eight independent
       * probes, so it admits 64 or 256 answers and its guessing floor is 0.016, not the 0.25 being asserted
       * — a fifteenfold overstatement of how guessable it is, which suppresses the information those items
       * carry and quietly biases selection away from them. A further 140 cell-set items are not guessable at
       * all, where a floor of 0.25 claims a child has a one-in-four chance of tapping the right eight squares.
       *
       * `optionCountOf` knows about probe sets, steppers, grids and bin spaces, and says null rather than
       * guessing. One definition of what an item is worth, and it is the one the engine selects on.
       */
      const optionCount = optionCountOf(record);
      const engineParams = paramsForRecord(record);
      // The item and its selection candidate share these objects rather than each holding a copy.
      const params: ItemParameters = {
        b: engineParams.b,
        // The engine fixes discrimination at 1.5; the option exists so a caller can explore alternatives.
        a: discrimination ?? engineParams.a,
        c: engineParams.c,
      };
      const domain = domainOf(record);
      const ageBands = record.ageBands ?? [];

      items.push({
        itemId: record.itemId,
        typeCode,
        revision: INITIAL_REVISION,
        domain,
        difficulty: record.difficulty,
        params,
        optionCount,
        ageBands,
        /**
         * The mode the record actually declares, not the one it was assumed to declare.
         *
         * This was hardcoded to `deterministic_key` on the grounds that the loader admits nothing else.
         * That stopped being true when `SPA-PUNCH-01` became servable: it declares `computed_solver` and
         * is marked as a cell set. Hardcoding meant the registry misreported 140 items, and — worse —
         * the misreport was what let them past a serving filter that tested this field.
         */
        scoringMode: record.scoring.mode,
        // A second net behind the answer table, not the primary control. It removes nothing from
        // the current 53 banks; it is here so that one type putting a key inside `content` cannot
        // leak silently.
        content: scrubContent(record.content ?? {}),
        syntheticOnly: record.syntheticOnly ?? true,
        validated: record.validated ?? false,
        calibrated: false,
      });

      const { correctKey, ...extra } = record.answer;
      answerKeys.push({
        itemId: record.itemId,
        // Marking dispatches on this; see `markAgainstKey`.
        typeCode,
        revision: INITIAL_REVISION,
        correctKey,
        scoringMode: record.scoring.mode,
        extra,
      });

      selectionIndex.push({
        itemId: record.itemId,
        itemRevision: INITIAL_REVISION,
        typeCode,
        domain,
        params,
        difficulty: record.difficulty,
        optionCount,
        ageBands,
        scoringMode: record.scoring.mode,
        // True by construction: only records the loader admitted to `scorable` reach this point, and
        // that is the decision about markability rather than anything derivable from the mode.
        markable: true,
        // Reading load is a property of the type, not of the item: the contract derives one band
        // per bank, so every item of a type shares it.
        readingBand: uiRequirement.readingBand,
        syntheticOnly: record.syntheticOnly ?? true,
      });
    }

    types.push({
      typeCode,
      family: parsed.family,
      version: parsed.version,
      // Seeded from the prefix heuristic. Stored explicitly because the heuristic is wrong for any
      // future code without a domain prefix (spec §5.2).
      domain: domainOf(bank),
      title: titleFor(parsed.family),
      uiRequirement,
      scoringModes: scoringModesIn(bank),
      itemCount: bank.total,
      scorableCount: bank.scorable.length,
      difficultyRange: difficultyRangeOf(bank),
      ageBands: bank.ageBands,
      createdAt,
      sourceRef: `${SOURCE_REF_PREFIX}${typeCode}.jsonl`,
    });
  }

  return {
    snapshotId: opts.snapshotId,
    types,
    items,
    answerKeys,
    selectionIndex,
    stats: {
      typeCount: types.length,
      itemCount,
      scorableCount: items.length,
      excludedByMode: sortedTally(excluded),
    },
  };
}
