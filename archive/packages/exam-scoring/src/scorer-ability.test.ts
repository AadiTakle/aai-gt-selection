/**
 * Ability bracketing (D-024): the ALTERNATIVE, non-default bracket driver.
 *
 * `scorer.test.ts` pins the shipped accuracy-bracket contract and is deliberately untouched by
 * this file. What is asserted here is (a) that the default is unchanged in every observable way,
 * (b) that the alternative brackets on difficulty reached rather than on accuracy, and (c) that
 * the two-stage §5 shape — statistic brackets, metrics position — holds in BOTH modes.
 */
import { describe, expect, it } from 'vitest';

import { ABILITY_BRACKET_POLICY, DEFAULT_EXAM_POLICY, type ExamPolicy } from './policy';
import { scoreExam } from './scorer';
import { type Domain, type MetricMap, type ScoredItem } from './types';

let counter = 0;

function mkItem(p: {
  domain?: Domain;
  difficulty: number;
  correct: boolean;
  metrics?: MetricMap;
}): ScoredItem {
  return {
    itemId: `ability-scorer-${(counter += 1)}`,
    typeCode: 'SYN-TYPE-01',
    domain: p.domain ?? 'fluid_reasoning',
    metrics: p.metrics ?? {},
    telemetry: [],
    correct: p.correct,
    score: p.correct ? 1 : 0,
    difficulty: p.difficulty,
  };
}

/** A threshold responder over one area: correct at or below `theta`, wrong above it. */
function trace(theta: number, difficulties: readonly number[], domain: Domain = 'fluid_reasoning') {
  return difficulties.map((difficulty) =>
    mkItem({ domain, difficulty, correct: difficulty <= theta }),
  );
}

const RAMP = [4, 6, 8, 10, 12, 14, 16, 18];

/**
 * Two children with the SAME raw accuracy (half correct) who succeed in completely different
 * places on the difficulty scale. This is the shape a converged adaptive battery produces, and
 * the case the accuracy bracket cannot see.
 */
const HIGH_SOLVER = [
  ...[16, 16, 16, 16].map((d) => mkItem({ difficulty: d, correct: true })),
  ...[18, 18, 18, 18].map((d) => mkItem({ difficulty: d, correct: false })),
];
const LOW_SOLVER = [
  ...[3, 3, 3, 3].map((d) => mkItem({ difficulty: d, correct: true })),
  ...[5, 5, 5, 5].map((d) => mkItem({ difficulty: d, correct: false })),
];

// ---------------------------------------------------------------------------
// the default must not move
// ---------------------------------------------------------------------------

describe('bracketing mode — the default is unchanged', () => {
  it('defaults to accuracy bracketing', () => {
    expect(DEFAULT_EXAM_POLICY.bracketing.mode).toBe('accuracy');
  });

  it('a policy that omits `mode` scores byte-identically to the default', () => {
    // The pre-D-024 policy shape: no `mode`, no `ability`. It must remain the accuracy contract.
    const legacy = {
      ...DEFAULT_EXAM_POLICY,
      bracketing: {
        difficultyWeighted: DEFAULT_EXAM_POLICY.bracketing.difficultyWeighted,
        brackets: DEFAULT_EXAM_POLICY.bracketing.brackets,
      },
    } as ExamPolicy;

    const items = trace(11, RAMP);
    expect(JSON.stringify(scoreExam(items, legacy))).toBe(
      JSON.stringify(scoreExam(items, DEFAULT_EXAM_POLICY)),
    );
  });

  it('reports no ability estimate under the default, so the output shape is unchanged', () => {
    const scored = scoreExam(trace(11, RAMP));
    const area = scored.perArea.fluid_reasoning!;
    expect('abilityEstimate' in area).toBe(false);
    expect(Object.keys(area)).toEqual([
      'area',
      'proficiency',
      'bracket',
      'bracketRange',
      'accuracy',
      'positionWithinBracket',
      'itemsScored',
      'contributions',
      'metricCoverage',
    ]);
  });

  it('still cannot separate the two children — the defect D-024 records', () => {
    const high = scoreExam(HIGH_SOLVER).perArea.fluid_reasoning!;
    const low = scoreExam(LOW_SOLVER).perArea.fluid_reasoning!;
    expect(high.bracket).toBe(low.bracket);
  });
});

// ---------------------------------------------------------------------------
// what the alternative does
// ---------------------------------------------------------------------------

describe('bracketing mode — ability', () => {
  it('separates the two same-accuracy children by where they succeed', () => {
    const high = scoreExam(HIGH_SOLVER, ABILITY_BRACKET_POLICY).perArea.fluid_reasoning!;
    const low = scoreExam(LOW_SOLVER, ABILITY_BRACKET_POLICY).perArea.fluid_reasoning!;

    expect(high.bracket).toBeGreaterThan(low.bracket);
    expect(high.bracketRange[0]).toBeGreaterThanOrEqual(16);
    expect(low.bracketRange[1]).toBeLessThanOrEqual(8);
    expect(high.proficiency - low.proficiency).toBeGreaterThan(10);
  });

  it('is monotone in true ability and reaches the top of the scale', () => {
    let previous = Number.NEGATIVE_INFINITY;
    for (const theta of [3, 7, 11, 15, 19]) {
      const scored = scoreExam(trace(theta, RAMP), ABILITY_BRACKET_POLICY);
      expect(scored.composite, `true ability ${theta}`).toBeGreaterThan(previous);
      previous = scored.composite;
    }
    // A child correct on every item served must be able to reach the top bracket.
    const ceiling = scoreExam(
      RAMP.map((difficulty) => mkItem({ difficulty, correct: true })),
      ABILITY_BRACKET_POLICY,
    ).perArea.fluid_reasoning!;
    expect(ceiling.bracket).toBe(4);
    expect(ceiling.proficiency).toBeGreaterThan(16);
  });

  it('puts a child correct on nothing in the bottom bracket', () => {
    const floor = scoreExam(
      RAMP.map((difficulty) => mkItem({ difficulty, correct: false })),
      ABILITY_BRACKET_POLICY,
    ).perArea.fluid_reasoning!;
    expect(floor.bracket).toBe(0);
    expect(floor.bracketRange).toEqual([1, 4]);
  });

  it('reports the ability estimate it bracketed on, and it lies inside the bracket', () => {
    const area = scoreExam(trace(13, RAMP), ABILITY_BRACKET_POLICY).perArea.fluid_reasoning!;
    const estimate = area.abilityEstimate as number;
    expect(estimate).toBeGreaterThanOrEqual(area.bracketRange[0]);
    expect(estimate).toBeLessThanOrEqual(area.bracketRange[1]);
  });

  it('brackets per area, so an uneven profile stays uneven', () => {
    const items = [...trace(17, RAMP, 'fluid_reasoning'), ...trace(5, RAMP, 'verbal')];
    const scored = scoreExam(items, ABILITY_BRACKET_POLICY);
    expect(scored.perArea.fluid_reasoning!.bracket).toBeGreaterThan(scored.perArea.verbal!.bracket);
    expect(scored.profile.rankedAreas[0]).toBe('fluid_reasoning');
  });
});

// ---------------------------------------------------------------------------
// the two-stage structure the owner specified
// ---------------------------------------------------------------------------

describe('ability bracketing preserves the two-stage structure', () => {
  it('metrics still position within the bracket, and cannot change it', () => {
    // Identical difficulty and correctness ⇒ identical ability ⇒ identical bracket. The traces
    // differ only in an explicit M-DIFFREACH ceiling, which is a positioning metric.
    const build = (ceiling: number): ScoredItem[] =>
      trace(13, RAMP).map((item) => ({ ...item, metrics: { 'M-DIFFREACH': ceiling } }));

    const lower = scoreExam(build(13), ABILITY_BRACKET_POLICY).perArea.fluid_reasoning!;
    const higher = scoreExam(build(19), ABILITY_BRACKET_POLICY).perArea.fluid_reasoning!;

    expect(higher.bracket).toBe(lower.bracket);
    expect(higher.bracketRange).toEqual(lower.bracketRange);
    expect(higher.positionWithinBracket).toBeGreaterThan(lower.positionWithinBracket);
    expect(higher.proficiency).toBeGreaterThan(lower.proficiency);
  });

  it('the score never leaves the bracket the ability statistic chose', () => {
    for (const theta of [3, 7, 11, 15, 19]) {
      const area = scoreExam(trace(theta, RAMP), ABILITY_BRACKET_POLICY).perArea.fluid_reasoning!;
      expect(area.proficiency).toBeGreaterThanOrEqual(area.bracketRange[0]);
      expect(area.proficiency).toBeLessThanOrEqual(area.bracketRange[1]);
    }
  });

  it('accuracy is still computed and reported, it just no longer brackets', () => {
    const area = scoreExam(HIGH_SOLVER, ABILITY_BRACKET_POLICY).perArea.fluid_reasoning!;
    const accuracyArea = scoreExam(HIGH_SOLVER).perArea.fluid_reasoning!;
    expect(area.accuracy).toBe(accuracyArea.accuracy);
    expect(area.bracket).not.toBe(accuracyArea.bracket);
  });
});

// ---------------------------------------------------------------------------
// contract: purity, determinism, tunability
// ---------------------------------------------------------------------------

describe('ability bracketing — contract', () => {
  it('is a pure, reproducible function of (items, policy)', () => {
    const build = (): ScoredItem[] => trace(15, RAMP);
    expect(scoreExam(build(), ABILITY_BRACKET_POLICY)).toEqual(
      scoreExam(build(), ABILITY_BRACKET_POLICY),
    );
  });

  it('does not mutate the input items', () => {
    const items = trace(15, RAMP);
    const snapshot = structuredClone(items);
    scoreExam(items, ABILITY_BRACKET_POLICY);
    expect(items).toEqual(snapshot);
  });

  it('echoes its own policy id and emits no decision label', () => {
    const scored = scoreExam(trace(15, RAMP), ABILITY_BRACKET_POLICY);
    expect(scored.policyId).toBe('exam-scoring-ability-bracket-v1');
    expect(JSON.stringify(scored)).not.toMatch(/admit|defer|retry/i);
  });

  it('falls back to the default fit knobs when the policy omits them', () => {
    const withoutKnobs: ExamPolicy = {
      ...DEFAULT_EXAM_POLICY,
      id: 'test-ability-no-knobs',
      bracketing: { ...DEFAULT_EXAM_POLICY.bracketing, mode: 'ability' },
    };
    const items = trace(15, RAMP);
    expect(scoreExam(items, withoutKnobs).composite).toBe(
      scoreExam(items, ABILITY_BRACKET_POLICY).composite,
    );
  });

  it('honours custom bracket spans as the ability cut points', () => {
    const twoBrackets: ExamPolicy = {
      ...ABILITY_BRACKET_POLICY,
      id: 'test-ability-two-brackets',
      bracketing: {
        ...ABILITY_BRACKET_POLICY.bracketing,
        brackets: [
          { index: 0, accuracyMin: 0, theta: { min: 1, max: 10 } },
          { index: 1, accuracyMin: 0.5, theta: { min: 10, max: 20 } },
        ],
      },
    };
    expect(scoreExam(trace(17, RAMP), twoBrackets).perArea.fluid_reasoning!.bracketRange).toEqual([
      10, 20,
    ]);
    expect(scoreExam(trace(3, RAMP), twoBrackets).perArea.fluid_reasoning!.bracketRange).toEqual([
      1, 10,
    ]);
  });

  it('handles an empty trace exactly as the default mode does', () => {
    expect(scoreExam([], ABILITY_BRACKET_POLICY).composite).toBe(1);
    expect(Object.keys(scoreExam([], ABILITY_BRACKET_POLICY).perArea)).toHaveLength(0);
  });
});
