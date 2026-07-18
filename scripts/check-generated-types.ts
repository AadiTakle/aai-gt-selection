import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const generatedPath = path.join(process.cwd(), 'packages/db-types/src/database.generated.ts');
const result = spawnSync(
  'pnpm',
  ['exec', 'supabase', 'gen', 'types', 'typescript', '--local', '--schema', 'api'],
  {
    cwd: process.cwd(),
    encoding: 'utf8',
  },
);

if (result.status !== 0) {
  throw new Error(result.stderr || 'Supabase type generation failed.');
}

const committed = await readFile(generatedPath, 'utf8');
if (committed !== result.stdout) {
  throw new Error('Generated database types drifted. Run `pnpm db:types` and commit the result.');
}

console.log('Generated database types match the local api schema.');
