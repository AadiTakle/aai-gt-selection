// QUANT-GLYPHNUM-01 adapter — glyph -> numeral role, 5! = 120 candidate systems.
//
// THE ONE PLACE THIS TYPE IS GENUINELY DIFFERENT, and it is worth stating because it is what the
// shared abstraction had to be shaped around: the child never sees the system act. There is no
// "before" and "after". The item shows an expression, an anchor expression that fixes the top of a
// number line, and a set of ticks; the reveal is WHERE ON THE LINE the expression sat. So the
// observable is a RATIO, not a transformed stimulus, and a mapping is consistent with a reveal when
// the ratio it computes matches — which is exactly "it predicts the revealed option".
//
// TWO CONSEQUENCES the other types do not have:
//
//   1. EVERY TRIAL CONSTRAINS FIVE GLYPHS AT ONCE, not the two or three a chain touches, because the
//      anchor is part of the stimulus and the ratio depends on both sides. A single reveal is
//      therefore worth far more here, and the first-deducible trials come in much earlier.
//   2. THE OBSERVABLE IS A QUOTIENT, so it is invariant to anything that scales both sides. Two
//      mappings that disagree about the glyphs can produce the same ratio and neither is eliminated.
//      That is the type's own version of the reference's "a composition can be determined without
//      its factorisation being determined", and it is why full determination of the vocabulary is
//      not guaranteed however many trials run.
//
// The notation's arithmetic is imported from the generator that wrote the bank, never restated.
// `valueOf` is TOTAL by design there, precisely so wrong mappings — which turn scales into digits
// and produce sequences the grammar would never emit — get a value rather than being silently
// dropped from the hypothesis space.

import { GLYPHS, ROLES, valueOf } from '../generators/QUANT-GLYPHNUM-01.mjs';

/** The tick grid the bank's option ratios are already rounded to. Kept identical to the generator. */
const round6 = (x) => Math.round(x * 1e6) / 1e6;

export const adapter = {
  id: 'quant-glyphnum',
  typeCode: 'QUANT-GLYPHNUM-01',
  vocabulary: '5 glyphs -> 5 numeral roles',
  primitives: [...GLYPHS],
  values: [...ROLES],

  /** Expression AND anchor: the ratio depends on both, so a reveal constrains both. */
  primitivesUsedBy: (item) => [
    ...new Set([...item.content.expression, ...item.content.line.maxExpression]),
  ],

  predictedKeys(item, assignment) {
    const anchor = valueOf(item.content.line.maxExpression.map((g) => assignment[g]));
    // A mapping that reads the anchor as zero puts the line's top at the origin, which is not a
    // number line at all. It predicts nothing rather than dividing by zero.
    if (anchor <= 0) return [];
    const ratio = round6(valueOf(item.content.expression.map((g) => assignment[g])) / anchor);
    return item.content.options.filter((o) => round6(o.ratio) === ratio).map((o) => o.key);
  },

  correctKeyOf: (item) => item.reviewerOnly.correctKey,
  /** Both sides, because both are what the warm-up chooser must keep disjoint. */
  hiddenChainOf: (raw) => [...raw.answer.expressionRoles, ...raw.answer.anchorRoles],
  describe: (item) => `L${item.content.expression.length}`,
};
