// SPA-XFORM-01 adapter — badge -> lattice operator, 6! = 720 candidate systems.
//
// Structurally the closest of the three to the reference type: a chain of badges acts on a figure
// and the reveal is the figure the machine made. The figure is a set of occupied cells rather than a
// glyph record, which changes `figureKey` and nothing else — so the adapter is six lines of
// substance and the whole of the cumulative machinery is shared.
//
// The lattice algebra is imported from the generator that wrote the bank, never restated. The
// generator's own anti-leak enumerator (`relabelReachableFigures`) walks ordered selections of
// `depth` distinct operators, which is the right space for "can this ONE item be solved without the
// mapping". It is deliberately NOT reused here: a cumulative oracle has to carry FULL bijections, or
// it cannot see determination by elimination — pin five badges and the sixth follows even though it
// has never appeared in a chain, and on this type that accounts for much of the back half of a
// block.

import { BADGE_SYMBOLS, OPERATORS, applyChain, figureKey } from '../generators/SPA-XFORM-01.mjs';

export const adapter = {
  id: 'spa-xform',
  typeCode: 'SPA-XFORM-01',
  vocabulary: '6 badges -> 6 lattice operators',
  primitives: BADGE_SYMBOLS,
  values: OPERATORS,

  primitivesUsedBy: (item) => item.content.chain,

  predictedKeys(item, assignment) {
    const produced = figureKey(
      applyChain(
        item.content.chain.map((badge) => assignment[badge]),
        item.content.input.blocks,
      ),
    );
    const hit = item.content.options.find((o) => figureKey(o.blocks) === produced);
    return hit ? [hit.key] : [];
  },

  correctKeyOf: (item) => item.reviewerOnly.correctKey,
  hiddenChainOf: (raw) => raw.answer.operatorChain,
  describe: (item) => `d${item.content.chain.length}`,
};
