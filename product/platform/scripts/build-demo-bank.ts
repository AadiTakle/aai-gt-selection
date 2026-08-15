import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadBanks, paramsForRecord } from '@gt/qbank/server';

/**
 * Bake the demo's question bank into a static JSON the browser can hold on its own.
 *
 * Demo mode makes NO network calls — that is its whole point, so that a demo cannot fail because a laptop is on
 * conference wifi, and so that a demo touches no AWS resource and no child's data. Which means everything the
 * session loop needs has to be in the bundle: the items, their parameters, and the answer keys.
 *
 * ══ THE THING TO BE HONEST ABOUT ═══════════════════════════════════════════════════════════════════
 *
 * **This file contains the answer keys, and shipping it puts them in the browser.** That is not an oversight
 * and it is not avoidable: scoring locally requires the keys locally, and the alternative is a server, which
 * is the thing demo mode exists to do without. Anyone who opens devtools on a demo build can read every answer.
 *
 * So: demo mode is for showing the instrument to adults. It must never be used to screen a child whose result
 * matters, and the platform path is the only one that measures anyone. The build writes this next to the app's
 * public assets rather than into `data/`, so it is obvious that it ships.
 *
 * Kept small on purpose. The full catalogue is 4,934 items and this takes the ones a demo can actually reach:
 * the seven approved types, minus the items Bramblebrook withholds, capped per type so the payload stays a few
 * hundred kilobytes rather than several megabytes.
 *
 * Run: npm run build:demo-bank
 */

const BRAMBLEBROOK_TYPES = [
  'FLU-MATRIX-01',
  'FLU-CARPET-01',
  'QUANT-SERIES-01',
  'QUANT-FUNC-01',
  'QUANT-BALANCE-01',
  'VER-SORTBOT-01',
  'VER-RELPAIR-01',
] as const;

/**
 * Per type, and chosen to cover the difficulty range rather than the easiest N.
 *
 * A demo that only ever shows easy items misrepresents the instrument, and one that only shows hard items makes
 * the demonstrator look incompetent. Sampling evenly across the sorted range gives a demo the same shape of
 * experience a real session has.
 */
const PER_TYPE = 60;

interface DemoItem {
  readonly itemId: string;
  readonly typeCode: string;
  readonly domain: string;
  readonly difficulty: number;
  readonly b: number;
  readonly a: number;
  readonly c: number;
  readonly correctKey: string | number;
  readonly content: Record<string, unknown>;
}

/** The same withholding rule the platform applies, derived rather than copied so the two cannot disagree. */
function isWithheld(rule: string): boolean {
  const r = rule.toLowerCase();
  if (r.includes('rhyme') || r.includes('start') || r.includes('sound')) return true;
  return r.startsWith('words that mean') || r.startsWith('words meaning');
}

function spread<T>(all: readonly T[], take: number): T[] {
  if (all.length <= take) return [...all];
  const out: T[] = [];
  const step = all.length / take;
  for (let i = 0; i < take; i += 1) out.push(all[Math.floor(i * step)] as T);
  return out;
}

const banks = loadBanks();
const items: DemoItem[] = [];
const perType = new Map<string, number>();

for (const typeCode of BRAMBLEBROOK_TYPES) {
  const bank = banks.get(typeCode);
  if (!bank) continue;
  const usable = bank.scorable.filter((record) => {
    const rule = String(
      (record as { provenance?: { derivation?: { rule?: unknown } } }).provenance?.derivation?.rule ?? '',
    );
    return !(typeCode === 'VER-SORTBOT-01' && isWithheld(rule));
  });
  const sorted = [...usable].sort((x, y) => x.difficulty - y.difficulty);
  for (const record of spread(sorted, PER_TYPE)) {
    const params = paramsForRecord(record);
    items.push({
      itemId: record.itemId,
      typeCode: record.typeCode,
      domain: record.domain,
      difficulty: record.difficulty,
      b: params.b,
      a: params.a,
      c: params.c,
      correctKey: record.answer.correctKey,
      content: record.content as Record<string, unknown>,
    });
  }
  perType.set(typeCode, spread(sorted, PER_TYPE).length);
}

const out = {
  generatedAt: new Date().toISOString(),
  note: 'Demo only. Contains answer keys. Never use to screen a child whose result matters.',
  items,
};

const dir = join(import.meta.dirname, '..', '..', 'screener', 'apps', 'sanctuary', 'public');
mkdirSync(dir, { recursive: true });
const file = join(dir, 'demo-bank.json');
writeFileSync(file, JSON.stringify(out));

console.log(`${items.length} items written to ${file}`);
for (const [t, n] of [...perType].sort()) console.log(`  ${t.padEnd(18)} ${n}`);
const kb = Buffer.byteLength(JSON.stringify(out)) / 1024;
console.log(`payload ${kb.toFixed(0)} KB — it ships to the browser, keys and all`);
