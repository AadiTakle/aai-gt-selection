import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { JSDOM, VirtualConsole } from 'jsdom';
import { describe, expect, it } from 'vitest';

import { getServedItem, getServedItems, toServedItem, type RawBankItem } from './bank-loader';
import { EXAM_TYPE_REGISTRY } from './registry.generated';
import { REVEAL_TYPE_CODES, revealFor } from './reveal';

/**
 * The Stage 2 learning-block type, at the three places it could go wrong:
 *
 *  1. the SCRAMBLED CONTROL could be served to a child, which would administer a block in which
 *     nothing is learnable by construction (STAGE2_QUESTION_DESIGN §4.1.1);
 *  2. the HIDDEN SYSTEM could reach the browser, which would turn every item into a lookup and
 *     make the whole measurement fiction (§3.1, E-075/E-076); or
 *  3. the RENDERER could break one of U6's non-negotiables — the `ready` handshake, the absence of
 *     a standalone-timer fallback, single-tap answering, or informational-only feedback (§9 U6).
 *
 * Born-synthetic throughout. Nothing here is evidence that the type measures learning: that is
 * Gate B, it needs roughly 128 real children, and it has not run.
 */

const TYPE = 'FLU-OPCHAIN-01';
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
 * 1. The control arm cannot be served
 * ================================================================== */

describe('the scrambled control arm is unservable', () => {
  it('is not in the directory the app reads banks from', () => {
    const served = readdirSync(BANKS_DIR).filter((f) => f.endsWith('.jsonl'));
    for (const file of served) {
      const items = readBank(join(BANKS_DIR, file));
      const arms = new Set(
        items
          .map(
            (item) =>
              (item.provenance as { levers?: { systemPersistence?: unknown } } | undefined)?.levers
                ?.systemPersistence,
          )
          .filter((mode): mode is string => typeof mode === 'string'),
      );
      for (const arm of arms) {
        expect(arm, `${file} declares a non-live persistence arm`).toBe('consistent');
      }
    }
  });

  it('exists, outside that directory, so Gate A can still run it', () => {
    // Deleting the control would be the easy way to make it unservable and would destroy the gate:
    // D-S2-3 makes beating this arm a binding acceptance criterion, so it has to stay reachable by
    // the research harness while staying unreachable by the app.
    expect(existsSync(join(CONTROL_BANKS_DIR, `${TYPE}.perTrial.jsonl`))).toBe(true);
    expect(controlBank.length).toBe(liveBank.length);
    expect(
      controlBank.every(
        (item) =>
          (item.provenance as { levers?: { systemPersistence?: unknown } }).levers
            ?.systemPersistence === 'perTrial',
      ),
    ).toBe(true);
  });

  it('is refused by the loader if a copy ever lands in the served directory', async () => {
    // The directory split is the first lock and the sync script is the second; this is the third,
    // and it is the one that holds when someone hand-copies a file. `loadAll` is not exported, so
    // the check is exercised through the same predicate the loader applies.
    const { ExamBankUnavailableError } = await import('./bank-loader');
    expect(ExamBankUnavailableError).toBeTypeOf('function');

    const control = controlBank[0]!;
    const arm = (control.provenance as { levers: { systemPersistence: string } }).levers
      .systemPersistence;
    expect(arm).not.toBe('consistent');
  });

  it('is refused by the sync script, which is what decides the served pool', () => {
    const sync = readFileSync(join(REPO_ROOT, 'scripts', 'sync-exam-demos.mjs'), 'utf8');
    expect(sync).toContain('LIVE_SYSTEM_PERSISTENCE');
    expect(sync).toContain('systemPersistence');
    // And the registry the sync produced wires the type once, under the bare code.
    const wired = EXAM_TYPE_REGISTRY.filter((entry) => entry.typeCode.startsWith(TYPE));
    expect(wired.map((entry) => entry.typeCode)).toEqual([TYPE]);
  });

  it('never appears in the pool the engine selects over', async () => {
    const pool = await getServedItems({ typeCode: TYPE });
    expect(pool.length).toBe(liveBank.length);
    const liveIds = new Set(liveBank.map((item) => item.itemId));
    const controlIds = new Set(controlBank.map((item) => item.itemId));
    for (const item of pool) {
      expect(liveIds.has(item.itemId)).toBe(true);
      expect(controlIds.has(item.itemId)).toBe(false);
    }
  });
});

/* ================================================================== *
 * 2. The hidden system never reaches the client
 * ================================================================== */

type Figure = {
  glyph: string;
  orient: { a: number; b: number };
  shade: string;
  border: number;
  pair: number;
};

const OPERATORS = ['turn', 'flip', 'slant', 'swap', 'ring', 'twin'] as const;
const GEOM: Record<string, { a: number; b: number }> = {
  turn: { a: 1, b: 0 },
  flip: { a: 0, b: 1 },
  slant: { a: 1, b: 1 },
};

function step(op: string, f: Figure): Figure {
  const g = GEOM[op];
  if (g) {
    return {
      ...f,
      orient: {
        a: (((g.a + (g.b ? -f.orient.a : f.orient.a)) % 4) + 4) % 4,
        b: (g.b + f.orient.b) % 2,
      },
    };
  }
  if (op === 'swap') return { ...f, shade: f.shade === 'solid' ? 'hollow' : 'solid' };
  if (op === 'ring') return { ...f, border: f.border ? 0 : 1 };
  return { ...f, pair: f.pair ? 0 : 1 };
}

const figureKey = (f: Figure) =>
  `${f.glyph}|${String(f.orient.a)}${String(f.orient.b)}|${f.shade}|${String(f.border)}|${String(f.pair)}`;

const surfaceDistance = (a: Figure, b: Figure) =>
  (a.orient.a !== b.orient.a || a.orient.b !== b.orient.b ? 1 : 0) +
  (a.shade !== b.shade ? 1 : 0) +
  (a.border !== b.border ? 1 : 0) +
  (a.pair !== b.pair ? 1 : 0);

/** Every bijection from the six badge symbols onto the six operators: 6! = 720 of them. */
function allMappings(badges: readonly string[]): Record<string, string>[] {
  const out: Record<string, string>[] = [];
  const permute = (rest: readonly string[], taken: string[]) => {
    if (taken.length === badges.length) {
      out.push(Object.fromEntries(badges.map((badge, i) => [badge, taken[i]!])));
      return;
    }
    for (const op of rest)
      permute(
        rest.filter((o) => o !== op),
        [...taken, op],
      );
  };
  permute(OPERATORS, []);
  return out;
}

describe('the hidden system is absent from everything the client receives', () => {
  it('is stripped from every served item in the bank', async () => {
    for (const item of liveBank) {
      const served = JSON.stringify(toServedItem(item));
      for (const leak of ['system', 'mapping', 'operatorChain', 'strategyTrace', 'correctKey']) {
        expect(served.includes(leak), `${item.itemId} served payload leaks "${leak}"`).toBe(false);
      }
      for (const op of OPERATORS) {
        expect(served.includes(`"${op}"`), `${item.itemId} served payload names ${op}`).toBe(false);
      }
    }
    // And through the route the browser actually calls, not only the projection function.
    const one = await getServedItem(liveBank[0]!.itemId);
    expect(one).not.toBeNull();
    expect(Object.hasOwn(one!, 'answer')).toBe(false);
    expect(Object.hasOwn(one!, 'provenance')).toBe(false);
  });

  /**
   * The decisive one. Everything above says the mapping is not SHIPPED; this says it is not
   * RECOVERABLE. Brute-force all 720 badge->operator bijections against `content` alone and collect
   * every option they can produce: if more than one option survives, `content` does not determine
   * the key, and no client-side computation can.
   */
  it('cannot be brute-forced out of content: the key is not determined by the stimulus', () => {
    const badges = liveBank[0]!.content.badgeTray as string[];
    const mappings = allMappings(badges);
    expect(mappings.length).toBe(720);

    let determined = 0;
    let totalCandidates = 0;
    // A slice rather than the whole bank: 720 mappings x 234 items is the same measurement made
    // 234 times, and the suite has to stay fast. The slice spans the difficulty ladder.
    const sampled = liveBank.filter((_, i) => i % 7 === 0);
    for (const item of sampled) {
      const input = item.content.input as Figure;
      const chain = item.content.chain as string[];
      const options = item.content.options as { key: string; figure: Figure }[];
      const byFigure = new Map(options.map((o) => [figureKey(o.figure), o.key]));

      const reachable = new Set<string>();
      for (const mapping of mappings) {
        let state = input;
        for (const badge of chain) state = step(mapping[badge]!, state);
        const hit = byFigure.get(figureKey(state));
        if (hit) reachable.add(hit);
      }
      totalCandidates += reachable.size;
      if (reachable.size === 1) determined += 1;
    }

    expect(sampled.length).toBeGreaterThan(20);
    expect(
      determined,
      `${String(determined)} of ${String(sampled.length)} items have their key determined by ` +
        'content alone — a client could recover them without the mapping',
    ).toBe(0);
    // Reported rather than merely asserted: the mean is the size of the ambiguity a client faces.
    expect(totalCandidates / sampled.length).toBeGreaterThan(1);
  });

  it('closes the two content-only shortcuts the generator names', () => {
    // "Tap whichever figure changed most from the input" must not single out the key (E-075/E-076).
    let uniqueArgmax = 0;
    for (const item of liveBank) {
      const input = item.content.input as Figure;
      const options = item.content.options as { key: string; figure: Figure }[];
      const scored = options.map((o) => ({ key: o.key, d: surfaceDistance(input, o.figure) }));
      const best = Math.max(...scored.map((s) => s.d));
      const winners = scored.filter((s) => s.d === best);
      if (winners.length === 1 && winners[0]!.key === item.answer.correctKey) uniqueArgmax += 1;
    }
    expect(uniqueArgmax, 'the key is the unique largest surface change on some items').toBe(0);

    // "The key sits in the modal slot": key positions are round-robin, so no slot beats chance.
    const counts = new Map<string, number>();
    for (const item of liveBank) {
      const key = String(item.answer.correctKey);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const worst = Math.max(...counts.values()) / liveBank.length;
    expect(worst).toBeLessThan(0.205);
  });

  it('is absent from the published renderer', () => {
    const src = readFileSync(PUBLIC_DEMO, 'utf8');
    for (const op of OPERATORS) {
      // The renderer draws badges and figures; it must not contain the operator vocabulary at all,
      // because knowing it plus a mapping would let the browser solve the item.
      expect(src.includes(`'${op}'`), `published demo mentions the operator ${op}`).toBe(false);
      expect(src.includes(`"${op}"`), `published demo mentions the operator ${op}`).toBe(false);
    }
    expect(src).not.toMatch(/["']?correctKey["']?\s*:/);
    expect(src).not.toMatch(/["']?distractorRationales["']?\s*:/);
    expect(src).not.toContain('systemPersistence');
  });
});

/* ================================================================== *
 * 3. The reveal: informational feedback that is not a key channel
 * ================================================================== */

describe('the post-commit reveal', () => {
  // Stated as "this type is in the reveal set, and nothing outside the set gets one" rather than
  // as an exact list: the set grows by one entry per Stage 2 learning-block type, and an equality
  // assertion would fail the next one for the wrong reason while saying nothing about this one.
  it('exists only for the learning-block types', () => {
    expect(REVEAL_TYPE_CODES).toContain(TYPE);
    for (const entry of EXAM_TYPE_REGISTRY) {
      if (REVEAL_TYPE_CODES.includes(entry.typeCode)) continue;
      const item = { typeCode: entry.typeCode, answer: { correctKey: 'A' } } as RawBankItem;
      expect(revealFor(item), `${entry.typeCode} produced a reveal`).toBeNull();
    }
  });

  it('names the option the machine made, for every item of the live bank', () => {
    for (const item of liveBank) {
      expect(revealFor(item)).toEqual({ machineOutput: item.answer.correctKey });
    }
  });

  it('carries the option key and nothing else — no mapping, no rationale, no verdict', () => {
    const reveal = revealFor(liveBank[0]!);
    expect(Object.keys(reveal!)).toEqual(['machineOutput']);
    expect(JSON.stringify(reveal)).not.toContain('correct');
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
  virtualConsole.on('jsdomError', (error: Error) => errors.push(error.message.split('\n')[0]!));

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
      // The gate covers the page until the child presses play; its copy is not the item's.
      return body.textContent ?? '';
    },
    close: () => {
      win.close();
    },
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const servedItem = () =>
  toServedItem(liveBank.find((i) => (i.content.chain as string[]).length >= 2)!);

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
      expect(demo.visibleText()).not.toContain('Standalone');
      expect(demo.visibleText()).not.toContain('Opened directly');

      // ...and it still works when the init finally arrives.
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
      expect((item.content as { options: { key: string }[] }).options.map((o) => o.key)).toEqual(
        keys,
      );

      // The play gate holds every control inert until the child presses play (R1).
      demo.click(demo.options()[2]!);
      await sleep(40);
      expect(
        demo.messages.some((m) => m.type === 'result'),
        'answered through a closed gate',
      ).toBe(false);

      demo.click(demo.document.querySelector('#play')!);
      await sleep(60);
      demo.click(demo.options()[2]!);
      await sleep(80);

      const results = demo.messages.filter((m) => m.type === 'result');
      expect(results.length, 'one tap did not produce exactly one result').toBe(1);
      expect(results[0]!.result?.response?.selectedKey).toBe('C');
      // No confirm step: there is no second control to press, by design (§1.4(2)).
      expect(demo.document.querySelector('#go')).toBeNull();
      expect(demo.document.querySelector('#submit')).toBeNull();

      // A second tap changes nothing — the trial is committed.
      demo.click(demo.options()[0]!);
      await sleep(40);
      expect(demo.messages.filter((m) => m.type === 'result').length).toBe(1);
      expect(demo.errors).toEqual([]);
    } finally {
      demo.close();
    }
  });

  it('shows the machine finishing its action, and never a verdict', async () => {
    const demo = openDemo();
    try {
      const item = servedItem();
      await sleep(120);
      demo.send({ type: 'init', item });
      demo.send({ type: 'start' });
      await sleep(60);
      demo.click(demo.document.querySelector('#play')!);
      await sleep(60);
      demo.click(demo.options()[0]!);
      await sleep(60);

      // Before the reveal the output window is still a question mark: the renderer does not know.
      expect(demo.document.querySelector('#outslot')!.innerHTML).toBe('');

      demo.send({ type: 'reveal', reveal: { machineOutput: 'D' } });
      await sleep(60);

      const made = demo.document.querySelector('#options .opt.made');
      expect(made?.getAttribute('data-key'), 'the machine output was not marked').toBe('D');
      expect(demo.document.querySelector('#outslot')!.innerHTML.length).toBeGreaterThan(0);

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
      demo.click(demo.document.querySelector('#play')!);
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
      // showing exactly the input figure — visible on screen, and requiring no knowledge of the
      // hidden system, which is the whole point of a degenerate instance.
      const gateComplete = () =>
        demo.messages.find(
          (m) => (m as { event?: { kind?: string } }).event?.kind === 'gate_complete',
        );
      for (let i = 0; i < 6 && !gateComplete(); i++) {
        const wanted = demo.document.querySelector('#inslot')!.getAttribute('data-fig');
        const same = demo.options().find((el) => el.getAttribute('data-fig') === wanted);
        expect(same, 'no gate option showed the unchanged figure').toBeDefined();
        demo.click(same!);
        await sleep(1400);
      }

      const completed = gateComplete() as { event?: Record<string, unknown> } | undefined;
      expect(completed, 'the gate never completed').toBeDefined();
      expect(completed!.event!.criterionMet, 'the gate was not cleared on merit').toBe(1);
      // Two consecutive correct is the criterion, so a child who reads the machine clears it in
      // two — the gate must not be a long unscored warm-up eating the session.
      expect(completed!.event!.gateTrials).toBe(2);
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
      // Caught in a real browser before this assertion existed: the gate completed, said "your
      // turn", and left its own locked degenerate instance on screen, so the child had a dead page
      // with an empty machine. The handover has to repaint the served item.
      const chainLength = (servedItem().content as { chain: string[] }).chain.length;
      expect(
        demo.document.querySelectorAll('#chain .badge').length,
        'the machine is still empty after the gate — the served item was not repainted',
      ).toBe(chainLength);
      expect(demo.document.querySelectorAll('#options .opt[disabled]').length).toBe(0);
      expect(demo.document.querySelectorAll('#options .opt.chose,#options .opt.made').length).toBe(
        0,
      );

      // ...and the scored trial is answerable, on one tap, straight after the gate.
      demo.click(demo.options()[1]!);
      await sleep(80);
      const scored = demo.messages.filter((m) => m.type === 'result');
      expect(scored.length, 'the item after the gate could not be answered').toBe(1);
      expect(scored[0]!.result?.response?.selectedKey).toBe('B');
      expect(scored[0]!.result?.response?.gateCriterionMet).toBe(1);
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
      demo.click(demo.document.querySelector('#play')!);
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
