import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { beforeEach, describe, expect, it } from 'vitest';

import {
  openReviewGate,
  recordReviewDwell,
  resetReviewDwell,
  reviewDwellLedger,
  reviewDwellTotalMs,
} from './review-dwell';

/**
 * THE SELF-PACED ADVANCE, AND THE ONE THING TIME-TO-NEXT IS NOT ALLOWED TO TOUCH.
 *
 * STAGE2_REDESIGN_SPEC §4.2 asks for two things that pull in opposite directions. The child must be
 * able to sit with a revealed trial for as long as they like, which means the runner has to wait for
 * an action rather than a clock; and the resulting gap has to be measured, because a 120-trial
 * session made of unbounded gaps has no knowable budget. Measuring it then creates the risk the spec
 * names in the same breath: a per-child timing figure sitting one function call away from an
 * estimator.
 *
 * So this file checks the two halves separately.
 *
 *  1. THE GATE. A trial that is never released never advances — asserted by racing the gate's promise
 *     against a timer and showing the timer wins, which is the only way to demonstrate the absence of
 *     an auto-advance rather than assert it in a comment.
 *  2. THE BOUNDARY. Nothing that estimates, fits, targets or reports imports this module or mentions
 *     `msToNext`. SPOV 3 of the test-structure BrainLift is the constraint: effort telemetry
 *     validates and filters, it never gates. A structural check is used rather than a behavioural one
 *     because the failure mode is a future edit, not a current bug — the estimators cannot read the
 *     figure today, and this is what fails the build on the day one starts to.
 */

const WEB_SRC = join(process.cwd(), 'src');
const REPO_ROOT = join(process.cwd(), '..', '..');

describe('the review gate', () => {
  beforeEach(() => {
    resetReviewDwell();
  });

  it('does not advance until it is released', async () => {
    const gate = openReviewGate(
      { itemId: 'IT-1', typeCode: 'FLU-OPCHAIN-01' },
      { emulated: false },
    );

    // The gate against a clock. If anything inside it could advance a trial on its own, `settled`
    // would win this race; the sentinel winning is the evidence that nothing can.
    const first = await Promise.race([
      gate.settled.then(() => 'advanced'),
      new Promise((resolve) => setTimeout(() => resolve('still waiting'), 120)),
    ]);
    expect(first).toBe('still waiting');
    expect(reviewDwellLedger(), 'a trial that never ended recorded a figure').toEqual([]);

    gate.release();
    await expect(gate.settled).resolves.toBeUndefined();
  });

  it('records one row per released trial, with the time the child took', () => {
    let clock = 1_000;
    const gate = openReviewGate(
      { itemId: 'IT-2', typeCode: 'SPA-XFORM-01' },
      { emulated: false, now: () => clock },
    );
    clock = 5_500;
    gate.release();

    expect(reviewDwellLedger()).toEqual([
      { itemId: 'IT-2', typeCode: 'SPA-XFORM-01', msToNext: 4_500, emulated: false },
    ]);

    // Idempotent. A double-tap on Next is a double-tap, not two trials.
    clock = 9_000;
    gate.release();
    expect(reviewDwellLedger()).toHaveLength(1);
  });

  it('sums a session budget from the children and not from the emulator', () => {
    recordReviewDwell({
      itemId: 'a',
      typeCode: 'FLU-OPCHAIN-01',
      msToNext: 3_000,
      emulated: false,
    });
    recordReviewDwell({ itemId: 'b', typeCode: 'FLU-OPCHAIN-01', msToNext: 2, emulated: true });
    recordReviewDwell({
      itemId: 'c',
      typeCode: 'FLU-OPCHAIN-01',
      msToNext: 1_500,
      emulated: false,
    });

    // Auto-run's rows stay on the record and stay out of the figure.
    expect(reviewDwellLedger()).toHaveLength(3);
    expect(reviewDwellTotalMs()).toBe(4_500);
  });

  it('starts each sitting from zero', () => {
    recordReviewDwell({ itemId: 'a', typeCode: 'VER-MORPHO-01', msToNext: 800, emulated: false });
    resetReviewDwell();
    expect(reviewDwellLedger()).toEqual([]);
    expect(reviewDwellTotalMs()).toBe(0);
  });
});

/* ================================================================== *
 * The boundary: no estimator can see this figure
 * ================================================================== */

/**
 * Everything that turns trials into a number about a child.
 *
 * The engine picks the next item and moves the ability estimate; the scorer fits the learning curve
 * and produces the score; `phase2.ts` builds the block trials, the targeting and the family-facing
 * readout; `adaptive.ts` is the submit boundary; `debug-view.ts` is the researcher's projection of
 * the trace. A reference to time-to-next in any of them is the figure entering a judgement.
 */
const ESTIMATORS = [
  join(REPO_ROOT, 'packages', 'exam-engine', 'src'),
  join(REPO_ROOT, 'packages', 'exam-scoring', 'src'),
  join(WEB_SRC, 'lib', 'exam', 'phase2.ts'),
  join(WEB_SRC, 'lib', 'exam', 'adaptive.ts'),
  join(WEB_SRC, 'lib', 'exam', 'debug-view.ts'),
  join(WEB_SRC, 'lib', 'exam', 'engine-config.ts'),
  join(WEB_SRC, 'app', 'api', 'exam-submit'),
  join(WEB_SRC, 'app', 'api', 'exam-results'),
];

async function sourceFiles(target: string): Promise<string[]> {
  const { statSync, readdirSync } = await import('node:fs');
  if (!statSync(target).isDirectory()) return [target];
  return readdirSync(target, { recursive: true, encoding: 'utf8' })
    .map((entry) => join(target, entry))
    .filter((file) => /\.(?:ts|tsx)$/.test(file) && !file.includes('.test.'))
    .filter((file) => statSync(file).isFile());
}

describe('time-to-next reaches no estimator', () => {
  it('is imported by nothing that scores, fits, targets or reports', async () => {
    for (const target of ESTIMATORS) {
      for (const file of await sourceFiles(target)) {
        const source = readFileSync(file, 'utf8');
        expect(source, `${file} imports the review-dwell ledger`).not.toMatch(/review-dwell/);
        expect(source, `${file} reads a time-to-next figure`).not.toMatch(
          /msToNext|reviewDwell|ReviewDwell/,
        );
      }
    }
  });

  it('is shaped so a dwell row cannot be mistaken for a trial', () => {
    // Every consumer of a block trial reads `difficulty` and `score`. A row that carried either
    // could be passed to `toLearningTrials` and fitted; one that carries neither cannot be, and
    // TypeScript rejects it at the call site rather than silently reading `undefined`.
    const row = { itemId: 'a', typeCode: 'FLU-OPCHAIN-01', msToNext: 1, emulated: false };
    expect(Object.keys(row).sort()).toEqual(['emulated', 'itemId', 'msToNext', 'typeCode']);
    expect(Object.keys(row)).not.toContain('difficulty');
    expect(Object.keys(row)).not.toContain('score');
  });

  it('is read back by nothing on a child-facing surface', () => {
    // The runner may open the gate and reset the ledger. Reading the total or the rows back inside a
    // component is how the figure would end up rendered to a family — which would report a child's
    // pace to them as if it meant something, on an instrument that has never measured what it means.
    const runner = readFileSync(join(WEB_SRC, 'components', 'exam', 'exam-runner.tsx'), 'utf8');
    expect(runner).not.toMatch(/reviewDwellLedger|reviewDwellTotalMs/);
  });
});
