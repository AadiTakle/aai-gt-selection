/**
 * Standalone browser-QA harness for the self-contained question-type demos.
 *
 * For every demos/<type_id>.html (excluding index.html) it opens the file via
 * file:// in headless Chromium and records:
 *   1. uncaught exceptions (pageerror), console.error, failed resource loads
 *   2. whether the page renders non-blank (wrap/stage + telemetry present)
 *   3. lets the auto-playing wordless demo/warm-up run, then clicks the primary
 *      control and confirms it does not throw and that telemetry/score updates
 *   4. saves a screenshot to ../qa-screenshots/<type_id>.png
 *
 * Results are written to results.json and a summary table is printed.
 *
 * Usage:
 *   node qa.mjs                 # all demos
 *   node qa.mjs FLU-MATRIX-01   # a subset (space-separated ids or filenames)
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..'); // research/exam-question-types
const DEMOS = path.join(ROOT, 'demos');
const SHOTS = path.join(ROOT, 'qa-screenshots');
fs.mkdirSync(SHOTS, { recursive: true });

const CONCURRENCY = Number(process.env.QA_CONCURRENCY || 4);
const NAV_TIMEOUT = 25000;
const LIVENESS_WAIT = 6000; // wait for the auto-demo to produce its first telemetry change
const ARM_WAIT = 11000; // then wait for the demo to advance past the wordless phase & arm a control
const SETTLE_AFTER_CLICK = 1600;
const HARD_CAP = 50000; // per-demo watchdog

const allFiles = fs
  .readdirSync(DEMOS)
  .filter((f) => f.endsWith('.html') && f !== 'index.html')
  .sort();

const only = process.argv.slice(2);
const files = only.length
  ? allFiles.filter((f) =>
      only.some((o) => f === o || f === `${o}.html` || f.replace(/\.html$/, '') === o.replace(/\.html$/, '')),
    )
  : allFiles;

if (!files.length) {
  console.error('No matching demo files found for:', only.join(', '));
  process.exit(2);
}

const PROBE = () => {
  const q = (s) => document.querySelector(s);
  const cue = (q('#phasecue')?.textContent || '').trim();
  const logN = document.querySelectorAll('#log > div').length;
  const mlist = (q('#mlist')?.innerText || '').trim();
  const bodyText = (document.body?.innerText || '').trim();
  return {
    hasWrap: !!(q('#wrap') || q('#stagecard') || q('#stage')),
    hasTelemetry: !!q('#telemetry'),
    meterRows: document.querySelectorAll('#mlist .mrow, #mlist > div').length,
    canvases: document.querySelectorAll('canvas').length,
    childCount: document.body ? document.body.childElementCount : 0,
    badge: (q('#badge')?.textContent || '').trim(),
    cue,
    logN,
    mlist,
    bodyLen: bodyText.length,
  };
};

// Runs entirely in-page: pick the most plausible primary control and click it.
const CLICK_PRIMARY = () => {
  const vis = (el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const st = getComputedStyle(el);
    return (
      r.width > 1 &&
      r.height > 1 &&
      st.visibility !== 'hidden' &&
      st.display !== 'none' &&
      st.pointerEvents !== 'none' &&
      parseFloat(st.opacity) > 0.05 &&
      !el.disabled
    );
  };
  const cands = [];
  const push = (el) => {
    if (el && !cands.includes(el)) cands.push(el);
  };
  // 1) explicit "ready" submit-style controls first
  ['button.ready', '#go.ready', '#submit.ready', '.ready'].forEach((s) => push(document.querySelector(s)));
  ['#go', '#submit', '#check', '#done', '#play', '#start', '#reveal', '#next', '#guess', '#ok'].forEach((s) =>
    push(document.querySelector(s)),
  );
  // 2) keyword buttons (never the replay control)
  [...document.querySelectorAll('button')]
    .filter((b) => b.id !== 'replay')
    .forEach((b) => {
      const kw = /✓|✔|submit|check|\bgo\b|done|play|next|start|answer|reveal|guess|ok|score|run/i;
      if (kw.test(`${b.textContent || ''} ${b.title || ''} ${b.id}`)) push(b);
    });
  // 3) any other visible button (except replay)
  [...document.querySelectorAll('button')].filter((b) => b.id !== 'replay').forEach(push);
  // 4) answer/option tiles as a last resort
  ['.opt', '.choice', '.option', '.tile', '.answer', '[data-opt]', '[data-choice]', '[data-val]', '[data-idx]'].forEach(
    (s) => push(document.querySelector(s)),
  );

  for (const el of cands) {
    if (!vis(el)) continue;
    const desc = el.id ? `#${el.id}` : `${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]}`;
    try {
      el.click();
      return { clicked: true, threw: false, desc, text: (el.textContent || '').trim().slice(0, 24) };
    } catch (e) {
      return { clicked: false, threw: true, desc, err: String((e && e.message) || e) };
    }
  }
  return { clicked: false, threw: false, desc: '(no actionable primary control found)' };
};

async function checkDemo(browser, file) {
  const id = file.replace(/\.html$/, '');
  const pageErrors = [];
  const consoleErrors = [];
  const consoleWarnings = [];
  const failedReq = [];
  const res = {
    id,
    file,
    badge: '',
    navOk: false,
    render: null,
    telemetryUpdated: false,
    interaction: null,
    interactionArmed: false,
    postClickDelta: false,
    interactionErrCountDelta: 0,
    pageErrors,
    consoleErrors,
    consoleWarnings,
    failedReq,
    screenshot: `qa-screenshots/${id}.png`,
    status: 'fail',
    reasons: [],
  };

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 880 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.setDefaultTimeout(NAV_TIMEOUT);
  page.on('dialog', (d) => d.dismiss().catch(() => {}));
  page.on('pageerror', (e) => pageErrors.push((e && (e.stack || e.message)) || String(e)));
  page.on('console', (msg) => {
    const t = msg.type();
    if (t === 'error') consoleErrors.push(msg.text());
    else if (t === 'warning') consoleWarnings.push(msg.text());
  });
  page.on('requestfailed', (req) => {
    const u = req.url();
    if (/favicon\.ico(\?|$)/.test(u)) return;
    failedReq.push(`${u} :: ${req.failure()?.errorText || 'failed'}`);
  });

  const work = (async () => {
    const fileUrl = url.pathToFileURL(path.join(DEMOS, file)).href;
    try {
      await page.goto(fileUrl, { waitUntil: 'load', timeout: NAV_TIMEOUT });
      res.navOk = true;
    } catch (e) {
      res.reasons.push(`navigation failed/timeout: ${String((e && e.message) || e).split('\n')[0]}`);
    }

    // initial probe (autoplay may already be mid-flight)
    let a;
    try {
      a = await page.evaluate(PROBE);
    } catch {
      a = null;
    }
    if (a) {
      res.badge = a.badge;
      res.render = { ...a };
    }

    // (1) confirm the auto-demo is alive: wait for its first telemetry change
    if (a) {
      await page
        .waitForFunction(
          ({ cue0, log0, m0 }) => {
            const q = (s) => document.querySelector(s);
            const cue = (q('#phasecue')?.textContent || '').trim();
            const logN = document.querySelectorAll('#log > div').length;
            const m = (q('#mlist')?.innerText || '').trim();
            return (cue && cue0 && cue !== cue0) || logN > log0 || (m && m0 && m !== m0);
          },
          { cue0: a.cue, log0: a.logN, m0: a.mlist },
          { timeout: LIVENESS_WAIT, polling: 300 },
        )
        .catch(() => {});
    }

    // (2) let the wordless demo finish & the interactive phase arm a control:
    //     wait until the phase cue advances OR a "ready"/armed primary control appears.
    if (a) {
      const armed = await page
        .waitForFunction(
          ({ cue0 }) => {
            const q = (s) => document.querySelector(s);
            const cue = (q('#phasecue')?.textContent || '').trim();
            const readyBtn = document.querySelector('button.ready, #go.ready, #submit.ready');
            const advanced = cue0 && cue && cue !== cue0; // moved past the demo phase (e.g. eye -> star)
            return !!readyBtn || advanced;
          },
          { cue0: a.cue },
          { timeout: ARM_WAIT, polling: 300 },
        )
        .then(() => true)
        .catch(() => false);
      res.interactionArmed = armed;
      // brief settle so the freshly-armed control finishes rendering
      await page.waitForTimeout(300);
    }

    const errBefore = pageErrors.length;
    let bBefore = null;
    try {
      bBefore = await page.evaluate(PROBE);
    } catch {
      bBefore = null;
    }

    // one sample interaction: click the primary control (now armed, for button-driven demos)
    let interaction = { clicked: false, threw: false, desc: '(page unavailable)' };
    try {
      interaction = await page.evaluate(CLICK_PRIMARY);
    } catch (e) {
      interaction = { clicked: false, threw: true, desc: '(evaluate failed)', err: String((e && e.message) || e) };
    }
    res.interaction = interaction;

    await page.waitForTimeout(SETTLE_AFTER_CLICK);

    const changed = (x, y) => x && y && (x.mlist !== y.mlist || y.logN > x.logN || x.cue !== y.cue);
    let c = null;
    try {
      c = await page.evaluate(PROBE);
    } catch {
      c = null;
    }
    let postDelta = changed(bBefore, c);

    // if MY interaction produced no telemetry delta, poke the stage more (keyboard hotkeys +
    // first answer tile) to exercise keyboard/tile/gesture-driven demos and confirm dead-vs-alive
    if (!postDelta) {
      for (const k of ['1', 'f', 'j', ' ', 'ArrowRight', 'ArrowUp']) {
        try {
          await page.keyboard.press(k);
        } catch {
          /* ignore */
        }
      }
      try {
        await page.evaluate(() => {
          const el = document.querySelector('.opt,.choice,.option,.tile,.cell,[data-opt],[data-idx],[data-val]');
          if (el) el.click();
        });
      } catch {
        /* ignore */
      }
      await page.waitForTimeout(700);
      try {
        c = await page.evaluate(PROBE);
      } catch {
        /* keep previous */
      }
      postDelta = changed(bBefore, c);
    }

    res.interactionErrCountDelta = pageErrors.length - errBefore;
    res.postClickDelta = !!postDelta;
    res.telemetryUpdated = !!((a && c && changed(a, c)) || postDelta);

    // screenshot (best effort)
    try {
      await page.screenshot({ path: path.join(SHOTS, `${id}.png`), fullPage: false });
    } catch (e) {
      res.reasons.push(`screenshot failed: ${String((e && e.message) || e).split('\n')[0]}`);
    }
  })();

  let watchdog;
  try {
    await Promise.race([
      work,
      new Promise((_, rej) => {
        watchdog = setTimeout(() => rej(new Error('per-demo hard cap exceeded')), HARD_CAP);
      }),
    ]);
  } catch (e) {
    res.reasons.push(String((e && e.message) || e).split('\n')[0]);
  } finally {
    clearTimeout(watchdog);
    await ctx.close().catch(() => {});
  }

  // ---- classify ----
  const blank = !res.render || (!res.render.hasWrap && res.render.meterRows === 0) || (res.render.bodyLen === 0 && res.render.canvases === 0);
  if (!res.navOk) res.reasons.push('page did not load');
  if (blank) res.reasons.push('blank / no render (missing wrap+stage or empty body)');
  if (!res.render?.hasTelemetry) res.reasons.push('telemetry panel (#telemetry) missing');
  if (res.render && res.render.meterRows === 0) res.reasons.push('no telemetry meter rows rendered');
  if (pageErrors.length) res.reasons.push(`${pageErrors.length} uncaught exception(s)`);
  if (consoleErrors.length) res.reasons.push(`${consoleErrors.length} console.error(s)`);
  if (failedReq.length) res.reasons.push(`${failedReq.length} failed resource load(s)`);
  if (res.interaction?.threw) res.reasons.push(`primary control threw on click (${res.interaction.desc})`);
  if (!res.telemetryUpdated) res.reasons.push('telemetry never updated (demo appears frozen / no score signal)');

  const hardBreak =
    !res.navOk ||
    blank ||
    pageErrors.length > 0 ||
    consoleErrors.length > 0 ||
    failedReq.length > 0 ||
    res.interaction?.threw ||
    !res.telemetryUpdated ||
    (res.render && res.render.meterRows === 0);

  res.status = hardBreak ? 'fail' : 'pass';
  return res;
}

async function main() {
  const t0 = Date.now();
  const browser = await chromium.launch({ headless: true });
  console.log(`QA start · ${files.length} demos · concurrency ${CONCURRENCY}`);

  const queue = [...files];
  const results = [];
  let done = 0;

  async function worker(wid) {
    while (queue.length) {
      const file = queue.shift();
      if (!file) break;
      let r;
      try {
        r = await checkDemo(browser, file);
      } catch (e) {
        r = {
          id: file.replace(/\.html$/, ''),
          file,
          status: 'fail',
          reasons: [`harness error: ${String((e && e.message) || e).split('\n')[0]}`],
          pageErrors: [],
          consoleErrors: [],
          failedReq: [],
        };
      }
      results.push(r);
      done += 1;
      const flag = r.status === 'pass' ? 'PASS' : 'FAIL';
      console.log(
        `[${String(done).padStart(2)}/${files.length}] ${flag}  ${r.id}` +
          (r.status === 'fail' ? `  — ${r.reasons.join('; ')}` : ''),
      );
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, files.length) }, (_, i) => worker(i)));
  await browser.close();

  results.sort((x, y) => x.id.localeCompare(y.id));
  fs.writeFileSync(path.join(HERE, 'results.json'), JSON.stringify(results, null, 2));

  const pass = results.filter((r) => r.status === 'pass');
  const fail = results.filter((r) => r.status === 'fail');
  console.log('\n================ SUMMARY ================');
  console.log(`total   : ${results.length}`);
  console.log(`pass    : ${pass.length}`);
  console.log(`fail    : ${fail.length}`);
  console.log(`elapsed : ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  if (fail.length) {
    console.log('\n---- FAILURES ----');
    for (const r of fail) console.log(`- ${r.id}: ${r.reasons.join('; ')}`);
  }
  console.log('\nresults.json written. screenshots in ../qa-screenshots/');
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
