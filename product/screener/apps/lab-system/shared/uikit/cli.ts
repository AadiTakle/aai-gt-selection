/**
 * KIT REPORT — what a kit covers, what it cannot, and what would fix it.
 *
 * Run: npm run kit                        (the Pokédex against the whole catalogue)
 *      npm run kit -- path/to/other.kit.json
 *
 * The last section is the one that matters. Coverage against a manifest is a paper exercise: it checks
 * counts and orderings and can still pass a kit that has no entry for a combination a real item needs.
 * So the probe takes actual items out of the banks, abstracts them, resolves them through the kit and
 * counts what came back. A kit is only as good as the items it can actually draw.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';

import { abstractElement, buildManifest, type Manifest } from '../uispec/abstract';
import { checkKit, valuesFor, type Kit } from './kit';
import { coverType, crossings, largestBlock } from './coverage';
import { resolve } from './resolve';

const HERE = dirname(fileURLToPath(import.meta.url));
const BANKS = process.env['GT_QBANK_BANKS'] ?? join(HERE, '..', '..', '..', '..', '..', 'qbank-library', 'banks');

interface BankItem {
  itemId: string;
  typeCode: string;
  content: Record<string, unknown>;
}

function elementsOf(content: Record<string, unknown>): { id: string; source: Record<string, unknown> }[] {
  const out: { id: string; source: Record<string, unknown> }[] = [];
  const grid = (content.matrix ?? content.carpet) as { cells?: unknown[][] } | undefined;
  if (grid?.cells) {
    grid.cells.forEach((row, r) => {
      if (!Array.isArray(row)) return;
      row.forEach((cell, c) => {
        if (cell !== null && typeof cell === 'object') {
          out.push({ id: `cell-${String(r)}-${String(c)}`, source: cell as Record<string, unknown> });
        }
      });
    });
  }
  const options = content.options ?? content.candidates;
  if (Array.isArray(options)) {
    options.forEach((opt, i) => {
      if (opt === null || typeof opt !== 'object') return;
      const o = opt as Record<string, unknown>;
      const inner = (o.tile ?? o.figure ?? o.picture ?? o) as Record<string, unknown>;
      out.push({ id: `option-${String(i)}`, source: inner });
    });
  }
  return out;
}

const arg = process.argv[2];
const kitPath = arg ? resolvePath(arg) : join(HERE, 'kits', 'pokedex.kit.json');
const { kit, problems } = checkKit(JSON.parse(readFileSync(kitPath, 'utf8')));

console.log(`\nKIT REPORT  ${kitPath.split('/').slice(-1)[0]}\n${'='.repeat(74)}`);

if (problems.length > 0) {
  console.log('\nPROBLEMS');
  for (const p of problems) console.log(`  ${p.where}: ${p.says}`);
}
if (!kit) {
  console.log('\nToo broken to report on. Fix the above.\n');
  process.exit(1);
}

console.log(`\n${kit.name} — ${kit.bank.length} entries`);
if (kit.describes) console.log(`  ${kit.describes}`);

console.log('\nHOW IT ANSWERS EACH VARIABLE');
for (const [name, source] of Object.entries(kit.dimensions)) {
  const dim = name as keyof typeof kit.dimensions;
  const detail =
    source.from === 'bank'
      ? `bank.${source.field} — ${String(valuesFor(kit, dim).length)} distinct`
      : source.from === 'none'
        ? `not answered${source.why ? `: ${source.why}` : ''}`
        : source.from;
  console.log(`  ${name.padEnd(10)} ${detail}`);
}

// Which pairs of fields the bank actually crosses. This is what an author re-maps against when a type
// fails, and it is almost always the real fix.
console.log('\nWHAT THE BANK CROSSES');
console.log('  Two variables can only vary independently if their fields cross. The block is the');
console.log('  biggest grid of entries that all exist, which is what a matrix needs.');
for (const c of crossings(kit).slice(0, 8)) {
  const block = largestBlock(kit, c.a, c.b);
  const verdict = c.fill === 1 ? 'complete' : `${String(Math.round(c.fill * 100))}%`;
  console.log(
    `  ${`${c.a} x ${c.b}`.padEnd(24)} ${String(c.present).padStart(4)}/${String(c.possible).padEnd(5)} ${verdict.padEnd(9)} biggest block ${String(block.rows)}x${String(block.cols)}`,
  );
}

// Load the banks once and build a manifest per type from the real items, which is what the backend
// would publish.
const byType = new Map<string, BankItem[]>();
for (const file of readdirSync(BANKS).filter((f) => f.endsWith('.jsonl'))) {
  const items: BankItem[] = [];
  for (const line of readFileSync(join(BANKS, file), 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const item = JSON.parse(line) as BankItem;
      if (item.content) items.push(item);
    } catch {
      // A malformed line is the bank's problem, not the kit's.
    }
  }
  if (items.length > 0) byType.set(items[0]!.typeCode, items);
}

const manifests = new Map<string, Manifest>();
for (const [typeCode, items] of byType) {
  const manifest = buildManifest(items.map((i) => i.content));
  if (Object.keys(manifest).length > 0) manifests.set(typeCode, manifest);
}

console.log(`\nCOVERAGE ON PAPER  (${String(manifests.size)} types that carry variables)`);
const paperOk: string[] = [];
const paperNo: { type: string; blockers: readonly string[] }[] = [];
for (const [typeCode, manifest] of manifests) {
  const verdict = coverType(typeCode, manifest, kit);
  if (verdict.ok) paperOk.push(typeCode);
  else paperNo.push({ type: typeCode, blockers: verdict.blockers });
}
console.log(`  passes: ${String(paperOk.length)}    fails: ${String(paperNo.length)}`);

// The real measure. Abstract every item and try to draw it.
console.log('\nPROBE  (resolving real items, 12 per type)');
let tried = 0;
let drew = 0;
const failures = new Map<string, { count: number; why: string }>();
const perType: { type: string; ok: number; of: number; why?: string }[] = [];

for (const [typeCode, items] of byType) {
  const manifest = manifests.get(typeCode);
  if (!manifest) continue;
  let ok = 0;
  let of = 0;
  let firstWhy: string | undefined;

  for (const item of items.slice(0, 12)) {
    const elements = elementsOf(item.content)
      .map(({ id, source }) => abstractElement(id, source, manifest))
      .filter((e) => Object.keys(e.vars).length > 0);
    if (elements.length === 0) continue;
    of += 1;
    tried += 1;
    const result = resolve(elements, manifest, kit, item.itemId.length + of);
    if (result.ok) {
      ok += 1;
      drew += 1;
    } else {
      firstWhy ??= result.why;
      const key = result.blame.join('+');
      const seen = failures.get(key);
      failures.set(key, { count: (seen?.count ?? 0) + 1, why: seen?.why ?? result.why });
    }
  }
  if (of > 0) perType.push(firstWhy === undefined ? { type: typeCode, ok, of } : { type: typeCode, ok, of, why: firstWhy });
}

perType.sort((a, b) => a.ok / a.of - b.ok / b.of || a.type.localeCompare(b.type));
for (const row of perType) {
  const mark = row.ok === row.of ? 'all' : row.ok === 0 ? 'NONE' : `${String(row.ok)}/${String(row.of)}`;
  console.log(`  ${row.type.padEnd(20)} ${mark.padStart(5)}${row.why && row.ok < row.of ? `   ${row.why}` : ''}`);
}

console.log(`\n  drew ${String(drew)} of ${String(tried)} items (${String(Math.round((drew / Math.max(1, tried)) * 100))}%)`);

if (failures.size > 0) {
  console.log('\nWHY ITEMS DID NOT DRAW');
  for (const [blame, { count, why }] of [...failures].sort((a, b) => b[1].count - a[1].count)) {
    console.log(`  ${String(count).padStart(4)}x  ${blame}\n        ${why}`);
  }
}
console.log('');
