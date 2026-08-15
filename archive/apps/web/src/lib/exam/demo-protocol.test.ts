import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { JSDOM, VirtualConsole, type DOMWindow } from 'jsdom';
import { afterAll, describe, expect, it } from 'vitest';

import type { ServedItem } from '@gt-selection/exam-engine';

import { getServedIndex, getServedItem } from './bank-loader';
import { EXAM_TYPE_REGISTRY } from './registry.generated';

/**
 * Drives every PUBLISHED demo through the real embedding protocol (BUILD_PLAN
 * §2) in a headless DOM: `{type:'init', item:ServedItem}` -> `{type:'start'}` ->
 * simulated child interaction -> `{type:'result'}`.
 *
 * This runs against `public/exam-demos/` — the copies the app actually serves,
 * after `scripts/sync-exam-demos.mjs` has applied its compat patches — so it
 * proves the demo a child gets can be completed, not just that the source looks
 * compliant. It is the gate that stops a new bank from wiring a renderer that
 * renders but can never be answered (which the host can only resolve by timing
 * the item out after four minutes).
 *
 * It asks that of each demo TWICE OVER, on one document. A Stage 1 burst asks
 * two or three items of a single type back to back and a Stage 2 activity asks
 * thirty, so the runner keeps ONE demo instance alive for the run and re-inits
 * it per item rather than reloading the page under the child. That is only safe
 * while every demo fully resets its per-item state on `init`, which is the
 * second half of this file (`driveBurst`).
 *
 * Born-synthetic fixtures only.
 */

const PUBLIC_DEMOS = join(process.cwd(), 'public', 'exam-demos');
const RUNNER_SOURCE = join(process.cwd(), 'src', 'components', 'exam', 'exam-runner.tsx');

/** Visual APIs the interactive demos assume that jsdom does not implement. */
function installVisualPolyfills(window: Window & typeof globalThis) {
  const noop = () => undefined;
  const animation = {
    finished: Promise.resolve(),
    cancel: noop,
    play: noop,
    pause: noop,
    addEventListener: noop,
    removeEventListener: noop,
  };
  const element = window.Element.prototype as unknown as Record<string, unknown>;
  element.animate = () => animation;
  element.getAnimations = () => [];
  element.scrollIntoView = noop;
  element.setPointerCapture = noop;
  element.releasePointerCapture = noop;
  element.hasPointerCapture = () => false;

  const context2d = new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (prop === 'measureText') return () => ({ width: 10 });
        if (prop === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
        if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
          return () => ({ addColorStop: noop });
        }
        return () => undefined;
      },
      set: () => true,
    },
  );
  const canvas = window.HTMLCanvasElement.prototype as unknown as Record<string, unknown>;
  canvas.getContext = () => context2d;
  canvas.toDataURL = () => 'data:,';

  const svg = window.SVGElement?.prototype as unknown as Record<string, unknown> | undefined;
  if (svg) {
    svg.getBBox ??= () => ({ x: 0, y: 0, width: 10, height: 10 });
    svg.getScreenCTM ??= () => ({ inverse: () => ({}) });
    svg.getComputedTextLength ??= () => 10;
  }

  // Some demos branch on reduced-motion at init and throw without this.
  (window as unknown as Record<string, unknown>).matchMedia ??= () => ({
    matches: false,
    addListener: noop,
    removeListener: noop,
    addEventListener: noop,
    removeEventListener: noop,
  });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const OPTION_SELECTOR =
  '.opt,.option,.choice,.cand,.tile,.card,.pick,.place,.side,' +
  '[data-key],[data-i],[data-idx],[data-opt],[data-index],[data-cell],[data-tile]';
const SUBMIT_SELECTOR =
  '#go,#lock,#submit,#check,#confirm,#done,#commit,.go,.submit,.lock,[data-go]';
/**
 * Controls that unlock submission (watch the roll, fold the net, step the path).
 * Some are staged rather than one-shot: FLU-DEDUCE-01 reveals one clue per press
 * of `#nextclue` and refuses to submit until every clue is showing, so a driver
 * that clicks each control once never reaches an answerable state.
 */
const PRIME_SELECTOR = '#play,#foldBtn,#step,#replay,#nextclue,#reveal';
/** Max presses per prime control, for the staged ones. */
const PRIME_PRESSES = 8;

/**
 * `#play` first, whatever its DOM position. The R1 play gate keeps every other
 * control inert until the child presses play, and the gate markup is the last
 * child of `#wrap`, so a sweep in document order primes the staged controls (one
 * clue per press, one fold per press) and the submit button while they are still
 * no-ops, then releases the gate with nothing left to click.
 */
function playFirst(elements: Element[]): Element[] {
  return [
    ...elements.filter((el) => el.id === 'play'),
    ...elements.filter((el) => el.id !== 'play'),
  ];
}

/** A demo's `{type:'result'}` payload, as the harness reads it. */
interface DemoResult {
  itemId?: string;
  response?: unknown;
  metrics?: Record<string, number>;
  telemetry?: Record<string, unknown>[];
}

/** Anything a demo posts to the host. */
interface DemoMessage {
  type?: string;
  result?: DemoResult;
  event?: Record<string, unknown>;
}

interface DemoRun {
  ready: boolean;
  rendered: boolean;
  /**
   * Did `init` + `start` visibly change the document?
   *
   * Distinct from {@link rendered}, which asks whether the body GREW. The first item of a mount
   * draws into an empty skeleton, so growth is the right probe there; a second item of the same
   * type draws over the first and can land on markup of identical length. This is the question
   * that survives reuse.
   */
  repainted: boolean;
  /** Did the demo post anything of its own (telemetry) while taking `init` + `start`? */
  announced: boolean;
  /**
   * Did interacting after `start` visibly change anything — new telemetry, a
   * result, or a DOM update (selection highlight, submit control enabling)?
   * A demo whose input handlers early-return changes nothing at all.
   */
  reactedToInput: boolean;
  result: DemoResult | null;
  /** The `{type:'telemetry'}` payloads emitted inside THIS item's window. */
  telemetryEvents: Record<string, unknown>[];
  /**
   * Wall time from this item's `init` to the end of its drive. Every clock the demo reports for
   * the item (`M-RT`, `M-RTFIRST`) has to fit inside it, or it is still counting a previous item.
   */
  elapsedMs: number;
  /** Uncaught document errors thrown inside THIS item's window. */
  errors: string[];
}

/**
 * How many distinct interaction idioms {@link runItem} knows. Each is tried in
 * a FRESH document — replaying them into one document lets an earlier strategy
 * leave the demo mid-animation or locked, which looks like a protocol failure.
 */
const STRATEGY_COUNT = 8;

/** How often the engagement probe blurs the demo, when asked for (see {@link ItemProbes}). */
const BLUR_PROBE_MS = 250;

/**
 * A demo document, mounted once, able to take more than one item.
 *
 * Mounting is separate from driving because that is how the runner uses a demo: a burst serves
 * several items of ONE type through ONE loaded document, so the interesting question is not only
 * "does this demo answer an item" but "does it answer the NEXT one".
 */
interface MountedDemo {
  readonly window: DOMWindow;
  readonly document: Document;
  /** Did the demo announce `{type:'ready'}` as its document loaded? Once per document, not per item. */
  readonly ready: boolean;
  /** Every message the demo has posted, in order, across every item this document has taken. */
  readonly messages: DemoMessage[];
  /** Every uncaught error the document has thrown, in order, across every item. */
  readonly errors: string[];
  send: (message: Record<string, unknown>) => void;
  close: () => void;
}

/** Load one published demo into a headless DOM and wait for its `ready`. */
async function mountDemo(typeCode: string): Promise<MountedDemo> {
  const messages: DemoMessage[] = [];
  const hostWindow = { postMessage: (message: unknown) => messages.push(message as never) };

  const errors: string[] = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (error: Error) => errors.push(error.message.split('\n')[0]!));

  const dom = new JSDOM(readFileSync(join(PUBLIC_DEMOS, `${typeCode}.html`), 'utf8'), {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole,
    url: `http://localhost/exam-demos/${typeCode}.html`,
    beforeParse(window) {
      // The demos detect embedding via `window.parent !== window`; this must be
      // in place before their scripts evaluate.
      Object.defineProperty(window, 'parent', { configurable: true, get: () => hostWindow });
      // A published demo must never reach the network (see the no-leak test).
      window.fetch = () => Promise.reject(new Error('network blocked in test'));
      installVisualPolyfills(window as unknown as Window & typeof globalThis);
    },
  });

  const win = dom.window;
  await sleep(200);

  return {
    window: win,
    document: win.document,
    ready: messages.some((m) => m.type === 'ready'),
    messages,
    errors,
    send: (message: Record<string, unknown>) => {
      const event = new win.MessageEvent('message', {
        data: { source: 'gt-exam-host', ...message },
        origin: 'http://localhost',
      });
      Object.defineProperty(event, 'source', { value: hostWindow });
      win.dispatchEvent(event);
    },
    close: () => {
      win.close();
    },
  };
}

interface ItemProbes {
  /**
   * Blur the demo while this item is being answered, so its engagement counter (`M-ENGAGE`) is
   * provably non-zero. Used on the FIRST item of a burst: a second item that reports a non-zero
   * count without ever having been blurred is reporting the first item's.
   *
   * Most demos emit telemetry on blur, which inflates {@link DemoRun.reactedToInput} for the item
   * it is applied to — so it is opt-in, and never applied to the item whose reaction is asserted.
   */
  blurWhileAnswering?: boolean;
}

/**
 * Put ONE item through a mounted demo: `init` -> `start` -> one interaction idiom, and report what
 * the demo did with it. Everything reported is scoped to this item's window, so the same document
 * can be asked again for the next item of a burst.
 */
async function runItem(
  demo: MountedDemo,
  item: ServedItem,
  strategyIndex: number,
  probe: ItemProbes = {},
): Promise<DemoRun> {
  const win = demo.window;
  const doc = demo.document;
  const messages = demo.messages;
  const messageFloor = messages.length;
  const errorFloor = demo.errors.length;
  const send = demo.send;
  /** Only what this item produced — the document may already have answered earlier ones. */
  const mine = () => messages.slice(messageFloor);

  const startedAt = Date.now();
  const lengthBefore = doc.body.innerHTML.length;
  const htmlBefore = doc.body.innerHTML;
  send({ type: 'init', item });
  await sleep(150);
  const rendered = doc.body.innerHTML.length !== lengthBefore;
  const paintedOnInit = doc.body.innerHTML !== htmlBefore;
  const htmlAfterInit = doc.body.innerHTML;
  send({ type: 'start' });
  await sleep(200);
  const repainted = paintedOnInit || doc.body.innerHTML !== htmlAfterInit;
  const announced = messages.length > messageFloor;

  const click = (el: Element) =>
    el.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true }));
  const press = (el: Element) => {
    for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup']) {
      el.dispatchEvent(new win.MouseEvent(type, { bubbles: true, cancelable: true }));
    }
  };
  const select = (el: Element) => {
    click(el);
    press(el);
  };
  const hasResult = () => mine().some((m) => m.type === 'result');
  const submit = async () => {
    for (const el of doc.querySelectorAll(SUBMIT_SELECTOR)) {
      click(el);
      await sleep(40);
    }
  };
  const options = () => [...doc.querySelectorAll(OPTION_SELECTOR)];

  // The demos span multiple interaction idioms (multiple choice, animation-
  // gated choice, canvas/SVG placement, keyboard, two-step swap), so try each
  // in turn and stop as soon as the demo commits a result. A demo that
  // survives all of them cannot be completed by a child either.
  const strategies: (() => Promise<void>)[] = [
    // straight multiple choice
    async () => {
      const [first] = options();
      if (first) select(first);
      await sleep(120);
      await submit();
    },
    // one option at a time, confirming after each
    async () => {
      for (const option of options().slice(0, 14)) {
        select(option);
        await sleep(60);
        await submit();
        if (hasResult()) return;
      }
    },
    // two-step construction (e.g. swap two cards to build a value)
    async () => {
      const opts = options();
      for (let i = 0; i < Math.min(opts.length, 6) && !hasResult(); i++) {
        for (let j = i + 1; j < Math.min(opts.length, 6) && !hasResult(); j++) {
          select(opts[i]!);
          await sleep(50);
          select(opts[j]!);
          await sleep(50);
          await submit();
        }
      }
    },
    // animation-gated: watch the roll / fold the net first
    async () => {
      for (const el of playFirst([...doc.querySelectorAll(PRIME_SELECTOR)])) {
        for (let press = 0; press < PRIME_PRESSES; press++) {
          click(el);
          await sleep(press === 0 ? 800 : 80);
        }
      }
      await sleep(400);
      for (const option of options().slice(0, 14)) {
        select(option);
        await sleep(60);
        await submit();
        if (hasResult()) return;
      }
    },
    // any button at all (some demos commit straight from a control)
    async () => {
      for (const button of playFirst([...doc.querySelectorAll('button')]).slice(0, 30)) {
        click(button);
        await sleep(40);
        if (hasResult()) return;
      }
    },
    // canvas / SVG placement targets
    async () => {
      const targets = [
        ...doc.querySelectorAll('svg *[data-i],svg *[data-key],rect,polygon,circle,path'),
      ].slice(0, 30);
      for (const target of targets) {
        select(target);
        await sleep(20);
      }
      await submit();
    },
    // time-boxed stimulus (a flash exposure that must finish before the
    // answer controls accept input)
    async () => {
      await sleep(1400);
      for (const option of options().slice(0, 14)) {
        select(option);
        await sleep(60);
        await submit();
        if (hasResult()) return;
      }
    },
    // keyboard-driven. The R1 play gate holds the key handlers inert like every
    // other control, so the gate has to be released before any key does
    // anything — a child presses play, then types.
    async () => {
      for (const el of doc.querySelectorAll('#play')) {
        click(el);
        await sleep(200);
      }
      for (const key of ['1', '2', 'a', 'A', 'ArrowRight', 'Enter', ' ']) {
        for (const type of ['keydown', 'keyup']) {
          doc.dispatchEvent(new win.KeyboardEvent(type, { key, bubbles: true }));
        }
        await sleep(50);
        if (hasResult()) return;
      }
      await submit();
    },
  ];

  const blurProbe = probe.blurWhileAnswering
    ? setInterval(() => win.dispatchEvent(new win.Event('blur')), BLUR_PROBE_MS)
    : undefined;
  const messagesBefore = messages.length;
  const domBefore = doc.body.innerHTML;
  try {
    await strategies[strategyIndex]?.();
    await sleep(120);
  } finally {
    if (blurProbe !== undefined) clearInterval(blurProbe);
  }

  return {
    ready: demo.ready,
    rendered,
    repainted,
    announced,
    reactedToInput: messages.length > messagesBefore || doc.body.innerHTML !== domBefore,
    result: mine().find((m) => m.type === 'result')?.result ?? null,
    telemetryEvents: mine().flatMap((m) => (m.type === 'telemetry' && m.event ? [m.event] : [])),
    elapsedMs: Date.now() - startedAt,
    errors: demo.errors.slice(errorFloor),
  };
}

/**
 * One item, one fresh document — the single-item case, unchanged.
 */
async function driveDemo(
  typeCode: string,
  itemId: string,
  strategyIndex: number,
): Promise<DemoRun> {
  const item = await getServedItem(itemId);
  if (!item) throw new Error(`no served item ${itemId}`);
  const demo = await mountDemo(typeCode);
  try {
    return await runItem(demo, item, strategyIndex);
  } finally {
    demo.close();
  }
}

/**
 * How long the host takes to serve the next item of a burst — it posts the answer, waits for the
 * server's verdict, and only then inits the next one. Left in deliberately: it means a clock the
 * demo failed to restart comes back measurably too large rather than marginally so.
 */
const BURST_GAP_MS = 600;

/**
 * TWO items of one type through ONE document, the way a burst is served.
 *
 * The first item is taken to a committed answer, and only then is the second one sent — so the
 * demo receives `init` while it is holding `committed=true`, a locked option set and a spent
 * clock. A demo that does not reset all of that on `init` refuses the second answer, and the host
 * can only resolve that by timing the item out after four minutes.
 */
async function driveBurst(
  typeCode: string,
  first: ServedItem,
  second: ServedItem,
  strategyIndex: number,
  probe: ItemProbes = {},
): Promise<{ first: DemoRun; second: DemoRun }> {
  const demo = await mountDemo(typeCode);
  try {
    const one = await runItem(demo, first, strategyIndex, probe);
    await sleep(BURST_GAP_MS);
    const two = await runItem(demo, second, strategyIndex);
    return { first: one, second: two };
  } finally {
    demo.close();
  }
}

/**
 * Slack on the per-item clock bound. A demo times itself from inside the document while the
 * harness times the item from outside it, so the two can disagree by a tick. They cannot disagree
 * by the whole of a previous item, which is what a clock that never restarted looks like.
 */
const CLOCK_SLACK_MS = 250;

/** For the reuse table. `—` when the demo did not report the metric at all. */
function round(value: number | undefined): string {
  return typeof value === 'number' ? String(Math.round(value)) : '\u2014';
}

/** As reported, unrounded — `M-ENGAGE` is a count in some demos and a fraction in others. */
function raw(value: number | undefined): string {
  return typeof value === 'number' ? String(value) : '\u2014';
}

/** One line per type: what each demo did with the second item of a burst. Printed after the run. */
const REUSE_TABLE: string[] = [];

/**
 * The demos that report `M-ENGAGE` as the FRACTION of the item spent focused.
 *
 * Every other demo reports how much focus was LOST — a count of blurs, or milliseconds blurred —
 * for which the clean value on an item nobody blurred is 0. For these seven it is 1, so a test
 * that asserted 0 across both families would be asserting that the child never looked at the
 * question. The split is a real inconsistency in how one closed-vocabulary metric id is being
 * used, and it is not this file's to resolve; it is recorded here, rather than sniffed out of each
 * demo's source, so that a new demo joining the wrong family has to be an explicit edit.
 */
const ENGAGEMENT_IS_A_FOCUSED_SHARE = new Set([
  'QUANT-BALANCE-01',
  'QUANT-DOTS-01',
  'QUANT-FUNC-01',
  'QUANT-GRAPH-01',
  'QUANT-MATRIX-01',
  'QUANT-MIX-01',
  'QUANT-SERIES-01',
]);

/**
 * How focused an item nobody blurred has to look. The harness blurs the first item of the burst
 * and never the second, so the second should come back at 1; the floor leaves room for the tick of
 * accounting a demo does between `init` and its first focus sample, and still fails a share
 * averaged with the blurred item's.
 */
const UNBLURRED_SHARE_FLOOR = 0.9;

describe('published demos speak the embedding protocol', () => {
  it('publishes exactly the wired registry types', async () => {
    const { readdirSync } = await import('node:fs');
    const published = readdirSync(PUBLIC_DEMOS).sort();
    const expected = EXAM_TYPE_REGISTRY.map((t) => `${t.typeCode}.html`).sort();
    expect(published).toEqual(expected);
  });

  /**
   * The other half of the reuse case.
   *
   * The per-type tests below prove that a demo TOLERATES a second item on one document. What they
   * cannot see is whether the runner actually sends one, and that is a single React detail: the
   * iframe's `key`. Keyed on the item id, React tears the frame down and reloads the identical page
   * for every item of a burst, which is what made two or three parts of one question read as the
   * same question asked repeatedly. Keyed on the demo it loads, the instance survives the burst and
   * still changes when the TYPE changes. Asserted by shape, as the reveal dispatch is in
   * `stage2-reveal.test.ts`, because there is no cheaper place to notice it going back.
   */
  it('keys the demo iframe on the demo, so one instance serves a whole burst', () => {
    const runner = readFileSync(RUNNER_SOURCE, 'utf8');
    const iframe = /<iframe\b([\s\S]*?)\/>/.exec(runner);
    expect(iframe, 'the runner no longer renders the demo in an iframe').not.toBeNull();
    const attributes = iframe![1]!;
    const key = /key=\{([^}]*)\}/.exec(attributes)?.[1];
    const src = /src=\{([^}]*)\}/.exec(attributes)?.[1];

    expect(key, 'the demo iframe has no key, so React keys it by position').toBeDefined();
    expect(
      key,
      'the demo iframe is keyed on something other than the demo it loads — a frame keyed per ' +
        'item reloads the same page under the child for every item of a burst',
    ).toBe(src);
    expect(src, 'the demo iframe src is not derived from the demo path').toMatch(/demo/i);
  });

  /**
   * Types the generic robot driver cannot complete unattended. These are DRIVER
   * limitations, not demo defects — each needs a bespoke interaction (time-boxed
   * flash exposure, a two-card swap, a multi-step animation) that a scripted
   * click sequence does not reproduce reliably in a headless DOM. Each was
   * driven to a `{type:'result'}` manually; they are still held to the
   * interactivity assertion below, which is what catches the "renders but can
   * never be answered" failure mode.
   */
  const DRIVER_CANNOT_COMPLETE = new Set<string>([
    // Constructed-response types wired once their server verifiers landed. Each
    // needs an artefact built over many ordered interactions, which a scripted
    // click sweep cannot produce. These have stronger evidence than the driver
    // could give anyway: the verifier suites round-trip a real emitted response
    // for every item of each bank through `verify()`, in both directions.
    'WM-corsi-01', // must reproduce a cell sequence shown on a timed schedule
    'WM-bind-01', // must place each creature in the house it was bound to
    // n-back that now asks a seen/new question of every decidable bubble: a block
    // reports only once 8-28 answers have been given, and the driver presses each
    // control a handful of times. Verified by removing this entry: the demo reacts to
    // input and answers the first bubbles, then the run ends mid-stream.
    'WM-bubble-01',
    // Every card has to be inserted into the line, one insertion point at a time,
    // before the check unlocks — and the play gate covers the line until then.
    'VER-SENSE-01', // must build the one sensible ordering by ordered insertion
    'FLU-CONCEPT-01', // must run probes against the gate before a verdict is offered
    'GB-TRACK-01', // must track moving targets through swap phases
    'SPA-MAZE-01', // must walk a legal path to the goal collecting every gem
    'SPA-PUNCH-01', // must mark the unfolded hole set
    'SPA-XPLANE-01', // must dial a cutting plane to a quantised setting
  ]);

  /**
   * The interaction idiom that drove each type furthest, remembered across the two tests below.
   *
   * The strategy sweep is what makes this file slow — up to eight mounted documents per type — and
   * the burst test needs exactly the idiom the test above has just found. So it is passed along
   * rather than re-derived. The burst test still sweeps for itself when the entry is missing
   * (running alone under `-t`, or the test above having failed), so nothing here is load-bearing
   * for correctness; it only saves the work.
   */
  const SETTLED_STRATEGY = new Map<string, number>();

  for (const type of EXAM_TYPE_REGISTRY) {
    it(`${type.typeCode} renders a served item and stays answerable`, async () => {
      const index = await getServedIndex();
      const candidate = index.find((i) => i.typeCode === type.typeCode);
      expect(candidate, `${type.typeCode} has no bank item`).toBeDefined();

      let run = await driveDemo(type.typeCode, candidate!.itemId, 0);
      const first = run;
      let settled = 0;
      for (let i = 1; i < STRATEGY_COUNT && run.result === null; i++) {
        const next = await driveDemo(type.typeCode, candidate!.itemId, i);
        if (next.result || (!run.reactedToInput && next.reactedToInput)) {
          run = next;
          settled = i;
        }
      }
      SETTLED_STRATEGY.set(type.typeCode, settled);

      expect(first.ready, `${type.typeCode} never sent {type:'ready'}`).toBe(true);
      expect(first.rendered, `${type.typeCode} rendered nothing on init`).toBe(true);

      // The FOLDNET failure mode: a demo that renders but whose input handlers
      // early-return because `start` never unlocked it. Such a demo emits no
      // further telemetry however the child interacts, can never be answered,
      // and the host can only time the item out after four minutes.
      expect(
        run.reactedToInput,
        `${type.typeCode} did not react to any interaction after {type:'start'} — ` +
          'it renders but cannot be answered',
      ).toBe(true);

      if (!DRIVER_CANNOT_COMPLETE.has(type.typeCode)) {
        expect(run.result, `${type.typeCode} never emitted {type:'result'}`).not.toBeNull();

        // The runner needs numeric metrics to advance metric coverage.
        const metrics = run.result?.metrics ?? {};
        for (const id of ['M-RT', 'M-RTFIRST']) {
          expect(typeof metrics[id], `${type.typeCode} ${id}`).toBe('number');
        }
        // What the demo emits must match what the registry claims, or the
        // engine's coverage model (and the stop rule derived from it) is wrong.
        for (const id of Object.keys(metrics)) {
          expect(
            type.metrics.includes(id),
            `${type.typeCode} emitted ${id} but the registry does not list it — re-run the sync`,
          ).toBe(true);
        }
      }
      // 120s, not 60s: each case mounts up to STRATEGY_COUNT jsdom documents and runs their
      // scripts, so a loaded machine pushes a healthy case past a 60s budget and the file goes
      // red in a later case that passes when run alone. Nothing here asserts on speed, and a
      // demo that genuinely hangs still fails well inside 120s.
    }, 120_000);

    /**
     * BURST REUSE: the same document, asked for a second item after the first was committed.
     *
     * Stage 1 asks two or three items of ONE type back to back, each aimed by how the previous
     * ones went (`planNextSelection`, packages/exam-engine/src/burst.ts), and Stage 2 asks thirty.
     * The runner keeps one demo instance alive for the run — a reload per item makes a burst read
     * as the same question three times over — so every item after the first arrives at a document
     * that is already showing a committed answer.
     *
     * That is only safe while a demo fully resets its per-item state on `init`. One that carries
     * `committed=true` into the next item refuses to accept an answer at all, and the host can
     * only resolve that by timing the item out after four minutes. One that carries its CLOCKS or
     * its telemetry buffer instead fails silently and corrupts `M-RT`/`M-RTFIRST`, which is worse.
     */
    it(`${type.typeCode} accepts a second item on the document the first was committed in`, async () => {
      const index = await getServedIndex();
      const pool = index.filter((i) => i.typeCode === type.typeCode);
      const [firstEntry] = pool;
      expect(firstEntry, `${type.typeCode} has no bank item`).toBeDefined();
      // Prefer a sibling at the same difficulty: an item generated with the same levers takes the
      // same interaction idiom, so a failure here is the demo's reset and not the driver's reach.
      const secondEntry =
        pool.slice(1).find((i) => i.difficulty === firstEntry!.difficulty) ?? pool[1];
      expect(
        secondEntry,
        `${type.typeCode} has only one bank item — a burst of it cannot be tested`,
      ).toBeDefined();

      const itemA = await getServedItem(firstEntry!.itemId);
      const itemB = await getServedItem(secondEntry!.itemId);
      expect(itemA?.itemId).not.toBe(itemB?.itemId);

      const completes = !DRIVER_CANNOT_COMPLETE.has(type.typeCode);
      const settled = SETTLED_STRATEGY.get(type.typeCode);
      const sweep = [...Array(STRATEGY_COUNT).keys()];
      const order =
        settled === undefined ? sweep : [settled, ...sweep.filter((i) => i !== settled)];

      let burst: { first: DemoRun; second: DemoRun } | null = null;
      for (const strategyIndex of order) {
        const attempt = await driveBurst(type.typeCode, itemA!, itemB!, strategyIndex, {
          blurWhileAnswering: completes,
        });
        burst ??= attempt;
        // The first item has to reach the state that would strand the second, or the run proves
        // nothing. For the types the driver cannot commit for, "as far as it goes" is the state.
        if (completes ? attempt.first.result !== null : attempt.first.reactedToInput) {
          burst = attempt;
          break;
        }
      }
      const { first, second } = burst!;

      const metricsA = first.result?.metrics ?? {};
      const metricsB = second.result?.metrics ?? {};
      const telemetryA = first.result?.telemetry ?? [];
      const telemetryB = second.result?.telemetry ?? [];
      const itemIdOf = (event: Record<string, unknown>) => event.itemId;
      /** Live events, and events attached to the second result, that name the FIRST item. */
      const strayEvents = [...second.telemetryEvents, ...telemetryB].filter(
        (event) => itemIdOf(event) === itemA!.itemId,
      );
      /**
       * The un-reset buffer's signature: the second result opens with the whole of the first's and
       * then continues. Strictly longer, because two items driven by one idiom can legitimately
       * emit the same short sequence — `SPA-TANGRAM-01` emits exactly `[{t:0,kind:'start'}]` for
       * both, which an inclusive comparison reads as a carry when the buffer was in fact cleared.
       */
      const carriedBuffer =
        telemetryA.length > 0 &&
        telemetryB.length > telemetryA.length &&
        JSON.stringify(telemetryB.slice(0, telemetryA.length)) === JSON.stringify(telemetryA);

      // Recorded before the assertions so the table reports the failures too.
      REUSE_TABLE.push(
        [
          `  ${type.typeCode.padEnd(18)}`,
          `1st ${first.result ? 'committed' : first.reactedToInput ? 'reacted ' : 'inert   '}`,
          `2nd ${[
            second.repainted ? 'repaint' : second.announced ? 'announce' : '\u2014',
            second.reactedToInput ? 'answerable' : '\u2014',
            second.result ? 'committed' : '\u2014',
          ].join('+')}`.padEnd(34),
          `M-RT ${round(metricsB['M-RT'])}/${second.elapsedMs}ms`.padEnd(20),
          `M-RTFIRST ${round(metricsB['M-RTFIRST'])}`.padEnd(18),
          `M-ENGAGE ${raw(metricsA['M-ENGAGE'])}->${raw(metricsB['M-ENGAGE'])}`.padEnd(24),
          `telemetry ${strayEvents.length === 0 && !carriedBuffer ? 'clean' : 'LEAKED'}`,
        ].join('  '),
      );

      if (completes) {
        expect(
          first.result,
          `${type.typeCode} never committed the first item, so the reuse case was never reached`,
        ).not.toBeNull();
      } else {
        expect(first.reactedToInput, `${type.typeCode} ignored the first item`).toBe(true);
      }

      // 1. The demo drew the SECOND item. A demo that ignored the init is still showing the first.
      expect(
        second.repainted || second.announced,
        `${type.typeCode} neither repainted nor emitted anything on the second item's init — ` +
          'it is still showing the item the child already answered',
      ).toBe(true);

      // 2. …and took input for it. This is the reset failure that costs a four-minute timeout.
      expect(
        second.reactedToInput,
        `${type.typeCode} did not react to any interaction on the second item of the burst — ` +
          'it carried its committed state across the init and can no longer be answered',
      ).toBe(true);

      // 3. Nothing the document threw on the second item that it did not throw on the first.
      expect(
        second.errors.filter((error) => !first.errors.includes(error)),
        `${type.typeCode} threw on the reused document`,
      ).toEqual([]);

      // 4. Per-item telemetry is per ITEM. A buffer that survives the init attributes the first
      //    item's events to the second, and the trace the scorer reads is then simply wrong.
      expect(
        strayEvents,
        `${type.typeCode} emitted telemetry naming the FIRST item while taking the second`,
      ).toEqual([]);
      expect(
        carriedBuffer,
        `${type.typeCode} carried the first item's telemetry buffer into the second`,
      ).toBe(false);

      if (!completes) return;

      expect(
        second.result,
        `${type.typeCode} never emitted {type:'result'} for the second item`,
      ).not.toBeNull();
      // The result must be about the item that was asked. A demo holding a stale `current` answers
      // the previous item, and `/api/exam-submit` then grades the wrong stimulus.
      if (second.result?.itemId !== undefined) {
        expect(second.result.itemId, `${type.typeCode} answered the wrong item`).toBe(
          itemB!.itemId,
        );
      }

      // 5. The clocks restarted. Every latency the demo reports for the second item has to fit
      //    inside the second item's own window; one that does not is still timing the first, and
      //    M-RT / M-RTFIRST are what the response-time and rapid-guess metrics are read from.
      for (const id of ['M-RT', 'M-RTFIRST']) {
        expect(typeof metricsB[id], `${type.typeCode} ${id} on the second item`).toBe('number');
        expect(
          metricsB[id],
          `${type.typeCode} reported ${id}=${round(metricsB[id])}ms for the second item of a ` +
            `burst that only lasted ${String(second.elapsedMs)}ms — its clock never restarted`,
        ).toBeLessThanOrEqual(second.elapsedMs + CLOCK_SLACK_MS);
      }

      // 6. The engagement tracking restarted. The first item was blurred repeatedly while it was
      //    being answered and the second was never blurred at all, so the second item's value has
      //    to be the untouched one.
      const engagementA = metricsA['M-ENGAGE'];
      const engagementB = metricsB['M-ENGAGE'];
      if (typeof engagementA === 'number' && typeof engagementB === 'number') {
        if (ENGAGEMENT_IS_A_FOCUSED_SHARE.has(type.typeCode)) {
          expect(
            engagementB,
            `${type.typeCode} reported the second item as ${raw(engagementB)} focused, having ` +
              'been blurred on the first item and not at all on the second',
          ).toBeGreaterThanOrEqual(Math.max(engagementA, UNBLURRED_SHARE_FLOOR));
        } else if (engagementA > 0) {
          expect(
            engagementB,
            `${type.typeCode} carried the first item's focus loss into the second`,
          ).toBe(0);
        }
      }
    }, 120_000);
  }

  afterAll(() => {
    if (REUSE_TABLE.length === 0) return;
    // Printed because it is the evidence: one line per type showing that a burst really can be
    // served through a single demo instance, and what each demo reported the second time round.
    console.log(
      ['', 'burst reuse — one demo document, two items:', ...[...REUSE_TABLE].sort(), ''].join(
        '\n',
      ),
    );
  });
});
