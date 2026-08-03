// Reads the harness JSON produced by `ver-morpho-gate-a-runs.sh` and prints the U5 tables.
//
// No measurement happens here. Every number is lifted from a `--json` Gate A report or averaged
// across the eight seeds those reports were run at; the only arithmetic is means, standard errors
// and paired differences, which are printed rather than interpreted.
//
// Usage:  node research/exam-question-types/ver-morpho-gate-a-report.mjs [output-dir]

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const OUT = process.argv[2] ?? '/tmp/ver-morpho-gate-a';
const SEEDS = [20260730, 11, 22, 33, 44, 55, 66, 77];

/** The `--json` payload is appended after the markdown; it starts at the last bare `{` line. */
function readReports(name) {
  const path = join(OUT, `${name}.txt`);
  if (!existsSync(path)) return null;
  const lines = readFileSync(path, 'utf8').split('\n');
  const start = lines.lastIndexOf('{');
  if (start < 0) return null;
  try {
    return JSON.parse(lines.slice(start).join('\n')).gateA ?? null;
  } catch {
    return null;
  }
}

const armOf = (reports, mode) => reports?.find((r) => r.mode === mode) ?? null;
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs) => {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) * (b - m), 0) / (xs.length - 1));
};
const seOfMean = (xs) => sd(xs) / Math.sqrt(xs.length);
const f = (x, p = 4) => (Number.isFinite(x) ? x.toFixed(p) : 'n/a');

/** Every seed's report for one run family, one arm. */
function family(prefix, mode) {
  return SEEDS.map((s) => armOf(readReports(`${prefix}-seed${s}`), mode)).filter(Boolean);
}

function summarise(label, reports) {
  if (reports.length === 0) return null;
  const nullMeans = reports.map((r) => r.nullMean);
  const above = reports.map(
    (r) => Number(r.checks.find((c) => c.id === 'A2').observed.match(/([\d.]+)%/)[1]) / 100,
  );
  return {
    label,
    n: reports.length,
    nullMean: mean(nullMeans),
    nullSe: seOfMean(nullMeans),
    sesFromZero: Math.abs(mean(nullMeans)) / seOfMean(nullMeans),
    above: mean(above),
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

console.log('# VER-MORPHO-01 — Gate A, aggregated over 8 seeds (3,200 simulated children per cell)\n');

console.log('## 1. The four checks, both arms, at the four-option responder floor\n');
console.log('| arm | A1 null λ̄ | ± MC SE | SEs from 0 | A1 | A2 false `above` | A3 | A4 r / mean SE | verdict |');
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
      `${[s.a1, s.a2, s.a3, s.a4].every(Boolean) ? 'all four pass' : 'A1 and A4 fail'} |`,
  );
}

console.log('\n## 2. Is A1 the BANK? The same cohort with no bank, and on the other Stage 2 bank\n');
console.log('| pool | null λ̄ (8 seeds) | ± SE | SEs from 0 | recovery r | mean posterior SE |');
console.log('| --- | --- | --- | --- | --- | --- |');
const grid = (() => {
  // The ideal-grid row comes from `--fix-probe`, which prints it as a markdown table rather than
  // JSON, so it is parsed from the row whose label matches the shipped estimator arm.
  const path = join(OUT, 'fixprobe-0.25.txt');
  if (!existsSync(path)) return null;
  const text = readFileSync(path, 'utf8');
  const section = text.split('### ideal 0.5-point grid (no bank)')[1]?.split('###')[0] ?? '';
  const row = section.split('\n').find((l) => l.startsWith('| fit + targeting (c = 0.2) |'));
  if (!row) return null;
  const cells = row.split('|').map((c) => c.trim());
  return { nullMean: Number(cells[2]), nullSe: Number(cells[3]) };
})();

/** 30-trial recovery on the two reference pools, from `--calibrate` at the same eight seeds. */
function calibrationPool(label) {
  const r = [];
  const se = [];
  for (const s of SEEDS) {
    const path = join(OUT, `calib-seed${s}.txt`);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const m = line.match(/^\| (.+?) \| (\d+) \| ([\d.-]+) \| [\d.-]+ \| ([\d.-]+) \|/);
      if (m && m[1] === label && m[2] === '30') {
        r.push(Number(m[3]));
        se.push(Number(m[4]));
      }
    }
  }
  return r.length ? { r: mean(r), rSe: seOfMean(r), meanSe: mean(se), n: r.length } : null;
}
{
  const idealGrid = calibrationPool('ideal 0.5-point grid');
  if (grid && idealGrid) {
    console.log(
      `| ideal 0.5-point grid, NO BANK | ${f(grid.nullMean)} | ${f(grid.nullSe)} | ` +
        `${f(Math.abs(grid.nullMean) / grid.nullSe, 1)} | ${f(idealGrid.r, 3)} | ${f(idealGrid.meanSe, 3)} |`,
    );
  }
}
for (const [label, prefix] of [
  ['VER-MORPHO-01 (this type)', 'primary'],
  ['FLU-OPCHAIN-01 (matched settings)', 'opchain'],
]) {
  const s = summarise(label, family(prefix, 'consistent'));
  if (!s) continue;
  console.log(
    `| ${label} | ${f(s.nullMean)} | ${f(s.nullSe)} | ${f(s.sesFromZero, 1)} | ${f(s.r, 3)} | ${f(s.meanSe, 3)} |`,
  );
}
{
  const matrix = calibrationPool('bank FLU-MATRIX-01');
  if (matrix) {
    console.log(
      `| FLU-MATRIX-01, the wired exemplar | — | — | — | ${f(matrix.r, 3)} | ${f(matrix.meanSe, 3)} |`,
    );
  }
}
{
  const a = family('primary', 'consistent').map((r) => r.nullMean);
  const b = family('opchain', 'consistent').map((r) => r.nullMean);
  if (a.length === b.length && a.length > 1) {
    const d = a.map((x, i) => x - b[i]);
    console.log(
      `\nPaired over the same eight seeds, VER-MORPHO-01 minus FLU-OPCHAIN-01 on the null cohort: ` +
        `${f(mean(d))} ± ${f(seOfMean(d))} (t = ${f(mean(d) / seOfMean(d), 2)}).`,
    );
  }
  const spec = summarise('specified', family('specified', 'consistent'));
  if (spec) {
    console.log(
      `With the estimator's floor CORRECTLY specified at 0.25 in both roles, the same bank and the ` +
        `same cohort give λ̄ = ${f(spec.nullMean)} ± ${f(spec.nullSe)} ` +
        `(${f(spec.sesFromZero, 1)} SEs from zero, A1 ${spec.a1 ? 'PASSES' : 'still fails'}).`,
    );
  }
}

console.log('\n## 3. Comparability rows — the same bank at other responder floors\n');
console.log('| responder floor | null λ̄ | ± SE | false `above` | recovery r | A1 |');
console.log('| --- | --- | --- | --- | --- | --- |');
for (const [label, prefix] of [
  ['0.25 — four options, exact for this bank', 'primary'],
  ['0.25, estimator also 0.25', 'specified'],
  ['0.20 — five options, exact for FLU-OPCHAIN-01', 'floor0.20'],
]) {
  const s = summarise(label, family(prefix, 'consistent'));
  if (!s) continue;
  console.log(
    `| ${label} | ${f(s.nullMean)} | ${f(s.nullSe)} | ${f(100 * s.above, 1)}% | ${f(s.r, 3)} | ` +
      `${s.a1 ? 'PASS' : 'FAIL'} |`,
  );
}
{
  const zero = armOf(readReports('floor0.00-seed20260730'), 'consistent');
  if (zero) {
    console.log(
      `| 0.00 — the harness default, 1 seed | ${f(zero.nullMean)} | ${f(zero.nullSe)} | ` +
        `${zero.checks.find((c) => c.id === 'A2').observed.match(/([\d.]+)%/)[1]}% | ` +
        `${f(zero.recovery.r, 3)} | ${zero.checks.find((c) => c.id === 'A1').pass ? 'PASS' : 'FAIL'} |`,
    );
  }
}

console.log('\n## 4. A4 — the recovery ladder on this bank\'s actual grid\n');
console.log('| trials | recovery r | mean posterior SE | null λ̄ | fitted-λ SD | E-095 r | E-095 SE |');
console.log('| --- | --- | --- | --- | --- | --- | --- |');
const E095 = { 8: [0.066, 0.138], 15: [0.183, 0.101], 30: [0.448, 0.047], 45: [0.746, 0.026], 60: [0.862, 0.017] };
for (const n of [8, 15, 30, 45, 60]) {
  const s = summarise(`length ${n}`, family(`length${n}`, 'consistent'));
  if (!s) continue;
  console.log(
    `| ${n} | ${f(s.r, 3)} | ${f(s.meanSe, 3)} | ${f(s.nullMean)} | ${f(s.lambdaSd, 4)} | ` +
      `${E095[n][0]} | ${E095[n][1]} |`,
  );
}

console.log('\n## 5. A3 — headroom, by the standing a child arrives with\n');
console.log('Counts are of the fastest simulated learner cohort (λ = 0.15), 40 children per cell.\n');
console.log('| standing | bank-limited | scale-limited | blocks exhausted | A3 |');
console.log('| --- | --- | --- | --- | --- |');
for (const m of [6, 8, 10, 11, 12, 13, 14, 15, 16, 17]) {
  const rep = armOf(readReports(`standing${m}`), 'consistent');
  if (!rep) continue;
  const a3 = rep.checks.find((c) => c.id === 'A3');
  const cohort = Number(a3.observed.match(/, (\d+) children:/)[1]);
  const bank = Number(a3.observed.match(/(\d+) pinned at the pool maximum/)[1]);
  const scale = Number(a3.observed.match(/(\d+) pinned because the projection/)[1]);
  const out = Number(a3.observed.match(/(\d+) block\(s\) ran out/)[1]);
  console.log(`| ${m} | ${bank} / ${cohort} | ${scale} / ${cohort} | ${out} | ${a3.pass ? 'PASS' : 'FAIL'} |`);
}
{
  const rep = armOf(readReports('primary-seed20260730'), 'consistent');
  if (rep) {
    const a3 = rep.checks.find((c) => c.id === 'A3');
    console.log(`\nAt the realistic population the harness simulates: ${a3.observed}`);
  }
}

console.log(
  '\nCLAIM BOUNDARY. Born-synthetic against banks carrying `validated: false`. No figure above is\n' +
    'evidence about a real child, and clearing Gate A would not be clearing the gate D-S2-3 made\n' +
    'binding (STAGE2_QUESTION_DESIGN §4.1.5). Gate A is not cleared here: A1 and A4 fail.',
);
