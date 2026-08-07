import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

import { typeReviewApi } from './apps/type-review/server-plugin';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

/**
 * The question-type review harness, on its own config and port so it does not touch a file the
 * screener owns. `vite.review.config.ts` is the precedent for this shape.
 *
 * Host is pinned to 127.0.0.1 because Vite otherwise binds IPv6 localhost, and anything probing
 * 127.0.0.1 gets refused while the browser works, which is a confusing hour to lose.
 *
 * `fs.allow` is widened to the repository root because this app reads two things that live outside its
 * own folder and must not be copied: the archive's `review-data.json` and the real item banks. Copying
 * either would let the review tool drift out of step with what is actually served, which would defeat
 * the point of reviewing it.
 */
export default defineConfig({
  root: r('./apps/type-review'),
  plugins: [react(), typeReviewApi()],
  resolve: {
    alias: {
      '@gt/qbank': r('./packages/qbank/src/index.ts'),
      '@gt/contracts': r('./packages/contracts/src/index.ts'),
      '@gt/ui-contract': r('./packages/ui-contract/src/index.ts'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5192,
    fs: { allow: [r('.'), r('..')] },
  },
  build: { outDir: r('./dist-type-review'), emptyOutDir: true },
});
