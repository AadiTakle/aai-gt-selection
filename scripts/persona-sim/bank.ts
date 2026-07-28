import { dialToTheta } from '../../packages/cat-engine/src/persona-sim/latent';
import { hashSeed, mulberry32 } from '../../packages/cat-engine/src/rng';
import {
  SCORED_DOMAINS,
  type IrtParameters,
  type ScoredDomain,
} from '../../packages/cat-engine/src/types';

import type { BankItem, BankSingleSelect } from '../../apps/web/src/lib/exam/item';

/**
 * A born-synthetic, IRT-PARAMETERIZED bank for the persona-recovery runner.
 *
 * WHY A SEPARATE BANK: the demo two-stage bank carries ordinal DESIGN rungs and
 * self-scoring embedded demos, which is right for a clickable prototype but leaves
 * two things unavailable to a recovery study — pinned item parameters (so the
 * estimator is scored against the same `a/b/c` the response was drawn from) and a
 * keyed single-select path (so correctness is resolved by the REAL server-side
 * scoring rule from a raw option index rather than self-reported by the player).
 * This bank supplies both, and is wide enough per domain to trace an
 * SE-vs-item-count curve. It is generated, seeded, and never a proposed question
 * set: `syntheticOnly: true`, `validated: false` (D-006, R9).
 *
 * The rung -> difficulty mapping is the design doc's dial mapping
 * (`b = (rung - 10.5) / 3`), so an ordinal rung and a 3PL difficulty stay
 * consistent between the bank and the persona sampler.
 */

/** Standing rungs per domain: 15 rungs spanning roughly theta -2.5 .. +2.2. */
const STANDING_RUNGS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17] as const;

/** Effort (novel-block) rungs per domain — the M-LEARNRATE vehicle. */
const EFFORT_RUNGS = [4, 6, 8, 10, 12, 14] as const;

/** Options per item; also fixes the 3PL guessing floor at 1/4. */
const OPTIONS_PER_ITEM = 4;
export const GUESSING_FLOOR = 1 / OPTIONS_PER_ITEM;

const LURE_CYCLE = ['local_fit', 'global_mismatch', 'associate', 'surface_match'] as const;

export interface SyntheticBank {
  items: BankItem[];
  /** Pinned parameters, held bank-side exactly as `ItemParameters` would be. */
  irtByItemId: Map<string, IrtParameters>;
  /** Per-item rapid-guess RT floor in ms (M-RAPIDGUESS / RTE filter). */
  rapidGuessThresholdMs: number;
  standingItemIdsInBankOrder: string[];
}

/**
 * One keyed single-select item. IRT parameters are deliberately NOT stored on the
 * item: the runtime item contract has no calibrated-parameter field, and adding one
 * here would imply a calibration that does not exist. They live in the sidecar map.
 */
function makeItem(
  domain: ScoredDomain,
  stage: 'standing' | 'effort',
  rung: number,
  correctIndex: number,
): BankSingleSelect {
  const itemId = `SYN-PS-${domain}-${stage}-${String(rung).padStart(2, '0')}`;
  const options = Array.from({ length: OPTIONS_PER_ITEM }, (_, i) => ({
    label: `option-${i + 1}`,
    lure: (i === correctIndex ? 'correct' : LURE_CYCLE[i % LURE_CYCLE.length]!) as
      'correct' | 'local_fit' | 'global_mismatch' | 'associate' | 'surface_match',
  }));
  return {
    renderKind: 'single-select',
    itemId,
    typeCode: `PS-${domain.toUpperCase()}-${stage.toUpperCase()}-${rung}`,
    domain,
    title: `${domain} ${stage} rung ${rung}`,
    blurb: `Synthetic ${stage} probe at ordinal rung ${rung}.`,
    difficultyLevel: rung,
    stage,
    syntheticOnly: true,
    validated: false,
    content: {
      typeCode: `PS-${domain.toUpperCase()}-${stage.toUpperCase()}-${rung}`,
      prompt: 'Synthetic probe (no human-readable stem; responses are simulated).',
      options,
    },
    answer: {
      correctIndex,
      distractorRationales: options.map((o) => o.lure),
    },
    scoring: { mode: 'deterministic_key' },
    provenance: {
      generator: 'grammar',
      generatorRef: 'scripts/persona-sim/bank.ts',
      seed: 'persona-sim-bank-v1',
      validator: [],
    },
  };
}

/**
 * Build the bank. Discriminations and answer keys are drawn from a fixed seed so
 * the bank itself is a constant of the study (only personas vary between runs).
 */
export function syntheticRecoveryBank(seed = 'persona-sim-bank-v1'): SyntheticBank {
  const rand = mulberry32(hashSeed(seed));
  const items: BankItem[] = [];
  const irtByItemId = new Map<string, IrtParameters>();
  const standingItemIdsInBankOrder: string[] = [];

  for (const domain of SCORED_DOMAINS) {
    for (const stage of ['standing', 'effort'] as const) {
      const rungs = stage === 'standing' ? STANDING_RUNGS : EFFORT_RUNGS;
      for (const rung of rungs) {
        const discrimination = 0.9 + 0.7 * rand();
        const correctIndex = Math.min(OPTIONS_PER_ITEM - 1, Math.floor(rand() * OPTIONS_PER_ITEM));
        const item = makeItem(domain, stage, rung, correctIndex);
        items.push(item);
        irtByItemId.set(item.itemId, {
          a: discrimination,
          b: dialToTheta(rung),
          c: GUESSING_FLOOR,
          model: '3PL',
        });
        if (stage === 'standing') standingItemIdsInBankOrder.push(item.itemId);
      }
    }
  }

  return {
    items,
    irtByItemId,
    // 1.5 s: below any plausible solution behaviour on these probes, above the
    // rapid-guess band the sampler draws from.
    rapidGuessThresholdMs: 1500,
    standingItemIdsInBankOrder,
  };
}
