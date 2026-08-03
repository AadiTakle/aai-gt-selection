/**
 * Workspace dependency boundaries: what `packages/*` may import.
 *
 * Two rules, both about the module graph rather than about the text of a file:
 *
 * 1. No package may import the web app. `packages/*` is consumed BY `apps/web`, so an edge in
 *    the other direction is a cycle and drags Next.js/React into a library that must stay
 *    runnable in a plain Node process (the scoring Lambda is the case that would break first).
 * 2. `packages/contracts` may not import Supabase. Contracts are the shared vocabulary the app,
 *    the engine and the database tier all speak; giving them a client dependency would make the
 *    vocabulary unusable anywhere that client cannot run.
 *
 * Both are checked against the module specifiers TypeScript's own scanner reports, NOT against a
 * substring search of the source. A comment, a JSDoc block or a string literal that NAMES a
 * forbidden path is not a dependency on it, and treating it as one costs a CI cycle and pressures
 * contributors into rewording accurate explanations to appease the check.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import ts from 'typescript';

const root = process.cwd();
const packageRoot = path.join(root, 'packages');

/**
 * Module specifiers only: `import`/`export … from '…'`, `require('…')` and `import('…')`.
 * `preProcessFile` runs the real scanner, so comments and string literals are skipped and the
 * result is the file's actual import list.
 */
export function moduleSpecifiers(source: string): string[] {
  return ts.preProcessFile(source, true, true).importedFiles.map((file) => file.fileName);
}

export function findBoundaryViolations(relativePath: string, source: string): string[] {
  const violations: string[] = [];
  const specifiers = moduleSpecifiers(source);
  const inContracts = relativePath.split(path.sep).includes('contracts');

  for (const specifier of specifiers) {
    if (specifier === '@gt-selection/web' || /(?:^|\/)apps\/web(?:\/|$)/.test(specifier)) {
      violations.push(`${relativePath} imports ${specifier}`);
    }
    if (inContracts && specifier.startsWith('@supabase/')) {
      violations.push(`${relativePath} imports ${specifier} (contracts may not import Supabase)`);
    }
  }

  return violations;
}

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

export async function checkWorkspaceBoundaries(): Promise<string[]> {
  const violations: string[] = [];

  for (const file of await walk(packageRoot)) {
    if (!/\.[cm]?[jt]sx?$/.test(file)) {
      continue;
    }

    const relativePath = path.relative(root, file);
    violations.push(...findBoundaryViolations(relativePath, await readFile(file, 'utf8')));
  }

  return violations;
}

if (process.argv[1] && import.meta.filename === path.resolve(process.argv[1])) {
  const violations = await checkWorkspaceBoundaries();
  if (violations.length > 0) {
    throw new Error(`Workspace dependency boundary violations:\n${violations.join('\n')}`);
  }

  console.log('Workspace dependency boundaries verified.');
}
