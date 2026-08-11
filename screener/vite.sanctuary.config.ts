import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

import { sanctuaryPlugin } from './apps/sanctuary/server-plugin';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

/**
 * Bramblebrook, on its own config and its own ports so it touches no file another app owns.
 * `vite.review.config.ts` and `vite.lab-system.config.ts` are the precedent.
 *
 * Host pinned to 127.0.0.1 because Vite otherwise binds IPv6 localhost and anything probing
 * 127.0.0.1 is refused while the browser works, which is a confusing hour to lose.
 *
 * The API on 5203 must be started with GT_QBANK_BANKS pointed at `data/sanctuary/banks`, which
 * `apps/sanctuary/curate-banks.ts` writes. Without it the API loads all 53 banks and the engine will
 * serve types this app cannot draw, because `QbankSessionConfig` has no type allow-list.
 *
 * `fs.allow` is widened to the screener root on purpose: this app reuses the eight item renderers and
 * the drawing vocabulary that live under `apps/lab-character/`, rather than copying them.
 */
export default defineConfig({
  root: r('./apps/sanctuary'),
  /* `sanctuaryPlugin` owns difficulty steering and keeps every ability number server-side. See its
     header: the engine's selection does not adapt on its own, and handing the browser an estimate
     would hand it correctness by subtraction. */
  plugins: [react(), sanctuaryPlugin()],
  resolve: {
    alias: {
      '@gt/engine': r('./packages/engine/src/index.ts'),
      '@gt/qbank': r('./packages/qbank/src/index.ts'),
      '@gt/contracts': r('./packages/contracts/src/index.ts'),
      '@gt/ui-contract': r('./packages/ui-contract/src/index.ts'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5230,
    fs: { allow: [r('.')] },
    proxy: {
      /**
       * The question platform, same-origin through this proxy.
       *
       * The game asks for `/platform/api/bank/...`; the platform serves `/api/bank/...`. Rewriting here
       * rather than in the client keeps the client's paths exactly the contract's, so pointing at a deployed
       * stack is a base URL and nothing else. Start it with `npm run dev:local` from `platform/`.
       */
      '/platform': {
        target: 'http://127.0.0.1:5210',
        rewrite: (path: string) => path.replace(/^\/platform/, ''),
      },
      // The catalogue's own HTML renderers still come from the prototype API, which serves them statically.
      '/qbank': 'http://127.0.0.1:5203',
    },
  },
  build: { outDir: r('./dist-sanctuary'), emptyOutDir: true },
});
