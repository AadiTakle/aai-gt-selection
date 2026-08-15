import type { Domain } from './types';

/**
 * CogAT's three batteries, and the in-world verb each item type is dressed as.
 *
 * WHY THREE AND NOT FOUR. CogAT reports Verbal, Quantitative and Nonverbal. It has no working-memory
 * battery, which is why the `WM-*` types were never wired here, and the owner has said so twice:
 * "cogat doesn't measure working memory and moreso verbal, nonverbal, and quantitative."
 *
 * A sortie restricted to one battery's types IS a per-battery measurement. `POST /api/bank/sessions`
 * accepts `types`, and the coverage rule already passes any domain the pool does not contain, so a
 * single-battery pool produces a single-battery estimate with no engine change.
 *
 * ══ MEMBERSHIP IS EARNED BY ITEM CONTENT, NEVER BY TYPECODE PREFIX ════════════════════════════════
 *
 * The prefix is a claim. `SPA-`, `FLU-`, `VER-` and `QUANT-` are what a generator was called, and three
 * of the ten types this file used to serve did not do what their prefix said. THE RULE IS NOW STATED
 * ONCE AND APPLIES TO EVERY FUTURE ADDITION:
 *
 *     A type may sit in a battery only if a child solving it is doing that battery's kind of
 *     reasoning, ON EVERY ITEM, from what the item itself shows. If it is a fourth thing, it is
 *     removed from `VERBS` entirely so that no station can serve it — the same treatment working
 *     memory already got.
 *
 * Variety in the wrong battery is worse than repetition in the right one. A station whose pool spans
 * two constructs does not produce a weaker estimate of one thing; it produces a confident estimate of
 * nothing, because the scorer discards `domain` and folds every response into one theta.
 *
 * THE GROUND TRUTH, and it is not this file's opinion. CogAT Form 7/8's nine subtests, three per
 * battery, are enumerated in `packages/ui-contract/src/cogat.ts` — which audited the whole 53-type
 * library against them by reading banks rather than names:
 *
 *     Verbal        Verbal Analogies · Sentence Completion · Verbal Classification
 *     Quantitative  Number Analogies · Number Series · Number Puzzles
 *     Nonverbal     Figure Matrices · Paper Folding · Figure Classification
 *
 * That file's `COGAT_MAP` is the register of which of our types correspond to one, and its header says
 * plainly that "everything absent from this file has no CogAT analogue". Every type below appears in
 * it. Every type in `RETIRED` does not.
 *
 * ONE HONEST CAVEAT ABOUT NONVERBAL, since nothing else records it. `FLU-MATRIX-01` and
 * `FLU-CARPET-01` are both mapped to FIGURE MATRICES. They are two presentations of one subtest, not
 * two subtests: the coat wall's variety is real for the child and does not broaden the construct.
 * Figure Classification (`FLU-VENN-01`, 120 items) and Paper Folding (`SPA-PUNCH-01`, 140) both exist
 * in `qbank-library/banks/` and are both mapped `direct`. Either would widen Nonverbal honestly; the
 * 4x4 lattice never could.
 */
export type Battery = 'Verbal' | 'Quantitative' | 'Nonverbal';

export const BATTERIES: readonly Battery[] = ['Verbal', 'Quantitative', 'Nonverbal'];

export interface Verb {
  id: string;
  typeCode: string;
  battery: Battery;
  /** The engine's own domain label, kept because the serve carries it and it is worth cross-checking. */
  domain: Domain;
  /** What the child is doing. Never a question, never a test. */
  title: string;
  /** The world system this verb's outcome feeds. */
  drives: string;
  /** Lowest tenure tier that unlocks it. Tier is a function of visits, never of correctness. */
  tier: 1 | 2 | 3;
}

export const VERBS: readonly Verb[] = [
  /* Nonverbal — figural reasoning, no words and no quantities to compute. Both are CogAT Figure
     Matrices; see the caveat in the header about that being one subtest and not two. */
  { id: 'coat', typeCode: 'FLU-MATRIX-01', battery: 'Nonverbal', domain: 'fluid', title: 'Coaxing a coat', drives: 'markings, which decide the adult form', tier: 1 },
  { id: 'mossbed', typeCode: 'FLU-CARPET-01', battery: 'Nonverbal', domain: 'fluid', title: 'Laying the mossbed', drives: 'which wild species visit', tier: 2 },
  /* Quantitative — every item's answer is a quantity, and every distractor is a quantity reached by a
     named arithmetic misconception (`off_by_one`, `reversed_shift_sign`, `applied_scale_ignored_shift`). */
  { id: 'tide-line', typeCode: 'QUANT-SERIES-01', battery: 'Quantitative', domain: 'quantitative', title: 'The tide-line', drives: 'growth cadence', tier: 1 },
  { id: 'sprouter', typeCode: 'QUANT-FUNC-01', battery: 'Quantitative', domain: 'quantitative', title: 'The Sprouter', drives: 'how much of a bed fills', tier: 2 },
  { id: 'bough', typeCode: 'QUANT-BALANCE-01', battery: 'Quantitative', domain: 'quantitative', title: 'The weighing bough', drives: 'who may share a glade', tier: 3 },
  /* Verbal — the material is words and the judgement is about what words mean. */
  { id: 'log', typeCode: 'VER-SORTBOT-01', battery: 'Verbal', domain: 'verbal', title: 'The sorting gate', drives: 'admissions', tier: 2 },
  { id: 'kinship', typeCode: 'VER-RELPAIR-01', battery: 'Verbal', domain: 'verbal', title: 'The kinship stone', drives: 'lineage', tier: 3 },
];

/* ------------------------------------------------------------------ *\
   What was taken out, and why it may never come back quietly
\* ------------------------------------------------------------------ */

export interface RetiredType {
  typeCode: string;
  /** The battery it used to be served in. Kept so the damage is legible, not to invite reinstatement. */
  wasBattery: Battery;
  /** What a child solving it is actually doing, read off the items. */
  measures: string;
  /** Why that is not the battery it sat in. */
  why: string;
}

/**
 * TYPES THAT MAY NEVER BE SERVED, and the reason each one is out.
 *
 * A DECLARED LIST RATHER THAN A DELETION, for one structural reason. `registry.test.ts` asserts that
 * every presentation in `IN_WORLD` is reachable at exactly one station, and that assertion earns its
 * keep — it caught thirteen slime families sitting unreachable for a night, and a presentation that
 * exists and is never served is indistinguishable from one nobody wrote. Retiring a type breaks that
 * clause honestly, so the clause is widened to "reachable OR retired BY NAME HERE" rather than
 * removed. A genuinely forgotten presentation still fails the test; a deliberately withdrawn one has
 * to be argued for in this array first. THE COMPONENTS ARE NOT DELETED — `StoneBed.tsx` is good work
 * and would draw a legitimate figural type tomorrow.
 *
 * Retiring a type does NOT require touching `DRAWN_TYPES` in `stations/sites.ts`. That list means "has
 * a presentation", which stays true; `siteTypes` intersects it with `VERBS`, so absence from `VERBS`
 * is already sufficient and is the single place the decision lives.
 */
export const RETIRED: readonly RetiredType[] = [
  {
    typeCode: 'SPA-XFORM-01',
    wasBattery: 'Nonverbal',
    measures:
      'Cumulative induction of an arbitrary six-symbol code. A badge tray names 1-3 badges; each badge stands for a lattice operator (mirror, stagger, shunt, drift, pivot, braid) by a mapping that is FIXED across all 234 items and appears nowhere in the served `content` — it lives in `answer.system`, which the client never receives. The bank grades its own items on this: `relabelReachableOptions` is 5 of 5 on 204 items and 4 of 5 on the other 30, i.e. no single item determines its own answer. Only the RUN of items does.',
    why:
      "Not Figure Matrices, not Figure Classification, not Paper Folding — a CogAT item is solvable from what is on the page. `stage2-type-learnability-output.md` measured the run: a leading ramp of 1.0-3.4 trials that no reasoner could answer, first-third answerability 57-81%, and 0.38-1.88 trials per block introducing two primitives at once — the defect that report says 'must be zero' — at every standing, with the last primitive pinned at trial 4.0-7.6. A sanctuary sortie is 6-10 items shared across the station's whole pool, so this type was never served enough times in one sitting for the code to be learnable, and its early items were answered at chance. It also reports `domain: spatial`, the only member of the Nonverbal station that did, which is the cross-check that should have caught it: 6 of every 12 Nonverbal items served came back `spatial`, measured against the live API.",
  },
  {
    typeCode: 'FLU-OPCHAIN-01',
    wasBattery: 'Nonverbal',
    measures:
      'The same thing as `SPA-XFORM-01`, on a single figure rather than a lattice: six badges standing for six operators (twin, swap, ring, turn, flip, slant) by one fixed mapping, absent from `content`, chains up to four long.',
    why:
      "Worse on the only number that matters, and by the bank's own accounting: `relabelling.viableOptions` is 5 of 5 on all 468 items, `maxVoteShare` 0.20 — chance — on every single one. Its own research note records that it needs THREE UNSCORED WORKED DEMONSTRATIONS before the first scored item, and the sanctuary has no mechanism for a warm-up. It never had a presentation, so retiring it costs the world nothing; it is listed because leaving it in `VERBS` left a type one `IN_WORLD` line away from being served, and because it is the same construct as the entry above and they should stand or fall together.",
  },
  {
    typeCode: 'VER-SEQUENCE-01',
    wasBattery: 'Verbal',
    measures:
      'Hear 3-5 story parts read aloud once, in an order the bank shuffles on disk, then choose which of 3-4 ARRANGEMENTS is chronological. Temporal-causal reasoning over narrated events, plus holding those events and their identities long enough to check each candidate arrangement against them.',
    why:
      "All three CogAT Verbal subtests — Verbal Analogies, Sentence Completion, Verbal Classification — ask what a word means relative to other words, and all three are answered by choosing ONE word or pair. None asks for a sequence, and the response channel is the tell: `packages/ui-contract/src/requirements.ts` types this one `ordered: 4`, while every real Verbal type in the library is `nominal`. Strip the sentences out and the task still works from pictures alone, which is the residue and it is not verbal reasoning. The working-memory load is not incidental to the presentation either — it is created by it: `DayLog.tsx` establishes that `events` is shuffled on disk and that the narration must therefore imply no order at all, so the child hears the parts once, in the wrong order, told nothing about order, and must construct and hold the right one. `packages/ui-contract/src/cogat.ts` reached the same conclusion independently: it is the only verbal type in this app that file declines to map, `direct` or `loose`. The owner called it before any of this was measured. Its narration was the game's only spoken feature and its component is kept — the voice moved to `VER-RELPAIR-01`, which is a real Verbal subtest and has no order to hold.",
  },
];

export const RETIRED_TYPES: readonly string[] = RETIRED.map((r) => r.typeCode);

/**
 * A THIRD RETIREMENT IS OWED AND IS DELIBERATELY NOT MADE HERE YET: `VER-SEQUENCE-01`.
 *
 * WHAT IT MEASURES. The child hears three to five story parts read aloud once, in an order the bank has
 * already SHUFFLED (`DayLog.tsx` argues at length that `events` is never the true order and that the
 * narration must therefore imply none), and then picks which of three or four candidate ARRANGEMENTS of
 * those parts is chronological. `requirements.ts` types its response channel `ordered: 4`, the same
 * class as `VER-SENSE-01`'s word ordering — an ordinal channel, not a lexical choice.
 *
 * WHY IT IS NOT CogAT VERBAL. CogAT's Verbal battery is Verbal Analogies, Sentence Completion and
 * Verbal Classification. All three ask what a WORD means relative to other words, and all three are
 * answered by choosing one word or one pair. None asks for a sequence. `cogat.ts` audited this type
 * against the nine subtests and gives it no analogue, direct or loose — the only verbal type in this
 * app it declines. What is left when the words are removed is temporal-causal ordering plus holding N
 * spoken parts and their identities long enough to evaluate N! arrangements against them, which is a
 * serial-order maintenance load. That is the owner's read and the items support it.
 *
 * IT IS NO LONGER IN `VERBS`; this entry is the record of why. The retirement waited on a second verbal
 * type, because `VER-SORTBOT-01` alone was pool-gated to 27 of its 100 items and a child would have
 * exhausted the verbal battery in three or four visits. Both halves of that changed: `VER-RELPAIR-01`
 * (Verbal Analogies) landed, and the words are now WRITTEN rather than drawn — so the sortbot gate no
 * longer refuses the undrawable and its pool is 82 of 100, refusing only the 18 items whose vocabulary
 * no child of the band has. See `screener/sortbotGate.ts` and `screener/wordPlate.tsx`.
 * `VER-RELPAIR-01` — Verbal Analogies, a real CogAT Verbal subtest, 100 items, already in `VERBS` and
 * waiting only on a presentation — is being built. THE ORDER IS: land that presentation, then delete
 * the `log` line below and rename `gate` to `log` in the same commit, so the Verbal station's key still
 * names a Verbal verb. `registry.test.ts` fails loudly if the rename is forgotten; see the test named
 * for `verbId`, which exists because of exactly this hazard.
 */

export function typesFor(battery: Battery, maxTier = 3): string[] {
  return VERBS.filter((v) => v.battery === battery && v.tier <= maxTier).map((v) => v.typeCode);
}

export function verbFor(typeCode: string): Verb | undefined {
  return VERBS.find((v) => v.typeCode === typeCode);
}

export function verbsFor(battery: Battery): Verb[] {
  return VERBS.filter((v) => v.battery === battery);
}

/** Whether a type has been withdrawn from measurement. Retired and servable are mutually exclusive. */
export function isRetired(typeCode: string): boolean {
  return RETIRED_TYPES.includes(typeCode);
}

/**
 * The engine domain every one of a battery's types reports, or `null` if they disagree.
 *
 * THE CHEAPEST POSSIBLE CROSS-CHECK ON PURITY, and the one that would have caught `SPA-XFORM-01` on
 * the day it was added: it was the only member of the Nonverbal station reporting `spatial` while its
 * three neighbours reported `fluid`. The scorer discards `domain`, so nothing in the measurement path
 * ever had cause to look at it — which is precisely why the guard has to live somewhere that is read.
 *
 * A disagreement is not automatically wrong. Two engine domains CAN belong to one CogAT battery
 * (Paper Folding is `spatial` and is genuinely Nonverbal). It is a prompt to justify, not a verdict —
 * `registry.test.ts` asserts agreement so that adding a legitimate exception is a deliberate act with
 * a written reason, rather than a silent one.
 */
export function domainOf(battery: Battery): Domain | null {
  const seen = new Set(verbsFor(battery).map((v) => v.domain));
  return seen.size === 1 ? ([...seen][0] as Domain) : null;
}
