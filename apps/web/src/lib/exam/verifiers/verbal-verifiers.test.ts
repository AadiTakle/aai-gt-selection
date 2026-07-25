import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { RawBankItem } from '../bank-loader';
import { verify } from './index';

/**
 * Round-trip tests for the seven types owned by `verbal.ts`.
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
      (i) => (i.content as { mode?: string }).mode === mode && (i.answer.expectedSequence as number[]).length >= 4,
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
      (i) => (i.content as { mode?: string }).mode === 'forward' && (i.answer.expectedSequence as number[]).length === 4,
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
    const item = pick(bank, (i) => Object.keys(i.answer.bindings as object).length >= 4, 'setSize >= 4');
    const bindings = item.answer.bindings as Record<string, number>;
    // Reverse the key order: binding credit must be order-free.
    const placements = Object.fromEntries(Object.entries(bindings).reverse());
    const verdict = verify(item, { placements, placementCount: Object.keys(placements).length });
    expect(verdict.correct).toBe(true);
    expect(verdict.metrics?.['M-POLY']).toBe(1);
  });

  it('scores a two-creature swap as partial, not zero', () => {
    const item = pick(bank, (i) => Object.keys(i.answer.bindings as object).length === 4, 'setSize 4');
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
    const item = pick(bank, (i) => Object.keys(i.answer.bindings as object).length === 4, 'setSize 4');
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

describe('WM-gridflash-01 — change detection and array recognition', () => {
  const bank = loadBank('WM-gridflash-01');

  it('scores a change trial on the hit channel only', () => {
    const item = pick(bank, (i) => i.answer.trialType === 'change', 'a change trial');
    const hit = verify(item, { shell: 'two_choice', selectedKey: 'CHANGED' });
    expect(hit.correct).toBe(true);
    expect(hit.metrics).toEqual({ 'M-DPRIME': 1 });

    const miss = verify(item, { shell: 'two_choice', selectedKey: 'SAME' });
    expect(miss.correct).toBe(false);
    expect(miss.metrics).toEqual({ 'M-DPRIME': 0 });
    // A miss must never land on the false-alarm channel: the two are not
    // interchangeable evidence and d-prime needs them apart.
    expect(miss.metrics?.['M-FALSEALARM']).toBeUndefined();
  });

  it('scores a same trial on the false-alarm channel only', () => {
    const item = pick(bank, (i) => i.answer.trialType === 'same', 'a same trial');
    const correctRejection = verify(item, { shell: 'two_choice', selectedKey: 'SAME' });
    expect(correctRejection.correct).toBe(true);
    expect(correctRejection.metrics).toEqual({ 'M-FALSEALARM': 0 });

    const falseAlarm = verify(item, { shell: 'two_choice', selectedKey: 'CHANGED' });
    expect(falseAlarm.correct).toBe(false);
    expect(falseAlarm.metrics).toEqual({ 'M-FALSEALARM': 1 });
    expect(falseAlarm.metrics?.['M-DPRIME']).toBeUndefined();
  });

  it('accepts the exact lit set in the recognition shell', () => {
    const item = pick(bank, (i) => (i.content as { shell?: string }).shell === 'recognition', 'a recognition item');
    const expected = item.answer.expectedCells as number[];
    const verdict = verify(item, {
      shell: 'select_set',
      selectedCells: [...expected].reverse(),
      selectionsRequired: expected.length,
    });
    expect(verdict.correct).toBe(true);
    expect(verdict.metrics?.['M-POLY']).toBe(1);
    expect(verdict.metrics?.['M-DPRIME']).toBe(1);
    expect(verdict.metrics?.['M-FALSEALARM']).toBe(0);
  });

  it('splits hits and false alarms when one lit cell is swapped for a dark one', () => {
    const item = pick(
      bank,
      (i) => (i.content as { shell?: string }).shell === 'recognition' && (i.answer.expectedCells as number[]).length === 4,
      'a recognition item of set size 4',
    );
    const expected = item.answer.expectedCells as number[];
    const grid = (item.content as { grid: { cellCount: number } }).grid;
    const dark = Array.from({ length: grid.cellCount }, (_, cell) => cell).find(
      (cell) => !expected.includes(cell),
    )!;
    const verdict = verify(item, { shell: 'select_set', selectedCells: [...expected.slice(1), dark] });
    expect(verdict.correct).toBe(false);
    expect(verdict.metrics?.['M-POLY']).toBe(0.75);
    expect(verdict.metrics?.['M-DPRIME']).toBe(0.75);
    // One false alarm out of the cellCount - setSize dark cells.
    expect(verdict.metrics?.['M-FALSEALARM']).toBe(
      Math.round((1 / (grid.cellCount - expected.length)) * 1e4) / 1e4,
    );
  });

  it('grades from the flashed array, not from the stored key', () => {
    const item = pick(bank, (i) => i.answer.trialType === 'change', 'a change trial');
    const corrupted = withCorruptedKey(item, { correctKey: 'SAME', trialType: 'same' });
    // The array in `content` still says the probed colour changed, so CHANGED
    // must remain the correct answer.
    expect(verify(corrupted, { shell: 'two_choice', selectedKey: 'CHANGED' }).correct).toBe(true);

    const recognition = pick(bank, (i) => (i.content as { shell?: string }).shell === 'recognition', 'a recognition item');
    const expected = recognition.answer.expectedCells as number[];
    const corruptedSet = withCorruptedKey(recognition, { expectedCells: [99, 98, 97] });
    expect(verify(corruptedSet, { shell: 'select_set', selectedCells: expected }).correct).toBe(true);
  });

  it('rebuilds SAME/CHANGED and the lit set for every item in the bank', () => {
    for (const item of bank) {
      const response =
        (item.content as { shell?: string }).shell === 'recognition'
          ? { shell: 'select_set', selectedCells: item.answer.expectedCells as number[] }
          : { shell: 'two_choice', selectedKey: item.answer.correctKey as string };
      expect(verify(item, response).correct, item.itemId).toBe(true);
    }
  });

  it('returns incorrect rather than throwing on a malformed response', () => {
    expect(verify(bank[0]!, { shell: 'two_choice' })).toEqual({ correct: false });
    expect(verify(bank[0]!, { shell: 'who_knows' })).toEqual({ correct: false });
  });
});

describe('WM-gate-01 — running memory with multiple checkpoints', () => {
  const bank = loadBank('WM-gate-01');

  interface Probe {
    probeIndex: number;
    k: number;
    expectedKeys: string[];
  }
  const probesOf = (item: RawBankItem) => item.answer.probes as Probe[];
  const fullResponse = (item: RawBankItem) => ({
    shell: (item.content as { shell: string }).shell,
    probes: probesOf(item).map((p) => ({
      probeIndex: p.probeIndex,
      keys: [...p.expectedKeys],
      expectedCount: p.expectedKeys.length,
    })),
    probeCount: probesOf(item).length,
  });

  it.each(['creature_lastk', 'keep_track', 'numeric_running'])(
    'accepts every checkpoint answered correctly in the %s shell',
    (shell) => {
      const item = pick(bank, (i) => (i.content as { shell?: string }).shell === shell, `a ${shell} item`);
      const verdict = verify(item, fullResponse(item));
      expect(verdict.correct).toBe(true);
      expect(verdict.metrics?.['M-POLY']).toBe(1);
    },
  );

  it('rejects a stale window on one checkpoint but keeps the units from the others', () => {
    const item = pick(
      bank,
      (i) => (i.content as { shell?: string }).shell === 'creature_lastk' && (i.answer.unitsTotal as number) === 6,
      'a creature_lastk item worth 6 units',
    );
    const response = fullResponse(item);
    // Wipe the first checkpoint entirely; the other two stay correct.
    response.probes[0]!.keys = response.probes[0]!.keys.map(() => 'zz');
    const verdict = verify(item, response);
    expect(verdict.correct).toBe(false);
    const lost = probesOf(item)[0]!.expectedKeys.length;
    expect(verdict.metrics?.['M-POLY']).toBe(Math.round(((6 - lost) / 6) * 1e4) / 1e4);
  });

  it('never awards full credit when a checkpoint is answered short', () => {
    const item = pick(bank, (i) => (probesOf(i)[0]?.expectedKeys.length ?? 0) >= 2, 'a multi-key checkpoint');
    const response = fullResponse(item);
    response.probes[0]!.keys = response.probes[0]!.keys.slice(0, -1);
    expect(verify(item, response).correct).toBe(false);
  });

  it('derives the accuracy-by-k slope from one administration when k varies', () => {
    const item = pick(
      bank,
      (i) => new Set(probesOf(i).map((p) => p.k)).size > 1,
      'an item whose checkpoints use different k',
    );
    const probes = probesOf(item);
    const widest = probes.reduce((a, b) => (b.k > a.k ? b : a));
    const response = fullResponse(item);
    // Fail only the widest window: updating cost should read as negative.
    const failing = response.probes.find((p) => p.probeIndex === widest.probeIndex)!;
    failing.keys = failing.keys.map(() => 'zz');
    const verdict = verify(item, response);
    expect(verdict.correct).toBe(false);
    expect(verdict.metrics?.['M-UPDATECOST']).toBeLessThan(0);

    // With every checkpoint right the slope is flat, not absent.
    expect(verify(item, fullResponse(item)).metrics?.['M-UPDATECOST']).toBe(0);
  });

  it('omits the slope when every checkpoint used the same k', () => {
    const item = pick(
      bank,
      (i) => new Set(probesOf(i).map((p) => p.k)).size === 1,
      'an item with a constant k',
    );
    expect(verify(item, fullResponse(item)).metrics?.['M-UPDATECOST']).toBeUndefined();
  });

  it('grades from the replayed parade, not from the stored checkpoint answers', () => {
    const item = pick(bank, (i) => (i.content as { shell?: string }).shell === 'creature_lastk', 'a creature_lastk item');
    const response = fullResponse(item);
    const corrupted = withCorruptedKey(item, {
      probes: probesOf(item).map((p) => ({ ...p, expectedKeys: p.expectedKeys.map(() => 'zz') })),
    });
    expect(verify(corrupted, response).correct).toBe(true);
  });

  it('replays every parade in the bank to the recorded checkpoint answers', () => {
    for (const item of bank) {
      expect(verify(item, fullResponse(item)).correct, item.itemId).toBe(true);
    }
  });

  it('returns incorrect rather than throwing on a malformed response', () => {
    expect(verify(bank[0]!, { probes: 'nope' })).toEqual({ correct: false });
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
  const streamLength = (item: RawBankItem) => (item.content as { streamLength: number }).streamLength;
  const allPops = (item: RawBankItem) =>
    Object.entries(targetsOf(item)).flatMap(([channel, steps]) =>
      steps.map((stepIndex) => ({ channel, stepIndex, rtMs: 400, via: 'tap' })),
    );

  it.each([1, 2])('accepts a pop on every target and nowhere else (%i channel(s))', (channels) => {
    const item = pick(
      bank,
      (i) => (i.content as { channels: unknown[] }).channels.length === channels,
      `a ${channels}-channel block`,
    );
    const verdict = verify(item, {
      pops: allPops(item),
      stepsShown: streamLength(item),
      completed: true,
    });
    expect(verdict.correct).toBe(true);
    expect(verdict.metrics?.['M-POLY']).toBe(1);
    expect(verdict.metrics?.['M-DPRIME']).toBe(1);
    expect(verdict.metrics?.['M-FALSEALARM']).toBe(0);
  });

  it('splits a miss from a false alarm on separate channels', () => {
    const item = pick(
      bank,
      (i) => (i.content as { channels: unknown[] }).channels.length === 1 && Object.values(targetsOf(i))[0]!.length >= 3,
      'a single-channel block with >= 3 targets',
    );
    const pops = allPops(item);
    const targets = pops.length;

    const missed = verify(item, {
      pops: pops.slice(1),
      stepsShown: streamLength(item),
      completed: true,
    });
    expect(missed.correct).toBe(false);
    expect(missed.metrics?.['M-DPRIME']).toBe(Math.round(((targets - 1) / targets) * 1e4) / 1e4);
    expect(missed.metrics?.['M-FALSEALARM']).toBe(0);

    // A pop on a step that is not a target: perfect hit rate, non-zero bias.
    const n = (item.content as { n: number }).n;
    const claimed = new Set(pops.map((p) => p.stepIndex));
    const foil = Array.from({ length: streamLength(item) }, (_, i) => i).find(
      (i) => i >= n && !claimed.has(i),
    )!;
    const biased = verify(item, {
      pops: [...pops, { channel: pops[0]!.channel, stepIndex: foil, rtMs: 300, via: 'tap' }],
      stepsShown: streamLength(item),
      completed: true,
    });
    expect(biased.correct).toBe(false);
    expect(biased.metrics?.['M-DPRIME']).toBe(1);
    expect(biased.metrics?.['M-FALSEALARM']).toBeGreaterThan(0);
  });

  it('never awards full credit for a block that was cut short', () => {
    const item = pick(bank, (i) => (i.content as { channels: unknown[] }).channels.length === 1, 'any block');
    const verdict = verify(item, {
      pops: allPops(item),
      stepsShown: streamLength(item) - 2,
      completed: false,
    });
    expect(verdict.correct).toBe(false);
  });

  it('re-derives the target steps of every block in the bank', () => {
    for (const item of bank) {
      const verdict = verify(item, {
        pops: allPops(item),
        stepsShown: streamLength(item),
        completed: true,
      });
      expect(verdict.correct, item.itemId).toBe(true);
    }
  });

  it('returns incorrect rather than throwing on a malformed response', () => {
    expect(verify(bank[0]!, { pops: 'nope' })).toEqual({ correct: false });
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
    const wrongEvidence = (item.content as { passage: { sentences: { key: string }[] } }).passage.sentences
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

describe('VER-SENSE-01 — word-card ordering', () => {
  const bank = loadBank('VER-SENSE-01');
  const orderOf = (item: RawBankItem) => String(item.answer.correctKey).split(',').map(Number);

  it('accepts the one ordering that is grammatical and plausible', () => {
    const item = bank[0]!;
    const order = orderOf(item);
    const cards = (item.content as { cards: { text: string }[] }).cards;
    const verdict = verify(item, {
      order,
      sentence: order.map((i) => cards[i]!.text).join(' '),
      complete: true,
    });
    expect(verdict.correct).toBe(true);
    expect(verdict.metrics?.['M-POLY']).toBe(1);
  });

  it('rejects the grammatical-but-absurd lure', () => {
    const item = pick(
      bank,
      (i) =>
        Object.values(i.answer.distractorRationales as Record<string, { lure: string }>).some(
          (r) => r.lure === 'grammatical-but-absurd',
        ),
      'an item with an absurd lure',
    );
    const rationales = item.answer.distractorRationales as Record<string, { lure: string }>;
    const absurdKey = Object.entries(rationales).find(([, r]) => r.lure === 'grammatical-but-absurd')![0];
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
      expect(verify(item, { order: orderOf(item), complete: true }).correct, item.itemId).toBe(true);
    }
  });

  it('returns incorrect rather than throwing on a malformed response', () => {
    expect(verify(bank[0]!, { order: ['a', 'b'] })).toEqual({ correct: false });
  });
});
