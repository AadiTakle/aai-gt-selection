/**
 * Do the burst/coverage-cap work (D-201) and the selection-variety work (D-202) help each other, or
 * cancel each other?
 *
 * WHY THIS HAD TO BE MEASURED RATHER THAN MERGED. Both changes attack the same root cause — metric
 * coverage pressure monopolising the type choice — from opposite ends. D-201 CAPS what a type can
 * earn from tracked-inert shortfalls, which compresses the score spread inside an area. D-202 adds
 * a tolerance and a recency discount ON TOP of whatever those scores are. A tolerance calibrated
 * against the uncapped spread is proportionally more aggressive against the capped one, so the two
 * together could plausibly produce selection that is effectively random and no longer prioritises
 * the enforced coverage the stop rule is gated on. They could equally be complementary: bursts make
 * each type-RUN longer while variety widens which types those runs draw from. Nothing about either
 * branch's own measurement settles which, because neither was run against the other.
 *
 * THE FOUR ARMS, at matched settings, over 20 differently-seeded sessions on the REAL wired bank:
 *
 *   dev       — as shipped: no option count on the served index, uncapped tracked coverage,
 *               no burst, strict argmax with no tolerance and no recency discount.
 *   burst     — D-201 alone: option count on the index, tracked coverage capped, bursts enabled,
 *               and the type-breadth floor the stop rule needs once a burst can narrow an area.
 *   variety   — D-202 alone: tolerance and recency on, over the UNCAPPED scores and with no burst.
 *   combined  — both.
 *
 * WHAT IS HELD MATCHED. Every arm runs the same 20 sittings — same abilities, same responder seeds,
 * same engine seeds, same grade band, same 40-item cap, same browser-faithful banks. The seed varies
 * BETWEEN sessions in all four arms, including `dev`. That is deliberate: a constant seed makes the
 * `dev` arm one session replayed twenty times, which would credit the per-session seed with the
 * whole of the variety improvement. Varying it everywhere isolates the SELECTION-RULE change, which
 * is the thing in dispute. `--as-shipped` re-runs `dev` and `burst` on the constant seed they
 * actually ship with, for the honest real-world baseline.
 *
 * CLAIM BOUNDARY. Routing only, over born-synthetic probabilistic children and uncalibrated banks.
 * Nothing here speaks to score validity, reliability, or fairness. See `./exam-selection-harness`.
 *
 * Usage: pnpm exam:selection-integration [--as-shipped]
 */
import {
  DEFAULT_BURST_POLICY,
  DEFAULT_CONFIG,
  type EngineConfig,
} from '../packages/exam-engine/src';
import { EXAM_ENGINE_OVERRIDES } from '../apps/web/src/lib/exam/engine-config';
import {
  browserFaithful,
  loadRealBanks,
  runSession,
  runsOf,
  worstTypeRepeat,
  worstTypeRun,
  UNCAPPED_TRACKED_COVERAGE,
  WIRED_TYPE_COUNT,
  type HarnessChild,
  type RealBanks,
  type SessionShape,
} from './exam-selection-harness';

/**
 * Twenty sittings. The engine seed is the session index, matching the variety work's own runs so
 * its published figures (6 of 49 distinct types before, 23 after) are directly comparable; the
 * abilities are strided across the 1..20 difficulty scale by co-prime steps so no arm is measured
 * on one narrow slice of the range, and the responder seed is independent of the engine seed so
 * a child's luck does not co-vary with their selection draws.
 */
const SESSION_COUNT = Number(
  process.argv.find((a) => a.startsWith('--sessions='))?.slice('--sessions='.length) ?? 20,
);

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

/** Selection knobs at zero: strict argmax, nearest item, no recency discount — `dev`'s rule. */
const NO_VARIETY = {
  typeSelectionTolerance: 0,
  itemSelectionTolerance: 0,
  typeRecencyPenalty: 0,
} satisfies Partial<EngineConfig>;

/**
 * `dev`'s stop rule and coverage scoring: tracked-inert shortfalls sum without limit, bursting is
 * off, and the type-breadth floor is disabled (`minTypesPerArea: 1`) because it arrived with D-201
 * and only exists to stop a burst handing a whole area to one type.
 */
const PRE_BURST = {
  trackedCoverageCap: UNCAPPED_TRACKED_COVERAGE,
  burst: DEFAULT_BURST_POLICY,
  minTypesPerArea: 1,
} satisfies Partial<EngineConfig>;

interface Arm {
  readonly key: string;
  readonly label: string;
  /** `false` reproduces the served index as `dev` ships it: `content` is `{}`, nothing burstable. */
  readonly carryOptionCount: boolean;
  readonly config: Partial<EngineConfig>;
}

function arms(overrides: Partial<EngineConfig> = {}): readonly Arm[] {
  const base = { ...EXAM_ENGINE_OVERRIDES, ...overrides };
  return [
    {
      key: 'dev',
      label: 'dev baseline',
      carryOptionCount: false,
      config: { ...base, ...PRE_BURST, ...NO_VARIETY },
    },
    {
      key: 'burst',
      label: '#28 alone (burst + coverage cap)',
      carryOptionCount: true,
      config: { ...base, ...NO_VARIETY },
    },
    {
      key: 'variety',
      label: '#29 alone (seed + tolerance + recency)',
      carryOptionCount: false,
      config: { ...base, ...PRE_BURST },
    },
    { key: 'both', label: 'combined', carryOptionCount: true, config: base },
  ];
}

interface ArmResult {
  readonly arm: Arm;
  readonly screens: number;
  readonly items: number;
  readonly distinctTypes: number;
  readonly typesPerSession: number;
  readonly worstRepeat: number;
  readonly worstRun: number;
  readonly typesPerArea: number;
  readonly longestBurst: number;
  readonly minItems: number;
  readonly maxItems: number;
  readonly hitCap: number;
  readonly exhausted: number;
  readonly coverageIncomplete: number;
  readonly concludedOnEvidence: number;
  readonly first: SessionShape;
}

/**
 * Run one arm over all 20 sittings.
 *
 * `rawBanks` selects over the catalog's declared measurement lists instead of the served index —
 * the configuration the variety work's own figures were taken against. See {@link ENGINE_DEFAULT}.
 */
function measure(arm: Arm, real: RealBanks, rawBanks = false): ArmResult {
  const banks = rawBanks ? real : browserFaithful(real, arm.carryOptionCount);
  const n = SESSIONS.length;

  let screens = 0;
  let items = 0;
  let worstRepeat = 0;
  let worstRun = 0;
  let longestBurst = 0;
  let areaTypeTotal = 0;
  let areaCount = 0;
  let hitCap = 0;
  let exhausted = 0;
  let coverageIncomplete = 0;
  let concludedOnEvidence = 0;
  let typesPerSession = 0;
  const lengths: number[] = [];
  const distinct = new Set<string>();
  let first: SessionShape | null = null;

  for (const child of SESSIONS) {
    const session = runSession(banks, arm.config, child);
    first ??= session;
    screens += session.screens;
    items += session.served.length;
    typesPerSession += new Set(session.served).size;
    lengths.push(session.served.length);
    worstRepeat += worstTypeRepeat(session.served);
    worstRun += worstTypeRun(session.served);
    longestBurst = Math.max(longestBurst, session.longestBurst);
    for (const code of session.served) distinct.add(code);
    if (session.stop.hitCap) hitCap += 1;
    if (session.stop.exhausted) exhausted += 1;
    if (!session.stop.enforcedMetricsCovered) coverageIncomplete += 1;
    if (session.stop.concludedOnEvidence) concludedOnEvidence += 1;
    for (const area of ['fluid_reasoning', 'verbal', 'quantitative', 'spatial'] as const) {
      const inArea = new Set(session.served.filter((_, j) => session.areas[j] === area));
      if (inArea.size === 0) continue;
      areaTypeTotal += inArea.size;
      areaCount += 1;
    }
  }

  return {
    arm,
    screens: screens / n,
    items: items / n,
    distinctTypes: distinct.size,
    typesPerSession: typesPerSession / n,
    worstRepeat: worstRepeat / n,
    worstRun: worstRun / n,
    typesPerArea: areaTypeTotal / areaCount,
    longestBurst,
    minItems: Math.min(...lengths),
    maxItems: Math.max(...lengths),
    hitCap,
    exhausted,
    coverageIncomplete,
    concludedOnEvidence,
    first: first!,
  };
}

function table(results: readonly ArmResult[], typePool = WIRED_TYPE_COUNT, cap = 40): void {
  const n = SESSIONS.length;
  const rows: [string, (r: ArmResult) => string][] = [
    ['instruction screens / session', (r) => r.screens.toFixed(1)],
    [
      'items / session',
      (r) => `${r.items.toFixed(1)} (${String(r.minItems)}–${String(r.maxItems)})`,
    ],
    [`distinct types reached (of ${String(typePool)})`, (r) => String(r.distinctTypes)],
    ['distinct types / session', (r) => r.typesPerSession.toFixed(1)],
    ['worst within-session repeat', (r) => r.worstRepeat.toFixed(1)],
    ['worst return-to-type (runs)', (r) => r.worstRun.toFixed(1)],
    ['distinct types per area', (r) => r.typesPerArea.toFixed(1)],
    ['longest burst run', (r) => String(r.longestBurst)],
    ['enforced coverage complete', (r) => `${String(n - r.coverageIncomplete)}/${String(n)}`],
    ['concluded on evidence', (r) => `${String(r.concludedOnEvidence)}/${String(n)}`],
    [`sessions on the ${String(cap)}-item cap`, (r) => String(r.hitCap)],
    ['sessions out of items', (r) => String(r.exhausted)],
  ];

  const widths = [34, ...results.map((r) => Math.max(r.arm.label.length, 12))];
  const line = (cells: string[]) =>
    '| ' + cells.map((c, i) => c.padEnd(widths[i] ?? 12)).join(' | ') + ' |';

  console.log(line(['', ...results.map((r) => r.arm.label)]));
  console.log('|' + widths.map((w) => '-'.repeat(w + 2)).join('|') + '|');
  for (const [label, cell] of rows) console.log(line([label, ...results.map(cell)]));
}

function sequences(results: readonly ArmResult[]): void {
  console.log('\n## Session 1, as runs (| marks a new instruction screen)\n');
  for (const r of results) {
    console.log(`  ${r.arm.label}`);
    console.log(`    ${runsOf(r.first.served)}\n`);
  }
}

/**
 * The engine's OWN defaults over the raw research banks — the configuration the variety work took
 * its published figures against (6 of 49 distinct types before, 23 after; worst repeat 5.0 → 3.1).
 *
 * It is reported second rather than first because it is not what a child sits: the app replaces
 * `coreMetrics` wholesale and each type's metrics come from the generated registry rather than the
 * catalog's full declared measurement list. Under the catalog lists one type per area declares far
 * more tracked measurements than its rivals, which is what made the type choice a fixed rotation
 * there. It is reported AT ALL because those are the numbers the variety work is on record for, and
 * a merge that quietly stopped reproducing them would be a regression nobody could see.
 */
const ENGINE_DEFAULT: Partial<EngineConfig> = DEFAULT_CONFIG;

function engineDefaultArms(): readonly Arm[] {
  return arms().map((arm) => ({
    ...arm,
    config: { ...ENGINE_DEFAULT, ...stripAppOverrides(arm.config) },
  }));
}

/** Keep only the knobs an arm is DEFINED by, so the engine-default view is otherwise untouched. */
function stripAppOverrides(config: Partial<EngineConfig>): Partial<EngineConfig> {
  const {
    typeSelectionTolerance,
    itemSelectionTolerance,
    typeRecencyPenalty,
    typeRecencyWindow,
    trackedCoverageCap,
    burst,
    minTypesPerArea,
  } = { ...DEFAULT_CONFIG, ...config };
  return {
    typeSelectionTolerance,
    itemSelectionTolerance,
    typeRecencyPenalty,
    typeRecencyWindow,
    trackedCoverageCap,
    burst,
    minTypesPerArea,
  };
}

/**
 * Re-derive the variety knobs against the COMBINED behaviour.
 *
 * They were calibrated against the uncapped coverage scores, where a type could earn four
 * tracked-metric points and the spread inside an area was correspondingly wide. Capping that at one
 * point compresses the spread, so the same tolerance in score points is proportionally a much wider
 * net — which is the mechanism by which the two changes could over-correct each other. This sweeps
 * the two knobs that price variety and prints what each setting costs in instruction screens, in
 * items, and in sessions that reach the safety cap instead of concluding on evidence.
 */
function sweep(real: RealBanks, engineDefaults = false): void {
  const banks = engineDefaults ? real : browserFaithful(real, true);
  const base = engineDefaults ? ENGINE_DEFAULT : EXAM_ENGINE_OVERRIDES;
  const cap = base.hardItemCap ?? 0;

  console.log(
    engineDefaults
      ? '\n## The same sweep under the engine defaults, where the variety work was calibrated\n'
      : '\n## Re-deriving the variety knobs against the capped scores\n',
  );
  console.log(
    '  tol = typeSelectionTolerance, rec = typeRecencyPenalty, win = typeRecencyWindow.\n' +
      `  "evidence" is sessions concluding on the stop rule rather than on the ${String(cap)}-item safety net.\n`,
  );
  console.log(
    '  | tol  | rec  | win | screens | items | types/sess | worst rep | worst run | evidence | on cap |',
  );
  console.log(
    '  |------|------|-----|---------|-------|------------|-----------|-----------|----------|--------|',
  );

  const grid: { tol: number; rec: number; win: number }[] = [];
  for (const tol of [0, 0.25, 0.5, 0.75, 1.0]) {
    for (const rec of [0, 0.5, 1.0]) {
      for (const win of rec === 0 ? [3] : [2, 3]) grid.push({ tol, rec, win });
    }
  }

  for (const { tol, rec, win } of grid) {
    const config: Partial<EngineConfig> = {
      ...base,
      typeSelectionTolerance: tol,
      typeRecencyPenalty: rec,
      typeRecencyWindow: win,
    };

    let screens = 0;
    let items = 0;
    let typesPerSession = 0;
    let worstRepeat = 0;
    let worstRun = 0;
    let evidence = 0;
    let onCap = 0;
    for (const child of SESSIONS) {
      const session = runSession(banks, config, child);
      screens += session.screens;
      items += session.served.length;
      typesPerSession += new Set(session.served).size;
      worstRepeat += worstTypeRepeat(session.served);
      worstRun += worstTypeRun(session.served);
      if (session.stop.concludedOnEvidence) evidence += 1;
      if (session.stop.hitCap) onCap += 1;
    }

    const n = SESSIONS.length;
    console.log(
      `  | ${tol.toFixed(2).padEnd(4)} | ${rec.toFixed(2).padEnd(4)} | ${String(win).padEnd(3)} | ` +
        `${(screens / n).toFixed(1).padEnd(7)} | ${(items / n).toFixed(1).padEnd(5)} | ` +
        `${(typesPerSession / n).toFixed(1).padEnd(10)} | ${(worstRepeat / n).toFixed(1).padEnd(9)} | ` +
        `${(worstRun / n).toFixed(1).padEnd(9)} | ${`${String(evidence)}/${String(n)}`.padEnd(8)} | ` +
        `${String(onCap).padEnd(6)} |`,
    );
  }
}

// --- run --------------------------------------------------------------------

const real = loadRealBanks();
const asShipped = process.argv.includes('--as-shipped');
const runSweep = process.argv.includes('--sweep');

console.log('# D-201 x D-202 — four arms on the real wired bank\n');
console.log(
  `${String(SESSIONS.length)} born-synthetic probabilistic sittings, grade band 4-5, hard cap ` +
    `${String(EXAM_ENGINE_OVERRIDES.hardItemCap ?? 0)} items, engine seeds 1..${String(SESSIONS.length)}.\n` +
    'An instruction screen is a served item whose type differs from the one before it.\n' +
    '"Worst within-session repeat" counts ITEMS of one type in the first 20; "worst return-to-type"\n' +
    'counts arrivals, so a burst of four is one arrival rather than four.\n',
);

const results = arms().map((arm) => measure(arm, real));
table(results);
sequences(results);

const [dev, burst, variety, both] = results as [ArmResult, ArmResult, ArmResult, ArmResult];
console.log('## Is the combination better than either alone?\n');
console.log(
  `  instruction screens : dev ${dev.screens.toFixed(1)} | #28 ${burst.screens.toFixed(1)} | ` +
    `#29 ${variety.screens.toFixed(1)} | both ${both.screens.toFixed(1)}`,
);
console.log(
  `  distinct types      : dev ${String(dev.distinctTypes)} | #28 ${String(burst.distinctTypes)} | ` +
    `#29 ${String(variety.distinctTypes)} | both ${String(both.distinctTypes)}`,
);
console.log(
  `  worst repeat        : dev ${dev.worstRepeat.toFixed(1)} | #28 ${burst.worstRepeat.toFixed(1)} | ` +
    `#29 ${variety.worstRepeat.toFixed(1)} | both ${both.worstRepeat.toFixed(1)}`,
);
console.log(
  `\n  combined vs best single arm: screens ${(both.screens - Math.min(burst.screens, variety.screens)).toFixed(1)}, ` +
    `distinct types ${String(both.distinctTypes - Math.max(burst.distinctTypes, variety.distinctTypes))}.`,
);

console.log('\n## The same four arms under the engine defaults and the raw catalog banks\n');
console.log(
  '  Not what a child sits — see ENGINE_DEFAULT — but the configuration the variety work reported\n' +
    '  against, so its own claim is checked inside the combination rather than assumed to survive.\n',
);
table(
  engineDefaultArms().map((arm) => measure(arm, real, true)),
  real.banks.types.length,
  DEFAULT_CONFIG.hardItemCap,
);

if (runSweep) {
  sweep(real);
  sweep(real, true);
}

if (asShipped) {
  console.log('\n## As shipped — dev and #28 on their constant engine seed\n');
  const fixedSeed: readonly HarnessChild[] = SESSIONS.map(({ engineSeed: _drop, ...rest }) => rest);
  const saved = SESSIONS.length;
  const shipped = arms()
    .filter((a) => a.key === 'dev' || a.key === 'burst')
    .map((arm) => {
      const banks = browserFaithful(real, arm.carryOptionCount);
      const distinct = new Set<string>();
      for (const child of fixedSeed) {
        for (const code of runSession(banks, arm.config, child).served) distinct.add(code);
      }
      return { arm, distinct: distinct.size };
    });
  for (const s of shipped) {
    console.log(
      `  ${s.arm.label.padEnd(34)} ${String(s.distinct)} distinct types over ${String(saved)} sessions`,
    );
  }
  console.log(
    '\n  With one constant seed the selection draws are identical in every sitting, so this is what\n' +
      '  a cohort of children really meets today. It is the number the variety work reported.',
  );
}
