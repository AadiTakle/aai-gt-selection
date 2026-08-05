import type { ItemGenerator } from '@gt/contracts';
import { defineGenerator, distinctDistractors, glyphs, grid, numericDistractors, text } from '../generator-kit.js';

const AUTHOR = 'library-seed';
const AT = '2026-08-05T00:00:00.000Z';

const SHAPES = ['●', '■', '▲', '◆', '★'] as const;

/**
 * Figural matrix. Two independent attributes vary, one down rows and one across columns,
 * so the rule has to be induced rather than pattern-matched. This is the family closest to
 * what a nonverbal reasoning battery measures.
 */
const matrix = defineGenerator({
  id: 'fluid.matrix',
  version: '1.0.0',
  title: 'Figural matrix, two attributes',
  construct: 'Induction over crossed figural rules',
  domain: 'fluid',
  ageBands: ['k-2', '3-5', '6-8'],
  readingLoad: 'none',
  assumedDifficulty: 0.3,
  authoredBy: AUTHOR,
  authoredAt: AT,
  build(rng) {
    const picked = rng.shuffle(SHAPES).slice(0, 3) as string[];
    // Shape varies by column, count varies by row.
    const cellFor = (r: number, c: number) => (picked[c] as string).repeat(r + 1);
    const cells: (string | null)[] = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        cells.push(r === 2 && c === 2 ? null : cellFor(r, c));
      }
    }
    const answer = cellFor(2, 2);
    return {
      prompt: 'Which piece completes the pattern?',
      stem: grid(3, 3, cells),
      correct: text(answer),
      distractors: distinctDistractors(
        text(answer),
        [text(cellFor(1, 2)), text(cellFor(2, 1)), text((picked[2] as string).repeat(4))],
        (i) => text((picked[i % 3] as string).repeat(4 + i)),
      ),
    };
  },
});

/**
 * Odd pair out. Three pairs share a relation and one does not, so the candidate has to
 * abstract over pairs rather than over items. Harder than classification for that reason.
 */
const oddPair = defineGenerator({
  id: 'fluid.odd-pair',
  version: '1.0.0',
  title: 'Odd pair out',
  construct: 'Second-order abstraction over relations',
  domain: 'fluid',
  ageBands: ['3-5', '6-8'],
  readingLoad: 'low',
  assumedDifficulty: 1.0,
  // Four pairs are shown and the candidate picks one of them, so stem overlap is the design.
  selectFromStem: true,
  authoredBy: AUTHOR,
  authoredAt: AT,
  build(rng) {
    const step = rng.pick([2, 3, 5]);
    const bases = rng.distinctInts(3, 2, 20);
    const shared = bases.map((b) => `${b}-${b + step}`);
    const oddBase = rng.int(2, 20);
    const oddStep = step + rng.pick([1, 2, -1]);
    const odd = `${oddBase}-${oddBase + oddStep}`;
    return {
      prompt: 'Three pairs follow the same rule. Which pair does not?',
      stem: text([...shared, odd].join('   ')),
      correct: text(odd),
      distractors: distinctDistractors(
        text(odd),
        shared.map((s) => text(s)),
        (i) => {
          const b = (bases[0] as number) + i + 1;
          return text(`${b}-${b + step}`);
        },
      ),
    };
  },
});

/**
 * Operator chain. A symbol is defined as an operation at the top of the item, then applied.
 * Nothing here is prior knowledge, which is the point: the candidate learns a rule inside
 * the item and immediately uses it.
 */
const opChain = defineGenerator({
  id: 'fluid.op-chain',
  version: '1.0.0',
  title: 'Novel operator chain',
  construct: 'Acquiring and applying a rule defined in the item itself',
  domain: 'fluid',
  ageBands: ['3-5', '6-8'],
  readingLoad: 'low',
  assumedDifficulty: 1.2,
  authoredBy: AUTHOR,
  authoredAt: AT,
  build(rng) {
    const symbol = rng.pick(['◈', '⊛', '⊙', '✦']);
    const add = rng.int(2, 6);
    const mul = rng.pick([2, 3]);
    const start = rng.int(1, 6);
    // symbol means: multiply then add. Applied twice.
    const once = start * mul + add;
    const twice = once * mul + add;
    return {
      prompt: `${symbol} means: multiply by ${mul}, then add ${add}. What is ${start} ${symbol} ${symbol} ?`,
      stem: glyphs([String(start), symbol, symbol, '=', '?']),
      correct: text(String(twice)),
      distractors: numericDistractors(twice, [once, start * mul * mul + add, (start + add) * mul * mul]),
    };
  },
});

export const fluidGenerators: readonly ItemGenerator[] = [matrix, oddPair, opChain];
