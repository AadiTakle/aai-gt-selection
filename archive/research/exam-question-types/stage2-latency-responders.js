// A responder BETWEEN the perfect inducer and the pure guesser.
//
// WHY ONE WAS NEEDED. `stage2-block-run.js` ships two auto-responders and they are the two
// endpoints: `induces` reasons exhaustively over every mapping its memory still permits and
// essentially never fails once the evidence is in, and `guesses` never learns anything. Any measure
// separates those two. The question this workstream asks is different — can a measure RANK learners
// against each other — and two points cannot show that. A measure needs a population with graded
// ability before "between-child variance against within-child error" means anything, and a
// population built from two extremes would hand the answer to whichever measure happened to
// saturate less.
//
// WHAT IS GRADED, AND WHY THAT AND NOT ACCURACY. The parameter is ENCODING FIDELITY: the
// probability that a reveal is folded into memory at all. A responder with fidelity 0.5 sees the
// same reveals and could deduce the same things, but banks half of them, so it arrives at each
// primitive later WITHOUT being worse at reasoning from what it has. That is the construct a
// learning block claims to measure — how fast the system is acquired — and it is deliberately not
// the same thing as a lower response accuracy, which a lapse parameter would produce instead.
// `lapse` is kept separate and small so the two can be varied independently.
//
// This does not touch `stage2-block-run.js`. That file is shared with the review window and has
// been through an intuitiveness audit; a measurement-only responder has no business in it.

/**
 * The inspector's model learner, with two independent ways of being worse at it.
 *
 * `fidelity` in [0, 1] is P(a reveal is encoded). At 1 with `lapse` 0 this is byte-for-byte the
 * `inductionResponder` from `stage2-block-run.js` — asserted in `stage2-latency.test.ts` so the
 * family provably contains the harness's own reasoner as an endpoint rather than merely resembling
 * it.
 *
 * `lapse` in [0, 1] is P(the response is a uniform guess regardless of what memory says). At 1 it
 * is the `guessingResponder`, so the same family spans both endpoints.
 *
 * DETERMINISM. Both draws come from the engine's own `hashUnit` over the block seed and a
 * per-decision counter, never from `Math.random`, so a (seed, standing, arm, fidelity) run replays
 * bit-for-bit. The counter rather than the item id because an item can be revealed in the warm-up
 * and never again, and the warm-up path does not pass `run`.
 */
export function partialInductionResponder(
  inspector,
  { hashUnit, seed, salt = '', fidelity = 1, lapse = 0, warmupCount = 3 } = {},
) {
  const memory = inspector.newMemory();
  let encodes = 0;
  let responses = 0;
  let ignored = 0;
  let lapses = 0;
  /**
   * The trial at which this responder's own memory first pinned each badge — GROUND TRUTH for when
   * it knew the primitive, available only because it is a program and not a child.
   *
   * It is what makes the criterion falsifiable rather than merely plausible. A behavioural criterion
   * can only ever report `k_i`, which is acquisition plus however long the criterion took to become
   * confident; with the true acquisition trial in hand that sum can be split, and the split decides
   * whether a measured latency is mostly about the learner or mostly about the instrument.
   *
   * The inspector's pinning is SOUND in the live arm: `learn` only ever discards operators that
   * appear in no assignment consistent with the reveal, and the true operator always appears in one,
   * so a singleton candidate set holds the true operator. It is also WEAKER than the oracle — it
   * reasons only within observed chains, never across the whole bijection — so this trial is never
   * earlier than the oracle's onset and `t* − d` cannot come out negative.
   */
  const acquiredAt = {};

  return {
    id: `induces@${fidelity.toFixed(2)}${lapse > 0 ? `/lapse${lapse.toFixed(2)}` : ''}`,
    fidelity,
    lapse,
    pick: ({ item, unit }) => {
      const draw = hashUnit(seed, `${salt}|lapse|${responses}`);
      responses += 1;
      if (draw < lapse) {
        lapses += 1;
        const { options } = item.content;
        return options[Math.min(options.length - 1, Math.floor(unit * options.length))].key;
      }
      return inspector.respond(item, memory, unit).key;
    },
    observe: ({ item, correctFigure }) => {
      const draw = hashUnit(seed, `${salt}|encode|${encodes}`);
      encodes += 1;
      // Reveals arrive warm-up first, then one per scored trial, so this counter IS the trial
      // number once the demonstrations are past. Zero means "already known before trial 1".
      const trial = Math.max(0, encodes - warmupCount);
      // An unencoded reveal is not a wrong belief, it is an absent one: the memory is untouched, so
      // the responder is exactly as correct about the primitive as it was before and simply has to
      // wait for another demonstration. Corrupting the memory instead would model a different child
      // — one who mislearns — and would confound acquisition speed with error rate.
      if (draw >= fidelity) {
        ignored += 1;
        return { reset: false, pinnedNow: [] };
      }
      const learned = inspector.learn(item, correctFigure, memory);
      for (const badge of learned.pinnedNow ?? []) {
        if (acquiredAt[badge] === undefined) acquiredAt[badge] = trial;
      }
      return learned;
    },
    state: () => {
      const snapshot = inspector.memoryState(memory);
      return { resets: snapshot.resets, pinned: snapshot.pinned.length, ignored, lapses };
    },
    /** Badge -> trial at which the responder's own memory pinned it. 0 = during the warm-up. */
    acquisition: () => ({ ...acquiredAt }),
  };
}
