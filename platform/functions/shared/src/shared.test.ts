import { describe, expect, it } from 'vitest';
import {
  SERVED_TOKEN_TTL_MS,
  TokenError,
  signServedToken,
  verifyServedToken,
  type ServedTokenClaims,
} from './token.js';
import {
  HttpError,
  parseJsonBody,
  requireAppId,
  toApiRequest,
  handle,
  ok,
  notFound,
} from './http.js';

const SECRET = 'test-signing-secret';

function claims(overrides: Partial<ServedTokenClaims> = {}): ServedTokenClaims {
  return {
    sessionId: 'sess-1',
    ordinal: 3,
    itemId: 'item-9',
    itemRevision: 2,
    expiresAt: Date.now() + SERVED_TOKEN_TTL_MS,
    ...overrides,
  };
}

describe('served item tokens', () => {
  it('round trips the claims it was given', () => {
    const original = claims();
    expect(verifyServedToken(signServedToken(original, SECRET), SECRET)).toEqual(original);
  });

  it('rejects a token signed with a different secret', () => {
    const token = signServedToken(claims(), 'other-secret');
    expect(() => verifyServedToken(token, SECRET)).toThrow(TokenError);
  });

  it('rejects a tampered payload', () => {
    const token = signServedToken(claims(), SECRET);
    const [payload, signature] = token.split('.') as [string, string];
    const forged = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as ServedTokenClaims;
    const tampered = Buffer.from(JSON.stringify({ ...forged, itemId: 'item-i-prefer' })).toString(
      'base64url',
    );
    expect(() => verifyServedToken(`${tampered}.${signature}`, SECRET)).toThrow(
      /signature does not verify/,
    );
  });

  it('rejects an expired token', () => {
    const token = signServedToken(claims({ expiresAt: Date.now() - 1 }), SECRET);
    expect(() => verifyServedToken(token, SECRET)).toThrow(/expired/);
  });

  it('rejects a malformed token rather than throwing something unhelpful', () => {
    for (const bad of ['', 'nodot', 'a.b.c']) {
      expect(() => verifyServedToken(bad, SECRET)).toThrow(TokenError);
    }
  });

  it('rejects a signature of the wrong length without throwing from timingSafeEqual', () => {
    const token = signServedToken(claims(), SECRET);
    const [payload] = token.split('.') as [string];
    expect(() => verifyServedToken(`${payload}.QQ`, SECRET)).toThrow(
      /signature does not verify/,
    );
  });

  it('refuses to sign or verify with an empty secret', () => {
    expect(() => signServedToken(claims(), '')).toThrow(/empty secret/);
    expect(() => verifyServedToken('a.b', '')).toThrow(/empty secret/);
  });

  it('binds the ordinal, so a token cannot be replayed into another slot', () => {
    const token = signServedToken(claims({ ordinal: 3 }), SECRET);
    expect(verifyServedToken(token, SECRET).ordinal).toBe(3);
  });
});

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
