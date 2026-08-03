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
 *   2. `M-PAE` is present on every verdict and correctness matches the accepting band exactly, on
 *      both sides of the target;
 *   3. the emitted values are continuous and bounded, and the [0, 0.5] window `policy.ts` declares is
 *      a normalisation range rather than a domain claim — a free slider genuinely produces errors past
 *      half the line, where five constrained options could not;
 *   4. the value is GRADED — a placement nearer the target reports a smaller error, monotonically.
 *      Without that, `M-PAE` would be an error *code* wearing the name of an error *size*, and the
 *      registry's "small consistent PAE separates top reasoners without ceiling" would not hold.
 *
 * REBUILT WITH THE TYPE (D-212). The activity is now a slider on a number line, so there are no
 * option ratios to probe and the probe is the response space itself. That makes claims 2 and 4
 * stronger rather than weaker: they used to hold for the five placements the generator chose, and now
 * hold for any placement a child can make.
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
    responseFormat: string;
    responseField: string;
    [key: string]: unknown;
  };
  answer: {
    correctKey: number;
    targetRatio: number;
    tolerance: number;
    [key: string]: unknown;
  };
}

const items = readFileSync(BANK, 'utf8')
  .split('\n')
  .filter((line) => line.trim())
  .map((line) => JSON.parse(line) as GlyphnumItem);

/**
 * Placements to probe each item with, as offsets from the target in units of its own tolerance.
 *
 * The old build could only probe the five ratios its options happened to carry. A slider can be put
 * anywhere, so the probe is the response space itself: dead on, just inside the band, just outside
 * it, and progressively further away. That is what makes the claim "M-PAE is an error SIZE, not an
 * error code" testable without any distractor taxonomy to lean on.
 */
const PROBE_OFFSETS = [0, 0.9, 1.1, 3, 8, 20] as const;

describe('QUANT-GLYPHNUM-01 supplies M-PAE through the shipped placement verifier', () => {
  it('has a bank to check, and it is a placement bank', () => {
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.typeCode).toBe('QUANT-GLYPHNUM-01');
      expect(item.domain).toBe('quantitative');
      // The claim under test is about the generic path, so a per-type verifier appearing later must
      // not silently take over and leave this test passing for the wrong reason.
      expect(item.scoring?.rule).toBe('placement_tolerance');
      // No options at all: the response is a position, and the format tag is what says so to the
      // block's chance-floor reader.
      expect(item.content.options).toBeUndefined();
      expect(item.content.responseFormat).toBe('continuous_placement');
      expect(item.content.responseField).toBe('placedRatio');
    }
  });

  it('routes every item to the generic placement verifier, with no per-type verifier needed', () => {
    const routed = new Set(items.map((item) => resolveVerifier(item).name));
    expect([...routed]).toEqual(['verifyPlacementTolerance']);
  });

  it('emits M-PAE on every placement, and grades the band and nothing wider', () => {
    const missing: string[] = [];
    const misgraded: string[] = [];
    for (const item of items) {
      const { targetRatio, tolerance } = item.answer;
      for (const offset of PROBE_OFFSETS) {
        // Both sides of the target, so a verifier that compared signed error would be caught.
        for (const direction of [1, -1]) {
          const placed = Math.min(1, Math.max(0, targetRatio + direction * offset * tolerance));
          const verdict = verify(item, { placedRatio: placed });
          const pae = verdict.metrics?.['M-PAE'];
          if (typeof pae !== 'number' || !Number.isFinite(pae)) {
            missing.push(`${item.itemId}@${offset}`);
            continue;
          }
          // Clamping at the ends of the line can bring a far probe back inside the band, so the
          // expectation is computed from the placement that was actually sent.
          const expected = Math.abs(placed - targetRatio) <= tolerance;
          if (verdict.correct !== expected) misgraded.push(`${item.itemId}@${offset}`);
        }
      }
    }
    expect(missing).toEqual([]);
    expect(misgraded).toEqual([]);
  });

  it('emits a continuous error, and one the scoring policy normalises rather than rejects', () => {
    const values: number[] = [];
    for (const item of items) {
      for (const placed of [0, 0.25, item.answer.targetRatio, 0.75, 1]) {
        const pae = verify(item, { placedRatio: placed }).metrics?.['M-PAE'];
        if (typeof pae === 'number') values.push(pae);
      }
    }
    expect(Math.min(...values)).toBe(0);
    /*
     * A FREE slider genuinely produces errors past 0.5, where five constrained options could not, so
     * `policy.ts`'s { min: 0, max: 0.5 } is a NORMALISATION window and not a claim about the domain.
     * `normalizeToUnit` clamps, so a placement more than half the line away scores as maximally
     * wrong — which is the right reading, and is why this needs no registry change. What must hold is
     * that the metric stays a bounded error on the line.
     */
    expect(Math.max(...values)).toBeGreaterThan(0.5);
    expect(Math.max(...values)).toBeLessThanOrEqual(1);
    const distinct = new Set(values.map((v) => Math.round(v * 1e6))).size;
    expect(distinct).toBeGreaterThan(100);
    // The registry asks for >=10 placements before M-PAE is adequate, and MEASUREMENTS says 10-15.
    // A 30-trial block on this bank is 30 placements, so supply is not the constraint.
    expect(items.length).toBeGreaterThanOrEqual(30);
  });

  it('emits a graded error: a placement nearer the target reports a smaller one', () => {
    /*
     * With no options there is no distractor taxonomy to order, and the ordering claim gets stronger
     * rather than weaker: it is now about the response itself. A child who has the vocabulary and the
     * place rule lands near; a child holding only the vocabulary lands a place-value's worth away; a
     * child who has neither lands anywhere. The registry's "small consistent PAE separates top
     * reasoners without ceiling" is exactly this monotonicity, and it now holds for every placement a
     * child can make instead of for five the generator chose.
     */
    const violations: string[] = [];
    for (const item of items) {
      const { targetRatio, tolerance } = item.answer;
      const errors = PROBE_OFFSETS.map((offset) => {
        const placed = Math.min(1, targetRatio + offset * tolerance);
        return verify(item, { placedRatio: placed }).metrics?.['M-PAE'];
      });
      for (let i = 1; i < errors.length; i += 1) {
        const previous = errors[i - 1];
        const current = errors[i];
        if (typeof previous !== 'number' || typeof current !== 'number') continue;
        // Non-decreasing: equal only where the probe clamped at the end of the line.
        if (current < previous - 1e-12) violations.push(`${item.itemId} at offset ${i}`);
      }
    }
    expect(violations).toEqual([]);
  });

  it('never lets a response the renderer cannot produce score as correct', () => {
    // The renderer posts back where the child put the handle, so an absent or malformed response is
    // the failure mode to fail CLOSED on rather than an impossible one.
    const sample = items[0]!;
    expect(verify(sample, {}).correct).toBe(false);
    expect(verify(sample, { placedRatio: 'middle' }).correct).toBe(false);
    // The option key the old build graded on is gone, and sending one must not grade anything.
    expect(verify(sample, { selectedKey: 'C' }).correct).toBe(false);
  });
});
