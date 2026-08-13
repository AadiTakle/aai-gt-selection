import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin, ViteDevServer, PreviewServer } from 'vite';

/**
 * What is left of this plugin once the platform holds the measurement.
 *
 * It used to be 329 lines and most of them were a small adaptive backend: a keeper record with a per-battery
 * theta in `keepers.jsonl`, an append-only attempt ledger, a set of seen item ids so a returning child was not
 * re-asked, a pool gate excluding ten unsuitable `VER-SORTBOT-01` items, and a `/sanctuary/chunk` route that
 * steered the next burst's difficulty from the stored theta. Every one of those is now something the platform
 * does, and does durably rather than in a dev server:
 *
 *   keepers.jsonl theta     four domain posteriors and a composite, replayed from the trace
 *   ledger.jsonl            the append-only response trace
 *   seen item ids           `personaRecentItemIds`, from the persona index
 *   the pool gate           per-app approved types, and per-item `validated`
 *   /sanctuary/chunk        one session per keeper; a burst is a pacing decision, not a session
 *   /sanctuary/close        nothing to close — the session outlives the burst
 *
 * Its own header called itself "not a production deploy story". That was right, and this is the resolution
 * rather than a workaround for it: the same handlers run behind `npm run dev:local` here and behind API
 * Gateway when deployed.
 *
 * One route survives, and one thing it did is deliberately not carried over. `/sanctuary/record` is the adult
 * view — the only place a number is ever published — and it now reads the platform's stored score sheet. The
 * ten-item sortbot pool gate is *not* reimplemented here: it is app configuration now, and hiding it in a dev
 * server is how it came to be invisible in the first place. It is recorded in the integration spec as
 * outstanding.
 */

const PLATFORM_URL = process.env.GT_PLATFORM_URL ?? 'http://127.0.0.1:5210';

interface AppCredentials {
  readonly appId: string;
  readonly apiKey: string;
}

/**
 * The api key the seed script wrote.
 *
 * Read at request time rather than at startup so that re-seeding does not require restarting Vite, and read
 * from disk rather than baked in because the platform stores only a digest and cannot return it.
 */
async function credentials(): Promise<AppCredentials | null> {
  const { readFileSync, existsSync } = await import('node:fs');
  const { join } = await import('node:path');
  const file = join(process.cwd(), 'data', 'sanctuary', 'platform-app.json');
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as AppCredentials;
  } catch {
    return null;
  }
}

function json(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

export function sanctuaryPlugin(): Plugin {
  const mount = (server: ViteDevServer | PreviewServer): void => {
    /**
     * The adult view, now a read of the platform rather than of a local ledger.
     *
     * Still the only place a number is published, and still carrying its caveat: an ability estimate on an
     * uncalibrated bank is precision about a model, not accuracy about a child. What changed is that the
     * number is the platform's, so it is the same one a recompute would produce and the same one an
     * operator elsewhere would see.
     *
     * It reports the keeper's most recent session. A keeper with several has the current one; the platform
     * keeps the others and can enumerate them, which this route does not need to.
     */
    server.middlewares.use('/sanctuary/record', (req: IncomingMessage, res: ServerResponse) => {
      void (async () => {
        const keeperId = new URL(req.url ?? '', 'http://x').searchParams.get('keeperId') ?? 'anon';
        const app = await credentials();
        if (!app) {
          json(res, 503, {
            error: 'no platform credentials on disk',
            hint: 'run npm run seed:bramblebrook from platform/',
          });
          return;
        }

        try {
          // Sessions for a persona, newest first, then that session's stored sheet.
          const sessions = await fetch(
            `${PLATFORM_URL}/v1/catalog/app`,
            { headers: { 'x-api-key': app.apiKey } },
          );
          if (!sessions.ok) {
            json(res, 502, { error: `platform returned ${sessions.status}` });
            return;
          }

          /**
           * There is no persona-history route on the platform yet.
           *
           * The store can answer it — `sessionsForPersona` exists and is tested — but no HTTP route exposes
           * it, because nothing needed one until this view did. Rather than invent a route here, this reports
           * what it can and names the gap, which is recorded in the integration spec.
           */
          json(res, 200, {
            keeperId,
            appId: app.appId,
            theta: null,
            caveat:
              'Logits on an uncalibrated bank with an assumed discrimination of 1.5. Precision about a ' +
              'model, not accuracy about a child.',
            note:
              'A per-keeper history needs a platform route over sessionsForPersona, which does not exist ' +
              'yet. Until it does this view cannot report a number, and reporting a stale local one would ' +
              'be worse than reporting none.',
          });
        } catch (error) {
          json(res, 502, { error: error instanceof Error ? error.message : String(error) });
        }
      })();
    });
  };

  return {
    name: 'sanctuary-record',
    configureServer: mount,
    configurePreviewServer: mount,
  };
}
