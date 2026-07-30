import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { EXAM_TYPE_CODES } from './registry.generated';

/**
 * The item bank has to survive the build, and its absence has to be audible.
 *
 * `bank-loader.ts` reads `research/exam-question-types/banks/*.jsonl` with `fs.readFile` at
 * runtime. `research/` is not application source: the Dockerfile copies only Next's standalone
 * output, `.next/static` and `public/`, so unless the build is told to carry the banks they are
 * simply not in the image. Every read then failed silently — `catch { continue }` — and the app
 * served an empty pool: an exam that shows a child no questions and tells no operator anything.
 *
 * Two things are pinned here, because the fix is two things:
 *   1. the banks are DECLARED as build output, not carried in by accident; and
 *   2. a bank that is missing, empty or corrupt is fatal and named, never an empty pool.
 *
 * Publishing the banks under `public/` would also make them available, and would also put every
 * `answer.correctKey` one URL away from the child; `served-boundary.test.ts` forbids it.
 */

const REPO_ROOT = join(process.cwd(), '..', '..');
const BANKS_RELATIVE = join('research', 'exam-question-types', 'banks');

const temporaryRoots: string[] = [];

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  while (temporaryRoots.length > 0) rmSync(temporaryRoots.pop()!, { recursive: true, force: true });
});

/**
 * A fake app root whose banks are symlinks to the real ones, so a test can remove or corrupt one
 * bank without copying 15 MB. `process.cwd()` is redirected there and the loader is re-imported so
 * its module-level cache starts empty.
 */
async function loaderRootedAt(mutate: (banksDir: string) => Promise<void> | void) {
  const root = mkdtempSync(join(tmpdir(), 'gt-bank-'));
  temporaryRoots.push(root);
  const banksDir = join(root, BANKS_RELATIVE);
  mkdirSync(banksDir, { recursive: true });
  for (const code of EXAM_TYPE_CODES) {
    symlinkSync(join(REPO_ROOT, BANKS_RELATIVE, `${code}.jsonl`), join(banksDir, `${code}.jsonl`));
  }
  await mutate(banksDir);

  vi.spyOn(process, 'cwd').mockReturnValue(root);
  vi.resetModules();
  return import('./bank-loader');
}

describe('the banks are declared build output', () => {
  it('next.config.ts traces them into the standalone bundle', () => {
    // A string check rather than an import: next.config.ts pulls in the CSP builder and Next's
    // own types, and what matters is the declaration, not the module.
    const config = readFileSync(join(process.cwd(), 'next.config.ts'), 'utf8');
    const include = /outputFileTracingIncludes[\s\S]*?'(\.\.\/\.\.\/research\/[^']+)'/.exec(config);
    expect(
      include,
      'next.config.ts must declare outputFileTracingIncludes for research/, or a standalone ' +
        'build ships without the item bank',
    ).not.toBeNull();

    // And the glob has to point at banks that are really there.
    const globbed = join(process.cwd(), include![1]!);
    const directory = globbed.slice(0, globbed.lastIndexOf('/'));
    expect(directory).toBe(join(REPO_ROOT, BANKS_RELATIVE));
    expect(existsSync(join(directory, `${EXAM_TYPE_CODES[0]!}.jsonl`))).toBe(true);
  });

  it('does not ship them through public/, where the browser could fetch the answer keys', () => {
    expect(existsSync(join(process.cwd(), 'public', 'banks'))).toBe(false);
  });
});

describe('a bank that cannot be read is fatal, not an empty pool', () => {
  it('serves every wired type when the banks are present', async () => {
    const loader = await loaderRootedAt(() => {});
    const index = await loader.getServedIndex();
    expect(index.length).toBeGreaterThan(0);
    expect(new Set(index.map((entry) => entry.typeCode)).size).toBe(EXAM_TYPE_CODES.length);
  });

  it('names the directories it searched when the bank directory is absent', async () => {
    const root = mkdtempSync(join(tmpdir(), 'gt-bank-'));
    temporaryRoots.push(root);
    vi.spyOn(process, 'cwd').mockReturnValue(root);
    vi.resetModules();
    const loader = await import('./bank-loader');

    await expect(loader.getServedIndex()).rejects.toThrow(loader.ExamBankUnavailableError);
    await expect(loader.getServedIndex()).rejects.toThrow(/No exam item bank directory found/);
  });

  it('names the type whose bank file is missing', async () => {
    const missing = EXAM_TYPE_CODES[0]!;
    const loader = await loaderRootedAt((banksDir) => {
      rmSync(join(banksDir, `${missing}.jsonl`));
    });

    await expect(loader.getServedIndex()).rejects.toThrow(loader.ExamBankUnavailableError);
    await expect(loader.getServedIndex()).rejects.toThrow(
      new RegExp(`${missing} is a wired question type but its bank could not be read`),
    );
  });

  it('refuses an empty bank file rather than quietly dropping the type', async () => {
    const emptied = EXAM_TYPE_CODES[1]!;
    const loader = await loaderRootedAt(async (banksDir) => {
      rmSync(join(banksDir, `${emptied}.jsonl`));
      await writeFile(join(banksDir, `${emptied}.jsonl`), '\n\n');
    });

    await expect(loader.getServedIndex()).rejects.toThrow(
      new RegExp(`${emptied} is a wired question type but its bank is empty`),
    );
  });

  it('refuses a corrupt line rather than quietly shrinking the pool', async () => {
    const corrupted = EXAM_TYPE_CODES[2]!;
    const loader = await loaderRootedAt(async (banksDir) => {
      const real = readFileSync(join(REPO_ROOT, BANKS_RELATIVE, `${corrupted}.jsonl`), 'utf8');
      const [first, ...rest] = real.split('\n');
      rmSync(join(banksDir, `${corrupted}.jsonl`));
      await writeFile(
        join(banksDir, `${corrupted}.jsonl`),
        [first, '{"itemId": truncated', ...rest].join('\n'),
      );
    });

    await expect(loader.getServedIndex()).rejects.toThrow(/:2 is not valid JSON/);
  });
});

describe('the deploy-time probe /api/health reports', () => {
  it('is ready when every wired bank is present', async () => {
    const loader = await loaderRootedAt(() => {});
    expect(loader.examBankHealth().ready).toBe(true);
  });

  it('is not ready, and says which types are affected, when one is missing', async () => {
    const missing = EXAM_TYPE_CODES[3]!;
    const loader = await loaderRootedAt((banksDir) => {
      rmSync(join(banksDir, `${missing}.jsonl`));
    });

    const health = loader.examBankHealth();
    expect(health.ready).toBe(false);
    expect(health.detail).toContain(missing);
  });
});
