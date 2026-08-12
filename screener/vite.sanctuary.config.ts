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
 * Questions come from the platform on 5210, not from the prototype API. What the API on 5203 is still
 * needed for is narrow: the `/qbank` proxy below, which serves the catalogue's own static HTML renderers.
 * It no longer needs `GT_QBANK_BANKS` curated, because the type allow-list `QbankSessionConfig` lacks is
 * now per-app approved types on the platform, which is what retired `curate-banks.ts`.
 *
 * `fs.allow` is widened to the screener root on purpose: this app reuses the eight item renderers and
 * the drawing vocabulary that live under `apps/lab-character/`, rather than copying them.
 */
export default defineConfig({
  root: r('./apps/sanctuary'),
  /**
   * `.env.local` lives at the screener root, not next to this app.
   *
   * `envDir` defaults to `root`, which here is `apps/sanctuary/` — so without this line Vite silently looks
   * for env files inside the app directory, finds none, and `import.meta.env.VITE_GT_APP_KEY` is undefined.
   * The failure is a long way from the cause: the game loads, walks, and draws a station, and only when it
   * asks for a question does the platform refuse an unkeyed request. Every sibling app config has the same
   * `root`-is-a-subdirectory shape and no `envDir`; this is the first app to need an env var at all, which is
   * why the trap was never sprung before.
   */
  envDir: r('.'),
  /* `sanctuaryPlugin` no longer steers difficulty or holds an ability number — the platform is
     server-authoritative on both. What it still owns is the adult-facing `/sanctuary/*` routes, which read
     the platform rather than a local ledger. */
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
