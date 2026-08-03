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
 * construct is not being measured at all.
 *
 * WHERE THE BOUNDARY NOW SITS. §1.5 originally fixed the reveal as outcome-free — the mechanism's
 * next visible state and nothing else, identical for every child. STAGE2_REDESIGN_SPEC §4.3 changed
 * that deliberately (D-209): the trial is REVIEWABLE, showing what the machine produced and what the
 * child answered, and those two facts cannot both be shown without the picture differing by outcome.
 * What did not change is the reason §1.5 existed. Feedback that points at the child is the failure
 * its evidence is about (Kluger & DeNisi 1996; van Duijvenvoorde et al. 2008; Deci, Koestner & Ryan
 * 1999), so the line moved from "say nothing about the outcome" to "say nothing about the child": no
 * verdict word, no tally, no reward furniture, and no channel that carries the outcome anywhere
 * except into the two marks the child reads for themselves.
 *
 * The five places that could break, and the five sections below:
 *
 *  1. the PAYLOAD could name something the item does not offer, so the mechanism would be shown
 *     resolving to a place the child cannot see and the server does not grade;
 *  2. the payload could differ between a child who was right and one who was wrong — it still must
 *     not, because the browser has no business being told;
 *  3. WHAT ENDS THE TRIAL could depend on the outcome, which is the same leak wearing a stopwatch
 *     instead of words — and in Stage 2 it must now be the child and nothing else (§4.2);
 *  4. the RENDERED trial could editorialise, or keep score; or
 *  5. the two marks could be told apart by COLOUR ALONE, or at a contrast a child cannot read.
 *
 * TWO RESPONSE SHAPES, ONE SET OF PROPERTIES. Three of the four types answer by choosing one of
 * several options on screen. `QUANT-GLYPHNUM-01` does not: since D-211 it is a slider, so the child
 * answers with a POSITION on a number line and the mechanism resolves to a position too. Every
 * property this file polices is a property of the SET and has to hold for both shapes, so the harness
 * reads each renderer in its own currency and reports one common structure — a list of marked PLACES,
 * where a place is an option tile for three types and a point on the line for the fourth. Nothing is
 * skipped for the placement type and no assertion is loosened to accommodate it; see `marksOf`.
 *
 * The per-type suites (`stage2-opchain.test.ts`, `stage2-xform.test.ts`) already check that their
 * own renderer draws a reveal. What only a cross-type file can check is the property that has to
 * hold for the SET — that no type's reveal evaluates the child — so that is what this is.
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

/** The one type whose response is a placement on a line rather than a choice among options. */
const PLACEMENT_TYPE = 'QUANT-GLYPHNUM-01';

/**
 * The role name each renderer puts on the place the mechanism resolved to.
 *
 * Three types mark it `made` because their mechanism MAKES a thing; `QUANT-GLYPHNUM-01` marks it
 * `goes` because its mechanism puts a thing somewhere. Neither word evaluates the child, which is
 * the property that matters and the reason this table is a per-type detail rather than a rule.
 *
 * The child's own answer is marked `chose` in all four, which is why that one is a constant.
 */
const REVEAL_MARK: Record<string, string> = {
  'FLU-OPCHAIN-01': 'made',
  'QUANT-GLYPHNUM-01': 'goes',
  'SPA-XFORM-01': 'made',
  'VER-MORPHO-01': 'made',
};

const CHILD_MARK = 'chose';

/** Evaluative language and reward furniture, none of which may reach a child (§1.5). */
const FORBIDDEN_WORDS = [
  'Correct',
  'correct',
  'Wrong',
  'wrong',
  'Incorrect',
  'incorrect',
  'Not quite',
  'Well done',
  'Great',
  'Nice',
  'Perfect',
  'perfect',
  'Try again',
  'mistake',
  'Mistake',
  'score',
  'Score',
  'streak',
  'Streak',
  'points',
  'Points',
];

/**
 * A running tally, in the forms it could take.
 *
 * Separate from the word list because a tally need not be a word: "3/5" and "2 in a row" are both
 * scores, and both are the accumulating comparison §4.3 forbids independently of whether any
 * sentence evaluates the child.
 */
const TALLY_PATTERNS = [
  /\b\d+\s*\/\s*\d+\b/,
  /\b\d+\s+(?:of|out of)\s+\d+\b/i,
  /\b(?:so far|in a row|running total|total so far)\b/i,
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

/** The graded band of a placement item, which is server-only and never leaves this process. */
function placementAnswer(item: RawBankItem): { targetRatio: number; tolerance: number } {
  return item.answer as unknown as { targetRatio: number; tolerance: number };
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
 * One committable answer, in whichever currency the type takes, plus whether it is the one the
 * mechanism resolved to.
 *
 * This is what lets a cross-type file ask the same question of a choice and a placement: "answer it
 * right, answer it wrong, and check the reveal did not move". `at` is where the harness has to act —
 * an option index for three types, a ratio of the line for the fourth.
 *
 * `QUANT-GLYPHNUM-01` is graded on where the child placed rather than on a stored key
 * (`scoring.rule = 'placement_tolerance'`), and the three option types that also carry a ratio have
 * it sent alongside the key. Sending only `selectedKey` for a placement would make every submission
 * below score wrong and the right/wrong contrast this file rests on would be vacuous.
 */
interface Candidate {
  readonly label: string;
  readonly at: number;
  readonly response: Record<string, unknown>;
  readonly right: boolean;
}

function candidatesFor(item: RawBankItem): Candidate[] {
  if (item.typeCode === PLACEMENT_TYPE) {
    const { targetRatio, tolerance } = placementAnswer(item);
    // Dead on, and a placement four tolerances away on whichever side has room. A slider has no
    // enumerable wrong answers, so two suffice: what matters is that one grades right and one wrong.
    const away = targetRatio > 0.5 ? targetRatio - 4 * tolerance : targetRatio + 4 * tolerance;
    return [
      { label: 'off', at: away, response: { placedRatio: away }, right: false },
      { label: 'on', at: targetRatio, response: { placedRatio: targetRatio }, right: true },
    ];
  }
  const key = String(item.answer.correctKey);
  return optionsOf(item).map((option, index) => ({
    label: option.key,
    at: index,
    response:
      option.ratio === undefined
        ? { selectedKey: option.key }
        : { selectedKey: option.key, placedRatio: option.ratio },
    right: option.key === key,
  }));
}

interface SubmitBody {
  correct: boolean;
  reveal?: { machineOutput?: string; machinePlacement?: number };
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

  it('names a place the item actually put in front of the child, on every item of every bank', () => {
    for (const typeCode of STAGE2_TYPES) {
      for (const item of BANKS.get(typeCode)!) {
        const reveal = revealFor(item);
        expect(reveal, `${item.itemId}: no reveal`).not.toBeNull();
        if (typeCode === PLACEMENT_TYPE) {
          // A position on the line the child was already looking at. Not a quantity: the line's
          // numeric maximum stays server-only, so a ratio without it says only "this far along".
          const placement = (reveal as { machinePlacement: number }).machinePlacement;
          expect(placement, `${item.itemId}: reveal is off the line`).toBeGreaterThanOrEqual(0);
          expect(placement, `${item.itemId}: reveal is off the line`).toBeLessThanOrEqual(1);
          continue;
        }
        const keys = optionsOf(item).map((option) => option.key);
        expect(keys, `${item.itemId}: reveal names an option that is not on screen`).toContain(
          (reveal as { machineOutput: string }).machineOutput,
        );
      }
    }
  });

  it('carries one field and no vocabulary that could read as a judgement', () => {
    for (const typeCode of STAGE2_TYPES) {
      const reveal = revealFor(BANKS.get(typeCode)![0]!)!;
      // One field, whichever currency it is in. A reveal carrying both would be a reveal carrying
      // something other than the mechanism's own outcome.
      if (typeCode === PLACEMENT_TYPE) {
        expect(Object.keys(reveal)).toEqual(['machinePlacement']);
        expect(typeof (reveal as { machinePlacement: number }).machinePlacement).toBe('number');
      } else {
        expect(Object.keys(reveal)).toEqual(['machineOutput']);
        const output = (reveal as { machineOutput: string }).machineOutput;
        expect(typeof output).toBe('string');
        expect(output.length).toBeGreaterThan(0);
      }
      expect(JSON.stringify(reveal)).not.toMatch(/correct|wrong|right|score|verdict/i);
    }
  });

  /**
   * `QUANT-GLYPHNUM-01` is the one type whose reveal could point somewhere the server does not
   * grade, because it grades on a placement tolerance rather than on the stored key. The reveal
   * moves the pin to a position, so if that position ever fell outside the graded band the child
   * would watch the machine put its writing somewhere that scores wrong.
   *
   * And it must disclose the position ONLY. Revealing the band as well would hand a client the
   * grading threshold, which is the one field on this type that is genuinely key material.
   */
  it('points QUANT-GLYPHNUM-01 at a position the shipped verifier scores correct, and at no band', () => {
    for (const item of BANKS.get(PLACEMENT_TYPE)!) {
      const reveal = revealFor(item) as { machinePlacement: number };
      expect(
        verify(item, { placedRatio: reveal.machinePlacement }).correct,
        `${item.itemId}: the revealed position does not grade correct`,
      ).toBe(true);
      // A placement a hair past the band must still be wrong, so the reveal cannot be read as
      // "anything from here on is fine".
      const { tolerance } = placementAnswer(item);
      expect(
        verify(item, { placedRatio: reveal.machinePlacement + tolerance * 1.5 }).correct,
        `${item.itemId}: the band is wider than the item declares`,
      ).toBe(false);
      expect(JSON.stringify(reveal)).not.toContain(String(tolerance));
    }
  });
});

/* ================================================================== *
 * 2. No correctness signal, through the route that actually sends it
 * ================================================================== */

describe('the reveal carries no correctness signal', () => {
  it('is byte-identical whichever answer the child committed to', async () => {
    for (const typeCode of STAGE2_TYPES) {
      for (const item of sample(BANKS.get(typeCode)!, 3)) {
        const seen = new Set<string>();
        const outcomes = new Set<boolean>();

        for (const candidate of candidatesFor(item)) {
          const { body, revealJson } = await submit(item, candidate.response);
          seen.add(revealJson);
          outcomes.add(body.correct);
          expect(body.correct, `${item.itemId}/${candidate.label}: graded as expected`).toBe(
            candidate.right,
          );
        }

        // Without this the equality below would be vacuous: it says the submissions really did
        // produce different outcomes, so an identical reveal across them means something.
        expect(outcomes, `${item.itemId}: every answer graded the same`).toEqual(
          new Set([true, false]),
        );
        expect(
          [...seen],
          `${item.itemId}: the reveal differed between a right and a wrong answer`,
        ).toEqual([JSON.stringify(revealFor(item))]);
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
      const right = candidatesFor(item).find((candidate) => candidate.right)!;
      // A skip is not a retrieval attempt, so revealing anyway would turn skipping into a free
      // look at the system (Roediger & Karpicke 2006) — including the skip that arrives with the
      // right answer already in the payload.
      for (const response of [{}, right.response]) {
        const { body } = await submit(item, response, true);
        expect(body.correct).toBe(false);
        expect(Object.hasOwn(body, 'reveal'), `${typeCode}: a skip was given a reveal`).toBe(false);
      }
    }
  });
});

/* ================================================================== *
 * 3. What ends a trial: the child in Stage 2, a fixed hold in Phase 1
 * ================================================================== */

/**
 * REPLACES the suite that policed a single outcome-independent hold.
 *
 * That suite asserted `REVEAL_HOLD_MS` was the one thing that ended every revealed trial, and it
 * required the hold body to contain no branch at all. Stage 2 no longer has a hold: the trial stays
 * up until the child presses Next (STAGE2_REDESIGN_SPEC §4.2, D-209), so a branch now exists and
 * has to. What the old suite was actually protecting is preserved and made explicit — the branch is
 * on the PHASE and never on the OUTCOME, so no child waits longer or shorter for having been right.
 *
 * Phase 1 is unchanged and is still checked here, because the four reveal types are in the Phase 1
 * registry too and a bracketing search is not a block to be sat with.
 */
describe('what ends a revealed trial', () => {
  const runner = readFileSync(RUNNER_SOURCE, 'utf8');

  /**
   * The reveal dispatch, lifted out of the runner by shape rather than by line number: the
   * `const reveal = ...` binding, then the one `if` block that follows it, matched to its own
   * closing brace at the same indentation.
   */
  const dispatch = /const reveal =[\s\S]*?\n(\s*)if \(([^)]*)\) \{([\s\S]*?)\n\1\}/.exec(runner);

  it('keeps Phase 1 on one fixed constant, declared once and used once', () => {
    const declarations = [...runner.matchAll(/const (REVEAL_[A-Z_]*_MS) = (\d+);/g)];
    expect(declarations.map((match) => match[1])).toEqual(['REVEAL_HOLD_MS']);
    expect(Number(declarations[0]![2])).toBeGreaterThan(0);
    // Twice in the whole file: the declaration, and the single await that applies it. A second use
    // is how a correct-only or wrong-only hold would get in.
    expect([...runner.matchAll(/REVEAL_HOLD_MS/g)].length).toBe(2);
  });

  it('sends the reveal on the commit and the type, never on the outcome', () => {
    expect(dispatch, 'the reveal dispatch is no longer recognisable in the runner').not.toBeNull();
    const condition = dispatch![2]!;
    expect(condition).toContain('reveal');
    expect(condition).toContain('skipped');
    expect(condition, 'the reveal is sent conditionally on the outcome').not.toMatch(
      /\bcorrect\b|\bscore\b|\bverdict\b/,
    );
  });

  it('branches only on the phase, and gives Stage 2 no timer at all', () => {
    const body = dispatch![3]!;

    // Exactly two arms, and the discriminator is which phase is running.
    expect(body, 'the Stage 2 arm no longer waits for the child').toContain('inBlockRef.current');
    expect(body).toContain('waitForChildToContinue');
    expect(body, 'Phase 1 lost its fixed hold').toContain('REVEAL_HOLD_MS');

    // The outcome is not readable in either arm. This is the assertion the replaced suite existed
    // for, and it is the one that still has to hold: a trial's length may depend on the phase and
    // on the child, never on whether they were right.
    expect(body, 'the advance reads the outcome').not.toMatch(/\bcorrect\b|\bscore\b|\bverdict\b/);

    // One timer in the whole dispatch, and it is Phase 1's. A second is how a Stage 2 auto-advance
    // would creep back in beside the Next control.
    expect([...body.matchAll(/setTimeout|setInterval/g)].length).toBe(1);
    expect(body).toMatch(/setTimeout\(resolve, REVEAL_HOLD_MS\)/);
  });

  it('routes every Stage 2 advance through the gate, and releases it from Next or auto-run only', () => {
    // The gate is opened in one place and released through one ref, so the call sites can be
    // counted. Three: the ref's own declaration, the closure that owns it, and the two callers.
    expect(runner).toMatch(/const gate = openReviewGate\(item, \{ emulated \}\);/);
    expect(runner).toMatch(/return gate\.settled;/);

    const releases = [...runner.matchAll(/releaseReviewRef\.current\?\.\(\)/g)];
    expect(releases.length, 'an unaccounted-for release path exists').toBe(2);
    // One is the child's control; the other is the researcher's emulator, which has no child to
    // press it. Nothing else may end a trial.
    expect(runner).toMatch(/onClick=\{\(\) => releaseReviewRef\.current\?\.\(\)\}/);
    expect(runner).toMatch(/if \(autoRun && review\) releaseReviewRef\.current\?\.\(\);/);
  });

  it('says nothing about the child in the host chrome either', () => {
    // The Next control and its caption live OUTSIDE the iframe, so the rendered-demo scan in the
    // next section cannot see them. They are the one child-facing surface a revealed trial adds.
    const bar = /<div className=\{styles\.reviewBar\}>([\s\S]*?)<\/div>/.exec(runner);
    expect(bar, 'the review bar is no longer recognisable in the runner').not.toBeNull();
    const copy = bar![1]!;
    for (const word of FORBIDDEN_WORDS) {
      expect(copy.includes(word), `the review bar says "${word}" to the child`).toBe(false);
    }
    for (const pattern of TALLY_PATTERNS) {
      expect(copy, `the review bar keeps a tally (${String(pattern)})`).not.toMatch(pattern);
    }
    // No digit at all in the caption, which is the cheapest way to be sure there is no count in it.
    expect(copy.replace(/className=\{[^}]*\}/g, '')).not.toMatch(/\d/);
  });

  it('records time-to-next through the ledger and nowhere else', () => {
    // The runner imports the gate and the reset, and NOT the ledger readers: a component that could
    // read the figure back is a component that could render or forward it.
    const imports = /import \{([^}]*)\} from '@\/lib\/exam\/review-dwell';/.exec(runner);
    expect(imports, 'the runner no longer uses the review-dwell module').not.toBeNull();
    expect(
      imports![1]!
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean)
        .sort(),
    ).toEqual(['openReviewGate', 'resetReviewDwell']);

    // The block trial the fit reads is still the two fields it has always been. A dwell field here
    // is the single edit that would put time-to-next inside the estimate.
    expect(runner).toMatch(/blockTrialsRef\.current, \{ difficulty, score \}\]/);
    expect(runner, 'a timing field reached the block trial').not.toMatch(
      /\{ difficulty, score, [^}]*ms/,
    );
  });
});

/* ------------------------------------------------------------------ *
 * The embedding harness: a real demo document, driven over the real protocol
 * ------------------------------------------------------------------ */

/**
 * One PLACE the child could be shown something about, and whichever review marks it carries.
 *
 * A place is an option tile for the three choice types and a point on the line for the placement
 * type, and `where` identifies it: the tile's key, or the position as a percentage of the line. That
 * substitution is the whole of what the placement type needs, and it is why the section-4 assertions
 * below are written once rather than twice — "two places marked when the child answered differently
 * from the machine, one when they answered the same" is the same sentence in both currencies.
 */
interface PlaceMarks {
  where: string;
  /** Text of the `you chose` mark, or null when this place is not the child's answer. */
  chose: string | null;
  /** Text of the machine's mark, or null when the mechanism did not resolve here. */
  machine: string | null;
}

interface DemoHarness {
  document: Document;
  events: string[];
  status: () => string;
  marks: () => PlaceMarks[];
  visibleText: () => string;
  send: (message: Record<string, unknown>) => void;
  click: (el: Element) => void;
  options: () => Element[];
  /** Put the placement type's handle at a ratio of the line. Unused by the three choice types. */
  place: (ratio: number) => void;
  errors: string[];
  close: () => void;
}

/**
 * Read the two review marks off a rendered trial, in whichever shape the renderer draws them.
 *
 * The three choice types mark option tiles, so each tile is a place and both roles are read from the
 * tags it carries. The placement type marks two boxes at two positions on the line — the handle the
 * child left behind and the pin the machine's writing landed on — so the position is the place, and
 * marks at the SAME position are folded into one entry exactly as two roles on one tile are. Folding
 * is what makes the coincident case testable in both currencies rather than only in one.
 *
 * Positions are compared at the resolution the slider actually offers (0.1% of the line, its own
 * step), because that is the finest distinction the child can make and therefore the only one at
 * which "the child placed it where the writing belongs" is a fact about the child rather than about
 * floating point. The revealed ratio is unquantised and the handle is on the step grid, so a child
 * who places dead on the target lands on the same step by construction.
 */
function marksOf(document: Document, typeCode: string): PlaceMarks[] {
  const machineMark = REVEAL_MARK[typeCode]!;
  const tagText = (host: Element | null, role: string): string | null =>
    host?.querySelector(`.tag[data-mark="${role}"]`)?.textContent ?? null;

  if (typeCode !== PLACEMENT_TYPE) {
    return [...document.querySelectorAll('#options .opt')].map((opt) => ({
      where: opt.getAttribute('data-key') ?? '',
      chose: tagText(opt, CHILD_MARK),
      machine: tagText(opt, machineMark),
    }));
  }

  /** A CSS `left` of `34.567%` and one of `34.6%` are the same slider step, so both read as 34.6. */
  const step = (el: HTMLElement): string =>
    (Math.round(Number.parseFloat(el.style.left) * 10) / 10).toFixed(1);

  const handle = document.querySelector('#handle') as HTMLElement | null;
  const pin = document.querySelector('#pin') as HTMLElement | null;
  const found: PlaceMarks[] = [];
  const add = (at: string, role: 'chose' | 'machine', text: string | null): void => {
    if (text === null) return;
    const existing = found.find((mark) => mark.where === at);
    if (existing) existing[role] = text;
    else found.push({ where: at, chose: null, machine: null, [role]: text });
  };
  if (handle) add(step(handle), 'chose', tagText(handle, CHILD_MARK));
  // A pin that is not shown is not a mark, and the renderer hides it between trials.
  if (pin?.classList.contains('show')) add(step(pin), 'machine', tagText(pin, machineMark));
  return found;
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
    marks: () => marksOf(win.document, typeCode),
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
    place: (ratio: number) => {
      const slider = win.document.querySelector('#slider') as HTMLInputElement | null;
      if (slider === null) throw new Error('the placement demo has no slider');
      slider.value = String(Math.round(ratio * 1000));
      slider.dispatchEvent(new win.Event('input', { bubbles: true }));
    },
    close: () => {
      win.close();
    },
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface PlayedTrial {
  status: string;
  marks: PlaceMarks[];
  reveals: number;
  text: string;
}

/**
 * Answer one item with `candidate` — clicking its option, or putting the handle at its ratio and
 * pressing Send — then hand the demo the item's own reveal, and report everything it put on screen.
 *
 * The reveal comes from the real `revealFor`, not from a literal assembled here, so the payload the
 * renderer is driven with is the payload the route would send.
 */
async function playOneTrial(
  typeCode: string,
  item: RawBankItem,
  candidate: Candidate,
): Promise<PlayedTrial> {
  const demo = openDemo(typeCode);
  try {
    await sleep(120);
    demo.send({ type: 'init', item: toServedItem(item) });
    demo.send({ type: 'start' });
    await sleep(60);
    demo.click(demo.document.querySelector('#play')!);
    await sleep(60);
    if (typeCode === PLACEMENT_TYPE) {
      demo.place(candidate.at);
      demo.click(demo.document.querySelector('#send')!);
    } else {
      demo.click(demo.options()[candidate.at]!);
    }
    await sleep(60);

    demo.send({ type: 'reveal', reveal: revealFor(item) });
    await sleep(60);

    expect(demo.errors, `${typeCode}: the renderer threw`).toEqual([]);
    return {
      status: demo.status(),
      marks: demo.marks(),
      reveals: demo.events.filter((kind) => kind === 'reveal_shown').length,
      text: demo.visibleText(),
    };
  } finally {
    demo.close();
  }
}

/** Everything a rendered trial says about the child or the machine, as one string to scan. */
function reviewCopy(trial: PlayedTrial): string {
  return [
    trial.status,
    ...trial.marks.flatMap((mark) => [mark.chose ?? '', mark.machine ?? '']),
  ].join(' ');
}

/* ================================================================== *
 * 4. What the child sees: a reviewable trial with no verdict in it
 * ================================================================== */

/**
 * REPLACES `the rendered reveal says the same thing to a child who was right and one who was wrong`.
 *
 * That suite asserted the rendered reveal was IDENTICAL across outcomes — same status line, same
 * mark, whatever the child had answered. §4.3 deliberately reverses that: the trial is now
 * reviewable, it shows what the machine produced AND what the child answered, and those two facts
 * cannot be shown together without the picture differing between a child who matched the machine and
 * one who did not. A block that never lets a child see what happened gives them nothing to learn
 * from, which undercuts the construct it is measuring (D-209).
 *
 * So the boundary moves rather than disappearing, and this suite pins where it moved to:
 *
 *  1. the MACHINE'S OWN statement is still outcome-independent — same place, same words, either way,
 *     because it describes the mechanism and the mechanism was not told what the child did. This is
 *     the half of the replaced assertion that still has to hold, and it is what stops the reveal
 *     becoming a verdict wearing world-state clothing;
 *  2. the trial AS A WHOLE does differ, asserted positively, so a renderer that quietly collapsed
 *     back to outcome-free would fail here rather than pass silently;
 *  3. both marks survive at the one place that carries both roles — the case the child has most to
 *     read, and the case a single shared tag element used to overwrite; and
 *  4. no evaluative language and no running tally, either way. Colour, shape and position carry the
 *     distinction; the copy points at the work.
 *
 * All four run for all four types, in each type's own currency. The placement type reaches (3) by
 * being placed exactly on the revealed position, which is the coincidence its geometry exists for.
 */
describe('the rendered trial is reviewable and carries no verdict', () => {
  for (const typeCode of STAGE2_TYPES) {
    it(`shows both marks without evaluating the child in ${typeCode}`, async () => {
      // An item the two answers really do separate on: for a choice type the first option must not
      // be the key, and for the placement type any item will do because the wrong placement is
      // constructed four tolerances off.
      const item =
        typeCode === PLACEMENT_TYPE
          ? BANKS.get(typeCode)![0]!
          : BANKS.get(typeCode)!.find(
              (candidate) => optionsOf(candidate)[0]!.key !== String(candidate.answer.correctKey),
            )!;
      const candidates = candidatesFor(item);
      const rightAnswer = candidates.find((candidate) => candidate.right)!;
      const wrongAnswer = candidates.find((candidate) => !candidate.right)!;

      // The same item and the same reveal, answered wrong and answered right.
      const wrong = await playOneTrial(typeCode, item, wrongAnswer);
      const right = await playOneTrial(typeCode, item, rightAnswer);

      expect(wrong.reveals).toBe(1);
      expect(right.reveals).toBe(1);

      // (1) The machine's statement does not move. Same place, same words, both times.
      const machineOf = (trial: PlayedTrial) => trial.marks.filter((mark) => mark.machine !== null);
      expect(machineOf(wrong).length, `${typeCode}: the machine marked no place`).toBe(1);
      expect(machineOf(right).map((mark) => [mark.where, mark.machine])).toEqual(
        machineOf(wrong).map((mark) => [mark.where, mark.machine]),
      );
      expect(machineOf(wrong)[0]!.machine!.length).toBeGreaterThan(0);
      expect(right.status, 'the status line differs by outcome').toBe(wrong.status);
      expect(right.status.length).toBeGreaterThan(0);

      // (2) The child's mark does move, and that is the whole difference. Two marked places when the
      // child answered differently from the machine, one when they answered the same.
      const chosenAt = (trial: PlayedTrial) =>
        trial.marks.filter((mark) => mark.chose !== null).map((mark) => mark.where);
      expect(chosenAt(wrong).length, `${typeCode}: the child's answer was not marked`).toBe(1);
      expect(chosenAt(right)).toEqual(machineOf(right).map((mark) => mark.where));
      expect(chosenAt(wrong), 'the trial no longer differs by outcome').not.toEqual(
        chosenAt(right),
      );
      const marked = (trial: PlayedTrial) =>
        trial.marks.filter((mark) => mark.chose !== null || mark.machine !== null).length;
      expect(marked(wrong)).toBe(2);
      expect(marked(right)).toBe(1);

      // (3) At the coincident place both roles are legible, and they say different things.
      const both = right.marks.find((mark) => mark.where === chosenAt(right)[0])!;
      expect(both.chose, `${typeCode}: the child\u2019s mark was overwritten`).toBeTruthy();
      expect(both.machine, `${typeCode}: the machine\u2019s mark was overwritten`).toBeTruthy();
      expect(both.chose).not.toBe(both.machine);

      // (4) Nothing evaluative and nothing accumulating, in either rendering.
      for (const trial of [wrong, right]) {
        for (const word of FORBIDDEN_WORDS) {
          expect(trial.text.includes(word), `${typeCode} says "${word}" to the child`).toBe(false);
        }
        expect(trial.text).not.toMatch(/[\u2713\u2717\u2715\u2605]/u);
        for (const pattern of TALLY_PATTERNS) {
          expect(reviewCopy(trial), `${typeCode} keeps a tally (${String(pattern)})`).not.toMatch(
            pattern,
          );
        }
      }
    }, 20_000);
  }

  /**
   * `VER-MORPHO-01` is the one type whose reveal copy varies, because its items run both ways
   * round and one sentence cannot describe both. Direction is fixed in the bank before the child
   * answers, so it is a legitimate thing to branch on — and it remains the only thing the MACHINE'S
   * statement branches on, which is what this checks now that the trial as a whole may differ.
   */
  it('varies the VER-MORPHO-01 machine mark by the item\u2019s direction and by nothing else', async () => {
    const byDirection = new Map<string, RawBankItem>();
    for (const item of BANKS.get('VER-MORPHO-01')!) {
      const direction = String((item.content as { direction?: unknown }).direction);
      if (!byDirection.has(direction) && optionsOf(item)[0]!.key !== String(item.answer.correctKey))
        byDirection.set(direction, item);
    }
    expect([...byDirection.keys()].sort()).toEqual(['pictureToWord', 'wordToPicture']);

    const said = new Map<string, string>();
    for (const [direction, item] of byDirection) {
      const candidates = candidatesFor(item);
      const wrong = await playOneTrial(
        'VER-MORPHO-01',
        item,
        candidates.find((candidate) => !candidate.right)!,
      );
      const right = await playOneTrial(
        'VER-MORPHO-01',
        item,
        candidates.find((candidate) => candidate.right)!,
      );
      expect(right.status, `${direction}: the status line differs by outcome`).toBe(wrong.status);
      const machineMark = (trial: PlayedTrial) =>
        trial.marks
          .filter((mark) => mark.machine !== null)
          .map((mark) => [mark.where, mark.machine]);
      expect(machineMark(right), `${direction}: the machine mark differs by outcome`).toEqual(
        machineMark(wrong),
      );
      said.set(direction, wrong.status);
    }

    // Both directions say something, and they do not say the same thing: a picture the word means
    // and a word the picture is called are different observations of the same system.
    expect(said.get('wordToPicture')).not.toBe(said.get('pictureToWord'));
    for (const status of said.values()) expect(status.length).toBeGreaterThan(0);
  }, 20_000);
});

/* ================================================================== *
 * 5. The review palette: readable, and not colour alone
 * ================================================================== */

const SKIN_SOURCE = join(REPO_ROOT, 'research', 'exam-question-types', 'exam-skin.css');
const SKIN_PUBLISHED = join(process.cwd(), 'public', 'exam-skin.css');

/** WCAG 2.x relative luminance, sRGB. */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
  const [r, g, b] = channels.map((value) => {
    const scaled = value / 255;
    return scaled <= 0.04045 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * §4.3 says the two marks are distinguished by colour. That is a requirement ON the colours, not a
 * licence to pick any two: a child who cannot resolve them is being shown one mark, and colour on
 * its own is not a channel at all (WCAG 2.2 SC 1.4.1). So this section holds the shipped stylesheet
 * to both halves — the values are legible, AND colour is never the only thing carrying the
 * difference.
 *
 * The ratios are recomputed from the file rather than quoted, so an edit that changes a colour
 * without checking it fails here.
 */
describe('the review palette', () => {
  const skin = readFileSync(SKIN_SOURCE, 'utf8');
  /** The review rules only — everything from the section heading to the next one. */
  const review = skin.slice(
    skin.indexOf('/* ---- the reviewable trial'),
    skin.indexOf('/* ---- ready when you are'),
  );

  const TILE = '#ffffff';
  const STANDALONE_PAGE = '#fcf4ef';
  const UNMARKED_BORDER = '#ecd9cb';
  const MACHINE = '#004f71';
  const MACHINE_RING = '#4b8299';
  const MACHINE_INK = '#ffffff';
  const CHILD_BORDER = '#6f4526';
  const CHILD_FILL = '#e48b53';
  const CHILD_INK = '#001117';

  it('is the palette the stylesheet actually ships', () => {
    // The helper first, against the two values whose ratio is definitional. Without this every
    // threshold below could be met by an arithmetic error rather than by a legible colour.
    expect(contrast('#ffffff', '#000000')).toBeCloseTo(21, 5);
    expect(contrast('#ffffff', '#ffffff')).toBeCloseTo(1, 5);

    expect(review.length).toBeGreaterThan(0);
    for (const value of [MACHINE, MACHINE_RING, MACHINE_INK, CHILD_BORDER, CHILD_FILL, CHILD_INK]) {
      expect(review, `${value} is no longer in the review rules`).toContain(value);
    }
    // The published copy is what the browser loads. Two files by hand is how they drift.
    expect(
      readFileSync(SKIN_PUBLISHED, 'utf8'),
      'apps/web/public/exam-skin.css has drifted from research/exam-question-types/exam-skin.css',
    ).toBe(skin);
  });

  it('reads at AA or better as text, over every background it sits on', () => {
    // 4.5:1 is the floor for a label at this size; both pairings clear 7:1, which is AAA.
    expect(contrast(MACHINE_INK, MACHINE)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(CHILD_INK, CHILD_FILL)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(MACHINE_INK, MACHINE)).toBeGreaterThanOrEqual(7);
    expect(contrast(CHILD_INK, CHILD_FILL)).toBeGreaterThanOrEqual(7);
  });

  it('reads at 3:1 or better as a non-text indicator', () => {
    // SC 1.4.11. Each mark's border and its own outline against the tile it sits on, the standalone
    // page background, and the border an UNMARKED tile carries — a mark that does not separate from
    // an unmarked tile is not a mark.
    for (const background of [TILE, STANDALONE_PAGE, UNMARKED_BORDER]) {
      expect(
        contrast(MACHINE, background),
        `machine border on ${background}`,
      ).toBeGreaterThanOrEqual(3);
      expect(
        contrast(CHILD_BORDER, background),
        `child border on ${background}`,
      ).toBeGreaterThanOrEqual(3);
    }
    // The machine's outer ring, which is the widest thing on the tile.
    for (const background of [TILE, STANDALONE_PAGE, UNMARKED_BORDER]) {
      expect(contrast(MACHINE_RING, background), `machine ring on ${background}`).toBeGreaterThan(
        3,
      );
    }
    // The child's fill is NOT an indicator on its own — it fails 1.4.11 against a white tile — which
    // is why it only ever appears behind the bronze border and outline above. Asserted rather than
    // noted, so a later edit that promotes the gold to a border fails here.
    expect(contrast(CHILD_FILL, TILE), 'the gold fill was treated as an indicator').toBeLessThan(3);
    expect(review, 'a bare gold border reached the review rules').not.toMatch(
      /border(?:-color)?:[^;]*#e48b53/,
    );
  });

  it('separates the two roles by lightness and not only by hue', () => {
    // The two fills are 3.44:1 apart. Without this the roles would be a blue and an orange of the
    // same value — fine for most people, indistinguishable for a monochromat, and reduced to the
    // non-colour channels below for everyone else.
    expect(contrast(MACHINE, CHILD_FILL)).toBeGreaterThanOrEqual(3);
  });

  it('carries the distinction on three channels that are not colour', () => {
    const machineRules = review.slice(review.indexOf('#options .opt.made'));

    // Border STYLE: the machine's tile is solid, the child's is dashed.
    expect(review).toMatch(/#options \.opt\.chose \{[^}]*border-style: dashed/);
    expect(machineRules).toMatch(/border-style: solid/);

    // POSITION: the machine's mark hangs below the tile, the child's sits inside its top-left
    // corner. Two marks anchored to the same edge would collide on the tile that carries both.
    expect(review).toMatch(/\[data-mark='made'\][\s\S]*?bottom: -9px/);
    expect(review).toMatch(/\[data-mark='chose'\][\s\S]*?top: -1px/);

    // SHAPE: a fully rounded pill against a square-cornered tab.
    expect(review).toMatch(/\[data-mark='made'\][\s\S]*?border-radius: 999px/);
    expect(review).toMatch(/\[data-mark='chose'\][\s\S]*?border-radius: 11px 0 8px 0/);
  });

  /**
   * The same four channels for the type that answers with a POSITION (D-211).
   *
   * `QUANT-GLYPHNUM-01` has no `#options`, so the rules above cannot reach it and it would otherwise
   * be the one type whose review is unstyled and unaudited. It reuses this block's palette rather
   * than introducing a second one — which is the property asserted first, because a second palette
   * is how the audited one stops being the one that ships.
   *
   * Its position channel is stronger than the tile version rather than weaker: the two marks can
   * share an x exactly, so they are put on opposite sides of the line and cannot occupy the same
   * space at all.
   */
  it('carries the same four channels where the answer is a position on a line', () => {
    const rail = review.slice(review.indexOf('#rail #pin'));
    expect(rail.length, 'the placement review rules are gone from the stylesheet').toBeGreaterThan(
      0,
    );

    // COLOUR: the same two roles, out of the same audited pairing. No third hue is introduced.
    expect(rail).toMatch(/#rail #pin\.goes \{[^}]*border-color: #004f71/);
    expect(rail).toMatch(/#rail #pin\.goes \{[^}]*box-shadow: 0 0 0 4px #4b8299/);
    expect(rail).toMatch(/#rail #handle\.chose \{[^}]*border-color: #6f4526/);
    expect(rail).toMatch(/\[data-mark='goes'\][\s\S]*?background: #004f71;\s*\n\s*color: #ffffff/);
    expect(rail).toMatch(/\[data-mark='chose'\][\s\S]*?background: #e48b53;\s*\n\s*color: #001117/);
    const hexes = new Set(rail.match(/#[0-9a-f]{6}/g) ?? []);
    expect(
      [...hexes].sort(),
      'the placement rules introduced a colour the palette has not audited',
    ).toEqual([MACHINE_INK, CHILD_INK, MACHINE, MACHINE_RING, CHILD_BORDER, CHILD_FILL].sort());

    // BORDER STYLE: solid for the machine, dashed for the child, as on a tile.
    expect(rail).toMatch(/#rail #pin\.goes \{[^}]*border-style: solid/);
    expect(rail).toMatch(/#rail #handle\.chose \{[^}]*border-style: dashed/);

    // POSITION: above the line against below it. `bottom: 100%` and `top: 100%` are outside each
    // other's boxes by construction, which is what keeps both readable at a shared position.
    expect(rail).toMatch(/\[data-mark='goes'\][\s\S]*?bottom: 100%/);
    expect(rail).toMatch(/\[data-mark='chose'\][\s\S]*?top: 100%/);

    // SHAPE: the same pill and the same square-cornered tab.
    expect(rail).toMatch(/\[data-mark='goes'\][\s\S]*?border-radius: 999px/);
    expect(rail).toMatch(/\[data-mark='chose'\][\s\S]*?border-radius: 11px 0 8px 0/);
  });

  it('uses no good/bad colour to say which mark is which', () => {
    // `--good` and `--bad` are the sheet's green and red. A reviewable trial that reached for either
    // would be delivering a verdict in the one channel no wording check can see.
    expect(review).not.toMatch(/--good|--bad|#146c43|#a4442f/);
  });
});

/* ================================================================== *
 * 6. Neither mark outlives the trial it belongs to
 * ================================================================== */

/**
 * A block runs thirty trials of ONE type, and the runner serves them all through a single loaded
 * demo — the iframe is keyed on the demo it loads rather than on the item, so that a run of trials
 * reads as one activity instead of the same question asked thirty times (`exam-runner.tsx`, and
 * `lib/exam/demo-protocol.test.ts` for the per-type proof that every demo tolerates it). Each trial
 * after the first therefore arrives at a document that is still showing the review of the trial
 * before it, and the two marks acquire a lifetime they did not have when every trial reloaded the
 * page.
 *
 * Either one surviving its own trial is a §1.5 leak in its most direct form. The machine's mark
 * names the option the mechanism resolved to on an item the child has already been graded on, so
 * leaving it up beside a NEW item shows them an answer to the question they are being asked; the
 * child's own mark would tell them they had already answered this one. §4.3's palette work above
 * makes the two marks legible, which is exactly why neither may be left on screen by accident.
 *
 * `onReveal` requires `committed` in every renderer, so a second `reveal_shown` is also evidence
 * that the second trial was really answered on the reused document.
 */
describe('the review marks do not outlive their trial', () => {
  for (const typeCode of STAGE2_TYPES) {
    it(`${typeCode} clears both and takes the next trial on the same document`, async () => {
      const bank = BANKS.get(typeCode)!;
      const one = bank[0]!;
      // Same difficulty where the bank has one, so both trials take the same interaction.
      const two = bank.slice(1).find((item) => item.difficulty === one.difficulty) ?? bank[1]!;
      expect(two.itemId).not.toBe(one.itemId);

      const demo = openDemo(typeCode);
      const revealsShown = () => demo.events.filter((kind) => kind === 'reveal_shown').length;
      const marked = () =>
        demo.marks().filter((mark) => mark.chose !== null || mark.machine !== null);
      const answer = async (item: RawBankItem) => {
        demo.send({ type: 'init', item: toServedItem(item) });
        demo.send({ type: 'start' });
        await sleep(60);
        const play = demo.document.querySelector('#play');
        if (play) demo.click(play);
        await sleep(60);
        if (typeCode === PLACEMENT_TYPE) {
          demo.place(0.5);
          demo.click(demo.document.querySelector('#send')!);
        } else {
          demo.click(demo.options()[0]!);
        }
        await sleep(60);
        demo.send({ type: 'reveal', reveal: revealFor(item)! });
        await sleep(60);
      };

      try {
        await sleep(120);
        await answer(one);
        expect(revealsShown(), `${typeCode}: the first trial got no reveal`).toBe(1);
        expect(
          marked().length,
          `${typeCode}: the first trial was not reviewed at all`,
        ).toBeGreaterThan(0);

        // The next trial arrives as `init` + `start` and nothing else — exactly what the host sends.
        demo.send({ type: 'init', item: toServedItem(two) });
        demo.send({ type: 'start' });
        await sleep(60);
        expect(
          marked(),
          `${typeCode}: a mark from the previous trial is still on screen beside the next item`,
        ).toEqual([]);
        expect(revealsShown(), `${typeCode}: the init re-showed a reveal`).toBe(1);

        await answer(two);
        expect(revealsShown(), `${typeCode}: the second trial got no reveal of its own`).toBe(2);
        expect(
          demo.marks().filter((mark) => mark.machine !== null).length,
          `${typeCode}: the second trial\u2019s machine output was not marked`,
        ).toBe(1);
        expect(demo.errors, `${typeCode}: the renderer threw`).toEqual([]);
      } finally {
        demo.close();
      }
    }, 20_000);
  }
});
