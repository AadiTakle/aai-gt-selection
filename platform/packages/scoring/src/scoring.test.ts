import { describe, expect, it } from 'vitest';
import { Posterior, paramsFor } from '@gt/engine';
import {
  CRITERIA_V1,
  DOMAIN_NAMES,
  type DomainName,
  type GiftedCriteria,
  type ItemParameters,
  type PrecisionConfig,
} from '@platform/domain';
import {
  ENGINE_VERSION,
  MultiPosterior,
  computeSheet,
  evaluateCriteria,
  replay,
  type ScoredResponse,
  type SheetInput,
} from './index.js';

const THRESHOLD = 1.0;

const PRECISION: PrecisionConfig = {
  confidenceAbove: 0.75,
  confidenceBelow: 0.97,
  minItems: 8,
  maxItems: 16,
};

/**
 * Difficulties chosen to carry information at the threshold, which is not the same as being hard.
 *
 * An easy item answered correctly says almost nothing about whether a child is above theta = 1,
 * because P(correct) is near one on both sides of the line and the likelihood ratio is flat. Tests
 * that expect confidence from easy items are testing a claim the model is right to refuse. The
 * values below were measured, not guessed: `INFORMATIVE` reaches P > 0.75 in eight correct answers
 * and `EASY_FOR_FAILURE` reaches P < 0.03 in eight wrong ones.
 */
const INFORMATIVE = 1.0;
const HARD = 2.0;
const EASY_FOR_FAILURE = 0.0;

function params(b: number, optionCount = 4, a = 1.5): ItemParameters {
  return { b, a, c: 1 / optionCount };
}

function response(domain: DomainName, b: number, correct: boolean | null): ScoredResponse {
  return { domain, params: params(b), correct };
}

/** N items cycling through all four domains, so coverage minimums can be met. */
function acrossDomains(count: number, b: number, correct: boolean | null): ScoredResponse[] {
  return Array.from({ length: count }, (_unused, i) =>
    response(DOMAIN_NAMES[i % DOMAIN_NAMES.length] as DomainName, b, correct),
  );
}

/** N items all in one domain, so coverage minimums cannot be met. */
function inOneDomain(
  count: number,
  b: number,
  correct: boolean | null,
  domain: DomainName = 'fluid',
): ScoredResponse[] {
  return Array.from({ length: count }, () => response(domain, b, correct));
}

function sheetInput(overrides: Partial<SheetInput> = {}): SheetInput {
  const responses = overrides.responses ?? acrossDomains(8, INFORMATIVE, true);
  return {
    sessionId: 'sess-1',
    snapshotId: 'snap-test-001',
    threshold: THRESHOLD,
    criteria: CRITERIA_V1,
    responses,
    precision: PRECISION,
    perDomainMinimum: 2,
    recommendProbability: 0.35,
    itemsServed: responses.length,
    poolExhausted: false,
    abandoned: false,
    computedAt: '2026-08-10T00:00:00.000Z',
    ...overrides,
  };
}

describe('MultiPosterior composite equivalence', () => {
  /**
   * The reason per-domain estimation is a safe change: the composite is the same pooled posterior
   * the prototype already ships, updated by the same responses in the same order. If this test ever
   * fails, per-domain estimation has stopped being additive and has started rewriting the engine.
   */
  it('matches a reference @gt/engine Posterior updated with the same sequence', () => {
    const sequence: ScoredResponse[] = [
      response('quantitative', -1.2, true),
      response('verbal', 0.4, false),
      response('spatial', 1.1, true),
      response('fluid', 0.0, true),
      response('quantitative', 2.0, false),
      response('verbal', -0.6, true),
    ];

    const reference = new Posterior();
    for (const r of sequence) {
      reference.update(paramsFor(r.params.b, 1 / r.params.c, r.params.a), r.correct as boolean);
    }

    const composite = replay(sequence).estimate('composite', THRESHOLD);

    expect(composite.mean).toBeCloseTo(reference.mean(), 12);
    expect(composite.sd).toBeCloseTo(reference.sd(), 12);
    expect(composite.pAboveThreshold).toBeCloseTo(reference.probabilityAbove(THRESHOLD), 12);
    expect(composite.interval[0]).toBeCloseTo(reference.interval(0.9)[0], 12);
    expect(composite.interval[1]).toBeCloseTo(reference.interval(0.9)[1], 12);
  });

  it('routes each response to its own domain and to nothing else', () => {
    const mp = replay(inOneDomain(2, INFORMATIVE, true, 'quantitative'));

    expect(mp.estimate('quantitative', THRESHOLD).itemsScored).toBe(2);
    expect(mp.estimate('composite', THRESHOLD).itemsScored).toBe(2);
    for (const domain of ['verbal', 'spatial', 'fluid'] as const) {
      expect(mp.estimate(domain, THRESHOLD).itemsScored).toBe(0);
    }
  });

  it('leaves an untouched domain sitting on the prior', () => {
    const estimate = replay(inOneDomain(1, INFORMATIVE, true, 'quantitative')).estimate(
      'verbal',
      THRESHOLD,
    );
    expect(Math.abs(estimate.mean)).toBeLessThan(1e-9);
    expect(estimate.itemsScored).toBe(0);
    expect(estimate.informationAccumulated).toBe(0);
  });
});

describe('unscorable responses', () => {
  it('move no evidence but are counted, because guessing would invent evidence', () => {
    const scoredOnly = replay([response('verbal', INFORMATIVE, true)]);
    const withUnscorable = replay([
      response('verbal', INFORMATIVE, true),
      response('verbal', INFORMATIVE, null),
      response('spatial', INFORMATIVE, null),
    ]);

    expect(withUnscorable.estimate('composite', THRESHOLD).mean).toBeCloseTo(
      scoredOnly.estimate('composite', THRESHOLD).mean,
      12,
    );
    expect(withUnscorable.estimate('composite', THRESHOLD).itemsScored).toBe(1);
    expect(withUnscorable.estimate('composite', THRESHOLD).itemsUnscorable).toBe(2);
    expect(withUnscorable.estimate('verbal', THRESHOLD).itemsUnscorable).toBe(1);
    expect(withUnscorable.estimate('spatial', THRESHOLD).itemsUnscorable).toBe(1);
  });
});

describe('posterior behaviour', () => {
  it('raises P(theta > threshold) monotonically across a run of correct answers', () => {
    const mp = new MultiPosterior();
    let previous = mp.pAbove('composite', THRESHOLD);
    for (let i = 0; i < 8; i++) {
      mp.update('fluid', params(INFORMATIVE), true);
      const next = mp.pAbove('composite', THRESHOLD);
      expect(next).toBeGreaterThanOrEqual(previous);
      previous = next;
    }
    expect(previous).toBeGreaterThan(0.75);
  });

  it('lowers it monotonically across a run of wrong answers', () => {
    const mp = new MultiPosterior();
    let previous = mp.pAbove('composite', THRESHOLD);
    for (let i = 0; i < 8; i++) {
      mp.update('fluid', params(EASY_FOR_FAILURE), false);
      const next = mp.pAbove('composite', THRESHOLD);
      expect(next).toBeLessThanOrEqual(previous);
      previous = next;
    }
    expect(previous).toBeLessThan(0.03);
  });

  it('is unmoved at the threshold by easy items answered correctly', () => {
    // The behaviour the failing first draft of these tests got wrong, pinned so it stays honest.
    const easy = replay(inOneDomain(8, -3.0, true));
    expect(easy.pAbove('composite', THRESHOLD)).toBeLessThan(0.3);
  });

  it('brackets the mean inside the 90% interval', () => {
    const estimate = replay(acrossDomains(8, INFORMATIVE, true)).estimate('composite', THRESHOLD);
    expect(estimate.interval[0]).toBeLessThanOrEqual(estimate.mean);
    expect(estimate.interval[1]).toBeGreaterThanOrEqual(estimate.mean);
  });

  it('accumulates information at the threshold it is asked about', () => {
    const mp = replay(inOneDomain(2, INFORMATIVE, true));
    expect(mp.estimate('fluid', 1.0).informationAccumulated).toBeGreaterThan(
      mp.estimate('fluid', -3.5).informationAccumulated,
    );
  });
});

describe('computeSheet', () => {
  it('is a pure function of its input', () => {
    expect(computeSheet(sheetInput())).toEqual(computeSheet(sheetInput()));
  });

  it('reports five populated estimates and stamps the engine version', () => {
    const sheet = computeSheet(sheetInput());
    expect(sheet.engineVersion).toBe(ENGINE_VERSION);
    expect(sheet.criteriaVersion).toBe(CRITERIA_V1.version);
    expect(sheet.composite.scope).toBe('composite');
    for (const domain of DOMAIN_NAMES) {
      expect(sheet.domains[domain].scope).toBe(domain);
      expect(sheet.domains[domain].itemsScored).toBe(2);
    }
  });

  it('reconciles against its trace', () => {
    const responses = acrossDomains(12, INFORMATIVE, true);
    const sheet = computeSheet(sheetInput({ responses, itemsServed: responses.length + 1 }));
    expect(sheet.derivedFromResponseCount).toBe(12);
    expect(sheet.itemsServed).toBe(13);
  });

  it('stops at the item cap', () => {
    const sheet = computeSheet(
      sheetInput({ responses: acrossDomains(16, INFORMATIVE, true), itemsServed: 16 }),
    );
    expect(sheet.stopped).toBe(true);
    expect(sheet.stopReason).toBe('item-cap');
  });

  it('holds a confident session open until the item floor is met', () => {
    // Five correct informative items put P above the 0.75 bar, and coverage is satisfied at a
    // minimum of one per domain. Only the eight-item floor is left to stop the session, so this
    // isolates the floor from the coverage rule.
    const responses = acrossDomains(5, INFORMATIVE, true);
    const sheet = computeSheet(
      sheetInput({ responses, itemsServed: 5, perDomainMinimum: 1 }),
    );
    expect(sheet.composite.pAboveThreshold).toBeGreaterThan(PRECISION.confidenceAbove);
    expect(sheet.stopped).toBe(false);
    expect(sheet.stopReason).toBeNull();
    expect(sheet.decision).toBeNull();
  });

  it('holds a confident session open until every servable domain has met its minimum', () => {
    const responses = inOneDomain(8, HARD, true);
    const sheet = computeSheet(sheetInput({ responses, itemsServed: 8, perDomainMinimum: 2 }));
    expect(sheet.composite.pAboveThreshold).toBeGreaterThan(PRECISION.confidenceAbove);
    expect(sheet.domains.verbal.itemsScored).toBe(0);
    expect(sheet.stopped).toBe(false);
  });

  it('stops confident-above once the floor and coverage are met', () => {
    const sheet = computeSheet(
      sheetInput({ responses: acrossDomains(8, INFORMATIVE, true), itemsServed: 8 }),
    );
    expect(sheet.stopReason).toBe('confident-above');
    expect(sheet.decision).toBe('recommend');
  });

  it('stops confident-below on a run of failures at informative difficulty', () => {
    const sheet = computeSheet(
      sheetInput({ responses: acrossDomains(12, EASY_FOR_FAILURE, false), itemsServed: 12 }),
    );
    expect(sheet.stopReason).toBe('confident-below');
    expect(sheet.decision).toBe('no-recommendation');
  });

  it('ignores a domain the pool cannot serve when checking coverage', () => {
    const responses = [
      ...inOneDomain(5, INFORMATIVE, true, 'fluid'),
      ...inOneDomain(5, INFORMATIVE, true, 'quantitative'),
    ];
    const sheet = computeSheet(
      sheetInput({
        responses,
        itemsServed: 10,
        domainsAvailable: ['fluid', 'quantitative'],
      }),
    );
    expect(sheet.stopReason).toBe('confident-above');
  });

  it('reports bank-exhausted when the pool ran dry short of a decision', () => {
    const responses = [
      response('fluid', INFORMATIVE, true),
      response('verbal', INFORMATIVE, false),
    ];
    const sheet = computeSheet(sheetInput({ responses, itemsServed: 2, poolExhausted: true }));
    expect(sheet.stopReason).toBe('bank-exhausted');
    expect(sheet.stopped).toBe(true);
    expect(sheet.decision).not.toBeNull();
  });

  it('reports abandoned ahead of every other reason', () => {
    const sheet = computeSheet(
      sheetInput({
        responses: acrossDomains(16, INFORMATIVE, true),
        itemsServed: 16,
        abandoned: true,
        poolExhausted: true,
      }),
    );
    expect(sheet.stopReason).toBe('abandoned');
  });
});

describe('evaluateCriteria', () => {
  it('needs the item floor as well as the probability', () => {
    const confident = replay(inOneDomain(5, INFORMATIVE, true));
    expect(confident.pAbove('composite', CRITERIA_V1.abilityThreshold)).toBeGreaterThan(
      CRITERIA_V1.requiredProbability,
    );
    expect(confident.itemsScored('composite')).toBeLessThan(CRITERIA_V1.minItemsScored);
    expect(evaluateCriteria(confident, CRITERIA_V1)).toBe(false);
  });

  it('passes a confident session that met the floor', () => {
    expect(evaluateCriteria(replay(inOneDomain(10, INFORMATIVE, true)), CRITERIA_V1)).toBe(true);
  });

  it('fails a session below the probability bar', () => {
    expect(evaluateCriteria(replay(inOneDomain(10, EASY_FOR_FAILURE, false)), CRITERIA_V1)).toBe(
      false,
    );
  });

  it('evaluates at its own threshold, not the session threshold', () => {
    const mp = replay(inOneDomain(10, EASY_FOR_FAILURE, true));
    const lenient: GiftedCriteria = { ...CRITERIA_V1, abilityThreshold: -1.0 };
    const strict: GiftedCriteria = { ...CRITERIA_V1, abilityThreshold: 3.0 };
    expect(evaluateCriteria(mp, lenient)).toBe(true);
    expect(evaluateCriteria(mp, strict)).toBe(false);
  });

  it('enforces per-domain requirements when present', () => {
    const mp = replay(inOneDomain(10, INFORMATIVE, true));
    const needsVerbal: GiftedCriteria = {
      ...CRITERIA_V1,
      perDomainRequirements: { verbal: { minItemsScored: 2, requiredProbability: 0.5 } },
    };
    expect(evaluateCriteria(mp, CRITERIA_V1)).toBe(true);
    expect(evaluateCriteria(mp, needsVerbal)).toBe(false);
  });

  it('agrees with the sheet it produced', () => {
    const responses = acrossDomains(12, INFORMATIVE, true);
    const sheet = computeSheet(sheetInput({ responses, itemsServed: 12 }));
    expect(sheet.meetsCriteria).toBe(evaluateCriteria(replay(responses), CRITERIA_V1));
    expect(sheet.meetsCriteria).toBe(true);
  });
});
