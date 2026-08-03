#!/usr/bin/env node
// Ad-hoc reproduction: fingerprint each item's `content` and count repeats per bank.
// Also reports whether identical content carries differing `difficulty`.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const banksDir = path.join(here, '..', 'banks');

function stable(v) {
  if (Array.isArray(v)) return v.map(stable);
  if (v && typeof v === 'object') {
    const out = {};
    for (const k of Object.keys(v).sort()) out[k] = stable(v[k]);
    return out;
  }
  return v;
}

function fp(content) {
  return createHash('sha256').update(JSON.stringify(stable(content))).digest('hex').slice(0, 16);
}

const only = process.argv.slice(2);
const files = readdirSync(banksDir).filter((f) => f.endsWith('.jsonl')).sort();
let grandRedundant = 0;
const rows = [];

for (const f of files) {
  const type = f.replace(/\.jsonl$/, '');
  if (only.length && !only.includes(type)) continue;
  const lines = readFileSync(path.join(banksDir, f), 'utf8').split('\n').filter(Boolean);
  const items = lines.map((l) => JSON.parse(l));
  const groups = new Map();
  for (const it of items) {
    const h = fp(it.content);
    if (!groups.has(h)) groups.set(h, []);
    groups.get(h).push(it);
  }
  let redundant = 0;
  const dupGroups = [];
  for (const [h, g] of groups) {
    if (g.length > 1) {
      redundant += g.length - 1;
      const diffs = [...new Set(g.map((x) => x.difficulty))];
      dupGroups.push({
        h,
        seeds: g.map((x) => x?.provenance?.seed ?? x.itemId),
        difficulties: g.map((x) => x.difficulty),
        differing: diffs.length > 1,
      });
    }
  }
  grandRedundant += redundant;
  if (redundant > 0 || only.length) {
    rows.push({ type, total: items.length, redundant, distinct: groups.size, dupGroups });
  }
}

for (const r of rows) {
  console.log(`${r.type}: ${r.redundant} redundant of ${r.total} (distinct content = ${r.distinct})`);
  for (const m of r.dupGroups) {
    console.log(`   dup x${m.seeds.length} difficulty=[${m.difficulties.join(', ')}]${m.differing ? '  <-- DIFFERING DIFFICULTY' : ''}`);
    for (const s of m.seeds) console.log(`      ${s}`);
  }
}
console.log(`TOTAL redundant across ${only.length ? 'selected' : 'all'} banks: ${grandRedundant}`);
