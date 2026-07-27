/**
 * qa-report.ts — coverage / QA report over the item MODELS (66 types) and the
 * materialized bank. Reports counts by domain×age-band, duplicate items, and
 * gaps (cells below the ≥3-types target, and especially spatial breadth vs the
 * small set of types with a server-side solver so far).
 *
 * Writes data/COVERAGE_REPORT.md (human) and data/coverage.json (machine).
 * Deterministic (no timestamps) — safe to commit.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { bankItemSchema } from '../src/bank-item';
import type { BankItem } from '../src/bank-item';
import { renderableContentSchema } from '../src/content/registry';
import { REAL_AGE_BANDS, VALID_DOMAINS } from '../src/enums';
import type { AgeBand, Domain } from '../src/enums';
import { ALL_ITEM_MODELS } from '../src/type-registry';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = resolve(HERE, '../data');
const TARGET_TYPES_PER_CELL = 3; // hard coverage requirement (research README)

function expandBands(modelBands: string[]): AgeBand[] {
  const set = new Set<string>();
  for (const b of modelBands) {
    if (b === 'K-8') for (const r of REAL_AGE_BANDS) set.add(r);
    else set.add(b);
  }
  return REAL_AGE_BANDS.filter((b) => set.has(b));
}

function stableStringify(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
  if (v !== null && typeof v === 'object') {
    return `{${Object.keys(v)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify((v as Record<string, unknown>)[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(v);
}

/** Fingerprint of what the child sees, with option order normalized. */
function fingerprint(item: BankItem): string {
  const renderable = renderableContentSchema.parse(item.content) as Record<string, unknown>;
  const clone: Record<string, unknown> = { ...renderable };
  if (Array.isArray(clone.options)) {
    clone.options = [...clone.options].map((o) => stableStringify(o)).sort();
  }
  return `${item.typeCode}::${stableStringify(clone)}`;
}

function emptyGrid(): Record<Domain, Record<AgeBand, number>> {
  const g = {} as Record<Domain, Record<AgeBand, number>>;
  for (const d of VALID_DOMAINS) {
    g[d] = {} as Record<AgeBand, number>;
    for (const b of REAL_AGE_BANDS) g[d][b] = 0;
  }
  return g;
}

function main(): void {
  const bankRaw = readFileSync(resolve(DATA, 'bank/items.bank.jsonl'), 'utf-8');
  const items: BankItem[] = bankRaw
    .split('\n')
    .filter((l) => l.trim().length > 0)
    .map((l) => bankItemSchema.parse(JSON.parse(l)));

  // 1) Type breadth: distinct TYPES applicable per domain×band (all 66 models).
  const typeBreadth = emptyGrid();
  for (const m of ALL_ITEM_MODELS) {
    for (const band of expandBands(m.ageBands)) typeBreadth[m.domain][band] += 1;
  }

  // 2) Materialized items per domain×band, and distinct materialized types per cell.
  const itemGrid = emptyGrid();
  const matTypeSets: Record<Domain, Record<AgeBand, Set<string>>> = {} as never;
  for (const d of VALID_DOMAINS) {
    matTypeSets[d] = {} as Record<AgeBand, Set<string>>;
    for (const b of REAL_AGE_BANDS) matTypeSets[d][b] = new Set();
  }
  for (const it of items) {
    for (const band of it.ageBands) {
      if ((REAL_AGE_BANDS as readonly string[]).includes(band)) {
        itemGrid[it.domain][band as AgeBand] += 1;
        matTypeSets[it.domain][band as AgeBand].add(it.typeCode);
      }
    }
  }

  // 3) Duplicates (identical child-facing content).
  const seen = new Map<string, string[]>();
  for (const it of items) {
    const fp = fingerprint(it);
    const arr = seen.get(fp) ?? [];
    arr.push(it.itemId);
    seen.set(fp, arr);
  }
  const duplicateGroups = [...seen.entries()].filter(([, ids]) => ids.length > 1);
  const duplicateItemCount = duplicateGroups.reduce((n, [, ids]) => n + (ids.length - 1), 0);

  // 4) Gaps: type-breadth cells < target; model-only (no-solver) types.
  const breadthGaps: string[] = [];
  for (const d of VALID_DOMAINS) {
    for (const b of REAL_AGE_BANDS) {
      if (typeBreadth[d][b] < TARGET_TYPES_PER_CELL) {
        breadthGaps.push(`${d}×${b} has ${typeBreadth[d][b]} types (<${TARGET_TYPES_PER_CELL})`);
      }
    }
  }
  const materializedTypes = [...new Set(items.map((i) => i.typeCode))].sort();
  const modelOnlyTypes = ALL_ITEM_MODELS.filter((m) => !m.hasSolver).map((m) => m.typeCode);
  const spatialTypes = ALL_ITEM_MODELS.filter((m) => m.domain === 'spatial');
  const spatialMaterialized = materializedTypes.filter((t) =>
    spatialTypes.some((s) => s.typeCode === t),
  );

  const byType: Record<string, number> = {};
  const byDomain: Record<string, number> = {};
  const byScoring: Record<string, number> = {};
  for (const it of items) {
    byType[it.typeCode] = (byType[it.typeCode] ?? 0) + 1;
    byDomain[it.domain] = (byDomain[it.domain] ?? 0) + 1;
    byScoring[it.scoring.mode] = (byScoring[it.scoring.mode] ?? 0) + 1;
  }

  const coverage = {
    totals: { models: ALL_ITEM_MODELS.length, materializedItems: items.length },
    materializedTypeCount: materializedTypes.length,
    byDomain,
    byType,
    byScoring,
    typeBreadth,
    materializedItemsGrid: itemGrid,
    duplicates: { groups: duplicateGroups.length, redundantItems: duplicateItemCount },
    breadthGaps,
    spatial: {
      types: spatialTypes.length,
      materializedTypes: spatialMaterialized,
      modelOnlyTypes: spatialTypes.filter((s) => !s.hasSolver).map((s) => s.typeCode),
    },
    modelOnlyTypeCount: modelOnlyTypes.length,
  };
  writeFileSync(resolve(DATA, 'coverage.json'), JSON.stringify(coverage, null, 2) + '\n', 'utf-8');

  // ── Markdown ──
  const gridMd = (grid: Record<Domain, Record<AgeBand, number>>): string => {
    const header = `| domain | ${REAL_AGE_BANDS.join(' | ')} |`;
    const sep = `|---|${REAL_AGE_BANDS.map(() => '---').join('|')}|`;
    const rows = VALID_DOMAINS.map(
      (d) => `| ${d} | ${REAL_AGE_BANDS.map((b) => grid[d][b]).join(' | ')} |`,
    );
    return [header, sep, ...rows].join('\n');
  };

  const md: string[] = [
    '# Item-Bank Coverage & QA Report',
    '',
    '> Born-synthetic research artifact (RES-013). Every bank item carries',
    '> `syntheticOnly=true`, `validated=false`. Ordinal `difficultyLevel` is a design',
    '> rung, not a calibrated IRT `b` (RES-012). Generated by `scripts/qa-report.ts`.',
    '',
    '## Totals',
    '',
    `- Item **models** (types) in registry: **${ALL_ITEM_MODELS.length}**`,
    `- Types with a server-side grammar + solver (**materializable**): **${materializedTypes.length}**`,
    `- Model-only types (no solver yet): **${modelOnlyTypes.length}**`,
    `- **Materialized keyed items**: **${items.length}** (all with server-side answer keys)`,
    `- By domain: ${VALID_DOMAINS.map((d) => `${d}=${byDomain[d] ?? 0}`).join(', ')}`,
    `- By scoring mode: ${Object.entries(byScoring)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ')}`,
    '',
    '## Type breadth — distinct types applicable per domain × age-band (all 66 models)',
    '',
    `Target: ≥${TARGET_TYPES_PER_CELL} types per cell.`,
    '',
    gridMd(typeBreadth),
    '',
    breadthGaps.length === 0
      ? `All domain×band cells meet the ≥${TARGET_TYPES_PER_CELL}-types target.`
      : `**Breadth gaps:**\n${breadthGaps.map((g) => `- ${g}`).join('\n')}`,
    '',
    '## Materialized keyed items per domain × age-band',
    '',
    gridMd(itemGrid),
    '',
    '### Materialized items by type',
    '',
    ...materializedTypes.map((t) => `- ${t}: ${byType[t] ?? 0}`),
    '',
    '## Duplicates (identical child-facing content, option order normalized)',
    '',
    `- Duplicate groups: **${duplicateGroups.length}**`,
    `- Redundant items (beyond first in each group): **${duplicateItemCount}**`,
    duplicateGroups.length > 0
      ? duplicateGroups
          .slice(0, 10)
          .map(([, ids]) => `  - ${ids.length}× ${ids.slice(0, 3).join(', ')}${ids.length > 3 ? ' …' : ''}`)
          .join('\n')
      : '- No duplicate child-facing content detected.',
    '',
    '## Spatial breadth (flagged in the task)',
    '',
    `- Spatial has the most **type** breadth of any domain: **${spatialTypes.length}** types.`,
    `- But only **${spatialMaterialized.length}** spatial types have a server-side solver so far: ${spatialMaterialized.join(', ') || '(none)'}.`,
    `- Spatial gap: **${spatialTypes.filter((s) => !s.hasSolver).length}** spatial types remain model-only`,
    '  (fold-net, cross-section, mental-rotation, WM span, path-planning, etc.). These need',
    '  geometry/simulation solvers or asset pipelines before they can be keyed server-side —',
    '  this is the single largest materialization gap and the priority for solver work.',
    '',
    '## Materialization gap — types without a server solver (model-only)',
    '',
    `${modelOnlyTypes.length} of ${ALL_ITEM_MODELS.length} types are registered as models but not yet`,
    'materialized into keyed items (no deterministic grammar/solver). They are valid registry',
    'entries (typed content, no untyped params) awaiting a grammar or an offline LLM generator',
    'per the schema spec §7 pipeline.',
    '',
  ];
  writeFileSync(resolve(DATA, 'COVERAGE_REPORT.md'), md.join('\n'), 'utf-8');

  console.log(
    `Wrote COVERAGE_REPORT.md + coverage.json. items=${items.length}, dupGroups=${duplicateGroups.length}, breadthGaps=${breadthGaps.length}`,
  );
}

main();
