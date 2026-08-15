/**
 * Measures what `packages/exam-scoring` recovers from a converged adaptive battery, under each
 * available bracketing mode (D-024 evidence).
 *
 * The engine and the scorer are deliberately independent packages (BUILD_PLAN §7), so this lives
 * at the repo root rather than inside either one: it drives the real registry and banks through
 * `exam-engine`'s simulation harness, then scores the resulting trace with `exam-scoring`.
 *
 * Everything here is born-synthetic. The simulated child is a deterministic threshold responder
 * against uncalibrated banks, so these are RECOVERY results (does the scorer read back the ability
 * the trace encodes), not psychometric validity.
 *
 * Usage: pnpm exam:bracketing
 */
import {
  loadRealBanks,
  runRealBankSession,
  type TrueTheta,
} from '../packages/exam-engine/src/testing/real-bank';
import type { AgeBand, Area } from '../packages/exam-engine/src/types';
import {
  DEFAULT_ABILITY_BRACKETING,
  DEFAULT_EXAM_POLICY,
  scoreExam,
} from '../packages/exam-scoring/src';
import type { ExamPolicy } from '../packages/exam-scoring/src/policy';
import type { ScoredItem as ScoringItem } from '../packages/exam-scoring/src/types';

const AREAS: readonly Area[] = ['fluid_reasoning', 'verbal', 'quantitative', 'spatial'];

const ABILITY_POLICY: ExamPolicy = {
  ...DEFAULT_EXAM_POLICY,
  id: 'exam-scoring-ability-bracket-v1',
  bracketing: {
    ...DEFAULT_EXAM_POLICY.bracketing,
    mode: 'ability',
    ability: DEFAULT_ABILITY_BRACKETING,
  },
};

interface Profile {
  readonly name: string;
  readonly band: AgeBand;
  readonly theta: TrueTheta;
  /** True ability summarised for the table; null for the off-scale responders. */
  readonly trueMean: number | null;
}

function flat(band: AgeBand, ability: number): Profile {
  return {
    name: `equal ability ${ability}`,
    band,
    theta: {
      fluid_reasoning: ability,
      verbal: ability,
      quantitative: ability,
      spatial: ability,
    },
    trueMean: ability,
  };
}

const EQUAL_ABILITY: readonly Profile[] = [3, 5, 7, 9, 11, 13, 15, 17, 19].map((a) =>
  flat('4-5', a),
);

const EXTRA_PROFILES: readonly Profile[] = [
  {
    name: 'unequal across areas (14/8/11/5)',
    band: '4-5',
    theta: { fluid_reasoning: 14, verbal: 8, quantitative: 11, spatial: 5 },
    trueMean: 9.5,
  },
  {
    name: 'unequal across areas (18/16/17/15)',
    band: '4-5',
    theta: { fluid_reasoning: 18, verbal: 16, quantitative: 17, spatial: 15 },
    trueMean: 16.5,
  },
  {
    name: 'unequal across areas (5/4/6/3)',
    band: '4-5',
    theta: { fluid_reasoning: 5, verbal: 4, quantitative: 6, spatial: 3 },
    trueMean: 4.5,
  },
  {
    name: 'off-scale high (all correct)',
    band: '4-5',
    theta: { fluid_reasoning: 99, verbal: 99, quantitative: 99, spatial: 99 },
    trueMean: null,
  },
  {
    name: 'off-scale low (all wrong)',
    band: '4-5',
    theta: { fluid_reasoning: -99, verbal: -99, quantitative: -99, spatial: -99 },
    trueMean: null,
  },
  {
    name: 'above-level seed, low ability (8/7/9/6)',
    band: 'above-level',
    theta: { fluid_reasoning: 8, verbal: 7, quantitative: 9, spatial: 6 },
    trueMean: 7.5,
  },
  {
    name: 'above-level seed, high ability (18/17/18/16)',
    band: 'above-level',
    theta: { fluid_reasoning: 18, verbal: 17, quantitative: 18, spatial: 16 },
    trueMean: 17.25,
  },
  {
    name: '2-3 seed, equal ability 7',
    band: '2-3',
    theta: { fluid_reasoning: 7, verbal: 7, quantitative: 7, spatial: 7 },
    trueMean: 7,
  },
  {
    name: '6-8 seed, equal ability 19',
    band: '6-8',
    theta: { fluid_reasoning: 19, verbal: 19, quantitative: 19, spatial: 19 },
    trueMean: 19,
  },
];

interface Row {
  readonly profile: Profile;
  readonly items: number;
  readonly accuracy: number;
  readonly engineMean: number;
  readonly accuracyComposite: number;
  readonly abilityComposite: number;
  readonly accuracyPerArea: readonly number[];
  readonly abilityPerArea: readonly number[];
  readonly enginePerArea: readonly number[];
}

const real = loadRealBanks();

function run(profile: Profile): Row {
  const { state, trace } = runRealBankSession(
    profile.band,
    profile.theta,
    { hardItemCap: 400 },
    real,
  );
  const items = trace as unknown as readonly ScoringItem[];

  const accScore = scoreExam(items, DEFAULT_EXAM_POLICY);
  const abiScore = scoreExam(items, ABILITY_POLICY);

  const correct = trace.filter((t) => t.correct).length;

  return {
    profile,
    items: trace.length,
    accuracy: correct / Math.max(1, trace.length),
    engineMean: AREAS.reduce((s, a) => s + state.areas[a].difficulty, 0) / AREAS.length,
    accuracyComposite: accScore.composite,
    abilityComposite: abiScore.composite,
    accuracyPerArea: AREAS.map((a) => accScore.perArea[a]?.proficiency ?? Number.NaN),
    abilityPerArea: AREAS.map((a) => abiScore.perArea[a]?.proficiency ?? Number.NaN),
    enginePerArea: AREAS.map((a) => state.areas[a].difficulty),
  };
}

function fmt(n: number): string {
  return Number.isFinite(n) ? n.toFixed(2) : '—';
}

function table(title: string, rows: readonly Row[]): void {
  console.log(`\n### ${title}\n`);
  console.log(
    '| profile | true mean | items | raw accuracy | engine est (mean) | composite: accuracy mode | composite: ability mode |',
  );
  console.log('| --- | --- | --- | --- | --- | --- | --- |');
  for (const r of rows) {
    console.log(
      `| ${r.profile.name} | ${r.profile.trueMean === null ? 'off-scale' : fmt(r.profile.trueMean)} | ${r.items} | ${(r.accuracy * 100).toFixed(0)}% | ${fmt(r.engineMean)} | ${fmt(r.accuracyComposite)} | ${fmt(r.abilityComposite)} |`,
    );
  }
}

function errorStats(rows: readonly Row[]): void {
  const scored = rows.filter((r) => r.profile.trueMean !== null);
  const err = (pick: (r: Row) => number): { mae: number; worst: number } => {
    let sum = 0;
    let worst = 0;
    for (const r of scored) {
      const e = Math.abs(pick(r) - (r.profile.trueMean as number));
      sum += e;
      worst = Math.max(worst, e);
    }
    return { mae: sum / scored.length, worst };
  };

  const acc = err((r) => r.accuracyComposite);
  const abi = err((r) => r.abilityComposite);
  const eng = err((r) => r.engineMean);
  console.log('\n### composite error against true mean ability (on-scale profiles only)\n');
  console.log('| mode | mean absolute error | worst absolute error |');
  console.log('| --- | --- | --- |');
  console.log(`| accuracy (default) | ${fmt(acc.mae)} | ${fmt(acc.worst)} |`);
  console.log(`| ability (new) | ${fmt(abi.mae)} | ${fmt(abi.worst)} |`);
  console.log(`| engine estimate (reference) | ${fmt(eng.mae)} | ${fmt(eng.worst)} |`);
}

function perAreaTable(rows: readonly Row[]): void {
  console.log('\n### per-area proficiency, unequal-ability profiles\n');
  console.log('| profile | true (F/V/Q/S) | engine | accuracy mode | ability mode |');
  console.log('| --- | --- | --- | --- | --- |');
  for (const r of rows) {
    const truth = AREAS.map((a) => r.profile.theta[a]).join('/');
    console.log(
      `| ${r.profile.name} | ${truth} | ${r.enginePerArea.map(fmt).join('/')} | ${r.accuracyPerArea
        .map(fmt)
        .join('/')} | ${r.abilityPerArea.map(fmt).join('/')} |`,
    );
  }
}

/**
 * Knob sensitivity. The two ability knobs are design assumptions against uncalibrated banks, so
 * what matters is not their exact value but whether the result depends on it. Each is varied
 * independently around its default and re-scored over every profile.
 */
function sensitivity(profiles: readonly Profile[]): void {
  const traces = profiles.map((profile) => ({
    profile,
    items: runRealBankSession(profile.band, profile.theta, { hardItemCap: 400 }, real)
      .trace as unknown as readonly ScoringItem[],
  }));

  const evaluate = (slope: number, priorSd: number): { mae: number; worst: number } => {
    const policy: ExamPolicy = {
      ...ABILITY_POLICY,
      bracketing: { ...ABILITY_POLICY.bracketing, ability: { slope, priorSd } },
    };
    let sum = 0;
    let worst = 0;
    let n = 0;
    for (const { profile, items } of traces) {
      if (profile.trueMean === null) continue;
      const e = Math.abs(scoreExam(items, policy).composite - profile.trueMean);
      sum += e;
      worst = Math.max(worst, e);
      n += 1;
    }
    return { mae: sum / n, worst };
  };

  console.log('\n### ability-mode knob sensitivity (composite error vs true mean ability)\n');
  console.log('| knob setting | mean absolute error | worst absolute error |');
  console.log('| --- | --- | --- |');
  for (const slope of [0.4, 0.6, 0.8, 1.0, 1.5, 2.0, 3.0]) {
    const r = evaluate(slope, DEFAULT_ABILITY_BRACKETING.priorSd);
    const mark = slope === DEFAULT_ABILITY_BRACKETING.slope ? ' (default)' : '';
    console.log(`| slope ${slope.toFixed(1)}${mark} | ${fmt(r.mae)} | ${fmt(r.worst)} |`);
  }
  for (const priorSd of [3, 6, 12, Number.POSITIVE_INFINITY]) {
    const r = evaluate(DEFAULT_ABILITY_BRACKETING.slope, priorSd);
    const label = Number.isFinite(priorSd) ? priorSd.toFixed(1) : 'Infinity (no prior)';
    const mark = priorSd === DEFAULT_ABILITY_BRACKETING.priorSd ? ' (default)' : '';
    console.log(`| priorSd ${label}${mark} | ${fmt(r.mae)} | ${fmt(r.worst)} |`);
  }
}

const equalRows = EQUAL_ABILITY.map(run);
const extraRows = EXTRA_PROFILES.map(run);

table('equal true ability in all four areas, seeded at band 4-5', equalRows);
table('additional profiles', extraRows);
errorStats([...equalRows, ...extraRows]);
perAreaTable(extraRows.filter((r) => r.profile.name.startsWith('unequal')));
sensitivity([...EQUAL_ABILITY, ...EXTRA_PROFILES]);

// Neighbouring-level separation on the equal-ability sweep: how far apart consecutive rungs land.
console.log('\n### separation between neighbouring ability levels (equal-ability sweep)\n');
console.log('| step | accuracy mode Δ | ability mode Δ |');
console.log('| --- | --- | --- |');
for (let i = 1; i < equalRows.length; i++) {
  const prev = equalRows[i - 1] as Row;
  const cur = equalRows[i] as Row;
  console.log(
    `| ${prev.profile.trueMean} → ${cur.profile.trueMean} | ${fmt(cur.accuracyComposite - prev.accuracyComposite)} | ${fmt(cur.abilityComposite - prev.abilityComposite)} |`,
  );
}
