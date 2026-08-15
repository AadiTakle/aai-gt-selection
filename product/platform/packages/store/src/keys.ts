/**
 * Every key string in the platform, in one file.
 *
 * Nothing else in this package may build a `PK`, an `SK`, or a global-secondary-index key with a
 * template literal. A single-table design is only readable if the key grammar lives in one place;
 * once key construction spreads across repositories, a typo in one query silently returns nothing
 * rather than failing, and the shape of the table stops being knowable from the code.
 *
 * The grammar is `docs/design/aws-question-platform.md` sections 6.1 and 6.3. Where this file
 * deviates from the spec text, the reason is stated at the deviation.
 */

/**
 * Ordinals and revisions are zero-padded so that lexicographic sort order matches numeric order.
 *
 * Without padding, `RESP#10` sorts before `RESP#2`, which would make an ordered query over a
 * session's trace return the responses in the wrong sequence — and the trace is the authority the
 * whole scoring path replays. Four digits caps a session at 9,999 items, two orders of magnitude
 * above the 40-item cap the stop rule enforces.
 */
const KEY_NUMBER_WIDTH = 4;

function pad(n: number): string {
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(`key number must be a non-negative integer, received ${n}`);
  }
  return String(n).padStart(KEY_NUMBER_WIDTH, '0');
}

/** Exposed for tests and for readers checking a stored key by eye. */
export function padOrdinal(ordinal: number): string {
  return pad(ordinal);
}

/**
 * Spec section 6.1 writes the revision segment as `<rev>` with no stated width. It is padded here
 * for the same ordering reason as an ordinal: an item that reaches revision 10 would otherwise
 * interleave its history rows out of order.
 */
export function padRevision(revision: number): string {
  return pad(revision);
}

// ---------------------------------------------------------------------------
// Main table: gt-platform
// ---------------------------------------------------------------------------

export const META_SK = 'META';

export const TYPE_PK_PREFIX = 'TYPE#';
export const LIFECYCLE_SK_PREFIX = 'LIFECYCLE#';
export const ITEM_SK_PREFIX = 'ITEM#';
export const ITEM_REVISION_SK_PREFIX = 'ITEMREV#';
export const STAT_SK_PREFIX = 'STAT#';
export const APP_PK_PREFIX = 'APP#';
export const APPROVED_TYPE_SK_PREFIX = 'TYPE#';
export const API_KEY_SK_PREFIX = 'KEY#';
export const API_KEY_LOOKUP_PK_PREFIX = 'APIKEY#';
export const SNAPSHOT_PK_PREFIX = 'SNAPSHOT#';
export const CRITERIA_PK_PREFIX = 'CRITERIA#';
export const SESSION_PK_PREFIX = 'SESSION#';
export const RESPONSE_SK_PREFIX = 'RESP#';
export const SHEET_SK_PREFIX = 'SHEET#';
export const OUTBOX_PK_PREFIX = 'OUTBOX#';
export const OUTBOX_SK_PREFIX = 'EVT#';

export function typePk(typeCode: string): string {
  return `${TYPE_PK_PREFIX}${typeCode}`;
}

/** `at` is an ISO-8601 instant, which sorts lexicographically in the order it happened. */
export function lifecycleSk(at: string): string {
  return `${LIFECYCLE_SK_PREFIX}${at}`;
}

export function itemSk(itemId: string): string {
  return `${ITEM_SK_PREFIX}${itemId}`;
}

/**
 * A prior state of an item.
 *
 * `ITEMREV#` does not begin with `ITEM#`, so a `begins_with(SK, 'ITEM#')` query over a type's
 * partition returns current items only and never their history. That is load-bearing: the two
 * collections share a partition and are separated by nothing but this prefix.
 */
export function itemRevisionSk(itemId: string, revision: number): string {
  return `${ITEM_REVISION_SK_PREFIX}${itemId}#${padRevision(revision)}`;
}

/**
 * Per-app served counters for one item.
 *
 * Spec section 6.1 files item statistics under `TYPE#<code>`, but section 9.2 layer 6 defines the
 * exposure rate as `item.servedCount / app.sessionCount` **for the app in question**, and the
 * `incrementExposure(appId, itemId)` signature carries no type code. A counter under the type
 * partition could therefore be neither written nor scoped correctly. The counter lives in the app
 * partition instead, which is the only partition that both callers know.
 */
export function itemStatSk(itemId: string): string {
  return `${STAT_SK_PREFIX}${itemId}`;
}

/**
 * The app's session counter — the denominator of every exposure rate.
 *
 * Deliberately not under the `STAT#` prefix, so it cannot collide with an item whose id happens to
 * be a reserved word, and deliberately not on the `META` row, so a counter update on the hot serve
 * path never rewrites the frozen app configuration.
 */
export const APP_SESSION_STAT_SK = 'SESSIONSTAT';

export function appPk(appId: string): string {
  return `${APP_PK_PREFIX}${appId}`;
}

export function approvedTypeSk(typeCode: string): string {
  return `${APPROVED_TYPE_SK_PREFIX}${typeCode}`;
}

export function apiKeySk(keyHash: string): string {
  return `${API_KEY_SK_PREFIX}${keyHash}`;
}

/**
 * The inverted row that lets an authorizer resolve a key hash to an app in one read.
 *
 * Spec section 13 requires the authorizer to resolve `appId` from a hashed key, and spec section
 * 6.1 stores that key as `APP#<appId> / KEY#<hash>` — which cannot be read without already knowing
 * the app. None of the six indexes in section 6.3 covers a key hash, so the alternatives were a
 * table scan on every authenticated request or this row. It is written in the same transaction as
 * the `KEY#` row so the two cannot diverge.
 */
export function apiKeyLookupPk(keyHash: string): string {
  return `${API_KEY_LOOKUP_PK_PREFIX}${keyHash}`;
}

export function snapshotPk(snapshotId: string): string {
  return `${SNAPSHOT_PK_PREFIX}${snapshotId}`;
}

export function criteriaPk(version: string): string {
  return `${CRITERIA_PK_PREFIX}${version}`;
}

export function sessionPk(sessionId: string): string {
  return `${SESSION_PK_PREFIX}${sessionId}`;
}

export function responseSk(ordinal: number): string {
  return `${RESPONSE_SK_PREFIX}${padOrdinal(ordinal)}`;
}

export const SHEET_CURRENT_SK = `${SHEET_SK_PREFIX}CURRENT`;

export function sheetHistorySk(computedAt: string): string {
  return `${SHEET_SK_PREFIX}${computedAt}`;
}

export function outboxPk(day: string): string {
  return `${OUTBOX_PK_PREFIX}${dayBucket(day)}`;
}

export function outboxSk(eventId: string): string {
  return `${OUTBOX_SK_PREFIX}${eventId}`;
}

// ---------------------------------------------------------------------------
// Time buckets
// ---------------------------------------------------------------------------

/**
 * `yyyy-mm` for GSI3, from either an ISO instant or a month already in either notation.
 *
 * Accepting `202608` as well as `2026-08` is defensive: `sessionsForApp` takes the bucket as a
 * string from a caller that may have formatted it either way, and a silently wrong partition key
 * returns an empty list rather than an error.
 */
export function monthBucket(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 6) throw new Error(`cannot read a yyyy-mm bucket from ${JSON.stringify(value)}`);
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}`;
}

/** `yyyy-mm-dd` for the outbox partition, from an ISO instant or an already-bucketed date. */
export function dayBucket(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 8) throw new Error(`cannot read a yyyy-mm-dd bucket from ${JSON.stringify(value)}`);
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

// ---------------------------------------------------------------------------
// Index keys, spec section 6.3
// ---------------------------------------------------------------------------

export const GSI1 = 'GSI1';
export const GSI2 = 'GSI2';
export const GSI3 = 'GSI3';
export const GSI4 = 'GSI4';
export const GSI5 = 'GSI5';
export const GSI6 = 'GSI6';

/** GSI1 — every session that ever served an item. The item-correction backfill, section 11.1. */
export function gsi1Pk(itemId: string): string {
  return `${ITEM_SK_PREFIX}${itemId}`;
}

export function gsi1Sk(sessionId: string, ordinal: number): string {
  return `${SESSION_PK_PREFIX}${sessionId}#${padOrdinal(ordinal)}`;
}

/** GSI2 — a persona's session history, newest first when read backwards. */
export function gsi2Pk(personaId: string): string {
  return `PERSONA#${personaId}`;
}

export function gsi2Sk(startedAt: string, sessionId: string): string {
  return `${startedAt}#${sessionId}`;
}

/** GSI3 — per-app operations, month-bucketed so one app cannot become one hot partition. */
export function gsi3Pk(appId: string, month: string): string {
  return `${APP_PK_PREFIX}${appId}#${monthBucket(month)}`;
}

export function gsi3Sk(startedAt: string, sessionId: string): string {
  return `${startedAt}#${sessionId}`;
}

/**
 * GSI4 — sparse by design. Written only onto a `SHEET#CURRENT` row that crossed the bar, so
 * "who newly qualified" is a query rather than a scan. A sheet that stops qualifying loses the
 * attributes and leaves the index, which is why sheets are written with `Put` and never `Update`.
 */
export function gsi4Pk(criteriaVersion: string): string {
  return `QUALIFIED#${criteriaVersion}`;
}

export function gsi4Sk(decidedAt: string, sessionId: string): string {
  return `${decidedAt}#${sessionId}`;
}

/** GSI5 — which sessions used a snapshot, i.e. the blast radius of a bad publish. */
export function gsi5Pk(snapshotId: string): string {
  return `${SNAPSHOT_PK_PREFIX}${snapshotId}`;
}

export function gsi5Sk(sessionId: string): string {
  return `${SESSION_PK_PREFIX}${sessionId}`;
}

/**
 * GSI6 — a weak network-linkage hint, never an identity (spec section 12.1).
 *
 * No method on `PlatformStore` populates it: `putSession` receives a `SessionRecord`, and neither
 * that record nor the method signature carries an address hash. The builder and the index exist so
 * that the writing path can be added without a migration, and so the index name is declared in one
 * place. Until then the index is empty.
 */
export function gsi6Pk(netHint: string): string {
  return `NETHINT#${netHint}`;
}

export function gsi6Sk(startedAt: string, sessionId: string): string {
  return `${startedAt}#${sessionId}`;
}

// ---------------------------------------------------------------------------
// The two separate tables, spec section 6.4
// ---------------------------------------------------------------------------

export function answerKeyPk(itemId: string): string {
  return `${ITEM_SK_PREFIX}${itemId}`;
}

export function answerKeyRevisionSk(revision: number): string {
  return `REV#${padRevision(revision)}`;
}

export function personaPk(personaId: string): string {
  return `PERSONA#${personaId}`;
}

export const PERSONA_META_SK = 'META';

/** The only row holding PII. Deleting it satisfies an erasure request; `META` survives. */
export const PERSONA_CONTACT_SK = 'CONTACT';

// ---------------------------------------------------------------------------
// Stripping keys back off on read
// ---------------------------------------------------------------------------

export const PK = 'PK';
export const SK = 'SK';

/**
 * Attributes this package adds to a domain object on the way in, and must remove on the way out.
 *
 * A round trip is expected to return the domain shape and nothing else, so that a caller cannot
 * accidentally start depending on a storage detail and so that `toEqual` in a test is a real
 * assertion rather than a subset check.
 */
export const KEY_ATTRIBUTES: readonly string[] = [
  PK,
  SK,
  'GSI1PK',
  'GSI1SK',
  'GSI2PK',
  'GSI2SK',
  'GSI3PK',
  'GSI3SK',
  'GSI4PK',
  'GSI4SK',
  'GSI5PK',
  'GSI5SK',
  'GSI6PK',
  'GSI6SK',
  'ttl',
];

export function stripKeys<T>(item: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(item)) {
    if (KEY_ATTRIBUTES.includes(key)) continue;
    out[key] = value;
  }
  return out as T;
}
