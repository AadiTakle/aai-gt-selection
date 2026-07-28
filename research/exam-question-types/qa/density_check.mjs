#!/usr/bin/env node
// Ad-hoc check: at least 5 items in every sliding +/-1-point difficulty window
// across the range each bank covers.
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const banksDir = path.join(here, '..', 'banks');
const MIN = 5;
const STEP = 0.05;

const only = process.argv.slice(2);
const files = readdirSync(banksDir).filter((f) => f.endsWith('.jsonl')).sort();
let bad = 0;

for (const f of files) {
  const type = f.replace(/\.jsonl$/, '');
  if (only.length && !only.includes(type)) continue;
  const items = readFileSync(path.join(banksDir, f), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const d = items.map((i) => i.difficulty).sort((a, b) => a - b);
  const lo = d[0];
  const hi = d[d.length - 1];
  let worst = Infinity;
  let worstC = null;
  for (let c = lo; c <= hi + 1e-9; c += STEP) {
    const n = d.filter((x) => x >= c - 1 - 1e-9 && x <= c + 1 + 1e-9).length;
    if (n < worst) { worst = n; worstC = c; }
  }
  const ok = worst >= MIN;
  if (!ok) bad++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${type}: range ${lo.toFixed(2)}..${hi.toFixed(2)}, min window count ${worst} (at center ${worstC.toFixed(2)}), n=${items.length}`);
}
console.log(bad === 0 ? 'DENSITY OK' : `DENSITY FAILURES: ${bad}`);
