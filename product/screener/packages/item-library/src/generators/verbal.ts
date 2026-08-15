import type { ItemGenerator } from '@gt/contracts';
import { defineGenerator, distinctDistractors, glyphs, text } from '../generator-kit.js';

const AUTHOR = 'library-seed';
const AT = '2026-08-05T00:00:00.000Z';

/**
 * Word analogies. Reading load is high by construction, which is exactly the confound the
 * reading-channel work is about, so these are excluded for pre-readers by config rather
 * than by an author remembering to leave them out.
 */
const ANALOGY_SETS: readonly { relation: string; pairs: readonly [string, string][] }[] = [
  {
    relation: 'part to whole',
    pairs: [
      ['petal', 'flower'],
      ['branch', 'tree'],
      ['page', 'book'],
      ['wheel', 'car'],
      ['key', 'keyboard'],
    ],
  },
  {
    relation: 'animal to home',
    pairs: [
      ['bee', 'hive'],
      ['bird', 'nest'],
      ['bear', 'den'],
      ['fox', 'burrow'],
      ['spider', 'web'],
    ],
  },
  {
    relation: 'worker to tool',
    pairs: [
      ['painter', 'brush'],
      ['chef', 'knife'],
      ['farmer', 'plow'],
      ['tailor', 'needle'],
      ['writer', 'pen'],
    ],
  },
  {
    relation: 'young to adult',
    pairs: [
      ['puppy', 'dog'],
      ['kitten', 'cat'],
      ['calf', 'cow'],
      ['foal', 'horse'],
      ['cub', 'lion'],
    ],
  },
];

const analogy = defineGenerator({
  id: 'verbal.analogy',
  version: '1.0.0',
  title: 'Word analogy',
  construct: 'Relational mapping over lexical knowledge',
  domain: 'verbal',
  ageBands: ['3-5', '6-8'],
  readingLoad: 'high',
  assumedDifficulty: 0.2,
  authoredBy: AUTHOR,
  authoredAt: AT,
  build(rng) {
    const set = rng.pick(ANALOGY_SETS);
    const other = rng.pick(ANALOGY_SETS.filter((s) => s.relation !== set.relation));
    const [a, b] = rng.pick(set.pairs);
    const remaining = set.pairs.filter((p) => p[0] !== a);
    const [c, d] = rng.pick(remaining);
    // Distractors: the stem's own second term, a term from an unrelated relation, and the
    // first half of the answer pair, which is the error a candidate makes by matching
    // surface similarity instead of the relation.
    const foreign = rng.pick(other.pairs);
    const pool = [...set.pairs.flat(), ...other.pairs.flat()];
    return {
      prompt: `${a} is to ${b} as ${c} is to what?`,
      stem: text(`${a} : ${b} :: ${c} : ?`),
      correct: text(d),
      distractors: distinctDistractors(
        text(d),
        [text(b), text(foreign[1]), text(c)],
        (i) => (pool[i] ? text(pool[i] as string) : null),
      ),
    };
  },
});

const CATEGORY_SETS: readonly { label: string; members: readonly string[] }[] = [
  { label: 'fruit', members: ['apple', 'pear', 'plum', 'peach', 'cherry', 'mango'] },
  { label: 'tool', members: ['hammer', 'wrench', 'pliers', 'chisel', 'drill', 'saw'] },
  { label: 'weather', members: ['rain', 'snow', 'fog', 'hail', 'sleet', 'wind'] },
  { label: 'instrument', members: ['violin', 'flute', 'drum', 'harp', 'cello', 'oboe'] },
  { label: 'vehicle', members: ['truck', 'ferry', 'tram', 'glider', 'bicycle', 'canoe'] },
];

const classification = defineGenerator({
  id: 'verbal.classification',
  version: '1.0.0',
  title: 'Odd one out',
  construct: 'Category abstraction over lexical knowledge',
  domain: 'verbal',
  ageBands: ['3-5', '6-8'],
  readingLoad: 'high',
  assumedDifficulty: -0.2,
  // The candidate reads the four words and picks one, so overlap with the stem is the design.
  selectFromStem: true,
  authoredBy: AUTHOR,
  authoredAt: AT,
  build(rng) {
    const set = rng.pick(CATEGORY_SETS);
    const other = rng.pick(CATEGORY_SETS.filter((s) => s.label !== set.label));
    const inGroup = rng.shuffle(set.members).slice(0, 3);
    const odd = rng.pick(other.members);
    return {
      prompt: 'Which one does not belong?',
      stem: text([...inGroup, odd].join(', ')),
      correct: text(odd),
      distractors: inGroup.map((m) => text(m)),
    };
  },
});

/**
 * Letter series. Sits in the verbal domain because it runs on alphabet knowledge, but the
 * reading load is low since no sentence has to be parsed.
 */
const letterSeries = defineGenerator({
  id: 'verbal.letter-series',
  version: '1.0.0',
  title: 'Letter series',
  construct: 'Induction over an ordered symbolic sequence',
  domain: 'verbal',
  ageBands: ['3-5', '6-8'],
  readingLoad: 'low',
  assumedDifficulty: 0.5,
  authoredBy: AUTHOR,
  authoredAt: AT,
  build(rng) {
    const A = 'A'.charCodeAt(0);
    const step = rng.pick([1, 2, 3, 4]);
    const start = rng.int(0, 25 - step * 4);
    const letters = [0, 1, 2, 3].map((i) => String.fromCharCode(A + start + step * i));
    const answer = String.fromCharCode(A + start + step * 4);
    const letterAt = (offset: number) => {
      const code = A + ((start + offset) % 26 + 26) % 26;
      return text(String.fromCharCode(code));
    };
    return {
      prompt: 'Which letter comes next?',
      stem: glyphs([...letters, '?']),
      correct: text(answer),
      // With step 1 the arithmetic candidates collide, so the fallback walks the alphabet.
      distractors: distinctDistractors(
        text(answer),
        [letterAt(step * 4 + 1), letterAt(step * 5), letterAt(step * 3)],
        (i) => letterAt(step * 4 + 2 + i),
      ),
    };
  },
});

export const verbalGenerators: readonly ItemGenerator[] = [analogy, classification, letterSeries];
