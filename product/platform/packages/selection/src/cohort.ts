import {
  DEFAULT_VARIETY_CONFIG,
  type DomainName,
  type SelectionCandidate,
  type VarietyConfig,
} from '@platform/domain';
import type { ExposureSnapshot } from './exposure.js';
import type { SelectionIndex } from './index-model.js';
import type { SelectionRequest } from './request.js';
import { selectNext } from './select.js';

/**
 * Run many sessions through selection, carrying exposure forward between them.
 *
 * Carrying exposure forward is the whole point. Exposure control is a property of a cohort, not of a
 * session: within one session no item repeats anyway, so a per-session view would show the control
 * doing nothing. This is also the harness the variety defaults are tuned on, which is why it lives in
 * the package rather than in a test file.
 */

export interface CohortOptions {
  readonly index: SelectionIndex;
  readonly sessions: number;
  readonly itemsPerSession: number;
  readonly variety?: VarietyConfig;
  readonly threshold?: number;
  readonly perDomainMinimum?: number;
  readonly select?: (req: SelectionRequest) => { candidate: SelectionCandidate } | null;
  readonly seedPrefix?: string;
}

export interface SessionTrace {
  readonly seed: string;
  readonly itemIds: readonly string[];
  readonly typeCodes: readonly string[];
  readonly domains: readonly DomainName[];
}

export interface CohortReport {
  readonly sessions: readonly SessionTrace[];
  readonly servedCounts: ReadonlyMap<string, number>;
  readonly sessionCount: number;
  /** Distinct opening items, over the number of sessions. */
  readonly distinctOpenings: number;
  /** Share of sessions whose opening item was the single most common opening. */
  readonly modalOpeningShare: number;
  /** Highest observed served-count / sessions across all items. */
  readonly maxExposureRate: number;
  /** Largest share of one session taken by a single type, averaged over sessions. */
  readonly meanTopTypeShare: number;
  /** Share of adjacent pairs that repeated a domain. */
  readonly sameDomainAdjacencyRate: number;
  readonly meanItemsServed: number;
}

export function runCohort(options: CohortOptions): CohortReport {
  const {
    index,
    sessions: sessionCount,
    itemsPerSession,
    variety = DEFAULT_VARIETY_CONFIG,
    threshold = 1.0,
    perDomainMinimum = 0,
    select = selectNext,
    seedPrefix = 'cohort',
  } = options;

  const servedCounts = new Map<string, number>();
  const traces: SessionTrace[] = [];

  for (let s = 0; s < sessionCount; s++) {
    const seed = `${seedPrefix}-${s}`;
    const itemIds: string[] = [];
    const typeCodes: string[] = [];
    const domains: DomainName[] = [];

    const used = new Set<string>();
    const typeCounts = new Map<string, number>();
    const domainCounts = new Map<DomainName, number>();
    let lastDomain: DomainName | null = null;

    // The snapshot is read once per session, as a real session does: exposure updates within a
    // session do not change the denominator the session was started with.
    const exposure: ExposureSnapshot = {
      sessionCount: s,
      servedCounts: new Map(servedCounts),
    };

    for (let ordinal = 1; ordinal <= itemsPerSession; ordinal++) {
      const request: SelectionRequest = {
        index,
        threshold,
        ordinal,
        rngSeed: seed,
        approvedTypes: new Set(index.items.map((c) => c.typeCode)),
        withheldItemIds: new Set<string>(),
        ageBand: null,
        maxReadingBand: null,
        allowSynthetic: true,
        usedItemIds: used,
        personaRecentItemIds: new Set(),
        typeServedCounts: typeCounts,
        domainServedCounts: domainCounts,
        lastDomain,
        perDomainMinimum,
        variety,
        exposure,
      };

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
      servedCounts.set(candidate.itemId, (servedCounts.get(candidate.itemId) ?? 0) + 1);
    }

    traces.push({ seed, itemIds, typeCodes, domains });
  }

  const openings = traces.map((t) => t.itemIds[0]).filter((id): id is string => id !== undefined);
  const openingTally = new Map<string, number>();
  for (const id of openings) openingTally.set(id, (openingTally.get(id) ?? 0) + 1);
  const modalOpening = Math.max(0, ...openingTally.values());

  let adjacentPairs = 0;
  let sameDomainPairs = 0;
  let topTypeShareSum = 0;
  let itemsSum = 0;

  for (const trace of traces) {
    for (let i = 1; i < trace.domains.length; i++) {
      adjacentPairs += 1;
      if (trace.domains[i] === trace.domains[i - 1]) sameDomainPairs += 1;
    }
    const tally = new Map<string, number>();
    for (const code of trace.typeCodes) tally.set(code, (tally.get(code) ?? 0) + 1);
    if (trace.typeCodes.length > 0) {
      topTypeShareSum += Math.max(...tally.values()) / trace.typeCodes.length;
    }
    itemsSum += trace.itemIds.length;
  }

  return {
    sessions: traces,
    servedCounts,
    sessionCount,
    distinctOpenings: openingTally.size,
    modalOpeningShare: openings.length === 0 ? 0 : modalOpening / openings.length,
    maxExposureRate:
      sessionCount === 0 ? 0 : Math.max(0, ...servedCounts.values()) / sessionCount,
    meanTopTypeShare: traces.length === 0 ? 0 : topTypeShareSum / traces.length,
    sameDomainAdjacencyRate: adjacentPairs === 0 ? 0 : sameDomainPairs / adjacentPairs,
    meanItemsServed: traces.length === 0 ? 0 : itemsSum / traces.length,
  };
}
