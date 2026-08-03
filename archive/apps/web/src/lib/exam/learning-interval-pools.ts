import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { type ServedItem } from '@gt-selection/exam-engine';

import { LEARNING_BLOCK_AREA } from './phase2';

/**
 * Item pools for the dev-only learning-interval view, DEVELOPMENT ONLY.
 *
 * Separate from `bank-loader.ts` on purpose, and not a second copy of it. `bank-loader` serves the
 * WIRED question types to children and fails loudly when any of them is missing, which is correct
 * there. This reads two specific banks that are deliberately NOT wired — `FLU-OPCHAIN-01` has no
 * renderer, it exists only as a measurement substrate — and a missing bank here must degrade to a
 * visible note in a dev view rather than take a page down.
 *
 * WHY THE POOL IS A CHOICE AND NOT A CONSTANT. It is the one variable that makes the ladder
 * comparison falsifiable. The bank-recovery measurement ran three pools at the same settings and they do not agree from
 * 30 trials on: the idealised grid and `FLU-OPCHAIN-01` both reach a mean posterior SE of 0.063
 * while `FLU-MATRIX-01`, the bank actually wired into the battery, sits at 0.072 and stalls at 0.047
 * by 60 trials where the others reach 0.028. So a run whose contraction misses the reference line is
 * either drawn from a different pool or is telling you something about this one, and being able to
 * switch pools is how those two get told apart.
 */

const BANK_DIRS = [
  path.join(process.cwd(), 'research', 'exam-question-types', 'banks'),
  path.join(process.cwd(), '..', '..', 'research', 'exam-question-types', 'banks'),
];

export const IDEAL_GRID_POOL_ID = 'ideal-grid';

export interface PoolChoice {
  readonly id: string;
  readonly label: string;
  /** What the bank-recovery measurement found this pool's mean posterior SE to be at 30 trials, for orientation. */
  readonly note: string;
}

/**
 * The pools the view offers, in the order the bank-recovery measurement tabulates them.
 *
 * `FLU-OPCHAIN-01.consistent` is the arm whose rule holds for the whole block; `.perTrial` is the
 * scrambled control. Section 7 of that measurement found the two banks carry identical difficulty vectors, 234 of 234
 * positionally, and difficulty is the only item property a simulated child responds to — so the two
 * arms produce byte-identical runs here and only `.consistent` is offered. That is a finding about
 * the simulation, not about the arms: the control's value is entirely with real children.
 */
export const POOL_CHOICES: readonly PoolChoice[] = [
  {
    id: IDEAL_GRID_POOL_ID,
    label: 'idealised 0.5-point grid (no bank)',
    note: 'bank-free lower bound; measured mean SE 0.063 at 30 trials',
  },
  {
    id: 'FLU-OPCHAIN-01.consistent',
    label: 'FLU-OPCHAIN-01 (purpose-built for this measurement)',
    note: 'reaches the bank-free bound; measured mean SE 0.063 at 30 trials',
  },
  {
    id: 'FLU-MATRIX-01',
    label: 'FLU-MATRIX-01 (the bank actually wired)',
    note: 'measured mean SE 0.072 at 30 trials, and it stalls at 0.047 by 60',
  },
];

export interface LoadedPool {
  readonly items: ServedItem[];
  /** Non-null when the requested bank could not be read; the view says so instead of pretending. */
  readonly unavailable: string | null;
}

/**
 * Read one bank's difficulties into a pool.
 *
 * Only `itemId`, `typeCode` and `difficulty` are taken from the file. Difficulty is the only item
 * property the synthetic responder reacts to, and pulling `content` in would ship stimulus JSON into
 * a diagnostic page for no benefit.
 */
export async function loadBankPool(bankId: string): Promise<LoadedPool> {
  const directory = BANK_DIRS.find((candidate) => existsSync(candidate));
  if (directory === undefined) {
    return {
      items: [],
      unavailable: `No bank directory found from ${process.cwd()}. Looked in: ${BANK_DIRS.join(', ')}.`,
    };
  }

  const file = path.join(directory, `${bankId}.jsonl`);
  let text: string;
  try {
    text = await readFile(file, 'utf8');
  } catch {
    return { items: [], unavailable: `Bank ${bankId} could not be read at ${file}.` };
  }

  const items: ServedItem[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    let row: Record<string, unknown>;
    try {
      row = JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      continue;
    }
    const itemId = row['itemId'];
    const typeCode = row['typeCode'];
    const difficulty = row['difficulty'];
    if (typeof itemId !== 'string' || typeof typeCode !== 'string') continue;
    if (typeof difficulty !== 'number' || !Number.isFinite(difficulty)) continue;
    items.push({
      itemId,
      typeCode,
      domain: LEARNING_BLOCK_AREA,
      difficulty,
      ageBands: ['4-5'],
      content: {},
      syntheticOnly: true,
      validated: false,
    });
  }

  if (items.length === 0) {
    return { items: [], unavailable: `Bank ${bankId} at ${file} yielded no usable items.` };
  }
  return { items, unavailable: null };
}
