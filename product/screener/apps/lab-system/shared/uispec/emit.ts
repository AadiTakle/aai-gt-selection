/**
 * Emit the per-type manifests and the default UI spec from the bank.
 *
 * Run: `npx tsx apps/lab-system/shared/uispec/emit.ts` from `screener/`.
 *
 * The manifest is the backend's job to publish alongside each scaffold. Nothing publishes it yet, so it
 * is generated here as a static artefact the app imports, which is faithful to the design (the app
 * receives it rather than inferring it) while the backend catches up. When the backend does ship it, the
 * import goes away and nothing else changes.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildManifest, type Manifest } from './abstract';

const HERE = dirname(fileURLToPath(import.meta.url));
const BANKS =
  process.env['GT_QBANK_BANKS'] ?? join(HERE, '..', '..', '..', '..', '..', 'qbank-library', 'banks');

const manifests: Record<string, Manifest> = {};

for (const file of readdirSync(BANKS).filter((f) => f.endsWith('.jsonl'))) {
  const typeCode = file.slice(0, -'.jsonl'.length);
  const contents: Record<string, unknown>[] = [];
  for (const line of readFileSync(join(BANKS, file), 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    contents.push((JSON.parse(trimmed) as { content: Record<string, unknown> }).content);
  }
  if (contents.length === 0) continue;
  const manifest = buildManifest(contents);
  if (Object.keys(manifest).length > 0) manifests[typeCode] = manifest;
}

writeFileSync(join(HERE, 'manifests.json'), `${JSON.stringify(manifests, null, 2)}\n`, 'utf8');

const types = Object.keys(manifests);
const dims = new Set<string>();
let maxIdentity = 0;
let maxCategory = 0;
for (const manifest of Object.values(manifests)) {
  for (const [name, dim] of Object.entries(manifest)) {
    dims.add(name);
    if (name === 'identity') maxIdentity = Math.max(maxIdentity, dim.values.length);
    if (name === 'category') maxCategory = Math.max(maxCategory, dim.values.length);
  }
}

console.log(`manifests.json written: ${types.length} types`);
console.log(`  dimensions used: ${[...dims].sort().join(', ')}`);
console.log(`  worst identity cardinality: ${maxIdentity}`);
console.log(`  worst category cardinality: ${maxCategory}`);
console.log('');
console.log('Per-type cardinality, worst first:');
const rows = Object.entries(manifests)
  .map(([type, m]) => ({
    type,
    identity: m.identity?.values.length ?? 0,
    category: m.category?.values.length ?? 0,
    dims: Object.keys(m).sort().join(' '),
  }))
  .sort((a, b) => b.identity - a.identity)
  .slice(0, 12);
for (const r of rows) {
  console.log(`  ${r.type.padEnd(20)} identity ${String(r.identity).padStart(2)}  category ${String(r.category).padStart(2)}  ${r.dims}`);
}
