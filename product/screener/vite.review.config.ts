import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

import { bankReviewApi } from './apps/bank-review/server-plugin';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

/**
 * The bank review app, on its own config and port so it lands on its own branch without touching a
 * file the screener owns. Host pinned to 127.0.0.1 because Vite otherwise binds IPv6 localhost and
 * anything probing 127.0.0.1 gets refused while the browser works.
 */
export default defineConfig({
  root: r('./apps/bank-review'),
  plugins: [react(), bankReviewApi()],
  resolve: {
    alias: { '@gt/ui-contract': r('./packages/ui-contract/src/index.ts') },
  },
  server: { host: '127.0.0.1', port: 5191 },
  build: { outDir: r('./dist-review'), emptyOutDir: true },
});
