import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

/**
 * The character-led lab, on its own config and port so it lands on its own branch without touching a
 * file the screener owns. `vite.review.config.ts` is the precedent for this.
 *
 * Host is pinned to 127.0.0.1 because Vite otherwise binds IPv6 localhost, and anything probing
 * 127.0.0.1 gets refused while the browser works, which is a confusing hour to lose.
 *
 * The /api proxy points at this lab's own API instance on 5201, which is started with
 * GT_QBANK_BANKS pointed at data/lab-character/banks. That directory holds only the eight item
 * types this lab draws itself, which is what lets every question be rendered in React from the
 * headless bank content rather than embedded as a prebuilt HTML frame.
 *
 * /qbank is proxied too, and deliberately, even though nothing here embeds an item frame. Keeping
 * it means the reference app's renderers stay one URL away while building, which is how you check
 * that a hand-drawn item is depicting what the item actually says.
 */
export default defineConfig({
  root: r('./apps/lab-character'),
  plugins: [react()],
  resolve: {
    alias: {
      '@gt/qbank': r('./packages/qbank/src/index.ts'),
      '@gt/ui-contract': r('./packages/ui-contract/src/index.ts'),
      '@gt/contracts': r('./packages/contracts/src/index.ts'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5210,
    proxy: {
      '/api': 'http://localhost:5201',
      // Same origin on purpose: a cross-origin frame cannot be themed from the host.
      '/qbank': 'http://localhost:5201',
    },
  },
  build: { outDir: r('./dist-lab-character'), emptyOutDir: true },
});
