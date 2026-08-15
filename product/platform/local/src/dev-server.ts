import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { configureSnapshotSource, resetDeps } from '@platform/shared';
import { routeLocal } from './router.js';

/**
 * The platform, on a port, for local development.
 *
 * Runs the real handlers through the local router. Nothing here is a stand-in: a game that works against this
 * works against a deployed stack, and going live is a base URL.
 *
 * Start DynamoDB Local first (`npm run ddb:start`) and seed a catalogue and an app
 * (`npm run seed:bramblebrook`).
 */

const PORT = Number(process.env.GT_LOCAL_PORT ?? 5210);
const DATA_DIR = join(import.meta.dirname, '..', '..', '..', 'screener', 'data', 'sanctuary');
const SNAPSHOT_DIR = join(DATA_DIR, 'snapshots');

process.env.AWS_ACCESS_KEY_ID ??= 'local';
process.env.AWS_SECRET_ACCESS_KEY ??= 'local';
process.env.AWS_REGION ??= 'us-east-1';
process.env.GT_TABLE_NAME ??= 'gt-platform-local';
process.env.GT_ANSWER_KEY_TABLE_NAME ??= 'gt-answer-keys-local';
process.env.GT_PERSONA_TABLE_NAME ??= 'gt-personas-local';
process.env.GT_DDB_ENDPOINT ??= 'http://127.0.0.1:8456';
process.env.GT_SNAPSHOT_BUCKET ??= 'local';
resetDeps();

/**
 * Snapshots come off disk instead of S3.
 *
 * The serving function reads them through an injectable fetcher for exactly this reason, so no bucket and no
 * credentials are needed to play the game.
 */
configureSnapshotSource(async (_bucket, key) => {
  const file = join(SNAPSHOT_DIR, key.replace(/^snapshots\//, ''));
  if (!existsSync(file)) {
    throw new Error(`snapshot ${key} is not on disk; run npm run seed:bramblebrook`);
  }
  return readFileSync(file);
});

/**
 * Admin routes are enabled here only when asked for explicitly.
 *
 * This router cannot verify SigV4, so enabling them means anything that can reach the port can publish a
 * catalogue. Fine deliberately, never by default.
 */
const allowAdmin = process.argv.includes('--allow-admin');

const server = createServer((req, res) => {
  const chunks: Buffer[] = [];
  req.on('data', (chunk: Buffer) => chunks.push(chunk));
  req.on('end', () => {
    void (async () => {
      const headers: Record<string, string> = {};
      for (const [name, value] of Object.entries(req.headers)) {
        if (typeof value === 'string') headers[name.toLowerCase()] = value;
      }

      const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
      const started = Date.now();

      try {
        const response = await routeLocal(
          {
            method: req.method ?? 'GET',
            path: url.pathname,
            body: chunks.length > 0 ? Buffer.concat(chunks).toString('utf8') : null,
            headers,
          },
          { allowAdmin },
        );
        res.writeHead(response.statusCode, {
          ...response.headers,
          // The game is served from another origin in development, and a browser will not read a response
          // it cannot see.
          'access-control-allow-origin': '*',
          'access-control-allow-headers': 'content-type,x-api-key,idempotency-key',
          'access-control-allow-methods': 'GET,POST,PUT,OPTIONS',
        });
        res.end(response.body);
        console.log(`${req.method} ${url.pathname} -> ${response.statusCode} ${Date.now() - started}ms`);
      } catch (error) {
        console.error(`${req.method} ${url.pathname} threw`, error);
        res.writeHead(500, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'internal error' }));
      }
    })();
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`gt platform listening on http://127.0.0.1:${PORT}`);
  console.log(`  storage   ${process.env.GT_DDB_ENDPOINT}`);
  console.log(`  snapshots ${SNAPSHOT_DIR}`);
  console.log(`  admin     ${allowAdmin ? 'ENABLED (--allow-admin)' : 'disabled'}`);
});
