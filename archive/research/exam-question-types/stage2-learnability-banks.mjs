// Reading a Stage 2 type's two arms off disk, and nothing else.
//
// Split out of `stage2-learnability-block.mjs` on purpose. That module imports the product's
// TypeScript targeting and selection rules, which is right for a block loop and wrong for anything
// that only wants items — including the test suite, which should not take a dependency on
// `@gt-selection/exam-scoring` to assert a property of an oracle.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * Split a bank file into what the product ships and what only a reviewer may see.
 *
 * The separation is not decoration: `content` is what the browser gets, and building a pool from it
 * is what stops a loop from accidentally selecting on something the browser would not have. The
 * reveal — the one thing the oracle needs that the child also gets — is handed over as a single
 * `reviewerOnly.correctKey`, because that is exactly what the screen shows after an answer.
 */
export function loadArm(file) {
  return readFileSync(file, 'utf8')
    .trim()
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line))
    .map((item) => ({
      itemId: item.itemId,
      typeCode: item.typeCode,
      domain: item.domain,
      difficulty: item.difficulty,
      content: item.content,
      reviewerOnly: { correctKey: item.answer.correctKey },
      /** Read by the warm-up chooser alone, which must select on the hidden side to stay equated. */
      answerForWarmup: item.answer,
      /** The true system, for tests that check the oracle never eliminates it. Never for selection. */
      trueSystem: item.answer.system,
    }));
}

/** Both arms of one type, named the way §4.1.1 names them. */
export function loadArms(typeCode) {
  return {
    consistent: loadArm(join(HERE, 'banks', `${typeCode}.jsonl`)),
    perTrial: loadArm(join(HERE, 'control-banks', `${typeCode}.perTrial.jsonl`)),
  };
}
