// Gate A before and after the endogeneity remedy, on every bank a Stage 2 track has measured.
//
// Contains no measurement logic. Every figure comes out of `pnpm exam:block-harness --gate-a`, the
// shared U0 harness, invoked with existing flags; this file only chooses the invocations, repeats
// them over seeds, and aggregates. The two arms of the comparison differ in ONE flag, `--targeting`,
// so the before/after contrast cannot be confounded with anything else about the driver.
//
// WHY BOTH ARMS COME OUT OF ONE INVOCATION SET AND NOT TWO REPORTS. The published Gate A reports for
// SPA-XFORM-01, QUANT-GLYPHNUM-01 and VER-MORPHO-01 each measured A1 against a bank-free bound
// computed by a DIFFERENT probe than the one that produced their bank rows. That is defensible for
// what those reports were asking, but a before/after on a change to the estimator package needs the
// bound and the banks on identical code, so `--bank ideal-grid` runs the grid through the same
// `gateA()` path as a bank and appears here as one more pool.
//
// WHY EIGHT SEEDS. STAGE2_BANK_RECOVERY_MEASUREMENT §9 found the harness's default seed
// unrepresentative in both directions, with single-seed cells carrying roughly ±0.04 of noise on `r`.
// Eight seeds at 400 children per cell is 3,200 simulated children per number. TWO distances from
// zero are therefore reported for A1 and they answer different questions:
//
//   * `per-cell A1` is the harness's own verdict, |λ̄| <= 2 x the Monte-Carlo SE WITHIN one cell of
//     400 children. It is what "does A1 pass" means operationally, and it is what the sibling reports
//     quote a verdict from.
//   * `pooled SEs from 0` is |mean over seeds| / (SE of the eight seed means), which is roughly
//     sqrt(8) times more powerful and will therefore call a residual that the per-cell test cannot
//     see. Reporting only the first would let a remedy pass by widening its own error bar, which is
//     exactly the failure `--fix-probe`'s header warns about.
//
// THE THREE STAGE 2 BANKS ARE NOT ON THIS BRANCH and must not be copied onto it — each is owned by
// its own track. Extract them read-only first and pass the paths:
//
//   mkdir -p /tmp/gt-stage2-banks
//   git show feat/stage2-spa-xform:research/exam-question-types/banks/SPA-XFORM-01.jsonl \
//     > /tmp/gt-stage2-banks/SPA-XFORM-01.jsonl
//   git show feat/stage2-quant-glyphnum:research/exam-question-types/banks/QUANT-GLYPHNUM-01.jsonl \
//     > /tmp/gt-stage2-banks/QUANT-GLYPHNUM-01.jsonl
//   git show feat/stage2-ver-morpho:research/exam-question-types/banks/VER-MORPHO-01.jsonl \
//     > /tmp/gt-stage2-banks/VER-MORPHO-01.jsonl
//
// CLAIM BOUNDARY. Born-synthetic against `validated: false` banks. Nothing here is evidence about a
// real child; passing Gate A is not passing the gate (STAGE2_QUESTION_DESIGN §4.1.2); and Gate B has
// not run, so no absolute learning rate is licensed by anything below.
//
// Run:  node research/exam-question-types/lambda-endogeneity-gate-a.mjs [/tmp/gt-stage2-banks]
//       (about fifteen minutes; writes markdown to stdout)

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const EXTERNAL_BANK_DIR = process.argv[2] ?? '/tmp/gt-stage2-banks';

/**
 * The seed set the SPA-XFORM-01, VER-MORPHO-01 and FLU-OPCHAIN-01 reports use.
 *
 * QUANT-GLYPHNUM-01's report used a different set, so its published "before" figure is on different
 * children from the row below. The reconciliation row at the end runs its set too, rather than
 * quietly comparing across seed sets.
 */
const SEEDS = [20260730, 11, 22, 33, 44, 55, 66, 77];
const GLYPHNUM_SEEDS = [20260730, 11, 202, 3003, 40404, 555555, 6060606, 77777777];

/**
 * The pools, with the responder floor each one's item format makes exact.
 *
 * `fitFloor` is what the ESTIMATOR assumes. It equals the responder floor everywhere except
 * VER-MORPHO-01, whose items are four-option while the shipped `DEFAULT_GUESSING` is 0.2 — that gap
 * is deliberate and is the arm that bank's own Gate A report publishes, so it is carried here
 * unchanged. Changing it would make this a different measurement from the one being compared against.
 */
const POOLS = [
  { label: 'ideal grid (no bank)', ref: 'ideal-grid', guessing: 0.2, fitFloor: 0.2, options: 5 },
  { label: 'FLU-OPCHAIN-01', ref: 'FLU-OPCHAIN-01', guessing: 0.2, fitFloor: 0.2, options: 5 },
  { label: 'SPA-XFORM-01', ref: 'SPA-XFORM-01', guessing: 0.2, fitFloor: 0.2, options: 5 },
  {
    label: 'QUANT-GLYPHNUM-01',
    ref: 'QUANT-GLYPHNUM-01',
    guessing: 0.2,
    fitFloor: 0.2,
    options: 5,
  },
  { label: 'VER-MORPHO-01', ref: 'VER-MORPHO-01', guessing: 0.25, fitFloor: 0.2, options: 4 },
];

function bankArgument(ref) {
  if (ref === 'ideal-grid') return ref;
  const local = join(ROOT, 'research/exam-question-types/banks', `${ref}.jsonl`);
  if (existsSync(local)) return ref;
  const external = join(EXTERNAL_BANK_DIR, `${ref}.jsonl`);
  if (existsSync(external)) return external;
  throw new Error(
    `${ref} is on neither this branch nor ${EXTERNAL_BANK_DIR}. See the extraction commands in the ` +
      `header of this file.`,
  );
}

function harness(args) {
  try {
    return execFileSync('pnpm', ['--silent', 'exam:block-harness', '--', ...args], {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 128 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString();
    // `--gate-a` exits nonzero whenever a check fails, which is the normal case here and must not
    // abort the run: reporting the failure IS the deliverable.
  } catch (error) {
    return (error.stdout ?? '').toString();
  }
}

/** The `gateA` array the harness emits under `--json`, for the consistent arm. */
function gateAReport(pool, targeting, seed) {
  const args = [
    '--gate-a',
    '--bank',
    bankArgument(pool.ref),
    '--guessing',
    String(pool.guessing),
    '--fit-guessing',
    String(pool.fitFloor),
    '--target-guessing',
    String(pool.fitFloor),
    '--seed',
    String(seed),
    '--targeting',
    targeting,
    '--json',
  ];
  const out = harness(args);
  const start = out.indexOf('{\n  "gateA"');
  if (start < 0) throw new Error(`no JSON in harness output for ${pool.label} / ${targeting}`);
  const parsed = JSON.parse(out.slice(start));
  const report = parsed.gateA?.[0];
  if (report === undefined) throw new Error(`empty gateA report for ${pool.label}`);
  return report;
}

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs) =>
  Math.sqrt(xs.reduce((a, b) => a + (b - mean(xs)) ** 2, 0) / Math.max(1, xs.length - 1));
const seOfMean = (xs) => sd(xs) / Math.sqrt(xs.length);
const verdict = (checks, id) => checks.find((c) => c.id === id)?.pass === true;
const f = (x, places = 4) => (Number.isFinite(x) ? x.toFixed(places) : 'n/a');

function cell(pool, targeting, seeds) {
  const nullMeans = [];
  const rs = [];
  const meanSes = [];
  const fitSds = [];
  const wide = [];
  const barred = [];
  let a1PerCell = 0;
  let a3 = 0;
  let a4 = 0;
  for (const seed of seeds) {
    const report = gateAReport(pool, targeting, seed);
    nullMeans.push(report.nullMean);
    rs.push(report.recovery.r);
    meanSes.push(report.recovery.meanSe);
    fitSds.push(report.fitLambdaSd);
    wide.push(report.reportability.atWideReference);
    barred.push(report.reportability.withDeclaredFloor);
    if (verdict(report.checks, 'A1')) a1PerCell += 1;
    if (verdict(report.checks, 'A3')) a3 += 1;
    if (verdict(report.checks, 'A4')) a4 += 1;
  }
  const nullMean = mean(nullMeans);
  const nullSe = seOfMean(nullMeans);
  return {
    nullMean,
    nullSe,
    pooledZ: Math.abs(nullMean / nullSe),
    a1PerCell,
    a3,
    a4,
    r: mean(rs),
    meanSe: mean(meanSes),
    fitLambdaSd: mean(fitSds),
    reportableWide: mean(wide),
    reportableBarred: mean(barred),
    n: seeds.length,
  };
}

console.log('# Gate A, before and after the endogeneity remedy\n');
console.log(
  'Born-synthetic. Every bank carries `validated: false`; nothing here is evidence about a real\n' +
    'child, and clearing Gate A is not clearing the gate (STAGE2_QUESTION_DESIGN §4.1.2).\n',
);
console.log(
  '`before` is `--targeting adaptive`, the shipped closed loop. `after` is `--targeting scheduled`,\n' +
    'which administers from `scheduledTargetTheta` at the population rate. One flag differs. 400\n' +
    `children per cell, ${SEEDS.length} seeds, 30 trials, λ ~ N(0.06, 0.03²), θ0 ~ N(10.5, 3²), handover noise\n` +
    'SD 1.5, slope 1.0, target offset +1.\n',
);

const rows = [];
for (const pool of POOLS) {
  const before = cell(pool, 'adaptive', SEEDS);
  const after = cell(pool, 'scheduled', SEEDS);
  rows.push({ pool, before, after });
}

console.log('## A1 — a cohort that learned nothing\n');
console.log(
  '| pool | arm | null λ̄ | ± pooled SE | pooled SEs from 0 | per-cell A1 (harness verdict) |',
);
console.log('| --- | --- | --- | --- | --- | --- |');
for (const { pool, before, after } of rows) {
  for (const [name, c] of [
    ['before', before],
    ['after', after],
  ]) {
    console.log(
      `| ${pool.label} | ${name} | ${f(c.nullMean)} | ${f(c.nullSe)} | ${f(c.pooledZ, 1)} | ` +
        `${c.a1PerCell}/${c.n} ${c.a1PerCell === c.n ? 'PASS' : c.a1PerCell === 0 ? 'FAIL' : 'SPLIT'} |`,
    );
  }
}

console.log('\n## A4 — recovery and precision, which is what the remedy costs\n');
console.log(
  '| pool | arm | r (E-095: 0.448) | mean posterior SE (E-095: 0.047) | fitted-λ SD | per-cell A4 | per-cell A3 |',
);
console.log('| --- | --- | --- | --- | --- | --- | --- |');
for (const { pool, before, after } of rows) {
  for (const [name, c] of [
    ['before', before],
    ['after', after],
  ]) {
    console.log(
      `| ${pool.label} | ${name} | ${f(c.r, 3)} | ${f(c.meanSe, 3)} | ${f(c.fitLambdaSd)} | ` +
        `${c.a4}/${c.n} | ${c.a3}/${c.n} |`,
    );
  }
}

console.log('\n## Reportability — the cost A1 and A4 cannot see\n');
console.log(
  'A band is named only when posterior SE PLUS the declared contamination floor is narrower than the\n' +
    'band half-width (D-200 part 2). The remedy lowers the floor and widens the SE, so this column can\n' +
    'move against the remedy even where A1 improves. `with declared floor` is the binding one: the\n' +
    "floor declared is that arm's own A1 mean.\n",
);
console.log(
  '| pool | arm | reportable at SD 0.15 | reportable with declared floor | SE + floor | band half-width |',
);
console.log('| --- | --- | --- | --- | --- | --- |');
for (const { pool, before, after } of rows) {
  for (const [name, c] of [
    ['before', before],
    ['after', after],
  ]) {
    console.log(
      `| ${pool.label} | ${name} | ${f(100 * c.reportableWide, 1)}% | ` +
        `${f(100 * c.reportableBarred, 1)}% | ${f(c.meanSe + Math.max(0, c.nullMean), 3)} | 0.075 |`,
    );
  }
}

console.log('\n## Paired change, per pool\n');
console.log(
  '| pool | Δ null λ̄ | Δ r | Δ mean SE | Δ reportable (declared floor) | A1 per-cell before → after |',
);
console.log('| --- | --- | --- | --- | --- | --- |');
for (const { pool, before, after } of rows) {
  console.log(
    `| ${pool.label} | ${f(after.nullMean - before.nullMean)} | ${f(after.r - before.r, 3)} | ` +
      `${f(after.meanSe - before.meanSe, 3)} | ` +
      `${f(100 * (after.reportableBarred - before.reportableBarred), 1)} pp | ` +
      `${before.a1PerCell}/${before.n} → ${after.a1PerCell}/${after.n} |`,
  );
}

console.log('\n## Are the two defects separable? VER-MORPHO-01 with its floor corrected\n');
console.log(
  'VER-MORPHO-01 is the one pool whose items are four-option while the shipped estimator assumes\n' +
    'five, so it carries an E-200 FLOOR misspecification on top of the endogeneity. If the two are\n' +
    'separate defects, correcting the floor as well should take the remaining climb to the same place\n' +
    'the correctly specified pools reach, and the remedy should still be worth the same ~0.011.\n',
);
const morphoSpecified = {
  ...POOLS.find((p) => p.ref === 'VER-MORPHO-01'),
  label: 'VER-MORPHO-01 (floor specified, 0.25)',
  fitFloor: 0.25,
};
console.log('| arm | null λ̄ | ± pooled SE | pooled SEs from 0 | per-cell A1 | r | mean SE |');
console.log('| --- | --- | --- | --- | --- | --- | --- |');
for (const targeting of ['adaptive', 'scheduled']) {
  const c = cell(morphoSpecified, targeting, SEEDS);
  console.log(
    `| ${targeting === 'adaptive' ? 'before' : 'after'} | ${f(c.nullMean)} | ${f(c.nullSe)} | ` +
      `${f(c.pooledZ, 1)} | ${c.a1PerCell}/${c.n} | ${f(c.r, 3)} | ${f(c.meanSe, 3)} |`,
  );
}

console.log('\n## Reconciliation — QUANT-GLYPHNUM-01 on its own published seed set\n');
console.log(
  "Its Gate A report used a different set of eight seeds from the other three, so the row above is on\n" +
    'different simulated children from its published figure. Both are reported rather than compared\n' +
    'across seed sets.\n',
);
const glyphnum = POOLS.find((p) => p.ref === 'QUANT-GLYPHNUM-01');
console.log('| arm | null λ̄ | ± pooled SE | pooled SEs from 0 | per-cell A1 | r | mean SE |');
console.log('| --- | --- | --- | --- | --- | --- | --- |');
for (const targeting of ['adaptive', 'scheduled']) {
  const c = cell(glyphnum, targeting, GLYPHNUM_SEEDS);
  console.log(
    `| ${targeting === 'adaptive' ? 'before' : 'after'} | ${f(c.nullMean)} | ${f(c.nullSe)} | ` +
      `${f(c.pooledZ, 1)} | ${c.a1PerCell}/${c.n} | ${f(c.r, 3)} | ${f(c.meanSe, 3)} |`,
  );
}
