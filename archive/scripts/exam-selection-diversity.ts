/**
 * Does aiming at the most informative item, spending the next question where the session knows
 * least, and paying for task-format variety actually help — and what does it cost the estimate?
 *
 * WHY BOTH HALVES ARE REPORTED TOGETHER. A selection change that widened every interval would look
 * like a clean win on every diversity column in this file. Diversity is cheap to buy and easy to
 * buy badly: an item spent on a new game is an item not spent on locating the child. So every arm
 * reports its ERROR and its PRECISION beside its variety, and an arm that improves the first at the
 * expense of the second has not improved anything.
 *
 * THE ARMS, over the same seeded sittings on the REAL wired bank under the browser's engine
 * configuration:
 *
 *   staircase       — as shipped: Levitt/Kesten up-down rule, nearest item to the running estimate,
 *                     strict area rotation, no novelty bonus. The baseline.
 *   +diversity      — staircase plus the novelty bonus, so the diversity term is attributable on
 *                     its own rather than only in combination.
 *   mepv            — minimum expected posterior variance selection and uncertainty-ranked area
 *                     choice, with the novelty bonus off.
 *   mepv+diversity  — all three changes, i.e. what this branch proposes to ship.
 *
 * HOW ERROR AND PRECISION ARE MEASURED. Two different readouts, deliberately:
 *
 *   - `engine error` is |what the engine reports as the child's standing − their planted ability|.
 *     Under `staircase` that is the staircase position; under `mepv` it is the belief's mean. This
 *     is the number a family would be shown, so it is the one that matters, but it is not directly
 *     comparable BETWEEN arms because the two rules report different quantities.
 *   - `fit error` and `fit SE` re-score every arm's trace with the SAME estimator — the scoring
 *     package's ability fit — so the only thing that varies is WHICH ITEMS the arm chose to serve.
 *     That is the apples-to-apples comparison, and it is what "does the range shrink faster"
 *     actually means.
 *
 * ITEMS TO CRITERION is the honest form of the same question: how many items an area needed before
 * the fitted SE first fell to `SE_CRITERION`. An arm that reaches a given precision in fewer items
 * has genuinely narrowed the range faster; an arm that merely ends with a smaller SE may only have
 * run longer.
 *
 * CLAIM BOUNDARY. Routing and recovery only, over born-synthetic probabilistic children and
 * uncalibrated banks (`syntheticOnly = true`, `validated = false`). Nothing here is evidence about
 * score validity, reliability, fairness, or giftedness. `slope`, the guessing floor and every bank
 * difficulty are design assumptions; these are RECOVERY results — can the machinery read back an
 * ability the trace was generated from — and nothing more.
 *
 * Usage: pnpm exam:selection-diversity [--sessions=N] [--floor-sweep]
 */
import {
  AREAS,
  BELIEF_GRID,
  DEFAULT_CONFIG,
  DIFFICULTY_MAX,
  DIFFICULTY_MIN,
  GRADE_BAND_SEED,
  priorBelief,
  updateBelief,
  type Area,
  type EngineConfig,
  type SessionState,
} from '../packages/exam-engine/src';
import {
  abilityStandardError,
  deriveAbilityEstimate,
  type AbilityFitOptions,
} from '../packages/exam-scoring/src/ability';
import { DEFAULT_ABILITY_BRACKETING } from '../packages/exam-scoring/src/policy';
import { EXAM_ENGINE_OVERRIDES } from '../apps/web/src/lib/exam/engine-config';
import {
  browserFaithful,
  loadRealBanks,
  runSession,
  worstTypeRepeat,
  worstTypeRun,
  WIRED_TYPE_COUNT,
  type HarnessChild,
  type RealBanks,
} from './exam-selection-harness';

const SESSION_COUNT = Number(
  process.argv.find((a) => a.startsWith('--sessions='))?.slice('--sessions='.length) ?? 40,
);

/**
 * The precision an area is called "measured" at, on the 1..20 difficulty scale.
 *
 * One scale point: half the ±2-point transition band the assumed slope of 1.0 implies, and close
 * to the mean final SE the shipped rule reaches, so it is a bar both arms can clear rather than one
 * chosen to be reachable by only one of them.
 */
const SE_CRITERION = 1.5;

/** A tighter second criterion, so the comparison is not read off one threshold. */
const SE_CRITERION_TIGHT = 1.25;

/**
 * How far above a child an item has to be before it is counted as one they had little chance on.
 *
 * Three scale points is a success probability of about 0.25 for a five-option item — near enough to
 * pure chance that the response carries almost no signal about them. Counting these is how the
 * structure BrainLift's claim gets tested rather than asserted: its objection to ramping is that a
 * run of items far above the child produces rapid-guessing, lost effort and anxiety, which is a
 * statement about what the child is HANDED, not about where the estimate ends up.
 */
const OUT_OF_REACH = 3;

/**
 * The decision point the `cut` arm is measured against. ILLUSTRATIVE ONLY.
 *
 * There is no GT selection threshold in this repository and none may be invented here — a real cut
 * is a district policy fact with a defined authority, a defined scale and consequences for real
 * children. 15 of 20 is chosen only because a selective cut sits high on the scale, which is where
 * Spray and Reckase report the cut-targeting advantage is largest, so it is the setting most
 * favourable to the arm being tested. Read the `cut` column as "what shape does this rule have",
 * never as "this is how the gate would perform".
 */
const ILLUSTRATIVE_CUT = 15;

/**
 * Confidence required before an above/below call at the cut is treated as made.
 *
 * `items to decision` counts how many items an area needed before the belief put this much mass on
 * one side of {@link ILLUSTRATIVE_CUT}. It is the classification analogue of items-to-criterion,
 * and the two are not interchangeable: a rule can decide quickly and still leave a standing level
 * too vague to scale anything with, which is precisely the trade the `cut` arm exists to expose.
 */
const DECISION_CONFIDENCE = 0.95;

/**
 * The estimator every arm's trace is re-scored with — the scoring package's own defaults.
 *
 * Its `guessing` matters to the COMPARISON and not just to the estimate. A floor-blind SE is
 * maximised by items the child has an even chance on, so it scores a battery aimed at the true
 * information peak (about a 0.65 success rate for a five-option item) as though it had been aimed
 * badly. Measuring floor-aware selection with a floor-blind instrument is how a real improvement
 * reads as a regression.
 */
const FIT: AbilityFitOptions = {
  slope: DEFAULT_ABILITY_BRACKETING.slope,
  priorSd: DEFAULT_ABILITY_BRACKETING.priorSd,
  guessing: DEFAULT_ABILITY_BRACKETING.guessing ?? 0,
  min: DIFFICULTY_MIN,
  max: DIFFICULTY_MAX,
};

/**
 * Sittings strided across the ability scale by co-prime steps, so no arm is measured on one narrow
 * slice of the range. The engine seed varies per session (otherwise the baseline is one session
 * replayed N times, which would credit the seed with the whole variety difference) and the
 * responder seed is independent of it, so a child's luck does not co-vary with their draws.
 */
const SESSIONS: readonly HarnessChild[] = Array.from({ length: SESSION_COUNT }, (_, i) => ({
  label: `session-${String(i + 1)}`,
  engineSeed: i + 1,
  seed: 0x5eed + i * 7919,
  theta: {
    fluid_reasoning: 4 + ((i * 3) % 15),
    verbal: 18 - ((i * 5) % 15),
    quantitative: 6 + ((i * 7) % 13),
    spatial: 3 + ((i * 11) % 16),
  },
}));

const LEGACY = {
  selectionRule: 'staircase',
  typeNoveltyBonus: 0,
  areaSpreadSlack: 0,
} satisfies Partial<EngineConfig>;

interface Arm {
  readonly key: string;
  readonly label: string;
  readonly config: Partial<EngineConfig>;
}

function arms(extra: Partial<EngineConfig> = {}): readonly Arm[] {
  const base = { ...EXAM_ENGINE_OVERRIDES, ...extra };
  return [
    { key: 'staircase', label: 'staircase (was)', config: { ...base, ...LEGACY } },
    { key: 'mfi', label: 'mfi (cheap)', config: { ...base, selectionRule: 'mfi' } },
    { key: 'mepv', label: 'mepv (ships)', config: { ...base, selectionRule: 'mepv' } },
    {
      key: 'cut',
      label: `cut @ ${String(ILLUSTRATIVE_CUT)}`,
      config: { ...base, selectionRule: 'cut', decisionCut: ILLUSTRATIVE_CUT },
    },
  ];
}

/**
 * Re-score one area's trace with the shared estimator, returning the fitted ability and SE after
 * every item.
 *
 * The fit reads only `difficulty` and `score`, both of which the engine's own stored observation
 * carries, so this re-scores exactly what was persisted rather than a parallel record of it.
 */
function fitSeries(state: SessionState, area: Area): { theta: number; se: number }[] {
  const observations = state.areas[area].trace;
  const series: { theta: number; se: number }[] = [];
  for (let n = 1; n <= observations.length; n++) {
    const items = observations
      .slice(0, n)
      .map((o) => ({ difficulty: o.difficulty, score: o.score }));
    const theta = deriveAbilityEstimate(items as never, FIT);
    if (theta === null) continue;
    series.push({ theta, se: abilityStandardError(theta, items as never, FIT) ?? Infinity });
  }
  return series;
}

/**
 * Items an area needed before the belief could call the child above or below the cut.
 *
 * Rebuilt with the engine's own belief so the decision is read off the same machinery selection
 * uses, not a parallel reimplementation of it. Returns `null` when the area never reached
 * {@link DECISION_CONFIDENCE}, which is itself a result worth counting.
 */
function itemsToDecision(
  state: SessionState,
  area: Area,
  config: Partial<EngineConfig>,
): number | null {
  const model = {
    slope: config.responseSlope ?? DEFAULT_CONFIG.responseSlope,
    guessing: config.guessingFloor ?? DEFAULT_CONFIG.guessingFloor,
  };
  let belief = priorBelief(
    GRADE_BAND_SEED['4-5'],
    config.posteriorPriorSd ?? DEFAULT_CONFIG.posteriorPriorSd,
  );

  let n = 0;
  for (const observation of state.areas[area].trace) {
    belief = updateBelief(belief, observation.difficulty, observation.correct, model);
    n += 1;
    let above = 0;
    for (let i = 0; i < BELIEF_GRID.length; i++) {
      if ((BELIEF_GRID[i] as number) > ILLUSTRATIVE_CUT) above += belief.mass[i] as number;
    }
    if (above >= DECISION_CONFIDENCE || above <= 1 - DECISION_CONFIDENCE) return n;
  }
  return null;
}

interface ArmResult {
  readonly arm: Arm;
  readonly items: number;
  readonly minItems: number;
  readonly maxItems: number;
  readonly typesPerSession: number;
  readonly distinctTypes: number;
  readonly typesPerArea: number;
  readonly worstRepeat: number;
  readonly worstRun: number;
  readonly areaSpread: number;
  readonly engineRmse: number;
  readonly engineBias: number;
  readonly fitRmse: number;
  readonly fitSe: number;
  readonly seSpread: number;
  readonly itemsToCriterion: number;
  readonly reachedCriterion: number;
  readonly itemsToTight: number;
  readonly reachedTight: number;
  readonly areasMeasured: number;
  readonly concluded: number;
  readonly hitCap: number;
  readonly targetingError: number;
  readonly outOfReach: number;
  readonly worstWrongRun: number;
  readonly itemsToDecision: number;
  readonly decided: number;
  readonly distinctItems: number;
  readonly topItemShare: number;
}

function measure(arm: Arm, banks: RealBanks): ArmResult {
  const n = SESSIONS.length;
  let items = 0;
  let typesPerSession = 0;
  let areaTypeTotal = 0;
  let areaCount = 0;
  let worstRepeat = 0;
  let worstRun = 0;
  let areaSpread = 0;
  let engineSq = 0;
  let engineBias = 0;
  let fitSq = 0;
  let fitSe = 0;
  let seSpread = 0;
  let estimates = 0;
  let itemsToCriterion = 0;
  let reachedCriterion = 0;
  let itemsToTight = 0;
  let reachedTight = 0;
  let concluded = 0;
  let hitCap = 0;
  let targetingError = 0;
  let outOfReach = 0;
  let servedTotal = 0;
  let worstWrongRun = 0;
  let toDecision = 0;
  let decided = 0;
  const lengths: number[] = [];
  const distinct = new Set<string>();
  const itemSessions = new Map<string, number>();

  for (const child of SESSIONS) {
    const session = runSession(banks, arm.config, child);
    items += session.served.length;
    lengths.push(session.served.length);
    typesPerSession += new Set(session.served).size;
    worstRepeat += worstTypeRepeat(session.served);
    worstRun += worstTypeRun(session.served);
    for (const code of session.served) distinct.add(code);
    for (const id of new Set(session.scored.map((s) => s.itemId))) {
      itemSessions.set(id, (itemSessions.get(id) ?? 0) + 1);
    }
    if (session.stop.concludedOnEvidence) concluded += 1;
    if (session.stop.hitCap) hitCap += 1;

    const counts = AREAS.map((a) => session.state.areas[a].itemsSeen.size);
    areaSpread += Math.max(...counts) - Math.min(...counts);

    const areaSes: number[] = [];
    let sessionWorstRun = 0;
    for (const area of AREAS) {
      const inArea = new Set(session.served.filter((_, j) => session.areas[j] === area));
      if (inArea.size > 0) {
        areaTypeTotal += inArea.size;
        areaCount += 1;
      }

      const truth = child.theta[area];
      const reported = session.state.areas[area].difficulty;
      engineSq += (reported - truth) ** 2;
      engineBias += reported - truth;

      const series = fitSeries(session.state, area);
      const last = series[series.length - 1];
      if (last === undefined) continue;
      estimates += 1;
      fitSq += (last.theta - truth) ** 2;
      fitSe += last.se;
      areaSes.push(last.se);

      const at = series.findIndex((s) => s.se <= SE_CRITERION);
      if (at >= 0) {
        itemsToCriterion += at + 1;
        reachedCriterion += 1;
      }
      const tight = series.findIndex((s) => s.se <= SE_CRITERION_TIGHT);
      if (tight >= 0) {
        itemsToTight += tight + 1;
        reachedTight += 1;
      }

      // What the child was actually handed, which is the BrainLift's claim rather than the
      // estimate's. `run` is the longest streak of consecutive misses inside one area.
      let run = 0;
      for (const observation of session.state.areas[area].trace) {
        servedTotal += 1;
        targetingError += Math.abs(observation.difficulty - truth);
        if (observation.difficulty - truth >= OUT_OF_REACH) outOfReach += 1;
        run = observation.correct ? 0 : run + 1;
        sessionWorstRun = Math.max(sessionWorstRun, run);
      }

      const decision = itemsToDecision(session.state, area, arm.config);
      if (decision !== null) {
        toDecision += decision;
        decided += 1;
      }
    }
    worstWrongRun += sessionWorstRun;
    if (areaSes.length > 0) seSpread += Math.max(...areaSes) - Math.min(...areaSes);
  }

  const areas = n * AREAS.length;
  return {
    arm,
    items: items / n,
    minItems: Math.min(...lengths),
    maxItems: Math.max(...lengths),
    typesPerSession: typesPerSession / n,
    distinctTypes: distinct.size,
    typesPerArea: areaTypeTotal / areaCount,
    worstRepeat: worstRepeat / n,
    worstRun: worstRun / n,
    areaSpread: areaSpread / n,
    engineRmse: Math.sqrt(engineSq / areas),
    engineBias: engineBias / areas,
    fitRmse: Math.sqrt(fitSq / Math.max(1, estimates)),
    fitSe: fitSe / Math.max(1, estimates),
    seSpread: seSpread / n,
    itemsToCriterion: itemsToCriterion / Math.max(1, reachedCriterion),
    reachedCriterion,
    itemsToTight: itemsToTight / Math.max(1, reachedTight),
    reachedTight,
    areasMeasured: areas,
    concluded,
    hitCap,
    targetingError: targetingError / Math.max(1, servedTotal),
    outOfReach: outOfReach / Math.max(1, servedTotal),
    worstWrongRun: worstWrongRun / n,
    itemsToDecision: toDecision / Math.max(1, decided),
    decided,
    distinctItems: itemSessions.size,
    topItemShare: Math.max(0, ...itemSessions.values()) / n,
  };
}

function table(results: readonly ArmResult[]): void {
  const n = SESSIONS.length;
  const rows: [string, (r: ArmResult) => string][] = [
    ['— diversity —', () => ''],
    [`distinct types reached (of ${String(WIRED_TYPE_COUNT)})`, (r) => String(r.distinctTypes)],
    ['distinct types / session', (r) => r.typesPerSession.toFixed(1)],
    ['distinct types / area', (r) => r.typesPerArea.toFixed(2)],
    ['worst within-session repeat', (r) => r.worstRepeat.toFixed(2)],
    ['worst return-to-type', (r) => r.worstRun.toFixed(2)],
    ['— precision (the other side) —', () => ''],
    ['engine standing error (RMSE)', (r) => r.engineRmse.toFixed(3)],
    ['engine standing bias', (r) => r.engineBias.toFixed(3)],
    ['refitted ability RMSE', (r) => r.fitRmse.toFixed(3)],
    ['mean final SE', (r) => r.fitSe.toFixed(3)],
    [
      `items to SE <= ${SE_CRITERION.toFixed(2)}`,
      (r) =>
        `${r.itemsToCriterion.toFixed(1)} (${String(r.reachedCriterion)}/${String(r.areasMeasured)})`,
    ],
    [
      `items to SE <= ${SE_CRITERION_TIGHT.toFixed(2)}`,
      (r) => `${r.itemsToTight.toFixed(1)} (${String(r.reachedTight)}/${String(r.areasMeasured)})`,
    ],
    [`— decision at an illustrative cut of ${String(ILLUSTRATIVE_CUT)} —`, () => ''],
    [
      'items to a 95% call',
      (r) => `${r.itemsToDecision.toFixed(1)} (${String(r.decided)}/${String(r.areasMeasured)})`,
    ],
    ['— exposure —', () => ''],
    ['distinct bank items used', (r) => String(r.distinctItems)],
    ['most-served item reaches', (r) => `${(r.topItemShare * 100).toFixed(0)}% of sittings`],
    ['— what the child was handed —', () => ''],
    ['mean |item difficulty - ability|', (r) => r.targetingError.toFixed(2)],
    [
      `share of items >= ${String(OUT_OF_REACH)} above`,
      (r) => `${(r.outOfReach * 100).toFixed(1)}%`,
    ],
    ['worst run of consecutive misses', (r) => r.worstWrongRun.toFixed(2)],
    ['— balance and completion —', () => ''],
    ['area item-count spread', (r) => r.areaSpread.toFixed(2)],
    ['area SE spread (max - min)', (r) => r.seSpread.toFixed(3)],
    [
      'items / session',
      (r) => `${r.items.toFixed(1)} (${String(r.minItems)}-${String(r.maxItems)})`,
    ],
    ['concluded on evidence', (r) => `${String(r.concluded)}/${String(n)}`],
    ['on the safety cap', (r) => String(r.hitCap)],
  ];

  const widths = [32, ...results.map((r) => Math.max(r.arm.label.length, 12))];
  const line = (cells: string[]) =>
    '| ' + cells.map((c, i) => c.padEnd(widths[i] ?? 12)).join(' | ') + ' |';

  console.log(line(['', ...results.map((r) => r.arm.label)]));
  console.log('|' + widths.map((w) => '-'.repeat(w + 2)).join('|') + '|');
  for (const [label, cell] of rows) console.log(line([label, ...results.map(cell)]));
}

/**
 * What the assumed chance-success floor costs when it is wrong in each direction.
 *
 * The simulated child guesses at their item's own option count, so a floor of ~0.2-0.25 is the
 * matched assumption and 0 is the no-guessing model the standing estimator used to make. Reported
 * because the floor is an ASSUMPTION and the honest thing to show is the shape of the penalty
 * either side of it, not one number at the value that was chosen.
 */
function floorSweep(banks: RealBanks): void {
  console.log('\n## What the assumed guessing floor costs, under `mepv`\n');
  console.log(
    "  The responder guesses at each item's own option count, so ~0.2-0.25 is matched and 0 is the\n" +
      '  no-guessing model the standing fit used to assume. "engine bias" is the signed error of the\n' +
      '  standing level the child would be shown.\n',
  );
  console.log('  | floor | engine bias | engine RMSE | refit RMSE | mean SE | items | concluded |');
  console.log('  |-------|-------------|-------------|------------|---------|-------|-----------|');

  for (const floor of [0, 0.1, 0.2, 0.25, 0.35]) {
    const arm: Arm = {
      key: `floor-${String(floor)}`,
      label: `floor ${String(floor)}`,
      config: { ...EXAM_ENGINE_OVERRIDES, guessingFloor: floor },
    };
    const r = measure(arm, banks);
    console.log(
      `  | ${floor.toFixed(2).padEnd(5)} | ${r.engineBias.toFixed(3).padEnd(11)} | ` +
        `${r.engineRmse.toFixed(3).padEnd(11)} | ${r.fitRmse.toFixed(3).padEnd(10)} | ` +
        `${r.fitSe.toFixed(3).padEnd(7)} | ${r.items.toFixed(1).padEnd(5)} | ` +
        `${`${String(r.concluded)}/${String(SESSIONS.length)}`.padEnd(9)} |`,
    );
  }
}

/**
 * What each diversity knob costs the estimate.
 *
 * The novelty bonus is the one term here that spends items on something other than locating the
 * child, so it is the one that has to be priced rather than assumed. `mepvTolerance` is swept
 * beside it because it is the other place variety is bought — a wider tolerance admits more
 * substitutes for the most informative item, and the age-band preference then chooses among them.
 */
function knobSweep(banks: RealBanks): void {
  console.log('\n## Pricing the diversity knobs under `mepv`\n');
  console.log(
    '  | novelty | tol  | types/sess | types/area | refit RMSE | mean SE | items | concluded | on cap |',
  );
  console.log(
    '  |---------|------|------------|------------|------------|---------|-------|-----------|--------|',
  );

  for (const novelty of [0, 0.5, 1.0, 1.5]) {
    for (const tol of [0, 0.05, 0.15]) {
      const r = measure(
        {
          key: `n${String(novelty)}-t${String(tol)}`,
          label: '',
          config: {
            ...EXAM_ENGINE_OVERRIDES,
            typeNoveltyBonus: novelty,
            mepvTolerance: tol,
          },
        },
        banks,
      );
      console.log(
        `  | ${novelty.toFixed(2).padEnd(7)} | ${tol.toFixed(2).padEnd(4)} | ` +
          `${r.typesPerSession.toFixed(1).padEnd(10)} | ${r.typesPerArea.toFixed(2).padEnd(10)} | ` +
          `${r.fitRmse.toFixed(3).padEnd(10)} | ${r.fitSe.toFixed(3).padEnd(7)} | ` +
          `${r.items.toFixed(1).padEnd(5)} | ` +
          `${`${String(r.concluded)}/${String(SESSIONS.length)}`.padEnd(9)} | ${String(r.hitCap).padEnd(6)} |`,
      );
    }
  }
}

// --- run --------------------------------------------------------------------

const real = loadRealBanks();
const banks = browserFaithful(real, true);

console.log('# Stage 1 selection: information-targeted, uncertainty-routed, variety-paid\n');
console.log(
  `${String(SESSIONS.length)} born-synthetic probabilistic sittings, grade band 4-5, hard cap ` +
    `${String(EXAM_ENGINE_OVERRIDES.hardItemCap ?? 0)} items, engine seeds 1..${String(SESSIONS.length)}.\n` +
    'Every arm sits the same children with the same luck; only the selection rule differs.\n',
);

table(arms().map((arm) => measure(arm, banks)));

if (process.argv.includes('--floor-sweep')) floorSweep(banks);
if (process.argv.includes('--knob-sweep')) knobSweep(banks);
