/**
 * The self-paced Stage 2 advance, and the time-to-next it records.
 *
 * Stage 2 replaced its fixed reveal hold with a Next control, so the gap between a trial being
 * graded and the next one being served is now the child's to spend (STAGE2_REDESIGN_SPEC §4.2). Two
 * things follow, and this module exists for both:
 *
 *  1. The session budget stops being knowable from the item count. Four activities of 30 trials each
 *     now carry 120 unbounded gaps, and §7.4 lists re-estimating the 30-minute figure as an open
 *     item. It cannot be re-estimated from a design document; it has to be measured.
 *  2. Dwell-on-reveal is a process signal in its own right — how long a child chooses to study an
 *     outcome nobody has evaluated for them is a fact about how they are working.
 *
 * WHAT THE FIGURE IS NOT ALLOWED TO BE. It is not scored, and nothing derived from it may enter an
 * ability estimate, a learning-rate fit, an item-selection target or a family-facing readout. SPOV 3
 * of the test-structure BrainLift is the binding constraint: effort telemetry VALIDATES and FILTERS,
 * it never GATES. The moment a child's pace changes what the test concludes about them, the test is
 * scoring compliance with a tempo it never told them about, and a child who thinks carefully is
 * charged for thinking.
 *
 * That boundary is kept structural rather than remembered. The ledger is its own module with its own
 * row type, no estimator imports it, and `review-dwell.test.ts` fails if one starts to — it scans
 * the engine, the scorer, the Phase 2 readout and the debug view for any reference to this file or
 * to `msToNext`. A row here also cannot be mistaken for a trial: {@link ReviewDwell} carries no
 * `score` and no `difficulty`, which are the two fields every consumer of a block trial reads.
 */

/** One trial's time-to-next, in the order the trials were served. */
export interface ReviewDwell {
  readonly itemId: string;
  readonly typeCode: string;
  /** Milliseconds from the reveal reaching the demo until the trial was released. */
  readonly msToNext: number;
  /**
   * True when a researcher's emulator released the trial rather than a child.
   *
   * Auto-run drives a whole block with no human in it, so it presses Next itself and leaves rows a
   * few milliseconds long. They stay in the ledger — a silently thinned ledger is worse than a
   * flagged one — but they are excluded from {@link reviewDwellTotalMs}, because a session budget
   * built from them would be a measurement of how fast a computer clicks.
   */
  readonly emulated: boolean;
}

/**
 * Session-scoped, in memory, and deliberately not persisted here.
 *
 * Phase 2 keeps every one of its artefacts client-side today: the block trials, the readout and the
 * completed-activity list all live in the runner and none of them is POSTed. Adding a write path for
 * this one signal would put an unscored process measure on the server ahead of the scored trials it
 * belongs to, which is the wrong thing to build first.
 */
let ledger: ReviewDwell[] = [];

/** Record one trial's time-to-next. */
export function recordReviewDwell(row: ReviewDwell): void {
  ledger = [...ledger, row];
}

/** Every row recorded this session, in trial order. */
export function reviewDwellLedger(): readonly ReviewDwell[] {
  return ledger;
}

/**
 * Total time-to-next across the session, in milliseconds — the session-budget figure.
 *
 * Emulated rows are excluded: they measure the emulator, not a child.
 */
export function reviewDwellTotalMs(): number {
  return ledger.reduce((total, row) => (row.emulated ? total : total + row.msToNext), 0);
}

/** Clear the ledger, so one sitting's figures stay one sitting's. */
export function resetReviewDwell(): void {
  ledger = [];
}

/** A trial being sat with, and the one thing that ends it. */
export interface ReviewGate {
  /**
   * Resolves when, and only when, {@link release} is called.
   *
   * There is no timer behind it and no other resolution path, which is the mechanical form of "the
   * child advances by choosing to" (§1 rule 2): a trial that is never released never advances.
   */
  readonly settled: Promise<void>;
  /** Ends the trial and records its time-to-next. Idempotent — a second call does nothing. */
  readonly release: () => void;
}

/**
 * Open the gate on a revealed trial.
 *
 * Framework-free on purpose. The runner holds the `release` and hands it to the Next control, but
 * the property that matters — nothing but an action ends the trial — is a property of this function
 * and is tested here rather than inferred from a component.
 */
export function openReviewGate(
  trial: { readonly itemId: string; readonly typeCode: string },
  options: { readonly emulated: boolean; readonly now?: () => number },
): ReviewGate {
  const now = options.now ?? Date.now;
  const shownAt = now();
  let released = false;
  let resolve: () => void = () => undefined;
  const settled = new Promise<void>((r) => {
    resolve = r;
  });
  return {
    settled,
    release: () => {
      if (released) return;
      released = true;
      recordReviewDwell({
        itemId: trial.itemId,
        typeCode: trial.typeCode,
        msToNext: now() - shownAt,
        emulated: options.emulated,
      });
      resolve();
    },
  };
}
