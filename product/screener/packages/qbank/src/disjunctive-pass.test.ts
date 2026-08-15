/**
 * A domain spike can pass on its own.
 *
 * One posterior over everything averages a spike away: a child at +2.5 spatial and -1.0 elsewhere lands
 * mid-scale, and a composite threshold cannot express "exceptional in one thing". Simulated at Careful
 * precision the composite route recommends 0% of such candidates — they are rejected `confident-below`
 * while a real spike sits in the transcript.
 *
 * The rule is deliberately generous, because the errors are not symmetric. A false negative is a capable
 * child the programme never learns about; a false positive is a review and an afternoon. The engine
 * already encodes that asymmetry twice (`confidenceAbove` 0.75 against `confidenceBelow` 0.97, and every
 * surface setting `recommendProbability` below a half), so this extends a posture rather than inventing
 * one.
 *
 * What it is not is evidence of a domain strength. The band that lets a child through is four items wide.
 */

import { describe, expect, it } from 'vitest';

import { Posterior, paramsFor, pCorrect } from '@gt/engine';

import { loadBanks, optionCountOf, toLogits, type BankRecord } from './bank';
import {
  DEFAULT_DOMAIN_BAR,
  DEFAULT_DOMAIN_RECOMMEND_PROBABILITY,
  precisionAt,
  QbankSession,
  type Domain,
  type QbankSessionConfig,
  type QbankState,
} from './session';

const banks = loadBanks();
const byId = new Map<string, BankRecord>();
for (const bank of banks.values()) for (const r of bank.scorable) byId.set(r.itemId, r);

const BASE: QbankSessionConfig = {
  abilityThreshold: 1.0,
  precision: precisionAt(3), // Careful: enough items that a domain sees four.
  perDomainMinimum: 4,
  recommendProbability: 0.35,
};

/** Deterministic, so a threshold that sits near a candidate's probability cannot flap between runs. */
function lcg(seed: number): () => number {
  let s = (seed * 2654435761) >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}

/** Play a whole session against a candidate with a true ability per domain. */
function simulate(thetas: Partial<Record<Domain, number>>, seed: number, overrides: Partial<QbankSessionConfig> = {}): QbankState {
  const rnd = lcg(seed);
  const session = new QbankSession({ ...BASE, ...overrides }, banks, seed);
  for (let i = 0; i < 60; i += 1) {
    const serve = session.nextItem();
    if (!serve) break;
    const record = byId.get(serve.served.itemId)!;
    const params = paramsFor(toLogits(record.difficulty), optionCountOf(record) ?? 0, 1.5);
    const correct = rnd() < pCorrect(thetas[serve.domain] ?? 0, params);
    const key = record.answer.correctKey;
    const right = typeof key === 'number' ? { selectedIndex: key } : { key };
    const wrong = typeof key === 'number' ? { selectedIndex: (key as number) + 1 } : { key: key === 'A' ? 'B' : 'A' };
    session.submit(correct ? right : wrong, 5000);
  }
  return session.state();
}

const SPIKY = { spatial: 2.5, verbal: -1.0, quantitative: -1.0, fluid: -1.0 } as const;
const FLAT_LOW = { spatial: -0.5, verbal: -0.5, quantitative: -0.5, fluid: -0.5 } as const;
const FLAT_HIGH = { spatial: 1.8, verbal: 1.8, quantitative: 1.8, fluid: 1.8 } as const;

describe('a spike passes on its own', () => {
  it('recommends a spiky candidate the composite rejects, and says the domain route did it', () => {
    // bar 1.0 / p 0.6 rather than the shipped default, so the assertion sits well clear of the boundary
    // and tests the mechanism instead of the exact number.
    const state = simulate(SPIKY, 11, { domainBar: 1.0, domainRecommendProbability: 0.6 });

    // The premise: the composite genuinely does not clear its own threshold.
    expect(state.pAbove).toBeLessThan(BASE.recommendProbability);
    expect(state.decision).toBe('recommend');
    expect(state.passRoute?.via).toBe('domain');
    expect(state.passRoute?.via === 'domain' && state.passRoute.domains).toContain('spatial');
  });

  it('does not recommend a uniformly weak candidate by either route', () => {
    const state = simulate(FLAT_LOW, 11, { domainBar: 1.0, domainRecommendProbability: 0.6 });
    expect(state.decision).toBe('no-recommendation');
    expect(state.passRoute).toBeNull();
  });

  it('credits the composite when the composite clears, even if a domain also would', () => {
    // The composite is the primary route and must be named as the reason whenever it succeeds, or the
    // result will suggest a domain carried a child the whole battery already passed.
    const state = simulate(FLAT_HIGH, 11);
    expect(state.decision).toBe('recommend');
    expect(state.passRoute?.via).toBe('composite');
  });

  it('reports no route while the session is still running', () => {
    const session = new QbankSession(BASE, banks, 11);
    session.nextItem();
    const state = session.state();
    expect(state.stopped).toBe(false);
    expect(state.decision).toBeNull();
    expect(state.passRoute).toBeNull();
  });

  it('stops firing when the probability is set out of reach', () => {
    // Guards the direction of the comparison: a p nobody can meet must never pass anyone.
    const state = simulate(SPIKY, 11, { domainBar: 1.0, domainRecommendProbability: 0.999 });
    expect(state.decision).toBe('no-recommendation');
    expect(state.passRoute).toBeNull();
  });

  it('names every domain that cleared, in a fixed order, not a winner among them', () => {
    /**
     * Reporting one "strongest" domain would be a ranking, and a ranking off four-item posteriors is a
     * measurement claim the data does not support. So every domain that cleared is listed, in DOMAINS
     * order rather than by probability.
     *
     * The bar here is deliberately artificial. A genuine two-domain spike cannot reach this code path: two
     * domains at +2.0 lift the composite to pAbove 0.86, so the composite route claims it first. Dropping
     * the bar to 0 on an average candidate is the only way to observe the multi-domain shape at all —
     * which is itself worth knowing, since it means the domain route is in practice a single-domain rule.
     */
    const state = simulate({ spatial: 0, fluid: 0, verbal: 0, quantitative: 0 }, 11, {
      domainBar: 0,
      domainRecommendProbability: 0.4,
    });
    expect(state.pAbove).toBeLessThan(BASE.recommendProbability);
    expect(state.passRoute?.via).toBe('domain');

    const cleared = state.passRoute?.via === 'domain' ? state.passRoute.domains : [];
    expect(cleared.length).toBeGreaterThan(1);

    // Fixed order, so it cannot be read as a ranking: the list must be a subsequence of DOMAINS.
    const ORDER: Domain[] = ['quantitative', 'verbal', 'spatial', 'fluid'];
    const positions = cleared.map((d) => ORDER.indexOf(d));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('never passes on a domain that scored nothing, however low the probability', () => {
    /**
     * An untouched domain still holds its prior, and a prior has real mass above any modest bar. With no
     * per-domain floor a session leaves two or three domains untouched, so a low `p` would recommend a
     * child on the strength of a domain nobody asked them about — a false positive manufactured out of the
     * prior. Every domain named as a route must therefore have a band.
     */
    const state = simulate(FLAT_LOW, 11, {
      perDomainMinimum: 0,
      domainBar: 1.5,
      domainRecommendProbability: 0.02,
    });

    const untouched = (['quantitative', 'verbal', 'spatial', 'fluid'] as Domain[]).filter(
      (d) => state.domains[d] === undefined,
    );
    expect(untouched.length, 'expected this session to leave a domain untouched').toBeGreaterThan(0);

    const cleared = state.passRoute?.via === 'domain' ? state.passRoute.domains : [];
    for (const d of cleared) {
      expect(state.domains[d], `${d} was named as the pass route but has no band`).toBeDefined();
    }
    for (const d of untouched) {
      expect(cleared, `${d} scored nothing and must not carry a pass`).not.toContain(d);
    }
  });

  it('ships the thresholds that were actually measured', () => {
    // Chosen against simulated cohorts, not picked for roundness: at bar 1.5 / p 0.45 the domain route
    // recommends 78% of true +2.5 spikes and 1% of uniformly average candidates. Both are unvalidated
    // against real children, which is what the comments in session.ts say.
    expect(DEFAULT_DOMAIN_BAR).toBe(1.5);
    expect(DEFAULT_DOMAIN_RECOMMEND_PROBABILITY).toBe(0.45);
    // Deliberately below a half, for the same asymmetric-loss reason recommendProbability is.
    expect(DEFAULT_DOMAIN_RECOMMEND_PROBABILITY).toBeLessThan(0.5);
    // And the domain bar has to be a higher bar than the composite's, or it is not a spike rule.
    expect(DEFAULT_DOMAIN_BAR).toBeGreaterThan(BASE.abilityThreshold);
  });
});

describe('the composite is untouched by the second route', () => {
  it('still reports the composite posterior as the estimate', () => {
    const session = new QbankSession(BASE, banks, 11);
    const rnd = lcg(11);
    for (let i = 0; i < 20; i += 1) {
      const serve = session.nextItem();
      if (!serve) break;
      const record = byId.get(serve.served.itemId)!;
      const params = paramsFor(toLogits(record.difficulty), optionCountOf(record) ?? 0, 1.5);
      const correct = rnd() < pCorrect(SPIKY[serve.domain as keyof typeof SPIKY] ?? 0, params);
      const key = record.answer.correctKey;
      session.submit(
        correct
          ? typeof key === 'number'
            ? { selectedIndex: key }
            : { key }
          : typeof key === 'number'
            ? { selectedIndex: (key as number) + 1 }
            : { key: key === 'A' ? 'B' : 'A' },
        5000,
      );
    }

    const composite = new Posterior();
    for (const a of session.getAttempts()) {
      if (a.correct === null) continue;
      const record = byId.get(a.itemId)!;
      composite.update(paramsFor(toLogits(record.difficulty), optionCountOf(record) ?? 0, 1.5), a.correct);
    }
    expect(session.state().estimate).toBeCloseTo(composite.mean(), 10);
    expect(session.state().pAbove).toBeCloseTo(composite.probabilityAbove(1.0), 10);
  });
});
