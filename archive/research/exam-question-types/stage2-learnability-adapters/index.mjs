// The adapted Stage 2 types, in one place.
//
// Adding a fifth type means writing one adapter with the six-member contract documented in
// `stage2-learnability-core.mjs` and naming it here. Nothing in the core, the block loop or the
// report is type-specific, and none of them needs to change.

import { adapter as fluOpchain } from './flu-opchain.mjs';
import { adapter as quantGlyphnum } from './quant-glyphnum.mjs';
import { adapter as spaXform } from './spa-xform.mjs';
import { adapter as verMorpho } from './ver-morpho.mjs';

/** Keyed by type code. `FLU-OPCHAIN-01` is the reference the other three are validated against. */
export const ADAPTERS = {
  'FLU-OPCHAIN-01': fluOpchain,
  'SPA-XFORM-01': spaXform,
  'QUANT-GLYPHNUM-01': quantGlyphnum,
  'VER-MORPHO-01': verMorpho,
};

/** The three types this workstream added an oracle for, in report order. */
export const NEW_TYPES = ['SPA-XFORM-01', 'QUANT-GLYPHNUM-01', 'VER-MORPHO-01'];

export const REFERENCE_TYPE = 'FLU-OPCHAIN-01';

export function adapterFor(typeCode) {
  const found = ADAPTERS[typeCode];
  if (!found) {
    throw new Error(
      `no learnability adapter for "${typeCode}". Known: ${Object.keys(ADAPTERS).join(', ')}.`,
    );
  }
  return found;
}
