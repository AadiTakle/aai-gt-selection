// VER-MORPHO-01 adapter — affix form -> morpheme meaning, 6! = 720 candidate systems.
//
// THE ONE PLACE THIS TYPE IS GENUINELY DIFFERENT: it runs in BOTH DIRECTIONS, and the two directions
// are not the same question.
//
//   wordToPicture   the word is given and the options are pictures. A mapping decodes the word into
//                   exactly one picture, so it predicts at most one option, and this behaves like
//                   the two figure types.
//   pictureToWord   the target picture is given and the options are WORDS. A mapping has to decode
//                   all four and report which ones land on the target — and a WRONG mapping can make
//                   two of them land there at once. So a mapping predicts a SET, which is why the
//                   shared contract is `predictedKeys` returning an array rather than a single key.
//                   Getting this wrong in the obvious way (assume one prediction, take the first)
//                   would silently eliminate mappings that are still live and make the oracle claim
//                   things were deducible when they were not.
//
// The stem's picture is printed on the item (`content.stemPicture`), so the stem->kind half of the
// hidden system is given away by construction and is not part of the candidate space. Only the six
// affix forms are induced. That is the generator's decision, not this adapter's: an item whose base
// picture had to be induced too would make the first reveal uninterpretable.
//
// The picture algebra is imported from the generator that wrote the bank, never restated.

import { AFFIX_FORMS, MEANINGS, applyChain, pictureKey } from '../generators/VER-MORPHO-01.mjs';

const denote = (forms, assignment, base) =>
  pictureKey(
    applyChain(
      forms.map((form) => assignment[form]),
      base,
    ),
  );

export const adapter = {
  id: 'ver-morpho',
  typeCode: 'VER-MORPHO-01',
  vocabulary: '6 affix forms -> 6 morpheme meanings',
  primitives: [...AFFIX_FORMS],
  values: [...MEANINGS],

  /**
   * Which affixes this item's reveal can speak about.
   *
   * In the picture->word direction that is every affix on every OPTION, not just the right one: the
   * reveal says "this word and not those three", and eliminating a wrong word is a statement about
   * the affixes it carries.
   */
  primitivesUsedBy(item) {
    if (item.content.direction === 'wordToPicture') return item.content.wordMorphemes;
    return [...new Set(item.content.options.flatMap((o) => o.morphemes))];
  },

  predictedKeys(item, assignment) {
    const base = item.content.stemPicture;
    if (item.content.direction === 'wordToPicture') {
      const produced = denote(item.content.wordMorphemes, assignment, base);
      const hit = item.content.options.find((o) => pictureKey(o.picture) === produced);
      return hit ? [hit.key] : [];
    }
    const target = pictureKey(item.content.targetPicture);
    return item.content.options
      .filter((o) => denote(o.morphemes, assignment, base) === target)
      .map((o) => o.key);
  },

  correctKeyOf: (item) => item.reviewerOnly.correctKey,
  hiddenChainOf: (raw) => raw.answer.meaningChain,
  describe: (item) => {
    const depth =
      item.content.direction === 'wordToPicture'
        ? item.content.wordMorphemes.length
        : Math.max(...item.content.options.map((o) => o.morphemes.length));
    return `${item.content.direction === 'wordToPicture' ? 'w2p' : 'p2w'}·d${depth}`;
  },
};
