import { describe, expect, it } from 'vitest';
import {
  CRITERIA_V1,
  DEFAULT_VARIETY_CONFIG,
  DOMAIN_NAMES,
  domainFromTypeCode,
  formatTypeCode,
  nextVersion,
  parseTypeCode,
  sameFamily,
  toServedQuestion,
  tryParseTypeCode,
  type RegistryItem,
} from './index.js';

describe('type code arithmetic', () => {
  it('splits a code into family and version on the final hyphen', () => {
    expect(parseTypeCode('FLU-MATRIX-01')).toEqual({
      code: 'FLU-MATRIX-01',
      family: 'FLU-MATRIX',
      version: 1,
    });
  });

  it('preserves casing verbatim, because the code is a primary key and a filename', () => {
    const parsed = parseTypeCode('WM-corsi-01');
    expect(parsed.code).toBe('WM-corsi-01');
    expect(parsed.family).toBe('WM-corsi');
    expect(parsed.version).toBe(1);
  });

  it('reads a version above one', () => {
    expect(parseTypeCode('CX-achieve-02').version).toBe(2);
  });

  it('handles a two-segment code, which is the shape future CogAT families use', () => {
    expect(parseTypeCode('VA-01')).toEqual({ code: 'VA-01', family: 'VA', version: 1 });
  });

  it('rejects a code with no version segment', () => {
    expect(() => parseTypeCode('nope')).toThrow(/malformed/i);
  });

  it('rejects a non-numeric version segment', () => {
    expect(() => parseTypeCode('FLU-MATRIX-XX')).toThrow(/malformed/i);
  });

  it('rejects an empty family', () => {
    expect(() => parseTypeCode('-01')).toThrow(/malformed/i);
  });

  it('returns null rather than throwing when asked to try', () => {
    expect(tryParseTypeCode('nope')).toBeNull();
    expect(tryParseTypeCode('FLU-MATRIX-01')).not.toBeNull();
  });

  it('formats with two-digit zero padding', () => {
    expect(formatTypeCode('FLU-MATRIX', 2)).toBe('FLU-MATRIX-02');
    expect(formatTypeCode('FLU-MATRIX', 10)).toBe('FLU-MATRIX-10');
    expect(formatTypeCode('FLU-MATRIX', 100)).toBe('FLU-MATRIX-100');
  });

  it('increments a version, carrying past nine', () => {
    expect(nextVersion('FLU-MATRIX-01')).toBe('FLU-MATRIX-02');
    expect(nextVersion('CX-achieve-09')).toBe('CX-achieve-10');
  });

  it('compares families case-insensitively, because the banks are inconsistent', () => {
    expect(sameFamily('WM-corsi-01', 'WM-CORSI-02')).toBe(true);
    expect(sameFamily('FLU-MATRIX-01', 'FLU-VENN-01')).toBe(false);
  });

  it('treats a malformed code as belonging to no family', () => {
    expect(sameFamily('nope', 'nope')).toBe(false);
  });
});

describe('domain inference', () => {
  it('maps the three explicit prefixes', () => {
    expect(domainFromTypeCode('QUANT-SERIES-01')).toBe('quantitative');
    expect(domainFromTypeCode('VER-MORPHO-01')).toBe('verbal');
    expect(domainFromTypeCode('SPA-PUNCH-01')).toBe('spatial');
  });

  it('falls through to fluid for the rule-finding and capacity prefixes', () => {
    for (const code of ['FLU-MATRIX-01', 'GB-TRACK-01', 'WM-corsi-01', 'CX-achieve-02']) {
      expect(domainFromTypeCode(code)).toBe('fluid');
    }
  });

  it('is case insensitive', () => {
    expect(domainFromTypeCode('quant-series-01')).toBe('quantitative');
  });

  it('names exactly the four blueprint domains', () => {
    expect([...DOMAIN_NAMES]).toEqual(['quantitative', 'verbal', 'spatial', 'fluid']);
  });
});

describe('toServedQuestion', () => {
  const item: RegistryItem = {
    itemId: 'i-1',
    typeCode: 'FLU-MATRIX-01',
    revision: 1,
    domain: 'fluid',
    difficulty: 11,
    params: { b: 0.1667, a: 1.5, c: 0.25 },
    optionCount: 4,
    ageBands: ['K-1'],
    scoringMode: 'deterministic_key',
    content: { typeCode: 'FLU-MATRIX-01', gridSize: 2, options: [{ key: 'A' }, { key: 'B' }] },
    syntheticOnly: true,
    validated: false,
    calibrated: false,
  };

  it('carries only what a renderer needs', () => {
    const served = toServedQuestion(item);
    expect(Object.keys(served).sort()).toEqual(
      ['ageBands', 'content', 'difficulty', 'domain', 'itemId', 'optionCount', 'typeCode'].sort(),
    );
  });

  it('never emits item parameters, which would leak the difficulty model to a client', () => {
    const served = toServedQuestion(item) as unknown as Record<string, unknown>;
    expect(served.params).toBeUndefined();
    expect(served.revision).toBeUndefined();
    expect(served.scoringMode).toBeUndefined();
  });

  it('scrubs answer-shaped keys out of content at any depth', () => {
    const contaminated: RegistryItem = {
      ...item,
      content: {
        stem: 'x',
        correctKey: 'B',
        answer: { correctKey: 'B' },
        nested: { deeper: { distractorRationales: { A: 'no' }, keep: 1 } },
        options: [{ key: 'A', solution: 'leak' }],
      },
    };
    const json = JSON.stringify(toServedQuestion(contaminated));
    for (const forbidden of ['correctKey', 'distractorRationales', 'solution', '"answer"']) {
      expect(json).not.toContain(forbidden);
    }
    expect(json).toContain('keep');
    expect(json).toContain('stem');
  });
});

describe('defaults', () => {
  it('says out loud that the criteria are not calibrated against children', () => {
    /**
     * This used to assert the word "placeholder". The bar is no longer a placeholder — it is GT's stated
     * one — but the *probabilities* are still computed over difficulties that are a rescale of an authoring
     * judgement rather than calibrated from responses. That is the caveat worth holding onto, so the test now
     * pins the caveat rather than the word.
     */
    expect(CRITERIA_V1.version).toBe('criteria-v1');
    expect(CRITERIA_V1.description.toLowerCase()).toContain('not calibrated');
  });

  it('aims at the 95th percentile, and keeps the single-domain bar above the composite', () => {
    // theta 1.645 is the 95th percentile of a standard normal, which is GT's stated CogAT bar for grades 3-5.
    expect(CRITERIA_V1.abilityThreshold).toBeCloseTo(1.645, 3);
    expect(CRITERIA_V1.minItemsScored).toBe(8);
    /**
     * Ordering, not style. Passing on one battery alone is a stronger claim about that battery than the
     * composite makes about the whole child, so it must be the harder bar. Raising the composite to 1.645 left
     * domainBar at 1.5 — below it — which would have made the single-battery route the easier way in with
     * nothing failing to say so.
     */
    expect(CRITERIA_V1.domainBar as number).toBeGreaterThan(CRITERIA_V1.abilityThreshold);
  });

  it('demands more confidence to act than the prototype needs to encourage on screen', () => {
    // The app's recommendProbability sits near 0.35. Proactively contacting a family is a
    // stronger claim than an on-screen "consider applying", so the outreach bar is higher.
    expect(CRITERIA_V1.requiredProbability).toBeGreaterThan(0.35);
  });

  it('ships variety defaults that actually vary', () => {
    expect(DEFAULT_VARIETY_CONFIG.randomesqueK).toBeGreaterThan(1);
    expect(DEFAULT_VARIETY_CONFIG.targetExposureRate).toBeGreaterThan(0);
    expect(DEFAULT_VARIETY_CONFIG.targetExposureRate).toBeLessThanOrEqual(1);
    expect(DEFAULT_VARIETY_CONFIG.openingJitterLogits).toBeGreaterThan(0);
  });
});
