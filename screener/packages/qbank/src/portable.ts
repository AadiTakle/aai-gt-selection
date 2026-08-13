/**
 * Caller-held session state.
 *
 * **Decided by Felipe, 8 Aug 2026: the caller holds the session, not DynamoDB.** It fits the goal of this
 * workstream — a Pokémon game or a family portal should not have to provision a table to ask two questions —
 * and with `selectNext` and `grade` already pure (3.1) it is the last thing standing between this engine and
 * a stateless deployment. The cost is that the session now lives with the party that has the most reason to
 * edit it, which is what this module exists to handle.
 *
 * ## Why the token is sealed and not merely signed
 *
 * The handoff doc says "signed so it cannot be tampered with — a client that can edit its own posterior can
 * hand itself any score". That is right about integrity and silent about confidentiality, and confidentiality
 * turns out to matter more here than it usually does.
 *
 * A signed token is a readable token. The transcript records, for every item, whether the child got it right,
 * plus the running probability that they are above the threshold. **This product refuses to tell a child any
 * of that.** Every item in the catalogue carries the comment "NEUTRAL acknowledgment only — never
 * correct/incorrect", `toServed` strips the answer key before an item crosses to the frame, and the smoke
 * suite asserts all of it three separate times (`scripts/check-practice.py:130`, `:175`, `:244`). Handing the
 * client a signed transcript would defeat those three from a direction none of them is watching: not by
 * leaking the key, but by reporting the outcome.
 *
 * So the state is encrypted with AES-256-GCM, which authenticates as well as conceals. One primitive covers
 * both properties, and there is no version of this where we want integrity without secrecy.
 *
 * ## What is in the token
 *
 * The transcript, the config, the stop reason and the seed. **No posterior.** 3.1 established that
 * `posteriorsFrom(history, pool)` reproduces belief from the transcript bit for bit, so shipping five
 * densities as well would be a second copy of one fact — and two copies of a fact are how they come to
 * disagree. It also keeps the token small: a 40-item transcript against 5 x 161 floats.
 *
 * The config travels *inside* the seal rather than beside it on each request. If the caller supplied the
 * threshold every time, a client could start a session against one bar and finish it against an easier one,
 * and nothing in the engine would notice.
 *
 * ## What this deliberately does not solve
 *
 * A sealed token is a bearer credential: whoever holds it holds that session, and the same token can be
 * presented twice. `issuedAt` and a maximum age bound the window, but nothing here prevents a client
 * replaying an earlier token to retry an item it got wrong — it would simply resume from the older
 * transcript. Preventing that needs server-side memory of what has been spent, which is the thing
 * caller-held state is chosen to avoid. It is a real limitation of the decision rather than a gap in this
 * file, and 3.5 should decide whether the product cares: for a screener whose output is a recommendation and
 * whose stated posture is generous, retrying is a smaller problem than it would be for an exam.
 */

import { createCipheriv, createDecipheriv, hkdfSync, randomBytes, timingSafeEqual } from 'node:crypto';

import type { StopReason } from '@gt/contracts';

import { type PoolEntry, type Posteriors, type QbankAttempt, type QbankSessionConfig, posteriorsFrom } from './engine.js';

/** Bumped only if the sealed shape changes. An old token is refused rather than guessed at. */
const FORMAT = 'gt1';
const ALGORITHM = 'aes-256-gcm';
/** GCM's standard nonce length. Twelve bytes, random per seal, never reused under one key. */
const IV_BYTES = 12;
const KEY_BYTES = 32;

/**
 * How long a token stays usable.
 *
 * A screening session is one sitting, so a day is generous and still bounds the window in which a leaked
 * token is worth anything. Callers running shorter flows should pass something tighter.
 */
export const DEFAULT_MAX_TOKEN_AGE_MS = 24 * 60 * 60 * 1000;

/** Tolerance for a token whose clock ran slightly ahead of the verifier's. */
const FUTURE_TOLERANCE_MS = 60_000;

/** Everything needed to continue a session, and nothing that can be derived. */
export interface PortableSession {
  readonly v: 1;
  /** Epoch milliseconds at seal time, checked against `maxAgeMs` on open. */
  readonly issuedAt: number;
  /** Sealed in rather than supplied per request, so the bar cannot move mid-session. */
  readonly config: QbankSessionConfig;
  readonly history: readonly QbankAttempt[];
  readonly stopReason: StopReason | null;
  readonly seed: number;
}

/**
 * Turn a secret into a key.
 *
 * HKDF rather than a bare hash, so the derivation is domain-separated by the `info` string: the same
 * environment secret used for something else will not produce this key. This is **not** a password KDF —
 * there is no work factor — so the secret has to be high-entropy already, which is the right assumption for a
 * value coming out of a secrets manager and the wrong one for anything a person chose. A 32-byte buffer is
 * passed through untouched.
 */
export function sessionKeyFrom(secret: string | Buffer): Buffer {
  if (Buffer.isBuffer(secret)) {
    if (secret.length !== KEY_BYTES) throw new Error(`a raw session key must be ${KEY_BYTES} bytes, got ${secret.length}`);
    return secret;
  }
  if (secret.length < 16) {
    throw new Error('session secret must be at least 16 characters; it is not stretched, so it must be high-entropy');
  }
  return Buffer.from(hkdfSync('sha256', Buffer.from(secret, 'utf8'), Buffer.alloc(0), 'gt-qbank-session-v1', KEY_BYTES));
}

/**
 * Seal a session into an opaque token.
 *
 * `FORMAT.iv.ciphertext.tag`, each part base64url so the whole thing is safe in a header, a query string or a
 * JSON body. The format prefix is authenticated as additional data, so a token cannot be replayed under a
 * different version's rules.
 */
export function sealSession(session: PortableSession, key: Buffer): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  cipher.setAAD(Buffer.from(FORMAT, 'utf8'));
  const plaintext = Buffer.from(JSON.stringify(session), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [FORMAT, iv.toString('base64url'), ciphertext.toString('base64url'), tag.toString('base64url')].join('.');
}

export interface OpenOptions {
  /** Defaults to `DEFAULT_MAX_TOKEN_AGE_MS`. */
  readonly maxAgeMs?: number;
  /** Injectable so age checks are testable without waiting. */
  readonly now?: number;
}

/**
 * Open a token, or refuse it.
 *
 * Every failure is a refusal and none is a repair. A token that does not authenticate is not evidence of a
 * bug to work around — it is either corruption or an attempt, and the only safe response to both is to
 * decline and make the caller start a session.
 *
 * The error deliberately does not say *why* decryption failed. Distinguishing a bad key from a bad tag tells
 * an attacker which half to keep working on.
 */
export function openSession(token: string, key: Buffer, options: OpenOptions = {}): PortableSession {
  const parts = token.split('.');
  if (parts.length !== 4) throw new Error('session token is malformed');

  const [format, ivPart, bodyPart, tagPart] = parts as [string, string, string, string];
  if (format !== FORMAT) throw new Error(`unsupported session token version ${format}`);
  if (!ivPart || !bodyPart || !tagPart) throw new Error('session token is malformed');

  const iv = Buffer.from(ivPart, 'base64url');
  const ciphertext = Buffer.from(bodyPart, 'base64url');
  const tag = Buffer.from(tagPart, 'base64url');
  if (iv.length !== IV_BYTES || tag.length !== 16 || ciphertext.length === 0) {
    throw new Error('session token is malformed');
  }

  let plaintext: Buffer;
  try {
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAAD(Buffer.from(FORMAT, 'utf8'));
    decipher.setAuthTag(tag);
    plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    throw new Error('session token could not be opened');
  }

  let parsed: PortableSession;
  try {
    parsed = JSON.parse(plaintext.toString('utf8')) as PortableSession;
  } catch {
    throw new Error('session token could not be opened');
  }

  if (parsed.v !== 1) throw new Error(`unsupported session payload version ${String(parsed.v)}`);
  if (!Array.isArray(parsed.history) || typeof parsed.issuedAt !== 'number' || !parsed.config) {
    throw new Error('session token could not be opened');
  }

  const now = options.now ?? Date.now();
  const maxAgeMs = options.maxAgeMs ?? DEFAULT_MAX_TOKEN_AGE_MS;
  if (parsed.issuedAt > now + FUTURE_TOLERANCE_MS) throw new Error('session token is issued in the future');
  if (now - parsed.issuedAt > maxAgeMs) throw new Error('session token has expired');

  return parsed;
}

/**
 * Rebuild the belief a session had reached, from its transcript.
 *
 * The pool is a caller argument for the same reason it is one in `selectNext`: the engine does not load items.
 * Note that the pool has to be the same pool — an item missing from it contributes nothing to the replay, so
 * a caller that narrows the type filter between requests silently discards evidence. Worth stating in the
 * wire contract (3.4).
 */
export function resumeFrom(
  session: PortableSession,
  pool: readonly PoolEntry[],
): { posteriors: Posteriors; history: readonly QbankAttempt[]; stopReason: StopReason | null; config: QbankSessionConfig } {
  const missing = session.history.filter((a) => !pool.some((e) => e.record.itemId === a.itemId));
  if (missing.length > 0) {
    throw new Error(
      `cannot resume: ${missing.length} of ${session.history.length} answered items are absent from the pool, so their evidence would be silently dropped`,
    );
  }
  return {
    posteriors: posteriorsFrom(session.history, pool),
    history: session.history,
    stopReason: session.stopReason,
    config: session.config,
  };
}

/**
 * Constant-time comparison, exported because a caller doing its own token bookkeeping will want it.
 *
 * Not used above — GCM's tag check is already constant-time — but a caller comparing a session id or an
 * idempotency key with `===` reintroduces the timing leak this module avoided.
 */
export function safeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
