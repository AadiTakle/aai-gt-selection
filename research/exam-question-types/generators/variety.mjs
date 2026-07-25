// Item-variety ledger, shared by the generators that need one.
//
// WHY THIS IS NOT A PLAIN "have I emitted this JSON before?" CHECK
// ----------------------------------------------------------------
// `qa/audit_banks.mjs` counts an EXACT duplicate with an order-sensitive
// fingerprint and a NEAR duplicate with an order-insensitive one. A generator
// that de-duplicates on the exact form can always satisfy itself by dealing the
// same options in a different order: the exact-duplicate count falls, the child
// still sees the same question twice, and the redundancy simply moves into the
// near-duplicate bucket. So the ledger's primary key is the ORDER-INSENSITIVE
// form — the same canonicalisation the auditor uses for near duplicates — and a
// rejected attempt has to change the question, not the seating.
//
// Because that key ignores option order, accepting or rejecting an attempt is
// statistically independent of where the correct option landed. The ledger can
// therefore be consulted without disturbing a bank's correct-key balance,
// PROVIDED the caller consults it BEFORE allocating a key slot (see
// QUANT-BALANCE-01 / SPA-PICKFOLD-01: a rejected attempt must not consume a
// slot).
//
// TWO TIERS, BOTH BOUNDED
// -----------------------
// `wants(content, strict)` is `true` for a fresh stimulus when strict, and for
// merely-fresh bytes when not. Callers spend a bounded budget of attempts
// asking for a fresh stimulus and then, rather than dropping the item and
// shrinking the bank, fall back to asking only for fresh bytes. Rungs whose
// parameter space is genuinely smaller than their item count therefore keep
// their item count and stay exactly as redundant as they are today, instead of
// silently losing items — and no bank can ever emit the same bytes twice.

import { createHash } from 'node:crypto';

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value).sort()) out[k] = canonical(value[k]);
    return out;
  }
  return value;
}

const digest = (value) => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex').slice(0, 16);

/** Prose fields the auditor drops before comparing (they restate the task). */
const PROSE = new Set(['prompt', 'question', 'ruletext', 'directions', 'story', 'note']);

/**
 * The auditor's near-duplicate view: drop prose, and collapse any array whose
 * every element is a keyed option into an ORDER-INDEPENDENT set of payloads.
 * Kept byte-compatible with `nearCanonical` in qa/audit_banks.mjs.
 */
function stimulusView(content) {
  const strip = (node) => {
    if (Array.isArray(node)) {
      const mapped = node.map(strip);
      const allKeyed = node.every((e) => e && typeof e === 'object' && !Array.isArray(e) && 'key' in e);
      if (allKeyed) {
        return mapped
          .map((e) => {
            const { key, ...rest } = e;
            return rest;
          })
          .map((e) => JSON.stringify(canonical(e)))
          .sort();
      }
      return mapped;
    }
    if (node && typeof node === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(node)) {
        if (PROSE.has(k.toLowerCase()) && typeof v === 'string') continue;
        out[k] = strip(v);
      }
      return out;
    }
    return node;
  };
  return strip(content);
}

/** Order-insensitive: two items with this key pose the same question. */
export const stimulusKey = (content) => digest(stimulusView(content));

/** Order-sensitive: two items with this key serialise to the same bytes. */
export const contentKey = (content) => digest(content ?? null);

export class VarietyLedger {
  constructor() {
    this.stimuli = new Set();
    this.contents = new Set();
  }

  /**
   * May this content be emitted? `strict` demands a question the bank has not
   * asked yet; otherwise only the exact bytes have to be new.
   */
  wants(content, strict = true) {
    if (this.contents.has(contentKey(content))) return false;
    return strict ? !this.stimuli.has(stimulusKey(content)) : true;
  }

  /** Record an accepted item. Safe to call with the pre-seating draft: seating
   *  only permutes options, which neither key can see (contentKey is taken
   *  from the emitted content, so callers pass that). */
  add(content) {
    this.stimuli.add(stimulusKey(content));
    this.contents.add(contentKey(content));
  }
}
