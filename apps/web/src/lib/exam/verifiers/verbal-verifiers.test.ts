import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { RawBankItem } from '../bank-loader';
import { verify } from './index';

/**
 * Round-trip tests for the six types owned by `verbal.ts`.
 *
 * Every case loads a REAL bank item off disk, builds the response an actual
 * renderer would post for a correct child, and asserts the verdict — then does
 * the same for a plausibly wrong response. A verifier that returns one constant
 * verdict passes neither direction, which is the failure mode these guard.
 *
 * The expected response is built from the item's stored `answer`, while the
 * verifiers re-derive it from `content`/`provenance`. Agreement between the two
 * is the point: it cross-checks the re-derivation against the recorded key.
 */

const BANKS = join(process.cwd(), '..', '..', 'research', 'exam-question-types', 'banks');

function loadBank(typeCode: string): RawBankItem[] {
  return readFileSync(join(BANKS, `${typeCode}.jsonl`), 'utf8')
    .trim()
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as RawBankItem);
}

function pick<T>(items: T[], predicate: (item: T) => boolean, what: string): T {
  const found = items.find(predicate);
  if (!found) throw new Error(`no bank item matching ${what}`);
  return found;
}

/** A copy of the item with its stored key corrupted, leaving `content` intact. */
function withCorruptedKey(item: RawBankItem, patch: Record<string, unknown>): RawBankItem {
  const clone = JSON.parse(JSON.stringify(item)) as RawBankItem;
  Object.assign(clone.answer, patch);
  return clone;
}

describe('WM-corsi-01 — serial-order span', () => {
  const bank = loadBank('WM-corsi-01');

  it.each(['forward', 'backward'])('accepts the exact %s trail', (mode) => {
    const item = pick(
      bank,
      (i) =>
        (i.content as { mode?: string }).mode === mode &&
        (i.answer.expectedSequence as number[]).length >= 4,
      `a ${mode} item of span >= 4`,
    );
    const expected = item.answer.expectedSequence as number[];
    const verdict = verify(item, { tappedCells: [...expected], tapCount: expected.length });
    expect(verdict.correct).toBe(true);
    expect(verdict.metrics?.['M-POLY']).toBe(1);
    expect(verdict.metrics?.['M-PROG']).toBe(1);
  });

  it('rejects the reversed trail and keeps the partial signal', () => {
    const item = pick(
      bank,
      (i) =>
        (i.content as { mode?: string }).mode === 'forward' &&
        (i.answer.expectedSequence as number[]).length === 4,
      'a forward item of span 4',
    );
    const expected = item.answer.expectedSequence as number[];
    const verdict = verify(item, { tappedCells: [...expected].reverse() });
    expect(verdict.correct).toBe(false);
  });

  it('scores a half-remembered trail at 0.5 and stops the prefix at the break', () => {
    const item = pick(
      bank,
      (i) => (i.answer.expectedSequence as number[]).length === 4,
      'a span-4 item',
    );
    const expected = item.answer.expectedSequence as number[];
    // First two positions right, then two cells that were never on the grid.
    const verdict = verify(item, { tappedCells: [expected[0], expected[1], -1, -2] });
    expect(verdict.correct).toBe(false);
    expect(verdict.metrics?.['M-POLY']).toBe(0.5);
    expect(verdict.metrics?.['M-PROG']).toBe(0.5);
  });

  it('replays every trail in the bank to the recorded key', () => {
    for (const item of bank) {
      const expected = item.answer.expectedSequence as number[];
      expect(verify(item, { tappedCells: [...expected] }).correct, item.itemId).toBe(true);
    }
  });

  it('returns incorrect rather than throwing on a malformed response', () => {
    expect(verify(bank[0]!, { tappedCells: 'nope' })).toEqual({ correct: false });
    expect(verify(bank[0]!, {})).toEqual({ correct: false });
  });
});

describe('WM-bind-01 — object-to-location binding', () => {
  const bank = loadBank('WM-bind-01');

  it('accepts every creature back in its own house, in any placement order', () => {
    const item = pick(
      bank,
      (i) => Object.keys(i.answer.bindings as object).length >= 4,
      'setSize >= 4',
    );
    const bindings = item.answer.bindings as Record<string, number>;
    // Reverse the key order: binding credit must be order-free.
    const placements = Object.fromEntries(Object.entries(bindings).reverse());
    const verdict = verify(item, { placements, placementCount: Object.keys(placements).length });
    expect(verdict.correct).toBe(true);
    expect(verdict.metrics?.['M-POLY']).toBe(1);
  });

  it('scores a two-creature swap as partial, not zero', () => {
    const item = pick(
      bank,
      (i) => Object.keys(i.answer.bindings as object).length === 4,
      'setSize 4',
    );
    const bindings = item.answer.bindings as Record<string, number>;
    const ids = Object.keys(bindings);
    const placements = { ...bindings };
    placements[ids[0]!] = bindings[ids[1]!]!;
    placements[ids[1]!] = bindings[ids[0]!]!;
    const verdict = verify(item, { placements });
    expect(verdict.correct).toBe(false);
    // Two of four bindings survive the swap.
    expect(verdict.metrics?.['M-POLY']).toBe(0.5);
  });

  it('never awards full credit for an incomplete set', () => {
    const item = pick(
      bank,
      (i) => Object.keys(i.answer.bindings as object).length === 4,
      'setSize 4',
    );
    const bindings = item.answer.bindings as Record<string, number>;
    const [dropped, ...kept] = Object.keys(bindings);
    expect(dropped).toBeDefined();
    const placements = Object.fromEntries(kept.map((id) => [id, bindings[id]!]));
    const verdict = verify(item, { placements });
    expect(verdict.correct).toBe(false);
    expect(verdict.metrics?.['M-POLY']).toBe(0.75);
  });

  it('replays every encoding schedule in the bank to the recorded bindings', () => {
    for (const item of bank) {
      const placements = item.answer.bindings as Record<string, number>;
      expect(verify(item, { placements }).correct, item.itemId).toBe(true);
    }
  });

  it('returns incorrect rather than throwing on a malformed response', () => {
    expect(verify(bank[0]!, { placements: [] })).toEqual({ correct: false });
  });
});

describe('WM-bubble-01 — n-back', () => {
  const bank = loadBank('WM-bubble-01');

  const targetsOf = (item: RawBankItem): Record<string, number[]> => {
    const out: Record<string, number[]> = {};
    for (const part of String(item.answer.correctKey).split('|')) {
      const [id, list] = part.split(':');
      out[id!] = list && list.length ? list.split(',').map(Number) : [];
    }
    return out;
  };
  const streamLength = (item: RawBankItem) =>
    (item.content as { streamLength: number }).streamLength;
  const nOf = (item: RawBankItem) => (item.content as { n: number }).n;
  const channelsOf = (item: RawBankItem) =>
    (item.content as { channels: { id: string }[] }).channels;

  interface Judgement {
    channel: string;
    stepIndex: number;
    choice: 'seen' | 'new';
    rtMs: number;
    via: string;
  }
  /**
   * What the renderer posts for a child who judges every decidable bubble right:
   * one answer per lane per step, "seen" exactly on the recorded target steps.
   */
  const allJudgements = (item: RawBankItem): Judgement[] => {
    const targets = targetsOf(item);
    const out: Judgement[] = [];
    for (const channel of channelsOf(item)) {
      const targetSteps = new Set(targets[channel.id] ?? []);
      for (let i = nOf(item); i < streamLength(item); i++) {
        out.push({
          channel: channel.id,
          stepIndex: i,
          choice: targetSteps.has(i) ? 'seen' : 'new',
          rtMs: 400,
          via: 'tap',
        });
      }
    }
    return out;
  };
  /** The same stream with one answer flipped, addressed by lane and step. */
  const flipped = (judgements: Judgement[], at: (j: Judgement) => boolean): Judgement[] => {
    const index = judgements.findIndex(at);
    return judgements.map((j, i) =>
      i === index ? { ...j, choice: j.choice === 'seen' ? 'new' : 'seen' } : j,
    );
  };

  it.each([1, 2])(
    'accepts "seen it" on every target and "new" everywhere else (%i channel(s))',
    (channels) => {
      const item = pick(
        bank,
        (i) => (i.content as { channels: unknown[] }).channels.length === channels,
        `a ${channels}-channel block`,
      );
      const verdict = verify(item, {
        judgements: allJudgements(item),
        stepsShown: streamLength(item),
        completed: true,
      });
      expect(verdict.correct).toBe(true);
      expect(verdict.metrics?.['M-POLY']).toBe(1);
      expect(verdict.metrics?.['M-DPRIME']).toBe(1);
      expect(verdict.metrics?.['M-FALSEALARM']).toBe(0);
    },
  );

  it('splits a miss from a false alarm on separate channels', () => {
    const item = pick(
      bank,
      (i) =>
        (i.content as { channels: unknown[] }).channels.length === 1 &&
        Object.values(targetsOf(i))[0]!.length >= 3,
      'a single-channel block with >= 3 targets',
    );
    const judgements = allJudgements(item);
    const targets = judgements.filter((j) => j.choice === 'seen').length;

    // A target called "new": the hit rate falls, and calling a repeat new is not a false alarm.
    const missed = verify(item, {
      judgements: flipped(judgements, (j) => j.choice === 'seen'),
      stepsShown: streamLength(item),
      completed: true,
    });
    expect(missed.correct).toBe(false);
    expect(missed.metrics?.['M-DPRIME']).toBe(Math.round(((targets - 1) / targets) * 1e4) / 1e4);
    expect(missed.metrics?.['M-FALSEALARM']).toBe(0);

    // A non-target called "seen it": perfect hit rate, non-zero bias.
    const biased = verify(item, {
      judgements: flipped(judgements, (j) => j.choice === 'new'),
      stepsShown: streamLength(item),
      completed: true,
    });
    expect(biased.correct).toBe(false);
    expect(biased.metrics?.['M-DPRIME']).toBe(1);
    expect(biased.metrics?.['M-FALSEALARM']).toBeGreaterThan(0);
  });

  it('does not credit a bubble that was never answered', () => {
    const item = pick(
      bank,
      (i) => (i.content as { channels: unknown[] }).channels.length === 1,
      'any single-channel block',
    );
    const judgements = allJudgements(item);
    const dropped = judgements.findIndex((j) => j.choice === 'new');
    const decidable = judgements.length;
    const verdict = verify(item, {
      judgements: judgements.filter((_, i) => i !== dropped),
      stepsShown: streamLength(item),
      completed: true,
    });
    // Silence on a non-target must not read as "new": it is a decision that was not made.
    expect(verdict.correct).toBe(false);
    expect(verdict.metrics?.['M-POLY']).toBe(Math.round(((decidable - 1) / decidable) * 1e4) / 1e4);
    expect(verdict.metrics?.['M-FALSEALARM']).toBe(0);
  });

  it('never awards full credit for a block that was cut short', () => {
    const item = pick(
      bank,
      (i) => (i.content as { channels: unknown[] }).channels.length === 1,
      'any block',
    );
    const verdict = verify(item, {
      judgements: allJudgements(item),
      stepsShown: streamLength(item) - 2,
      completed: false,
    });
    expect(verdict.correct).toBe(false);
  });

  it('re-derives the target steps of every block in the bank', () => {
    for (const item of bank) {
      const verdict = verify(item, {
        judgements: allJudgements(item),
        stepsShown: streamLength(item),
        completed: true,
      });
      expect(verdict.correct, item.itemId).toBe(true);
    }
  });

  it('returns incorrect rather than throwing on a malformed response', () => {
    expect(verify(bank[0]!, { judgements: 'nope' })).toEqual({ correct: false });
    // The retired go/no-go shape is no longer a gradeable response.
    expect(verify(bank[0]!, { pops: [], stepsShown: streamLength(bank[0]!) })).toEqual({
      correct: false,
    });
  });
});

describe('VER-EVIDENCE-01 — answer plus evidence', () => {
  const bank = loadBank('VER-EVIDENCE-01');
  const keysOf = (item: RawBankItem) => {
    const [answerKey, evidenceKey] = String(item.answer.correctKey).split('+');
    return { answerKey: answerKey!, evidenceKey: evidenceKey! };
  };

  it('accepts the right answer proved by the right sentence', () => {
    const item = bank[0]!;
    const verdict = verify(item, { ...keysOf(item), answerChanges: 0, evidenceChanges: 0 });
    expect(verdict.correct).toBe(true);
    expect(verdict.metrics?.['M-POLY']).toBe(1);
    // The depth actually proved is only recorded on a fully correct item.
    expect(verdict.metrics?.['M-INFDEPTH']).toBe(
      (item.provenance as { levers: { depthRank: number } }).levers.depthRank,
    );
  });

  it('honours the 0.5/0.5 weights when only one part is right', () => {
    const item = bank[0]!;
    const { answerKey, evidenceKey } = keysOf(item);
    const wrongEvidence = (
      item.content as { passage: { sentences: { key: string }[] } }
    ).passage.sentences
      .map((s) => s.key)
      .find((key) => key !== evidenceKey)!;
    const wrongAnswer = (item.content as { options: { key: string }[] }).options
      .map((o) => o.key)
      .find((key) => key !== answerKey)!;

    const answerOnly = verify(item, { answerKey, evidenceKey: wrongEvidence });
    expect(answerOnly.correct).toBe(false);
    expect(answerOnly.metrics?.['M-POLY']).toBe(0.5);
    expect(answerOnly.metrics?.['M-INFDEPTH']).toBeUndefined();

    const evidenceOnly = verify(item, { answerKey: wrongAnswer, evidenceKey });
    expect(evidenceOnly.correct).toBe(false);
    expect(evidenceOnly.metrics?.['M-POLY']).toBe(0.5);

    const neither = verify(item, { answerKey: wrongAnswer, evidenceKey: wrongEvidence });
    expect(neither.correct).toBe(false);
    expect(neither.metrics?.['M-POLY']).toBe(0);
  });

  it('re-derives both keys from the inference derivation, not from the stored key', () => {
    const item = bank[0]!;
    const corrupted = withCorruptedKey(item, { correctKey: 'Z+s99' });
    expect(verify(corrupted, keysOf(item)).correct).toBe(true);
  });

  it('agrees with the recorded key on every item in the bank', () => {
    for (const item of bank) {
      expect(verify(item, keysOf(item)).correct, item.itemId).toBe(true);
    }
  });

  it('returns incorrect rather than throwing on a malformed response', () => {
    expect(verify(bank[0]!, { answerKey: 'B' })).toEqual({ correct: false });
  });
});

/**
 * GB-FLAWFINDER-01 has no per-type verifier — it resolves to the generic keyed one.
 * It is covered here because the 2026-07-29 reframe changed WHAT the key names: the
 * old bank keyed the defective statement, the reframed bank keys the claim the facts
 * support, and the renderer now reports that claim id as `selectedKey`. A demo that
 * reported only an index would be scored wrong on every item against a string key, so
 * the contract between the two is asserted rather than assumed.
 */
describe('GB-FLAWFINDER-01 — best-supported claim (generic keyed verifier)', () => {
  const bank = loadBank('GB-FLAWFINDER-01');

  it('accepts the supported claim and refuses every distractor, bank-wide', () => {
    for (const item of bank) {
      const claims = (item.content as { claims: { id: string }[] }).claims;
      const key = String(item.answer.correctKey);
      expect(verify(item, { selectedKey: key }).correct, item.itemId).toBe(true);
      for (const claim of claims) {
        if (claim.id === key) continue;
        expect(verify(item, { selectedKey: claim.id }).correct, `${item.itemId} ${claim.id}`).toBe(
          false,
        );
      }
    }
  });

  it('reads the recorded key rather than a constant position', () => {
    const item = pick(
      bank,
      (i) => String(i.answer.correctKey) !== 'c1',
      'an item not keyed on the first claim',
    );
    expect(verify(item, { selectedKey: 'c1' }).correct).toBe(false);
    const relabelled = withCorruptedKey(item, { correctKey: 'c1' });
    expect(verify(relabelled, { selectedKey: 'c1' }).correct).toBe(true);
  });

  it('returns incorrect rather than throwing on a malformed response', () => {
    const item = bank[0]!;
    expect(verify(item, {})).toEqual({ correct: false });
    expect(verify(item, { selectedKey: 'nope' })).toEqual({ correct: false });
    // The index alone cannot grade a string key — this is why the renderer sends
    // `selectedKey` (the claim id) and not just `selectedIndex`.
    expect(verify(item, { selectedIndex: 0 })).toEqual({ correct: false });
  });
});

describe('VER-SENSE-01 — word-card ordering', () => {
  const bank = loadBank('VER-SENSE-01');
  const orderOf = (item: RawBankItem) => String(item.answer.correctKey).split(',').map(Number);
  const articlesOf = (item: RawBankItem) => (item.content as { articles: string[] }).articles;

  /** The line the renderer posts: card tokens, with articles inserted between them. */
  const lineOf = (order: number[], articleAt: Record<number, string> = {}) =>
    order.flatMap((index, position) => {
      const article = articleAt[position];
      const card = { kind: 'card', index };
      return article ? [{ kind: 'article', text: article }, card] : [card];
    });

  it('accepts the one ordering that is grammatical and plausible', () => {
    const item = bank[0]!;
    const order = orderOf(item);
    const cards = (item.content as { cards: { text: string }[] }).cards;
    const verdict = verify(item, {
      order,
      sequence: lineOf(order),
      sentence: order.map((i) => cards[i]!.text).join(' '),
      complete: true,
    });
    expect(verdict.correct).toBe(true);
    expect(verdict.metrics?.['M-POLY']).toBe(1);
  });

  /**
   * The reviewer's point: with the article sidebar the child can realise the same
   * ordering as "the dog ate a bone" or "a dog ate the bone", and nothing in the
   * item fixes which. Every realisation of the reference ordering has to score
   * full credit, or the more complete answer is the one penalised.
   */
  it('accepts every article realisation of the reference ordering, on every item', () => {
    for (const item of bank) {
      const order = orderOf(item);
      const articles = articlesOf(item);
      for (const article of articles) {
        const verdict = verify(item, {
          order,
          sequence: lineOf(order, { 0: article, [order.length - 1]: article }),
          complete: true,
        });
        expect(verdict.correct, `${item.itemId} with "${article}"`).toBe(true);
        expect(verdict.metrics?.['M-POLY']).toBe(1);
      }
    }
  });

  /**
   * Deliberate leniency, recorded so it cannot become accidental: article
   * PLACEMENT is not scored. Grading it would need per-noun countability data the
   * bank does not carry, and the construct is the word order plus the semantic
   * plausibility of the content words — not determiner grammar.
   */
  it('does not score where the articles were put', () => {
    const item = bank[0]!;
    const order = orderOf(item);
    const articleAt = Object.fromEntries(order.map((_, position) => [position, 'the']));
    const verdict = verify(item, { order, sequence: lineOf(order, articleAt), complete: true });
    expect(verdict.correct).toBe(true);
  });

  it('refuses a line carrying a token the item never offered', () => {
    const item = bank[0]!;
    const order = orderOf(item);
    const cards = (item.content as { cards: unknown[] }).cards;
    expect(
      verify(item, { sequence: [...lineOf(order), { kind: 'article', text: 'some' }] }),
    ).toEqual({ correct: false });
    expect(
      verify(item, { sequence: [...lineOf(order), { kind: 'card', index: cards.length }] }),
    ).toEqual({ correct: false });
    expect(verify(item, { sequence: [{ kind: 'word', text: 'dog' }] })).toEqual({ correct: false });
  });

  it('refuses a response whose card order and built line disagree', () => {
    const item = pick(bank, (i) => orderOf(i).length >= 3, 'any item');
    const order = orderOf(item);
    const swapped = [order[1]!, order[0]!, ...order.slice(2)];
    expect(verify(item, { order, sequence: lineOf(swapped) })).toEqual({ correct: false });
  });

  it('rejects the grammatical-but-absurd lure', () => {
    const item = pick(
      bank,
      (i) =>
        Object.values(
          i.answer.distractorRationales as Record<
            string,
            { lureClass: string; lureDetail?: string }
          >,
        ).some((r) => (r.lureDetail ?? r.lureClass) === 'grammatical-but-absurd'),
      'an item with an absurd lure',
    );
    const rationales = item.answer.distractorRationales as Record<
      string,
      { lureClass: string; lureDetail?: string }
    >;
    const absurdKey = Object.entries(rationales).find(
      ([, r]) => (r.lureDetail ?? r.lureClass) === 'grammatical-but-absurd',
    )![0];
    const verdict = verify(item, { order: absurdKey.split(',').map(Number), complete: true });
    expect(verdict.correct).toBe(false);
  });

  it('keeps adjacent-pair credit when one card is misplaced', () => {
    const item = pick(bank, (i) => orderOf(i).length >= 5, 'an item with >= 5 cards');
    const order = orderOf(item);
    // Move the last card to the front: every pair except the two it touched survives.
    const shuffled = [order[order.length - 1]!, ...order.slice(0, -1)];
    const verdict = verify(item, { order: shuffled, complete: true });
    expect(verdict.correct).toBe(false);
    const pairs = order.length - 1;
    expect(verdict.metrics?.['M-POLY']).toBe(Math.round(((pairs - 1) / pairs) * 1e4) / 1e4);
  });

  it('agrees with the recorded key on every item in the bank', () => {
    for (const item of bank) {
      expect(verify(item, { order: orderOf(item), complete: true }).correct, item.itemId).toBe(
        true,
      );
    }
  });

  it('returns incorrect rather than throwing on a malformed response', () => {
    expect(verify(bank[0]!, { order: ['a', 'b'] })).toEqual({ correct: false });
  });
});

describe('VER-SEQUENCE-01 — constructed story order', () => {
  const bank = loadBank('VER-SEQUENCE-01');
  const referenceOf = (item: RawBankItem) =>
    (item.content as { options: { order: number[] }[] }).options[item.answer.correctKey as number]!
      .order;

  it('accepts the ordering the child built when it is the reference order', () => {
    const item = bank[0]!;
    const verdict = verify(item, { finalOrder: [...referenceOf(item)], moves: 3 });
    expect(verdict.correct).toBe(true);
    expect(verdict.metrics?.['M-POLY']).toBe(1);
  });

  it('replays the reference order of every item in the bank', () => {
    for (const item of bank) {
      const verdict = verify(item, { finalOrder: [...referenceOf(item)] });
      expect(verdict.correct, item.itemId).toBe(true);
      expect(verdict.metrics?.['M-POLY'], item.itemId).toBe(1);
    }
  });

  it('rejects one adjacent swap but keeps most of the pair concordance', () => {
    const item = pick(bank, (i) => referenceOf(i).length >= 4, 'a 4-event story');
    const reference = referenceOf(item);
    const built = [...reference];
    [built[0], built[1]] = [built[1]!, built[0]!];
    const verdict = verify(item, { finalOrder: built });
    expect(verdict.correct).toBe(false);
    const pairs = (reference.length * (reference.length - 1)) / 2;
    expect(verdict.metrics?.['M-POLY']).toBe(Math.round(((pairs - 1) / pairs) * 1e4) / 1e4);
  });

  it('scores a fully reversed story at zero concordance', () => {
    const item = bank[0]!;
    const verdict = verify(item, { finalOrder: [...referenceOf(item)].reverse() });
    expect(verdict.correct).toBe(false);
    expect(verdict.metrics?.['M-POLY']).toBe(0);
  });

  it('reads the reference order through the answer key, not a constant', () => {
    const item = pick(
      bank,
      (i) => (i.content as { options: unknown[] }).options.length >= 2,
      'any item',
    );
    const options = (item.content as { options: { order: number[] }[] }).options;
    const otherIndex = options.findIndex((_, index) => index !== item.answer.correctKey);
    const relabelled = withCorruptedKey(item, { correctKey: otherIndex });
    expect(verify(relabelled, { finalOrder: [...referenceOf(item)] }).correct).toBe(false);
    expect(verify(relabelled, { finalOrder: [...options[otherIndex]!.order] }).correct).toBe(true);
  });

  it('returns incorrect rather than throwing on a malformed response', () => {
    const item = bank[0]!;
    expect(verify(item, { finalOrder: 'nope' })).toEqual({ correct: false });
    expect(verify(item, {})).toEqual({ correct: false });
    // An ordering that drops or repeats an event places no story at all.
    expect(verify(item, { finalOrder: referenceOf(item).slice(1) })).toEqual({ correct: false });
    expect(verify(item, { finalOrder: referenceOf(item).map(() => 0) })).toEqual({
      correct: false,
    });
  });
});
