import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Plugin } from 'vite';

import { COGAT_MAP } from '../../packages/ui-contract/src/cogat';
import { contextProfileFor } from '../../packages/ui-contract/src/context';
import { planAssets } from '../../packages/ui-contract/src/assets';
import { validateTheme, type ThemePack } from '../../packages/ui-contract/src/context';
import { allTypeCodes, requirementFor } from '../../packages/ui-contract/src/requirements';

/**
 * The planner's back end, as a dev-server plugin rather than a service.
 *
 * The banks are 35MB on disk and the requirement derivation reads them, so none of that can happen in
 * a browser. Running it here keeps the app a single `npm run` with nothing to start alongside it, and
 * keeps the whole feature inside its own branch instead of touching the shared API.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const THEMES_DIR = resolve(HERE, '..', '..', 'packages', 'ui-contract', 'themes');

function json(res: import('node:http').ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(payload);
}

async function readBody(req: import('node:http').IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

/** Everything about the library the browser needs, computed once per request. */
function catalogue() {
  return allTypeCodes().map((typeCode) => {
    const requirement = requirementFor(typeCode);
    const mapping = COGAT_MAP[typeCode];
    const context = contextProfileFor(typeCode);
    return {
      typeCode,
      elements: requirement.elements,
      counts: requirement.counts,
      readingBand: requirement.readingBand,
      // `subtest: 'none'` now carries what an absent entry used to, so null still means "not CogAT"
      // to every existing consumer of this payload.
      cogat: mapping && mapping.subtest !== 'none' ? { subtest: mapping.subtest, strength: mapping.strength } : null,
      contextCost: context.cost,
      contextWhy: context.why,
      authorSupplies: context.authorSupplies ?? null,
    };
  });
}

export function themePlannerApi(): Plugin {
  return {
    name: 'theme-planner-api',
    configureServer(server) {
      server.middlewares.use('/api/catalogue', (_req, res) => {
        json(res, 200, { types: catalogue() });
      });

      server.middlewares.use('/api/plan', (req, res) => {
        void (async () => {
          try {
            const body = (await readBody(req)) as { idea?: string; typeCodes?: string[] };
            const typeCodes = (body.typeCodes ?? []).filter((c) => allTypeCodes().includes(c));
            if (typeCodes.length === 0) {
              json(res, 400, { error: 'Select at least one question type.' });
              return;
            }
            json(res, 200, planAssets(body.idea ?? '', typeCodes));
          } catch (error) {
            json(res, 500, { error: error instanceof Error ? error.message : String(error) });
          }
        })();
      });

      server.middlewares.use('/api/validate', (req, res) => {
        void (async () => {
          try {
            const body = (await readBody(req)) as { pack?: ThemePack; typeCodes?: string[] };
            if (!body.pack) {
              json(res, 400, { error: 'No theme pack supplied.' });
              return;
            }
            json(res, 200, { issues: validateTheme(body.pack, body.typeCodes ?? allTypeCodes()) });
          } catch (error) {
            json(res, 500, { error: error instanceof Error ? error.message : String(error) });
          }
        })();
      });

      // Writes into the same themes directory `npm run ui -- --theme <name>` reads from, so a pack
      // saved here is immediately checkable from the command line.
      server.middlewares.use('/api/save-theme', (req, res) => {
        void (async () => {
          try {
            const body = (await readBody(req)) as { pack?: ThemePack };
            const pack = body.pack;
            if (!pack?.theme) {
              json(res, 400, { error: 'A theme needs a name before it can be saved.' });
              return;
            }
            const slug = pack.theme.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            if (!slug) {
              json(res, 400, { error: 'That theme name has no usable characters in it.' });
              return;
            }
            mkdirSync(THEMES_DIR, { recursive: true });
            const file = join(THEMES_DIR, `${slug}.json`);
            writeFileSync(file, `${JSON.stringify(pack, null, 2)}\n`, 'utf8');
            json(res, 200, { savedTo: file, checkWith: `npm run ui -- --theme ${slug}` });
          } catch (error) {
            json(res, 500, { error: error instanceof Error ? error.message : String(error) });
          }
        })();
      });
    },
  };
}
