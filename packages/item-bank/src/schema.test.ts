import { describe, expect, it } from 'vitest';

import { bankItemSchema, servedItemV2Schema } from './bank-item';
import { scoringContractSchema } from './scoring';

/**
 * A faithful transcription of the EXAM_ITEM_SCHEMA_SPEC §8.1 worked example
 * (VER-RELPAIR-01). The spec requires this instance to validate (§11.3).
 */
const specRelpairExample = {
  itemId: '11111111-1111-5111-8111-111111111111',
  typeCode: 'VER-RELPAIR-01',
  domain: 'verbal',
  ageBands: ['4-5', '6-8'],
  difficultyLevel: 6,
  irt: { a: 1.0, b: 0.4, c: 0, model: '2PL' },
  demoPath: 'demos/VER-RELPAIR-01.html',
  content: {
    typeCode: 'VER-RELPAIR-01',
    presentation: 'word',
    relation: 'lives_in',
    stemPair: [{ text: 'bird' }, { text: 'nest' }],
    options: [
      { pair: [{ text: 'bee' }, { text: 'hive' }], lure: 'correct' },
      { pair: [{ text: 'dog' }, { text: 'bone' }], lure: 'associate' },
      { pair: [{ text: 'fish' }, { text: 'scale' }], lure: 'surface_match' },
      { pair: [{ text: 'hive' }, { text: 'bee' }], lure: 'reversed_relation' },
    ],
    frequencyBand: 4,
  },
  answer: {
    correctIndex: 0,
    distractorRationales: ['correct', 'associate', 'surface_match', 'reversed_relation'],
  },
  scoring: { mode: 'deterministic_key' },
  provenance: {
    generator: 'llm',
    generatorRef: 'spec-example',
    promptHash: 'deadbeef',
    validator: [
      { check: 'unique_answer', status: 'pass' },
      { check: 'lure_taxonomy_ok', status: 'pass' },
      { check: 'frequency_band_ok', status: 'pass' },
      { check: 'bias_screen_ok', status: 'pass' },
    ],
  },
  syntheticOnly: true,
  validated: false,
};

/** EXAM_ITEM_SCHEMA_SPEC §8.3 — VER-SENSE-01 (computed_solver, partial credit). */
const specSenseExample = {
  itemId: '22222222-2222-5222-8222-222222222222',
  typeCode: 'VER-SENSE-01',
  domain: 'verbal',
  ageBands: ['2-3'],
  difficultyLevel: 4,
  irt: { a: 1, b: 0.4, c: 0, model: '2PL' },
  demoPath: 'demos/VER-SENSE-01.html',
  content: {
    typeCode: 'VER-SENSE-01',
    cards: [{ text: 'the' }, { text: 'cat' }, { text: 'sat' }, { text: 'down' }],
    sensibleOrder: [0, 1, 2, 3],
    absurdLure: [3, 2, 1, 0],
  },
  answer: { canonicalSolution: [0, 1, 2, 3] },
  scoring: { mode: 'computed_solver', solverId: 'order-plausibility@1', partialCredit: true },
  provenance: { generator: 'grammar', generatorRef: 'x', validator: [] },
  syntheticOnly: true,
  validated: false,
};

describe('EXAM_ITEM_SCHEMA_SPEC fidelity', () => {
  it('validates the §8.1 VER-RELPAIR-01 worked example', () => {
    expect(bankItemSchema.safeParse(specRelpairExample).success).toBe(true);
  });

  it('validates the §8.3 VER-SENSE-01 computed_solver example', () => {
    expect(bankItemSchema.safeParse(specSenseExample).success).toBe(true);
  });

  it('expresses all four scoring modes (§6.4)', () => {
    const modes = [
      { mode: 'deterministic_key' },
      { mode: 'computed_solver', solverId: 's', partialCredit: true },
      { mode: 'proxy_bank', proxies: ['M-IDEAFLU'], responseBankId: 'b1' },
      { mode: 'model_judge', judgeRef: 'j', researchOnly: true },
    ];
    for (const m of modes) expect(scoringContractSchema.safeParse(m).success).toBe(true);
  });

  it('quarantines model_judge behind researchOnly:true', () => {
    expect(
      scoringContractSchema.safeParse({ mode: 'model_judge', judgeRef: 'j' }).success,
    ).toBe(false);
  });
});

describe('bankItemSchema governance guards', () => {
  it('rejects a domain that disagrees with DOMAIN_BY_TYPE', () => {
    const bad = { ...specRelpairExample, domain: 'spatial' };
    expect(bankItemSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects content.typeCode ≠ item.typeCode', () => {
    const bad = {
      ...specRelpairExample,
      content: { ...specRelpairExample.content, typeCode: 'VER-CLOZE-01' },
    };
    expect(bankItemSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects deterministic_key without a selection key', () => {
    const bad = { ...specRelpairExample, answer: { distractorRationales: ['correct'] } };
    expect(bankItemSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects validated:true (literal false only)', () => {
    const bad = { ...specRelpairExample, validated: true };
    expect(bankItemSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects syntheticOnly:false (literal true only)', () => {
    const bad = { ...specRelpairExample, syntheticOnly: false };
    expect(bankItemSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects a served item that carries an answer key', () => {
    const leaky = { ...specRelpairExample };
    expect(servedItemV2Schema.safeParse(leaky).success).toBe(false);
  });
});
