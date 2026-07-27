import { describe, expect, it } from 'vitest';

import type { BankItem } from './item';
import { syntheticSampleBank } from './sample-items';
import { driveSession, type PlayerOutcome } from './session';
import { FixedSequencer, type Sequencer, type SequencerContext } from './sequencer';

const bank = syntheticSampleBank();

/** A "player + child" that always picks the keyed-correct option. */
function alwaysCorrect(_served: unknown, item: BankItem): PlayerOutcome {
  const selectedIndex = item.renderKind === 'single-select' ? item.answer.correctIndex! : 0;
  return { response: { selectedIndex }, telemetry: {}, responseTimeMs: 900, skipped: false };
}

describe('driveSession with FixedSequencer (end-to-end)', () => {
  it('runs the whole bank once, in the domain-balanced order, and summarizes', () => {
    const run = driveSession(bank, new FixedSequencer(), alwaysCorrect);

    // Presented every item exactly once.
    expect(run.results).toHaveLength(bank.length);
    expect(run.order).toHaveLength(bank.length);
    expect(new Set(run.order).size).toBe(bank.length);

    // All correct → overall + per-domain accuracy is 1.
    expect(run.summary.overallAccuracy).toBe(1);
    expect(run.summary.itemsAnswered).toBe(bank.length);
    expect(run.summary.itemsSkipped).toBe(0);
    for (const domain of Object.keys(run.summary.perDomainAccuracy)) {
      expect(run.summary.perDomainAccuracy[domain]).toBe(1);
    }

    // Per-item response + response time were captured.
    for (const result of run.results) {
      expect(result.responseTimeMs).toBe(900);
      expect(result.response).toMatchObject({ selectedIndex: expect.any(Number) });
      expect(result.metrics['M-RT']).toBe('900 ms');
    }
  });

  it('scores mixed correct/incorrect and honors skips', () => {
    const run = driveSession(bank, new FixedSequencer(), (_served, item) => {
      if (item.itemId === 'SYN-VER-CLOZE-01') {
        return { response: null, telemetry: {}, responseTimeMs: null, skipped: true };
      }
      const correct = item.renderKind === 'single-select' ? item.answer.correctIndex! : 0;
      // Deliberately wrong on the two fluid items.
      const pick = item.domain === 'fluid_reasoning' ? (correct + 1) % 4 : correct;
      return { response: { selectedIndex: pick }, telemetry: {}, responseTimeMs: 700, skipped: false };
    });

    expect(run.summary.itemsSkipped).toBe(1);
    expect(run.summary.itemsAnswered).toBe(bank.length - 1);
    // Two fluid items answered wrong → fluid accuracy 0.
    expect(run.summary.perDomainAccuracy.fluid_reasoning).toBe(0);
    // Quant + spatial answered right → 1.
    expect(run.summary.perDomainAccuracy.quantitative).toBe(1);
    expect(run.summary.perDomainAccuracy.spatial).toBe(1);
  });
});

describe('sequencer is swappable behind the interface', () => {
  // A DIFFERENT strategy: raw bank order, capped at N. This is the "one-line swap"
  // — the shell (driveSession) is unchanged; only the Sequencer instance differs.
  class TakeFirstNSequencer implements Sequencer {
    readonly id = 'take-first-n';
    readonly label = 'First N (raw order)';
    constructor(private readonly n: number) {}
    next(ctx: SequencerContext): BankItem | null {
      if (ctx.presentedItemIds.length >= this.n) return null;
      const presented = new Set(ctx.presentedItemIds);
      return ctx.bank.find((item) => !presented.has(item.itemId)) ?? null;
    }
  }

  it('drives the same shell with an alternate strategy and stop rule', () => {
    const run = driveSession(bank, new TakeFirstNSequencer(3), alwaysCorrect);
    expect(run.results).toHaveLength(3);
    expect(run.order).toEqual(bank.slice(0, 3).map((i) => i.itemId));
  });
});
