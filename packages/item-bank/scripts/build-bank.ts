/**
 * build-bank.ts — materialize the born-synthetic keyed item bank.
 *
 * Emits TWO artifacts:
 *   data/bank/items.bank.jsonl     — SERVER ONLY. Full bank items WITH answer keys.
 *   data/served/items.served.jsonl — CLIENT SAFE. Rendered subset, NO keys.
 *
 * Every item is validated against bankItemSchema and every served item is scanned
 * for answer leakage before writing. Deterministic (seeded) — safe to commit.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { bankItemSchema, findAnswerLeak, servedItemV2Schema, toServedItem } from '../src/bank-item';
import { MATERIALIZABLE_TYPE_CODES } from '../src/content/registry';
import type { MaterializableTypeCode } from '../src/content/registry';
import { REAL_AGE_BANDS } from '../src/enums';
import type { AgeBand } from '../src/enums';
import { buildBankItem } from '../src/builder';
import { MASTER_TYPES_SHA256 } from '../src/generated/type-registry.generated';
import { ITEM_MODELS } from '../src/type-registry';
import type { BankItem } from '../src/bank-item';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = resolve(HERE, '../data');

const AUTHORED = new Set<MaterializableTypeCode>(['VER-RELPAIR-01', 'VER-CLOZE-01', 'VER-SENSE-01']);
const LEVELS: Record<MaterializableTypeCode, number[]> = {
  'VER-RELPAIR-01': [1, 2, 3, 4, 5, 6],
  'VER-CLOZE-01': [1, 2, 3, 4, 5],
  'VER-SENSE-01': [1, 2, 3, 4],
  'QUANT-SERIES-01': [1, 2, 3, 4, 5, 6],
  'QUANT-FUNC-01': [1, 2, 3, 4, 5, 6],
  'FLU-MATRIX-01': [1, 2, 3, 4, 5],
  'FLU-ANALOGY-01': [1, 2, 3, 4, 5],
  'SPA-ROLL-01': [1, 2, 3, 4, 5, 6],
  'SPA-MAZE-01': [1, 2, 3, 4, 5],
};
const PROCEDURAL_INSTANCES = 2;

function expandBands(modelBands: string[]): AgeBand[] {
  const set = new Set<string>();
  for (const b of modelBands) {
    if (b === 'K-8') for (const r of REAL_AGE_BANDS) set.add(r);
    else set.add(b);
  }
  return REAL_AGE_BANDS.filter((b) => set.has(b));
}

function mapLevelToBand(level: number, applicable: AgeBand[]): AgeBand {
  const pref: AgeBand = level <= 1 ? 'K-1' : level <= 3 ? '2-3' : level <= 5 ? '4-5' : '6-8';
  return applicable.includes(pref) ? pref : (applicable[0] as AgeBand);
}

function main(): void {
  const items: BankItem[] = [];
  for (const typeCode of MATERIALIZABLE_TYPE_CODES) {
    const model = ITEM_MODELS[typeCode];
    const bands = expandBands(model.ageBands);
    const levels = LEVELS[typeCode];
    if (AUTHORED.has(typeCode)) {
      // Content is band-invariant (authored bank); one item per level, band by level.
      for (const level of levels) {
        items.push(buildBankItem(typeCode, level, mapLevelToBand(level, bands), 0));
      }
    } else {
      for (const band of bands) {
        for (const level of levels) {
          for (let i = 0; i < PROCEDURAL_INSTANCES; i++) {
            items.push(buildBankItem(typeCode, level, band, i));
          }
        }
      }
    }
  }

  items.sort((a, b) =>
    a.typeCode !== b.typeCode
      ? a.typeCode.localeCompare(b.typeCode)
      : a.difficultyLevel !== b.difficultyLevel
        ? a.difficultyLevel - b.difficultyLevel
        : a.itemId.localeCompare(b.itemId),
  );

  // Validate + project.
  const served = items.map((it) => {
    bankItemSchema.parse(it);
    const s = toServedItem(it);
    servedItemV2Schema.parse(s);
    const leaks = findAnswerLeak(s);
    if (leaks.length > 0) {
      throw new Error(`Answer leak in served item ${it.itemId}: ${leaks.join(', ')}`);
    }
    return s;
  });

  mkdirSync(resolve(DATA, 'bank'), { recursive: true });
  mkdirSync(resolve(DATA, 'served'), { recursive: true });

  const bankLines = items.map((it) => JSON.stringify(it)).join('\n') + '\n';
  const servedLines = served.map((s) => JSON.stringify(s)).join('\n') + '\n';
  writeFileSync(resolve(DATA, 'bank/items.bank.jsonl'), bankLines, 'utf-8');
  writeFileSync(resolve(DATA, 'served/items.served.jsonl'), servedLines, 'utf-8');

  const byType: Record<string, number> = {};
  const byDomain: Record<string, number> = {};
  for (const it of items) {
    byType[it.typeCode] = (byType[it.typeCode] ?? 0) + 1;
    byDomain[it.domain] = (byDomain[it.domain] ?? 0) + 1;
  }
  const manifest = {
    note: 'Born-synthetic (RES-013). syntheticOnly=true, validated=false on every item.',
    masterTypesSha256: MASTER_TYPES_SHA256,
    totalItems: items.length,
    byDomain,
    byType,
  };
  writeFileSync(resolve(DATA, 'bank/manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf-8');

  console.log(
    `Wrote ${items.length} bank items + served projections.\n  byDomain: ${JSON.stringify(byDomain)}`,
  );
}

main();
