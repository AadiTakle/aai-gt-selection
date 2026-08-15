/**
 * The adaptive engine as two pure functions.
 *
 * `selectNext` answers *what should I ask next*, `grade` answers *how did they do*. Both take the whole
 * session state as an argument and hand the new state back. Neither reads the filesystem, holds a session,
 * or knows that a server exists, so a Pokémon game, a family portal or someone else's product can call them
 * over HTTP and get sound measurement back — which is the point of this workstream.
 *
 * `QbankSession` in `session.ts` is a thin stateful wrapper over these, kept so nothing downstream had to
 * change. Everything that used to be private state on that class is derived here from the history instead,
 * because two places holding the same fact is how they come to disagree.
 *
 * What this deliberately does *not* decide is where the state lives between calls — caller-held and signed,
 * or a row in DynamoDB. That is task 3.2. `Posterior.snapshot()` and `Posterior.fromSnapshot()` are the two
 * halves it will need.
 */

import type { Domain, StopReason } from '@gt/contracts';
import { type ItemParams, Posterior, information, paramsFor } from '@gt/engine';

import { COGAT_MAP, type CogatSubtest } from '@gt/ui-contract/cogat';

import {
  type BankRecord,
  type ServedItem,
  domainOf,
  optionCountOf,
  responseFormatOf,
  scoreResponse,
  toLogits,
  toServed,
} from './bank.js';

/** `ServedItem` is part of this module's surface — it is what `QbankServe.served` is — so it is re-exported
 * rather than leaving a consumer to reach into `bank.ts` for half of a response type. */
export type { Domain, ServedItem };

export const DOMAINS: readonly Domain[] = ['quantitative', 'verbal', 'spatial', 'fluid'];

/**
 * Discrimination, held at 1.5 for every item.
 *
 * **This is fixed, not calibrated.** No item in this bank has been fitted against real attempts, so there
 * is no per-item discrimination to use; 1.5 is a moderately discriminating item by convention and nothing
 * more. `@gt/stats` already computes point-biserial per item (`packages/stats/src/index.ts:85-115`), which
 * is the input once real response data exists — that is task 1a.6. Until then this number is an assumption
 * applied uniformly, and any claim that one item separates candidates better than another is not supported
 * by anything here.
 */
export const FIXED_DISCRIMINATION = 1.5;

/**
 * What to assume when an item does not enumerate its options: that it cannot be guessed.
 *
 * Every servable record now derives a response space from its own content, so nothing in the bank reaches
 * this. It survives as the honest answer for a bank import that declares no options, no grid, no stepper
 * and no assignment — better than inventing a floor for an item nobody has looked at.
 */
export const UNGUESSABLE = 0;

/**
 * Least share of a session to fill with multiple-choice items.
 *
 * **Decided by Felipe, 8 Aug 2026, and unvalidated like every other threshold here.** A constructed
 * response is genuinely more informative per item — max information at the decision point is `0.25a²` at
 * c = 0 against `0.15a²` for a four-option item, and even a fairly guessable 1-in-14 placement is still
 * 1.41x — so selection on information alone fills a session with mazes and token sorts and never asks a
 * multiple-choice question. That is not a modelling error to correct; those items really do separate
 * candidates better per item.
 *
 * What they are not is quick. Multiple choice is one pick, and a child answers several in the time one
 * tangram placement takes, so a session made entirely of constructed items either runs long or asks very
 * little. Holding half the session for multiple choice trades information per item for information per
 * minute.
 *
 * **This is a serving rule and deliberately not a change to the model.** Penalising a constructed item's
 * information to get this outcome would corrupt the number the stop rule and the pass decision read. The
 * information stays honest; only what may be drawn is constrained.
 *
 * **The successor is information per expected second**, once `latencyMs` is forwarded (1b.5) and per-type
 * floors exist (1b.3). That expresses the real tradeoff instead of approximating it with a quota, and this
 * constant should be deleted rather than kept alongside it.
 */
export const DEFAULT_MIN_MULTIPLE_CHOICE_SHARE = 0.5;

/**
 * The bar a single domain must clear to pass a candidate the composite would reject, and how much of that
 * domain's posterior has to sit above it.
 *
 * **Both unvalidated against real children**, like `abilityThreshold` and `recommendProbability`. Chosen
 * against simulated cohorts on 8 Aug 2026 rather than picked for roundness. At Careful precision with four
 * items per domain, the domain route recommends:
 *
 * | Cohort | bar 1.0 / p 0.30 | **bar 1.5 / p 0.45** | bar 1.5 / p 0.60 |
 * |---|---|---|---|
 * | true spatial spike +2.5 | 96% | **78%** | 0% |
 * | true spatial spike +2.0 | 87% | **59%** | 0% |
 * | uniformly average, theta 0 | 19% | **1%** | 0% |
 * | uniformly weak, theta -0.5 | 9% | **1%** | 0% |
 *
 * The composite route recommends **0%** of all four cohorts, which is the finding that justifies the rule:
 * a real spike is currently rejected `confident-below` with the evidence sitting in the transcript.
 *
 * Two things to know before changing either number. There is a cliff just above p = 0.5 — at 0.60 the rule
 * stops firing for anybody, because four items cannot put that much mass past the bar — so p is doing
 * nearly all the work, and a bar of 2.0 never fires at all. And the rule's power is a function of
 * `perDomainMinimum`: fewer items per domain means a flatter posterior and a rule that cannot fire.
 *
 * `p` is deliberately below a half, for the reason `recommendProbability` is: the cost-optimal threshold is
 * the false-positive share of total error cost, and a missed child costs far more than an extra review.
 */
export const DEFAULT_DOMAIN_BAR = 1.5;
export const DEFAULT_DOMAIN_RECOMMEND_PROBABILITY = 0.45;

// ---------------------------------------------------------------------------
// Configuration and results
// ---------------------------------------------------------------------------

/**
 * How precise the caller wants the decision to be.
 *
 * Exposed as a single dial because that is the only honest way to offer "test length" as a control: length
 * is an outcome of the confidence you demand, not an input you set independently. Asking for more
 * confidence buys more questions, and the mapping is stated here rather than hidden.
 */
export interface PrecisionSetting {
  readonly label: string;
  /** Confidence needed to pass a candidate through. */
  readonly confidenceAbove: number;
  /** Confidence needed to rule one out. Always the higher bar. */
  readonly confidenceBelow: number;
  readonly minItems: number;
  readonly maxItems: number;
  /** What to tell the user they are trading. */
  readonly note: string;
}

/**
 * Five stops on one slider.
 *
 * The asymmetry between the two confidences is preserved at every stop, because the reason for it does not
 * change with length: a missed candidate costs more than a wasted application, so the engine stays
 * reluctant to rule anybody out however short the session is.
 *
 * The two shortest settings are deliberately labelled as what they are. Classification research brackets a
 * two-category decision at roughly 13 to 16 items, and the one paper asking the question directly advises
 * at least 20, so anything under about 12 is a demonstration rather than a defensible measurement and the
 * UI should say so.
 */
export const PRECISION_STEPS: readonly PrecisionSetting[] = [
  {
    label: 'Taster',
    confidenceAbove: 0.6,
    confidenceBelow: 0.9,
    minItems: 4,
    maxItems: 6,
    note: 'Far too short to decide anything. Included so the effect of the dial is visible in one sitting.',
  },
  {
    label: 'Short',
    confidenceAbove: 0.68,
    confidenceBelow: 0.94,
    minItems: 6,
    maxItems: 10,
    note: 'Below the range the classification literature supports. Treat the result as indicative.',
  },
  {
    label: 'Standard',
    confidenceAbove: 0.75,
    confidenceBelow: 0.97,
    minItems: 8,
    maxItems: 16,
    note: 'Brackets the 13 to 16 items that classification research associates with about 95% correct decisions.',
  },
  {
    label: 'Careful',
    confidenceAbove: 0.82,
    confidenceBelow: 0.98,
    minItems: 12,
    maxItems: 24,
    note: 'Meets the 20-item floor advised for group-level decision quality.',
  },
  {
    label: 'Thorough',
    confidenceAbove: 0.9,
    confidenceBelow: 0.99,
    minItems: 20,
    maxItems: 40,
    note: 'Approaches the 40 items advised where a decision about an individual has to hold.',
  },
];

export function precisionAt(index: number): PrecisionSetting {
  const i = Math.max(0, Math.min(PRECISION_STEPS.length - 1, Math.round(index)));
  return PRECISION_STEPS[i] as PrecisionSetting;
}

export interface QbankSessionConfig {
  readonly abilityThreshold: number;
  readonly precision: PrecisionSetting;
  /** Restrict to banks whose items declare this band, or leave undefined for any. */
  readonly ageBand?: string;
  /** Minimum items per domain before the session may stop. */
  readonly perDomainMinimum: number;
  /** Recommend once P(above threshold) reaches this. */
  readonly recommendProbability: number;
  /**
   * Least share of the session to fill with multiple-choice items. Defaults to
   * `DEFAULT_MIN_MULTIPLE_CHOICE_SHARE`; set 0 to select on information alone.
   */
  readonly minMultipleChoiceShare?: number;
  /**
   * The higher bar a single domain must clear to pass on its own. Defaults to `DEFAULT_DOMAIN_BAR`.
   * **Unvalidated**, exactly as `abilityThreshold` is.
   */
  readonly domainBar?: number;
  /**
   * How much of a domain's posterior must sit above `domainBar` — the `p` in
   * `P(theta_domain > domainBar) >= p`. Defaults to `DEFAULT_DOMAIN_RECOMMEND_PROBABILITY`. Set 0 to
   * disable the domain route entirely. **Unvalidated**, as `recommendProbability` is.
   */
  readonly domainRecommendProbability?: number;
  /** Multiplier on the rapid-guess latency floor. Defaults to 1; 0 disables the check. */
  readonly rapidGuessFloorScale?: number;
  /**
   * Restrict the pool to types that correspond to a CogAT subtest. Defaults to `'any'`.
   *
   * Set this for any instrument that claims CogAT alignment. It is the only thing that makes the claim true:
   * `cogat.ts` was advisory before 2.3, and nothing stopped an "aligned" session drawing a working-memory game.
   */
  readonly cogatAlignment?: CogatAlignment;
}

export interface QbankServe {
  readonly served: ServedItem;
  readonly typeCode: string;
  readonly domain: Domain;
  readonly difficulty: number;
  readonly informationAtThreshold: number;
  readonly selectionReason: string;
}

export interface QbankAttempt {
  readonly ordinal: number;
  readonly itemId: string;
  readonly typeCode: string;
  readonly domain: Domain;
  readonly difficulty: number;
  /** Null when the frame reported something this host could not interpret. */
  readonly correct: boolean | null;
  readonly rawResponse: unknown;
  readonly latencyMs: number;
  readonly pAboveBefore: number;
  readonly pAboveAfter: number;
  readonly selectionReason: string;
  /**
   * Behavioural observations about the response, not its correctness. `['rapid-guess']` when it arrived below
   * the item's latency floor.
   *
   * On the attempt because `unscorable` used to mean exactly one thing — nobody could mark it — and now covers
   * "answered too fast" as well. A count that conflated them would hide a child clicking through an entire
   * session behind a number that looks like a marking gap.
   */
  readonly flags: readonly string[];
}

/**
 * One domain's readout, over that domain's items only.
 *
 * `mean` and `interval` are both required, which is the point: a per-domain mean off two items reads as a
 * finding when it is not one, so there is no way to obtain one from this type without its interval beside
 * it. Read the counts before either number.
 */
export interface DomainBand {
  readonly mean: number;
  /** 90% credible interval. Usually 2-3 logits wide, which is close to the prior. Report it anyway. */
  readonly interval: readonly [number, number];
  readonly itemsServed: number;
  /** Items that could actually be marked. The band rests on these, not on `itemsServed`. */
  readonly itemsScored: number;
}

/**
 * Which route produced a recommendation. Null unless the decision is `recommend`.
 *
 * **A domain-triggered pass is not evidence of a domain strength and must never be reported as one.** The
 * band that let the child through rests on two to four items and is 2-3 logits wide. Passing generously on
 * a noisy signal is right when a false positive is cheap; *claiming* the child is strong in that domain is
 * a measurement claim the data does not support. Pass on it, do not narrate it.
 *
 * Every domain that cleared is listed rather than a single strongest one, because picking a winner out of
 * four-item posteriors would be a ranking, and the order is fixed rather than sorted by probability so
 * nothing in the shape of this invites reading one.
 */
export type PassRoute =
  | { readonly via: 'composite' }
  | { readonly via: 'domain'; readonly domains: readonly Domain[] };

export interface QbankState {
  readonly stopped: boolean;
  readonly stopReason: StopReason | null;
  readonly pAbove: number;
  readonly decision: 'recommend' | 'no-recommendation' | null;
  readonly itemsServed: number;
  readonly unscorable: number;
  readonly estimate: number;
  readonly interval: readonly [number, number];
  readonly perDomain: Readonly<Record<string, number>>;
  /**
   * A band per domain, absent for any domain that scored nothing.
   *
   * A second readout over the same evidence as `estimate`, never a competing use of it: every scored item
   * updates the composite as well, nothing here changes selection or the stop rule, and the composite stays
   * the route to a decision. Absence means the child was not measured in that domain — do not fill it in.
   */
  readonly domains: Readonly<Partial<Record<Domain, DomainBand>>>;
  /**
   * What produced a `recommend`, or null.
   *
   * Note the consequence for anything rendering a session: `stopReason` describes the **composite's**
   * confidence, so `stopReason: 'confident-below'` alongside `decision: 'recommend'` is a reachable and
   * correct combination — the battery as a whole ruled the child out and a single domain carried them
   * anyway. That is the entire point of the rule, and it will read as a contradiction to anyone shown both
   * without explanation.
   */
  readonly passRoute: PassRoute | null;
}

// ---------------------------------------------------------------------------
// The pool
// ---------------------------------------------------------------------------

/**
 * Which CogAT subtest an item corresponds to, or `'none'`, joined from the mapping rather than stored.
 *
 * The handoff doc asked for a `cogatSubtest` field on the bank records. Deriving it is strictly better: writing
 * it into 53 JSONL files would put the same fact in two places, and the whole of 3.4 was about what happens
 * when it drifts. `cogat.ts` stays the single source and this is the join.
 *
 * `undefined` means the type is absent from the mapping entirely, which after 2.2 is a fault rather than a
 * state — `cogat.test.ts` fails the suite on it, and `cogatAlignment` below refuses to serve it.
 */
export function cogatSubtestOf(record: BankRecord): CogatSubtest | 'none' | undefined {
  return COGAT_MAP[record.typeCode]?.subtest;
}

/**
 * How strictly a session is CogAT-aligned.
 *
 * `any` is the default and draws on everything, which is right for a screener measuring what this library
 * actually measures. The other two exist for the instrument that has to *claim* CogAT alignment, and the claim
 * is only as good as the filter behind it.
 *
 * `direct` is the defensible one: the same item family as the subtest. `direct-or-loose` admits related
 * constructs in a different format, which is a weaker claim and should be made deliberately — note that six of
 * the loose mappings were classified by 2.2 from a catalogue entry rather than by the bank's author, and
 * `COGAT_NEEDS_AUTHOR_REVIEW` names them.
 */
export type CogatAlignment = 'any' | 'direct' | 'direct-or-loose';

/** Whether one record may be served under a given alignment. Unmapped types are refused by both strict modes. */
export function meetsAlignment(record: BankRecord, alignment: CogatAlignment): boolean {
  if (alignment === 'any') return true;
  const mapping = COGAT_MAP[record.typeCode];
  if (!mapping || mapping.subtest === 'none') return false;
  return alignment === 'direct-or-loose' || mapping.strength === 'direct';
}

/** One servable item with the two things selection needs precomputed. */
export interface PoolEntry {
  readonly record: BankRecord;
  readonly domain: Domain;
  /** Difficulty in logits. */
  readonly b: number;
}

/**
 * Build a pool from records the caller already has.
 *
 * Records in, no loading: the caller decides where they came from — a bank file, an S3 object, a prebuilt
 * metadata index (task 3.3), or a literal array in a test. This is the whole of the engine's dependency on
 * the item library.
 */
export function buildPool(
  records: Iterable<BankRecord>,
  options: { readonly ageBand?: string; readonly cogatAlignment?: CogatAlignment } | string = {},
): PoolEntry[] {
  // A bare string is the old signature. Accepted so the change is additive rather than a rename across callers.
  const { ageBand, cogatAlignment = 'any' } = typeof options === 'string' ? { ageBand: options } : options;
  const pool: PoolEntry[] = [];
  for (const record of records) {
    if (ageBand && !(record.ageBands ?? []).includes(ageBand)) continue;
    // Filtered here rather than during selection, so the engine never chooses an item the instrument would
    // then have to decline — and so nothing downstream has to remember to re-check.
    if (!meetsAlignment(record, cogatAlignment)) continue;
    pool.push({ record, domain: domainOf(record), b: toLogits(record.difficulty) });
  }
  return pool;
}

/**
 * The IRT parameters for one item, used by selection and by the posterior update alike.
 *
 * Both go through here on purpose. If the two ever computed the guessing floor differently the engine would
 * choose an item under one model and score it under another, which is invisible from the outside and
 * corrupts the estimate rather than failing.
 */
export function paramsForRecord(record: BankRecord, b = toLogits(record.difficulty)): ItemParams {
  return paramsFor(b, optionCountOf(record) ?? UNGUESSABLE, FIXED_DISCRIMINATION);
}

// ---------------------------------------------------------------------------
// Rapid-guess detection
// ---------------------------------------------------------------------------

/**
 * The fastest a response could plausibly be an attempt at all.
 *
 * **Every number here is invented, and the two errors do not cost the same.** There is no latency data in this
 * repository — attempts live in memory and die with the process — so nothing below is calibrated. A floor set
 * too low misses some guesses. A floor set too high **discards real evidence from a fast, capable child**, and
 * because an unscorable response is excluded from the estimate, that removes exactly the evidence that would
 * have passed them. This project is deliberately eager to pass and reluctant to rule out, so these are set to
 * catch the *physically implausible* rather than the merely quick, and they sit far below plausible reading
 * time rather than near it.
 *
 * `RAPID_GUESS_BASE_MS` is the floor for an item with nothing to read and nothing to compare: perceive the
 * screen, decide, move a hand. Simple reaction time to an expected stimulus is around 200ms before any
 * comprehension happens, so 300 is already generous towards the candidate.
 *
 * `RAPID_GUESS_PER_OPTION_MS` covers one glance at one option. `RAPID_GUESS_PER_WORD_MS` is 60, which is not a
 * reading rate — a fast adult reads at roughly 250 words a minute, or 240ms a word, and a seven-year-old is far
 * slower. 60 is a quarter of that on purpose: this is a floor, so it should sit below the fastest child in the
 * cohort rather than at the average one.
 *
 * `RAPID_GUESS_CAP_MS` matters as much as the rest. Beyond about two seconds, a slow response stops being
 * evidence about physical possibility and starts being a guess about engagement, which is 1b.4's territory and
 * not this rule's. The cap also keeps every floor below the 2500ms the project's own smoke suite answers in, so
 * a threshold mistake cannot masquerade as a measurement change.
 *
 * **Recalibrate from data as soon as there is any.** 1b.5 forwards the renderer's timings and 1b.4 adds
 * person-fit; once real attempts exist, the honest floor is a low percentile of observed latency per type, and
 * these constants should be deleted rather than tuned.
 */
export const RAPID_GUESS_BASE_MS = 300;
export const RAPID_GUESS_PER_OPTION_MS = 50;
export const RAPID_GUESS_PER_WORD_MS = 60;
export const RAPID_GUESS_CAP_MS = 2000;

/** Prose fields are named inconsistently across the 53 types, so length is measured rather than looked up. */
function wordsIn(content: Record<string, unknown>): number {
  let words = 0;
  for (const value of Object.values(content)) {
    // Only strings long enough to be a sentence. A type code or a mode name is not something to read.
    if (typeof value === 'string' && value.length > 15) words += value.split(/\s+/).length;
  }
  return words;
}

/**
 * The latency floor for one item, derived from its own content.
 *
 * Per item rather than per type, which satisfies "per type code, not global" and improves on it: a
 * `VER-CLOZE-01` sentence of eight words and one of forty get different floors, and a per-type constant would
 * have to be wrong for one of them. `scale` lets a host whose presentation differs — read aloud, or shown
 * before the timer starts — move the whole set without editing the engine; 0 disables the check.
 */
export function rapidGuessFloorMs(record: BankRecord, scale = 1): number {
  if (scale <= 0) return 0;
  const content = record.content ?? {};
  const options = optionCountOf(record);
  // A derived response space is not an option list to scan: a 61-step stepper does not cost 61 glances. Only
  // count options when the content actually enumerates them.
  const enumerated = ['options', 'candidates', 'rows', 'claims'].some(
    (f) => Array.isArray(content[f]) && (content[f] as unknown[]).length > 0,
  );
  const toScan = enumerated && options !== null ? options : 0;
  const raw = RAPID_GUESS_BASE_MS + toScan * RAPID_GUESS_PER_OPTION_MS + wordsIn(content) * RAPID_GUESS_PER_WORD_MS;
  return Math.min(RAPID_GUESS_CAP_MS, Math.round(raw * scale));
}

// ---------------------------------------------------------------------------
// Belief
// ---------------------------------------------------------------------------

/**
 * The composite belief plus one per domain.
 *
 * The composite is the pass route and is updated by every scored item whatever domain it came from. The four
 * are a second readout over the same evidence, never a competing use of it.
 */
export interface Posteriors {
  readonly composite: Posterior;
  readonly byDomain: Readonly<Record<Domain, Posterior>>;
}

export function initialPosteriors(): Posteriors {
  return {
    composite: new Posterior(),
    byDomain: Object.fromEntries(DOMAINS.map((d) => [d, new Posterior()])) as Record<Domain, Posterior>,
  };
}

/** Independent copies, so a pure update cannot reach back into the caller's belief. */
export function clonePosteriors(p: Posteriors): Posteriors {
  return {
    composite: p.composite.clone(),
    byDomain: Object.fromEntries(DOMAINS.map((d) => [d, p.byDomain[d].clone()])) as Record<Domain, Posterior>,
  };
}

/** Densities only, ready to be serialised, signed, or written to a row. Task 3.2 decides which. */
export function snapshotPosteriors(p: Posteriors): {
  composite: readonly number[];
  byDomain: Record<Domain, readonly number[]>;
} {
  return {
    composite: p.composite.snapshot(),
    byDomain: Object.fromEntries(DOMAINS.map((d) => [d, p.byDomain[d].snapshot()])) as Record<
      Domain,
      readonly number[]
    >,
  };
}

export function restorePosteriors(snap: {
  composite: readonly number[];
  byDomain: Record<Domain, readonly number[]>;
}): Posteriors {
  return {
    composite: Posterior.fromSnapshot(snap.composite),
    byDomain: Object.fromEntries(
      DOMAINS.map((d) => [d, Posterior.fromSnapshot(snap.byDomain[d])]),
    ) as Record<Domain, Posterior>,
  };
}

/**
 * Rebuild belief from the history alone.
 *
 * The history is the authoritative record, so the posteriors must be reproducible from it. That makes a
 * caller-held snapshot an optimisation rather than the only copy, and it is what the tests use to prove the
 * incremental updates in `grade` never drift from a clean replay.
 */
export function posteriorsFrom(history: readonly QbankAttempt[], pool: readonly PoolEntry[]): Posteriors {
  const byId = new Map(pool.map((e) => [e.record.itemId, e]));
  const posteriors = initialPosteriors();
  for (const attempt of history) {
    if (attempt.correct === null) continue;
    const entry = byId.get(attempt.itemId);
    if (!entry) continue;
    // A domain outside the four is a caller error, and an unhelpful TypeError three frames down is a bad way
    // to learn it. Matters most for a replayed transcript, where the history came from outside this process.
    const target = posteriors.byDomain[attempt.domain];
    if (!target) {
      throw new Error(`attempt ${attempt.itemId} declares unknown domain ${String(attempt.domain)}`);
    }
    const params = paramsForRecord(entry.record, entry.b);
    posteriors.composite.update(params, attempt.correct);
    target.update(params, attempt.correct);
  }
  return posteriors;
}

// ---------------------------------------------------------------------------
// Progress, derived rather than held
// ---------------------------------------------------------------------------

/**
 * Everything about how far the session has got, computed from the history.
 *
 * These used to be six private fields on `QbankSession` kept in step by hand in `submit`. Deriving them
 * removes the possibility of the counters and the transcript disagreeing, which is the failure mode a
 * stateless engine has to be immune to: a caller that replays a history must land exactly where the
 * original session did.
 */
export interface Progress {
  readonly usedItemIds: ReadonlySet<string>;
  readonly perDomain: Readonly<Record<Domain, number>>;
  readonly domainScored: Readonly<Record<Domain, number>>;
  readonly multipleChoiceServed: number;
  readonly scored: number;
  readonly unscorable: number;
}

export function progressFrom(history: readonly QbankAttempt[], pool: readonly PoolEntry[]): Progress {
  const byId = new Map(pool.map((e) => [e.record.itemId, e.record]));
  const usedItemIds = new Set<string>();
  const perDomain = Object.fromEntries(DOMAINS.map((d) => [d, 0])) as Record<Domain, number>;
  const domainScored = Object.fromEntries(DOMAINS.map((d) => [d, 0])) as Record<Domain, number>;
  let multipleChoiceServed = 0;
  let scored = 0;
  let unscorable = 0;

  for (const attempt of history) {
    usedItemIds.add(attempt.itemId);
    perDomain[attempt.domain] = (perDomain[attempt.domain] ?? 0) + 1;
    if (attempt.correct === null) unscorable += 1;
    else {
      scored += 1;
      domainScored[attempt.domain] = (domainScored[attempt.domain] ?? 0) + 1;
    }
    const record = byId.get(attempt.itemId);
    if (record && responseFormatOf(record) === 'multiple-choice') multipleChoiceServed += 1;
  }

  return { usedItemIds, perDomain, domainScored, multipleChoiceServed, scored, unscorable };
}

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

export interface SelectNextInput {
  readonly config: QbankSessionConfig;
  readonly pool: readonly PoolEntry[];
  readonly history: readonly QbankAttempt[];
  readonly posteriors: Posteriors;
}

export interface SelectNextResult {
  /** Null when the session should stop, in which case `stopReason` says why. */
  readonly serve: QbankServe | null;
  readonly stopReason: StopReason | null;
}

/**
 * Choose the next item, or say why there should not be one.
 *
 * Maximises Fisher information at the decision threshold rather than at the running estimate: the question
 * worth asking is the one that best separates above the line from below it, not the one that pins down a
 * score. Note that the objective does not read the posterior at all — only the threshold and the item — so
 * belief enters here solely through the stop rule.
 *
 * Two coverage rules run ahead of pure information greed. Domains below their minimum are served first,
 * because the stop rule cannot fire until coverage is met and deferring it would guarantee every session ran
 * to the cap. Then a share of the session is held for multiple choice.
 */
export function selectNext(input: SelectNextInput): SelectNextResult {
  const { config, pool, history, posteriors } = input;

  const alreadyStopped = stopReasonFor(input);
  if (alreadyStopped) return { serve: null, stopReason: alreadyStopped };

  const progress = progressFrom(history, pool);
  const threshold = config.abilityThreshold;

  const short = DOMAINS.filter(
    (d) =>
      (progress.perDomain[d] ?? 0) < config.perDomainMinimum &&
      pool.some((p) => p.domain === d && !progress.usedItemIds.has(p.record.itemId)),
  );

  /**
   * Whether this draw is owed to multiple choice.
   *
   * A running share rather than a fixed count, so it scales across the precision steps without knowing the
   * item cap: a Taster of 4 and a Thorough of 20 both come out at the configured share. At 0.5 it
   * alternates — owed, free, owed, free — which is the intent.
   */
  const share = config.minMultipleChoiceShare ?? DEFAULT_MIN_MULTIPLE_CHOICE_SHARE;
  const owedMultipleChoice = share > 0 && progress.multipleChoiceServed < share * (progress.usedItemIds.size + 1);

  const eligible = (entry: PoolEntry): boolean =>
    !progress.usedItemIds.has(entry.record.itemId) && (short.length === 0 || short.includes(entry.domain));

  /**
   * The format restriction applies only if something is left to satisfy it with. A caller may restrict the
   * pool to one type, and a coverage rule that can empty the pool would stop the session early and report
   * `bank-exhausted` on a bank that is not exhausted — a worse failure than serving a second constructed
   * item in a row.
   */
  const restrictToMultipleChoice =
    owedMultipleChoice && pool.some((e) => eligible(e) && responseFormatOf(e.record) === 'multiple-choice');

  let best: { entry: PoolEntry; info: number } | null = null;
  for (const entry of pool) {
    if (!eligible(entry)) continue;
    if (restrictToMultipleChoice && responseFormatOf(entry.record) !== 'multiple-choice') continue;
    const info = information(threshold, paramsForRecord(entry.record, entry.b));
    if (!best || info > best.info) best = { entry, info };
  }

  if (!best) return { serve: null, stopReason: 'bank-exhausted' };

  const { entry, info } = best;
  void posteriors; // Selection is belief-free by design; the stop rule above is where belief is read.
  return {
    stopReason: null,
    serve: {
      served: toServed(entry.record),
      typeCode: entry.record.typeCode,
      domain: entry.domain,
      difficulty: entry.record.difficulty,
      informationAtThreshold: info,
      selectionReason:
        short.length > 0
          ? `blueprint minimum for ${entry.domain}; information ${info.toFixed(3)} at threshold ${threshold.toFixed(2)}`
          : restrictToMultipleChoice
            ? `multiple-choice share (${progress.multipleChoiceServed} of ${progress.usedItemIds.size} so far, floor ${share}); information ${info.toFixed(3)} at threshold ${threshold.toFixed(2)}`
            : `highest information at threshold ${threshold.toFixed(2)} (${info.toFixed(3)}) from ${pool.length - progress.usedItemIds.size} remaining`,
    },
  };
}

// ---------------------------------------------------------------------------
// Grading
// ---------------------------------------------------------------------------

export interface GradeInput {
  readonly item: BankRecord;
  readonly response: unknown;
  readonly latencyMs: number;
  readonly posteriors: Posteriors;
  /**
   * Multiplier on the rapid-guess floor. Defaults to 1; **0 disables the check entirely**, which is the right
   * answer for a host that reads items aloud or shows them before starting its timer.
   */
  readonly rapidGuessFloorScale?: number;
}

export interface GradeResult {
  /** Null when the response could not be interpreted. Not the same as wrong, and never counted as wrong. */
  readonly correct: boolean | null;
  /** New belief. The input is left untouched. */
  readonly posteriors: Posteriors;
  /**
   * Behavioural observations about the response rather than its correctness.
   *
   * Empty today. This is where rapid-guess detection lands (1b.3): below a per-item-type latency floor a
   * response should come back unscorable rather than wrong. The field exists now because the wire contract
   * (3.4) is the product, and adding a field to it later is more expensive than reserving one.
   */
  readonly flags: readonly string[];
}

/**
 * Mark one response and fold it into belief.
 *
 * A response this host cannot interpret is returned as `null` and changes no belief, because guessing at it
 * would put invented evidence into the estimate. That is the honest failure mode for hand-built items whose
 * UIs were written independently of each other.
 *
 * Needs the item and not the pool, so a caller holding one item can grade it without the library.
 */
export function grade(input: GradeInput): GradeResult {
  const { item, response, latencyMs, posteriors } = input;
  const correct = scoreResponse(item, response);

  /**
   * Unmarkable first, and it does **not** acquire a rapid-guess flag.
   *
   * A response nobody could interpret is already excluded from the estimate, and blaming its speed as well
   * would make the transcript unable to tell "the host cannot mark this type" from "the child clicked
   * through" — which are different problems with different fixes.
   */
  if (correct === null) return { correct: null, posteriors, flags: [] };

  /**
   * Too fast to be an attempt. Returned as unscorable rather than wrong, because that is what it is: an
   * answer that arrived before the child could have engaged with the question is not evidence they could not
   * do it. Note this discards a *correct* fast answer too, which is the point — a lucky click must not become
   * evidence of knowledge, and the static guessing floor cannot reach that case because `c` is a property of
   * the item and this is a property of the response.
   */
  const floor = rapidGuessFloorMs(item, input.rapidGuessFloorScale ?? 1);
  if (floor > 0 && latencyMs < floor) {
    return { correct: null, posteriors, flags: ['rapid-guess'] };
  }

  const next = clonePosteriors(posteriors);
  const params = paramsForRecord(item);
  // The composite first and unconditionally: it is the pass route, updated by every scored item whatever
  // domain the item came from. The domain readout is the same evidence counted again, not evidence taken
  // away from here.
  next.composite.update(params, correct);
  next.byDomain[domainOf(item)].update(params, correct);
  return { correct, posteriors: next, flags: [] };
}

// ---------------------------------------------------------------------------
// Stopping and deciding
// ---------------------------------------------------------------------------

/**
 * Whether the session should stop, from the state alone.
 *
 * Extracted rather than moved: `selectNext` consults it so a stateless caller learns the session is over
 * without having to submit anything, and the session wrapper consults it at exactly the moment it used to
 * so its observable behaviour is unchanged.
 *
 * `abandoned` is not decided here. It is a caller's intent rather than a property of the evidence, so it
 * cannot be derived from a history and the wrapper owns it.
 */
export function stopReasonFor(input: SelectNextInput): StopReason | null {
  const { config, pool, history, posteriors } = input;
  const { precision } = config;
  const progress = progressFrom(history, pool);

  if (history.length >= precision.maxItems) return 'item-cap';

  const coverageMet = DOMAINS.every(
    (d) => (progress.perDomain[d] ?? 0) >= config.perDomainMinimum || !pool.some((p) => p.domain === d),
  );
  if (progress.scored < precision.minItems || !coverageMet) return null;

  const pAbove = posteriors.composite.probabilityAbove(config.abilityThreshold);
  if (pAbove >= precision.confidenceAbove) return 'confident-above';
  if (pAbove <= 1 - precision.confidenceBelow) return 'confident-below';
  return null;
}

/**
 * The disjunctive pass rule: the composite clears its threshold, **or** any single domain clears a higher
 * one.
 *
 * The composite is checked first and wins when it succeeds, so a candidate the whole battery passed is never
 * reported as having been carried by one domain.
 *
 * `P(theta_domain > domainBar) >= p` rather than a comparison of means, because the bands are 2-3 logits
 * wide and at that width it is the probability threshold and not the bar that does the work.
 *
 * **Only domains that scored something are eligible.** An untouched domain still holds its prior, and a
 * prior has real mass above any modest bar, so skipping this check would let a low `p` recommend a child on
 * the strength of a domain nobody asked them about — a false positive manufactured from nothing.
 */
export function passRouteFor(
  config: QbankSessionConfig,
  posteriors: Posteriors,
  progress: Progress,
): PassRoute | null {
  const pAbove = posteriors.composite.probabilityAbove(config.abilityThreshold);
  if (pAbove >= config.recommendProbability) return { via: 'composite' };

  const bar = config.domainBar ?? DEFAULT_DOMAIN_BAR;
  const p = config.domainRecommendProbability ?? DEFAULT_DOMAIN_RECOMMEND_PROBABILITY;
  if (p <= 0) return null;

  // DOMAINS order, not probability order: this is a record of what cleared, never a ranking.
  const cleared = DOMAINS.filter(
    (d) => (progress.domainScored[d] ?? 0) > 0 && posteriors.byDomain[d].probabilityAbove(bar) >= p,
  );
  return cleared.length > 0 ? { via: 'domain', domains: cleared } : null;
}

/**
 * The per-domain readout, omitting any domain that scored nothing.
 *
 * Suppression keys off scored items rather than served ones. A domain served twice whose responses were both
 * unmarkable holds exactly the prior it started with, and publishing that under a domain label would be a
 * claim about a child nobody managed to measure — the same failure as publishing a domain that was never
 * asked about, arriving by a different route.
 */
export function domainBandsFor(
  posteriors: Posteriors,
  progress: Progress,
): Readonly<Partial<Record<Domain, DomainBand>>> {
  const out: Partial<Record<Domain, DomainBand>> = {};
  for (const domain of DOMAINS) {
    const scored = progress.domainScored[domain] ?? 0;
    if (scored === 0) continue;
    out[domain] = {
      mean: posteriors.byDomain[domain].mean(),
      interval: posteriors.byDomain[domain].interval(0.9),
      itemsServed: progress.perDomain[domain] ?? 0,
      itemsScored: scored,
    };
  }
  return out;
}

/** The whole reportable state, from belief and history and nothing else. */
export function stateFor(
  config: QbankSessionConfig,
  pool: readonly PoolEntry[],
  history: readonly QbankAttempt[],
  posteriors: Posteriors,
  stopReason: StopReason | null,
): QbankState {
  const progress = progressFrom(history, pool);
  const pAbove = posteriors.composite.probabilityAbove(config.abilityThreshold);
  const stopped = stopReason !== null;
  const passRoute = stopped ? passRouteFor(config, posteriors, progress) : null;

  return {
    stopped,
    stopReason,
    pAbove,
    decision: stopped ? (passRoute ? 'recommend' : 'no-recommendation') : null,
    passRoute,
    itemsServed: history.length,
    unscorable: progress.unscorable,
    estimate: posteriors.composite.mean(),
    interval: posteriors.composite.interval(0.9),
    perDomain: { ...progress.perDomain },
    domains: domainBandsFor(posteriors, progress),
  };
}
