import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { JSDOM, VirtualConsole } from 'jsdom';
import { describe, expect, it } from 'vitest';

import { toServedItem, type RawBankItem } from './bank-loader';
import { EXAM_TYPE_REGISTRY } from './registry.generated';
import { REVEAL_TYPE_CODES, revealFor } from './reveal';
import { verify } from './verifiers';

/**
 * SPA-XFORM-01 "Transform Machine", the Stage 2 SPATIAL learning-block type, at the four places
 * this branch could have got it wrong (STAGE2_QUESTION_DESIGN §9.2, U6 and U7):
 *
 *  1. the VERIFIER could disagree with the generator, which would mark correct children wrong on
 *     the items it disagreed about and would do so in a way no in-browser check could catch;
 *  2. the HIDDEN SYSTEM could reach the browser, which would turn every item into a lookup and
 *     make the whole measurement fiction (§3.4, E-075/E-076);
 *  3. the RENDERER could break one of U6's non-negotiables — the `ready` handshake, the absence of
 *     a standalone-timer fallback, single-tap answering, or informational-only feedback; or
 *  4. the SUBSTRATE could be drawn as interface furniture, which is the specific defect the
 *     generator's anti-chrome design exists to prevent and the one thing it cannot enforce from
 *     its own side.
 *
 * Born-synthetic throughout. Nothing here is evidence that the type measures learning: that is
 * Gate B, it needs roughly 128 real children, and it has not run.
 */

const TYPE = 'SPA-XFORM-01';
const REPO_ROOT = join(process.cwd(), '..', '..');
const QUESTION_TYPES = join(REPO_ROOT, 'research', 'exam-question-types');
const BANKS_DIR = join(QUESTION_TYPES, 'banks');
const CONTROL_BANKS_DIR = join(QUESTION_TYPES, 'control-banks');
const PUBLIC_DEMO = join(process.cwd(), 'public', 'exam-demos', `${TYPE}.html`);

function readBank(file: string): RawBankItem[] {
  return readFileSync(file, 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as RawBankItem);
}

const liveBank = readBank(join(BANKS_DIR, `${TYPE}.jsonl`));
const controlBank = readBank(join(CONTROL_BANKS_DIR, `${TYPE}.perTrial.jsonl`));

/* ================================================================== *
 * An INDEPENDENT lattice algebra
 *
 * Re-typed from the coordinate maps the generator documents rather than imported from either the
 * generator or the verifier. Getting one of these six wrong is the single most likely way this
 * type could be confidently wrong about its own answer key, and a check that imports the thing it
 * is checking would not notice.
 * ================================================================== */

const GRID = 4;
const CELLS = GRID * GRID;

function permutation(move: (r: number, c: number) => [number, number]): number[] {
  const table = new Array<number>(CELLS);
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      const [nr, nc] = move(r, c);
      table[r * GRID + c] = nr * GRID + nc;
    }
  }
  return table;
}

const PERMUTATION: Record<string, number[]> = {
  pivot: permutation((r, c) => [c, GRID - 1 - r]),
  mirror: permutation((r, c) => [r, GRID - 1 - c]),
  braid: permutation((r, c) => [r, c ^ 1]),
  stagger: permutation((r, c) => [r ^ 1, c]),
  drift: permutation((r, c) => [(r + 2) % GRID, (c + 2) % GRID]),
  shunt: permutation((r, c) => [r, (c + 1) % GRID]),
};
const OPERATORS = Object.keys(PERMUTATION);

const figureKey = (blocks: readonly number[]) => [...blocks].sort((a, b) => a - b).join('.');

interface XformItem {
  input: number[];
  chain: string[];
  options: { key: string; blocks: number[] }[];
  mapping: Record<string, string>;
}

function readItem(item: RawBankItem): XformItem {
  const content = item.content as {
    input: { blocks: number[] };
    chain: string[];
    options: { key: string; blocks: number[] }[];
  };
  const system = item.answer.system as { mapping: Record<string, string> };
  return {
    input: content.input.blocks,
    chain: content.chain,
    options: content.options,
    mapping: system.mapping,
  };
}

/** The option the machine makes, re-derived from `content` plus the server-only mapping. */
function derivedKey(item: RawBankItem): string {
  const { input, chain, options, mapping } = readItem(item);
  let state = input;
  for (const mark of chain) {
    const table = PERMUTATION[mapping[mark] as string] as number[];
    state = state.map((cell) => table[cell] as number);
  }
  const target = figureKey(state);
  const hits = options.filter((option) => figureKey(option.blocks) === target);
  expect(hits.length, `${item.itemId}: the machine's output matches ${hits.length} options`).toBe(
    1,
  );
  return (hits[0] as { key: string }).key;
}

/** The generator's nearness axis, re-stated so the verifier's copy has something to agree with. */
const NEARNESS: Record<string, number> = {
  order_error: 1.0,
  wrong_axis: 0.8,
  over_application: 0.65,
  wrong_operator: 0.5,
  omission: 0.35,
  wrong_family: 0.2,
  first_step_only: 0.1,
  identity_copy: 0.0,
};

function traceKind(item: RawBankItem, optionKey: string): string {
  const trace = item.answer.strategyTrace as Record<string, { kind: string }>;
  return trace[optionKey]?.kind ?? '';
}

/* ================================================================== *
 * 1. The verifier reproduces the generator's key, item for item
 * ================================================================== */

describe('the verifier agrees with the generator', () => {
  it('re-derives the key on every item of the live bank', () => {
    expect(liveBank.length).toBeGreaterThan(200);
    for (const item of liveBank) {
      expect(derivedKey(item), `${item.itemId}: derived key`).toBe(item.answer.correctKey);
    }
  });

  /**
   * The same run over the scrambled control arm. §4.1.1 requires ONE verifier to serve both arms,
   * and the only way to show a verifier has no arm branch is to run it on both — the control arm's
   * mapping is re-drawn every item, so a verifier that had cached or assumed anything about the
   * system would fail here and pass above.
   */
  it('re-derives the key on every item of the scrambled control arm too', () => {
    expect(existsSync(join(CONTROL_BANKS_DIR, `${TYPE}.perTrial.jsonl`))).toBe(true);
    expect(controlBank.length).toBe(liveBank.length);
    for (const item of controlBank) {
      expect(derivedKey(item), `${item.itemId}: derived key`).toBe(item.answer.correctKey);
    }
  });

  it('scores the key 1 and every distractor 0, on both arms', () => {
    for (const bank of [liveBank, controlBank]) {
      for (const item of bank) {
        const key = String(item.answer.correctKey);
        const right = verify(item, { selectedKey: key });
        expect(right.correct, `${item.itemId}: the key scored wrong`).toBe(true);
        expect(right.metrics).toEqual({
          'M-ERRTYPE': 1,
          'M-RULEID': (item.content.chain as string[]).length,
        });

        for (const option of (item.content.options as { key: string }[]).filter(
          (o) => o.key !== key,
        )) {
          const wrong = verify(item, { selectedKey: option.key });
          expect(wrong.correct, `${item.itemId}/${option.key}: a distractor scored right`).toBe(
            false,
          );
          // The error-quality axis §4.6 needs, so a wrong answer says WHICH incomplete rule the
          // child used. Capped below 1 so a correct answer is always strictly best.
          expect(wrong.metrics?.['M-ERRTYPE']).toBeCloseTo(
            0.9 * (NEARNESS[traceKind(item, option.key)] as number),
            12,
          );
          expect(wrong.metrics).not.toHaveProperty('M-RULEID');
        }
      }
    }
  });

  it('fails closed on a response that names no option', () => {
    const item = liveBank[0] as RawBankItem;
    expect(verify(item, {})).toEqual({ correct: false });
    expect(verify(item, { selectedKey: 42 })).toEqual({ correct: false });
  });

  /**
   * The stored key is a CROSS-CHECK, not the authority — and the test above cannot tell the two
   * apart, because the verifier falls back to `answer.correctKey` when the derivation names no
   * single option. That fallback is a faithful port of the TypeScript and is what keeps an
   * unreadable item graded rather than refused, but it means a verifier with a broken lattice map
   * can pass every whole-bank assertion by quietly reading the key it was supposed to re-derive.
   * Measured, on the plpgsql twin, before this test existed.
   *
   * Rotating the stored key to a different option separates them: if the transformation decides,
   * the true key still wins; if the fallback decided, the rotated key wins instead. Run over the
   * whole bank, so every transformation and every chain the grammar builds is covered.
   */
  it('grades on the transformation, not on the stored key, over the whole bank', () => {
    for (const item of liveBank) {
      const truth = derivedKey(item);
      const rotated = (item.content.options as { key: string }[]).find(
        (option) => option.key !== truth,
      ) as { key: string };
      const tampered: RawBankItem = {
        ...item,
        answer: { ...item.answer, correctKey: rotated.key },
      };
      expect(
        verify(tampered, { selectedKey: truth }).correct,
        `${item.itemId}: a rotated stored key beat the transformation`,
      ).toBe(true);
      expect(verify(tampered, { selectedKey: rotated.key }).correct).toBe(false);
    }
  });
});

/* ================================================================== *
 * 2. The hidden system never reaches the client
 * ================================================================== */

describe('the hidden system is absent from everything the client receives', () => {
  it('is stripped from every served item in the bank', () => {
    for (const item of liveBank) {
      const served = JSON.stringify(toServedItem(item));
      for (const field of ['correctKey', 'mapping', 'systemId', 'strategyTrace', 'operatorChain']) {
        expect(served.includes(field), `${item.itemId} serves ${field}`).toBe(false);
      }
      for (const op of OPERATORS) {
        expect(served.includes(`"${op}"`), `${item.itemId} serves the transformation ${op}`).toBe(
          false,
        );
      }
    }
  });

  /**
   * The measurement that matters: a client that brute-forces every mark relabelling. A mapping is
   * a bijection and the marks in a chain are distinct, so guessing it is guessing an ordered
   * selection of `depth` distinct transformations — at most 6*5*4 = 120. If only ONE option were
   * consistent with any of them, `content` would determine the key and the hidden system would
   * never be needed. The generator sets the floor at four of five; this re-derives it.
   */
  it('cannot be brute-forced out of content: the key is not determined by the stimulus', () => {
    const reachable = (depth: number, input: number[]): Set<string> => {
      const out = new Set<string>();
      const walk = (position: number, used: Set<string>, state: number[]): void => {
        if (position === depth) {
          out.add(figureKey(state));
          return;
        }
        for (const op of OPERATORS) {
          if (used.has(op)) continue;
          used.add(op);
          walk(
            position + 1,
            used,
            state.map((cell) => (PERMUTATION[op] as number[])[cell] as number),
          );
          used.delete(op);
        }
      };
      walk(0, new Set(), input);
      return out;
    };

    // A slice rather than the whole bank: 120 relabellings x 234 items is the same measurement
    // made slowly, and the generator's own checker runs it exhaustively.
    const slice = liveBank.filter((_, index) => index % 8 === 0);
    expect(slice.length).toBeGreaterThan(20);
    for (const item of slice) {
      const { input, chain, options } = readItem(item);
      const figures = reachable(chain.length, input);
      const consistent = options.filter((option) => figures.has(figureKey(option.blocks)));
      expect(
        consistent.length,
        `${item.itemId}: only ${consistent.length} option(s) survive a mapping-blind brute force`,
      ).toBeGreaterThanOrEqual(4);
    }
  });

  it('is absent from the published renderer', () => {
    const src = readFileSync(PUBLIC_DEMO, 'utf8');
    for (const op of OPERATORS) {
      // The renderer draws marks and patterns; it must not contain the transformation vocabulary
      // at all, because knowing it plus a mapping would let the browser solve the item.
      expect(src.includes(`'${op}'`), `published demo mentions the transformation ${op}`).toBe(
        false,
      );
      expect(src.includes(`"${op}"`), `published demo mentions the transformation ${op}`).toBe(
        false,
      );
    }
    expect(src).not.toMatch(/["']?correctKey["']?\s*:/);
    expect(src).not.toMatch(/["']?distractorRationales["']?\s*:/);
    expect(src).not.toContain('systemPersistence');
  });
});

/* ================================================================== *
 * 3. The post-commit reveal
 * ================================================================== */

describe('the post-commit reveal', () => {
  it('exists for this learning-block type and names the option the machine made', () => {
    expect(REVEAL_TYPE_CODES).toContain(TYPE);
    for (const item of liveBank) {
      expect(revealFor(item)).toEqual({ machineOutput: item.answer.correctKey });
    }
  });

  it('carries the option key and nothing else — no mapping, no rationale, no verdict', () => {
    const reveal = revealFor(liveBank[0] as RawBankItem);
    expect(Object.keys(reveal ?? {})).toEqual(['machineOutput']);
    expect(JSON.stringify(reveal)).not.toContain('correct');
  });

  it('is not handed to a type that did not ask for one', () => {
    for (const entry of EXAM_TYPE_REGISTRY) {
      if (REVEAL_TYPE_CODES.includes(entry.typeCode)) continue;
      const item = { typeCode: entry.typeCode, answer: { correctKey: 'A' } } as RawBankItem;
      expect(revealFor(item), `${entry.typeCode} produced a reveal`).toBeNull();
    }
  });
});

/* ================================================================== *
 * 4. The renderer, driven through the real embedding protocol
 * ================================================================== */

interface DemoHarness {
  window: JSDOM['window'];
  document: Document;
  messages: { type?: string; result?: { response?: Record<string, unknown> } }[];
  send: (message: Record<string, unknown>) => void;
  click: (el: Element) => void;
  options: () => Element[];
  /** What a child can actually read: the rendered page with `<script>`/`<style>` removed. */
  visibleText: () => string;
  errors: string[];
  fetched: string[];
  close: () => void;
}

function openDemo(): DemoHarness {
  const messages: DemoHarness['messages'] = [];
  const fetched: string[] = [];
  const hostWindow = { postMessage: (message: unknown) => messages.push(message as never) };
  const errors: string[] = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (error: Error) =>
    errors.push(error.message.split('\n')[0] as string),
  );

  const dom = new JSDOM(readFileSync(PUBLIC_DEMO, 'utf8'), {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole,
    url: `http://localhost/exam-demos/${TYPE}.html`,
    beforeParse(window) {
      Object.defineProperty(window, 'parent', { configurable: true, get: () => hostWindow });
      (window as unknown as { fetch: unknown }).fetch = (url: string) => {
        fetched.push(String(url));
        return Promise.reject(new Error('network blocked in test'));
      };
      const element = window.Element.prototype as unknown as Record<string, unknown>;
      element.animate = () => ({ finished: Promise.resolve(), cancel: () => undefined });
      element.scrollIntoView = () => undefined;
    },
  });

  const win = dom.window;
  return {
    window: win,
    document: win.document,
    messages,
    errors,
    fetched,
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
    visibleText: () => {
      const body = win.document.body.cloneNode(true) as HTMLElement;
      for (const el of body.querySelectorAll('script,style')) el.remove();
      return body.textContent ?? '';
    },
    close: () => {
      win.close();
    },
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const servedItem = () =>
  toServedItem(liveBank.find((i) => (i.content.chain as string[]).length >= 2) as RawBankItem);

describe('the renderer, embedded', () => {
  it('announces itself with `ready` and renders nothing until the host inits it', async () => {
    const demo = openDemo();
    try {
      await sleep(120);
      expect(
        demo.messages.some((m) => m.type === 'ready'),
        'no {type:"ready"}',
      ).toBe(true);
      expect(demo.options().length, 'rendered an item before init').toBe(0);
      expect(demo.errors).toEqual([]);
    } finally {
      demo.close();
    }
  });

  /**
   * E-079, the defect this type must not reintroduce. Fifteen demos hedged the embedded case with
   * "if no init by 500ms, assume there is no host", so a host init that landed later put dev
   * preview text in front of a child, 404'd on the unpublished bank, and cycled its own items
   * alongside the runner's. An embedded demo must wait indefinitely.
   */
  it('never falls back to its own items while embedded, however long the host takes', async () => {
    const demo = openDemo();
    try {
      await sleep(1400);
      expect(demo.fetched, 'reached for the bank while embedded').toEqual([]);
      expect(demo.options().length, 'started cycling its own items').toBe(0);
      expect(demo.visibleText()).not.toContain('Opened directly');

      demo.send({ type: 'init', item: servedItem() });
      await sleep(80);
      expect(demo.options().length).toBe(5);
    } finally {
      demo.close();
    }
  });

  it('answers on a single tap, with option positions fixed', async () => {
    const demo = openDemo();
    try {
      const item = servedItem();
      await sleep(120);
      demo.send({ type: 'init', item });
      demo.send({ type: 'start' });
      await sleep(80);

      const keys = demo.options().map((el) => el.getAttribute('data-key'));
      expect(keys).toEqual(['A', 'B', 'C', 'D', 'E']);

      // The play gate holds every control inert until the child presses play (R1).
      demo.click(demo.options()[2] as Element);
      await sleep(40);
      expect(
        demo.messages.some((m) => m.type === 'result'),
        'answered through a closed gate',
      ).toBe(false);

      demo.click(demo.document.querySelector('#play') as Element);
      await sleep(60);
      demo.click(demo.options()[2] as Element);
      await sleep(80);

      const results = demo.messages.filter((m) => m.type === 'result');
      expect(results.length, 'one tap did not produce exactly one result').toBe(1);
      expect(results[0]?.result?.response?.selectedKey).toBe('C');
      // No confirm step: there is no second control to press, by design (§1.4(2)).
      expect(demo.document.querySelector('#go')).toBeNull();
      expect(demo.document.querySelector('#submit')).toBeNull();

      // A second tap changes nothing — the trial is committed.
      demo.click(demo.options()[0] as Element);
      await sleep(40);
      expect(demo.messages.filter((m) => m.type === 'result').length).toBe(1);
      expect(demo.errors).toEqual([]);
    } finally {
      demo.close();
    }
  });

  it('answers from the keyboard as well as the pointer', async () => {
    const demo = openDemo();
    try {
      await sleep(120);
      demo.send({ type: 'init', item: servedItem() });
      demo.send({ type: 'start' });
      await sleep(60);
      demo.click(demo.document.querySelector('#play') as Element);
      await sleep(60);

      demo.document.dispatchEvent(
        new demo.window.KeyboardEvent('keydown', { key: 'd', bubbles: true }),
      );
      await sleep(80);
      const results = demo.messages.filter((m) => m.type === 'result');
      expect(results.length, 'the keyboard could not answer the item').toBe(1);
      expect(results[0]?.result?.response?.selectedKey).toBe('D');
      expect(demo.errors).toEqual([]);
    } finally {
      demo.close();
    }
  });

  /**
   * The substrate, which is this type's one remaining chrome exposure. Every transformation is a
   * permutation of the sixteen cells, so nothing the machine does can be drawn as a border or a
   * halo — but a ruled 4x4 box reads as a table, and a child inducing over the furniture is the
   * exact defect the reference type shipped. The lattice is therefore dots, and every option shows
   * the same number of blocks as the input, so "count the blocks" is dead on screen as well as in
   * the bank.
   */
  it('draws the lattice as dots, never as a ruled table, and never changes the ink', async () => {
    const demo = openDemo();
    try {
      const item = servedItem();
      await sleep(120);
      demo.send({ type: 'init', item });
      await sleep(60);

      const inslot = demo.document.querySelector('#inslot') as Element;
      expect(inslot.querySelectorAll('circle').length, 'the 4x4 substrate is not 16 dots').toBe(16);
      expect(inslot.querySelectorAll('line,polyline,path').length, 'the lattice is ruled').toBe(0);
      expect(demo.document.querySelectorAll('table').length).toBe(0);

      const blockCount = (el: Element) => el.querySelectorAll('rect').length;
      const inputBlocks = (item.content as { input: { blocks: number[] } }).input.blocks.length;
      expect(blockCount(inslot)).toBe(inputBlocks);
      for (const option of demo.options()) {
        expect(blockCount(option), 'an option shows a different number of blocks').toBe(
          inputBlocks,
        );
      }
      expect(demo.errors).toEqual([]);
    } finally {
      demo.close();
    }
  });

  it('shows the machine finishing its action, and never a verdict', async () => {
    const demo = openDemo();
    try {
      await sleep(120);
      demo.send({ type: 'init', item: servedItem() });
      demo.send({ type: 'start' });
      await sleep(60);
      demo.click(demo.document.querySelector('#play') as Element);
      await sleep(60);
      demo.click(demo.options()[0] as Element);
      await sleep(60);

      // Before the reveal the output window is still empty: the renderer does not know.
      expect(demo.document.querySelector('#outslot')?.innerHTML).toBe('');

      demo.send({ type: 'reveal', reveal: { machineOutput: 'D' } });
      await sleep(60);

      const made = demo.document.querySelector('#options .opt.made');
      expect(made?.getAttribute('data-key'), 'the machine output was not marked').toBe('D');
      expect((demo.document.querySelector('#outslot')?.innerHTML ?? '').length).toBeGreaterThan(0);

      // The whole rendered page, checked for evaluative language and reward furniture (§1.5).
      const text = demo.visibleText();
      for (const word of [
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
      ]) {
        expect(text.includes(word), `the page says "${word}" to the child`).toBe(false);
      }
      expect(text).not.toMatch(/[✓✗✕★]/u);
      // No researcher sidebar for a child to read (E-082).
      expect(demo.document.querySelector('#telemetry')).toBeNull();
      expect(demo.errors).toEqual([]);
    } finally {
      demo.close();
    }
  });

  /**
   * The unscored interface gate (§1.4(3)). It must run before trial 0 when the host asks for it,
   * must not emit a scored result while it is running, and must hand over once the criterion is
   * met — otherwise interface learning lands inside the fitted climb, where it is indistinguishable
   * from learning the system.
   */
  it('runs the unscored interface gate before trial 0, and only when asked', async () => {
    const demo = openDemo();
    try {
      await sleep(120);
      demo.send({ type: 'init', item: servedItem() });
      demo.send({ type: 'start', tutorial: true });
      await sleep(60);
      demo.click(demo.document.querySelector('#play') as Element);
      await sleep(2200); // the pointer demonstration runs once, on the first gate trial

      const gateRenders = demo.messages.filter(
        (m) => (m as { event?: { kind?: string } }).event?.kind === 'gate_render',
      );
      expect(gateRenders.length, 'no gate trial was rendered').toBeGreaterThan(0);
      expect(
        demo.messages.some((m) => m.type === 'result'),
        'the gate emitted a scored result',
      ).toBe(false);

      // Answer gate trials correctly. The machine holds no parts, so the answer is the option
      // showing exactly the input pattern — visible on screen, and requiring no knowledge of the
      // hidden system, which is the whole point of a degenerate instance.
      const gateComplete = () =>
        demo.messages.find(
          (m) => (m as { event?: { kind?: string } }).event?.kind === 'gate_complete',
        );
      for (let i = 0; i < 6 && !gateComplete(); i++) {
        const wanted = demo.document.querySelector('#inslot')?.getAttribute('data-fig');
        const same = demo.options().find((el) => el.getAttribute('data-fig') === wanted);
        expect(same, 'no gate option showed the unchanged pattern').toBeDefined();
        // ...and exactly one did, or "which one is unchanged" has two answers.
        expect(demo.options().filter((el) => el.getAttribute('data-fig') === wanted).length).toBe(
          1,
        );
        demo.click(same as Element);
        await sleep(1400);
      }

      const completed = gateComplete() as { event?: Record<string, unknown> } | undefined;
      expect(completed, 'the gate never completed').toBeDefined();
      expect(completed?.event?.criterionMet, 'the gate was not cleared on merit').toBe(1);
      // Two consecutive correct is the criterion, so a child who reads the machine clears it in
      // two — the gate must not be a long unscored warm-up eating the session.
      expect(completed?.event?.gateTrials).toBe(2);
      expect(
        demo.messages.some((m) => m.type === 'result'),
        'the gate scored a trial',
      ).toBe(false);
      // Only now does the scored trial begin, and it is the HOST's item, not a gate instance.
      expect(
        demo.messages.some(
          (m) => (m as { event?: { kind?: string } }).event?.kind === 'scored_begin',
        ),
        'the gate never handed over to the scored item',
      ).toBe(true);
      await sleep(60);
      // The reference type shipped with the gate completing, saying "your turn", and leaving its
      // own locked degenerate instance on screen. The handover has to repaint the served item.
      const chainLength = (servedItem().content as { chain: string[] }).chain.length;
      expect(
        demo.document.querySelectorAll('#chain .mark').length,
        'the machine is still empty after the gate — the served item was not repainted',
      ).toBe(chainLength);
      expect(demo.document.querySelectorAll('#options .opt[disabled]').length).toBe(0);
      expect(demo.document.querySelectorAll('#options .opt.chose,#options .opt.made').length).toBe(
        0,
      );

      // ...and the scored trial is answerable, on one tap, straight after the gate.
      demo.click(demo.options()[1] as Element);
      await sleep(80);
      const scored = demo.messages.filter((m) => m.type === 'result');
      expect(scored.length, 'the item after the gate could not be answered').toBe(1);
      expect(scored[0]?.result?.response?.selectedKey).toBe('B');
      expect(scored[0]?.result?.response?.gateCriterionMet).toBe(1);
      expect(demo.errors).toEqual([]);
    } finally {
      demo.close();
    }
  }, 30_000);

  it('goes straight to the question when no gate is asked for', async () => {
    const demo = openDemo();
    try {
      await sleep(120);
      demo.send({ type: 'init', item: servedItem() });
      demo.send({ type: 'start' });
      await sleep(60);
      demo.click(demo.document.querySelector('#play') as Element);
      await sleep(80);
      expect(
        demo.messages.some(
          (m) => (m as { event?: { kind?: string } }).event?.kind === 'gate_render',
        ),
      ).toBe(false);
      expect(
        demo.messages.some(
          (m) => (m as { event?: { kind?: string } }).event?.kind === 'scored_begin',
        ),
      ).toBe(true);
    } finally {
      demo.close();
    }
  });
});
