/**
 * How much of the day's log we can actually PICTURE.
 *
 * `DayLog` refuses to make a K-2 child read, so every sentence needs a pictogram. This walks the whole
 * `VER-SEQUENCE-01` bank through `glyphFor` and prints what got a picture, what fell back to a neutral
 * forest token, and which glyphs are doing all the work. Two numbers matter: coverage over the WHOLE
 * bank, and coverage over the K-1/2-3 items, because those are the ones a small child is served.
 *
 * Run: npx tsx apps/sanctuary/game/screener/coverage.ts
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { glyphFor } from './eventMeaning';

const bank = fileURLToPath(new URL('../../../../data/sanctuary/banks/VER-SEQUENCE-01.jsonl', import.meta.url));

interface Row {
  ageBands: string[];
  content: { events: { text: string }[] };
}

const items: Row[] = readFileSync(bank, 'utf8')
  .split('\n')
  .filter((l) => l.trim())
  .map((l) => JSON.parse(l) as Row);

function report(label: string, rows: Row[]): void {
  const seen = new Set<string>();
  const unpictured: string[] = [];
  const byGlyph = new Map<string, number>();
  for (const r of rows) {
    for (const e of r.content.events) {
      if (seen.has(e.text)) continue;
      seen.add(e.text);
      const m = glyphFor(e.text);
      byGlyph.set(m.glyph, (byGlyph.get(m.glyph) ?? 0) + 1);
      if (!m.matched) unpictured.push(e.text);
    }
  }
  const total = seen.size;
  const ok = total - unpictured.length;
  console.log(`\n${label}: ${ok}/${total} sentences pictured (${((ok / total) * 100).toFixed(1)}%)`);
  if (unpictured.length) {
    console.log('  not pictured:');
    for (const s of unpictured.sort()) console.log(`    ${s}`);
  }
  const busiest = [...byGlyph.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  console.log(`  busiest glyphs: ${busiest.map(([g, n]) => `${g}×${n}`).join(', ')}`);
  console.log(`  distinct glyphs used: ${byGlyph.size}`);

  // The failure that matters more than coverage: two events in ONE item drawn the same way. The item
  // is then unanswerable from pictures however good each picture is.
  let clashing = 0;
  const examples: string[] = [];
  for (const r of rows) {
    const used = new Map<string, string[]>();
    for (const e of r.content.events) {
      const m = glyphFor(e.text);
      const g = `${m.glyph}/${m.state}`;
      used.set(g, [...(used.get(g) ?? []), e.text]);
    }
    const dupes = [...used.entries()].filter(([, texts]) => texts.length > 1);
    if (dupes.length) {
      clashing += 1;
      if (examples.length < 6) examples.push(dupes.map(([g, t]) => `${g}: ${t.join(' / ')}`).join(' | '));
    }
  }
  console.log(`  items where two events share a picture: ${clashing}/${rows.length}`);
  for (const ex of examples) console.log(`    ${ex}`);
}

report('whole bank', items);
report('K-1 and 2-3 only', items.filter((r) => r.ageBands.includes('K-1') || r.ageBands.includes('2-3')));
