import type { BankItem, ExamDomain } from './item';
import type { Sequencer, SequencerContext } from './sequencer';
import type { ExamItemResult } from './types';

/**
 * TwoStageSequencer — a PROPOSED, UNAPPROVED, pluggable sequencing structure.
 *
 * ⚠️ This is one candidate structure among several. It is NOT ratified, NOT a
 * requirement, and never makes an admission or ability decision. It exists only
 * to make the author's two-regime Spiky PoV clickable end-to-end over a
 * born-synthetic bank. It implements the SAME {@link Sequencer} interface as
 * `FixedSequencer`, so it is a drop-in strategy — the session shell, player, and
 * scoring are untouched (structure-agnostic guardrail, see `sequencer.ts`).
 *
 * The design spec is
 * `brainlifting/test-structure-brainlift/brainlift-test-structure.md`:
 *
 *   Phase 1 — STANDING (accuracy). Insight 1: a child's standing is read most
 *   cleanly BELOW their limit with difficulty minimised. Insight 2: to find the
 *   limit, do NOT ramp-to-failure (that inflates rapid-guessing, anxiety, and
 *   effort loss) — BRACKET it and close in from both sides. So Phase 1 runs the
 *   single-select accuracy pool and, per domain, binary-searches the difficulty
 *   rungs: start moderate, then move toward the midpoint of the known-correct /
 *   known-incorrect bracket. It stops a domain on a precision rule (the bracket
 *   can't be narrowed further with the remaining items) OR a per-domain item cap,
 *   whichever comes first, and records the estimated per-domain level.
 *
 *   Phase 2 — LEARNING-RATE (effort). Insight 3: desirable difficulty hurts a
 *   standing estimate but is exactly what surfaces learning-rate. Once every
 *   domain's Phase-1 estimate is fixed, Phase 2 presents the effort/interactive
 *   (embedded-demo) task whose difficulty rung is NEAREST that estimate — hard
 *   enough to struggle, still learnable — where engagement/telemetry, not a
 *   single right/wrong, is the signal. It stops on a per-domain Phase-2 cap.
 *
 * Purity: `next()` is a pure function of the context (bank + what has been
 * presented + results so far), exactly like `FixedSequencer`. It keeps NO hidden
 * state, so a UI or test can also call {@link TwoStageSequencer.plan} (or
 * {@link planFromResults}) to reconstruct the full phase plan for a summary.
 *
 * On the standing estimator: a production build would drive Phase 1 with an IRT
 * classification rule (θ EAP from `@gt-selection/cat-engine` + SPRT/GLR at the
 * cut — the same "close in from both sides" behaviour). Because this synthetic
 * bank carries ordinal design rungs and no calibrated IRT parameters, the demo
 * uses a transparent running bracket over those rungs instead; it is the honest,
 * legible stand-in for the θ/SPRT path, not a calibrated measure (validated=false).
 */

/** Regime for a given item / the next selection. */
export type TwoStagePhase = 'standing' | 'learning-rate' | 'complete';

export interface TwoStageOptions {
  /** Max STANDING (Phase-1) items presented per domain before the bracket stops. */
  phase1CapPerDomain?: number;
  /** Number of LEARNING-RATE (Phase-2) effort tasks presented per domain. */
  phase2PerDomain?: number;
}

const DEFAULTS: Required<TwoStageOptions> = {
  phase1CapPerDomain: 4,
  phase2PerDomain: 1,
};

/** Canonical domain order (mirrors `sequencer.ts` for a stable, balanced rotation). */
const DOMAIN_ROTATION: readonly ExamDomain[] = [
  'fluid_reasoning',
  'verbal',
  'quantitative',
  'spatial',
];

function rotationIndex(domain: ExamDomain): number {
  const idx = DOMAIN_ROTATION.indexOf(domain);
  return idx < 0 ? DOMAIN_ROTATION.length : idx;
}

/** Per-domain standing estimate produced by the Phase-1 bracket. */
export interface DomainStanding {
  domain: ExamDomain;
  /** Highest STANDING rung answered correctly (the lower bracket bound), or null. */
  floorCorrect: number | null;
  /** Lowest STANDING rung answered incorrectly (the upper bracket bound), or null. */
  ceilingIncorrect: number | null;
  /** STANDING items presented in this domain so far. */
  presented: number;
  /** Estimated standing level (ordinal rung); null if nothing scorable answered. */
  estimate: number | null;
  /** True once this domain's Phase-1 bracket has met its stop rule. */
  stopped: boolean;
  stopReason: 'bracketed' | 'cap' | null;
}

/** A Phase-2 effort task actually placed against a domain's standing estimate. */
export interface PhasePlacement {
  domain: ExamDomain;
  /** The Phase-1 estimate this placement targeted. */
  estimate: number | null;
  /** The effort rung actually chosen (nearest available to the estimate). */
  chosenRung: number;
  itemId: string;
  typeCode: string;
}

/** One presented item, tagged with its regime (for the summary / audit view). */
export interface PresentedFacet {
  order: number;
  itemId: string;
  typeCode: string;
  domain: ExamDomain;
  phase: Exclude<TwoStagePhase, 'complete'>;
  difficultyLevel: number;
  /** For learning-rate items: the domain estimate the placement targeted. */
  targetedEstimate: number | null;
  accuracy: number | null;
  skipped: boolean;
}

export interface TwoStagePlan {
  standings: DomainStanding[];
  /** Phase-2 placements presented so far (one per presented effort item). */
  placements: PhasePlacement[];
  /** Every presented item, in order, tagged with its regime. */
  presented: PresentedFacet[];
  /** The regime the NEXT item would come from (or 'complete' if the run is over). */
  currentPhase: TwoStagePhase;
}

interface PresentedRecord {
  item: BankItem;
  result: ExamItemResult | undefined;
}

function resolvePresented(
  bank: readonly BankItem[],
  presentedItemIds: readonly string[],
): BankItem[] {
  const byId = new Map(bank.map((b) => [b.itemId, b]));
  const out: BankItem[] = [];
  for (const id of presentedItemIds) {
    const item = byId.get(id);
    if (item) out.push(item);
  }
  return out;
}

function zipPresented(
  presentedItems: readonly BankItem[],
  results: readonly ExamItemResult[],
): PresentedRecord[] {
  return presentedItems.map((item, i) => ({ item, result: results[i] }));
}

function isStanding(item: BankItem): boolean {
  return item.renderKind === 'single-select';
}
function isEffort(item: BankItem): boolean {
  return item.renderKind === 'embedded-demo';
}

/** Distinct domains present in a pool, in canonical rotation order (then any extras). */
function orderedDomains(pool: readonly BankItem[]): ExamDomain[] {
  const seen = new Set<ExamDomain>();
  for (const item of pool) seen.add(item.domain);
  return [...seen].sort((a, b) => rotationIndex(a) - rotationIndex(b) || (a < b ? -1 : 1));
}

/**
 * Choose the item whose rung is nearest `target`. Ties break toward the LOWER
 * rung for standing probes (stay in the child's comfort zone — anti-ramp) or the
 * HIGHER rung for effort placement (lean into desirable difficulty), then itemId.
 */
function nearestByRung(
  items: readonly BankItem[],
  target: number,
  tiePreferHigher: boolean,
): BankItem | null {
  let best: BankItem | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const item of items) {
    const dist = Math.abs(item.difficultyLevel - target);
    if (dist < bestDist) {
      best = item;
      bestDist = dist;
      continue;
    }
    if (dist === bestDist && best) {
      if (item.difficultyLevel !== best.difficultyLevel) {
        if (tiePreferHigher ? item.difficultyLevel > best.difficultyLevel : item.difficultyLevel < best.difficultyLevel) {
          best = item;
        }
      } else if (item.itemId < best.itemId) {
        best = item;
      }
    }
  }
  return best;
}

/**
 * The next STANDING probe for a domain, implementing the two-sided bracket:
 * - no bounds yet → start at a MODERATE rung (median of the domain's rungs);
 * - both bounds → probe the unpresented rung nearest the bracket midpoint;
 * - only a correct floor → step one rung UP from it (never a reckless jump);
 * - only an incorrect ceiling → step one rung DOWN from it.
 * Returns null when the bracket cannot be narrowed further with remaining items
 * (the precision stop).
 */
function nextStandingProbe(
  domain: ExamDomain,
  standingPool: readonly BankItem[],
  presentedIds: ReadonlySet<string>,
  floorCorrect: number | null,
  ceilingIncorrect: number | null,
): BankItem | null {
  const domainItems = standingPool.filter((it) => it.domain === domain);
  const candidates = domainItems
    .filter((it) => !presentedIds.has(it.itemId))
    .sort((a, b) => a.difficultyLevel - b.difficultyLevel || (a.itemId < b.itemId ? -1 : 1));
  if (candidates.length === 0) return null;

  if (floorCorrect != null && ceilingIncorrect != null) {
    const between = candidates.filter(
      (c) => c.difficultyLevel > floorCorrect && c.difficultyLevel < ceilingIncorrect,
    );
    if (between.length === 0) return null; // bracket localised → precision stop
    return nearestByRung(between, (floorCorrect + ceilingIncorrect) / 2, false);
  }
  if (floorCorrect != null) {
    const above = candidates.filter((c) => c.difficultyLevel > floorCorrect);
    return above.length ? above[0]! : null; // smallest rung above the known floor
  }
  if (ceilingIncorrect != null) {
    const below = candidates.filter((c) => c.difficultyLevel < ceilingIncorrect);
    return below.length ? below[below.length - 1]! : null; // largest rung below the ceiling
  }
  // First probe in this domain: start moderate, not at the extremes.
  const rungs = domainItems.map((it) => it.difficultyLevel).sort((a, b) => a - b);
  const median = rungs[Math.floor((rungs.length - 1) / 2)] ?? 0;
  return nearestByRung(candidates, median, false);
}

function computeStanding(
  domain: ExamDomain,
  records: readonly PresentedRecord[],
  standingPool: readonly BankItem[],
  presentedIds: ReadonlySet<string>,
  opts: Required<TwoStageOptions>,
): DomainStanding {
  let floorCorrect: number | null = null;
  let ceilingIncorrect: number | null = null;
  let presented = 0;

  for (const rec of records) {
    if (!isStanding(rec.item) || rec.item.domain !== domain) continue;
    presented += 1;
    const acc = rec.result?.accuracy ?? null;
    const rung = rec.item.difficultyLevel;
    if (acc === 1) {
      floorCorrect = floorCorrect == null ? rung : Math.max(floorCorrect, rung);
    } else if (acc === 0) {
      ceilingIncorrect = ceilingIncorrect == null ? rung : Math.min(ceilingIncorrect, rung);
    }
    // skipped / unscored → no bound update (but it still counts toward the cap)
  }

  const estimate =
    floorCorrect != null && ceilingIncorrect != null
      ? (floorCorrect + ceilingIncorrect) / 2
      : floorCorrect != null
        ? floorCorrect
        : ceilingIncorrect != null
          ? ceilingIncorrect
          : null;

  const probe = nextStandingProbe(domain, standingPool, presentedIds, floorCorrect, ceilingIncorrect);
  const bracketed = probe === null;
  const capped = presented >= opts.phase1CapPerDomain;
  const stopped = bracketed || capped;
  const stopReason: DomainStanding['stopReason'] = bracketed ? 'bracketed' : capped ? 'cap' : null;

  return { domain, floorCorrect, ceilingIncorrect, presented, estimate, stopped, stopReason };
}

function medianRung(pool: readonly BankItem[], domain: ExamDomain): number {
  const rungs = pool
    .filter((it) => it.domain === domain)
    .map((it) => it.difficultyLevel)
    .sort((a, b) => a - b);
  return rungs.length ? (rungs[Math.floor((rungs.length - 1) / 2)] ?? 0) : 0;
}

/** The single source of truth for BOTH `next()` and the summary plan. */
function planTwoStage(
  bank: readonly BankItem[],
  presentedItemIds: readonly string[],
  results: readonly ExamItemResult[],
  opts: Required<TwoStageOptions>,
): TwoStagePlan & { nextItem: BankItem | null } {
  const presentedItems = resolvePresented(bank, presentedItemIds);
  const records = zipPresented(presentedItems, results);
  const presentedIds = new Set(presentedItemIds);

  const standingPool = bank.filter(isStanding);
  const effortPool = bank.filter(isEffort);
  const standingDomains = orderedDomains(standingPool);

  const standings = standingDomains.map((d) =>
    computeStanding(d, records, standingPool, presentedIds, opts),
  );
  const standingByDomain = new Map(standings.map((s) => [s.domain, s]));

  // ---- Phase 1: STANDING -----------------------------------------------------
  const activeStanding = standings.filter((s) => !s.stopped);
  let nextItem: BankItem | null = null;
  let currentPhase: TwoStagePhase = 'complete';

  if (activeStanding.length > 0) {
    currentPhase = 'standing';
    // Interleave domains: fewest presented first, ties by rotation order.
    const target = [...activeStanding].sort(
      (a, b) => a.presented - b.presented || rotationIndex(a.domain) - rotationIndex(b.domain),
    )[0]!;
    nextItem = nextStandingProbe(
      target.domain,
      standingPool,
      presentedIds,
      target.floorCorrect,
      target.ceilingIncorrect,
    );
  } else {
    // ---- Phase 2: LEARNING-RATE ---------------------------------------------
    const effortDomains = orderedDomains(effortPool);
    const effortPresentedByDomain = new Map<ExamDomain, number>();
    for (const rec of records) {
      if (!isEffort(rec.item)) continue;
      effortPresentedByDomain.set(
        rec.item.domain,
        (effortPresentedByDomain.get(rec.item.domain) ?? 0) + 1,
      );
    }
    const eligible = effortDomains.filter((d) => {
      const done = (effortPresentedByDomain.get(d) ?? 0) >= opts.phase2PerDomain;
      const hasCandidate = effortPool.some(
        (it) => it.domain === d && !presentedIds.has(it.itemId),
      );
      return !done && hasCandidate;
    });
    if (eligible.length > 0) {
      currentPhase = 'learning-rate';
      const chosenDomain = [...eligible].sort(
        (a, b) =>
          (effortPresentedByDomain.get(a) ?? 0) - (effortPresentedByDomain.get(b) ?? 0) ||
          rotationIndex(a) - rotationIndex(b),
      )[0]!;
      const estimate = standingByDomain.get(chosenDomain)?.estimate ?? null;
      const target = estimate ?? medianRung(effortPool, chosenDomain);
      const domainCandidates = effortPool.filter(
        (it) => it.domain === chosenDomain && !presentedIds.has(it.itemId),
      );
      nextItem = nearestByRung(domainCandidates, target, true);
    }
  }

  // ---- Presented facets + placements (for the summary / audit view) ----------
  const presented: PresentedFacet[] = records.map((rec, i) => {
    const phase: Exclude<TwoStagePhase, 'complete'> = isStanding(rec.item)
      ? 'standing'
      : 'learning-rate';
    const targetedEstimate =
      phase === 'learning-rate' ? (standingByDomain.get(rec.item.domain)?.estimate ?? null) : null;
    return {
      order: i + 1,
      itemId: rec.item.itemId,
      typeCode: rec.item.typeCode,
      domain: rec.item.domain,
      phase,
      difficultyLevel: rec.item.difficultyLevel,
      targetedEstimate,
      accuracy: rec.result?.accuracy ?? null,
      skipped: rec.result?.skipped ?? false,
    };
  });

  const placements: PhasePlacement[] = presented
    .filter((p) => p.phase === 'learning-rate')
    .map((p) => ({
      domain: p.domain,
      estimate: p.targetedEstimate,
      chosenRung: p.difficultyLevel,
      itemId: p.itemId,
      typeCode: p.typeCode,
    }));

  return { standings, placements, presented, currentPhase, nextItem };
}

/**
 * The pluggable two-regime strategy. Deterministic, synthetic, additive — it is
 * a NEW `Sequencer` implementation and changes nothing about the shell/player.
 */
export class TwoStageSequencer implements Sequencer {
  readonly id = 'two-stage';
  readonly label = 'Two-stage: standing → learning-rate [PROPOSED · unapproved]';
  private readonly opts: Required<TwoStageOptions>;

  constructor(options: TwoStageOptions = {}) {
    this.opts = { ...DEFAULTS, ...options };
  }

  next(ctx: SequencerContext): BankItem | null {
    return planTwoStage(ctx.bank, ctx.presentedItemIds, ctx.results, this.opts).nextItem;
  }

  /** Pure inspection: reconstruct the full phase plan for a UI summary or test. */
  plan(ctx: SequencerContext): TwoStagePlan {
    const { standings, placements, presented, currentPhase } = planTwoStage(
      ctx.bank,
      ctx.presentedItemIds,
      ctx.results,
      this.opts,
    );
    return { standings, placements, presented, currentPhase };
  }
}

/**
 * UI/test convenience: reconstruct the phase plan when you only have the bank and
 * the ordered `results` (the React shell does not expose the presented-id list).
 * Relies on unique `typeCode`s in the bank (the two-stage bank guarantees this).
 */
export function planFromResults(
  bank: readonly BankItem[],
  results: readonly ExamItemResult[],
  options: TwoStageOptions = {},
): TwoStagePlan {
  const idByType = new Map<string, string>();
  for (const item of bank) {
    if (!idByType.has(item.typeCode)) idByType.set(item.typeCode, item.itemId);
  }
  const presentedItemIds: string[] = [];
  for (const r of results) {
    const id = idByType.get(r.typeCode);
    if (id) presentedItemIds.push(id);
  }
  const { standings, placements, presented, currentPhase } = planTwoStage(
    bank,
    presentedItemIds,
    results,
    { ...DEFAULTS, ...options },
  );
  return { standings, placements, presented, currentPhase };
}
