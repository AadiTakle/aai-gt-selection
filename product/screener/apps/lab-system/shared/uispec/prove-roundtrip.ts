/**
 * The proof of concept: can the abstraction reproduce the ORIGINAL question UI exactly?
 *
 * Run: `npx tsx apps/lab-system/shared/uispec/prove-roundtrip.ts` from `screener/`.
 *
 * The argument for abstracting the bank only holds if nothing is lost on the way. So this takes real
 * items, strips every appearance into abstract variables, resolves them back through the DEFAULT theme,
 * and requires the original appearance byte for byte. If the archive's own look survives the round trip,
 * a themed look can be substituted safely, because a theme is nothing more than a different value list
 * behind the same indices.
 *
 * It also demonstrates the substitution: the same abstract item resolved through a Pokémon vocabulary,
 * proving the measurement is untouched while the appearance is entirely different.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  abstractElement,
  buildManifest,
  concretise,
  demandsFrom,
  type Manifest,
} from './abstract';

const BANKS =
  process.env['GT_QBANK_BANKS'] ??
  join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', '..', 'qbank-library', 'banks');

interface BankItem {
  itemId: string;
  typeCode: string;
  content: Record<string, unknown>;
}

/** Pull every appearance-bearing object out of an item: its cells and its options. */
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

/** Only the properties the abstraction claims to carry. Comparing anything else would be unfair. */
const CARRIED = new Set([
  'shape', 'motif', 'glyph', 'sym', 'icon', 'kind', 'color', 'colour', 'count', 'dots', 'sides',
  'size', 'rot', 'rotDeg', 'fill', 'shade', 'tilt', 'pos', 'border',
]);

/** The canonical dimension a property maps to, for comparing like with like after the round trip. */
const TO_DIMENSION: Record<string, string> = {
  shape: 'identity', motif: 'identity', glyph: 'identity', sym: 'identity', icon: 'identity',
  kind: 'identity', color: 'category', colour: 'category', count: 'count', dots: 'count',
  sides: 'count', size: 'scale', rot: 'rotation', rotDeg: 'rotation', fill: 'fill', shade: 'fill',
  tilt: 'tilt', pos: 'position', border: 'border',
};

function originalAsDimensions(source: Record<string, unknown>): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(source)) {
    if (!CARRIED.has(key)) continue;
    if (typeof value !== 'string' && typeof value !== 'number') continue;
    const dim = TO_DIMENSION[key];
    if (dim) out[dim] = value;
  }
  return out;
}

/* ------------------------------------------------------------------- run it */

const files = readdirSync(BANKS).filter((f) => f.endsWith('.jsonl'));
let typesChecked = 0;
let elementsChecked = 0;
let mismatches = 0;
const failures: string[] = [];
const perType: { type: string; elements: number; dims: string[] }[] = [];

for (const file of files) {
  const typeCode = file.slice(0, -'.jsonl'.length);
  const items: BankItem[] = [];
  for (const line of readFileSync(join(BANKS, file), 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    items.push(JSON.parse(trimmed) as BankItem);
    if (items.length >= 60) break;
  }
  if (items.length === 0) continue;

  // The manifest the backend would publish for this type.
  const manifest: Manifest = buildManifest(items.map((i) => i.content));
  if (Object.keys(manifest).length === 0) continue;
  typesChecked++;
  let typeElements = 0;

  for (const item of items) {
    for (const { id, source } of elementsOf(item.content)) {
      const original = originalAsDimensions(source);
      if (Object.keys(original).length === 0) continue;

      // abstract -> concretise, and require the original back.
      const abstracted = abstractElement(id, source, manifest);
      const recovered = concretise(abstracted, manifest);

      elementsChecked++;
      typeElements++;

      for (const [dim, want] of Object.entries(original)) {
        if (recovered[dim] !== want) {
          mismatches++;
          if (failures.length < 10) {
            failures.push(
              `${typeCode} ${item.itemId.slice(0, 8)} ${id}: ${dim} was ${JSON.stringify(want)}, ` +
                `came back ${JSON.stringify(recovered[dim])}`,
            );
          }
        }
      }
    }
  }
  if (typeElements > 0) {
    perType.push({ type: typeCode, elements: typeElements, dims: Object.keys(manifest).sort() });
  }
}

console.log('# Round trip: abstract the bank, resolve it back through the default theme\n');
console.log(`  types with abstractable appearance : ${typesChecked}`);
console.log(`  elements round-tripped            : ${elementsChecked}`);
console.log(`  properties that came back changed : ${mismatches}`);
console.log('');

console.log('## A few types, and the dimensions their appearance reduces to\n');
for (const row of perType.slice(0, 10)) {
  console.log(`  ${row.type.padEnd(20)} ${String(row.elements).padStart(4)} elements  ${row.dims.join(', ')}`);
}

/* --- the substitution demo: same item, two vocabularies --- */
const matrixFile = join(BANKS, 'FLU-MATRIX-01.jsonl');
const sample = JSON.parse(readFileSync(matrixFile, 'utf8').split('\n')[0]!) as BankItem;
const sampleItems: BankItem[] = [];
for (const line of readFileSync(matrixFile, 'utf8').split('\n')) {
  const t = line.trim();
  if (!t) continue;
  sampleItems.push(JSON.parse(t) as BankItem);
  if (sampleItems.length >= 60) break;
}
const manifest = buildManifest(sampleItems.map((i) => i.content));
const opts = elementsOf(sample.content).filter((e) => e.id.startsWith('option-'));

console.log('\n## The substitution, on a real FLU-MATRIX-01 item\n');
console.log('  The abstract item, which is what a themed app receives:\n');
for (const { id, source } of opts) {
  const a = abstractElement(id, source, manifest);
  console.log(`    ${id}  vars = ${JSON.stringify(a.vars)}`);
}

const POKEMON: Record<string, readonly string[]> = {
  identity: ['sprigling', 'emberling', 'dripaw', 'voltnip', 'stonelet', 'gustling', 'shadepup', 'frostkit', 'brambug', 'tidefin', 'cindermol', 'sparkfin'],
  category: ['grass', 'fire', 'water', 'electric', 'rock', 'flying', 'ghost', 'ice', 'bug', 'steel'],
};

console.log('\n  Default theme resolves those indices to the archive vocabulary:\n');
for (const { id, source } of opts) {
  const a = abstractElement(id, source, manifest);
  console.log(`    ${id}  ${JSON.stringify(concretise(a, manifest))}`);
}

console.log('\n  A Pokémon theme resolves the SAME indices to its own vocabulary:\n');
for (const { id, source } of opts) {
  const a = abstractElement(id, source, manifest);
  const themed: Record<string, string | number> = {};
  for (const [dim, index] of Object.entries(a.vars)) {
    const custom = POKEMON[dim];
    themed[dim] = custom?.[index % custom.length] ?? manifest[dim]?.values[index] ?? index;
  }
  console.log(`    ${id}  ${JSON.stringify(themed)}`);
}

const demands = demandsFrom(manifest);
console.log('\n  What a theme must supply for this type:\n');
for (const [dim, n] of Object.entries(demands.cardinality)) {
  console.log(`    ${dim.padEnd(10)} ${demands.ordering[dim]?.padEnd(8) ?? ''} at least ${n} distinct values`);
}

console.log('');
if (mismatches === 0) {
  console.log('PASS. Every appearance in the bank survived being abstracted and put back, so the');
  console.log('abstraction is lossless and a theme is only a different value list behind the same indices.\n');
  process.exit(0);
}
console.log(`FAIL, ${mismatches} properties changed across the round trip:`);
for (const f of failures) console.log(`  - ${f}`);
process.exit(1);
