import type { z } from 'zod';

import { analogyContentSchema, matrixContentSchema } from './content/fluid';
import { COLORS, SHAPES } from './content/primitives';
import type { FiguralAttr } from './content/primitives';
import { funcContentSchema, seriesContentSchema } from './content/quant';
import { mazeContentSchema, rollContentSchema } from './content/spatial';
import { senseContentSchema } from './content/verbal';

type SeriesContent = z.infer<typeof seriesContentSchema>;
type FuncContent = z.infer<typeof funcContentSchema>;
type MatrixContent = z.infer<typeof matrixContentSchema>;
type AnalogyContent = z.infer<typeof analogyContentSchema>;
type RollContent = z.infer<typeof rollContentSchema>;
type MazeContent = z.infer<typeof mazeContentSchema>;

const EPS = 1e-9;
const near = (a: number, b: number): boolean => Math.abs(a - b) < EPS;

/** Solve result: the derived value/attr plus the option index it matches. */
export interface SolveResult<T> {
  value: T;
  index: number;
}

/* ── QUANT-SERIES-01 ─ infer arithmetic/geometric rule, compute next term ── */
export function solveSeries(content: SeriesContent): SolveResult<number> | null {
  const seq = content.sequence;
  if (seq.length < 3) return null;
  const first = seq[0] as number;
  const second = seq[1] as number;
  const diffs: number[] = [];
  const ratios: number[] = [];
  for (let i = 1; i < seq.length; i++) {
    const prev = seq[i - 1] as number;
    const cur = seq[i] as number;
    diffs.push(cur - prev);
    if (prev !== 0) ratios.push(cur / prev);
  }
  const arithmetic = diffs.every((d) => near(d, second - first));
  let next: number | null = null;
  if (arithmetic) {
    next = (seq[seq.length - 1] as number) + (second - first);
  } else if (ratios.length === seq.length - 1) {
    const r0 = ratios[0] as number;
    if (ratios.every((r) => near(r, r0))) next = (seq[seq.length - 1] as number) * r0;
  }
  if (next === null) return null;
  const index = content.options.findIndex((o) => near(o.value, next as number));
  if (index < 0) return null;
  return { value: next, index };
}

/* ── QUANT-FUNC-01 ─ infer linear rule out = m·in + k from examples ── */
export function solveFunc(content: FuncContent): SolveResult<number> | null {
  const ex = content.examples;
  const a = ex[0];
  const b = ex.find((e) => e.in !== (a?.in ?? 0));
  if (!a || !b) return null;
  const m = (b.out - a.out) / (b.in - a.in);
  const k = a.out - m * a.in;
  if (!ex.every((e) => near(e.out, m * e.in + k))) return null;
  const val = m * content.query + k;
  const index = content.options.findIndex((o) => near(o.value, val));
  if (index < 0) return null;
  return { value: val, index };
}

/* ── FLU-MATRIX-01 ─ infer per-attribute mode (constant/by-row/by-column) ── */
interface FilledCell {
  r: number;
  c: number;
  attr: FiguralAttr;
}
function attrEq(a: FiguralAttr, b: FiguralAttr): boolean {
  return a.shape === b.shape && a.color === b.color && a.count === b.count;
}
function inferAttribute<K extends keyof FiguralAttr>(
  filled: FilledCell[],
  key: K,
  r0: number,
  c0: number,
): FiguralAttr[K] | null {
  const values = filled.map((f) => f.attr[key]);
  const first = values[0];
  if (first === undefined) return null;
  if (values.every((v) => v === first)) return first; // constant
  const rowMate = filled.find((f) => f.r === r0);
  if (
    rowMate &&
    [...new Set(filled.map((f) => f.r))].every((r) => {
      const inRow = filled.filter((f) => f.r === r).map((f) => f.attr[key]);
      return new Set(inRow).size <= 1;
    })
  ) {
    return rowMate.attr[key]; // by-row
  }
  const colMate = filled.find((f) => f.c === c0);
  if (
    colMate &&
    [...new Set(filled.map((f) => f.c))].every((c) => {
      const inCol = filled.filter((f) => f.c === c).map((f) => f.attr[key]);
      return new Set(inCol).size <= 1;
    })
  ) {
    return colMate.attr[key]; // by-column
  }
  return null;
}
export function solveMatrix(content: MatrixContent): SolveResult<FiguralAttr> | null {
  const filled: FilledCell[] = [];
  let missing: { r: number; c: number } | null = null;
  content.grid.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell === null) missing = { r, c };
      else filled.push({ r, c, attr: cell });
    }),
  );
  if (!missing) return null;
  const { r: r0, c: c0 } = missing;
  const shape = inferAttribute(filled, 'shape', r0, c0);
  const color = inferAttribute(filled, 'color', r0, c0);
  const count = inferAttribute(filled, 'count', r0, c0);
  if (shape === null || color === null || count === null) return null;
  const expected: FiguralAttr = { shape, color, count };
  const index = content.options.findIndex((o) => attrEq(o.attr, expected));
  if (index < 0) return null;
  return { value: expected, index };
}

/* ── FLU-ANALOGY-01 ─ infer (shapeShift, colorShift, countDelta) transform ── */
export function solveAnalogy(content: AnalogyContent): SolveResult<FiguralAttr> | null {
  const { a, b, c } = content;
  const shapeShift = (SHAPES.indexOf(b.shape) - SHAPES.indexOf(a.shape) + 4) % 4;
  const colorShift = (COLORS.indexOf(b.color) - COLORS.indexOf(a.color) + 4) % 4;
  const countDelta = b.count - a.count;
  const shape = SHAPES[(SHAPES.indexOf(c.shape) + shapeShift) % 4] as FiguralAttr['shape'];
  const color = COLORS[(COLORS.indexOf(c.color) + colorShift) % 4] as FiguralAttr['color'];
  const count = c.count + countDelta;
  const expected: FiguralAttr = { shape, color, count };
  const index = content.options.findIndex((o) => attrEq(o.attr, expected));
  if (index < 0) return null;
  return { value: expected, index };
}

/* ── SPA-ROLL-01 ─ simulate the cube rolling along the path ── */
type Faces = RollContent['faces'];
function roll(f: Faces, dir: 'N' | 'S' | 'E' | 'W'): Faces {
  switch (dir) {
    case 'N':
      return { ...f, top: f.south, north: f.top, bottom: f.north, south: f.bottom };
    case 'S':
      return { ...f, top: f.north, south: f.top, bottom: f.south, north: f.bottom };
    case 'E':
      return { ...f, top: f.west, east: f.top, bottom: f.east, west: f.bottom };
    case 'W':
      return { ...f, top: f.east, west: f.top, bottom: f.west, east: f.bottom };
  }
}
export function solveRoll(content: RollContent): SolveResult<string> | null {
  let f = content.faces;
  for (const d of content.path) f = roll(f, d);
  const index = content.options.findIndex((o) => o.face === f.top);
  if (index < 0) return null;
  return { value: f.top, index };
}

/* ── SPA-MAZE-01 ─ BFS shortest path start→goal ── */
export interface MazeSolution {
  length: number;
  path: [number, number][];
}
export function solveMaze(content: MazeContent): MazeSolution | null {
  const { width, height, start, goal } = content;
  const blocked = new Set(content.walls.map(([x, y]) => `${x},${y}`));
  const key = (x: number, y: number): string => `${x},${y}`;
  if (blocked.has(key(start[0], start[1])) || blocked.has(key(goal[0], goal[1]))) return null;
  const prev = new Map<string, string | null>();
  const q: [number, number][] = [[start[0], start[1]]];
  prev.set(key(start[0], start[1]), null);
  const dirs: [number, number][] = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  while (q.length > 0) {
    const [x, y] = q.shift() as [number, number];
    if (x === goal[0] && y === goal[1]) {
      const path: [number, number][] = [];
      let cur: string | null = key(x, y);
      while (cur) {
        const [cx, cy] = cur.split(',').map(Number) as [number, number];
        path.unshift([cx, cy]);
        cur = prev.get(cur) ?? null;
      }
      return { length: path.length - 1, path };
    }
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const k = key(nx, ny);
      if (blocked.has(k) || prev.has(k)) continue;
      prev.set(k, key(x, y));
      q.push([nx, ny]);
    }
  }
  return null;
}

/* ── computed_solver registry (scorers for constructed items) ── */
export interface Scorer {
  /** Returns a score in [0,1] for a response against the item's content. */
  score(content: unknown, response: unknown): number;
}

function adjacentOrderScore(order: number[], canonical: number[]): number {
  if (order.length !== canonical.length) return 0;
  if (order.every((v, i) => v === canonical[i])) return 1;
  const pos = new Map<number, number>();
  canonical.forEach((v, i) => pos.set(v, i));
  let correctAdjacent = 0;
  for (let i = 0; i < order.length - 1; i++) {
    const a = pos.get(order[i] as number);
    const b = pos.get(order[i + 1] as number);
    if (a !== undefined && b !== undefined && b === a + 1) correctAdjacent++;
  }
  return order.length > 1 ? correctAdjacent / (order.length - 1) : 0;
}

export const SOLVERS: Record<string, Scorer> = {
  'order-plausibility@1': {
    score(content, response) {
      const c = senseContentSchema.parse(content);
      if (!Array.isArray(response)) return 0;
      return adjacentOrderScore(response as number[], c.sensibleOrder);
    },
  },
  'maze-shortest@1': {
    score(content, response) {
      const c = mazeContentSchema.parse(content);
      const optimal = solveMaze(c);
      if (!optimal) return 0;
      if (!Array.isArray(response) || response.length === 0) return 0;
      const path = response as [number, number][];
      const blocked = new Set(c.walls.map(([x, y]) => `${x},${y}`));
      const startOk = path[0]?.[0] === c.start[0] && path[0]?.[1] === c.start[1];
      const last = path[path.length - 1];
      const goalOk = last?.[0] === c.goal[0] && last?.[1] === c.goal[1];
      if (!startOk || !goalOk) return 0;
      for (let i = 1; i < path.length; i++) {
        const a = path[i - 1] as [number, number];
        const b = path[i] as [number, number];
        const step = Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
        if (step !== 1) return 0;
        if (blocked.has(`${b[0]},${b[1]}`)) return 0;
      }
      const len = path.length - 1;
      return len <= optimal.length ? 1 : optimal.length / len;
    },
  },
};
