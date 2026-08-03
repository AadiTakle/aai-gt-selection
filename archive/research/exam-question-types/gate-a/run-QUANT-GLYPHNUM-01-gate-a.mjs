// Gate A evidence runner for QUANT-GLYPHNUM-01 (STAGE2_QUESTION_DESIGN §9.2, U5).
//
// Contains no measurement logic. Every figure it prints comes out of `pnpm exam:block-harness`,
// the shared U0 harness, invoked with existing flags; this file only chooses the invocations,
// repeats them across seeds, and aggregates. The harness is not modified — §4.1.1 requires both
// arms to be measured by the same driver, and a per-type driver would confound the contrast with
// the driver.
//
// WHY MULTIPLE SEEDS. STAGE2_BANK_RECOVERY_MEASUREMENT §9 measured the harness's default seed
// (20260730) returning the LOWEST 30-trial recovery of eight sampled, so a single-seed Gate A
// reports a draw rather than a figure. Eight seeds at 400 children per cell is 3,200 simulated
// children per number.
//
// WHY THE IDEAL GRID IS IN EVERY TABLE. A1 asks whether the BANK manufactures a climb from a static
// child. At a realistic five-option guessing floor the ESTIMATOR manufactures one on its own —
// E-200, reproduced here — so a bank's null-cohort mean is uninterpretable in isolation. The
// harness's `--fix-probe` runs an idealised 0.5-point grid with no bank involved alongside whatever
// bank is named, at the same seed and therefore over the same simulated children, which makes the
// difference a PAIRED contrast and the only form in which A1 attributes anything to the bank.
//
// FLU-OPCHAIN-01 is carried as the second comparison for one specific question: §5 of that document
// conjectured, untested, that its 6-items-per-rung density is why it falls behind the ideal grid at
// 45 and 60 trials. This bank is built at 12 per rung, matching the grid, so the two banks against
// the grid at three block lengths is that conjecture as a measurement.
//
// CLAIM BOUNDARY. Born-synthetic against `validated: false` banks. Nothing here is evidence about a
// real child, and clearing Gate A is not clearing the gate (§4.1.2).
//
// Run:  node research/exam-question-types/gate-a/run-QUANT-GLYPHNUM-01-gate-a.mjs
//       (about six minutes; writes a markdown report to stdout)

import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const SEEDS = [20260730, 11, 202, 3003, 40404, 555555, 6060606, 77777777];
const BANKS = ['QUANT-GLYPHNUM-01', 'FLU-OPCHAIN-01'];

function harness(args) {
  return execFileSync('pnpm', ['exam:block-harness', '--', ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    // `--gate-a` exits nonzero when a check fails, which is the normal case here and must not abort
    // the run: reporting the failure IS the deliverable.
    stdio: ['ignore', 'pipe', 'ignore'],
  }).toString();
}

function harnessAllowingFailure(args) {
  try {
    return harness(args);
  } catch (e) {
    return (e.stdout ?? '').toString();
  }
}

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs) => {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
};
const seOfMean = (xs) => sd(xs) / Math.sqrt(xs.length);
const f = (x, p = 4) => (Number.isFinite(x) ? x.toFixed(p) : 'n/a');

/**
 * Pull the harness's `--json` payload out of a run that also printed prose and, when a Gate A check
 * failed, a trailing `ELIFECYCLE` line from pnpm. Brace-balanced rather than "everything after the
 * marker", because the failing runs are the ones this report is about.
 */
function extractJson(out) {
  const start = out.indexOf('{\n  "gateA"');
  if (start < 0) throw new Error('harness produced no --json payload');
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < out.length; i += 1) {
    const ch = out[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (ch === '"') inString = !inString;
    if (inString) continue;
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return JSON.parse(out.slice(start, i + 1));
    }
  }
  throw new Error('harness --json payload is not brace-balanced');
}

/* -------------------------------------------------------------------------- *
 * 1. Gate A itself, both arms, at both floors, over eight seeds.
 * -------------------------------------------------------------------------- */
function gateARuns(bank, guessing) {
  const rows = [];
  for (const seed of SEEDS) {
    const out = harnessAllowingFailure([
      '--gate-a',
      '--bank',
      bank,
      '--guessing',
      String(guessing),
      '--seed',
      String(seed),
      '--json',
    ]);
    const json = extractJson(out);
    for (const report of json.gateA) {
      rows.push({
        seed,
        mode: report.mode,
        nullMean: report.nullMean,
        nullSe: report.nullSe,
        checks: Object.fromEntries(report.checks.map((c) => [c.id, c])),
        recovery: report.recovery,
        fitLambdaSd: report.fitLambdaSd,
      });
    }
  }
  return rows;
}

/* -------------------------------------------------------------------------- *
 * 2. Paired against the bank-free ideal grid, from `--fix-probe`.
 * -------------------------------------------------------------------------- */
const ARMS = ['fit + targeting (c = 0.2)', 'fit + targeting, 45 trials', 'fit + targeting, 60 trials'];

function fixProbeRuns(bank) {
  const rows = [];
  for (const seed of SEEDS) {
    const out = harnessAllowingFailure([
      '--fix-probe',
      '--bank',
      bank,
      '--guessing',
      '0.2',
      '--seed',
      String(seed),
    ]);
    let pool = null;
    for (const line of out.split('\n')) {
      const heading = line.match(/^### (.+)$/);
      if (heading) {
        pool = heading[1].startsWith('ideal') ? 'grid' : 'bank';
        continue;
      }
      if (pool === null || !line.startsWith('| ')) continue;
      const cells = line.split('|').map((c) => c.trim());
      const arm = cells[1];
      if (!ARMS.includes(arm)) continue;
      rows.push({
        seed,
        pool,
        arm,
        nullMean: Number(cells[2]),
        r: Number(cells[5]),
        meanSe: Number(cells[6]),
      });
    }
  }
  return rows;
}

/* -------------------------------------------------------------------------- *
 * Report
 * -------------------------------------------------------------------------- */
console.log(`# Gate A evidence — QUANT-GLYPHNUM-01\n`);
console.log(
  `${SEEDS.length} seeds x 400 children per cell = ${400 * SEEDS.length} simulated children per ` +
    `figure. Harness defaults otherwise: 30 trials, lambda ~ N(0.06, 0.03^2), theta0 ~ N(10.5, 3^2),\n` +
    `handover-noise SD 1.5, slope 1.0, target offset +1, estimator floor DEFAULT_GUESSING = 0.2 in\n` +
    `both the readout fit and nextTargetTheta.\n`,
);

for (const guessing of [0.2, 0]) {
  const rows = gateARuns('QUANT-GLYPHNUM-01', guessing);
  console.log(
    `\n## Gate A at a responder guessing floor of ${guessing}` +
      `${guessing === 0.2 ? ' — a real five-option item' : ' — the harness default, no floor'}\n`,
  );
  console.log('| arm | A1 null lambda-bar | +/- SE of that mean | SEs from zero | A1 | A2 false `above` | A3 | A4 r | A4 mean SE | fitted-lambda SD |');
  console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const mode of ['consistent', 'perTrial']) {
    const arm = rows.filter((r) => r.mode === mode);
    const nulls = arm.map((r) => r.nullMean);
    const m = mean(nulls);
    const se = seOfMean(nulls);
    const above = arm.map((r) => r.checks.A2.observed.match(/([\d.]+)% of static/)[1]).map(Number);
    const a1Pass = arm.filter((r) => r.checks.A1.pass).length;
    const a2Pass = arm.filter((r) => r.checks.A2.pass).length;
    const a3Pass = arm.filter((r) => r.checks.A3.pass).length;
    console.log(
      `| ${mode} | ${f(m)} | ${f(se)} | ${f(Math.abs(m) / se, 1)} | ` +
        `${a1Pass}/${arm.length} pass | ${f(mean(above), 1)}% (${a2Pass}/${arm.length} pass) | ` +
        `${a3Pass}/${arm.length} pass | ${f(mean(arm.map((r) => r.recovery.r)), 3)} | ` +
        `${f(mean(arm.map((r) => r.recovery.meanSe)), 3)} | ${f(mean(arm.map((r) => r.fitLambdaSd)))} |`,
    );
  }
  const sample = rows.find((r) => r.mode === 'consistent');
  console.log(`\n  A3 detail (identical across seeds in kind): ${sample.checks.A3.observed}`);
}

console.log(`\n## A1 attribution — paired against a bank-free ideal grid\n`);
console.log(
  'Same seed builds the same simulated children for both pools, so these differences are paired\n' +
    'and much tighter than the columns suggest. A1 asks whether the BANK manufactures a climb; the\n' +
    'grid row is what the estimator manufactures with no bank involved at all.\n',
);
const probes = Object.fromEntries(BANKS.map((b) => [b, fixProbeRuns(b)]));
console.log('| quantity, 30 trials | ideal grid | QUANT-GLYPHNUM-01 | FLU-OPCHAIN-01 |');
console.log('| --- | --- | --- | --- |');
const at = (bank, pool, arm, field) =>
  probes[bank].filter((r) => r.pool === pool && r.arm === arm).map((r) => r[field]);
const arm30 = ARMS[0];
console.log(
  `| null-cohort lambda-bar | ${f(mean(at('QUANT-GLYPHNUM-01', 'grid', arm30, 'nullMean')))} | ` +
    `${f(mean(at('QUANT-GLYPHNUM-01', 'bank', arm30, 'nullMean')))} | ` +
    `${f(mean(at('FLU-OPCHAIN-01', 'bank', arm30, 'nullMean')))} |`,
);
for (const bank of BANKS) {
  const diffs = at(bank, 'bank', arm30, 'nullMean').map(
    (v, i) => v - at(bank, 'grid', arm30, 'nullMean')[i],
  );
  const m = mean(diffs);
  const se = seOfMean(diffs);
  console.log(
    `| paired null-lambda excess of ${bank} over the grid | — | ` +
      `${bank === 'QUANT-GLYPHNUM-01' ? `${f(m)} +/- ${f(se)} (t = ${f(m / se, 2)})` : '—'} | ` +
      `${bank === 'FLU-OPCHAIN-01' ? `${f(m)} +/- ${f(se)} (t = ${f(m / se, 2)})` : '—'} |`,
  );
}

console.log(`\n## A4 and the item-density conjecture\n`);
console.log(
  'STAGE2_BANK_RECOVERY_MEASUREMENT §5 conjectured, and did not test, that FLU-OPCHAIN-01 falls\n' +
    'behind the ideal grid at 45 and 60 trials because it carries 6 items per 0.5-point rung against\n' +
    "the grid's 12. QUANT-GLYPHNUM-01 is built at 12. Recovery r, mean of eight seeds:\n",
);
console.log('| trials | ideal grid | QUANT-GLYPHNUM-01 (12/rung) | FLU-OPCHAIN-01 (6/rung) |');
console.log('| --- | --- | --- | --- |');
for (const [label, arm] of [
  ['30', ARMS[0]],
  ['45', ARMS[1]],
  ['60', ARMS[2]],
]) {
  console.log(
    `| ${label} | ${f(mean(at('QUANT-GLYPHNUM-01', 'grid', arm, 'r')), 3)} | ` +
      `${f(mean(at('QUANT-GLYPHNUM-01', 'bank', arm, 'r')), 3)} | ` +
      `${f(mean(at('FLU-OPCHAIN-01', 'bank', arm, 'r')), 3)} |`,
  );
}
console.log('\n| paired r difference against the grid | 30 | 45 | 60 |');
console.log('| --- | --- | --- | --- |');
for (const bank of BANKS) {
  const cells = [ARMS[0], ARMS[1], ARMS[2]].map((arm) => {
    const diffs = at(bank, 'bank', arm, 'r').map((v, i) => v - at(bank, 'grid', arm, 'r')[i]);
    const m = mean(diffs);
    const se = seOfMean(diffs);
    return `${m >= 0 ? '+' : ''}${f(m, 3)} (t = ${f(m / se, 1)})`;
  });
  console.log(`| ${bank} | ${cells.join(' | ')} |`);
}

console.log(
  '\nNOT GATED. Gate A is a check that the pipeline does not manufacture lambda out of nothing, not\n' +
    'evidence that the block measures learning. Gate B needs ~128 real children (§4.1.3) and no\n' +
    'synthetic run substitutes for them.',
);
