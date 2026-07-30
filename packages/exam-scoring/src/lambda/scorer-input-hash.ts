/**
 * The scorer-input fingerprint, in the ONE form the rest of the system already agreed on.
 *
 * `app.exam_scorer_input_hash` (supabase/migrations/20260725050000_exam_outcome_ownership.sql)
 * is the live implementation: `'sha256:' || encode(digest(convert_to(
 * app.exam_scorer_input_json(session)::text, 'UTF8'), 'sha256'), 'hex')`. The outcome column,
 * `packages/contracts/src/application.ts` (`/^sha256:[0-9a-f]{64}$/`) and two pgTAP suites all
 * require that shape, and `apps/web/scripts/exam-reconcile-session.ts` recomputes it to prove a
 * stored score still matches its stored trace.
 *
 * This module is the second implementation of the same value. Producing anything else — a
 * different algorithm, a different canonical form, or the same bytes over a different field set —
 * makes the recompute-and-compare gate R7 rests on incapable of ever agreeing, which reads as
 * "verified" while comparing two values that can never be equal. So the rule here is not "hash the
 * input" but "reproduce `app.exam_scorer_input_json(session)::text` byte for byte, then SHA-256
 * it".
 *
 * The two halves are pinned to one shared vector: `scorer-input-hash.vector.ts` (asserted by
 * `scorer-input-hash.test.ts`) and `supabase/tests/140_exam_scorer_input_hash_parity.test.sql`
 * assert the SAME literal hash. Move either implementation and exactly one of them goes red.
 *
 * No `node:crypto`: `../index.ts` re-exports this transitively and
 * `apps/web/src/components/exam/exam-runner.tsx` is a client component that imports that barrel
 * for `scoreExam`, so a Node builtin here lands in the browser bundle.
 */
import type { ScoredItem } from './../types';

/** Thrown when a value has no faithful `jsonb::text` rendering — see {@link renderNumber}. */
export class UncanonicalScorerInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UncanonicalScorerInputError';
  }
}

const encoder = new TextEncoder();

/**
 * jsonb orders object keys by UTF-8 byte length first, then by byte value — NOT lexicographically.
 * That is why the item objects below come out `score, domain, itemId, correct, metrics, typeCode,
 * difficulty`.
 */
function compareJsonbKeys(a: string, b: string): number {
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  if (left.length !== right.length) return left.length - right.length;
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) return left[i]! - right[i]!;
  }
  return 0;
}

/**
 * Postgres renders a jsonb number with the scale it was stored at: a `numeric` of `0.7500` prints
 * `0.7500`, which no JavaScript number can reproduce. Every numeric in `app.exam_item_response`
 * arrives as a `::numeric` cast of a JSON number's text, so its scale is the shortest round-trip
 * form and `String(value)` matches — but the moment a value falls outside that (exponent notation,
 * NaN, Infinity) the two sides would silently disagree, so refuse instead of guessing.
 */
function renderNumber(value: number, path: string): string {
  if (!Number.isFinite(value)) {
    throw new UncanonicalScorerInputError(`${path}: ${String(value)} has no jsonb representation`);
  }
  const text = String(value);
  if (text.includes('e') || text.includes('E')) {
    throw new UncanonicalScorerInputError(
      `${path}: ${text} renders in exponent notation, which Postgres numeric would not produce`,
    );
  }
  return text;
}

/**
 * `jsonb::text` for one value. Postgres separates with `", "` and `": "` (not the compact form
 * `JSON.stringify` emits) and escapes strings exactly as `JSON.stringify` does — verified against
 * Postgres 17 for quotes, backslashes, C0 controls, DEL, `/` and non-BMP characters.
 */
function canonicalValue(value: unknown, path: string): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return renderNumber(value, path);
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((entry, i) => canonicalValue(entry, `${path}[${i}]`)).join(', ')}]`;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      // A key whose value is `undefined` is absent once the payload has been through JSON, so it
      // is absent from the row the database hashed too.
      .filter(([, entry]) => entry !== undefined)
      .sort(([a], [b]) => compareJsonbKeys(a, b));
    const rendered = entries.map(
      ([key, entry]) => `${JSON.stringify(key)}: ${canonicalValue(entry, `${path}.${key}`)}`,
    );
    return `{${rendered.join(', ')}}`;
  }
  throw new UncanonicalScorerInputError(`${path}: ${typeof value} is not representable in jsonb`);
}

/**
 * `app.exam_scorer_input_json(session)::text` for a trace held in memory.
 *
 * The field set is the database's, not this package's: itemId, typeCode, domain, difficulty,
 * correct, score, metrics — in administration order. `metrics` IS part of the fingerprint because
 * the database's canonical input includes it; a fingerprint that skipped it could not be compared
 * with the stored one, which is the only thing this value is for.
 */
export function canonicalScorerInput(items: readonly ScoredItem[]): string {
  const rows = items.map((item, index) =>
    canonicalValue(
      {
        itemId: item.itemId,
        typeCode: item.typeCode,
        domain: item.domain,
        difficulty: item.difficulty,
        correct: item.correct,
        score: item.score,
        metrics: item.metrics ?? {},
      },
      `items[${index}]`,
    ),
  );
  return `[${rows.join(', ')}]`;
}

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(value: number, bits: number): number {
  return ((value >>> bits) | (value << (32 - bits))) >>> 0;
}

/**
 * FIPS 180-4 SHA-256. Hand-rolled only because this module has to stay free of Node builtins (see
 * the file docblock); `scorer-input-hash.test.ts` pins it against `node:crypto` so it cannot drift
 * into being quietly wrong.
 */
export function sha256Hex(bytes: Uint8Array): string {
  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const padded = new Uint8Array((((bytes.length + 8) >> 6) << 6) + 64);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  const bitLength = bytes.length * 8;
  view.setUint32(padded.length - 8, Math.floor(bitLength / 0x100000000));
  view.setUint32(padded.length - 4, bitLength >>> 0);

  const w = new Uint32Array(64);
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i += 1) {
      const x = w[i - 15]!;
      const y = w[i - 2]!;
      const s0 = rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3);
      const s1 = rotr(y, 17) ^ rotr(y, 19) ^ (y >>> 10);
      w[i] = (w[i - 16]! + s0 + w[i - 7]! + s1) >>> 0;
    }

    let a = h[0]!;
    let b = h[1]!;
    let c = h[2]!;
    let d = h[3]!;
    let e = h[4]!;
    let f = h[5]!;
    let g = h[6]!;
    let hh = h[7]!;
    for (let i = 0; i < 64; i += 1) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + s1 + ch + SHA256_K[i]! + w[i]!) >>> 0;
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (s0 + maj) >>> 0;
      hh = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    h[0] = (h[0]! + a) >>> 0;
    h[1] = (h[1]! + b) >>> 0;
    h[2] = (h[2]! + c) >>> 0;
    h[3] = (h[3]! + d) >>> 0;
    h[4] = (h[4]! + e) >>> 0;
    h[5] = (h[5]! + f) >>> 0;
    h[6] = (h[6]! + g) >>> 0;
    h[7] = (h[7]! + hh) >>> 0;
  }

  let hex = '';
  for (const word of h) hex += word.toString(16).padStart(8, '0');
  return hex;
}

/**
 * `sha256:<64 hex>` over the canonical scorer input — the same value
 * `app.exam_scorer_input_hash` records for the same trace.
 *
 * Throws {@link UncanonicalScorerInputError} rather than return a hash it cannot vouch for; the
 * lambda handler turns that into a refusal so its own "never throws" contract still holds.
 */
export function scorerInputFingerprint(items: readonly ScoredItem[]): string {
  return `sha256:${sha256Hex(encoder.encode(canonicalScorerInput(items)))}`;
}
