import type {
  AgeBand,
  Domain,
  ItemGenerator,
  ItemUsage,
  ReadingLoad,
  RenderedItem,
} from '@gt/contracts';
import { Rng } from '@gt/item-library';
import { Posterior, paramsFor, pCorrect } from '@gt/engine';

/**
 * A practice tool built on the shared library.
 *
 * This module is the reason the library is the product rather than the screener. It imports the
 * item library and the two measurement primitives it needs, and it deliberately imports none of
 * the screener's machinery: no ScreenerSession, no StopRule, no Decision, no surfaces and no
 * recommendation threshold. Nothing here decides anything about anybody.
 *
 * Three consequences follow from that, and each is the opposite of the screener's behaviour.
 *
 *   1. Item selection targets the learner's current estimate rather than a decision threshold,
 *      because the goal is a question they can nearly do rather than one that separates them
 *      from a line.
 *   2. Repeats are allowed. The screener forbids them because sitting a familiar family inflates
 *      a later score. Here inflation is the point, since it is called learning.
 *   3. It refuses to serve a family without a written explanation. A screener never shows one; a
 *      practice tool is mostly made of them.
 */

export interface PracticeConfig {
  readonly id: string;
  readonly version: string;
  readonly label: string;
  /** The pinned snapshot, exactly as a screener pins one. */
  readonly snapshotId: string;
  readonly ageBand: AgeBand;
  readonly maxReadingLoad: ReadingLoad;
  /** Only families declaring this may be served. Practice tools pass 'prep'. */
  readonly usage: ItemUsage;
  /** How many items in a session before it offers to stop. */
  readonly sessionLength: number;
  /**
   * How far above the learner's current estimate to aim, in logits. Positive because a learner
   * gains most from material slightly beyond what they can already do, and zero would mean
   * serving them a coin flip every time.
   */
  readonly stretch: number;
  /** Restrict to one domain, or leave undefined to mix. */
  readonly domain?: Domain;
}

export function defaultPracticeConfig(snapshotId: string, ageBand: AgeBand = '3-5'): PracticeConfig {
  return {
    id: 'cogat-familiarisation',
    version: '0.1.0',
    label: 'Reasoning practice',
    snapshotId,
    ageBand,
    maxReadingLoad: 'low',
    usage: 'prep',
    sessionLength: 10,
    // Aimed a little above the running estimate. Not calibrated, and worth tuning once real
    // response data exists, since this is the one number that decides whether practice feels
    // possible or hopeless.
    stretch: 0.4,
  };
}

export interface PracticeItem {
  readonly item: RenderedItem;
  readonly targetedAt: number;
  readonly selectionReason: string;
}

export interface PracticeAttempt {
  readonly ordinal: number;
  readonly generatorId: string;
  readonly generatorVersion: string;
  readonly seed: number;
  readonly domain: Domain;
  readonly correct: boolean;
  readonly latencyMs: number;
  /** Whether the learner had already seen this family earlier in the session. */
  readonly repeatOfFamily: boolean;
  readonly estimateAfter: number;
}

export interface PracticeState {
  readonly served: number;
  readonly correct: number;
  readonly finished: boolean;
  /** Ability estimate, kept for item targeting and never shown as a score. */
  readonly estimate: number;
  /** Accuracy over the last five attempts, which is what a learner actually feels. */
  readonly recentAccuracy: number | null;
  readonly familiesSeen: number;
}

/**
 * One learner working through a practice session.
 *
 * Shares the state-machine shape of the screener session by coincidence rather than by
 * inheritance, because the two do different things and a shared base class would have to be
 * about something neither of them is.
 */
export class PracticeSession {
  private readonly posterior = new Posterior();
  private readonly rng: Rng;
  private readonly attempts: PracticeAttempt[] = [];
  private readonly familiesSeen = new Set<string>();
  private pending: PracticeItem | null = null;
  private stopped = false;

  constructor(
    private readonly config: PracticeConfig,
    private readonly available: readonly ItemGenerator[],
    seed: number,
  ) {
    this.rng = new Rng(seed);
  }

  getAttempts(): readonly PracticeAttempt[] {
    return [...this.attempts];
  }

  state(): PracticeState {
    const recent = this.attempts.slice(-5);
    return {
      served: this.attempts.length,
      correct: this.attempts.filter((a) => a.correct).length,
      finished: this.stopped || this.attempts.length >= this.config.sessionLength,
      estimate: this.posterior.mean(),
      recentAccuracy: recent.length === 0 ? null : recent.filter((a) => a.correct).length / recent.length,
      familiesSeen: this.familiesSeen.size,
    };
  }

  /**
   * Pick the next item.
   *
   * Targets the learner's estimate plus a stretch, and picks the family whose difficulty sits
   * closest to that target. A screener maximises information at a fixed threshold; this moves the
   * target as the learner moves, which is the whole difference between practising and being sorted.
   *
   * Ties are broken toward families seen least, so a session covers ground rather than drilling
   * one family. Repeats are permitted once everything has been seen.
   */
  nextItem(): PracticeItem | null {
    if (this.state().finished) return null;
    if (this.pending) return this.pending;
    if (this.available.length === 0) return null;

    const target = this.posterior.mean() + this.config.stretch;
    const pool = this.config.domain
      ? this.available.filter((g) => g.domain === this.config.domain)
      : this.available;
    if (pool.length === 0) return null;

    const seenCount = new Map<string, number>();
    for (const a of this.attempts) {
      seenCount.set(a.generatorId, (seenCount.get(a.generatorId) ?? 0) + 1);
    }

    let best: ItemGenerator | null = null;
    let bestScore = Infinity;
    for (const gen of pool) {
      const distance = Math.abs(gen.difficulty.b - target);
      // Half a logit of tolerance per prior sighting, so coverage wins over a marginally
      // better difficulty match but a much better match still wins.
      const score = distance + (seenCount.get(gen.id) ?? 0) * 0.5;
      if (score < bestScore) {
        bestScore = score;
        best = gen;
      }
    }
    if (!best) return null;

    const item = best.render(this.rng.int(1, 1_000_000));
    const repeat = this.familiesSeen.has(best.id);
    this.pending = {
      item,
      targetedAt: target,
      selectionReason: repeat
        ? `closest to target ${target.toFixed(2)}; family already practised this session`
        : `closest to target ${target.toFixed(2)} of ${pool.length} available families`,
    };
    return this.pending;
  }

  /** Score an attempt and return the explanation, which is the thing a learner came for. */
  submit(selectedOptionId: string, latencyMs: number): {
    correct: boolean;
    explanation: RenderedItem['explanation'];
    correctOptionId: string;
    state: PracticeState;
  } {
    const pending = this.pending;
    if (!pending) throw new Error('submit called with no pending item');

    const gen = this.available.find((g) => g.id === pending.item.generatorId);
    if (!gen) throw new Error(`no generator ${pending.item.generatorId} in this session`);

    const correct = selectedOptionId === pending.item.correctOptionId;
    this.posterior.update(
      paramsFor(gen.difficulty.b, pending.item.options.length, gen.difficulty.a),
      correct,
    );

    const repeat = this.familiesSeen.has(gen.id);
    this.familiesSeen.add(gen.id);
    this.attempts.push({
      ordinal: this.attempts.length + 1,
      generatorId: gen.id,
      generatorVersion: gen.version,
      seed: pending.item.seed,
      domain: gen.domain,
      correct,
      latencyMs,
      repeatOfFamily: repeat,
      estimateAfter: this.posterior.mean(),
    });
    this.pending = null;

    return {
      correct,
      explanation: pending.item.explanation,
      correctOptionId: pending.item.correctOptionId,
      state: this.state(),
    };
  }

  finish(): PracticeState {
    this.stopped = true;
    return this.state();
  }
}

// ---------------------------------------------------------------------------
// Simulation, so this is testable without learners
// ---------------------------------------------------------------------------

export interface PracticeSimResult {
  readonly served: number;
  readonly correct: number;
  readonly accuracy: number;
  readonly familiesSeen: number;
  readonly domainsSeen: number;
  readonly everyItemHadAnExplanation: boolean;
  readonly meanTargetedAt: number;
}

/**
 * Runs one synthetic learner through a practice session.
 *
 * The learner does not improve, deliberately. This checks the selection and explanation
 * machinery rather than modelling learning, and a model of learning here would be an assumption
 * dressed as a result.
 */
export function simulatePractice(args: {
  config: PracticeConfig;
  available: readonly ItemGenerator[];
  ability: number;
  seed: number;
}): PracticeSimResult {
  const session = new PracticeSession(args.config, args.available, args.seed);
  const rng = new Rng(args.seed ^ 0x2f6a1c3d);
  const domains = new Set<Domain>();
  const targets: number[] = [];
  let allExplained = true;
  let guard = 0;

  while (!session.state().finished) {
    if (guard++ > 200) throw new Error('practice session failed to terminate');
    const next = session.nextItem();
    if (!next) break;
    targets.push(next.targetedAt);

    const gen = args.available.find((g) => g.id === next.item.generatorId)!;
    domains.add(gen.domain);
    const p = pCorrect(args.ability, paramsFor(gen.difficulty.b, next.item.options.length, gen.difficulty.a));
    const answersCorrectly = rng.next() < p;
    const chosen = answersCorrectly
      ? next.item.correctOptionId
      : rng.pick(next.item.options.filter((o) => o.id !== next.item.correctOptionId)).id;

    const result = session.submit(chosen, rng.int(2000, 12000));
    if (!result.explanation) allExplained = false;
  }

  const state = session.state();
  return {
    served: state.served,
    correct: state.correct,
    accuracy: state.served === 0 ? 0 : state.correct / state.served,
    familiesSeen: state.familiesSeen,
    domainsSeen: domains.size,
    everyItemHadAnExplanation: allExplained,
    meanTargetedAt: targets.reduce((a, b) => a + b, 0) / Math.max(1, targets.length),
  };
}
