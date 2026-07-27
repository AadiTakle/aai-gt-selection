import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { bankItemSchema, findAnswerLeak, servedItemV2Schema } from './bank-item';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = resolve(HERE, '../data');

function readJsonl(path: string): unknown[] {
  return readFileSync(path, 'utf-8')
    .split('\n')
    .filter((l) => l.trim().length > 0)
    .map((l) => JSON.parse(l));
}

const bankPath = resolve(DATA, 'bank/items.bank.jsonl');
const servedPath = resolve(DATA, 'served/items.served.jsonl');

describe('committed bank file (server side)', () => {
  const rows = readJsonl(bankPath);

  it('is non-empty', () => {
    expect(rows.length).toBeGreaterThan(0);
  });

  it('every row validates against bankItemSchema and is born-synthetic', () => {
    for (const r of rows) {
      const parsed = bankItemSchema.safeParse(r);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.syntheticOnly).toBe(true);
        expect(parsed.data.validated).toBe(false);
        expect(parsed.data.irt.provisional).toBe(true);
      }
    }
  });

  it('every server-side item actually carries an answer key', () => {
    for (const r of rows) {
      const item = bankItemSchema.parse(r);
      const a = item.answer;
      expect(
        a.correctIndex !== undefined ||
          a.correctSet !== undefined ||
          a.canonicalSolution !== undefined,
      ).toBe(true);
    }
  });
});

describe('committed served file (client side) — ZERO answer keys', () => {
  const rawText = readFileSync(servedPath, 'utf-8');
  const rows = readJsonl(servedPath);

  it('every row validates against servedItemV2Schema', () => {
    for (const r of rows) expect(servedItemV2Schema.safeParse(r).success).toBe(true);
  });

  it('no served row contains any forbidden answer-bearing key (deep scan)', () => {
    for (const r of rows) expect(findAnswerLeak(r)).toEqual([]);
  });

  it('the raw served text contains no answer-key JSON keys', () => {
    for (const forbidden of [
      '"answer"',
      '"scoring"',
      '"irt"',
      '"provenance"',
      '"correctIndex"',
      '"correctSet"',
      '"canonicalSolution"',
      '"distractorRationales"',
      '"lure"',
      '"fit"',
      '"tag"',
      '"sensibleOrder"',
      '"absurdLure"',
      '"validated"',
    ]) {
      expect(rawText.includes(forbidden)).toBe(false);
    }
  });

  it('served itemIds exactly match the bank itemIds', () => {
    const bankIds = readJsonl(bankPath).map((r) => (r as { itemId: string }).itemId);
    const servedIds = rows.map((r) => (r as { itemId: string }).itemId);
    expect(new Set(servedIds)).toEqual(new Set(bankIds));
    expect(servedIds.length).toBe(bankIds.length);
  });
});
