import { access, readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const scanRoots = ['apps/web/src', 'apps/web/.next/static', 'packages', '.env.example'];
const forbiddenPatterns = [
  /sb_secret_[A-Za-z0-9_-]{8,}/,
  /NEXT_PUBLIC_[A-Z0-9_]*(?:SERVICE_ROLE|SECRET)[A-Z0-9_]*/,
  /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]*service_role[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+/,
];
const violations: string[] = [];

async function collect(target: string): Promise<string[]> {
  const targetStat = await stat(target);
  if (targetStat.isFile()) {
    return [target];
  }

  const entries = await readdir(target, { withFileTypes: true });
  const nested = await Promise.all(
    entries
      .filter(({ name }) => !['node_modules', 'coverage', 'playwright-report'].includes(name))
      .map((entry) => collect(path.join(target, entry.name))),
  );
  return nested.flat();
}

for (const relativeRoot of scanRoots) {
  const targetRoot = path.join(root, relativeRoot);
  try {
    await access(targetRoot);
  } catch {
    continue;
  }
  for (const file of await collect(targetRoot)) {
    if (/\.(?:png|jpg|jpeg|gif|webp|ico|woff2?)$/i.test(file)) {
      continue;
    }

    const content = await readFile(file, 'utf8');
    for (const pattern of forbiddenPatterns) {
      if (pattern.test(content)) {
        violations.push(`${path.relative(root, file)} matched ${pattern.source}`);
      }
    }
  }
}

if (violations.length > 0) {
  throw new Error(`Elevated-key boundary violations:\n${violations.join('\n')}`);
}

console.log('Elevated-key and public-environment boundaries verified.');
