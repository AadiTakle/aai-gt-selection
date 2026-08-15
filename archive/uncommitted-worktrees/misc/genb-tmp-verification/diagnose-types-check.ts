// Throwaway diagnostic: an instrumented copy of scripts/check-generated-types.ts.
// The original is NOT modified. This reports WHY the comparison fails when the script is
// launched through `pnpm run`, so a genuine schema drift can be told apart from stdout noise.
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const generatedPath = path.join(process.cwd(), 'packages/db-types/src/database.generated.ts');
const result = spawnSync(
  'pnpm',
  ['exec', 'supabase', 'gen', 'types', 'typescript', '--local', '--schema', 'api'],
  { cwd: process.cwd(), encoding: 'utf8' },
);

console.log('cwd:', process.cwd());
console.log('child status:', result.status);
console.log('stdout length:', result.stdout?.length);
console.log('stdout head:', JSON.stringify(result.stdout?.slice(0, 120)));
console.log('stderr head:', JSON.stringify(result.stderr?.slice(0, 200)));

const committed = await readFile(generatedPath, 'utf8');
console.log('committed length:', committed.length);

if (committed === result.stdout) {
  console.log('RESULT: EQUAL (no drift)');
} else {
  let i = 0;
  while (i < Math.min(committed.length, result.stdout.length) && committed[i] === result.stdout[i]) {
    i++;
  }
  console.log('RESULT: DIFFERENT, first difference at index', i);
  console.log('committed ctx:', JSON.stringify(committed.slice(Math.max(0, i - 80), i + 80)));
  console.log('stdout    ctx:', JSON.stringify(result.stdout.slice(Math.max(0, i - 80), i + 80)));
}
