import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { findBankItem, getServedIndex, getServedItem, getServedItems } from './bank-loader';
import { EXAM_TYPE_REGISTRY } from './registry.generated';

/**
 * The served/answer trust boundary (BUILD_PLAN §2).
 *
 * A `ServedItem` — itemId, typeCode, domain, difficulty, ageBands, content — is
 * everything the browser may ever see. `answer`, `scoring` and `provenance` stay
 * server-side and correctness is decided only by `/api/exam-submit`. These tests
 * assert that at the two places it could leak: the loader's projection, and the
 * static demo files published under `public/`.
 */

const REPO_ROOT = join(process.cwd(), '..', '..');
const PUBLIC_DIR = join(process.cwd(), 'public');
const PUBLIC_DEMOS = join(PUBLIC_DIR, 'exam-demos');

const SERVER_ONLY_FIELDS = ['answer', 'scoring', 'provenance', 'demoPath'];

describe('served item projection', () => {
  it('strips every server-only field from a served item', async () => {
    const index = await getServedIndex();
    expect(index.length).toBeGreaterThan(0);

    for (const type of EXAM_TYPE_REGISTRY) {
      const entry = index.find((i) => i.typeCode === type.typeCode);
      expect(entry, `${type.typeCode} in index`).toBeDefined();

      const served = await getServedItem(entry!.itemId);
      expect(served).not.toBeNull();
      for (const field of SERVER_ONLY_FIELDS) {
        expect(Object.hasOwn(served!, field), `${type.typeCode} served.${field}`).toBe(false);
      }
      expect(JSON.stringify(served)).not.toContain('correctKey');
      expect(served!.syntheticOnly).toBe(true);
      expect(served!.validated).toBe(false);
    }
  });

  it('keeps the answer key reachable server-side for verification', async () => {
    const index = await getServedIndex();
    const full = await findBankItem(index[0]!.itemId);
    expect(full?.answer?.correctKey).toBeDefined();
  });

  it('omits content from the index so the pool stays small', async () => {
    const index = await getServedIndex();
    for (const entry of index) expect(Object.keys(entry.content)).toHaveLength(0);
    // The whole index must stay far smaller than the full pool it replaces.
    const indexBytes = JSON.stringify(index).length;
    const fullBytes = JSON.stringify(await getServedItems({ limit: 200 })).length;
    const fullPoolEstimate = (fullBytes / 200) * index.length;
    expect(indexBytes).toBeLessThan(fullPoolEstimate / 4);
  });
});

describe('published demo assets', () => {
  it('publishes no answer key in any demo file', () => {
    for (const file of readdirSync(PUBLIC_DEMOS)) {
      const src = readFileSync(join(PUBLIC_DEMOS, file), 'utf8');
      expect(src, `${file} correctKey`).not.toContain('correctKey');
      expect(src, `${file} distractorRationales`).not.toContain('distractorRationales');
    }
  });

  it('never publishes the raw banks', () => {
    // Some demos fetch `../banks/<CODE>.jsonl` as a standalone fallback. That
    // path resolves to /banks/ from /exam-demos/, so publishing the banks would
    // expose every answer key to the browser.
    expect(existsSync(join(PUBLIC_DIR, 'banks'))).toBe(false);
  });
});

describe('demo + registry sync', () => {
  it('is up to date with the banks and demos on disk', () => {
    // Fails when a bank or demo changed without re-running the sync, which is
    // how a newly generated type gets wired (or blocked with a reason).
    const result = execFileSync(
      process.execPath,
      [join(REPO_ROOT, 'scripts', 'sync-exam-demos.mjs'), '--check'],
      { cwd: REPO_ROOT, encoding: 'utf8' },
    );
    expect(result).toContain('up to date');
  });
});
