import type { RawBankItem } from '../bank-loader';

/**
 * Verdict for one item: correctness plus any key-dependent metrics that only the
 * server can compute.
 */
export interface Verdict {
  correct: boolean;
  metrics?: Record<string, number>;
}

/**
 * Grades one response against the server-only answer key.
 *
 * A verifier receives the whole bank item, so it can re-derive the expected
 * response from `content` + `answer` rather than trusting a stored key. It must
 * never return a verdict derived from anything the client sent other than
 * `response`, and must return `{ correct: false }` rather than throwing on a
 * malformed response.
 */
export type Verifier = (item: RawBankItem, response: Record<string, unknown>) => Verdict;

export function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function numArray(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  const out: number[] = [];
  for (const entry of value) {
    const n = num(entry);
    if (n === null) return null;
    out.push(n);
  }
  return out;
}

/** Proportion of `expected` recovered in the same positions. 0 when shapes differ. */
export function positionalOverlap(expected: readonly number[], got: readonly number[]): number {
  if (expected.length === 0) return 0;
  let hits = 0;
  for (let i = 0; i < expected.length; i++) if (got[i] === expected[i]) hits++;
  return hits / expected.length;
}

/** Set overlap ignoring order, as a proportion of `expected`. */
export function setOverlap(expected: readonly number[], got: readonly number[]): number {
  if (expected.length === 0) return 0;
  const pool = new Set(got);
  let hits = 0;
  for (const value of expected) if (pool.has(value)) hits++;
  return hits / expected.length;
}
