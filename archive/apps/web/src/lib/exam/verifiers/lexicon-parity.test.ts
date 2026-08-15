/**
 * The child lexicon now exists twice: on disk, where GB-WORDLADDER-01's app-tier verifier
 * reads it, and in `app.exam_lexicon`, where its plpgsql port reads it (D-027, evidence
 * E-092). Two copies of the same 4,091 judgements can drift, and the way they would drift is
 * silent — somebody curates a word into `lexicon-child-en.mjs` and nobody re-seeds, after
 * which the two tiers disagree about whether a rung is a word and only the differential
 * harness would ever notice.
 *
 * This is the lock that makes that loud. It re-parses the source file with the verifier's OWN
 * reader and compares it entry for entry against the seed statements in the migration, so
 * editing one without the other fails here rather than in production.
 *
 * `supabase/tests/124_exam_verify_awkward_batch.test.sql` holds the other end: that what the
 * database actually contains still hashes to lexicon-child-en@v1. Between them, the source
 * file, the migration and the live table are pinned to each other.
 */
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { childLexicon } from './quantitative';

const MIGRATION = ['supabase', 'migrations', '20260725183000_exam_verify_awkward_batch.sql'];

/** The module's own `lexiconHash()`: sha1 over `WORD:BAND` in word order, first 16 digits. */
const LEXICON_HASH = '428d7d7227fbf5cd';

function resolveMigration(): string {
  for (let depth = 0; depth < 5; depth++) {
    const candidate = path.join(process.cwd(), ...Array(depth).fill('..'), ...MIGRATION);
    if (existsSync(candidate)) return candidate;
  }
  throw new Error('lexicon-parity: could not locate the batch migration.');
}

/** `word -> band` as the migration's `$lex$ … $lex$` seed blocks state it. */
function seededLexicon(sql: string): Map<string, number> {
  const seeded = new Map<string, number>();
  const block =
    /select w, (\d+)\s*\nfrom unnest\(regexp_split_to_array\(\$lex\$\n([\s\S]*?)\n\$lex\$/g;
  for (let match = block.exec(sql); match !== null; match = block.exec(sql)) {
    const band = Number(match[1]);
    for (const word of (match[2] ?? '').split(/\s+/)) {
      if (word.length > 0) seeded.set(word, band);
    }
  }
  return seeded;
}

function contentHash(entries: Map<string, number>): string {
  const ordered = [...entries.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return createHash('sha1')
    .update(ordered.map(([word, band]) => `${word}:${band}`).join(','))
    .digest('hex')
    .slice(0, 16);
}

describe('app.exam_lexicon seed parity with lexicon-child-en@v1', () => {
  const onDisk = childLexicon();
  const seeded = seededLexicon(readFileSync(resolveMigration(), 'utf8'));

  it('reads the source lexicon the verifier itself depends on', () => {
    expect(onDisk).not.toBeNull();
    expect(onDisk?.size).toBeGreaterThan(0);
  });

  it('seeds exactly the words the source file curates, at the same bands', () => {
    const source = onDisk as Map<string, number>;
    const missing = [...source.keys()].filter((word) => !seeded.has(word));
    const extra = [...seeded.keys()].filter((word) => !source.has(word));
    const rebanded = [...source.entries()]
      .filter(([word, band]) => seeded.has(word) && seeded.get(word) !== band)
      .map(([word, band]) => `${word}: source ${band}, seed ${seeded.get(word)}`);

    // Named rather than counted, so a failure says which word to re-seed.
    expect({ missing, extra, rebanded }).toEqual({ missing: [], extra: [], rebanded: [] });
    expect(seeded.size).toBe(source.size);
  });

  it('agrees with the hash the banks and the migration guard both pin', () => {
    expect(contentHash(onDisk as Map<string, number>)).toBe(LEXICON_HASH);
    expect(contentHash(seeded)).toBe(LEXICON_HASH);
  });
});
