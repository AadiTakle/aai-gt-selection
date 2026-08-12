import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pCorrect } from '@gt/engine';
import { compileCatalog } from '@platform/catalog';
import {
  CRITERIA_V1,
  DEFAULT_VARIETY_CONFIG,
  type DomainName,
  type SelectionCandidate,
} from '@platform/domain';
import { computeSheet, toEngineConfig, type TraceEntry } from '@platform/scoring';
import { buildIndex, rngFor, selectDeterministic, selectNext, type ExposureSnapshot } from '@platform/selection';

/**
 * Measure Bramblebrook, specifically.
 *
 * The variety figures in `aws-question-platform.md` were taken over the whole catalogue — 4,934 items across
 * 36 types. Bramblebrook serves seven types and 800 items, which is the hard case for every one of those
 * numbers: a thin pool has fewer near-optimal items to choose between, so exposure concentrates and openings
 * repeat. Reporting the catalogue-wide figures as if they described the game would be quietly wrong.
 *
 * Everything here drives the platform's own `selectNext` and `computeSheet`, so it measures the code that runs
 * rather than a model of it.
 *
 * Run: npm run measure:bramblebrook [sessions]
 */

const BRAMBLEBROOK_TYPES = [
  'FLU-MATRIX-01',
  'FLU-CARPET-01',
  'QUANT-SERIES-01',
  'QUANT-FUNC-01',
  'QUANT-BALANCE-01',
  'VER-SORTBOT-01',
  'VER-RELPAIR-01',
] as const;

const CUT = CRITERIA_V1.abilityThreshold;
const PRECISION = { confidenceAbove: 0.75, confidenceBelow: 0.97, minItems: 12, maxItems: 24 };
const PER_DOMAIN_MINIMUM = 2;
const RECOMMEND_PROBABILITY = 0.3;

const ENGINE_CONFIG = toEngineConfig({
  abilityThreshold: CUT,
  recommendProbability: RECOMMEND_PROBABILITY,
  precision: PRECISION,
  perDomainMinimum: PER_DOMAIN_MINIMUM,
  domainBar: CRITERIA_V1.domainBar,
  domainRecommendProbability: CRITERIA_V1.domainRequiredProbability,
});

/** Standard-normal draw, seeded, so two policies see the same cohort. */
function abilityFor(seed: string): number {
  const rng = rngFor(seed, 0);
  const u = Math.max(1e-12, rng.next());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng.next());
}

interface SessionOutcome {
  readonly theta: number;
  readonly itemsToDecision: number;
  readonly decision: string | null;
  readonly stopReason: string | null;
  readonly passRoute: string | null;
  readonly meetsCriteria: boolean;
  readonly openingB: number | null;
  readonly openingType: string | null;
  readonly bSeen: readonly number[];
  readonly itemIds: readonly string[];
  readonly typeCodes: readonly string[];
  readonly domains: readonly DomainName[];
}

function runSession(
  index: ReturnType<typeof buildIndex>,
  seed: string,
  theta: number,
  exposure: ExposureSnapshot,
  select: typeof selectNext,
  variety = DEFAULT_VARIETY_CONFIG,
): SessionOutcome {
  const trace: TraceEntry[] = [];
  const used = new Set<string>();
  const typeCounts = new Map<string, number>();
  const domainCounts = new Map<DomainName, number>();
  let lastDomain: DomainName | null = null;
  const answers = rngFor(`${seed}:answers`, 0);
  const itemIds: string[] = [];
  const typeCodes: string[] = [];
  const domains: DomainName[] = [];
  const bSeen: number[] = [];

  for (let ordinal = 1; ordinal <= PRECISION.maxItems + 1; ordinal += 1) {
    const sheet = computeSheet({
      sessionId: seed,
      snapshotId: index.snapshotId,
      config: ENGINE_CONFIG,
      criteria: CRITERIA_V1,
      trace,
      candidates: index.items,
      itemsServed: trace.length,
      computedAt: '2026-08-12T00:00:00.000Z',
    });
    if (sheet.stopped) {
      return {
        theta,
        itemsToDecision: trace.length,
        decision: sheet.decision,
        stopReason: sheet.stopReason,
        passRoute: sheet.passRoute ? sheet.passRoute.via : null,
        meetsCriteria: sheet.meetsCriteria,
        openingB: bSeen[0] ?? null,
        openingType: typeCodes[0] ?? null,
        bSeen,
        itemIds,
        typeCodes,
        domains,
      };
    }

    const chosen = select({
      index,
      threshold: CUT,
      ordinal,
      rngSeed: seed,
      approvedTypes: new Set(BRAMBLEBROOK_TYPES),
      ageBand: null,
      maxReadingBand: 'none',
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
    const correct = answers.next() < pCorrect(theta, candidate.params);
    trace.push({
      ordinal,
      itemId: candidate.itemId,
      typeCode: candidate.typeCode,
      domain: candidate.domain,
      difficulty: candidate.difficulty,
      params: candidate.params,
      correct,
      latencyMs: 6000,
      rawResponse: null,
      flags: [],
    });
    itemIds.push(candidate.itemId);
    typeCodes.push(candidate.typeCode);
    domains.push(candidate.domain);
    bSeen.push(candidate.params.b);
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
    trace,
    candidates: index.items,
    itemsServed: trace.length,
    poolExhausted: true,
    computedAt: '2026-08-12T00:00:00.000Z',
  });
  return {
    theta,
    itemsToDecision: trace.length,
    decision: final.decision,
    stopReason: final.stopReason,
    passRoute: final.passRoute ? final.passRoute.via : null,
    meetsCriteria: final.meetsCriteria,
    openingB: bSeen[0] ?? null,
    openingType: typeCodes[0] ?? null,
    bSeen,
    itemIds,
    typeCodes,
    domains,
  };
}

/** Same session loop, with the config and cap varied for the sweep. */
function runSessionWith(
  index: ReturnType<typeof buildIndex>,
  seed: string,
  theta: number,
  exposure: ExposureSnapshot,
  config: ReturnType<typeof toEngineConfig>,
  maxItems: number,
): SessionOutcome {
  const trace: TraceEntry[] = [];
  const used = new Set<string>();
  const typeCounts = new Map<string, number>();
  const domainCounts = new Map<DomainName, number>();
  let lastDomain: DomainName | null = null;
  const answers = rngFor(`${seed}:answers`, 0);
  const itemIds: string[] = [];
  const typeCodes: string[] = [];
  const domains: DomainName[] = [];
  const bSeen: number[] = [];

  for (let ordinal = 1; ordinal <= maxItems + 1; ordinal += 1) {
    const sheet = computeSheet({
      sessionId: seed,
      snapshotId: index.snapshotId,
      config,
      criteria: CRITERIA_V1,
      trace,
      candidates: index.items,
      itemsServed: trace.length,
      computedAt: '2026-08-12T00:00:00.000Z',
    });
    if (sheet.stopped) {
      return {
        theta, itemsToDecision: trace.length, decision: sheet.decision, stopReason: sheet.stopReason,
        passRoute: sheet.passRoute ? sheet.passRoute.via : null, meetsCriteria: sheet.meetsCriteria,
        openingB: bSeen[0] ?? null, openingType: typeCodes[0] ?? null, bSeen, itemIds, typeCodes, domains,
      };
    }
    const chosen = selectNext({
      index, threshold: CUT, ordinal, rngSeed: seed,
      approvedTypes: new Set(BRAMBLEBROOK_TYPES), ageBand: null, maxReadingBand: 'none',
      allowSynthetic: true, usedItemIds: used, personaRecentItemIds: new Set(),
      typeServedCounts: typeCounts, domainServedCounts: domainCounts, lastDomain,
      perDomainMinimum: PER_DOMAIN_MINIMUM, variety: DEFAULT_VARIETY_CONFIG, exposure,
    });
    if (!chosen) break;
    const { candidate } = chosen;
    const correct = answers.next() < pCorrect(theta, candidate.params);
    trace.push({
      ordinal, itemId: candidate.itemId, typeCode: candidate.typeCode, domain: candidate.domain,
      difficulty: candidate.difficulty, params: candidate.params, correct, latencyMs: 6000,
      rawResponse: null, flags: [],
    });
    itemIds.push(candidate.itemId); typeCodes.push(candidate.typeCode); domains.push(candidate.domain);
    bSeen.push(candidate.params.b); used.add(candidate.itemId);
    typeCounts.set(candidate.typeCode, (typeCounts.get(candidate.typeCode) ?? 0) + 1);
    domainCounts.set(candidate.domain, (domainCounts.get(candidate.domain) ?? 0) + 1);
    lastDomain = candidate.domain;
  }
  const final = computeSheet({
    sessionId: seed, snapshotId: index.snapshotId, config, criteria: CRITERIA_V1, trace,
    candidates: index.items, itemsServed: trace.length, poolExhausted: true,
    computedAt: '2026-08-12T00:00:00.000Z',
  });
  return {
    theta, itemsToDecision: trace.length, decision: final.decision, stopReason: final.stopReason,
    passRoute: final.passRoute ? final.passRoute.via : null, meetsCriteria: final.meetsCriteria,
    openingB: bSeen[0] ?? null, openingType: typeCodes[0] ?? null, bSeen, itemIds, typeCodes, domains,
  };
}

function quantile(xs: readonly number[], q: number): number {
  const sorted = [...xs].sort((a, b) => a - b);
  if (sorted.length === 0) return Number.NaN;
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] as number;
}

function cohort(
  index: ReturnType<typeof buildIndex>,
  sessions: number,
  select: typeof selectNext,
  variety = DEFAULT_VARIETY_CONFIG,
) {
  const servedCounts = new Map<string, number>();
  const outcomes: SessionOutcome[] = [];
  for (let s = 0; s < sessions; s += 1) {
    const seed = `child-${s}`;
    const outcome = runSession(
      index,
      seed,
      abilityFor(seed),
      { sessionCount: s, servedCounts: new Map(servedCounts) },
      select,
      variety,
    );
    outcomes.push(outcome);
    for (const id of outcome.itemIds) servedCounts.set(id, (servedCounts.get(id) ?? 0) + 1);
  }
  return { outcomes, servedCounts };
}

const sessions = Number(process.argv[2] ?? 500);

console.log('compiling the catalogue...');
const compiled = compileCatalog({ snapshotId: 'snap-measure-001' });
const pool: SelectionCandidate[] = compiled.selectionIndex.filter((c) =>
  (BRAMBLEBROOK_TYPES as readonly string[]).includes(c.typeCode),
);
const index = buildIndex('snap-measure-001', pool);

console.log(`pool: ${pool.length} items across ${new Set(pool.map((c) => c.typeCode)).size} types`);
console.log(`cut: theta ${CUT} (95th percentile), budget ${PRECISION.maxItems} items`);
console.log(`simulating ${sessions} children...\n`);

const varied = cohort(index, sessions, selectNext);
const fixed = cohort(index, sessions, selectDeterministic);

// ---- questions to a decision
const items = varied.outcomes.map((o) => o.itemsToDecision);
const truly = varied.outcomes.filter((o) => o.theta > CUT);
const notTruly = varied.outcomes.filter((o) => o.theta <= CUT);
const decided = varied.outcomes.filter((o) => o.stopReason !== 'item-cap');

console.log('QUESTIONS TO A DECISION');
console.log(`  median            ${quantile(items, 0.5)}`);
console.log(`  90th percentile   ${quantile(items, 0.9)}`);
console.log(`  max               ${Math.max(...items)}`);
console.log(`  mean              ${(items.reduce((a, b) => a + b, 0) / items.length).toFixed(2)}`);
console.log(`  reached confidence rather than the cap: ${((decided.length / items.length) * 100).toFixed(1)}%`);
const capped = varied.outcomes.filter((o) => o.stopReason === 'item-cap');
console.log(`  hit the ${PRECISION.maxItems}-item cap: ${((capped.length / items.length) * 100).toFixed(1)}%`);

// ---- accuracy at the cut
const call = (o: SessionOutcome) => o.decision === 'recommend';
const acc = varied.outcomes.filter((o) => o.theta > CUT === call(o)).length / varied.outcomes.length;
const sens = truly.filter(call).length / Math.max(1, truly.length);
const spec = notTruly.filter((o) => !call(o)).length / Math.max(1, notTruly.length);
const fixedAcc = fixed.outcomes.filter((o) => o.theta > CUT === (o.decision === 'recommend')).length / fixed.outcomes.length;
console.log('\nDECISION QUALITY AT THE 95TH PERCENTILE');
console.log(`  truly above the cut in this cohort: ${truly.length} of ${sessions} (${((truly.length / sessions) * 100).toFixed(1)}%)`);
console.log(`  accuracy   ${acc.toFixed(3)}   (deterministic selection: ${fixedAcc.toFixed(3)})`);
console.log(`  sensitivity ${sens.toFixed(3)}  specificity ${spec.toFixed(3)}`);
console.log(`  met the outreach criteria: ${varied.outcomes.filter((o) => o.meetsCriteria).length}`);
const routes = new Map<string, number>();
for (const o of varied.outcomes) routes.set(String(o.passRoute), (routes.get(String(o.passRoute)) ?? 0) + 1);
console.log(`  pass routes: ${JSON.stringify(Object.fromEntries(routes))}`);

// ---- starting difficulty
const openings = varied.outcomes.map((o) => o.openingB).filter((b): b is number => b !== null);
console.log('\nSTARTING DIFFICULTY');
console.log(`  opening b: median ${quantile(openings, 0.5).toFixed(2)}, range ${Math.min(...openings).toFixed(2)} to ${Math.max(...openings).toFixed(2)}`);
const allB = varied.outcomes.flatMap((o) => o.bSeen);
console.log(`  every item served: median b ${quantile(allB, 0.5).toFixed(2)}, range ${Math.min(...allB).toFixed(2)} to ${Math.max(...allB).toFixed(2)}`);
const aboveGrade = allB.filter((b) => b > 0.64).length;
console.log(`  above the 4-5 band ceiling of 0.64: ${((aboveGrade / allB.length) * 100).toFixed(1)}% of items served`);

// ---- variety on the thin pool
function varietyOf(c: ReturnType<typeof cohort>) {
  const openingTally = new Map<string, number>();
  for (const o of c.outcomes) if (o.itemIds[0]) openingTally.set(o.itemIds[0], (openingTally.get(o.itemIds[0]) ?? 0) + 1);
  let adjacent = 0;
  let same = 0;
  let topTypeShare = 0;
  for (const o of c.outcomes) {
    for (let i = 1; i < o.domains.length; i += 1) {
      adjacent += 1;
      if (o.domains[i] === o.domains[i - 1]) same += 1;
    }
    const tally = new Map<string, number>();
    for (const t of o.typeCodes) tally.set(t, (tally.get(t) ?? 0) + 1);
    if (o.typeCodes.length > 0) topTypeShare += Math.max(...tally.values()) / o.typeCodes.length;
  }
  return {
    distinctOpenings: openingTally.size,
    modalOpeningShare: Math.max(0, ...openingTally.values()) / c.outcomes.length,
    maxExposure: Math.max(0, ...c.servedCounts.values()) / c.outcomes.length,
    poolTouched: c.servedCounts.size,
    sameDomainAdjacency: adjacent ? same / adjacent : 0,
    meanTopTypeShare: topTypeShare / c.outcomes.length,
    distinctSequences: new Set(c.outcomes.map((o) => o.itemIds.join('|'))).size,
  };
}
const vv = varietyOf(varied);
const vf = varietyOf(fixed);
console.log('\nVARIETY ON THE SEVEN-TYPE POOL');
console.log(`                          varied      deterministic`);
console.log(`  distinct openings       ${String(vv.distinctOpenings).padStart(6)}      ${vf.distinctOpenings}`);
console.log(`  modal opening share     ${(vv.modalOpeningShare * 100).toFixed(1).padStart(5)}%      ${(vf.modalOpeningShare * 100).toFixed(1)}%`);
console.log(`  highest item exposure   ${vv.maxExposure.toFixed(3).padStart(6)}      ${vf.maxExposure.toFixed(3)}`);
console.log(`  items touched of ${pool.length}    ${String(vv.poolTouched).padStart(6)}      ${vf.poolTouched}`);
console.log(`  same-domain adjacency   ${(vv.sameDomainAdjacency * 100).toFixed(1).padStart(5)}%      ${(vf.sameDomainAdjacency * 100).toFixed(1)}%`);
console.log(`  largest type share      ${(vv.meanTopTypeShare * 100).toFixed(1).padStart(5)}%      ${(vf.meanTopTypeShare * 100).toFixed(1)}%`);
console.log(`  distinct sequences      ${String(vv.distinctSequences).padStart(6)}      ${vf.distinctSequences}`);

// ---- how sensitivity trades against budget and against the recommendation bar
console.log('\nTRADE-OFFS  (sensitivity is what a screener is judged on: a missed child is the costly error)');
console.log('  budget  recBar   items(med)  sens    spec    acc     n_above');
const sweep: Record<string, unknown>[] = [];
for (const maxItems of [16, 24, 32]) {
  for (const recBar of [0.2, 0.3, 0.4]) {
    const config = toEngineConfig({
      abilityThreshold: CUT,
      recommendProbability: recBar,
      precision: { ...PRECISION, maxItems },
      perDomainMinimum: PER_DOMAIN_MINIMUM,
      domainBar: CRITERIA_V1.domainBar,
      domainRecommendProbability: CRITERIA_V1.domainRequiredProbability,
    });
    const outcomes: SessionOutcome[] = [];
    const counts = new Map<string, number>();
    for (let i = 0; i < sessions; i += 1) {
      const seed = `child-${i}`;
      const o = runSessionWith(index, seed, abilityFor(seed), { sessionCount: i, servedCounts: new Map(counts) }, config, maxItems);
      outcomes.push(o);
      for (const id of o.itemIds) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    const above = outcomes.filter((o) => o.theta > CUT);
    const below = outcomes.filter((o) => o.theta <= CUT);
    const rec = (o: SessionOutcome) => o.decision === 'recommend';
    const sv = above.filter(rec).length / Math.max(1, above.length);
    const sp = below.filter((o) => !rec(o)).length / Math.max(1, below.length);
    const ac = outcomes.filter((o) => (o.theta > CUT) === rec(o)).length / outcomes.length;
    const med = quantile(outcomes.map((o) => o.itemsToDecision), 0.5);
    console.log(`  ${String(maxItems).padStart(6)}  ${recBar.toFixed(2).padStart(6)}   ${String(med).padStart(10)}  ${sv.toFixed(3)}  ${sp.toFixed(3)}  ${ac.toFixed(3)}  ${String(above.length).padStart(6)}`);
    sweep.push({ maxItems, recommendProbability: recBar, medianItems: med, sensitivity: sv, specificity: sp, accuracy: ac, trulyAbove: above.length });
  }
}

const out = {
  generatedAt: new Date().toISOString(),
  sessions,
  cut: CUT,
  precision: PRECISION,
  perDomainMinimum: PER_DOMAIN_MINIMUM,
  recommendProbability: RECOMMEND_PROBABILITY,
  poolSize: pool.length,
  questions: {
    median: quantile(items, 0.5),
    p90: quantile(items, 0.9),
    max: Math.max(...items),
    mean: items.reduce((a, b) => a + b, 0) / items.length,
    reachedConfidenceShare: decided.length / items.length,
    hitCapShare: capped.length / items.length,
  },
  decisions: { accuracy: acc, sensitivity: sens, specificity: spec, deterministicAccuracy: fixedAcc, trulyAbove: truly.length },
  difficulty: {
    openingMedian: quantile(openings, 0.5),
    openingMin: Math.min(...openings),
    openingMax: Math.max(...openings),
    servedMedian: quantile(allB, 0.5),
    aboveGradeCeilingShare: aboveGrade / allB.length,
  },
  variety: { varied: vv, deterministic: vf },
  sweep,
};
mkdirSync(join(import.meta.dirname, '..', '..', 'docs', 'overnight'), { recursive: true });
writeFileSync(
  join(import.meta.dirname, '..', '..', 'docs', 'overnight', 'bramblebrook-measurements.json'),
  `${JSON.stringify(out, null, 2)}\n`,
);
console.log('\nwritten to docs/overnight/bramblebrook-measurements.json');
