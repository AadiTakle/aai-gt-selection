import {
  DEFAULT_VARIETY_CONFIG,
  DOMAIN_NAMES,
  domainFromTypeCode,
  type DomainName,
  type SelectionCandidate,
  type VarietyConfig,
} from '@platform/domain';
import { buildIndex, type SelectionIndex } from './index-model.js';
import type { SelectionRequest } from './request.js';

/**
 * A synthetic bank with a shape close to the real one: several types per domain, difficulties spread
 * across the authoring range, four options each.
 *
 * Synthetic rather than the real banks on purpose. These tests are about the selection algorithm, and
 * pinning them to the current contents of `qbank-library` would make them fail when an item is
 * revised for unrelated reasons. The catalog package owns the golden test against the real banks.
 */

const TYPE_PREFIX: Readonly<Record<DomainName, string>> = {
  quantitative: 'QUANT-TEST',
  verbal: 'VER-TEST',
  spatial: 'SPA-TEST',
  fluid: 'FLU-TEST',
};

export interface FixtureOptions {
  readonly typesPerDomain?: number;
  readonly itemsPerType?: number;
  readonly readingBand?: string | null;
  readonly syntheticOnly?: boolean;
}

export function makeCandidates(options: FixtureOptions = {}): SelectionCandidate[] {
  const typesPerDomain = options.typesPerDomain ?? 3;
  const itemsPerType = options.itemsPerType ?? 10;
  const out: SelectionCandidate[] = [];

  for (const domain of DOMAIN_NAMES) {
    for (let t = 1; t <= typesPerDomain; t++) {
      const typeCode = `${TYPE_PREFIX[domain]}${t}-01`;
      for (let i = 0; i < itemsPerType; i++) {
        // Difficulties spread from -2.5 to +2.5 logits, which brackets the decision threshold.
        const b = -2.5 + (5 * i) / Math.max(1, itemsPerType - 1);
        out.push({
          itemId: `${typeCode}-i${i}`,
          itemRevision: 1,
          typeCode,
          domain,
          params: { b: Number(b.toFixed(4)), a: 1.5, c: 0.25 },
          difficulty: Number((b * 3 + 10.5).toFixed(2)),
          optionCount: 4,
          ageBands: ['3-5'],
          scoringMode: 'deterministic_key',
          readingBand: options.readingBand ?? null,
          syntheticOnly: options.syntheticOnly ?? false,
        });
      }
    }
  }
  return out;
}

export function makeIndex(options: FixtureOptions = {}): SelectionIndex {
  return buildIndex('snap-fixture-001', makeCandidates(options));
}

export function allTypeCodesOf(index: SelectionIndex): Set<string> {
  return new Set(index.items.map((i) => i.typeCode));
}

export function makeRequest(
  index: SelectionIndex,
  overrides: Partial<SelectionRequest> = {},
): SelectionRequest {
  return {
    index,
    threshold: 1.0,
    ordinal: 1,
    rngSeed: 'seed-a',
    approvedTypes: allTypeCodesOf(index),
    ageBand: null,
    maxReadingBand: null,
    allowSynthetic: true,
    usedItemIds: new Set(),
    personaRecentItemIds: new Set(),
    typeServedCounts: new Map(),
    domainServedCounts: new Map(),
    lastDomain: null,
    perDomainMinimum: 0,
    variety: DEFAULT_VARIETY_CONFIG,
    exposure: null,
    ...overrides,
  };
}

/**
 * Every variety layer switched off, which should reduce `selectNext` to the prototype's argmax.
 *
 * Used as the control in the variety tests. If this ever stops producing one distinct opening across
 * a thousand sessions, a layer has grown a source of randomness its config cannot disable.
 */
export function varietyOff(): VarietyConfig {
  return {
    ...DEFAULT_VARIETY_CONFIG,
    randomesqueK: 1,
    earlyKFraction: 0,
    earlyItemCount: 0,
    sameTypeDamping: false,
    domainInterleaveTolerance: 0,
    targetExposureRate: 0,
    exposureDampingExponent: 1,
    openingJitterLogits: 0,
  };
}

export interface SimulatedSession {
  readonly itemIds: readonly string[];
  readonly typeCodes: readonly string[];
  readonly domains: readonly DomainName[];
}

/**
 * Run one session's worth of selections, updating the counters the way a real session would.
 *
 * The engine under test is `selectNext` alone: responses are not scored and the posterior does not
 * move, because these tests are about which questions get offered rather than about what is concluded
 * from the answers.
 */
export function simulateSelections(
  select: (req: SelectionRequest) => { candidate: SelectionCandidate } | null,
  index: SelectionIndex,
  seed: string,
  count: number,
  overrides: Partial<SelectionRequest> = {},
): SimulatedSession {
  const itemIds: string[] = [];
  const typeCodes: string[] = [];
  const domains: DomainName[] = [];
  const used = new Set<string>();
  const typeCounts = new Map<string, number>();
  const domainCounts = new Map<DomainName, number>();
  let lastDomain: DomainName | null = null;

  for (let ordinal = 1; ordinal <= count; ordinal++) {
    const request = makeRequest(index, {
      rngSeed: seed,
      ordinal,
      usedItemIds: used,
      typeServedCounts: typeCounts,
      domainServedCounts: domainCounts,
      lastDomain,
      ...overrides,
    });
    const result = select(request);
    if (!result) break;

    const { candidate } = result;
    itemIds.push(candidate.itemId);
    typeCodes.push(candidate.typeCode);
    domains.push(candidate.domain);
    used.add(candidate.itemId);
    typeCounts.set(candidate.typeCode, (typeCounts.get(candidate.typeCode) ?? 0) + 1);
    domainCounts.set(candidate.domain, (domainCounts.get(candidate.domain) ?? 0) + 1);
    lastDomain = candidate.domain;
  }

  return { itemIds, typeCodes, domains };
}

export { domainFromTypeCode };
