/**
 * Item response function and item information.
 *
 * Three-parameter logistic with the guessing floor pinned to 1/nOptions rather than
 * estimated. On a four-option multiple-choice item a candidate who knows nothing still
 * answers correctly a quarter of the time, and a model that ignores that reads guesses as
 * partial knowledge. Pinning it is the honest move when nothing is calibrated yet, since
 * estimating c needs far more data than estimating b.
 */

export interface ItemParams {
  /** Difficulty, in logits. */
  readonly b: number;
  /** Discrimination. Held at 1 for uncalibrated items, which makes this Rasch-like. */
  readonly a: number;
  /** Lower asymptote. Pinned to 1 / number of options. */
  readonly c: number;
}

export function paramsFor(b: number, optionCount: number, a = 1.0): ItemParams {
  return { b, a, c: optionCount > 0 ? 1 / optionCount : 0 };
}

/** Probability of a correct response at ability theta. */
export function pCorrect(theta: number, p: ItemParams): number {
  const logistic = 1 / (1 + Math.exp(-p.a * (theta - p.b)));
  return p.c + (1 - p.c) * logistic;
}

/**
 * Fisher information at theta. This is what item selection maximises, and the argument it
 * gets evaluated at is the whole design decision: passing the decision threshold rather
 * than the running ability estimate is what makes this a classification engine.
 */
export function information(theta: number, p: ItemParams): number {
  const P = pCorrect(theta, p);
  if (P <= p.c || P >= 1) return 0;
  const num = (P - p.c) / (1 - p.c);
  return p.a * p.a * ((1 - P) / P) * num * num;
}
