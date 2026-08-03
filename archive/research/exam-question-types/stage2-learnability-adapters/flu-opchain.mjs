// FLU-OPCHAIN-01 adapter — the REFERENCE type, carried here to validate the shared core.
//
// This type already has a hand-written oracle (`stage2-learnability.mjs`, on the Stage 2 review
// branch). It is re-expressed as an adapter for one reason: if the shared core reproduces the
// reference type's published figures, the abstraction is not merely plausible, it is the same
// oracle. If it did not, the other three adapters would be measuring something the reference type
// was never measured with, and no cross-type comparison would mean anything.
//
// Nothing about the figure algebra is restated. `applyChain` and `figureKey` come from the module the
// generator that wrote the bank also imports, so "what the machine does" keeps exactly one definition.
//
// The import names the ALGEBRA module rather than the generator. Same functions — the generator
// re-exports these very bindings — but the algebra module imports nothing, so this adapter (and
// therefore the oracle built on it, and therefore the serve-time difficulty function) can be loaded
// by the app without dragging a bank writer and a top-level await into a request handler.

import {
  BADGE_SYMBOLS,
  OPERATORS,
  applyChain,
  figureKey,
} from '../generators/FLU-OPCHAIN-01-algebra.mjs';

export const adapter = {
  id: 'flu-opchain',
  typeCode: 'FLU-OPCHAIN-01',
  vocabulary: '6 badges -> 6 lattice operators',
  primitives: BADGE_SYMBOLS,
  values: OPERATORS,

  /** The badges this item's reveal can speak about: the chain, and nothing else. */
  primitivesUsedBy: (item) => item.content.chain,

  /**
   * Which option this assignment says the machine produces.
   *
   * An assignment whose output is not on screen at all contributes NO key. The five options do not
   * span every figure the vocabulary can reach, so "no option matches" is the normal case for most
   * wrong systems and is evidence that the assignment is wrong rather than evidence about an option.
   */
  predictedKeys(item, assignment) {
    const produced = figureKey(
      applyChain(
        item.content.chain.map((badge) => assignment[badge]),
        item.content.input,
      ),
    );
    const hit = item.content.options.find((o) => figureKey(o.figure) === produced);
    return hit ? [hit.key] : [];
  },

  correctKeyOf: (item) => item.reviewerOnly.correctKey,
  hiddenChainOf: (raw) => raw.answer.operatorChain,
  describe: (item) => `d${item.content.chain.length}`,
};
