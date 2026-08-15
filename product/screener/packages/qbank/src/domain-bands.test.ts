/**
 * A confidence interval per domain, over the same evidence as the composite.
 *
 * The product is the binary pass/fail and the composite posterior is the primary route to it. These four
 * are a second readout over the same responses, not a competing use of them: no item is spent on a domain
 * estimate at the composite's expense, and neither selection nor the stop rule reads them.
 *
 * A session runs 8-16 items, so a domain sees very few and its interval will often be 2-3 logits — close
 * to the prior it started from. That is the point of reporting the interval rather than the mean: a bare
 * number off two items reads as a finding, and these are not findings.
 */

import { describe, expect, it } from 'vitest';

import { Posterior, paramsFor } from '@gt/engine';

import { loadBanks, optionCountOf, toLogits, type BankRecord, type LoadedBank } from './bank';
import { precisionAt, QbankSession, type Domain, type QbankSessionConfig } from './session';

const CONFIG: QbankSessionConfig = {
  abilityThreshold: 1.0,
  precision: precisionAt(4),
  perDomainMinimum: 1,
  recommendProbability: 0.35,
};

const banks = loadBanks();

/** Every servable record by id, so a test can recover the item a session served. */
const byId = new Map<string, BankRecord>();
for (const bank of banks.values()) for (const r of bank.scorable) byId.set(r.itemId, r);

function sessionOver(types: string[] | null, overrides: Partial<QbankSessionConfig> = {}): QbankSession {
  const pool: ReadonlyMap<string, LoadedBank> = types
    ? new Map([...banks].filter(([t]) => types.includes(t)))
    : banks;
  return new QbankSession({ ...CONFIG, ...overrides }, pool, 3);
}

/** Answer every item correctly, so each domain posterior actually moves off the prior. */
function playCorrectly(session: QbankSession, maxItems = 16): void {
  for (let i = 0; i < maxItems; i += 1) {
    const serve = session.nextItem();
    if (!serve) return;
    const record = byId.get(serve.served.itemId)!;
    const key = record.answer.correctKey;
    session.submit(typeof key === 'number' ? { selectedIndex: key } : { key }, 5000);
  }
}

describe('a band per domain', () => {
  it('reports mean, interval and counts for every domain that was served', () => {
    const session = sessionOver(null);
    playCorrectly(session);
    const { domains, perDomain } = session.state();

    const served = (Object.keys(perDomain) as Domain[]).filter((d) => (perDomain[d] ?? 0) > 0);
    expect(served.length, 'expected a multi-domain session').toBeGreaterThan(1);

    for (const d of served) {
      const band = domains[d];
      expect(band, `${d} was served but has no band`).toBeDefined();
      expect(band!.itemsServed).toBe(perDomain[d]);
      expect(Number.isFinite(band!.mean)).toBe(true);
      // Never a mean without its interval. The type makes this unrepresentable; this is the runtime echo.
      expect(band!.interval).toHaveLength(2);
      expect(band!.interval[0]).toBeLessThan(band!.interval[1]);
      expect(band!.mean).toBeGreaterThanOrEqual(band!.interval[0]);
      expect(band!.mean).toBeLessThanOrEqual(band!.interval[1]);
    }
  });

  it('omits a domain that was never served rather than reporting its prior', () => {
    /**
     * With no per-domain floor, greedy selection puts a whole session into one or two domains. The
     * untouched domains still hold a pristine prior, and printing that with a label on it would be a
     * measurement claim about a domain the child was never asked about.
     */
    const session = sessionOver(null, { perDomainMinimum: 0 });
    playCorrectly(session);
    const { domains, perDomain } = session.state();

    const untouched = (['quantitative', 'verbal', 'spatial', 'fluid'] as Domain[]).filter(
      (d) => (perDomain[d] ?? 0) === 0,
    );
    expect(untouched.length, 'expected this session to miss at least one domain').toBeGreaterThan(0);
    for (const d of untouched) expect(domains[d], `${d} got no items and must be suppressed`).toBeUndefined();
  });

  it('omits a domain whose every response was unscorable', () => {
    // Served but never scored leaves the posterior at the prior just as surely as never served, so the
    // suppression rule keys off what was scored, not off what was shown.
    const session = sessionOver(null);
    for (let i = 0; i < 8; i += 1) {
      if (!session.nextItem()) break;
      session.submit({ nothing: 'unmarkable' }, 5000);
    }
    const { domains, perDomain, unscorable } = session.state();
    expect(unscorable).toBeGreaterThan(0);
    for (const d of Object.keys(perDomain) as Domain[]) {
      expect(domains[d], `${d} scored nothing and must be suppressed`).toBeUndefined();
    }
  });

  it('updates each domain only from its own items', () => {
    /**
     * The check that matters. Rebuild each domain's posterior from that domain's attempts alone and it
     * must land exactly where the session says. If a domain were fed another domain's evidence, or fed
     * the composite's, this is where it shows.
     */
    const session = sessionOver(null);
    playCorrectly(session);
    const state = session.state();

    const rebuilt = new Map<Domain, Posterior>();
    for (const a of session.getAttempts()) {
      if (a.correct === null) continue;
      const record = byId.get(a.itemId)!;
      const p = rebuilt.get(a.domain) ?? new Posterior();
      p.update(paramsFor(toLogits(record.difficulty), optionCountOf(record) ?? 0, 1.5), a.correct);
      rebuilt.set(a.domain, p);
    }

    expect(rebuilt.size).toBeGreaterThan(1);
    for (const [d, p] of rebuilt) {
      expect(state.domains[d], `${d} scored items but has no band`).toBeDefined();
      expect(state.domains[d]!.mean, `${d} mean`).toBeCloseTo(p.mean(), 10);
      expect(state.domains[d]!.interval[0], `${d} lower`).toBeCloseTo(p.interval(0.9)[0], 10);
      expect(state.domains[d]!.interval[1], `${d} upper`).toBeCloseTo(p.interval(0.9)[1], 10);
    }
  });

  it('leaves the composite exactly as it was', () => {
    /**
     * The composite is the pass route and must be untouched by any of this. It is still updated by every
     * scored item regardless of domain, so rebuilding it from all attempts in order has to reproduce it.
     */
    const session = sessionOver(null);
    playCorrectly(session);
    const state = session.state();

    const composite = new Posterior();
    let scored = 0;
    for (const a of session.getAttempts()) {
      if (a.correct === null) continue;
      const record = byId.get(a.itemId)!;
      composite.update(paramsFor(toLogits(record.difficulty), optionCountOf(record) ?? 0, 1.5), a.correct);
      scored += 1;
    }

    expect(scored).toBeGreaterThan(1);
    expect(state.estimate).toBeCloseTo(composite.mean(), 10);
    expect(state.interval[0]).toBeCloseTo(composite.interval(0.9)[0], 10);
    expect(state.interval[1]).toBeCloseTo(composite.interval(0.9)[1], 10);
  });

  it('reports a band off a single item, wide rather than absent', () => {
    /**
     * The doc's own instruction: report the bands even when they are very wide, which they usually will
     * be. A domain that got one item is honest evidence of what was covered, so it is reported with an
     * interval near the prior's width rather than hidden for being imprecise.
     */
    const session = sessionOver(null, { perDomainMinimum: 1 });
    playCorrectly(session);
    const { domains, perDomain } = session.state();

    const singles = (Object.keys(perDomain) as Domain[]).filter((d) => perDomain[d] === 1);
    expect(singles.length, 'expected at least one domain served exactly once').toBeGreaterThan(0);
    for (const d of singles) {
      const band = domains[d]!;
      expect(band).toBeDefined();
      expect(band.itemsScored).toBe(1);
      // One item barely narrows a 90% interval off this grid; assert it stays wide rather than pretending.
      expect(band.interval[1] - band.interval[0]).toBeGreaterThan(1.5);
    }
  });
});
