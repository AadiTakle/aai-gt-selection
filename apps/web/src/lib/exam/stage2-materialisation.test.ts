import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { priceItem } from '../../../../../research/exam-question-types/stage2-serve-time-materialisation.mjs';
import {
  assertNoKeyMaterial,
  ExamKeyMaterialLeakError,
  toServedItem,
  type RawBankItem,
} from './bank-loader';
import {
  MATERIALISED_TYPE_CODE,
  materialisationEnabled,
  materialisationLedger,
  materialisedBankItem,
  materialisedIndexEntries,
  materialisedSessionFor,
  materialisedServedItem,
  materialisedServedItems,
  replayMaterialisedSession,
  resetMaterialisedSessions,
  resetTemplateCache,
  sessionSeedFor,
} from './materialised-session';
import { revealFor } from './reveal';
import { verify } from './verifiers';

/**
 * SERVE-TIME MATERIALISATION for FLU-OPCHAIN-01 (STAGE2_REDESIGN_SPEC §2.1, §3, §4.1; D-211).
 *
 * The bank stores a template; the server draws the session mapping, applies it, and materialises the
 * item. Five things could go wrong and each of them fails silently, which is what these tests are for:
 *
 *  1. THE ANSWER COULD BE OFF SCREEN. This is the defect being fixed — PR #51 measured admissibility at
 *     18.4% of mappings at chain depth 4 on the shipped bank. A materialised item where the key is not
 *     among the options grades every child wrong and looks like a hard item.
 *  2. THE MAPPING, THE KEY OR THE SEED COULD REACH THE BROWSER, which turns every item into a lookup
 *     and makes the whole measurement fiction (E-075/E-076).
 *  3. THE SESSION COULD NOT REPLAY. R7 requires a rejected family's result be reconstructible, and
 *     determinism has moved from "the bank is fixed" to "the session seed is fixed", so a replay that
 *     reproduces item ids but not option order or difficulty satisfies nothing.
 *  4. DIFFICULTY COULD MOVE WITH THE MAPPING. That is PR #51's Failure A and the reason the shipped
 *     `geom` model had to go.
 *  5. THE SCRAMBLED CONTROL COULD BECOME REACHABLE through the new path, in which case a child would sit
 *     a block where nothing is learnable by construction.
 *
 * Born-synthetic throughout. Nothing here is evidence that the type measures learning: that is Gate B,
 * it needs roughly 128 real children, and it has not run.
 */

const REPO_ROOT = join(process.cwd(), '..', '..');
const QUESTION_TYPES = join(REPO_ROOT, 'research', 'exam-question-types');

interface TemplateRecord {
  templateId: string;
  chain: number[];
  input: unknown;
  rationales: { rationaleId: string; lure: string }[];
  structure: { chainLength: number; slotCount: number; slots: number[]; reachableFigures: number };
  optionCount: number;
}

const templates: TemplateRecord[] = readFileSync(
  join(QUESTION_TYPES, 'templates', `${MATERIALISED_TYPE_CODE}.jsonl`),
  'utf8',
)
  .trim()
  .split('\n')
  .map((line) => JSON.parse(line) as TemplateRecord);

/** The six operator names. Written out rather than imported: a test that imports the vocabulary it is
 * checking for cannot notice the vocabulary being renamed out from under the assertion. */
const OPERATORS = ['turn', 'flip', 'slant', 'swap', 'ring', 'twin'] as const;

const originalFlag = process.env.EXAM_SERVE_TIME_MATERIALISATION;
const originalSecret = process.env.EXAM_SESSION_SEED_SECRET;

beforeEach(() => {
  process.env.EXAM_SERVE_TIME_MATERIALISATION = '1';
  process.env.EXAM_SESSION_SEED_SECRET = 'test-secret-for-materialisation-suite';
  resetMaterialisedSessions();
  resetTemplateCache();
});

afterEach(() => {
  if (originalFlag === undefined) delete process.env.EXAM_SERVE_TIME_MATERIALISATION;
  else process.env.EXAM_SERVE_TIME_MATERIALISATION = originalFlag;
  if (originalSecret === undefined) delete process.env.EXAM_SESSION_SEED_SECRET;
  else process.env.EXAM_SESSION_SEED_SECRET = originalSecret;
  resetMaterialisedSessions();
});

/* ================================================================== *
 * 1. The template bank names no meaning, and no key
 * ================================================================== */

describe('the template contract', () => {
  it('holds templates, and every one of them is structurally complete', () => {
    expect(templates.length).toBeGreaterThan(100);
    for (const template of templates) {
      expect(template.chain.length).toBe(template.structure.chainLength);
      // No slot repeats: five of the six operators are involutions, so a repeated slot would cancel and
      // the chain would silently be shorter than the length its difficulty is priced on.
      expect(new Set(template.chain).size).toBe(template.chain.length);
      // Four distractors have to come from somewhere, and collisions under a drawn mapping are the
      // normal case rather than the exception, so the priority list has to be longer than four.
      expect(template.rationales.length).toBeGreaterThan(4);
      // Five options need five distinct reachable figures under SOME mapping, or the template could
      // never fill a screen and should not have been emitted.
      expect(template.structure.reachableFigures).toBeGreaterThanOrEqual(template.optionCount);
    }
  });

  it('names no operator anywhere — the rule that keeps difficulty relabelling-invariant', () => {
    // PR #51's Failure A is that all four shipped types price difficulty on a count of one operator
    // sub-class, and class membership belongs to the operator rather than to the symbol, so a free
    // relabelling moves it on 48.3% of (item, mapping) pairs on this type. A template that mentions an
    // operator at all has re-opened that, so the check is over the serialised record and not a field
    // list — the failure mode is a new field nobody thought to check.
    for (const template of templates) {
      const serialised = JSON.stringify(template);
      for (const operator of OPERATORS) {
        expect(
          new RegExp(`"[^"]*\\b${operator}\\b[^"]*"`).test(serialised),
          `${template.templateId} names the operator ${operator}`,
        ).toBe(false);
      }
    }
  });

  it('carries neither a key nor a difficulty, because neither is a fact about the template', () => {
    for (const template of templates) {
      expect(Object.hasOwn(template, 'answer'), `${template.templateId} has an answer`).toBe(false);
      expect(Object.hasOwn(template, 'difficulty'), `${template.templateId} has a difficulty`).toBe(
        false,
      );
    }
  });
});

/* ================================================================== *
 * 2. Admissibility — the defect this whole path exists to fix
 * ================================================================== */

describe('the key is on screen by construction', () => {
  it('shows the figure the chain produces, for every item of every drawn session, at every depth', async () => {
    const byDepth = new Map<number, { served: number; onScreen: number }>();
    for (const sessionId of ['sess-a', 'sess-b', 'sess-c', 'sess-d']) {
      const session = await materialisedSessionFor(sessionId);
      expect(session.materialised.length).toBeGreaterThan(30);
      for (const entry of session.materialised) {
        const depth = entry.item.content.chain.length;
        const row = byDepth.get(depth) ?? { served: 0, onScreen: 0 };
        row.served += 1;
        const keyed = entry.item.content.options.find(
          (o) => o.key === entry.item.answer.correctKey,
        );
        // Re-derived here rather than read off `correctKey`: the point is that the OPTION carries the
        // figure the operator chain produces, not that two server-side fields agree with each other.
        if (
          keyed !== undefined &&
          sameFigure(
            keyed.figure,
            applyOps(entry.item.answer.operatorChain, entry.item.content.input),
          )
        ) {
          row.onScreen += 1;
        }
        byDepth.set(depth, row);
      }
      resetMaterialisedSessions();
    }

    expect([...byDepth.keys()].sort()).toEqual([1, 2, 3, 4]);
    for (const [depth, row] of byDepth) {
      expect(row.onScreen, `chain depth ${String(depth)}: key off screen on some item`).toBe(
        row.served,
      );
    }
  });

  it('gives every item five distinct options, all of them relabelling-reachable', async () => {
    const session = await materialisedSessionFor('sess-options');
    for (const entry of session.materialised) {
      const options = entry.item.content.options;
      expect(options.length).toBe(5);
      expect(new Set(options.map((o) => figureKey(o.figure))).size).toBe(5);
      // I2, unchanged from the shipped bank: an option no relabelling can reach is one the attacker
      // proves is not the key and deletes, which lifts the elimination attack off the 20% floor.
      expect(entry.item.answer.relabelling.viableOptions).toBe(5);
      expect(entry.item.answer.relabelling.optionVotes.every((v) => v >= 1)).toBe(true);
    }
  });

  it('excludes a template it cannot serve rather than serving a degenerate one', async () => {
    const session = await materialisedSessionFor('sess-exclusions');
    // Exclusion is an expected outcome of drawing a mapping, not an error, but it must be bounded: a
    // path that excluded most of the pool would have replaced one unservable bank with another.
    const excludedShare = session.excluded.length / templates.length;
    expect(excludedShare).toBeLessThan(0.2);
    for (const exclusion of session.excluded) {
      expect(exclusion.reason).toMatch(
        /^(fewer-than-two-reachable-options|too-few-admissible-distractors|chain-is-a-no-op-under-this-mapping|geometric-part-cancels-under-this-mapping)$/,
      );
    }
    // The two guards that cannot be applied at build time, because which slots are geometric is not
    // known until the mapping is drawn. Both are the shipped generator's build-time rules, moved.
    const served = new Set(session.materialised.map((entry) => entry.template.templateId));
    for (const entry of session.materialised) {
      expect(served.has(entry.template.templateId)).toBe(true);
      const produced = applyOps(entry.item.answer.operatorChain, entry.item.content.input);
      expect(figureKey(produced)).not.toBe(figureKey(entry.item.content.input));
    }
  });
});

/* ================================================================== *
 * 3. Nothing the browser receives carries key material
 * ================================================================== */

describe('the served payload', () => {
  it('names no operator, no mapping, no key and no template identity', async () => {
    const session = await materialisedSessionFor('sess-boundary');
    const served = await materialisedServedItems('sess-boundary');
    expect(served.length).toBe(session.materialised.length);

    for (const item of served) {
      const payload = JSON.stringify(item);
      for (const field of ['answer', 'scoring', 'provenance', 'demoPath']) {
        expect(Object.hasOwn(item, field), `served.${field}`).toBe(false);
      }
      for (const token of [
        ...OPERATORS,
        'correctKey',
        'operatorChain',
        'strategyTrace',
        'distractorRationales',
        'slotToOperator',
        'badgeToOperator',
        'templateId',
        'rationaleId',
        'keySlot',
        'sessionSeed',
      ]) {
        expect(payload.includes(token), `served payload leaks "${token}"`).toBe(false);
      }
    }
  });

  it('leaks nothing through the selection index either', async () => {
    const index = await materialisedIndexEntries('sess-index');
    expect(index.length).toBeGreaterThan(30);
    for (const entry of index) {
      // The ONE piece of stimulus shape the index may carry, because burst policy has to know whether a
      // type is a bounded choice before any content has been fetched. A count is not a key.
      expect(Object.keys(entry.content)).toEqual(['optionCount']);
      expect(entry.content.optionCount).toBe(5);
      expect(JSON.stringify(entry)).not.toContain('templateId');
    }
  });

  it('is refused, not cleaned, when it would carry key material', () => {
    // The strip in `bank-loader.ts` is the enforcement point and this is the extension: structural
    // omission is exactly right for the fields it knows about and says nothing about `content`, which
    // ships whole — and under materialisation `content` is built per request from a template and a drawn
    // mapping, so it does not exist at review time.
    expect(() =>
      assertNoKeyMaterial({
        itemId: 'planted',
        typeCode: MATERIALISED_TYPE_CODE,
        domain: 'fluid_reasoning',
        difficulty: 10,
        ageBands: ['4-5'],
        content: { chain: ['turn', 'flip'] },
        syntheticOnly: true,
        validated: false,
      }),
    ).toThrow(ExamKeyMaterialLeakError);

    // And it does not fire on a type that hides nothing, so it cannot become a reason to stop shipping
    // an unrelated bank.
    expect(() =>
      assertNoKeyMaterial({
        itemId: 'unguarded',
        typeCode: 'FLU-MATRIX-01',
        domain: 'fluid_reasoning',
        difficulty: 10,
        ageBands: ['4-5'],
        content: { note: 'turn the page' },
        syntheticOnly: true,
        validated: false,
      }),
    ).not.toThrow();
  });

  it('keeps the session seed out of reach of anything the browser holds', () => {
    // The browser holds `sessionId`. The mapping is a function of the SEED, so if the seed were the id,
    // or a hash of it, a browser could compute the key for every item it will ever be shown.
    const seed = sessionSeedFor('sess-secrecy');
    expect(seed).not.toContain('sess-secrecy');
    expect(seed).toMatch(/^[0-9a-f]{64}$/);

    process.env.EXAM_SESSION_SEED_SECRET = 'a-different-test-secret-entirely';
    expect(sessionSeedFor('sess-secrecy')).not.toBe(seed);
  });
});

/* ================================================================== *
 * 4. R7 — a session replays exactly from its seed
 * ================================================================== */

describe('R7 replay from the session seed', () => {
  it('reproduces every served item, option order and difficulty exactly', async () => {
    const sessionId = 'sess-replay';
    const session = await materialisedSessionFor(sessionId);

    // A responder that is right some of the time, so the recorded choices vary. Its accuracy is
    // irrelevant; what matters is that the replay is handed the same choices and has to rebuild the
    // same screens from the seed alone.
    const choices: { templateId: string; chosenKey: string }[] = [];
    for (let trial = 0; trial < 30; trial += 1) {
      const candidates = session.candidates();
      expect(candidates.length, `pool exhausted at trial ${String(trial + 1)}`).toBeGreaterThan(0);
      const target = 9 + trial * 0.12;
      const picked = candidates.reduce((best, candidate) =>
        Math.abs(candidate.difficulty - target) < Math.abs(best.difficulty - target)
          ? candidate
          : best,
      );
      const { item, row } = session.serve(picked.entry.template.templateId);
      const chosenKey = trial % 3 === 0 ? item.content.options[trial % 5]!.key : row.correctKey;
      session.commit({ chosenKey });
      choices.push({ templateId: row.templateId, chosenKey });
    }

    const recorded = await materialisationLedger(sessionId);
    expect(recorded.length).toBe(30);

    /*
     * THE LEDGER IS SELF-VERIFYING, which a replay on its own does not establish.
     *
     * A replay proves the session is reproducible. It does not prove the recorded difficulty is the one
     * the pricing model produces from the recorded levers — an offset applied on the way into the ledger
     * reproduces perfectly, because the replay applies the same offset. Caught exactly that way: a
     * deliberate `+ 0.01 * trialIndex` on the recorded difficulty passed all 21 assertions.
     *
     * So the number is re-derived from the levers beside it, through the same exported pricing function.
     * That is what R7 actually needs from a record: an auditor holding the ledger can recompute the
     * figure rather than take it on trust, and a figure that cannot be recomputed is not evidence.
     */
    for (const row of recorded) {
      const rederived = priceItem({
        chainLength: row.levers.chainLength,
        vocabularyInPlay: row.levers.vocabularyInPlay,
        slotCount: 6,
        evidenceCounts: row.levers.evidenceCounts,
        residualAmbiguity: row.levers.residualAmbiguity,
        readingsTotal: 720,
      });
      expect(
        rederived.difficulty,
        `trial ${String(row.trial)}: the recorded difficulty is not what its own recorded levers price to`,
      ).toBe(row.difficulty);
      expect(rederived.levers).toEqual(row.levers);
    }

    // Replay is handed the seed's INPUT (the session id) and the choices — never the options, the keys
    // or the difficulties. Taking those as input would make the assertion circular.
    resetMaterialisedSessions();
    const replayed = await replayMaterialisedSession(sessionId, choices);

    // Deep equality over the WHOLE ledger. Comparing item ids alone would pass while the options were
    // reshuffled, and reproducing option ORDER is half of what R7 needs here.
    expect(replayed).toEqual(recorded);
    // Named individually as well, so a failure says which property drifted rather than "objects differ".
    for (const [index, row] of recorded.entries()) {
      const back = replayed[index]!;
      expect(back.itemId, `trial ${String(row.trial)} itemId`).toBe(row.itemId);
      expect(back.templateId, `trial ${String(row.trial)} templateId`).toBe(row.templateId);
      expect(back.keySlot, `trial ${String(row.trial)} keySlot`).toBe(row.keySlot);
      expect(back.correctKey, `trial ${String(row.trial)} correctKey`).toBe(row.correctKey);
      expect(back.optionRationaleIds, `trial ${String(row.trial)} option order`).toEqual(
        row.optionRationaleIds,
      );
      expect(back.optionFigureKeys, `trial ${String(row.trial)} option figures`).toEqual(
        row.optionFigureKeys,
      );
      expect(back.difficulty, `trial ${String(row.trial)} difficulty`).toBe(row.difficulty);
      expect(back.levers, `trial ${String(row.trial)} levers`).toEqual(row.levers);
    }
  });

  it('replays differently under a different secret, so the seed is really the determinant', async () => {
    const choices: { templateId: string; chosenKey: string }[] = [];
    const session = await materialisedSessionFor('sess-secret-swap');
    for (let trial = 0; trial < 5; trial += 1) {
      const { row } = session.serve(session.candidates()[trial]!.entry.template.templateId);
      session.commit({ chosenKey: row.correctKey });
      choices.push({ templateId: row.templateId, chosenKey: row.correctKey });
    }
    const before = [...session.ledger];

    process.env.EXAM_SESSION_SEED_SECRET = 'yet-another-test-secret-value';
    resetMaterialisedSessions();
    const after = await replayMaterialisedSession('sess-secret-swap', choices);

    // Same templates in the same order, and yet a different screen every time: the mapping moved, so the
    // key moved with it. This is the property that makes a scrape of one session worthless in another.
    expect(after.map((row) => row.templateId)).toEqual(before.map((row) => row.templateId));
    const movedKeys = after.filter((row, i) => row.correctKey !== before[i]!.correctKey).length;
    expect(movedKeys).toBeGreaterThan(0);
  });

  it('does not advance the ledger when the same item is fetched twice', async () => {
    const first = await materialisedServedItem(
      'sess-idempotent',
      (await materialisedIndexEntries('sess-idempotent'))[0]!.itemId,
    );
    expect(first).not.toBeNull();
    const ledgerAfterOne = await materialisationLedger('sess-idempotent');
    expect(ledgerAfterOne.length).toBe(1);

    // A retried fetch, a re-render or a reload must not look like a second trial.
    const again = await materialisedServedItem('sess-idempotent', first!.itemId);
    expect(again).toEqual(first);
    expect((await materialisationLedger('sess-idempotent')).length).toBe(1);
  });
});

/* ================================================================== *
 * 5. Difficulty survives relabelling
 * ================================================================== */

describe('difficulty is priced on properties a relabelling cannot move', () => {
  it('gives the same structural score to the same template under every drawn mapping', async () => {
    const structural = new Map<string, Set<number>>();
    /** templateId -> residualAmbiguity -> the difficulties priced at that ambiguity. */
    const byAmbiguity = new Map<string, Map<number, Set<number>>>();
    let observations = 0;

    for (const sessionId of ['drift-1', 'drift-2', 'drift-3', 'drift-4', 'drift-5', 'drift-6']) {
      const session = await materialisedSessionFor(sessionId);
      for (const candidate of session.candidates()) {
        const id = candidate.entry.template.templateId;
        if (!structural.has(id)) structural.set(id, new Set());
        structural.get(id)!.add(candidate.levers.structural);

        if (!byAmbiguity.has(id)) byAmbiguity.set(id, new Map());
        const groups = byAmbiguity.get(id)!;
        const ambiguity = candidate.levers.residualAmbiguity;
        if (!groups.has(ambiguity)) groups.set(ambiguity, new Set());
        groups.get(ambiguity)!.add(candidate.difficulty);
        observations += 1;
      }
      resetMaterialisedSessions();
    }
    expect(observations).toBeGreaterThan(1000);

    // The shipped model drifts by mean 0.83 and p95 2.94 on this type against a 0.5 bank granularity,
    // because it prices a count of one operator sub-class. The structural levers here — chain length and
    // vocabulary in play — are counts of positions and of symbols, so they must not move AT ALL.
    for (const [id, values] of structural) {
      expect(values.size, `${id} structural score moved across mappings`).toBe(1);
    }

    /*
     * THE LOAD-BEARING ASSERTION, and the earlier version of this test did not make it.
     *
     * §3 says the total difficulty SHOULD move with the mapping, through residual ambiguity. That
     * permission is a place for an operator-class term to hide: a bound on how far the total may drift
     * passes just as happily whether the drift came from ambiguity or from a `geom` count. Checked that
     * way, a deliberately reintroduced `+ 0.4 * geomCount` went undetected by all 21 assertions.
     *
     * So the drift is not bounded, it is ATTRIBUTED. Group each template's prices by the residual
     * ambiguity they were computed at: within a group nothing about the child's evidence differs and the
     * only remaining variable is which operators the mapping drew, so every price in the group must be
     * identical. Any dependence on an operator, an operator class, or a count of either splits a group.
     */
    let groupsChecked = 0;
    for (const [id, groups] of byAmbiguity) {
      for (const [ambiguity, prices] of groups) {
        groupsChecked += 1;
        expect(
          prices.size,
          `${id} priced ${String(prices.size)} different ways at residual ambiguity ` +
            `${String(ambiguity)} — with the evidence identical, the only thing left varying is which ` +
            'operators were drawn, so difficulty is priced on a meaning',
        ).toBe(1);
      }
    }
    expect(groupsChecked).toBeGreaterThan(300);
  });

  it('prices no item on which operator was drawn', async () => {
    // The direct statement of §3's rule. Two items with the same chain length and the same evidence must
    // be priced identically whatever their operators are, so grouping the whole pool by (chain length,
    // structural score) must not split by operator content.
    const session = await materialisedSessionFor('sess-no-operator-pricing');
    const byLength = new Map<number, Set<number>>();
    for (const candidate of session.candidates()) {
      const length = candidate.levers.chainLength;
      if (!byLength.has(length)) byLength.set(length, new Set());
      byLength.get(length)!.add(candidate.levers.structural);
    }
    // At trial 1 nothing has been seen, so vocabulary in play is the chain length itself: one structural
    // score per chain length, and no dependence on which operators the mapping assigned.
    for (const [length, scores] of byLength) {
      expect(
        scores.size,
        `chain length ${String(length)} has ${String(scores.size)} structural scores`,
      ).toBe(1);
    }
  });
});

/* ================================================================== *
 * 6. The materialised item is graded by the shipped verifier, and reveals like one
 * ================================================================== */

describe('the materialised item on the graded path', () => {
  it('is graded correct on the key and wrong on everything else, by the shipped verifier', async () => {
    const index = await materialisedIndexEntries('sess-verify');
    for (const entry of index.slice(0, 12)) {
      await materialisedServedItem('sess-verify', entry.itemId);
      const full = await materialisedBankItem('sess-verify', entry.itemId);
      expect(full).not.toBeNull();

      // The SHIPPED verifier, with no branch on which path made the item. It re-derives the key by
      // resolving the badge chain through `answer.system.mapping` rather than trusting `correctKey`, so
      // this also checks that the session's mapping is the one the item was built with.
      const right = verify(full as RawBankItem, { selectedKey: full!.answer.correctKey as string });
      expect(right.correct, `${entry.itemId} graded its own key wrong`).toBe(true);

      for (const option of (full!.content as { options: { key: string }[] }).options) {
        if (option.key === full!.answer.correctKey) continue;
        expect(
          verify(full as RawBankItem, { selectedKey: option.key }).correct,
          `${entry.itemId} graded ${option.key} correct as well`,
        ).toBe(false);
      }
    }
  });

  it('reveals the option the machine made, and nothing else', async () => {
    const index = await materialisedIndexEntries('sess-reveal');
    await materialisedServedItem('sess-reveal', index[0]!.itemId);
    const full = await materialisedBankItem('sess-reveal', index[0]!.itemId);
    const reveal = revealFor(full as RawBankItem);
    expect(reveal).toEqual({ machineOutput: full!.answer.correctKey });
    expect(Object.keys(reveal!)).toEqual(['machineOutput']);
  });

  it('records the difficulty the item was SERVED at, not a re-price', async () => {
    const index = await materialisedIndexEntries('sess-frozen');
    const served = await materialisedServedItem('sess-frozen', index[0]!.itemId);
    const ledger = await materialisationLedger('sess-frozen');
    expect(served!.difficulty).toBe(ledger[0]!.difficulty);

    // Commit a few more trials, which moves the evidence and therefore what this item WOULD price at,
    // then ask for it again. Re-pricing at submit time would update the engine against a number the
    // child never faced.
    const session = await materialisedSessionFor('sess-frozen');
    session.commit({ chosenKey: ledger[0]!.correctKey });
    for (let i = 0; i < 4; i += 1) {
      const { row } = session.serve(session.candidates()[0]!.entry.template.templateId);
      session.commit({ chosenKey: row.correctKey });
    }
    const full = await materialisedBankItem('sess-frozen', index[0]!.itemId);
    expect(full!.difficulty).toBe(ledger[0]!.difficulty);
  });
});

/* ================================================================== *
 * 7. Neither guard is weakened
 * ================================================================== */

describe('the guards the shipped path relies on', () => {
  it('leaves the scrambled control arm unreachable, and by a stronger argument than a filter', async () => {
    // `bank-loader.ts` fails the whole pool if an item declaring `systemPersistence: 'perTrial'` reaches
    // it, because in that arm nothing is learnable by construction and it must never be administered.
    // The materialised path does not need that filter and must not be read as bypassing it: the arm is
    // structurally unreachable here, because a session draws ONE system and every item of every trial is
    // materialised through it. There is no per-item system to redraw.
    const session = await materialisedSessionFor('sess-arm');

    // Reconstructed from what each item actually carries — the badge chain beside the operator chain it
    // was built with — rather than read off a single `system` field. If any item had been materialised
    // under a redrawn mapping, two items would disagree about what one badge means and this would say so.
    const meaning = new Map<string, string>();
    let itemsChecked = 0;
    for (const entry of session.materialised) {
      const badges = entry.item.content.chain;
      const operators = entry.item.answer.operatorChain;
      expect(operators.length).toBe(badges.length);
      badges.forEach((badge, position) => {
        const already = meaning.get(badge);
        if (already === undefined) meaning.set(badge, operators[position]!);
        else {
          expect(
            operators[position],
            `${badge} means "${String(operators[position])}" on ${entry.item.itemId} and "${already}" elsewhere ` +
              'in the same session — the system was redrawn per item, which is the scrambled control arm',
          ).toBe(already);
        }
      });
      itemsChecked += 1;
    }
    // All six badges resolved, from one system, across the whole session.
    expect(itemsChecked).toBeGreaterThan(100);
    expect(meaning.size).toBe(6);
    expect(new Set(meaning.values()).size).toBe(6);

    for (const template of templates) {
      expect(JSON.stringify(template)).not.toContain('systemPersistence');
    }

    // And the shipped filter is still doing its job on the shipped path.
    const controlItem = {
      itemId: 'c1',
      typeCode: MATERIALISED_TYPE_CODE,
      domain: 'fluid_reasoning',
      difficulty: 5,
      ageBands: ['4-5'],
      content: { chain: ['circle'] },
      answer: { correctKey: 'A' },
      provenance: { levers: { systemPersistence: 'perTrial' } },
      syntheticOnly: true as const,
      validated: false as const,
    } as unknown as RawBankItem;
    // `toServedItem` strips provenance, so the arm declaration cannot travel — but it also must not be
    // the thing that makes a control arm servable, which is why `loadAll` refuses it before this point.
    expect(() => toServedItem(controlItem)).not.toThrow();
    expect(Object.hasOwn(toServedItem(controlItem), 'provenance')).toBe(false);
  });

  it('keeps the key un-brute-forceable from content alone', async () => {
    // The E-075/E-076 invariant, restated for a materialised item: enumerate every badge->operator
    // bijection against `content` and collect the options they can produce. More than one surviving
    // means `content` does not determine the key and no client-side computation can.
    const session = await materialisedSessionFor('sess-bruteforce');
    const sampled = session.materialised.filter((_, i) => i % 23 === 0);
    expect(sampled.length).toBeGreaterThan(8);

    for (const entry of sampled) {
      const { input, chain, options, badgeTray } = entry.item.content;
      const byFigure = new Map(options.map((o) => [figureKey(o.figure), o.key]));
      const reachable = new Set<string>();
      for (const mapping of allBijections(badgeTray)) {
        const produced = figureKey(
          applyOps(
            chain.map((badge) => mapping[badge]!),
            input,
          ),
        );
        const hit = byFigure.get(produced);
        if (hit !== undefined) reachable.add(hit);
      }
      expect(
        reachable.size,
        `${entry.item.itemId} has its key determined by content alone`,
      ).toBeGreaterThan(1);
      expect(reachable.has(entry.item.answer.correctKey)).toBe(true);
    }
  });

  it('is off unless switched on, so the shipped bank keeps working', () => {
    delete process.env.EXAM_SERVE_TIME_MATERIALISATION;
    expect(materialisationEnabled()).toBe(false);
    process.env.EXAM_SERVE_TIME_MATERIALISATION = 'true';
    expect(materialisationEnabled()).toBe(true);
    process.env.EXAM_SERVE_TIME_MATERIALISATION = 'no';
    expect(materialisationEnabled()).toBe(false);
  });
});

/* ================================================================== *
 * The figure algebra, re-implemented rather than imported.
 *
 * Importing the materialiser's own `applyChain` would make a materialiser that is wrong about its own
 * algebra agree with itself, which is the one thing these assertions exist to rule out. This is the same
 * D4 relation written independently: orientation is r^a m^b under m·r = r⁻¹·m.
 * ================================================================== */

interface Figure {
  glyph: string;
  orient: { a: number; b: number };
  shade: string;
  border: number;
  pair: number;
}

const GEOM: Record<string, { a: number; b: number }> = {
  turn: { a: 1, b: 0 },
  flip: { a: 0, b: 1 },
  slant: { a: 1, b: 1 },
};

function applyOps(ops: readonly string[], figure: Figure): Figure {
  return ops.reduce<Figure>((state, op) => {
    const g = GEOM[op];
    if (g) {
      return {
        ...state,
        orient: {
          a: (((g.a + (g.b ? -state.orient.a : state.orient.a)) % 4) + 4) % 4,
          b: (g.b + state.orient.b) % 2,
        },
      };
    }
    if (op === 'swap') return { ...state, shade: state.shade === 'solid' ? 'hollow' : 'solid' };
    if (op === 'ring') return { ...state, border: state.border ? 0 : 1 };
    if (op === 'twin') return { ...state, pair: state.pair ? 0 : 1 };
    throw new Error(`unknown operator "${op}"`);
  }, figure);
}

const figureKey = (f: Figure) =>
  `${f.glyph}|${String(f.orient.a)}${String(f.orient.b)}|${f.shade}|${String(f.border)}|${String(f.pair)}`;

const sameFigure = (a: Figure, b: Figure) => figureKey(a) === figureKey(b);

/** All 720 badge->operator bijections. */
function allBijections(badges: readonly string[]): Record<string, string>[] {
  const out: Record<string, string>[] = [];
  const walk = (rest: readonly string[], taken: string[]) => {
    if (taken.length === badges.length) {
      out.push(Object.fromEntries(badges.map((badge, i) => [badge, taken[i]!])));
      return;
    }
    for (const op of rest) {
      walk(
        rest.filter((other) => other !== op),
        [...taken, op],
      );
    }
  };
  walk(OPERATORS, []);
  return out;
}
