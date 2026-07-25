import { describe, expect, it } from 'vitest';

import { DEFAULT_EXAM_POLICY, type ExamPolicy } from './policy';
import { scoreExam } from './scorer';
import { type Domain, type MetricMap, type ScoredItem } from './types';

// ---------------------------------------------------------------------------
// test fixtures (born-synthetic)
// ---------------------------------------------------------------------------

let counter = 0;

function mkItem(p: {
  domain?: Domain;
  difficulty?: number;
  correct?: boolean;
  score?: number;
  metrics?: MetricMap;
}): ScoredItem {
  const correct = p.correct ?? true;
  return {
    itemId: `item-${(counter += 1)}`,
    typeCode: 'SYN-TYPE-01',
    domain: p.domain ?? 'fluid_reasoning',
    metrics: p.metrics ?? {},
    telemetry: [],
    correct,
    score: p.score ?? (correct ? 1 : 0),
    difficulty: p.difficulty ?? 10,
  };
}

/** N items in one area with a fixed correct/incorrect split and shared metrics. */
function area(
  domain: Domain,
  opts: { n: number; correct: number; difficulty?: number; metrics?: MetricMap },
): ScoredItem[] {
  const out: ScoredItem[] = [];
  for (let i = 0; i < opts.n; i += 1) {
    out.push(
      mkItem({
        domain,
        difficulty: opts.difficulty ?? 10,
        correct: i < opts.correct,
        ...(opts.metrics ? { metrics: opts.metrics } : {}),
      }),
    );
  }
  return out;
}

// ---------------------------------------------------------------------------
// determinism / purity
// ---------------------------------------------------------------------------

describe('scoreExam — determinism & purity', () => {
  it('produces identical output for identical (fresh) inputs', () => {
    const build = (): ScoredItem[] => [
      ...area('fluid_reasoning', {
        n: 6,
        correct: 4,
        metrics: { 'M-DIFFREACH': 12, 'M-RTVAR': 0.3 },
      }),
      ...area('verbal', { n: 5, correct: 3, metrics: { 'M-VOCABLVL': 5 } }),
    ];
    const first = scoreExam(build());
    const second = scoreExam(build());
    expect(second).toEqual(first);
  });

  it('does not mutate the input items', () => {
    const items = area('spatial', { n: 4, correct: 2, metrics: { 'M-ROTSLOPE': 8 } });
    const snapshot = structuredClone(items);
    scoreExam(items);
    expect(items).toEqual(snapshot);
  });

  it('echoes the policy id and scale, and emits NO decision label', () => {
    const result = scoreExam(area('quantitative', { n: 8, correct: 5, metrics: { 'M-PAE': 0.1 } }));
    expect(result.policyId).toBe(DEFAULT_EXAM_POLICY.id);
    expect(result.scaleMin).toBe(1);
    expect(result.scaleMax).toBe(20);
    expect(result.syntheticOnly).toBe(true);
    // NO admit/defer/retry decision anywhere in the output.
    expect(Object.keys(result)).not.toContain('decision');
    expect(JSON.stringify(result)).not.toMatch(/admit|defer|retry/i);
  });
});

// ---------------------------------------------------------------------------
// bracket by accuracy (BUILD_PLAN §5 step 1)
// ---------------------------------------------------------------------------

describe('scoreExam — accuracy sets the bracket', () => {
  it('maps low accuracy to the lowest bracket and high accuracy to the highest', () => {
    const low = scoreExam(area('fluid_reasoning', { n: 8, correct: 0 }));
    const high = scoreExam(area('fluid_reasoning', { n: 8, correct: 8 }));

    const lowArea = low.perArea.fluid_reasoning!;
    const highArea = high.perArea.fluid_reasoning!;

    expect(lowArea.bracket).toBe(0);
    expect(lowArea.proficiency).toBeGreaterThanOrEqual(1);
    expect(lowArea.proficiency).toBeLessThanOrEqual(4);

    expect(highArea.bracket).toBe(4);
    expect(highArea.proficiency).toBeGreaterThanOrEqual(16);
    expect(highArea.proficiency).toBeLessThanOrEqual(20);

    expect(highArea.proficiency).toBeGreaterThan(lowArea.proficiency);
  });

  it('uses difficulty-weighted accuracy (accuracy-at-difficulty)', () => {
    // Same raw accuracy (1 of 2 correct) but one is correct on the HARD item.
    const hardSolver = scoreExam([
      mkItem({ domain: 'verbal', difficulty: 18, correct: true }),
      mkItem({ domain: 'verbal', difficulty: 2, correct: false }),
    ]);
    const easySolver = scoreExam([
      mkItem({ domain: 'verbal', difficulty: 2, correct: true }),
      mkItem({ domain: 'verbal', difficulty: 18, correct: false }),
    ]);
    expect(hardSolver.perArea.verbal!.accuracy).toBeGreaterThan(
      easySolver.perArea.verbal!.accuracy,
    );
    expect(hardSolver.perArea.verbal!.bracket).toBeGreaterThan(easySolver.perArea.verbal!.bracket);
  });
});

// ---------------------------------------------------------------------------
// within-bracket positioning (BUILD_PLAN §5 step 2)
// ---------------------------------------------------------------------------

describe('scoreExam — metrics position within the bracket', () => {
  it('higher M-DIFFREACH → higher score in the SAME bracket', () => {
    // Identical correctness/difficulty ⇒ identical accuracy ⇒ identical bracket.
    // Explicit ceilings set above the solved difficulty so they drive positioning.
    const base = { n: 6, correct: 4, difficulty: 10 } as const;
    const lower = scoreExam(area('fluid_reasoning', { ...base, metrics: { 'M-DIFFREACH': 11 } }));
    const higher = scoreExam(area('fluid_reasoning', { ...base, metrics: { 'M-DIFFREACH': 17 } }));

    const lo = lower.perArea.fluid_reasoning!;
    const hi = higher.perArea.fluid_reasoning!;
    expect(hi.bracket).toBe(lo.bracket);
    expect(hi.positionWithinBracket).toBeGreaterThan(lo.positionWithinBracket);
    expect(hi.proficiency).toBeGreaterThan(lo.proficiency);
  });

  it('higher consistency (lower M-RTVAR) → higher score in the SAME bracket', () => {
    const base = { n: 6, correct: 4, difficulty: 10 } as const;
    const inconsistent = scoreExam(
      area('spatial', { ...base, metrics: { 'M-DIFFREACH': 12, 'M-RTVAR': 0.8 } }),
    );
    const consistent = scoreExam(
      area('spatial', { ...base, metrics: { 'M-DIFFREACH': 12, 'M-RTVAR': 0.1 } }),
    );

    const inc = inconsistent.perArea.spatial!;
    const con = consistent.perArea.spatial!;
    expect(con.bracket).toBe(inc.bracket);
    expect(con.proficiency).toBeGreaterThan(inc.proficiency);
  });

  it('higher M-LEARNRATE → higher score in the SAME bracket', () => {
    const base = { n: 8, correct: 5, difficulty: 10 } as const;
    const slow = scoreExam(area('verbal', { ...base, metrics: { 'M-LEARNRATE': 0.1 } }));
    const fast = scoreExam(area('verbal', { ...base, metrics: { 'M-LEARNRATE': 0.9 } }));
    expect(fast.perArea.verbal!.bracket).toBe(slow.perArea.verbal!.bracket);
    expect(fast.perArea.verbal!.proficiency).toBeGreaterThan(slow.perArea.verbal!.proficiency);
  });

  it('falls back to the policy default position when no weighted metrics are present', () => {
    // All wrong ⇒ bracket 0 [1,4]; no scoring metrics ⇒ position = defaultPosition (0.5).
    const result = scoreExam(area('fluid_reasoning', { n: 6, correct: 0 }));
    const a = result.perArea.fluid_reasoning!;
    expect(a.contributions).toHaveLength(0);
    expect(a.positionWithinBracket).toBeCloseTo(DEFAULT_EXAM_POLICY.position.defaultPosition, 10);
    expect(a.proficiency).toBeCloseTo(1 + 0.5 * (4 - 1), 10);
  });

  it('does NOT reward raw speed by default (M-RT weight is 0)', () => {
    const base = { n: 20, correct: 12, difficulty: 10 } as const;
    const slow = scoreExam(area('fluid_reasoning', { ...base, metrics: { 'M-RT': 18000 } }));
    const fast = scoreExam(area('fluid_reasoning', { ...base, metrics: { 'M-RT': 1500 } }));
    // Speed is evidence only behind the (unenforced) engagement gate → no effect now.
    expect(fast.perArea.fluid_reasoning!.proficiency).toBe(
      slow.perArea.fluid_reasoning!.proficiency,
    );
  });
});

// ---------------------------------------------------------------------------
// composite + profile (BUILD_PLAN §5 step 3)
// ---------------------------------------------------------------------------

describe('scoreExam — composite & profile', () => {
  it('composite is the (area-weighted) mean of present areas and stays on scale', () => {
    const result = scoreExam([
      ...area('fluid_reasoning', { n: 8, correct: 8, metrics: { 'M-DIFFREACH': 19 } }),
      ...area('verbal', { n: 8, correct: 1 }),
    ]);
    const fluid = result.perArea.fluid_reasoning!.proficiency;
    const verbal = result.perArea.verbal!.proficiency;
    expect(result.composite).toBeGreaterThanOrEqual(1);
    expect(result.composite).toBeLessThanOrEqual(20);
    expect(result.composite).toBeCloseTo((fluid + verbal) / 2, 6);
  });

  it('names the strongest area as a strength and the weakest as a relative weakness', () => {
    const result = scoreExam([
      ...area('fluid_reasoning', { n: 8, correct: 8, metrics: { 'M-DIFFREACH': 19 } }),
      ...area('verbal', { n: 8, correct: 1 }),
    ]);
    expect(result.profile.rankedAreas[0]).toBe('fluid_reasoning');
    expect(result.profile.strengths).toContain('fluid_reasoning');
    expect(result.profile.relativeWeaknesses).toContain('verbal');
  });

  it('reports learning-rate and consistency profile signals with band labels', () => {
    const result = scoreExam(
      area('fluid_reasoning', {
        n: 10,
        correct: 6,
        metrics: { 'M-LEARNRATE': 0.85, 'M-RTVAR': 0.1 },
      }),
    );
    expect(result.profile.learningRate.raw).toBeCloseTo(0.85, 6);
    expect(result.profile.learningRate.label).toBe('high');
    // Low RT variability ⇒ high consistency.
    expect(result.profile.consistency.label).toBe('high');
    expect(result.profile.consistency.normalized).toBeGreaterThan(0.7);
  });

  it('marks profile signals unknown when the metric is absent', () => {
    const result = scoreExam(area('quantitative', { n: 6, correct: 3 }));
    expect(result.profile.learningRate.raw).toBeNull();
    expect(result.profile.learningRate.label).toBe('unknown');
    expect(result.profile.consistency.raw).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// tunable policy
// ---------------------------------------------------------------------------

describe('scoreExam — policy is tunable', () => {
  it('reweighting a metric changes the score (reproducibly)', () => {
    const items = area('fluid_reasoning', {
      n: 6,
      correct: 4,
      difficulty: 10,
      metrics: { 'M-DIFFREACH': 11, 'M-LEARNRATE': 0.9 },
    });

    const defaultScore = scoreExam(items);

    // A policy that leans entirely on learning rate should move the score up
    // (learn rate is high here) relative to the default blend.
    const learnRateHeavy: ExamPolicy = {
      ...DEFAULT_EXAM_POLICY,
      id: 'test-learnrate-heavy',
      position: {
        ...DEFAULT_EXAM_POLICY.position,
        metricWeights: {
          'M-DIFFREACH': { weight: 0.0, direction: 'higher', range: { min: 1, max: 20 } },
          'M-LEARNRATE': { weight: 1.0, direction: 'higher', range: { min: 0, max: 1 } },
        },
      },
    };

    const tuned = scoreExam(items, learnRateHeavy);
    expect(tuned.policyId).toBe('test-learnrate-heavy');
    expect(tuned.perArea.fluid_reasoning!.proficiency).not.toBe(
      defaultScore.perArea.fluid_reasoning!.proficiency,
    );
    // Same tuned policy ⇒ identical result (reproducible).
    expect(scoreExam(items, learnRateHeavy)).toEqual(tuned);
  });

  it('custom bracket edges relocate the score band', () => {
    const items = area('verbal', { n: 10, correct: 6 }); // difficulty-weighted acc = 0.6
    const oneBigBracket: ExamPolicy = {
      ...DEFAULT_EXAM_POLICY,
      id: 'test-one-bracket',
      bracketing: {
        difficultyWeighted: true,
        brackets: [{ index: 0, accuracyMin: 0, theta: { min: 1, max: 20 } }],
      },
    };
    const result = scoreExam(items, oneBigBracket);
    expect(result.perArea.verbal!.bracket).toBe(0);
    expect(result.perArea.verbal!.bracketRange).toEqual([1, 20]);
  });
});

// ---------------------------------------------------------------------------
// edge cases
// ---------------------------------------------------------------------------

describe('scoreExam — edge cases', () => {
  it('handles an empty trace without throwing', () => {
    const result = scoreExam([]);
    expect(Object.keys(result.perArea)).toHaveLength(0);
    expect(result.profile.strengths).toHaveLength(0);
    expect(result.composite).toBe(1);
  });

  it('only reports areas that have scored items', () => {
    const result = scoreExam(area('spatial', { n: 3, correct: 2 }));
    expect(Object.keys(result.perArea)).toEqual(['spatial']);
  });
});
