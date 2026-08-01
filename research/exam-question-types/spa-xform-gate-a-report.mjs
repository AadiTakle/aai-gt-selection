// Reads what `spa-xform-gate-a-runs.sh` captured and prints the U5 tables.
//
// No measurement happens here. Every number is lifted from a `--json` Gate A report or from a
// `--fix-probe` / `--calibrate` markdown table, then averaged across the eight seeds those runs
// were made at; the only arithmetic is means, standard errors and paired differences, which are
// printed rather than interpreted.
//
// The paired contrasts are the point of the report. Because `--fix-probe` prices the bank-free
// ideal grid, this bank and the frozen-difficulty diagnostic inside ONE invocation, looping it over
// the seeds gives all three on identical cohorts — so the differences below are within-seed
// differences and their standard errors are paired, not pooled.
//
// Usage:  node research/exam-question-types/spa-xform-gate-a-report.mjs [output-dir]

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const OUT = process.argv[2] ?? '/tmp/spa-xform-gate-a';
const SEEDS = [20260730, 11, 22, 33, 44, 55, 66, 77];

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs) => {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) * (b - m), 0) / (xs.length - 1));
};
const seOfMean = (xs) => sd(xs) / Math.sqrt(xs.length);
const f = (x, p = 4) => (Number.isFinite(x) ? x.toFixed(p) : 'n/a');

const readText = (name) => {
  const path = join(OUT, `${name}.txt`);
  return existsSync(path) ? readFileSync(path, 'utf8') : null;
};

/** The `--json` payload is appended after the markdown; it starts at the last bare `{` line. */
function readReports(name) {
  const text = readText(name);
  if (text === null) return null;
  const lines = text.split('\n');
  const start = lines.lastIndexOf('{');
  if (start < 0) return null;
  try {
    return JSON.parse(lines.slice(start).join('\n')).gateA ?? null;
  } catch {
    return null;
  }
}

const armOf = (reports, mode) => reports?.find((r) => r.mode === mode) ?? null;
const family = (prefix, mode) =>
  SEEDS.map((s) => armOf(readReports(`${prefix}-seed${s}`), mode)).filter(Boolean);

const aboveRate = (report) =>
  Number(report.checks.find((c) => c.id === 'A2').observed.match(/([\d.]+)%/)[1]) / 100;

function summarise(label, reports) {
  if (reports.length === 0) return null;
  const nullMeans = reports.map((r) => r.nullMean);
  return {
    label,
    n: reports.length,
    nullMeans,
    nullMean: mean(nullMeans),
    nullSe: seOfMean(nullMeans),
    sesFromZero: Math.abs(mean(nullMeans)) / seOfMean(nullMeans),
    above: mean(reports.map(aboveRate)),
    r: mean(reports.map((r) => r.recovery.r)),
    meanSe: mean(reports.map((r) => r.recovery.meanSe)),
    attenuation: mean(reports.map((r) => r.recovery.attenuationSlope)),
    lambdaSd: mean(reports.map((r) => r.fitLambdaSd)),
    a1: reports.every((r) => r.checks.find((c) => c.id === 'A1').pass),
    a2: reports.every((r) => r.checks.find((c) => c.id === 'A2').pass),
    a3: reports.every((r) => r.checks.find((c) => c.id === 'A3').pass),
    a4: reports.every((r) => r.checks.find((c) => c.id === 'A4').pass),
  };
}

/**
 * One row of a `--fix-probe` table, as `{nullMean, above, r, meanSe, attenuation}`.
 *
 * `pool` is the `### heading` the row sits under and `arm` is its first cell. Both are matched by
 * prefix so a label edit in the harness surfaces as a missing row rather than a wrong number.
 */
function fixProbeRow(seed, pool, arm) {
  const text = readText(`fixprobe-seed${seed}`);
  if (text === null) return null;
  let inPool = false;
  for (const line of text.split('\n')) {
    if (line.startsWith('### ')) inPool = line.slice(4).trim() === pool;
    if (!inPool || !line.startsWith('| ')) continue;
    const cells = line.split('|').map((c) => c.trim());
    if (cells[1] !== arm) continue;
    return {
      nullMean: Number(cells[2]),
      above: Number(String(cells[4]).replace('%', '')) / 100,
      r: Number(cells[5]),
      meanSe: Number(cells[6]),
      attenuation: Number(cells[7]),
    };
  }
  return null;
}

const fixProbeSeries = (pool, arm) =>
  SEEDS.map((s) => fixProbeRow(s, pool, arm)).filter((row) => row !== null);

const GRID_POOL = 'ideal 0.5-point grid (no bank)';
const BANK_POOL = 'SPA-XFORM-01';
const ARM_PRIMARY = 'fit + targeting (c = 0.2)';
const ARM_FROZEN = 'DIAGNOSTIC frozen target, c = 0.2';
const ARM_MISSPEC = 'status quo (c = 0 both)';
const ARM_FOUR_OPTION = 'c = 0.2 assumed, 4-option truth (0.25)';

/** One row of a `--calibrate` table at a given block length. */
function calibrateRow(seed, pool, length) {
  const text = readText(`calib-seed${seed}`);
  if (text === null) return null;
  for (const line of text.split('\n')) {
    if (!line.startsWith('| ')) continue;
    const cells = line.split('|').map((c) => c.trim());
    if (cells[1] !== pool || Number(cells[2]) !== length) continue;
    return { r: Number(cells[3]), meanSe: Number(cells[5]) };
  }
  return null;
}

/** Paired difference over the seeds, with its paired SE and t. */
function paired(a, b) {
  const n = Math.min(a.length, b.length);
  const d = Array.from({ length: n }, (_, i) => a[i] - b[i]);
  const se = seOfMean(d);
  return { mean: mean(d), se, t: mean(d) / se, n };
}

console.log('# SPA-XFORM-01 — Gate A, aggregated over 8 seeds (3,200 simulated children per cell)\n');
console.log(
  'Responder floor 0.20 throughout unless a row says otherwise: this bank is 234/234 FIVE-option,\n' +
    'so 0.20 is the exact chance rate for it, and it is also the shipped `DEFAULT_GUESSING`, which\n' +
    'means the estimator is CORRECTLY SPECIFIED here in both roles.\n',
);

/* -------------------------------------------------------------------------- */
console.log('## 1. The four checks, both arms\n');
console.log(
  '| arm | A1 null λ̄ | ± MC SE | SEs from 0 | A1 | A2 false `above` | A3 | A4 r / mean SE | fitted-λ SD |',
);
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
const primary = {};
for (const mode of ['consistent', 'perTrial']) {
  const s = summarise(mode, family('primary', mode));
  primary[mode] = s;
  if (!s) continue;
  console.log(
    `| ${mode} | ${f(s.nullMean)} | ${f(s.nullSe)} | ${f(s.sesFromZero, 1)} | ` +
      `${s.a1 ? 'PASS' : '**FAIL**'} | ${f(100 * s.above, 1)}% (${s.a2 ? 'PASS' : 'FAIL'}) | ` +
      `${s.a3 ? 'PASS' : 'FAIL'} | ${f(s.r, 3)} / ${f(s.meanSe, 3)} (${s.a4 ? 'PASS' : '**FAIL**'}) | ` +
      `${f(s.lambdaSd)} |`,
  );
}

/* -------------------------------------------------------------------------- */
console.log('\n## 2. THE ATTRIBUTION — where this bank sits against the bank-free bound\n');
console.log('Every row is the same λ_true = 0 cohort at the same eight seeds.\n');

const gridPrimary = fixProbeSeries(GRID_POOL, ARM_PRIMARY);
const bankPrimary = fixProbeSeries(BANK_POOL, ARM_PRIMARY);
const gridFrozen = fixProbeSeries(GRID_POOL, ARM_FROZEN);
const bankFrozen = fixProbeSeries(BANK_POOL, ARM_FROZEN);
const opchain = summarise('FLU-OPCHAIN-01', family('opchain', 'consistent'));

const nullOf = (rows) => rows.map((r) => r.nullMean);
const row = (label, xs, note) => {
  if (xs.length === 0) return;
  const m = mean(xs);
  const se = seOfMean(xs);
  console.log(
    `| ${label} | ${f(m)} | ${f(se)} | ${f(Math.abs(m) / se, 1)} | ${Math.abs(m) <= 2 * se ? 'passes' : 'fails'} | ${note} |`,
  );
};

console.log('| pool | null λ̄ | ± SE | SEs from 0 | A1 | what it isolates |');
console.log('| --- | --- | --- | --- | --- | --- |');
row('ideal 0.5-point grid, **no bank at all**', nullOf(gridPrimary), 'the estimator + the loop, alone');
row(`**${BANK_POOL}**`, nullOf(bankPrimary), 'this bank');
if (primary.consistent) {
  row('`SPA-XFORM-01`, via the Gate A path', primary.consistent.nullMeans, 'the same cell, other code path');
}
if (opchain) row('`FLU-OPCHAIN-01`, matched settings', opchain.nullMeans, 'the first Stage 2 bank');
row(`**${BANK_POOL}**, served difficulty **frozen**`, nullOf(bankFrozen), 'the loop removed');
row('ideal grid, served difficulty **frozen**', nullOf(gridFrozen), 'the loop removed, no bank');

console.log('\n| paired contrast, 8 seeds | mean | SE | t | reading |');
console.log('| --- | --- | --- | --- | --- |');
const contrast = (label, a, b) => {
  if (a.length === 0 || b.length === 0) return;
  const p = paired(a, b);
  const verdict = Math.abs(p.t) < 2 ? 'no difference' : 'differs';
  console.log(`| ${label} | ${f(p.mean)} | ${f(p.se)} | ${f(p.t, 2)} | ${verdict} |`);
};
contrast(
  '`SPA-XFORM-01` − ideal grid (**the bank-free bound**)',
  nullOf(bankPrimary),
  nullOf(gridPrimary),
);
if (opchain) {
  contrast('`SPA-XFORM-01` − `FLU-OPCHAIN-01`', nullOf(bankPrimary), opchain.nullMeans);
}
contrast('`SPA-XFORM-01` − itself with difficulty frozen', nullOf(bankPrimary), nullOf(bankFrozen));

/* -------------------------------------------------------------------------- */
console.log('\n## 3. Comparability — the same bank at other responder floors\n');
console.log('| responder floor | null λ̄ | ± SE | SEs from 0 | false `above` | recovery r | A1 |');
console.log('| --- | --- | --- | --- | --- | --- | --- |');
const floorRow = (label, s) => {
  if (!s) return;
  console.log(
    `| ${label} | ${f(s.nullMean)} | ${f(s.nullSe)} | ${f(s.sesFromZero, 1)} | ` +
      `${f(100 * s.above, 1)}% | ${f(s.r, 3)} | ${s.a1 ? 'pass' : 'FAIL'} |`,
  );
};
floorRow('**0.20 — five options, exact for this bank**', primary.consistent);
floorRow('0.25 — four options, exact for `VER-MORPHO-01`', summarise('0.25', family('floor0.25', 'consistent')));
floorRow('0.00 — the harness default, 1 seed', summarise('0.00', [armOf(readReports('floor0.00-seed20260730'), 'consistent')].filter(Boolean)));

const misspec = fixProbeSeries(BANK_POOL, ARM_MISSPEC);
const fourOpt = fixProbeSeries(BANK_POOL, ARM_FOUR_OPTION);
console.log('\nAnd the estimator variants on the same bank, from the same probe:\n');
console.log('| estimator | responder floor | null λ̄ | ± SE | false `above` | recovery r |');
console.log('| --- | --- | --- | --- | --- | --- |');
const armRow = (label, floor, rows) => {
  if (rows.length === 0) return;
  console.log(
    `| ${label} | ${floor} | ${f(mean(nullOf(rows)))} | ${f(seOfMean(nullOf(rows)))} | ` +
      `${f(100 * mean(rows.map((x) => x.above)), 1)}% | ${f(mean(rows.map((x) => x.r)), 3)} |`,
  );
};
armRow('shipped `DEFAULT_GUESSING = 0.2`, both roles (**correct here**)', '0.20', bankPrimary);
armRow('pre-D-200 `guessing = 0`, both roles (misspecified)', '0.20', misspec);
armRow('shipped 0.2, four-option responder (misspecified by 0.05)', '0.25', fourOpt);

/* -------------------------------------------------------------------------- */
console.log('\n### 3.1 The convergence, at every floor this run measured\n');
console.log(
  'The grid and this bank are measured here over the same eight seeds. The two sibling banks are\n' +
    'quoted from their own reports and are not re-measured by this script.\n',
);
console.log('| responder floor | ideal grid, **no bank** | `SPA-XFORM-01` | paired difference | t |');
console.log('| --- | --- | --- | --- | --- |');
const convergence = [
  ['0.167 (six-option)', 'c = 0.2 assumed, 6-option truth (0.167)'],
  ['**0.20 (five-option, exact here)**', ARM_PRIMARY],
  ['0.25 (four-option)', ARM_FOUR_OPTION],
];
for (const [label, arm] of convergence) {
  const g = nullOf(fixProbeSeries(GRID_POOL, arm));
  const b = nullOf(fixProbeSeries(BANK_POOL, arm));
  if (g.length === 0 || b.length === 0) continue;
  const p = paired(b, g);
  console.log(
    `| ${label} | ${f(mean(g))} ± ${f(seOfMean(g))} | ${f(mean(b))} ± ${f(seOfMean(b))} | ` +
      `${f(p.mean)} ± ${f(p.se)} | ${f(p.t, 2)} |`,
  );
}

/* -------------------------------------------------------------------------- */
console.log('\n## 4. A3 — the headroom sweep\n');
console.log('| standing | bank-limited | scale-limited | blocks exhausted |');
console.log('| --- | --- | --- | --- |');
for (const m of [6, 8, 10, 11, 12, 13, 14, 15, 16, 17]) {
  const report = armOf(readReports(`standing${m}`), 'consistent');
  if (!report) continue;
  const observed = report.checks.find((c) => c.id === 'A3').observed;
  const bank = observed.match(/(\d+) pinned at the pool maximum/)?.[1] ?? '?';
  const scale = observed.match(/(\d+) pinned because the projection/)?.[1] ?? '?';
  const exhausted = observed.match(/(\d+) block\(s\) ran out/)?.[1] ?? '?';
  const n = observed.match(/(\d+) children:/)?.[1] ?? '?';
  console.log(`| ${m} | ${bank} / ${n} | ${scale} / ${n} | ${exhausted} |`);
}

/* -------------------------------------------------------------------------- */
console.log('\n## 5. A4 — the recovery ladder by block length\n');
console.log('| trials | recovery r | mean posterior SE | null λ̄ | fitted-λ SD | E-095 r | E-095 SE |');
console.log('| --- | --- | --- | --- | --- | --- | --- |');
const E095 = { 8: [0.066, 0.138], 15: [0.183, 0.101], 30: [0.448, 0.047], 45: [0.746, 0.026], 60: [0.862, 0.017] };
for (const n of [8, 15, 30, 45, 60]) {
  const s = summarise(`${n}`, family(`length${n}`, 'consistent'));
  if (!s) continue;
  const bold = n === 30 ? '**' : '';
  console.log(
    `| ${bold}${n}${bold} | ${bold}${f(s.r, 3)}${bold} | ${bold}${f(s.meanSe, 3)}${bold} | ` +
      `${bold}${f(s.nullMean)}${bold} | ${bold}${f(s.lambdaSd)}${bold} | ${E095[n][0]} | ${E095[n][1]} |`,
  );
}

console.log('\nAnd the pool comparison at 30 trials, same floor, same eight seeds:\n');
console.log('| pool | recovery r | mean posterior SE |');
console.log('| --- | --- | --- |');
const calibSeries = (pool) => SEEDS.map((s) => calibrateRow(s, pool, 30)).filter(Boolean);
const calibRow = (label, pool) => {
  const rows = calibSeries(pool);
  if (rows.length === 0) return;
  console.log(`| ${label} | ${f(mean(rows.map((x) => x.r)), 3)} | ${f(mean(rows.map((x) => x.meanSe)), 3)} |`);
};
calibRow('ideal 0.5-point grid, no bank', 'ideal 0.5-point grid');
if (primary.consistent) {
  console.log(`| **\`SPA-XFORM-01\`** | **${f(primary.consistent.r, 3)}** | **${f(primary.consistent.meanSe, 3)}** |`);
}
if (opchain) console.log(`| \`FLU-OPCHAIN-01\` | ${f(opchain.r, 3)} | ${f(opchain.meanSe, 3)} |`);
calibRow('`FLU-MATRIX-01`, the wired exemplar', 'bank FLU-MATRIX-01');

/* -------------------------------------------------------------------------- */
if (primary.consistent) {
  const sdLambda = primary.consistent.lambdaSd;
  console.log('\n## 6. The figure U1\'s power script needs\n');
  console.log(
    `  fitted-λ SD at 30 trials on this bank: **${f(sdLambda)}**, against §4.1.3's assumed 0.06.\n` +
      `  On that section's own arithmetic (n per arm ≈ 15.7/g²) the sample size for a given ABSOLUTE\n` +
      `  λ separation scales by (SD/0.06)² = **${f((sdLambda / 0.06) ** 2, 2)}×**.`,
  );
}
