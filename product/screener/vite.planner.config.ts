import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

import { themePlannerApi } from './apps/theme-planner/server-plugin';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

/**
 * The theme planner runs on its own config and its own port, alongside the screener rather than inside
 * it. Two reasons: its back end is a dev-server plugin that reads the 35MB of banks, which has no place
 * in the screener's request path, and keeping it separate means this feature lands on its own branch
 * without touching a file the screener also owns.
 */
export default defineConfig({
  root: r('./apps/theme-planner'),
  plugins: [react(), themePlannerApi()],
  resolve: {
    alias: {
      '@gt/ui-contract': r('./packages/ui-contract/src/index.ts'),
      '@gt/contracts': r('./packages/contracts/src/index.ts'),
    },
  },
  // Bound to 127.0.0.1 explicitly. Left to default, Vite listens on IPv6 localhost and anything
  // probing 127.0.0.1 (curl, a health check, most scripts) gets connection refused while the browser
  // works fine, which is a confusing five minutes.
  server: { host: '127.0.0.1', port: 5190 },
  build: { outDir: r('./dist-planner'), emptyOutDir: true },
});
