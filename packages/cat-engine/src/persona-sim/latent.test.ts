import { describe, expect, it } from 'vitest';

import { hashSeed, mulberry32 } from '../rng';

import {
  choleskyDecompose,
  correlatedNormals,
  dialToTheta,
  personaCorrelationMatrix,
  samplePersona,
  samplePersonaCohort,
  standardNormals,
  thetaToDial,
  PERSONA_TRAIT_KEYS,
} from './latent';

function multiplyByTranspose(l: readonly (readonly number[])[]): number[][] {
  const n = l.length;
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => {
      let sum = 0;
      for (let k = 0; k < n; k++) sum += l[i]![k]! * l[j]![k]!;
      return sum;
    }),
  );
}

const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

function pearson(xs: readonly number[], ys: readonly number[]): number {
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let dx2 = 0;
  let dy2 = 0;
  for (let i = 0; i < xs.length; i++) {
    const dx = xs[i]! - mx;
    const dy = ys[i]! - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  return num / Math.sqrt(dx2 * dy2);
}

describe('choleskyDecompose', () => {
  it('reproduces the input matrix as L * L^T', () => {
    const a = [
      [4, 2, -2],
      [2, 10, 2],
      [-2, 2, 5],
    ];
    const product = multiplyByTranspose(choleskyDecompose(a));
    for (let i = 0; i < a.length; i++) {
      for (let j = 0; j < a.length; j++) expect(product[i]![j]).toBeCloseTo(a[i]![j]!, 10);
    }
  });

  it('returns a lower-triangular factor', () => {
    const l = choleskyDecompose([
      [2, 1],
      [1, 2],
    ]);
    expect(l[0]![1]).toBe(0);
  });

  it('matches the known 2x2 factor of a correlation matrix', () => {
    const r = 0.6;
    const l = choleskyDecompose([
      [1, r],
      [r, 1],
    ]);
    expect(l[0]![0]).toBeCloseTo(1, 12);
    expect(l[1]![0]).toBeCloseTo(r, 12);
    expect(l[1]![1]).toBeCloseTo(Math.sqrt(1 - r * r), 12);
  });

  it('throws on a non-positive-definite matrix instead of silently ridging it', () => {
    expect(() =>
      choleskyDecompose([
        [1, 1.2],
        [1.2, 1],
      ]),
    ).toThrow(/not positive definite/);
  });

  it('throws on a non-square matrix', () => {
    expect(() => choleskyDecompose([[1, 0], [0]])).toThrow(/square/);
  });
});

describe('personaCorrelationMatrix', () => {
  it('is symmetric with a unit diagonal', () => {
    const m = personaCorrelationMatrix();
    expect(m.length).toBe(PERSONA_TRAIT_KEYS.length);
    for (let i = 0; i < m.length; i++) {
      expect(m[i]![i]).toBe(1);
      for (let j = 0; j < m.length; j++) expect(m[i]![j]).toBe(m[j]![i]);
    }
  });

  it('is positive definite (has a valid multivariate-normal interpretation)', () => {
    expect(() => choleskyDecompose(personaCorrelationMatrix())).not.toThrow();
  });

  it('reproduces the target correlations in the generated draws', () => {
    const chol = choleskyDecompose(personaCorrelationMatrix());
    const rand = mulberry32(hashSeed('latent-correlation-check'));
    const draws: number[][] = [];
    for (let i = 0; i < 4000; i++) {
      draws.push(correlatedNormals(chol, standardNormals(rand, PERSONA_TRAIT_KEYS.length)));
    }
    const column = (j: number) => draws.map((d) => d[j]!);
    const target = personaCorrelationMatrix();
    // fluid<->verbal (0.55) and workingMemory<->fluid (0.55) recovered to +/-0.05
    expect(pearson(column(0), column(1))).toBeCloseTo(target[0]![1]!, 1);
    expect(pearson(column(0), column(10))).toBeCloseTo(target[0]![10]!, 1);
    expect(Math.abs(pearson(column(0), column(1)) - target[0]![1]!)).toBeLessThan(0.05);
  });
});

describe('standardNormals', () => {
  it('is approximately standard normal', () => {
    const rand = mulberry32(hashSeed('normal-check'));
    const xs = standardNormals(rand, 20000);
    expect(mean(xs)).toBeCloseTo(0, 1);
    const variance = mean(xs.map((x) => x * x));
    expect(variance).toBeGreaterThan(0.95);
    expect(variance).toBeLessThan(1.05);
  });
});

describe('the 1-20 dial mapping', () => {
  it('places dial 15 at +1.5 SD per the design doc', () => {
    expect(dialToTheta(15)).toBeCloseTo(1.5, 12);
    expect(dialToTheta(10.5)).toBeCloseTo(0, 12);
  });

  it('round-trips', () => {
    expect(thetaToDial(dialToTheta(7))).toBeCloseTo(7, 12);
  });
});

describe('samplePersona', () => {
  it('is deterministic in (seed, index, archetype)', () => {
    const a = samplePersona({ seed: 'S', index: 3 });
    const b = samplePersona({ seed: 'S', index: 3 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('differs for a different seed and for a different index', () => {
    const a = samplePersona({ seed: 'S', index: 3 });
    expect(samplePersona({ seed: 'T', index: 3 }).thetaMean).not.toBe(a.thetaMean);
    expect(samplePersona({ seed: 'S', index: 4 }).thetaMean).not.toBe(a.thetaMean);
  });

  it('stamps the born-synthetic tags', () => {
    const persona = samplePersona({ seed: 'S', index: 0 });
    expect(persona.syntheticOnly).toBe(true);
    expect(persona.validated).toBe(false);
  });

  it('keeps bounded traits inside their ranges', () => {
    for (let i = 0; i < 300; i++) {
      const p = samplePersona({ seed: 'bounds', index: i });
      expect(p.engagement).toBeGreaterThan(0);
      expect(p.engagement).toBeLessThanOrEqual(1);
      expect(p.consistency).toBeGreaterThan(0);
      expect(p.consistency).toBeLessThan(1);
      expect(p.planfulness).toBeGreaterThan(0);
      expect(p.planfulness).toBeLessThan(1);
      expect(p.workingMemorySpan).toBeGreaterThanOrEqual(2);
      expect(p.workingMemorySpan).toBeLessThanOrEqual(10);
    }
  });
});

describe('archetype presets', () => {
  const cohort = samplePersonaCohort({ seed: 'quadrants', n: 1200 });
  const group = (archetype: string) => cohort.filter((p) => p.archetype === archetype);
  const populationLambda = mean(group('population').map((p) => p.learningRate));

  it('lands high-standing/low-learning-rate in its quadrant', () => {
    const g = group('high_standing_low_learning');
    expect(mean(g.map((p) => p.thetaMean))).toBeGreaterThan(0.8);
    expect(mean(g.map((p) => p.learningRate))).toBeLessThan(populationLambda);
  });

  it('lands moderate-standing/high-learning-rate in its quadrant', () => {
    const g = group('moderate_standing_high_learning');
    expect(mean(g.map((p) => p.thetaMean))).toBeGreaterThan(-0.5);
    expect(mean(g.map((p) => p.thetaMean))).toBeLessThan(0.8);
    expect(mean(g.map((p) => p.learningRate))).toBeGreaterThan(populationLambda);
  });

  it('lands high-ability/low-effort above the ability mean but below the engagement mean', () => {
    const g = group('high_ability_low_effort');
    expect(mean(g.map((p) => p.thetaMean))).toBeGreaterThan(0.8);
    expect(mean(g.map((p) => p.engagement))).toBeLessThan(
      mean(group('population').map((p) => p.engagement)) - 0.1,
    );
  });

  it('lands high-both and low-both in opposite quadrants', () => {
    const high = group('high_both');
    const low = group('low_both');
    expect(mean(high.map((p) => p.thetaMean))).toBeGreaterThan(0.8);
    expect(mean(high.map((p) => p.learningRate))).toBeGreaterThan(populationLambda);
    expect(mean(low.map((p) => p.thetaMean))).toBeLessThan(-0.5);
    expect(mean(low.map((p) => p.learningRate))).toBeLessThan(populationLambda);
  });

  it('leaves the unconstrained population draw near the standard normal', () => {
    const g = group('population');
    expect(Math.abs(mean(g.map((p) => p.theta.fluid_reasoning)))).toBeLessThan(0.15);
  });
});

describe('samplePersonaCohort', () => {
  it('produces exactly n personas with unique ids', () => {
    const cohort = samplePersonaCohort({ seed: 'cohort', n: 137 });
    expect(cohort.length).toBe(137);
    expect(new Set(cohort.map((p) => p.personaId)).size).toBe(137);
  });

  it('is deterministic for the same seed and differs for another', () => {
    const a = samplePersonaCohort({ seed: 'cohort', n: 40 });
    const b = samplePersonaCohort({ seed: 'cohort', n: 40 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify(samplePersonaCohort({ seed: 'other', n: 40 }))).not.toBe(
      JSON.stringify(a),
    );
  });

  it('honours a custom mix', () => {
    const cohort = samplePersonaCohort({ seed: 'mix', n: 50, mix: { population: 1 } });
    expect(cohort.every((p) => p.archetype === 'population')).toBe(true);
  });

  it('returns an empty cohort for n <= 0 and rejects an empty mix', () => {
    expect(samplePersonaCohort({ seed: 'x', n: 0 })).toEqual([]);
    expect(() => samplePersonaCohort({ seed: 'x', n: 5, mix: { population: 0 } })).toThrow(
      /positive weight/,
    );
  });
});
