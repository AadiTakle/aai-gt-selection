import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import type { RawBankItem } from '../bank-loader';
import { spatialVerifiers } from './spatial';
import type { Verdict } from './types';

/**
 * Round-trip tests for the seven spatial verifiers.
 *
 * Every case loads a REAL bank item and feeds it the bank's own reference
 * solution as the child's response — the reference exists precisely so the
 * verifier can be validated against it. Each type is tested in both directions,
 * and the three multi-solution types (MAZE, PIPES, TANGRAM) additionally assert
 * that a valid NON-OPTIMAL solution still grades correct: grading those by
 * equality with the stored optimum would mark correct children wrong.
 */

function banksDir(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let up = 0; up < 8; up++) {
    const candidate = path.join(dir, 'research', 'exam-question-types', 'banks');
    if (existsSync(candidate)) return candidate;
    dir = path.dirname(dir);
  }
  throw new Error('bank directory not found');
}

const BANKS = banksDir();

function loadBank(typeCode: string): RawBankItem[] {
  return readFileSync(path.join(BANKS, `${typeCode}.jsonl`), 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as RawBankItem);
}

function grade(item: RawBankItem, response: Record<string, unknown>): Verdict {
  const verifier = spatialVerifiers[item.typeCode];
  if (!verifier) throw new Error(`no verifier for ${item.typeCode}`);
  return verifier(item, response);
}

/** Every verifier must survive garbage without throwing. */
const MALFORMED: Record<string, unknown>[] = [
  {},
  { path: 'not-an-array', order: 3, count: 'x', plane: null, placements: 7, markedCells: {} },
  { path: [null], finalOrients: [{ r: 'a' }], placements: [{}], markedCells: [[]], order: ['a'] },
];

describe('spatial verifiers — registry', () => {
  it('registers exactly the seven in-scope spatial types', () => {
    expect(Object.keys(spatialVerifiers).sort()).toEqual([
      'SPA-HIDDENCUBE-01',
      'SPA-MAZE-01',
      'SPA-PIPES-01',
      'SPA-PUNCH-01',
      'SPA-SCENE-01',
      'SPA-TANGRAM-01',
      'SPA-XPLANE-01',
    ]);
  });

  it.each(Object.keys(spatialVerifiers))('%s returns a verdict on malformed input', (typeCode) => {
    const item = loadBank(typeCode)[0]!;
    for (const response of MALFORMED) {
      expect(() => grade(item, response)).not.toThrow();
      expect(grade(item, response).correct).toBe(false);
    }
  });
});

/* ------------------------------------------------------------------ *
 * SPA-HIDDENCUBE-01
 * ------------------------------------------------------------------ */

describe('SPA-HIDDENCUBE-01', () => {
  const items = loadBank('SPA-HIDDENCUBE-01');

  it('accepts the keyed cube count on every item in the bank', () => {
    for (const item of items) {
      const view = item.content.view as { yawDeg: number };
      const verdict = grade(item, {
        count: item.answer.correctCount,
        finalYawDeg: view.yawDeg,
      });
      expect(verdict.correct, item.itemId).toBe(true);
    }
  });

  it('rejects the visible-only undercount and reports the viewing angle', () => {
    const item = items.find(
      (i) =>
        (i.answer.diagnostics as { visibleCount: number }).visibleCount !==
        (i.answer.correctCount as number),
    )!;
    const diagnostics = item.answer.diagnostics as { visibleCount: number };
    const verdict = grade(item, { count: diagnostics.visibleCount, finalYawDeg: -45 });
    expect(verdict.correct).toBe(false);
    expect(verdict.metrics?.['M-VIEWANG']).toBe(0);
  });

  it('reports M-VIEWANG as the signed offset from the canonical view', () => {
    const item = items[0]!;
    const verdict = grade(item, { count: item.answer.correctCount, finalYawDeg: -30 });
    const view = item.content.view as { canonicalYawDeg: number };
    expect(verdict.correct).toBe(true);
    expect(verdict.metrics?.['M-VIEWANG']).toBeCloseTo(-30 - view.canonicalYawDeg, 6);
  });
});

/* ------------------------------------------------------------------ *
 * SPA-MAZE-01
 * ------------------------------------------------------------------ */

type Cell = [number, number];

function mazeEdgeKey(a: Cell, b: Cell): string {
  return a[0] < b[0] || (a[0] === b[0] && a[1] < b[1])
    ? `${a[0]},${a[1]}-${b[0]},${b[1]}`
    : `${b[0]},${b[1]}-${a[0]},${a[1]}`;
}

/** The optimal path with one legal there-and-back detour spliced in (+2 steps). */
function detourPath(item: RawBankItem): Cell[] | null {
  const content = item.content as { openEdges: string[]; grid: { R: number; C: number } };
  const open = new Set(content.openEdges);
  const optimal = item.answer.optimalPath as Cell[];
  for (let i = 0; i < optimal.length; i++) {
    const p = optimal[i]!;
    const neighbours: Cell[] = [
      [p[0] - 1, p[1]],
      [p[0] + 1, p[1]],
      [p[0], p[1] - 1],
      [p[0], p[1] + 1],
    ];
    for (const q of neighbours) {
      if (q[0] < 0 || q[1] < 0 || q[0] >= content.grid.R || q[1] >= content.grid.C) continue;
      if (!open.has(mazeEdgeKey(p, q))) continue;
      return [...optimal.slice(0, i + 1), q, ...optimal.slice(i)];
    }
  }
  return null;
}

describe('SPA-MAZE-01', () => {
  const items = loadBank('SPA-MAZE-01');
  const withGems = items.find((i) => (i.content.gems as Cell[]).length > 0)!;

  it('accepts the stored optimal path on every item, at full efficiency', () => {
    for (const item of items) {
      const verdict = grade(item, { path: item.answer.optimalPath, reachedGoal: true });
      expect(verdict.correct, item.itemId).toBe(true);
      expect(verdict.metrics?.['M-EFF'], item.itemId).toBe(1);
    }
  });

  it('accepts a LEGAL BUT NON-OPTIMAL path and books the loss as M-EFF', () => {
    let checked = 0;
    for (const item of items) {
      const detour = detourPath(item);
      if (!detour) continue;
      checked++;
      const verdict = grade(item, { path: detour, reachedGoal: true });
      expect(verdict.correct, item.itemId).toBe(true);
      expect(verdict.metrics?.['M-EFF'], item.itemId).toBeLessThan(1);
    }
    expect(checked).toBe(items.length);
  });

  it('rejects a path that stops short of the goal', () => {
    const item = items[0]!;
    const optimal = item.answer.optimalPath as Cell[];
    expect(grade(item, { path: optimal.slice(0, -1), reachedGoal: false }).correct).toBe(false);
  });

  it('rejects a path that crosses a wall', () => {
    const item = items.find((i) => {
      const content = i.content as { openEdges: string[]; grid: { R: number; C: number } };
      const open = new Set(content.openEdges);
      const start = i.content.start as Cell;
      return [
        [start[0] + 1, start[1]] as Cell,
        [start[0], start[1] + 1] as Cell,
      ].some(
        (q) =>
          q[0] < content.grid.R && q[1] < content.grid.C && !open.has(mazeEdgeKey(start, q)),
      );
    })!;
    const content = item.content as { openEdges: string[]; grid: { R: number; C: number } };
    const open = new Set(content.openEdges);
    const start = item.content.start as Cell;
    const walled = ([
      [start[0] + 1, start[1]],
      [start[0], start[1] + 1],
    ] as Cell[]).find(
      (q) => q[0] < content.grid.R && q[1] < content.grid.C && !open.has(mazeEdgeKey(start, q)),
    )!;
    const teleport = [start, walled, item.content.goal as Cell];
    expect(grade(item, { path: teleport, reachedGoal: true }).correct).toBe(false);
  });

  it('rejects a legal path that skips a required gem', () => {
    const gems = withGems.content.gems as Cell[];
    const bfsSkip = shortestPathAvoiding(withGems, gems);
    expect(bfsSkip).not.toBeNull();
    expect(grade(withGems, { path: bfsSkip, reachedGoal: true }).correct).toBe(false);
  });
});

/** Shortest start->goal walk that never enters any of `avoid`, or null. */
function shortestPathAvoiding(item: RawBankItem, avoid: Cell[]): Cell[] | null {
  const content = item.content as { openEdges: string[]; grid: { R: number; C: number } };
  const open = new Set(content.openEdges);
  const blocked = new Set(avoid.map((g) => `${g[0]},${g[1]}`));
  const start = item.content.start as Cell;
  const goal = item.content.goal as Cell;
  const prev = new Map<string, Cell | null>([[`${start[0]},${start[1]}`, null]]);
  const queue: Cell[] = [start];
  for (let qi = 0; qi < queue.length; qi++) {
    const cur = queue[qi]!;
    if (cur[0] === goal[0] && cur[1] === goal[1]) break;
    const neighbours: Cell[] = [
      [cur[0] - 1, cur[1]],
      [cur[0] + 1, cur[1]],
      [cur[0], cur[1] - 1],
      [cur[0], cur[1] + 1],
    ];
    for (const nb of neighbours) {
      if (nb[0] < 0 || nb[1] < 0 || nb[0] >= content.grid.R || nb[1] >= content.grid.C) continue;
      const key = `${nb[0]},${nb[1]}`;
      if (blocked.has(key) || prev.has(key) || !open.has(mazeEdgeKey(cur, nb))) continue;
      prev.set(key, cur);
      queue.push(nb);
    }
  }
  if (!prev.has(`${goal[0]},${goal[1]}`)) return null;
  const out: Cell[] = [];
  let cur: Cell | null = goal;
  while (cur) {
    out.unshift(cur);
    cur = prev.get(`${cur[0]},${cur[1]}`) ?? null;
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * SPA-PIPES-01
 * ------------------------------------------------------------------ */

interface Tile {
  r: number;
  c: number;
  dirs: string[];
}

const CW: Record<string, string> = { N: 'E', E: 'S', S: 'W', W: 'N' };
const rotate = (dirs: string[], k: number) => {
  let out = [...dirs];
  for (let i = 0; i < k; i++) out = out.map((d) => CW[d]!);
  return out;
};

/** All served tiles, with the bank's stored solution orientations applied. */
function solvedWiring(item: RawBankItem): Tile[] {
  const solution = new Map(
    (item.answer.solutionOrients as Tile[]).map((t) => [`${t.r},${t.c}`, t.dirs]),
  );
  return (item.content.tiles as Tile[]).map((t) => ({
    r: t.r,
    c: t.c,
    dirs: solution.get(`${t.r},${t.c}`) ?? t.dirs,
  }));
}

describe('SPA-PIPES-01', () => {
  const items = loadBank('SPA-PIPES-01');

  it('accepts the stored solution wiring on every item, at full efficiency', () => {
    for (const item of items) {
      const verdict = grade(item, { finalOrients: solvedWiring(item), connected: true });
      expect(verdict.correct, item.itemId).toBe(true);
      expect(verdict.metrics?.['M-EFF'], item.itemId).toBe(1);
    }
  });

  it('accepts a CONNECTED BUT NON-OPTIMAL wiring (extra turns on a decoy tile)', () => {
    let checked = 0;
    for (const item of items) {
      const wiring = solvedWiring(item);
      const solved = new Set(
        (item.answer.solutionOrients as Tile[]).map((t) => `${t.r},${t.c}`),
      );
      const decoy = wiring.find((t) => t.dirs.length === 1 && !solved.has(`${t.r},${t.c}`));
      if (!decoy) continue;
      checked++;
      const wasteful = wiring.map((t) =>
        t === decoy ? { r: t.r, c: t.c, dirs: rotate(t.dirs, 1) } : t,
      );
      const verdict = grade(item, { finalOrients: wasteful, connected: true });
      expect(verdict.correct, item.itemId).toBe(true);
      expect(verdict.metrics?.['M-EFF'], item.itemId).toBeLessThan(1);
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('rejects a wiring that leaves the road disconnected', () => {
    for (const item of items.slice(0, 20)) {
      const start = item.content.start as [number, number];
      const wiring = solvedWiring(item).map((t) => {
        if (t.r !== start[0] || t.c !== start[1]) return t;
        for (let k = 1; k < 4; k++) {
          const turned = rotate(t.dirs, k);
          if (!turned.includes('W')) return { r: t.r, c: t.c, dirs: turned };
        }
        return t;
      });
      expect(grade(item, { finalOrients: wiring }).correct, item.itemId).toBe(false);
    }
  });

  it('rejects a wiring the tray cannot produce (arms invented, not rotated)', () => {
    const item = items[0]!;
    const wiring = solvedWiring(item).map((t, i) =>
      i === 0 ? { r: t.r, c: t.c, dirs: ['N', 'E', 'S', 'W'] } : t,
    );
    expect(grade(item, { finalOrients: wiring }).correct).toBe(false);
  });
});

/* ------------------------------------------------------------------ *
 * SPA-PUNCH-01
 * ------------------------------------------------------------------ */

interface PunchLure {
  key: string;
  lure: string;
  signature: string;
}

const cellsFromSignature = (signature: string): [number, number][] =>
  signature
    .split('|')
    .filter(Boolean)
    .map((part) => part.split(',').map(Number) as [number, number]);

describe('SPA-PUNCH-01', () => {
  const items = loadBank('SPA-PUNCH-01');

  it('accepts the reverse-unfolded hole set on every item in the bank', () => {
    for (const item of items) {
      const trueCells = item.answer.trueCells as { x: number; y: number }[];
      const verdict = grade(item, { markedCells: trueCells.map((c) => [c.x, c.y]) });
      expect(verdict.correct, item.itemId).toBe(true);
      expect(verdict.metrics?.['M-POLY'], item.itemId).toBe(1);
      expect(verdict.metrics?.['M-MIRRORFA'], item.itemId).toBe(0);
    }
  });

  it('rejects every named lure hole pattern, with partial credit for the overlap', () => {
    for (const item of items) {
      for (const lure of item.answer.distractorRationales as PunchLure[]) {
        if (lure.lure === 'correct') continue;
        const verdict = grade(item, { markedCells: cellsFromSignature(lure.signature) });
        expect(verdict.correct, `${item.itemId} ${lure.key}`).toBe(false);
        expect(verdict.metrics?.['M-POLY']).toBeLessThan(1);
      }
    }
  });

  it('flags a whole-pattern mirror as a mirror false alarm', () => {
    const item = items.find((i) =>
      (i.answer.distractorRationales as PunchLure[]).some((l) => l.lure === 'mirrored_whole_pattern'),
    )!;
    const mirror = (item.answer.distractorRationales as PunchLure[]).find(
      (l) => l.lure === 'mirrored_whole_pattern',
    )!;
    const verdict = grade(item, { markedCells: cellsFromSignature(mirror.signature) });
    expect(verdict.correct).toBe(false);
    expect(verdict.metrics?.['M-MIRRORFA']).toBe(1);
  });

  it('rejects a hole set that is one cell short', () => {
    const item = items[0]!;
    const trueCells = item.answer.trueCells as { x: number; y: number }[];
    const verdict = grade(item, { markedCells: trueCells.slice(1).map((c) => [c.x, c.y]) });
    expect(verdict.correct).toBe(false);
    expect(verdict.metrics?.['M-POLY']).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------------ *
 * SPA-SCENE-01
 * ------------------------------------------------------------------ */

interface SceneLure {
  key: string;
  lure: string;
  chirality: string;
  order: number[];
}

describe('SPA-SCENE-01', () => {
  const items = loadBank('SPA-SCENE-01');

  it('accepts the robot-eye order on every item in the bank', () => {
    for (const item of items) {
      const verdict = grade(item, {
        order: item.answer.correctOrder,
        nearestId: item.answer.nearestId,
      });
      expect(verdict.correct, item.itemId).toBe(true);
      expect(verdict.metrics?.['M-POLY'], item.itemId).toBe(1);
      expect(verdict.metrics?.['M-MIRRORFA'], item.itemId).toBe(0);
    }
  });

  it('rejects the egocentric left-right reversal and flags it as a mirror', () => {
    for (const item of items) {
      const mirror = (item.answer.distractorRationales as SceneLure[]).find(
        (l) => l.chirality === 'mirror',
      )!;
      const verdict = grade(item, { order: mirror.order, nearestId: item.answer.nearestId });
      expect(verdict.correct, item.itemId).toBe(false);
      expect(verdict.metrics?.['M-MIRRORFA'], item.itemId).toBe(1);
    }
  });

  it('rejects the right order with the wrong nearest card', () => {
    const item = items.find((i) => (i.content.question as { requireNearest: boolean }).requireNearest)!;
    const objects = (item.content.scene as { objects: { id: number }[] }).objects;
    const wrongNearest = objects.find((o) => o.id !== item.answer.nearestId)!.id;
    expect(
      grade(item, { order: item.answer.correctOrder, nearestId: wrongNearest }).correct,
    ).toBe(false);
  });

  it('gives partial credit for a single adjacent swap', () => {
    const item = items.find((i) => (i.answer.correctOrder as number[]).length >= 4)!;
    const swapped = [...(item.answer.correctOrder as number[])];
    [swapped[0], swapped[1]] = [swapped[1]!, swapped[0]!];
    const verdict = grade(item, { order: swapped, nearestId: item.answer.nearestId });
    expect(verdict.correct).toBe(false);
    expect(verdict.metrics?.['M-POLY']).toBeGreaterThan(0.5);
  });
});

/* ------------------------------------------------------------------ *
 * SPA-TANGRAM-01
 * ------------------------------------------------------------------ */

type Cell3 = [number, number, number];
interface TrayPiece {
  id: number;
  offsets: Cell3[];
}
interface Placement {
  id: number;
  cells: Cell3[];
}

const k3 = (c: Cell3) => `${c[0]},${c[1]},${c[2]}`;
function normalize(cells: Cell3[]): Cell3[] {
  const ml = Math.min(...cells.map((c) => c[0]));
  const mr = Math.min(...cells.map((c) => c[1]));
  const mc = Math.min(...cells.map((c) => c[2]));
  return cells
    .map((c) => [c[0] - ml, c[1] - mr, c[2] - mc] as Cell3)
    .sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
}
const shapeKey = (cells: Cell3[]) => normalize(cells).map((c) => c.join(',')).join('|');
const rotateOffsets = (cells: Cell3[]) =>
  normalize(cells.map(([l, r, c]) => [l, c, -r] as Cell3));
function allRotations(offsets: Cell3[]): Cell3[][] {
  const out: Cell3[][] = [];
  const seen = new Set<string>();
  let cur = normalize(offsets);
  for (let i = 0; i < 4; i++) {
    const key = shapeKey(cur);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(cur);
    }
    cur = rotateOffsets(cur);
  }
  return out;
}

/** Every exact cover of the target from the tray, up to `cap` of them. */
function allCovers(item: RawBankItem, cap: number): Placement[][] {
  const target = new Set((item.content.target as { cells: Cell3[] }).cells.map(k3));
  const order = [...target].sort();
  const rots = (item.content.tray as TrayPiece[]).map((p) => ({
    id: p.id,
    rots: allRotations(p.offsets),
  }));
  const covered = new Set<string>();
  const used = new Set<number>();
  const chosen: Placement[] = [];
  const found: Placement[][] = [];

  const firstUncovered = () => order.find((c) => !covered.has(c)) ?? null;
  const recurse = (depth: number): void => {
    if (found.length >= cap) return;
    const next = firstUncovered();
    if (!next) {
      found.push(chosen.map((p) => ({ id: p.id, cells: p.cells.map((c) => [...c] as Cell3) })));
      return;
    }
    if (depth > 40) return;
    const cell = next.split(',').map(Number) as Cell3;
    for (const piece of rots) {
      if (used.has(piece.id)) continue;
      for (const rot of piece.rots) {
        for (const anchor of rot) {
          const t: Cell3 = [cell[0] - anchor[0], cell[1] - anchor[1], cell[2] - anchor[2]];
          const abs = rot.map((x) => [x[0] + t[0], x[1] + t[1], x[2] + t[2]] as Cell3);
          if (abs.some((a) => !target.has(k3(a)) || covered.has(k3(a)))) continue;
          abs.forEach((a) => covered.add(k3(a)));
          used.add(piece.id);
          chosen.push({ id: piece.id, cells: abs });
          recurse(depth + 1);
          chosen.pop();
          used.delete(piece.id);
          abs.forEach((a) => covered.delete(k3(a)));
          if (found.length >= cap) return;
        }
      }
    }
  };
  recurse(0);
  return found;
}

describe('SPA-TANGRAM-01', () => {
  const items = loadBank('SPA-TANGRAM-01');

  it('accepts the reference exact cover on every item in the bank', () => {
    for (const item of items) {
      const verdict = grade(item, { placements: item.answer.referenceSolution });
      expect(verdict.correct, item.itemId).toBe(true);
      expect(verdict.metrics?.['M-POLY'], item.itemId).toBe(1);
    }
  });

  it('accepts a DIFFERENT valid tiling, including one that uses more pieces', () => {
    const small = items.filter((i) => (i.content.target as { area: number }).area <= 9);
    let alternates = 0;
    let nonOptimal = 0;
    for (const item of small) {
      const reference = shapeKeyOfCover(item.answer.referenceSolution as Placement[]);
      for (const cover of allCovers(item, 24)) {
        if (shapeKeyOfCover(cover) === reference) continue;
        alternates++;
        const verdict = grade(item, { placements: cover });
        expect(verdict.correct, item.itemId).toBe(true);
        if (cover.length > (item.answer.optimalPlacements as number)) {
          nonOptimal++;
          expect(verdict.metrics?.['M-EFF'], item.itemId).toBeLessThan(1);
        }
      }
    }
    expect(alternates).toBeGreaterThan(0);
    expect(nonOptimal).toBeGreaterThan(0);
  });

  it('rejects an incomplete cover and reports the filled fraction', () => {
    const item = items.find((i) => (i.answer.referenceSolution as Placement[]).length >= 2)!;
    const partial = (item.answer.referenceSolution as Placement[]).slice(0, -1);
    const verdict = grade(item, { placements: partial });
    expect(verdict.correct).toBe(false);
    expect(verdict.metrics?.['M-POLY']).toBeGreaterThan(0);
    expect(verdict.metrics?.['M-POLY']).toBeLessThan(1);
  });

  it('rejects a placement that is not a rotation of its tray piece', () => {
    const item = items.find((i) =>
      (i.answer.referenceSolution as Placement[]).some((p) => p.cells.length >= 2),
    )!;
    const forged = (item.answer.referenceSolution as Placement[]).map((p, i) =>
      i === 0 ? { id: p.id, cells: [p.cells[0]!] } : p,
    );
    expect(grade(item, { placements: forged }).correct).toBe(false);
  });

  it('rejects reusing one tray piece twice', () => {
    const item = items.find((i) => (i.answer.referenceSolution as Placement[]).length >= 2)!;
    const reference = item.answer.referenceSolution as Placement[];
    const duplicated = [reference[0]!, { id: reference[0]!.id, cells: reference[1]!.cells }];
    expect(grade(item, { placements: duplicated }).correct).toBe(false);
  });
});

const shapeKeyOfCover = (cover: Placement[]) =>
  cover
    .map((p) => `${p.id}:${p.cells.map(k3).sort().join('|')}`)
    .sort()
    .join('/');

/* ------------------------------------------------------------------ *
 * SPA-XPLANE-01
 * ------------------------------------------------------------------ */

interface PlaneLure {
  lure: string;
  chirality?: string;
  plane: { h: number; t: number; w: number };
}

describe('SPA-XPLANE-01', () => {
  const items = loadBank('SPA-XPLANE-01');

  it('accepts the keyed plane on every item in the bank, at distance ~0', () => {
    for (const item of items) {
      const verdict = grade(item, { plane: item.answer.correctPlane, mode: 'place_plane' });
      expect(verdict.correct, item.itemId).toBe(true);
      expect(verdict.metrics?.['M-POLY'], item.itemId).toBeLessThan(1e-6);
    }
  });

  it('rejects every named error placement in the bank', () => {
    for (const item of items) {
      const lures = item.answer.distractorRationales as Record<string, PlaneLure>;
      for (const [key, lure] of Object.entries(lures)) {
        if (key === 'PLANE') continue;
        const verdict = grade(item, { plane: lure.plane });
        expect(verdict.correct, `${item.itemId} ${key}`).toBe(false);
      }
    }
  });

  it('REJECTS a mirrored section and records the mirror false alarm', () => {
    const mirrored = items.filter((i) =>
      Object.values(i.answer.distractorRationales as Record<string, PlaneLure>).some(
        (l) => l.chirality === 'reflected_cut_face',
      ),
    );
    expect(mirrored.length).toBeGreaterThan(0);
    for (const item of mirrored) {
      const lure = Object.values(
        item.answer.distractorRationales as Record<string, PlaneLure>,
      ).find((l) => l.chirality === 'reflected_cut_face')!;
      const verdict = grade(item, { plane: lure.plane });
      expect(verdict.correct, item.itemId).toBe(false);
      expect(verdict.metrics?.['M-MIRRORFA'], item.itemId).toBe(1);
    }
  });

  it('rejects a response that moves a locked control', () => {
    const item = items.find(
      (i) => (i.content.controls as { tilt: boolean; twist: boolean }).tilt === false,
    )!;
    const keyed = item.answer.correctPlane as { h: number; t: number; w: number };
    expect(grade(item, { plane: { ...keyed, t: keyed.t + 10 } }).correct).toBe(false);
  });

  it('rejects a plane outside the control range', () => {
    const item = items[0]!;
    const keyed = item.answer.correctPlane as { h: number; t: number; w: number };
    expect(grade(item, { plane: { ...keyed, h: 140 } }).correct).toBe(false);
  });
});
