import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import type { RawBankItem } from '../bank-loader';
import { fluidVerifiers } from './fluid';

/**
 * Round-trip tests for the fluid-domain verifiers.
 *
 * Each type is exercised in BOTH directions against real bank items: the
 * response a correct child would emit must verify, and a plausible wrong
 * response must not. A verifier that answered `true` (or `false`) to everything
 * would fail here, which is the whole point — a wrong verifier scores children
 * on fiction and is worse than a missing one.
 *
 * The banks are read straight off disk rather than through `bank-loader`,
 * because the loader only reads types the sync script has already wired and
 * these types are not wired yet.
 */

const BANKS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../../../research/exam-question-types/banks',
);

function loadBank(typeCode: string): RawBankItem[] {
  const text = readFileSync(path.join(BANKS_DIR, `${typeCode}.jsonl`), 'utf8').trim();
  return text.split('\n').map((line) => JSON.parse(line) as RawBankItem);
}

function verifierFor(typeCode: string) {
  const verifier = fluidVerifiers[typeCode];
  if (!verifier) throw new Error(`no verifier registered for ${typeCode}`);
  return verifier;
}

/**
 * A copy of `item` whose stored answer key has been corrupted. Grading a
 * correct response against this still has to succeed: that is what proves the
 * verifier re-derives the expected response from `content` rather than trusting
 * the key, so a bad key in the bank cannot silently pass the tests above.
 */
function withCorruptedKey(
  item: RawBankItem,
  corrupt: (answer: RawBankItem['answer']) => void,
): RawBankItem {
  const copy = structuredClone(item);
  corrupt(copy.answer);
  return copy;
}

/** Every verifier must reject a response it cannot read, without throwing. */
function expectsMalformedToFail(typeCode: string, item: RawBankItem) {
  const verify = verifierFor(typeCode);
  expect(verify(item, {}).correct, `${typeCode} empty response`).toBe(false);
  expect(verify(item, { finalGrid: 'nonsense' }).correct, `${typeCode} junk response`).toBe(false);
}

describe('FLU-GRIDCOPY-01 verifier', () => {
  const bank = loadBank('FLU-GRIDCOPY-01');
  const verify = verifierFor('FLU-GRIDCOPY-01');

  it('accepts the grid the demonstrated transform produces, on every bank item', () => {
    for (const item of bank) {
      const target = item.answer.targetGrid as number[][];
      const verdict = verify(item, {
        finalGrid: target,
        finalGridKey: target.map((row) => row.join('')).join('/'),
      });
      expect(verdict.correct, `${item.itemId} correct grid`).toBe(true);
      expect(verdict.metrics?.['M-POLY']).toBe(1);
    }
  });

  it('rejects an unchanged copy of the probe input, on every bank item', () => {
    for (const item of bank) {
      const probe = item.content.probeInput as number[][];
      expect(verify(item, { finalGrid: probe }).correct, `${item.itemId} identity copy`).toBe(
        false,
      );
    }
  });

  it('rejects a single wrong cell and reports per-cell partial credit', () => {
    const item = bank[0]!;
    const target = (item.answer.targetGrid as number[][]).map((row) => [...row]);
    const paletteSize = item.content.paletteSize as number;
    target[0]![0] = (target[0]![0]! + 1) % (paletteSize + 1);

    const verdict = verify(item, { finalGrid: target });
    expect(verdict.correct).toBe(false);
    const cells = target.length * target[0]!.length;
    expect(verdict.metrics?.['M-POLY']).toBeCloseTo((cells - 1) / cells);
  });

  it('grades from the serialized key when the grid array is absent', () => {
    const item = bank[0]!;
    expect(verify(item, { finalGridKey: item.answer.correctKey }).correct).toBe(true);
    expect(verify(item, { finalGridKey: 'not/a/grid' }).correct).toBe(false);
  });

  it('re-derives the target from the worked examples, not the stored key', () => {
    for (const item of bank) {
      const target = item.answer.targetGrid as number[][];
      const paletteSize = item.content.paletteSize as number;
      const corrupted = withCorruptedKey(item, (answer) => {
        const wrong = (answer.targetGrid as number[][]).map((row) => [...row]);
        wrong[0]![0] = (wrong[0]![0]! + 1) % (paletteSize + 1);
        answer.targetGrid = wrong;
        answer.correctKey = wrong.map((row) => row.join('')).join('/');
      });
      expect(
        verify(corrupted, { finalGrid: target }).correct,
        `${item.itemId} solver over key`,
      ).toBe(true);
    }
  });

  it('rejects a malformed response instead of throwing', () => {
    expectsMalformedToFail('FLU-GRIDCOPY-01', bank[0]!);
  });
});

describe('FLU-CONCEPT-01 verifier', () => {
  const bank = loadBank('FLU-CONCEPT-01');
  const verify = verifierFor('FLU-CONCEPT-01');

  const probeAnswers = (item: RawBankItem) =>
    (item.answer.probeVerdicts as { key: string; opens: boolean }[]).map((v) => ({
      key: v.key,
      opens: v.opens,
    }));

  it('accepts the verdicts the gate evidence forces, on every bank item', () => {
    for (const item of bank) {
      const verdict = verify(item, {
        probeAnswers: probeAnswers(item),
        answerKeyString: item.answer.correctKey,
      });
      expect(verdict.correct, `${item.itemId} solver verdicts`).toBe(true);
      expect(verdict.metrics?.['M-POLY']).toBe(1);
    }
  });

  it('rejects a flipped probe verdict, on every bank item', () => {
    for (const item of bank) {
      const answers = probeAnswers(item);
      const flipped = [{ ...answers[0]!, opens: !answers[0]!.opens }, ...answers.slice(1)];
      const verdict = verify(item, { probeAnswers: flipped });
      expect(verdict.correct, `${item.itemId} one probe flipped`).toBe(false);
      expect(verdict.metrics?.['M-POLY']).toBeCloseTo(2 / 3);
    }
  });

  it('rejects the inverted verdict string read positionally', () => {
    const item = bank[0]!;
    const inverted = [...(item.answer.correctKey as string)]
      .map((ch) => (ch === 'Y' ? 'N' : 'Y'))
      .join('');
    expect(verify(item, { answerKeyString: item.answer.correctKey }).correct).toBe(true);
    expect(verify(item, { answerKeyString: inverted }).correct).toBe(false);
  });

  it('scores hypothesis-search efficiency from the tests the child actually ran', () => {
    const item = bank[0]!;
    const oracle = item.content.gateOracle as {
      figure: Record<string, unknown>;
      accepts: boolean;
    }[];
    const informative = verify(item, {
      probeAnswers: probeAnswers(item),
      tests: oracle.slice(0, 3).map((entry) => ({ figure: entry.figure, opened: entry.accepts })),
    });
    const noTests = verify(item, { probeAnswers: probeAnswers(item) });

    expect(informative.metrics?.['M-HYP']).toBeGreaterThan(0);
    expect(informative.metrics?.['M-HYP']).toBeLessThanOrEqual(1);
    expect(noTests.metrics?.['M-HYP']).toBeUndefined();
  });

  it('re-derives the verdicts from the gate oracle, not the stored key', () => {
    for (const item of bank) {
      const corrupted = withCorruptedKey(item, (answer) => {
        answer.correctKey = [...(answer.correctKey as string)]
          .map((ch) => (ch === 'Y' ? 'N' : 'Y'))
          .join('');
        answer.probeVerdicts = [];
      });
      expect(
        verify(corrupted, { probeAnswers: probeAnswers(item) }).correct,
        `${item.itemId} solver over key`,
      ).toBe(true);
    }
  });

  it('rejects a malformed response instead of throwing', () => {
    expectsMalformedToFail('FLU-CONCEPT-01', bank[0]!);
  });
});

describe('FLU-DEDUCE-01 verifier', () => {
  const bank = loadBank('FLU-DEDUCE-01');
  const verify = verifierFor('FLU-DEDUCE-01');

  const candidateKeys = (item: RawBankItem) =>
    (item.content.candidates as { key: string }[]).map((c) => c.key);

  /**
   * The trace a child who read every clue correctly would leave, built from the
   * bank's own `cluesViolated` rationales. That is a different source from the
   * `content.clues` predicates the verifier evaluates, so agreement here is a
   * real cross-check of the derivation rather than a restatement of it.
   */
  function solvedSteps(item: RawBankItem) {
    const rationales = item.answer.distractorRationales as Record<
      string,
      { cluesViolated?: string[] }
    >;
    const eliminated = new Set<string>();
    return (item.content.clues as { clueId: string }[]).map((clue) => {
      for (const [key, rationale] of Object.entries(rationales)) {
        if (rationale.cluesViolated?.includes(clue.clueId)) eliminated.add(key);
      }
      return { clueId: clue.clueId, eliminated: [...eliminated] };
    });
  }

  it('accepts the elimination trace the clues force, on every bank item', () => {
    for (const item of bank) {
      const verdict = verify(item, { steps: solvedSteps(item) });
      expect(verdict.correct, `${item.itemId} solver trace`).toBe(true);
      expect(verdict.metrics?.['M-POLY']).toBe(1);
      expect(verdict.metrics?.['M-ERRTYPE']).toBe(1);
    }
  });

  it('leaves exactly the answer key standing at the last step, on every bank item', () => {
    for (const item of bank) {
      const steps = solvedSteps(item);
      const standing = candidateKeys(item).filter((k) => !steps.at(-1)!.eliminated.includes(k));
      expect(standing, `${item.itemId} survivor`).toEqual([item.answer.correctKey]);
    }
  });

  it('rejects a trace that leaves one ruled-out suspect standing, on every bank item', () => {
    for (const item of bank) {
      const steps = solvedSteps(item);
      const last = steps.at(-1)!;
      const verdict = verify(item, {
        steps: steps.map((step) =>
          step === last ? { ...step, eliminated: step.eliminated.slice(0, -1) } : step,
        ),
      });
      expect(verdict.correct, `${item.itemId} under-pruned`).toBe(false);
      // Under-pruning only: M-ERRTYPE stays at its best value, and the single
      // wrong state costs one cell of the graded grid.
      expect(verdict.metrics?.['M-ERRTYPE']).toBe(1);
      const cells = steps.length * candidateKeys(item).length;
      expect(verdict.metrics?.['M-POLY']).toBeCloseTo((cells - 1) / cells);
    }
  });

  it('scores crossing out the one suspect every clue admits as the worse error', () => {
    const item = bank[0]!;
    const key = item.answer.correctKey as string;
    const steps = solvedSteps(item).map((step) => ({
      ...step,
      eliminated: [...step.eliminated, key],
    }));
    const verdict = verify(item, { steps });
    expect(verdict.correct).toBe(false);
    expect(verdict.metrics?.['M-ERRTYPE']).toBe(0);
  });

  it('rejects a trace whose steps do not line up with the clues', () => {
    const item = bank.find((entry) => (entry.content.clues as unknown[]).length > 1)!;
    const steps = solvedSteps(item);
    expect(verify(item, { steps: steps.slice(0, -1) }).correct, 'short trace').toBe(false);
    expect(verify(item, { steps: [...steps].reverse() }).correct, 'reordered trace').toBe(false);
  });

  it('re-derives the eliminations from the clues, not the stored key', () => {
    for (const item of bank) {
      const steps = solvedSteps(item);
      const corrupted = withCorruptedKey(item, (answer) => {
        answer.correctKey = `${String(answer.correctKey)}~wrong`;
        answer.distractorRationales = {};
        answer.targetFigure = null;
      });
      expect(verify(corrupted, { steps }).correct, `${item.itemId} solver over key`).toBe(true);
    }
  });

  it('rejects a malformed response instead of throwing', () => {
    expectsMalformedToFail('FLU-DEDUCE-01', bank[0]!);
    const item = bank[0]!;
    expect(verify(item, { steps: 'nonsense' }).correct).toBe(false);
    expect(verify(item, { steps: [{ eliminated: [7] }] }).correct).toBe(false);
    expect(verify(item, { selectedKey: item.answer.correctKey }).correct).toBe(false);
  });
});

describe('CX-check-01 verifier', () => {
  const bank = loadBank('CX-check-01');
  const verify = verifierFor('CX-check-01');

  const servedPlacement = (item: RawBankItem) =>
    Object.fromEntries(
      (item.content.tokens as { id: string; bin: string }[]).map((t) => [t.id, t.bin]),
    );

  it('accepts the placement re-derived from the tile signatures, on every bank item', () => {
    for (const item of bank) {
      const verdict = verify(item, { finalPlacement: item.answer.trueBin });
      expect(verdict.correct, `${item.itemId} true placement`).toBe(true);
      expect(verdict.metrics?.['M-POLY']).toBe(1);
      expect(verdict.metrics?.['M-ERRTYPE']).toBe(1);
    }
  });

  it('rejects turning in the sorter\u2019s board unchanged wherever a slip was planted', () => {
    const planted = bank.filter((item) => (item.answer.plantedErrors as unknown[]).length > 0);
    expect(planted.length).toBeGreaterThan(0);
    for (const item of planted) {
      const verdict = verify(item, { finalPlacement: servedPlacement(item) });
      expect(verdict.correct, `${item.itemId} unchanged board`).toBe(false);
      expect(verdict.metrics?.['M-ERRTYPE']).toBe(0);
      expect(verdict.metrics?.['M-POLY']).toBeLessThan(1);
    }
  });

  it('reports the share of planted slips caught on a partial fix', () => {
    const item = bank.find((i) => (i.answer.plantedErrors as unknown[]).length >= 2)!;
    const slips = item.answer.plantedErrors as { tokenId: string; trueBin: string }[];
    const partial = { ...servedPlacement(item), [slips[0]!.tokenId]: slips[0]!.trueBin };

    const verdict = verify(item, { finalPlacement: partial });
    expect(verdict.correct).toBe(false);
    expect(verdict.metrics?.['M-ERRTYPE']).toBeCloseTo(1 / slips.length);
  });

  it('re-derives every tile\u2019s bin from its own text, not the stored key', () => {
    for (const item of bank) {
      const trueBin = item.answer.trueBin as Record<string, string>;
      const corrupted = withCorruptedKey(item, (answer) => {
        answer.trueBin = Object.fromEntries(
          Object.keys(trueBin).map((id) => [id, '__no-such-bin__']),
        );
        answer.correctKey = '__corrupt__';
      });
      expect(
        verify(corrupted, { finalPlacement: trueBin }).correct,
        `${item.itemId} solver over key`,
      ).toBe(true);
    }
  });

  it('rejects a malformed response instead of throwing', () => {
    expectsMalformedToFail('CX-check-01', bank[0]!);
  });
});

describe('CX-achieve-02 verifier', () => {
  const bank = loadBank('CX-achieve-02');
  const verify = verifierFor('CX-achieve-02');

  it('accepts the setup the bench model actually peaks at, on every bank item', () => {
    for (const item of bank) {
      const verdict = verify(item, {
        conclusionKey: item.answer.correctKey,
        factorPick: item.answer.topFactorId,
      });
      expect(verdict.correct, `${item.itemId} best setup`).toBe(true);
      expect(verdict.metrics?.['M-POLY']).toBe(1);
    }
  });

  it('rejects a near-miss setup, on every bank item', () => {
    for (const item of bank) {
      const options = (item.content.conclusion as { options: { key: string }[] }).options;
      const wrong = options.find((o) => o.key !== item.answer.correctKey)!;
      const verdict = verify(item, {
        conclusionKey: wrong.key,
        factorPick: item.answer.topFactorId,
      });
      expect(verdict.correct, `${item.itemId} wrong setup`).toBe(false);
    }
  });

  it('also keys the highest-effect factor when the item asks for it', () => {
    const asked = bank.filter(
      (item) => (item.content.conclusion as { askFactorPick?: boolean }).askFactorPick === true,
    );
    expect(asked.length).toBeGreaterThan(0);
    for (const item of asked) {
      const factors = item.content.factors as { id: string }[];
      const wrongFactor = factors.find((f) => f.id !== item.answer.topFactorId)!;
      const verdict = verify(item, {
        conclusionKey: item.answer.correctKey,
        factorPick: wrongFactor.id,
      });
      expect(verdict.correct, `${item.itemId} wrong top factor`).toBe(false);
      expect(verdict.metrics?.['M-POLY']).toBe(0.5);
    }
  });

  it('re-derives the peak setup from the bench model, not the stored key', () => {
    for (const item of bank) {
      const options = (item.content.conclusion as { options: { key: string }[] }).options;
      const otherKey = options.find((o) => o.key !== item.answer.correctKey)!.key;
      const otherFactor = (item.content.factors as { id: string }[]).find(
        (f) => f.id !== item.answer.topFactorId,
      )!.id;
      const corrupted = withCorruptedKey(item, (answer) => {
        answer.correctKey = otherKey;
        answer.topFactorId = otherFactor;
      });
      const verdict = verify(corrupted, {
        conclusionKey: item.answer.correctKey,
        factorPick: item.answer.topFactorId,
      });
      expect(verdict.correct, `${item.itemId} solver over key`).toBe(true);
    }
  });

  it('rejects a malformed response instead of throwing', () => {
    expectsMalformedToFail('CX-achieve-02', bank[0]!);
  });
});
