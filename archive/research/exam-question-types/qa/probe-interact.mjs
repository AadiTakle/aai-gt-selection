/**
 * Targeted interaction probe: for each id, load it, wait until the wordless demo
 * hands off to the interactive phase (phase cue changes), then drive the real
 * two-step answer flow (pick an answer element, then submit) and report whether
 * the DOM reflects the pick (selection class) and whether telemetry/log advanced.
 *
 * This distinguishes a genuine "primary control does nothing" bug from a mere
 * harness-coverage gap (drag/type mechanics my generic clicker can't drive).
 *
 * Usage: node probe-interact.mjs FLU-ANALOGY-01 FLU-GRIDCOPY-01 ...
 */
import { chromium } from 'playwright';
import path from 'node:path';
import url from 'node:url';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const DEMOS = path.resolve(HERE, '..', 'demos');
const ids = process.argv.slice(2);

const snap = () => {
  const q = (s) => document.querySelector(s);
  return {
    cue: (q('#phasecue')?.textContent || '').trim(),
    logN: document.querySelectorAll('#log > div').length,
    mlist: (q('#mlist')?.innerText || '').trim(),
    sel: document.querySelectorAll('.sel,.selected,.picked,.active,.on,.correct,.wrong,.filled,.filled-anim').length,
    goReady: !!document.querySelector('#go.ready, button.ready, #submit.ready'),
  };
};

const browser = await chromium.launch({ headless: true });
for (const id of ids) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 880 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e.message || e)));
  const fileUrl = url.pathToFileURL(path.join(DEMOS, `${id}.html`)).href;
  await page.goto(fileUrl, { waitUntil: 'load' });
  const a0 = await page.evaluate(snap);
  // wait for the demo to hand off to warm-up (cue changes) or a ready control
  await page
    .waitForFunction(
      ({ c0 }) => {
        const cue = (document.querySelector('#phasecue')?.textContent || '').trim();
        return (c0 && cue && cue !== c0) || !!document.querySelector('#go.ready, button.ready, #submit.ready');
      },
      { c0: a0.cue },
      { timeout: 12000, polling: 300 },
    )
    .catch(() => {});
  await page.waitForTimeout(400);
  const before = await page.evaluate(snap);

  // step 1: click the first plausible answer element
  const picked = await page.evaluate(() => {
    const sels = ['#tray .opt', '.opt', '.choice', '.option', '.tile', '.gc.edit', '.chip', '.cell:not(.empty)', '.card', '[data-i]', '[data-idx]', '[data-opt]'];
    for (const s of sels) {
      const el = document.querySelector(s);
      if (el) {
        const r = el.getBoundingClientRect();
        if (r.width > 1 && r.height > 1) {
          el.click();
          return s;
        }
      }
    }
    return '(none)';
  });
  await page.waitForTimeout(300);
  const afterPick = await page.evaluate(snap);

  // step 2: submit
  const submitted = await page.evaluate(() => {
    const g = document.querySelector('#go, #submit, #check, #done');
    if (g) {
      g.click();
      return g.id || 'submit';
    }
    return '(no submit btn)';
  });
  await page.waitForTimeout(500);
  const afterSubmit = await page.evaluate(snap);

  const pickRegistered = afterPick.sel > before.sel || afterPick.goReady !== before.goReady || afterPick.logN > before.logN || afterPick.mlist !== before.mlist;
  const submitRegistered = afterSubmit.logN > afterPick.logN || afterSubmit.mlist !== afterPick.mlist || afterSubmit.cue !== afterPick.cue;
  console.log(`\n=== ${id} ===`);
  console.log(`  handoff cue: ${a0.cue} -> ${before.cue}   goReady(before)=${before.goReady}`);
  console.log(`  picked ${picked}  => sel ${before.sel}->${afterPick.sel}, goReady ${before.goReady}->${afterPick.goReady}, log ${before.logN}->${afterPick.logN}  ==> PICK ${pickRegistered ? 'REGISTERED' : 'NO-OP'}`);
  console.log(`  submit ${submitted} => log ${afterPick.logN}->${afterSubmit.logN}, cue ${afterPick.cue}->${afterSubmit.cue}  ==> SUBMIT ${submitRegistered ? 'REGISTERED' : 'NO-OP'}`);
  console.log(`  pageerrors: ${errs.length ? errs.join(' | ') : 'none'}`);
  await page.close();
}
await browser.close();
