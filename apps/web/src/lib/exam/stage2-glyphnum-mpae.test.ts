/**
 * `QUANT-GLYPHNUM-01` supplies `M-PAE`, rather than declaring it.
 *
 * D-031 narrowed `M-PAE` to `enforced: false` in quantitative because the question-type review
 * retired `QUANT-NUMLINE-01`, the only number-line placement type ever wired, and
 * `packages/exam-engine/src/config.ts` names "a placement type wired again" as the trigger to
 * re-enforce it. A new bank can *say* it emits the metric in its spec row and be wrong, so this
 * test runs the real bank through the real verifier and checks the metric that actually comes out.
 *
 * It deliberately does NOT re-implement the placement formula. `check-QUANT-GLYPHNUM-01.mjs`
 * already does that, from the documented contract, as an independent re-derivation. What that
 * cannot show is that the SHIPPED dispatcher picks the placement verifier up for these items and
 * that the metric map really contains `M-PAE`, which is the difference between a bank that is
 * consistent with the contract and a bank the deployed code grades.
 *
 * Four properties, and the last two are the ones that separate a supplied metric from a declared
 * one:
 *
 *   1. the shipped `resolveVerifier` routes every item to the generic placement verifier;
 *   2. `M-PAE` is present on every verdict and correctness matches the keyed tick exactly;
 *   3. the emitted values are inside the [0, 0.5] range the metric registry declares, and there
 *      are enough distinct ones for "continuous placement error" to mean anything;
 *   4. the value is GRADED — a near-miss reading of the notation produces a smaller placement
 *      error than a disengaged one. Without that, `M-PAE` would be an error *code* wearing the name
 *      of an error *size*, and the registry's "small consistent PAE separates top reasoners without
 *      ceiling" would not hold.
 *
 * SCOPE. This is U4-adjacent evidence for U3's `M-PAE` claim. It does not wire the type: no
 * renderer (U6) and no per-type verifier (U7) exist, the bank ships `validated: false` and
 * `syntheticOnly: true`, and nothing here bears on Gate B.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import type { RawBankItem } from './bank-loader';
import { resolveVerifier, verify } from './verifiers';

function repoRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  while (!existsSync(join(dir, 'pnpm-workspace.yaml'))) {
    const parent = resolve(dir, '..');
    if (parent === dir) throw new Error('could not locate the workspace root');
    dir = parent;
  }
  return dir;
}

const BANK = join(repoRoot(), 'research/exam-question-types/banks/QUANT-GLYPHNUM-01.jsonl');

interface GlyphnumItem extends RawBankItem {
  content: {
    options: { key: string; ratio: number }[];
    [key: string]: unknown;
  };
  answer: {
    correctKey: string;
    targetRatio: number;
    tolerance: number;
    distractorRationales: Record<string, { partialRuleKind?: string }>;
    [key: string]: unknown;
  };
}

const items = readFileSync(BANK, 'utf8')
  .split('\n')
  .filter((line) => line.trim())
  .map((line) => JSON.parse(line) as GlyphnumItem);

/**
 * How near each named incomplete reading sits to having the whole notation, as the generator
 * declares it. Only the two ends are needed here: the ordering claim is that the near end produces
 * smaller placement error than the far end, which is a much weaker and more testable claim than a
 * full rank correlation over eleven classes.
 */
const NEAREST = new Set(['additive_only', 'over_binding', 'phantom_bind', 'place_value_read']);
const FURTHEST = new Set(['first_unit_only', 'largest_glyph_only', 'token_count', 'anchor_echo']);

describe('QUANT-GLYPHNUM-01 supplies M-PAE through the shipped placement verifier', () => {
  it('has a bank to check', () => {
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.typeCode).toBe('QUANT-GLYPHNUM-01');
      expect(item.domain).toBe('quantitative');
      // The claim under test is about the generic path, so a per-type verifier appearing later must
      // not silently take over and leave this test passing for the wrong reason.
      expect(item.scoring?.rule).toBe('placement_tolerance');
    }
  });

  it('routes every item to the generic placement verifier, with no per-type verifier needed', () => {
    const routed = new Set(items.map((item) => resolveVerifier(item).name));
    expect([...routed]).toEqual(['verifyPlacementTolerance']);
  });

  it('emits M-PAE on every option of every item, and grades exactly the keyed tick', () => {
    const missing: string[] = [];
    const misgraded: string[] = [];
    for (const item of items) {
      for (const option of item.content.options) {
        const verdict = verify(item, { placedRatio: option.ratio });
        const pae = verdict.metrics?.['M-PAE'];
        if (typeof pae !== 'number' || !Number.isFinite(pae)) {
          missing.push(`${item.itemId}/${option.key}`);
          continue;
        }
        if (verdict.correct !== (option.key === item.answer.correctKey)) {
          misgraded.push(`${item.itemId}/${option.key}`);
        }
      }
    }
    expect(missing).toEqual([]);
    expect(misgraded).toEqual([]);
  });

  it('emits values inside the range the metric registry declares, and enough of them to be continuous', () => {
    const values: number[] = [];
    for (const item of items) {
      for (const option of item.content.options) {
        const pae = verify(item, { placedRatio: option.ratio }).metrics?.['M-PAE'];
        if (typeof pae === 'number') values.push(pae);
      }
    }
    // `policy.ts` declares M-PAE over { min: 0, max: 0.5 }, direction 'lower'.
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...values)).toBeLessThanOrEqual(0.5 + 1e-9);
    const distinct = new Set(values.map((v) => Math.round(v * 1e6))).size;
    expect(distinct).toBeGreaterThan(100);
    // The registry asks for >=10 placements before M-PAE is adequate, and MEASUREMENTS says 10-15.
    // A 30-trial block on this bank is 30 placements, so supply is not the constraint.
    expect(items.length).toBeGreaterThanOrEqual(30);
  });

  it('emits a graded error: near-miss readings land nearer than disengaged ones', () => {
    const near: number[] = [];
    const far: number[] = [];
    for (const item of items) {
      for (const option of item.content.options) {
        if (option.key === item.answer.correctKey) continue;
        const kind = item.answer.distractorRationales[option.key]?.partialRuleKind;
        const pae = verify(item, { placedRatio: option.ratio }).metrics?.['M-PAE'];
        if (typeof pae !== 'number' || kind === undefined) continue;
        if (NEAREST.has(kind)) near.push(pae);
        if (FURTHEST.has(kind)) far.push(pae);
      }
    }
    expect(near.length).toBeGreaterThan(50);
    expect(far.length).toBeGreaterThan(50);
    const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(mean(near)).toBeLessThan(mean(far));
  });

  it('never lets a response the renderer cannot produce score as correct', () => {
    // The renderer posts back the ratio of the tick the child tapped, so an absent or malformed
    // response is the failure mode to fail CLOSED on rather than an impossible one.
    const sample = items[0]!;
    expect(verify(sample, {}).correct).toBe(false);
    expect(verify(sample, { placedRatio: 'middle' }).correct).toBe(false);
  });
});
