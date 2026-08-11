import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

import {
  loadBanks,
  optionCountOf,
  paramsForRecord,
  toLogits,
  type BankRecord,
} from '@gt/qbank/server';
import { parseTypeCode } from '@platform/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  DEFAULT_DISCRIMINATION,
  DEFAULT_OPTION_COUNT,
  UNPARSEABLE_TYPE_CODE,
  compileCatalog,
  deserializeSelectionIndex,
  serializeSelectionIndex,
  type CompiledCatalog,
} from './index.js';

/**
 * A golden test against the real 19 MB of banks.
 *
 * The counts below are measurements of `qbank-library/banks`, not targets. If one of them moves, a
 * bank changed or the compiler broke, and either way somebody has to look — which is the point of
 * asserting them rather than asserting that the numbers are merely plausible.
 */

const SNAPSHOT_ID = 'snap-test-001';

/** Fixed so the compile is reproducible; see the note on `CompileOptions.createdAt`. */
const FIXED_CREATED_AT = '2026-08-10T00:00:00.000Z';

const EXPECTED_TYPES = 53;
const EXPECTED_ITEMS = 7319;
const EXPECTED_SCORABLE = 4934;

/**
 * Property names that must not survive into anything the serving path can read.
 *
 * Checked by name at every depth rather than by value. A substring search for a key like "A" would
 * match the option labels on every item in the library, so it would pass or fail for reasons that
 * have nothing to do with leaking.
 */
const ANSWER_SHAPED_KEYS: readonly string[] = [
  'answer',
  'answerKey',
  'correctKey',
  'correct',
  'solution',
  'distractorRationales',
];

function answerShapedPathsIn(value: unknown, path = '$'): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => answerShapedPathsIn(entry, `${path}[${index}]`));
  }
  if (value === null || typeof value !== 'object') return [];
  const found: string[] = [];
  for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
    if (ANSWER_SHAPED_KEYS.includes(key)) found.push(`${path}.${key}`);
    found.push(...answerShapedPathsIn(inner, `${path}.${key}`));
  }
  return found;
}

let compiled!: CompiledCatalog;

beforeAll(() => {
  compiled = compileCatalog({ snapshotId: SNAPSHOT_ID, createdAt: FIXED_CREATED_AT });
});

describe('compileCatalog against the real banks', () => {
  it('compiles every bank file into a type', () => {
    expect(compiled.stats.typeCount).toBe(EXPECTED_TYPES);
    expect(compiled.types).toHaveLength(EXPECTED_TYPES);
  });

  it('counts every record, not only the ones it can mark', () => {
    expect(compiled.stats.itemCount).toBe(EXPECTED_ITEMS);
    expect(compiled.types.reduce((sum, type) => sum + type.itemCount, 0)).toBe(EXPECTED_ITEMS);
  });

  it('emits an item for each scorable record', () => {
    expect(compiled.stats.scorableCount).toBe(EXPECTED_SCORABLE);
    expect(compiled.items).toHaveLength(EXPECTED_SCORABLE);
    expect(compiled.types.reduce((sum, type) => sum + type.scorableCount, 0)).toBe(
      EXPECTED_SCORABLE,
    );
  });

  it('reports why the other 2,385 records were set aside', () => {
    // computed_solver fell from 1,774 when SPA-PUNCH-01's 140 cell-set items became servable.
    expect(compiled.stats.excludedByMode['computed_solver']).toBe(1634);
    // The 891 keyless records resolved into 500 newly scorable verbal items and QUANT-GLYPHNUM-01's
    // 391, whose numeric key is a placement ratio rather than an option index.
    expect(compiled.stats.excludedByMode['non-index-numeric-key']).toBe(391);
    // Three types retired in PR #68. FLU-ODDPAIR-01 because its stored key was arbitrary on the 49
    // items with no matched pair, so the bank had been marking correct reasoning wrong.
    expect(compiled.stats.excludedByMode['retired:reviewer-kill']).toBe(240);
    expect(compiled.stats.excludedByMode['retired:validity-defect']).toBe(120);
    // Its only type, CX-achieve-02, is now retired.
    expect(compiled.stats.excludedByMode['model_judge_deferred']).toBeUndefined();
    const setAside = Object.values(compiled.stats.excludedByMode).reduce((a, b) => a + b, 0);
    expect(setAside).toBe(EXPECTED_ITEMS - EXPECTED_SCORABLE);
  });

  it('carries the snapshot id it was given', () => {
    expect(compiled.snapshotId).toBe(SNAPSHOT_ID);
  });

  it('starts everything at revision 1, leaving increments to the store', () => {
    expect(compiled.items.every((item) => item.revision === 1)).toBe(true);
    expect(compiled.answerKeys.every((key) => key.revision === 1)).toBe(true);
    expect(compiled.selectionIndex.every((candidate) => candidate.itemRevision === 1)).toBe(true);
  });

  it('claims nothing is calibrated, because nothing has met a child', () => {
    expect(compiled.items.some((item) => item.calibrated)).toBe(false);
    expect(compiled.items.every((item) => item.syntheticOnly)).toBe(true);
    expect(compiled.items.some((item) => item.validated)).toBe(false);
  });
});

describe('type records', () => {
  it('takes family and version from the code rather than inventing them', () => {
    for (const type of compiled.types) {
      const parsed = parseTypeCode(type.typeCode);
      expect(type.family).toBe(parsed.family);
      expect(type.version).toBe(parsed.version);
    }
  });

  it('derives a readable title deterministically from the family', () => {
    const byCode = new Map(compiled.types.map((type) => [type.typeCode, type]));
    expect(byCode.get('FLU-MATRIX-01')?.title).toBe('Flu Matrix');
    expect(byCode.get('WM-corsi-01')?.title).toBe('Wm Corsi');
    expect(byCode.get('QUANT-GLYPHNUM-01')?.title).toBe('Quant Glyphnum');
  });

  it('points every type at the bank it came from', () => {
    for (const type of compiled.types) {
      expect(type.sourceRef).toBe(`qbank-library/banks/${type.typeCode}.jsonl`);
    }
  });

  it('stamps the createdAt it was given', () => {
    expect(compiled.types.every((type) => type.createdAt === FIXED_CREATED_AT)).toBe(true);
  });

  it('reports a difficulty range only where something is scorable', () => {
    let nulled = 0;
    for (const type of compiled.types) {
      const range = type.difficultyRange;
      if (type.scorableCount === 0) {
        // The loader reports [NaN, NaN] here, which must not reach the registry as a range.
        expect(range).toBeNull();
        nulled += 1;
        continue;
      }
      if (range === null) throw new Error(`${type.typeCode} has items but no difficulty range`);
      expect(Number.isFinite(range[0])).toBe(true);
      expect(Number.isFinite(range[1])).toBe(true);
      expect(range[0]).toBeLessThanOrEqual(range[1]);
    }
    expect(nulled).toBe(17);
  });

  it('names deterministic_key on every type that has a key anywhere, scorable or not', () => {
    const byCode = new Map(compiled.types.map((type) => [type.typeCode, type]));
    // 391 records, every one declaring deterministic_key and storing a placement ratio where an
    // option index belongs, so the loader sets them aside as non-index-numeric-key.
    const glyphnum = byCode.get('QUANT-GLYPHNUM-01');
    expect(glyphnum?.scorableCount).toBe(0);
    expect(glyphnum?.scoringModes).toContain('deterministic_key');
  });

  it('wires the real ui-contract in, not a stub', () => {
    const withElements = compiled.types.filter((type) => type.uiRequirement.elements.length > 0);
    // Tolerant of a handful of types the contract has no signals for; in practice all 53 resolve.
    expect(withElements.length).toBeGreaterThanOrEqual(40);
    const matrix = compiled.types.find((type) => type.typeCode === 'FLU-MATRIX-01');
    expect(matrix?.uiRequirement.elements).toContain('choiceList');
    expect(matrix?.uiRequirement.counts['nominalChannel']).toBe(4);
  });

  it('carries a reading band only where the contract found prose', () => {
    const banded = compiled.types.filter((type) => type.uiRequirement.readingBand !== null);
    expect(banded.map((type) => type.typeCode).sort()).toEqual([
      'CX-achieve-02',
      'QUANT-WORD-01',
      'VER-CLOZE-01',
    ]);
  });

  it('never emits an undefined count, which would not survive a JSON round trip', () => {
    for (const type of compiled.types) {
      for (const value of Object.values(type.uiRequirement.counts)) {
        expect(typeof value).toBe('number');
      }
    }
  });
});

describe('item parameters', () => {
  /**
   * Parameters are the engine's, item for item.
   *
   * This is the assertion that keeps selection honest: the platform selects on `params`, the engine selects
   * on `paramsForRecord`, and if those ever diverge the two disagree about what a question is worth. An
   * earlier version of this test compared against a local derivation that assumed four options, which agreed
   * with the engine on 4,116 of 4,934 items and was wrong about the other 818.
   */
  it('carries exactly the parameters the engine would compute', () => {
    const byId = new Map<string, BankRecord>();
    for (const bank of loadBanks().values()) {
      for (const record of bank.scorable) byId.set(record.itemId, record);
    }

    for (const item of compiled.items) {
      const record = byId.get(item.itemId);
      expect(record).toBeDefined();
      const expected = paramsForRecord(record as BankRecord);
      expect(item.params.b).toBe(expected.b);
      expect(item.params.a).toBe(expected.a);
      expect(item.params.c).toBe(expected.c);
      expect(item.params.b).toBe(toLogits(item.difficulty));
      expect(item.params.a).toBe(DEFAULT_DISCRIMINATION);
      expect(item.optionCount).toBe(optionCountOf(record as BankRecord));
    }
  });

  it('reads a guessing floor from a probe set rather than assuming four options', () => {
    // CX-check-01 is six or eight independent probes: 64 or 256 answers, not 4.
    const probes = compiled.items.filter((item) => item.typeCode === 'CX-check-01');
    expect(probes.length).toBeGreaterThan(0);
    expect(probes.some((item) => (item.optionCount ?? 0) >= 64)).toBe(true);
    for (const item of probes) expect(item.params.c).toBeLessThan(0.05);
  });

  it('treats a cell-set item as unguessable rather than one-in-four', () => {
    const punch = compiled.items.filter((item) => item.typeCode === 'SPA-PUNCH-01');
    expect(punch.length).toBeGreaterThan(0);
    for (const item of punch) {
      expect(item.optionCount).toBeNull();
      expect(item.params.c).toBe(0);
    }
  });

  it('honours an explicit discrimination', () => {
    const alternate = compileCatalog({
      snapshotId: SNAPSHOT_ID,
      createdAt: FIXED_CREATED_AT,
      discrimination: 0.9,
    });
    expect(alternate.items.every((item) => item.params.a === 0.9)).toBe(true);
    expect(alternate.items).toHaveLength(EXPECTED_SCORABLE);
  });

  it('counts the answers an item admits, and says null when its content cannot tell', () => {
    let counted = 0;
    let unknown = 0;
    let beyondItsOptionList = 0;

    for (const item of compiled.items) {
      if (item.optionCount === null) {
        // Null is meaningful: it is what makes the item unguessable.
        expect(item.params.c).toBe(0);
        unknown += 1;
        continue;
      }
      expect(item.optionCount).toBeGreaterThan(0);
      expect(item.params.c).toBe(1 / item.optionCount);
      counted += 1;

      const options = item.content['options'];
      const listed = Array.isArray(options) ? options.length : 0;
      if (item.optionCount > Math.max(listed, 1)) beyondItsOptionList += 1;
    }

    expect(counted).toBeGreaterThan(0);
    expect(unknown).toBeGreaterThan(0);
    expect(counted + unknown).toBe(EXPECTED_SCORABLE);
    // The reason a local derivation was not good enough: many items admit far more answers than they
    // list options, because the answer is a combination rather than a choice.
    expect(beyondItsOptionList).toBeGreaterThan(0);
  });

  it('finds option counts other than the default, so the derivation is doing work', () => {
    const counts = new Set(compiled.items.map((item) => item.optionCount));
    expect(counts.size).toBeGreaterThan(1);
  });

  it('gives the selection index the same parameters as the item', () => {
    const byId = new Map(compiled.items.map((item) => [item.itemId, item]));
    for (const candidate of compiled.selectionIndex) {
      const item = byId.get(candidate.itemId);
      expect(item).toBeDefined();
      expect(candidate.params).toEqual(item?.params);
      expect(candidate.difficulty).toBe(item?.difficulty);
      expect(candidate.optionCount).toBe(item?.optionCount);
      expect(candidate.domain).toBe(item?.domain);
    }
  });
});

describe('answer keys', () => {
  it('emits one per scorable item and no more', () => {
    expect(compiled.answerKeys).toHaveLength(compiled.stats.scorableCount);
    const ids = new Set(compiled.answerKeys.map((key) => key.itemId));
    expect(ids.size).toBe(compiled.stats.scorableCount);
  });

  it('carries a usable key, its type code, and the rest of the answer block as extra', () => {
    for (const key of compiled.answerKeys) {
      // Letters and cell sets are strings; the five positional verbal types store an option index.
      expect(['string', 'number']).toContain(typeof key.correctKey);
      if (typeof key.correctKey === 'string') expect(key.correctKey.length).toBeGreaterThan(0);
      // Marking dispatches on the type code, so a key without one is unmarkable for cell-set types.
      expect(key.typeCode.length).toBeGreaterThan(0);
      expect(key.scoringMode).toBe(
        compiled.items.find((item) => item.itemId === key.itemId)?.scoringMode,
      );
      expect('correctKey' in key.extra).toBe(false);
    }
    // Not vacuous: both key shapes and both modes are actually present in the real banks.
    expect(compiled.answerKeys.some((key) => typeof key.correctKey === 'number')).toBe(true);
    expect(compiled.answerKeys.some((key) => key.scoringMode === 'computed_solver')).toBe(true);
    // The rationales are the reason `extra` exists: a marker may need them, a renderer never does.
    expect(compiled.answerKeys.some((key) => 'distractorRationales' in key.extra)).toBe(true);
  });
});

describe('the answer never reaches the serving path', () => {
  it('leaves no answer-shaped property at any depth of any item', () => {
    const offenders = compiled.items.flatMap((item) =>
      answerShapedPathsIn(item, `item:${item.itemId}`),
    );
    expect(offenders).toEqual([]);
  });

  it('leaves no answer-shaped property at any depth of the selection index', () => {
    expect(answerShapedPathsIn(compiled.selectionIndex)).toEqual([]);
  });

  it('never serializes the words themselves', () => {
    for (const json of [
      JSON.stringify(compiled.items),
      JSON.stringify(compiled.selectionIndex),
    ]) {
      expect(json).not.toContain('correctKey');
      expect(json).not.toContain('distractorRationales');
    }
  });

  it('withholds a specific known key from the item that key belongs to', () => {
    const [key] = compiled.answerKeys;
    expect(key).toBeDefined();
    expect(String(key?.correctKey ?? '').length).toBeGreaterThan(0);

    const item = compiled.items.find((candidate) => candidate.itemId === key?.itemId);
    expect(item).toBeDefined();
    // The key value itself ("A", "B") is all over the option list and proves nothing by its
    // presence. What matters is that no field on the item is shaped like an answer.
    expect(answerShapedPathsIn(item)).toEqual([]);
  });

  it('keeps content out of the selection index entirely', () => {
    const [candidate] = compiled.selectionIndex;
    expect(candidate).toBeDefined();
    expect(Object.keys(candidate ?? {}).sort()).toEqual([
      'ageBands',
      'difficulty',
      'domain',
      'itemId',
      'itemRevision',
      'markable',
      'optionCount',
      'params',
      'readingBand',
      'scoringMode',
      'syntheticOnly',
      'typeCode',
    ]);
  });

  it('offers selection only items this platform can mark', () => {
    // Markability is the loader's decision, not an inference from the mode: SPA-PUNCH-01 declares
    // computed_solver and marks perfectly well as a cell set, while fourteen other computed_solver
    // types do not because nobody has written their comparison rule.
    expect(compiled.selectionIndex.every((candidate) => candidate.markable)).toBe(true);
    expect(compiled.selectionIndex).toHaveLength(EXPECTED_SCORABLE);
    const modes = new Set(compiled.selectionIndex.map((candidate) => candidate.scoringMode));
    expect([...modes].sort()).toEqual(['computed_solver', 'deterministic_key']);
  });

  it('gives each candidate the reading band of its own type', () => {
    const bandByType = new Map(
      compiled.types.map((type) => [type.typeCode, type.uiRequirement.readingBand]),
    );
    for (const candidate of compiled.selectionIndex) {
      expect(candidate.readingBand).toBe(bandByType.get(candidate.typeCode));
    }
    // Not vacuous: at least one scorable type demands reading.
    expect(compiled.selectionIndex.some((candidate) => candidate.readingBand !== null)).toBe(true);
  });
});

describe('determinism', () => {
  it('compiles the same catalog twice from the same inputs', () => {
    const again = compileCatalog({ snapshotId: SNAPSHOT_ID, createdAt: FIXED_CREATED_AT });
    expect(again.stats).toEqual(compiled.stats);
    expect(again.types).toEqual(compiled.types);
    expect(again.items).toEqual(compiled.items);
    expect(again.answerKeys).toEqual(compiled.answerKeys);
    expect(again.selectionIndex).toEqual(compiled.selectionIndex);
  });
});

describe('selection index serialization', () => {
  it('round trips the whole index unchanged', async () => {
    const blob = await serializeSelectionIndex(compiled.selectionIndex, compiled.snapshotId);
    const restored = await deserializeSelectionIndex(blob);
    expect(restored.snapshotId).toBe(compiled.snapshotId);
    expect(restored.items).toEqual(compiled.selectionIndex);
  });

  it('round trips an empty index', async () => {
    const restored = await deserializeSelectionIndex(await serializeSelectionIndex([], 'snap-empty'));
    expect(restored).toEqual({ snapshotId: 'snap-empty', items: [] });
  });

  it('produces identical bytes for identical input, so a checksum means something', async () => {
    const [first, second] = await Promise.all([
      serializeSelectionIndex(compiled.selectionIndex, compiled.snapshotId),
      serializeSelectionIndex(compiled.selectionIndex, compiled.snapshotId),
    ]);
    expect(first.equals(second)).toBe(true);
  });

  it('compresses the index to something a cold start can afford', async () => {
    const blob = await serializeSelectionIndex(compiled.selectionIndex, compiled.snapshotId);
    expect(blob.byteLength).toBeLessThan(2_000_000);
  });

  it('refuses a blob it cannot parse rather than serving a partial index', async () => {
    await expect(deserializeSelectionIndex(Buffer.from('not gzip'))).rejects.toThrow();
  });

  it('refuses an envelope version it does not know', async () => {
    const forged = gzipSync(
      Buffer.from(JSON.stringify({ snapshotId: 'snap-x', version: 999, items: [] }), 'utf8'),
    );
    await expect(deserializeSelectionIndex(forged)).rejects.toThrow(/not supported/i);
  });
});

describe('a bank directory other than the library', () => {
  /**
   * Compiled from a throwaway directory because the real library has no badly named file and no
   * record without an option list, so the skip-and-count path and the option-count fallback would
   * otherwise have no coverage at all.
   */
  const record = (over: Record<string, unknown>) =>
    JSON.stringify({
      itemId: 'tmp-item',
      typeCode: 'FLU-MATRIX-01',
      domain: 'fluid_reasoning',
      difficulty: 12,
      ageBands: ['K-1'],
      content: {},
      answer: { correctKey: 'B', note: 'kept as extra' },
      scoring: { mode: 'deterministic_key' },
      syntheticOnly: true,
      validated: false,
      ...over,
    });

  let dir!: string;
  let local!: CompiledCatalog;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'gt-catalog-'));
    writeFileSync(
      join(dir, 'FLU-MATRIX-01.jsonl'),
      [
        record({ itemId: 'three', content: { options: [{ key: 'A' }, { key: 'B' }, { key: 'C' }] } }),
        record({ itemId: 'none', difficulty: 8, content: { prompt: 'no list to choose from' } }),
        record({ itemId: 'empty', difficulty: 9, content: { options: [] } }),
      ].join('\n') + '\n',
    );
    writeFileSync(join(dir, 'not-a-type-code.jsonl'), record({ itemId: 'orphan' }) + '\n');
    local = compileCatalog({ bankDir: dir, snapshotId: 'snap-tmp-001', createdAt: FIXED_CREATED_AT });
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('skips a file whose name is not a type code and counts what it cost', () => {
    expect(local.stats.typeCount).toBe(1);
    expect(local.types[0]?.typeCode).toBe('FLU-MATRIX-01');
    expect(local.stats.excludedByMode[UNPARSEABLE_TYPE_CODE]).toBe(1);
    // The skipped file's records are not attributed to any type.
    expect(local.stats.itemCount).toBe(3);
  });

  it('counts a listed set of options, and refuses to invent one that is absent or empty', () => {
    const byId = new Map(local.items.map((item) => [item.itemId, item]));
    expect(byId.get('three')?.optionCount).toBe(3);
    expect(byId.get('three')?.params.c).toBe(1 / 3);
    // No list, so no count, so no guessing floor. Assuming four here was wrong for 818 of the real
    // library's items and is exactly the assumption this stopped making.
    expect(byId.get('none')?.optionCount).toBeNull();
    expect(byId.get('none')?.params.c).toBe(0);
    expect(byId.get('empty')?.optionCount).toBeNull();
    expect(byId.get('empty')?.params.c).toBe(0);
  });

  it('keeps the non-key part of the answer block', () => {
    expect(local.answerKeys[0]?.correctKey).toBe('B');
    expect(local.answerKeys[0]?.extra).toEqual({ note: 'kept as extra' });
  });

  it('still resolves the ui requirement, which the contract reads from its own bank dir', () => {
    // The contract never sees this directory, so a real type code resolves and a fabricated one
    // would fall back to the empty requirement rather than throwing.
    expect(local.types[0]?.uiRequirement.elements.length).toBeGreaterThan(0);
  });

  it('records provenance as the canonical repository path, not the directory it read', () => {
    expect(local.types[0]?.sourceRef).toBe('qbank-library/banks/FLU-MATRIX-01.jsonl');
  });
});
