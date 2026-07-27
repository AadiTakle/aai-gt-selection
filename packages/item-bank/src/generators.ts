import type { AnswerKey } from './answer';
import type { ItemContent } from './content/registry';
import { COLORS, SHAPES } from './content/primitives';
import type { FiguralAttr } from './content/primitives';
import type { MaterializableTypeCode } from './content/registry';
import { ROLL_DIRECTIONS } from './content/spatial';
import type { AgeBand, LureClass } from './enums';
import type { ScoringContract } from './scoring';
import { solveMaze } from './solvers';
import type { Rng } from './rng';

export interface GenDraft {
  content: ItemContent;
  answer: AnswerKey;
  scoring: ScoringContract;
}
export type Generator = (rng: Rng, level: number, ageBand: AgeBand) => GenDraft;

function finalize<O extends { lure: LureClass }>(
  rng: Rng,
  opts: O[],
): { options: O[]; correctIndex: number; rationales: LureClass[] } {
  const options = rng.shuffle(opts);
  const correctIndex = options.findIndex((o) => o.lure === 'correct');
  return { options, correctIndex, rationales: options.map((o) => o.lure) };
}

const clampLevel = (level: number, max: number): number => Math.max(1, Math.min(max, level));

/* ══════════════════════ VER-RELPAIR-01 (extracted from demo) ══════════════
 * Faithfully lifted from demos/VER-RELPAIR-01.html's static relation BANK: the
 * answer key that previously lived in the browser is now computed/held here. */
const RELPAIR_ROLE_TO_LURE: Record<string, LureClass> = {
  correct: 'correct',
  'associative-lure': 'associate',
  'reversed-relation-lure': 'reversed_relation',
  'unrelated-foil': 'distractor_other',
  'antonym-lure': 'distractor_other',
};
interface RelpairRow {
  lvl: number;
  rel: string;
  cands: { p: [string, string]; role: string }[];
}
const RELPAIR_BANK: RelpairRow[] = [
  {
    lvl: 1,
    rel: 'animal \u2192 home',
    cands: [
      { p: ['bee', 'hive'], role: 'correct' },
      { p: ['dog', 'bone'], role: 'associative-lure' },
      { p: ['cat', 'fish'], role: 'unrelated-foil' },
    ],
  },
  {
    lvl: 2,
    rel: 'cause \u2192 effect',
    cands: [
      { p: ['rain', 'flood'], role: 'correct' },
      { p: ['apple', 'worm'], role: 'associative-lure' },
      { p: ['flood', 'rain'], role: 'reversed-relation-lure' },
      { p: ['car', 'road'], role: 'unrelated-foil' },
    ],
  },
  {
    lvl: 3,
    rel: 'tool \u2192 job',
    cands: [
      { p: ['key', 'unlock'], role: 'correct' },
      { p: ['hammer', 'nail'], role: 'associative-lure' },
      { p: ['write', 'pen'], role: 'reversed-relation-lure' },
      { p: ['plate', 'pizza'], role: 'unrelated-foil' },
    ],
  },
  {
    lvl: 4,
    rel: 'whole \u2192 part',
    cands: [
      { p: ['book', 'page'], role: 'correct' },
      { p: ['car', 'fuel'], role: 'associative-lure' },
      { p: ['leaf', 'tree'], role: 'reversed-relation-lure' },
      { p: ['rain', 'balloon'], role: 'unrelated-foil' },
    ],
  },
  {
    lvl: 5,
    rel: 'group \u2192 member',
    cands: [
      { p: ['fruit', 'apple'], role: 'correct' },
      { p: ['tree', 'apple'], role: 'associative-lure' },
      { p: ['lion', 'animal'], role: 'reversed-relation-lure' },
      { p: ['car', 'balloon'], role: 'unrelated-foil' },
    ],
  },
  {
    lvl: 6,
    rel: 'mild \u2192 strong',
    cands: [
      { p: ['happy', 'thrilled'], role: 'correct' },
      { p: ['cold', 'hot'], role: 'antonym-lure' },
      { p: ['water', 'wave'], role: 'associative-lure' },
      { p: ['cat', 'car'], role: 'unrelated-foil' },
    ],
  },
];
const RELPAIR_STEM: Record<number, [string, string]> = {
  1: ['bird', 'nest'],
  2: ['fire', 'smoke'],
  3: ['pen', 'write'],
  4: ['tree', 'leaf'],
  5: ['animal', 'lion'],
  6: ['warm', 'hot'],
};
const genRelpair: Generator = (rng, level) => {
  const lvl = clampLevel(level, 6);
  const row = RELPAIR_BANK[lvl - 1] as RelpairRow;
  const stem = RELPAIR_STEM[lvl] as [string, string];
  const opts = row.cands.map((c) => ({
    pair: [{ text: c.p[0] }, { text: c.p[1] }] as [{ text: string }, { text: string }],
    lure: RELPAIR_ROLE_TO_LURE[c.role] ?? 'distractor_other',
  }));
  const { options, correctIndex, rationales } = finalize(rng, opts);
  const frequencyBand = Math.max(1, Math.min(7, 6 - Math.floor((lvl - 1) / 2)));
  return {
    content: {
      typeCode: 'VER-RELPAIR-01',
      presentation: 'word',
      relation: row.rel,
      stemPair: [{ text: stem[0] }, { text: stem[1] }],
      options,
      frequencyBand,
    },
    answer: { correctIndex, distractorRationales: rationales },
    scoring: { mode: 'deterministic_key' },
  };
};

/* ══════════════════════ VER-CLOZE-01 (authored synthetic) ═════════════════
 * A global_fit gap with a local_fit lure: the lure reads fine beside the blank
 * but contradicts the whole sentence. */
interface ClozeRow {
  frame: string;
  correct: string;
  localFit: string;
  associate: string;
  globalMismatch: string;
  freq: number;
  syn: number;
}
const CLOZE_BANK: ClozeRow[] = [
  {
    frame: 'The ice cube sat in the hot sun until it slowly ___.',
    correct: 'melted',
    localFit: 'froze',
    associate: 'water',
    globalMismatch: 'sang',
    freq: 5,
    syn: 2,
  },
  {
    frame: 'Because the shelf was too high, the small child could not ___ it.',
    correct: 'reach',
    localFit: 'climb',
    associate: 'book',
    globalMismatch: 'whisper',
    freq: 5,
    syn: 3,
  },
  {
    frame: 'The runners were exhausted, so at the finish line they finally ___.',
    correct: 'rested',
    localFit: 'sprinted',
    associate: 'medal',
    globalMismatch: 'melted',
    freq: 4,
    syn: 3,
  },
  {
    frame: 'The sky grew dark and cloudy, a sure sign that it would soon ___.',
    correct: 'rain',
    localFit: 'shine',
    associate: 'umbrella',
    globalMismatch: 'giggle',
    freq: 6,
    syn: 2,
  },
  {
    frame: 'She saved her coins for months so she could ___ the new bicycle.',
    correct: 'buy',
    localFit: 'ride',
    associate: 'wheel',
    globalMismatch: 'bake',
    freq: 6,
    syn: 4,
  },
];
const genCloze: Generator = (rng, level) => {
  const row = CLOZE_BANK[(clampLevel(level, CLOZE_BANK.length) - 1) % CLOZE_BANK.length] as ClozeRow;
  const opts = [
    { token: { text: row.correct }, fit: 'correct' as LureClass },
    { token: { text: row.localFit }, fit: 'local_fit' as LureClass },
    { token: { text: row.associate }, fit: 'associate' as LureClass },
    { token: { text: row.globalMismatch }, fit: 'global_mismatch' as LureClass },
  ];
  const options = rng.shuffle(opts);
  const correctIndex = options.findIndex((o) => o.fit === 'correct');
  return {
    content: {
      typeCode: 'VER-CLOZE-01',
      mode: 'cloze',
      presentation: 'word',
      sentenceFrame: row.frame,
      gapType: 'global_fit',
      options,
      targetFrequencyBand: row.freq,
      syntacticComplexity: row.syn,
    },
    answer: {
      correctIndex,
      distractorRationales: options.map((o) => o.fit),
    },
    scoring: { mode: 'deterministic_key' },
  };
};

/* ══════════════════════ VER-SENSE-01 (authored synthetic) ═════════════════
 * Drag word cards into a sensible order. computed_solver, partial credit. */
interface SenseRow {
  words: string[];
  absurd: number[]; // grammatical-but-implausible ordering (indices into sensible order)
}
const SENSE_BANK: SenseRow[] = [
  { words: ['the', 'dog', 'chased', 'the', 'ball'], absurd: [3, 4, 2, 0, 1] },
  { words: ['she', 'ate', 'a', 'red', 'apple'], absurd: [2, 3, 4, 0, 1] },
  { words: ['the', 'bird', 'flew', 'over', 'trees'], absurd: [4, 3, 2, 0, 1] },
  { words: ['we', 'planted', 'seeds', 'in', 'spring'], absurd: [4, 3, 2, 0, 1] },
];
const genSense: Generator = (rng, level) => {
  const row = SENSE_BANK[(clampLevel(level, SENSE_BANK.length) - 1) % SENSE_BANK.length] as SenseRow;
  const n = row.words.length;
  const sensible = Array.from({ length: n }, (_, i) => i);
  const order = rng.shuffle(sensible); // presentation order of the cards
  const cards = order.map((i) => ({ text: row.words[i] as string }));
  // sensibleOrder / absurdLure are indices INTO cards.
  const cardIndexOfSensible = sensible.map((s) => order.indexOf(s));
  const sensibleOrder = cardIndexOfSensible;
  const absurdLure = row.absurd.map((s) => order.indexOf(s));
  return {
    content: {
      typeCode: 'VER-SENSE-01',
      cards,
      sensibleOrder,
      absurdLure,
    },
    answer: { canonicalSolution: sensibleOrder },
    scoring: { mode: 'computed_solver', solverId: 'order-plausibility@1', partialCredit: true },
  };
};

/* ══════════════════════ QUANT-SERIES-01 (procedural) ══════════════════════ */
const genSeries: Generator = (rng, level, ageBand) => {
  const lvl = clampLevel(level, 8);
  const geometric = lvl >= 4 && rng.next() < 0.5;
  const start = rng.int(1, 5);
  let seq: number[];
  let next: number;
  if (geometric) {
    const ratio = rng.pick([2, 3]);
    seq = [start, start * ratio, start * ratio ** 2, start * ratio ** 3];
    next = start * ratio ** 4;
  } else {
    const step = rng.int(1, Math.min(9, 1 + lvl));
    seq = [start, start + step, start + 2 * step, start + 3 * step];
    next = start + 4 * step;
  }
  const stepGuess = (seq[1] as number) - (seq[0] as number);
  const opts = [
    { value: next, lure: 'correct' as LureClass },
    { value: next + stepGuess, lure: 'near_order' as LureClass },
    { value: (seq[seq.length - 1] as number) + 1, lure: 'rule_violation' as LureClass },
    { value: next - 1, lure: 'distractor_other' as LureClass },
  ];
  const uniq = new Map<number, (typeof opts)[number]>();
  for (const o of opts) if (!uniq.has(o.value)) uniq.set(o.value, o);
  const { options, correctIndex, rationales } = finalize(rng, [...uniq.values()]);
  const presentation = ageBand === 'K-1' ? 'dots' : 'numeral';
  return {
    content: { typeCode: 'QUANT-SERIES-01', presentation, sequence: seq, options },
    answer: { correctIndex, distractorRationales: rationales },
    scoring: { mode: 'deterministic_key' },
  };
};

/* ══════════════════════ QUANT-FUNC-01 (procedural) ════════════════════════ */
const genFunc: Generator = (rng, level) => {
  const lvl = clampLevel(level, 8);
  const m = rng.pick(lvl >= 4 ? [2, 3] : [1, 2]);
  const k = rng.int(0, lvl >= 3 ? 4 : 2);
  const ins = [rng.int(1, 3), rng.int(4, 6), rng.int(7, 9)];
  const examples = ins.map((i) => ({ in: i, out: m * i + k }));
  const query = rng.int(10, 14);
  const val = m * query + k;
  const opts = [
    { value: val, lure: 'correct' as LureClass },
    { value: m * query, lure: 'rule_violation' as LureClass },
    { value: val + m, lure: 'near_order' as LureClass },
    { value: val - 1, lure: 'distractor_other' as LureClass },
  ];
  const uniq = new Map<number, (typeof opts)[number]>();
  for (const o of opts) if (!uniq.has(o.value)) uniq.set(o.value, o);
  const { options, correctIndex, rationales } = finalize(rng, [...uniq.values()]);
  return {
    content: { typeCode: 'QUANT-FUNC-01', examples, query, options },
    answer: { correctIndex, distractorRationales: rationales },
    scoring: { mode: 'deterministic_key' },
  };
};

/* ══════════════════════ FLU-MATRIX-01 (procedural) ════════════════════════
 * Each attribute is constant, by-row, or by-column so the missing cell is
 * uniquely determined by the visible grid. */
type AttrMode = 'const' | 'row' | 'col';
function pickMode(rng: Rng, level: number): AttrMode {
  if (level <= 1) return 'const';
  return rng.pick(['const', 'row', 'col'] as const);
}
const genMatrix: Generator = (rng, level) => {
  const lvl = clampLevel(level, 6);
  const size = lvl <= 1 ? 2 : 3;
  const shapeMode = pickMode(rng, lvl);
  const colorMode = pickMode(rng, lvl);
  const countMode = pickMode(rng, lvl);
  const shapesByRow = rng.shuffle(SHAPES).slice(0, size);
  const shapesByCol = rng.shuffle(SHAPES).slice(0, size);
  const shapeConst = rng.pick(SHAPES);
  const colorsByRow = rng.shuffle(COLORS).slice(0, size);
  const colorsByCol = rng.shuffle(COLORS).slice(0, size);
  const colorConst = rng.pick(COLORS);
  const countConst = rng.int(1, 5);
  const attrAt = (r: number, c: number): FiguralAttr => {
    const shape =
      shapeMode === 'const'
        ? shapeConst
        : shapeMode === 'row'
          ? (shapesByRow[r] as FiguralAttr['shape'])
          : (shapesByCol[c] as FiguralAttr['shape']);
    const color =
      colorMode === 'const'
        ? colorConst
        : colorMode === 'row'
          ? (colorsByRow[r] as FiguralAttr['color'])
          : (colorsByCol[c] as FiguralAttr['color']);
    const count =
      countMode === 'const' ? countConst : countMode === 'row' ? r + 1 : c + 1;
    return { shape, color, count };
  };
  const grid: (FiguralAttr | null)[][] = [];
  for (let r = 0; r < size; r++) {
    const row: (FiguralAttr | null)[] = [];
    for (let c = 0; c < size; c++) row.push(attrAt(r, c));
    grid.push(row);
  }
  const mr = size - 1;
  const mc = size - 1;
  const answerAttr = attrAt(mr, mc);
  grid[mr]![mc] = null;
  const distractors: FiguralAttr[] = [
    { ...answerAttr, shape: SHAPES[(SHAPES.indexOf(answerAttr.shape) + 1) % 4] as FiguralAttr['shape'] },
    { ...answerAttr, color: COLORS[(COLORS.indexOf(answerAttr.color) + 1) % 4] as FiguralAttr['color'] },
    { ...answerAttr, count: (answerAttr.count % 5) + 1 },
  ];
  const opts = [
    { attr: answerAttr, lure: 'correct' as LureClass },
    ...distractors.map((attr) => ({ attr, lure: 'rule_violation' as LureClass })),
  ];
  const { options, correctIndex, rationales } = finalize(rng, opts);
  return {
    content: { typeCode: 'FLU-MATRIX-01', size, grid, options },
    answer: { correctIndex, distractorRationales: rationales },
    scoring: { mode: 'deterministic_key' },
  };
};

/* ══════════════════════ FLU-ANALOGY-01 (procedural) ═══════════════════════ */
const genAnalogy: Generator = (rng, level) => {
  const lvl = clampLevel(level, 6);
  const a: FiguralAttr = { shape: rng.pick(SHAPES), color: rng.pick(COLORS), count: rng.int(1, 3) };
  const shapeShift = lvl >= 2 ? rng.int(0, 3) : 0;
  const colorShift = lvl >= 3 ? rng.int(0, 3) : rng.pick([0, 1]);
  const countDelta = lvl >= 2 ? rng.pick([0, 1]) : 0;
  const apply = (x: FiguralAttr): FiguralAttr => ({
    shape: SHAPES[(SHAPES.indexOf(x.shape) + shapeShift) % 4] as FiguralAttr['shape'],
    color: COLORS[(COLORS.indexOf(x.color) + colorShift) % 4] as FiguralAttr['color'],
    count: Math.max(1, Math.min(5, x.count + countDelta)),
  });
  const b = apply(a);
  const c: FiguralAttr = { shape: rng.pick(SHAPES), color: rng.pick(COLORS), count: rng.int(1, 3) };
  const d = apply(c);
  const distractors: FiguralAttr[] = [
    { ...d, shape: SHAPES[(SHAPES.indexOf(d.shape) + 1) % 4] as FiguralAttr['shape'] },
    { ...d, color: COLORS[(COLORS.indexOf(d.color) + 1) % 4] as FiguralAttr['color'] },
    { ...c }, // "no transform" lure
  ];
  const opts = [
    { attr: d, lure: 'correct' as LureClass },
    ...distractors.map((attr) => ({ attr, lure: 'rule_violation' as LureClass })),
  ];
  // de-dup identical attrs (e.g. when a transform is identity)
  const seen = new Set<string>();
  const dedup = opts.filter((o) => {
    const key = `${o.attr.shape}|${o.attr.color}|${o.attr.count}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const { options, correctIndex, rationales } = finalize(rng, dedup);
  return {
    content: { typeCode: 'FLU-ANALOGY-01', a, b, c, options },
    answer: { correctIndex, distractorRationales: rationales },
    scoring: { mode: 'deterministic_key' },
  };
};

/* ══════════════════════ SPA-ROLL-01 (procedural) ══════════════════════════ */
const CUBE_LABELS = ['cat', 'dog', 'sun', 'star', 'tree', 'fish', 'bird', 'frog'] as const;
const genRoll: Generator = (rng, level) => {
  const lvl = clampLevel(level, 8);
  const labels = rng.shuffle(CUBE_LABELS).slice(0, 6);
  const faces = {
    top: labels[0] as string,
    bottom: labels[1] as string,
    north: labels[2] as string,
    south: labels[3] as string,
    east: labels[4] as string,
    west: labels[5] as string,
  };
  const pathLen = Math.min(8, 1 + lvl);
  const path = Array.from({ length: pathLen }, () => rng.pick(ROLL_DIRECTIONS));
  // simulate
  let f = { ...faces };
  for (const d of path) {
    if (d === 'N') f = { ...f, top: f.south, north: f.top, bottom: f.north, south: f.bottom };
    else if (d === 'S') f = { ...f, top: f.north, south: f.top, bottom: f.south, north: f.bottom };
    else if (d === 'E') f = { ...f, top: f.west, east: f.top, bottom: f.east, west: f.bottom };
    else f = { ...f, top: f.east, west: f.top, bottom: f.west, east: f.bottom };
  }
  const topLabel = f.top;
  const others = labels.filter((l) => l !== topLabel).slice(0, 3);
  const opts = [
    { face: topLabel, lure: 'correct' as LureClass },
    ...others.map((face) => ({ face: face as string, lure: 'distractor_other' as LureClass })),
  ];
  const { options, correctIndex, rationales } = finalize(rng, opts);
  return {
    content: { typeCode: 'SPA-ROLL-01', faces, path, options },
    answer: { correctIndex, distractorRationales: rationales },
    scoring: { mode: 'deterministic_key' },
  };
};

/* ══════════════════════ SPA-MAZE-01 (procedural) ══════════════════════════
 * Carve a guaranteed path, then sprinkle walls off the path. computed_solver. */
const genMaze: Generator = (rng, level) => {
  const lvl = clampLevel(level, 6);
  const size = Math.min(9, 4 + lvl);
  const width = size;
  const height = size;
  const start: [number, number] = [0, 0];
  const goal: [number, number] = [width - 1, height - 1];
  // carve an L-path along bottom row then up the last column
  const carved = new Set<string>();
  for (let x = 0; x < width; x++) carved.add(`${x},0`);
  for (let y = 0; y < height; y++) carved.add(`${width - 1},${y}`);
  const walls: [number, number][] = [];
  const wallCount = Math.floor(width * height * (0.15 + 0.03 * lvl));
  for (let i = 0; i < wallCount; i++) {
    const x = rng.int(0, width - 1);
    const y = rng.int(0, height - 1);
    const k = `${x},${y}`;
    if (carved.has(k)) continue;
    if (x === start[0] && y === start[1]) continue;
    if (x === goal[0] && y === goal[1]) continue;
    if (!walls.some(([wx, wy]) => wx === x && wy === y)) walls.push([x, y]);
  }
  const content = {
    typeCode: 'SPA-MAZE-01' as const,
    width,
    height,
    walls,
    start,
    goal,
  };
  const solution = solveMaze(content);
  if (!solution) throw new Error('genMaze produced an unsolvable maze');
  return {
    content,
    answer: { canonicalSolution: { length: solution.length, path: solution.path } },
    scoring: { mode: 'computed_solver', solverId: 'maze-shortest@1', partialCredit: true },
  };
};

export const GENERATORS: Record<MaterializableTypeCode, Generator> = {
  'VER-RELPAIR-01': genRelpair,
  'VER-CLOZE-01': genCloze,
  'VER-SENSE-01': genSense,
  'QUANT-SERIES-01': genSeries,
  'QUANT-FUNC-01': genFunc,
  'FLU-MATRIX-01': genMatrix,
  'FLU-ANALOGY-01': genAnalogy,
  'SPA-ROLL-01': genRoll,
  'SPA-MAZE-01': genMaze,
};
