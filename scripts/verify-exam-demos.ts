/**
 * Exam-demo embedding-contract conformance harness (AX-01, D-016).
 *
 * Loads each wired question-type demo in headless Chromium, plays the host side
 * of the postMessage contract (init -> ready -> warmup_done -> telemetry ->
 * response), drives the demo through its warm-up and single scored item, and
 * asserts the demo emits a conformant `response` (correctness + rtMs + M-*
 * measurements) plus `warmup_done` and an `item_shown` telemetry event.
 *
 * Born-synthetic, loopback/file-only. No Supabase, no network. Run:
 *   pnpm --filter @gt-selection/web exec tsx <repo>/scripts/verify-exam-demos.ts
 */
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { chromium, type Browser } from '@playwright/test';

const here = path.dirname(fileURLToPath(import.meta.url));
const DEMOS_DIR = path.resolve(here, '../apps/web/public/exam-demos');

/** The curated 12 demos (3 per domain) wired to the embedding contract. */
const DEMOS: { code: string; domain: string }[] = [
  { code: 'FLU-MATRIX-01', domain: 'fluid_reasoning' },
  { code: 'FLU-CARPET-01', domain: 'fluid_reasoning' },
  { code: 'FLU-ANALOGY-01', domain: 'fluid_reasoning' },
  { code: 'QUANT-SERIES-01', domain: 'quantitative' },
  { code: 'QUANT-GRAPH-01', domain: 'quantitative' },
  { code: 'QUANT-FUNC-01', domain: 'quantitative' },
  { code: 'SPA-ROLL-01', domain: 'spatial' },
  { code: 'SPA-XSCAN-01', domain: 'spatial' },
  { code: 'SPA-PICKFOLD-01', domain: 'spatial' },
  { code: 'VER-CLOZE-01', domain: 'verbal' },
  { code: 'VER-EVIDENCE-01', domain: 'verbal' },
  { code: 'VER-RELPAIR-01', domain: 'verbal' },
];

interface DemoMessage {
  source?: string;
  type?: string;
  event?: { kind?: string; payload?: Record<string, unknown> };
  response?: {
    itemId?: string;
    correct?: boolean;
    score?: number;
    rtMs?: number;
    firstActionMs?: number | null;
    revisions?: number;
    engaged?: boolean;
    measurements?: Record<string, number>;
    syntheticOnly?: boolean;
  };
}

const ANSWER_TIMEOUT_MS = 30_000;

async function runDemo(
  browser: Browser,
  code: string,
  domain: string,
  difficultyLevel: number,
  wantCorrect: boolean,
): Promise<{ ok: boolean; detail: string }> {
  const page = await browser.newPage();
  const failures: string[] = [];
  page.on('pageerror', (err) => failures.push(`pageerror: ${err.message}`));
  try {
    await page.addInitScript(() => {
      const w = window as unknown as { __gtMsgs: DemoMessage[] };
      w.__gtMsgs = [];
      window.addEventListener('message', (event: MessageEvent) => {
        const data = event.data as DemoMessage;
        if (data && data.source === 'gt-exam-demo') w.__gtMsgs.push(data);
      });
    });

    const fileUrl = pathToFileURL(path.join(DEMOS_DIR, `${code}.html`)).href;
    await page.goto(fileUrl, { waitUntil: 'load' });

    await page.waitForFunction(
      () =>
        typeof (window as unknown as { __gtAnswer?: unknown }).__gtAnswer === 'function' &&
        Boolean((window as unknown as { GTExam?: unknown }).GTExam),
      undefined,
      { timeout: 10_000 },
    );

    const item = {
      itemId: randomUUID(),
      typeCode: code,
      domain,
      difficultyLevel,
      demoPath: `${code}.html`,
      params: {},
    };
    await page.evaluate(
      ({ sessionId, itm }) => {
        window.postMessage({ source: 'gt-exam-host', type: 'init', sessionId, item: itm }, '*');
      },
      { sessionId: randomUUID(), itm: item },
    );

    const deadline = Date.now() + ANSWER_TIMEOUT_MS;
    let responded = false;
    while (Date.now() < deadline) {
      const hasResp = await page.evaluate(() =>
        (window as unknown as { __gtMsgs: DemoMessage[] }).__gtMsgs.some((m) => m.type === 'response'),
      );
      if (hasResp) {
        responded = true;
        break;
      }
      await page.evaluate(
        (wc) => (window as unknown as { __gtAnswer: (c: boolean) => boolean }).__gtAnswer(wc),
        wantCorrect,
      );
      await page.waitForTimeout(300);
    }

    const msgs = (await page.evaluate(
      () => (window as unknown as { __gtMsgs: DemoMessage[] }).__gtMsgs,
    )) as DemoMessage[];

    if (!responded) failures.push('no `response` message within timeout');

    const response = msgs.find((m) => m.type === 'response')?.response;
    if (!response) {
      failures.push('missing response payload');
    } else {
      if (response.correct !== wantCorrect)
        failures.push(`correct=${response.correct} expected ${wantCorrect}`);
      if (response.syntheticOnly !== true) failures.push('syntheticOnly !== true');
      if (typeof response.rtMs !== 'number' || Number.isNaN(response.rtMs))
        failures.push('rtMs not a number');
      const acc = response.measurements?.['M-ACC'];
      if (acc !== (wantCorrect ? 1 : 0)) failures.push(`M-ACC=${acc}`);
      if (typeof response.measurements?.['M-RT'] !== 'number') failures.push('missing M-RT');
      if (typeof response.revisions !== 'number') failures.push('revisions not a number');
    }

    const hasWarmupDone = msgs.some((m) => m.type === 'warmup_done');
    if (!hasWarmupDone) failures.push('no `warmup_done` message');
    const hasItemShown = msgs.some(
      (m) => m.type === 'telemetry' && m.event?.kind === 'item_shown',
    );
    if (!hasItemShown) failures.push('no `item_shown` telemetry');
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
  } finally {
    await page.close();
  }

  return {
    ok: failures.length === 0,
    detail: failures.length === 0 ? 'ok' : failures.join('; '),
  };
}

async function main() {
  const only = process.argv[2];
  const targets = only ? DEMOS.filter((d) => d.code === only) : DEMOS;
  if (targets.length === 0) {
    console.error(`No demo matches "${only}".`);
    process.exit(2);
  }

  const browser = await chromium.launch();
  let failed = 0;
  try {
    for (const { code, domain } of targets) {
      // High difficulty so the demo must render a genuinely hard rung; test both
      // a correct and an incorrect answer to prove local correctness scoring.
      const correctRun = await runDemo(browser, code, domain, 5, true);
      const wrongRun = await runDemo(browser, code, domain, 3, false);
      const ok = correctRun.ok && wrongRun.ok;
      if (!ok) failed += 1;
      const status = ok ? 'PASS' : 'FAIL';
      const detail = ok ? '' : `  [correct] ${correctRun.detail}  |  [wrong] ${wrongRun.detail}`;
      console.log(`${status}  ${code}${detail}`);
    }
  } finally {
    await browser.close();
  }

  console.log(`\n${targets.length - failed}/${targets.length} demos conform to the embedding contract.`);
  process.exit(failed === 0 ? 0 : 1);
}

void main();
