import { information } from '@gt/engine';
import { DOMAIN_NAMES, type DomainName, type SelectionCandidate } from '@platform/domain';
import { domainsOwed, eligible } from './eligibility.js';
import { exposureDamping } from './exposure.js';
import type { SelectionRequest, SelectionResult } from './request.js';
import { rngFor, type Rng } from './rng.js';

/**
 * Choose the next question.
 *
 * The measurement core is unchanged from the prototype: maximise Fisher information at the decision
 * threshold rather than at the running estimate, because the question worth asking is the one that
 * best separates above the line from below it, not the one that pins down a score.
 *
 * What is new is that the answer is no longer an argmax. Argmax over a fixed pool is deterministic,
 * which is why every prototype session asks the same questions in the same order. Six layers sit
 * between the information score and the choice, and each one costs a little precision. Their
 * defaults are measured by simulation, not asserted.
 */

interface Scored {
  readonly candidate: SelectionCandidate;
  readonly info: number;
  readonly score: number;
}

function sameTypeMultiplier(req: SelectionRequest, candidate: SelectionCandidate): number {
  if (!req.variety.sameTypeDamping) return 1;
  const served = req.typeServedCounts.get(candidate.typeCode) ?? 0;
  // Eight items of one type measures that type, not the domain it sits in. This is as much a
  // construct-validity control as a variety one.
  return 1 / (1 + served);
}

function scoreAll(req: SelectionRequest, pool: readonly SelectionCandidate[]): Scored[] {
  return pool.map((candidate) => {
    const info = information(req.threshold, candidate.params);
    const score =
      info *
      sameTypeMultiplier(req, candidate) *
      exposureDamping(
        candidate.itemId,
        req.exposure,
        req.variety.targetExposureRate,
        req.variety.exposureDampingExponent,
      );
    return { candidate, info, score };
  });
}

/**
 * Prefer a different domain from the last one, but only when it is nearly free.
 *
 * Implemented as a restriction rather than a penalty so the tolerance means what it says: if the
 * best off-domain candidate scores within `domainInterleaveTolerance` of the best overall, drop the
 * same-domain candidates entirely. Otherwise leave the pool alone and accept the repeat.
 */
function interleaveDomains(req: SelectionRequest, scored: readonly Scored[]): readonly Scored[] {
  if (req.lastDomain === null || scored.length === 0) return scored;

  const offDomain = scored.filter((s) => s.candidate.domain !== req.lastDomain);
  if (offDomain.length === 0) return scored;

  const bestOverall = Math.max(...scored.map((s) => s.score));
  const bestOff = Math.max(...offDomain.map((s) => s.score));
  if (bestOverall <= 0) return offDomain;

  return bestOff >= bestOverall * (1 - req.variety.domainInterleaveTolerance) ? offDomain : scored;
}

/**
 * How wide the randomesque band is.
 *
 * Wide early, narrow later. Early in a session the posterior is broad and the information difference
 * between the best candidate and the fiftieth is numerically trivial, so taking the argmax buys
 * almost no precision and costs all the variety. Once the posterior has tightened, the best item is
 * meaningfully better and the band closes.
 */
function bandWidth(req: SelectionRequest, poolSize: number): number {
  const base = Math.max(1, req.variety.randomesqueK);
  if (req.ordinal > req.variety.earlyItemCount) return Math.min(base, poolSize);
  const wide = Math.ceil(req.variety.earlyKFraction * poolSize);
  return Math.min(Math.max(base, wide), poolSize);
}

function drawFrom(scored: readonly Scored[], k: number, rng: Rng): Scored {
  const ranked = [...scored].sort((a, b) => b.score - a.score).slice(0, Math.max(1, k));
  return rng.weighted(
    ranked,
    ranked.map((s) => s.score),
  );
}

/**
 * The opening question.
 *
 * A single global argmax at the threshold is the same item for every session, which is the most
 * visible way a deterministic engine gives itself away: every child sees the same first question.
 * Instead the opening is drawn from a difficulty band around the threshold, in a seeded domain, and
 * weighted by inverse exposure rather than by information — because at ordinal one there is no
 * evidence yet, so every item in the band is equally defensible and spreading the load is free.
 */
function selectOpening(
  req: SelectionRequest,
  pool: readonly SelectionCandidate[],
  rng: Rng,
): SelectionResult | null {
  const inBand = pool.filter(
    (c) => Math.abs(c.params.b - req.threshold) <= req.variety.openingJitterLogits,
  );
  const banded = inBand.length > 0 ? inBand : pool;

  const domainsPresent = DOMAIN_NAMES.filter((d) => banded.some((c) => c.domain === d));
  if (domainsPresent.length === 0) return null;
  const openingDomain = rng.pick(domainsPresent);
  const withinDomain = banded.filter((c) => c.domain === openingDomain);

  const weights = withinDomain.map(
    (c) =>
      exposureDamping(
        c.itemId,
        req.exposure,
        req.variety.targetExposureRate,
        req.variety.exposureDampingExponent,
      ) + 1e-9,
  );
  const candidate = rng.weighted(withinDomain, weights);

  return {
    candidate,
    trace: {
      reason:
        `opening draw in ${openingDomain} from ${withinDomain.length} items within ` +
        `${req.variety.openingJitterLogits} logits of threshold ${req.threshold.toFixed(2)}`,
      informationAtThreshold: information(req.threshold, candidate.params),
      candidatePoolSize: pool.length,
      k: withinDomain.length,
      layer: 'opening',
    },
  };
}

export function selectNext(req: SelectionRequest): SelectionResult | null {
  const pool = eligible(req);
  if (pool.length === 0) return null;

  const rng = rngFor(req.rngSeed, req.ordinal);

  const owed = domainsOwed(req, pool);
  const covered = owed.length > 0 ? pool.filter((c) => owed.includes(c.domain)) : pool;

  // Coverage outranks the randomised opening: a blueprint the stop rule depends on is not
  // negotiable for the sake of a livelier first question. A jitter of zero switches the layer off,
  // so that disabling every variety setting really does produce a deterministic engine.
  if (req.ordinal <= 1 && owed.length === 0 && req.variety.openingJitterLogits > 0) {
    const opening = selectOpening(req, covered, rng);
    if (opening) return opening;
  }

  const scored = interleaveDomains(req, scoreAll(req, covered));
  const k = bandWidth(req, scored.length);
  const chosen = drawFrom(scored, k, rng);

  const layer = owed.length > 0 ? 'coverage' : 'randomesque';
  const forced =
    owed.length > 0 ? `blueprint minimum owed to ${owed.join(', ')}; ` : '';

  return {
    candidate: chosen.candidate,
    trace: {
      reason:
        `${forced}sampled from the top ${k} of ${scored.length} by damped information at ` +
        `threshold ${req.threshold.toFixed(2)}; information ${chosen.info.toFixed(4)}, ` +
        `score ${chosen.score.toFixed(4)}`,
      informationAtThreshold: chosen.info,
      candidatePoolSize: pool.length,
      k,
      layer,
    },
  };
}

/** Exported for the simulation harness, which reports how much precision variety is costing. */
export function selectDeterministic(req: SelectionRequest): SelectionResult | null {
  const pool = eligible(req);
  if (pool.length === 0) return null;
  const owed = domainsOwed(req, pool);
  const covered = owed.length > 0 ? pool.filter((c) => owed.includes(c.domain)) : pool;

  let best: Scored | null = null;
  for (const candidate of covered) {
    const info = information(req.threshold, candidate.params);
    if (!best || info > best.info) best = { candidate, info, score: info };
  }
  if (!best) return null;

  return {
    candidate: best.candidate,
    trace: {
      reason: `highest information at threshold ${req.threshold.toFixed(2)} (${best.info.toFixed(4)})`,
      informationAtThreshold: best.info,
      candidatePoolSize: pool.length,
      k: 1,
      layer: 'deterministic',
    },
  };
}

export function domainOfLast(
  results: readonly { readonly candidate: SelectionCandidate }[],
): DomainName | null {
  const last = results[results.length - 1];
  return last ? last.candidate.domain : null;
}
