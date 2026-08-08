/**
 * Write this app's curated bank subset to `data/sanctuary/banks`.
 *
 * WHY A SCRIPT AND NOT A README LINE. `data/` is gitignored, so a fresh checkout has no curated
 * directory at all, and `apps/lab-character/DEMO.md` tells the reader to point GT_QBANK_BANKS at one
 * that does not exist. That app cannot be started from a clean clone. This is the fix: the curation
 * is code, so it ships.
 *
 * WHY CURATE AT ALL. `QbankSessionConfig` has no allow-list for item types, so the only way to
 * guarantee the engine never serves a type this app cannot draw is to constrain the pool the API
 * loads. `packages/qbank/src/bank.ts` reads `GT_QBANK_BANKS`, so pointing one API instance at a
 * subset is deployment configuration rather than a library change.
 *
 * Symlinks rather than copies: the bank is the source of truth and a copy would silently go stale.
 */
import { existsSync, mkdirSync, readdirSync, rmSync, symlinkSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(HERE, '..', '..', '..', 'qbank-library', 'banks');
const DEST = resolve(HERE, '..', '..', 'data', 'sanctuary', 'banks');

/**
 * The eleven types, one per in-world verb.
 *
 * Excluded on purpose, because a single-tap app marks them wrongly rather than not at all:
 *   CX-check-01       compound placement key (`t2:b0|t1:b1|...`)
 *   SPA-MAZE-01       the response is a traced route
 *   VER-EVIDENCE-01   compound key (`A+s5`), so every attempt is marked wrong, silently
 */
export const SANCTUARY_TYPES = [
  // fluid
  'FLU-MATRIX-01',
  'FLU-CARPET-01',
  'FLU-OPCHAIN-01',
  // quantitative
  'QUANT-SERIES-01',
  'QUANT-FUNC-01',
  'QUANT-BALANCE-01',
  'QUANT-DOTS-01',
  // spatial
  'SPA-XFORM-01',
  // verbal
  'VER-RELPAIR-01',
  'VER-SORTBOT-01',
  'VER-SEQUENCE-01',
] as const;

function main() {
  if (!existsSync(SRC)) throw new Error(`no bank directory at ${SRC}`);
  mkdirSync(DEST, { recursive: true });
  for (const f of readdirSync(DEST)) rmSync(join(DEST, f));

  const missing: string[] = [];
  for (const code of SANCTUARY_TYPES) {
    const src = join(SRC, `${code}.jsonl`);
    if (!existsSync(src)) {
      missing.push(code);
      continue;
    }
    symlinkSync(relative(DEST, src), join(DEST, `${code}.jsonl`));
  }
  if (missing.length) throw new Error(`bank files absent: ${missing.join(', ')}`);

  console.log(`[sanctuary] ${SANCTUARY_TYPES.length} banks linked into ${DEST}`);
  console.log('[sanctuary] start the API with:');
  console.log(`  GT_QBANK_BANKS="${DEST}" PORT=5203 GT_SCREENER_DATA=./data/sanctuary npx tsx apps/api/src/server.ts`);
}

main();
