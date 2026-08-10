import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const screener = join(here, '..', 'screener', 'packages');

export default defineConfig({
  resolve: {
    alias: {
      '@platform/domain': join(here, 'packages/domain/src/index.ts'),
      '@platform/scoring': join(here, 'packages/scoring/src/index.ts'),
      '@platform/selection': join(here, 'packages/selection/src/index.ts'),
      '@platform/catalog': join(here, 'packages/catalog/src/index.ts'),
      '@platform/store': join(here, 'packages/store/src/index.ts'),
      '@platform/shared': join(here, 'functions/shared/src/index.ts'),

      // The screener packages are imported, never modified. Longest alias first so that
      // '@gt/qbank/server' is not swallowed by the '@gt/qbank' prefix.
      '@gt/qbank/server': join(screener, 'qbank/src/server.ts'),
      '@gt/contracts': join(screener, 'contracts/src/index.ts'),
      '@gt/engine': join(screener, 'engine/src/index.ts'),
      '@gt/qbank': join(screener, 'qbank/src/index.ts'),
      '@gt/ui-contract': join(screener, 'ui-contract/src/index.ts'),
      '@gt/item-library': join(screener, 'item-library/src/index.ts'),
      '@gt/stats': join(screener, 'stats/src/index.ts'),
    },
  },
  test: {
    include: ['packages/**/*.test.ts', 'functions/**/*.test.ts', 'infra/**/*.test.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
