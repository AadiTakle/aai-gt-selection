import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * The served-item token.
 *
 * When an app submits a response it says which item it is answering. Believing that claim would let
 * a client answer any item it liked — including one it had already seen the difficulty of — so the
 * serving function signs what it actually served and the scoring function verifies the signature
 * rather than trusting the body.
 *
 * The ordinal is inside the signature as well as the item, because the response row is addressed by
 * ordinal. Without it a client could replay a valid token against a different slot in its own
 * session.
 *
 * This is the one place in selection and scoring that needs real cryptography. The variety RNG does
 * not: it decides which of several near-equivalent questions to ask, and an attacker who predicts
 * that gains nothing.
 */

export interface ServedTokenClaims {
  readonly sessionId: string;
  readonly ordinal: number;
  readonly itemId: string;
  readonly itemRevision: number;
  /** Unix milliseconds. */
  readonly expiresAt: number;
}

export class TokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenError';
  }
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

function sign(payload: string, secret: string): Buffer {
  return createHmac('sha256', secret).update(payload).digest();
}

export function signServedToken(claims: ServedTokenClaims, secret: string): string {
  if (!secret) throw new TokenError('refusing to sign with an empty secret');
  const payload = b64url(JSON.stringify(claims));
  return `${payload}.${b64url(sign(payload, secret))}`;
}

export function verifyServedToken(
  token: string,
  secret: string,
  now: number = Date.now(),
): ServedTokenClaims {
  if (!secret) throw new TokenError('refusing to verify with an empty secret');

  const parts = token.split('.');
  if (parts.length !== 2) throw new TokenError('malformed served token');
  const [payload, signature] = parts as [string, string];

  const expected = sign(payload, secret);
  const actual = Buffer.from(signature, 'base64url');
  // Length must match before timingSafeEqual, which throws on a mismatch rather than returning false.
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new TokenError('served token signature does not verify');
  }

  let claims: ServedTokenClaims;
  try {
    claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as ServedTokenClaims;
  } catch {
    throw new TokenError('served token payload is not readable');
  }

  if (
    typeof claims.sessionId !== 'string' ||
    typeof claims.ordinal !== 'number' ||
    typeof claims.itemId !== 'string' ||
    typeof claims.itemRevision !== 'number' ||
    typeof claims.expiresAt !== 'number'
  ) {
    throw new TokenError('served token payload is missing required claims');
  }

  if (claims.expiresAt <= now) throw new TokenError('served token has expired');

  return claims;
}

/**
 * How long a served item stays answerable.
 *
 * Long enough that a child can think, short enough that a token cannot be banked for later. A
 * session that exceeds this asks for the item again rather than failing, so the cost of expiry is a
 * repeated fetch and not a lost session.
 */
export const SERVED_TOKEN_TTL_MS = 30 * 60 * 1000;
