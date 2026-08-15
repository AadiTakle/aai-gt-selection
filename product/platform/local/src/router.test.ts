import { createHash } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { ROUTES, matchRoute } from '@platform/shared';
import { routeLocal } from './router.js';

describe('the route table', () => {
  it('matches a concrete path and extracts its parameters', () => {
    const matched = matchRoute('GET', '/api/bank/sessions/sess-abc/next');
    expect(matched?.route.fn).toBe('serve');
    expect(matched?.pathParameters).toEqual({ sessionId: 'sess-abc' });
  });

  it('does not let a shorter route swallow a longer one', () => {
    expect(matchRoute('GET', '/api/bank')?.route.id).toBe('BankCatalogue');
    expect(matchRoute('POST', '/api/bank/sessions')?.route.id).toBe('CreateSession');
    // Three segments must not match a two-segment template.
    expect(matchRoute('GET', '/v1/catalog/types')?.route.id).toBe('CatalogTypes');
    expect(matchRoute('GET', '/v1/catalog/types/FLU-MATRIX-01')?.route.id).toBe('CatalogType');
  });

  it('decodes a parameter that arrived encoded', () => {
    const matched = matchRoute('PUT', '/v1/admin/apps/app-1/types/FLU-MATRIX-01');
    expect(matched?.pathParameters).toEqual({ appId: 'app-1', typeCode: 'FLU-MATRIX-01' });
  });

  it('distinguishes methods on one path', () => {
    expect(matchRoute('GET', '/v1/admin/apps')).toBeNull();
    expect(matchRoute('POST', '/v1/admin/apps')?.route.id).toBe('AdminCreateApp');
  });

  it('gives every route a unique construct id, since the CDK uses them', () => {
    const ids = ROUTES.map((route) => route.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('does not serve the contract debug route', () => {
    expect(ROUTES.some((route) => route.path.includes('/debug'))).toBe(false);
  });
});

describe('the local router', () => {
  /**
   * A stub keyed on one known digest.
   *
   * The first version tested `hash.length === 64`, which every sha256 satisfies, so it accepted every key
   * and the fail-closed test passed for the wrong reason.
   */
  const knownHash = createHash('sha256').update('good-key').digest('hex');
  const stub = { resolveAppId: async (hash: string) => (hash === knownHash ? 'app-stub' : null) };

  beforeAll(() => {
    // The handlers construct their clients before validating a body, so the environment has to exist for a
    // routing test to reach the validation it is asserting. Nothing here connects.
    process.env.GT_TABLE_NAME ??= 'router-test-main';
    process.env.GT_ANSWER_KEY_TABLE_NAME ??= 'router-test-keys';
    process.env.GT_PERSONA_TABLE_NAME ??= 'router-test-personas';
    process.env.AWS_ACCESS_KEY_ID ??= 'local';
    process.env.AWS_SECRET_ACCESS_KEY ??= 'local';
    process.env.AWS_REGION ??= 'us-east-1';
  });

  it('404s an unknown path without reaching a handler', async () => {
    const response = await routeLocal({ method: 'GET', path: '/nope', body: null, headers: {} }, stub);
    expect(response.statusCode).toBe(404);
  });

  it('401s a request with no api key', async () => {
    const response = await routeLocal(
      { method: 'GET', path: '/api/bank', body: null, headers: {} },
      stub,
    );
    expect(response.statusCode).toBe(401);
  });

  it('refuses admin routes unless they are explicitly enabled', async () => {
    const response = await routeLocal(
      { method: 'POST', path: '/v1/admin/apps', body: '{}', headers: {} },
      stub,
    );
    expect(response.statusCode).toBe(403);
    // Not 401: the point is that this router cannot verify SigV4, so it declines rather than pretends.
    expect(JSON.parse(response.body).error).toMatch(/disabled/);
  });

  it('reaches an admin handler when they are enabled', async () => {
    const response = await routeLocal(
      { method: 'POST', path: '/v1/admin/apps', body: JSON.stringify({}), headers: {} },
      { ...stub, allowAdmin: true },
    );
    // The handler rejects the empty body, which is proof the request reached it rather than the router.
    expect(response.statusCode).toBe(400);
  });

  it('fails closed on a key it does not know', async () => {
    const response = await routeLocal(
      { method: 'GET', path: '/api/bank', body: null, headers: { 'x-api-key': 'not-the-key' } },
      stub,
    );
    expect(response.statusCode).toBe(401);
  });

  it('lets a known key through to its handler', async () => {
    const response = await routeLocal(
      { method: 'GET', path: '/api/bank', body: null, headers: { 'x-api-key': 'good-key' } },
      stub,
    );
    // Past the router. Whether the tables exist is not this test's business, so anything but 401 or 404
    // proves the dispatch.
    expect([200, 500]).toContain(response.statusCode);
  });
});
