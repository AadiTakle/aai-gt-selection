import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { JSDOM, VirtualConsole } from 'jsdom';
import { describe, expect, it } from 'vitest';

import { POST as examSubmit } from '@/app/api/exam-submit/route';

import { toServedItem, type RawBankItem } from './bank-loader';
import { EXAM_TYPE_REGISTRY } from './registry.generated';
import { REVEAL_TYPE_CODES, revealFor } from './reveal';
import { verify } from './verifiers';

import type { NextRequest } from 'next/server';

/**
 * THE POST-COMMIT REVEAL, ACROSS ALL FOUR STAGE 2 LEARNING-BLOCK TYPES.
 *
 * A learning block measures a system the child induces across trials that never repeat
 * (STAGE2_QUESTION_DESIGN §1.2), so the reveal is the ONLY channel by which evidence about that
 * system reaches them: with no reveal the block gives the child nothing to learn from and the
 * construct is not being measured at all. §1.5 then fixes what the reveal may be — the mechanism's
 * next visible state, never a verdict — and that constraint is what this file polices, at the four
 * places it could be broken:
 *
 *  1. the PAYLOAD could differ between a child who was right and one who was wrong;
 *  2. the HOLD could differ, which is the same leak wearing a stopwatch instead of words;
 *  3. the payload could name something the item does not offer, so the mechanism would be shown
 *     resolving to a place the child cannot see and the server does not grade; or
 *  4. the RENDERED reveal could editorialise, which is the failure §1.5 spends its evidence on
 *     (Kluger & DeNisi 1996; van Duijvenvoorde et al. 2008; Deci, Koestner & Ryan 1999).
 *
 * The per-type suites (`stage2-opchain.test.ts`, `stage2-xform.test.ts`) already check that their
 * own renderer draws a reveal. What only a cross-type file can check is the property that has to
 * hold for the SET — that no type's reveal is a correctness channel — so that is what this is.
 *
 * Born-synthetic throughout. Nothing here is evidence that any of these types measures learning:
 * that is Gate B, it needs roughly 128 real children, and it has not run.
 */

const REPO_ROOT = join(process.cwd(), '..', '..');
const BANKS_DIR = join(REPO_ROOT, 'research', 'exam-question-types', 'banks');
const PUBLIC_DEMOS = join(process.cwd(), 'public', 'exam-demos');
const RUNNER_SOURCE = join(process.cwd(), 'src', 'components', 'exam', 'exam-runner.tsx');

/** The Stage 2 learning-block types, which are exactly the types a reveal exists for. */
const STAGE2_TYPES = [
  'FLU-OPCHAIN-01',
  'QUANT-GLYPHNUM-01',
  'SPA-XFORM-01',
  'VER-MORPHO-01',
] as const;

/**
 * The class each renderer puts on the option the mechanism resolved to.
 *
 * Three types mark it `made` because their mechanism MAKES a thing; `QUANT-GLYPHNUM-01` marks it
 * `goes` because its mechanism puts a thing somewhere. Neither word evaluates the child, which is
 * the property that matters and the reason this table is a per-type detail rather than a rule.
 */
const REVEAL_MARK: Record<string, string> = {
  'FLU-OPCHAIN-01': 'made',
  'QUANT-GLYPHNUM-01': 'goes',
  'SPA-XFORM-01': 'made',
  'VER-MORPHO-01': 'made',
};

/** Evaluative language and reward furniture, none of which may reach a child (§1.5). */
const FORBIDDEN_WORDS = [
  'Correct',
  'correct',
  'Wrong',
  'wrong',
  'Not quite',
  'Well done',
  'Great',
  'Nice',
  'score',
  'Score',
  'streak',
  'Streak',
  'points',
  'Points',
];

interface Option {
  key: string;
  ratio?: number;
}

function readBank(typeCode: string): RawBankItem[] {
  return readFileSync(join(BANKS_DIR, `${typeCode}.jsonl`), 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as RawBankItem);
}

const BANKS = new Map(STAGE2_TYPES.map((typeCode) => [typeCode, readBank(typeCode)]));

function optionsOf(item: RawBankItem): Option[] {
  return (item.content as { options?: Option[] }).options ?? [];
}

/** Items spread evenly along the difficulty ladder, so a sample is never all easy items. */
function sample(items: RawBankItem[], count: number): RawBankItem[] {
  const sorted = [...items].sort((a, b) => a.difficulty - b.difficulty);
  return Array.from(
    { length: count },
    (_, i) => sorted[Math.round((i * (sorted.length - 1)) / (count - 1))]!,
  );
}

/**
 * The raw response the type's renderer would post for one option.
 *
 * `QUANT-GLYPHNUM-01` is graded on where the child placed, not on which plate they tapped
 * (`scoring.rule = 'placement_tolerance'`), so its renderer posts the tapped plate's ratio. Sending
 * only `selectedKey` for it would make every submission below score wrong and the right/wrong
 * contrast this file rests on would be vacuous.
 */
function responseFor(item: RawBankItem, option: Option): Record<string, unknown> {
  return option.ratio === undefined
    ? { selectedKey: option.key }
    : { selectedKey: option.key, placedRatio: option.ratio };
}

interface SubmitBody {
  correct: boolean;
  reveal?: { machineOutput: string };
}

/** Drive the real route handler, as the runner does, minus the HTTP hop. */
async function submit(
  item: RawBankItem,
  response: unknown,
  skipped = false,
): Promise<{ body: SubmitBody; revealJson: string }> {
  const request = new Request('http://localhost/api/exam-submit', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ itemId: item.itemId, response, skipped }),
  }) as unknown as NextRequest;
  const body = (await (await examSubmit(request)).json()) as SubmitBody;
  // Serialised, not just deep-equal: a difference in field ORDER or in length would be a channel
  // too, and `toEqual` cannot see either.
  return { body, revealJson: JSON.stringify(body.reveal ?? null) };
}

/* ================================================================== *
 * 1. The reveal set, and what a payload is allowed to be
 * ================================================================== */

describe('the reveal set', () => {
  it('covers every Stage 2 learning-block type and nothing else', () => {
    expect([...REVEAL_TYPE_CODES].sort()).toEqual([...STAGE2_TYPES].sort());
    for (const entry of EXAM_TYPE_REGISTRY) {
      if (REVEAL_TYPE_CODES.includes(entry.typeCode)) continue;
      const item = { typeCode: entry.typeCode, answer: { correctKey: 'A' } } as RawBankItem;
      expect(revealFor(item), `${entry.typeCode} produced a reveal`).toBeNull();
    }
  });

  it('names an option the item actually put in front of the child, on every item of every bank', () => {
    for (const typeCode of STAGE2_TYPES) {
      for (const item of BANKS.get(typeCode)!) {
        const reveal = revealFor(item);
        expect(reveal, `${item.itemId}: no reveal`).not.toBeNull();
        const keys = optionsOf(item).map((option) => option.key);
        expect(keys, `${item.itemId}: reveal names an option that is not on screen`).toContain(
          reveal!.machineOutput,
        );
      }
    }
  });

  it('carries one field and no vocabulary that could read as a judgement', () => {
    for (const typeCode of STAGE2_TYPES) {
      const reveal = revealFor(BANKS.get(typeCode)![0]!);
      expect(Object.keys(reveal!)).toEqual(['machineOutput']);
      expect(typeof reveal!.machineOutput).toBe('string');
      expect(reveal!.machineOutput.length).toBeGreaterThan(0);
      expect(JSON.stringify(reveal)).not.toMatch(/correct|wrong|right|score|verdict/i);
    }
  });

  /**
   * `QUANT-GLYPHNUM-01` is the one type whose reveal could point somewhere the server does not
   * grade, because it grades on a placement tolerance rather than on the stored key. The reveal
   * moves the pin to the marked plate, so if the graded band ever fell on a different plate the
   * child would watch the machine put its writing somewhere that scores wrong.
   */
  it('points QUANT-GLYPHNUM-01 at the one plate the shipped verifier scores correct', () => {
    for (const item of BANKS.get('QUANT-GLYPHNUM-01')!) {
      const graded = optionsOf(item).filter(
        (option) => verify(item, { placedRatio: option.ratio }).correct,
      );
      expect(
        graded.map((option) => option.key),
        `${item.itemId}: graded plates`,
      ).toEqual([revealFor(item)!.machineOutput]);
    }
  });
});

/* ================================================================== *
 * 2. No correctness signal, through the route that actually sends it
 * ================================================================== */

describe('the reveal carries no correctness signal', () => {
  it('is byte-identical whichever option the child committed to', async () => {
    for (const typeCode of STAGE2_TYPES) {
      for (const item of sample(BANKS.get(typeCode)!, 3)) {
        const options = optionsOf(item);
        const key = String(item.answer.correctKey);
        const seen = new Set<string>();
        const outcomes = new Set<boolean>();

        for (const option of options) {
          const { body, revealJson } = await submit(item, responseFor(item, option));
          seen.add(revealJson);
          outcomes.add(body.correct);
          expect(body.correct, `${item.itemId}/${option.key}: graded against the key`).toBe(
            option.key === key,
          );
        }

        // Without this the equality above would be vacuous: it says the submissions really did
        // produce different outcomes, so an identical reveal across them means something.
        expect(outcomes, `${item.itemId}: every option graded the same`).toEqual(
          new Set([true, false]),
        );
        expect(
          [...seen],
          `${item.itemId}: the reveal differed between a right and a wrong answer`,
        ).toEqual([JSON.stringify({ machineOutput: key })]);
      }
    }
  });

  it('is unchanged by a response the renderer could never have produced', async () => {
    for (const typeCode of STAGE2_TYPES) {
      const item = BANKS.get(typeCode)![0]!;
      const expected = JSON.stringify(revealFor(item));
      // Empty, mistyped, and naming an option that does not exist: all wrong, none of them a
      // reason for the mechanism to resolve differently.
      for (const response of [{}, { selectedKey: 42 }, { selectedKey: 'ZZ' }, null, 'B']) {
        const { body, revealJson } = await submit(item, response);
        expect(body.correct, `${typeCode}: a malformed response scored correct`).toBe(false);
        expect(revealJson, `${typeCode}: a malformed response moved the reveal`).toBe(expected);
      }
    }
  });

  it('is withheld entirely from a skipped trial, whatever the response held', async () => {
    for (const typeCode of STAGE2_TYPES) {
      const item = BANKS.get(typeCode)![0]!;
      const key = String(item.answer.correctKey);
      const right = optionsOf(item).find((option) => option.key === key)!;
      // A skip is not a retrieval attempt, so revealing anyway would turn skipping into a free
      // look at the system (Roediger & Karpicke 2006) — including the skip that arrives with the
      // right option already in the payload.
      for (const response of [{}, responseFor(item, right)]) {
        const { body } = await submit(item, response, true);
        expect(body.correct).toBe(false);
        expect(Object.hasOwn(body, 'reveal'), `${typeCode}: a skip was given a reveal`).toBe(false);
      }
    }
  });
});

/* ================================================================== *
 * 3. The hold, which is the other way an outcome could travel
 * ================================================================== */

describe('the hold the runner applies is outcome-independent', () => {
  const runner = readFileSync(RUNNER_SOURCE, 'utf8');

  /**
   * The reveal dispatch, lifted out of the runner by shape rather than by line number: the
   * `const reveal = ...` binding, then the one `if` block that follows it, matched to its own
   * closing brace at the same indentation.
   */
  const dispatch = /const reveal =[\s\S]*?\n(\s*)if \(([^)]*)\) \{([\s\S]*?)\n\1\}/.exec(runner);

  it('holds for one fixed constant, declared once and used once', () => {
    const declarations = [...runner.matchAll(/const (REVEAL_[A-Z_]*_MS) = (\d+);/g)];
    expect(declarations.map((match) => match[1])).toEqual(['REVEAL_HOLD_MS']);
    expect(Number(declarations[0]![2])).toBeGreaterThan(0);
    // Twice in the whole file: the declaration, and the single await that applies it. A second use
    // is how a correct-only or wrong-only hold would get in.
    expect([...runner.matchAll(/REVEAL_HOLD_MS/g)].length).toBe(2);
  });

  it('gates the hold on the reveal and the skip, never on the outcome', () => {
    expect(dispatch, 'the reveal dispatch is no longer recognisable in the runner').not.toBeNull();
    const condition = dispatch![2]!;
    const body = dispatch![3]!;

    expect(condition).toContain('reveal');
    expect(condition).toContain('skipped');
    expect(condition, 'the reveal is sent conditionally on the outcome').not.toMatch(
      /\bcorrect\b|\bscore\b|\bverdict\b/,
    );

    expect(body).toContain('REVEAL_HOLD_MS');
    // No branch of any kind inside the block: no ternary, no second `if`, nothing that could make
    // one child wait longer than another. Optional chaining is spelled with the same character as
    // a ternary and is not one, so it comes out first.
    expect(body.replace(/\?\./g, '.'), 'the hold body branches').not.toMatch(/\?|\bif\b|\belse\b/);
    expect(body).not.toMatch(/\bcorrect\b|\bscore\b/);
  });
});

/* ================================================================== *
 * 4. What the child sees, driven through the real embedding protocol
 * ================================================================== */

interface DemoHarness {
  document: Document;
  events: string[];
  status: () => string;
  revealTag: () => string | null;
  visibleText: () => string;
  send: (message: Record<string, unknown>) => void;
  click: (el: Element) => void;
  options: () => Element[];
  errors: string[];
  close: () => void;
}

function openDemo(typeCode: string): DemoHarness {
  const events: string[] = [];
  const errors: string[] = [];
  const hostWindow = {
    postMessage: (message: unknown) => {
      const event = (message as { event?: { kind?: string } }).event;
      if (event?.kind) events.push(event.kind);
    },
  };
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (error: Error) => errors.push(error.message.split('\n')[0]!));

  const dom = new JSDOM(readFileSync(join(PUBLIC_DEMOS, `${typeCode}.html`), 'utf8'), {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole,
    url: `http://localhost/exam-demos/${typeCode}.html`,
    beforeParse(window) {
      Object.defineProperty(window, 'parent', { configurable: true, get: () => hostWindow });
      (window as unknown as { fetch: unknown }).fetch = () =>
        Promise.reject(new Error('network blocked in test'));
      const element = window.Element.prototype as unknown as Record<string, unknown>;
      element.animate = () => ({ finished: Promise.resolve(), cancel: () => undefined });
      element.scrollIntoView = () => undefined;
    },
  });

  const win = dom.window;
  return {
    document: win.document,
    events,
    errors,
    status: () => win.document.querySelector('#status')?.textContent ?? '',
    revealTag: () =>
      win.document.querySelector(`#options .opt.${REVEAL_MARK[typeCode]!} .tag`)?.textContent ??
      null,
    visibleText: () => {
      const body = win.document.body.cloneNode(true) as HTMLElement;
      for (const el of body.querySelectorAll('script,style')) el.remove();
      return body.textContent ?? '';
    },
    send: (message) => {
      const event = new win.MessageEvent('message', {
        data: { source: 'gt-exam-host', ...message },
        origin: 'http://localhost',
      });
      Object.defineProperty(event, 'source', { value: hostWindow });
      win.dispatchEvent(event);
    },
    click: (el) => {
      el.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true }));
    },
    options: () => [...win.document.querySelectorAll('#options .opt')],
    close: () => {
      win.close();
    },
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Answer one item with `chosenIndex`, then hand the demo a reveal naming `revealedKey`, and report
 * everything the reveal put on screen.
 */
async function playOneTrial(
  typeCode: string,
  item: RawBankItem,
  chosenIndex: number,
  revealedKey: string,
): Promise<{ status: string; tag: string | null; reveals: number; text: string }> {
  const demo = openDemo(typeCode);
  try {
    await sleep(120);
    demo.send({ type: 'init', item: toServedItem(item) });
    demo.send({ type: 'start' });
    await sleep(60);
    demo.click(demo.document.querySelector('#play')!);
    await sleep(60);
    demo.click(demo.options()[chosenIndex]!);
    await sleep(60);

    demo.send({ type: 'reveal', reveal: { machineOutput: revealedKey } });
    await sleep(60);

    expect(demo.errors, `${typeCode}: the renderer threw`).toEqual([]);
    return {
      status: demo.status(),
      tag: demo.revealTag(),
      reveals: demo.events.filter((kind) => kind === 'reveal_shown').length,
      text: demo.visibleText(),
    };
  } finally {
    demo.close();
  }
}

describe('the rendered reveal says the same thing to a child who was right and one who was wrong', () => {
  for (const typeCode of STAGE2_TYPES) {
    it(`is identical either way in ${typeCode}`, async () => {
      const item = BANKS.get(typeCode)!.find(
        (candidate) => optionsOf(candidate)[0]!.key !== String(candidate.answer.correctKey),
      )!;
      const key = String(item.answer.correctKey);
      const keyIndex = optionsOf(item).findIndex((option) => option.key === key);

      // The same item and the same reveal, answered right and answered wrong. The reveal names the
      // mechanism's output both times, because that is what it names — it is not told which
      // happened, and there is no request in which it could be.
      const wrong = await playOneTrial(typeCode, item, 0, key);
      const right = await playOneTrial(typeCode, item, keyIndex, key);

      expect(right.status, 'the status line differs by outcome').toBe(wrong.status);
      expect(right.tag, 'the mark on the machine\u2019s option differs by outcome').toBe(wrong.tag);
      expect(right.reveals).toBe(1);
      expect(wrong.reveals).toBe(1);
      expect(right.status.length).toBeGreaterThan(0);

      for (const word of FORBIDDEN_WORDS) {
        expect(wrong.text.includes(word), `${typeCode} says "${word}" to the child`).toBe(false);
        expect(right.text.includes(word), `${typeCode} says "${word}" to the child`).toBe(false);
      }
      for (const text of [wrong.text, right.text])
        expect(text).not.toMatch(/[\u2713\u2717\u2715\u2605]/u);
    }, 20_000);
  }

  /**
   * `VER-MORPHO-01` is the one type whose reveal copy varies, because its items run both ways
   * round and one sentence cannot describe both. Direction is fixed in the bank before the child
   * answers, so it is a legitimate thing to branch on — but only if it is the ONLY thing, which is
   * what this checks.
   */
  it('varies VER-MORPHO-01 by the item\u2019s direction and by nothing else', async () => {
    const byDirection = new Map<string, RawBankItem>();
    for (const item of BANKS.get('VER-MORPHO-01')!) {
      const direction = String((item.content as { direction?: unknown }).direction);
      if (!byDirection.has(direction) && optionsOf(item)[0]!.key !== String(item.answer.correctKey))
        byDirection.set(direction, item);
    }
    expect([...byDirection.keys()].sort()).toEqual(['pictureToWord', 'wordToPicture']);

    const said = new Map<string, string>();
    for (const [direction, item] of byDirection) {
      const key = String(item.answer.correctKey);
      const keyIndex = optionsOf(item).findIndex((option) => option.key === key);
      const wrong = await playOneTrial('VER-MORPHO-01', item, 0, key);
      const right = await playOneTrial('VER-MORPHO-01', item, keyIndex, key);
      expect(right.status, `${direction}: the status line differs by outcome`).toBe(wrong.status);
      expect(right.tag, `${direction}: the mark differs by outcome`).toBe(wrong.tag);
      said.set(direction, wrong.status);
    }

    // Both directions say something, and they do not say the same thing: a picture the word means
    // and a word the picture is called are different observations of the same system.
    expect(said.get('wordToPicture')).not.toBe(said.get('pictureToWord'));
    for (const status of said.values()) expect(status.length).toBeGreaterThan(0);
  }, 20_000);
});
