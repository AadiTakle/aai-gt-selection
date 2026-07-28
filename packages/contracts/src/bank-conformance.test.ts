/**
 * Every generated question bank must satisfy the canonical contract.
 *
 * This test exists because it did not. Twenty-odd generators were written in
 * parallel, each validated only by its own `check-<TYPE>.mjs`; nothing ever
 * parsed a bank against `bankItemSchema`. By the time anyone looked, 0 of 63
 * banks passed `bankItemSchema` and 14 of 63 passed `servedItemSchema`, and
 * most built question types could not be served at all (E-074).
 *
 * A conformance test that runs on every `pnpm -r test` is the fix. The schema
 * widening and the bank migration only cleared the backlog.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { bankItemSchema, servedItemSchema } from './assessment-exam-adaptive';

/** Fields the browser must never receive (BUILD_PLAN §2, SPEC §6.3-§6.4). */
const SERVER_ONLY_FIELDS = ['answer', 'scoring', 'provenance'] as const;

function repoRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  while (!existsSync(join(dir, 'pnpm-workspace.yaml'))) {
    const parent = resolve(dir, '..');
    if (parent === dir) throw new Error('could not locate the workspace root');
    dir = parent;
  }
  return dir;
}

const BANK_DIR = join(repoRoot(), 'research/exam-question-types/banks');

interface Bank {
  typeCode: string;
  items: Record<string, unknown>[];
}

function loadBanks(): Bank[] {
  return readdirSync(BANK_DIR)
    .filter((f) => f.endsWith('.jsonl'))
    .sort()
    .map((f) => ({
      typeCode: f.replace(/\.jsonl$/, ''),
      items: readFileSync(join(BANK_DIR, f), 'utf8')
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => JSON.parse(line) as Record<string, unknown>),
    }));
}

const banks = loadBanks();

/** The bank item minus everything `servedItemSchema` omits. */
function serve(item: Record<string, unknown>): Record<string, unknown> {
  const served = { ...item };
  for (const field of SERVER_ONLY_FIELDS) delete served[field];
  return served;
}

/** `TYPE[itemIndex] answer.distractorRationales.A: <message>`, deduplicated. */
function describeFailures(
  bank: Bank,
  schema: typeof bankItemSchema | typeof servedItemSchema,
  project: (item: Record<string, unknown>) => Record<string, unknown>,
): string[] {
  const seen = new Map<string, string>();
  bank.items.forEach((item, index) => {
    const result = schema.safeParse(project(item));
    if (result.success) return;
    for (const issue of result.error.issues) {
      const path = issue.path.join('.') || '(root)';
      if (!seen.has(path)) seen.set(path, `${bank.typeCode}[${index}] ${path}: ${issue.message}`);
    }
  });
  return [...seen.values()];
}

describe('question banks conform to the canonical contract', () => {
  it('finds banks to check', () => {
    // Guards against a passing run that checked nothing.
    expect(banks.length).toBeGreaterThan(0);
    for (const bank of banks) expect(bank.items.length, bank.typeCode).toBeGreaterThan(0);
  });

  describe.each(banks.map((b) => [b.typeCode, b] as const))('%s', (_typeCode, bank) => {
    it('every item parses as a BankItem', () => {
      expect(describeFailures(bank, bankItemSchema, (item) => item)).toEqual([]);
    });

    it('every served item parses as a ServedItem', () => {
      expect(describeFailures(bank, servedItemSchema, serve)).toEqual([]);
    });
  });
});

describe('the served projection is the security boundary', () => {
  const sample = banks[0]?.items[0];

  it.each(SERVER_ONLY_FIELDS)('servedItemSchema rejects %s', (field) => {
    expect(sample, 'no bank item to probe with').toBeDefined();
    const leaked = { ...serve(sample!), [field]: sample![field] };
    expect(servedItemSchema.safeParse(leaked).success).toBe(false);
  });

  it('no served item carries answer, scoring, or provenance', () => {
    const leaks: string[] = [];
    for (const bank of banks) {
      bank.items.forEach((item, index) => {
        const parsed = servedItemSchema.parse(serve(item));
        for (const field of SERVER_ONLY_FIELDS) {
          if (field in parsed) leaks.push(`${bank.typeCode}[${index}] leaks ${field}`);
        }
      });
    }
    expect(leaks).toEqual([]);
  });
});
