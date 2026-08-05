import type { ItemGenerator } from '@gt/contracts';
import { defineGenerator, glyphs, numericDistractors, text } from '../generator-kit.js';

const AUTHOR = 'library-seed';
const AT = '2026-08-05T00:00:00.000Z';

/**
 * Number series with a constant difference. The easiest quantitative family here and the
 * one a k-2 candidate can attempt, since it needs no reading beyond the digits.
 */
const seriesArithmetic = defineGenerator({
  id: 'quant.series.arithmetic',
  version: '1.0.0',
  title: 'Number series, constant difference',
  construct: 'Induction over an additive numeric rule',
  domain: 'quantitative',
  ageBands: ['k-2', '3-5', '6-8'],
  readingLoad: 'none',
  assumedDifficulty: -0.8,
  authoredBy: AUTHOR,
  authoredAt: AT,
  build(rng) {
    const step = rng.pick([2, 3, 4, 5, 6, 7, 10]);
    const start = rng.int(1, 9);
    const terms = [0, 1, 2, 3].map((i) => start + step * i);
    const answer = start + step * 4;
    return {
      prompt: 'What number comes next?',
      stem: glyphs([...terms.map(String), '?']),
      correct: text(String(answer)),
      distractors: numericDistractors(answer, [answer + step, answer - 1, answer + 1]),
    };
  },
});

/** Number series with a constant ratio. Harder, because the step itself grows. */
const seriesMultiplicative = defineGenerator({
  id: 'quant.series.multiplicative',
  version: '1.0.0',
  title: 'Number series, constant ratio',
  construct: 'Induction over a multiplicative numeric rule',
  domain: 'quantitative',
  ageBands: ['3-5', '6-8'],
  readingLoad: 'none',
  assumedDifficulty: 0.4,
  authoredBy: AUTHOR,
  authoredAt: AT,
  build(rng) {
    const ratio = rng.pick([2, 3]);
    const start = rng.int(1, 6);
    // Showing three or four terms is what keeps this family large enough to avoid repeats.
    // With one length and a narrow start range it produced only eight distinct items, which
    // the family-size check rejected at publish time.
    const shown = rng.pick([3, 4]);
    const terms = Array.from({ length: shown }, (_, i) => start * ratio ** i);
    const answer = start * ratio ** shown;
    const last = terms[shown - 1] as number;
    const prev = terms[shown - 2] as number;
    return {
      prompt: 'What number comes next?',
      stem: glyphs([...terms.map(String), '?']),
      correct: text(String(answer)),
      // The first candidate assumes an additive rule, which is the common error here.
      distractors: numericDistractors(answer, [last + (last - prev), answer * ratio, answer - start]),
    };
  },
});

/**
 * Balance. Two sides of a scale drawn as repeated glyphs, and the candidate says how many
 * of one token balance the other. Reading load none, which is why it is in the k-2 set.
 */
const balance = defineGenerator({
  id: 'quant.balance',
  version: '1.0.0',
  title: 'Balance, token equivalence',
  construct: 'Proportional reasoning without notation',
  domain: 'quantitative',
  ageBands: ['k-2', '3-5', '6-8'],
  readingLoad: 'none',
  assumedDifficulty: 0.1,
  authoredBy: AUTHOR,
  authoredAt: AT,
  build(rng) {
    // One heavy token is worth `rate` light ones. Varying the token pair as well as the
    // numbers is what pushes this family past the repeat threshold.
    const [heavy, light] = rng.pick([
      ['■', '●'],
      ['▲', '◆'],
      ['★', '●'],
    ]) as [string, string];
    const rate = rng.int(2, 5);
    const heavyCount = rng.int(2, 5);
    const answer = rate * heavyCount;
    const left = Array.from({ length: heavyCount }, () => heavy);
    const key = Array.from({ length: rate }, () => light);
    return {
      prompt: `One ${heavy} balances ${key.join('')}. How many ${light} balance ${left.join('')}?`,
      stem: glyphs([...left, '=', '?']),
      correct: text(String(answer)),
      distractors: numericDistractors(answer, [answer + rate, heavyCount + rate, answer - rate]),
    };
  },
});

/** Numeric matrix. A row rule and a column rule have to be reconciled. */
const matrixNumeric = defineGenerator({
  id: 'quant.matrix.numeric',
  version: '1.0.0',
  title: 'Numeric matrix, two rules',
  construct: 'Simultaneous induction over rows and columns',
  domain: 'quantitative',
  ageBands: ['3-5', '6-8'],
  readingLoad: 'none',
  assumedDifficulty: 0.9,
  authoredBy: AUTHOR,
  authoredAt: AT,
  build(rng) {
    const rowStep = rng.int(2, 6);
    const colStep = rng.int(2, 6);
    const base = rng.int(1, 5);
    const cell = (r: number, c: number) => base + r * rowStep + c * colStep;
    const cells = [
      String(cell(0, 0)), String(cell(0, 1)), String(cell(0, 2)),
      String(cell(1, 0)), String(cell(1, 1)), String(cell(1, 2)),
      String(cell(2, 0)), String(cell(2, 1)), null,
    ];
    const answer = cell(2, 2);
    return {
      prompt: 'Which number completes the grid?',
      stem: { kind: 'grid', rows: 3, cols: 3, cells },
      correct: text(String(answer)),
      distractors: numericDistractors(answer, [answer + rowStep, answer - colStep, answer + colStep - rowStep]),
    };
  },
});

export const quantitativeGenerators: readonly ItemGenerator[] = [
  seriesArithmetic,
  seriesMultiplicative,
  balance,
  matrixNumeric,
];
