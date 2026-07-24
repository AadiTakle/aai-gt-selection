import type { IrtParameters } from '@gt-selection/contracts';

/**
 * Item Response Theory primitives (2PL / 3PL) for the adaptive engine (AX-02).
 * Pure numeric functions; no I/O, no framework, no Supabase.
 */

/** Probability of a correct response at ability `theta` under the 2PL/3PL model. */
export function probabilityCorrect(theta: number, irt: IrtParameters): number {
  const { a, b, c } = irt;
  const logistic = 1 / (1 + Math.exp(-a * (theta - b)));
  return c + (1 - c) * logistic;
}

/**
 * Fisher item information at `theta`. For the 3PL:
 *   I = a^2 * (q/p) * ((p - c)/(1 - c))^2
 * which reduces to the 2PL a^2 * p * q when c = 0.
 */
export function itemInformation(theta: number, irt: IrtParameters): number {
  const { a, c } = irt;
  const p = probabilityCorrect(theta, irt);
  const q = 1 - p;
  if (p <= 0 || p >= 1) return 0;
  const denom = p * (1 - c) * (1 - c);
  if (denom === 0) return 0;
  return (a * a * q * (p - c) * (p - c)) / denom;
}

/** Log-likelihood of one dichotomous response, guarded against log(0). */
export function responseLogLikelihood(theta: number, irt: IrtParameters, correct: boolean): number {
  const p = probabilityCorrect(theta, irt);
  const eps = 1e-12;
  return correct ? Math.log(Math.max(p, eps)) : Math.log(Math.max(1 - p, eps));
}

/** Total test information at `theta` across a set of items. */
export function testInformation(theta: number, items: readonly IrtParameters[]): number {
  let sum = 0;
  for (const irt of items) sum += itemInformation(theta, irt);
  return sum;
}
