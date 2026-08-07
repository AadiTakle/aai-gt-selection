import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Plugin } from 'vite';

/**
 * Dev-server endpoints for the type-review app.
 *
 * The original review harness (`archive/research/exam-question-types/review.html`) was a static page
 * that the reviewer served over HTTP from inside that folder, so `review-data.json` and `banks/*.jsonl`
 * sat next to it as plain files. This app keeps the same data contract and serves those same files from
 * their real homes instead of copying them, because a copied bank goes stale silently and the whole
 * point of a review tool is that it shows what is actually there.
 *
 * `/qbank/items/*.html` is proxied through as well, so the "Default" UI design can embed the archive's
 * own prebuilt renderer exactly as the original harness did. Those files are the reference the other
 * two designs get compared against, so they have to be the real ones rather than a reimplementation.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');

const REVIEW_DATA =
  process.env['GT_REVIEW_DATA'] ?? join(ROOT, 'archive', 'research', 'exam-question-types', 'review-data.json');
const BANKS = process.env['GT_QBANK_BANKS'] ?? join(ROOT, 'qbank-library', 'banks');
const ITEMS = process.env['GT_QBANK_DIR'] ?? join(ROOT, 'qbank-library', 'items');
const SKIN = join(ROOT, 'archive', 'apps', 'web', 'public', 'exam-skin.css');

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

/** Refuse anything with a path separator or a dot-dot, so a type code cannot walk out of its folder. */
function safeName(raw: string): string | null {
  const name = decodeURIComponent(raw);
  if (!/^[A-Za-z0-9._-]+$/.test(name) || name.includes('..')) return null;
  return name;
}

export function typeReviewApi(): Plugin {
  return {
    name: 'gt-type-review-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '').split('?')[0] ?? '';

        // The 66-type catalogue the sidebar is built from.
        if (url === '/api/review-data') {
          if (!existsSync(REVIEW_DATA)) {
            res.statusCode = 404;
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({ error: `review-data.json not found at ${REVIEW_DATA}` }));
            return;
          }
          res.setHeader('content-type', MIME['.json']!);
          res.setHeader('cache-control', 'no-store');
          res.end(readFileSync(REVIEW_DATA, 'utf8'));
          return;
        }

        // Which type codes actually have a bank on disk. The catalogue lists 66 types and the banks
        // directory holds fewer, so the UI needs to know which rows can drive the difficulty explorer
        // rather than discovering it one failed fetch at a time.
        if (url === '/api/banks') {
          const codes = existsSync(BANKS)
            ? readdirSync(BANKS)
                .filter((f) => f.endsWith('.jsonl'))
                .map((f) => f.replace(/\.jsonl$/, ''))
                .sort()
            : [];
          res.setHeader('content-type', MIME['.json']!);
          res.end(JSON.stringify({ banks: codes }));
          return;
        }

        // One type's bank, as JSONL, exactly as the original harness fetched it.
        const bank = /^\/banks\/([^/]+)\.jsonl$/.exec(url);
        if (bank) {
          const name = safeName(bank[1]!);
          const file = name ? join(BANKS, `${name}.jsonl`) : null;
          if (!file || !existsSync(file)) {
            res.statusCode = 404;
            res.end(`no bank for ${bank[1]}`);
            return;
          }
          res.setHeader('content-type', 'application/x-ndjson; charset=utf-8');
          res.setHeader('cache-control', 'no-store');
          res.end(readFileSync(file));
          return;
        }

        // The archive's own renderers, plus the stylesheet they expect to find alongside them.
        if (url === '/qbank/exam-skin.css' || url === '/exam-skin.css') {
          if (existsSync(SKIN)) {
            res.setHeader('content-type', MIME['.css']!);
            res.end(readFileSync(SKIN));
            return;
          }
        }
        const item = /^\/qbank\/items\/([^/]+)$/.exec(url);
        if (item) {
          const name = safeName(item[1]!);
          const file = name ? join(ITEMS, name) : null;
          if (!file || !existsSync(file)) {
            res.statusCode = 404;
            res.end(`no renderer for ${item[1]}`);
            return;
          }
          res.setHeader('content-type', MIME[extname(file)] ?? 'application/octet-stream');
          res.setHeader('cache-control', 'no-store');
          res.end(readFileSync(file));
          return;
        }

        next();
      });
    },
  };
}
