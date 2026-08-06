import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

/**
 * WORKAROUND, not a fix. See the handoff entry "the catalogue's shared stylesheet was never copied".
 *
 * All 52 renderers in `qbank-library/items/` open with `<link href="../exam-skin.css">`, and that file
 * was not copied into the library when the items were. So every item in the catalogue loads with a
 * broken stylesheet link, and the API only serves `/qbank/items`, one level below where the link points.
 *
 * The real fix is in the library or the API, neither of which this loop may touch, so the file is served
 * here out of the archive copy it was originally taken from. It affects the shared screener app too.
 */
function serveExamSkin(): Plugin {
  const skin = r('../archive/apps/web/public/exam-skin.css');
  return {
    name: 'serve-exam-skin-workaround',
    configureServer(server) {
      server.middlewares.use('/qbank/exam-skin.css', (_req, res) => {
        try {
          res.setHeader('content-type', 'text/css');
          res.end(readFileSync(skin, 'utf8'));
        } catch {
          res.statusCode = 404;
          res.end('');
        }
      });
    },
  };
}

/**
 * The system-and-reward experience lab, on its own config and its own ports so it neither touches the
 * shared app nor collides with the other loop running on this machine.
 *
 * `/qbank` has to be proxied through this same origin. A cross-origin iframe's document cannot have CSS
 * properties set on it from the host, and setting those properties is how an item gets tinted to match
 * the world around it, so the proxy is the mechanism rather than a convenience.
 *
 * Host is pinned to 127.0.0.1 because Vite otherwise binds IPv6 localhost, and then anything probing
 * 127.0.0.1 gets connection refused while a browser works fine.
 */
export default defineConfig({
  root: r('./apps/lab-system'),
  plugins: [react(), serveExamSkin()],
  resolve: {
    alias: {
      '@gt/qbank': r('./packages/qbank/src/index.ts'),
      '@gt/contracts': r('./packages/contracts/src/index.ts'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5220,
    proxy: {
      '/api': 'http://127.0.0.1:5202',
      '/qbank': 'http://127.0.0.1:5202',
    },
  },
  build: { outDir: r('./dist-lab-system'), emptyOutDir: true },
});
