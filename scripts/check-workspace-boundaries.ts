import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const packageRoot = path.join(root, 'packages');
const violations: string[] = [];

async function walk(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const target = path.join(directory, entry.name);
      return entry.isDirectory() ? walk(target) : [target];
    }),
  );
  return files.flat();
}

for (const file of await walk(packageRoot)) {
  if (!/\.[cm]?[jt]sx?$/.test(file)) {
    continue;
  }

  const source = await readFile(file, 'utf8');
  if (source.includes('@gt-selection/web') || source.includes('apps/web')) {
    violations.push(path.relative(root, file));
  }
  if (file.includes(`${path.sep}contracts${path.sep}`) && source.includes('@supabase/')) {
    violations.push(`${path.relative(root, file)} (contracts may not import Supabase)`);
  }
}

if (violations.length > 0) {
  throw new Error(`Workspace dependency boundary violations:\n${violations.join('\n')}`);
}

console.log('Workspace dependency boundaries verified.');
