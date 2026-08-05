import { describe, expect, it } from 'vitest';
import { ItemLibrary, createSeededLibrary, defineGenerator, seedGenerators, text, validateGenerator } from './index.js';
import { Rng } from './rng.js';

const stub = (over: Partial<Parameters<typeof defineGenerator>[0]> = {}) =>
  defineGenerator({
    id: 'test.family',
    version: '1.0.0',
    title: 'Test family',
    construct: 'A family used only to exercise the library machinery',
    domain: 'fluid',
    ageBands: ['3-5'],
    readingLoad: 'none',
    assumedDifficulty: 0,
    authoredBy: 'test',
    authoredAt: '2026-08-05T00:00:00.000Z',
    build: (rng) => {
      const n = rng.int(1, 5000);
      return { prompt: 'pick', stem: text(String(n)), correct: text(String(n * 2)), distractors: [text(String(n * 3)), text(String(n * 4)), text(String(n * 5))] };
    },
    ...over,
  });

describe('Rng', () => {
  it('is deterministic for a given seed', () => {
    expect([...Array(5)].map(() => new Rng(42).next())).toEqual([...Array(5)].map(() => new Rng(42).next()));
  });

  it('produces different streams for consecutive seeds', () => {
    // Low-entropy seeds are the realistic case, so this is the one that matters.
    expect(new Rng(1).int(1, 1000)).not.toEqual(new Rng(2).int(1, 1000));
  });

  it('shuffle leaves the input untouched', () => {
    const input = Object.freeze([1, 2, 3, 4, 5]);
    expect(() => new Rng(1).shuffle(input)).not.toThrow();
    expect(input).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('every shipped generator', () => {
  it.each(seedGenerators.map((g) => [`${g.id}@${g.version}`, g] as const))(
    '%s passes the publish checks',
    (_name, gen) => {
      const result = validateGenerator(gen);
      const errors = result.issues.filter((i) => i.severity === 'error');
      expect(errors, JSON.stringify(errors, null, 2)).toEqual([]);
      expect(result.publishable).toBe(true);
    },
  );

  it.each(seedGenerators.map((g) => [`${g.id}@${g.version}`, g] as const))(
    '%s renders identically for the same seed',
    (_name, gen) => {
      for (const seed of [1, 77, 9999]) {
        expect(gen.render(seed)).toEqual(gen.render(seed));
      }
    },
  );

  it.each(seedGenerators.map((g) => [`${g.id}@${g.version}`, g] as const))(
    '%s never repeats an option inside one item',
    (_name, gen) => {
      for (let seed = 1; seed <= 120; seed++) {
        const item = gen.render(seed);
        const keys = item.options.map((o) => JSON.stringify(o.content));
        expect(new Set(keys).size).toBe(keys.length);
        expect(item.options.some((o) => o.id === item.correctOptionId)).toBe(true);
      }
    },
  );
});

describe('validation catches what it is there to catch', () => {
  it('rejects a non-deterministic generator', () => {
    const rogue = { ...stub(), render: (seed: number) => ({ ...stub().render(seed), seed: Math.random() }) };
    const result = validateGenerator(rogue);
    expect(result.publishable).toBe(false);
    expect(result.issues.some((i) => i.check === 'determinism')).toBe(true);
  });

  it('rejects a family too small to avoid repeats', () => {
    const tiny = stub({
      build: (rng) => {
        const n = rng.int(1, 2);
        return { prompt: 'p', stem: text(String(n)), correct: text(`a${n}`), distractors: [text(`b${n}`), text(`c${n}`), text(`d${n}`)] };
      },
    });
    const result = validateGenerator(tiny);
    expect(result.publishable).toBe(false);
    expect(result.issues.some((i) => i.check === 'family-size')).toBe(true);
  });

  it('rejects a generator that leaks the answer into the stem', () => {
    const leaky = stub({
      build: (rng) => {
        const n = rng.int(1, 4000);
        return { prompt: 'p', stem: text(`the answer is ${n}`), correct: text(String(n)), distractors: [text(String(n + 1)), text(String(n + 2)), text(String(n + 3))] };
      },
    });
    expect(validateGenerator(leaky).issues.some((i) => i.check === 'answer-leak')).toBe(true);
  });

  it('allows a stem overlap when the family declares it draws options from the stem', () => {
    const declared = stub({
      selectFromStem: true,
      build: (rng) => {
        const n = rng.int(1, 4000);
        return { prompt: 'p', stem: text(`the answer is ${n}`), correct: text(String(n)), distractors: [text(String(n + 1)), text(String(n + 2)), text(String(n + 3))] };
      },
    });
    expect(validateGenerator(declared).issues.some((i) => i.check === 'answer-leak')).toBe(false);
  });

  it('rejects a calibration claim with too little data behind it', () => {
    const overclaimed = { ...stub(), difficulty: { b: 0, a: 1.5, se: 0.2, source: 'calibrated' as const, n: 12 } };
    expect(validateGenerator(overclaimed).issues.some((i) => i.check === 'calibration-claim')).toBe(true);
  });
});

describe('the boundary that keeps live screeners safe', () => {
  it('refuses to republish an existing version', () => {
    const library = new ItemLibrary();
    library.publish(stub());
    expect(() => library.publish(stub())).toThrow(/immutable/i);
  });

  it('accepts a new version alongside the old one', () => {
    const library = new ItemLibrary();
    library.publish(stub());
    library.publish(stub({ version: '2.0.0', assumedDifficulty: 1.5 }));
    expect(library.get('test.family', '1.0.0')?.difficulty.b).toBe(0);
    expect(library.get('test.family', '2.0.0')?.difficulty.b).toBe(1.5);
  });

  it('keeps serving a deprecated generator to snapshots cut before the deprecation', () => {
    const library = new ItemLibrary();
    library.publish(stub());
    library.publish(stub({ id: 'test.other', assumedDifficulty: 0.5 }));
    const before = library.createSnapshot({ label: 'before', createdBy: 't' });

    library.deprecate('test.family', '1.0.0', 'no longer wanted');

    // This is the guarantee the whole design exists for.
    const stillThere = library.resolveForScreener(before.id, {
      ageBand: '3-5',
      maxReadingLoad: 'none',
      requireCalibrated: false,
    });
    expect(stillThere.map((g) => g.id)).toContain('test.family');

    const after = library.createSnapshot({ label: 'after', createdBy: 't' });
    const nowServing = library.resolveForScreener(after.id, {
      ageBand: '3-5',
      maxReadingLoad: 'none',
      requireCalibrated: false,
    });
    expect(nowServing.map((g) => g.id)).not.toContain('test.family');
  });

  it('freezes a snapshot against later publishes', () => {
    const library = new ItemLibrary();
    library.publish(stub());
    const snap = library.createSnapshot({ label: 'frozen', createdBy: 't' });
    library.publish(stub({ id: 'test.newcomer' }));
    expect(snap.entries).toHaveLength(1);
    expect(library.resolveForScreener(snap.id, { ageBand: '3-5', maxReadingLoad: 'none', requireCalibrated: false })).toHaveLength(1);
  });

  it('filters by reading load, so a pre-reader is never served text-heavy items', () => {
    const { library, snapshotId } = createSeededLibrary();
    const forPreReaders = library.resolveForScreener(snapshotId, {
      ageBand: 'k-2',
      maxReadingLoad: 'none',
      requireCalibrated: false,
    });
    expect(forPreReaders.length).toBeGreaterThan(0);
    expect(forPreReaders.every((g) => g.readingLoad === 'none')).toBe(true);
  });

  it('serves nothing when calibration is required and nothing is calibrated', () => {
    const { library, snapshotId } = createSeededLibrary();
    const strict = library.resolveForScreener(snapshotId, {
      ageBand: '3-5',
      maxReadingLoad: 'high',
      requireCalibrated: true,
    });
    expect(strict).toHaveLength(0);
  });

  it('rejects a snapshot pinning something unpublished', () => {
    const library = new ItemLibrary();
    library.publish(stub());
    expect(() =>
      library.createSnapshot({
        label: 'bad',
        createdBy: 't',
        entries: [{ generatorId: 'test.family', generatorVersion: '9.9.9' }],
      }),
    ).toThrow(/not published/);
  });
});
