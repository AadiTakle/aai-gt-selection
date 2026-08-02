import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

// The two research instruments under test are plain ESM with no type declarations, and a relative
// specifier cannot be declared ambiently — so the suppression sits on the specifier line itself,
// where TS7016 is reported. Inside the braces, because Prettier is free to wrap the import and a
// directive above `import {` would attach to the wrong line.
import {
  chooseWarmup,
  WARMUP_DEMONSTRATIONS,
  // @ts-expect-error -- research instrument, plain ESM with no type declarations
} from '../../../../../research/exam-question-types/stage2-block-run.js';
import {
  ALL_SYSTEMS,
  answerability,
  classifyChoice,
  contentDerivability,
  createTracker,
  determinedBadges,
  newKnowledge,
  observe,
  traceBlock,
  // @ts-expect-error -- research instrument, plain ESM with no type declarations
} from '../../../../../research/exam-question-types/stage2-learnability.mjs';

/**
 * The learnability oracle (STAGE2_QUESTION_DESIGN §1.1(a), §4.1.1).
 *
 * It decides, per trial, whether the answer was determinable from the reveals the child had already
 * seen — which is what separates "has not learned it yet" from "was asked an unanswerable question".
 * A wrong oracle is worse than no oracle: it would relabel real misses as measurement error and take
 * them out of the very quantity being measured. So the properties under test are SOUNDNESS (it never
 * claims a determined answer that is not the true one) and the two structural facts the trace rests
 * on — that the control arm determines nothing from prior reveals, and that the warm-up leaves no
 * scored trial turning on badges the child has never seen.
 *
 * Born-synthetic throughout. Nothing here is evidence that a child learns anything.
 */

const TYPE = 'FLU-OPCHAIN-01';
const REPO_ROOT = join(process.cwd(), '..', '..');
const QUESTION_TYPES = join(REPO_ROOT, 'research', 'exam-question-types');

interface Figure {
  glyph: string;
  orient: { a: number; b: number };
  shade: string;
  border: number;
  pair: number;
}
interface Item {
  itemId: string;
  difficulty: number;
  content: {
    chain: string[];
    input: Figure;
    options: { key: string; figure: Figure }[];
  };
  answer: {
    correctKey: string;
    operatorChain: string[];
    system: { mapping: Record<string, string> };
  };
}

function readBank(file: string): Item[] {
  return readFileSync(file, 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as Item);
}

const liveBank = readBank(join(QUESTION_TYPES, 'banks', `${TYPE}.jsonl`));
const controlBank = readBank(join(QUESTION_TYPES, 'control-banks', `${TYPE}.perTrial.jsonl`));

/** The figure the machine makes, i.e. what the reveal shows. */
const revealOf = (item: Item): Figure =>
  item.content.options.find((o) => o.key === item.answer.correctKey)!.figure;

/** Bank rows in the shape the review window's block loop hands around. */
const splitForRun = (bank: Item[]) => ({
  served: bank.map((item) => ({
    itemId: item.itemId,
    typeCode: TYPE,
    domain: 'fluid_reasoning',
    difficulty: item.difficulty,
    content: item.content,
  })),
  reviewerOnly: Object.fromEntries(
    bank.map((item) => [
      item.itemId,
      { correctKey: item.answer.correctKey, operatorChain: item.answer.operatorChain },
    ]),
  ),
});

const trialsFrom = (bank: Item[]) =>
  bank.map((item) => ({
    item: { itemId: item.itemId, difficulty: item.difficulty, content: item.content },
    revealedFigure: revealOf(item),
    correct: true,
  }));

/* ================================================================== *
 * The candidate space
 * ================================================================== */

describe('the candidate space is every badge-to-operator bijection', () => {
  it('enumerates all 720 of them, each a bijection', () => {
    expect(ALL_SYSTEMS).toHaveLength(720);
    for (const system of ALL_SYSTEMS as Record<string, string>[]) {
      const ops = Object.values(system);
      expect(ops).toHaveLength(6);
      expect(new Set(ops).size).toBe(6);
    }
    expect(
      new Set((ALL_SYSTEMS as Record<string, string>[]).map((s) => JSON.stringify(s))).size,
    ).toBe(720);
  });

  it('determines nothing before anything has been revealed', () => {
    const fresh = newKnowledge();
    expect(fresh.surviving).toHaveLength(720);
    expect(Object.keys(determinedBadges(fresh))).toHaveLength(0);
  });
});

/* ================================================================== *
 * Propagation
 * ================================================================== */

describe('constraint propagation', () => {
  const depthOne = liveBank.find((item) => item.answer.operatorChain.length === 1)!;

  it('a single depth-1 reveal pins exactly the badge it showed, and only that one', () => {
    const after = observe(newKnowledge(), depthOne, revealOf(depthOne));
    const badge = depthOne.content.chain[0]!;
    const determined = determinedBadges(after) as Record<string, string>;

    expect(Object.keys(determined)).toEqual([badge]);
    expect(determined[badge]).toBe(depthOne.answer.operatorChain[0]);
    // One badge fixed leaves the other five free: 5! = 120.
    expect(after.surviving).toHaveLength(120);
  });

  it('pins the sixth badge by elimination once five are known', () => {
    // Nothing about the sixth badge is ever revealed. The bijection alone determines it, which is why
    // the oracle tracks whole systems rather than independent per-badge candidate sets.
    const truth = liveBank[0]!.answer.system.mapping;
    const badges = Object.keys(truth);
    const fixed = badges.slice(0, 5);
    const knowledge = {
      surviving: (ALL_SYSTEMS as Record<string, string>[])
        .map((system, index) => ({ system, index }))
        .filter(({ system }) => fixed.every((badge) => system[badge] === truth[badge]))
        .map(({ index }) => index),
      reveals: 5,
      contradicted: 0,
    };

    expect(knowledge.surviving).toHaveLength(1);
    expect(Object.keys(determinedBadges(knowledge))).toHaveLength(6);
    expect((determinedBadges(knowledge) as Record<string, string>)[badges[5]!]).toBe(
      truth[badges[5]!],
    );
  });

  it('rebuilds rather than emptying when a reveal contradicts everything known', () => {
    // An empty surviving set would make every later question vacuously "determined", which would turn
    // the scrambled arm — where contradiction is the whole point — into a false claim of omniscience.
    const a = liveBank.find((i) => i.answer.operatorChain.length === 1)!;
    const wrongFigure = a.content.options.find((o) => o.key !== a.answer.correctKey)!.figure;
    const after = observe(observe(newKnowledge(), a, revealOf(a)), a, wrongFigure);

    expect(after.contradicted).toBe(1);
    expect(after.surviving).toHaveLength(720);
  });
});

/* ================================================================== *
 * Soundness — the property that makes the trace usable
 * ================================================================== */

describe('the oracle is sound', () => {
  it('never names a determined answer that is not the true key', () => {
    // The true system is always among the survivors, so the true option is always viable; when only
    // one option is viable it must therefore be the true one. Asserted over a long run rather than
    // argued, because everything downstream treats "derivable" as ground truth.
    const bank = liveBank.filter((_, i) => i % 7 === 0).slice(0, 60);
    let knowledge = newKnowledge();
    let checked = 0;

    for (const item of bank) {
      const answer = answerability(knowledge, item);
      expect(answer.viable).toContain(item.answer.correctKey);
      if (answer.determined !== null) {
        expect(answer.determined).toBe(item.answer.correctKey);
        checked += 1;
      }
      knowledge = observe(knowledge, item, revealOf(item));
    }

    expect(checked).toBeGreaterThan(0);
  });

  it('reports the anti-leak count the independent checker reports: no item leaks its key', () => {
    // Content-derivability IS learnability with zero reveals, so this number and
    // `check-FLU-OPCHAIN-01.mjs`'s relabelling invariant are the same measurement by construction and
    // cannot drift apart. E-075/E-076: a prior version of this bank leaked on 11 of 234 items.
    for (const bank of [liveBank, controlBank]) {
      const leaking = bank.filter((item) => contentDerivability(item).leaks);
      expect(leaking).toHaveLength(0);
    }
  });

  it('still shows a graded leak at the top of the scale, and says so numerically', () => {
    // Not a passing grade — a recorded exposure. The strict invariant holds while the top of the bank
    // narrows the field to two or three options, which is what lifts the control arm's floor above
    // chance and is why the arm contrast has to be read with the manipulation check.
    const chanceOf = (items: Item[]) =>
      items.length / items.reduce((sum, item) => sum + contentDerivability(item).count, 0);
    const floor = chanceOf(liveBank.filter((i) => i.difficulty < 4));
    const ceiling = chanceOf(liveBank.filter((i) => i.difficulty >= 16));

    expect(floor).toBeLessThan(0.22);
    expect(ceiling).toBeGreaterThan(0.28);
    expect(ceiling).toBeLessThan(0.35);
  });
});

/* ================================================================== *
 * The control arm, by construction
 * ================================================================== */

describe('the scrambled control determines nothing from prior reveals', () => {
  it('carries no knowledge forward, so no trial is ever derivable from earlier ones', () => {
    const { rows, summary } = traceBlock({
      trials: trialsFrom(controlBank.slice(0, 30)),
      persistence: 'perTrial',
    });

    expect(rows.every((r: { knowableBadges: number }) => r.knowableBadges === 0)).toBe(true);
    expect(rows.every((r: { systemsRemaining: number }) => r.systemsRemaining === 720)).toBe(true);
    expect(summary.derivableTrials).toBe(0);
    expect(summary.unanswerablePrefix).toBe(30);
    expect(summary.fullyKnowableAt).toBeNull();
  });

  it('does accumulate in the consistent arm over the same trial count', () => {
    const { summary } = traceBlock({
      trials: trialsFrom(liveBank.slice(0, 30)),
      persistence: 'consistent',
    });

    expect(summary.derivableTrials).toBeGreaterThan(0);
    expect(summary.fullyKnowableAt).not.toBeNull();
    expect(summary.meanKnowable).toBeGreaterThan(0);
  });

  it('refuses a persistence mode it does not model', () => {
    expect(() => createTracker({ persistence: 'sometimes' })).toThrow(/consistent\|perTrial/);
  });
});

/* ================================================================== *
 * Scoring a choice against the evidence
 *
 * A different construct from correctness: on a trial nobody could answer, being
 * right is luck, but picking an option your own reveals had eliminated is not.
 * The classes have to be disjoint and exhaustive or the rates do not add up, and
 * `ruledOut` has to be sound or it would accuse a child of an inference failure
 * they did not commit.
 * ================================================================== */

describe('classifying a choice against what the evidence allowed', () => {
  interface Row {
    inference: string | null;
    ruledOutBy: string | null;
    derivable: boolean;
    viableKeys: string[];
    contentViableKeys: string[];
    optionKeys: string[];
    ruledOutChance: number;
    chosenKey: string | null;
  }

  it('sorts every choice into exactly one of the three classes', () => {
    const tracker = createTracker({ persistence: 'consistent' });
    for (const item of liveBank.slice(0, 25)) {
      // Answer with a fixed position rather than the key, so the walk visits all three classes.
      const chosen = item.content.options[2]!.key;
      tracker.record(item, revealOf(item), {
        correct: chosen === item.answer.correctKey,
        chosenKey: chosen,
      });
    }
    const rows = tracker.rows as Row[];
    const summary = tracker.summary().inference;

    expect(rows.every((r) => ['determined', 'consistent', 'ruledOut'].includes(r.inference!))).toBe(
      true,
    );
    expect(summary.determined + summary.consistent + summary.ruledOut).toBe(summary.scored);
    expect(summary.ruledOutByReveals + summary.ruledOutByContent).toBe(summary.ruledOut);
  });

  it('never rules out the true answer', () => {
    // Soundness. The true system always survives, so the true option is always still viable; calling
    // it eliminated would accuse a correct child of contradicting evidence.
    const tracker = createTracker({ persistence: 'consistent' });
    for (const item of liveBank.slice(0, 40)) {
      const row = tracker.record(item, revealOf(item), {
        correct: true,
        chosenKey: item.answer.correctKey,
      }) as Row;
      expect(row.inference).not.toBe('ruledOut');
      expect(row.viableKeys).toContain(item.answer.correctKey);
    }
  });

  it('calls an option no mapping can produce ruled out by content, needing no memory', () => {
    // Not every item has one. Depth-1 items place five single-operator distractors, all of which some
    // mapping reaches, so content excludes nothing there; the share rises with depth. Measured in
    // `stage2-learnability-report.mjs`, and the reason this looks for a qualifying item.
    const fresh = createTracker({ persistence: 'consistent' });
    const found = liveBank
      .map((item) => fresh.before(item) as Row)
      .map((row) => ({ row, key: row.optionKeys.find((k) => !row.contentViableKeys.includes(k)) }))
      .find((candidate) => candidate.key !== undefined);

    expect(found, 'the bank should place an unreachable distractor somewhere').toBeDefined();
    expect(classifyChoice(found!.row, found!.key!)).toMatchObject({
      klass: 'ruledOut',
      ruledOutBy: 'content',
    });
  });

  it('calls an option only the child\u2019s own reveals exclude ruled out by reveals', () => {
    // The category that carries the signal: reachable in the abstract, eliminated by what this child
    // had already been shown. Found by walking the bank rather than hand-built, so it is a fact about
    // the real bank and not about a fixture.
    const tracker = createTracker({ persistence: 'consistent' });
    let found: { row: Row; key: string } | null = null;

    for (const item of liveBank.slice(0, 120)) {
      const row = tracker.before(item) as Row;
      const key = row.contentViableKeys.find((k) => !row.viableKeys.includes(k));
      if (key !== undefined && found === null) found = { row, key };
      tracker.record(item, revealOf(item), { correct: true, chosenKey: item.answer.correctKey });
    }

    expect(
      found,
      'reveals should exclude some content-reachable option somewhere in 120 trials',
    ).not.toBeNull();
    expect(classifyChoice(found!.row, found!.key)).toMatchObject({
      klass: 'ruledOut',
      ruledOutBy: 'reveals',
    });
  });

  it('cannot produce a reveals-based exclusion in the scrambled arm, by construction', () => {
    // Nothing carries there, so what the evidence allows is exactly what the item allows. Any
    // exclusion is the item's, never the child's memory — so the arm contrast in this signal is not
    // an assumption about children either.
    const tracker = createTracker({ persistence: 'perTrial' });
    for (const item of controlBank.slice(0, 40)) {
      const row = tracker.record(item, revealOf(item), {
        correct: false,
        chosenKey: item.content.options[0]!.key,
      }) as Row;
      expect(row.viableKeys).toEqual(row.contentViableKeys);
      expect(row.ruledOutBy).not.toBe('reveals');
    }
    expect(tracker.summary().inference.ruledOutByReveals).toBe(0);
  });

  it('reports the guessing baseline the observed rate has to be read against', () => {
    // Without this, a "ruled-out rate" would rank banks by how many unreachable distractors they
    // happen to place, and would move when the bank changed rather than when the child did.
    const tracker = createTracker({ persistence: 'consistent' });
    const rows: Row[] = [];
    for (const item of liveBank.slice(0, 30)) {
      rows.push(
        tracker.record(item, revealOf(item), {
          correct: true,
          chosenKey: item.answer.correctKey,
        }) as Row,
      );
    }
    for (const row of rows) {
      const excluded = row.optionKeys.length - row.viableKeys.length;
      expect(row.ruledOutChance).toBeCloseTo(excluded / row.optionKeys.length, 12);
    }

    const summary = tracker.summary().inference;
    // A perfect responder never lands on an excluded option, so its lift is exactly minus the chance.
    expect(summary.ruledOutRate).toBe(0);
    expect(summary.ruledOutChance).toBeGreaterThan(0);
    expect(summary.ruledOutLift).toBeCloseTo(-summary.ruledOutChance, 12);
  });

  it('leaves the signal null rather than zero when no choice was recorded', () => {
    // `traceBlock` is used for bank analysis with no responder at all. A silent zero there would read
    // as "this child never contradicted the evidence" for a child who never answered anything.
    const { summary } = traceBlock({
      trials: trialsFrom(liveBank.slice(0, 10)),
      persistence: 'consistent',
    });
    expect(summary.inference.scored).toBe(0);
    expect(summary.inference.ruledOutRate).toBeNull();
    expect(summary.inference.openRuledOutLift).toBeNull();
  });
});

/* ================================================================== *
 * The warm-up guarantee
 * ================================================================== */

describe('the unscored warm-up', () => {
  const live = splitForRun(liveBank);
  const control = splitForRun(controlBank);
  const warmupLive = chooseWarmup(live, live.served) as { itemId: string; difficulty: number }[];
  const warmupControl = chooseWarmup(control, control.served) as { itemId: string }[];

  it('shows depths 1, 2 and 3 on disjoint operator chains', () => {
    expect(warmupLive).toHaveLength(WARMUP_DEMONSTRATIONS);
    const chains = warmupLive.map((item) => live.reviewerOnly[item.itemId]!.operatorChain);
    expect(chains.map((c) => c.length)).toEqual([1, 2, 3]);
    const all = chains.flat();
    // Disjoint is what keeps the cost at one badge: a reused badge would let the depth-2 reveal pin
    // its partner by subtraction.
    expect(new Set(all).size).toBe(all.length);
    expect(new Set(all).size).toBe(6);
  });

  it('picks the same items in both arms, so the demonstrations cannot confound the contrast', () => {
    // Different banks, so different item ids — but the same POSITIONS, because the choice is made on
    // the operator chain, which is identical item-for-item across the pair.
    const positionOf = (bank: Item[], id: string) => bank.findIndex((item) => item.itemId === id);
    expect(warmupControl.map((i) => positionOf(controlBank, i.itemId))).toEqual(
      warmupLive.map((i) => positionOf(liveBank, i.itemId)),
    );
  });

  it('gives away exactly one badge of six', () => {
    const tracker = createTracker({ persistence: 'consistent' });
    for (const item of warmupLive) {
      const full = liveBank.find((i) => i.itemId === item.itemId)!;
      tracker.observePrior(full, revealOf(full));
    }
    expect(tracker.warmupDetermined).toBe(1);
  });

  it('leaves no scored trial turning on two badges the child has never seen', () => {
    // The guarantee the warm-up exists to make. A chain with two brand-new badges cannot be
    // attributed by one reveal, so it is unanswerable AND uninformative — a trial the sequence wasted.
    const warmIds = new Set(warmupLive.map((i) => i.itemId));
    const scored = liveBank.filter((item) => !warmIds.has(item.itemId));
    const priorReveals = warmupLive.map((item) => {
      const full = liveBank.find((i) => i.itemId === item.itemId)!;
      return { item: full, revealedFigure: revealOf(full) };
    });

    for (const offset of [0, 200, 400]) {
      const { summary } = traceBlock({
        trials: trialsFrom(scored.slice(offset, offset + 30)),
        persistence: 'consistent',
        priorReveals,
      });
      expect(summary.multiIntroductionTrials, `block at offset ${offset}`).toBe(0);
    }
  });
});
