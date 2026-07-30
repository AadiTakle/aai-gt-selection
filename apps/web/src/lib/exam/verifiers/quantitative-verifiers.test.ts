import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { RawBankItem } from '../bank-loader';
import { childLexicon, quantitativeVerifiers } from './quantitative';
import { resolveVerifier } from './index';

/**
 * Round-trip tests for the six types owned by `quantitative.ts`.
 *
 * Every type gets BOTH directions against a REAL bank item: the response a
 * child who solved it would emit (for the search types, the bank's own stored
 * optimal solution, replayed) must verify correct, and a plausible near-miss
 * must verify incorrect. A verifier that always returns the same verdict would
 * pass a one-sided test while scoring every child 0 (or 1) in production, so
 * neither direction is optional.
 */

const BANKS = join(process.cwd(), '..', '..', 'research', 'exam-question-types', 'banks');

type BankItem = RawBankItem & { answer: Record<string, unknown> };

const bankCache = new Map<string, BankItem[]>();

function bank(typeCode: string): BankItem[] {
  const cached = bankCache.get(typeCode);
  if (cached) return cached;
  const items = readFileSync(join(BANKS, `${typeCode}.jsonl`), 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as BankItem);
  bankCache.set(typeCode, items);
  return items;
}

/** The first bank item this test can build a definitive pair of responses for. */
function pick(typeCode: string, usable: (item: BankItem) => boolean): BankItem {
  const found = bank(typeCode).find(usable);
  expect(found, `${typeCode}: no usable bank item`).toBeDefined();
  return found as BankItem;
}

function grade(item: BankItem, response: Record<string, unknown>) {
  return quantitativeVerifiers[item.typeCode]!(item, response);
}

const OWNED = [
  'GB-EXPLORE-01',
  'GB-ROBOPATH-01',
  'GB-TRACK-01',
  'GB-WORDFORGE-01',
  'GB-WORDLADDER-01',
  'QUANT-MIX-01',
] as const;

describe('registry wiring', () => {
  it('registers exactly the six owned type codes', () => {
    expect(Object.keys(quantitativeVerifiers).sort()).toEqual([...OWNED].sort());
  });

  it('resolves each owned type to its per-type verifier, not a generic one', () => {
    for (const typeCode of OWNED) {
      const item = bank(typeCode)[0]!;
      expect(resolveVerifier(item), typeCode).toBe(quantitativeVerifiers[typeCode]);
    }
  });

  it('never throws on a malformed response', () => {
    for (const typeCode of OWNED) {
      const item = bank(typeCode)[0]!;
      for (const response of [{}, { path: 7, counts: 'no', assembly: null }]) {
        expect(() => grade(item, response as Record<string, unknown>), typeCode).not.toThrow();
        expect(grade(item, response as Record<string, unknown>).correct, typeCode).toBe(false);
      }
    }
  });
});

/**
 * The strongest single check available: every bank ships a reference solution
 * that its own generator's checker proved legal, so the verifier must accept it
 * on EVERY item, not just the one each suite below samples.
 */
describe('whole-bank replay of every stored reference solution', () => {
  const referenceResponse: Record<string, (item: BankItem) => Record<string, unknown>> = {
    'GB-EXPLORE-01': (i) => ({
      actions: (i.answer.optimalPath as [number, number][])
        .slice(1)
        .map((to) => ({ kind: 'move', to })),
    }),
    'GB-ROBOPATH-01': (i) => ({
      program: (i.answer.canonicalSolution as { program: unknown[] }).program,
    }),
    'GB-TRACK-01': (i) => ({
      selectedSlots: (i.answer.canonicalSolution as { targetSlots: number[] }).targetSlots,
    }),
    'GB-WORDFORGE-01': (i) => ({
      submissions: (i.answer.validWords as { word: string }[]).slice(
        0,
        i.answer.referenceTarget as number,
      ),
    }),
    'GB-WORDLADDER-01': (i) => ({ path: i.answer.optimalPath }),
    'QUANT-MIX-01': (i) => ({ counts: i.answer.correctCounts }),
  };

  for (const typeCode of OWNED) {
    it(`${typeCode}: accepts the reference solution on all ${bank(typeCode).length} items`, () => {
      const build = referenceResponse[typeCode]!;
      const rejected = bank(typeCode).filter((item) => !grade(item, build(item)).correct);
      expect(rejected.map((i) => i.itemId)).toEqual([]);
    });
  }
});

describe('GB-ROBOPATH-01', () => {
  const item = pick('GB-ROBOPATH-01', (i) => {
    const solution = i.answer.canonicalSolution as { program?: unknown[] } | undefined;
    const start = i.content.start as { r: number; c: number };
    const door = i.content.door as [number, number];
    return (
      Array.isArray(solution?.program) &&
      solution.program.length > 0 &&
      !(start.r === door[0] && start.c === door[1])
    );
  });
  const canonical = item.answer.canonicalSolution as {
    program: { cmd: string; reps: number }[];
  };
  const cost = item.answer.cost as { actions: number };

  it('runs the stored optimal program and reaches the door', () => {
    const verdict = grade(item, { program: canonical.program });
    expect(verdict.correct).toBe(true);
    expect(verdict.metrics?.['M-EFF']).toBe(1);
  });

  it('credits a legal but wasteful program, and reports the waste as M-EFF', () => {
    // A trailing turn changes nothing about where the robot ends up, so the
    // program still solves the level — it is just one action longer.
    const verdict = grade(item, { program: [...canonical.program, { cmd: 'L', reps: 1 }] });
    expect(verdict.correct).toBe(true);
    expect(verdict.metrics?.['M-EFF']).toBeCloseTo(cost.actions / (cost.actions + 1), 10);
  });

  it('rejects an empty program that never leaves the start square', () => {
    expect(grade(item, { program: [] }).correct).toBe(false);
  });

  it('rejects a program that drives off the board', () => {
    // No bank grid is 40 wide, so 40 straight forward steps must bump.
    expect(grade(item, { actionSeq: Array<string>(40).fill('F') }).correct).toBe(false);
  });

  it('rejects a program token whose repeat count the instruction set forbids', () => {
    const repeat = (item.content.instructionSet as { repeat?: { maxReps?: number } }).repeat;
    const maxReps = repeat?.maxReps ?? 1;
    const overlong = canonical.program.map((token) => ({ ...token, reps: maxReps + 1 }));
    expect(grade(item, { program: overlong }).correct).toBe(false);
  });
});

describe('GB-EXPLORE-01', () => {
  const item = pick('GB-EXPLORE-01', (i) => (i.answer.optimalTotalMoves as number) >= 2);
  const optimalPath = item.answer.optimalPath as [number, number][];
  const walk = (path: [number, number][]) => path.slice(1).map((to) => ({ kind: 'move', to }));

  it('accepts the stored optimal tour and scores it fully efficient', () => {
    const verdict = grade(item, { actions: walk(optimalPath) });
    expect(verdict.correct).toBe(true);
    expect(verdict.metrics?.['M-EFF']).toBe(1);
  });

  it('rejects a tour that stops one step short of home', () => {
    expect(grade(item, { actions: walk(optimalPath.slice(0, -1)) }).correct).toBe(false);
  });

  it('rejects a walk that teleports instead of stepping', () => {
    const home = item.content.home as [number, number];
    const jump: [number, number] = [home[0], home[1]];
    expect(grade(item, { actions: [{ kind: 'move', to: jump }] }).correct).toBe(false);
  });

  it('does not use content.moveBudget as a correctness bound', () => {
    // moveBudget bounds the outbound leg only (true on 120/120 bank items), so
    // a closed tour longer than it must still be correct — just less efficient.
    const budget = item.content.moveBudget as number;
    const home = item.content.home as [number, number];
    const neighbour = optimalPath[1]!; // the first step of the tour, so adjacent to home
    const shuttle: { kind: string; to: [number, number] }[] = [];
    for (let i = 0; i <= budget; i++) {
      shuttle.push({ kind: 'move', to: neighbour }, { kind: 'move', to: [home[0], home[1]] });
    }
    const verdict = grade(item, { actions: [...walk(optimalPath), ...shuttle] });
    expect(shuttle.length).toBeGreaterThan(budget);
    expect(verdict.correct).toBe(true);
    expect(verdict.metrics?.['M-EFF']).toBeLessThan(1);
  });

  it('scores the compass angles server-side (M-VIEWANG)', () => {
    const landmarks = item.content.landmarks as { id: string; r: number; c: number }[];
    const prompts = item.content.pointing as string[];
    const home = item.content.home as [number, number];
    const target = landmarks.find((l) => l.id === prompts[0])!;
    // answer.bearingRule: degrees clockwise from north of (landmark - standCell).
    const bearing =
      ((((Math.atan2(target.c - home[1], -(target.r - home[0])) * 180) / Math.PI) % 360) + 360) %
      360;

    const aimed = grade(item, {
      actions: walk(optimalPath),
      pointings: [{ landmarkId: target.id, standCell: home, angleDeg: bearing }],
    });
    expect(aimed.metrics?.['M-VIEWANG']).toBeCloseTo(0, 6);

    const off = grade(item, {
      actions: walk(optimalPath),
      pointings: [{ landmarkId: target.id, standCell: home, angleDeg: bearing + 90 }],
    });
    expect(off.metrics?.['M-VIEWANG']).toBeCloseTo(90, 6);
    // A bad bearing is a metric, not a wrong answer: the tour still solved it.
    expect(off.correct).toBe(true);
  });

  it('falls back to the reported trail when the action log is absent', () => {
    const trail = optimalPath.map(([r, c]) => `${r},${c}`);
    const home = item.content.home as [number, number];
    const cost = { actual: item.answer.optimalTotalMoves as number };
    expect(grade(item, { cellsVisited: trail, endCell: home, cost }).correct).toBe(true);
    expect(grade(item, { cellsVisited: trail.slice(0, 1), endCell: home, cost }).correct).toBe(
      false,
    );
  });
});

describe('GB-TRACK-01', () => {
  const item = pick('GB-TRACK-01', () => true);
  const targetSlots = (item.answer.canonicalSolution as { targetSlots: number[] }).targetSlots;
  const taps = (item.answer.cost as { taps: number }).taps;

  it('re-derives the final jar set from the motion script', () => {
    const verdict = grade(item, { selectedSlots: [...targetSlots].reverse(), taps });
    expect(verdict.correct).toBe(true);
    expect(verdict.metrics?.['M-PROG']).toBe(1);
    expect(verdict.metrics?.['M-EFF']).toBe(1);
  });

  it('rejects the slots the fireflies started in', () => {
    const verdict = grade(item, { selectedSlots: item.content.initialTargets, taps });
    expect(verdict.correct).toBe(false);
  });

  it('agrees with the stored key across the whole bank', () => {
    for (const other of bank('GB-TRACK-01')) {
      const key = (other.answer.canonicalSolution as { targetSlots: number[] }).targetSlots;
      expect(grade(other, { selectedSlots: key }).correct, other.itemId).toBe(true);
    }
  });
});

describe('GB-WORDLADDER-01', () => {
  const item = pick('GB-WORDLADDER-01', (i) => (i.answer.optimalRungs as number) >= 2);
  const optimalPath = item.answer.optimalPath as string[];

  it('loads the child lexicon server-side', () => {
    expect(childLexicon()?.size ?? 0).toBeGreaterThan(4000);
  });

  it('accepts the stored shortest ladder', () => {
    const verdict = grade(item, { path: optimalPath });
    expect(verdict.correct).toBe(true);
    expect(verdict.metrics?.['M-EFF']).toBe(1);
  });

  it('rejects a jump that changes more than one letter', () => {
    expect(
      grade(item, { path: [optimalPath[0], optimalPath[optimalPath.length - 1]] }).correct,
    ).toBe(false);
  });

  it('rejects a ladder containing a non-word rung', () => {
    const broken = [...optimalPath];
    const rung = broken[1]!;
    broken[1] = `Z${rung.slice(1)}`;
    expect(grade(item, { path: broken }).correct).toBe(false);
  });

  it('credits a longer legal ladder as correct but less efficient', () => {
    const detour = pick('GB-WORDLADDER-01', (i) => {
      const alts = i.answer.altOptimalSamples as string[][] | undefined;
      return Array.isArray(alts) && alts.length > 0;
    });
    const path = detour.answer.optimalPath as string[];
    // Step off the goal and back on: two extra rungs, still every step legal.
    const wobble = [...path, path[path.length - 2]!, path[path.length - 1]!];
    const verdict = grade(detour, { path: wobble });
    expect(verdict.correct).toBe(true);
    expect(verdict.metrics?.['M-EFF']).toBeLessThan(1);
  });
});

describe('GB-WORDFORGE-01', () => {
  const item = pick('GB-WORDFORGE-01', (i) => (i.answer.referenceTarget as number) >= 2);
  const validWords = item.answer.validWords as { word: string; band: number }[];
  const target = item.answer.referenceTarget as number;

  it('credits every forgeable word and reaches full credit at the reference target', () => {
    const submissions = validWords.slice(0, target).map((v) => ({ word: v.word.toLowerCase() }));
    const verdict = grade(item, { submissions });
    expect(verdict.correct).toBe(true);
    expect(verdict.metrics?.['M-IDEAFLU']).toBe(target);
    expect(verdict.metrics?.['M-EFF']).toBe(1);
  });

  it('scores a short-of-target run as partial, not full', () => {
    const submissions = validWords.slice(0, target - 1).map((v) => ({ word: v.word }));
    const verdict = grade(item, { submissions });
    expect(verdict.correct).toBe(false);
    expect(verdict.metrics?.['M-EFF']).toBeLessThan(1);
  });

  it('credits nothing for strings the rack cannot forge', () => {
    const verdict = grade(item, { submissions: [{ word: 'ZZZZZ' }, { word: 'QQQ' }] });
    expect(verdict.correct).toBe(false);
    expect(verdict.metrics?.['M-IDEAFLU']).toBe(0);
  });

  it('counts a repeated word once', () => {
    const first = validWords[0]!.word;
    const verdict = grade(item, {
      submissions: [{ word: first }, { word: first }, { word: first }],
    });
    expect(verdict.metrics?.['M-IDEAFLU']).toBe(1);
  });
});

describe('QUANT-MIX-01', () => {
  const givenRow = pick(
    'QUANT-MIX-01',
    (i) => (i.content.constraint as { kind: string }).kind === 'given_row',
  );
  const fixedTotal = pick(
    'QUANT-MIX-01',
    (i) => (i.content.constraint as { kind: string }).kind === 'fixed_total',
  );

  for (const item of [givenRow, fixedTotal]) {
    const kind = (item.content.constraint as { kind: string }).kind;
    const counts = item.answer.correctCounts as { A: number; B: number };

    it(`accepts the equivalent mixture (${kind}) with zero placement error`, () => {
      const verdict = grade(item, { counts, total: counts.A + counts.B });
      expect(verdict.correct).toBe(true);
      expect(verdict.metrics?.['M-PAE']).toBeCloseTo(0, 12);
    });

    it(`rejects an off-ratio mixture (${kind})`, () => {
      const verdict = grade(item, { counts: { A: counts.A + 1, B: counts.B } });
      expect(verdict.correct).toBe(false);
      expect(verdict.metrics?.['M-PAE']).toBeGreaterThan(0);
    });

    it(`rejects an empty bowl (${kind})`, () => {
      const verdict = grade(item, { counts: { A: 0, B: 0 } });
      expect(verdict.correct).toBe(false);
      expect(verdict.metrics?.['M-PAE']).toBe(1);
    });
  }

  it('rejects a same-tasting mixture that breaks the served constraint', () => {
    const counts = fixedTotal.answer.correctCounts as { A: number; B: number };
    const verdict = grade(fixedTotal, { counts: { A: counts.A * 2, B: counts.B * 2 } });
    expect(verdict.metrics?.['M-PAE']).toBeCloseTo(0, 12);
    expect(verdict.correct).toBe(false);
  });
});
