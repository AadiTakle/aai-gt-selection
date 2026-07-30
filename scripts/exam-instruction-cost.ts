/**
 * How many INSTRUCTION SCREENS a Phase 1 session costs a child, measured against the browser's own
 * configuration.
 *
 * WHY THIS EXISTS. The complaint this measures is not "bursts do not fire", it is "the child spends
 * too much of the test reading how to answer instead of answering". Every time the served type
 * changes, the next demo opens with a fresh instruction the child has to read; staying on a type
 * reuses the one already read. So the cost being complained about is the number of type CHANGES in
 * the served sequence, and that is the headline number here.
 *
 * WHY IT DOES NOT USE THE EXISTING HARNESS AS-IS. `runRealBankSession` selects over the research
 * catalog's declared measurement lists and the engine's default `CORE_METRICS`. A live session
 * selects over the generated registry's per-type metrics and the app's `EXAM_ENGINE_OVERRIDES`,
 * which replaces `coreMetrics` wholesale — and it selects over a pool whose `content` has been
 * stripped to the served INDEX. Those are different selection problems with different answers, and
 * the gap is exactly why bursting could be demonstrated in simulation while never firing in a
 * browser. This script rebuilds the harness's banks to match the browser on all three counts before
 * measuring anything.
 *
 * CLAIM BOUNDARY. Instruction screens are COUNTED. The seconds each one costs are NOT measured
 * anywhere in this repository — see `docs/product/EXAM_BURST_INSTRUCTION_COST.md` for what would
 * have to be collected to price them. The responder is a born-synthetic probabilistic child over
 * uncalibrated banks, so nothing here is a psychometric result; it is a routing measurement.
 *
 * Usage: pnpm exam:instruction-cost
 */
import {
  classifyBankSpeed,
  isDone,
  nextItem,
  planNextSelection,
  startState,
  update,
  AREAS,
  type AgeBand,
  type Area,
  type BankItem,
  type BurstPlan,
  type EngineConfig,
  type QuestionType,
} from '../packages/exam-engine/src';
import {
  loadRealBanks,
  respondProbabilistically,
  type RealBanks,
  type TrueTheta,
} from '../packages/exam-engine/src/testing/real-bank';
import {
  EXAM_ENGINE_OVERRIDES,
  SERVER_GUARANTEED_METRICS,
} from '../apps/web/src/lib/exam/engine-config';
import { EXAM_TYPE_REGISTRY } from '../apps/web/src/lib/exam/registry.generated';

const GRADE_BAND: AgeBand = '4-5';

/** Restores the pre-D-201 behaviour, where tracked-inert shortfalls summed without limit. */
const UNCAPPED_TRACKED_COVERAGE = Number.MAX_SAFE_INTEGER;

/**
 * Eight born-synthetic children spanning the ability range in every area, so a screen count is a
 * cohort mean rather than one lucky trace. Seeds are per child, so one child's luck is independent
 * of another's and the whole cohort is reproducible.
 */
const COHORT: readonly { label: string; theta: TrueTheta; seed: number }[] = Array.from(
  { length: 8 },
  (_, i) => ({
    label: `child-${String(i + 1)}`,
    theta: {
      fluid_reasoning: 5 + i * 2,
      verbal: 19 - i * 2,
      quantitative: 8 + (i % 4) * 3,
      spatial: 3 + i * 2,
    },
    seed: 0x5eed + i * 7919,
  }),
);

/**
 * The four measurements the retired burst rule treated as proof of a multi-move — and therefore
 * slow — response. Retained here ONLY so an arm can reproduce the retired rule's effect; nothing in
 * `packages/exam-engine` consults them any more.
 */
const RETIRED_PROCESS_DISQUALIFIERS: readonly string[] = [
  'M-PATH',
  'M-EFF',
  'M-PLANFUL',
  'M-IDEAFLU',
];

/**
 * Rebuild the harness's banks so selection sees what a browser sees.
 *
 * Three substitutions, each one a place the harness and the app previously disagreed:
 *
 *  1. only registry-wired types exist (the harness wires anything with a bank file);
 *  2. a type's `metrics` are the generated registry's — what the demo really emits — rather than the
 *     catalog's full declared measurement list; and
 *  3. an item's `content` is the served index's, i.e. an option count and nothing else.
 *
 * `carryOptionCount: false` reproduces the index as it shipped on `dev`, where `content` was `{}`
 * and therefore no item anywhere looked like a bounded choice.
 *
 * `applyRetiredRule` reproduces the retired declared-process-metric disqualifier by withholding the
 * option count from the types it excluded. Withholding the count is exactly how that rule reached
 * its verdict — such a type failed the "every item is a bounded choice" test — so the arm classifies
 * identically to the old code without needing the old code kept alive.
 */
function browserFaithful(
  real: RealBanks,
  carryOptionCount: boolean,
  applyRetiredRule = false,
): RealBanks {
  const registryByCode = new Map(EXAM_TYPE_REGISTRY.map((t) => [t.typeCode, t]));

  const types: QuestionType[] = [];
  for (const type of real.banks.types) {
    const entry = registryByCode.get(type.typeCode);
    if (!entry) continue;
    types.push({
      ...type,
      metrics: Array.from(new Set([...entry.metrics, ...SERVER_GUARANTEED_METRICS, 'M-DIFFREACH'])),
    });
  }
  const wired = new Set(types.map((t) => t.typeCode));
  const retired = new Set(
    applyRetiredRule
      ? types
          .filter((t) => t.metrics.some((m) => RETIRED_PROCESS_DISQUALIFIERS.includes(m)))
          .map((t) => t.typeCode)
      : [],
  );

  const items: BankItem[] = [];
  for (const item of real.banks.items) {
    if (!wired.has(item.typeCode)) continue;
    const options = (item.content as { options?: unknown }).options;
    const count = Array.isArray(options) && options.length > 0 ? options.length : undefined;
    const show = carryOptionCount && count !== undefined && !retired.has(item.typeCode);
    items.push({ ...item, content: show ? { optionCount: count } : {} });
  }

  // The simulated renderer emits what the real demo emits, so metric counts advance as they do live.
  const catalog = new Map(real.catalog);
  for (const type of types) {
    const previous = catalog.get(type.typeCode);
    if (previous) catalog.set(type.typeCode, { ...previous, perItem: [...type.metrics] });
  }

  return { banks: { types, items }, catalog, stimulus: real.stimulus };
}

interface SessionShape {
  readonly served: readonly string[];
  readonly areas: readonly Area[];
  /** Instruction screens: item 1, plus every item whose type differs from the one before it. */
  readonly screens: number;
  readonly longestBurst: number;
}

function runSession(real: RealBanks, config: Partial<EngineConfig>, index: number): SessionShape {
  const child = COHORT[index]!;
  let state = startState(GRADE_BAND, config);
  let active: BurstPlan | null = null;
  const served: string[] = [];
  const areas: Area[] = [];
  let longestBurst = 0;

  while (!isDone(state)) {
    const plan = planNextSelection(state, real.banks, active);
    if (plan === null) break;
    active = plan;
    longestBurst = Math.max(longestBurst, plan.length);
    const item = nextItem(state, plan.typeCode, real.banks);
    const scored = respondProbabilistically(item, real, child.theta, {
      slope: 1,
      guessing: 'per-item',
      // The served index carries no option list, so a per-item floor is unavailable here. 1/4 is the
      // modal option count across the wired banks, and is applied identically in every arm.
      fallbackGuessing: 0.25,
      seed: child.seed,
    });
    state = update(state, scored);
    served.push(item.typeCode);
    areas.push(item.domain);
  }

  let screens = 0;
  for (let i = 0; i < served.length; i++) {
    if (i === 0 || served[i] !== served[i - 1]) screens += 1;
  }
  return { served, areas, screens, longestBurst };
}

interface Arm {
  readonly label: string;
  readonly note: string;
  readonly carryOptionCount: boolean;
  readonly retiredRule?: boolean;
  readonly config: Partial<EngineConfig>;
}

interface ArmResult {
  readonly arm: Arm;
  readonly burstable: number;
  readonly items: number;
  readonly screens: number;
  readonly longestBurst: number;
  /** Per-child item counts, so a "mean" cannot hide a battery that has become fixed-length. */
  readonly lengths: readonly number[];
  readonly hitCap: number;
  /** Mean distinct types within one area, across areas and children — construct breadth per area. */
  readonly typesPerArea: number;
  readonly distinctTypes: Set<string>;
  readonly first: SessionShape;
}

function measure(arm: Arm, real: RealBanks): ArmResult {
  const banks = browserFaithful(real, arm.carryOptionCount, arm.retiredRule ?? false);
  const policy = { ...EXAM_ENGINE_OVERRIDES.burst!, ...arm.config.burst };
  const burstable = [...classifyBankSpeed(banks.banks, policy).values()].filter((v) => v.fast);

  let items = 0;
  let screens = 0;
  let longestBurst = 0;
  let areaTypeTotal = 0;
  let areaCount = 0;
  let hitCap = 0;
  const lengths: number[] = [];
  const distinctTypes = new Set<string>();
  let first: SessionShape | null = null;
  const cap = arm.config.hardItemCap ?? Number.POSITIVE_INFINITY;

  for (let i = 0; i < COHORT.length; i++) {
    const session = runSession(banks, arm.config, i);
    first ??= session;
    items += session.served.length;
    screens += session.screens;
    lengths.push(session.served.length);
    if (session.served.length >= cap) hitCap += 1;
    longestBurst = Math.max(longestBurst, session.longestBurst);
    for (const code of session.served) distinctTypes.add(code);
    for (const area of AREAS) {
      const inArea = new Set(session.served.filter((_, j) => session.areas[j] === area));
      if (inArea.size === 0) continue;
      areaTypeTotal += inArea.size;
      areaCount += 1;
    }
  }

  return {
    arm,
    burstable: burstable.length,
    items,
    screens,
    longestBurst,
    lengths,
    hitCap,
    typesPerArea: areaTypeTotal / areaCount,
    distinctTypes,
    first: first!,
  };
}

/** Collapse a served sequence into runs, so a burst reads as one instruction. */
function runsOf(served: readonly string[]): string {
  const out: { code: string; n: number }[] = [];
  for (const code of served) {
    const last = out[out.length - 1];
    if (last && last.code === code) last.n += 1;
    else out.push({ code, n: 1 });
  }
  return out.map((r) => (r.n === 1 ? r.code : `${r.code}×${String(r.n)}`)).join(' | ');
}

function report(result: ArmResult): void {
  const n = COHORT.length;
  console.log(`\n## ${result.arm.label}\n`);
  console.log(`  ${result.arm.note}`);
  console.log('');
  console.log(`  types classified burstable   : ${String(result.burstable)}`);
  console.log(`  longest burst actually run    : ${String(result.longestBurst)}`);
  console.log(
    `  items per session             : mean ${(result.items / n).toFixed(1)}, ` +
      `range ${String(Math.min(...result.lengths))}-${String(Math.max(...result.lengths))}` +
      `${result.hitCap > 0 ? `, ${String(result.hitCap)} HIT THE SAFETY CAP` : ''}`,
  );
  console.log(`  MEAN INSTRUCTION SCREENS      : ${(result.screens / n).toFixed(1)}`);
  console.log(
    `  share of items opening one    : ${((result.screens / result.items) * 100).toFixed(0)}%`,
  );
  console.log(`  mean distinct types per area  : ${result.typesPerArea.toFixed(1)}`);
  console.log(
    `  distinct types over cohort    : ${String(result.distinctTypes.size)} of ` +
      `${String(EXAM_TYPE_REGISTRY.length)} wired`,
  );
  console.log(`\n  ${COHORT[0]!.label} (| marks a new instruction):`);
  console.log(`  ${runsOf(result.first.served)}`);
}

// --- arms -------------------------------------------------------------------

const UNCAPPED = { ...EXAM_ENGINE_OVERRIDES, trackedCoverageCap: UNCAPPED_TRACKED_COVERAGE };

const ARMS: readonly Arm[] = [
  {
    label: 'A — dev as shipped',
    note:
      'The served index carries no option count, so no item anywhere looks like a bounded choice, ' +
      'no type is burstable, and every item opens a fresh instruction. This is the session the ' +
      'complaint is about.',
    carryOptionCount: false,
    config: UNCAPPED,
  },
  {
    label: 'B — A + an option count on the index, keeping the retired process-metric rule',
    note:
      'Bursts become possible. Nothing else changes: types declaring M-PATH / M-EFF / M-PLANFUL / ' +
      'M-IDEAFLU are still disqualified, and tracked-inert coverage still sums without limit.',
    carryOptionCount: true,
    retiredRule: true,
    config: UNCAPPED,
  },
  {
    label: 'C — B + retiring the process-metric disqualifier',
    note:
      'Burst eligibility now rests only on facts about the item: every item a bounded choice of at ' +
      'most six, no paced or time-bounded response.',
    carryOptionCount: true,
    config: UNCAPPED,
  },
  {
    label: 'D — C + capping tracked-inert coverage gain (THIS BRANCH)',
    note:
      'A type can no longer earn more than one tracked metric’s worth of selection score however ' +
      'many it declares (D-201), so process telemetry stops choosing the content of the test.',
    carryOptionCount: true,
    config: EXAM_ENGINE_OVERRIDES,
  },
  {
    label: 'E — D with the even-spread tolerance widened to the burst length (NOT ADOPTED)',
    note:
      'The obvious next lever, and the reason it is not pulled. Letting the areas finish up to six ' +
      'items apart would put the four per-area estimates on unequal evidence, which is a real cost ' +
      'to a report that names a level per area. It is also unnecessary: once burst length is bounded ' +
      'by the remaining item budget, this arm measures identically to D, so the tolerance was never ' +
      'the binding constraint.',
    carryOptionCount: true,
    config: { ...EXAM_ENGINE_OVERRIDES, evenSpreadTolerance: 6 },
  },
];

// --- run --------------------------------------------------------------------

const real = loadRealBanks();

console.log('# Phase 1 instruction cost — measured against the browser configuration');
console.log(
  `\nCohort: ${String(COHORT.length)} born-synthetic probabilistic children, grade band ` +
    `${GRADE_BAND}, hard cap ${String(EXAM_ENGINE_OVERRIDES.hardItemCap ?? 0)} items.\n` +
    'An instruction screen is a served item whose type differs from the item before it, so the\n' +
    'first item of every burst costs one and the rest cost none.',
);

const results = ARMS.map((arm) => measure(arm, real));
for (const result of results) report(result);

const n = COHORT.length;
const first = results[0]!;
console.log('\n## Change\n');
for (const result of results.slice(1)) {
  const delta = (first.screens - result.screens) / n;
  console.log(
    `  ${first.arm.label.split(' — ')[0]!} → ${result.arm.label.split(' — ')[0]!}: ` +
      `${(first.screens / n).toFixed(1)} → ${(result.screens / n).toFixed(1)} instruction screens ` +
      `(${delta >= 0 ? '−' : '+'}${Math.abs(delta).toFixed(1)}, ` +
      `${((delta / (first.screens / n)) * 100).toFixed(0)}% fewer); ` +
      `items ${(first.items / n).toFixed(1)} → ${(result.items / n).toFixed(1)}; ` +
      `types per area ${first.typesPerArea.toFixed(1)} → ${result.typesPerArea.toFixed(1)}.`,
  );
}
