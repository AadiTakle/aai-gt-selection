import type { DomainKey, ItemParameters, RawResponse, ScoringPolicy, ScreeningResult } from './types';
import { scoreItems } from './item-scoring';
import { buildResult } from './result';

/**
 * Deterministic replay verifier (R7 / D-019).
 *
 * Given a session response log, a session seed, and pinned item parameters (the
 * server-side answer keys + IRT + RTE floors), reproduce the score /
 * classification bit-for-bit on every re-run. All computation is pure and any
 * randomness is seeded (`rng.ts`), so identical inputs always yield an identical
 * canonical result. This is the unit that a Lambda deploys and that an audit
 * re-invokes to prove a stored decision.
 */

/** Everything needed to reproduce a score bit-for-bit. */
export interface ReplayInput {
  /** The ordered session response log. */
  log: readonly RawResponse[];
  /** Pinned item parameters (holds answer keys + IRT + RTE floors). */
  items: readonly ItemParameters[];
  /** Tunable scoring policy (pinned by `policyVersion`). */
  policy: ScoringPolicy;
  /** Session seed (feeds the seeded confidence bootstrap). */
  seed: string;
  /** Domains to score; defaults to the policy `fitWeights` keys (sorted). */
  domains?: readonly DomainKey[];
  /** Bootstrap iterations for confidence (pinned; default 200). */
  confidenceIterations?: number;
}

/** Run the engine over a replay input and produce the canonical result. */
export function runScoring(input: ReplayInput): ScreeningResult {
  const paramsById = new Map<string, ItemParameters>(input.items.map((p) => [p.itemId, p]));
  const scored = scoreItems(input.log, paramsById);
  const domains = (input.domains ?? Object.keys(input.policy.fitWeights)).slice().sort();
  return buildResult({
    items: scored,
    domains,
    policy: input.policy,
    seed: input.seed,
    confidenceIterations: input.confidenceIterations ?? 200,
  });
}

function normalizeNumber(value: number, precision: number): number {
  if (!Number.isFinite(value)) return value;
  const rounded = Number(value.toFixed(precision));
  return rounded === 0 ? 0 : rounded;
}

function sortValue(value: unknown, precision: number): unknown {
  if (typeof value === 'number') return normalizeNumber(value, precision);
  if (Array.isArray(value)) return value.map((v) => sortValue(v, precision));
  if (value !== null && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      out[key] = sortValue(source[key], precision);
    }
    return out;
  }
  return value;
}

/**
 * Deterministically serialize a value with sorted object keys and quantized
 * numbers (default 10 dp, `-0` normalized to `0`) so two equal results serialize
 * to the identical string — the basis of the bit-for-bit replay check.
 */
export function canonicalize(value: unknown, precision = 10): string {
  return JSON.stringify(sortValue(value, precision));
}

function fnv1a(str: string, seed: number): number {
  let h = seed >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Stable 64-bit hex fingerprint of a result's canonical form. */
export function fingerprint(result: ScreeningResult, precision = 10): string {
  const canon = canonicalize(result, precision);
  const h1 = fnv1a(canon, 0x811c9dc5);
  const h2 = fnv1a(canon, 0x1b873593);
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}

/** Outcome of a two-run replay verification. */
export interface ReplayVerification {
  /** True when the two independent runs are byte-identical. */
  identical: boolean;
  /** Shared 64-bit fingerprint of the canonical result. */
  fingerprint: string;
  first: ScreeningResult;
  second: ScreeningResult;
}

/**
 * Run scoring twice on the same input and prove the outputs are byte-identical
 * (deterministic replay). Returns both results and the shared fingerprint.
 */
export function verifyReplay(input: ReplayInput): ReplayVerification {
  const first = runScoring(input);
  const second = runScoring(input);
  const canonFirst = canonicalize(first);
  const canonSecond = canonicalize(second);
  const f1 = fingerprint(first);
  const f2 = fingerprint(second);
  return {
    identical: canonFirst === canonSecond && f1 === f2,
    fingerprint: f1,
    first,
    second,
  };
}

/** Verify that a re-run reproduces a previously-recorded fingerprint (audit replay). */
export function matchesFingerprint(input: ReplayInput, expected: string): boolean {
  return fingerprint(runScoring(input)) === expected;
}
