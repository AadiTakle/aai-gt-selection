import { pCorrect } from '@gt/engine';
import { compileCatalog } from '@platform/catalog';
import {
  CRITERIA_V1,
  DEFAULT_VARIETY_CONFIG,
  DOMAIN_NAMES,
  type DomainName,
  type PrecisionConfig,
  type VarietyConfig,
} from '@platform/domain';
import { computeSheet, toEngineConfig, type TraceEntry } from '@platform/scoring';
import {
  buildIndex,
  rngFor,
  selectDeterministic,
  selectNext,
  type ExposureSnapshot,
  type SelectionIndex,
  type SelectionRequest,
} from '@platform/selection';

/**
 * What variety costs, measured against the real catalog.
 *
 * The variety layers trade measurement efficiency for unpredictability, and the only honest way to
 * choose their defaults is to price the trade. This runs simulated children of known ability through
 * the actual selection and scoring code — not a model of it — and reports four things: how many items a
 * decision takes, how often the decision matches what the deterministic engine would have concluded,
 * how varied the sessions are, and how far exposure spreads.
 *
 * A child is simulated by drawing theta from a standard normal and answering each item correctly with
 * probability pCorrect(theta, params). That is the same 3PL the engine scores with, so this measures
 * the selection policy rather than a mismatch between two models.
 *
 * Run: npm run simulate -- [sessions]
 */

const PRECISION: PrecisionConfig = {
  confidenceAbove: 0.75,
  confidenceBelow: 0.97,
  minItems: 8,
  maxItems: 16,
};
const THRESHOLD = CRITERIA_V1.abilityThreshold;
const PER_DOMAIN_MINIMUM = 1;

/** The engine's own config shape, built once so every simulated child is measured identically. */
const ENGINE_CONFIG = toEngineConfig({
  abilityThreshold: THRESHOLD,
  recommendProbability: 0.35,
  precision: PRECISION,
  perDomainMinimum: PER_DOMAIN_MINIMUM,
});

interface SessionOutcome {
  readonly theta: number;
  readonly itemsServed: number;
  readonly decision: string | null;
  readonly stopReason: string | null;
  readonly openingItemId: string | null;
  readonly itemIds: readonly string[];
  readonly typeCodes: readonly string[];
  readonly domains: readonly DomainName[];
}

/** Box-Muller, seeded, so two policies see the same cohort of children. */
function normalFor(seed: string): number {
  const rng = rngFor(seed, 0);
  const u = Math.max(1e-12, rng.next());
  const v = rng.next();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function runSession(
  index: SelectionIndex,
  approvedTypes: ReadonlySet<string>,
  seed: string,
  theta: number,
  variety: VarietyConfig,
  select: (req: SelectionRequest) => ReturnType<typeof selectNext>,
  exposure: ExposureSnapshot,
): SessionOutcome {
  const answered: TraceEntry[] = [];
  const itemIds: string[] = [];
  const typeCodes: string[] = [];
  const domains: DomainName[] = [];
  const used = new Set<string>();
  const typeCounts = new Map<string, number>();
  const domainCounts = new Map<DomainName, number>();
  let lastDomain: DomainName | null = null;
  const answerRng = rngFor(`${seed}:answers`, 0);

  for (let ordinal = 1; ordinal <= PRECISION.maxItems + 1; ordinal += 1) {
    const sheet = computeSheet({
      sessionId: seed,
      snapshotId: index.snapshotId,
      config: ENGINE_CONFIG,
      criteria: CRITERIA_V1,
      trace: answered,
      candidates: index.items,
      itemsServed: answered.length,
      poolExhausted: false,
      abandoned: false,
    });

    if (sheet.stopped) {
      return {
        theta,
        itemsServed: answered.length,
        decision: sheet.decision,
        stopReason: sheet.stopReason,
        openingItemId: itemIds[0] ?? null,
        itemIds,
        typeCodes,
        domains,
      };
    }

    const chosen = select({
      index,
      threshold: THRESHOLD,
      ordinal,
      rngSeed: seed,
      approvedTypes,
      ageBand: null,
      maxReadingBand: null,
      allowSynthetic: true,
      usedItemIds: used,
      personaRecentItemIds: new Set(),
      typeServedCounts: typeCounts,
      domainServedCounts: domainCounts,
      lastDomain,
      perDomainMinimum: PER_DOMAIN_MINIMUM,
      variety,
      exposure,
    });
    if (!chosen) break;

    const { candidate } = chosen;
    const correct = answerRng.next() < pCorrect(theta, candidate.params);
    answered.push({
      ordinal,
      itemId: candidate.itemId,
      typeCode: candidate.typeCode,
      domain: candidate.domain,
      difficulty: candidate.difficulty,
      params: candidate.params,
      correct,
      latencyMs: 4000,
      rawResponse: null,
      flags: [],
    });
    itemIds.push(candidate.itemId);
    typeCodes.push(candidate.typeCode);
    domains.push(candidate.domain);
    used.add(candidate.itemId);
    typeCounts.set(candidate.typeCode, (typeCounts.get(candidate.typeCode) ?? 0) + 1);
    domainCounts.set(candidate.domain, (domainCounts.get(candidate.domain) ?? 0) + 1);
    lastDomain = candidate.domain;
  }

  const final = computeSheet({
    sessionId: seed,
    snapshotId: index.snapshotId,
    config: ENGINE_CONFIG,
    criteria: CRITERIA_V1,
    trace: answered,
    candidates: index.items,
    itemsServed: answered.length,
    poolExhausted: true,
    abandoned: false,
  });

  return {
    theta,
    itemsServed: answered.length,
    decision: final.decision,
    stopReason: final.stopReason,
    openingItemId: itemIds[0] ?? null,
    itemIds,
    typeCodes,
    domains,
  };
}

interface PolicyReport {
  readonly label: string;
  readonly meanItems: number;
  readonly distinctOpenings: number;
  readonly modalOpeningShare: number;
  readonly maxExposureRate: number;
  readonly poolTouched: number;
  readonly sameDomainAdjacency: number;
  readonly meanTopTypeShare: number;
  readonly decisions: readonly (string | null)[];
  /**
   * Agreement with the child's actual ability, which is knowable here and is not knowable in
   * production.
   *
   * This is the metric that matters and the reason agreement-with-baseline is reported alongside it
   * rather than instead of it. The deterministic engine is not ground truth — it is one policy among
   * several, and near the threshold a short adaptive test is legitimately noisy. If variety and
   * determinism classify the true theta equally well, then disagreement between them is two policies
   * being noisy in different directions, not one of them being worse.
   */
  readonly accuracyVsTruth: number;
  readonly sensitivity: number;
  readonly specificity: number;
}

function runPolicy(
  label: string,
  index: SelectionIndex,
  approvedTypes: ReadonlySet<string>,
  sessions: number,
  variety: VarietyConfig,
  select: (req: SelectionRequest) => ReturnType<typeof selectNext>,
): PolicyReport {
  const servedCounts = new Map<string, number>();
  const outcomes: SessionOutcome[] = [];

  for (let s = 0; s < sessions; s += 1) {
    const seed = `child-${s}`;
    const exposure: ExposureSnapshot = { sessionCount: s, servedCounts: new Map(servedCounts) };
    const outcome = runSession(
      index,
      approvedTypes,
      seed,
      normalFor(seed),
      variety,
      select,
      exposure,
    );
    outcomes.push(outcome);
    for (const id of outcome.itemIds) servedCounts.set(id, (servedCounts.get(id) ?? 0) + 1);
  }

  const openings = outcomes.map((o) => o.openingItemId).filter((v): v is string => v !== null);
  const openingTally = new Map<string, number>();
  for (const id of openings) openingTally.set(id, (openingTally.get(id) ?? 0) + 1);

  let adjacent = 0;
  let sameDomain = 0;
  let topTypeShareSum = 0;
  for (const o of outcomes) {
    for (let i = 1; i < o.domains.length; i += 1) {
      adjacent += 1;
      if (o.domains[i] === o.domains[i - 1]) sameDomain += 1;
    }
    const tally = new Map<string, number>();
    for (const code of o.typeCodes) tally.set(code, (tally.get(code) ?? 0) + 1);
    if (o.typeCodes.length > 0) {
      topTypeShareSum += Math.max(...tally.values()) / o.typeCodes.length;
    }
  }

  let correctCalls = 0;
  let truePositives = 0;
  let actualPositives = 0;
  let trueNegatives = 0;
  let actualNegatives = 0;
  for (const o of outcomes) {
    const trulyAbove = o.theta > THRESHOLD;
    const calledAbove = o.decision === 'recommend';
    if (trulyAbove === calledAbove) correctCalls += 1;
    if (trulyAbove) {
      actualPositives += 1;
      if (calledAbove) truePositives += 1;
    } else {
      actualNegatives += 1;
      if (!calledAbove) trueNegatives += 1;
    }
  }

  return {
    label,
    meanItems: outcomes.reduce((s, o) => s + o.itemsServed, 0) / outcomes.length,
    distinctOpenings: openingTally.size,
    modalOpeningShare: openings.length ? Math.max(...openingTally.values()) / openings.length : 0,
    maxExposureRate: Math.max(0, ...servedCounts.values()) / sessions,
    poolTouched: servedCounts.size,
    sameDomainAdjacency: adjacent ? sameDomain / adjacent : 0,
    meanTopTypeShare: topTypeShareSum / outcomes.length,
    decisions: outcomes.map((o) => o.decision),
    accuracyVsTruth: correctCalls / outcomes.length,
    sensitivity: actualPositives ? truePositives / actualPositives : 0,
    specificity: actualNegatives ? trueNegatives / actualNegatives : 0,
  };
}

function agreement(a: readonly (string | null)[], b: readonly (string | null)[]): number {
  let same = 0;
  for (let i = 0; i < a.length; i += 1) if (a[i] === b[i]) same += 1;
  return same / a.length;
}

const sessions = Number(process.argv[2] ?? 1000);

console.log('compiling the real catalog...');
const compiled = compileCatalog({ snapshotId: 'snap-sim-001' });
const index = buildIndex('snap-sim-001', compiled.selectionIndex);
const approvedTypes = new Set(compiled.selectionIndex.map((c) => c.typeCode));

console.log(
  `pool: ${index.items.length} scorable items across ${approvedTypes.size} types ` +
    `(of ${compiled.stats.typeCount} in the catalog)`,
);
console.log(
  `simulating ${sessions} children, threshold ${THRESHOLD} logits, ` +
    `precision ${PRECISION.minItems}-${PRECISION.maxItems} items\n`,
);

const baseline = runPolicy(
  'deterministic argmax',
  index,
  approvedTypes,
  sessions,
  DEFAULT_VARIETY_CONFIG,
  selectDeterministic,
);

const policies: readonly { label: string; variety: VarietyConfig }[] = [
  { label: 'default (K=3, exp=3)', variety: DEFAULT_VARIETY_CONFIG },
  {
    label: 'wider band (K=6)',
    variety: { ...DEFAULT_VARIETY_CONFIG, randomesqueK: 6 },
  },
  {
    label: 'wider band (K=10)',
    variety: { ...DEFAULT_VARIETY_CONFIG, randomesqueK: 10 },
  },
  {
    label: 'softer exposure (exp=1)',
    variety: { ...DEFAULT_VARIETY_CONFIG, exposureDampingExponent: 1 },
  },
  {
    label: 'harder exposure (exp=6)',
    variety: { ...DEFAULT_VARIETY_CONFIG, exposureDampingExponent: 6 },
  },
  {
    label: 'no type damping',
    variety: { ...DEFAULT_VARIETY_CONFIG, sameTypeDamping: false },
  },
  {
    label: 'interleave tol 0.30',
    variety: { ...DEFAULT_VARIETY_CONFIG, domainInterleaveTolerance: 0.3 },
  },
  {
    label: 'interleave tol 0.60',
    variety: { ...DEFAULT_VARIETY_CONFIG, domainInterleaveTolerance: 0.6 },
  },
];

const reports = [baseline, ...policies.map((p) => runPolicy(p.label, index, approvedTypes, sessions, p.variety, selectNext))];

const header = [
  'policy'.padEnd(26),
  'items'.padStart(6),
  'acc'.padStart(6),
  'sens'.padStart(6),
  'spec'.padStart(6),
  'agree'.padStart(7),
  'opens'.padStart(6),
  'modal'.padStart(7),
  'maxExp'.padStart(7),
  'pool'.padStart(6),
  'sameDom'.padStart(8),
  'topType'.padStart(8),
].join(' ');
console.log(header);
console.log('-'.repeat(header.length));

for (const r of reports) {
  console.log(
    [
      r.label.padEnd(26),
      r.meanItems.toFixed(2).padStart(6),
      r.accuracyVsTruth.toFixed(3).padStart(6),
      r.sensitivity.toFixed(3).padStart(6),
      r.specificity.toFixed(3).padStart(6),
      (r === baseline ? '—' : agreement(r.decisions, baseline.decisions).toFixed(3)).padStart(7),
      String(r.distinctOpenings).padStart(6),
      `${(r.modalOpeningShare * 100).toFixed(1)}%`.padStart(7),
      r.maxExposureRate.toFixed(3).padStart(7),
      String(r.poolTouched).padStart(6),
      `${(r.sameDomainAdjacency * 100).toFixed(1)}%`.padStart(8),
      `${(r.meanTopTypeShare * 100).toFixed(1)}%`.padStart(8),
    ].join(' '),
  );
}

console.log(`
items    mean items to a decision — the cost of variety
acc      accuracy against the child's true ability, which is the metric that matters
sens     sensitivity: truly-above children who were recommended
spec     specificity: truly-below children who were not
agree    decision agreement with the deterministic baseline, same children
opens    distinct opening items across ${sessions} sessions
modal    share of sessions opening on the single most common item
maxExp   highest share of sessions any one item appeared in
pool     distinct items the cohort touched, of ${index.items.length}
sameDom  adjacent pairs that repeated a domain
topType  largest share of one session taken by a single type`);
