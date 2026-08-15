/**
 * The properties a kit must not break.
 *
 * These are not tests that the pictures look nice. They are tests that the question survived being
 * re-themed, which is a different and much narrower claim: cells the item says differ must LOOK
 * different, cells it says match must look identical, and an ordered variable must come out in order.
 * Break any of those and the item still renders, still gets answered, and no longer measures anything.
 * That is the failure this file exists to catch.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import type { AbstractElement, Manifest } from '../uispec/abstract';
import { artFor, checkKit, valuesFor, type Kit } from './kit';
import { coverType, crossings, largestBlock } from './coverage';
import { resolve } from './resolve';

const HERE = dirname(fileURLToPath(import.meta.url));

function loadPokedex(): Kit {
  const raw = JSON.parse(readFileSync(join(HERE, 'kits', 'pokedex.kit.json'), 'utf8'));
  const { kit, problems } = checkKit(raw);
  if (!kit) throw new Error(`the shipped Pokédex does not load: ${JSON.stringify(problems)}`);
  return kit;
}

const POKEDEX = loadPokedex();

/** A tiny kit, so a failure points at the resolver rather than at 75 Pokémon. */
const TOY: Kit = {
  kit: 'gt.uikit/v1',
  id: 'toy',
  name: 'Toy',
  art: { template: 'art/{sprite}.png', missing: 'blank' },
  dimensions: {
    identity: { from: 'bank', field: 'kind' },
    category: { from: 'bank', field: 'rank' },
    count: { from: 'repeat', max: 6 },
    scale: { from: 'scale', min: 0.5, max: 2 },
    fill: { from: 'none', why: 'nothing to shade' },
  },
  // kind x rank crosses completely: every kind exists at every rank.
  bank: [
    { id: 'a1', label: 'A one', kind: 'a', rank: 1, sprite: 'a1' },
    { id: 'a2', label: 'A two', kind: 'a', rank: 2, sprite: 'a2' },
    { id: 'a3', label: 'A three', kind: 'a', rank: 3, sprite: 'a3' },
    { id: 'b1', label: 'B one', kind: 'b', rank: 1, sprite: 'b1' },
    { id: 'b2', label: 'B two', kind: 'b', rank: 2, sprite: 'b2' },
    { id: 'b3', label: 'B three', kind: 'b', rank: 3, sprite: 'b3' },
    { id: 'c1', label: 'C one', kind: 'c', rank: 1, sprite: 'c1' },
    { id: 'c2', label: 'C two', kind: 'c', rank: 2, sprite: 'c2' },
    { id: 'c3', label: 'C three', kind: 'c', rank: 3, sprite: 'c3' },
  ],
};

function manifestOf(spec: Record<string, { ordering: 'nominal' | 'ordered' | 'cyclic'; values: (string | number)[] }>): Manifest {
  const out: Record<string, Manifest[string]> = {};
  for (const [name, { ordering, values }] of Object.entries(spec)) {
    out[name] = { dimension: name as never, ordering, values, from: ['test'] };
  }
  return out;
}

function cells(vars: Record<string, number>[]): AbstractElement[] {
  return vars.map((v, i) => ({ id: `cell-${String(i)}`, vars: v }));
}

describe('the reasoning survives re-theming', () => {
  const manifest = manifestOf({
    identity: { ordering: 'nominal', values: ['x', 'y', 'z'] },
    category: { ordering: 'nominal', values: [1, 2, 3] },
  });

  it('draws different pictures wherever the item says the cells differ', () => {
    // A 3x3 matrix: identity varies down, category varies across. All nine cells are distinct, so all
    // nine pictures must be distinct, or two answers become defensible.
    const grid = cells(
      [0, 1, 2].flatMap((identity) => [0, 1, 2].map((category) => ({ identity, category }))),
    );
    const result = resolve(grid, manifest, TOY, 7);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const ids = result.visuals.map((v) => v.entry?.id);
    expect(new Set(ids).size).toBe(9);
  });

  it('draws the same picture wherever the item says the cells match', () => {
    const pair = cells([{ identity: 1, category: 2 }, { identity: 1, category: 2 }]);
    const result = resolve(pair, manifest, TOY, 3);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.visuals[0]?.entry?.id).toBe(result.visuals[1]?.entry?.id);
  });

  it('never lets two distinct values of one variable collide, over many seeds', () => {
    // The bug this guards is the tempting one-liner, bank[value % bank.length], which collides as soon
    // as the bank is smaller than the value range and produces a repeated matrix cell.
    for (let seed = 1; seed <= 60; seed += 1) {
      const row = cells([{ identity: 0 }, { identity: 1 }, { identity: 2 }]);
      const result = resolve(row, manifest, TOY, seed);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const kinds = result.visuals.map((v) => v.entry?.kind);
      expect(new Set(kinds).size, `seed ${String(seed)} collided`).toBe(3);
    }
  });

  it('keeps an ordered variable in its order', () => {
    const ordered = manifestOf({ category: { ordering: 'ordered', values: [1, 2, 3] } });
    for (let seed = 1; seed <= 30; seed += 1) {
      const series = cells([{ category: 0 }, { category: 1 }, { category: 2 }]);
      const result = resolve(series, ordered, TOY, seed);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const ranks = result.visuals.map((v) => Number(v.entry?.rank));
      expect(ranks, `seed ${String(seed)} scrambled the order`).toEqual([...ranks].sort((a, b) => a - b));
    }
  });
});

describe('transforms need no bank entries', () => {
  it('reads count as a repeat of one picture, using the real quantity', () => {
    // Counts of 1, 3 and 5: rank 1 must draw three, not two, or the arithmetic changes.
    const manifest = manifestOf({ count: { ordering: 'ordered', values: [1, 3, 5] } });
    const result = resolve(cells([{ count: 0 }, { count: 1 }, { count: 2 }]), manifest, TOY, 1);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.visuals.map((v) => v.repeat)).toEqual([1, 3, 5]);
  });

  it('shows the same picture when only a transform varies', () => {
    // Three of a thing then five of a thing is about the number. Changing the thing too would confound
    // the variable the item is actually testing.
    const manifest = manifestOf({ count: { ordering: 'ordered', values: [2, 4] } });
    const result = resolve(cells([{ count: 0 }, { count: 1 }]), manifest, TOY, 5);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.visuals[0]?.entry?.id).toBe(result.visuals[1]?.entry?.id);
  });

  it('honours a repeat cap rather than drawing forty of something', () => {
    const manifest = manifestOf({ count: { ordering: 'ordered', values: [40] } });
    const result = resolve(cells([{ count: 0 }]), manifest, TOY, 1);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.visuals[0]?.repeat).toBe(6);
  });

  it('turns stored degrees into the kit\u2019s own step count', () => {
    const manifest = manifestOf({ rotation: { ordering: 'cyclic', values: [0, 90, 180, 270] } });
    const kit: Kit = { ...TOY, dimensions: { ...TOY.dimensions, rotation: { from: 'rotate', steps: 4 } } };
    const result = resolve(cells([{ rotation: 0 }, { rotation: 1 }, { rotation: 3 }]), manifest, kit, 1);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.visuals.map((v) => v.turns)).toEqual([0, 1, 3]);
  });
});

describe('a kit fails honestly', () => {
  it('refuses a variable it cannot show at all, instead of drawing look-alikes', () => {
    const manifest = manifestOf({ fill: { ordering: 'nominal', values: ['solid', 'hatch'] } });
    const result = resolve(cells([{ fill: 0 }, { fill: 1 }]), manifest, TOY, 1);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.blame).toContain('fill');
    expect(result.why).toContain('no way to show fill');
  });

  it('says how many more entries it needs', () => {
    const manifest = manifestOf({ identity: { ordering: 'nominal', values: ['a', 'b', 'c', 'd', 'e'] } });
    const result = resolve(cells([{ identity: 0 }, { identity: 1 }, { identity: 2 }, { identity: 3 }, { identity: 4 }]), manifest, TOY, 1);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.why).toMatch(/Add 2 more/);
  });

  it('refuses to map an ordered variable onto words', () => {
    const wordy: Kit = {
      ...TOY,
      dimensions: { scale: { from: 'bank', field: 'kind' } },
    };
    const manifest = manifestOf({ scale: { ordering: 'ordered', values: [1, 2] } });
    const result = resolve(cells([{ scale: 0 }, { scale: 1 }]), manifest, wordy, 1);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.why).toContain('ordered');
  });

  it('refuses a combination the bank does not have, rather than substituting a near miss', () => {
    // A bank where kind and rank are tied: each kind exists at exactly one rank. Asking for two kinds
    // at the same rank is then impossible, and quietly returning the wrong rank would change the item.
    const tied: Kit = {
      ...TOY,
      bank: [
        { id: 'p', label: 'P', kind: 'a', rank: 1 },
        { id: 'q', label: 'Q', kind: 'b', rank: 2 },
        { id: 'r', label: 'R', kind: 'c', rank: 3 },
      ],
    };
    const manifest = manifestOf({
      identity: { ordering: 'nominal', values: ['x', 'y'] },
      category: { ordering: 'nominal', values: [1, 2] },
    });
    const square = cells([
      { identity: 0, category: 0 },
      { identity: 0, category: 1 },
      { identity: 1, category: 0 },
      { identity: 1, category: 1 },
    ]);
    const result = resolve(square, manifest, tied, 1);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.why).toContain('does not cross');
  });
});

describe('naming several fields lets one kit serve more', () => {
  const twoWay: Kit = {
    ...TOY,
    dimensions: { ...TOY.dimensions, category: { from: 'bank', field: ['rank', 'kind'] } },
  };

  it('uses the first field when it is wide enough', () => {
    const manifest = manifestOf({ category: { ordering: 'nominal', values: [1, 2, 3] } });
    const result = resolve(cells([{ category: 0 }, { category: 1 }, { category: 2 }]), manifest, twoWay, 1);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.using.category).toBe('rank');
  });

  it('falls back when the first field runs out of values', () => {
    // rank has 3 values and this needs 3, so it fits; ask for a fourth and only kind... also has 3.
    // Widen the bank so kind has 4, and the fallback becomes the only way to draw the item.
    const wider: Kit = {
      ...twoWay,
      bank: [...twoWay.bank, { id: 'd1', label: 'D one', kind: 'd', rank: 1, sprite: 'd1' }],
    };
    const manifest = manifestOf({ category: { ordering: 'nominal', values: [1, 2, 3, 4] } });
    const result = resolve(
      cells([{ category: 0 }, { category: 1 }, { category: 2 }, { category: 3 }]),
      manifest,
      wider,
      1,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.using.category).toBe('kind');
  });

  it('never gives two variables the same field, which would tie them together', () => {
    const manifest = manifestOf({
      identity: { ordering: 'nominal', values: ['x', 'y'] },
      category: { ordering: 'nominal', values: [1, 2] },
    });
    const result = resolve(cells([{ identity: 0, category: 0 }, { identity: 1, category: 1 }]), manifest, twoWay, 1);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.using.identity).not.toBe(result.using.category);
  });
});

describe('reading a kit file', () => {
  it('builds art from the template and the entry\u2019s own fields', () => {
    expect(artFor(TOY, TOY.bank[0]!)).toBe('art/a1.png');
  });

  it('falls back when the template needs a field the entry lacks', () => {
    expect(artFor(TOY, { id: 'z', label: 'Z' })).toBe('blank');
  });

  it('prefers an entry\u2019s own art over the template', () => {
    expect(artFor(TOY, { id: 'z', label: 'Z', art: 'custom.svg' })).toBe('custom.svg');
  });

  it('complains about a field no entry carries', () => {
    const { problems } = checkKit({
      kit: 'gt.uikit/v1',
      id: 'x',
      name: 'X',
      dimensions: { identity: { from: 'bank', field: 'nope' } },
      bank: [{ id: 'a', label: 'A', kind: 'a' }],
    });
    expect(problems.some((p) => p.says.includes('no entry has a "nope"'))).toBe(true);
  });

  it('complains about a duplicated id', () => {
    const { problems } = checkKit({
      kit: 'gt.uikit/v1',
      id: 'x',
      name: 'X',
      dimensions: { identity: { from: 'bank', field: 'kind' } },
      bank: [{ id: 'a', label: 'A', kind: 'a' }, { id: 'a', label: 'A again', kind: 'b' }],
    });
    expect(problems.some((p) => p.says.includes('repeats the id'))).toBe(true);
  });

  it('rejects a file that is not a kit', () => {
    expect(checkKit({ hello: true }).kit).toBeUndefined();
    expect(checkKit(null).problems.length).toBeGreaterThan(0);
  });
});

describe('the crossings report', () => {
  it('finds a pair that crosses completely', () => {
    const found = crossings(TOY).find((c) => (c.a === 'kind' && c.b === 'rank') || (c.a === 'rank' && c.b === 'kind'));
    expect(found?.fill).toBe(1);
  });

  it('measures the biggest block a pair can fill', () => {
    expect(largestBlock(TOY, 'kind', 'rank')).toEqual({ rows: 3, cols: 3 });
  });

  it('tells a Pok\u00e9dex author that type crosses stage and line does not', () => {
    // The whole reason the report exists. Mapping identity onto `line` looks natural and quietly makes
    // every matrix unservable, because a line has one type.
    const all = crossings(POKEDEX);
    const typeStage = all.find((c) => new Set([c.a, c.b]).has('type') && new Set([c.a, c.b]).has('stage'));
    const lineType = all.find((c) => new Set([c.a, c.b]).has('line') && new Set([c.a, c.b]).has('type'));
    expect(typeStage!.fill).toBeGreaterThan(0.9);
    expect(lineType!.fill).toBeLessThan(0.2);
    expect(largestBlock(POKEDEX, 'type', 'stage').cols).toBeGreaterThanOrEqual(3);
  });
});

describe('the shipped Pok\u00e9dex', () => {
  it('loads with no problems', () => {
    const { kit, problems } = checkKit(JSON.parse(readFileSync(join(HERE, 'kits', 'pokedex.kit.json'), 'utf8')));
    expect(problems).toEqual([]);
    expect(kit?.bank.length).toBeGreaterThan(60);
  });

  it('serves a three-by-three matrix', () => {
    const manifest = manifestOf({
      identity: { ordering: 'nominal', values: ['a', 'b', 'c'] },
      category: { ordering: 'nominal', values: [1, 2, 3] },
    });
    const grid = cells([0, 1, 2].flatMap((identity) => [0, 1, 2].map((category) => ({ identity, category }))));
    const result = resolve(grid, manifest, POKEDEX, 11);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(new Set(result.visuals.map((v) => v.entry?.id)).size).toBe(9);
    // Every sprite should resolve to a real dex URL rather than the silhouette fallback.
    expect(result.visuals.every((v) => v.art?.includes('/pokemon/'))).toBe(true);
  });

  it('says no to a verbal item instead of pretending', () => {
    const manifest = manifestOf({ text: { ordering: 'nominal', values: ['bat', 'bank'] } });
    const verdict = coverType('VER-POLYSEME-01', manifest, POKEDEX);
    expect(verdict.ok).toBe(false);
    expect(verdict.dimensions[0]?.says).toContain('no sprite can stand in for what a word means');
  });

  it('offers enough types and stages to be worth using', () => {
    expect(valuesFor(POKEDEX, 'identity').length).toBeGreaterThanOrEqual(15);
    expect(valuesFor(POKEDEX, 'category').length).toBeGreaterThanOrEqual(3);
  });
});
