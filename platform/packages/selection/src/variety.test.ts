import { describe, expect, it } from 'vitest';
import { DEFAULT_VARIETY_CONFIG } from '@platform/domain';
import { runCohort, type CohortReport } from './cohort.js';
import { makeIndex, varietyOff } from './fixtures.js';
import { selectDeterministic, selectNext } from './select.js';

/**
 * Statistical tests over a thousand simulated sessions.
 *
 * The numbers asserted below were measured against this fixture, not chosen. The fixture holds 120
 * items across 12 types, so 16 items per session gives a mean achievable exposure rate of 0.133 and
 * an item pool small enough that exposure control has to work hard. The real compiled catalog is
 * roughly thirty-eight times larger, where every one of these figures gets easier — so these are
 * floors on the behaviour, not predictions of production.
 */

const SESSIONS = 1000;
const ITEMS = 16;

const index = makeIndex({ typesPerDomain: 3, itemsPerType: 10 });

function cohort(overrides: Partial<Parameters<typeof runCohort>[0]> = {}): CohortReport {
  return runCohort({ index, sessions: SESSIONS, itemsPerSession: ITEMS, ...overrides });
}

const withVariety = cohort({ variety: DEFAULT_VARIETY_CONFIG });
const deterministic = cohort({ variety: varietyOff(), select: selectDeterministic });
const layersOff = cohort({ variety: varietyOff(), select: selectNext });

describe('the deterministic baseline, stated so the cost of fixing it is visible', () => {
  it('asks every child the same opening question', () => {
    expect(deterministic.distinctOpenings).toBe(1);
    expect(deterministic.modalOpeningShare).toBe(1);
  });

  it('serves its favourite item in every single session', () => {
    expect(deterministic.maxExposureRate).toBe(1);
  });

  it('repeats the same domain in two thirds of adjacent pairs', () => {
    expect(deterministic.sameDomainAdjacencyRate).toBeGreaterThan(0.5);
  });
});

describe('switching every layer off reproduces that baseline', () => {
  it('collapses back to one opening, so no layer hides an undisableable random source', () => {
    expect(layersOff.distinctOpenings).toBe(1);
    expect(layersOff.maxExposureRate).toBe(1);
  });
});

describe('opening variety', () => {
  it('spreads openings across many items', () => {
    expect(withVariety.distinctOpenings).toBeGreaterThanOrEqual(10);
  });

  it('holds the most common opening well under a tenth of sessions', () => {
    // Measured at 5.8% on this fixture, against 100% for the deterministic baseline.
    expect(withVariety.modalOpeningShare).toBeLessThan(0.1);
  });

  it('opens across all four domains', () => {
    const domains = new Set(withVariety.sessions.map((s) => s.domains[0]));
    expect(domains.size).toBe(4);
  });

  it('spreads further still once a blueprint minimum is in force', () => {
    const covered = cohort({ variety: DEFAULT_VARIETY_CONFIG, perDomainMinimum: 2 });
    expect(covered.distinctOpenings).toBeGreaterThan(withVariety.distinctOpenings);
  });
});

describe('exposure control', () => {
  it('pulls the worst item down from certainty to well under a third of sessions', () => {
    // Measured at 0.304 with the default exponent of 3, against 1.000 undamped.
    expect(withVariety.maxExposureRate).toBeLessThan(0.35);
    expect(withVariety.maxExposureRate).toBeLessThan(deterministic.maxExposureRate / 3);
  });

  it('gets tighter as the damping exponent rises, which is the knob that trades efficiency', () => {
    const soft = cohort({ variety: { ...DEFAULT_VARIETY_CONFIG, exposureDampingExponent: 1 } });
    const hard = cohort({ variety: { ...DEFAULT_VARIETY_CONFIG, exposureDampingExponent: 6 } });
    expect(hard.maxExposureRate).toBeLessThan(withVariety.maxExposureRate);
    expect(withVariety.maxExposureRate).toBeLessThan(soft.maxExposureRate);
  });

  it('uses a large share of the pool rather than a favoured corner of it', () => {
    expect(withVariety.servedCounts.size).toBeGreaterThan(index.items.length / 2);
  });
});

describe('type and domain spread', () => {
  it('keeps any single type to a modest share of a session', () => {
    // Measured at 12.5%, which is 2 of 16 items.
    expect(withVariety.meanTopTypeShare).toBeLessThan(0.25);
  });

  it('almost never repeats a domain back to back', () => {
    // Measured at 1.2%, against 66.7% for the deterministic baseline.
    expect(withVariety.sameDomainAdjacencyRate).toBeLessThan(0.1);
  });

  it('still fills a full session', () => {
    expect(withVariety.meanItemsServed).toBe(ITEMS);
  });
});

describe('reproducibility', () => {
  it('replays every session exactly from its seed', () => {
    const again = cohort({ variety: DEFAULT_VARIETY_CONFIG });
    expect(again.sessions.map((s) => s.itemIds)).toEqual(
      withVariety.sessions.map((s) => s.itemIds),
    );
  });

  it('gives a thousand sessions a thousand distinct sequences', () => {
    const signatures = new Set(withVariety.sessions.map((s) => s.itemIds.join('|')));
    expect(signatures.size).toBe(SESSIONS);
  });

  it('never repeats an item inside one session', () => {
    for (const session of withVariety.sessions) {
      expect(new Set(session.itemIds).size).toBe(session.itemIds.length);
    }
  });
});
