import { fastTypeCodes, type EngineConfig, type ServedItem } from '@gt-selection/exam-engine';

import { buildCoreMetrics, EXAM_ENGINE_OVERRIDES, type MetricSampleFloors } from './engine-config';
import { buildBanks } from './engine-config';
import { phase1Pool } from './phase2';

/**
 * The front doors the adaptive engine is served behind, and the only place they differ.
 *
 * There are two, and they are NOT the same instrument with different wording. The admissions
 * battery spends up to 40 items resolving a level per area because a level is what the family paid
 * for. The public screener spends a third of that because it answers a coarser question — is this
 * child worth inviting to apply — and because the child it is aimed at did not ask to be tested and
 * will close the tab.
 *
 * Everything that differs between them lives here rather than in `ExamRunner`, so that adding a
 * third door (a partner school's page, an unbranded lead-generation site) is a copy bundle and a
 * config, not a fork of the runner. `docs/proposals/public-screener.md` is the product argument.
 *
 * WHAT THIS DOES NOT DO. Two surfaces do not produce comparable numbers, and nothing here pretends
 * otherwise. A shorter battery has a wider interval around every estimate, so a screener result and
 * a battery result are different measurements of the same child and each needs its own threshold.
 * The screener therefore reports bands and strengths and withholds the composite figure, which is
 * `reportsTechnicalScore` below.
 */
export interface ExamSurface {
  readonly id: 'assessment' | 'screener';
  /** Engine configuration for this door, merged over the package defaults. */
  readonly engineOverrides: Partial<EngineConfig>;
  /**
   * Whether the results screen may print the composite figure, the θ scale and the ±SE.
   *
   * False for the screener. A number out of twenty is read as a grade by every parent who sees one,
   * and inviting that reading on a 15-item session misrepresents how much the session actually
   * knows.
   */
  readonly reportsTechnicalScore: boolean;
  /**
   * Whether finishing hands over a Stage 2 learning-rate block.
   *
   * False for the screener. Stage 2 is 30 trials in one area on top of the battery, which is more
   * child time than the whole screener, and it measures learning pace — a labelled hypothesis that
   * D-030 keeps out of the scored decision. A door whose job is to get a stranger to finish
   * anything at all does not open with the longest thing in the system.
   */
  readonly offersStage2: boolean;
  /**
   * Whether the running header names the child's position inside a burst ("part 1 of 2").
   *
   * False for the screener, for a reason that only shows up on screen. A burst is several questions
   * off one instruction, so the label is about the instruction and not about the test — but the
   * screener's bursts are always two, so it reads "part 1 of 2" on the very first question of a
   * session whose intro promised one short set of puzzles. It looks like a two-stage test announcing
   * itself. The battery keeps it: there the bursts vary from two to six and the label is genuinely
   * informative about how many questions share the instruction on screen.
   */
  readonly showBurstPosition: boolean;
  /** The items this door may serve, narrowed from the full served pool. */
  readonly pool: (pool: readonly ServedItem[]) => ServedItem[];
  readonly copy: SurfaceCopy;
}

export interface SurfaceCopy {
  readonly introKicker: string;
  readonly introTitle: (name: string) => string;
  readonly introLede: string;
  readonly gradePrompt: string;
  readonly startCta: string;
  readonly backCta: string;
  readonly introBoundary: string;
  readonly doneKicker: string;
  readonly doneTitle: (name: string) => string;
  readonly doneLede: string;
  readonly headlineStatLabel: string;
  readonly countStatLabel: string;
  readonly areaBreakdownLabel: string;
  readonly returnCta: string;
  readonly doneBoundary: string;
}

const ASSESSMENT_COPY: SurfaceCopy = {
  introKicker: 'Adaptive screening',
  introTitle: (name) => `Ready to begin, ${name}?`,
  introLede:
    'This is a short, adaptive session across four kinds of thinking. It starts at your grade ' +
    'level, then gets harder or easier as you go, so the level always fits. There is no fixed ' +
    'number of questions; it stops once we have enough to see your strengths.',
  gradePrompt: 'Choose your grade',
  startCta: 'Start the assessment →',
  backCta: 'Back to portal',
  introBoundary:
    'This is an eligibility screening only. It is not an IQ test, an enrollment offer, or an ' +
    'admission decision. Results simply help route your family to the right next step.',
  doneKicker: 'Screening complete',
  doneTitle: (name) => `Nice work, ${name}.`,
  doneLede:
    'Every activity is done and your session has been saved. Here is a synthetic profile of what ' +
    'we saw across the four reasoning areas. A person reviews these signals before any next step.',
  headlineStatLabel: 'Composite proficiency',
  countStatLabel: 'Activities answered',
  areaBreakdownLabel: 'By reasoning area (proficiency θ /20)',
  returnCta: 'Return to portal →',
  doneBoundary:
    'Synthetic screening result (validated=false). Accuracy sets each area’s bracket; other ' +
    'metrics position the score within it. A screen indicates likely fit; it is not an admission ' +
    'decision and is not evidence of program impact.',
};

/**
 * The public screener's wording.
 *
 * Written for a child who was handed a laptop at a school event and a parent reading over their
 * shoulder, neither of whom asked for this. Three things it never does: call itself a test, imply
 * that anything is riding on it, or report a number a parent could compare to another child's. It
 * says "puzzles", it says nobody can be turned down, and it says so before the first question
 * rather than in a footnote afterwards.
 */
/**
 * ", Ada" or nothing at all.
 *
 * The battery always knows the child's name because a parent typed it into an application. The
 * public screener frequently does not: it is opened from a QR code at an event by somebody who has
 * given GT nothing. `PreviewExam` falls back to the literal string "there", which reads fine mid
 * sentence and badly as an address, so the screener drops the address instead of printing it.
 */
function addressed(name: string): string {
  return name && name !== 'there' ? `, ${name}` : '';
}

const SCREENER_COPY: SurfaceCopy = {
  introKicker: 'Puzzles, not a test',
  introTitle: (name) => `Want to try some puzzles${addressed(name)}?`,
  introLede:
    'These are shape, word, and number puzzles, and they get more interesting as you go. There ' +
    'are no grades and no wrong way to do this. Most people finish in about 10 to 15 minutes, and ' +
    'you can stop whenever you like.',
  // Grades, not ages: the options below this label are grade bands, and asking for one while
  // offering the other is how a child picks the wrong band and gets items aimed at somebody else.
  gradePrompt: 'What grade are you in?',
  startCta: 'Let’s go →',
  backCta: 'Maybe later',
  introBoundary:
    'This is just for fun and for curiosity. It is not a test, it is not an IQ score, and nobody ' +
    'can be turned down for anything because of it. No result here closes a door.',
  doneKicker: 'All done',
  doneTitle: (name) => `That was great${addressed(name)}.`,
  doneLede:
    'You worked through every puzzle. Here is what stood out about the way you think. There is no ' +
    'pass or fail on this, and nothing about it is on your record anywhere.',
  headlineStatLabel: 'What this looked like',
  countStatLabel: 'Puzzles solved',
  areaBreakdownLabel: 'Where you were strongest',
  returnCta: 'See what GT is about →',
  doneBoundary:
    'A short set of puzzles cannot measure a child, and this one does not try. It is a rough ' +
    'first look, it is not a CogAT score and does not predict one, and it decides nothing. If ' +
    'anything here looked interesting, the next step is a conversation, not another test.',
};

/**
 * Enforced-metric floors for a 15-item session.
 *
 * Lowered from the battery's in lockstep with `minItemsPerArea`, because an enforced floor above
 * the per-area budget cannot be met and would pin every session to the cap. `M-REV` and
 * `M-ERRTYPE` drop to two: both are shape-of-error signals that a screener collects to bias
 * selection, and neither is load-bearing for a coarse invite-or-not call.
 */
const SCREENER_METRIC_FLOORS: MetricSampleFloors = {
  'M-ACC': 3,
  'M-ERRTYPE': 2,
  'M-RT': 2,
  'M-RTFIRST': 2,
  'M-REV': 2,
};

/**
 * The screener's engine configuration, sized to 10 to 15 minutes of child time.
 *
 * SIZING. The battery is measured at ~31.5 items and ~19.8 instruction screens per session
 * (`pnpm exam:instruction-cost`) against Crystal's ≤45-minute campus-wide ceiling, which puts a
 * loaded item at roughly 85 seconds once instruction screens are counted. Fifteen items is
 * therefore the budget, and INSTRUCTION SCREENS ARE THE REAL LEVER: they cost about as much as an
 * item each and the battery spends twenty of them. Capping breadth at two types per area and
 * letting each type run a burst brings the screener to a handful of screens instead.
 *
 * `pnpm screener:sizing` measures this config over a synthetic cohort and fails if sessions land
 * outside the target or stop on the cap rather than on evidence. Change a number here and re-run it.
 *
 * WHAT IT COSTS. Two types per area instead of the battery's ~4.5 is less construct breadth, so a
 * screener result leans harder on which two types a child happened to draw. That is the trade a
 * screener makes on purpose: it is choosing who to invite, and it is cheap to be wrong in the
 * direction of inviting somebody.
 */
export const SCREENER_ENGINE_OVERRIDES: Partial<EngineConfig> = {
  ...EXAM_ENGINE_OVERRIDES,
  coreMetrics: buildCoreMetrics(undefined, SCREENER_METRIC_FLOORS),
  minItemsPerArea: 3,
  minTypesPerArea: 2,
  evenSpreadTolerance: 1,
  /*
   * Looser than the battery's 4 / 1.5 / 1.0, and DRIFT is the one that matters.
   *
   * `areaEstimateStable` compares the mean of the older half of the estimate window against the
   * recent half, which at a window of three is just the first estimate against the third. The step
   * size only shrinks as reversals accumulate, so inside a four-item-per-area budget it is still
   * around 1 to 2 points and the estimate is legitimately still moving. Measured at the battery's
   * thresholds, 15 of 16 screener sessions ran to the cap on this gate alone.
   *
   * Loosening it is the honest lever rather than a workaround: the screener is not claiming a
   * settled level, so requiring the evidence of one and then reporting a band anyway would be
   * paying for precision it discards. `pnpm screener:sizing` is what holds this to account.
   */
  stabilityWindow: 3,
  stabilitySd: 4.0,
  stabilityDrift: 3.0,
  difficultyWindow: 3,
  accWindowSize: 6,
  estWindowSize: 6,
  /*
   * A SAFETY NET, NOT THE TARGET, and setting it near the target backfires badly.
   *
   * `burstLengthFor` bounds a burst by `floor((hardItemCap - itemsServed) / 8)`, because even
   * coverage means a burst of n in one area commits the other three to n as well, and a further
   * round is held in reserve so the stop rule can fire between rounds. A cap of 18 therefore permits
   * bursts of 2 at the very start and 1 within a few items, which is how an earlier version of this
   * config ended up spending an instruction screen on almost every item — 15.2 items against 14.0
   * screens, i.e. paying the battery's instruction bill for a third of its evidence.
   *
   * So the cap is set well above where the screener is expected to stop, and the STOP RULE is what
   * ends the session. That is what buys real bursts, and bursts are what make a short session short.
   */
  hardItemCap: 32,
  /*
   * Stop chasing new question types. Both terms exist to spread the battery across the catalogue for
   * measurement breadth, and both of them buy that breadth with instruction screens, which are the
   * screener's dominant cost — a switch costs about as much as an item. Zeroed here so a type is
   * allowed to run its burst out.
   */
  typeNoveltyBonus: 0,
  typeRecencyPenalty: 0,
  // Two back-to-back items per instruction rather than the battery's six. Bursting is what keeps
  // the instruction bill down, but a burst of n commits all four areas to n, so length is also what
  // makes a session overshoot: at three, rounds land on multiples of twelve and the mean ran to 17.9
  // items. Two halves the instruction bill while keeping the round granular enough to stop near the
  // point the evidence is actually adequate.
  burst: { maxLength: 2, minLength: 2, maxOptions: 6 },
};

/**
 * The pool the screener draws from: Stage 1 types that can actually be BURSTED.
 *
 * This is the single biggest lever on how long the screener feels, and it is a pool decision rather
 * than a config value, which is why it lives here as a function.
 *
 * Instruction screens cost about as much as items, and `burstLengthFor` hands a burst of 1 to every
 * type it classifies as slow — the paced ones, the streamed ones, the ones the child assembles a
 * program in. Leave those in the pool and the screener pays an instruction screen for nearly every
 * item no matter what the burst policy says. Measured over the sizing cohort, filtering them out
 * moves the session from 1.41 items per instruction to 1.82, which is about three minutes.
 *
 * It also happens to be the right pool on its own terms. A stranger's child, three minutes in, is
 * the wrong audience for a multi-step task with a time budget, and a screener that opens with one is
 * a screener people close.
 *
 * WHAT IT COSTS. Twenty-seven of the fifty-two wired types survive this filter, so the screener
 * measures over roughly half the catalogue the battery has. An area's estimate therefore rests on a
 * narrower slice of the construct, which is a real limit on how much a screener result can be read
 * as being about reasoning rather than about quick single-tap reasoning.
 */
export function screenerPool(pool: readonly ServedItem[]): ServedItem[] {
  const stage1 = phase1Pool(pool);
  const fast = fastTypeCodes(buildBanks(stage1), SCREENER_ENGINE_OVERRIDES.burst!);
  return stage1.filter((item) => fast.has(item.typeCode));
}

export const ASSESSMENT_SURFACE: ExamSurface = {
  id: 'assessment',
  engineOverrides: EXAM_ENGINE_OVERRIDES,
  reportsTechnicalScore: true,
  offersStage2: true,
  showBurstPosition: true,
  pool: (pool) => phase1Pool(pool),
  copy: ASSESSMENT_COPY,
};

export const SCREENER_SURFACE: ExamSurface = {
  id: 'screener',
  engineOverrides: SCREENER_ENGINE_OVERRIDES,
  reportsTechnicalScore: false,
  offersStage2: false,
  showBurstPosition: false,
  pool: screenerPool,
  copy: SCREENER_COPY,
};

/**
 * Surfaces by id, so a SERVER component can choose one without shipping it across the boundary.
 *
 * A surface holds functions — the pool filter, and the two copy strings that take the child's name —
 * and React cannot serialise a function into a client component. Passing `SCREENER_SURFACE` from a
 * page therefore 500s the route rather than failing a typecheck, which is exactly how it was found.
 * Pages name a surface; the client resolves it here.
 */
export const EXAM_SURFACES = {
  assessment: ASSESSMENT_SURFACE,
  screener: SCREENER_SURFACE,
} as const satisfies Record<ExamSurface['id'], ExamSurface>;

export type ExamSurfaceId = keyof typeof EXAM_SURFACES;
