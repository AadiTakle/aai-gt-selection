import { describe, expect, it } from 'vitest';
import {
  HttpError,
  parseJsonBody,
  requireAppId,
  toApiRequest,
  handle,
  ok,
  notFound,
} from './http.js';

/**
 * The served-item token used to live here.
 *
 * It signed which item a session had been handed, because the client told the server what it was answering
 * and that claim could not be trusted. With the trace held server-side the pending response row is already
 * that binding, so the HMAC, its expiry and their tests were deleted rather than carried. See
 * docs/design/platform-qbank-reconciliation.md section 5.2.
 */

describe('request parsing', () => {
  it('reads an API Gateway HTTP API 2.0 event', () => {
    const request = toApiRequest({
      requestContext: {
        http: { method: 'POST', path: '/v1/sessions' },
        authorizer: { lambda: { appId: 'app-1' } },
      },
      headers: { 'Content-Type': 'application/json' },
      body: '{"a":1}',
      pathParameters: { sessionId: 's1' },
    });

    expect(request.method).toBe('POST');
    expect(request.path).toBe('/v1/sessions');
    expect(request.appId).toBe('app-1');
    expect(request.headers['content-type']).toBe('application/json');
    expect(request.pathParameters.sessionId).toBe('s1');
    expect(parseJsonBody<{ a: number }>(request).a).toBe(1);
  });

  it('decodes a base64 body', () => {
    const request = toApiRequest({
      body: Buffer.from('{"b":2}').toString('base64'),
      isBase64Encoded: true,
    });
    expect(parseJsonBody<{ b: number }>(request).b).toBe(2);
  });

  it('rejects a body that is not JSON', () => {
    const request = toApiRequest({ body: 'not json' });
    expect(() => parseJsonBody(request)).toThrow(/not valid JSON/);
  });

  it('takes app identity only from the authorizer, never from the body', () => {
    const request = toApiRequest({ body: JSON.stringify({ appId: 'app-i-wish-i-were' }) });
    expect(request.appId).toBeNull();
    expect(() => requireAppId(request)).toThrow(/no app identity/);
  });
});

describe('the error boundary', () => {
  it('passes a successful response through', async () => {
    const response = await handle({}, async () => ok({ fine: true }));
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ fine: true });
  });

  it('turns an HttpError into its own status code', async () => {
    const response = await handle({}, async () => {
      throw notFound('no such session');
    });
    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body).error).toBe('no such session');
  });

  it('includes structured detail when an error carries it', async () => {
    const response = await handle({}, async () => {
      throw new HttpError(409, 'already answered', { ordinal: 4 });
    });
    expect(JSON.parse(response.body)).toEqual({ error: 'already answered', ordinal: 4 });
  });

  it('says nothing useful to a client about an unexpected failure', async () => {
    const response = await handle({}, async () => {
      throw new Error('connection string postgres://user:password@host');
    });
    expect(response.statusCode).toBe(500);
    expect(response.body).not.toContain('password');
    expect(JSON.parse(response.body)).toEqual({ error: 'internal error' });
  });

  it('never caches a response, because sheets and items are per session', async () => {
    const response = await handle({}, async () => ok({}));
    expect(response.headers['cache-control']).toBe('no-store');
  });
});
