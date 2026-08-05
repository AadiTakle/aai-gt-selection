import type { ItemGenerator, ValidationIssue, ValidationResult } from '@gt/contracts';
import { contentKey } from './generator-kit.js';

const SEEDS_TO_PROBE = 240;

/**
 * Checks a generator has to pass before it can be published. Every one of these exists
 * because it catches a mistake that is cheap now and expensive after a child has seen it.
 *
 * Determinism is the load-bearing check. Session replay, auditability and the whole
 * "canonical artifact is the generator plus the seed" claim all rest on it, so it is
 * verified rather than trusted.
 */
export function validateGenerator(gen: ItemGenerator): ValidationResult {
  const issues: ValidationIssue[] = [];
  const push = (check: string, severity: ValidationIssue['severity'], message: string) =>
    issues.push({ check, severity, message });

  // --- metadata --------------------------------------------------------------
  if (!/^[a-z0-9]+(\.[a-z0-9-]+)+$/.test(gen.id)) {
    push('id-format', 'error', `id "${gen.id}" should be dotted lowercase, e.g. quant.series.arithmetic`);
  }
  if (!/^\d+\.\d+\.\d+$/.test(gen.version)) {
    push('version-format', 'error', `version "${gen.version}" is not semver`);
  }
  if (gen.ageBands.length === 0) {
    push('age-bands', 'error', 'at least one age band is required');
  }
  if (gen.construct.trim().length < 10) {
    push('construct-described', 'warning', 'construct should say what this measures, for whoever reviews the bank');
  }

  // --- render probe ----------------------------------------------------------
  let rendered = 0;
  let probeCompleted = true;
  const keyPositions = new Map<number, number>();
  let sawDuplicateOptions = false;
  let sawMissingKey = false;
  let sawTooFewOptions = false;
  const distinctItems = new Set<string>();

  for (let seed = 1; seed <= SEEDS_TO_PROBE; seed++) {
    let item;
    try {
      item = gen.render(seed);
    } catch (err) {
      push('render', 'error', `render(${seed}) threw: ${err instanceof Error ? err.message : String(err)}`);
      probeCompleted = false;
      break;
    }
    rendered++;

    if (item.options.length < 3) sawTooFewOptions = true;

    const keys = item.options.map((o) => contentKey(o.content));
    if (new Set(keys).size !== keys.length) sawDuplicateOptions = true;

    const keyIndex = item.options.findIndex((o) => o.id === item.correctOptionId);
    if (keyIndex < 0) sawMissingKey = true;
    else keyPositions.set(keyIndex, (keyPositions.get(keyIndex) ?? 0) + 1);

    // Determinism: same seed must produce byte-identical output.
    const again = gen.render(seed);
    if (JSON.stringify(again) !== JSON.stringify(item)) {
      push('determinism', 'error', `render(${seed}) is not deterministic, so sessions cannot be replayed`);
      probeCompleted = false;
      break;
    }

    distinctItems.add(
      contentKey(item.stem) + '|' + item.options.map((o) => contentKey(o.content)).sort().join('~'),
    );

    // The stem must not contain the answer verbatim, which is the classic generated-item
    // leak. Skipped for families that draw their options from the stem on purpose.
    if (!gen.selectFromStem) {
      const correct = item.options.find((o) => o.id === item.correctOptionId);
      if (correct && correct.content.kind === 'text' && item.stem.kind === 'text') {
        const answer = correct.content.text.trim();
        if (answer.length > 1 && item.stem.text.includes(answer)) {
          push('answer-leak', 'error', `render(${seed}) puts the answer "${answer}" in the stem`);
          probeCompleted = false;
          break;
        }
      }
    }
  }

  if (sawTooFewOptions) push('option-count', 'error', 'every item needs at least three options');
  if (sawDuplicateOptions) push('duplicate-options', 'error', 'some items contain two identical options');
  if (sawMissingKey) push('key-present', 'error', 'correctOptionId does not match any option');

  // --- key position balance --------------------------------------------------
  // A generator that favours one slot teaches candidates to guess it. Flagged as a warning
  // rather than an error, since with few options some imbalance is expected by chance.
  if (probeCompleted && rendered > 0 && keyPositions.size > 0) {
    const counts = [...keyPositions.values()];
    const expected = rendered / keyPositions.size;
    const worst = Math.max(...counts.map((c) => Math.abs(c - expected) / expected));
    if (worst > 0.5) {
      push(
        'key-balance',
        'warning',
        `key position is uneven across ${rendered} seeds (worst slot deviates ${Math.round(worst * 100)}% from even)`,
      );
    }
  }

  // --- family variety --------------------------------------------------------
  // A generator that only makes a handful of distinct items is a static item wearing a
  // costume, and it cannot support the never-repeat-a-form requirement.
  if (probeCompleted && rendered > 0) {
    const ratio = distinctItems.size / rendered;
    if (distinctItems.size < 20) {
      push(
        'family-size',
        'error',
        `only ${distinctItems.size} distinct items across ${rendered} seeds, too few to avoid repeats`,
      );
    } else if (ratio < 0.5) {
      push(
        'family-variety',
        'warning',
        `${distinctItems.size} distinct items across ${rendered} seeds, so forms will repeat often`,
      );
    }
  }

  // --- honesty ---------------------------------------------------------------
  if (gen.difficulty.source === 'calibrated' && gen.difficulty.n < 100) {
    push(
      'calibration-claim',
      'error',
      `difficulty claims to be calibrated on only ${gen.difficulty.n} responses`,
    );
  }
  if (gen.difficulty.source === 'assumed' && gen.difficulty.se < 0.5) {
    push(
      'assumed-precision',
      'warning',
      'an assumed difficulty should carry a wide standard error, since it is a guess',
    );
  }

  return {
    generatorId: gen.id,
    generatorVersion: gen.version,
    issues,
    publishable: !issues.some((i) => i.severity === 'error'),
  };
}
