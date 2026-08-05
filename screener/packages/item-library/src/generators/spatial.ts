import type { ItemGenerator } from '@gt/contracts';
import { defineGenerator, distinctDistractors, grid, shape } from '../generator-kit.js';

const AUTHOR = 'library-seed';
const AT = '2026-08-05T00:00:00.000Z';

/**
 * An asymmetric polygon, so a rotation is distinguishable from a mirror. Symmetric shapes
 * would make the rotation and mirror families produce identical answers, which is the
 * obvious way to get this domain wrong.
 */
function asymmetricPath(rng: import('../rng.js').Rng): [number, number][] {
  const variants: [number, number][][] = [
    [[0, 0], [2, 0], [2, 1], [1, 1], [1, 2], [0, 2]],
    [[0, 0], [3, 0], [3, 1], [1, 1], [1, 2], [0, 2]],
    [[0, 0], [2, 0], [2, 2], [1, 2], [1, 1], [0, 1]],
    [[0, 0], [1, 0], [1, 1], [3, 1], [3, 2], [0, 2]],
  ];
  return rng.pick(variants);
}

const rotation = defineGenerator({
  id: 'spatial.rotation',
  version: '1.0.0',
  title: 'Shape rotation',
  construct: 'Mental rotation of a two-dimensional figure',
  domain: 'spatial',
  ageBands: ['k-2', '3-5', '6-8'],
  readingLoad: 'none',
  assumedDifficulty: 0.0,
  authoredBy: AUTHOR,
  authoredAt: AT,
  build(rng) {
    const path = asymmetricPath(rng);
    const turn = rng.pick([90, 180, 270]);
    return {
      prompt: 'Which shape is the same one, turned?',
      stem: shape(path, 0, false),
      correct: shape(path, turn, false),
      // The mirror is the informative distractor: a candidate who cannot separate rotation
      // from reflection picks it. The fallback walks other rotations of the mirrored figure,
      // since a freshly drawn path can coincide with the stem's own.
      distractors: distinctDistractors(
        shape(path, turn, false),
        [
          shape(path, turn, true),
          shape(path, (turn + 90) % 360, true),
          shape(asymmetricPath(rng), turn, false),
        ],
        (i) => shape(path, (turn + 90 * (i + 2)) % 360, true),
      ),
    };
  },
});

const mirror = defineGenerator({
  id: 'spatial.mirror',
  version: '1.0.0',
  title: 'Shape reflection',
  construct: 'Distinguishing reflection from rotation',
  domain: 'spatial',
  ageBands: ['3-5', '6-8'],
  readingLoad: 'none',
  assumedDifficulty: 0.6,
  authoredBy: AUTHOR,
  authoredAt: AT,
  build(rng) {
    const path = asymmetricPath(rng);
    const turn = rng.pick([0, 90, 180, 270]);
    return {
      prompt: 'Which shape is the mirror image?',
      stem: shape(path, turn, false),
      correct: shape(path, turn, true),
      distractors: distinctDistractors(
        shape(path, turn, true),
        [
          shape(path, (turn + 90) % 360, false),
          shape(path, (turn + 180) % 360, false),
          shape(asymmetricPath(rng), turn, true),
        ],
        (i) => shape(path, (turn + 90 * (i + 1)) % 360, false),
      ),
    };
  },
});

/**
 * Grid transformation. A pattern of filled cells is shifted, and the candidate picks the
 * result. Uses no shapes so it degrades gracefully on small screens.
 */
const gridShift = defineGenerator({
  id: 'spatial.grid-shift',
  version: '1.0.0',
  title: 'Grid pattern shift',
  construct: 'Applying a spatial translation to a pattern',
  domain: 'spatial',
  ageBands: ['k-2', '3-5', '6-8'],
  readingLoad: 'none',
  assumedDifficulty: -0.3,
  authoredBy: AUTHOR,
  authoredAt: AT,
  build(rng) {
    const size = 3;
    const filled = rng.distinctInts(3, 0, size * size - 1);
    const cellsOf = (positions: readonly number[]) =>
      Array.from({ length: size * size }, (_, i) => (positions.includes(i) ? '●' : null));

    // Shift right by one column, wrapping within the row.
    const shifted = filled.map((p) => {
      const r = Math.floor(p / size);
      const c = (p % size + 1) % size;
      return r * size + c;
    });
    const wrongShift = filled.map((p) => {
      const r = (Math.floor(p / size) + 1) % size;
      return r * size + (p % size);
    });
    const wrongTwo = filled.map((p) => {
      const r = Math.floor(p / size);
      const c = (p % size + 2) % size;
      return r * size + c;
    });

    return {
      prompt: 'Each dot moves one square to the right. Which grid is the result?',
      stem: grid(size, size, cellsOf(filled)),
      correct: grid(size, size, cellsOf(shifted)),
      distractors: distinctDistractors(
        grid(size, size, cellsOf(shifted)),
        [
          grid(size, size, cellsOf(wrongShift)),
          grid(size, size, cellsOf(wrongTwo)),
          grid(size, size, cellsOf(filled)),
        ],
        (i) => grid(size, size, cellsOf(rng.distinctInts(3, 0, size * size - 1))),
      ),
    };
  },
});

export const spatialGenerators: readonly ItemGenerator[] = [rotation, mirror, gridShift];
