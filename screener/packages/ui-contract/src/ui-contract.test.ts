import { describe, expect, it } from 'vitest';

import {
  ALL_RESPONSE_ELEMENTS,
  bandRank,
  mergeRequirements,
  type UiCapability,
} from './capabilities';
import { COGAT_ALIGNED_TYPES, SCREENING_FORM_SUBTESTS, typesForSubtest, uncoveredSubtests } from './cogat';
import { minimumForEverything, planFor, satisfies, servableBy, unlockOrder } from './plan';
import { FULL_CLIENT, GLANCE, PROFILES, VOICE_ONLY } from './profiles';
import { allTypeCodes, requirementFor } from './requirements';

describe('requirements derived from the banks', () => {
  it('covers every bank on disk', () => {
    const codes = allTypeCodes();
    expect(codes.length).toBeGreaterThan(40);
    for (const code of codes) {
      expect(requirementFor(code).elements.length).toBeGreaterThan(0);
    }
  });

  it('gives every type at least one way for the child to act', () => {
    for (const code of allTypeCodes()) {
      const elements = requirementFor(code).elements;
      const responding = elements.filter((e) =>
        (ALL_RESPONSE_ELEMENTS as readonly string[]).includes(e),
      );
      expect(responding.length, `${code} has no response element`).toBeGreaterThan(0);
    }
  });

  it('asks for a choice list exactly when the bank carries an option list', () => {
    // The clearest derived signal, so it is the one worth pinning.
    expect(requirementFor('FLU-MATRIX-01').elements).toContain('choiceList');
    expect(requirementFor('VER-CLOZE-01').elements).toContain('choiceList');
  });

  it('asks for timed reveal only for the paced types', () => {
    expect(requirementFor('WM-corsi-01').elements).toContain('timedReveal');
    expect(requirementFor('QUANT-DOTS-01').elements).toContain('timedReveal');
    expect(requirementFor('VER-CLOZE-01').elements).not.toContain('timedReveal');
  });

  it('asks for an ordered channel where the relation is a progression', () => {
    // A series is unanswerable if the app maps the variable onto unordered variants, which is the
    // failure the ordering declaration exists to prevent.
    const series = requirementFor('QUANT-SERIES-01');
    expect(series.elements).toContain('orderedChannel');
    expect(series.counts.orderedChannel).toBeGreaterThanOrEqual(3);
  });

  it('requires enough co-present elements to show the options at all', () => {
    const requirement = requirementFor('FLU-VENN-01');
    expect(requirement.counts.coPresent ?? 0).toBeGreaterThanOrEqual(6);
  });
});

describe('planning a set of types', () => {
  it('produces a union that satisfies every type in the set', () => {
    const codes = allTypeCodes();
    const plan = planFor(codes);
    const union: UiCapability = {
      name: 'union',
      elements: plan.union.elements,
      counts: plan.union.counts,
      readingBand: plan.union.readingBand,
    };
    for (const { typeCode, requirement } of plan.perType) {
      expect(satisfies(union, requirement).ok, `union fails ${typeCode}`).toBe(true);
    }
  });

  it('shares elements across types rather than double counting them', () => {
    const a = requirementFor('FLU-MATRIX-01');
    const b = requirementFor('FLU-CARPET-01');
    const merged = mergeRequirements([a, b]);
    // Both need a grid and a choice list, so the union is smaller than the sum.
    expect(merged.elements.length).toBeLessThan(a.elements.length + b.elements.length);
  });

  it('takes the maximum count rather than the sum when merging', () => {
    const merged = mergeRequirements([
      { elements: ['nominalChannel'], counts: { nominalChannel: 4 }, readingBand: null },
      { elements: ['nominalChannel'], counts: { nominalChannel: 9 }, readingBand: null },
    ]);
    expect(merged.counts.nominalChannel).toBe(9);
  });

  it('names elements that only one type in the set needs', () => {
    const plan = planFor(allTypeCodes());
    // Whatever it is, a sole reason must genuinely be needed by exactly that one type.
    for (const [element, typeCode] of plan.soleReasons) {
      const others = allTypeCodes().filter((c) => c !== typeCode);
      for (const other of others) {
        expect(requirementFor(other).elements).not.toContain(element);
      }
    }
  });

  it('escalates the reading band to the highest in the set', () => {
    const merged = mergeRequirements([
      { elements: ['richText'], counts: {}, readingBand: 'K-1' },
      { elements: ['richText'], counts: {}, readingBand: '6-8' },
    ]);
    expect(merged.readingBand).toBe('6-8');
    expect(bandRank('6-8')).toBeGreaterThan(bandRank('K-1'));
  });
});

describe('matching an app against the library', () => {
  it('lets a full client serve everything', () => {
    const { servable, blocked } = servableBy(FULL_CLIENT);
    expect(blocked, `blocked: ${blocked.map((b) => b.typeCode).join(', ')}`).toHaveLength(0);
    expect(servable.length).toBe(allTypeCodes().length);
  });

  it('serves strictly fewer types as the app gets thinner', () => {
    const full = servableBy(FULL_CLIENT).servable.length;
    const voice = servableBy(VOICE_ONLY).servable.length;
    const glance = servableBy(GLANCE).servable.length;
    expect(full).toBeGreaterThan(voice);
    expect(voice).toBeGreaterThan(glance);
    expect(glance).toBeGreaterThan(0);
  });

  it('explains every refusal rather than just refusing', () => {
    for (const { shortfalls } of servableBy(GLANCE).blocked) {
      expect(shortfalls.length).toBeGreaterThan(0);
      for (const shortfall of shortfalls) expect(shortfall.reason).toBeTruthy();
    }
  });

  it('refuses a type whose channel count exceeds what the app offers', () => {
    const thin: UiCapability = {
      name: 'thin',
      elements: ['choiceList', 'nominalChannel', 'coPresent', 'gridLayout', 'orderedChannel'],
      counts: { nominalChannel: 2, orderedChannel: 2, coPresent: 20 },
      readingBand: '6-8',
    };
    const result = satisfies(thin, requirementFor('FLU-MATRIX-01'));
    expect(result.ok).toBe(false);
    expect(result.shortfalls.some((s) => s.element === 'nominalChannel')).toBe(true);
  });

  it('every shipped profile serves at least one type, so none is dead on arrival', () => {
    for (const [name, profile] of Object.entries(PROFILES)) {
      expect(servableBy(profile).servable.length, `${name} serves nothing`).toBeGreaterThan(0);
    }
  });
});

describe('build order', () => {
  it('ranks every element and reaches full coverage', () => {
    const order = unlockOrder();
    const total = allTypeCodes().length;
    expect(order.length).toBe(minimumForEverything().elements.length);
    expect(order[order.length - 1]!.cumulativeTypes).toBe(total);
  });

  it('never goes backwards', () => {
    let previous = 0;
    for (const step of unlockOrder()) {
      expect(step.cumulativeTypes).toBeGreaterThanOrEqual(previous);
      previous = step.cumulativeTypes;
    }
  });
});

describe('CogAT correspondence', () => {
  it('reports Verbal Analogies as uncovered, which is the gap that matters', () => {
    expect(uncoveredSubtests()).toContain('verbal-analogies');
  });

  it('has no direct type for two of the three screening-form subtests being thin', () => {
    // Figure Matrices is well covered; Verbal Analogies is not covered at all.
    expect(typesForSubtest('figure-matrices', 'direct').length).toBeGreaterThanOrEqual(3);
    expect(typesForSubtest('verbal-analogies', 'direct')).toHaveLength(0);
    expect(SCREENING_FORM_SUBTESTS).toContain('verbal-analogies');
  });

  it('maps every aligned type to a bank that exists', () => {
    const codes = new Set(allTypeCodes());
    for (const code of COGAT_ALIGNED_TYPES) expect(codes.has(code)).toBe(true);
  });

  it('can be served by a themed visual app for the verbal and quantitative subtests', () => {
    // The practical question: can a plain themed app carry the CogAT-aligned set?
    const plan = planFor([...COGAT_ALIGNED_TYPES]);
    expect(plan.union.elements).toContain('choiceList');
    expect(plan.union.elements.length).toBeLessThan(minimumForEverything().elements.length);
  });
});
