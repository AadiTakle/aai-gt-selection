import { defineConfig } from 'vitest/config';

/**
 * Tests for the repo-root `scripts/` checks. They live outside every workspace package, so
 * `pnpm -r run test` never reaches them; the root `test` / `test:coverage` scripts chain this
 * config on so CI runs them with everything else.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['scripts/**/*.test.ts'],
  },
});
