import type { RawBankItem } from '../bank-loader';
import { num, type Verifier } from './types';

/**
 * Per-type verifiers for the spatial domain, keyed by `typeCode`.
 *
 * Each entry grades a constructed response that no generic verifier can handle.
 * Re-derive the expected response from `item.content` plus `item.answer` where
 * possible, rather than trusting a stored key, and never show correctness to the
 * client beyond the boolean this returns.
 *
 * Every verifier here re-solves the geometry from `content` alone — the BFS, the
 * flood fill, the reverse unfold, the exact cover and the plane section are all
 * ported from the banks' independent checkers in
 * `research/exam-question-types/generators/check-<TYPE>.mjs` (ported, never
 * imported: the research tree is not a runtime dependency of the app).
 *
 * Where a bank stores one reference solution but many solutions exist (MAZE,
 * PIPES, TANGRAM), `correct` means "this is a valid solution" and the distance
 * from the stored optimum is reported as `M-EFF`. Grading those types by
 * equality with the stored optimum would mark correct children wrong.
 */

/* ------------------------------------------------------------------ *
 * shared response/content readers — never throw, never trust the client
 * ------------------------------------------------------------------ */

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function list(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null;
}

/** An `[a, b]` pair of finite numbers, or null. */
function pair(value: unknown): [number, number] | null {
  const arr = list(value);
  if (!arr || arr.length < 2) return null;
  const a = num(arr[0]);
  const b = num(arr[1]);
  return a === null || b === null ? null : [a, b];
}

/** An `[a, b, c]` triple of finite numbers, or null. */
function triple(value: unknown): [number, number, number] | null {
  const arr = list(value);
  if (!arr || arr.length < 3) return null;
  const a = num(arr[0]);
  const b = num(arr[1]);
  const c = num(arr[2]);
  return a === null || b === null || c === null ? null : [a, b, c];
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

/** Efficiency vs the stored optimum, 1 = optimal, in `M-EFF`'s 0..1 higher-better range. */
function efficiency(optimal: number | null, used: number | null): number | null {
  if (optimal === null || used === null) return null;
  if (used <= 0) return optimal <= 0 ? 1 : 0;
  return clamp01(optimal / used);
}

/** Signed degrees folded into (-180, 180]. */
function wrap180(deg: number): number {
  let d = ((deg + 180) % 360) - 180;
  if (d <= -180) d += 360;
  return d;
}

/* ================================================================== *
 * SPA-HIDDENCUBE-01 — count every cube, including the occluded ones
 * ================================================================== */

/**
 * Total cubes in the pile, recounted from `content.stack.layers` (the served
 * geometry) rather than read off the key: one cube per distinct in-bounds
 * `(layer, row, col)` cell. Mirrors the checker's occupancy popcount.
 */
function cubeTotal(content: Record<string, unknown>): number | null {
  const stack = record(content.stack);
  if (!stack) return null;
  const rows = num(stack.rows);
  const cols = num(stack.cols);
  const maxHeight = num(stack.maxHeight);
  const layers = list(stack.layers);
  if (rows === null || cols === null || maxHeight === null || !layers) return null;

  const occupied = new Set<string>();
  for (let y = 0; y < layers.length; y++) {
    if (y >= maxHeight) return null;
    const cells = list(layers[y]);
    if (!cells) return null;
    for (const cell of cells) {
      const rc = pair(cell);
      if (!rc) return null;
      const [r, c] = rc;
      if (r < 0 || r >= rows || c < 0 || c >= cols) return null;
      occupied.add(`${y},${r},${c}`);
    }
  }
  return occupied.size;
}

/**
 * The graded quantity is the child's cube count. `M-VIEWANG` reports the signed
 * offset of the viewpoint the child settled on from the item's canonical
 * three-quarter view — the perspective the answer is keyed to.
 */
const verifyHiddenCube: Verifier = (item, response) => {
  const count = num(response.count);
  const recomputed = cubeTotal(item.content);
  const stored = num(item.answer.correctCount) ?? num(Number(item.answer.correctKey));
  const total = recomputed ?? stored;

  const metrics: Record<string, number> = {};
  const view = record(item.content.view);
  const finalYaw = num(response.finalYawDeg);
  const canonicalYaw = view ? num(view.canonicalYawDeg) : null;
  if (finalYaw !== null && canonicalYaw !== null) {
    metrics['M-VIEWANG'] = wrap180(finalYaw - canonicalYaw);
  }

  if (count === null || total === null) return { correct: false, metrics };
  return { correct: count === total, metrics };
};

/* ================================================================== *
 * SPA-MAZE-01 — walk the maze from start to goal, collecting the gems
 * ================================================================== */

function mazeEdgeKey(a: readonly [number, number], b: readonly [number, number]): string {
  const [r1, c1] = a;
  const [r2, c2] = b;
  return r1 < r2 || (r1 === r2 && c1 < c2)
    ? `${r1},${c1}-${r2},${c2}`
    : `${r2},${c2}-${r1},${c1}`;
}

/**
 * A submitted route is correct iff it is a LEGAL WALK — every step 4-adjacent
 * and through an open edge — that starts at `content.start`, ends at
 * `content.goal` and visits every gem.
 *
 * `answer.optimalPath` is deliberately NOT the key: the bank's own response
 * taxonomy classes a longer legal route as "detour … (inefficiency)", and many
 * legal routes exist. Efficiency against `answer.optimalLength` is reported as
 * `M-EFF` instead.
 */
const verifyMaze: Verifier = (item, response) => {
  const content = item.content;
  const start = pair(content.start);
  const goal = pair(content.goal);
  const openEdges = list(content.openEdges);
  const gems = list(content.gems);
  const submitted = list(response.path);
  if (!start || !goal || !openEdges || !gems || !submitted || submitted.length < 1) {
    return { correct: false };
  }

  const open = new Set<string>();
  for (const edge of openEdges) {
    if (typeof edge !== 'string') return { correct: false };
    open.add(edge);
  }

  const path: [number, number][] = [];
  for (const step of submitted) {
    const cell = pair(step);
    if (!cell) return { correct: false };
    path.push(cell);
  }

  const steps = path.length - 1;
  const optimal = num(item.answer.optimalLength);
  const eff = efficiency(optimal, steps);
  const metrics: Record<string, number> = eff === null ? {} : { 'M-EFF': eff };

  const same = (a: readonly [number, number], b: readonly [number, number]) =>
    a[0] === b[0] && a[1] === b[1];
  if (!same(path[0]!, start)) return { correct: false, metrics };
  if (!same(path[path.length - 1]!, goal)) return { correct: false, metrics };

  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!;
    const b = path[i]!;
    if (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) !== 1) return { correct: false, metrics };
    if (!open.has(mazeEdgeKey(a, b))) return { correct: false, metrics };
  }

  const visited = new Set(path.map((p) => `${p[0]},${p[1]}`));
  for (const gem of gems) {
    const g = pair(gem);
    if (!g) return { correct: false, metrics };
    if (!visited.has(`${g[0]},${g[1]}`)) return { correct: false, metrics };
  }

  return { correct: true, metrics };
};

/* ================================================================== *
 * SPA-PIPES-01 — rotate the tiles until the road connects
 * ================================================================== */

const PIPE_DIRS = ['N', 'E', 'S', 'W'] as const;
type PipeDir = (typeof PIPE_DIRS)[number];
const PIPE_OPP: Record<PipeDir, PipeDir> = { N: 'S', S: 'N', E: 'W', W: 'E' };
const PIPE_CW: Record<PipeDir, PipeDir> = { N: 'E', E: 'S', S: 'W', W: 'N' };

function isPipeDir(value: unknown): value is PipeDir {
  return typeof value === 'string' && (PIPE_DIRS as readonly string[]).includes(value);
}

function pipeArms(value: unknown): PipeDir[] | null {
  const arr = list(value);
  if (!arr) return null;
  const seen = new Set<PipeDir>();
  for (const d of arr) {
    if (!isPipeDir(d)) return null;
    seen.add(d);
  }
  return [...seen].sort((a, b) => PIPE_DIRS.indexOf(a) - PIPE_DIRS.indexOf(b));
}

function rotateArms(arms: readonly PipeDir[], quarterTurns: number): PipeDir[] {
  let out = [...arms];
  const n = ((quarterTurns % 4) + 4) % 4;
  for (let i = 0; i < n; i++) out = out.map((d) => PIPE_CW[d]);
  return out.sort((a, b) => PIPE_DIRS.indexOf(a) - PIPE_DIRS.indexOf(b));
}

function armsEqual(a: readonly PipeDir[], b: readonly PipeDir[]): boolean {
  return a.length === b.length && a.every((d, i) => d === b[i]);
}

/** Quarter-turns taking `from` to `to`, or null when `to` is not a rotation of `from`. */
function quarterTurnsBetween(from: readonly PipeDir[], to: readonly PipeDir[]): number | null {
  for (let k = 0; k < 4; k++) if (armsEqual(rotateArms(from, k), to)) return k;
  return null;
}

/**
 * Correct iff the submitted wiring actually carries the road from the car to the
 * flag through every gem — a flood fill over matching arms, exactly the demo's
 * and the checker's connectivity test. `answer.optimalRot` is one solution among
 * several, so it grades efficiency (`M-EFF`), not correctness.
 *
 * Every submitted tile must be a genuine rotation of the tile the child was
 * served; a wiring the tray cannot produce is rejected.
 */
const verifyPipes: Verifier = (item, response) => {
  const content = item.content;
  const grid = record(content.grid);
  const tiles = list(content.tiles);
  const start = pair(content.start);
  const goal = pair(content.goal);
  const gems = list(content.gems) ?? [];
  if (!grid || !tiles || !start || !goal) return { correct: false };
  const rows = num(grid.R);
  const cols = num(grid.C);
  if (rows === null || cols === null) return { correct: false };

  const served = new Map<string, PipeDir[]>();
  for (const tile of tiles) {
    const t = record(tile);
    if (!t) return { correct: false };
    const r = num(t.r);
    const c = num(t.c);
    const arms = pipeArms(t.dirs);
    if (r === null || c === null || !arms) return { correct: false };
    served.set(`${r},${c}`, arms);
  }

  const submitted = list(response.finalOrients);
  if (!submitted) return { correct: false };
  const wiring = new Map(served);
  let rotations = 0;
  for (const entry of submitted) {
    const o = record(entry);
    if (!o) return { correct: false };
    const r = num(o.r);
    const c = num(o.c);
    const arms = pipeArms(o.dirs);
    if (r === null || c === null || !arms) return { correct: false };
    const base = served.get(`${r},${c}`);
    if (!base) return { correct: false };
    const turns = quarterTurnsBetween(base, arms);
    if (turns === null) return { correct: false };
    rotations += turns;
    wiring.set(`${r},${c}`, arms);
  }

  const eff = efficiency(num(item.answer.optimalRot), rotations);
  const metrics: Record<string, number> = eff === null ? {} : { 'M-EFF': eff };

  const armsAt = (r: number, c: number) => wiring.get(`${r},${c}`) ?? [];
  if (!armsAt(start[0], start[1]).includes('W')) return { correct: false, metrics };
  if (!armsAt(goal[0], goal[1]).includes('E')) return { correct: false, metrics };

  const neighbours = (r: number, c: number): [number, number, PipeDir][] => {
    const out: [number, number, PipeDir][] = [];
    if (r > 0) out.push([r - 1, c, 'N']);
    if (r < rows - 1) out.push([r + 1, c, 'S']);
    if (c > 0) out.push([r, c - 1, 'W']);
    if (c < cols - 1) out.push([r, c + 1, 'E']);
    return out;
  };

  const seen = new Set([`${start[0]},${start[1]}`]);
  const queue: [number, number][] = [start];
  for (let qi = 0; qi < queue.length; qi++) {
    const [r, c] = queue[qi]!;
    const here = armsAt(r, c);
    for (const [nr, nc, dir] of neighbours(r, c)) {
      if (!here.includes(dir)) continue;
      if (!armsAt(nr, nc).includes(PIPE_OPP[dir])) continue;
      if (seen.has(`${nr},${nc}`)) continue;
      seen.add(`${nr},${nc}`);
      queue.push([nr, nc]);
    }
  }

  if (!seen.has(`${goal[0]},${goal[1]}`)) return { correct: false, metrics };
  for (const gem of gems) {
    const g = pair(gem);
    if (!g) return { correct: false, metrics };
    if (!seen.has(`${g[0]},${g[1]}`)) return { correct: false, metrics };
  }
  return { correct: true, metrics };
};

/* ================================================================== *
 * SPA-PUNCH-01 — mark every hole the unfolded sheet will carry
 * ================================================================== */

interface PunchCrease {
  op: string;
  p: number;
  m: number;
  before: { x0: number; y0: number; x1: number; y1: number };
}

const PUNCH_VERTICAL = (op: string) => op === 'L' || op === 'R';
const PUNCH_HORIZONTAL = (op: string) => op === 'T' || op === 'B';
const PUNCH_OBLIQUE = (op: string) => op === 'D1' || op === 'D2';

/** Replay the fold sequence, recording each crease so a punch can be mirrored back out. */
function punchCreases(n: number, ops: readonly string[]): PunchCrease[] | null {
  let bb = { x0: 0, y0: 0, x1: n - 1, y1: n - 1 };
  const creases: PunchCrease[] = [];
  let diagonal = false;
  for (const op of ops) {
    if (diagonal) return null;
    const w = bb.x1 - bb.x0 + 1;
    const h = bb.y1 - bb.y0 + 1;
    if (PUNCH_VERTICAL(op)) {
      if (w < 2 || w % 2) return null;
      const p = bb.x0 + w / 2;
      creases.push({ op, p, m: w, before: { ...bb } });
      bb = op === 'L' ? { ...bb, x0: p } : { ...bb, x1: p - 1 };
    } else if (PUNCH_HORIZONTAL(op)) {
      if (h < 2 || h % 2) return null;
      const p = bb.y0 + h / 2;
      creases.push({ op, p, m: h, before: { ...bb } });
      bb = op === 'T' ? { ...bb, y0: p } : { ...bb, y1: p - 1 };
    } else if (PUNCH_OBLIQUE(op)) {
      if (w !== h || w < 2) return null;
      creases.push({ op, p: 0, m: w, before: { ...bb } });
      diagonal = true;
    } else return null;
  }
  return creases;
}

/** Walk the creases backwards, adding the mirror image of every point already found. */
function reverseUnfoldPoint(creases: readonly PunchCrease[], px: number, py: number): Set<string> {
  const cells = new Set([`${px},${py}`]);
  for (let i = creases.length - 1; i >= 0; i--) {
    const f = creases[i]!;
    const added: string[] = [];
    for (const key of cells) {
      const [x, y] = key.split(',').map(Number) as [number, number];
      if (f.op === 'L') {
        if (x >= f.p) {
          const m = 2 * f.p - 1 - x;
          if (m >= f.before.x0 && m < f.p) added.push(`${m},${y}`);
        }
      } else if (f.op === 'R') {
        if (x < f.p) {
          const m = 2 * f.p - 1 - x;
          if (m <= f.before.x1 && m >= f.p) added.push(`${m},${y}`);
        }
      } else if (f.op === 'T') {
        if (y >= f.p) {
          const m = 2 * f.p - 1 - y;
          if (m >= f.before.y0 && m < f.p) added.push(`${x},${m}`);
        }
      } else if (f.op === 'B') {
        if (y < f.p) {
          const m = 2 * f.p - 1 - y;
          if (m <= f.before.y1 && m >= f.p) added.push(`${x},${m}`);
        }
      } else if (f.op === 'D1') {
        const a = x - f.before.x0;
        const b = y - f.before.y0;
        if (a <= b) {
          const nx = f.before.x0 + b;
          const ny = f.before.y0 + a;
          if (nx !== x || ny !== y) added.push(`${nx},${ny}`);
        }
      } else if (f.op === 'D2') {
        const a = x - f.before.x0;
        const b = y - f.before.y0;
        if (a + b <= f.m - 1) {
          const nx = f.before.x0 + (f.m - 1 - b);
          const ny = f.before.y0 + (f.m - 1 - a);
          if (nx !== x || ny !== y) added.push(`${nx},${ny}`);
        }
      }
    }
    for (const key of added) cells.add(key);
  }
  return cells;
}

/** The hole set, reverse-unfolded from the served folds and punches alone. */
function punchedCells(content: Record<string, unknown>): Set<string> | null {
  const grid = record(content.grid);
  const folds = list(content.folds);
  const punches = list(content.punches);
  if (!grid || !folds || !punches) return null;
  const n = num(grid.n);
  if (n === null || n < 2) return null;

  const ops: string[] = [];
  for (const fold of folds) {
    const f = record(fold);
    if (!f || typeof f.op !== 'string') return null;
    ops.push(f.op);
  }
  const creases = punchCreases(n, ops);
  if (!creases) return null;

  const holes = new Set<string>();
  for (const punch of punches) {
    const p = record(punch);
    if (!p) return null;
    const x = num(p.x);
    const y = num(p.y);
    if (x === null || y === null) return null;
    for (const cell of reverseUnfoldPoint(creases, x, y)) holes.add(cell);
  }
  return holes;
}

const PUNCH_REFLECTIONS: ((n: number, x: number, y: number) => string)[] = [
  (n, x, y) => `${n - 1 - x},${y}`,
  (n, x, y) => `${x},${n - 1 - y}`,
  (_n, x, y) => `${y},${x}`,
  (n, x, y) => `${n - 1 - y},${n - 1 - x}`,
];

/**
 * Correct iff the marked cells are exactly the hole set obtained by reverse-
 * unfolding the served folds and punches. `M-POLY` is the cell overlap (Jaccard
 * of marked vs true), which is meaningful here because a child can be one
 * reflection short; `M-MIRRORFA` flags a set that is the whole pattern mirrored.
 */
const verifyPunch: Verifier = (item, response) => {
  const truth = punchedCells(item.content);
  const marked = list(response.markedCells);
  if (!truth || !marked) return { correct: false };

  const got = new Set<string>();
  for (const cell of marked) {
    const xy = pair(cell);
    if (!xy) return { correct: false };
    got.add(`${xy[0]},${xy[1]}`);
  }

  let hits = 0;
  for (const cell of got) if (truth.has(cell)) hits++;
  const union = truth.size + got.size - hits;
  const metrics: Record<string, number> = { 'M-POLY': union > 0 ? hits / union : 0 };

  const grid = record(item.content.grid);
  const n = grid ? num(grid.n) : null;
  if (n !== null) {
    const mirrored = PUNCH_REFLECTIONS.some((reflect) => {
      const image = new Set<string>();
      for (const cell of truth) {
        const [x, y] = cell.split(',').map(Number) as [number, number];
        image.add(reflect(n, x, y));
      }
      if (image.size !== got.size) return false;
      for (const cell of image) if (!got.has(cell)) return false;
      return true;
    });
    metrics['M-MIRRORFA'] = mirrored && hits !== truth.size ? 1 : 0;
  }

  return { correct: got.size === truth.size && hits === truth.size, metrics };
};

/* ================================================================== *
 * SPA-SCENE-01 — order the cards as the robot sees them
 * ================================================================== */

interface SceneObject {
  id: number;
  x: number;
  y: number;
}

function sceneObjects(content: Record<string, unknown>): {
  objects: SceneObject[];
  robot: { x: number; y: number };
} | null {
  const scene = record(content.scene);
  if (!scene) return null;
  const raw = list(scene.objects);
  const robotRec = record(scene.robot);
  if (!raw || !robotRec) return null;
  const rx = num(robotRec.x);
  const ry = num(robotRec.y);
  if (rx === null || ry === null) return null;

  const objects: SceneObject[] = [];
  for (const entry of raw) {
    const o = record(entry);
    if (!o) return null;
    const id = num(o.id);
    const x = num(o.x);
    const y = num(o.y);
    if (id === null || x === null || y === null) return null;
    objects.push({ id, x, y });
  }
  return objects.length >= 2 ? { objects, robot: { x: rx, y: ry } } : null;
}

/**
 * Left-to-right as seen from `observer`, by the trig-free cross-product
 * comparator the bank checker uses. A valid total order because every object is
 * in front of the robot (the bank enforces that).
 */
function seenOrder(objects: readonly SceneObject[], observer: { x: number; y: number }): number[] {
  return objects
    .map((o) => ({ id: o.id, x: o.x - observer.x, y: o.y - observer.y }))
    .sort((a, b) => b.x * a.y - b.y * a.x)
    .map((o) => o.id);
}

/**
 * Correct iff the submitted order is the robot's-eye order re-derived from the
 * scene geometry (plus the nearest card when the item asks for it). `M-POLY`
 * grades the correctly ordered pairs — the partial-credit basis the bank records
 * as `diagnostics.orderedPairTotal` — and `M-MIRRORFA` flags the exact
 * left-right reversal, the egocentric-bias foil every item carries.
 */
const verifyScene: Verifier = (item, response) => {
  const scene = sceneObjects(item.content);
  const submitted = list(response.order);
  if (!scene || !submitted) return { correct: false };

  const order: number[] = [];
  for (const entry of submitted) {
    const id = num(entry);
    if (id === null) return { correct: false };
    order.push(id);
  }

  const derived = seenOrder(scene.objects, scene.robot);
  const expected =
    derived.length === scene.objects.length
      ? derived
      : (list(item.answer.correctOrder) ?? [])
          .map((v) => num(v))
          .filter((v): v is number => v !== null);
  if (expected.length !== scene.objects.length) return { correct: false };

  const position = new Map(order.map((id, i) => [id, i]));
  let concordant = 0;
  let pairs = 0;
  for (let i = 0; i < expected.length; i++) {
    for (let j = i + 1; j < expected.length; j++) {
      pairs++;
      const a = position.get(expected[i]!);
      const b = position.get(expected[j]!);
      if (a !== undefined && b !== undefined && a < b) concordant++;
    }
  }
  const reversed = [...expected].reverse();
  const sameAs = (other: readonly number[]) =>
    order.length === other.length && order.every((id, i) => id === other[i]);

  const metrics: Record<string, number> = {
    'M-POLY': pairs > 0 ? concordant / pairs : 0,
    'M-MIRRORFA': !sameAs(expected) && sameAs(reversed) ? 1 : 0,
  };

  if (!sameAs(expected)) return { correct: false, metrics };

  const question = record(item.content.question);
  if (question?.requireNearest === true) {
    let nearestId: number | null = null;
    let best = Infinity;
    for (const o of scene.objects) {
      const dist = Math.hypot(o.x - scene.robot.x, o.y - scene.robot.y);
      if (dist < best) {
        best = dist;
        nearestId = o.id;
      }
    }
    if (num(response.nearestId) !== nearestId) return { correct: false, metrics };
  }

  return { correct: true, metrics };
};

/* ================================================================== *
 * SPA-TANGRAM-01 — tile the outline with the tray pieces
 * ================================================================== */

type Cell3 = [number, number, number];

const cellKey = (c: Cell3) => `${c[0]},${c[1]},${c[2]}`;

function normalizeShape(cells: readonly Cell3[]): Cell3[] {
  const ml = Math.min(...cells.map((c) => c[0]));
  const mr = Math.min(...cells.map((c) => c[1]));
  const mc = Math.min(...cells.map((c) => c[2]));
  return cells
    .map((c) => [c[0] - ml, c[1] - mr, c[2] - mc] as Cell3)
    .sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
}

const shapeKey = (cells: readonly Cell3[]) => normalizeShape(cells).map((c) => c.join(',')).join('|');

/** Quarter-turn about the vertical axis — the only transform the tray affords. */
const rotateShape = (cells: readonly Cell3[]) =>
  normalizeShape(cells.map(([l, r, c]) => [l, c, -r] as Cell3));

function rotationKeys(offsets: readonly Cell3[]): Set<string> {
  const keys = new Set<string>();
  let current = normalizeShape(offsets);
  for (let i = 0; i < 4; i++) {
    keys.add(shapeKey(current));
    current = rotateShape(current);
  }
  return keys;
}

/**
 * Correct iff the placed pieces EXACTLY COVER the target outline: every placed
 * piece is a rotation of its tray shape, lies inside the outline, overlaps
 * nothing, and together they cover every target cell.
 *
 * `answer.referenceSolution` is one exact cover; the tray also ships herring
 * pieces that belong to no cover, so "every piece used once" is not the rule and
 * a different valid tiling must grade correct. `M-EFF` compares the number of
 * pieces used with `answer.optimalPlacements`; `M-POLY` is the covered fraction.
 */
const verifyTangram: Verifier = (item, response) => {
  const target = record(item.content.target);
  const tray = list(item.content.tray);
  const placements = list(response.placements);
  if (!target || !tray || !placements) return { correct: false };

  const targetCells = list(target.cells);
  if (!targetCells) return { correct: false };
  const targetSet = new Set<string>();
  for (const cell of targetCells) {
    const c = triple(cell);
    if (!c) return { correct: false };
    targetSet.add(cellKey(c));
  }

  const trayShapes = new Map<number, Cell3[]>();
  for (const entry of tray) {
    const piece = record(entry);
    if (!piece) return { correct: false };
    const id = num(piece.id);
    const offsets = list(piece.offsets);
    if (id === null || !offsets || offsets.length === 0) return { correct: false };
    const shape: Cell3[] = [];
    for (const offset of offsets) {
      const c = triple(offset);
      if (!c) return { correct: false };
      shape.push(c);
    }
    trayShapes.set(id, shape);
  }

  const covered = new Set<string>();
  const usedIds = new Set<number>();
  let legal = true;

  for (const entry of placements) {
    const placement = record(entry);
    if (!placement) return { correct: false };
    const id = num(placement.id);
    const cells = list(placement.cells);
    if (id === null || !cells || cells.length === 0) return { correct: false };

    const abs: Cell3[] = [];
    for (const cell of cells) {
      const c = triple(cell);
      if (!c) return { correct: false };
      abs.push(c);
    }

    const shape = trayShapes.get(id);
    if (!shape || usedIds.has(id)) legal = false;
    else if (!rotationKeys(shape).has(shapeKey(abs))) legal = false;
    usedIds.add(id);

    for (const cell of abs) {
      const key = cellKey(cell);
      if (!targetSet.has(key) || covered.has(key)) legal = false;
      else covered.add(key);
    }
  }

  const eff = efficiency(num(item.answer.optimalPlacements), usedIds.size);
  const metrics: Record<string, number> = {
    'M-POLY': targetSet.size > 0 ? covered.size / targetSet.size : 0,
  };
  if (eff !== null) metrics['M-EFF'] = eff;

  return { correct: legal && covered.size === targetSet.size, metrics };
};

/* ================================================================== *
 * SPA-XPLANE-01 — cut the solid so the section matches the outline
 * ================================================================== */

type Vec3 = [number, number, number];
type Vec2 = [number, number];

const v3sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const v3add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const v3mul = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const v3dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const v3cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
function v3unit(a: Vec3): Vec3 {
  const n = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / n, a[1] / n, a[2] / n];
}
const v3near = (a: Vec3, b: Vec3) => Math.hypot(...v3sub(a, b)) < 1e-6;

interface CuttingPlane {
  n: Vec3;
  d: number;
  u: Vec3;
  v: Vec3;
}

interface Solid {
  verts: Vec3[];
  faces: number[][];
}

interface PlaneModel {
  tiltMaxRad: number;
  twistMaxRad: number;
  offsetBase: number;
  offsetSpan: number;
}

/** `content.planeModel`'s published normal + offset formulas, verbatim. */
function planeFor(solid: Solid, pm: PlaneModel, h: number, t: number, w: number): CuttingPlane {
  const a = (t / 100) * pm.tiltMaxRad;
  const b = (w / 100) * pm.twistMaxRad;
  const n = v3unit([Math.sin(a) * Math.cos(b), Math.cos(a), Math.sin(a) * Math.sin(b)]);
  const ds = solid.verts.map((p) => v3dot(n, p));
  const lo = Math.min(...ds);
  const hi = Math.max(...ds);
  const d = lo + (pm.offsetBase + pm.offsetSpan * (h / 100)) * (hi - lo);
  // (u, v, n) right-handed: the comparison is rotation invariant, and this is
  // what makes it chirality-sensitive.
  const ref: Vec3 = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 0, 1];
  const u = v3unit(v3cross(n, ref));
  const v = v3unit(v3cross(n, u));
  return { n, d, u, v };
}

/** Clip each face against the plane and chain the cut segments into the section loop. */
function sectionLoop(solid: Solid, pl: CuttingPlane): Vec3[] {
  const segments: [Vec3, Vec3][] = [];
  for (const face of solid.faces) {
    const hits: Vec3[] = [];
    for (let i = 0; i < face.length; i++) {
      const A = solid.verts[face[i]!];
      const B = solid.verts[face[(i + 1) % face.length]!];
      if (!A || !B) return [];
      const da = v3dot(pl.n, A) - pl.d;
      const db = v3dot(pl.n, B) - pl.d;
      if (Math.abs(da) < 1e-9) hits.push(A);
      else if (da * db < 0) hits.push(v3add(A, v3mul(v3sub(B, A), da / (da - db))));
    }
    const unique: Vec3[] = [];
    for (const p of hits) if (!unique.some((q) => v3near(p, q))) unique.push(p);
    if (unique.length >= 2) segments.push([unique[0]!, unique[unique.length - 1]!]);
  }
  if (segments.length < 3) return [];

  const used = segments.map(() => false);
  used[0] = true;
  const loop: Vec3[] = [segments[0]![0], segments[0]![1]];
  for (let step = 0; step < segments.length; step++) {
    const end = loop[loop.length - 1]!;
    let advanced = false;
    for (let i = 0; i < segments.length; i++) {
      if (used[i]) continue;
      const [a, b] = segments[i]!;
      if (v3near(a, end)) {
        loop.push(b);
        used[i] = true;
        advanced = true;
        break;
      }
      if (v3near(b, end)) {
        loop.push(a);
        used[i] = true;
        advanced = true;
        break;
      }
    }
    if (!advanced) break;
  }
  if (loop.length > 2 && v3near(loop[loop.length - 1]!, loop[0]!)) loop.pop();

  const unique: Vec3[] = [];
  for (const p of loop) if (!unique.some((q) => v3near(p, q))) unique.push(p);
  return unique.length >= 3 ? unique : [];
}

/** Centroid-centred 2D outline, forced counter-clockwise in the right-handed frame. */
function outlineOf(poly: readonly Vec3[], pl: CuttingPlane): Vec2[] {
  if (poly.length < 3) return [];
  const q: Vec2[] = poly.map((p) => [v3dot(p, pl.u), v3dot(p, pl.v)]);
  const cx = q.reduce((s, p) => s + p[0], 0) / q.length;
  const cy = q.reduce((s, p) => s + p[1], 0) / q.length;
  const centred: Vec2[] = q.map((p) => [p[0] - cx, p[1] - cy]);
  let area = 0;
  for (let i = 0; i < centred.length; i++) {
    const a = centred[i]!;
    const b = centred[(i + 1) % centred.length]!;
    area += a[0] * b[1] - b[0] * a[1];
  }
  return area < 0 ? centred.reverse() : centred;
}

/**
 * RMS vertex distance minimised over cyclic shifts after the closed-form
 * Procrustes rotation. Rotation invariant but scale- AND chirality-sensitive, so
 * a mirror image of the target does not pass.
 */
function shapeDistance(A: readonly Vec2[], B: readonly Vec2[]): number {
  const n = A.length;
  if (!n || n !== B.length) return Infinity;
  let best = Infinity;
  for (let k = 0; k < n; k++) {
    let sc = 0;
    let ss = 0;
    for (let i = 0; i < n; i++) {
      const a = A[i]!;
      const b = B[(i + k) % n]!;
      sc += a[0] * b[0] + a[1] * b[1];
      ss += a[1] * b[0] - a[0] * b[1];
    }
    const th = Math.atan2(ss, sc);
    const ct = Math.cos(th);
    const st = Math.sin(th);
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const a = A[i]!;
      const b = B[(i + k) % n]!;
      const rx = b[0] * ct - b[1] * st;
      const ry = b[0] * st + b[1] * ct;
      sum += (a[0] - rx) ** 2 + (a[1] - ry) ** 2;
    }
    best = Math.min(best, Math.sqrt(sum / n));
  }
  return best;
}

const reflectOutline = (poly: readonly Vec2[]): Vec2[] =>
  poly.map((p) => [p[0], -p[1]] as Vec2).reverse();

function readSolid(content: Record<string, unknown>): Solid | null {
  const solid = record(content.solid);
  if (!solid) return null;
  const rawVerts = list(solid.verts);
  const rawFaces = list(solid.faces);
  if (!rawVerts || !rawFaces) return null;
  const verts: Vec3[] = [];
  for (const v of rawVerts) {
    const t = triple(v);
    if (!t) return null;
    verts.push(t);
  }
  const faces: number[][] = [];
  for (const f of rawFaces) {
    const idx = list(f);
    if (!idx || idx.length < 3) return null;
    const face: number[] = [];
    for (const i of idx) {
      const n = num(i);
      if (n === null || !Number.isInteger(n) || n < 0 || n >= verts.length) return null;
      face.push(n);
    }
    faces.push(face);
  }
  return verts.length >= 4 && faces.length >= 4 ? { verts, faces } : null;
}

function readPlaneModel(content: Record<string, unknown>): PlaneModel | null {
  const pm = record(content.planeModel);
  if (!pm) return null;
  const tiltMaxRad = num(pm.tiltMaxRad);
  const twistMaxRad = num(pm.twistMaxRad);
  const offsetBase = num(pm.offsetBase);
  const offsetSpan = num(pm.offsetSpan);
  if (tiltMaxRad === null || twistMaxRad === null || offsetBase === null || offsetSpan === null) {
    return null;
  }
  return { tiltMaxRad, twistMaxRad, offsetBase, offsetSpan };
}

function readSignature(value: unknown): Vec2[] | null {
  const arr = list(value);
  if (!arr || arr.length < 3) return null;
  const out: Vec2[] = [];
  for (const entry of arr) {
    const p = pair(entry);
    if (!p) return null;
    out.push(p);
  }
  return out;
}

/**
 * `scoring.rule` verbatim: derive the plane from `response.plane` via
 * `content.planeModel`, take the outline of the section, and accept iff it has
 * `answer.vertexCount` vertices AND its shape distance to
 * `answer.targetSignature` is within `answer.shapeToleranceRms`.
 *
 * The distance is scale- and chirality-sensitive, so a mirrored cut face — the
 * `mirrored_twist` foil the bank ships — is rejected and reported as
 * `M-MIRRORFA`. `M-POLY` is the shape distance itself, per the bank's own
 * `scoring.partialCredit` ("lower is closer").
 */
const verifyXPlane: Verifier = (item, response) => {
  const content = item.content;
  const solid = readSolid(content);
  const pm = readPlaneModel(content);
  const controls = record(content.controls);
  const plane = record(response.plane);
  if (!solid || !pm || !controls || !plane) return { correct: false };

  const h = num(plane.h);
  const t = num(plane.t);
  const w = num(plane.w);
  if (h === null || t === null || w === null) return { correct: false };

  const range = list(record(content.planeModel)?.controlRange) ?? [0, 100];
  const lo = num(range[0]) ?? 0;
  const hi = num(range[1]) ?? 100;
  if (h < lo || h > hi || t < lo || t > hi || w < lo || w > hi) return { correct: false };

  // A locked control cannot be moved by the child; a response that moved one is
  // off-protocol, not a cut worth grading.
  const startPlane = record(controls.startPlane);
  if (startPlane) {
    if (controls.tilt !== true && num(startPlane.t) !== t) return { correct: false };
    if (controls.twist !== true && num(startPlane.w) !== w) return { correct: false };
  }

  const signature = readSignature(item.answer.targetSignature);
  const vertexCount = num(item.answer.vertexCount);
  const tolerance = num(item.answer.shapeToleranceRms);
  if (!signature || vertexCount === null || tolerance === null) return { correct: false };

  const pl = planeFor(solid, pm, h, t, w);
  const outline = outlineOf(sectionLoop(solid, pl), pl);
  const distance = outline.length === signature.length ? shapeDistance(outline, signature) : Infinity;

  const metrics: Record<string, number> = {};
  if (Number.isFinite(distance)) metrics['M-POLY'] = distance;

  const correct = outline.length === vertexCount && distance <= tolerance;
  const mirrored =
    !correct &&
    outline.length === signature.length &&
    shapeDistance(outline, reflectOutline(signature)) <= tolerance;
  metrics['M-MIRRORFA'] = mirrored ? 1 : 0;

  return { correct, metrics };
};

/* ================================================================== *
 * SPA-VIEW-01 — see the scene from where the other person stands
 * ================================================================== */

/**
 * Whether this item is the heading shell. Read off the ITEM, not the type code:
 * one bank carries both shells, so the shell has to be decided per item.
 * `content.optionKind` is the shell the renderer switched on; the stored heading
 * key is the corroborating server-side signal, and either alone is enough.
 */
function isHeadingItem(item: RawBankItem): boolean {
  return item.content.optionKind === 'heading_dial' || num(item.answer.correctHeadingDeg) !== null;
}

/**
 * One bank, two response shells, so this verifier dispatches per item:
 *
 *   match_viewpoint (`optionKind: 'viewpoint'`, `scoring.mode:
 *     'deterministic_key'`) — the child taps the station whose left-to-right
 *     view is the strip, and `response.selectedKey` is graded against
 *     `answer.correctKey`. `M-MIRRORFA` flags `answer.mirrorFoilKey`, the
 *     station that sees the strip exactly reversed.
 *
 *   point_heading (`optionKind: 'heading_dial'`, `scoring.rule` the signed-error
 *     rule) — the child turns a dial, and `response.headingDeg` is correct iff
 *     it is within `answer.toleranceDeg` of `answer.correctHeadingDeg`. Both are
 *     server-only, which is why the demo can report the raw dial angle but never
 *     the error: `M-VIEWANG`, the bank's own partial-credit metric, is the
 *     signed error in degrees and can only be computed here.
 *
 * The heading comparison is CIRCULAR (`wrap180`): a 350° answer is 20° from a
 * 10° target, not 340°. Grading it linearly would fail correct children whose
 * answer straddles the dial's ±180° seam.
 */
const verifyView: Verifier = (item, response) => {
  if (isHeadingItem(item)) {
    const heading = num(response.headingDeg);
    const target = num(item.answer.correctHeadingDeg);
    const tolerance = num(item.answer.toleranceDeg);
    if (heading === null || target === null || tolerance === null) return { correct: false };
    const error = wrap180(heading - target);
    return { correct: Math.abs(error) <= tolerance, metrics: { 'M-VIEWANG': error } };
  }

  const selectedKey = typeof response.selectedKey === 'string' ? response.selectedKey : null;
  const correctKey = item.answer.correctKey;
  const mirrorFoil =
    typeof item.answer.mirrorFoilKey === 'string' ? item.answer.mirrorFoilKey : null;
  const metrics: Record<string, number> =
    mirrorFoil === null ? {} : { 'M-MIRRORFA': selectedKey === mirrorFoil ? 1 : 0 };
  if (selectedKey === null || typeof correctKey !== 'string') return { correct: false, metrics };
  return { correct: selectedKey === correctKey, metrics };
};

/* ================================================================== */

export const spatialVerifiers: Record<string, Verifier> = {
  'SPA-HIDDENCUBE-01': verifyHiddenCube,
  'SPA-MAZE-01': verifyMaze,
  'SPA-PIPES-01': verifyPipes,
  'SPA-PUNCH-01': verifyPunch,
  'SPA-SCENE-01': verifyScene,
  'SPA-TANGRAM-01': verifyTangram,
  'SPA-VIEW-01': verifyView,
  'SPA-XPLANE-01': verifyXPlane,
};
