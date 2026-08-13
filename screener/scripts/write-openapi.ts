/**
 * Emit the OpenAPI document for the bank engine.
 *
 * Run via `npm run api:spec`. `openapi.test.ts` asserts the committed file matches this output, so the copy
 * under docs/ cannot quietly fall behind the generator.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildOpenApiDocument, OPENAPI_PATH } from '../packages/qbank/src/openapi.js';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', '..', OPENAPI_PATH);
writeFileSync(out, `${JSON.stringify(buildOpenApiDocument(), null, 2)}\n`);
console.log(`wrote ${out}`);
