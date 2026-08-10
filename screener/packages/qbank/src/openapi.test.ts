/**
 * The committed OpenAPI document matches the generator, and describes what the server actually returns.
 *
 * Two different guarantees, and it is worth being clear which is which. The first is mechanical: regenerate and
 * compare, so `docs/api/bank-engine.openapi.json` cannot fall behind `openapi.ts`. The second is partial: the
 * schemas are checked against the *names* the TypeScript contract declares, which catches a field added to the
 * contract and forgotten in the spec — the most likely drift — without amounting to a real derivation.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { OPENAPI_PATH, buildOpenApiDocument } from './openapi';
import { bankRoutes } from './wire';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');

function committed(): Record<string, unknown> {
  return JSON.parse(readFileSync(join(REPO_ROOT, OPENAPI_PATH), 'utf8')) as Record<string, unknown>;
}

describe('the committed spec is current', () => {
  it('matches what the generator produces', () => {
    // If this goes red, run `npm run api:spec`. Do not edit the JSON by hand — it is output.
    expect(committed()).toEqual(buildOpenApiDocument());
  });

  it('is serialised exactly as the generator writes it', () => {
    const onDisk = readFileSync(join(REPO_ROOT, OPENAPI_PATH), 'utf8');
    expect(onDisk).toBe(`${JSON.stringify(buildOpenApiDocument(), null, 2)}\n`);
  });
});

describe('the spec describes the routes the client actually calls', () => {
  it('documents every path the route builders produce', () => {
    /**
     * The one part of a contract a type cannot check is the URL. `bankRoutes` is what the client calls, so the
     * spec has to cover exactly those paths with the id placeholder swapped for OpenAPI's brace syntax.
     */
    const paths = Object.keys((buildOpenApiDocument() as { paths: Record<string, unknown> }).paths);
    const called = [
      bankRoutes.catalogue(),
      bankRoutes.createSession(),
      bankRoutes.next('{sessionId}'),
      bankRoutes.answer('{sessionId}'),
      bankRoutes.debug('{sessionId}'),
    ].map((p) => p.replace(/%7B/gi, '{').replace(/%7D/gi, '}'));

    for (const path of called) expect(paths, `${path} is called but not documented`).toContain(path);
    expect(paths).toHaveLength(called.length);
  });
});

describe('the state schema covers the whole state', () => {
  it('requires every field the engine puts on a session state', () => {
    /**
     * Guards the drift that actually happens. `domains` and `passRoute` were added to `QbankState` by 1a.4 and
     * 1a.7, and four hand-written client copies never learned about them. A spec is another such copy, so the
     * field list is asserted rather than trusted.
     *
     * The list is written out rather than derived from the type, because types are erased at runtime. That
     * makes this a reminder to update two places, not a proof — but it is a reminder that fails loudly.
     */
    const expected = [
      'stopped',
      'stopReason',
      'pAbove',
      'decision',
      'itemsServed',
      'unscorable',
      'estimate',
      'interval',
      'perDomain',
      'domains',
      'passRoute',
    ];
    const schemas = (buildOpenApiDocument() as { components: { schemas: Record<string, { required?: string[]; properties?: Record<string, unknown> }> } })
      .components.schemas;

    expect(schemas.SessionState!.required!.sort()).toEqual([...expected].sort());
    expect(Object.keys(schemas.SessionState!.properties!).sort()).toEqual([...expected].sort());
  });

  it('documents a domain band as unreadable without its interval and counts', () => {
    // The rule 1a.4 made structural in TypeScript has to survive the trip to a non-TypeScript adopter, who gets
    // no help from the type system and needs the requirement stated in the schema instead.
    const schemas = (buildOpenApiDocument() as { components: { schemas: Record<string, { required?: string[]; description?: string }> } })
      .components.schemas;
    expect(schemas.DomainBand!.required!.sort()).toEqual(['interval', 'itemsScored', 'itemsServed', 'mean']);
    expect(schemas.DomainBand!.description).toMatch(/never render `mean` without/i);
  });

  it('warns that a domain-triggered pass is not a domain strength', () => {
    // 1a.7's binding consequence. A caller reading only the spec must still be told.
    const schemas = (buildOpenApiDocument() as { components: { schemas: Record<string, { description?: string }> } })
      .components.schemas;
    expect(schemas.PassRoute!.description).toMatch(/not evidence of a domain strength/i);
  });

  it('says null correctness is unmarkable rather than wrong', () => {
    const schemas = (buildOpenApiDocument() as {
      components: { schemas: Record<string, { properties?: Record<string, { description?: string }> }> };
    }).components.schemas;
    expect(schemas.AnswerResponse!.properties!.correct!.description).toMatch(/not wrong/i);
  });
});
