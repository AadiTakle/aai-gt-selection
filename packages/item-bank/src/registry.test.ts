import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { ITEM_CONTENT_REGISTRY } from './content/registry';
import { VALID_DOMAINS } from './enums';
import { DOMAIN_BY_TYPE, MASTER_TYPES_SHA256, TYPE_CODES } from './generated/type-registry.generated';
import { ALL_ITEM_MODELS, ITEM_MODELS } from './type-registry';

const HERE = dirname(fileURLToPath(import.meta.url));
const MASTER = resolve(HERE, '../../../research/exam-question-types/catalog/master_types.jsonl');

describe('type registry completeness', () => {
  it('has exactly 66 unique type codes', () => {
    expect(TYPE_CODES.length).toBe(66);
    expect(new Set(TYPE_CODES).size).toBe(66);
  });

  it('registers a content + renderable schema for every type (§6.2, no untyped params)', () => {
    for (const code of TYPE_CODES) {
      expect(ITEM_CONTENT_REGISTRY[code]).toBeDefined();
      expect(ITEM_CONTENT_REGISTRY[code].content).toBeDefined();
      expect(ITEM_CONTENT_REGISTRY[code].renderable).toBeDefined();
    }
  });

  it('maps every type to one of the four testable domains', () => {
    for (const code of TYPE_CODES) {
      expect((VALID_DOMAINS as readonly string[]).includes(DOMAIN_BY_TYPE[code])).toBe(true);
    }
  });

  it('domain counts match the source-of-truth catalog', () => {
    const counts = { fluid_reasoning: 0, verbal: 0, quantitative: 0, spatial: 0 };
    for (const m of ALL_ITEM_MODELS) counts[m.domain] += 1;
    expect(counts).toEqual({ fluid_reasoning: 15, verbal: 16, quantitative: 12, spatial: 23 });
  });

  it('every model has ≥1 age band and a demo path', () => {
    for (const m of ALL_ITEM_MODELS) {
      expect(m.ageBands.length).toBeGreaterThan(0);
      expect(m.demoPath.length).toBeGreaterThan(0);
      expect(m.syntheticOnly).toBe(true);
    }
  });
});

describe('generated registry stays in sync with master_types.jsonl (no drift)', () => {
  const raw = readFileSync(MASTER, 'utf-8');

  it('MASTER_TYPES_SHA256 matches the committed source file', () => {
    const sha = createHash('sha256').update(raw).digest('hex');
    expect(sha).toBe(MASTER_TYPES_SHA256);
  });

  it('TYPE_CODES exactly equals the type_ids in master_types.jsonl', () => {
    const ids = raw
      .split('\n')
      .filter((l) => l.trim().length > 0)
      .map((l) => (JSON.parse(l) as { type_id: string }).type_id);
    expect(new Set(TYPE_CODES)).toEqual(new Set(ids));
  });

  it('domain in the registry equals areas[0] in the source for every type', () => {
    const byId = new Map<string, string>();
    for (const l of raw.split('\n').filter((x) => x.trim().length > 0)) {
      const row = JSON.parse(l) as { type_id: string; areas: string[] };
      byId.set(row.type_id, row.areas[0] as string);
    }
    for (const code of TYPE_CODES) {
      expect(ITEM_MODELS[code].domain).toBe(byId.get(code));
    }
  });
});
