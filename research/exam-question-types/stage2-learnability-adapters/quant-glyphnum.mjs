// QUANT-GLYPHNUM-01 adapter — glyph -> base-6 digit, 5! = 120 candidate systems.
//
// THE ONE PLACE THIS TYPE IS GENUINELY DIFFERENT, and it is worth stating because it is what the
// shared abstraction had to be shaped around: the child never sees the system act. There is no
// "before" and "after". The item shows a numeral, an anchor numeral that fixes the top of a number
// line, and a slider; the reveal is WHERE ON THE LINE the numeral sat. So the observable is a
// POSITION, not a transformed stimulus, and a mapping is consistent with a reveal when the position
// it computes falls inside the same accepting interval.
//
// WHAT THE REBUILD (D-211) CHANGED HERE. The response used to be one of five marked ticks, so the
// oracle's "which on-screen option does this mapping predict" question had an obvious answer. With a
// slider there are no options — but there is still a FINITE response space, because grading is
// `|placedRatio - targetRatio| <= tolerance` and a tolerance cuts the line into disjoint accepting
// intervals. Those intervals are this type's response keys: `b0`, `b1`, ... over the support. That is
// the same object the five ticks were, at the resolution the grading actually distinguishes, so the
// oracle needs no new concepts — only `responseKeysOf`, which the core reads through the adapter and
// which the three keyed types do not supply.
//
// TWO CONSEQUENCES the other types do not have:
//
//   1. EVERY TRIAL CONSTRAINS FIVE GLYPHS AT ONCE, not the two or three a chain touches, because the
//      anchor is part of the stimulus and the ratio depends on both sides. A single reveal is
//      therefore worth far more here, and the first-deducible trials come in much earlier.
//   2. THE OBSERVABLE IS A QUOTIENT WITHIN A TOLERANCE, so it is invariant to anything that scales
//      both sides AND to anything that moves the ratio by less than the band. Two mappings that
//      disagree about the glyphs can land in the same interval and neither is eliminated. That is the
//      type's own version of the reference's "a composition can be determined without its
//      factorisation being determined", and it is why full determination of the vocabulary is not
//      guaranteed however many trials run. The tolerance makes it strictly weaker than the old
//      five-tick reveal, which is the price of a response with no distractors to leak.
//
// The notation's arithmetic and its band geometry are imported from the generator that wrote the
// bank, never restated.

import {
  DIGITS,
  GLYPHS,
  SUPPORT_MAX,
  SUPPORT_MIN,
  TOLERANCE_RATIO,
  valueOf,
} from '../generators/QUANT-GLYPHNUM-01.mjs';

/** Accepting intervals across the support: the response space grading can actually distinguish. */
const BAND_WIDTH = 2 * TOLERANCE_RATIO;
const BAND_COUNT = Math.max(1, Math.round((SUPPORT_MAX - SUPPORT_MIN) / BAND_WIDTH));
const BAND_KEYS = Array.from({ length: BAND_COUNT }, (_, i) => `b${i}`);

/** Which accepting interval a position falls in. Positions off the support clamp to the ends. */
function bandOf(ratio) {
  const index = Math.floor((ratio - SUPPORT_MIN) / BAND_WIDTH);
  return BAND_KEYS[Math.max(0, Math.min(BAND_COUNT - 1, index))];
}

export const adapter = {
  id: 'quant-glyphnum',
  typeCode: 'QUANT-GLYPHNUM-01',
  vocabulary: `5 glyphs -> 5 base-6 digits {${DIGITS.join(',')}}`,
  primitives: [...GLYPHS],
  values: [...DIGITS],

  /** Numeral AND anchor: the position depends on both, so a reveal constrains both. */
  primitivesUsedBy: (item) => [
    ...new Set([...item.content.expression, ...item.content.line.maxExpression]),
  ],

  /** The response space: accepting intervals, not options. Read by the core through this hook. */
  responseKeysOf: () => [...BAND_KEYS],

  predictedKeys(item, assignment) {
    const anchor = valueOf(item.content.line.maxExpression.map((g) => assignment[g]));
    // A mapping that reads the anchor as zero puts the line's top at the origin, which is not a
    // number line at all. It predicts nothing rather than dividing by zero.
    if (anchor <= 0) return [];
    const ratio = valueOf(item.content.expression.map((g) => assignment[g])) / anchor;
    // A prediction outside the support is still a prediction, and it is one the bank never keys — so
    // it is eliminated by any reveal, which is the correct behaviour rather than a clamp.
    if (ratio < SUPPORT_MIN - BAND_WIDTH || ratio > SUPPORT_MAX + BAND_WIDTH) return [];
    return [bandOf(ratio)];
  },

  /** The reveal, in the same currency: which accepting interval the machine's position fell in. */
  correctKeyOf: (item) => bandOf(item.reviewerOnly.correctKey),
  /** Both sides, because both are what the equated warm-up chooser must keep disjoint. */
  hiddenChainOf: (raw) => [...raw.answer.expressionDigits, ...raw.answer.anchorDigits],
  describe: (item) => `L${item.content.expression.length}`,
};
