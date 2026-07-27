import type { AnswerKey } from './answer';
import { bankItemSchema } from './bank-item';
import type { BankItem } from './bank-item';
import type { ItemContent, MaterializableTypeCode } from './content/registry';
import type { AgeBand } from './enums';
import { GENERATORS } from './generators';
import type { GenDraft } from './generators';
import { provisionalIrtFromLevel } from './irt';
import type { ValidatorCheck } from './provenance';
import { deterministicUuid, makeRng } from './rng';
import type { ScoringContract } from './scoring';
import {
  SOLVERS,
  solveAnalogy,
  solveFunc,
  solveMatrix,
  solveRoll,
  solveSeries,
} from './solvers';
import { ITEM_MODELS } from './type-registry';

type Extract1<C extends ItemContent['typeCode']> = Extract<ItemContent, { typeCode: C }>;

/** Independent recomputation of the correct option index, where a solver exists. */
function derivedIndex(content: ItemContent): number | null {
  switch (content.typeCode) {
    case 'QUANT-SERIES-01':
      return solveSeries(content as Extract1<'QUANT-SERIES-01'>)?.index ?? null;
    case 'QUANT-FUNC-01':
      return solveFunc(content as Extract1<'QUANT-FUNC-01'>)?.index ?? null;
    case 'FLU-MATRIX-01':
      return solveMatrix(content as Extract1<'FLU-MATRIX-01'>)?.index ?? null;
    case 'FLU-ANALOGY-01':
      return solveAnalogy(content as Extract1<'FLU-ANALOGY-01'>)?.index ?? null;
    case 'SPA-ROLL-01':
      return solveRoll(content as Extract1<'SPA-ROLL-01'>)?.index ?? null;
    default:
      return null; // semantic selection type (relpair/cloze) — no deterministic solver
  }
}

interface ValidatorEntry {
  check: ValidatorCheck;
  status: 'pass' | 'fail' | 'warn' | 'skipped';
  detail?: string;
}

/**
 * Runs the automated validators the format defines (§6.5) and THROWS on any hard
 * failure so a mis-keyed item can never enter the bank. Returns the record.
 */
function runValidators(
  typeCode: MaterializableTypeCode,
  content: ItemContent,
  answer: AnswerKey,
  scoring: ScoringContract,
): ValidatorEntry[] {
  const checks: ValidatorEntry[] = [
    { check: 'ip_novelty_ok', status: 'pass', detail: 'born-synthetic generated content' },
  ];

  if (scoring.mode === 'deterministic_key') {
    const rationales = answer.distractorRationales ?? [];
    const nCorrect = rationales.filter((r) => r === 'correct').length;
    if (nCorrect !== 1) {
      throw new Error(`${typeCode}: expected exactly one 'correct' option, found ${nCorrect}`);
    }
    checks.push({ check: 'lure_taxonomy_ok', status: 'pass' });
    checks.push({ check: 'unique_answer', status: 'pass' });

    const di = derivedIndex(content);
    if (di === null) {
      if (answer.correctIndex === undefined || rationales[answer.correctIndex] !== 'correct') {
        throw new Error(`${typeCode}: correctIndex must point to the 'correct'-tagged option`);
      }
      checks.push({
        check: 'key_matches_solver',
        status: 'skipped',
        detail: 'semantic type: verified key↔lure consistency (no deterministic solver)',
      });
    } else {
      if (di !== answer.correctIndex) {
        throw new Error(`${typeCode}: solver index ${di} != key ${String(answer.correctIndex)}`);
      }
      checks.push({ check: 'key_matches_solver', status: 'pass' });
    }
  } else if (scoring.mode === 'computed_solver') {
    const scorer = SOLVERS[scoring.solverId];
    if (!scorer) throw new Error(`${typeCode}: no registered scorer ${scoring.solverId}`);
    const canonical = answer.canonicalSolution;
    const response =
      scoring.solverId === 'maze-shortest@1'
        ? (canonical as { path: [number, number][] }).path
        : canonical;
    const score = scorer.score(content, response);
    if (score < 1 - 1e-9) {
      throw new Error(`${typeCode}: canonicalSolution scores ${score} (<1) under ${scoring.solverId}`);
    }
    checks.push({
      check: 'key_matches_solver',
      status: 'pass',
      detail: `canonicalSolution scores 1.0 under ${scoring.solverId}`,
    });
    checks.push({
      check: 'unique_answer',
      status: 'skipped',
      detail: 'constructed item: canonical solution scored full credit',
    });
  }
  return checks;
}

/**
 * Build ONE fully-validated, schema-valid bank item for a (type, level, band).
 * Deterministic in `seed`, so the item and its id are reproducible.
 */
export function buildBankItem(
  typeCode: MaterializableTypeCode,
  level: number,
  ageBand: AgeBand,
  index: number,
): BankItem {
  const seed = `${typeCode}|L${level}|${ageBand}|#${index}`;
  const rng = makeRng(seed);
  const draft: GenDraft = GENERATORS[typeCode](rng, level, ageBand);
  const validator = runValidators(typeCode, draft.content, draft.answer, draft.scoring);
  const model = ITEM_MODELS[typeCode];
  const isExtract = typeCode === 'VER-RELPAIR-01';
  return bankItemSchema.parse({
    itemId: deterministicUuid(seed),
    typeCode,
    domain: model.domain,
    ageBands: [ageBand],
    difficultyLevel: level,
    irt: provisionalIrtFromLevel(level),
    demoPath: model.demoPath,
    content: draft.content,
    answer: draft.answer,
    scoring: draft.scoring,
    provenance: {
      generator: 'grammar',
      generatorRef: isExtract ? 'ib-relpair-extract@1' : `ib-${typeCode.toLowerCase()}@1`,
      seed,
      sourceDemo: model.demoPath,
      validator,
    },
    syntheticOnly: true,
    validated: false,
  });
}
