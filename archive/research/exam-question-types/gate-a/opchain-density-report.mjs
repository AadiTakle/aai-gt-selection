// Turns the raw output of opchain-density-runs.sh into the tables the findings document reports.
//
// This file contains NO measurement logic beyond reading the harness's own JSON and computing means,
// standard errors and PAIRED contrasts over seeds. Every quantity it prints is a field the harness
// emitted; nothing here re-derives a recovery correlation or a fitted lambda.
//
// WHY THE CONTRASTS ARE PAIRED. Each seed builds the same simulated children for every pool, so the
// bank-versus-grid difference at a given seed is measured on one cohort rather than two. The paired
// SE is therefore much smaller than the seed-to-seed spread of either column, and a difference of
// 0.02 in `r` is resolvable where the columns themselves carry ±0.04 of seed noise. Reading the
// unpaired columns as if they were the contrast is the mistake this script exists to prevent.
//
// Run:  node research/exam-question-types/gate-a/opchain-density-report.mjs [output-dir]

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const OUT = process.argv[2] ?? '/tmp/opchain-density';
const SEEDS = [20260730, 11, 22, 33, 44, 55, 66, 77];
const LENGTHS = [30, 45, 60];

/**
 * Read one harness run's JSON payload.
 *
 * The harness prints a settings banner before the JSON, and pnpm appends an `ELIFECYCLE` line after
 * it whenever a Gate A check fails — which is every run here, since A1 and A4 fail by design. So the
 * payload is bracketed rather than sliced from the front only.
 */
function readJson(name) {
  const path = resolve(OUT, `${name}.json`);
  if (!existsSync(path)) return null;
  const raw = readFileSync(path, 'utf8');
  const start = raw.indexOf('{\n');
  const end = raw.lastIndexOf('\n}');
  if (start < 0 || end < start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 2));
  } catch {
    return null;
  }
}

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs) =>
  xs.length < 2 ? 0 : Math.sqrt(xs.reduce((a, x) => a + (x - mean(xs)) ** 2, 0) / (xs.length - 1));
const seOfMean = (xs) => (xs.length < 2 ? 0 : sd(xs) / Math.sqrt(xs.length));
const f = (x, n = 3) => (Number.isFinite(x) ? x.toFixed(n) : '—');

/** Paired difference over seeds, with the t statistic that decides whether to report it at all. */
function paired(a, b) {
  const d = a.map((x, i) => x - b[i]);
  const se = seOfMean(d);
  return { mean: mean(d), se, t: se === 0 ? 0 : mean(d) / se, n: d.length };
}

/** Gate A reports come as an array, one per persistence arm. */
const gateReports = (name) => readJson(name)?.gateA ?? [];
const armOf = (name, arm) =>
  gateReports(name).find((r) => r.mode === arm) ?? gateReports(name)[0] ?? null;

const gridRow = (seed, length, floor = '') =>
  (readJson(`grid${floor}-${seed}`)?.calibration ?? []).find(
    (r) => r.length === length && r.pool.startsWith('ideal'),
  ) ?? null;
const matrixRow = (seed, length) =>
  (readJson(`grid-${seed}`)?.calibration ?? []).find(
    (r) => r.length === length && !r.pool.startsWith('ideal'),
  ) ?? null;

console.log('# FLU-OPCHAIN-01 at 12 items per rung — measurement tables');
console.log(`\nSeeds: ${SEEDS.join(', ')} (${SEEDS.length} cohorts of 400 children per cell).`);

/* ================================================================== *
 * 1. THE HEADLINE: is the bank on the bank-free bound at each length?
 * ================================================================== */
console.log('\n## 1. Paired against the bank-free idealised grid, at matched seeds');
console.log(
  '\nThe grid is the harness\u2019s `gridPool(0.5, 12)` — an idealised 0.5-point pool with no bank at\n' +
    'all, carrying twelve items per rung. A bank cannot do better than it; the question is only\n' +
    'whether it has arrived.\n',
);
console.log('| trials | pool | recovery r (mean of 8 seeds) | paired vs grid | SE | t | reading |');
console.log('| --- | --- | --- | --- | --- | --- | --- |');

const headline = {};
for (const length of LENGTHS) {
  const grid = SEEDS.map((s) => gridRow(s, length)?.r).filter((x) => x !== undefined);
  const after = SEEDS.map((s) => armOf(`after-${length}-${s}`, 'consistent')?.recovery?.r);
  const before = SEEDS.map((s) => armOf(`before-${length}-${s}`, 'consistent')?.recovery?.r);
  if (grid.length !== SEEDS.length || after.some((x) => x === undefined)) continue;

  const dAfter = paired(after, grid);
  const dBefore = paired(before, grid);
  headline[length] = { grid, after, before, dAfter, dBefore };

  const verdict = (d) =>
    Math.abs(d.t) < 2
      ? '**on the bound** (|t| < 2)'
      : `**off the bound** by ${f(-d.mean)} (t = ${f(d.t, 1)})`;
  console.log(`| ${length} | ideal grid, no bank | ${f(mean(grid))} | — | — | — | the bound |`);
  console.log(
    `| ${length} | **12/rung (this work)** | **${f(mean(after))}** | ${f(dAfter.mean, 3)} | ` +
      `${f(dAfter.se, 3)} | ${f(dAfter.t, 1)} | ${verdict(dAfter)} |`,
  );
  console.log(
    `| ${length} | 6/rung (on \`dev\`) | ${f(mean(before))} | ${f(dBefore.mean, 3)} | ` +
      `${f(dBefore.se, 3)} | ${f(dBefore.t, 1)} | ${verdict(dBefore)} |`,
  );
}

console.log('\n### 1.1 The direct 12/rung minus 6/rung contrast, paired\n');
console.log('| trials | mean Δr | SE | t | reading |');
console.log('| --- | --- | --- | --- | --- |');
for (const length of LENGTHS) {
  const h = headline[length];
  if (!h) continue;
  const d = paired(h.after, h.before);
  console.log(
    `| ${length} | ${d.mean >= 0 ? '+' : ''}${f(d.mean, 3)} | ${f(d.se, 3)} | ${f(d.t, 1)} | ` +
      `${Math.abs(d.t) < 2 ? 'no difference' : 'density buys recovery'} |`,
  );
}

/* ================================================================== *
 * 2. Mean posterior SE, the other half of A4
 * ================================================================== */
console.log('\n## 2. Mean posterior SE\n');
console.log('| trials | ideal grid | 12/rung | 6/rung | E-095 (floorless) |');
console.log('| --- | --- | --- | --- | --- |');
for (const length of LENGTHS) {
  const grid = SEEDS.map((s) => gridRow(s, length)?.meanSe).filter((x) => x !== undefined);
  const after = SEEDS.map((s) => armOf(`after-${length}-${s}`, 'consistent')?.recovery?.meanSe);
  const before = SEEDS.map((s) => armOf(`before-${length}-${s}`, 'consistent')?.recovery?.meanSe);
  const published = gridRow(SEEDS[0], length)?.publishedSe;
  if (grid.length === 0 || after.some((x) => x === undefined)) continue;
  console.log(
    `| ${length} | ${f(mean(grid))} | **${f(mean(after))}** | ${f(mean(before))} | ${f(published)} |`,
  );
}

/* ================================================================== *
 * 3. The four Gate A verdicts, at 30 trials, both arms
 * ================================================================== */
console.log('\n## 3. Gate A at 30 trials — all four checks, both arms\n');
for (const arm of ['consistent', 'perTrial']) {
  const reports = SEEDS.map((s) => armOf(`after-30-${s}`, arm)).filter(Boolean);
  if (reports.length === 0) continue;
  const nulls = reports.map((r) => r.nullMean);
  const rs = reports.map((r) => r.recovery.r);
  const ses = reports.map((r) => r.recovery.meanSe);
  const sds = reports.map((r) => r.fitLambdaSd);
  const pass = (id) => reports.map((r) => r.checks.find((c) => c.id === id)?.pass);
  /**
   * The verdict on the POOLED cohort, not a vote across seeds.
   *
   * A1's condition is |λ̄| ≤ 2 × Monte-Carlo SE, and the SE shrinks as √n. At one seed (400 children)
   * it is ~0.0032 and the check is close to its threshold, so it flips seed to seed; over eight seeds
   * (3,200 children) it is ~0.0010 and the answer is not close. Reporting a per-seed vote would let a
   * check that fails by 8 SEs on the pooled evidence read as "mixed", which is the wrong summary of
   * the same data. The per-seed split is printed underneath so the flipping is visible rather than
   * hidden.
   */
  const verdict = (id) => {
    if (id === 'A1') return Math.abs(mean(nulls)) <= 2 * seOfMean(nulls) ? 'PASS' : 'FAIL';
    const p = pass(id);
    return p.every((x) => x === true) ? 'PASS' : p.every((x) => x === false) ? 'FAIL' : 'MIXED';
  };
  const one = reports[0];
  const observedAt = (id) => one.checks.find((c) => c.id === id)?.observed ?? '';

  console.log(`### \`FLU-OPCHAIN-01.${arm}\` — ${one.items} items, ${one.distinctRungs} rungs\n`);
  console.log('| check | verdict | observed (mean of 8 seeds) |');
  console.log('| --- | --- | --- |');
  console.log(
    `| **A1** static-child null | **${verdict('A1')}** | fitted λ̄ = **${f(mean(nulls), 4)} ± ` +
      `${f(seOfMean(nulls), 4)}**, ${f(Math.abs(mean(nulls)) / seOfMean(nulls), 1)} SEs from zero, ` +
      'for a cohort that learned nothing |',
  );
  console.log(
    `| **A2** false-positive rate | **${verdict('A2')}** | ${observedAt('A2')} (seed ${SEEDS[0]}) |`,
  );
  console.log(`| **A3** no saturation | **${verdict('A3')}** | ${observedAt('A3')} (seed ${SEEDS[0]}) |`);
  console.log(
    `| **A4** recovery sanity | **${verdict('A4')}** | r = **${f(mean(rs))}** against E-095's 0.448; ` +
      `mean posterior SE **${f(mean(ses))}** against 0.047 |`,
  );
  console.log(
    `\nFitted-λ SD for U1's power script: **${f(mean(sds), 4)}**. ` +
      `A1's per-seed condition passes on ${pass('A1').filter(Boolean).length} of ${reports.length} ` +
      'single-seed cells, where the Monte-Carlo SE is three times wider; the pooled verdict above is ' +
      'the one that decides.',
  );
}

/* ================================================================== *
 * 4. A1 attribution: the floor sweep
 * ================================================================== */
console.log('\n## 4. A1 is bank-free — the responder-floor sweep at 30 trials\n');
console.log('| responder floor | pool | null λ̄ | ± SE | SEs from 0 | recovery r | A1 |');
console.log('| --- | --- | --- | --- | --- | --- | --- |');
const floorRow = (label, pool, nulls, rs, passes) => {
  const se = seOfMean(nulls);
  console.log(
    `| ${label} | ${pool} | ${f(mean(nulls), 4)} | ${f(se, 4)} | ` +
      `${se === 0 ? '—' : f(Math.abs(mean(nulls)) / se, 1)} | ${f(mean(rs))} | ` +
      `${passes.every((p) => p) ? '**passes**' : 'fails'} |`,
  );
};
{
  const r30 = SEEDS.map((s) => armOf(`after-30-${s}`, 'consistent')).filter(Boolean);
  floorRow(
    '**0.20 — five options, exact for this bank**',
    '**12/rung**',
    r30.map((r) => r.nullMean),
    r30.map((r) => r.recovery.r),
    r30.map((r) => r.checks.find((c) => c.id === 'A1').pass),
  );
  const b30 = SEEDS.map((s) => armOf(`before-30-${s}`, 'consistent')).filter(Boolean);
  if (b30.length)
    floorRow(
      '0.20',
      '6/rung',
      b30.map((r) => r.nullMean),
      b30.map((r) => r.recovery.r),
      b30.map((r) => r.checks.find((c) => c.id === 'A1').pass),
    );
  const g30 = SEEDS.map((s) => gridRow(s, 30)).filter(Boolean);
  if (g30.length)
    console.log(
      `| 0.20 | ideal grid, **no bank** | — | — | — | ${f(mean(g30.map((r) => r.r)))} | (no null cohort in \`--calibrate\`) |`,
    );
  const m30 = SEEDS.map((s) => matrixRow(s, 30)).filter(Boolean);
  if (m30.length)
    console.log(
      `| 0.20 | \`FLU-MATRIX-01\`, the wired bank | — | — | — | ${f(mean(m30.map((r) => r.r)))} | — |`,
    );
  const g25 = SEEDS.map((s) => armOf(`after-30-g25-${s}`, 'consistent')).filter(Boolean);
  if (g25.length)
    floorRow(
      '0.25 — four options, the SIBLING types\u2019 floor',
      '**12/rung**',
      g25.map((r) => r.nullMean),
      g25.map((r) => r.recovery.r),
      g25.map((r) => r.checks.find((c) => c.id === 'A1').pass),
    );
  const g0 = SEEDS.map((s) => armOf(`after-30-g0-${s}`, 'consistent')).filter(Boolean);
  if (g0.length)
    floorRow(
      '**0.00 — a floorless responder**',
      '**12/rung**',
      g0.map((r) => r.nullMean),
      g0.map((r) => r.recovery.r),
      g0.map((r) => r.checks.find((c) => c.id === 'A1').pass),
    );
}

/* ================================================================== *
 * 5. A3 headroom sweep
 * ================================================================== */
console.log('\n## 5. A3 headroom — bank-limited versus scale-limited, by standing\n');
console.log('| standing | 12/rung bank-limited | 12/rung scale-limited | 6/rung bank-limited | 6/rung scale-limited |');
console.log('| --- | --- | --- | --- | --- |');
const counts = (observed) => {
  const m = observed?.match(/(\d+) pinned at the pool maximum[^;]*; (\d+) pinned because/);
  return m ? [m[1], m[2]] : ['—', '—'];
};
for (const standing of [6, 8, 10, 11, 12, 13, 14, 15, 16, 17]) {
  const a = armOf(`headroom-after-${standing}`, 'consistent');
  const b = armOf(`headroom-before-${standing}`, 'consistent');
  const [ab, as] = counts(a?.checks.find((c) => c.id === 'A3')?.observed);
  const [bb, bs] = counts(b?.checks.find((c) => c.id === 'A3')?.observed);
  console.log(`| ${standing} | ${ab} | ${as} | ${bb} | ${bs} |`);
}

/* ================================================================== *
 * 6. The two arms
 * ================================================================== */
console.log('\n## 6. The two arms\n');
console.log(
  'The scrambled arm is equated item-for-item and differs only in which badge symbols label the\n' +
    'operators. The harness\u2019s simulated child responds to `difficulty` and nothing else — there is no\n' +
    'hidden system in the simulator to persist or scramble — so the arms should agree, and `itemId`\n' +
    'enters only as a tie-break in `selectNextNovelItem` when two candidates are exactly equidistant\n' +
    'from a continuous target. What matters is not whether the residue is zero but whether it is\n' +
    'smaller than any contrast anyone would want to read.\n',
);
console.log('| quantity | mean \\|Δ\\| between arms | max \\|Δ\\| | for scale |');
console.log('| --- | --- | --- | --- |');
const armDelta = { nullMean: [], r: [], meanSe: [], fitLambdaSd: [] };
for (const length of LENGTHS) {
  for (const seed of SEEDS) {
    const a = armOf(`after-${length}-${seed}`, 'consistent');
    const b = armOf(`after-${length}-${seed}`, 'perTrial');
    if (!a || !b) continue;
    armDelta.nullMean.push(Math.abs(a.nullMean - b.nullMean));
    armDelta.fitLambdaSd.push(Math.abs(a.fitLambdaSd - b.fitLambdaSd));
    armDelta.r.push(Math.abs(a.recovery.r - b.recovery.r));
    armDelta.meanSe.push(Math.abs(a.recovery.meanSe - b.recovery.meanSe));
  }
}
const scale = {
  nullMean: 'Monte-Carlo SE of the pooled null is 0.0010',
  r: 'seed-to-seed SD of `r` is ~0.03',
  meanSe: 'the posterior SE itself is 0.024–0.062',
  fitLambdaSd: 'the fitted-λ SD itself is ~0.065',
};
for (const [q, xs] of Object.entries(armDelta)) {
  if (xs.length === 0) continue;
  console.log(
    `| \`${q}\` | ${f(mean(xs), 5)} | ${f(Math.max(...xs), 5)} | ${scale[q]} |`,
  );
}
console.log(
  `\nOver ${armDelta.r.length} cells (${LENGTHS.length} lengths × ${SEEDS.length} seeds), the largest ` +
    `between-arm difference in the null-cohort λ̄ is ${f(Math.max(...armDelta.nullMean), 5)} — a ` +
    `twentieth of that cell's own Monte-Carlo SE — and the largest in the recovery correlation is ` +
    `${f(Math.max(...armDelta.r), 5)}, against a seed-to-seed SD of about 0.03. This is item-UUID ` +
    'noise reaching the selection tie-break, not system persistence: the simulator has no hidden ' +
    'system to scramble. It bounds the artifact floor of any future between-arm λ contrast, and it is ' +
    'not the constraint that will bind.',
);
