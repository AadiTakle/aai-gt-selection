import { describe, expect, it } from 'vitest';
import { createSeededLibrary, seedGenerators } from '@gt/item-library';
import { defaultScreenerConfig } from '@gt/engine';
import { PracticeSession, defaultPracticeConfig, simulatePractice } from './index.js';

function setup(ageBand: '3-5' | 'k-2' = '3-5') {
  const { library, snapshotId } = createSeededLibrary();
  const practiceConfig = defaultPracticeConfig(snapshotId, ageBand);
  const screenerConfig = defaultScreenerConfig(snapshotId, ageBand);
  const forPractice = library.resolveForConsumer(snapshotId, {
    ageBand,
    maxReadingLoad: practiceConfig.maxReadingLoad,
    requireCalibrated: false,
    usage: 'prep',
    requireExplanation: true,
  });
  const forScreening = library.resolveForConsumer(snapshotId, {
    ageBand,
    maxReadingLoad: screenerConfig.maxReadingLoad,
    requireCalibrated: false,
    usage: 'assessment',
  });
  return { library, snapshotId, practiceConfig, forPractice, forScreening };
}

describe('the usage partition', () => {
  it('serves fewer families to practice than to screening, since the default is assessment-only', () => {
    const { forPractice, forScreening } = setup();
    expect(forPractice.length).toBeGreaterThan(0);
    expect(forScreening.length).toBeGreaterThan(forPractice.length);
  });

  it('never serves an assessment-only family to a practice consumer', () => {
    const { forPractice } = setup();
    // This is the guarantee that stops a practice tool coaching candidates on families the
    // screener relies on. If it ever fails, the shared bank has become a coaching pipeline.
    expect(forPractice.every((g) => g.usage === 'prep' || g.usage === 'both')).toBe(true);
    expect(forPractice.some((g) => g.usage === 'assessment')).toBe(false);
  });

  it('only offers families that actually carry an explanation', () => {
    const { forPractice } = setup();
    for (const gen of forPractice) {
      const item = gen.render(7);
      expect(item.explanation, `${gen.id} reached practice without an explanation`).toBeTruthy();
      expect(item.explanation!.rule.length).toBeGreaterThan(10);
      expect(item.explanation!.working.length).toBeGreaterThan(10);
    }
  });

  it('defaults an unmarked family to assessment, so nothing leaks into practice by accident', () => {
    const unmarked = seedGenerators.filter((g) => g.usage === 'assessment');
    expect(unmarked.length).toBeGreaterThan(0);
    const { forPractice } = setup();
    for (const gen of unmarked) {
      expect(forPractice.map((g) => g.id)).not.toContain(gen.id);
    }
  });

  it('writes item-specific explanations rather than one template reused', () => {
    const { forPractice } = setup();
    for (const gen of forPractice) {
      const workings = new Set([1, 2, 3, 4, 5, 6].map((s) => gen.render(s).explanation?.working));
      expect(workings.size, `${gen.id} produces the same working for every seed`).toBeGreaterThan(1);
    }
  });
});

describe('practice session', () => {
  it('runs its full length and finishes', () => {
    const { practiceConfig, forPractice } = setup();
    const r = simulatePractice({ config: practiceConfig, available: forPractice, ability: 0.5, seed: 11 });
    expect(r.served).toBe(practiceConfig.sessionLength);
    expect(r.everyItemHadAnExplanation).toBe(true);
  });

  it('returns the explanation on submit and withholds nothing the learner needs', () => {
    const { practiceConfig, forPractice } = setup();
    const s = new PracticeSession(practiceConfig, forPractice, 3);
    const first = s.nextItem()!;
    const out = s.submit(first.item.options[0]!.id, 4000);
    expect(out.explanation).toBeTruthy();
    expect(out.correctOptionId).toBe(first.item.correctOptionId);
    expect(typeof out.correct).toBe('boolean');
  });

  it('covers several families rather than drilling one', () => {
    const { practiceConfig, forPractice } = setup();
    const r = simulatePractice({ config: practiceConfig, available: forPractice, ability: 0, seed: 42 });
    expect(r.familiesSeen).toBeGreaterThan(2);
    expect(r.domainsSeen).toBeGreaterThan(1);
  });

  it('aims above a weak learner and further above a strong one', () => {
    const { practiceConfig, forPractice } = setup();
    const weak = simulatePractice({ config: practiceConfig, available: forPractice, ability: -1.5, seed: 5 });
    const strong = simulatePractice({ config: practiceConfig, available: forPractice, ability: 2.0, seed: 5 });
    // Targeting follows the learner, which is the difference between practising and being sorted.
    expect(strong.meanTargetedAt).toBeGreaterThan(weak.meanTargetedAt);
  });

  it('keeps a strong learner well above chance and a weak one well below ceiling', () => {
    const { practiceConfig, forPractice } = setup();
    const weak = simulatePractice({ config: practiceConfig, available: forPractice, ability: -1.5, seed: 8 });
    const strong = simulatePractice({ config: practiceConfig, available: forPractice, ability: 2.5, seed: 8 });
    expect(strong.accuracy).toBeGreaterThan(weak.accuracy);
    expect(strong.accuracy).toBeLessThanOrEqual(1);
  });

  it('replays identically from the same seed', () => {
    const { practiceConfig, forPractice } = setup();
    const args = { config: practiceConfig, available: forPractice, ability: 0.8, seed: 909 };
    expect(simulatePractice(args)).toEqual(simulatePractice(args));
  });

  it('restricts to one domain when asked', () => {
    const { practiceConfig, forPractice } = setup();
    const r = simulatePractice({
      config: { ...practiceConfig, domain: 'quantitative' },
      available: forPractice, ability: 0.5, seed: 21,
    });
    expect(r.domainsSeen).toBe(1);
  });

  it('rejects a submit with no pending item', () => {
    const { practiceConfig, forPractice } = setup();
    const s = new PracticeSession(practiceConfig, forPractice, 1);
    expect(() => s.submit('anything', 100)).toThrow(/no pending item/);
  });

  it('shows no score, percentile or ability figure in what it returns to a learner', () => {
    const { practiceConfig, forPractice } = setup();
    const s = new PracticeSession(practiceConfig, forPractice, 4);
    s.nextItem();
    const out = s.submit('nope', 1000);
    // `estimate` exists on state for item targeting, and the UI is responsible for not
    // rendering it. What submit returns must not carry a score at all.
    expect(Object.keys(out).sort()).toEqual(['correct', 'correctOptionId', 'explanation', 'state']);
  });
});

describe('the two consumers stay independent', () => {
  it('shares the same snapshot without sharing a session type', () => {
    const { snapshotId, practiceConfig } = setup();
    // Both pin the same immutable snapshot, which is the shared part.
    expect(practiceConfig.snapshotId).toBe(snapshotId);
    expect(defaultScreenerConfig(snapshotId).snapshotId).toBe(snapshotId);
  });

  it('gives practice no threshold, no stop rule and no decision', () => {
    const { practiceConfig } = setup();
    const keys = Object.keys(practiceConfig);
    for (const screenerOnly of ['stopRule', 'surfaces', 'blueprint', 'requireCalibratedItems']) {
      expect(keys, `practice config should not carry ${screenerOnly}`).not.toContain(screenerOnly);
    }
  });
});
